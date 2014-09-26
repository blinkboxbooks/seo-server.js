'use strict';

var express = require('express'),
		request = require('./request'),
		logger = require('./logger'),
		requestLogger = require('./requestLogger'),
		app = express(),
		args = process.argv.splice(2),
		port = args[0] !== 'undefined' ? Number(args[0]) : 3000;

app.use(requestLogger);

app.get(/(.*)/, function (req, res) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'X-Requested-With');

	var protocol,
			url;
  if (req.headers['x-forwarded-host']) {
    protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    url = protocol + '://' + req.headers['x-forwarded-host'] + req.params[0];
  } else {
	  logger.warn('Missing x-forwarded-host header.');
	  res.send(400);
	  return;
  }
  url = url.replace('%23', '#');

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
