'use strict';

var log = require('./log');
var argumentsUtil = require('./arguments-util');

var ChildLog = function(pid, url) {
  this.pid = pid;
  this.url = url;
};

ChildLog.prototype.makeAdditions = function(args) {
  argumentsUtil.unshift(args, this.pid);
  argumentsUtil.push(args, this.url);

  return args;
};

ChildLog.prototype.info = function() {
  log.info.apply(this, this.makeAdditions(arguments));
};

ChildLog.prototype.error = function() {
  log.error.apply(this, this.makeAdditions(arguments));
};

module.exports = ChildLog;