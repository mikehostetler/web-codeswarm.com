var fs     = require('fs');
var hogan  = require('hogan.js');
var static = require('./static');
var config = require('./config');

module.exports = serveBase;

var template = fs.readFileSync(__dirname + '/public/index.html', { encoding: 'utf8'} );
var base = hogan.compile(template);
var args = {
  config: config
};

function serveBase(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(base.render(args));
}