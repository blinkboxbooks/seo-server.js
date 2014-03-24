var express = require('express'),
    app = express(),
    arguments = process.argv.splice(2),
    port = arguments[0] !== 'undefined' ? arguments[0] : 3000,
    config = require('../bin/config'),
    getContent,
    respond,
    openedProcesses= 0,
    URLQueue = [];

getContent = function(url, callback) {
  openedProcesses++;
  var content = '';
  var timeStart = new Date().getTime();
  var phantom = require('child_process').spawn('casperjs', [ '--ignore-ssl-errors='+config.ignoreSSLErrors, __dirname + '/casper.js', url]);

  phantom.stdout.setEncoding('utf8');
  phantom.stdout.on('data', function(data) {
    content += data.toString();
  });
  phantom.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
  });
  phantom.on('exit', function(code) {
    openedProcesses--;
    // checks if is there any element in the queue to process
    var next;
    if ((next=URLQueue.shift()) !== undefined)
    {
      getContent(next.url, next.callback);
    }

    if (code !== 0) {
      if (config.verbose) {
        console.log('url: ' + url + ' ERROR: PhantomJS Exited with code: ' + code);
        if (config.logErrors) {
          console.log('Please the file in the directory /errors');
        }
      }
    } else {
      if (config.verbose) {
        console.log(
          'url: ' + url +
            ' HTMLSnapshot completed successfully.' +
            ' Content-Length: ' + content.length
        );
      }
      callback(content);
    }

    if (config.verbose) {
      // measure the time it taken
      var timeFinish = new Date().getTime();
      console.log('In '+((timeFinish-timeStart)/1000)+' seconds');
    }
  });
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
    }});
}

app.get(/(.*)/, respond);
app.listen(port);
