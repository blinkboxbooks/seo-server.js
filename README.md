# SEO Server

This SEO server uses PhantomJS to render a version of a client side web application to present to search engine robot that does not support running Javascript. 

Nginx routes traffic to this incoming from search engine robots (recognising the _escaped_fragment_ portion) to this application which produces the HTML.

Don't do this. Render at least some of the page on the server.