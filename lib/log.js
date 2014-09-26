'use strict';

var winston = require('winston');

var log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)()
  ]
});

module.exports = log;