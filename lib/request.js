'use strict';

var childProcess = require('child_process');

var config = require('../bin/config');

var parentLog = require('./parent-log');
var ChildLog = require('./child-log');

var requestQueue = require('./queue');

var openedProcesses = 0;
var maxProcesses = config.maxProcesses || 1;

function reportOnProcesses() {
  if (openedProcesses > 0) {
    parentLog.info('Currently ' + openedProcesses + ' processes running of a maximum of ' + maxProcesses);
  }
  else {
    parentLog.info('No open processes, maximum of ' + maxProcesses + ' availiable');
  }
}

function getContent(url, callback) {
  var timeStart = new Date().getTime();

  openedProcesses++;
  parentLog.info('Launching PhantomJS process to handle request.', url);
  reportOnProcesses();

  (function() {
    var code = 200;
    var phantom = childProcess.execFile('phantomjs',
      [ '--ignore-ssl-errors=' + config.ignoreSSLErrors, __dirname + '/phantom-server.js', url],
      {timeout: config.phantomTimeout, killSignal: 'SIGKILL'}, function(error, stdout) {
        if (error !== null && error.killed) {
          childLog.info('PhantomJS returned with error: ', error);
          callback(stdout, 504);
        }
        else {
          childLog.info('PhantomJS returned without error.');
          callback(stdout, code);
        }
      });

    var pid = phantom.pid;

    var childLog = new ChildLog(pid, url);

    childLog.info('PhantomJS process spawned.');

    phantom.stdout.setEncoding('utf8');

    phantom.stderr.on('data', function (data) {
      childLog.error('STDERR from PhantomJS: ' + data);

      if (data === '404') {
        childLog.error('PhantomJS assumed to have recieved a 404 (Not Found) from request.');
        code = 404;
      }
      else if (data === '500') {
        childLog.error('PhantomJS assumed to have recieved a 501 from request.');
        code = 500;
      }
    });

    phantom.on('exit', function(code) {
      if (code !== 0) {
        childLog.error('PhantomJS exited with code: ' + code);
      }

      // measure the time it taken
      var timeFinish = new Date().getTime();
      childLog.info('PhantomJS finished in '+((timeFinish-timeStart)/1000) + ' seconds, exit code ' + code);
    });
  })();
}

function next() {
  openedProcesses--;
  reportOnProcesses();

  requestQueue.report();

  var nextItem = requestQueue.next();

  if (nextItem !== undefined) {
    parentLog.info('Picking up request from queue.', next.url);
    getContent(next.url, next.callback);
  }
}

function makeRequest(data) {
  reportOnProcesses();

  if (maxProcesses > openedProcesses) {
    getContent(data.url, data.callback);
  }
  else {
    parentLog.info('Maximum processes exceeded, adding request to queue.', data.url);
    requestQueue.add(data);
  }
}

module.exports = {
  makeRequest: makeRequest,
  next: next
};