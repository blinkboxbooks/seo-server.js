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
    start;


if (config.debug) {
  memwatch = require('memwatch');

  // initialises the necessary variables and listeners to write everything about memory
  start = new Date();

  function msFromStart() {
    return new Date() - start;
  }
  // report to console postgc heap size
  memwatch.on('stats', function(d) {
    console.log("MEMWATCH postgc:", msFromStart(), d.current_base);
  });

  memwatch.on('leak', function(d) {
    console.log("MEMWATCH leak:", d);
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
    {timeout: config.phantomTimeout}, function(error, stdout) {
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
      console.log('stderr: ' + data);
  });

  phantom.on('exit', function(code) {
    if (config.verbose) {
      if (code !== 0) {
        console.log('url: ' + url + ' ERROR: PhantomJS Exited with code: ' + code);
        if (config.logErrors) {
          console.log('Please the file in the directory /errors');
        }
      } else {
        console.log(
          'url: ' + url +
            ' HTMLSnapshot completed successfully.' +
            ' Content-Length: ' + content.length
        );
      }
    }
    if (config.debug) {
      diff = hd.end();
      console.log('MEMWATCH report: ');
      console.log(JSON.stringify(diff));
    }

    // measure the time it taken
    var timeFinish = new Date().getTime();
    console.log('In '+((timeFinish-timeStart)/1000)+' seconds');
  });

  if (config.debug) {
    checkMemory = setInterval(function() {
      childProcess.exec('ps -p' + phantom.pid + ' -o vsize -o pcpu -o pmem',  function (err, stdout, stderr) {
        err = err || stderr;
        if (!err) {
          console.log('PARENT Heap used: ',process.memoryUsage());
          console.log('CHILD memory consumption:\n ', stdout);
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
    console.log(req.headers);
  }

  if(req.headers['x-forwarded-host']) {
    var protocol = (typeof req.headers['x-forwarded-proto'] != 'undefined' && req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    url = protocol + '://' + req.headers['x-forwarded-host'] + req.params[0];

  }
  console.log('url:', url);
  sendURL({
    url: url,
    callback: function (content) {
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
app.listen(port);
