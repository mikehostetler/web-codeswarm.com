;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var App =
exports =
module.exports =
angular.module('BrowserSwarmApp', ['ngRoute', 'ngResource']);

var Strider = require('./strider');

/// App Configuration

App.
  config(['$routeProvider', '$locationProvider', '$httpProvider', configureApp]).
  factory('Strider', ['$resource', Strider]);


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
      templateUel: '/partials/job.html',
      controller: 'JobCtrl'
    });
}


// Simple log function to keep the example simple
function log () {
  if (typeof console !== 'undefined') {
    console.log.apply(console, arguments);
  }
}
},{"./strider":6}],2:[function(require,module,exports){
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
},{"../app":1}],5:[function(require,module,exports){
var extend = require('xtend');

exports = module.exports = createJobStore;
function createJobStore() {
  return new JobStore;
}

var PHASES = ['environment', 'prepare', 'test', 'deploy', 'cleanup'];

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
    console.log('phase done', this);
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
    yours: []
  };
}
var JS = JobStore.prototype;

function dashboard(cb) {
  var self = this;
  this.socket.emit('dashboard:jobs', function(jobs) {
    console.log('jobs:', jobs);
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
  for (var i=0; i<jobs.length; i++) {
    if (jobs[i]._id === id) return jobs[i];
  }
};


/// changed - notifies UI of changes

JS.changed = function changed() {
  this.changeCallback();
};

function ensureCommand(phase) {
  var command = phase.commands[phase.commands.length - 1];
  if (!command || typeof(command.finished) !== 'undefined') {
    command = extend({}, SKELS.command);
    phase.commands.push(command);
  }
  return command;
}
},{"xtend":8}],6:[function(require,module,exports){
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
  var apiBase = this.url + '/api';
  var loginURL = this.url + '/login';
  this.Jobs =    $resource(apiBase + '/jobs');
  this.Session = $resource(apiBase + '/session');
  this.jobs = jobStore.jobs;
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
  this.socket.emit('deploy', project.name);
};

},{"./job_store":5}],7:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],8:[function(require,module,exports){
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

},{"./has-keys":7,"object-keys":10}],9:[function(require,module,exports){
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


},{}],10:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":12}],11:[function(require,module,exports){
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


},{}],12:[function(require,module,exports){
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


},{"./foreach":9,"./isArguments":11}]},{},[2,3,4])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9hcHBlbmR0by93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvYXBwLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYXBwZW5kdG8vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2Rhc2hib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2FwcGVuZHRvL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9lcnJvci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2FwcGVuZHRvL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9sb2dpbi5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2FwcGVuZHRvL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9qb2Jfc3RvcmUuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9hcHBlbmR0by93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvc3RyaWRlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2FwcGVuZHRvL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9oYXMta2V5cy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2FwcGVuZHRvL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2FwcGVuZHRvL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvZm9yZWFjaC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2FwcGVuZHRvL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvaW5kZXguanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9hcHBlbmR0by93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2lzQXJndW1lbnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYXBwZW5kdG8vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9zaGltLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEFwcCA9XG5leHBvcnRzID1cbm1vZHVsZS5leHBvcnRzID1cbmFuZ3VsYXIubW9kdWxlKCdCcm93c2VyU3dhcm1BcHAnLCBbJ25nUm91dGUnLCAnbmdSZXNvdXJjZSddKTtcblxudmFyIFN0cmlkZXIgPSByZXF1aXJlKCcuL3N0cmlkZXInKTtcblxuLy8vIEFwcCBDb25maWd1cmF0aW9uXG5cbkFwcC5cbiAgY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCAnJGxvY2F0aW9uUHJvdmlkZXInLCAnJGh0dHBQcm92aWRlcicsIGNvbmZpZ3VyZUFwcF0pLlxuICBmYWN0b3J5KCdTdHJpZGVyJywgWyckcmVzb3VyY2UnLCBTdHJpZGVyXSk7XG5cblxuZnVuY3Rpb24gY29uZmlndXJlQXBwKCRyb3V0ZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJGh0dHBQcm92aWRlcikge1xuXG4gIC8vLyBIVFRQXG5cbiAgLy8vIEFsd2F5cyBkbyBIVFRQIHJlcXVlc3RzIHdpdGggY3JlZGVudGlhbHMsXG4gIC8vLyBlZmZlY3RpdmVseSBzZW5kaW5nIG91dCB0aGUgc2Vzc2lvbiBjb29raWVcbiAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gIHZhciBpbnRlcmNlcHRvciA9IFsnJHJvb3RTY29wZScsICckcScsIGZ1bmN0aW9uKCRzY29wZSwgJHEpIHtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlcnJvcihyZXNwb25zZSkge1xuICAgICAgdmFyIHN0YXR1cyA9IHJlc3BvbnNlLnN0YXR1cztcblxuICAgICAgdmFyIHJlc3AgPSByZXNwb25zZS5kYXRhO1xuICAgICAgaWYgKHJlc3ApIHRyeSB7IHJlc3AgPSBKU09OLnBhcnNlKHJlc3ApOyB9IGNhdGNoKGVycikgeyB9XG5cbiAgICAgIGlmIChyZXNwLm1lc3NhZ2UpIHJlc3AgPSByZXNwLm1lc3NhZ2U7XG4gICAgICBpZiAoISByZXNwKSB7XG4gICAgICAgIHJlc3AgPSAnRXJyb3IgaW4gcmVzcG9uc2UnO1xuICAgICAgICBpZiAoc3RhdHVzKSByZXNwICs9ICcgKCcgKyBzdGF0dXMgKyAnKSc7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS4kZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IocmVzcCkpO1xuXG4gICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oc3VjY2VzcywgZXJyb3IpO1xuICAgIH1cblxuICB9XTtcblxuICAkaHR0cFByb3ZpZGVyLnJlc3BvbnNlSW50ZXJjZXB0b3JzLnB1c2goaW50ZXJjZXB0b3IpO1xuXG5cbiAgLy8vIEVuYWJsZSBoYXNoYmFuZy1sZXNzIHJvdXRlc1xuXG4gICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLy8gUm91dGVzXG5cbiAgJHJvdXRlUHJvdmlkZXIuXG4gICAgd2hlbignL2Rhc2hib2FyZCcsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2Rhc2hib2FyZC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdEYXNoYm9hcmRDdHJsJ1xuICAgIH0pLlxuICAgIHdoZW4oJy9sb2dpbicsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2xvZ2luLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KS5cbiAgICB3aGVuKCcvOm93bmVyLzpyZXBvL2pvYi86am9iaWQnLCB7XG4gICAgICB0ZW1wbGF0ZVVlbDogJy9wYXJ0aWFscy9qb2IuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiAnSm9iQ3RybCdcbiAgICB9KTtcbn1cblxuXG4vLyBTaW1wbGUgbG9nIGZ1bmN0aW9uIHRvIGtlZXAgdGhlIGV4YW1wbGUgc2ltcGxlXG5mdW5jdGlvbiBsb2cgKCkge1xuICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgfVxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0Rhc2hib2FyZEN0cmwnLCBbJyRzY29wZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIERhc2hib2FyZEN0cmxdKTtcblxuZnVuY3Rpb24gRGFzaGJvYXJkQ3RybCgkc2NvcGUsICRsb2NhdGlvbiwgU3RyaWRlcikge1xuXG4gIFN0cmlkZXIuU2Vzc2lvbi5nZXQoZnVuY3Rpb24odXNlcikge1xuICAgIGlmICghIHVzZXIudXNlcikgJGxvY2F0aW9uLnBhdGgoJy9sb2dpbicpO1xuICAgIGVsc2UgYXV0aGVudGljYXRlZCgpO1xuICB9KTtcblxuICBmdW5jdGlvbiBhdXRoZW50aWNhdGVkKCkge1xuICAgICRzY29wZS5qb2JzID0gU3RyaWRlci5qb2JzO1xuICAgIFN0cmlkZXIuY29ubmVjdCgkc2NvcGUpO1xuICAgIFN0cmlkZXIuam9icy5kYXNoYm9hcmQoKTtcbiAgfVxuXG4gICRzY29wZS5kZXBsb3kgPSBmdW5jdGlvbiBkZXBsb3kocHJvamVjdCkge1xuICAgIFN0cmlkZXIuZGVwbG95KHByb2plY3QpO1xuICB9O1xuXG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignRXJyb3JDdHJsJywgWyckc2NvcGUnLCAnJHJvb3RTY29wZScsIEVycm9yQ3RybF0pO1xuXG5mdW5jdGlvbiBFcnJvckN0cmwoJHNjb3BlLCAkcm9vdFNjb3BlKSB7XG4gICRzY29wZS5lcnJvciA9IHt9O1xuXG4gICRyb290U2NvcGUuJG9uKCdlcnJvcicsIGZ1bmN0aW9uKGV2LCBlcnIpIHtcbiAgICAkc2NvcGUuZXJyb3IubWVzc2FnZSA9IGVyci5tZXNzYWdlIHx8IGVycjtcbiAgfSk7XG5cbiAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgJHNjb3BlLmVycm9yLm1lc3NhZ2UgPSAnJztcbiAgfSk7XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgWyckc2NvcGUnLCAnJGxvY2F0aW9uJywgJ1N0cmlkZXInLCBMb2dpbkN0cmxdKTtcblxuZnVuY3Rpb24gTG9naW5DdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBTdHJpZGVyKSB7XG5cbiAgU3RyaWRlci5TZXNzaW9uLmdldChmdW5jdGlvbih1c2VyKSB7XG4gICAgaWYgKHVzZXIuaWQpICRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7XG4gIH0pO1xuXG4gICRzY29wZS51c2VyID0ge307XG5cbiAgJHNjb3BlLmxvZ2luID0gZnVuY3Rpb24gbG9naW4odXNlcikge1xuICAgIHZhciBzZXNzaW9uID0gbmV3IChTdHJpZGVyLlNlc3Npb24pKHVzZXIpO1xuICAgIHNlc3Npb24uJHNhdmUoZnVuY3Rpb24oKSB7XG4gICAgICAkbG9jYXRpb24ucGF0aCgnL2Rhc2hib2FyZCcpO1xuICAgIH0pO1xuICB9O1xufSIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVKb2JTdG9yZTtcbmZ1bmN0aW9uIGNyZWF0ZUpvYlN0b3JlKCkge1xuICByZXR1cm4gbmV3IEpvYlN0b3JlO1xufVxuXG52YXIgUEhBU0VTID0gWydlbnZpcm9ubWVudCcsICdwcmVwYXJlJywgJ3Rlc3QnLCAnZGVwbG95JywgJ2NsZWFudXAnXTtcblxudmFyIHN0YXR1c0hhbmRsZXJzID0ge1xuICAnc3RhcnRlZCc6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zdGFydGVkID0gdGltZTtcbiAgICB0aGlzLnBoYXNlID0gJ2Vudmlyb25tZW50JztcbiAgICB0aGlzLnN0YXR1cyA9ICdydW5uaW5nJztcbiAgfSxcbiAgJ2Vycm9yZWQnOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICB0aGlzLmVycm9yID0gZXJyb3I7XG4gICAgdGhpcy5zdGF0dXMgPSAnZXJyb3JlZCc7XG4gIH0sXG4gICdjYW5jZWxlZCc6ICdlcnJvcmVkJyxcbiAgJ3BoYXNlLmRvbmUnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHRoaXMucGhhc2UgPSBQSEFTRVMuaW5kZXhPZihkYXRhLnBoYXNlKSArIDE7XG4gIH0sXG4gIC8vIHRoaXMgaXMganVzdCBzbyB3ZSdsbCB0cmlnZ2VyIHRoZSBcInVua25vd24gam9iXCIgbG9va3VwIHNvb25lciBvbiB0aGUgZGFzaGJvYXJkXG4gICdzdGRvdXQnOiBmdW5jdGlvbiAodGV4dCkge30sXG4gICdzdGRlcnInOiBmdW5jdGlvbiAodGV4dCkge30sXG4gICd3YXJuaW5nJzogZnVuY3Rpb24gKHdhcm5pbmcpIHtcbiAgICBpZiAoIXRoaXMud2FybmluZ3MpIHtcbiAgICAgIHRoaXMud2FybmluZ3MgPSBbXTtcbiAgICB9XG4gICAgdGhpcy53YXJuaW5ncy5wdXNoKHdhcm5pbmcpO1xuICB9LFxuICAncGx1Z2luLWRhdGEnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBwYXRoID0gZGF0YS5wYXRoID8gW2RhdGEucGx1Z2luXS5jb25jYXQoZGF0YS5wYXRoLnNwbGl0KCcuJykpIDogW2RhdGEucGx1Z2luXVxuICAgICwgbGFzdCA9IHBhdGgucG9wKClcbiAgICAsIG1ldGhvZCA9IGRhdGEubWV0aG9kIHx8ICdyZXBsYWNlJ1xuICAgICwgcGFyZW50XG4gICAgcGFyZW50ID0gcGF0aC5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgYXR0cikge1xuICAgICAgcmV0dXJuIG9ialthdHRyXSB8fCAob2JqW2F0dHJdID0ge30pXG4gICAgfSwgdGhpcy5wbHVnaW5fZGF0YSB8fCAodGhpcy5wbHVnaW5fZGF0YSA9IHt9KSlcbiAgICBpZiAobWV0aG9kID09PSAncmVwbGFjZScpIHtcbiAgICAgIHBhcmVudFtsYXN0XSA9IGRhdGEuZGF0YVxuICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSAncHVzaCcpIHtcbiAgICAgIGlmICghcGFyZW50W2xhc3RdKSB7XG4gICAgICAgIHBhcmVudFtsYXN0XSA9IFtdXG4gICAgICB9XG4gICAgICBwYXJlbnRbbGFzdF0ucHVzaChkYXRhLmRhdGEpXG4gICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdleHRlbmQnKSB7XG4gICAgICBpZiAoIXBhcmVudFtsYXN0XSkge1xuICAgICAgICBwYXJlbnRbbGFzdF0gPSB7fVxuICAgICAgfVxuICAgICAgZXh0ZW5kKHBhcmVudFtsYXN0XSwgZGF0YS5kYXRhKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIFwicGx1Z2luIGRhdGFcIiBtZXRob2QgcmVjZWl2ZWQgZnJvbSBwbHVnaW4nLCBkYXRhLnBsdWdpbiwgZGF0YS5tZXRob2QsIGRhdGEpXG4gICAgfVxuICB9LFxuXG4gICdwaGFzZS5kb25lJzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBjb25zb2xlLmxvZygncGhhc2UgZG9uZScsIHRoaXMpO1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZmluaXNoZWQgPSBkYXRhLnRpbWU7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZHVyYXRpb24gPSBkYXRhLmVsYXBzZWRcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5leGl0Q29kZSA9IGRhdGEuY29kZTtcbiAgICBpZiAoWydwcmVwYXJlJywgJ2Vudmlyb25tZW50JywgJ2NsZWFudXAnXS5pbmRleE9mKGRhdGEucGhhc2UpICE9PSAtMSkge1xuICAgICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uY29sbGFwc2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGRhdGEucGhhc2UgPT09ICd0ZXN0JykgdGhpcy50ZXN0X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoZGF0YS5waGFzZSA9PT0gJ2RlcGxveScpIHRoaXMuZGVwbG95X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoIWRhdGEubmV4dCB8fCAhdGhpcy5waGFzZXNbZGF0YS5uZXh0XSkgcmV0dXJuO1xuICAgIHRoaXMucGhhc2UgPSBkYXRhLm5leHQ7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5uZXh0XS5zdGFydGVkID0gZGF0YS50aW1lO1xuICB9LFxuICAnY29tbWFuZC5jb21tZW50JzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQpO1xuICAgIGNvbW1hbmQuY29tbWFuZCA9IGRhdGEuY29tbWVudDtcbiAgICBjb21tYW5kLmNvbW1lbnQgPSB0cnVlO1xuICAgIGNvbW1hbmQucGx1Z2luID0gZGF0YS5wbHVnaW47XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9LFxuICAnY29tbWFuZC5zdGFydCc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kLCBkYXRhKTtcbiAgICBjb21tYW5kLnN0YXJ0ZWQgPSBkYXRhLnRpbWU7XG4gICAgcGhhc2UuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfSxcbiAgJ2NvbW1hbmQuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gcGhhc2UuY29tbWFuZHNbcGhhc2UuY29tbWFuZHMubGVuZ3RoIC0gMV07XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBjb21tYW5kLmR1cmF0aW9uID0gZGF0YS5lbGFwc2VkO1xuICAgIGNvbW1hbmQuZXhpdENvZGUgPSBkYXRhLmV4aXRDb2RlO1xuICAgIGNvbW1hbmQubWVyZ2VkID0gY29tbWFuZC5fbWVyZ2VkO1xuICB9LFxuICAnc3Rkb3V0JzogZnVuY3Rpb24gKHRleHQpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBjb21tYW5kID0gZW5zdXJlQ29tbWFuZCh0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXSk7XG4gICAgY29tbWFuZC5vdXQgKz0gdGV4dDtcbiAgICBjb21tYW5kLl9tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5vdXQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWRfbGF0ZXN0ID0gdGV4dDtcbiAgfSxcbiAgJ3N0ZGVycic6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgY29tbWFuZCA9IGVuc3VyZUNvbW1hbmQodGhpcy5waGFzZXNbdGhpcy5waGFzZV0pO1xuICAgIGNvbW1hbmQuZXJyICs9IHRleHQ7XG4gICAgY29tbWFuZC5fbWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQuZXJyICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkX2xhdGVzdCA9IHRleHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gSm9iU3RvcmUoKSB7XG4gIHRoaXMuam9icyA9IHtcbiAgICBkYXNoYm9hcmQ6IGRhc2hib2FyZC5iaW5kKHRoaXMpLFxuICAgIHB1YmxpYzogW10sXG4gICAgeW91cnM6IFtdXG4gIH07XG59XG52YXIgSlMgPSBKb2JTdG9yZS5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIGRhc2hib2FyZChjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ2Rhc2hib2FyZDpqb2JzJywgZnVuY3Rpb24oam9icykge1xuICAgIGNvbnNvbGUubG9nKCdqb2JzOicsIGpvYnMpO1xuICAgIHNlbGYuam9icy55b3VycyA9IGpvYnMueW91cnM7XG4gICAgc2VsZi5qb2JzLnB1YmxpYyA9IGpvYnMucHVibGljO1xuICAgIHNlbGYuY2hhbmdlZCgpO1xuICB9KTtcbn1cblxuXG4vLy8gLS0tLSBKb2IgU3RvcmUgcHJvdG90eXBlIGZ1bmN0aW9uczogLS0tLVxuXG4vLy8gY29ubmVjdFxuXG5KUy5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdChzb2NrZXQsIGNoYW5nZUNhbGxiYWNrKSB7XG4gIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuICB0aGlzLmNoYW5nZUNhbGxiYWNrID0gY2hhbmdlQ2FsbGJhY2s7XG5cbiAgZm9yICh2YXIgc3RhdHVzIGluIHN0YXR1c0hhbmRsZXJzKSB7XG4gICAgc29ja2V0Lm9uKCdqb2Iuc3RhdHVzLicgKyBzdGF0dXMsIHRoaXMudXBkYXRlLmJpbmQodGhpcywgc3RhdHVzKSlcbiAgfVxuXG4gIHNvY2tldC5vbignam9iLm5ldycsIEpTLm5ld0pvYi5iaW5kKHRoaXMpKTtcbn07XG5cblxuLy8vIHVwZGF0ZSAtIGhhbmRsZSB1cGRhdGUgZXZlbnRcblxuSlMudXBkYXRlID0gZnVuY3Rpb24gdWRwYXRlKGV2ZW50LCBhcmdzLCBhY2Nlc3MsIGRvbnRjaGFuZ2UpIHtcbiAgdmFyIGlkID0gYXJncy5zaGlmdCgpXG4gICAgLCBqb2IgPSB0aGlzLmpvYihpZCwgYWNjZXNzKVxuICAgICwgaGFuZGxlciA9IHN0YXR1c0hhbmRsZXJzW2V2ZW50XTtcbiAgaWYgKCFqb2IpIHJldHVybiB0aGlzLnVua25vd24oaWQsIGV2ZW50LCBhcmdzLCBhY2Nlc3MpXG4gIGlmICghaGFuZGxlcikgcmV0dXJuO1xuICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBoYW5kbGVyKSB7XG4gICAgam9iLnN0YXR1cyA9IGhhbmRsZXI7XG4gIH0gZWxzZSB7XG4gICAgaGFuZGxlci5hcHBseShqb2IsIGFyZ3MpO1xuICB9XG4gIGlmICghZG9udGNoYW5nZSkgdGhpcy5jaGFuZ2VkKCk7XG59O1xuXG5cbi8vLyBuZXdKb2IgLSB3aGVuIHNlcnZlciBub3RpZmllcyBvZiBuZXcgam9iXG5cbkpTLm5ld0pvYiA9IGZ1bmN0aW9uIG5ld0pvYihqb2IsIGFjY2Vzcykge1xuICBjb25zb2xlLmxvZygnbmV3Sm9iJywgdGhpcyk7XG4gIGlmICghIGpvYikgcmV0dXJuO1xuICBqb2IgPSBqb2JbMF07XG5cbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNbYWNjZXNzXVxuICAgICwgZm91bmQgPSAtMVxuICAgICwgb2xkO1xuXG4gIGlmICghIGpvYnMpIHJldHVybjtcblxuICBmb3IgKHZhciBpPTA7IGk8am9icy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChqb2JzW2ldLnByb2plY3QubmFtZSA9PT0gam9iLnByb2plY3QubmFtZSkge1xuICAgICAgZm91bmQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGlmIChmb3VuZCAhPT0gLTEpIHtcbiAgICBvbGQgPSBqb2JzLnNwbGljZShmb3VuZCwgMSlbMF07XG4gICAgam9iLnByb2plY3QucHJldiA9IG9sZC5wcm9qZWN0LnByZXY7XG4gIH1cbiAgLy8gaWYgKGpvYi5waGFzZXMpIHtcbiAgLy8gICAvLyBnZXQgcmlkIG9mIGV4dHJhIGRhdGEgLSB3ZSBkb24ndCBuZWVkIGl0LlxuICAvLyAgIC8vIG5vdGU6IHRoaXMgd29uJ3QgYmUgcGFzc2VkIHVwIGFueXdheSBmb3IgcHVibGljIHByb2plY3RzXG4gIC8vICAgY2xlYW5Kb2Ioam9iKTtcbiAgLy8gfVxuICAvL2pvYi5waGFzZSA9ICdlbnZpcm9ubWVudCc7XG4gIGpvYnMudW5zaGlmdChqb2IpO1xuICB0aGlzLmNoYW5nZWQoKTtcbn07XG5cblxuLy8vIGpvYiAtIGZpbmQgYSBqb2IgYnkgaWQgYW5kIGFjY2VzcyBsZXZlbFxuXG5KUy5qb2IgPSBmdW5jdGlvbiBqb2IoaWQsIGFjY2Vzcykge1xuICB2YXIgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdO1xuICBmb3IgKHZhciBpPTA7IGk8am9icy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChqb2JzW2ldLl9pZCA9PT0gaWQpIHJldHVybiBqb2JzW2ldO1xuICB9XG59O1xuXG5cbi8vLyBjaGFuZ2VkIC0gbm90aWZpZXMgVUkgb2YgY2hhbmdlc1xuXG5KUy5jaGFuZ2VkID0gZnVuY3Rpb24gY2hhbmdlZCgpIHtcbiAgdGhpcy5jaGFuZ2VDYWxsYmFjaygpO1xufTtcblxuZnVuY3Rpb24gZW5zdXJlQ29tbWFuZChwaGFzZSkge1xuICB2YXIgY29tbWFuZCA9IHBoYXNlLmNvbW1hbmRzW3BoYXNlLmNvbW1hbmRzLmxlbmd0aCAtIDFdO1xuICBpZiAoIWNvbW1hbmQgfHwgdHlwZW9mKGNvbW1hbmQuZmluaXNoZWQpICE9PSAndW5kZWZpbmVkJykge1xuICAgIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQpO1xuICAgIHBoYXNlLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gIH1cbiAgcmV0dXJuIGNvbW1hbmQ7XG59IiwidmFyIEpvYlN0b3JlID0gcmVxdWlyZSgnLi9qb2Jfc3RvcmUnKTtcbnZhciBqb2JTdG9yZSA9IEpvYlN0b3JlKCk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEJ1aWxkU3RyaWRlcjtcblxuZnVuY3Rpb24gQnVpbGRTdHJpZGVyKCRyZXNvdXJjZSkge1xuICByZXR1cm4gbmV3IFN0cmlkZXIoJHJlc291cmNlKTtcbn1cblxuXG52YXIgc29ja2V0O1xudmFyIHNjb3BlcyA9IFtdO1xuXG5mdW5jdGlvbiBTdHJpZGVyKCRyZXNvdXJjZSwgb3B0cykge1xuICBpZiAoISBvcHRzKSBvcHRzID0ge307XG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnc3RyaW5nJylcbiAgICBvcHRzID0geyB1cmw6IG9wdHMgfTtcblxuICB0aGlzLnVybCA9IG9wdHMudXJsIHx8ICcvL2xvY2FsaG9zdDozMDAwJztcblxuICAvLy8gUmVzdGZ1bCBBUEkgc2V0dXBcbiAgdmFyIGFwaUJhc2UgPSB0aGlzLnVybCArICcvYXBpJztcbiAgdmFyIGxvZ2luVVJMID0gdGhpcy51cmwgKyAnL2xvZ2luJztcbiAgdGhpcy5Kb2JzID0gICAgJHJlc291cmNlKGFwaUJhc2UgKyAnL2pvYnMnKTtcbiAgdGhpcy5TZXNzaW9uID0gJHJlc291cmNlKGFwaUJhc2UgKyAnL3Nlc3Npb24nKTtcbiAgdGhpcy5qb2JzID0gam9iU3RvcmUuam9icztcbn1cblxuXG52YXIgUyA9IFN0cmlkZXIucHJvdG90eXBlO1xuXG5cbi8vLyBjaGFuZ2VkIC0gaW52b2tlZCB3aGVuIFVJIG5lZWRzIHVwZGF0aW5nXG5mdW5jdGlvbiBjaGFuZ2VkKCkge1xuICBzY29wZXMuZm9yRWFjaChmdW5jdGlvbihzY29wZSkge1xuICAgIHNjb3BlLiRkaWdlc3QoKTtcbiAgfSk7XG59XG5cblxuLy8vLyAtLS0tIFN0cmlkZXIgcHJvdG90eXBlIGZ1bmN0aW9uc1xuXG4vLy8gY29ubmVjdFxuXG5TLmNvbm5lY3QgPSBmdW5jdGlvbihzY29wZSkge1xuICBpZiAoISBzb2NrZXQpIHtcbiAgICBzb2NrZXQgPSBpby5jb25uZWN0KHRoaXMudXJsKTtcblxuICAgIC8vLyBjb25uZWN0cyBqb2Igc3RvcmUgdG8gbmV3IHNvY2tldFxuICAgIGpvYlN0b3JlLmNvbm5lY3Qoc29ja2V0LCBjaGFuZ2VkKTtcbiAgfVxuICB0aGlzLnNvY2tldCA9IHNvY2tldDtcblxuICBzY29wZXMucHVzaChzY29wZSk7XG4gIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpID0gMCA7ICEgZm91bmQgJiYgaSA8IHNjb3Blcy5sZW5ndGg7IGkgKyspIHtcbiAgICAgIGlmIChzY29wZXNbaV0gPT0gc2NvcGUpIHtcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBzY29wZXMuc3BsaWNlKGksIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuXG5cbi8vLyBkZXBsb3lcblxuUy5kZXBsb3kgPSBmdW5jdGlvbiBkZXBsb3kocHJvamVjdCkge1xuICB0aGlzLnNvY2tldC5lbWl0KCdkZXBsb3knLCBwcm9qZWN0Lm5hbWUpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gaGFzS2V5c1xuXG5mdW5jdGlvbiBoYXNLZXlzKHNvdXJjZSkge1xuICAgIHJldHVybiBzb3VyY2UgIT09IG51bGwgJiZcbiAgICAgICAgKHR5cGVvZiBzb3VyY2UgPT09IFwib2JqZWN0XCIgfHxcbiAgICAgICAgdHlwZW9mIHNvdXJjZSA9PT0gXCJmdW5jdGlvblwiKVxufVxuIiwidmFyIEtleXMgPSByZXF1aXJlKFwib2JqZWN0LWtleXNcIilcbnZhciBoYXNLZXlzID0gcmVxdWlyZShcIi4vaGFzLWtleXNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGlmICghaGFzS2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGtleXMgPSBLZXlzKHNvdXJjZSlcblxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0ga2V5c1tqXVxuICAgICAgICAgICAgdGFyZ2V0W25hbWVdID0gc291cmNlW25hbWVdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKGZuKSB7XG5cdHZhciBpc0Z1bmMgPSAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nICYmICEoZm4gaW5zdGFuY2VvZiBSZWdFeHApKSB8fCB0b1N0cmluZy5jYWxsKGZuKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblx0aWYgKCFpc0Z1bmMgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRpc0Z1bmMgPSBmbiA9PT0gd2luZG93LnNldFRpbWVvdXQgfHwgZm4gPT09IHdpbmRvdy5hbGVydCB8fCBmbiA9PT0gd2luZG93LmNvbmZpcm0gfHwgZm4gPT09IHdpbmRvdy5wcm9tcHQ7XG5cdH1cblx0cmV0dXJuIGlzRnVuYztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XG5cdGlmICghaXNGdW5jdGlvbihmbikpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdpdGVyYXRvciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblx0fVxuXHR2YXIgaSwgayxcblx0XHRpc1N0cmluZyA9IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnLFxuXHRcdGwgPSBvYmoubGVuZ3RoLFxuXHRcdGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IG51bGw7XG5cdGlmIChsID09PSArbCkge1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdGlmIChjb250ZXh0ID09PSBudWxsKSB7XG5cdFx0XHRcdGZuKGlzU3RyaW5nID8gb2JqLmNoYXJBdChpKSA6IG9ialtpXSwgaSwgb2JqKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZuLmNhbGwoY29udGV4dCwgaXNTdHJpbmcgPyBvYmouY2hhckF0KGkpIDogb2JqW2ldLCBpLCBvYmopO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRmb3IgKGsgaW4gb2JqKSB7XG5cdFx0XHRpZiAoaGFzT3duLmNhbGwob2JqLCBrKSkge1xuXHRcdFx0XHRpZiAoY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdGZuKG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmbi5jYWxsKGNvbnRleHQsIG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBPYmplY3Qua2V5cyB8fCByZXF1aXJlKCcuL3NoaW0nKTtcblxuIiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuXHR2YXIgc3RyID0gdG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG5cdHZhciBpc0FyZ3VtZW50cyA9IHN0ciA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG5cdGlmICghaXNBcmd1bWVudHMpIHtcblx0XHRpc0FyZ3VtZW50cyA9IHN0ciAhPT0gJ1tvYmplY3QgQXJyYXldJ1xuXHRcdFx0JiYgdmFsdWUgIT09IG51bGxcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInXG5cdFx0XHQmJiB2YWx1ZS5sZW5ndGggPj0gMFxuXHRcdFx0JiYgdG9TdHJpbmcuY2FsbCh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHR9XG5cdHJldHVybiBpc0FyZ3VtZW50cztcbn07XG5cbiIsIihmdW5jdGlvbiAoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8vIG1vZGlmaWVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9lczUtc2hpbVxuXHR2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcblx0XHR0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdFx0Zm9yRWFjaCA9IHJlcXVpcmUoJy4vZm9yZWFjaCcpLFxuXHRcdGlzQXJncyA9IHJlcXVpcmUoJy4vaXNBcmd1bWVudHMnKSxcblx0XHRoYXNEb250RW51bUJ1ZyA9ICEoeyd0b1N0cmluZyc6IG51bGx9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKSxcblx0XHRoYXNQcm90b0VudW1CdWcgPSAoZnVuY3Rpb24gKCkge30pLnByb3BlcnR5SXNFbnVtZXJhYmxlKCdwcm90b3R5cGUnKSxcblx0XHRkb250RW51bXMgPSBbXG5cdFx0XHRcInRvU3RyaW5nXCIsXG5cdFx0XHRcInRvTG9jYWxlU3RyaW5nXCIsXG5cdFx0XHRcInZhbHVlT2ZcIixcblx0XHRcdFwiaGFzT3duUHJvcGVydHlcIixcblx0XHRcdFwiaXNQcm90b3R5cGVPZlwiLFxuXHRcdFx0XCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLFxuXHRcdFx0XCJjb25zdHJ1Y3RvclwiXG5cdFx0XSxcblx0XHRrZXlzU2hpbTtcblxuXHRrZXlzU2hpbSA9IGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG5cdFx0dmFyIGlzT2JqZWN0ID0gb2JqZWN0ICE9PSBudWxsICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnLFxuXHRcdFx0aXNGdW5jdGlvbiA9IHRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcblx0XHRcdGlzQXJndW1lbnRzID0gaXNBcmdzKG9iamVjdCksXG5cdFx0XHR0aGVLZXlzID0gW107XG5cblx0XHRpZiAoIWlzT2JqZWN0ICYmICFpc0Z1bmN0aW9uICYmICFpc0FyZ3VtZW50cykge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5rZXlzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG5cdFx0fVxuXG5cdFx0aWYgKGlzQXJndW1lbnRzKSB7XG5cdFx0XHRmb3JFYWNoKG9iamVjdCwgZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdHRoZUtleXMucHVzaCh2YWx1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIG5hbWUsXG5cdFx0XHRcdHNraXBQcm90byA9IGhhc1Byb3RvRW51bUJ1ZyAmJiBpc0Z1bmN0aW9uO1xuXG5cdFx0XHRmb3IgKG5hbWUgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdGlmICghKHNraXBQcm90byAmJiBuYW1lID09PSAncHJvdG90eXBlJykgJiYgaGFzLmNhbGwob2JqZWN0LCBuYW1lKSkge1xuXHRcdFx0XHRcdHRoZUtleXMucHVzaChuYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChoYXNEb250RW51bUJ1Zykge1xuXHRcdFx0dmFyIGN0b3IgPSBvYmplY3QuY29uc3RydWN0b3IsXG5cdFx0XHRcdHNraXBDb25zdHJ1Y3RvciA9IGN0b3IgJiYgY3Rvci5wcm90b3R5cGUgPT09IG9iamVjdDtcblxuXHRcdFx0Zm9yRWFjaChkb250RW51bXMsIGZ1bmN0aW9uIChkb250RW51bSkge1xuXHRcdFx0XHRpZiAoIShza2lwQ29uc3RydWN0b3IgJiYgZG9udEVudW0gPT09ICdjb25zdHJ1Y3RvcicpICYmIGhhcy5jYWxsKG9iamVjdCwgZG9udEVudW0pKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKGRvbnRFbnVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGVLZXlzO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0ga2V5c1NoaW07XG59KCkpO1xuXG4iXX0=
;