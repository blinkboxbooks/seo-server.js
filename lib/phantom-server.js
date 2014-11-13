'use strict';

/* global phantom */

var page = require('webpage').create();
var system = require('system');
var config = require('../bin/config');
var lastReceived = new Date().getTime();
var requestCount = 0;
var responseCount = 0;
var requestIds = [];
var minResponses = 1;
var checkComplete;
var checkCompleteInterval;
var pageLoaded;
var fs;
var url;

page.viewportSize = { width: 1024, height: 10000 };

page.loadImages = config.loadImages;

page.onResourceReceived = function (response) {
  if(requestIds.indexOf(response.id) !== -1) {
    if (config.debugPhantom) {
      console.error('Received: ' + response.id + ' ' +
          response.contentType + ' ' +
          response.url + ' ' +
          response.bodySize + ' ' +
          response.stage + ' ' +
          response.status + ' ' +
          response.statusText + ' ' +
          response.redirectURL
      );
    }

    if (responseCount === 1) { // second response
      minResponses = requestCount;
    }

    lastReceived = new Date().getTime();
    responseCount++;
    requestIds[requestIds.indexOf(response.id)] = null;
  }
};

page.onResourceRequested = function (request, req) {
  if ((/https?:\/\/.+?\.css/gi).test(request.url) || request['Content-Type'] === 'text/css' ||
    (/https?:\/\/.+?\.(jpg|gif|png|jpeg)/gi).test(request.url) ||
    (/^data:image/gi).test(request.url)) {
    req.abort();
  } else if(requestIds.indexOf(request.id) === -1) {
    if (config.debugPhantom) {
      console.error('Requested: ' + request.id + ' ' + request.method + ' ' + request.url);
    }
    requestIds.push(request.id);
    requestCount++;
    // check if a 'not found' error happens
    if (request.url.indexOf('404_view.html')>-1) {
      system.stderr.write('404');
    }
    if (request.url.indexOf('500_view.html')>-1) {
      system.stderr.write('500');
    }
  }
};

// Error controls
if (config.logErrors) {
  fs = require('fs');

  page.onResourceError = function(resourceError) {
    if (!fs.exists('errors')) {
      fs.makeDirectory('errors');
    }

    var date = new Date();
    var msg = '['+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+'] Unable to load resource (#' + resourceError.id + ' URL:' + resourceError.url + ') ';
    msg += 'Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString+'\n';

    fs.write('errors/'+date.getFullYear()+date.getMonth()+date.getDate()+'_error.log', msg, 'a');

    if (config.debugPhantom) {
      console.log(msg);
    }
  };
}

url = system.args[1];

page.open(url, function () {
	pageLoaded = true;
});

checkComplete = function () {
  var timeDiff = new Date().getTime() - lastReceived;
  if (pageLoaded &&
    responseCount >= minResponses &&
    timeDiff > config.checkCompleteTimeDiff &&
    requestCount === responseCount){
    clearInterval(checkCompleteInterval);
    console.log(page.content);
    page.close();
    phantom.exit(0);
  } else {
    if (timeDiff > config.checkCompleteTimeout) {


      if (config.debugPhantom) {
        console.error(
            'requestCount: ' + requestCount +
            ' !== responseCount: ' + responseCount + '.' +
            ' You might have a synchronous ajax call that is NOT being captured by onResourceReceived.' +
            ' See: https://github.com/ariya/phantomjs/issues/11284'
        );
        console.error('FORCED EXIT STATUS 10. Incomplete in ' + timeDiff + ' seconds.');
      }


      page.close();
      phantom.exit(10);
    }
  }
};

checkCompleteInterval = setInterval(checkComplete, 1);
