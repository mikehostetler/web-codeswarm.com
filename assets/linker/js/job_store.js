(function(global) {

  global.JobStore = createJobStore;
  function createJobStore() {
    return new JobStore;
  }

  var PHASES = ['environment', 'prepare', 'test', 'deploy', 'cleanup'];

  var statusHandlers = {
    'phase.done': function() {
      this.phase = data.next;
    },

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
    'phase.done': function (data) {
      this.phase = PHASES.indexOf(data.phase) + 1;
    },
    // this is just so we'll trigger the "unknown job" lookup sooner on the dashboard
    'stdout': function (text) {},
    'stderr': function (text) {},
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
        _.extend(parent[last], data.data)
      } else {
        console.error('Invalid "plugin data" method received from plugin', data.plugin, data.method, data)
      }
    }
  }

  function JobStore() {
    this.jobs = {
      dashboard: dashboard.bind(this),
      public: [],
      yours: []
    };
  }
  var JS = JobStore.prototype;

  function dashboard(cb) {
    var self = this;
    this.socket.emit('dashboard:jobs', function(jobs) {
      self.jobs.yours = jobs.yours;
      self.jobs.public = jobs.public;
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


  /// update - handle update event

  JS.update = function udpate(event, args, access, dontchange) {
    var id = args.shift()
      , job = this.job(id, access)
      , handler = statusHandlers[event];
    if (!job) return this.unknown(id, event, args, access)
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
    console.log('newJob', this);
    if (! job) return;
    job = job[0];

    var jobs = this.jobs[access]
      , found = -1
      , old;

    if (! jobs) return;

    for (var i=0; i<jobs.length; i++) {
      if (jobs[i].project.name === job.project.name) {
        found = i;
        break;
      }
    }
    if (found !== -1) {
      old = jobs.splice(found, 1)[0];
      job.project.prev = old.project.prev;
    }
    if (job.phases) {
      // get rid of extra data - we don't need it.
      // note: this won't be passed up anyway for public projects
      cleanJob(job);
    }
    job.phase = 'environment';
    jobs.unshift(job);
    this.changed();
  };


  /// job - find a job by id and access level

  JS.job = function job(id, access) {
    var jobs = this.jobs[access];
    for (var i=0; i<jobs.length; i++) {
      if (jobs[i]._id === id) return jobs[i];
    }
  };


  /// changed - notifies UI of changes

  JS.changed = function changed() {
    this.changeCallback();
  };


  function cleanJob(job) {
    delete job.phases;
    delete job.std;
    delete job.stdout;
    delete job.stderr;
    delete job.stdmerged;
    delete job.plugin_data;
  }
})(window);
