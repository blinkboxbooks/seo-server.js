'use strict';

var childProcess = require('child_process');
var config = require('../bin/config');
var requestQueue = require('./queue');
var logger = require('./logger');
var openedProcesses = 0;
var maxProcesses = config.maxProcesses || 1;

function responseTime(start) {
  var diff = process.hrtime(start);
  var ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return Math.round(ms);
}

function reportOnProcesses() {
  logger.info('Currently ' + openedProcesses + ' processes running of a maximum of ' + maxProcesses + '.');
}

function getContent(url, callback) {
  var startAt = process.hrtime(),
      code = 200,
      phantom;

  function spawnLog(message, info, level) {
    info = info || {};
    if (!level && info.error) {
      level = 'error';
    }
    info.pid = phantom && phantom.pid;
    info.url = url;
    logger[level || 'info'](message, info);
  }

  openedProcesses++;
  spawnLog('Launching PhantomJS process to handle request...');
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
      if (error) {
        spawnLog('PhantomJS returned with error.', {error: String(error), stack: error.stack});
        callback(stdout, 504);
      } else {
        spawnLog('PhantomJS returned successfully.');
        callback(stdout, code);
      }
    }
  );

  spawnLog('PhantomJS process spawned.');

  phantom.stdout.setEncoding('utf8');

  phantom.stderr.on('data', function (data) {
    spawnLog('PhantomJS STDERR output.', {error: data});
    if (data === '404') {
      code = 404;
    } else if (data === '500') {
      code = 500;
    }
  });

  phantom.on('exit', function(code) {
    var appTime = responseTime(startAt);
    var info = {exitCode: code, httpApplicationTime: appTime};
    if (code !== 0) {
      spawnLog('PhantomJS exited with error code ' + code + '.', info, 'critical');
    }
    spawnLog('PhantomJS returned in ' + appTime + 'ms.', info);
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
