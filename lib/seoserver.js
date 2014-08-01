var express = require('express');
var memwatch;
var childProcess = require('child_process');
var hd;
var app = express();
var arguments = process.argv.splice(2);
var port = arguments[0] !== 'undefined' ? arguments[0] : 3000;
var config = require('../bin/config');
var respond;
var openedProcesses= 0;
var URLQueue = [];
var diff;
var start;
var is404 = false;
var is500 = false;

var log = require('./log');

/*
Quite rough and ready wrapping of logging.
*/
function argumentsUnshift(args, addition) {
  Array.prototype.unshift.call(args, '[' + addition + ']');
  return args;
}

function argumentsPush(args, addition) {
  Array.prototype.push.call(args, addition);
  return args;
}

var report = {
  requestsQueue: function() {
    (URLQueue.length > 0) ? parentLog.info('Request queue is ' + URLQueue.length + ' requests long') : parentLog.info('Request queue is empty.');
  },

  processes: function() {
    if (openedProcesses > 0) {
      parentLog.info('Currently ' + openedProcesses + ' processes running of a maximum of ' + config.maxProcesses);
    }
    else {
      parentLog.info('No open processes, maximum of ' + config.maxProcesses + ' availiable');
    }
  }
}

function sendURL(data) {
  report.processes();

  if (config.maxProcesses > openedProcesses) {
    getContent(data.url, data.callback);
  } 
  else {
    parentLog.info('Maximum processes exceeded, adding request to queue.', data.url);
    URLQueue.push(data); 
    report.requestsQueue();
  }
}

var parentLog = {
  info: function() { log.info.apply(this, argumentsUnshift(arguments, 'parent')) },
  error: function() { log.error.apply(this, argumentsUnshift(arguments, 'parent')) }
};

var ChildLog = function(pid, url) {
  this.pid = pid;
  this.url = url;
};

ChildLog.prototype.makeAdditions = function(args) {
  argumentsUnshift(args, this.pid);
  argumentsPush(args, this.url);

  return args;
}

ChildLog.prototype.info = function() { 
  log.info.apply(this, this.makeAdditions(arguments)); 
}

ChildLog.prototype.error = function() { 
  log.error.apply(this, this.makeAdditions(arguments));
}

if (config.debug) {
  memwatch = require('memwatch');

  // initialises the necessary variables and listeners to write everything about memory
  start = new Date();

  function msFromStart() {
    return new Date() - start;
  }
  // report to console postgc heap size
  memwatch.on('stats', function(d) {
    log.info("MEMWATCH postgc:", msFromStart(), d.current_base);
  });

  memwatch.on('leak', function(d) {
    log.error("MEMWATCH leak:", d);
  });
}

var getContent = function(url, callback) {
  var checkMemory;
  var content = '';
  var timeStart = new Date().getTime();

  if (config.debug) {
    hd = new memwatch.HeapDiff();
  }

  openedProcesses++;
  parentLog.info('Launching PhantomJS process to handle request.', url);
  report.processes();

  // We can stick the callback in a closure to make things easier to add in ChildLog.
  var phantom = childProcess.execFile('phantomjs',
    [ '--ignore-ssl-errors=' + config.ignoreSSLErrors, __dirname + '/phantom-server.js', url],
    {timeout: config.phantomTimeout, killSignal: 'SIGKILL'}, function(error, stdout, stderr) {
      if (error !== null && error.killed) {
        childLog.info('PhantomJS returned with error: ', error)
        callback(504);
      } 
      else {
        childLog.info('PhantomJS returned without error.');
        callback(stdout);
      }

      if (config.debug) {
        clearInterval(checkMemory);
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
        is404 = true;
      } 
      else if (data === '500') {
        childLog.error('PhantomJS assumed to have recieved a 501 from request.');
        is500 = true;
      }
  });

  phantom.on('exit', function(code) {
    if (code !== 0) {
      childLog.error('PhantomJS exited with code: ' + code);
    }

    if (config.debug) {
      diff = hd.end();
      childLog('MEMWATCH report: ');
      childLog(JSON.stringify(diff));
    }

    // measure the time it taken
    var timeFinish = new Date().getTime();
    childLog.info('PhantomJS finished in '+((timeFinish-timeStart)/1000) + ' seconds, exit code ' + code);
  });

  if (config.debug) {
    checkMemory = setInterval(function() {
      childProcess.exec('ps -p' + phantom.pid + ' -o vsize -o pcpu -o pmem',  function (err, stdout, stderr) {
        err = err || stderr;
        if (!err) {
          log.info('PARENT Heap used: ',process.memoryUsage());
          log.info('CHILD memory consumption:\n ', stdout);
        }
      });
    }, 500);
  }
};

respond = function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");

  var url;

  parentLog.info('Incoming request, headers:', req.headers);

  if(req.headers.referer) {
    parentLog.info('Setting URL to refererer.');
    url = req.headers.referer;
  }
  else {
    parentLog.info('Setting URL to path of this server.');
    url = req.path;
  }

  if(req.headers['x-forwarded-host']) {
    var protocol = (typeof req.headers['x-forwarded-proto'] != 'undefined' && req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    url = protocol + '://' + req.headers['x-forwarded-host'] + req.params[0];
  }
  // Likely for debugging purposes.
  else {
    parentLog.info('No x-forwarded-host, assuming localhost.');
    url = 'https://' + 'localhost' + req.path;
  }

  url = url.replace('%23', '#');

  parentLog.info('Starting fetch of URL.', url);

  sendURL({
    url: url,
    callback: function (content, url) {
      // the precedence is to the not found because it is a broken link
      if (is404) {
        res.status(404);
      } 
      else if (is500) {
        res.status(500);
      }

      is404 = false;
      is500 = false;

      res.send(content);

      openedProcesses--;
      report.processes();

      report.requestsQueue();

      var next = URLQueue.shift();

      if (next !== undefined) {
        parentLog.info('Picking up request from queue.', next.url);
        getContent(next.url, next.callback);
      }
  }});
}

app.get(/(.*)/, respond);

parentLog.info('Server started on port ' + port);
app.listen(port);
