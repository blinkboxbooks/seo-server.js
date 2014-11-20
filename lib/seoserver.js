'use strict';

var express = require('express');
var request = require('./request');
var logger = require('./logger');
var requestLogger = require('./requestLogger');
var config = require('../bin/config');
var app = express();
var args = process.argv.splice(2);
var port = Number(args[0]) || 3000;

app.use(requestLogger);

app.get(/(.*)/, function (req, res) {
  var pathAndQuery = req.originalUrl || req.url;
  var index = pathAndQuery.indexOf('_escaped_fragment_');
  var protocol;
  var url;
  if (req.headers['x-forwarded-host']) {
    protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    url = protocol + '://' + req.headers['x-forwarded-host'];
  } else {
    url = config.url;
  }
  if (index !== -1) {
    // add the part before _escaped_fragment_, removing any trailing ? or &:
    url += pathAndQuery.slice(0, index - 1) +
      // add the fragment token:
      '#!' +
      // decode the query parameter after _escaped_fragment_= and add it to the url:
      decodeURIComponent(pathAndQuery.slice(index + 19));
  } else {
    // escaped fragment mapping has already been done, but # symbol might need decoding:
    url += pathAndQuery.replace('%23', '#');
  }

  logger.info('Incoming request: ' + pathAndQuery);

  request.makeRequest({
    url: url,
    callback: function (content, code) {
      res.status(code);
      res.send(content);
      request.next();
    }
  });
});

logger.notice('SEO server listening on port ' + port);
app.listen(port);

// Required for testing:
module.exports = app;
