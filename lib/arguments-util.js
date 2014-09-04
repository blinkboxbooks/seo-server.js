'use strict';

module.exports = {
	push: function(args, addition) {
    Array.prototype.push.call(args, addition);
    return args;
	},

  unshift: function(args, addition) {
    Array.prototype.unshift.call(args, '[' + addition + ']');
    return args;
  }
};