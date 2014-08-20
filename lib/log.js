var config = require('../bin/config');
var winston = require('winston');

var logFile = config.logFile || './seoserver.log';

var log = new (winston.Logger)({
	transports: [
	  new (winston.transports.Console)(),
	  new (winston.transports.File)({ filename: logFile, json: false })
	]
});

module.exports = log;