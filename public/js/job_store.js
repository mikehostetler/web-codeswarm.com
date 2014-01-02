var log          = require('bows')('job_store');
var EventEmitter = require('events').EventEmitter;
var inherits     = require('util').inherits;
var extend       = require('xtend');

exports = module.exports = createJobStore;
function createJobStore() {
  return new JobStore;
}

var PHASES = exports.phases =
['environment', 'prepare', 'test', 'deploy', 'cleanup'];

var statusHandlers = {
  'started': function (time) {
    this.started = time;
    this.phase = 'environment';
    this.status = 'running';
  },
  'errored': function (error) {
    this.error = error;
    this.status = 'errored';
  },
  'canceled': 'errored',
  // this is just so we'll trigger the "unknown job" lookup sooner on the dashboard
  'warning': function (warning) {
    if (!this.warnings) {
      this.warnings = [];
    }
    this.warnings.push(warning);
  },
  'plugin-data': function (data) {
    var path = data.path ? [data.plugin].concat(data.path.split('.')) : [data.plugin]
    , last = path.pop()
    , method = data.method || 'replace'
    , parent
    parent = path.reduce(function (obj, attr) {
      return obj[attr] || (obj[attr] = {})
    }, this.plugin_data || (this.plugin_data = {}))
    if (method === 'replace') {
      parent[last] = data.data
    } else if (method === 'push') {
      if (!parent[last]) {
        parent[last] = []
      }
      parent[last].push(data.data)
    } else if (method === 'extend') {
      if (!parent[last]) {
        parent[last] = {}
      }
      extend(parent[last], data.data)
    } else {
      log('Invalid "plugin data" method received from plugin', data.plugin, data.method, data)
    }
  },

  'phase.done': function (data) {
    this.phases[data.phase].finished = data.time;
    this.phases[data.phase].duration = data.elapsed
    this.phases[data.phase].exitCode = data.code;
    if (['prepare', 'environment', 'cleanup'].indexOf(data.phase) !== -1) {
      this.phases[data.phase].collapsed = true;
    }
    if (data.phase === 'test') this.test_status = data.code;
    if (data.phase === 'deploy') this.deploy_status = data.code;
    if (!data.next || !this.phases[data.next]) {
      if (!this.test_status && ! this.deploy_status) this.status = 'passed';
      else this.status = 'failed';
      return;
    }
    this.phase = data.next;
    this.phases[data.next].started = data.time;
  },
  'command.comment': function (data) {
    var phase = this.phases[this.phase]
      , command = extend({}, SKELS.command);
    command.command = data.comment;
    command.comment = true;
    command.plugin = data.plugin;
    command.finished = data.time;
    phase.commands.push(command);
  },
  'command.start': function (data) {
    var phase = this.phases[this.phase]
      , command = extend({}, SKELS.command, data);
    command.started = data.time;
    phase.commands.push(command);
  },
  'command.done': function (data) {
    var phase = this.phases[this.phase]
      , command = ensureCommand(this.phases[this.phase]);
    command.finished = data.time;
    command.duration = data.elapsed;
    command.exitCode = data.exitCode;
    command.merged = command._merged;
  },
  'stdout': function (text) {
    var command = ensureCommand(this.phases[this.phase]);
    command.out += text;
    command._merged += text;
    this.std.out += text;
    this.std.merged += text;
    this.std.merged_latest = text;
  },
  'stderr': function (text) {
    var command = ensureCommand(this.phases[this.phase]);
    command.err += text;
    command._merged += text;
    this.std.err += text;
    this.std.merged += text;
    this.std.merged_latest = text;
  }
}

function JobStore() {
  var store = this;
  store.jobs = {
    public: [],
    yours: []
  };
}

inherits(JobStore, EventEmitter);

var JS = JobStore.prototype;


/// Dashboard Data

