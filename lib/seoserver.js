var express = require('express'),
    memwatch,
    childProcess = require('child_process'),
    hd,
    app = express(),
    arguments = process.argv.splice(2),
    port = arguments[0] !== 'undefined' ? arguments[0] : 3000,
    config = require('../bin/config'),
    getContent,
    respond,
    openedProcesses= 0,
    URLQueue = [],
    diff,
    start,
    is404 = false,
    is500 = false;

var log = require('./log');

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

getContent = function(url, callback) {
  var checkMemory;
  var content = '';
  var timeStart = new Date().getTime();

  if (config.debug) {
    hd = new memwatch.HeapDiff();
  }
  openedProcesses++;

  var phantom = childProcess.execFile('phantomjs',
    [ '--ignore-ssl-errors='+config.ignoreSSLErrors, __dirname + '/phantom-server.js', url],
    {timeout: config.phantomTimeout, killSignal: 'SIGKILL'}, function(error, stdout) {
      if (error !== null && error.killed) {
        callback(504);
      } else {
        callback(stdout);
      }

      if (config.debug) {
        clearInterval(checkMemory);
      }
    });

  phantom.stdout.setEncoding('utf8');

  phantom.stderr.on('data', function (data) {
      log.error('Phantom.js STDERR: ' + data);

      if(data === '404') {
        is404 = true;
      } else if(data === '500') {
        is500 = true;
      }
  });

  phantom.on('exit', function(code) {
    if (config.verbose) {
      if (code !== 0) {
        log.info('url: ' + url + ' ERROR: PhantomJS Exited with code: ' + code);
      } else {
        log.info(
          'url: ' + url +
            ' HTMLSnapshot completed successfully.' +
            ' Content-Length: ' + content.length
        );
      }
    }
    if (config.debug) {
      diff = hd.end();
      log.info('MEMWATCH report: ');
      log.info(JSON.stringify(diff));
    }

    // measure the time it taken
    var timeFinish = new Date().getTime();
    log.info('In '+((timeFinish-timeStart)/1000)+' seconds');
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

// function that manages the number of processes
function sendURL(data) {
  if (config.maxProcesses>openedProcesses) {
    getContent(data.url, data.callback);
  } else {
    URLQueue.push(data);
  }
}

respond = function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");

  var url;

  if(req.headers.referer) {
    url = req.headers.referer;
  }

  if (config.verbose) {
    log.info(req.headers);
  }

  if(req.headers['x-forwarded-host']) {
    var protocol = (typeof req.headers['x-forwarded-proto'] != 'undefined' && req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    url = protocol + '://' + req.headers['x-forwarded-host'] + req.params[0];
  }

  log.info('Fetching URL: ' + url);

  sendURL({
    url: url,
    callback: function (content) {
      // the precedence is to the not found because it is a broken link
      if (is404) {
        res.status(404);
      } 
      else if(is500) {
        res.status(500);
      }

      is404 = false;
      is500 = false;

      res.send(content);
      openedProcesses--;

      // checks if is there any element in the queue to process
      var next;

      if ((next=URLQueue.shift()) !== undefined)
      {
        getContent(next.url, next.callback);
      }

    }});
}

app.get(/(.*)/, respond);

log.info('Server started on port ' + port);
app.listen(port);