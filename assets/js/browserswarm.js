;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Strider = require('./strider');

var App =
exports =
module.exports =
angular.module('BrowserSwarmApp', ['ngRoute', 'ngResource', 'ngSanitize']);

/// App Configuration

App.
  config(['$routeProvider', '$locationProvider', '$httpProvider', configureApp]).
  factory('Strider', ['$resource', '$http', Strider]);

function configureApp($routeProvider, $locationProvider, $httpProvider) {

  /// HTTP

  /// Always do HTTP requests with credentials,
  /// effectively sending out the session cookie
  $httpProvider.defaults.withCredentials = true;

  var interceptor = require('./http_interceptor');

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
    when('/:owner/:repo/config', {
      templateUrl: '/partials/config/index.html',
      controller: 'ConfigCtrl',
      reloadOnSearch: false
    }).
    when('/:owner/:repo', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    }).
    when('/:owner/:repo/job/:jobid', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    });

}

},{"./http_interceptor":20,"./strider":23}],2:[function(require,module,exports){

var app = require('../app');

app.controller('AlertsCtrl', ['$scope', '$sce', function ($scope, $sce) {
  $scope.message = null;

  $scope.error = function (text, digest) {
    $scope.message = {
      text: $sce.trustAsHtml(text),
      type: 'error',
      showing: true
    };
    if (digest) $scope.$root.$digest();
  };

  $scope.info = function (text, digest) {
    $scope.message = {
      text: $sce.trustAsHtml(text),
      type: 'info',
      showing: true
    };
    if (digest) $scope.$root.$digest();
  };
  var waitTime = null;

  $scope.success = function (text, digest, sticky) {
    if (waitTime) {
      clearTimeout(waitTime);
      waitTime = null;
    }
    if (clearTime) {
      clearTimeout(clearTime);
      clearTime = null;
    }
    $scope.message = {
      text: $sce.trustAsHtml('<strong>Done.</strong> ' + text),
      type: 'success',
      showing: true
    };
    if (!sticky) {
      waitTime = setTimeout(function () {
        $scope.clearMessage();
        $scope.$digest();
      }, 5000);
    }
    if (digest) $scope.$root.$digest();
  };
  var clearTime = null;

  $scope.clearMessage = function () {
    if (clearTime) {
      clearTimeout(clearTime);
    }
    if ($scope.message) {
      $scope.message.showing = false;
    }
    clearTime = setTimeout(function () {
      clearTime = null;
      $scope.message = null;
      $scope.$digest();
    }, 1000);
  };
}]);

},{"../app":1}],3:[function(require,module,exports){
var md5         = require('../lib/md5');
var App         = require('../app');
var fixTemplate = require('./config/_fix_template');

App.controller('ConfigCtrl', ['$scope', '$routeParams', '$sce', '$location', 'Strider', ConfigCtrl]);

function ConfigCtrl($scope, $routeParams, $sce, $location, Strider) {

  var projectSearchOptions = {
    owner: $routeParams.owner,
    repo: $routeParams.repo
  };

  Strider.Config.get(projectSearchOptions, function(conf) {

    /// Fix and trust remote HTML

    Object.keys(conf.plugins).forEach(function(key) {
      conf.plugins[key].html = $sce.trustAsHtml(
        fixTemplate(conf.plugins[key].html));
    });

    Object.keys(conf.runners).forEach(function(key) {
      conf.runners[key].html = $sce.trustAsHtml(
        fixTemplate(conf.runners[key].html));
    });

    if (conf.provider) {
      conf.provider.html = $sce.trustAsHtml(
        fixTemplate(conf.provider.html));
    }

    /// Get all the conf into the scope for rendering

    $scope.project = conf.project;
    $scope.provider = conf.provider;
    $scope.plugins = conf.plugins;
    $scope.runners = conf.runners;
    $scope.branches = conf.branches || [];
    $scope.statusBlocks = conf.statusBlocks;
    $scope.collaborators = conf.collaborators;
    $scope.userIsCreator = conf.userIsCreator;
    $scope.userConfigs = conf.userConfigs;
    $scope.configured = {};

    $scope.branch = $scope.project.branches[0];
    $scope.disabled_plugins = {};
    $scope.configs = {};
    $scope.runnerConfigs = {};

    $scope.api_root = '/' + $scope.project.name + '/api/';

    $scope.refreshBranches = function () {
      // TODO implement
      throw Error('Not implemented');
    };

    $scope.setEnabled = function (plugin, enabled) {
      $scope.configs[$scope.branch.name][plugin].enabled = enabled;
      savePluginOrder();
    };

    $scope.savePluginOrder = savePluginOrder;

    $scope.switchToMaster = function () {
      for (var i=0; i<$scope.project.branches.length; i++) {
        if ($scope.project.branches[i].name === 'master') {
          $scope.branch = $scope.project.branches[i];
          return;
        }
      }
    };

    $scope.clearCache = function () {
      $scope.clearingCache = true;
      Strider.Cache.delete(success);

      function success() {
        $scope.clearingCache = false;
        $scope.success('Cleared the cache');
      }
    }

    $scope.toggleBranch = function () {
      if ($scope.branch.mirror_master) {
        $scope.branch.mirror_master = false;
        var name = $scope.branch.name
          , master;
        for (var i=0; i<$scope.project.branches.length; i++) {
          if ($scope.project.branches[i].name === 'master') {
            master = $scope.project.branches[i];
            break;
          }
        }
        $scope.branch = $.extend(true, $scope.branch, master);
        $scope.branch.name = name;
        initBranch($scope.branch);
      } else {
        $scope.branch.mirror_master = true;
      }
      $scope.saveGeneralBranch(true);
    };

    $scope.$watch('branch.mirror_master', function (value) {
      setTimeout(function () {
        var tab = value && value.name === 'master' ? 'project' : 'basic';
        $('#' + tab + '-tab-handle').tab('show');
        $('.tab-pane.active').removeClass('active');
        $('#tab-' + tab).addClass('active');
      }, 0);
    });
    $scope.$watch('branch', function (value) {
      setTimeout(function () {
        var tab = value && value.name === 'master' ? 'project' : 'basic';
        $('#' + tab + '-tab-handle').tab('show');
        $('.tab-pane.active').removeClass('active');
        $('#tab-' + tab).addClass('active');
      }, 0);
    });

    $scope.setRunner = function (name) {
      $scope.branch.runner = {
        id: name,
        config: $scope.runnerConfigs[name]
      };
    };

    function updateConfigured() {
      var plugins = $scope.branch.plugins;
      $scope.configured[$scope.branch.name] = {};
      for (var i=0; i<plugins.length; i++) {
        $scope.configured[$scope.branch.name][plugins[i].id] = true;
      }
      savePluginOrder();
    }

    function savePluginOrder() {
      var plugins = $scope.branch.plugins
        , branch = $scope.branch
        , data = [];

      for (var i=0; i<plugins.length; i++) {
        data.push({
          id: plugins[i].id,
          enabled: plugins[i].enabled,
          showStatus: plugins[i].showStatus
        });
      }

      Strider.Config.Branch.save(
        {
          owner: projectSearchOptions.owner,
          repo:  projectSearchOptions.repo,
          branch: branch.name },
        {
          plugin_order: data},
        success);

      function success() {
        $scope.success('Plugin order on branch ' + branch.name + ' saved.');
      }
    }

    // options for the inUse plugin sortable
    $scope.inUseOptions = {
      connectWith: '.disabled-plugins-list',
      distance: 5,
      remove: function (e, ui) {
        updateConfigured();
      },
      receive: function (e, ui) {
        updateConfigured();
        var plugins = $scope.branch.plugins;
        plugins[ui.item.index()].enabled = true;
      }
    };

    function initBranch(branch) {
      var plugins;

      $scope.configured[branch.name] = {};
      $scope.configs[branch.name] = {};
      $scope.runnerConfigs[branch.name] = {};
      $scope.disabled_plugins[branch.name] = [];

      if (!branch.mirror_master) {
        plugins = branch.plugins;
        for (var i=0; i<plugins.length; i++) {
          $scope.configured[branch.name][plugins[i].id] = true;
          $scope.configs[branch.name][plugins[i].id] = plugins[i];
        }
      }

      for (var plugin in $scope.plugins) {
        if ($scope.configured[branch.name][plugin]) continue;
        $scope.configs[branch.name][plugin] = {
          id: plugin,
          enabled: true,
          config: {}
        };
        $scope.disabled_plugins[branch.name].push($scope.configs[branch.name][plugin]);
      }

      if (!branch.mirror_master) {
        $scope.runnerConfigs[branch.name][branch.runner.id] = branch.runner.config;
      }
      for (var runner in $scope.runners) {
        if (!branch.mirror_master && runner === branch.runner.id) continue;
        $scope.runnerConfigs[branch.name][runner] = {};
      }
    }
    function initPlugins() {
      var branches = $scope.project.branches
      for (var i=0; i<branches.length; i++) {
        initBranch(branches[i]);
      }
    }

    $scope.saveGeneralBranch = function (plugins) {
      var branch = $scope.branch
        , data = {
            active: branch.active,
            privkey: branch.privkey,
            pubkey: branch.pubkey,
            envKeys: branch.envKeys,
            mirror_master: branch.mirror_master,
            deploy_on_green: branch.deploy_on_green,
            runner: branch.runner
          };
      if (plugins) {
        data.plugins = branch.plugins;
      }
      Strider.Config.Branch.save(
        {
          owner: projectSearchOptions.owner,
          repo:  projectSearchOptions.repo,
          branch: branch.name },
        data,
        success);

      function success() {
        $scope.success('General config for branch ' + branch.name + ' saved.');
      }
    };

    $scope.generateKeyPair = function () {
      bootbox.confirm('Really generate a new keypair? This could break things if you have plugins that use the current ones.', function (really) {
        if (!really) return;
        Strider.Keygen.save(
          {
            owner: projectSearchOptions.owner,
            repo:  projectSearchOptions.repo,
            branch: $scope.branch.name },
          {},
          success);

        function success(data) {
          $scope.branch.privkey = data.privkey;
          $scope.branch.pubkey = data.pubkey;
          $scope.success('Generated new ssh keypair');
        }
      });
    };

    initPlugins();

    $scope.gravatar = function (email) {
      if (!email) return '';
      var hash = md5(email.toLowerCase());
      return 'https://secure.gravatar.com/avatar/' + hash + '?d=identicon';
    }

    // todo: pass in name?
    $scope.runnerConfig = function (branch, data, next) {
      if (arguments.length === 2) {
        next = data;
        data = branch;
        branch = $scope.branch;
      }
      var name = $scope.branch.runner.id;
      if (arguments.length < 2) {
        return $scope.runnerConfigs[name];
      }

      Strider.Config.Branch.Runner.save(
        {
          owner: projectSearchOptions.owner,
          repo:  projectSearchOptions.repo,
          branch: 'master' },
        data,
        success);

      function success(data) {
        $scope.success("Runner config saved.");
        $scope.runnerConfigs[name] = data.config;
        next && next(null, data.config);
      }
    };

    $scope.providerConfig = function (data, next) {
      console.log('provider config');
      if (arguments.length === 0) {
        return $scope.project.provider.config;
      }
      Strider.Provider.save(projectSearchOptions, data, success);

      function success() {
        $scope.success("Provider config saved.");
        next && next();
      }
    };

    $scope.pluginConfig = function (name, branch, data, next) {
      if (arguments.length === 3) {
        next = data;
        data = branch;
        branch = $scope.branch;
      }
      if (arguments.length === 1) {
        branch = $scope.branch;
      }
      if (branch.mirror_master) {
        return
      }
      var plugin = $scope.configs[branch.name][name]
      if (arguments.length < 3) {
        return plugin.config;
      }
      if (plugin === null) {
        console.error("pluginConfig called for a plugin that's not configured. " + name, true);
        throw new Error('Plugin not configured: ' + name);
      }

      Strider.Config.Branch.Plugin.save(
        {
          owner:  projectSearchOptions.owner,
          repo:   projectSearchOptions.repo,
          branch: branch.name,
          plugin: name
        },
        data,
        success);

      function success() {
        $scope.success("Config for " + name + " on branch " + branch.name + " saved.");
        $scope.configs[branch.name][name].config = data;
        next(null, data);
      }
    };

    $scope.deleteProject = function () {
      Strider.Repo.delete(projectSearchOptions, success);

      function success() {
        $location.path('/');
      }
    };

    $scope.startTest = function () {
      Strider.Start.save(
        projectSearchOptions,
        {
          branch: $scope.branch.name,
          type: "TEST_ONLY",
          page:"config" },
        success);

      function success() {
        $location.path('/' + $scope.project.name);
      }
    };

    $scope.startDeploy = function () {
      Strider.Start.save(
        projectSearchOptions,
        {
          branch: $scope.branch.name,
          type: "TEST_AND_DEPLOY",
          page:"config" },
        success);

      function success() {
        $location.path('/' + $scope.project.name);
      }
    };

    $scope.saveProject = function () {
      setTimeout(function() {
        Strider.RegularConfig.save(
          projectSearchOptions,
          {
            public: $scope.project.public
          },
          success);
      });


      function success() {
        $scope.success('General config saved.');
      }
    };

  });
}

},{"../app":1,"../lib/md5":22,"./config/_fix_template":4}],4:[function(require,module,exports){
module.exports = fixTemplate;

function fixTemplate(s) {
  return s.
    replace(/\[\[/g, '{{').
    replace(/\]\]/g, '}}');
}
},{}],5:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.CollaboratorsCtrl', ['$scope', 'Strider', CollaboratorsCtrl]);

function CollaboratorsCtrl($scope, Strider) {
  $scope.new_email = '';
  $scope.new_access = 0;
  $scope.collaborators = window.collaborators || [];

  $scope.remove = function (item) {
    item.loading = true;
    $scope.clearMessage();
    Strider.del(
      '/' + $scope.project.name + '/collaborators/',
      {email: item.email},
      success);

    function success() {
      remove($scope.collaborators, item);
      $scope.success(item.email + " is no longer a collaborator on this project.");
    }
  };

  $scope.add = function () {
    var data = {
      email: $scope.new_email,
      access: $scope.new_access || 0,
      gravatar: $scope.gravatar($scope.new_email),
      owner: false
    };

    Strider.post(
      '/' + $scope.project.name + '/collaborators/',
      data,
      success);


    function success(res) {
      $scope.new_access = 0;
      $scope.new_email = '';
      if (res.created) {
        $scope.collaborators.push(data);
      }
      $scope.success(res.message);
    }
  };
}

function remove(ar, item) {
  ar.splice(ar.indexOf(item), 1);
}

},{"../../app":1}],6:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.EnvironmentCtrl', ['$scope', EnvironmentCtrl]);

function EnvironmentCtrl($scope){
  $scope.$watch('configs[branch.name].env.config', function (value) {
    $scope.config = value || {};
  });
  $scope.saving = false;
  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('env', $scope.config, function () {
      $scope.saving = false;
    });
  };
  $scope.del = function (key) {
    delete $scope.config[key];
    $scope.save();
  };
  $scope.add = function () {
    $scope.config[$scope.newkey] = $scope.newvalue;
    $scope.newkey = $scope.newvalue = '';
    $scope.save();
  };
}
},{"../../app":1}],7:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.GithubCtrl', ['$scope', 'Strider', GithubCtrl]);

function GithubCtrl($scope, Strider) {

  $scope.config = $scope.providerConfig();
  $scope.new_username = "";
  $scope.new_level = "tester";
  $scope.config.whitelist = $scope.config.whitelist || [];
  $scope.config.pull_requests = $scope.config.pull_requests || 'none';

  $scope.save = function () {
    $scope.providerConfig($scope.config, function () {});
  };

  $scope.$watch('config.pull_requests', function (value, old) {
    if (!old || value === old) return;
    $scope.providerConfig({
      pull_requests: $scope.config.pull_requests
    });
  });

  $scope.addWebhooks = function () {
    $scope.loadingWebhooks = true;

    Strider.post($scope.api_root + 'github/hook', success);

    function success() {
      console.log('SUCCESS');
      $scope.loadingWebhooks = false;
      $scope.success('Set github webhooks');
    }
  };

  $scope.deleteWebhooks = function () {
    $scope.loadingWebhooks = true;

    Strider.del($scope.api_root + 'github/hook', success);

    function success() {
      $scope.loadingWebhooks = false;
      $scope.success('Removed github webhooks');
    }
  };

  $scope.removeWL = function (user) {
    var idx = $scope.config.whitelist.indexOf(user);
    if (idx === -1) return console.error("tried to remove a whitelist item that didn't exist");
    var whitelist = $scope.config.whitelist.slice();
    whitelist.splice(idx, 1);
    $scope.providerConfig({
      whitelist: whitelist
    }, function () {
      $scope.config.whitelist = whitelist;
    });
  };

  $scope.addWL = function (user) {
    if (!user.name || !user.level) return;
    var whitelist = $scope.config.whitelist.slice();
    whitelist.push(user);
    $scope.providerConfig({
      whitelist: whitelist
    }, function () {
      $scope.config.whitelist = whitelist;
    });
  };

}
},{"../../app":1}],8:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.HerokuController', ['$scope', 'Strider', HerokuCtrl]);

function HerokuCtrl($scope, Strider) {
  $scope.$watch('userConfigs.heroku', function (value) {
    if (!value) return
    $scope.userConfig = value;
    if (!$scope.account && value.accounts && value.accounts.length > 0) {
      $scope.account = value.accounts[0];
    }
  });
  $scope.$watch('configs[branch.name].heroku.config', function (value) {
    $scope.config = value;
    if (value.app && $scope.userConfig.accounts) {
      for (var i=0; i<$scope.userConfig.accounts.length; i++) {
        if ($scope.userConfig.accounts[i].id === value.app.account) {
          $scope.account = $scope.userConfig.accounts[i];
          break;
        }
      }
    }
  });
  $scope.saving = false;
  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('heroku', $scope.config, function () {
      $scope.saving = false;
    });
  };
  $scope.getApps = function () {
    if (!$scope.account) return console.warn('tried to getApps but no account');
    Strider.get('/ext/heroku/apps/' + encodeURIComponent($scope.account.id), success);

    function success (body, req) {
      $scope.account.cache = body;
      $scope.success('Got accounts list for ' + $scope.account.email, true);
    }
  };
}
},{"../../app":1}],9:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.JobController', ['$scope', JobController]);

function JobController($scope) {

  $scope.init = function(name) {
    $scope.$watch('userConfigs["' + name + '"]', function (value) {
      $scope.userConfig = value;
    });
    $scope.$watch('configs[branch.name]["' + name + '"].config', function (value) {
      $scope.config = value;
    });
    $scope.saving = false;
    $scope.save = function () {
      $scope.saving = true;
      $scope.pluginConfig(name, $scope.config, function () {
        $scope.saving = false;
      });
    };
  }
}
},{"../../app":1}],10:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.NodeController', ['$scope', NodeController]);

function NodeController($scope) {
  $scope.$watch('configs[branch.name].node.config', function (value) {
    $scope.config = value;
  });
  $scope.saving = false;
  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('node', $scope.config, function () {
      $scope.saving = false;
    });
  };
  $scope.removeGlobal = function (index) {
    $scope.config.globals.splice(index, 1);
    $scope.save();
  };
  $scope.addGlobal = function () {
    if (!$scope.config.globals) $scope.config.globals = [];
    $scope.config.globals.push($scope.new_package);
    $scope.new_package = '';
    $scope.save();
  };
}
},{"../../app":1}],11:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.RunnerController', ['$scope', RunnerController]);

function RunnerController($scope) {

  $scope.init = function(name) {
    $scope.saving = false;
    $scope.$watch('runnerConfigs[branch.name]["' + name + '"]', function (value) {
      console.log('Runner config', name, value, $scope.runnerConfigs);
      $scope.config = value;
    });
  };

  $scope.save = function () {
    $scope.saving = true;
    $scope.runnerConfig($scope.config, function () {
      $scope.saving = false;
    });
  };

}
},{"../../app":1}],12:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.SauceCtrl', ['$scope', SauceCtrl]);

function SauceCtrl($scope) {

  $scope.$watch('configs[branch.name].sauce.config', function (value) {
    $scope.config = value;
    if (!value) return;
    $scope.browser_map = {};
    if (!value.browsers) {
      value.browsers = [];
    }
    for (var i=0; i<value.browsers.length; i++) {
      $scope.browser_map[serializeName(value.browsers[i])] = true;
    }
  });
  $scope.completeName = completeName;
  $scope.operatingsystems = organize(browsers || []);
  $scope.save = function () {
    $scope.config.browsers = [];
    for (var name in $scope.browser_map) {
      if ($scope.browser_map[name]) {
        $scope.config.browsers.push(parseName(name));
      }
    }
    $scope.pluginConfig('sauce', $scope.config, function () {
    });
  };
  $scope.clear = function () {
    $scope.browser_map = {};
    $scope.$digest();
  };
}

function organize(browsers) {
  var oss = {};
  for (var i=0; i<browsers.length; i++) {
    if (!oss[browsers[i].os]) {
      oss[browsers[i].os] = {};
    }
    if (!oss[browsers[i].os][browsers[i].long_name]) {
      oss[browsers[i].os][browsers[i].long_name] = [];
    }
    oss[browsers[i].os][browsers[i].long_name].push(browsers[i]);
    browsers[i].complete_name = completeName(browsers[i]);
  }
  return oss;
}

function completeName(version) {
  return version.os + '-' + version.api_name + '-' + version.short_version;
}

function parseName(name) {
  var parts = name.split('-');
  return {
    platform: parts[0],
    browserName: parts[1],
    version: parts[2] || ''
  };
}

function serializeName(browser) {
  return browser.platform + '-' + browser.browserName + '-' + browser.version;
}
},{"../../app":1}],13:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.WebhooksCtrl', ['$scope', WebhooksCtrl]);

