var static = require('./static');
var proxy  = require('./proxy');
var base   = require('./base');

var server =
exports =
module.exports =
require('http').createServer(handleRequest);

function handleRequest(req, res) {

  /// to prevent buffering
  req.resume();


  // proxy github auth to strider
  if (req.url == '/auth/github') return proxy(req, res);

  static.serve(req, res, triedServingStatic);

  function triedServingStatic(err) {
    if (err) {
      var contentType = req.headers['accept'];
      var isHTML = contentType && contentType.indexOf('text/html') >= 0;
      if (err.status == 404 && isHTML) {
        base(req, res);
      } else {
        res.writeHead(err.status, err.headers);
        res.end();
      }
    }
  }
}
