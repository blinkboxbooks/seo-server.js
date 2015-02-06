# SEO Server

This SEO server uses PhantomJS to render a version of a client side web application to present to a search engine robot that does not support running Javascript. 

Nginx routes to this application, recognising incoming request from search engine robots (via the `_escaped_fragment_` portion) to produce HTML.

Don't do this. Render at least some of the page on the server.