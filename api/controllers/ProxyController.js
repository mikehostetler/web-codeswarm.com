var url       = require('url');
var httpProxy = require('http-proxy');

var proxy = new httpProxy.RoutingProxy();

var conf = {
  host: 'localhost',
  port: 3000
};

function ProxyController(req, res) {
  proxy.proxyRequest(req, res, conf);
}

module.exports = {
  index: ProxyController
};