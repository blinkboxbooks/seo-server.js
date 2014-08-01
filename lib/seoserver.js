var express = require('express');

var config = require('../bin/config');

var request = require('./request');
var parentLog = require('./parent-log');

var app = express();

app.get(/(.*)/, function (req, res) {
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

  request.makeRequest({
    url: url,
    callback: function (content, code) {
      // the precedence is to the not found because it is a broken link
      if (code == 404) {
        res.status(404);
      } 
      else if (code == 500) {
        res.status(500);
      }

      res.send(content);

      request.next();
    }
  });
});

var arguments = process.argv.splice(2);
var port = arguments[0] !== 'undefined' ? arguments[0] : 3000;

parentLog.info('Server started on port ' + port);
app.listen(port);