JS.dashboard = function dashboard(cb) {
  var self = this;
  this.socket.emit('dashboard:jobs', function(jobs) {
    log('dashboard jobs', jobs);
    self.jobs.yours = jobs.yours;
    self.jobs.public = jobs.public;
    self.jobs.yours.forEach(fixJob);
    self.jobs.public.forEach(fixJob);
    if (cb) cb();
    self.changed();
  });
}


/// ---- Job Store prototype functions: ----

/// connect

JS.connect = function connect(socket, changeCallback) {
  this.socket = socket;
  this.changeCallback = changeCallback;

  for (var status in statusHandlers) {
    socket.on('job.status.' + status, this.update.bind(this, status))
  }

  socket.on('job.new', JS.newJob.bind(this));
};

/// setJobs

JS.setJobs = function setJobs(jobs) {
  log('setJobs', jobs);
  this.jobs.yours = jobs.yours;
  this.jobs.public = jobs.public;
  this.jobs.yours.forEach(fixJob);
  this.jobs.public.forEach(fixJob);
};


/// update - handle update event

JS.update = function update(event, args, access, dontchange) {
  log('update', arguments);
  var id = args.shift()
    , job = this.job(id, access)
    , handler = statusHandlers[event];

  if (!job) return; // this.unknown(id, event, args, access)
  if (!handler) return;

  if ('string' === typeof handler) {
    job.status = handler;
  } else {
    handler.apply(job, args);
  }
  if (!dontchange) this.changed();
};


/// newJob - when server notifies of new job

JS.newJob = function newJob(job, access) {
  if (! job) return;
  if (Array.isArray(job)) job = job[0];

  var jobs = this.jobs[access]
    , found = -1
    , old;

  for (var i=0; i<jobs.length; i++) {
    if (jobs[i] && jobs[i].project.name === job.project.name) {
      found = i;
      break;
    }
  }

  if (found > -1) {
    old = jobs.splice(found, 1)[0];
    job.project.prev = old.project.prev;
  }

  jobs.unshift(job);

  fixJob(job);

  this.emit('newjob', job);
  this.changed();
};


/// job - find a job by id and access level

JS.job = function job(id, access) {
  return search(id, this.jobs[access]);
};

function search(id, jobs) {
  var job;
  for (var i=0; i<jobs.length; i++) {
    job = jobs[i];
    if (job && job._id === id) return job;
  }
}


/// changed - notifies UI of changes

JS.changed = function changed() {
  this.changeCallback();
};


/// load — loads a job

JS.load = function load(jobId, project, cb) {
  var self = this;

  var destination = project.access_level > 1 ? 'yours' : 'public';

  this.socket.emit('build:job', jobId, function(job) {
    /// HACK: the socket emits a job that is missing the `project`
    /// structure (instead the `project` value is a string)
    /// Attach a proper project structure to it.
    job.project = project;

    /// New job has unknown access?
    self.newJob(job, destination);
    cb(job);
    self.changed();
  });
};

function ensureCommand(phase) {
  var command = phase.commands[phase.commands.length - 1];
  if (!command || typeof command.finished != 'undefined') {
    command = extend({}, SKELS.command);
    phase.commands.push(command);
  }
  return command;
}


/// HACK: Fix job structure

function fixJob(job) {

  if (! job.phases) {
    job.phases = {};
    PHASES.forEach(function(phase) {
      job.phases[phase] = {
        commands: []
      };
    });
  }

  if (! job.phase) job.phase = PHASES[0];

  if (! job.std) job.std = extend({}, SKELS.job.std);
}


var SKELS = {
  job: {
    id: null,
    data: null,
    phases: {},
    phase: PHASES[0],
    queued: null,
    started: null,
    finished: null,
    test_status: null,
    deploy_status: null,
    plugin_data: {},
    warnings: [],
    std: {
      out: '',
      err: '',
      merged: '',
      merged_latest: ''
    }
  },
  command: {
    out: '',
    err: '',
    merged: '',
    _merged: '',
    started: null,
    command: '',
    plugin: ''
  },
  phase: {
    finished: null,
    exitCode: null,
    commands: []
  }
}