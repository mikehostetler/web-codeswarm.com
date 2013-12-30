var fork   = require('child_process').fork;
var server = require('./server');

var port = process.env.PORT || 1337;
server.listen(port, listening);

function listening() {
  console.log('BrowserSwarm Web server listening on port %d', port);
}

var devMode = (process.env.NODE_ENV || 'development') == 'development';
if (devMode) launchWatcher();

var watcher;
function launchWatcher() {
  console.log('development mode detected; launching watcher...');
  if (! exiting) {
    watcher = fork('./watch');
    watcher.once('exit', launchWatcher);
  }
}

var exiting = false;
process.once('SIGINT', function() {
  exiting = true;
  if (watcher) watcher.kill();
  process.exit();
});