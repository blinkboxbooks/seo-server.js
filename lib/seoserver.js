var express = require('express'),
    app = express(),
    arguments = process.argv.splice(2),
    port = arguments[0] !== 'undefined' ? arguments[0] : 3000,
    config = require('../bin/config'),
    getContent,
    respond;

getContent = function(url, callback) {
  var content = '';
  var timeStart = new Date().getTime();
  var phantom = require('child_process').spawn('phantomjs', [ '--ignore-ssl-errors='+config.ignoreSSLErrors, __dirname + '/phantom-server.js', url]);
  phantom.stdout.setEncoding('utf8');
  phantom.stdout.on('data', function(data) {
    content += data.toString();
  });
  phantom.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
});
  phantom.on('exit', function(code) {
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

respond = function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  var url;
  if(req.headers.referer) {
    url = req.headers.referer;
  }
  console.log(req.headers);
  if(req.headers['x-forwarded-host']) {
    var protocol = (typeof req.headers['x-forwarded-proto'] != 'undefined' && req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    url = protocol + '://' + req.headers['x-forwarded-host'] + req.params[0];

  }
  console.log('url:', url);
  getContent(url, function (content) {
    res.send(content);
  });
}

app.get(/(.*)/, respond);
app.listen(port);
