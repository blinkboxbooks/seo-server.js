'use strict';

var config = require('../bin/config');
var winston = require('winston');

var logFile = config.logFile || './seoserver.log';

var log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)()
  ]
});

module.exports = log;