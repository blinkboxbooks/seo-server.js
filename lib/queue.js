var parentLog = require('./parent-log');

var queue = [];

function report() {
	(queue.length > 0) ? parentLog.info('Request queue is ' + queue.length + ' requests long') : parentLog.info('Request queue is empty.');
}

function add(data) {
	queue.push(data);
}

function next(data) {
	return queue.shift();
}

module.exports = {
	add: add,
	report: report,
	next: next
}