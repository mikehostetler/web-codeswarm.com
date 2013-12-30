var static = require('node-static');

var server =
exports =
module.exports =
require('http').createServer(handleRequest);

var fileServer = new static.Server('./public');

function handleRequest(req, res) {
  fileServer.serve(req, res, triedServingStatic);

  function triedServingStatic(err) {
    if (err) {
      var contentType = req.headers['content-type'];
      var isHTML = contentType && contentType.indexOf('text/html') == 0;
      if (err.status == 404 && isHTML) {
        fileServer.serveFile('index.html', 200, {}, req, res);
      } else {
        res.writeHead(err.status, err.headers);
        res.end();
      }
    }
  }
}