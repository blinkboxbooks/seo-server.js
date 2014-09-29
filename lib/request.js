'use strict';

var childProcess = require('child_process'),
		config = require('../bin/config'),
		requestQueue = require('./queue'),
		logger = require('./logger'),
		openedProcesses = 0,
		maxProcesses = config.maxProcesses || 1;

function responseTime(start) {
	var diff = process.hrtime(start),
			ms = diff[0] * 1e3 + diff[1] * 1e-6;
	return Math.round(ms);
}

function reportOnProcesses() {
  if (openedProcesses > 0) {
	  logger.info('Currently ' + openedProcesses + ' processes running of a maximum of ' + maxProcesses + '.');
  } else {
	  logger.info('No open processes, maximum of ' + maxProcesses + ' available.');
  }
}

function getContent(url, callback) {
	var startAt = process.hrtime(),
	    code = 200,
	    phantom;

	function log(message, info, level) {
		info = info || {};
		if (!level && info.error) {
			level = 'error';
		}
		info.pid = phantom.pid;
		info.url = url;
		logger[level || 'info'](message, info);
	}

  openedProcesses++;
	log('Launching PhantomJS process to handle request.');
  reportOnProcesses();

  phantom = childProcess.execFile(
    'phantomjs',
    [
      '--ignore-ssl-errors=' + config.ignoreSSLErrors,
      __dirname + '/phantom-server.js',
      url
    ],
    {
      timeout: config.phantomTimeout,
      killSignal: 'SIGKILL'
    },
    function (error, stdout) {
      if (error !== null && error.killed) {
	      log('PhantomJS returned with error.', {error: String(error)});
        callback(stdout, 504);
      } else {
	      log('PhantomJS returned without error.');
        callback(stdout, code);
      }
    }
  );

	log('PhantomJS process spawned.');

  phantom.stdout.setEncoding('utf8');

  phantom.stderr.on('data', function (data) {
	  log('PhantomJS STDERR output.', {error: data});
    if (data === '404') {
      code = 404;
    } else if (data === '500') {
      code = 500;
    }
  });

  phantom.on('exit', function(code) {
	  var appTime = responseTime(startAt),
		    info = {exitCode: code, httpApplicationTime: appTime};
    if (code !== 0) {
	    log('PhantomJS exited with error code ' + code + '.', info, 'critical');
    }
	  log('PhantomJS returned in ' + appTime + 'ms.', info);
  });
}

function next() {
  openedProcesses--;
  reportOnProcesses();

  requestQueue.report();

  var nextItem = requestQueue.next();

  if (nextItem !== undefined) {
	  logger.info('Picking up request from queue.', next.url);
    getContent(next.url, next.callback);
  }
}

function makeRequest(data) {
  reportOnProcesses();

  if (maxProcesses > openedProcesses) {
    getContent(data.url, data.callback);
  }
  else {
	  logger.info('Maximum processes exceeded, adding request to queue.', {url: data.url});
    requestQueue.add(data);
  }
}

module.exports = {
  makeRequest: makeRequest,
  next: next
};
