var httpProxy = require('http-proxy');

var proxy = new httpProxy.RoutingProxy();

module.exports = proxyRoute;

var proxyConf = {
  host: 'localhost',
  port: 3000
};

function proxyRoute(req, res) {
  proxy.proxyRequest(req, res, proxyConf);
}