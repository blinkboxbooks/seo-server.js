#!/usr/bin/env node

'use strict';

var program = require('commander'),
		forever = require('forever-monitor');

program
  .version('0.0.1')
  .option('-p, --port <location>', 'Specify a port to run on');

program
  .command('start')
  .description('Starts up an SeoServer on default port 3000')
  .action(function () {
    var child = new (forever.Monitor)(__dirname + '/../lib/seoserver.js', {
      options: [program.port]
    });
    child.start();
  });

program.parse(process.argv);