function WebhooksCtrl($scope) {

  function remove(ar, item) {
    ar.splice(ar.indexOf(item), 1);
  }

  $scope.hooks = $scope.pluginConfig('webhooks') || [];
  if (!Array.isArray($scope.hooks)) $scope.hooks = [];
  if (!$scope.hooks.length) $scope.hooks.push({});

  $scope.remove = function (hook) {
    $scope.saving = true;
    $scope.pluginConfig('webhooks', $scope.hooks, function (err) {
      $scope.saving = false;
      if (!err) remove($scope.hooks, hook);
      if (!$scope.hooks.length) $scope.hooks.push({});
    });
  };

  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('webhooks', $scope.hooks, function (err) {
      $scope.saving = false;
    });
  };

  $scope.add = function () {
    $scope.hooks.push({});
  };
}
},{"../../app":1}],14:[function(require,module,exports){
var App = require('../app');

App.controller('DashboardCtrl', ['$scope', '$location', 'Strider', DashboardCtrl]);

function DashboardCtrl($scope, $location, Strider) {

  // TODO: make this more declarative:
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
},{"../app":1}],15:[function(require,module,exports){
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
},{"../app":1}],16:[function(require,module,exports){
var App = require('../app');

App.controller('JobCtrl', ['$scope', '$routeParams', '$sce', '$filter', '$location', '$route', 'Strider', JobCtrl]);

function JobCtrl($scope, $routeParams, $sce, $filter, $location, $route, Strider) {


  var outputConsole = document.querySelector('.console-output');

  $scope.phases = Strider.phases;
  $scope.page = 'build';

  var jobid = $routeParams.jobid;
  console.log('jobid:', jobid);
  var searchOptions = {
    owner: $routeParams.owner,
    repo:  $routeParams.repo
  };

  Strider.Repo.get(searchOptions, function(repo) {
    $scope.project = repo.project
    if (! jobid) $scope.job  = repo.job;
    $scope.jobs = repo.jobs;

    if ($scope.job && $scope.job.phases.test.commands.length) {
      if ($scope.job.phases.environment) {
        $scope.job.phases.environment.collapsed = true;
      }
      if ($scope.job.phases.prepare) {
        $scope.job.phases.prepare.collapsed = true;
      }
      if ($scope.job.phases.cleanup) {
        $scope.job.phases.cleanup.collapsed = true;
      }
    }

    // Object.keys($scope.job.phases).forEach(function(phaseKey) {
    //   var phase = $scope.job.phases[phaseKey];
    //   Object.keys(phase.commands).forEach(function(commandKey) {
    //     var command = phase.commands[commandKey];
    //     command.merged = $sce.trustAsHtml(command.merged);
    //   })
    // });
  });

  if (jobid) {
    Strider.Job.get({
      owner: $routeParams.owner,
      repo:  $routeParams.repo,
      jobid: jobid
    }, function(job) {
      $scope.job = job;
    });
  }

  Strider.StatusBlocks.get(function(statusBlocks) {
    $scope.statusBlocks = statusBlocks;
    ['runner', 'provider', 'job'].forEach(function(key) {
      fixBlocks(statusBlocks, key);
    });
  });

  Strider.connect($scope);

  Strider.Session.get(function(user) {
    if (user.user) $scope.currentUser = user;
  });

  /// Scope functions

  $scope.clearCache = function clearCache() {
    $scope.clearingCache = true;
    Strider.Cache.delete( searchOptions, success);

    function success() {
      $scope.clearingCache = false;
      $scope.$digest();
    }
  }

  // var lastRoute;

  // $scope.$on('$locationChangeSuccess', function(event) {
  //   if (window.location.pathname.match(/\/config$/)) {
  //     window.location = window.location;
  //     return;
  //   }
  //   params = $routeParams;
  //   if (!params.id) params.id = $scope.jobs[0]._id;
  //   // don't refresh the page
  //   $route.current = lastRoute;
  //   if (jobid !== params.id) {
  //     jobid = params.id;
  //     var cached = jobman.get(jobid, function (err, job, cached) {
  //       if (job.phases.environment) {
  //         job.phases.environment.collapsed = true;
  //       }
  //       if (job.phases.prepare) {
  //         job.phases.prepare.collapsed = true;
  //       }
  //       if (job.phases.cleanup) {
  //         job.phases.cleanup.collapsed = true;
  //       }
  //       $scope.job = job;
  //       if ($scope.job.phases.test.commands.length) {
  //         $scope.job.phases.environment.collapsed = true;
  //         $scope.job.phases.prepare.collapsed = true;
  //         $scope.job.phases.cleanup.collapsed = true;
  //       }
  //       if (!cached) $scope.$digest();
  //     });
  //     if (!cached) {
  //       for (var i=0; i<$scope.jobs.length; i++) {
  //         if ($scope.jobs[i]._id === jobid) {
  //           $scope.job = $scope.jobs[i];
  //           break;
  //         }
  //       }
  //     }
  //   }
  // });

  $scope.triggers = {
    commit: {
      icon: 'code-fork',
      title: 'Commit'
    },
    manual: {
      icon: 'hand-right',
      title: 'Manual'
    },
    plugin: {
      icon: 'puzzle-piece',
      title: 'Plugin'
    },
    api: {
      icon: 'cloud',
      title: 'Cloud'
    }
  };

  $scope.selectJob = function (id) {
    $location.path(
      '/' + encodeURIComponent(searchOptions.owner) +
      '/' + encodeURIComponent(searchOptions.repo) +
      '/job/' + encodeURIComponent(id));
  };

  $scope.$watch('job.status', function (value) {
    updateFavicon(value);
  });

  $scope.$watch('job.std.merged_latest', function (value) {
    /* Tracking isn't quite working right
    if ($scope.job.status === 'running') {
      height = outputConsole.getBoundingClientRect().height;
      tracking = height + outputConsole.scrollTop > outputConsole.scrollHeight - 50;
      // console.log(tracking, height, outputConsole.scrollTop, outputConsole.scrollHeight);
      if (!tracking) return;
    }
    */
    var ansiFilter = $filter('ansi')
    $('.job-output').last().append(ansiFilter(value))
    outputConsole.scrollTop = outputConsole.scrollHeight;
    setTimeout(function () {
      outputConsole.scrollTop = outputConsole.scrollHeight;
    }, 10);
  });

  // button handlers
  $scope.startDeploy = function (job) {
    $('.tooltip').hide();
    Strider.deploy(job.project);
    $scope.job = {
      project: $scope.job.project,
      status: 'submitted'
    };
  };
  $scope.startTest = function (job) {
    $('.tooltip').hide();
    Strider.deploy(job.project);
    $scope.job = {
      project: $scope.job.project,
      status: 'submitted'
    };
  };


  function fixBlocks(object, key) {
    var blocks = object[key];
    if (! blocks) return;
    Object.keys(blocks).forEach(function(provider) {
      var block = blocks[provider];
      block.attrs_html = Object.keys(block.attrs).map(function(attr) {
        return attr + '=' + block.attrs[attr];
      }).join(' ');

      block.html = $sce.trustAsHtml(block.html);

    });
  }
}


/** manage the favicons **/
function setFavicon(status) {
  $('link[rel*="icon"]').attr('href', '/images/icons/favicon-' + status + '.png');
}

function animateFav() {
  var alt = false;
  function switchit() {
    setFavicon('running' + (alt ? '-alt' : ''));
    alt = !alt;
  }
  return setInterval(switchit, 500);
}

var runtime = null;
function updateFavicon(value) {
  if (value === 'running') {
    if (runtime === null) {
      runtime = animateFav();
    }
  } else {
    if (runtime !== null) {
      clearInterval(runtime);
      runtime = null;
    }
    setFavicon(value);
  }
}

function buildSwitcher($scope) {
  function switchBuilds(evt) {
    var dy = {40: 1, 38: -1}[evt.keyCode]
      , id = $scope.job._id
      , idx;
    if (!dy) return;
    for (var i=0; i<$scope.jobs.length; i++) {
      if ($scope.jobs[i]._id === id) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      console.log('Failed to find job.');
      return window.location = window.location
    }
    idx += dy;
    if (idx < 0 || idx >= $scope.jobs.length) {
      return;
    }
    evt.preventDefault();
    $scope.selectJob($scope.jobs[idx]._id);
    $scope.$root.$digest();
  }
  document.addEventListener('keydown', switchBuilds);
}

},{"../app":1}],17:[function(require,module,exports){
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
},{"../app":1}],18:[function(require,module,exports){
var App = require('../app');

App.directive('dynamicController', dynamicController);

function dynamicController($compile, $controller) {
  return {
    restrict: 'A',
    terminal: true,
    link: function(scope, elm, attrs) {
      var lastScope;
      scope.$watch(attrs.dynamicController, function(ctrlName) {
        if (! ctrlName) return;

        var newScope = scope.$new();

        var ctrl;
        try {
          ctrl = $controller(ctrlName, {$scope: newScope});
        } catch (_err) {
          // not found
          return;
        }


        if (lastScope) lastScope.$destroy();

        elm.contents().data('$ngControllerController', ctrl);
        $compile(elm.contents())(newScope);

        lastScope = newScope;
      });
    }
  }
};
},{"../app":1}],19:[function(require,module,exports){
var app = require('../app');

app.filter('ansi', ['$sce', function ($sce) {
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
    return $sce.trustAsHtml(ansifilter(text));
  }
}]);

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


},{"../app":1}],20:[function(require,module,exports){
module.exports = ['$rootScope', '$q', function($scope, $q) {

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
},{}],21:[function(require,module,exports){
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
},{"xtend":25}],22:[function(require,module,exports){
function md5cycle(x, k) {
var a = x[0], b = x[1], c = x[2], d = x[3];

a = ff(a, b, c, d, k[0], 7, -680876936);
d = ff(d, a, b, c, k[1], 12, -389564586);
c = ff(c, d, a, b, k[2], 17,  606105819);
b = ff(b, c, d, a, k[3], 22, -1044525330);
a = ff(a, b, c, d, k[4], 7, -176418897);
d = ff(d, a, b, c, k[5], 12,  1200080426);
c = ff(c, d, a, b, k[6], 17, -1473231341);
b = ff(b, c, d, a, k[7], 22, -45705983);
a = ff(a, b, c, d, k[8], 7,  1770035416);
d = ff(d, a, b, c, k[9], 12, -1958414417);
c = ff(c, d, a, b, k[10], 17, -42063);
b = ff(b, c, d, a, k[11], 22, -1990404162);
a = ff(a, b, c, d, k[12], 7,  1804603682);
d = ff(d, a, b, c, k[13], 12, -40341101);
c = ff(c, d, a, b, k[14], 17, -1502002290);
b = ff(b, c, d, a, k[15], 22,  1236535329);

a = gg(a, b, c, d, k[1], 5, -165796510);
d = gg(d, a, b, c, k[6], 9, -1069501632);
c = gg(c, d, a, b, k[11], 14,  643717713);
b = gg(b, c, d, a, k[0], 20, -373897302);
a = gg(a, b, c, d, k[5], 5, -701558691);
d = gg(d, a, b, c, k[10], 9,  38016083);
c = gg(c, d, a, b, k[15], 14, -660478335);
b = gg(b, c, d, a, k[4], 20, -405537848);
a = gg(a, b, c, d, k[9], 5,  568446438);
d = gg(d, a, b, c, k[14], 9, -1019803690);
c = gg(c, d, a, b, k[3], 14, -187363961);
b = gg(b, c, d, a, k[8], 20,  1163531501);
a = gg(a, b, c, d, k[13], 5, -1444681467);
d = gg(d, a, b, c, k[2], 9, -51403784);
c = gg(c, d, a, b, k[7], 14,  1735328473);
b = gg(b, c, d, a, k[12], 20, -1926607734);

a = hh(a, b, c, d, k[5], 4, -378558);
d = hh(d, a, b, c, k[8], 11, -2022574463);
c = hh(c, d, a, b, k[11], 16,  1839030562);
b = hh(b, c, d, a, k[14], 23, -35309556);
a = hh(a, b, c, d, k[1], 4, -1530992060);
d = hh(d, a, b, c, k[4], 11,  1272893353);
c = hh(c, d, a, b, k[7], 16, -155497632);
b = hh(b, c, d, a, k[10], 23, -1094730640);
a = hh(a, b, c, d, k[13], 4,  681279174);
d = hh(d, a, b, c, k[0], 11, -358537222);
c = hh(c, d, a, b, k[3], 16, -722521979);
b = hh(b, c, d, a, k[6], 23,  76029189);
a = hh(a, b, c, d, k[9], 4, -640364487);
d = hh(d, a, b, c, k[12], 11, -421815835);
c = hh(c, d, a, b, k[15], 16,  530742520);
b = hh(b, c, d, a, k[2], 23, -995338651);

a = ii(a, b, c, d, k[0], 6, -198630844);
d = ii(d, a, b, c, k[7], 10,  1126891415);
c = ii(c, d, a, b, k[14], 15, -1416354905);
b = ii(b, c, d, a, k[5], 21, -57434055);
a = ii(a, b, c, d, k[12], 6,  1700485571);
d = ii(d, a, b, c, k[3], 10, -1894986606);
c = ii(c, d, a, b, k[10], 15, -1051523);
b = ii(b, c, d, a, k[1], 21, -2054922799);
a = ii(a, b, c, d, k[8], 6,  1873313359);
d = ii(d, a, b, c, k[15], 10, -30611744);
c = ii(c, d, a, b, k[6], 15, -1560198380);
b = ii(b, c, d, a, k[13], 21,  1309151649);
a = ii(a, b, c, d, k[4], 6, -145523070);
d = ii(d, a, b, c, k[11], 10, -1120210379);
c = ii(c, d, a, b, k[2], 15,  718787259);
b = ii(b, c, d, a, k[9], 21, -343485551);

x[0] = add32(a, x[0]);
x[1] = add32(b, x[1]);
x[2] = add32(c, x[2]);
x[3] = add32(d, x[3]);

}

function cmn(q, a, b, x, s, t) {
a = add32(add32(a, q), add32(x, t));
return add32((a << s) | (a >>> (32 - s)), b);
}

function ff(a, b, c, d, x, s, t) {
return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function md51(s) {
txt = '';
var n = s.length,
state = [1732584193, -271733879, -1732584194, 271733878], i;
for (i=64; i<=s.length; i+=64) {
md5cycle(state, md5blk(s.substring(i-64, i)));
}
s = s.substring(i-64);
var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
for (i=0; i<s.length; i++)
tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
tail[i>>2] |= 0x80 << ((i%4) << 3);
if (i > 55) {
md5cycle(state, tail);
for (i=0; i<16; i++) tail[i] = 0;
}
tail[14] = n*8;
md5cycle(state, tail);
return state;
}

/* there needs to be support for Unicode here,
 * unless we pretend that we can redefine the MD-5
 * algorithm for multi-byte characters (perhaps
 * by adding every four 16-bit characters and
 * shortening the sum to 32 bits). Otherwise
 * I suggest performing MD-5 as if every character
 * was two bytes--e.g., 0040 0025 = @%--but then
 * how will an ordinary MD-5 sum be matched?
 * There is no way to standardize text to something
 * like UTF-8 before transformation; speed cost is
 * utterly prohibitive. The JavaScript standard
 * itself needs to look at this: it should start
 * providing access to strings as preformed UTF-8
 * 8-bit unsigned value arrays.
 */
function md5blk(s) { /* I figured global was faster.   */
var md5blks = [], i; /* Andy King said do it this way. */
for (i=0; i<64; i+=4) {
md5blks[i>>2] = s.charCodeAt(i)
+ (s.charCodeAt(i+1) << 8)
+ (s.charCodeAt(i+2) << 16)
+ (s.charCodeAt(i+3) << 24);
}
return md5blks;
}

var hex_chr = '0123456789abcdef'.split('');

function rhex(n)
{
var s='', j=0;
for(; j<4; j++)
s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
+ hex_chr[(n >> (j * 8)) & 0x0F];
return s;
}

function hex(x) {
for (var i=0; i<x.length; i++)
x[i] = rhex(x[i]);
return x.join('');
}

function md5(s) {
return hex(md51(s));
}

/* this function is much faster,
so if possible we use it. Some IEs
are the only ones I know of that
need the idiotic second function,
generated by an if clause.  */

function add32(a, b) {
return (a + b) & 0xFFFFFFFF;
}

if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
function add32(x, y) {
var lsw = (x & 0xFFFF) + (y & 0xFFFF),
msw = (x >> 16) + (y >> 16) + (lsw >> 16);
return (msw << 16) | (lsw & 0xFFFF);
}
}


module.exports = md5;
},{}],23:[function(require,module,exports){
var JobStore = require('./job_store');
var jobStore = JobStore();

exports = module.exports = BuildStrider;

function BuildStrider($resource, $http) {
  return new Strider($resource, $http);
}


var socket;
var scopes = [];

function Strider($resource, $http, opts) {
  if (! opts) opts = {};
  if (typeof opts == 'string')
    opts = { url: opts };

  this.url = opts.url || '//localhost:3000';

  /// RESTful API setup
  var apiBase  = this.url + '/api';
  var loginURL = this.url + '/login';
  this.Session = $resource(apiBase + '/session/');
  this.Repo    = $resource(apiBase + '/:owner/:repo/');
  this.Job     = $resource(apiBase + '/:owner/:repo/job/:jobid');
  this.Config  = $resource(apiBase + '/:owner/:repo/config', {}, {
    get: {
      method: 'GET'
    },
    save: {
      method: 'PUT'
    }
  });
  this.RegularConfig  = $resource(this.url + '/:owner/:repo/config', {}, {
    save: {
      method: 'PUT'
    }
  });
  this.Config.Branch = $resource(this.url + '/:owner/:repo/config/:branch\\/', {}, {
    save: {
      method: 'PUT'
    }
  });
  this.Config.Branch.Runner = $resource(this.url + '/:owner/:repo/config/:branch/runner', {}, {
    save: {
      method: 'PUT'
    }
  });
  this.Config.Branch.Plugin  = $resource(this.url + '/:owner/:repo/config/:branch/:plugin', {}, {
    save: {
      method: 'PUT'
    }
  });
  this.Provider = $resource(this.url + '/:owner/:repo/provider');
  this.Cache  = $resource(this.url + '/:owner/:repo/cache');
  this.Start = $resource(this.url + '/:owner/:repo/start');
  this.Keygen = $resource(this.url + '/:owner/:repo/keygen/:branch\\/');

  this.StatusBlocks = $resource(this.url + '/statusBlocks', {}, {
    get: {
      method: 'GET'
    }
  });

  this.jobs    = jobStore.jobs;
  this.phases  = JobStore.phases;

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


/// HTTP

S.post = function(url, body, cb) {
  return this.request('POST', url, body, cb);
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
},{"./job_store":21}],24:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],25:[function(require,module,exports){
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

},{"./has-keys":24,"object-keys":27}],26:[function(require,module,exports){
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


},{}],27:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":29}],28:[function(require,module,exports){
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


},{}],29:[function(require,module,exports){
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


},{"./foreach":26,"./isArguments":28}]},{},[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,19,18])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2FwcC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvYWxlcnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2NvbmZpZy9fZml4X3RlbXBsYXRlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvY29sbGFib3JhdG9ycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL2Vudmlyb25tZW50LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvZ2l0aHViLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvaGVyb2t1LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvam9iLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvbm9kZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3J1bm5lci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3NhdWNlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvd2ViaG9va3MuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2Rhc2hib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvZXJyb3IuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2pvYi5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvbG9naW4uanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2RpcmVjdGl2ZXMvZHluYW1pY19jb250cm9sbGVyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9maWx0ZXJzL2Fuc2kuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2h0dHBfaW50ZXJjZXB0b3IuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2pvYl9zdG9yZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvbGliL21kNS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvc3RyaWRlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvaGFzLWtleXMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL2luZGV4LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvZm9yZWFjaC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2luZGV4LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvaXNBcmd1bWVudHMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9zaGltLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgU3RyaWRlciA9IHJlcXVpcmUoJy4vc3RyaWRlcicpO1xuXG52YXIgQXBwID1cbmV4cG9ydHMgPVxubW9kdWxlLmV4cG9ydHMgPVxuYW5ndWxhci5tb2R1bGUoJ0Jyb3dzZXJTd2FybUFwcCcsIFsnbmdSb3V0ZScsICduZ1Jlc291cmNlJywgJ25nU2FuaXRpemUnXSk7XG5cbi8vLyBBcHAgQ29uZmlndXJhdGlvblxuXG5BcHAuXG4gIGNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgJyRsb2NhdGlvblByb3ZpZGVyJywgJyRodHRwUHJvdmlkZXInLCBjb25maWd1cmVBcHBdKS5cbiAgZmFjdG9yeSgnU3RyaWRlcicsIFsnJHJlc291cmNlJywgJyRodHRwJywgU3RyaWRlcl0pO1xuXG5mdW5jdGlvbiBjb25maWd1cmVBcHAoJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyKSB7XG5cbiAgLy8vIEhUVFBcblxuICAvLy8gQWx3YXlzIGRvIEhUVFAgcmVxdWVzdHMgd2l0aCBjcmVkZW50aWFscyxcbiAgLy8vIGVmZmVjdGl2ZWx5IHNlbmRpbmcgb3V0IHRoZSBzZXNzaW9uIGNvb2tpZVxuICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgdmFyIGludGVyY2VwdG9yID0gcmVxdWlyZSgnLi9odHRwX2ludGVyY2VwdG9yJyk7XG5cbiAgJGh0dHBQcm92aWRlci5yZXNwb25zZUludGVyY2VwdG9ycy5wdXNoKGludGVyY2VwdG9yKTtcblxuXG4gIC8vLyBFbmFibGUgaGFzaGJhbmctbGVzcyByb3V0ZXNcblxuICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG5cbiAgLy8vIFJvdXRlc1xuXG4gICRyb3V0ZVByb3ZpZGVyLlxuICAgIHdoZW4oJy9kYXNoYm9hcmQnLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9wYXJ0aWFscy9kYXNoYm9hcmQuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiAnRGFzaGJvYXJkQ3RybCdcbiAgICB9KS5cbiAgICB3aGVuKCcvbG9naW4nLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9wYXJ0aWFscy9sb2dpbi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSkuXG4gICAgd2hlbignLzpvd25lci86cmVwby9jb25maWcnLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9wYXJ0aWFscy9jb25maWcvaW5kZXguaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiAnQ29uZmlnQ3RybCcsXG4gICAgICByZWxvYWRPblNlYXJjaDogZmFsc2VcbiAgICB9KS5cbiAgICB3aGVuKCcvOm93bmVyLzpyZXBvJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvam9iLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0pvYkN0cmwnXG4gICAgfSkuXG4gICAgd2hlbignLzpvd25lci86cmVwby9qb2IvOmpvYmlkJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvam9iLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0pvYkN0cmwnXG4gICAgfSk7XG5cbn1cbiIsIlxudmFyIGFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5hcHAuY29udHJvbGxlcignQWxlcnRzQ3RybCcsIFsnJHNjb3BlJywgJyRzY2UnLCBmdW5jdGlvbiAoJHNjb3BlLCAkc2NlKSB7XG4gICRzY29wZS5tZXNzYWdlID0gbnVsbDtcblxuICAkc2NvcGUuZXJyb3IgPSBmdW5jdGlvbiAodGV4dCwgZGlnZXN0KSB7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSB7XG4gICAgICB0ZXh0OiAkc2NlLnRydXN0QXNIdG1sKHRleHQpLFxuICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIHNob3dpbmc6IHRydWVcbiAgICB9O1xuICAgIGlmIChkaWdlc3QpICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gIH07XG5cbiAgJHNjb3BlLmluZm8gPSBmdW5jdGlvbiAodGV4dCwgZGlnZXN0KSB7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSB7XG4gICAgICB0ZXh0OiAkc2NlLnRydXN0QXNIdG1sKHRleHQpLFxuICAgICAgdHlwZTogJ2luZm8nLFxuICAgICAgc2hvd2luZzogdHJ1ZVxuICAgIH07XG4gICAgaWYgKGRpZ2VzdCkgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgfTtcbiAgdmFyIHdhaXRUaW1lID0gbnVsbDtcblxuICAkc2NvcGUuc3VjY2VzcyA9IGZ1bmN0aW9uICh0ZXh0LCBkaWdlc3QsIHN0aWNreSkge1xuICAgIGlmICh3YWl0VGltZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KHdhaXRUaW1lKTtcbiAgICAgIHdhaXRUaW1lID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKGNsZWFyVGltZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KGNsZWFyVGltZSk7XG4gICAgICBjbGVhclRpbWUgPSBudWxsO1xuICAgIH1cbiAgICAkc2NvcGUubWVzc2FnZSA9IHtcbiAgICAgIHRleHQ6ICRzY2UudHJ1c3RBc0h0bWwoJzxzdHJvbmc+RG9uZS48L3N0cm9uZz4gJyArIHRleHQpLFxuICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgc2hvd2luZzogdHJ1ZVxuICAgIH07XG4gICAgaWYgKCFzdGlja3kpIHtcbiAgICAgIHdhaXRUaW1lID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5jbGVhck1lc3NhZ2UoKTtcbiAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgIH0sIDUwMDApO1xuICAgIH1cbiAgICBpZiAoZGlnZXN0KSAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICB9O1xuICB2YXIgY2xlYXJUaW1lID0gbnVsbDtcblxuICAkc2NvcGUuY2xlYXJNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjbGVhclRpbWUpIHtcbiAgICAgIGNsZWFyVGltZW91dChjbGVhclRpbWUpO1xuICAgIH1cbiAgICBpZiAoJHNjb3BlLm1lc3NhZ2UpIHtcbiAgICAgICRzY29wZS5tZXNzYWdlLnNob3dpbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgY2xlYXJUaW1lID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBjbGVhclRpbWUgPSBudWxsO1xuICAgICAgJHNjb3BlLm1lc3NhZ2UgPSBudWxsO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9LCAxMDAwKTtcbiAgfTtcbn1dKTtcbiIsInZhciBtZDUgICAgICAgICA9IHJlcXVpcmUoJy4uL2xpYi9tZDUnKTtcbnZhciBBcHAgICAgICAgICA9IHJlcXVpcmUoJy4uL2FwcCcpO1xudmFyIGZpeFRlbXBsYXRlID0gcmVxdWlyZSgnLi9jb25maWcvX2ZpeF90ZW1wbGF0ZScpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnQ3RybCcsIFsnJHNjb3BlJywgJyRyb3V0ZVBhcmFtcycsICckc2NlJywgJyRsb2NhdGlvbicsICdTdHJpZGVyJywgQ29uZmlnQ3RybF0pO1xuXG5mdW5jdGlvbiBDb25maWdDdHJsKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkc2NlLCAkbG9jYXRpb24sIFN0cmlkZXIpIHtcblxuICB2YXIgcHJvamVjdFNlYXJjaE9wdGlvbnMgPSB7XG4gICAgb3duZXI6ICRyb3V0ZVBhcmFtcy5vd25lcixcbiAgICByZXBvOiAkcm91dGVQYXJhbXMucmVwb1xuICB9O1xuXG4gIFN0cmlkZXIuQ29uZmlnLmdldChwcm9qZWN0U2VhcmNoT3B0aW9ucywgZnVuY3Rpb24oY29uZikge1xuXG4gICAgLy8vIEZpeCBhbmQgdHJ1c3QgcmVtb3RlIEhUTUxcblxuICAgIE9iamVjdC5rZXlzKGNvbmYucGx1Z2lucykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGNvbmYucGx1Z2luc1trZXldLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKFxuICAgICAgICBmaXhUZW1wbGF0ZShjb25mLnBsdWdpbnNba2V5XS5odG1sKSk7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhjb25mLnJ1bm5lcnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBjb25mLnJ1bm5lcnNba2V5XS5odG1sID0gJHNjZS50cnVzdEFzSHRtbChcbiAgICAgICAgZml4VGVtcGxhdGUoY29uZi5ydW5uZXJzW2tleV0uaHRtbCkpO1xuICAgIH0pO1xuXG4gICAgaWYgKGNvbmYucHJvdmlkZXIpIHtcbiAgICAgIGNvbmYucHJvdmlkZXIuaHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwoXG4gICAgICAgIGZpeFRlbXBsYXRlKGNvbmYucHJvdmlkZXIuaHRtbCkpO1xuICAgIH1cblxuICAgIC8vLyBHZXQgYWxsIHRoZSBjb25mIGludG8gdGhlIHNjb3BlIGZvciByZW5kZXJpbmdcblxuICAgICRzY29wZS5wcm9qZWN0ID0gY29uZi5wcm9qZWN0O1xuICAgICRzY29wZS5wcm92aWRlciA9IGNvbmYucHJvdmlkZXI7XG4gICAgJHNjb3BlLnBsdWdpbnMgPSBjb25mLnBsdWdpbnM7XG4gICAgJHNjb3BlLnJ1bm5lcnMgPSBjb25mLnJ1bm5lcnM7XG4gICAgJHNjb3BlLmJyYW5jaGVzID0gY29uZi5icmFuY2hlcyB8fCBbXTtcbiAgICAkc2NvcGUuc3RhdHVzQmxvY2tzID0gY29uZi5zdGF0dXNCbG9ja3M7XG4gICAgJHNjb3BlLmNvbGxhYm9yYXRvcnMgPSBjb25mLmNvbGxhYm9yYXRvcnM7XG4gICAgJHNjb3BlLnVzZXJJc0NyZWF0b3IgPSBjb25mLnVzZXJJc0NyZWF0b3I7XG4gICAgJHNjb3BlLnVzZXJDb25maWdzID0gY29uZi51c2VyQ29uZmlncztcbiAgICAkc2NvcGUuY29uZmlndXJlZCA9IHt9O1xuXG4gICAgJHNjb3BlLmJyYW5jaCA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzWzBdO1xuICAgICRzY29wZS5kaXNhYmxlZF9wbHVnaW5zID0ge307XG4gICAgJHNjb3BlLmNvbmZpZ3MgPSB7fTtcbiAgICAkc2NvcGUucnVubmVyQ29uZmlncyA9IHt9O1xuXG4gICAgJHNjb3BlLmFwaV9yb290ID0gJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvYXBpLyc7XG5cbiAgICAkc2NvcGUucmVmcmVzaEJyYW5jaGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gVE9ETyBpbXBsZW1lbnRcbiAgICAgIHRocm93IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEVuYWJsZWQgPSBmdW5jdGlvbiAocGx1Z2luLCBlbmFibGVkKSB7XG4gICAgICAkc2NvcGUuY29uZmlnc1skc2NvcGUuYnJhbmNoLm5hbWVdW3BsdWdpbl0uZW5hYmxlZCA9IGVuYWJsZWQ7XG4gICAgICBzYXZlUGx1Z2luT3JkZXIoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmVQbHVnaW5PcmRlciA9IHNhdmVQbHVnaW5PcmRlcjtcblxuICAgICRzY29wZS5zd2l0Y2hUb01hc3RlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUucHJvamVjdC5icmFuY2hlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV0ubmFtZSA9PT0gJ21hc3RlcicpIHtcbiAgICAgICAgICAkc2NvcGUuYnJhbmNoID0gJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV07XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jbGVhckNhY2hlID0gZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLmNsZWFyaW5nQ2FjaGUgPSB0cnVlO1xuICAgICAgU3RyaWRlci5DYWNoZS5kZWxldGUoc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5jbGVhcmluZ0NhY2hlID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdDbGVhcmVkIHRoZSBjYWNoZScpO1xuICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS50b2dnbGVCcmFuY2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJHNjb3BlLmJyYW5jaC5taXJyb3JfbWFzdGVyKSB7XG4gICAgICAgICRzY29wZS5icmFuY2gubWlycm9yX21hc3RlciA9IGZhbHNlO1xuICAgICAgICB2YXIgbmFtZSA9ICRzY29wZS5icmFuY2gubmFtZVxuICAgICAgICAgICwgbWFzdGVyO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLnByb2plY3QuYnJhbmNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV0ubmFtZSA9PT0gJ21hc3RlcicpIHtcbiAgICAgICAgICAgIG1hc3RlciA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmFuY2ggPSAkLmV4dGVuZCh0cnVlLCAkc2NvcGUuYnJhbmNoLCBtYXN0ZXIpO1xuICAgICAgICAkc2NvcGUuYnJhbmNoLm5hbWUgPSBuYW1lO1xuICAgICAgICBpbml0QnJhbmNoKCRzY29wZS5icmFuY2gpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaC5taXJyb3JfbWFzdGVyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zYXZlR2VuZXJhbEJyYW5jaCh0cnVlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYnJhbmNoLm1pcnJvcl9tYXN0ZXInLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdGFiID0gdmFsdWUgJiYgdmFsdWUubmFtZSA9PT0gJ21hc3RlcicgPyAncHJvamVjdCcgOiAnYmFzaWMnO1xuICAgICAgICAkKCcjJyArIHRhYiArICctdGFiLWhhbmRsZScpLnRhYignc2hvdycpO1xuICAgICAgICAkKCcudGFiLXBhbmUuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjdGFiLScgKyB0YWIpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgIH0sIDApO1xuICAgIH0pO1xuICAgICRzY29wZS4kd2F0Y2goJ2JyYW5jaCcsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0YWIgPSB2YWx1ZSAmJiB2YWx1ZS5uYW1lID09PSAnbWFzdGVyJyA/ICdwcm9qZWN0JyA6ICdiYXNpYyc7XG4gICAgICAgICQoJyMnICsgdGFiICsgJy10YWItaGFuZGxlJykudGFiKCdzaG93Jyk7XG4gICAgICAgICQoJy50YWItcGFuZS5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyN0YWItJyArIHRhYikuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgfSwgMCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UnVubmVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICRzY29wZS5icmFuY2gucnVubmVyID0ge1xuICAgICAgICBpZDogbmFtZSxcbiAgICAgICAgY29uZmlnOiAkc2NvcGUucnVubmVyQ29uZmlnc1tuYW1lXVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQ29uZmlndXJlZCgpIHtcbiAgICAgIHZhciBwbHVnaW5zID0gJHNjb3BlLmJyYW5jaC5wbHVnaW5zO1xuICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbJHNjb3BlLmJyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgZm9yICh2YXIgaT0wOyBpPHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbJHNjb3BlLmJyYW5jaC5uYW1lXVtwbHVnaW5zW2ldLmlkXSA9IHRydWU7XG4gICAgICB9XG4gICAgICBzYXZlUGx1Z2luT3JkZXIoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlUGx1Z2luT3JkZXIoKSB7XG4gICAgICB2YXIgcGx1Z2lucyA9ICRzY29wZS5icmFuY2gucGx1Z2luc1xuICAgICAgICAsIGJyYW5jaCA9ICRzY29wZS5icmFuY2hcbiAgICAgICAgLCBkYXRhID0gW107XG5cbiAgICAgIGZvciAodmFyIGk9MDsgaTxwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRhdGEucHVzaCh7XG4gICAgICAgICAgaWQ6IHBsdWdpbnNbaV0uaWQsXG4gICAgICAgICAgZW5hYmxlZDogcGx1Z2luc1tpXS5lbmFibGVkLFxuICAgICAgICAgIHNob3dTdGF0dXM6IHBsdWdpbnNbaV0uc2hvd1N0YXR1c1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgU3RyaWRlci5Db25maWcuQnJhbmNoLnNhdmUoXG4gICAgICAgIHtcbiAgICAgICAgICBvd25lcjogcHJvamVjdFNlYXJjaE9wdGlvbnMub3duZXIsXG4gICAgICAgICAgcmVwbzogIHByb2plY3RTZWFyY2hPcHRpb25zLnJlcG8sXG4gICAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSB9LFxuICAgICAgICB7XG4gICAgICAgICAgcGx1Z2luX29yZGVyOiBkYXRhfSxcbiAgICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdQbHVnaW4gb3JkZXIgb24gYnJhbmNoICcgKyBicmFuY2gubmFtZSArICcgc2F2ZWQuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gb3B0aW9ucyBmb3IgdGhlIGluVXNlIHBsdWdpbiBzb3J0YWJsZVxuICAgICRzY29wZS5pblVzZU9wdGlvbnMgPSB7XG4gICAgICBjb25uZWN0V2l0aDogJy5kaXNhYmxlZC1wbHVnaW5zLWxpc3QnLFxuICAgICAgZGlzdGFuY2U6IDUsXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIChlLCB1aSkge1xuICAgICAgICB1cGRhdGVDb25maWd1cmVkKCk7XG4gICAgICB9LFxuICAgICAgcmVjZWl2ZTogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgIHVwZGF0ZUNvbmZpZ3VyZWQoKTtcbiAgICAgICAgdmFyIHBsdWdpbnMgPSAkc2NvcGUuYnJhbmNoLnBsdWdpbnM7XG4gICAgICAgIHBsdWdpbnNbdWkuaXRlbS5pbmRleCgpXS5lbmFibGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5pdEJyYW5jaChicmFuY2gpIHtcbiAgICAgIHZhciBwbHVnaW5zO1xuXG4gICAgICAkc2NvcGUuY29uZmlndXJlZFticmFuY2gubmFtZV0gPSB7fTtcbiAgICAgICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdID0ge307XG4gICAgICAkc2NvcGUuZGlzYWJsZWRfcGx1Z2luc1ticmFuY2gubmFtZV0gPSBbXTtcblxuICAgICAgaWYgKCFicmFuY2gubWlycm9yX21hc3Rlcikge1xuICAgICAgICBwbHVnaW5zID0gYnJhbmNoLnBsdWdpbnM7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbYnJhbmNoLm5hbWVdW3BsdWdpbnNbaV0uaWRdID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luc1tpXS5pZF0gPSBwbHVnaW5zW2ldO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIHBsdWdpbiBpbiAkc2NvcGUucGx1Z2lucykge1xuICAgICAgICBpZiAoJHNjb3BlLmNvbmZpZ3VyZWRbYnJhbmNoLm5hbWVdW3BsdWdpbl0pIGNvbnRpbnVlO1xuICAgICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luXSA9IHtcbiAgICAgICAgICBpZDogcGx1Z2luLFxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgY29uZmlnOiB7fVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZGlzYWJsZWRfcGx1Z2luc1ticmFuY2gubmFtZV0ucHVzaCgkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luXSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghYnJhbmNoLm1pcnJvcl9tYXN0ZXIpIHtcbiAgICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdW2JyYW5jaC5ydW5uZXIuaWRdID0gYnJhbmNoLnJ1bm5lci5jb25maWc7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBydW5uZXIgaW4gJHNjb3BlLnJ1bm5lcnMpIHtcbiAgICAgICAgaWYgKCFicmFuY2gubWlycm9yX21hc3RlciAmJiBydW5uZXIgPT09IGJyYW5jaC5ydW5uZXIuaWQpIGNvbnRpbnVlO1xuICAgICAgICAkc2NvcGUucnVubmVyQ29uZmlnc1ticmFuY2gubmFtZV1bcnVubmVyXSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBpbml0UGx1Z2lucygpIHtcbiAgICAgIHZhciBicmFuY2hlcyA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzXG4gICAgICBmb3IgKHZhciBpPTA7IGk8YnJhbmNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW5pdEJyYW5jaChicmFuY2hlc1tpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHNjb3BlLnNhdmVHZW5lcmFsQnJhbmNoID0gZnVuY3Rpb24gKHBsdWdpbnMpIHtcbiAgICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoXG4gICAgICAgICwgZGF0YSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZTogYnJhbmNoLmFjdGl2ZSxcbiAgICAgICAgICAgIHByaXZrZXk6IGJyYW5jaC5wcml2a2V5LFxuICAgICAgICAgICAgcHVia2V5OiBicmFuY2gucHVia2V5LFxuICAgICAgICAgICAgZW52S2V5czogYnJhbmNoLmVudktleXMsXG4gICAgICAgICAgICBtaXJyb3JfbWFzdGVyOiBicmFuY2gubWlycm9yX21hc3RlcixcbiAgICAgICAgICAgIGRlcGxveV9vbl9ncmVlbjogYnJhbmNoLmRlcGxveV9vbl9ncmVlbixcbiAgICAgICAgICAgIHJ1bm5lcjogYnJhbmNoLnJ1bm5lclxuICAgICAgICAgIH07XG4gICAgICBpZiAocGx1Z2lucykge1xuICAgICAgICBkYXRhLnBsdWdpbnMgPSBicmFuY2gucGx1Z2lucztcbiAgICAgIH1cbiAgICAgIFN0cmlkZXIuQ29uZmlnLkJyYW5jaC5zYXZlKFxuICAgICAgICB7XG4gICAgICAgICAgb3duZXI6IHByb2plY3RTZWFyY2hPcHRpb25zLm93bmVyLFxuICAgICAgICAgIHJlcG86ICBwcm9qZWN0U2VhcmNoT3B0aW9ucy5yZXBvLFxuICAgICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUgfSxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdHZW5lcmFsIGNvbmZpZyBmb3IgYnJhbmNoICcgKyBicmFuY2gubmFtZSArICcgc2F2ZWQuJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5nZW5lcmF0ZUtleVBhaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBib290Ym94LmNvbmZpcm0oJ1JlYWxseSBnZW5lcmF0ZSBhIG5ldyBrZXlwYWlyPyBUaGlzIGNvdWxkIGJyZWFrIHRoaW5ncyBpZiB5b3UgaGF2ZSBwbHVnaW5zIHRoYXQgdXNlIHRoZSBjdXJyZW50IG9uZXMuJywgZnVuY3Rpb24gKHJlYWxseSkge1xuICAgICAgICBpZiAoIXJlYWxseSkgcmV0dXJuO1xuICAgICAgICBTdHJpZGVyLktleWdlbi5zYXZlKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG93bmVyOiBwcm9qZWN0U2VhcmNoT3B0aW9ucy5vd25lcixcbiAgICAgICAgICAgIHJlcG86ICBwcm9qZWN0U2VhcmNoT3B0aW9ucy5yZXBvLFxuICAgICAgICAgICAgYnJhbmNoOiAkc2NvcGUuYnJhbmNoLm5hbWUgfSxcbiAgICAgICAgICB7fSxcbiAgICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICAkc2NvcGUuYnJhbmNoLnByaXZrZXkgPSBkYXRhLnByaXZrZXk7XG4gICAgICAgICAgJHNjb3BlLmJyYW5jaC5wdWJrZXkgPSBkYXRhLnB1YmtleTtcbiAgICAgICAgICAkc2NvcGUuc3VjY2VzcygnR2VuZXJhdGVkIG5ldyBzc2gga2V5cGFpcicpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaW5pdFBsdWdpbnMoKTtcblxuICAgICRzY29wZS5ncmF2YXRhciA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgaWYgKCFlbWFpbCkgcmV0dXJuICcnO1xuICAgICAgdmFyIGhhc2ggPSBtZDUoZW1haWwudG9Mb3dlckNhc2UoKSk7XG4gICAgICByZXR1cm4gJ2h0dHBzOi8vc2VjdXJlLmdyYXZhdGFyLmNvbS9hdmF0YXIvJyArIGhhc2ggKyAnP2Q9aWRlbnRpY29uJztcbiAgICB9XG5cbiAgICAvLyB0b2RvOiBwYXNzIGluIG5hbWU/XG4gICAgJHNjb3BlLnJ1bm5lckNvbmZpZyA9IGZ1bmN0aW9uIChicmFuY2gsIGRhdGEsIG5leHQpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIG5leHQgPSBkYXRhO1xuICAgICAgICBkYXRhID0gYnJhbmNoO1xuICAgICAgICBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgfVxuICAgICAgdmFyIG5hbWUgPSAkc2NvcGUuYnJhbmNoLnJ1bm5lci5pZDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gJHNjb3BlLnJ1bm5lckNvbmZpZ3NbbmFtZV07XG4gICAgICB9XG5cbiAgICAgIFN0cmlkZXIuQ29uZmlnLkJyYW5jaC5SdW5uZXIuc2F2ZShcbiAgICAgICAge1xuICAgICAgICAgIG93bmVyOiBwcm9qZWN0U2VhcmNoT3B0aW9ucy5vd25lcixcbiAgICAgICAgICByZXBvOiAgcHJvamVjdFNlYXJjaE9wdGlvbnMucmVwbyxcbiAgICAgICAgICBicmFuY2g6ICdtYXN0ZXInIH0sXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoXCJSdW5uZXIgY29uZmlnIHNhdmVkLlwiKTtcbiAgICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbbmFtZV0gPSBkYXRhLmNvbmZpZztcbiAgICAgICAgbmV4dCAmJiBuZXh0KG51bGwsIGRhdGEuY29uZmlnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnID0gZnVuY3Rpb24gKGRhdGEsIG5leHQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdwcm92aWRlciBjb25maWcnKTtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUucHJvamVjdC5wcm92aWRlci5jb25maWc7XG4gICAgICB9XG4gICAgICBTdHJpZGVyLlByb3ZpZGVyLnNhdmUocHJvamVjdFNlYXJjaE9wdGlvbnMsIGRhdGEsIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcyhcIlByb3ZpZGVyIGNvbmZpZyBzYXZlZC5cIik7XG4gICAgICAgIG5leHQgJiYgbmV4dCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnID0gZnVuY3Rpb24gKG5hbWUsIGJyYW5jaCwgZGF0YSwgbmV4dCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgbmV4dCA9IGRhdGE7XG4gICAgICAgIGRhdGEgPSBicmFuY2g7XG4gICAgICAgIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGJyYW5jaC5taXJyb3JfbWFzdGVyKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIHBsdWdpbiA9ICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXVtuYW1lXVxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBwbHVnaW4uY29uZmlnO1xuICAgICAgfVxuICAgICAgaWYgKHBsdWdpbiA9PT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwicGx1Z2luQ29uZmlnIGNhbGxlZCBmb3IgYSBwbHVnaW4gdGhhdCdzIG5vdCBjb25maWd1cmVkLiBcIiArIG5hbWUsIHRydWUpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsdWdpbiBub3QgY29uZmlndXJlZDogJyArIG5hbWUpO1xuICAgICAgfVxuXG4gICAgICBTdHJpZGVyLkNvbmZpZy5CcmFuY2guUGx1Z2luLnNhdmUoXG4gICAgICAgIHtcbiAgICAgICAgICBvd25lcjogIHByb2plY3RTZWFyY2hPcHRpb25zLm93bmVyLFxuICAgICAgICAgIHJlcG86ICAgcHJvamVjdFNlYXJjaE9wdGlvbnMucmVwbyxcbiAgICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICAgIHBsdWdpbjogbmFtZVxuICAgICAgICB9LFxuICAgICAgICBkYXRhLFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoXCJDb25maWcgZm9yIFwiICsgbmFtZSArIFwiIG9uIGJyYW5jaCBcIiArIGJyYW5jaC5uYW1lICsgXCIgc2F2ZWQuXCIpO1xuICAgICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bbmFtZV0uY29uZmlnID0gZGF0YTtcbiAgICAgICAgbmV4dChudWxsLCBkYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBTdHJpZGVyLlJlcG8uZGVsZXRlKHByb2plY3RTZWFyY2hPcHRpb25zLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy8nKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnN0YXJ0VGVzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIFN0cmlkZXIuU3RhcnQuc2F2ZShcbiAgICAgICAgcHJvamVjdFNlYXJjaE9wdGlvbnMsXG4gICAgICAgIHtcbiAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gubmFtZSxcbiAgICAgICAgICB0eXBlOiBcIlRFU1RfT05MWVwiLFxuICAgICAgICAgIHBhZ2U6XCJjb25maWdcIiB9LFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydERlcGxveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIFN0cmlkZXIuU3RhcnQuc2F2ZShcbiAgICAgICAgcHJvamVjdFNlYXJjaE9wdGlvbnMsXG4gICAgICAgIHtcbiAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gubmFtZSxcbiAgICAgICAgICB0eXBlOiBcIlRFU1RfQU5EX0RFUExPWVwiLFxuICAgICAgICAgIHBhZ2U6XCJjb25maWdcIiB9LFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlUHJvamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIFN0cmlkZXIuUmVndWxhckNvbmZpZy5zYXZlKFxuICAgICAgICAgIHByb2plY3RTZWFyY2hPcHRpb25zLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHB1YmxpYzogJHNjb3BlLnByb2plY3QucHVibGljXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdWNjZXNzKTtcbiAgICAgIH0pO1xuXG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdHZW5lcmFsIGNvbmZpZyBzYXZlZC4nKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gIH0pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmaXhUZW1wbGF0ZTtcblxuZnVuY3Rpb24gZml4VGVtcGxhdGUocykge1xuICByZXR1cm4gcy5cbiAgICByZXBsYWNlKC9cXFtcXFsvZywgJ3t7JykuXG4gICAgcmVwbGFjZSgvXFxdXFxdL2csICd9fScpO1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5Db2xsYWJvcmF0b3JzQ3RybCcsIFsnJHNjb3BlJywgJ1N0cmlkZXInLCBDb2xsYWJvcmF0b3JzQ3RybF0pO1xuXG5mdW5jdGlvbiBDb2xsYWJvcmF0b3JzQ3RybCgkc2NvcGUsIFN0cmlkZXIpIHtcbiAgJHNjb3BlLm5ld19lbWFpbCA9ICcnO1xuICAkc2NvcGUubmV3X2FjY2VzcyA9IDA7XG4gICRzY29wZS5jb2xsYWJvcmF0b3JzID0gd2luZG93LmNvbGxhYm9yYXRvcnMgfHwgW107XG5cbiAgJHNjb3BlLnJlbW92ZSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaXRlbS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUuY2xlYXJNZXNzYWdlKCk7XG4gICAgU3RyaWRlci5kZWwoXG4gICAgICAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy9jb2xsYWJvcmF0b3JzLycsXG4gICAgICB7ZW1haWw6IGl0ZW0uZW1haWx9LFxuICAgICAgc3VjY2Vzcyk7XG5cbiAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgcmVtb3ZlKCRzY29wZS5jb2xsYWJvcmF0b3JzLCBpdGVtKTtcbiAgICAgICRzY29wZS5zdWNjZXNzKGl0ZW0uZW1haWwgKyBcIiBpcyBubyBsb25nZXIgYSBjb2xsYWJvcmF0b3Igb24gdGhpcyBwcm9qZWN0LlwiKTtcbiAgICB9XG4gIH07XG5cbiAgJHNjb3BlLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGF0YSA9IHtcbiAgICAgIGVtYWlsOiAkc2NvcGUubmV3X2VtYWlsLFxuICAgICAgYWNjZXNzOiAkc2NvcGUubmV3X2FjY2VzcyB8fCAwLFxuICAgICAgZ3JhdmF0YXI6ICRzY29wZS5ncmF2YXRhcigkc2NvcGUubmV3X2VtYWlsKSxcbiAgICAgIG93bmVyOiBmYWxzZVxuICAgIH07XG5cbiAgICBTdHJpZGVyLnBvc3QoXG4gICAgICAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy9jb2xsYWJvcmF0b3JzLycsXG4gICAgICBkYXRhLFxuICAgICAgc3VjY2Vzcyk7XG5cblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MocmVzKSB7XG4gICAgICAkc2NvcGUubmV3X2FjY2VzcyA9IDA7XG4gICAgICAkc2NvcGUubmV3X2VtYWlsID0gJyc7XG4gICAgICBpZiAocmVzLmNyZWF0ZWQpIHtcbiAgICAgICAgJHNjb3BlLmNvbGxhYm9yYXRvcnMucHVzaChkYXRhKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zdWNjZXNzKHJlcy5tZXNzYWdlKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlbW92ZShhciwgaXRlbSkge1xuICBhci5zcGxpY2UoYXIuaW5kZXhPZihpdGVtKSwgMSk7XG59XG4iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuRW52aXJvbm1lbnRDdHJsJywgWyckc2NvcGUnLCBFbnZpcm9ubWVudEN0cmxdKTtcblxuZnVuY3Rpb24gRW52aXJvbm1lbnRDdHJsKCRzY29wZSl7XG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdLmVudi5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWUgfHwge307XG4gIH0pO1xuICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ2VudicsICRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcbiAgJHNjb3BlLmRlbCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBkZWxldGUgJHNjb3BlLmNvbmZpZ1trZXldO1xuICAgICRzY29wZS5zYXZlKCk7XG4gIH07XG4gICRzY29wZS5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmNvbmZpZ1skc2NvcGUubmV3a2V5XSA9ICRzY29wZS5uZXd2YWx1ZTtcbiAgICAkc2NvcGUubmV3a2V5ID0gJHNjb3BlLm5ld3ZhbHVlID0gJyc7XG4gICAgJHNjb3BlLnNhdmUoKTtcbiAgfTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuR2l0aHViQ3RybCcsIFsnJHNjb3BlJywgJ1N0cmlkZXInLCBHaXRodWJDdHJsXSk7XG5cbmZ1bmN0aW9uIEdpdGh1YkN0cmwoJHNjb3BlLCBTdHJpZGVyKSB7XG5cbiAgJHNjb3BlLmNvbmZpZyA9ICRzY29wZS5wcm92aWRlckNvbmZpZygpO1xuICAkc2NvcGUubmV3X3VzZXJuYW1lID0gXCJcIjtcbiAgJHNjb3BlLm5ld19sZXZlbCA9IFwidGVzdGVyXCI7XG4gICRzY29wZS5jb25maWcud2hpdGVsaXN0ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgfHwgW107XG4gICRzY29wZS5jb25maWcucHVsbF9yZXF1ZXN0cyA9ICRzY29wZS5jb25maWcucHVsbF9yZXF1ZXN0cyB8fCAnbm9uZSc7XG5cbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKCRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHt9KTtcbiAgfTtcblxuICAkc2NvcGUuJHdhdGNoKCdjb25maWcucHVsbF9yZXF1ZXN0cycsIGZ1bmN0aW9uICh2YWx1ZSwgb2xkKSB7XG4gICAgaWYgKCFvbGQgfHwgdmFsdWUgPT09IG9sZCkgcmV0dXJuO1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyh7XG4gICAgICBwdWxsX3JlcXVlc3RzOiAkc2NvcGUuY29uZmlnLnB1bGxfcmVxdWVzdHNcbiAgICB9KTtcbiAgfSk7XG5cbiAgJHNjb3BlLmFkZFdlYmhvb2tzID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSB0cnVlO1xuXG4gICAgU3RyaWRlci5wb3N0KCRzY29wZS5hcGlfcm9vdCArICdnaXRodWIvaG9vaycsIHN1Y2Nlc3MpO1xuXG4gICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTVUNDRVNTJyk7XG4gICAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuc3VjY2VzcygnU2V0IGdpdGh1YiB3ZWJob29rcycpO1xuICAgIH1cbiAgfTtcblxuICAkc2NvcGUuZGVsZXRlV2ViaG9va3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IHRydWU7XG5cbiAgICBTdHJpZGVyLmRlbCgkc2NvcGUuYXBpX3Jvb3QgKyAnZ2l0aHViL2hvb2snLCBzdWNjZXNzKTtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuc3VjY2VzcygnUmVtb3ZlZCBnaXRodWIgd2ViaG9va3MnKTtcbiAgICB9XG4gIH07XG5cbiAgJHNjb3BlLnJlbW92ZVdMID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICB2YXIgaWR4ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QuaW5kZXhPZih1c2VyKTtcbiAgICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIGNvbnNvbGUuZXJyb3IoXCJ0cmllZCB0byByZW1vdmUgYSB3aGl0ZWxpc3QgaXRlbSB0aGF0IGRpZG4ndCBleGlzdFwiKTtcbiAgICB2YXIgd2hpdGVsaXN0ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3Quc2xpY2UoKTtcbiAgICB3aGl0ZWxpc3Quc3BsaWNlKGlkeCwgMSk7XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKHtcbiAgICAgIHdoaXRlbGlzdDogd2hpdGVsaXN0XG4gICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgPSB3aGl0ZWxpc3Q7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmFkZFdMID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICBpZiAoIXVzZXIubmFtZSB8fCAhdXNlci5sZXZlbCkgcmV0dXJuO1xuICAgIHZhciB3aGl0ZWxpc3QgPSAkc2NvcGUuY29uZmlnLndoaXRlbGlzdC5zbGljZSgpO1xuICAgIHdoaXRlbGlzdC5wdXNoKHVzZXIpO1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyh7XG4gICAgICB3aGl0ZWxpc3Q6IHdoaXRlbGlzdFxuICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5jb25maWcud2hpdGVsaXN0ID0gd2hpdGVsaXN0O1xuICAgIH0pO1xuICB9O1xuXG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkhlcm9rdUNvbnRyb2xsZXInLCBbJyRzY29wZScsICdTdHJpZGVyJywgSGVyb2t1Q3RybF0pO1xuXG5mdW5jdGlvbiBIZXJva3VDdHJsKCRzY29wZSwgU3RyaWRlcikge1xuICAkc2NvcGUuJHdhdGNoKCd1c2VyQ29uZmlncy5oZXJva3UnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlKSByZXR1cm5cbiAgICAkc2NvcGUudXNlckNvbmZpZyA9IHZhbHVlO1xuICAgIGlmICghJHNjb3BlLmFjY291bnQgJiYgdmFsdWUuYWNjb3VudHMgJiYgdmFsdWUuYWNjb3VudHMubGVuZ3RoID4gMCkge1xuICAgICAgJHNjb3BlLmFjY291bnQgPSB2YWx1ZS5hY2NvdW50c1swXTtcbiAgICB9XG4gIH0pO1xuICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXS5oZXJva3UuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICAgIGlmICh2YWx1ZS5hcHAgJiYgJHNjb3BlLnVzZXJDb25maWcuYWNjb3VudHMpIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoJHNjb3BlLnVzZXJDb25maWcuYWNjb3VudHNbaV0uaWQgPT09IHZhbHVlLmFwcC5hY2NvdW50KSB7XG4gICAgICAgICAgJHNjb3BlLmFjY291bnQgPSAkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50c1tpXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnaGVyb2t1JywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuZ2V0QXBwcyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoISRzY29wZS5hY2NvdW50KSByZXR1cm4gY29uc29sZS53YXJuKCd0cmllZCB0byBnZXRBcHBzIGJ1dCBubyBhY2NvdW50Jyk7XG4gICAgU3RyaWRlci5nZXQoJy9leHQvaGVyb2t1L2FwcHMvJyArIGVuY29kZVVSSUNvbXBvbmVudCgkc2NvcGUuYWNjb3VudC5pZCksIHN1Y2Nlc3MpO1xuXG4gICAgZnVuY3Rpb24gc3VjY2VzcyAoYm9keSwgcmVxKSB7XG4gICAgICAkc2NvcGUuYWNjb3VudC5jYWNoZSA9IGJvZHk7XG4gICAgICAkc2NvcGUuc3VjY2VzcygnR290IGFjY291bnRzIGxpc3QgZm9yICcgKyAkc2NvcGUuYWNjb3VudC5lbWFpbCwgdHJ1ZSk7XG4gICAgfVxuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5Kb2JDb250cm9sbGVyJywgWyckc2NvcGUnLCBKb2JDb250cm9sbGVyXSk7XG5cbmZ1bmN0aW9uIEpvYkNvbnRyb2xsZXIoJHNjb3BlKSB7XG5cbiAgJHNjb3BlLmluaXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgJHNjb3BlLiR3YXRjaCgndXNlckNvbmZpZ3NbXCInICsgbmFtZSArICdcIl0nLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICRzY29wZS51c2VyQ29uZmlnID0gdmFsdWU7XG4gICAgfSk7XG4gICAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV1bXCInICsgbmFtZSArICdcIl0uY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgfSk7XG4gICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgICAkc2NvcGUucGx1Z2luQ29uZmlnKG5hbWUsICRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5Ob2RlQ29udHJvbGxlcicsIFsnJHNjb3BlJywgTm9kZUNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gTm9kZUNvbnRyb2xsZXIoJHNjb3BlKSB7XG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdLm5vZGUuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICB9KTtcbiAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdub2RlJywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUucmVtb3ZlR2xvYmFsID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgJHNjb3BlLmNvbmZpZy5nbG9iYWxzLnNwbGljZShpbmRleCwgMSk7XG4gICAgJHNjb3BlLnNhdmUoKTtcbiAgfTtcbiAgJHNjb3BlLmFkZEdsb2JhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoISRzY29wZS5jb25maWcuZ2xvYmFscykgJHNjb3BlLmNvbmZpZy5nbG9iYWxzID0gW107XG4gICAgJHNjb3BlLmNvbmZpZy5nbG9iYWxzLnB1c2goJHNjb3BlLm5ld19wYWNrYWdlKTtcbiAgICAkc2NvcGUubmV3X3BhY2thZ2UgPSAnJztcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5SdW5uZXJDb250cm9sbGVyJywgWyckc2NvcGUnLCBSdW5uZXJDb250cm9sbGVyXSk7XG5cbmZ1bmN0aW9uIFJ1bm5lckNvbnRyb2xsZXIoJHNjb3BlKSB7XG5cbiAgJHNjb3BlLmluaXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICRzY29wZS4kd2F0Y2goJ3J1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdW1wiJyArIG5hbWUgKyAnXCJdJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBjb25zb2xlLmxvZygnUnVubmVyIGNvbmZpZycsIG5hbWUsIHZhbHVlLCAkc2NvcGUucnVubmVyQ29uZmlncyk7XG4gICAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnJ1bm5lckNvbmZpZygkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG5cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuU2F1Y2VDdHJsJywgWyckc2NvcGUnLCBTYXVjZUN0cmxdKTtcblxuZnVuY3Rpb24gU2F1Y2VDdHJsKCRzY29wZSkge1xuXG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdLnNhdWNlLmNvbmZpZycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICBpZiAoIXZhbHVlKSByZXR1cm47XG4gICAgJHNjb3BlLmJyb3dzZXJfbWFwID0ge307XG4gICAgaWYgKCF2YWx1ZS5icm93c2Vycykge1xuICAgICAgdmFsdWUuYnJvd3NlcnMgPSBbXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaT0wOyBpPHZhbHVlLmJyb3dzZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAkc2NvcGUuYnJvd3Nlcl9tYXBbc2VyaWFsaXplTmFtZSh2YWx1ZS5icm93c2Vyc1tpXSldID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuICAkc2NvcGUuY29tcGxldGVOYW1lID0gY29tcGxldGVOYW1lO1xuICAkc2NvcGUub3BlcmF0aW5nc3lzdGVtcyA9IG9yZ2FuaXplKGJyb3dzZXJzIHx8IFtdKTtcbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmNvbmZpZy5icm93c2VycyA9IFtdO1xuICAgIGZvciAodmFyIG5hbWUgaW4gJHNjb3BlLmJyb3dzZXJfbWFwKSB7XG4gICAgICBpZiAoJHNjb3BlLmJyb3dzZXJfbWFwW25hbWVdKSB7XG4gICAgICAgICRzY29wZS5jb25maWcuYnJvd3NlcnMucHVzaChwYXJzZU5hbWUobmFtZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdzYXVjZScsICRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICB9KTtcbiAgfTtcbiAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5icm93c2VyX21hcCA9IHt9O1xuICAgICRzY29wZS4kZGlnZXN0KCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG9yZ2FuaXplKGJyb3dzZXJzKSB7XG4gIHZhciBvc3MgPSB7fTtcbiAgZm9yICh2YXIgaT0wOyBpPGJyb3dzZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCFvc3NbYnJvd3NlcnNbaV0ub3NdKSB7XG4gICAgICBvc3NbYnJvd3NlcnNbaV0ub3NdID0ge307XG4gICAgfVxuICAgIGlmICghb3NzW2Jyb3dzZXJzW2ldLm9zXVticm93c2Vyc1tpXS5sb25nX25hbWVdKSB7XG4gICAgICBvc3NbYnJvd3NlcnNbaV0ub3NdW2Jyb3dzZXJzW2ldLmxvbmdfbmFtZV0gPSBbXTtcbiAgICB9XG4gICAgb3NzW2Jyb3dzZXJzW2ldLm9zXVticm93c2Vyc1tpXS5sb25nX25hbWVdLnB1c2goYnJvd3NlcnNbaV0pO1xuICAgIGJyb3dzZXJzW2ldLmNvbXBsZXRlX25hbWUgPSBjb21wbGV0ZU5hbWUoYnJvd3NlcnNbaV0pO1xuICB9XG4gIHJldHVybiBvc3M7XG59XG5cbmZ1bmN0aW9uIGNvbXBsZXRlTmFtZSh2ZXJzaW9uKSB7XG4gIHJldHVybiB2ZXJzaW9uLm9zICsgJy0nICsgdmVyc2lvbi5hcGlfbmFtZSArICctJyArIHZlcnNpb24uc2hvcnRfdmVyc2lvbjtcbn1cblxuZnVuY3Rpb24gcGFyc2VOYW1lKG5hbWUpIHtcbiAgdmFyIHBhcnRzID0gbmFtZS5zcGxpdCgnLScpO1xuICByZXR1cm4ge1xuICAgIHBsYXRmb3JtOiBwYXJ0c1swXSxcbiAgICBicm93c2VyTmFtZTogcGFydHNbMV0sXG4gICAgdmVyc2lvbjogcGFydHNbMl0gfHwgJydcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTmFtZShicm93c2VyKSB7XG4gIHJldHVybiBicm93c2VyLnBsYXRmb3JtICsgJy0nICsgYnJvd3Nlci5icm93c2VyTmFtZSArICctJyArIGJyb3dzZXIudmVyc2lvbjtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuV2ViaG9va3NDdHJsJywgWyckc2NvcGUnLCBXZWJob29rc0N0cmxdKTtcblxuZnVuY3Rpb24gV2ViaG9va3NDdHJsKCRzY29wZSkge1xuXG4gIGZ1bmN0aW9uIHJlbW92ZShhciwgaXRlbSkge1xuICAgIGFyLnNwbGljZShhci5pbmRleE9mKGl0ZW0pLCAxKTtcbiAgfVxuXG4gICRzY29wZS5ob29rcyA9ICRzY29wZS5wbHVnaW5Db25maWcoJ3dlYmhvb2tzJykgfHwgW107XG4gIGlmICghQXJyYXkuaXNBcnJheSgkc2NvcGUuaG9va3MpKSAkc2NvcGUuaG9va3MgPSBbXTtcbiAgaWYgKCEkc2NvcGUuaG9va3MubGVuZ3RoKSAkc2NvcGUuaG9va3MucHVzaCh7fSk7XG5cbiAgJHNjb3BlLnJlbW92ZSA9IGZ1bmN0aW9uIChob29rKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnd2ViaG9va3MnLCAkc2NvcGUuaG9va3MsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICAgIGlmICghZXJyKSByZW1vdmUoJHNjb3BlLmhvb2tzLCBob29rKTtcbiAgICAgIGlmICghJHNjb3BlLmhvb2tzLmxlbmd0aCkgJHNjb3BlLmhvb2tzLnB1c2goe30pO1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ3dlYmhvb2tzJywgJHNjb3BlLmhvb2tzLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuaG9va3MucHVzaCh7fSk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignRGFzaGJvYXJkQ3RybCcsIFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdTdHJpZGVyJywgRGFzaGJvYXJkQ3RybF0pO1xuXG5mdW5jdGlvbiBEYXNoYm9hcmRDdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBTdHJpZGVyKSB7XG5cbiAgLy8gVE9ETzogbWFrZSB0aGlzIG1vcmUgZGVjbGFyYXRpdmU6XG4gIFN0cmlkZXIuU2Vzc2lvbi5nZXQoZnVuY3Rpb24odXNlcikge1xuICAgIGlmICghIHVzZXIudXNlcikgJGxvY2F0aW9uLnBhdGgoJy9sb2dpbicpO1xuICAgIGVsc2UgYXV0aGVudGljYXRlZCgpO1xuICB9KTtcblxuICBmdW5jdGlvbiBhdXRoZW50aWNhdGVkKCkge1xuICAgICRzY29wZS5qb2JzID0gU3RyaWRlci5qb2JzO1xuICAgIFN0cmlkZXIuY29ubmVjdCgkc2NvcGUpO1xuICAgIFN0cmlkZXIuam9icy5kYXNoYm9hcmQoKTtcbiAgfVxuXG4gICRzY29wZS5kZXBsb3kgPSBmdW5jdGlvbiBkZXBsb3kocHJvamVjdCkge1xuICAgIFN0cmlkZXIuZGVwbG95KHByb2plY3QpO1xuICB9O1xuXG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignRXJyb3JDdHJsJywgWyckc2NvcGUnLCAnJHJvb3RTY29wZScsIEVycm9yQ3RybF0pO1xuXG5mdW5jdGlvbiBFcnJvckN0cmwoJHNjb3BlLCAkcm9vdFNjb3BlKSB7XG4gICRzY29wZS5lcnJvciA9IHt9O1xuXG4gICRyb290U2NvcGUuJG9uKCdlcnJvcicsIGZ1bmN0aW9uKGV2LCBlcnIpIHtcbiAgICAkc2NvcGUuZXJyb3IubWVzc2FnZSA9IGVyci5tZXNzYWdlIHx8IGVycjtcbiAgfSk7XG5cbiAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgJHNjb3BlLmVycm9yLm1lc3NhZ2UgPSAnJztcbiAgfSk7XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignSm9iQ3RybCcsIFsnJHNjb3BlJywgJyRyb3V0ZVBhcmFtcycsICckc2NlJywgJyRmaWx0ZXInLCAnJGxvY2F0aW9uJywgJyRyb3V0ZScsICdTdHJpZGVyJywgSm9iQ3RybF0pO1xuXG5mdW5jdGlvbiBKb2JDdHJsKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkc2NlLCAkZmlsdGVyLCAkbG9jYXRpb24sICRyb3V0ZSwgU3RyaWRlcikge1xuXG5cbiAgdmFyIG91dHB1dENvbnNvbGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY29uc29sZS1vdXRwdXQnKTtcblxuICAkc2NvcGUucGhhc2VzID0gU3RyaWRlci5waGFzZXM7XG4gICRzY29wZS5wYWdlID0gJ2J1aWxkJztcblxuICB2YXIgam9iaWQgPSAkcm91dGVQYXJhbXMuam9iaWQ7XG4gIGNvbnNvbGUubG9nKCdqb2JpZDonLCBqb2JpZCk7XG4gIHZhciBzZWFyY2hPcHRpb25zID0ge1xuICAgIG93bmVyOiAkcm91dGVQYXJhbXMub3duZXIsXG4gICAgcmVwbzogICRyb3V0ZVBhcmFtcy5yZXBvXG4gIH07XG5cbiAgU3RyaWRlci5SZXBvLmdldChzZWFyY2hPcHRpb25zLCBmdW5jdGlvbihyZXBvKSB7XG4gICAgJHNjb3BlLnByb2plY3QgPSByZXBvLnByb2plY3RcbiAgICBpZiAoISBqb2JpZCkgJHNjb3BlLmpvYiAgPSByZXBvLmpvYjtcbiAgICAkc2NvcGUuam9icyA9IHJlcG8uam9icztcblxuICAgIGlmICgkc2NvcGUuam9iICYmICRzY29wZS5qb2IucGhhc2VzLnRlc3QuY29tbWFuZHMubGVuZ3RoKSB7XG4gICAgICBpZiAoJHNjb3BlLmpvYi5waGFzZXMuZW52aXJvbm1lbnQpIHtcbiAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMuZW52aXJvbm1lbnQuY29sbGFwc2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICgkc2NvcGUuam9iLnBoYXNlcy5wcmVwYXJlKSB7XG4gICAgICAgICRzY29wZS5qb2IucGhhc2VzLnByZXBhcmUuY29sbGFwc2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICgkc2NvcGUuam9iLnBoYXNlcy5jbGVhbnVwKSB7XG4gICAgICAgICRzY29wZS5qb2IucGhhc2VzLmNsZWFudXAuY29sbGFwc2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPYmplY3Qua2V5cygkc2NvcGUuam9iLnBoYXNlcykuZm9yRWFjaChmdW5jdGlvbihwaGFzZUtleSkge1xuICAgIC8vICAgdmFyIHBoYXNlID0gJHNjb3BlLmpvYi5waGFzZXNbcGhhc2VLZXldO1xuICAgIC8vICAgT2JqZWN0LmtleXMocGhhc2UuY29tbWFuZHMpLmZvckVhY2goZnVuY3Rpb24oY29tbWFuZEtleSkge1xuICAgIC8vICAgICB2YXIgY29tbWFuZCA9IHBoYXNlLmNvbW1hbmRzW2NvbW1hbmRLZXldO1xuICAgIC8vICAgICBjb21tYW5kLm1lcmdlZCA9ICRzY2UudHJ1c3RBc0h0bWwoY29tbWFuZC5tZXJnZWQpO1xuICAgIC8vICAgfSlcbiAgICAvLyB9KTtcbiAgfSk7XG5cbiAgaWYgKGpvYmlkKSB7XG4gICAgU3RyaWRlci5Kb2IuZ2V0KHtcbiAgICAgIG93bmVyOiAkcm91dGVQYXJhbXMub3duZXIsXG4gICAgICByZXBvOiAgJHJvdXRlUGFyYW1zLnJlcG8sXG4gICAgICBqb2JpZDogam9iaWRcbiAgICB9LCBmdW5jdGlvbihqb2IpIHtcbiAgICAgICRzY29wZS5qb2IgPSBqb2I7XG4gICAgfSk7XG4gIH1cblxuICBTdHJpZGVyLlN0YXR1c0Jsb2Nrcy5nZXQoZnVuY3Rpb24oc3RhdHVzQmxvY2tzKSB7XG4gICAgJHNjb3BlLnN0YXR1c0Jsb2NrcyA9IHN0YXR1c0Jsb2NrcztcbiAgICBbJ3J1bm5lcicsICdwcm92aWRlcicsICdqb2InXS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgZml4QmxvY2tzKHN0YXR1c0Jsb2Nrcywga2V5KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgU3RyaWRlci5jb25uZWN0KCRzY29wZSk7XG5cbiAgU3RyaWRlci5TZXNzaW9uLmdldChmdW5jdGlvbih1c2VyKSB7XG4gICAgaWYgKHVzZXIudXNlcikgJHNjb3BlLmN1cnJlbnRVc2VyID0gdXNlcjtcbiAgfSk7XG5cbiAgLy8vIFNjb3BlIGZ1bmN0aW9uc1xuXG4gICRzY29wZS5jbGVhckNhY2hlID0gZnVuY3Rpb24gY2xlYXJDYWNoZSgpIHtcbiAgICAkc2NvcGUuY2xlYXJpbmdDYWNoZSA9IHRydWU7XG4gICAgU3RyaWRlci5DYWNoZS5kZWxldGUoIHNlYXJjaE9wdGlvbnMsIHN1Y2Nlc3MpO1xuXG4gICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICRzY29wZS5jbGVhcmluZ0NhY2hlID0gZmFsc2U7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHZhciBsYXN0Um91dGU7XG5cbiAgLy8gJHNjb3BlLiRvbignJGxvY2F0aW9uQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gIC8vICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5tYXRjaCgvXFwvY29uZmlnJC8pKSB7XG4gIC8vICAgICB3aW5kb3cubG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XG4gIC8vICAgICByZXR1cm47XG4gIC8vICAgfVxuICAvLyAgIHBhcmFtcyA9ICRyb3V0ZVBhcmFtcztcbiAgLy8gICBpZiAoIXBhcmFtcy5pZCkgcGFyYW1zLmlkID0gJHNjb3BlLmpvYnNbMF0uX2lkO1xuICAvLyAgIC8vIGRvbid0IHJlZnJlc2ggdGhlIHBhZ2VcbiAgLy8gICAkcm91dGUuY3VycmVudCA9IGxhc3RSb3V0ZTtcbiAgLy8gICBpZiAoam9iaWQgIT09IHBhcmFtcy5pZCkge1xuICAvLyAgICAgam9iaWQgPSBwYXJhbXMuaWQ7XG4gIC8vICAgICB2YXIgY2FjaGVkID0gam9ibWFuLmdldChqb2JpZCwgZnVuY3Rpb24gKGVyciwgam9iLCBjYWNoZWQpIHtcbiAgLy8gICAgICAgaWYgKGpvYi5waGFzZXMuZW52aXJvbm1lbnQpIHtcbiAgLy8gICAgICAgICBqb2IucGhhc2VzLmVudmlyb25tZW50LmNvbGxhcHNlZCA9IHRydWU7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgICAgaWYgKGpvYi5waGFzZXMucHJlcGFyZSkge1xuICAvLyAgICAgICAgIGpvYi5waGFzZXMucHJlcGFyZS5jb2xsYXBzZWQgPSB0cnVlO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgIGlmIChqb2IucGhhc2VzLmNsZWFudXApIHtcbiAgLy8gICAgICAgICBqb2IucGhhc2VzLmNsZWFudXAuY29sbGFwc2VkID0gdHJ1ZTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICAkc2NvcGUuam9iID0gam9iO1xuICAvLyAgICAgICBpZiAoJHNjb3BlLmpvYi5waGFzZXMudGVzdC5jb21tYW5kcy5sZW5ndGgpIHtcbiAgLy8gICAgICAgICAkc2NvcGUuam9iLnBoYXNlcy5lbnZpcm9ubWVudC5jb2xsYXBzZWQgPSB0cnVlO1xuICAvLyAgICAgICAgICRzY29wZS5qb2IucGhhc2VzLnByZXBhcmUuY29sbGFwc2VkID0gdHJ1ZTtcbiAgLy8gICAgICAgICAkc2NvcGUuam9iLnBoYXNlcy5jbGVhbnVwLmNvbGxhcHNlZCA9IHRydWU7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgICAgaWYgKCFjYWNoZWQpICRzY29wZS4kZGlnZXN0KCk7XG4gIC8vICAgICB9KTtcbiAgLy8gICAgIGlmICghY2FjaGVkKSB7XG4gIC8vICAgICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUuam9icy5sZW5ndGg7IGkrKykge1xuICAvLyAgICAgICAgIGlmICgkc2NvcGUuam9ic1tpXS5faWQgPT09IGpvYmlkKSB7XG4gIC8vICAgICAgICAgICAkc2NvcGUuam9iID0gJHNjb3BlLmpvYnNbaV07XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vIH0pO1xuXG4gICRzY29wZS50cmlnZ2VycyA9IHtcbiAgICBjb21taXQ6IHtcbiAgICAgIGljb246ICdjb2RlLWZvcmsnLFxuICAgICAgdGl0bGU6ICdDb21taXQnXG4gICAgfSxcbiAgICBtYW51YWw6IHtcbiAgICAgIGljb246ICdoYW5kLXJpZ2h0JyxcbiAgICAgIHRpdGxlOiAnTWFudWFsJ1xuICAgIH0sXG4gICAgcGx1Z2luOiB7XG4gICAgICBpY29uOiAncHV6emxlLXBpZWNlJyxcbiAgICAgIHRpdGxlOiAnUGx1Z2luJ1xuICAgIH0sXG4gICAgYXBpOiB7XG4gICAgICBpY29uOiAnY2xvdWQnLFxuICAgICAgdGl0bGU6ICdDbG91ZCdcbiAgICB9XG4gIH07XG5cbiAgJHNjb3BlLnNlbGVjdEpvYiA9IGZ1bmN0aW9uIChpZCkge1xuICAgICRsb2NhdGlvbi5wYXRoKFxuICAgICAgJy8nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNlYXJjaE9wdGlvbnMub3duZXIpICtcbiAgICAgICcvJyArIGVuY29kZVVSSUNvbXBvbmVudChzZWFyY2hPcHRpb25zLnJlcG8pICtcbiAgICAgICcvam9iLycgKyBlbmNvZGVVUklDb21wb25lbnQoaWQpKTtcbiAgfTtcblxuICAkc2NvcGUuJHdhdGNoKCdqb2Iuc3RhdHVzJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdXBkYXRlRmF2aWNvbih2YWx1ZSk7XG4gIH0pO1xuXG4gICRzY29wZS4kd2F0Y2goJ2pvYi5zdGQubWVyZ2VkX2xhdGVzdCcsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIC8qIFRyYWNraW5nIGlzbid0IHF1aXRlIHdvcmtpbmcgcmlnaHRcbiAgICBpZiAoJHNjb3BlLmpvYi5zdGF0dXMgPT09ICdydW5uaW5nJykge1xuICAgICAgaGVpZ2h0ID0gb3V0cHV0Q29uc29sZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgICB0cmFja2luZyA9IGhlaWdodCArIG91dHB1dENvbnNvbGUuc2Nyb2xsVG9wID4gb3V0cHV0Q29uc29sZS5zY3JvbGxIZWlnaHQgLSA1MDtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRyYWNraW5nLCBoZWlnaHQsIG91dHB1dENvbnNvbGUuc2Nyb2xsVG9wLCBvdXRwdXRDb25zb2xlLnNjcm9sbEhlaWdodCk7XG4gICAgICBpZiAoIXRyYWNraW5nKSByZXR1cm47XG4gICAgfVxuICAgICovXG4gICAgdmFyIGFuc2lGaWx0ZXIgPSAkZmlsdGVyKCdhbnNpJylcbiAgICAkKCcuam9iLW91dHB1dCcpLmxhc3QoKS5hcHBlbmQoYW5zaUZpbHRlcih2YWx1ZSkpXG4gICAgb3V0cHV0Q29uc29sZS5zY3JvbGxUb3AgPSBvdXRwdXRDb25zb2xlLnNjcm9sbEhlaWdodDtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIG91dHB1dENvbnNvbGUuc2Nyb2xsVG9wID0gb3V0cHV0Q29uc29sZS5zY3JvbGxIZWlnaHQ7XG4gICAgfSwgMTApO1xuICB9KTtcblxuICAvLyBidXR0b24gaGFuZGxlcnNcbiAgJHNjb3BlLnN0YXJ0RGVwbG95ID0gZnVuY3Rpb24gKGpvYikge1xuICAgICQoJy50b29sdGlwJykuaGlkZSgpO1xuICAgIFN0cmlkZXIuZGVwbG95KGpvYi5wcm9qZWN0KTtcbiAgICAkc2NvcGUuam9iID0ge1xuICAgICAgcHJvamVjdDogJHNjb3BlLmpvYi5wcm9qZWN0LFxuICAgICAgc3RhdHVzOiAnc3VibWl0dGVkJ1xuICAgIH07XG4gIH07XG4gICRzY29wZS5zdGFydFRlc3QgPSBmdW5jdGlvbiAoam9iKSB7XG4gICAgJCgnLnRvb2x0aXAnKS5oaWRlKCk7XG4gICAgU3RyaWRlci5kZXBsb3koam9iLnByb2plY3QpO1xuICAgICRzY29wZS5qb2IgPSB7XG4gICAgICBwcm9qZWN0OiAkc2NvcGUuam9iLnByb2plY3QsXG4gICAgICBzdGF0dXM6ICdzdWJtaXR0ZWQnXG4gICAgfTtcbiAgfTtcblxuXG4gIGZ1bmN0aW9uIGZpeEJsb2NrcyhvYmplY3QsIGtleSkge1xuICAgIHZhciBibG9ja3MgPSBvYmplY3Rba2V5XTtcbiAgICBpZiAoISBibG9ja3MpIHJldHVybjtcbiAgICBPYmplY3Qua2V5cyhibG9ja3MpLmZvckVhY2goZnVuY3Rpb24ocHJvdmlkZXIpIHtcbiAgICAgIHZhciBibG9jayA9IGJsb2Nrc1twcm92aWRlcl07XG4gICAgICBibG9jay5hdHRyc19odG1sID0gT2JqZWN0LmtleXMoYmxvY2suYXR0cnMpLm1hcChmdW5jdGlvbihhdHRyKSB7XG4gICAgICAgIHJldHVybiBhdHRyICsgJz0nICsgYmxvY2suYXR0cnNbYXR0cl07XG4gICAgICB9KS5qb2luKCcgJyk7XG5cbiAgICAgIGJsb2NrLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKGJsb2NrLmh0bWwpO1xuXG4gICAgfSk7XG4gIH1cbn1cblxuXG4vKiogbWFuYWdlIHRoZSBmYXZpY29ucyAqKi9cbmZ1bmN0aW9uIHNldEZhdmljb24oc3RhdHVzKSB7XG4gICQoJ2xpbmtbcmVsKj1cImljb25cIl0nKS5hdHRyKCdocmVmJywgJy9pbWFnZXMvaWNvbnMvZmF2aWNvbi0nICsgc3RhdHVzICsgJy5wbmcnKTtcbn1cblxuZnVuY3Rpb24gYW5pbWF0ZUZhdigpIHtcbiAgdmFyIGFsdCA9IGZhbHNlO1xuICBmdW5jdGlvbiBzd2l0Y2hpdCgpIHtcbiAgICBzZXRGYXZpY29uKCdydW5uaW5nJyArIChhbHQgPyAnLWFsdCcgOiAnJykpO1xuICAgIGFsdCA9ICFhbHQ7XG4gIH1cbiAgcmV0dXJuIHNldEludGVydmFsKHN3aXRjaGl0LCA1MDApO1xufVxuXG52YXIgcnVudGltZSA9IG51bGw7XG5mdW5jdGlvbiB1cGRhdGVGYXZpY29uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgaWYgKHJ1bnRpbWUgPT09IG51bGwpIHtcbiAgICAgIHJ1bnRpbWUgPSBhbmltYXRlRmF2KCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChydW50aW1lICE9PSBudWxsKSB7XG4gICAgICBjbGVhckludGVydmFsKHJ1bnRpbWUpO1xuICAgICAgcnVudGltZSA9IG51bGw7XG4gICAgfVxuICAgIHNldEZhdmljb24odmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkU3dpdGNoZXIoJHNjb3BlKSB7XG4gIGZ1bmN0aW9uIHN3aXRjaEJ1aWxkcyhldnQpIHtcbiAgICB2YXIgZHkgPSB7NDA6IDEsIDM4OiAtMX1bZXZ0LmtleUNvZGVdXG4gICAgICAsIGlkID0gJHNjb3BlLmpvYi5faWRcbiAgICAgICwgaWR4O1xuICAgIGlmICghZHkpIHJldHVybjtcbiAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLmpvYnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICgkc2NvcGUuam9ic1tpXS5faWQgPT09IGlkKSB7XG4gICAgICAgIGlkeCA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaWR4ID09PSAtMSkge1xuICAgICAgY29uc29sZS5sb2coJ0ZhaWxlZCB0byBmaW5kIGpvYi4nKTtcbiAgICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb25cbiAgICB9XG4gICAgaWR4ICs9IGR5O1xuICAgIGlmIChpZHggPCAwIHx8IGlkeCA+PSAkc2NvcGUuam9icy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgJHNjb3BlLnNlbGVjdEpvYigkc2NvcGUuam9ic1tpZHhdLl9pZCk7XG4gICAgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgfVxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgc3dpdGNoQnVpbGRzKTtcbn1cbiIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdTdHJpZGVyJywgTG9naW5DdHJsXSk7XG5cbmZ1bmN0aW9uIExvZ2luQ3RybCgkc2NvcGUsICRsb2NhdGlvbiwgU3RyaWRlcikge1xuXG4gIFN0cmlkZXIuU2Vzc2lvbi5nZXQoZnVuY3Rpb24odXNlcikge1xuICAgIGlmICh1c2VyLmlkKSAkbG9jYXRpb24ucGF0aCgnL2Rhc2hib2FyZCcpO1xuICB9KTtcblxuICAkc2NvcGUudXNlciA9IHt9O1xuXG4gICRzY29wZS5sb2dpbiA9IGZ1bmN0aW9uIGxvZ2luKHVzZXIpIHtcbiAgICB2YXIgc2Vzc2lvbiA9IG5ldyAoU3RyaWRlci5TZXNzaW9uKSh1c2VyKTtcbiAgICBzZXNzaW9uLiRzYXZlKGZ1bmN0aW9uKCkge1xuICAgICAgJGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcbiAgICB9KTtcbiAgfTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5kaXJlY3RpdmUoJ2R5bmFtaWNDb250cm9sbGVyJywgZHluYW1pY0NvbnRyb2xsZXIpO1xuXG5mdW5jdGlvbiBkeW5hbWljQ29udHJvbGxlcigkY29tcGlsZSwgJGNvbnRyb2xsZXIpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHRlcm1pbmFsOiB0cnVlLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbG0sIGF0dHJzKSB7XG4gICAgICB2YXIgbGFzdFNjb3BlO1xuICAgICAgc2NvcGUuJHdhdGNoKGF0dHJzLmR5bmFtaWNDb250cm9sbGVyLCBmdW5jdGlvbihjdHJsTmFtZSkge1xuICAgICAgICBpZiAoISBjdHJsTmFtZSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciBuZXdTY29wZSA9IHNjb3BlLiRuZXcoKTtcblxuICAgICAgICB2YXIgY3RybDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjdHJsID0gJGNvbnRyb2xsZXIoY3RybE5hbWUsIHskc2NvcGU6IG5ld1Njb3BlfSk7XG4gICAgICAgIH0gY2F0Y2ggKF9lcnIpIHtcbiAgICAgICAgICAvLyBub3QgZm91bmRcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChsYXN0U2NvcGUpIGxhc3RTY29wZS4kZGVzdHJveSgpO1xuXG4gICAgICAgIGVsbS5jb250ZW50cygpLmRhdGEoJyRuZ0NvbnRyb2xsZXJDb250cm9sbGVyJywgY3RybCk7XG4gICAgICAgICRjb21waWxlKGVsbS5jb250ZW50cygpKShuZXdTY29wZSk7XG5cbiAgICAgICAgbGFzdFNjb3BlID0gbmV3U2NvcGU7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07IiwidmFyIGFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5hcHAuZmlsdGVyKCdhbnNpJywgWyckc2NlJywgZnVuY3Rpb24gKCRzY2UpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmICghaW5wdXQpIHJldHVybiAnJztcbiAgICB2YXIgdGV4dCA9IGlucHV0LnJlcGxhY2UoL15bXlxcblxccl0qXFx1MDAxYlxcWzJLL2dtLCAnJylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcdTAwMWJcXFtLW15cXG5cXHJdKi9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1teXFxuXSpcXHIoW15cXG5dKS9nLCAnJDEnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXlteXFxuXSpcXHUwMDFiXFxbMEcvZ20sICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgICByZXR1cm4gJHNjZS50cnVzdEFzSHRtbChhbnNpZmlsdGVyKHRleHQpKTtcbiAgfVxufV0pO1xuXG5mdW5jdGlvbiBhbnNpcGFyc2Uoc3RyKSB7XG4gIC8vXG4gIC8vIEknbSB0ZXJyaWJsZSBhdCB3cml0aW5nIHBhcnNlcnMuXG4gIC8vXG4gIHZhciBtYXRjaGluZ0NvbnRyb2wgPSBudWxsLFxuICAgICAgbWF0Y2hpbmdEYXRhID0gbnVsbCxcbiAgICAgIG1hdGNoaW5nVGV4dCA9ICcnLFxuICAgICAgYW5zaVN0YXRlID0gW10sXG4gICAgICByZXN1bHQgPSBbXSxcbiAgICAgIG91dHB1dCA9IFwiXCIsXG4gICAgICBzdGF0ZSA9IHt9LFxuICAgICAgZXJhc2VDaGFyO1xuXG4gIHZhciBoYW5kbGVSZXN1bHQgPSBmdW5jdGlvbihwKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbXTtcblxuICAgIHAuZm9yZWdyb3VuZCAmJiBjbGFzc2VzLnB1c2gocC5mb3JlZ3JvdW5kKTtcbiAgICBwLmJhY2tncm91bmQgJiYgY2xhc3Nlcy5wdXNoKCdiZy0nICsgcC5iYWNrZ3JvdW5kKTtcbiAgICBwLmJvbGQgICAgICAgJiYgY2xhc3Nlcy5wdXNoKCdib2xkJyk7XG4gICAgcC5pdGFsaWMgICAgICYmIGNsYXNzZXMucHVzaCgnaXRhbGljJyk7XG4gICAgaWYgKCFwLnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNsYXNzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gb3V0cHV0ICs9IHAudGV4dFxuICAgIH1cbiAgICB2YXIgc3BhbiA9ICc8c3BhbiBjbGFzcz1cIicgKyBjbGFzc2VzLmpvaW4oJyAnKSArICdcIj4nICsgcC50ZXh0ICsgJzwvc3Bhbj4nXG4gICAgb3V0cHV0ICs9IHNwYW5cbiAgfVxuICAvL1xuICAvLyBHZW5lcmFsIHdvcmtmbG93IGZvciB0aGlzIHRoaW5nIGlzOlxuICAvLyBcXDAzM1xcWzMzbVRleHRcbiAgLy8gfCAgICAgfCAgfFxuICAvLyB8ICAgICB8ICBtYXRjaGluZ1RleHRcbiAgLy8gfCAgICAgbWF0Y2hpbmdEYXRhXG4gIC8vIG1hdGNoaW5nQ29udHJvbFxuICAvL1xuICAvLyBJbiBmdXJ0aGVyIHN0ZXBzIHdlIGhvcGUgaXQncyBhbGwgZ29pbmcgdG8gYmUgZmluZS4gSXQgdXN1YWxseSBpcy5cbiAgLy9cblxuICAvL1xuICAvLyBFcmFzZXMgYSBjaGFyIGZyb20gdGhlIG91dHB1dFxuICAvL1xuICBlcmFzZUNoYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGluZGV4LCB0ZXh0O1xuICAgIGlmIChtYXRjaGluZ1RleHQubGVuZ3RoKSB7XG4gICAgICBtYXRjaGluZ1RleHQgPSBtYXRjaGluZ1RleHQuc3Vic3RyKDAsIG1hdGNoaW5nVGV4dC5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgZWxzZSBpZiAocmVzdWx0Lmxlbmd0aCkge1xuICAgICAgaW5kZXggPSByZXN1bHQubGVuZ3RoIC0gMTtcbiAgICAgIHRleHQgPSByZXN1bHRbaW5kZXhdLnRleHQ7XG4gICAgICBpZiAodGV4dC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gQSByZXN1bHQgYml0IHdhcyBmdWxseSBkZWxldGVkLCBwb3AgaXQgb3V0IHRvIHNpbXBsaWZ5IHRoZSBmaW5hbCBvdXRwdXRcbiAgICAgICAgLy9cbiAgICAgICAgcmVzdWx0LnBvcCgpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJlc3VsdFtpbmRleF0udGV4dCA9IHRleHQuc3Vic3RyKDAsIHRleHQubGVuZ3RoIC0gMSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG1hdGNoaW5nQ29udHJvbCAhPT0gbnVsbCkge1xuICAgICAgaWYgKG1hdGNoaW5nQ29udHJvbCA9PSAnXFwwMzMnICYmIHN0cltpXSA9PSAnXFxbJykge1xuICAgICAgICAvL1xuICAgICAgICAvLyBXZSd2ZSBtYXRjaGVkIGZ1bGwgY29udHJvbCBjb2RlLiBMZXRzIHN0YXJ0IG1hdGNoaW5nIGZvcm1hdGluZyBkYXRhLlxuICAgICAgICAvL1xuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFwiZW1pdFwiIG1hdGNoZWQgdGV4dCB3aXRoIGNvcnJlY3Qgc3RhdGVcbiAgICAgICAgLy9cbiAgICAgICAgaWYgKG1hdGNoaW5nVGV4dCkge1xuICAgICAgICAgIHN0YXRlLnRleHQgPSBtYXRjaGluZ1RleHQ7XG4gICAgICAgICAgaGFuZGxlUmVzdWx0KHN0YXRlKTtcbiAgICAgICAgICBzdGF0ZSA9IHt9O1xuICAgICAgICAgIG1hdGNoaW5nVGV4dCA9IFwiXCI7XG4gICAgICAgIH1cblxuICAgICAgICBtYXRjaGluZ0NvbnRyb2wgPSBudWxsO1xuICAgICAgICBtYXRjaGluZ0RhdGEgPSAnJztcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAvL1xuICAgICAgICAvLyBXZSBmYWlsZWQgdG8gbWF0Y2ggYW55dGhpbmcgLSBtb3N0IGxpa2VseSBhIGJhZCBjb250cm9sIGNvZGUuIFdlXG4gICAgICAgIC8vIGdvIGJhY2sgdG8gbWF0Y2hpbmcgcmVndWxhciBzdHJpbmdzLlxuICAgICAgICAvL1xuICAgICAgICBtYXRjaGluZ1RleHQgKz0gbWF0Y2hpbmdDb250cm9sICsgc3RyW2ldO1xuICAgICAgICBtYXRjaGluZ0NvbnRyb2wgPSBudWxsO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGVsc2UgaWYgKG1hdGNoaW5nRGF0YSAhPT0gbnVsbCkge1xuICAgICAgaWYgKHN0cltpXSA9PSAnOycpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gYDtgIHNlcGFyYXRlcyBtYW55IGZvcm1hdHRpbmcgY29kZXMsIGZvciBleGFtcGxlOiBgXFwwMzNbMzM7NDNtYFxuICAgICAgICAvLyBtZWFucyB0aGF0IGJvdGggYDMzYCBhbmQgYDQzYCBzaG91bGQgYmUgYXBwbGllZC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETzogdGhpcyBjYW4gYmUgc2ltcGxpZmllZCBieSBtb2RpZnlpbmcgc3RhdGUgaGVyZS5cbiAgICAgICAgLy9cbiAgICAgICAgYW5zaVN0YXRlLnB1c2gobWF0Y2hpbmdEYXRhKTtcbiAgICAgICAgbWF0Y2hpbmdEYXRhID0gJyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChzdHJbaV0gPT0gJ20nKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIGBtYCBmaW5pc2hlZCB3aG9sZSBmb3JtYXR0aW5nIGNvZGUuIFdlIGNhbiBwcm9jZWVkIHRvIG1hdGNoaW5nXG4gICAgICAgIC8vIGZvcm1hdHRlZCB0ZXh0LlxuICAgICAgICAvL1xuICAgICAgICBhbnNpU3RhdGUucHVzaChtYXRjaGluZ0RhdGEpO1xuICAgICAgICBtYXRjaGluZ0RhdGEgPSBudWxsO1xuICAgICAgICBtYXRjaGluZ1RleHQgPSAnJztcblxuICAgICAgICAvL1xuICAgICAgICAvLyBDb252ZXJ0IG1hdGNoZWQgZm9ybWF0dGluZyBkYXRhIGludG8gdXNlci1mcmllbmRseSBzdGF0ZSBvYmplY3QuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE86IERSWS5cbiAgICAgICAgLy9cbiAgICAgICAgYW5zaVN0YXRlLmZvckVhY2goZnVuY3Rpb24gKGFuc2lDb2RlKSB7XG4gICAgICAgICAgaWYgKGFuc2lwYXJzZS5mb3JlZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXSkge1xuICAgICAgICAgICAgc3RhdGUuZm9yZWdyb3VuZCA9IGFuc2lwYXJzZS5mb3JlZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaXBhcnNlLmJhY2tncm91bmRDb2xvcnNbYW5zaUNvZGVdKSB7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kID0gYW5zaXBhcnNlLmJhY2tncm91bmRDb2xvcnNbYW5zaUNvZGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAzOSkge1xuICAgICAgICAgICAgZGVsZXRlIHN0YXRlLmZvcmVncm91bmQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDQ5KSB7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUuYmFja2dyb3VuZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaXBhcnNlLnN0eWxlc1thbnNpQ29kZV0pIHtcbiAgICAgICAgICAgIHN0YXRlW2Fuc2lwYXJzZS5zdHlsZXNbYW5zaUNvZGVdXSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDIyKSB7XG4gICAgICAgICAgICBzdGF0ZS5ib2xkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDIzKSB7XG4gICAgICAgICAgICBzdGF0ZS5pdGFsaWMgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMjQpIHtcbiAgICAgICAgICAgIHN0YXRlLnVuZGVybGluZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGFuc2lTdGF0ZSA9IFtdO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG1hdGNoaW5nRGF0YSArPSBzdHJbaV07XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoc3RyW2ldID09ICdcXDAzMycpIHtcbiAgICAgIG1hdGNoaW5nQ29udHJvbCA9IHN0cltpXTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RyW2ldID09ICdcXHUwMDA4Jykge1xuICAgICAgZXJhc2VDaGFyKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbWF0Y2hpbmdUZXh0ICs9IHN0cltpXTtcbiAgICB9XG4gIH1cblxuICBpZiAobWF0Y2hpbmdUZXh0KSB7XG4gICAgc3RhdGUudGV4dCA9IG1hdGNoaW5nVGV4dCArIChtYXRjaGluZ0NvbnRyb2wgPyBtYXRjaGluZ0NvbnRyb2wgOiAnJyk7XG4gICAgaGFuZGxlUmVzdWx0KHN0YXRlKTtcbiAgfVxuICByZXR1cm4gb3V0cHV0O1xufVxuXG5hbnNpcGFyc2UuZm9yZWdyb3VuZENvbG9ycyA9IHtcbiAgJzMwJzogJ2JsYWNrJyxcbiAgJzMxJzogJ3JlZCcsXG4gICczMic6ICdncmVlbicsXG4gICczMyc6ICd5ZWxsb3cnLFxuICAnMzQnOiAnYmx1ZScsXG4gICczNSc6ICdtYWdlbnRhJyxcbiAgJzM2JzogJ2N5YW4nLFxuICAnMzcnOiAnd2hpdGUnLFxuICAnOTAnOiAnZ3JleSdcbn07XG5cbmFuc2lwYXJzZS5iYWNrZ3JvdW5kQ29sb3JzID0ge1xuICAnNDAnOiAnYmxhY2snLFxuICAnNDEnOiAncmVkJyxcbiAgJzQyJzogJ2dyZWVuJyxcbiAgJzQzJzogJ3llbGxvdycsXG4gICc0NCc6ICdibHVlJyxcbiAgJzQ1JzogJ21hZ2VudGEnLFxuICAnNDYnOiAnY3lhbicsXG4gICc0Nyc6ICd3aGl0ZSdcbn07XG5cbmFuc2lwYXJzZS5zdHlsZXMgPSB7XG4gICcxJzogJ2JvbGQnLFxuICAnMyc6ICdpdGFsaWMnLFxuICAnNCc6ICd1bmRlcmxpbmUnXG59O1xuXG5mdW5jdGlvbiBhbnNpZmlsdGVyKGRhdGEsIHBsYWludGV4dCwgY2FjaGUpIHtcblxuICAvLyBoYW5kbGUgdGhlIGNoYXJhY3RlcnMgZm9yIFwiZGVsZXRlIGxpbmVcIiBhbmQgXCJtb3ZlIHRvIHN0YXJ0IG9mIGxpbmVcIlxuICB2YXIgc3RhcnRzd2l0aGNyID0gL15bXlxcbl0qXFxyW15cXG5dLy50ZXN0KGRhdGEpO1xuICB2YXIgb3V0cHV0ID0gYW5zaXBhcnNlKGRhdGEpO1xuXG4gIHZhciByZXMgPSBvdXRwdXQucmVwbGFjZSgvXFwwMzMvZywgJycpO1xuICBpZiAoc3RhcnRzd2l0aGNyKSByZXMgPSAnXFxyJyArIHJlcztcblxuICByZXR1cm4gcmVzO1xufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFsnJHJvb3RTY29wZScsICckcScsIGZ1bmN0aW9uKCRzY29wZSwgJHEpIHtcblxuICBmdW5jdGlvbiBzdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9XG5cbiAgZnVuY3Rpb24gZXJyb3IocmVzcG9uc2UpIHtcbiAgICB2YXIgc3RhdHVzID0gcmVzcG9uc2Uuc3RhdHVzO1xuXG4gICAgdmFyIHJlc3AgPSByZXNwb25zZS5kYXRhO1xuICAgIGlmIChyZXNwKSB0cnkgeyByZXNwID0gSlNPTi5wYXJzZShyZXNwKTsgfSBjYXRjaChlcnIpIHsgfVxuXG4gICAgaWYgKHJlc3AubWVzc2FnZSkgcmVzcCA9IHJlc3AubWVzc2FnZTtcbiAgICBpZiAoISByZXNwKSB7XG4gICAgICByZXNwID0gJ0Vycm9yIGluIHJlc3BvbnNlJztcbiAgICAgIGlmIChzdGF0dXMpIHJlc3AgKz0gJyAoJyArIHN0YXR1cyArICcpJztcbiAgICB9XG5cbiAgICAkc2NvcGUuJGVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKHJlc3ApKTtcblxuICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgcmV0dXJuIHByb21pc2UudGhlbihzdWNjZXNzLCBlcnJvcik7XG4gIH1cblxufV07IiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUpvYlN0b3JlO1xuZnVuY3Rpb24gY3JlYXRlSm9iU3RvcmUoKSB7XG4gIHJldHVybiBuZXcgSm9iU3RvcmU7XG59XG5cbnZhciBQSEFTRVMgPSBleHBvcnRzLnBoYXNlcyA9XG5bJ2Vudmlyb25tZW50JywgJ3ByZXBhcmUnLCAndGVzdCcsICdkZXBsb3knLCAnY2xlYW51cCddO1xuXG52YXIgc3RhdHVzSGFuZGxlcnMgPSB7XG4gICdzdGFydGVkJzogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB0aGlzLnN0YXJ0ZWQgPSB0aW1lO1xuICAgIHRoaXMucGhhc2UgPSAnZW52aXJvbm1lbnQnO1xuICAgIHRoaXMuc3RhdHVzID0gJ3J1bm5pbmcnO1xuICB9LFxuICAnZXJyb3JlZCc6IGZ1bmN0aW9uIChlcnJvcikge1xuICAgIHRoaXMuZXJyb3IgPSBlcnJvcjtcbiAgICB0aGlzLnN0YXR1cyA9ICdlcnJvcmVkJztcbiAgfSxcbiAgJ2NhbmNlbGVkJzogJ2Vycm9yZWQnLFxuICAncGhhc2UuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdGhpcy5waGFzZSA9IFBIQVNFUy5pbmRleE9mKGRhdGEucGhhc2UpICsgMTtcbiAgfSxcbiAgLy8gdGhpcyBpcyBqdXN0IHNvIHdlJ2xsIHRyaWdnZXIgdGhlIFwidW5rbm93biBqb2JcIiBsb29rdXAgc29vbmVyIG9uIHRoZSBkYXNoYm9hcmRcbiAgJ3N0ZG91dCc6IGZ1bmN0aW9uICh0ZXh0KSB7fSxcbiAgJ3N0ZGVycic6IGZ1bmN0aW9uICh0ZXh0KSB7fSxcbiAgJ3dhcm5pbmcnOiBmdW5jdGlvbiAod2FybmluZykge1xuICAgIGlmICghdGhpcy53YXJuaW5ncykge1xuICAgICAgdGhpcy53YXJuaW5ncyA9IFtdO1xuICAgIH1cbiAgICB0aGlzLndhcm5pbmdzLnB1c2god2FybmluZyk7XG4gIH0sXG4gICdwbHVnaW4tZGF0YSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIHBhdGggPSBkYXRhLnBhdGggPyBbZGF0YS5wbHVnaW5dLmNvbmNhdChkYXRhLnBhdGguc3BsaXQoJy4nKSkgOiBbZGF0YS5wbHVnaW5dXG4gICAgLCBsYXN0ID0gcGF0aC5wb3AoKVxuICAgICwgbWV0aG9kID0gZGF0YS5tZXRob2QgfHwgJ3JlcGxhY2UnXG4gICAgLCBwYXJlbnRcbiAgICBwYXJlbnQgPSBwYXRoLnJlZHVjZShmdW5jdGlvbiAob2JqLCBhdHRyKSB7XG4gICAgICByZXR1cm4gb2JqW2F0dHJdIHx8IChvYmpbYXR0cl0gPSB7fSlcbiAgICB9LCB0aGlzLnBsdWdpbl9kYXRhIHx8ICh0aGlzLnBsdWdpbl9kYXRhID0ge30pKVxuICAgIGlmIChtZXRob2QgPT09ICdyZXBsYWNlJykge1xuICAgICAgcGFyZW50W2xhc3RdID0gZGF0YS5kYXRhXG4gICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdwdXNoJykge1xuICAgICAgaWYgKCFwYXJlbnRbbGFzdF0pIHtcbiAgICAgICAgcGFyZW50W2xhc3RdID0gW11cbiAgICAgIH1cbiAgICAgIHBhcmVudFtsYXN0XS5wdXNoKGRhdGEuZGF0YSlcbiAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ2V4dGVuZCcpIHtcbiAgICAgIGlmICghcGFyZW50W2xhc3RdKSB7XG4gICAgICAgIHBhcmVudFtsYXN0XSA9IHt9XG4gICAgICB9XG4gICAgICBleHRlbmQocGFyZW50W2xhc3RdLCBkYXRhLmRhdGEpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgXCJwbHVnaW4gZGF0YVwiIG1ldGhvZCByZWNlaXZlZCBmcm9tIHBsdWdpbicsIGRhdGEucGx1Z2luLCBkYXRhLm1ldGhvZCwgZGF0YSlcbiAgICB9XG4gIH0sXG5cbiAgJ3BoYXNlLmRvbmUnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZmluaXNoZWQgPSBkYXRhLnRpbWU7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZHVyYXRpb24gPSBkYXRhLmVsYXBzZWRcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5leGl0Q29kZSA9IGRhdGEuY29kZTtcbiAgICBpZiAoWydwcmVwYXJlJywgJ2Vudmlyb25tZW50JywgJ2NsZWFudXAnXS5pbmRleE9mKGRhdGEucGhhc2UpICE9PSAtMSkge1xuICAgICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uY29sbGFwc2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGRhdGEucGhhc2UgPT09ICd0ZXN0JykgdGhpcy50ZXN0X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoZGF0YS5waGFzZSA9PT0gJ2RlcGxveScpIHRoaXMuZGVwbG95X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoIWRhdGEubmV4dCB8fCAhdGhpcy5waGFzZXNbZGF0YS5uZXh0XSkgcmV0dXJuO1xuICAgIHRoaXMucGhhc2UgPSBkYXRhLm5leHQ7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5uZXh0XS5zdGFydGVkID0gZGF0YS50aW1lO1xuICB9LFxuICAnY29tbWFuZC5jb21tZW50JzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQpO1xuICAgIGNvbW1hbmQuY29tbWFuZCA9IGRhdGEuY29tbWVudDtcbiAgICBjb21tYW5kLmNvbW1lbnQgPSB0cnVlO1xuICAgIGNvbW1hbmQucGx1Z2luID0gZGF0YS5wbHVnaW47XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9LFxuICAnY29tbWFuZC5zdGFydCc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kLCBkYXRhKTtcbiAgICBjb21tYW5kLnN0YXJ0ZWQgPSBkYXRhLnRpbWU7XG4gICAgcGhhc2UuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfSxcbiAgJ2NvbW1hbmQuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gcGhhc2UuY29tbWFuZHNbcGhhc2UuY29tbWFuZHMubGVuZ3RoIC0gMV07XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBjb21tYW5kLmR1cmF0aW9uID0gZGF0YS5lbGFwc2VkO1xuICAgIGNvbW1hbmQuZXhpdENvZGUgPSBkYXRhLmV4aXRDb2RlO1xuICAgIGNvbW1hbmQubWVyZ2VkID0gY29tbWFuZC5fbWVyZ2VkO1xuICB9LFxuICAnc3Rkb3V0JzogZnVuY3Rpb24gKHRleHQpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBjb21tYW5kID0gZW5zdXJlQ29tbWFuZCh0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXSk7XG4gICAgY29tbWFuZC5vdXQgKz0gdGV4dDtcbiAgICBjb21tYW5kLl9tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5vdXQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWRfbGF0ZXN0ID0gdGV4dDtcbiAgfSxcbiAgJ3N0ZGVycic6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgY29tbWFuZCA9IGVuc3VyZUNvbW1hbmQodGhpcy5waGFzZXNbdGhpcy5waGFzZV0pO1xuICAgIGNvbW1hbmQuZXJyICs9IHRleHQ7XG4gICAgY29tbWFuZC5fbWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQuZXJyICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkX2xhdGVzdCA9IHRleHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gSm9iU3RvcmUoKSB7XG4gIHRoaXMuam9icyA9IHtcbiAgICBkYXNoYm9hcmQ6IGRhc2hib2FyZC5iaW5kKHRoaXMpLFxuICAgIHB1YmxpYzogW10sXG4gICAgeW91cnM6IFtdLFxuICAgIGxpbWJvOiBbXVxuICB9O1xufVxudmFyIEpTID0gSm9iU3RvcmUucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBkYXNoYm9hcmQoY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNvY2tldC5lbWl0KCdkYXNoYm9hcmQ6am9icycsIGZ1bmN0aW9uKGpvYnMpIHtcbiAgICBzZWxmLmpvYnMueW91cnMgPSBqb2JzLnlvdXJzO1xuICAgIHNlbGYuam9icy5wdWJsaWMgPSBqb2JzLnB1YmxpYztcbiAgICBzZWxmLmNoYW5nZWQoKTtcbiAgfSk7XG59XG5cblxuLy8vIC0tLS0gSm9iIFN0b3JlIHByb3RvdHlwZSBmdW5jdGlvbnM6IC0tLS1cblxuLy8vIGNvbm5lY3RcblxuSlMuY29ubmVjdCA9IGZ1bmN0aW9uIGNvbm5lY3Qoc29ja2V0LCBjaGFuZ2VDYWxsYmFjaykge1xuICB0aGlzLnNvY2tldCA9IHNvY2tldDtcbiAgdGhpcy5jaGFuZ2VDYWxsYmFjayA9IGNoYW5nZUNhbGxiYWNrO1xuXG4gIGZvciAodmFyIHN0YXR1cyBpbiBzdGF0dXNIYW5kbGVycykge1xuICAgIHNvY2tldC5vbignam9iLnN0YXR1cy4nICsgc3RhdHVzLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMsIHN0YXR1cykpXG4gIH1cblxuICBzb2NrZXQub24oJ2pvYi5uZXcnLCBKUy5uZXdKb2IuYmluZCh0aGlzKSk7XG59O1xuXG5cbi8vLyB1cGRhdGUgLSBoYW5kbGUgdXBkYXRlIGV2ZW50XG5cbkpTLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShldmVudCwgYXJncywgYWNjZXNzLCBkb250Y2hhbmdlKSB7XG4gIHZhciBpZCA9IGFyZ3Muc2hpZnQoKVxuICAgICwgam9iID0gdGhpcy5qb2IoaWQsIGFjY2VzcylcbiAgICAsIGhhbmRsZXIgPSBzdGF0dXNIYW5kbGVyc1tldmVudF07XG4gIGlmICgham9iKSByZXR1cm4gdGhpcy51bmtub3duKGlkLCBldmVudCwgYXJncywgYWNjZXNzKVxuICBpZiAoIWhhbmRsZXIpIHJldHVybjtcbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgaGFuZGxlcikge1xuICAgIGpvYi5zdGF0dXMgPSBoYW5kbGVyO1xuICB9IGVsc2Uge1xuICAgIGhhbmRsZXIuYXBwbHkoam9iLCBhcmdzKTtcbiAgfVxuICBpZiAoIWRvbnRjaGFuZ2UpIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuXG4vLy8gbmV3Sm9iIC0gd2hlbiBzZXJ2ZXIgbm90aWZpZXMgb2YgbmV3IGpvYlxuXG5KUy5uZXdKb2IgPSBmdW5jdGlvbiBuZXdKb2Ioam9iLCBhY2Nlc3MpIHtcbiAgaWYgKCEgam9iKSByZXR1cm47XG4gIGlmIChBcnJheS5pc0FycmF5KGpvYikpIGpvYiA9IGpvYlswXTtcblxuICB2YXIgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdXG4gICAgLCBmb3VuZCA9IC0xXG4gICAgLCBvbGQ7XG5cbiAgaWYgKCEgam9icykgcmV0dXJuO1xuXG4gIGZ1bmN0aW9uIHNlYXJjaCgpIHtcbiAgICBmb3IgKHZhciBpPTA7IGk8am9icy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGpvYnNbaV0ucHJvamVjdC5uYW1lID09PSBqb2IucHJvamVjdC5uYW1lKSB7XG4gICAgICAgIGZvdW5kID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2VhcmNoKCk7XG4gIGlmIChmb3VuZCA8IDApIHtcbiAgICAvLy8gdHJ5IGxpbWJvXG4gICAgam9icyA9IHRoaXMuam9icy5saW1ibztcbiAgICBzZWFyY2goKTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIGpvYnMgPSB0aGlzLmpvYnNbYWNjZXNzXTtcbiAgICAgIGpvYnMudW5zaGlmdCh0aGlzLmpvYnMubGltYm9bZm91bmRdKTtcbiAgICAgIHRoaXMuam9icy5saW1iby5zcGxpY2UoZm91bmQsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChmb3VuZCAhPT0gLTEpIHtcbiAgICBvbGQgPSBqb2JzLnNwbGljZShmb3VuZCwgMSlbMF07XG4gICAgam9iLnByb2plY3QucHJldiA9IG9sZC5wcm9qZWN0LnByZXY7XG4gIH1cbiAgLy8gaWYgKGpvYi5waGFzZXMpIHtcbiAgLy8gICAvLyBnZXQgcmlkIG9mIGV4dHJhIGRhdGEgLSB3ZSBkb24ndCBuZWVkIGl0LlxuICAvLyAgIC8vIG5vdGU6IHRoaXMgd29uJ3QgYmUgcGFzc2VkIHVwIGFueXdheSBmb3IgcHVibGljIHByb2plY3RzXG4gIC8vICAgY2xlYW5Kb2Ioam9iKTtcbiAgLy8gfVxuICAvL2pvYi5waGFzZSA9ICdlbnZpcm9ubWVudCc7XG4gIGpvYnMudW5zaGlmdChqb2IpO1xuICB0aGlzLmNoYW5nZWQoKTtcbn07XG5cblxuLy8vIGpvYiAtIGZpbmQgYSBqb2IgYnkgaWQgYW5kIGFjY2VzcyBsZXZlbFxuXG5KUy5qb2IgPSBmdW5jdGlvbiBqb2IoaWQsIGFjY2Vzcykge1xuICB2YXIgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdO1xuICB2YXIgam9iID0gc2VhcmNoKGlkLCBqb2JzKTtcbiAgLy8gaWYgbm90IGZvdW5kLCB0cnkgbGltYm9cbiAgaWYgKCEgam9iKXtcbiAgICBqb2IgPSBzZWFyY2goaWQsIHRoaXMuam9icy5saW1ibyk7XG4gICAgaWYgKGpvYikge1xuICAgICAgam9icy51bnNoaWZ0KGpvYik7XG4gICAgICB0aGlzLmpvYnMubGltYm8uc3BsaWNlKHRoaXMuam9icy5saW1iby5pbmRleE9mKGpvYiksIDEpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gam9iO1xufTtcblxuZnVuY3Rpb24gc2VhcmNoKGlkLCBqb2JzKSB7XG4gIGZvciAodmFyIGk9MDsgaTxqb2JzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGpvYnNbaV0uX2lkID09PSBpZCkgcmV0dXJuIGpvYnNbaV07XG4gIH1cbn1cblxuXG4vLy8gY2hhbmdlZCAtIG5vdGlmaWVzIFVJIG9mIGNoYW5nZXNcblxuSlMuY2hhbmdlZCA9IGZ1bmN0aW9uIGNoYW5nZWQoKSB7XG4gIHRoaXMuY2hhbmdlQ2FsbGJhY2soKTtcbn07XG5cblxuLy8vIGxvYWQg4oCUwqBsb2FkcyBhIGpvYlxuXG5KUy5sb2FkID0gZnVuY3Rpb24gbG9hZChqb2JJZCwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNvY2tldC5lbWl0KCdidWlsZDpqb2InLCBqb2JJZCwgZnVuY3Rpb24oam9iKSB7XG4gICAgc2VsZi5uZXdKb2Ioam9iLCAnbGltYm8nKTtcbiAgICBjYihqb2IpO1xuICAgIHNlbGYuY2hhbmdlZCgpO1xuICB9KTtcbn07XG5cbmZ1bmN0aW9uIGVuc3VyZUNvbW1hbmQocGhhc2UpIHtcbiAgdmFyIGNvbW1hbmQgPSBwaGFzZS5jb21tYW5kc1twaGFzZS5jb21tYW5kcy5sZW5ndGggLSAxXTtcbiAgaWYgKCFjb21tYW5kIHx8IHR5cGVvZihjb21tYW5kLmZpbmlzaGVkKSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kKTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9XG4gIHJldHVybiBjb21tYW5kO1xufSIsImZ1bmN0aW9uIG1kNWN5Y2xlKHgsIGspIHtcbnZhciBhID0geFswXSwgYiA9IHhbMV0sIGMgPSB4WzJdLCBkID0geFszXTtcblxuYSA9IGZmKGEsIGIsIGMsIGQsIGtbMF0sIDcsIC02ODA4NzY5MzYpO1xuZCA9IGZmKGQsIGEsIGIsIGMsIGtbMV0sIDEyLCAtMzg5NTY0NTg2KTtcbmMgPSBmZihjLCBkLCBhLCBiLCBrWzJdLCAxNywgIDYwNjEwNTgxOSk7XG5iID0gZmYoYiwgYywgZCwgYSwga1szXSwgMjIsIC0xMDQ0NTI1MzMwKTtcbmEgPSBmZihhLCBiLCBjLCBkLCBrWzRdLCA3LCAtMTc2NDE4ODk3KTtcbmQgPSBmZihkLCBhLCBiLCBjLCBrWzVdLCAxMiwgIDEyMDAwODA0MjYpO1xuYyA9IGZmKGMsIGQsIGEsIGIsIGtbNl0sIDE3LCAtMTQ3MzIzMTM0MSk7XG5iID0gZmYoYiwgYywgZCwgYSwga1s3XSwgMjIsIC00NTcwNTk4Myk7XG5hID0gZmYoYSwgYiwgYywgZCwga1s4XSwgNywgIDE3NzAwMzU0MTYpO1xuZCA9IGZmKGQsIGEsIGIsIGMsIGtbOV0sIDEyLCAtMTk1ODQxNDQxNyk7XG5jID0gZmYoYywgZCwgYSwgYiwga1sxMF0sIDE3LCAtNDIwNjMpO1xuYiA9IGZmKGIsIGMsIGQsIGEsIGtbMTFdLCAyMiwgLTE5OTA0MDQxNjIpO1xuYSA9IGZmKGEsIGIsIGMsIGQsIGtbMTJdLCA3LCAgMTgwNDYwMzY4Mik7XG5kID0gZmYoZCwgYSwgYiwgYywga1sxM10sIDEyLCAtNDAzNDExMDEpO1xuYyA9IGZmKGMsIGQsIGEsIGIsIGtbMTRdLCAxNywgLTE1MDIwMDIyOTApO1xuYiA9IGZmKGIsIGMsIGQsIGEsIGtbMTVdLCAyMiwgIDEyMzY1MzUzMjkpO1xuXG5hID0gZ2coYSwgYiwgYywgZCwga1sxXSwgNSwgLTE2NTc5NjUxMCk7XG5kID0gZ2coZCwgYSwgYiwgYywga1s2XSwgOSwgLTEwNjk1MDE2MzIpO1xuYyA9IGdnKGMsIGQsIGEsIGIsIGtbMTFdLCAxNCwgIDY0MzcxNzcxMyk7XG5iID0gZ2coYiwgYywgZCwgYSwga1swXSwgMjAsIC0zNzM4OTczMDIpO1xuYSA9IGdnKGEsIGIsIGMsIGQsIGtbNV0sIDUsIC03MDE1NTg2OTEpO1xuZCA9IGdnKGQsIGEsIGIsIGMsIGtbMTBdLCA5LCAgMzgwMTYwODMpO1xuYyA9IGdnKGMsIGQsIGEsIGIsIGtbMTVdLCAxNCwgLTY2MDQ3ODMzNSk7XG5iID0gZ2coYiwgYywgZCwgYSwga1s0XSwgMjAsIC00MDU1Mzc4NDgpO1xuYSA9IGdnKGEsIGIsIGMsIGQsIGtbOV0sIDUsICA1Njg0NDY0MzgpO1xuZCA9IGdnKGQsIGEsIGIsIGMsIGtbMTRdLCA5LCAtMTAxOTgwMzY5MCk7XG5jID0gZ2coYywgZCwgYSwgYiwga1szXSwgMTQsIC0xODczNjM5NjEpO1xuYiA9IGdnKGIsIGMsIGQsIGEsIGtbOF0sIDIwLCAgMTE2MzUzMTUwMSk7XG5hID0gZ2coYSwgYiwgYywgZCwga1sxM10sIDUsIC0xNDQ0NjgxNDY3KTtcbmQgPSBnZyhkLCBhLCBiLCBjLCBrWzJdLCA5LCAtNTE0MDM3ODQpO1xuYyA9IGdnKGMsIGQsIGEsIGIsIGtbN10sIDE0LCAgMTczNTMyODQ3Myk7XG5iID0gZ2coYiwgYywgZCwgYSwga1sxMl0sIDIwLCAtMTkyNjYwNzczNCk7XG5cbmEgPSBoaChhLCBiLCBjLCBkLCBrWzVdLCA0LCAtMzc4NTU4KTtcbmQgPSBoaChkLCBhLCBiLCBjLCBrWzhdLCAxMSwgLTIwMjI1NzQ0NjMpO1xuYyA9IGhoKGMsIGQsIGEsIGIsIGtbMTFdLCAxNiwgIDE4MzkwMzA1NjIpO1xuYiA9IGhoKGIsIGMsIGQsIGEsIGtbMTRdLCAyMywgLTM1MzA5NTU2KTtcbmEgPSBoaChhLCBiLCBjLCBkLCBrWzFdLCA0LCAtMTUzMDk5MjA2MCk7XG5kID0gaGgoZCwgYSwgYiwgYywga1s0XSwgMTEsICAxMjcyODkzMzUzKTtcbmMgPSBoaChjLCBkLCBhLCBiLCBrWzddLCAxNiwgLTE1NTQ5NzYzMik7XG5iID0gaGgoYiwgYywgZCwgYSwga1sxMF0sIDIzLCAtMTA5NDczMDY0MCk7XG5hID0gaGgoYSwgYiwgYywgZCwga1sxM10sIDQsICA2ODEyNzkxNzQpO1xuZCA9IGhoKGQsIGEsIGIsIGMsIGtbMF0sIDExLCAtMzU4NTM3MjIyKTtcbmMgPSBoaChjLCBkLCBhLCBiLCBrWzNdLCAxNiwgLTcyMjUyMTk3OSk7XG5iID0gaGgoYiwgYywgZCwgYSwga1s2XSwgMjMsICA3NjAyOTE4OSk7XG5hID0gaGgoYSwgYiwgYywgZCwga1s5XSwgNCwgLTY0MDM2NDQ4Nyk7XG5kID0gaGgoZCwgYSwgYiwgYywga1sxMl0sIDExLCAtNDIxODE1ODM1KTtcbmMgPSBoaChjLCBkLCBhLCBiLCBrWzE1XSwgMTYsICA1MzA3NDI1MjApO1xuYiA9IGhoKGIsIGMsIGQsIGEsIGtbMl0sIDIzLCAtOTk1MzM4NjUxKTtcblxuYSA9IGlpKGEsIGIsIGMsIGQsIGtbMF0sIDYsIC0xOTg2MzA4NDQpO1xuZCA9IGlpKGQsIGEsIGIsIGMsIGtbN10sIDEwLCAgMTEyNjg5MTQxNSk7XG5jID0gaWkoYywgZCwgYSwgYiwga1sxNF0sIDE1LCAtMTQxNjM1NDkwNSk7XG5iID0gaWkoYiwgYywgZCwgYSwga1s1XSwgMjEsIC01NzQzNDA1NSk7XG5hID0gaWkoYSwgYiwgYywgZCwga1sxMl0sIDYsICAxNzAwNDg1NTcxKTtcbmQgPSBpaShkLCBhLCBiLCBjLCBrWzNdLCAxMCwgLTE4OTQ5ODY2MDYpO1xuYyA9IGlpKGMsIGQsIGEsIGIsIGtbMTBdLCAxNSwgLTEwNTE1MjMpO1xuYiA9IGlpKGIsIGMsIGQsIGEsIGtbMV0sIDIxLCAtMjA1NDkyMjc5OSk7XG5hID0gaWkoYSwgYiwgYywgZCwga1s4XSwgNiwgIDE4NzMzMTMzNTkpO1xuZCA9IGlpKGQsIGEsIGIsIGMsIGtbMTVdLCAxMCwgLTMwNjExNzQ0KTtcbmMgPSBpaShjLCBkLCBhLCBiLCBrWzZdLCAxNSwgLTE1NjAxOTgzODApO1xuYiA9IGlpKGIsIGMsIGQsIGEsIGtbMTNdLCAyMSwgIDEzMDkxNTE2NDkpO1xuYSA9IGlpKGEsIGIsIGMsIGQsIGtbNF0sIDYsIC0xNDU1MjMwNzApO1xuZCA9IGlpKGQsIGEsIGIsIGMsIGtbMTFdLCAxMCwgLTExMjAyMTAzNzkpO1xuYyA9IGlpKGMsIGQsIGEsIGIsIGtbMl0sIDE1LCAgNzE4Nzg3MjU5KTtcbmIgPSBpaShiLCBjLCBkLCBhLCBrWzldLCAyMSwgLTM0MzQ4NTU1MSk7XG5cbnhbMF0gPSBhZGQzMihhLCB4WzBdKTtcbnhbMV0gPSBhZGQzMihiLCB4WzFdKTtcbnhbMl0gPSBhZGQzMihjLCB4WzJdKTtcbnhbM10gPSBhZGQzMihkLCB4WzNdKTtcblxufVxuXG5mdW5jdGlvbiBjbW4ocSwgYSwgYiwgeCwgcywgdCkge1xuYSA9IGFkZDMyKGFkZDMyKGEsIHEpLCBhZGQzMih4LCB0KSk7XG5yZXR1cm4gYWRkMzIoKGEgPDwgcykgfCAoYSA+Pj4gKDMyIC0gcykpLCBiKTtcbn1cblxuZnVuY3Rpb24gZmYoYSwgYiwgYywgZCwgeCwgcywgdCkge1xucmV0dXJuIGNtbigoYiAmIGMpIHwgKCh+YikgJiBkKSwgYSwgYiwgeCwgcywgdCk7XG59XG5cbmZ1bmN0aW9uIGdnKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbnJldHVybiBjbW4oKGIgJiBkKSB8IChjICYgKH5kKSksIGEsIGIsIHgsIHMsIHQpO1xufVxuXG5mdW5jdGlvbiBoaChhLCBiLCBjLCBkLCB4LCBzLCB0KSB7XG5yZXR1cm4gY21uKGIgXiBjIF4gZCwgYSwgYiwgeCwgcywgdCk7XG59XG5cbmZ1bmN0aW9uIGlpKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbnJldHVybiBjbW4oYyBeIChiIHwgKH5kKSksIGEsIGIsIHgsIHMsIHQpO1xufVxuXG5mdW5jdGlvbiBtZDUxKHMpIHtcbnR4dCA9ICcnO1xudmFyIG4gPSBzLmxlbmd0aCxcbnN0YXRlID0gWzE3MzI1ODQxOTMsIC0yNzE3MzM4NzksIC0xNzMyNTg0MTk0LCAyNzE3MzM4NzhdLCBpO1xuZm9yIChpPTY0OyBpPD1zLmxlbmd0aDsgaSs9NjQpIHtcbm1kNWN5Y2xlKHN0YXRlLCBtZDVibGsocy5zdWJzdHJpbmcoaS02NCwgaSkpKTtcbn1cbnMgPSBzLnN1YnN0cmluZyhpLTY0KTtcbnZhciB0YWlsID0gWzAsMCwwLDAsIDAsMCwwLDAsIDAsMCwwLDAsIDAsMCwwLDBdO1xuZm9yIChpPTA7IGk8cy5sZW5ndGg7IGkrKylcbnRhaWxbaT4+Ml0gfD0gcy5jaGFyQ29kZUF0KGkpIDw8ICgoaSU0KSA8PCAzKTtcbnRhaWxbaT4+Ml0gfD0gMHg4MCA8PCAoKGklNCkgPDwgMyk7XG5pZiAoaSA+IDU1KSB7XG5tZDVjeWNsZShzdGF0ZSwgdGFpbCk7XG5mb3IgKGk9MDsgaTwxNjsgaSsrKSB0YWlsW2ldID0gMDtcbn1cbnRhaWxbMTRdID0gbio4O1xubWQ1Y3ljbGUoc3RhdGUsIHRhaWwpO1xucmV0dXJuIHN0YXRlO1xufVxuXG4vKiB0aGVyZSBuZWVkcyB0byBiZSBzdXBwb3J0IGZvciBVbmljb2RlIGhlcmUsXG4gKiB1bmxlc3Mgd2UgcHJldGVuZCB0aGF0IHdlIGNhbiByZWRlZmluZSB0aGUgTUQtNVxuICogYWxnb3JpdGhtIGZvciBtdWx0aS1ieXRlIGNoYXJhY3RlcnMgKHBlcmhhcHNcbiAqIGJ5IGFkZGluZyBldmVyeSBmb3VyIDE2LWJpdCBjaGFyYWN0ZXJzIGFuZFxuICogc2hvcnRlbmluZyB0aGUgc3VtIHRvIDMyIGJpdHMpLiBPdGhlcndpc2VcbiAqIEkgc3VnZ2VzdCBwZXJmb3JtaW5nIE1ELTUgYXMgaWYgZXZlcnkgY2hhcmFjdGVyXG4gKiB3YXMgdHdvIGJ5dGVzLS1lLmcuLCAwMDQwIDAwMjUgPSBAJS0tYnV0IHRoZW5cbiAqIGhvdyB3aWxsIGFuIG9yZGluYXJ5IE1ELTUgc3VtIGJlIG1hdGNoZWQ/XG4gKiBUaGVyZSBpcyBubyB3YXkgdG8gc3RhbmRhcmRpemUgdGV4dCB0byBzb21ldGhpbmdcbiAqIGxpa2UgVVRGLTggYmVmb3JlIHRyYW5zZm9ybWF0aW9uOyBzcGVlZCBjb3N0IGlzXG4gKiB1dHRlcmx5IHByb2hpYml0aXZlLiBUaGUgSmF2YVNjcmlwdCBzdGFuZGFyZFxuICogaXRzZWxmIG5lZWRzIHRvIGxvb2sgYXQgdGhpczogaXQgc2hvdWxkIHN0YXJ0XG4gKiBwcm92aWRpbmcgYWNjZXNzIHRvIHN0cmluZ3MgYXMgcHJlZm9ybWVkIFVURi04XG4gKiA4LWJpdCB1bnNpZ25lZCB2YWx1ZSBhcnJheXMuXG4gKi9cbmZ1bmN0aW9uIG1kNWJsayhzKSB7IC8qIEkgZmlndXJlZCBnbG9iYWwgd2FzIGZhc3Rlci4gICAqL1xudmFyIG1kNWJsa3MgPSBbXSwgaTsgLyogQW5keSBLaW5nIHNhaWQgZG8gaXQgdGhpcyB3YXkuICovXG5mb3IgKGk9MDsgaTw2NDsgaSs9NCkge1xubWQ1Ymxrc1tpPj4yXSA9IHMuY2hhckNvZGVBdChpKVxuKyAocy5jaGFyQ29kZUF0KGkrMSkgPDwgOClcbisgKHMuY2hhckNvZGVBdChpKzIpIDw8IDE2KVxuKyAocy5jaGFyQ29kZUF0KGkrMykgPDwgMjQpO1xufVxucmV0dXJuIG1kNWJsa3M7XG59XG5cbnZhciBoZXhfY2hyID0gJzAxMjM0NTY3ODlhYmNkZWYnLnNwbGl0KCcnKTtcblxuZnVuY3Rpb24gcmhleChuKVxue1xudmFyIHM9JycsIGo9MDtcbmZvcig7IGo8NDsgaisrKVxucyArPSBoZXhfY2hyWyhuID4+IChqICogOCArIDQpKSAmIDB4MEZdXG4rIGhleF9jaHJbKG4gPj4gKGogKiA4KSkgJiAweDBGXTtcbnJldHVybiBzO1xufVxuXG5mdW5jdGlvbiBoZXgoeCkge1xuZm9yICh2YXIgaT0wOyBpPHgubGVuZ3RoOyBpKyspXG54W2ldID0gcmhleCh4W2ldKTtcbnJldHVybiB4LmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBtZDUocykge1xucmV0dXJuIGhleChtZDUxKHMpKTtcbn1cblxuLyogdGhpcyBmdW5jdGlvbiBpcyBtdWNoIGZhc3RlcixcbnNvIGlmIHBvc3NpYmxlIHdlIHVzZSBpdC4gU29tZSBJRXNcbmFyZSB0aGUgb25seSBvbmVzIEkga25vdyBvZiB0aGF0XG5uZWVkIHRoZSBpZGlvdGljIHNlY29uZCBmdW5jdGlvbixcbmdlbmVyYXRlZCBieSBhbiBpZiBjbGF1c2UuICAqL1xuXG5mdW5jdGlvbiBhZGQzMihhLCBiKSB7XG5yZXR1cm4gKGEgKyBiKSAmIDB4RkZGRkZGRkY7XG59XG5cbmlmIChtZDUoJ2hlbGxvJykgIT0gJzVkNDE0MDJhYmM0YjJhNzZiOTcxOWQ5MTEwMTdjNTkyJykge1xuZnVuY3Rpb24gYWRkMzIoeCwgeSkge1xudmFyIGxzdyA9ICh4ICYgMHhGRkZGKSArICh5ICYgMHhGRkZGKSxcbm1zdyA9ICh4ID4+IDE2KSArICh5ID4+IDE2KSArIChsc3cgPj4gMTYpO1xucmV0dXJuIChtc3cgPDwgMTYpIHwgKGxzdyAmIDB4RkZGRik7XG59XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBtZDU7IiwidmFyIEpvYlN0b3JlID0gcmVxdWlyZSgnLi9qb2Jfc3RvcmUnKTtcbnZhciBqb2JTdG9yZSA9IEpvYlN0b3JlKCk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEJ1aWxkU3RyaWRlcjtcblxuZnVuY3Rpb24gQnVpbGRTdHJpZGVyKCRyZXNvdXJjZSwgJGh0dHApIHtcbiAgcmV0dXJuIG5ldyBTdHJpZGVyKCRyZXNvdXJjZSwgJGh0dHApO1xufVxuXG5cbnZhciBzb2NrZXQ7XG52YXIgc2NvcGVzID0gW107XG5cbmZ1bmN0aW9uIFN0cmlkZXIoJHJlc291cmNlLCAkaHR0cCwgb3B0cykge1xuICBpZiAoISBvcHRzKSBvcHRzID0ge307XG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnc3RyaW5nJylcbiAgICBvcHRzID0geyB1cmw6IG9wdHMgfTtcblxuICB0aGlzLnVybCA9IG9wdHMudXJsIHx8ICcvL2xvY2FsaG9zdDozMDAwJztcblxuICAvLy8gUkVTVGZ1bCBBUEkgc2V0dXBcbiAgdmFyIGFwaUJhc2UgID0gdGhpcy51cmwgKyAnL2FwaSc7XG4gIHZhciBsb2dpblVSTCA9IHRoaXMudXJsICsgJy9sb2dpbic7XG4gIHRoaXMuU2Vzc2lvbiA9ICRyZXNvdXJjZShhcGlCYXNlICsgJy9zZXNzaW9uLycpO1xuICB0aGlzLlJlcG8gICAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvOm93bmVyLzpyZXBvLycpO1xuICB0aGlzLkpvYiAgICAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvOm93bmVyLzpyZXBvL2pvYi86am9iaWQnKTtcbiAgdGhpcy5Db25maWcgID0gJHJlc291cmNlKGFwaUJhc2UgKyAnLzpvd25lci86cmVwby9jb25maWcnLCB7fSwge1xuICAgIGdldDoge1xuICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgIH0sXG4gICAgc2F2ZToge1xuICAgICAgbWV0aG9kOiAnUFVUJ1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuUmVndWxhckNvbmZpZyAgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9jb25maWcnLCB7fSwge1xuICAgIHNhdmU6IHtcbiAgICAgIG1ldGhvZDogJ1BVVCdcbiAgICB9XG4gIH0pO1xuICB0aGlzLkNvbmZpZy5CcmFuY2ggPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9jb25maWcvOmJyYW5jaFxcXFwvJywge30sIHtcbiAgICBzYXZlOiB7XG4gICAgICBtZXRob2Q6ICdQVVQnXG4gICAgfVxuICB9KTtcbiAgdGhpcy5Db25maWcuQnJhbmNoLlJ1bm5lciA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NvbmZpZy86YnJhbmNoL3J1bm5lcicsIHt9LCB7XG4gICAgc2F2ZToge1xuICAgICAgbWV0aG9kOiAnUFVUJ1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuQ29uZmlnLkJyYW5jaC5QbHVnaW4gID0gJHJlc291cmNlKHRoaXMudXJsICsgJy86b3duZXIvOnJlcG8vY29uZmlnLzpicmFuY2gvOnBsdWdpbicsIHt9LCB7XG4gICAgc2F2ZToge1xuICAgICAgbWV0aG9kOiAnUFVUJ1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuUHJvdmlkZXIgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9wcm92aWRlcicpO1xuICB0aGlzLkNhY2hlICA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NhY2hlJyk7XG4gIHRoaXMuU3RhcnQgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9zdGFydCcpO1xuICB0aGlzLktleWdlbiA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2tleWdlbi86YnJhbmNoXFxcXC8nKTtcblxuICB0aGlzLlN0YXR1c0Jsb2NrcyA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvc3RhdHVzQmxvY2tzJywge30sIHtcbiAgICBnZXQ6IHtcbiAgICAgIG1ldGhvZDogJ0dFVCdcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMuam9icyAgICA9IGpvYlN0b3JlLmpvYnM7XG4gIHRoaXMucGhhc2VzICA9IEpvYlN0b3JlLnBoYXNlcztcblxuICB0aGlzLiRodHRwID0gJGh0dHA7XG59XG5cblxudmFyIFMgPSBTdHJpZGVyLnByb3RvdHlwZTtcblxuXG4vLy8gY2hhbmdlZCAtIGludm9rZWQgd2hlbiBVSSBuZWVkcyB1cGRhdGluZ1xuZnVuY3Rpb24gY2hhbmdlZCgpIHtcbiAgc2NvcGVzLmZvckVhY2goZnVuY3Rpb24oc2NvcGUpIHtcbiAgICBzY29wZS4kZGlnZXN0KCk7XG4gIH0pO1xufVxuXG5cbi8vLy8gLS0tLSBTdHJpZGVyIHByb3RvdHlwZSBmdW5jdGlvbnNcblxuLy8vIGNvbm5lY3RcblxuUy5jb25uZWN0ID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgaWYgKCEgc29ja2V0KSB7XG4gICAgc29ja2V0ID0gaW8uY29ubmVjdCh0aGlzLnVybCk7XG5cbiAgICAvLy8gY29ubmVjdHMgam9iIHN0b3JlIHRvIG5ldyBzb2NrZXRcbiAgICBqb2JTdG9yZS5jb25uZWN0KHNvY2tldCwgY2hhbmdlZCk7XG4gIH1cbiAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgc2NvcGVzLnB1c2goc2NvcGUpO1xuICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgZm9yICh2YXIgaSA9IDAgOyAhIGZvdW5kICYmIGkgPCBzY29wZXMubGVuZ3RoOyBpICsrKSB7XG4gICAgICBpZiAoc2NvcGVzW2ldID09IHNjb3BlKSB7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgc2NvcGVzLnNwbGljZShpLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufTtcblxuXG4vLy8gZGVwbG95XG5cblMuZGVwbG95ID0gZnVuY3Rpb24gZGVwbG95KHByb2plY3QpIHtcbiAgdGhpcy5zb2NrZXQuZW1pdCgnZGVwbG95JywgcHJvamVjdC5uYW1lIHx8IHByb2plY3QpO1xufTtcblxuUy50ZXN0ID0gZnVuY3Rpb24gdGVzdChwcm9qZWN0KSB7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ3Rlc3QnLCBwcm9qZWN0Lm5hbWUgfHwgcHJvamVjdCk7XG59O1xuXG5cbi8vLyBqb2JcblxuUy5qb2IgPSBmdW5jdGlvbiBqb2Ioam9iSWQsIGNiKSB7XG4gIGpvYlN0b3JlLmxvYWQoam9iSWQsIGNiKTtcbn07XG5cblxuLy8vIEhUVFBcblxuUy5wb3N0ID0gZnVuY3Rpb24odXJsLCBib2R5LCBjYikge1xuICByZXR1cm4gdGhpcy5yZXF1ZXN0KCdQT1NUJywgdXJsLCBib2R5LCBjYik7XG59O1xuXG5TLmRlbCA9IGZ1bmN0aW9uKHVybCwgYm9keSwgY2IpIHtcbiAgcmV0dXJuIHRoaXMucmVxdWVzdCgnREVMRVRFJywgdXJsLCBib2R5LCBjYik7XG59O1xuXG5TLmdldCA9IGZ1bmN0aW9uKHVybCwgY2IpIHtcbiAgcmV0dXJuIHRoaXMucmVxdWVzdCgnR0VUJywgdXJsLCBjYik7XG59O1xuXG5TLnJlcXVlc3QgPSBmdW5jdGlvbihtZXRob2QsIHVybCwgYm9keSwgY2IpIHtcbiAgaWYgKHR5cGVvZiBib2R5ID09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGJvZHk7XG4gICAgYm9keSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhciByZXEgPSB0aGlzLiRodHRwKHtcbiAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICB1cmw6IHRoaXMudXJsICsgdXJsLFxuICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGJvZHkpXG4gIH0pO1xuXG4gIHJlcS5zdWNjZXNzKGNiKTtcblxuICByZXR1cm4gcmVxO1xufSIsIm1vZHVsZS5leHBvcnRzID0gaGFzS2V5c1xuXG5mdW5jdGlvbiBoYXNLZXlzKHNvdXJjZSkge1xuICAgIHJldHVybiBzb3VyY2UgIT09IG51bGwgJiZcbiAgICAgICAgKHR5cGVvZiBzb3VyY2UgPT09IFwib2JqZWN0XCIgfHxcbiAgICAgICAgdHlwZW9mIHNvdXJjZSA9PT0gXCJmdW5jdGlvblwiKVxufVxuIiwidmFyIEtleXMgPSByZXF1aXJlKFwib2JqZWN0LWtleXNcIilcbnZhciBoYXNLZXlzID0gcmVxdWlyZShcIi4vaGFzLWtleXNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGlmICghaGFzS2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGtleXMgPSBLZXlzKHNvdXJjZSlcblxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0ga2V5c1tqXVxuICAgICAgICAgICAgdGFyZ2V0W25hbWVdID0gc291cmNlW25hbWVdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKGZuKSB7XG5cdHZhciBpc0Z1bmMgPSAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nICYmICEoZm4gaW5zdGFuY2VvZiBSZWdFeHApKSB8fCB0b1N0cmluZy5jYWxsKGZuKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblx0aWYgKCFpc0Z1bmMgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRpc0Z1bmMgPSBmbiA9PT0gd2luZG93LnNldFRpbWVvdXQgfHwgZm4gPT09IHdpbmRvdy5hbGVydCB8fCBmbiA9PT0gd2luZG93LmNvbmZpcm0gfHwgZm4gPT09IHdpbmRvdy5wcm9tcHQ7XG5cdH1cblx0cmV0dXJuIGlzRnVuYztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XG5cdGlmICghaXNGdW5jdGlvbihmbikpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdpdGVyYXRvciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblx0fVxuXHR2YXIgaSwgayxcblx0XHRpc1N0cmluZyA9IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnLFxuXHRcdGwgPSBvYmoubGVuZ3RoLFxuXHRcdGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IG51bGw7XG5cdGlmIChsID09PSArbCkge1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdGlmIChjb250ZXh0ID09PSBudWxsKSB7XG5cdFx0XHRcdGZuKGlzU3RyaW5nID8gb2JqLmNoYXJBdChpKSA6IG9ialtpXSwgaSwgb2JqKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZuLmNhbGwoY29udGV4dCwgaXNTdHJpbmcgPyBvYmouY2hhckF0KGkpIDogb2JqW2ldLCBpLCBvYmopO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRmb3IgKGsgaW4gb2JqKSB7XG5cdFx0XHRpZiAoaGFzT3duLmNhbGwob2JqLCBrKSkge1xuXHRcdFx0XHRpZiAoY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdGZuKG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmbi5jYWxsKGNvbnRleHQsIG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBPYmplY3Qua2V5cyB8fCByZXF1aXJlKCcuL3NoaW0nKTtcblxuIiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuXHR2YXIgc3RyID0gdG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG5cdHZhciBpc0FyZ3VtZW50cyA9IHN0ciA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG5cdGlmICghaXNBcmd1bWVudHMpIHtcblx0XHRpc0FyZ3VtZW50cyA9IHN0ciAhPT0gJ1tvYmplY3QgQXJyYXldJ1xuXHRcdFx0JiYgdmFsdWUgIT09IG51bGxcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInXG5cdFx0XHQmJiB2YWx1ZS5sZW5ndGggPj0gMFxuXHRcdFx0JiYgdG9TdHJpbmcuY2FsbCh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHR9XG5cdHJldHVybiBpc0FyZ3VtZW50cztcbn07XG5cbiIsIihmdW5jdGlvbiAoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8vIG1vZGlmaWVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9lczUtc2hpbVxuXHR2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcblx0XHR0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdFx0Zm9yRWFjaCA9IHJlcXVpcmUoJy4vZm9yZWFjaCcpLFxuXHRcdGlzQXJncyA9IHJlcXVpcmUoJy4vaXNBcmd1bWVudHMnKSxcblx0XHRoYXNEb250RW51bUJ1ZyA9ICEoeyd0b1N0cmluZyc6IG51bGx9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKSxcblx0XHRoYXNQcm90b0VudW1CdWcgPSAoZnVuY3Rpb24gKCkge30pLnByb3BlcnR5SXNFbnVtZXJhYmxlKCdwcm90b3R5cGUnKSxcblx0XHRkb250RW51bXMgPSBbXG5cdFx0XHRcInRvU3RyaW5nXCIsXG5cdFx0XHRcInRvTG9jYWxlU3RyaW5nXCIsXG5cdFx0XHRcInZhbHVlT2ZcIixcblx0XHRcdFwiaGFzT3duUHJvcGVydHlcIixcblx0XHRcdFwiaXNQcm90b3R5cGVPZlwiLFxuXHRcdFx0XCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLFxuXHRcdFx0XCJjb25zdHJ1Y3RvclwiXG5cdFx0XSxcblx0XHRrZXlzU2hpbTtcblxuXHRrZXlzU2hpbSA9IGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG5cdFx0dmFyIGlzT2JqZWN0ID0gb2JqZWN0ICE9PSBudWxsICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnLFxuXHRcdFx0aXNGdW5jdGlvbiA9IHRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcblx0XHRcdGlzQXJndW1lbnRzID0gaXNBcmdzKG9iamVjdCksXG5cdFx0XHR0aGVLZXlzID0gW107XG5cblx0XHRpZiAoIWlzT2JqZWN0ICYmICFpc0Z1bmN0aW9uICYmICFpc0FyZ3VtZW50cykge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5rZXlzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG5cdFx0fVxuXG5cdFx0aWYgKGlzQXJndW1lbnRzKSB7XG5cdFx0XHRmb3JFYWNoKG9iamVjdCwgZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdHRoZUtleXMucHVzaCh2YWx1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIG5hbWUsXG5cdFx0XHRcdHNraXBQcm90byA9IGhhc1Byb3RvRW51bUJ1ZyAmJiBpc0Z1bmN0aW9uO1xuXG5cdFx0XHRmb3IgKG5hbWUgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdGlmICghKHNraXBQcm90byAmJiBuYW1lID09PSAncHJvdG90eXBlJykgJiYgaGFzLmNhbGwob2JqZWN0LCBuYW1lKSkge1xuXHRcdFx0XHRcdHRoZUtleXMucHVzaChuYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChoYXNEb250RW51bUJ1Zykge1xuXHRcdFx0dmFyIGN0b3IgPSBvYmplY3QuY29uc3RydWN0b3IsXG5cdFx0XHRcdHNraXBDb25zdHJ1Y3RvciA9IGN0b3IgJiYgY3Rvci5wcm90b3R5cGUgPT09IG9iamVjdDtcblxuXHRcdFx0Zm9yRWFjaChkb250RW51bXMsIGZ1bmN0aW9uIChkb250RW51bSkge1xuXHRcdFx0XHRpZiAoIShza2lwQ29uc3RydWN0b3IgJiYgZG9udEVudW0gPT09ICdjb25zdHJ1Y3RvcicpICYmIGhhcy5jYWxsKG9iamVjdCwgZG9udEVudW0pKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKGRvbnRFbnVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGVLZXlzO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0ga2V5c1NoaW07XG59KCkpO1xuXG4iXX0=
;