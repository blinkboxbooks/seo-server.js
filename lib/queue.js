'use strict';

var queue = [];
var logger = require('./logger');

function report() {
  if (queue.length > 0) {
	  logger.info('Requests queue is ' + queue.length + ' requests long.');
  } else {
	  logger.info('Requests queue is empty.');
  }
}

function add(data) {
  queue.push(data);
}

function next() {
  return queue.shift();
}

module.exports = {
  add: add,
  report: report,
  next: next
};
