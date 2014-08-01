module.exports = {
  requestsQueue: function() {
    (URLQueue.length > 0) ? parentLog.info('Request queue is ' + URLQueue.length + ' requests long') : parentLog.info('Request queue is empty.');
  },

  processes: function() {
    if (openedProcesses > 0) {
      parentLog.info('Currently ' + openedProcesses + ' processes running of a maximum of ' + config.maxProcesses);
    }
    else {
      parentLog.info('No open processes, maximum of ' + config.maxProcesses + ' availiable');
    }
  }
}