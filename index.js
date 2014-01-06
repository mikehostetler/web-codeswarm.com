var server = require('browserswarm-ui');

server.config({
  strider: {
    url: "http://localhost:3000"
  }
})

server.addDir(__dirname + '/public');

server.listen(process.env.PORT || 1337, listening);

function listening() {
  console.log('BrowserSwarm Web server listening on port %d', server.address().port);
}