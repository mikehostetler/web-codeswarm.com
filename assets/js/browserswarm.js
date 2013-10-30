;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var App =
exports =
module.exports =
angular.module('BrowserSwarmApp', ['ngRoute', 'ngResource', 'ngSanitize']);

var Strider = require('./strider');

/// App Configuration

App.
  config(['$routeProvider', '$locationProvider', '$httpProvider', configureApp]).
  factory('Strider', ['$resource', Strider]);


require('./filters/ansi');

function configureApp($routeProvider, $locationProvider, $httpProvider) {

  /// HTTP

  /// Always do HTTP requests with credentials,
  /// effectively sending out the session cookie
  $httpProvider.defaults.withCredentials = true;

  var interceptor = ['$rootScope', '$q', function($scope, $q) {

    function success(response) {
      return response;
    }

    function error(response) {
      var status = response.status;

      var resp = response.data;
      if (resp) try { resp = JSON.parse(resp); } catch(err) { }

      if (resp.message) resp = resp.message;
      if (! resp) {
        resp = 'Error in response';
        if (status) resp += ' (' + status + ')';
      }

      $scope.$emit('error', new Error(resp));

      return $q.reject(response);
    }

    return function (promise) {
      return promise.then(success, error);
    }

  }];

  $httpProvider.responseInterceptors.push(interceptor);


  /// Enable hashbang-less routes

  $locationProvider.html5Mode(true);

  /// Routes

  $routeProvider.
    when('/dashboard', {
      templateUrl: '/partials/dashboard.html',
      controller: 'DashboardCtrl'
    }).
    when('/login', {
      templateUrl: '/partials/login.html',
      controller: 'LoginCtrl'
    }).
    when('/:owner/:repo/job/:jobid', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    });
}


