var JobStore = require('./job_store');
var jobStore = JobStore();

exports = module.exports = BuildStrider;

function BuildStrider($http) {
  return new Strider($http);
}


var socket;
var scopes = [];

function Strider($http, opts) {
  if (! opts) opts = {};
  if (typeof opts == 'string')
    opts = { url: opts };

  this.url = opts.url || '//localhost:3000';

  this.phases  = JobStore.phases;

  this.store = jobStore;

  this.$http = $http;
}


var S = Strider.prototype;


/// changed - invoked when UI needs updating
function changed() {
  scopes.forEach(function(scope) {
    scope.$digest();
  });
}


//// ---- Strider prototype functions

/// connect websocket

S.connect = function(scope, jobs, cb) {
  if (typeof jobs == 'function') {
    cb = jobs;
    jobs = undefined;
  }

  if (! socket) {
    this.socket = socket = io.connect(this.url);
    jobStore.connect(socket, changed);
  }

  /// connects job store to new socket
  if (jobs) {
    jobStore.setJobs(jobs);
    if (cb) cb();
  } else {
    jobStore.connect(socket, changed);
    this.store.dashboard(cb);
  }

  scopes.push(scope);
  scope.$on('$destroy', function() {
    var found = false;
    for (var i = 0 ; ! found && i < scopes.length; i ++) {
      if (scopes[i] == scope) {
        found = true;
        scopes.splice(i, 1);
      }
    }
  });
};


/// deploy

S.deploy = function deploy(project) {
  this.socket.emit('deploy', project.name || project);
};

S.test = function test(project) {
  this.socket.emit('test', project.name || project);
};


/// job

S.job = function job(jobId, project, cb) {
  jobStore.load(jobId, project, cb);
};


/// HTTP

S.post = function(url, body, cb) {
  return this.request('POST', url, body, cb);
};

S.put = function(url, body, cb) {
  return this.request('PUT', url, body, cb);
};

S.del = function(url, body, cb) {
  return this.request('DELETE', url, body, cb);
};

S.get = function(url, cb) {
  return this.request('GET', url, cb);
};

S.request = function(method, url, body, cb) {
  if (typeof body == 'function') {
    cb = body;
    body = undefined;
  }

  var req = this.$http({
    method: method,
    url: this.url + url,
    data: JSON.stringify(body)
  });

  req.success(cb);

  return req;
}