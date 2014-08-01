var log = require('./log');
var argumentsUtil = require('./arguments-util');

module.exports = {
  info: function() { log.info.apply(this, argumentsUtil.unshift(arguments, 'parent')) },
  error: function() { log.error.apply(this, argumentsUtil.unshift(arguments, 'parent')) }
};