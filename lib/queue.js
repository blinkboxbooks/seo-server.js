'use strict';

var queue = [];
var logger = require('./logger');

function report() {
  logger.info('Currently ' + queue.length + ' requests in the queue.');
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
