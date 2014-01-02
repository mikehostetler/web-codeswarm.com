var config = require('konphyg')(__dirname);

var strider = config('strider');
strider.url = '//' + strider.host;
if (strider.port) strider.url += ':' + strider.port;

module.exports = {
  strider: strider
};