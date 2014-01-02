var httpProxy = require('http-proxy');
var config    = require('./config');

var proxy = new httpProxy.RoutingProxy();

module.exports = proxyRoute;

function proxyRoute(req, res) {
  proxy.proxyRequest(req, res, config.strider);
}