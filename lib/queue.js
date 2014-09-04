'use strict';

var parentLog = require('./parent-log');

var queue = [];

function report() {

  if (queue.length > 0) {
    parentLog.info('Request queue is ' + queue.length + ' requests long');
  }
  else {
    parentLog.info('Request queue is empty.');
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