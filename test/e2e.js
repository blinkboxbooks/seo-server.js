'use strict';

var request = require('supertest');
var app = require('../lib/seoserver');

describe('SEO Server API test', function () {

  it('GET / should return rendered blinkboxbooks.com/#!/categories content', function (done) {
    request(app)
      .get('/?_escaped_fragment_=/categories')
      .expect(200)
	    .expect(function (res) {
		    // Simple test for the existence of the string "Humour", which is one of the rendered categories:
		    if (!/Humour/.test(res.text)) {
			    throw new Error('Failed to return rendered categories.');
		    }
	    })
      .end(function(err) {
        if (err) {
          return done(err);
        }
        done();
      });
  });

});