// Simple log function to keep the example simple
function log () {
  if (typeof console !== 'undefined') {
    console.log.apply(console, arguments);
  }
}
},{"./filters/ansi":6,"./strider":8}],2:[function(require,module,exports){
var App = require('../app');

App.controller('DashboardCtrl', ['$scope', '$location', 'Strider', DashboardCtrl]);

function DashboardCtrl($scope, $location, Strider) {

  Strider.Session.get(function(user) {
    if (! user.user) $location.path('/login');
    else authenticated();
  });

  function authenticated() {
    $scope.jobs = Strider.jobs;
    Strider.connect($scope);
    Strider.jobs.dashboard();
  }

  $scope.deploy = function deploy(project) {
    Strider.deploy(project);
  };

}
},{"../app":1}],3:[function(require,module,exports){
var App = require('../app');

App.controller('ErrorCtrl', ['$scope', '$rootScope', ErrorCtrl]);

function ErrorCtrl($scope, $rootScope) {
  $scope.error = {};

  $rootScope.$on('error', function(ev, err) {
    $scope.error.message = err.message || err;
  });

  $rootScope.$on('$routeChangeStart', function() {
    $scope.error.message = '';
  });
}
},{"../app":1}],4:[function(require,module,exports){
var App = require('../app');

App.controller('JobCtrl', ['$scope', '$routeParams', 'Strider', JobCtrl]);

function JobCtrl($scope, $routeParams, Strider) {

  $scope.phases = Strider.phases;

  var projectSearchOptions = {
    owner: $routeParams.owner,
    repo:  $routeParams.repo
  };

  Strider.Project.get(projectSearchOptions, function(project) {
    $scope.repo = project;
  });

  Strider.connect($scope);
  Strider.job($routeParams.jobid, function(job) {
    $scope.job = job;
  });

  Strider.ProjectJobs.query(projectSearchOptions, function(jobs) {
    $scope.jobs = jobs;
  });

  $scope.deploy = function deploy(job) {
    Strider.deploy(job.project);
  };

  $scope.test = function test(job) {
    Strider.test(job.project);
  };

}
},{"../app":1}],5:[function(require,module,exports){
var App = require('../app');

App.controller('LoginCtrl', ['$scope', '$location', 'Strider', LoginCtrl]);

function LoginCtrl($scope, $location, Strider) {

  Strider.Session.get(function(user) {
    if (user.id) $location.path('/dashboard');
  });

  $scope.user = {};

  $scope.login = function login(user) {
    var session = new (Strider.Session)(user);
    session.$save(function() {
      $location.path('/dashboard');
    });
  };
}
},{"../app":1}],6:[function(require,module,exports){
var app = require('../app');

app.filter('ansi', function () {
  return function (input) {
    if (!input) return '';
    var text = input.replace(/^[^\n\r]*\u001b\[2K/gm, '')
                    .replace(/\u001b\[K[^\n\r]*/g, '')
                    .replace(/[^\n]*\r([^\n])/g, '$1')
                    .replace(/^[^\n]*\u001b\[0G/gm, '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/'/g, '&#39;')
                    .replace(/"/g, '&quot;');
    return ansifilter(text);
  }
});

function ansiparse(str) {
  //
  // I'm terrible at writing parsers.
  //
  var matchingControl = null,
      matchingData = null,
      matchingText = '',
      ansiState = [],
      result = [],
      output = "",
      state = {},
      eraseChar;

  var handleResult = function(p) {
    var classes = [];

    p.foreground && classes.push(p.foreground);
    p.background && classes.push('bg-' + p.background);
    p.bold       && classes.push('bold');
    p.italic     && classes.push('italic');
    if (!p.text) {
      return;
    }
    if (classes.length === 0) {
      return output += p.text
    }
    var span = '<span class="' + classes.join(' ') + '">' + p.text + '</span>'
    output += span
  }
  //
  // General workflow for this thing is:
  // \033\[33mText
  // |     |  |
  // |     |  matchingText
  // |     matchingData
  // matchingControl
  //
  // In further steps we hope it's all going to be fine. It usually is.
  //

  //
  // Erases a char from the output
  //
  eraseChar = function () {
    var index, text;
    if (matchingText.length) {
      matchingText = matchingText.substr(0, matchingText.length - 1);
    }
    else if (result.length) {
      index = result.length - 1;
      text = result[index].text;
      if (text.length === 1) {
        //
        // A result bit was fully deleted, pop it out to simplify the final output
        //
        result.pop();
      }
      else {
        result[index].text = text.substr(0, text.length - 1);
      }
    }
  };

  for (var i = 0; i < str.length; i++) {
    if (matchingControl !== null) {
      if (matchingControl == '\033' && str[i] == '\[') {
        //
        // We've matched full control code. Lets start matching formating data.
        //

        //
        // "emit" matched text with correct state
        //
        if (matchingText) {
          state.text = matchingText;
          handleResult(state);
          state = {};
          matchingText = "";
        }

        matchingControl = null;
        matchingData = '';
      }
      else {
        //
        // We failed to match anything - most likely a bad control code. We
        // go back to matching regular strings.
        //
        matchingText += matchingControl + str[i];
        matchingControl = null;
      }
      continue;
    }
    else if (matchingData !== null) {
      if (str[i] == ';') {
        //
        // `;` separates many formatting codes, for example: `\033[33;43m`
        // means that both `33` and `43` should be applied.
        //
        // TODO: this can be simplified by modifying state here.
        //
        ansiState.push(matchingData);
        matchingData = '';
      }
      else if (str[i] == 'm') {
        //
        // `m` finished whole formatting code. We can proceed to matching
        // formatted text.
        //
        ansiState.push(matchingData);
        matchingData = null;
        matchingText = '';

        //
        // Convert matched formatting data into user-friendly state object.
        //
        // TODO: DRY.
        //
        ansiState.forEach(function (ansiCode) {
          if (ansiparse.foregroundColors[ansiCode]) {
            state.foreground = ansiparse.foregroundColors[ansiCode];
          }
          else if (ansiparse.backgroundColors[ansiCode]) {
            state.background = ansiparse.backgroundColors[ansiCode];
          }
          else if (ansiCode == 39) {
            delete state.foreground;
          }
          else if (ansiCode == 49) {
            delete state.background;
          }
          else if (ansiparse.styles[ansiCode]) {
            state[ansiparse.styles[ansiCode]] = true;
          }
          else if (ansiCode == 22) {
            state.bold = false;
          }
          else if (ansiCode == 23) {
            state.italic = false;
          }
          else if (ansiCode == 24) {
            state.underline = false;
          }
        });
        ansiState = [];
      }
      else {
        matchingData += str[i];
      }
      continue;
    }

    if (str[i] == '\033') {
      matchingControl = str[i];
    }
    else if (str[i] == '\u0008') {
      eraseChar();
    }
    else {
      matchingText += str[i];
    }
  }

  if (matchingText) {
    state.text = matchingText + (matchingControl ? matchingControl : '');
    handleResult(state);
  }
  return output;
}

ansiparse.foregroundColors = {
  '30': 'black',
  '31': 'red',
  '32': 'green',
  '33': 'yellow',
  '34': 'blue',
  '35': 'magenta',
  '36': 'cyan',
  '37': 'white',
  '90': 'grey'
};

ansiparse.backgroundColors = {
  '40': 'black',
  '41': 'red',
  '42': 'green',
  '43': 'yellow',
  '44': 'blue',
  '45': 'magenta',
  '46': 'cyan',
  '47': 'white'
};

ansiparse.styles = {
  '1': 'bold',
  '3': 'italic',
  '4': 'underline'
};

function ansifilter(data, plaintext, cache) {

  // handle the characters for "delete line" and "move to start of line"
  var startswithcr = /^[^\n]*\r[^\n]/.test(data);
  var output = ansiparse(data);

  var res = output.replace(/\033/g, '');
  if (startswithcr) res = '\r' + res;

  return res;
}


},{"../app":1}],7:[function(require,module,exports){
var extend = require('xtend');

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
      extend(parent[last], data.data)
    } else {
      console.error('Invalid "plugin data" method received from plugin', data.plugin, data.method, data)
    }
  },

  'phase.done': function (data) {
    if (! this.phases) return;
    this.phases[data.phase].finished = data.time;
    this.phases[data.phase].duration = data.elapsed
    this.phases[data.phase].exitCode = data.code;
    if (['prepare', 'environment', 'cleanup'].indexOf(data.phase) !== -1) {
      this.phases[data.phase].collapsed = true;
    }
    if (data.phase === 'test') this.test_status = data.code;
    if (data.phase === 'deploy') this.deploy_status = data.code;
    if (!data.next || !this.phases[data.next]) return;
    this.phase = data.next;
    this.phases[data.next].started = data.time;
  },
  'command.comment': function (data) {
    if (! this.phases) return;
    var phase = this.phases[this.phase]
      , command = extend({}, SKELS.command);
    command.command = data.comment;
    command.comment = true;
    command.plugin = data.plugin;
    command.finished = data.time;
    phase.commands.push(command);
  },
  'command.start': function (data) {
    if (! this.phases) return;
    var phase = this.phases[this.phase]
      , command = extend({}, SKELS.command, data);
    command.started = data.time;
    phase.commands.push(command);
  },
  'command.done': function (data) {
    if (! this.phases) return;
    var phase = this.phases[this.phase]
      , command = phase.commands[phase.commands.length - 1];
    command.finished = data.time;
    command.duration = data.elapsed;
    command.exitCode = data.exitCode;
    command.merged = command._merged;
  },
  'stdout': function (text) {
    if (! this.phases) return;
    var command = ensureCommand(this.phases[this.phase]);
    command.out += text;
    command._merged += text;
    this.std.out += text;
    this.std.merged += text;
    this.std.merged_latest = text;
  },
  'stderr': function (text) {
    if (! this.phases) return;
    var command = ensureCommand(this.phases[this.phase]);
    command.err += text;
    command._merged += text;
    this.std.err += text;
    this.std.merged += text;
    this.std.merged_latest = text;
  }
}

function JobStore() {
  this.jobs = {
    dashboard: dashboard.bind(this),
    public: [],
    yours: [],
    limbo: []
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

JS.update = function update(event, args, access, dontchange) {
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
  if (! job) return;
  if (Array.isArray(job)) job = job[0];

  var jobs = this.jobs[access]
    , found = -1
    , old;

  if (! jobs) return;

  function search() {
    for (var i=0; i<jobs.length; i++) {
      if (jobs[i].project.name === job.project.name) {
        found = i;
        break;
      }
    }
  }

  search();
  if (found < 0) {
    /// try limbo
    jobs = this.jobs.limbo;
    search();
    if (found) {
      jobs = this.jobs[access];
      jobs.unshift(this.jobs.limbo[found]);
      this.jobs.limbo.splice(found, 1);
    }
  }

  if (found !== -1) {
    old = jobs.splice(found, 1)[0];
    job.project.prev = old.project.prev;
  }
  // if (job.phases) {
  //   // get rid of extra data - we don't need it.
  //   // note: this won't be passed up anyway for public projects
  //   cleanJob(job);
  // }
  //job.phase = 'environment';
  jobs.unshift(job);
  this.changed();
};


/// job - find a job by id and access level

JS.job = function job(id, access) {
  var jobs = this.jobs[access];
  var job = search(id, jobs);
  // if not found, try limbo
  if (! job){
    job = search(id, this.jobs.limbo);
    if (job) {
      jobs.unshift(job);
      this.jobs.limbo.splice(this.jobs.limbo.indexOf(job), 1);
    }
  }
  return job;
};

function search(id, jobs) {
  for (var i=0; i<jobs.length; i++) {
    if (jobs[i]._id === id) return jobs[i];
  }
}


/// changed - notifies UI of changes

JS.changed = function changed() {
  this.changeCallback();
};


/// load — loads a job

JS.load = function load(jobId, cb) {
  var self = this;
  this.socket.emit('build:job', jobId, function(job) {
    self.newJob(job, 'limbo');
    cb(job);
    self.changed();
  });
};

function ensureCommand(phase) {
  var command = phase.commands[phase.commands.length - 1];
  if (!command || typeof(command.finished) !== 'undefined') {
    command = extend({}, SKELS.command);
    phase.commands.push(command);
  }
  return command;
}
},{"xtend":10}],8:[function(require,module,exports){
var JobStore = require('./job_store');
var jobStore = JobStore();

exports = module.exports = BuildStrider;

function BuildStrider($resource) {
  return new Strider($resource);
}


var socket;
var scopes = [];

function Strider($resource, opts) {
  if (! opts) opts = {};
  if (typeof opts == 'string')
    opts = { url: opts };

  this.url = opts.url || '//localhost:3000';

  /// Restful API setup
  var apiBase  = this.url + '/api';
  var loginURL = this.url + '/login';
  this.Jobs    = $resource(apiBase + '/jobs/');
  this.Session = $resource(apiBase + '/session/');
  this.Project = $resource(apiBase + '/project/:owner/:repo/');
  this.ProjectJobs = $resource(this.url + '/:owner/:repo/jobs/');

  this.jobs    = jobStore.jobs;
  this.phases  = JobStore.phases;
}


var S = Strider.prototype;


/// changed - invoked when UI needs updating
function changed() {
  scopes.forEach(function(scope) {
    scope.$digest();
  });
}


//// ---- Strider prototype functions

/// connect

S.connect = function(scope) {
  if (! socket) {
    socket = io.connect(this.url);

    /// connects job store to new socket
    jobStore.connect(socket, changed);
  }
  this.socket = socket;

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

S.job = function job(jobId, cb) {
  jobStore.load(jobId, cb);
};
},{"./job_store":7}],9:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],10:[function(require,module,exports){
var Keys = require("object-keys")
var hasKeys = require("./has-keys")

module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        if (!hasKeys(source)) {
            continue
        }

        var keys = Keys(source)

        for (var j = 0; j < keys.length; j++) {
            var name = keys[j]
            target[name] = source[name]
        }
    }

    return target
}

},{"./has-keys":9,"object-keys":12}],11:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

var isFunction = function (fn) {
	var isFunc = (typeof fn === 'function' && !(fn instanceof RegExp)) || toString.call(fn) === '[object Function]';
	if (!isFunc && typeof window !== 'undefined') {
		isFunc = fn === window.setTimeout || fn === window.alert || fn === window.confirm || fn === window.prompt;
	}
	return isFunc;
};

module.exports = function forEach(obj, fn) {
	if (!isFunction(fn)) {
		throw new TypeError('iterator must be a function');
	}
	var i, k,
		isString = typeof obj === 'string',
		l = obj.length,
		context = arguments.length > 2 ? arguments[2] : null;
	if (l === +l) {
		for (i = 0; i < l; i++) {
			if (context === null) {
				fn(isString ? obj.charAt(i) : obj[i], i, obj);
			} else {
				fn.call(context, isString ? obj.charAt(i) : obj[i], i, obj);
			}
		}
	} else {
		for (k in obj) {
			if (hasOwn.call(obj, k)) {
				if (context === null) {
					fn(obj[k], k, obj);
				} else {
					fn.call(context, obj[k], k, obj);
				}
			}
		}
	}
};


},{}],12:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":14}],13:[function(require,module,exports){
var toString = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toString.call(value);
	var isArguments = str === '[object Arguments]';
	if (!isArguments) {
		isArguments = str !== '[object Array]'
			&& value !== null
			&& typeof value === 'object'
			&& typeof value.length === 'number'
			&& value.length >= 0
			&& toString.call(value.callee) === '[object Function]';
	}
	return isArguments;
};


},{}],14:[function(require,module,exports){
(function () {
	"use strict";

	// modified from https://github.com/kriskowal/es5-shim
	var has = Object.prototype.hasOwnProperty,
		toString = Object.prototype.toString,
		forEach = require('./foreach'),
		isArgs = require('./isArguments'),
		hasDontEnumBug = !({'toString': null}).propertyIsEnumerable('toString'),
		hasProtoEnumBug = (function () {}).propertyIsEnumerable('prototype'),
		dontEnums = [
			"toString",
			"toLocaleString",
			"valueOf",
			"hasOwnProperty",
			"isPrototypeOf",
			"propertyIsEnumerable",
			"constructor"
		],
		keysShim;

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object',
			isFunction = toString.call(object) === '[object Function]',
			isArguments = isArgs(object),
			theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError("Object.keys called on a non-object");
		}

		if (isArguments) {
			forEach(object, function (value) {
				theKeys.push(value);
			});
		} else {
			var name,
				skipProto = hasProtoEnumBug && isFunction;

			for (name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(name);
				}
			}
		}

		if (hasDontEnumBug) {
			var ctor = object.constructor,
				skipConstructor = ctor && ctor.prototype === object;

			forEach(dontEnums, function (dontEnum) {
				if (!(skipConstructor && dontEnum === 'constructor') && has.call(object, dontEnum)) {
					theKeys.push(dontEnum);
				}
			});
		}
		return theKeys;
	};

	module.exports = keysShim;
}());


},{"./foreach":11,"./isArguments":13}]},{},[2,3,4,5])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2FwcC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvZGFzaGJvYXJkLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9lcnJvci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvam9iLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9sb2dpbi5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvZmlsdGVycy9hbnNpLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9qb2Jfc3RvcmUuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL3N0cmlkZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL2hhcy1rZXlzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2ZvcmVhY2guanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2lzQXJndW1lbnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvc2hpbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEFwcCA9XG5leHBvcnRzID1cbm1vZHVsZS5leHBvcnRzID1cbmFuZ3VsYXIubW9kdWxlKCdCcm93c2VyU3dhcm1BcHAnLCBbJ25nUm91dGUnLCAnbmdSZXNvdXJjZScsICduZ1Nhbml0aXplJ10pO1xuXG52YXIgU3RyaWRlciA9IHJlcXVpcmUoJy4vc3RyaWRlcicpO1xuXG4vLy8gQXBwIENvbmZpZ3VyYXRpb25cblxuQXBwLlxuICBjb25maWcoWyckcm91dGVQcm92aWRlcicsICckbG9jYXRpb25Qcm92aWRlcicsICckaHR0cFByb3ZpZGVyJywgY29uZmlndXJlQXBwXSkuXG4gIGZhY3RvcnkoJ1N0cmlkZXInLCBbJyRyZXNvdXJjZScsIFN0cmlkZXJdKTtcblxuXG5yZXF1aXJlKCcuL2ZpbHRlcnMvYW5zaScpO1xuXG5mdW5jdGlvbiBjb25maWd1cmVBcHAoJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyKSB7XG5cbiAgLy8vIEhUVFBcblxuICAvLy8gQWx3YXlzIGRvIEhUVFAgcmVxdWVzdHMgd2l0aCBjcmVkZW50aWFscyxcbiAgLy8vIGVmZmVjdGl2ZWx5IHNlbmRpbmcgb3V0IHRoZSBzZXNzaW9uIGNvb2tpZVxuICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgdmFyIGludGVyY2VwdG9yID0gWyckcm9vdFNjb3BlJywgJyRxJywgZnVuY3Rpb24oJHNjb3BlLCAkcSkge1xuXG4gICAgZnVuY3Rpb24gc3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVycm9yKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgc3RhdHVzID0gcmVzcG9uc2Uuc3RhdHVzO1xuXG4gICAgICB2YXIgcmVzcCA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICBpZiAocmVzcCkgdHJ5IHsgcmVzcCA9IEpTT04ucGFyc2UocmVzcCk7IH0gY2F0Y2goZXJyKSB7IH1cblxuICAgICAgaWYgKHJlc3AubWVzc2FnZSkgcmVzcCA9IHJlc3AubWVzc2FnZTtcbiAgICAgIGlmICghIHJlc3ApIHtcbiAgICAgICAgcmVzcCA9ICdFcnJvciBpbiByZXNwb25zZSc7XG4gICAgICAgIGlmIChzdGF0dXMpIHJlc3AgKz0gJyAoJyArIHN0YXR1cyArICcpJztcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLiRlbWl0KCdlcnJvcicsIG5ldyBFcnJvcihyZXNwKSk7XG5cbiAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgcmV0dXJuIHByb21pc2UudGhlbihzdWNjZXNzLCBlcnJvcik7XG4gICAgfVxuXG4gIH1dO1xuXG4gICRodHRwUHJvdmlkZXIucmVzcG9uc2VJbnRlcmNlcHRvcnMucHVzaChpbnRlcmNlcHRvcik7XG5cblxuICAvLy8gRW5hYmxlIGhhc2hiYW5nLWxlc3Mgcm91dGVzXG5cbiAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuXG4gIC8vLyBSb3V0ZXNcblxuICAkcm91dGVQcm92aWRlci5cbiAgICB3aGVuKCcvZGFzaGJvYXJkJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvZGFzaGJvYXJkLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0Rhc2hib2FyZEN0cmwnXG4gICAgfSkuXG4gICAgd2hlbignL2xvZ2luJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvbG9naW4uaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pLlxuICAgIHdoZW4oJy86b3duZXIvOnJlcG8vam9iLzpqb2JpZCcsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2pvYi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdKb2JDdHJsJ1xuICAgIH0pO1xufVxuXG5cbi8vIFNpbXBsZSBsb2cgZnVuY3Rpb24gdG8ga2VlcCB0aGUgZXhhbXBsZSBzaW1wbGVcbmZ1bmN0aW9uIGxvZyAoKSB7XG4gIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICB9XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignRGFzaGJvYXJkQ3RybCcsIFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdTdHJpZGVyJywgRGFzaGJvYXJkQ3RybF0pO1xuXG5mdW5jdGlvbiBEYXNoYm9hcmRDdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBTdHJpZGVyKSB7XG5cbiAgU3RyaWRlci5TZXNzaW9uLmdldChmdW5jdGlvbih1c2VyKSB7XG4gICAgaWYgKCEgdXNlci51c2VyKSAkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG4gICAgZWxzZSBhdXRoZW50aWNhdGVkKCk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZWQoKSB7XG4gICAgJHNjb3BlLmpvYnMgPSBTdHJpZGVyLmpvYnM7XG4gICAgU3RyaWRlci5jb25uZWN0KCRzY29wZSk7XG4gICAgU3RyaWRlci5qb2JzLmRhc2hib2FyZCgpO1xuICB9XG5cbiAgJHNjb3BlLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShwcm9qZWN0KSB7XG4gICAgU3RyaWRlci5kZXBsb3kocHJvamVjdCk7XG4gIH07XG5cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdFcnJvckN0cmwnLCBbJyRzY29wZScsICckcm9vdFNjb3BlJywgRXJyb3JDdHJsXSk7XG5cbmZ1bmN0aW9uIEVycm9yQ3RybCgkc2NvcGUsICRyb290U2NvcGUpIHtcbiAgJHNjb3BlLmVycm9yID0ge307XG5cbiAgJHJvb3RTY29wZS4kb24oJ2Vycm9yJywgZnVuY3Rpb24oZXYsIGVycikge1xuICAgICRzY29wZS5lcnJvci5tZXNzYWdlID0gZXJyLm1lc3NhZ2UgfHwgZXJyO1xuICB9KTtcblxuICAkcm9vdFNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICAkc2NvcGUuZXJyb3IubWVzc2FnZSA9ICcnO1xuICB9KTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdKb2JDdHJsJywgWyckc2NvcGUnLCAnJHJvdXRlUGFyYW1zJywgJ1N0cmlkZXInLCBKb2JDdHJsXSk7XG5cbmZ1bmN0aW9uIEpvYkN0cmwoJHNjb3BlLCAkcm91dGVQYXJhbXMsIFN0cmlkZXIpIHtcblxuICAkc2NvcGUucGhhc2VzID0gU3RyaWRlci5waGFzZXM7XG5cbiAgdmFyIHByb2plY3RTZWFyY2hPcHRpb25zID0ge1xuICAgIG93bmVyOiAkcm91dGVQYXJhbXMub3duZXIsXG4gICAgcmVwbzogICRyb3V0ZVBhcmFtcy5yZXBvXG4gIH07XG5cbiAgU3RyaWRlci5Qcm9qZWN0LmdldChwcm9qZWN0U2VhcmNoT3B0aW9ucywgZnVuY3Rpb24ocHJvamVjdCkge1xuICAgICRzY29wZS5yZXBvID0gcHJvamVjdDtcbiAgfSk7XG5cbiAgU3RyaWRlci5jb25uZWN0KCRzY29wZSk7XG4gIFN0cmlkZXIuam9iKCRyb3V0ZVBhcmFtcy5qb2JpZCwgZnVuY3Rpb24oam9iKSB7XG4gICAgJHNjb3BlLmpvYiA9IGpvYjtcbiAgfSk7XG5cbiAgU3RyaWRlci5Qcm9qZWN0Sm9icy5xdWVyeShwcm9qZWN0U2VhcmNoT3B0aW9ucywgZnVuY3Rpb24oam9icykge1xuICAgICRzY29wZS5qb2JzID0gam9icztcbiAgfSk7XG5cbiAgJHNjb3BlLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShqb2IpIHtcbiAgICBTdHJpZGVyLmRlcGxveShqb2IucHJvamVjdCk7XG4gIH07XG5cbiAgJHNjb3BlLnRlc3QgPSBmdW5jdGlvbiB0ZXN0KGpvYikge1xuICAgIFN0cmlkZXIudGVzdChqb2IucHJvamVjdCk7XG4gIH07XG5cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBbJyRzY29wZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIExvZ2luQ3RybF0pO1xuXG5mdW5jdGlvbiBMb2dpbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24sIFN0cmlkZXIpIHtcblxuICBTdHJpZGVyLlNlc3Npb24uZ2V0KGZ1bmN0aW9uKHVzZXIpIHtcbiAgICBpZiAodXNlci5pZCkgJGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcbiAgfSk7XG5cbiAgJHNjb3BlLnVzZXIgPSB7fTtcblxuICAkc2NvcGUubG9naW4gPSBmdW5jdGlvbiBsb2dpbih1c2VyKSB7XG4gICAgdmFyIHNlc3Npb24gPSBuZXcgKFN0cmlkZXIuU2Vzc2lvbikodXNlcik7XG4gICAgc2Vzc2lvbi4kc2F2ZShmdW5jdGlvbigpIHtcbiAgICAgICRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7XG4gICAgfSk7XG4gIH07XG59IiwidmFyIGFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5hcHAuZmlsdGVyKCdhbnNpJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKCFpbnB1dCkgcmV0dXJuICcnO1xuICAgIHZhciB0ZXh0ID0gaW5wdXQucmVwbGFjZSgvXlteXFxuXFxyXSpcXHUwMDFiXFxbMksvZ20sICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFx1MDAxYlxcW0tbXlxcblxccl0qL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvW15cXG5dKlxccihbXlxcbl0pL2csICckMScpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9eW15cXG5dKlxcdTAwMWJcXFswRy9nbSwgJycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuICAgIHJldHVybiBhbnNpZmlsdGVyKHRleHQpO1xuICB9XG59KTtcblxuZnVuY3Rpb24gYW5zaXBhcnNlKHN0cikge1xuICAvL1xuICAvLyBJJ20gdGVycmlibGUgYXQgd3JpdGluZyBwYXJzZXJzLlxuICAvL1xuICB2YXIgbWF0Y2hpbmdDb250cm9sID0gbnVsbCxcbiAgICAgIG1hdGNoaW5nRGF0YSA9IG51bGwsXG4gICAgICBtYXRjaGluZ1RleHQgPSAnJyxcbiAgICAgIGFuc2lTdGF0ZSA9IFtdLFxuICAgICAgcmVzdWx0ID0gW10sXG4gICAgICBvdXRwdXQgPSBcIlwiLFxuICAgICAgc3RhdGUgPSB7fSxcbiAgICAgIGVyYXNlQ2hhcjtcblxuICB2YXIgaGFuZGxlUmVzdWx0ID0gZnVuY3Rpb24ocCkge1xuICAgIHZhciBjbGFzc2VzID0gW107XG5cbiAgICBwLmZvcmVncm91bmQgJiYgY2xhc3Nlcy5wdXNoKHAuZm9yZWdyb3VuZCk7XG4gICAgcC5iYWNrZ3JvdW5kICYmIGNsYXNzZXMucHVzaCgnYmctJyArIHAuYmFja2dyb3VuZCk7XG4gICAgcC5ib2xkICAgICAgICYmIGNsYXNzZXMucHVzaCgnYm9sZCcpO1xuICAgIHAuaXRhbGljICAgICAmJiBjbGFzc2VzLnB1c2goJ2l0YWxpYycpO1xuICAgIGlmICghcC50ZXh0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjbGFzc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG91dHB1dCArPSBwLnRleHRcbiAgICB9XG4gICAgdmFyIHNwYW4gPSAnPHNwYW4gY2xhc3M9XCInICsgY2xhc3Nlcy5qb2luKCcgJykgKyAnXCI+JyArIHAudGV4dCArICc8L3NwYW4+J1xuICAgIG91dHB1dCArPSBzcGFuXG4gIH1cbiAgLy9cbiAgLy8gR2VuZXJhbCB3b3JrZmxvdyBmb3IgdGhpcyB0aGluZyBpczpcbiAgLy8gXFwwMzNcXFszM21UZXh0XG4gIC8vIHwgICAgIHwgIHxcbiAgLy8gfCAgICAgfCAgbWF0Y2hpbmdUZXh0XG4gIC8vIHwgICAgIG1hdGNoaW5nRGF0YVxuICAvLyBtYXRjaGluZ0NvbnRyb2xcbiAgLy9cbiAgLy8gSW4gZnVydGhlciBzdGVwcyB3ZSBob3BlIGl0J3MgYWxsIGdvaW5nIHRvIGJlIGZpbmUuIEl0IHVzdWFsbHkgaXMuXG4gIC8vXG5cbiAgLy9cbiAgLy8gRXJhc2VzIGEgY2hhciBmcm9tIHRoZSBvdXRwdXRcbiAgLy9cbiAgZXJhc2VDaGFyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpbmRleCwgdGV4dDtcbiAgICBpZiAobWF0Y2hpbmdUZXh0Lmxlbmd0aCkge1xuICAgICAgbWF0Y2hpbmdUZXh0ID0gbWF0Y2hpbmdUZXh0LnN1YnN0cigwLCBtYXRjaGluZ1RleHQubGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHJlc3VsdC5sZW5ndGgpIHtcbiAgICAgIGluZGV4ID0gcmVzdWx0Lmxlbmd0aCAtIDE7XG4gICAgICB0ZXh0ID0gcmVzdWx0W2luZGV4XS50ZXh0O1xuICAgICAgaWYgKHRleHQubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIEEgcmVzdWx0IGJpdCB3YXMgZnVsbHkgZGVsZXRlZCwgcG9wIGl0IG91dCB0byBzaW1wbGlmeSB0aGUgZmluYWwgb3V0cHV0XG4gICAgICAgIC8vXG4gICAgICAgIHJlc3VsdC5wb3AoKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXN1bHRbaW5kZXhdLnRleHQgPSB0ZXh0LnN1YnN0cigwLCB0ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGlmIChtYXRjaGluZ0NvbnRyb2wgIT09IG51bGwpIHtcbiAgICAgIGlmIChtYXRjaGluZ0NvbnRyb2wgPT0gJ1xcMDMzJyAmJiBzdHJbaV0gPT0gJ1xcWycpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gV2UndmUgbWF0Y2hlZCBmdWxsIGNvbnRyb2wgY29kZS4gTGV0cyBzdGFydCBtYXRjaGluZyBmb3JtYXRpbmcgZGF0YS5cbiAgICAgICAgLy9cblxuICAgICAgICAvL1xuICAgICAgICAvLyBcImVtaXRcIiBtYXRjaGVkIHRleHQgd2l0aCBjb3JyZWN0IHN0YXRlXG4gICAgICAgIC8vXG4gICAgICAgIGlmIChtYXRjaGluZ1RleHQpIHtcbiAgICAgICAgICBzdGF0ZS50ZXh0ID0gbWF0Y2hpbmdUZXh0O1xuICAgICAgICAgIGhhbmRsZVJlc3VsdChzdGF0ZSk7XG4gICAgICAgICAgc3RhdGUgPSB7fTtcbiAgICAgICAgICBtYXRjaGluZ1RleHQgPSBcIlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF0Y2hpbmdDb250cm9sID0gbnVsbDtcbiAgICAgICAgbWF0Y2hpbmdEYXRhID0gJyc7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gV2UgZmFpbGVkIHRvIG1hdGNoIGFueXRoaW5nIC0gbW9zdCBsaWtlbHkgYSBiYWQgY29udHJvbCBjb2RlLiBXZVxuICAgICAgICAvLyBnbyBiYWNrIHRvIG1hdGNoaW5nIHJlZ3VsYXIgc3RyaW5ncy5cbiAgICAgICAgLy9cbiAgICAgICAgbWF0Y2hpbmdUZXh0ICs9IG1hdGNoaW5nQ29udHJvbCArIHN0cltpXTtcbiAgICAgICAgbWF0Y2hpbmdDb250cm9sID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChtYXRjaGluZ0RhdGEgIT09IG51bGwpIHtcbiAgICAgIGlmIChzdHJbaV0gPT0gJzsnKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIGA7YCBzZXBhcmF0ZXMgbWFueSBmb3JtYXR0aW5nIGNvZGVzLCBmb3IgZXhhbXBsZTogYFxcMDMzWzMzOzQzbWBcbiAgICAgICAgLy8gbWVhbnMgdGhhdCBib3RoIGAzM2AgYW5kIGA0M2Agc2hvdWxkIGJlIGFwcGxpZWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE86IHRoaXMgY2FuIGJlIHNpbXBsaWZpZWQgYnkgbW9kaWZ5aW5nIHN0YXRlIGhlcmUuXG4gICAgICAgIC8vXG4gICAgICAgIGFuc2lTdGF0ZS5wdXNoKG1hdGNoaW5nRGF0YSk7XG4gICAgICAgIG1hdGNoaW5nRGF0YSA9ICcnO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoc3RyW2ldID09ICdtJykge1xuICAgICAgICAvL1xuICAgICAgICAvLyBgbWAgZmluaXNoZWQgd2hvbGUgZm9ybWF0dGluZyBjb2RlLiBXZSBjYW4gcHJvY2VlZCB0byBtYXRjaGluZ1xuICAgICAgICAvLyBmb3JtYXR0ZWQgdGV4dC5cbiAgICAgICAgLy9cbiAgICAgICAgYW5zaVN0YXRlLnB1c2gobWF0Y2hpbmdEYXRhKTtcbiAgICAgICAgbWF0Y2hpbmdEYXRhID0gbnVsbDtcbiAgICAgICAgbWF0Y2hpbmdUZXh0ID0gJyc7XG5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gQ29udmVydCBtYXRjaGVkIGZvcm1hdHRpbmcgZGF0YSBpbnRvIHVzZXItZnJpZW5kbHkgc3RhdGUgb2JqZWN0LlxuICAgICAgICAvL1xuICAgICAgICAvLyBUT0RPOiBEUlkuXG4gICAgICAgIC8vXG4gICAgICAgIGFuc2lTdGF0ZS5mb3JFYWNoKGZ1bmN0aW9uIChhbnNpQ29kZSkge1xuICAgICAgICAgIGlmIChhbnNpcGFyc2UuZm9yZWdyb3VuZENvbG9yc1thbnNpQ29kZV0pIHtcbiAgICAgICAgICAgIHN0YXRlLmZvcmVncm91bmQgPSBhbnNpcGFyc2UuZm9yZWdyb3VuZENvbG9yc1thbnNpQ29kZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lwYXJzZS5iYWNrZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXSkge1xuICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZCA9IGFuc2lwYXJzZS5iYWNrZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMzkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5mb3JlZ3JvdW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSA0OSkge1xuICAgICAgICAgICAgZGVsZXRlIHN0YXRlLmJhY2tncm91bmQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lwYXJzZS5zdHlsZXNbYW5zaUNvZGVdKSB7XG4gICAgICAgICAgICBzdGF0ZVthbnNpcGFyc2Uuc3R5bGVzW2Fuc2lDb2RlXV0gPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAyMikge1xuICAgICAgICAgICAgc3RhdGUuYm9sZCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAyMykge1xuICAgICAgICAgICAgc3RhdGUuaXRhbGljID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDI0KSB7XG4gICAgICAgICAgICBzdGF0ZS51bmRlcmxpbmUgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBhbnNpU3RhdGUgPSBbXTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBtYXRjaGluZ0RhdGEgKz0gc3RyW2ldO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHN0cltpXSA9PSAnXFwwMzMnKSB7XG4gICAgICBtYXRjaGluZ0NvbnRyb2wgPSBzdHJbaV07XG4gICAgfVxuICAgIGVsc2UgaWYgKHN0cltpXSA9PSAnXFx1MDAwOCcpIHtcbiAgICAgIGVyYXNlQ2hhcigpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIG1hdGNoaW5nVGV4dCArPSBzdHJbaV07XG4gICAgfVxuICB9XG5cbiAgaWYgKG1hdGNoaW5nVGV4dCkge1xuICAgIHN0YXRlLnRleHQgPSBtYXRjaGluZ1RleHQgKyAobWF0Y2hpbmdDb250cm9sID8gbWF0Y2hpbmdDb250cm9sIDogJycpO1xuICAgIGhhbmRsZVJlc3VsdChzdGF0ZSk7XG4gIH1cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuYW5zaXBhcnNlLmZvcmVncm91bmRDb2xvcnMgPSB7XG4gICczMCc6ICdibGFjaycsXG4gICczMSc6ICdyZWQnLFxuICAnMzInOiAnZ3JlZW4nLFxuICAnMzMnOiAneWVsbG93JyxcbiAgJzM0JzogJ2JsdWUnLFxuICAnMzUnOiAnbWFnZW50YScsXG4gICczNic6ICdjeWFuJyxcbiAgJzM3JzogJ3doaXRlJyxcbiAgJzkwJzogJ2dyZXknXG59O1xuXG5hbnNpcGFyc2UuYmFja2dyb3VuZENvbG9ycyA9IHtcbiAgJzQwJzogJ2JsYWNrJyxcbiAgJzQxJzogJ3JlZCcsXG4gICc0Mic6ICdncmVlbicsXG4gICc0Myc6ICd5ZWxsb3cnLFxuICAnNDQnOiAnYmx1ZScsXG4gICc0NSc6ICdtYWdlbnRhJyxcbiAgJzQ2JzogJ2N5YW4nLFxuICAnNDcnOiAnd2hpdGUnXG59O1xuXG5hbnNpcGFyc2Uuc3R5bGVzID0ge1xuICAnMSc6ICdib2xkJyxcbiAgJzMnOiAnaXRhbGljJyxcbiAgJzQnOiAndW5kZXJsaW5lJ1xufTtcblxuZnVuY3Rpb24gYW5zaWZpbHRlcihkYXRhLCBwbGFpbnRleHQsIGNhY2hlKSB7XG5cbiAgLy8gaGFuZGxlIHRoZSBjaGFyYWN0ZXJzIGZvciBcImRlbGV0ZSBsaW5lXCIgYW5kIFwibW92ZSB0byBzdGFydCBvZiBsaW5lXCJcbiAgdmFyIHN0YXJ0c3dpdGhjciA9IC9eW15cXG5dKlxcclteXFxuXS8udGVzdChkYXRhKTtcbiAgdmFyIG91dHB1dCA9IGFuc2lwYXJzZShkYXRhKTtcblxuICB2YXIgcmVzID0gb3V0cHV0LnJlcGxhY2UoL1xcMDMzL2csICcnKTtcbiAgaWYgKHN0YXJ0c3dpdGhjcikgcmVzID0gJ1xccicgKyByZXM7XG5cbiAgcmV0dXJuIHJlcztcbn1cblxuIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUpvYlN0b3JlO1xuZnVuY3Rpb24gY3JlYXRlSm9iU3RvcmUoKSB7XG4gIHJldHVybiBuZXcgSm9iU3RvcmU7XG59XG5cbnZhciBQSEFTRVMgPSBleHBvcnRzLnBoYXNlcyA9XG5bJ2Vudmlyb25tZW50JywgJ3ByZXBhcmUnLCAndGVzdCcsICdkZXBsb3knLCAnY2xlYW51cCddO1xuXG52YXIgc3RhdHVzSGFuZGxlcnMgPSB7XG4gICdzdGFydGVkJzogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB0aGlzLnN0YXJ0ZWQgPSB0aW1lO1xuICAgIHRoaXMucGhhc2UgPSAnZW52aXJvbm1lbnQnO1xuICAgIHRoaXMuc3RhdHVzID0gJ3J1bm5pbmcnO1xuICB9LFxuICAnZXJyb3JlZCc6IGZ1bmN0aW9uIChlcnJvcikge1xuICAgIHRoaXMuZXJyb3IgPSBlcnJvcjtcbiAgICB0aGlzLnN0YXR1cyA9ICdlcnJvcmVkJztcbiAgfSxcbiAgJ2NhbmNlbGVkJzogJ2Vycm9yZWQnLFxuICAncGhhc2UuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdGhpcy5waGFzZSA9IFBIQVNFUy5pbmRleE9mKGRhdGEucGhhc2UpICsgMTtcbiAgfSxcbiAgLy8gdGhpcyBpcyBqdXN0IHNvIHdlJ2xsIHRyaWdnZXIgdGhlIFwidW5rbm93biBqb2JcIiBsb29rdXAgc29vbmVyIG9uIHRoZSBkYXNoYm9hcmRcbiAgJ3N0ZG91dCc6IGZ1bmN0aW9uICh0ZXh0KSB7fSxcbiAgJ3N0ZGVycic6IGZ1bmN0aW9uICh0ZXh0KSB7fSxcbiAgJ3dhcm5pbmcnOiBmdW5jdGlvbiAod2FybmluZykge1xuICAgIGlmICghdGhpcy53YXJuaW5ncykge1xuICAgICAgdGhpcy53YXJuaW5ncyA9IFtdO1xuICAgIH1cbiAgICB0aGlzLndhcm5pbmdzLnB1c2god2FybmluZyk7XG4gIH0sXG4gICdwbHVnaW4tZGF0YSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIHBhdGggPSBkYXRhLnBhdGggPyBbZGF0YS5wbHVnaW5dLmNvbmNhdChkYXRhLnBhdGguc3BsaXQoJy4nKSkgOiBbZGF0YS5wbHVnaW5dXG4gICAgLCBsYXN0ID0gcGF0aC5wb3AoKVxuICAgICwgbWV0aG9kID0gZGF0YS5tZXRob2QgfHwgJ3JlcGxhY2UnXG4gICAgLCBwYXJlbnRcbiAgICBwYXJlbnQgPSBwYXRoLnJlZHVjZShmdW5jdGlvbiAob2JqLCBhdHRyKSB7XG4gICAgICByZXR1cm4gb2JqW2F0dHJdIHx8IChvYmpbYXR0cl0gPSB7fSlcbiAgICB9LCB0aGlzLnBsdWdpbl9kYXRhIHx8ICh0aGlzLnBsdWdpbl9kYXRhID0ge30pKVxuICAgIGlmIChtZXRob2QgPT09ICdyZXBsYWNlJykge1xuICAgICAgcGFyZW50W2xhc3RdID0gZGF0YS5kYXRhXG4gICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdwdXNoJykge1xuICAgICAgaWYgKCFwYXJlbnRbbGFzdF0pIHtcbiAgICAgICAgcGFyZW50W2xhc3RdID0gW11cbiAgICAgIH1cbiAgICAgIHBhcmVudFtsYXN0XS5wdXNoKGRhdGEuZGF0YSlcbiAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ2V4dGVuZCcpIHtcbiAgICAgIGlmICghcGFyZW50W2xhc3RdKSB7XG4gICAgICAgIHBhcmVudFtsYXN0XSA9IHt9XG4gICAgICB9XG4gICAgICBleHRlbmQocGFyZW50W2xhc3RdLCBkYXRhLmRhdGEpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgXCJwbHVnaW4gZGF0YVwiIG1ldGhvZCByZWNlaXZlZCBmcm9tIHBsdWdpbicsIGRhdGEucGx1Z2luLCBkYXRhLm1ldGhvZCwgZGF0YSlcbiAgICB9XG4gIH0sXG5cbiAgJ3BoYXNlLmRvbmUnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZmluaXNoZWQgPSBkYXRhLnRpbWU7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZHVyYXRpb24gPSBkYXRhLmVsYXBzZWRcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5leGl0Q29kZSA9IGRhdGEuY29kZTtcbiAgICBpZiAoWydwcmVwYXJlJywgJ2Vudmlyb25tZW50JywgJ2NsZWFudXAnXS5pbmRleE9mKGRhdGEucGhhc2UpICE9PSAtMSkge1xuICAgICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uY29sbGFwc2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGRhdGEucGhhc2UgPT09ICd0ZXN0JykgdGhpcy50ZXN0X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoZGF0YS5waGFzZSA9PT0gJ2RlcGxveScpIHRoaXMuZGVwbG95X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoIWRhdGEubmV4dCB8fCAhdGhpcy5waGFzZXNbZGF0YS5uZXh0XSkgcmV0dXJuO1xuICAgIHRoaXMucGhhc2UgPSBkYXRhLm5leHQ7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5uZXh0XS5zdGFydGVkID0gZGF0YS50aW1lO1xuICB9LFxuICAnY29tbWFuZC5jb21tZW50JzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQpO1xuICAgIGNvbW1hbmQuY29tbWFuZCA9IGRhdGEuY29tbWVudDtcbiAgICBjb21tYW5kLmNvbW1lbnQgPSB0cnVlO1xuICAgIGNvbW1hbmQucGx1Z2luID0gZGF0YS5wbHVnaW47XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9LFxuICAnY29tbWFuZC5zdGFydCc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kLCBkYXRhKTtcbiAgICBjb21tYW5kLnN0YXJ0ZWQgPSBkYXRhLnRpbWU7XG4gICAgcGhhc2UuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfSxcbiAgJ2NvbW1hbmQuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gcGhhc2UuY29tbWFuZHNbcGhhc2UuY29tbWFuZHMubGVuZ3RoIC0gMV07XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBjb21tYW5kLmR1cmF0aW9uID0gZGF0YS5lbGFwc2VkO1xuICAgIGNvbW1hbmQuZXhpdENvZGUgPSBkYXRhLmV4aXRDb2RlO1xuICAgIGNvbW1hbmQubWVyZ2VkID0gY29tbWFuZC5fbWVyZ2VkO1xuICB9LFxuICAnc3Rkb3V0JzogZnVuY3Rpb24gKHRleHQpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBjb21tYW5kID0gZW5zdXJlQ29tbWFuZCh0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXSk7XG4gICAgY29tbWFuZC5vdXQgKz0gdGV4dDtcbiAgICBjb21tYW5kLl9tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5vdXQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWRfbGF0ZXN0ID0gdGV4dDtcbiAgfSxcbiAgJ3N0ZGVycic6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgY29tbWFuZCA9IGVuc3VyZUNvbW1hbmQodGhpcy5waGFzZXNbdGhpcy5waGFzZV0pO1xuICAgIGNvbW1hbmQuZXJyICs9IHRleHQ7XG4gICAgY29tbWFuZC5fbWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQuZXJyICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkX2xhdGVzdCA9IHRleHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gSm9iU3RvcmUoKSB7XG4gIHRoaXMuam9icyA9IHtcbiAgICBkYXNoYm9hcmQ6IGRhc2hib2FyZC5iaW5kKHRoaXMpLFxuICAgIHB1YmxpYzogW10sXG4gICAgeW91cnM6IFtdLFxuICAgIGxpbWJvOiBbXVxuICB9O1xufVxudmFyIEpTID0gSm9iU3RvcmUucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBkYXNoYm9hcmQoY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNvY2tldC5lbWl0KCdkYXNoYm9hcmQ6am9icycsIGZ1bmN0aW9uKGpvYnMpIHtcbiAgICBzZWxmLmpvYnMueW91cnMgPSBqb2JzLnlvdXJzO1xuICAgIHNlbGYuam9icy5wdWJsaWMgPSBqb2JzLnB1YmxpYztcbiAgICBzZWxmLmNoYW5nZWQoKTtcbiAgfSk7XG59XG5cblxuLy8vIC0tLS0gSm9iIFN0b3JlIHByb3RvdHlwZSBmdW5jdGlvbnM6IC0tLS1cblxuLy8vIGNvbm5lY3RcblxuSlMuY29ubmVjdCA9IGZ1bmN0aW9uIGNvbm5lY3Qoc29ja2V0LCBjaGFuZ2VDYWxsYmFjaykge1xuICB0aGlzLnNvY2tldCA9IHNvY2tldDtcbiAgdGhpcy5jaGFuZ2VDYWxsYmFjayA9IGNoYW5nZUNhbGxiYWNrO1xuXG4gIGZvciAodmFyIHN0YXR1cyBpbiBzdGF0dXNIYW5kbGVycykge1xuICAgIHNvY2tldC5vbignam9iLnN0YXR1cy4nICsgc3RhdHVzLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMsIHN0YXR1cykpXG4gIH1cblxuICBzb2NrZXQub24oJ2pvYi5uZXcnLCBKUy5uZXdKb2IuYmluZCh0aGlzKSk7XG59O1xuXG5cbi8vLyB1cGRhdGUgLSBoYW5kbGUgdXBkYXRlIGV2ZW50XG5cbkpTLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShldmVudCwgYXJncywgYWNjZXNzLCBkb250Y2hhbmdlKSB7XG4gIHZhciBpZCA9IGFyZ3Muc2hpZnQoKVxuICAgICwgam9iID0gdGhpcy5qb2IoaWQsIGFjY2VzcylcbiAgICAsIGhhbmRsZXIgPSBzdGF0dXNIYW5kbGVyc1tldmVudF07XG4gIGlmICgham9iKSByZXR1cm4gdGhpcy51bmtub3duKGlkLCBldmVudCwgYXJncywgYWNjZXNzKVxuICBpZiAoIWhhbmRsZXIpIHJldHVybjtcbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgaGFuZGxlcikge1xuICAgIGpvYi5zdGF0dXMgPSBoYW5kbGVyO1xuICB9IGVsc2Uge1xuICAgIGhhbmRsZXIuYXBwbHkoam9iLCBhcmdzKTtcbiAgfVxuICBpZiAoIWRvbnRjaGFuZ2UpIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuXG4vLy8gbmV3Sm9iIC0gd2hlbiBzZXJ2ZXIgbm90aWZpZXMgb2YgbmV3IGpvYlxuXG5KUy5uZXdKb2IgPSBmdW5jdGlvbiBuZXdKb2Ioam9iLCBhY2Nlc3MpIHtcbiAgaWYgKCEgam9iKSByZXR1cm47XG4gIGlmIChBcnJheS5pc0FycmF5KGpvYikpIGpvYiA9IGpvYlswXTtcblxuICB2YXIgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdXG4gICAgLCBmb3VuZCA9IC0xXG4gICAgLCBvbGQ7XG5cbiAgaWYgKCEgam9icykgcmV0dXJuO1xuXG4gIGZ1bmN0aW9uIHNlYXJjaCgpIHtcbiAgICBmb3IgKHZhciBpPTA7IGk8am9icy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGpvYnNbaV0ucHJvamVjdC5uYW1lID09PSBqb2IucHJvamVjdC5uYW1lKSB7XG4gICAgICAgIGZvdW5kID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2VhcmNoKCk7XG4gIGlmIChmb3VuZCA8IDApIHtcbiAgICAvLy8gdHJ5IGxpbWJvXG4gICAgam9icyA9IHRoaXMuam9icy5saW1ibztcbiAgICBzZWFyY2goKTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIGpvYnMgPSB0aGlzLmpvYnNbYWNjZXNzXTtcbiAgICAgIGpvYnMudW5zaGlmdCh0aGlzLmpvYnMubGltYm9bZm91bmRdKTtcbiAgICAgIHRoaXMuam9icy5saW1iby5zcGxpY2UoZm91bmQsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChmb3VuZCAhPT0gLTEpIHtcbiAgICBvbGQgPSBqb2JzLnNwbGljZShmb3VuZCwgMSlbMF07XG4gICAgam9iLnByb2plY3QucHJldiA9IG9sZC5wcm9qZWN0LnByZXY7XG4gIH1cbiAgLy8gaWYgKGpvYi5waGFzZXMpIHtcbiAgLy8gICAvLyBnZXQgcmlkIG9mIGV4dHJhIGRhdGEgLSB3ZSBkb24ndCBuZWVkIGl0LlxuICAvLyAgIC8vIG5vdGU6IHRoaXMgd29uJ3QgYmUgcGFzc2VkIHVwIGFueXdheSBmb3IgcHVibGljIHByb2plY3RzXG4gIC8vICAgY2xlYW5Kb2Ioam9iKTtcbiAgLy8gfVxuICAvL2pvYi5waGFzZSA9ICdlbnZpcm9ubWVudCc7XG4gIGpvYnMudW5zaGlmdChqb2IpO1xuICB0aGlzLmNoYW5nZWQoKTtcbn07XG5cblxuLy8vIGpvYiAtIGZpbmQgYSBqb2IgYnkgaWQgYW5kIGFjY2VzcyBsZXZlbFxuXG5KUy5qb2IgPSBmdW5jdGlvbiBqb2IoaWQsIGFjY2Vzcykge1xuICB2YXIgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdO1xuICB2YXIgam9iID0gc2VhcmNoKGlkLCBqb2JzKTtcbiAgLy8gaWYgbm90IGZvdW5kLCB0cnkgbGltYm9cbiAgaWYgKCEgam9iKXtcbiAgICBqb2IgPSBzZWFyY2goaWQsIHRoaXMuam9icy5saW1ibyk7XG4gICAgaWYgKGpvYikge1xuICAgICAgam9icy51bnNoaWZ0KGpvYik7XG4gICAgICB0aGlzLmpvYnMubGltYm8uc3BsaWNlKHRoaXMuam9icy5saW1iby5pbmRleE9mKGpvYiksIDEpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gam9iO1xufTtcblxuZnVuY3Rpb24gc2VhcmNoKGlkLCBqb2JzKSB7XG4gIGZvciAodmFyIGk9MDsgaTxqb2JzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGpvYnNbaV0uX2lkID09PSBpZCkgcmV0dXJuIGpvYnNbaV07XG4gIH1cbn1cblxuXG4vLy8gY2hhbmdlZCAtIG5vdGlmaWVzIFVJIG9mIGNoYW5nZXNcblxuSlMuY2hhbmdlZCA9IGZ1bmN0aW9uIGNoYW5nZWQoKSB7XG4gIHRoaXMuY2hhbmdlQ2FsbGJhY2soKTtcbn07XG5cblxuLy8vIGxvYWQg4oCUwqBsb2FkcyBhIGpvYlxuXG5KUy5sb2FkID0gZnVuY3Rpb24gbG9hZChqb2JJZCwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNvY2tldC5lbWl0KCdidWlsZDpqb2InLCBqb2JJZCwgZnVuY3Rpb24oam9iKSB7XG4gICAgc2VsZi5uZXdKb2Ioam9iLCAnbGltYm8nKTtcbiAgICBjYihqb2IpO1xuICAgIHNlbGYuY2hhbmdlZCgpO1xuICB9KTtcbn07XG5cbmZ1bmN0aW9uIGVuc3VyZUNvbW1hbmQocGhhc2UpIHtcbiAgdmFyIGNvbW1hbmQgPSBwaGFzZS5jb21tYW5kc1twaGFzZS5jb21tYW5kcy5sZW5ndGggLSAxXTtcbiAgaWYgKCFjb21tYW5kIHx8IHR5cGVvZihjb21tYW5kLmZpbmlzaGVkKSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kKTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9XG4gIHJldHVybiBjb21tYW5kO1xufSIsInZhciBKb2JTdG9yZSA9IHJlcXVpcmUoJy4vam9iX3N0b3JlJyk7XG52YXIgam9iU3RvcmUgPSBKb2JTdG9yZSgpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBCdWlsZFN0cmlkZXI7XG5cbmZ1bmN0aW9uIEJ1aWxkU3RyaWRlcigkcmVzb3VyY2UpIHtcbiAgcmV0dXJuIG5ldyBTdHJpZGVyKCRyZXNvdXJjZSk7XG59XG5cblxudmFyIHNvY2tldDtcbnZhciBzY29wZXMgPSBbXTtcblxuZnVuY3Rpb24gU3RyaWRlcigkcmVzb3VyY2UsIG9wdHMpIHtcbiAgaWYgKCEgb3B0cykgb3B0cyA9IHt9O1xuICBpZiAodHlwZW9mIG9wdHMgPT0gJ3N0cmluZycpXG4gICAgb3B0cyA9IHsgdXJsOiBvcHRzIH07XG5cbiAgdGhpcy51cmwgPSBvcHRzLnVybCB8fCAnLy9sb2NhbGhvc3Q6MzAwMCc7XG5cbiAgLy8vIFJlc3RmdWwgQVBJIHNldHVwXG4gIHZhciBhcGlCYXNlICA9IHRoaXMudXJsICsgJy9hcGknO1xuICB2YXIgbG9naW5VUkwgPSB0aGlzLnVybCArICcvbG9naW4nO1xuICB0aGlzLkpvYnMgICAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvam9icy8nKTtcbiAgdGhpcy5TZXNzaW9uID0gJHJlc291cmNlKGFwaUJhc2UgKyAnL3Nlc3Npb24vJyk7XG4gIHRoaXMuUHJvamVjdCA9ICRyZXNvdXJjZShhcGlCYXNlICsgJy9wcm9qZWN0Lzpvd25lci86cmVwby8nKTtcbiAgdGhpcy5Qcm9qZWN0Sm9icyA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2pvYnMvJyk7XG5cbiAgdGhpcy5qb2JzICAgID0gam9iU3RvcmUuam9icztcbiAgdGhpcy5waGFzZXMgID0gSm9iU3RvcmUucGhhc2VzO1xufVxuXG5cbnZhciBTID0gU3RyaWRlci5wcm90b3R5cGU7XG5cblxuLy8vIGNoYW5nZWQgLSBpbnZva2VkIHdoZW4gVUkgbmVlZHMgdXBkYXRpbmdcbmZ1bmN0aW9uIGNoYW5nZWQoKSB7XG4gIHNjb3Blcy5mb3JFYWNoKGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgc2NvcGUuJGRpZ2VzdCgpO1xuICB9KTtcbn1cblxuXG4vLy8vIC0tLS0gU3RyaWRlciBwcm90b3R5cGUgZnVuY3Rpb25zXG5cbi8vLyBjb25uZWN0XG5cblMuY29ubmVjdCA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gIGlmICghIHNvY2tldCkge1xuICAgIHNvY2tldCA9IGlvLmNvbm5lY3QodGhpcy51cmwpO1xuXG4gICAgLy8vIGNvbm5lY3RzIGpvYiBzdG9yZSB0byBuZXcgc29ja2V0XG4gICAgam9iU3RvcmUuY29ubmVjdChzb2NrZXQsIGNoYW5nZWQpO1xuICB9XG4gIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuXG4gIHNjb3Blcy5wdXNoKHNjb3BlKTtcbiAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSAwIDsgISBmb3VuZCAmJiBpIDwgc2NvcGVzLmxlbmd0aDsgaSArKykge1xuICAgICAgaWYgKHNjb3Blc1tpXSA9PSBzY29wZSkge1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIHNjb3Blcy5zcGxpY2UoaSwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cblxuLy8vIGRlcGxveVxuXG5TLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShwcm9qZWN0KSB7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ2RlcGxveScsIHByb2plY3QubmFtZSB8fCBwcm9qZWN0KTtcbn07XG5cblMudGVzdCA9IGZ1bmN0aW9uIHRlc3QocHJvamVjdCkge1xuICB0aGlzLnNvY2tldC5lbWl0KCd0ZXN0JywgcHJvamVjdC5uYW1lIHx8IHByb2plY3QpO1xufTtcblxuXG4vLy8gam9iXG5cblMuam9iID0gZnVuY3Rpb24gam9iKGpvYklkLCBjYikge1xuICBqb2JTdG9yZS5sb2FkKGpvYklkLCBjYik7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gaGFzS2V5c1xuXG5mdW5jdGlvbiBoYXNLZXlzKHNvdXJjZSkge1xuICAgIHJldHVybiBzb3VyY2UgIT09IG51bGwgJiZcbiAgICAgICAgKHR5cGVvZiBzb3VyY2UgPT09IFwib2JqZWN0XCIgfHxcbiAgICAgICAgdHlwZW9mIHNvdXJjZSA9PT0gXCJmdW5jdGlvblwiKVxufVxuIiwidmFyIEtleXMgPSByZXF1aXJlKFwib2JqZWN0LWtleXNcIilcbnZhciBoYXNLZXlzID0gcmVxdWlyZShcIi4vaGFzLWtleXNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGlmICghaGFzS2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGtleXMgPSBLZXlzKHNvdXJjZSlcblxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0ga2V5c1tqXVxuICAgICAgICAgICAgdGFyZ2V0W25hbWVdID0gc291cmNlW25hbWVdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKGZuKSB7XG5cdHZhciBpc0Z1bmMgPSAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nICYmICEoZm4gaW5zdGFuY2VvZiBSZWdFeHApKSB8fCB0b1N0cmluZy5jYWxsKGZuKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblx0aWYgKCFpc0Z1bmMgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRpc0Z1bmMgPSBmbiA9PT0gd2luZG93LnNldFRpbWVvdXQgfHwgZm4gPT09IHdpbmRvdy5hbGVydCB8fCBmbiA9PT0gd2luZG93LmNvbmZpcm0gfHwgZm4gPT09IHdpbmRvdy5wcm9tcHQ7XG5cdH1cblx0cmV0dXJuIGlzRnVuYztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XG5cdGlmICghaXNGdW5jdGlvbihmbikpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdpdGVyYXRvciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblx0fVxuXHR2YXIgaSwgayxcblx0XHRpc1N0cmluZyA9IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnLFxuXHRcdGwgPSBvYmoubGVuZ3RoLFxuXHRcdGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IG51bGw7XG5cdGlmIChsID09PSArbCkge1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdGlmIChjb250ZXh0ID09PSBudWxsKSB7XG5cdFx0XHRcdGZuKGlzU3RyaW5nID8gb2JqLmNoYXJBdChpKSA6IG9ialtpXSwgaSwgb2JqKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZuLmNhbGwoY29udGV4dCwgaXNTdHJpbmcgPyBvYmouY2hhckF0KGkpIDogb2JqW2ldLCBpLCBvYmopO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRmb3IgKGsgaW4gb2JqKSB7XG5cdFx0XHRpZiAoaGFzT3duLmNhbGwob2JqLCBrKSkge1xuXHRcdFx0XHRpZiAoY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdGZuKG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmbi5jYWxsKGNvbnRleHQsIG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBPYmplY3Qua2V5cyB8fCByZXF1aXJlKCcuL3NoaW0nKTtcblxuIiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuXHR2YXIgc3RyID0gdG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG5cdHZhciBpc0FyZ3VtZW50cyA9IHN0ciA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG5cdGlmICghaXNBcmd1bWVudHMpIHtcblx0XHRpc0FyZ3VtZW50cyA9IHN0ciAhPT0gJ1tvYmplY3QgQXJyYXldJ1xuXHRcdFx0JiYgdmFsdWUgIT09IG51bGxcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInXG5cdFx0XHQmJiB2YWx1ZS5sZW5ndGggPj0gMFxuXHRcdFx0JiYgdG9TdHJpbmcuY2FsbCh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHR9XG5cdHJldHVybiBpc0FyZ3VtZW50cztcbn07XG5cbiIsIihmdW5jdGlvbiAoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8vIG1vZGlmaWVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9lczUtc2hpbVxuXHR2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcblx0XHR0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdFx0Zm9yRWFjaCA9IHJlcXVpcmUoJy4vZm9yZWFjaCcpLFxuXHRcdGlzQXJncyA9IHJlcXVpcmUoJy4vaXNBcmd1bWVudHMnKSxcblx0XHRoYXNEb250RW51bUJ1ZyA9ICEoeyd0b1N0cmluZyc6IG51bGx9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKSxcblx0XHRoYXNQcm90b0VudW1CdWcgPSAoZnVuY3Rpb24gKCkge30pLnByb3BlcnR5SXNFbnVtZXJhYmxlKCdwcm90b3R5cGUnKSxcblx0XHRkb250RW51bXMgPSBbXG5cdFx0XHRcInRvU3RyaW5nXCIsXG5cdFx0XHRcInRvTG9jYWxlU3RyaW5nXCIsXG5cdFx0XHRcInZhbHVlT2ZcIixcblx0XHRcdFwiaGFzT3duUHJvcGVydHlcIixcblx0XHRcdFwiaXNQcm90b3R5cGVPZlwiLFxuXHRcdFx0XCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLFxuXHRcdFx0XCJjb25zdHJ1Y3RvclwiXG5cdFx0XSxcblx0XHRrZXlzU2hpbTtcblxuXHRrZXlzU2hpbSA9IGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG5cdFx0dmFyIGlzT2JqZWN0ID0gb2JqZWN0ICE9PSBudWxsICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnLFxuXHRcdFx0aXNGdW5jdGlvbiA9IHRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcblx0XHRcdGlzQXJndW1lbnRzID0gaXNBcmdzKG9iamVjdCksXG5cdFx0XHR0aGVLZXlzID0gW107XG5cblx0XHRpZiAoIWlzT2JqZWN0ICYmICFpc0Z1bmN0aW9uICYmICFpc0FyZ3VtZW50cykge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5rZXlzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG5cdFx0fVxuXG5cdFx0aWYgKGlzQXJndW1lbnRzKSB7XG5cdFx0XHRmb3JFYWNoKG9iamVjdCwgZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdHRoZUtleXMucHVzaCh2YWx1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIG5hbWUsXG5cdFx0XHRcdHNraXBQcm90byA9IGhhc1Byb3RvRW51bUJ1ZyAmJiBpc0Z1bmN0aW9uO1xuXG5cdFx0XHRmb3IgKG5hbWUgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdGlmICghKHNraXBQcm90byAmJiBuYW1lID09PSAncHJvdG90eXBlJykgJiYgaGFzLmNhbGwob2JqZWN0LCBuYW1lKSkge1xuXHRcdFx0XHRcdHRoZUtleXMucHVzaChuYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChoYXNEb250RW51bUJ1Zykge1xuXHRcdFx0dmFyIGN0b3IgPSBvYmplY3QuY29uc3RydWN0b3IsXG5cdFx0XHRcdHNraXBDb25zdHJ1Y3RvciA9IGN0b3IgJiYgY3Rvci5wcm90b3R5cGUgPT09IG9iamVjdDtcblxuXHRcdFx0Zm9yRWFjaChkb250RW51bXMsIGZ1bmN0aW9uIChkb250RW51bSkge1xuXHRcdFx0XHRpZiAoIShza2lwQ29uc3RydWN0b3IgJiYgZG9udEVudW0gPT09ICdjb25zdHJ1Y3RvcicpICYmIGhhcy5jYWxsKG9iamVjdCwgZG9udEVudW0pKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKGRvbnRFbnVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGVLZXlzO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0ga2V5c1NoaW07XG59KCkpO1xuXG4iXX0=
;