var casper = require('casper').create({
	pageSettings: {
		loadImages: false
	}
});

casper.start(casper.cli.args[0]);

// huge viewport to load all lazy content
casper.viewport(1024, 100000, function() {});

// filter the requests of css files
casper.options.onResourceRequested = function(C, requestData, request) {
  if ((/http:\/\/.+?.css/gi).test(requestData['url']) || requestData['Content-Type'] == 'text/css') {
    request.abort();
  }
};

casper.then(function() {
    this.echo(this.getPageContent());
});

casper.run();
