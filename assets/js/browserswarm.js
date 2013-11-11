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

/// Dynamic Controllers


},{"./strider":21}],2:[function(require,module,exports){

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
        plugin: name },
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
},{"../app":1,"./config/_fix_template":4}],4:[function(require,module,exports){
module.exports = fixTemplate;

function fixTemplate(s) {
  return s.
    replace(/\[\[/g, '{{').
    replace(/\]\]/g, '}}');
}
},{}],5:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.CollaboratorsCtrl', ['$scope', CollaboratorsCtrl]);

function CollaboratorsCtrl($scope) {
  $scope.new_email = '';
  $scope.new_access = 0;
  $scope.collaborators = window.collaborators || [];
  $scope.remove = function (item) {
    item.loading = true;
    $scope.clearMessage();
    $.ajax({
      url: '/' + $scope.project.name + '/collaborators/',
      type: 'DELETE',
      data: {email: item.email},
      success: function(data, ts, xhr) {
        remove($scope.collaborators, item);
        $scope.success(item.email + " is no longer a collaborator on this project.", true);
      },
      error: function(xhr, ts, e) {
        item.loading = false;
        if (xhr && xhr.responseText) {
          var data = $.parseJSON(xhr.responseText);
          $scope.error("Error deleting collaborator: " + data.errors[0], true);
        } else {
          $scope.error("Error deleting collaborator: " + e, true);
        }
      }
    });
  };
  $scope.add = function () {
    var data = {
      email: $scope.new_email,
      access: $scope.new_access || 0,
      gravatar: $scope.gravatar($scope.new_email),
      owner: false
    };

    $.ajax({
      url: '/' + $scope.project.name + '/collaborators/',
      type: "POST",
      data: data,
      dataType: "json",
      success: function(res, ts, xhr) {
        $scope.new_access = 0;
        $scope.new_email = '';
        if (res.created) {
          $scope.collaborators.push(data);
        }
        $scope.success(res.message, true, !res.created);
      },
      error: function(xhr, ts, e) {
        if (xhr && xhr.responseText) {
          var data = $.parseJSON(xhr.responseText);
          $scope.error("Error adding collaborator: " + data.errors[0], true);
        } else {
          $scope.error("Error adding collaborator: " + e, true);
        }
      }
    });
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

  console.log('Githubbing scope 2');

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

App.controller('Config.HerokuController', ['$scope', HerokuCtrl]);

function HerokuCtrl($scope, $element) {
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
    $.ajax('/ext/heroku/apps/' + $scope.account.id, {
      type: 'GET',
      success: function (body, req) {
        $scope.account.cache = body;
        $scope.success('Got accounts list for ' + $scope.account.email, true);
      },
      error: function () {
        $scope.error('Failed to get accounts list for ' + $scope.account.email, true);
      }
    });
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

  console.log('SauceCtrl scope 2');

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
},{"xtend":23}],21:[function(require,module,exports){
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
  this.Cache   = $resource(this.url + '/:owner/:repo/cache');
  this.Start = $resource(this.url + '/:owner/:repo/start');
  this.Keygen  = $resource(this.url + '/:owner/:repo/keygen/:branch\\/');

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

S.del = function(url, cb) {
  return this.request('DELETE', url, cb);
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
},{"./job_store":20}],22:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],23:[function(require,module,exports){
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

},{"./has-keys":22,"object-keys":25}],24:[function(require,module,exports){
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


},{}],25:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":27}],26:[function(require,module,exports){
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


},{}],27:[function(require,module,exports){
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


},{"./foreach":24,"./isArguments":26}]},{},[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,19,18])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2FwcC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvYWxlcnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2NvbmZpZy9fZml4X3RlbXBsYXRlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvY29sbGFib3JhdG9ycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL2Vudmlyb25tZW50LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvZ2l0aHViLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvaGVyb2t1LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvam9iLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvbm9kZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3J1bm5lci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3NhdWNlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvd2ViaG9va3MuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2Rhc2hib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvZXJyb3IuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2pvYi5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvbG9naW4uanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2RpcmVjdGl2ZXMvZHluYW1pY19jb250cm9sbGVyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9maWx0ZXJzL2Fuc2kuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2pvYl9zdG9yZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvc3RyaWRlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvaGFzLWtleXMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL2luZGV4LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvZm9yZWFjaC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2luZGV4LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvaXNBcmd1bWVudHMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9zaGltLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2haQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFN0cmlkZXIgPSByZXF1aXJlKCcuL3N0cmlkZXInKTtcblxudmFyIEFwcCA9XG5leHBvcnRzID1cbm1vZHVsZS5leHBvcnRzID1cbmFuZ3VsYXIubW9kdWxlKCdCcm93c2VyU3dhcm1BcHAnLCBbJ25nUm91dGUnLCAnbmdSZXNvdXJjZScsICduZ1Nhbml0aXplJ10pO1xuXG4vLy8gQXBwIENvbmZpZ3VyYXRpb25cblxuQXBwLlxuICBjb25maWcoWyckcm91dGVQcm92aWRlcicsICckbG9jYXRpb25Qcm92aWRlcicsICckaHR0cFByb3ZpZGVyJywgY29uZmlndXJlQXBwXSkuXG4gIGZhY3RvcnkoJ1N0cmlkZXInLCBbJyRyZXNvdXJjZScsICckaHR0cCcsIFN0cmlkZXJdKTtcblxuZnVuY3Rpb24gY29uZmlndXJlQXBwKCRyb3V0ZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJGh0dHBQcm92aWRlcikge1xuXG4gIC8vLyBIVFRQXG5cbiAgLy8vIEFsd2F5cyBkbyBIVFRQIHJlcXVlc3RzIHdpdGggY3JlZGVudGlhbHMsXG4gIC8vLyBlZmZlY3RpdmVseSBzZW5kaW5nIG91dCB0aGUgc2Vzc2lvbiBjb29raWVcbiAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gIHZhciBpbnRlcmNlcHRvciA9IFsnJHJvb3RTY29wZScsICckcScsIGZ1bmN0aW9uKCRzY29wZSwgJHEpIHtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlcnJvcihyZXNwb25zZSkge1xuICAgICAgdmFyIHN0YXR1cyA9IHJlc3BvbnNlLnN0YXR1cztcblxuICAgICAgdmFyIHJlc3AgPSByZXNwb25zZS5kYXRhO1xuICAgICAgaWYgKHJlc3ApIHRyeSB7IHJlc3AgPSBKU09OLnBhcnNlKHJlc3ApOyB9IGNhdGNoKGVycikgeyB9XG5cbiAgICAgIGlmIChyZXNwLm1lc3NhZ2UpIHJlc3AgPSByZXNwLm1lc3NhZ2U7XG4gICAgICBpZiAoISByZXNwKSB7XG4gICAgICAgIHJlc3AgPSAnRXJyb3IgaW4gcmVzcG9uc2UnO1xuICAgICAgICBpZiAoc3RhdHVzKSByZXNwICs9ICcgKCcgKyBzdGF0dXMgKyAnKSc7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS4kZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IocmVzcCkpO1xuXG4gICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oc3VjY2VzcywgZXJyb3IpO1xuICAgIH1cblxuICB9XTtcblxuICAkaHR0cFByb3ZpZGVyLnJlc3BvbnNlSW50ZXJjZXB0b3JzLnB1c2goaW50ZXJjZXB0b3IpO1xuXG5cbiAgLy8vIEVuYWJsZSBoYXNoYmFuZy1sZXNzIHJvdXRlc1xuXG4gICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLy8gUm91dGVzXG5cbiAgJHJvdXRlUHJvdmlkZXIuXG4gICAgd2hlbignL2Rhc2hib2FyZCcsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2Rhc2hib2FyZC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdEYXNoYm9hcmRDdHJsJ1xuICAgIH0pLlxuICAgIHdoZW4oJy9sb2dpbicsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2xvZ2luLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KS5cbiAgICB3aGVuKCcvOm93bmVyLzpyZXBvL2NvbmZpZycsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2NvbmZpZy9pbmRleC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdDb25maWdDdHJsJyxcbiAgICAgIHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuICAgIH0pLlxuICAgIHdoZW4oJy86b3duZXIvOnJlcG8nLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9wYXJ0aWFscy9qb2IuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiAnSm9iQ3RybCdcbiAgICB9KS5cbiAgICB3aGVuKCcvOm93bmVyLzpyZXBvL2pvYi86am9iaWQnLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9wYXJ0aWFscy9qb2IuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiAnSm9iQ3RybCdcbiAgICB9KTtcblxufVxuXG4vLy8gRHluYW1pYyBDb250cm9sbGVyc1xuXG4iLCJcbnZhciBhcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuYXBwLmNvbnRyb2xsZXIoJ0FsZXJ0c0N0cmwnLCBbJyRzY29wZScsICckc2NlJywgZnVuY3Rpb24gKCRzY29wZSwgJHNjZSkge1xuICAkc2NvcGUubWVzc2FnZSA9IG51bGw7XG5cbiAgJHNjb3BlLmVycm9yID0gZnVuY3Rpb24gKHRleHQsIGRpZ2VzdCkge1xuICAgICRzY29wZS5tZXNzYWdlID0ge1xuICAgICAgdGV4dDogJHNjZS50cnVzdEFzSHRtbCh0ZXh0KSxcbiAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICBzaG93aW5nOiB0cnVlXG4gICAgfTtcbiAgICBpZiAoZGlnZXN0KSAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICB9O1xuXG4gICRzY29wZS5pbmZvID0gZnVuY3Rpb24gKHRleHQsIGRpZ2VzdCkge1xuICAgICRzY29wZS5tZXNzYWdlID0ge1xuICAgICAgdGV4dDogJHNjZS50cnVzdEFzSHRtbCh0ZXh0KSxcbiAgICAgIHR5cGU6ICdpbmZvJyxcbiAgICAgIHNob3dpbmc6IHRydWVcbiAgICB9O1xuICAgIGlmIChkaWdlc3QpICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gIH07XG4gIHZhciB3YWl0VGltZSA9IG51bGw7XG5cbiAgJHNjb3BlLnN1Y2Nlc3MgPSBmdW5jdGlvbiAodGV4dCwgZGlnZXN0LCBzdGlja3kpIHtcbiAgICBpZiAod2FpdFRpbWUpIHtcbiAgICAgIGNsZWFyVGltZW91dCh3YWl0VGltZSk7XG4gICAgICB3YWl0VGltZSA9IG51bGw7XG4gICAgfVxuICAgIGlmIChjbGVhclRpbWUpIHtcbiAgICAgIGNsZWFyVGltZW91dChjbGVhclRpbWUpO1xuICAgICAgY2xlYXJUaW1lID0gbnVsbDtcbiAgICB9XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSB7XG4gICAgICB0ZXh0OiAkc2NlLnRydXN0QXNIdG1sKCc8c3Ryb25nPkRvbmUuPC9zdHJvbmc+ICcgKyB0ZXh0KSxcbiAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgIHNob3dpbmc6IHRydWVcbiAgICB9O1xuICAgIGlmICghc3RpY2t5KSB7XG4gICAgICB3YWl0VGltZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUuY2xlYXJNZXNzYWdlKCk7XG4gICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgICB9LCA1MDAwKTtcbiAgICB9XG4gICAgaWYgKGRpZ2VzdCkgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgfTtcbiAgdmFyIGNsZWFyVGltZSA9IG51bGw7XG5cbiAgJHNjb3BlLmNsZWFyTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoY2xlYXJUaW1lKSB7XG4gICAgICBjbGVhclRpbWVvdXQoY2xlYXJUaW1lKTtcbiAgICB9XG4gICAgaWYgKCRzY29wZS5tZXNzYWdlKSB7XG4gICAgICAkc2NvcGUubWVzc2FnZS5zaG93aW5nID0gZmFsc2U7XG4gICAgfVxuICAgIGNsZWFyVGltZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgY2xlYXJUaW1lID0gbnVsbDtcbiAgICAgICRzY29wZS5tZXNzYWdlID0gbnVsbDtcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSwgMTAwMCk7XG4gIH07XG59XSk7XG4iLCJ2YXIgQXBwICAgICAgICAgPSByZXF1aXJlKCcuLi9hcHAnKTtcbnZhciBmaXhUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vY29uZmlnL19maXhfdGVtcGxhdGUnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZ0N0cmwnLCBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnJHNjZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIENvbmZpZ0N0cmxdKTtcblxuZnVuY3Rpb24gQ29uZmlnQ3RybCgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJHNjZSwgJGxvY2F0aW9uLCBTdHJpZGVyKSB7XG5cbiAgdmFyIHByb2plY3RTZWFyY2hPcHRpb25zID0ge1xuICAgIG93bmVyOiAkcm91dGVQYXJhbXMub3duZXIsXG4gICAgcmVwbzogJHJvdXRlUGFyYW1zLnJlcG9cbiAgfTtcblxuICBTdHJpZGVyLkNvbmZpZy5nZXQocHJvamVjdFNlYXJjaE9wdGlvbnMsIGZ1bmN0aW9uKGNvbmYpIHtcblxuICAgIC8vLyBGaXggYW5kIHRydXN0IHJlbW90ZSBIVE1MXG5cbiAgICBPYmplY3Qua2V5cyhjb25mLnBsdWdpbnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBjb25mLnBsdWdpbnNba2V5XS5odG1sID0gJHNjZS50cnVzdEFzSHRtbChcbiAgICAgICAgZml4VGVtcGxhdGUoY29uZi5wbHVnaW5zW2tleV0uaHRtbCkpO1xuICAgIH0pO1xuXG4gICAgT2JqZWN0LmtleXMoY29uZi5ydW5uZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgY29uZi5ydW5uZXJzW2tleV0uaHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwoXG4gICAgICAgIGZpeFRlbXBsYXRlKGNvbmYucnVubmVyc1trZXldLmh0bWwpKTtcbiAgICB9KTtcblxuICAgIGlmIChjb25mLnByb3ZpZGVyKSB7XG4gICAgICBjb25mLnByb3ZpZGVyLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKFxuICAgICAgICBmaXhUZW1wbGF0ZShjb25mLnByb3ZpZGVyLmh0bWwpKTtcbiAgICB9XG5cbiAgICAvLy8gR2V0IGFsbCB0aGUgY29uZiBpbnRvIHRoZSBzY29wZSBmb3IgcmVuZGVyaW5nXG5cbiAgICAkc2NvcGUucHJvamVjdCA9IGNvbmYucHJvamVjdDtcbiAgICAkc2NvcGUucHJvdmlkZXIgPSBjb25mLnByb3ZpZGVyO1xuICAgICRzY29wZS5wbHVnaW5zID0gY29uZi5wbHVnaW5zO1xuICAgICRzY29wZS5ydW5uZXJzID0gY29uZi5ydW5uZXJzO1xuICAgICRzY29wZS5icmFuY2hlcyA9IGNvbmYuYnJhbmNoZXMgfHwgW107XG4gICAgJHNjb3BlLnN0YXR1c0Jsb2NrcyA9IGNvbmYuc3RhdHVzQmxvY2tzO1xuICAgICRzY29wZS5jb2xsYWJvcmF0b3JzID0gY29uZi5jb2xsYWJvcmF0b3JzO1xuICAgICRzY29wZS51c2VySXNDcmVhdG9yID0gY29uZi51c2VySXNDcmVhdG9yO1xuICAgICRzY29wZS51c2VyQ29uZmlncyA9IGNvbmYudXNlckNvbmZpZ3M7XG4gICAgJHNjb3BlLmNvbmZpZ3VyZWQgPSB7fTtcblxuICAgICRzY29wZS5icmFuY2ggPSAkc2NvcGUucHJvamVjdC5icmFuY2hlc1swXTtcbiAgICAkc2NvcGUuZGlzYWJsZWRfcGx1Z2lucyA9IHt9O1xuICAgICRzY29wZS5jb25maWdzID0ge307XG4gICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3MgPSB7fTtcblxuICAgICRzY29wZS5hcGlfcm9vdCA9ICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2FwaS8nO1xuXG4gICAgJHNjb3BlLnJlZnJlc2hCcmFuY2hlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICB0aHJvdyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRFbmFibGVkID0gZnVuY3Rpb24gKHBsdWdpbiwgZW5hYmxlZCkge1xuICAgICAgJHNjb3BlLmNvbmZpZ3NbJHNjb3BlLmJyYW5jaC5uYW1lXVtwbHVnaW5dLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgc2F2ZVBsdWdpbk9yZGVyKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlUGx1Z2luT3JkZXIgPSBzYXZlUGx1Z2luT3JkZXI7XG5cbiAgICAkc2NvcGUuc3dpdGNoVG9NYXN0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLnByb2plY3QuYnJhbmNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldLm5hbWUgPT09ICdtYXN0ZXInKSB7XG4gICAgICAgICAgJHNjb3BlLmJyYW5jaCA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5jbGVhcmluZ0NhY2hlID0gdHJ1ZTtcbiAgICAgIFN0cmlkZXIuQ2FjaGUuZGVsZXRlKHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuY2xlYXJpbmdDYWNoZSA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnQ2xlYXJlZCB0aGUgY2FjaGUnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkc2NvcGUudG9nZ2xlQnJhbmNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCRzY29wZS5icmFuY2gubWlycm9yX21hc3Rlcikge1xuICAgICAgICAkc2NvcGUuYnJhbmNoLm1pcnJvcl9tYXN0ZXIgPSBmYWxzZTtcbiAgICAgICAgdmFyIG5hbWUgPSAkc2NvcGUuYnJhbmNoLm5hbWVcbiAgICAgICAgICAsIG1hc3RlcjtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS5wcm9qZWN0LmJyYW5jaGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldLm5hbWUgPT09ICdtYXN0ZXInKSB7XG4gICAgICAgICAgICBtYXN0ZXIgPSAkc2NvcGUucHJvamVjdC5icmFuY2hlc1tpXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYnJhbmNoID0gJC5leHRlbmQodHJ1ZSwgJHNjb3BlLmJyYW5jaCwgbWFzdGVyKTtcbiAgICAgICAgJHNjb3BlLmJyYW5jaC5uYW1lID0gbmFtZTtcbiAgICAgICAgaW5pdEJyYW5jaCgkc2NvcGUuYnJhbmNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5icmFuY2gubWlycm9yX21hc3RlciA9IHRydWU7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc2F2ZUdlbmVyYWxCcmFuY2godHJ1ZSk7XG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2JyYW5jaC5taXJyb3JfbWFzdGVyJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRhYiA9IHZhbHVlICYmIHZhbHVlLm5hbWUgPT09ICdtYXN0ZXInID8gJ3Byb2plY3QnIDogJ2Jhc2ljJztcbiAgICAgICAgJCgnIycgKyB0YWIgKyAnLXRhYi1oYW5kbGUnKS50YWIoJ3Nob3cnKTtcbiAgICAgICAgJCgnLnRhYi1wYW5lLmFjdGl2ZScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3RhYi0nICsgdGFiKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICB9LCAwKTtcbiAgICB9KTtcbiAgICAkc2NvcGUuJHdhdGNoKCdicmFuY2gnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdGFiID0gdmFsdWUgJiYgdmFsdWUubmFtZSA9PT0gJ21hc3RlcicgPyAncHJvamVjdCcgOiAnYmFzaWMnO1xuICAgICAgICAkKCcjJyArIHRhYiArICctdGFiLWhhbmRsZScpLnRhYignc2hvdycpO1xuICAgICAgICAkKCcudGFiLXBhbmUuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjdGFiLScgKyB0YWIpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgIH0sIDApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnNldFJ1bm5lciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAkc2NvcGUuYnJhbmNoLnJ1bm5lciA9IHtcbiAgICAgICAgaWQ6IG5hbWUsXG4gICAgICAgIGNvbmZpZzogJHNjb3BlLnJ1bm5lckNvbmZpZ3NbbmFtZV1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUNvbmZpZ3VyZWQoKSB7XG4gICAgICB2YXIgcGx1Z2lucyA9ICRzY29wZS5icmFuY2gucGx1Z2lucztcbiAgICAgICRzY29wZS5jb25maWd1cmVkWyRzY29wZS5icmFuY2gubmFtZV0gPSB7fTtcbiAgICAgIGZvciAodmFyIGk9MDsgaTxwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICRzY29wZS5jb25maWd1cmVkWyRzY29wZS5icmFuY2gubmFtZV1bcGx1Z2luc1tpXS5pZF0gPSB0cnVlO1xuICAgICAgfVxuICAgICAgc2F2ZVBsdWdpbk9yZGVyKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2F2ZVBsdWdpbk9yZGVyKCkge1xuICAgICAgdmFyIHBsdWdpbnMgPSAkc2NvcGUuYnJhbmNoLnBsdWdpbnNcbiAgICAgICAgLCBicmFuY2ggPSAkc2NvcGUuYnJhbmNoXG4gICAgICAgICwgZGF0YSA9IFtdO1xuXG4gICAgICBmb3IgKHZhciBpPTA7IGk8cGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkYXRhLnB1c2goe1xuICAgICAgICAgIGlkOiBwbHVnaW5zW2ldLmlkLFxuICAgICAgICAgIGVuYWJsZWQ6IHBsdWdpbnNbaV0uZW5hYmxlZCxcbiAgICAgICAgICBzaG93U3RhdHVzOiBwbHVnaW5zW2ldLnNob3dTdGF0dXNcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIFN0cmlkZXIuQ29uZmlnLkJyYW5jaC5zYXZlKFxuICAgICAgICB7XG4gICAgICAgICAgb3duZXI6IHByb2plY3RTZWFyY2hPcHRpb25zLm93bmVyLFxuICAgICAgICAgIHJlcG86ICBwcm9qZWN0U2VhcmNoT3B0aW9ucy5yZXBvLFxuICAgICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUgfSxcbiAgICAgICAge1xuICAgICAgICAgIHBsdWdpbl9vcmRlcjogZGF0YX0sXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnUGx1Z2luIG9yZGVyIG9uIGJyYW5jaCAnICsgYnJhbmNoLm5hbWUgKyAnIHNhdmVkLicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG9wdGlvbnMgZm9yIHRoZSBpblVzZSBwbHVnaW4gc29ydGFibGVcbiAgICAkc2NvcGUuaW5Vc2VPcHRpb25zID0ge1xuICAgICAgY29ubmVjdFdpdGg6ICcuZGlzYWJsZWQtcGx1Z2lucy1saXN0JyxcbiAgICAgIGRpc3RhbmNlOiA1LFxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAoZSwgdWkpIHtcbiAgICAgICAgdXBkYXRlQ29uZmlndXJlZCgpO1xuICAgICAgfSxcbiAgICAgIHJlY2VpdmU6IGZ1bmN0aW9uIChlLCB1aSkge1xuICAgICAgICB1cGRhdGVDb25maWd1cmVkKCk7XG4gICAgICAgIHZhciBwbHVnaW5zID0gJHNjb3BlLmJyYW5jaC5wbHVnaW5zO1xuICAgICAgICBwbHVnaW5zW3VpLml0ZW0uaW5kZXgoKV0uZW5hYmxlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGluaXRCcmFuY2goYnJhbmNoKSB7XG4gICAgICB2YXIgcGx1Z2lucztcblxuICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbYnJhbmNoLm5hbWVdID0ge307XG4gICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV0gPSB7fTtcbiAgICAgICRzY29wZS5ydW5uZXJDb25maWdzW2JyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgJHNjb3BlLmRpc2FibGVkX3BsdWdpbnNbYnJhbmNoLm5hbWVdID0gW107XG5cbiAgICAgIGlmICghYnJhbmNoLm1pcnJvcl9tYXN0ZXIpIHtcbiAgICAgICAgcGx1Z2lucyA9IGJyYW5jaC5wbHVnaW5zO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8cGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICRzY29wZS5jb25maWd1cmVkW2JyYW5jaC5uYW1lXVtwbHVnaW5zW2ldLmlkXSA9IHRydWU7XG4gICAgICAgICAgJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW3BsdWdpbnNbaV0uaWRdID0gcGx1Z2luc1tpXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBwbHVnaW4gaW4gJHNjb3BlLnBsdWdpbnMpIHtcbiAgICAgICAgaWYgKCRzY29wZS5jb25maWd1cmVkW2JyYW5jaC5uYW1lXVtwbHVnaW5dKSBjb250aW51ZTtcbiAgICAgICAgJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW3BsdWdpbl0gPSB7XG4gICAgICAgICAgaWQ6IHBsdWdpbixcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZzoge31cbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmRpc2FibGVkX3BsdWdpbnNbYnJhbmNoLm5hbWVdLnB1c2goJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW3BsdWdpbl0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWJyYW5jaC5taXJyb3JfbWFzdGVyKSB7XG4gICAgICAgICRzY29wZS5ydW5uZXJDb25maWdzW2JyYW5jaC5uYW1lXVticmFuY2gucnVubmVyLmlkXSA9IGJyYW5jaC5ydW5uZXIuY29uZmlnO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgcnVubmVyIGluICRzY29wZS5ydW5uZXJzKSB7XG4gICAgICAgIGlmICghYnJhbmNoLm1pcnJvcl9tYXN0ZXIgJiYgcnVubmVyID09PSBicmFuY2gucnVubmVyLmlkKSBjb250aW51ZTtcbiAgICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdW3J1bm5lcl0gPSB7fTtcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdFBsdWdpbnMoKSB7XG4gICAgICB2YXIgYnJhbmNoZXMgPSAkc2NvcGUucHJvamVjdC5icmFuY2hlc1xuICAgICAgZm9yICh2YXIgaT0wOyBpPGJyYW5jaGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGluaXRCcmFuY2goYnJhbmNoZXNbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS5zYXZlR2VuZXJhbEJyYW5jaCA9IGZ1bmN0aW9uIChwbHVnaW5zKSB7XG4gICAgICB2YXIgYnJhbmNoID0gJHNjb3BlLmJyYW5jaFxuICAgICAgICAsIGRhdGEgPSB7XG4gICAgICAgICAgICBhY3RpdmU6IGJyYW5jaC5hY3RpdmUsXG4gICAgICAgICAgICBwcml2a2V5OiBicmFuY2gucHJpdmtleSxcbiAgICAgICAgICAgIHB1YmtleTogYnJhbmNoLnB1YmtleSxcbiAgICAgICAgICAgIGVudktleXM6IGJyYW5jaC5lbnZLZXlzLFxuICAgICAgICAgICAgbWlycm9yX21hc3RlcjogYnJhbmNoLm1pcnJvcl9tYXN0ZXIsXG4gICAgICAgICAgICBkZXBsb3lfb25fZ3JlZW46IGJyYW5jaC5kZXBsb3lfb25fZ3JlZW4sXG4gICAgICAgICAgICBydW5uZXI6IGJyYW5jaC5ydW5uZXJcbiAgICAgICAgICB9O1xuICAgICAgaWYgKHBsdWdpbnMpIHtcbiAgICAgICAgZGF0YS5wbHVnaW5zID0gYnJhbmNoLnBsdWdpbnM7XG4gICAgICB9XG4gICAgICBTdHJpZGVyLkNvbmZpZy5CcmFuY2guc2F2ZShcbiAgICAgICAge1xuICAgICAgICAgIG93bmVyOiBwcm9qZWN0U2VhcmNoT3B0aW9ucy5vd25lcixcbiAgICAgICAgICByZXBvOiAgcHJvamVjdFNlYXJjaE9wdGlvbnMucmVwbyxcbiAgICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lIH0sXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnR2VuZXJhbCBjb25maWcgZm9yIGJyYW5jaCAnICsgYnJhbmNoLm5hbWUgKyAnIHNhdmVkLicpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZ2VuZXJhdGVLZXlQYWlyID0gZnVuY3Rpb24gKCkge1xuICAgICAgYm9vdGJveC5jb25maXJtKCdSZWFsbHkgZ2VuZXJhdGUgYSBuZXcga2V5cGFpcj8gVGhpcyBjb3VsZCBicmVhayB0aGluZ3MgaWYgeW91IGhhdmUgcGx1Z2lucyB0aGF0IHVzZSB0aGUgY3VycmVudCBvbmVzLicsIGZ1bmN0aW9uIChyZWFsbHkpIHtcbiAgICAgICAgaWYgKCFyZWFsbHkpIHJldHVybjtcbiAgICAgICAgU3RyaWRlci5LZXlnZW4uc2F2ZShcbiAgICAgICAgICB7XG4gICAgICAgICAgICBvd25lcjogcHJvamVjdFNlYXJjaE9wdGlvbnMub3duZXIsXG4gICAgICAgICAgICByZXBvOiAgcHJvamVjdFNlYXJjaE9wdGlvbnMucmVwbyxcbiAgICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaC5uYW1lIH0sXG4gICAgICAgICAge30sXG4gICAgICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgICAgZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgJHNjb3BlLmJyYW5jaC5wcml2a2V5ID0gZGF0YS5wcml2a2V5O1xuICAgICAgICAgICRzY29wZS5icmFuY2gucHVia2V5ID0gZGF0YS5wdWJrZXk7XG4gICAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0dlbmVyYXRlZCBuZXcgc3NoIGtleXBhaXInKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGluaXRQbHVnaW5zKCk7XG5cbiAgICAkc2NvcGUuZ3JhdmF0YXIgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgIGlmICghZW1haWwpIHJldHVybiAnJztcbiAgICAgIHZhciBoYXNoID0gbWQ1KGVtYWlsLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgcmV0dXJuICdodHRwczovL3NlY3VyZS5ncmF2YXRhci5jb20vYXZhdGFyLycgKyBoYXNoICsgJz9kPWlkZW50aWNvbic7XG4gICAgfVxuXG4gICAgLy8gdG9kbzogcGFzcyBpbiBuYW1lP1xuICAgICRzY29wZS5ydW5uZXJDb25maWcgPSBmdW5jdGlvbiAoYnJhbmNoLCBkYXRhLCBuZXh0KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBuZXh0ID0gZGF0YTtcbiAgICAgICAgZGF0YSA9IGJyYW5jaDtcbiAgICAgICAgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgIH1cbiAgICAgIHZhciBuYW1lID0gJHNjb3BlLmJyYW5jaC5ydW5uZXIuaWQ7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5ydW5uZXJDb25maWdzW25hbWVdO1xuICAgICAgfVxuXG4gICAgICBTdHJpZGVyLkNvbmZpZy5CcmFuY2guUnVubmVyLnNhdmUoXG4gICAgICAgIHtcbiAgICAgICAgICBvd25lcjogcHJvamVjdFNlYXJjaE9wdGlvbnMub3duZXIsXG4gICAgICAgICAgcmVwbzogIHByb2plY3RTZWFyY2hPcHRpb25zLnJlcG8sXG4gICAgICAgICAgYnJhbmNoOiAnbWFzdGVyJyB9LFxuICAgICAgICBkYXRhLFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKFwiUnVubmVyIGNvbmZpZyBzYXZlZC5cIik7XG4gICAgICAgICRzY29wZS5ydW5uZXJDb25maWdzW25hbWVdID0gZGF0YS5jb25maWc7XG4gICAgICAgIG5leHQgJiYgbmV4dChudWxsLCBkYXRhLmNvbmZpZyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyA9IGZ1bmN0aW9uIChkYXRhLCBuZXh0KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLnByb2plY3QucHJvdmlkZXIuY29uZmlnO1xuICAgICAgfVxuICAgICAgU3RyaWRlci5Qcm92aWRlci5zYXZlKHByb2plY3RTZWFyY2hPcHRpb25zLCBkYXRhLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoXCJQcm92aWRlciBjb25maWcgc2F2ZWQuXCIpO1xuICAgICAgICBuZXh0ICYmIG5leHQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZyA9IGZ1bmN0aW9uIChuYW1lLCBicmFuY2gsIGRhdGEsIG5leHQpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICAgIG5leHQgPSBkYXRhO1xuICAgICAgICBkYXRhID0gYnJhbmNoO1xuICAgICAgICBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChicmFuY2gubWlycm9yX21hc3Rlcikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBwbHVnaW4gPSAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bbmFtZV1cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gcGx1Z2luLmNvbmZpZztcbiAgICAgIH1cbiAgICAgIGlmIChwbHVnaW4gPT09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcInBsdWdpbkNvbmZpZyBjYWxsZWQgZm9yIGEgcGx1Z2luIHRoYXQncyBub3QgY29uZmlndXJlZC4gXCIgKyBuYW1lLCB0cnVlKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbHVnaW4gbm90IGNvbmZpZ3VyZWQ6ICcgKyBuYW1lKTtcbiAgICAgIH1cblxuICAgICAgU3RyaWRlci5Db25maWcuQnJhbmNoLlBsdWdpbi5zYXZlKFxuICAgICAge1xuICAgICAgICBvd25lcjogIHByb2plY3RTZWFyY2hPcHRpb25zLm93bmVyLFxuICAgICAgICByZXBvOiAgIHByb2plY3RTZWFyY2hPcHRpb25zLnJlcG8sXG4gICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICAgIHBsdWdpbjogbmFtZSB9LFxuICAgICAgZGF0YSxcbiAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcyhcIkNvbmZpZyBmb3IgXCIgKyBuYW1lICsgXCIgb24gYnJhbmNoIFwiICsgYnJhbmNoLm5hbWUgKyBcIiBzYXZlZC5cIik7XG4gICAgICAgICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXVtuYW1lXS5jb25maWcgPSBkYXRhO1xuICAgICAgICBuZXh0KG51bGwsIGRhdGEpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlUHJvamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIFN0cmlkZXIuUmVwby5kZWxldGUocHJvamVjdFNlYXJjaE9wdGlvbnMsIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc3RhcnRUZXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgU3RyaWRlci5TdGFydC5zYXZlKFxuICAgICAgICBwcm9qZWN0U2VhcmNoT3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaC5uYW1lLFxuICAgICAgICAgIHR5cGU6IFwiVEVTVF9PTkxZXCIsXG4gICAgICAgICAgcGFnZTpcImNvbmZpZ1wiIH0sXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnN0YXJ0RGVwbG95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgU3RyaWRlci5TdGFydC5zYXZlKFxuICAgICAgICBwcm9qZWN0U2VhcmNoT3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaC5uYW1lLFxuICAgICAgICAgIHR5cGU6IFwiVEVTVF9BTkRfREVQTE9ZXCIsXG4gICAgICAgICAgcGFnZTpcImNvbmZpZ1wiIH0sXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmVQcm9qZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgU3RyaWRlci5SZWd1bGFyQ29uZmlnLnNhdmUoXG4gICAgICAgICAgcHJvamVjdFNlYXJjaE9wdGlvbnMsXG4gICAgICAgICAge1xuICAgICAgICAgICAgcHVibGljOiAkc2NvcGUucHJvamVjdC5wdWJsaWNcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0dlbmVyYWwgY29uZmlnIHNhdmVkLicpO1xuICAgICAgfVxuICAgIH07XG5cbiAgfSk7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBmaXhUZW1wbGF0ZTtcblxuZnVuY3Rpb24gZml4VGVtcGxhdGUocykge1xuICByZXR1cm4gcy5cbiAgICByZXBsYWNlKC9cXFtcXFsvZywgJ3t7JykuXG4gICAgcmVwbGFjZSgvXFxdXFxdL2csICd9fScpO1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5Db2xsYWJvcmF0b3JzQ3RybCcsIFsnJHNjb3BlJywgQ29sbGFib3JhdG9yc0N0cmxdKTtcblxuZnVuY3Rpb24gQ29sbGFib3JhdG9yc0N0cmwoJHNjb3BlKSB7XG4gICRzY29wZS5uZXdfZW1haWwgPSAnJztcbiAgJHNjb3BlLm5ld19hY2Nlc3MgPSAwO1xuICAkc2NvcGUuY29sbGFib3JhdG9ycyA9IHdpbmRvdy5jb2xsYWJvcmF0b3JzIHx8IFtdO1xuICAkc2NvcGUucmVtb3ZlID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpdGVtLmxvYWRpbmcgPSB0cnVlO1xuICAgICRzY29wZS5jbGVhck1lc3NhZ2UoKTtcbiAgICAkLmFqYXgoe1xuICAgICAgdXJsOiAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy9jb2xsYWJvcmF0b3JzLycsXG4gICAgICB0eXBlOiAnREVMRVRFJyxcbiAgICAgIGRhdGE6IHtlbWFpbDogaXRlbS5lbWFpbH0sXG4gICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhLCB0cywgeGhyKSB7XG4gICAgICAgIHJlbW92ZSgkc2NvcGUuY29sbGFib3JhdG9ycywgaXRlbSk7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKGl0ZW0uZW1haWwgKyBcIiBpcyBubyBsb25nZXIgYSBjb2xsYWJvcmF0b3Igb24gdGhpcyBwcm9qZWN0LlwiLCB0cnVlKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0cywgZSkge1xuICAgICAgICBpdGVtLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHhociAmJiB4aHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkLnBhcnNlSlNPTih4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBkZWxldGluZyBjb2xsYWJvcmF0b3I6IFwiICsgZGF0YS5lcnJvcnNbMF0sIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIGRlbGV0aW5nIGNvbGxhYm9yYXRvcjogXCIgKyBlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkYXRhID0ge1xuICAgICAgZW1haWw6ICRzY29wZS5uZXdfZW1haWwsXG4gICAgICBhY2Nlc3M6ICRzY29wZS5uZXdfYWNjZXNzIHx8IDAsXG4gICAgICBncmF2YXRhcjogJHNjb3BlLmdyYXZhdGFyKCRzY29wZS5uZXdfZW1haWwpLFxuICAgICAgb3duZXI6IGZhbHNlXG4gICAgfTtcblxuICAgICQuYWpheCh7XG4gICAgICB1cmw6ICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2NvbGxhYm9yYXRvcnMvJyxcbiAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgZGF0YTogZGF0YSxcbiAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlcywgdHMsIHhocikge1xuICAgICAgICAkc2NvcGUubmV3X2FjY2VzcyA9IDA7XG4gICAgICAgICRzY29wZS5uZXdfZW1haWwgPSAnJztcbiAgICAgICAgaWYgKHJlcy5jcmVhdGVkKSB7XG4gICAgICAgICAgJHNjb3BlLmNvbGxhYm9yYXRvcnMucHVzaChkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuc3VjY2VzcyhyZXMubWVzc2FnZSwgdHJ1ZSwgIXJlcy5jcmVhdGVkKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0cywgZSkge1xuICAgICAgICBpZiAoeGhyICYmIHhoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9ICQucGFyc2VKU09OKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIGFkZGluZyBjb2xsYWJvcmF0b3I6IFwiICsgZGF0YS5lcnJvcnNbMF0sIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIGFkZGluZyBjb2xsYWJvcmF0b3I6IFwiICsgZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlKGFyLCBpdGVtKSB7XG4gIGFyLnNwbGljZShhci5pbmRleE9mKGl0ZW0pLCAxKTtcbn1cbiIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5FbnZpcm9ubWVudEN0cmwnLCBbJyRzY29wZScsIEVudmlyb25tZW50Q3RybF0pO1xuXG5mdW5jdGlvbiBFbnZpcm9ubWVudEN0cmwoJHNjb3BlKXtcbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0uZW52LmNvbmZpZycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICRzY29wZS5jb25maWcgPSB2YWx1ZSB8fCB7fTtcbiAgfSk7XG4gICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnZW52JywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuZGVsID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGRlbGV0ZSAkc2NvcGUuY29uZmlnW2tleV07XG4gICAgJHNjb3BlLnNhdmUoKTtcbiAgfTtcbiAgJHNjb3BlLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuY29uZmlnWyRzY29wZS5uZXdrZXldID0gJHNjb3BlLm5ld3ZhbHVlO1xuICAgICRzY29wZS5uZXdrZXkgPSAkc2NvcGUubmV3dmFsdWUgPSAnJztcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5HaXRodWJDdHJsJywgWyckc2NvcGUnLCAnU3RyaWRlcicsIEdpdGh1YkN0cmxdKTtcblxuZnVuY3Rpb24gR2l0aHViQ3RybCgkc2NvcGUsIFN0cmlkZXIpIHtcblxuICBjb25zb2xlLmxvZygnR2l0aHViYmluZyBzY29wZSAyJyk7XG5cbiAgJHNjb3BlLmNvbmZpZyA9ICRzY29wZS5wcm92aWRlckNvbmZpZygpO1xuICAkc2NvcGUubmV3X3VzZXJuYW1lID0gXCJcIjtcbiAgJHNjb3BlLm5ld19sZXZlbCA9IFwidGVzdGVyXCI7XG4gICRzY29wZS5jb25maWcud2hpdGVsaXN0ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgfHwgW107XG4gICRzY29wZS5jb25maWcucHVsbF9yZXF1ZXN0cyA9ICRzY29wZS5jb25maWcucHVsbF9yZXF1ZXN0cyB8fCAnbm9uZSc7XG5cbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKCRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHt9KTtcbiAgfTtcblxuICAkc2NvcGUuJHdhdGNoKCdjb25maWcucHVsbF9yZXF1ZXN0cycsIGZ1bmN0aW9uICh2YWx1ZSwgb2xkKSB7XG4gICAgaWYgKCFvbGQgfHwgdmFsdWUgPT09IG9sZCkgcmV0dXJuO1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyh7XG4gICAgICBwdWxsX3JlcXVlc3RzOiAkc2NvcGUuY29uZmlnLnB1bGxfcmVxdWVzdHNcbiAgICB9KTtcbiAgfSk7XG5cbiAgJHNjb3BlLmFkZFdlYmhvb2tzID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSB0cnVlO1xuXG4gICAgU3RyaWRlci5wb3N0KCRzY29wZS5hcGlfcm9vdCArICdnaXRodWIvaG9vaycsIHN1Y2Nlc3MpO1xuXG4gICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTVUNDRVNTJyk7XG4gICAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuc3VjY2VzcygnU2V0IGdpdGh1YiB3ZWJob29rcycpO1xuICAgIH1cbiAgfTtcblxuICAkc2NvcGUuZGVsZXRlV2ViaG9va3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IHRydWU7XG5cbiAgICBTdHJpZGVyLmRlbCgkc2NvcGUuYXBpX3Jvb3QgKyAnZ2l0aHViL2hvb2snLCBzdWNjZXNzKTtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuc3VjY2VzcygnUmVtb3ZlZCBnaXRodWIgd2ViaG9va3MnKTtcbiAgICB9XG4gIH07XG5cbiAgJHNjb3BlLnJlbW92ZVdMID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICB2YXIgaWR4ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QuaW5kZXhPZih1c2VyKTtcbiAgICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIGNvbnNvbGUuZXJyb3IoXCJ0cmllZCB0byByZW1vdmUgYSB3aGl0ZWxpc3QgaXRlbSB0aGF0IGRpZG4ndCBleGlzdFwiKTtcbiAgICB2YXIgd2hpdGVsaXN0ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3Quc2xpY2UoKTtcbiAgICB3aGl0ZWxpc3Quc3BsaWNlKGlkeCwgMSk7XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKHtcbiAgICAgIHdoaXRlbGlzdDogd2hpdGVsaXN0XG4gICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgPSB3aGl0ZWxpc3Q7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmFkZFdMID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICBpZiAoIXVzZXIubmFtZSB8fCAhdXNlci5sZXZlbCkgcmV0dXJuO1xuICAgIHZhciB3aGl0ZWxpc3QgPSAkc2NvcGUuY29uZmlnLndoaXRlbGlzdC5zbGljZSgpO1xuICAgIHdoaXRlbGlzdC5wdXNoKHVzZXIpO1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyh7XG4gICAgICB3aGl0ZWxpc3Q6IHdoaXRlbGlzdFxuICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5jb25maWcud2hpdGVsaXN0ID0gd2hpdGVsaXN0O1xuICAgIH0pO1xuICB9O1xuXG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkhlcm9rdUNvbnRyb2xsZXInLCBbJyRzY29wZScsIEhlcm9rdUN0cmxdKTtcblxuZnVuY3Rpb24gSGVyb2t1Q3RybCgkc2NvcGUsICRlbGVtZW50KSB7XG4gICRzY29wZS4kd2F0Y2goJ3VzZXJDb25maWdzLmhlcm9rdScsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICghdmFsdWUpIHJldHVyblxuICAgICRzY29wZS51c2VyQ29uZmlnID0gdmFsdWU7XG4gICAgaWYgKCEkc2NvcGUuYWNjb3VudCAmJiB2YWx1ZS5hY2NvdW50cyAmJiB2YWx1ZS5hY2NvdW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAkc2NvcGUuYWNjb3VudCA9IHZhbHVlLmFjY291bnRzWzBdO1xuICAgIH1cbiAgfSk7XG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdLmhlcm9rdS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgaWYgKHZhbHVlLmFwcCAmJiAkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50cykge1xuICAgICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS51c2VyQ29uZmlnLmFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICgkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50c1tpXS5pZCA9PT0gdmFsdWUuYXBwLmFjY291bnQpIHtcbiAgICAgICAgICAkc2NvcGUuYWNjb3VudCA9ICRzY29wZS51c2VyQ29uZmlnLmFjY291bnRzW2ldO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdoZXJva3UnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5nZXRBcHBzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghJHNjb3BlLmFjY291bnQpIHJldHVybiBjb25zb2xlLndhcm4oJ3RyaWVkIHRvIGdldEFwcHMgYnV0IG5vIGFjY291bnQnKTtcbiAgICAkLmFqYXgoJy9leHQvaGVyb2t1L2FwcHMvJyArICRzY29wZS5hY2NvdW50LmlkLCB7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChib2R5LCByZXEpIHtcbiAgICAgICAgJHNjb3BlLmFjY291bnQuY2FjaGUgPSBib2R5O1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnR290IGFjY291bnRzIGxpc3QgZm9yICcgKyAkc2NvcGUuYWNjb3VudC5lbWFpbCwgdHJ1ZSk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IGFjY291bnRzIGxpc3QgZm9yICcgKyAkc2NvcGUuYWNjb3VudC5lbWFpbCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkpvYkNvbnRyb2xsZXInLCBbJyRzY29wZScsIEpvYkNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gSm9iQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAkc2NvcGUuaW5pdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAkc2NvcGUuJHdhdGNoKCd1c2VyQ29uZmlnc1tcIicgKyBuYW1lICsgJ1wiXScsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgJHNjb3BlLnVzZXJDb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXVtcIicgKyBuYW1lICsgJ1wiXS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAgICRzY29wZS5wbHVnaW5Db25maWcobmFtZSwgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLk5vZGVDb250cm9sbGVyJywgWyckc2NvcGUnLCBOb2RlQ29udHJvbGxlcl0pO1xuXG5mdW5jdGlvbiBOb2RlQ29udHJvbGxlcigkc2NvcGUpIHtcbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0ubm9kZS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gIH0pO1xuICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ25vZGUnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5yZW1vdmVHbG9iYWwgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAkc2NvcGUuY29uZmlnLmdsb2JhbHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xuICAkc2NvcGUuYWRkR2xvYmFsID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghJHNjb3BlLmNvbmZpZy5nbG9iYWxzKSAkc2NvcGUuY29uZmlnLmdsb2JhbHMgPSBbXTtcbiAgICAkc2NvcGUuY29uZmlnLmdsb2JhbHMucHVzaCgkc2NvcGUubmV3X3BhY2thZ2UpO1xuICAgICRzY29wZS5uZXdfcGFja2FnZSA9ICcnO1xuICAgICRzY29wZS5zYXZlKCk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLlJ1bm5lckNvbnRyb2xsZXInLCBbJyRzY29wZScsIFJ1bm5lckNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gUnVubmVyQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAkc2NvcGUuaW5pdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgJHNjb3BlLiR3YXRjaCgncnVubmVyQ29uZmlnc1ticmFuY2gubmFtZV1bXCInICsgbmFtZSArICdcIl0nLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdSdW5uZXIgY29uZmlnJywgbmFtZSwgdmFsdWUsICRzY29wZS5ydW5uZXJDb25maWdzKTtcbiAgICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucnVubmVyQ29uZmlnKCRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5TYXVjZUN0cmwnLCBbJyRzY29wZScsIFNhdWNlQ3RybF0pO1xuXG5mdW5jdGlvbiBTYXVjZUN0cmwoJHNjb3BlKSB7XG5cbiAgY29uc29sZS5sb2coJ1NhdWNlQ3RybCBzY29wZSAyJyk7XG5cbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0uc2F1Y2UuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAkc2NvcGUuYnJvd3Nlcl9tYXAgPSB7fTtcbiAgICBpZiAoIXZhbHVlLmJyb3dzZXJzKSB7XG4gICAgICB2YWx1ZS5icm93c2VycyA9IFtdO1xuICAgIH1cbiAgICBmb3IgKHZhciBpPTA7IGk8dmFsdWUuYnJvd3NlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICRzY29wZS5icm93c2VyX21hcFtzZXJpYWxpemVOYW1lKHZhbHVlLmJyb3dzZXJzW2ldKV0gPSB0cnVlO1xuICAgIH1cbiAgfSk7XG4gICRzY29wZS5jb21wbGV0ZU5hbWUgPSBjb21wbGV0ZU5hbWU7XG4gICRzY29wZS5vcGVyYXRpbmdzeXN0ZW1zID0gb3JnYW5pemUoYnJvd3NlcnMgfHwgW10pO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuY29uZmlnLmJyb3dzZXJzID0gW107XG4gICAgZm9yICh2YXIgbmFtZSBpbiAkc2NvcGUuYnJvd3Nlcl9tYXApIHtcbiAgICAgIGlmICgkc2NvcGUuYnJvd3Nlcl9tYXBbbmFtZV0pIHtcbiAgICAgICAgJHNjb3BlLmNvbmZpZy5icm93c2Vycy5wdXNoKHBhcnNlTmFtZShuYW1lKSk7XG4gICAgICB9XG4gICAgfVxuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ3NhdWNlJywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmJyb3dzZXJfbWFwID0ge307XG4gICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gb3JnYW5pemUoYnJvd3NlcnMpIHtcbiAgdmFyIG9zcyA9IHt9O1xuICBmb3IgKHZhciBpPTA7IGk8YnJvd3NlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoIW9zc1ticm93c2Vyc1tpXS5vc10pIHtcbiAgICAgIG9zc1ticm93c2Vyc1tpXS5vc10gPSB7fTtcbiAgICB9XG4gICAgaWYgKCFvc3NbYnJvd3NlcnNbaV0ub3NdW2Jyb3dzZXJzW2ldLmxvbmdfbmFtZV0pIHtcbiAgICAgIG9zc1ticm93c2Vyc1tpXS5vc11bYnJvd3NlcnNbaV0ubG9uZ19uYW1lXSA9IFtdO1xuICAgIH1cbiAgICBvc3NbYnJvd3NlcnNbaV0ub3NdW2Jyb3dzZXJzW2ldLmxvbmdfbmFtZV0ucHVzaChicm93c2Vyc1tpXSk7XG4gICAgYnJvd3NlcnNbaV0uY29tcGxldGVfbmFtZSA9IGNvbXBsZXRlTmFtZShicm93c2Vyc1tpXSk7XG4gIH1cbiAgcmV0dXJuIG9zcztcbn1cblxuZnVuY3Rpb24gY29tcGxldGVOYW1lKHZlcnNpb24pIHtcbiAgcmV0dXJuIHZlcnNpb24ub3MgKyAnLScgKyB2ZXJzaW9uLmFwaV9uYW1lICsgJy0nICsgdmVyc2lvbi5zaG9ydF92ZXJzaW9uO1xufVxuXG5mdW5jdGlvbiBwYXJzZU5hbWUobmFtZSkge1xuICB2YXIgcGFydHMgPSBuYW1lLnNwbGl0KCctJyk7XG4gIHJldHVybiB7XG4gICAgcGxhdGZvcm06IHBhcnRzWzBdLFxuICAgIGJyb3dzZXJOYW1lOiBwYXJ0c1sxXSxcbiAgICB2ZXJzaW9uOiBwYXJ0c1syXSB8fCAnJ1xuICB9O1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVOYW1lKGJyb3dzZXIpIHtcbiAgcmV0dXJuIGJyb3dzZXIucGxhdGZvcm0gKyAnLScgKyBicm93c2VyLmJyb3dzZXJOYW1lICsgJy0nICsgYnJvd3Nlci52ZXJzaW9uO1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5XZWJob29rc0N0cmwnLCBbJyRzY29wZScsIFdlYmhvb2tzQ3RybF0pO1xuXG5mdW5jdGlvbiBXZWJob29rc0N0cmwoJHNjb3BlKSB7XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGFyLCBpdGVtKSB7XG4gICAgYXIuc3BsaWNlKGFyLmluZGV4T2YoaXRlbSksIDEpO1xuICB9XG5cbiAgJHNjb3BlLmhvb2tzID0gJHNjb3BlLnBsdWdpbkNvbmZpZygnd2ViaG9va3MnKSB8fCBbXTtcbiAgaWYgKCFBcnJheS5pc0FycmF5KCRzY29wZS5ob29rcykpICRzY29wZS5ob29rcyA9IFtdO1xuICBpZiAoISRzY29wZS5ob29rcy5sZW5ndGgpICRzY29wZS5ob29rcy5wdXNoKHt9KTtcblxuICAkc2NvcGUucmVtb3ZlID0gZnVuY3Rpb24gKGhvb2spIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCd3ZWJob29rcycsICRzY29wZS5ob29rcywgZnVuY3Rpb24gKGVycikge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICAgaWYgKCFlcnIpIHJlbW92ZSgkc2NvcGUuaG9va3MsIGhvb2spO1xuICAgICAgaWYgKCEkc2NvcGUuaG9va3MubGVuZ3RoKSAkc2NvcGUuaG9va3MucHVzaCh7fSk7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnd2ViaG9va3MnLCAkc2NvcGUuaG9va3MsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5ob29rcy5wdXNoKHt9KTtcbiAgfTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdEYXNoYm9hcmRDdHJsJywgWyckc2NvcGUnLCAnJGxvY2F0aW9uJywgJ1N0cmlkZXInLCBEYXNoYm9hcmRDdHJsXSk7XG5cbmZ1bmN0aW9uIERhc2hib2FyZEN0cmwoJHNjb3BlLCAkbG9jYXRpb24sIFN0cmlkZXIpIHtcblxuICAvLyBUT0RPOiBtYWtlIHRoaXMgbW9yZSBkZWNsYXJhdGl2ZTpcbiAgU3RyaWRlci5TZXNzaW9uLmdldChmdW5jdGlvbih1c2VyKSB7XG4gICAgaWYgKCEgdXNlci51c2VyKSAkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG4gICAgZWxzZSBhdXRoZW50aWNhdGVkKCk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZWQoKSB7XG4gICAgJHNjb3BlLmpvYnMgPSBTdHJpZGVyLmpvYnM7XG4gICAgU3RyaWRlci5jb25uZWN0KCRzY29wZSk7XG4gICAgU3RyaWRlci5qb2JzLmRhc2hib2FyZCgpO1xuICB9XG5cbiAgJHNjb3BlLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShwcm9qZWN0KSB7XG4gICAgU3RyaWRlci5kZXBsb3kocHJvamVjdCk7XG4gIH07XG5cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdFcnJvckN0cmwnLCBbJyRzY29wZScsICckcm9vdFNjb3BlJywgRXJyb3JDdHJsXSk7XG5cbmZ1bmN0aW9uIEVycm9yQ3RybCgkc2NvcGUsICRyb290U2NvcGUpIHtcbiAgJHNjb3BlLmVycm9yID0ge307XG5cbiAgJHJvb3RTY29wZS4kb24oJ2Vycm9yJywgZnVuY3Rpb24oZXYsIGVycikge1xuICAgICRzY29wZS5lcnJvci5tZXNzYWdlID0gZXJyLm1lc3NhZ2UgfHwgZXJyO1xuICB9KTtcblxuICAkcm9vdFNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICAkc2NvcGUuZXJyb3IubWVzc2FnZSA9ICcnO1xuICB9KTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdKb2JDdHJsJywgWyckc2NvcGUnLCAnJHJvdXRlUGFyYW1zJywgJyRzY2UnLCAnJGZpbHRlcicsICckbG9jYXRpb24nLCAnJHJvdXRlJywgJ1N0cmlkZXInLCBKb2JDdHJsXSk7XG5cbmZ1bmN0aW9uIEpvYkN0cmwoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRzY2UsICRmaWx0ZXIsICRsb2NhdGlvbiwgJHJvdXRlLCBTdHJpZGVyKSB7XG5cblxuICB2YXIgb3V0cHV0Q29uc29sZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb25zb2xlLW91dHB1dCcpO1xuXG4gICRzY29wZS5waGFzZXMgPSBTdHJpZGVyLnBoYXNlcztcbiAgJHNjb3BlLnBhZ2UgPSAnYnVpbGQnO1xuXG4gIHZhciBqb2JpZCA9ICRyb3V0ZVBhcmFtcy5qb2JpZDtcbiAgY29uc29sZS5sb2coJ2pvYmlkOicsIGpvYmlkKTtcbiAgdmFyIHNlYXJjaE9wdGlvbnMgPSB7XG4gICAgb3duZXI6ICRyb3V0ZVBhcmFtcy5vd25lcixcbiAgICByZXBvOiAgJHJvdXRlUGFyYW1zLnJlcG9cbiAgfTtcblxuICBTdHJpZGVyLlJlcG8uZ2V0KHNlYXJjaE9wdGlvbnMsIGZ1bmN0aW9uKHJlcG8pIHtcbiAgICAkc2NvcGUucHJvamVjdCA9IHJlcG8ucHJvamVjdFxuICAgIGlmICghIGpvYmlkKSAkc2NvcGUuam9iICA9IHJlcG8uam9iO1xuICAgICRzY29wZS5qb2JzID0gcmVwby5qb2JzO1xuXG4gICAgaWYgKCRzY29wZS5qb2IgJiYgJHNjb3BlLmpvYi5waGFzZXMudGVzdC5jb21tYW5kcy5sZW5ndGgpIHtcbiAgICAgIGlmICgkc2NvcGUuam9iLnBoYXNlcy5lbnZpcm9ubWVudCkge1xuICAgICAgICAkc2NvcGUuam9iLnBoYXNlcy5lbnZpcm9ubWVudC5jb2xsYXBzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCRzY29wZS5qb2IucGhhc2VzLnByZXBhcmUpIHtcbiAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMucHJlcGFyZS5jb2xsYXBzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCRzY29wZS5qb2IucGhhc2VzLmNsZWFudXApIHtcbiAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMuY2xlYW51cC5jb2xsYXBzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9iamVjdC5rZXlzKCRzY29wZS5qb2IucGhhc2VzKS5mb3JFYWNoKGZ1bmN0aW9uKHBoYXNlS2V5KSB7XG4gICAgLy8gICB2YXIgcGhhc2UgPSAkc2NvcGUuam9iLnBoYXNlc1twaGFzZUtleV07XG4gICAgLy8gICBPYmplY3Qua2V5cyhwaGFzZS5jb21tYW5kcykuZm9yRWFjaChmdW5jdGlvbihjb21tYW5kS2V5KSB7XG4gICAgLy8gICAgIHZhciBjb21tYW5kID0gcGhhc2UuY29tbWFuZHNbY29tbWFuZEtleV07XG4gICAgLy8gICAgIGNvbW1hbmQubWVyZ2VkID0gJHNjZS50cnVzdEFzSHRtbChjb21tYW5kLm1lcmdlZCk7XG4gICAgLy8gICB9KVxuICAgIC8vIH0pO1xuICB9KTtcblxuICBpZiAoam9iaWQpIHtcbiAgICBTdHJpZGVyLkpvYi5nZXQoe1xuICAgICAgb3duZXI6ICRyb3V0ZVBhcmFtcy5vd25lcixcbiAgICAgIHJlcG86ICAkcm91dGVQYXJhbXMucmVwbyxcbiAgICAgIGpvYmlkOiBqb2JpZFxuICAgIH0sIGZ1bmN0aW9uKGpvYikge1xuICAgICAgJHNjb3BlLmpvYiA9IGpvYjtcbiAgICB9KTtcbiAgfVxuXG4gIFN0cmlkZXIuU3RhdHVzQmxvY2tzLmdldChmdW5jdGlvbihzdGF0dXNCbG9ja3MpIHtcbiAgICAkc2NvcGUuc3RhdHVzQmxvY2tzID0gc3RhdHVzQmxvY2tzO1xuICAgIFsncnVubmVyJywgJ3Byb3ZpZGVyJywgJ2pvYiddLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBmaXhCbG9ja3Moc3RhdHVzQmxvY2tzLCBrZXkpO1xuICAgIH0pO1xuICB9KTtcblxuICBTdHJpZGVyLmNvbm5lY3QoJHNjb3BlKTtcblxuICBTdHJpZGVyLlNlc3Npb24uZ2V0KGZ1bmN0aW9uKHVzZXIpIHtcbiAgICBpZiAodXNlci51c2VyKSAkc2NvcGUuY3VycmVudFVzZXIgPSB1c2VyO1xuICB9KTtcblxuICAvLy8gU2NvcGUgZnVuY3Rpb25zXG5cbiAgJHNjb3BlLmNsZWFyQ2FjaGUgPSBmdW5jdGlvbiBjbGVhckNhY2hlKCkge1xuICAgICRzY29wZS5jbGVhcmluZ0NhY2hlID0gdHJ1ZTtcbiAgICBTdHJpZGVyLkNhY2hlLmRlbGV0ZSggc2VhcmNoT3B0aW9ucywgc3VjY2Vzcyk7XG5cbiAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgJHNjb3BlLmNsZWFyaW5nQ2FjaGUgPSBmYWxzZTtcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfVxuICB9XG5cbiAgLy8gdmFyIGxhc3RSb3V0ZTtcblxuICAvLyAkc2NvcGUuJG9uKCckbG9jYXRpb25DaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgLy8gICBpZiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9cXC9jb25maWckLykpIHtcbiAgLy8gICAgIHdpbmRvdy5sb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbiAgLy8gICAgIHJldHVybjtcbiAgLy8gICB9XG4gIC8vICAgcGFyYW1zID0gJHJvdXRlUGFyYW1zO1xuICAvLyAgIGlmICghcGFyYW1zLmlkKSBwYXJhbXMuaWQgPSAkc2NvcGUuam9ic1swXS5faWQ7XG4gIC8vICAgLy8gZG9uJ3QgcmVmcmVzaCB0aGUgcGFnZVxuICAvLyAgICRyb3V0ZS5jdXJyZW50ID0gbGFzdFJvdXRlO1xuICAvLyAgIGlmIChqb2JpZCAhPT0gcGFyYW1zLmlkKSB7XG4gIC8vICAgICBqb2JpZCA9IHBhcmFtcy5pZDtcbiAgLy8gICAgIHZhciBjYWNoZWQgPSBqb2JtYW4uZ2V0KGpvYmlkLCBmdW5jdGlvbiAoZXJyLCBqb2IsIGNhY2hlZCkge1xuICAvLyAgICAgICBpZiAoam9iLnBoYXNlcy5lbnZpcm9ubWVudCkge1xuICAvLyAgICAgICAgIGpvYi5waGFzZXMuZW52aXJvbm1lbnQuY29sbGFwc2VkID0gdHJ1ZTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICBpZiAoam9iLnBoYXNlcy5wcmVwYXJlKSB7XG4gIC8vICAgICAgICAgam9iLnBoYXNlcy5wcmVwYXJlLmNvbGxhcHNlZCA9IHRydWU7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgICAgaWYgKGpvYi5waGFzZXMuY2xlYW51cCkge1xuICAvLyAgICAgICAgIGpvYi5waGFzZXMuY2xlYW51cC5jb2xsYXBzZWQgPSB0cnVlO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgICRzY29wZS5qb2IgPSBqb2I7XG4gIC8vICAgICAgIGlmICgkc2NvcGUuam9iLnBoYXNlcy50ZXN0LmNvbW1hbmRzLmxlbmd0aCkge1xuICAvLyAgICAgICAgICRzY29wZS5qb2IucGhhc2VzLmVudmlyb25tZW50LmNvbGxhcHNlZCA9IHRydWU7XG4gIC8vICAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMucHJlcGFyZS5jb2xsYXBzZWQgPSB0cnVlO1xuICAvLyAgICAgICAgICRzY29wZS5qb2IucGhhc2VzLmNsZWFudXAuY29sbGFwc2VkID0gdHJ1ZTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICBpZiAoIWNhY2hlZCkgJHNjb3BlLiRkaWdlc3QoKTtcbiAgLy8gICAgIH0pO1xuICAvLyAgICAgaWYgKCFjYWNoZWQpIHtcbiAgLy8gICAgICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS5qb2JzLmxlbmd0aDsgaSsrKSB7XG4gIC8vICAgICAgICAgaWYgKCRzY29wZS5qb2JzW2ldLl9pZCA9PT0gam9iaWQpIHtcbiAgLy8gICAgICAgICAgICRzY29wZS5qb2IgPSAkc2NvcGUuam9ic1tpXTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gfSk7XG5cbiAgJHNjb3BlLnRyaWdnZXJzID0ge1xuICAgIGNvbW1pdDoge1xuICAgICAgaWNvbjogJ2NvZGUtZm9yaycsXG4gICAgICB0aXRsZTogJ0NvbW1pdCdcbiAgICB9LFxuICAgIG1hbnVhbDoge1xuICAgICAgaWNvbjogJ2hhbmQtcmlnaHQnLFxuICAgICAgdGl0bGU6ICdNYW51YWwnXG4gICAgfSxcbiAgICBwbHVnaW46IHtcbiAgICAgIGljb246ICdwdXp6bGUtcGllY2UnLFxuICAgICAgdGl0bGU6ICdQbHVnaW4nXG4gICAgfSxcbiAgICBhcGk6IHtcbiAgICAgIGljb246ICdjbG91ZCcsXG4gICAgICB0aXRsZTogJ0Nsb3VkJ1xuICAgIH1cbiAgfTtcblxuICAkc2NvcGUuc2VsZWN0Sm9iID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgJGxvY2F0aW9uLnBhdGgoXG4gICAgICAnLycgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoT3B0aW9ucy5vd25lcikgK1xuICAgICAgJy8nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNlYXJjaE9wdGlvbnMucmVwbykgK1xuICAgICAgJy9qb2IvJyArIGVuY29kZVVSSUNvbXBvbmVudChpZCkpO1xuICB9O1xuXG4gICRzY29wZS4kd2F0Y2goJ2pvYi5zdGF0dXMnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB1cGRhdGVGYXZpY29uKHZhbHVlKTtcbiAgfSk7XG5cbiAgJHNjb3BlLiR3YXRjaCgnam9iLnN0ZC5tZXJnZWRfbGF0ZXN0JywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLyogVHJhY2tpbmcgaXNuJ3QgcXVpdGUgd29ya2luZyByaWdodFxuICAgIGlmICgkc2NvcGUuam9iLnN0YXR1cyA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICBoZWlnaHQgPSBvdXRwdXRDb25zb2xlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICAgIHRyYWNraW5nID0gaGVpZ2h0ICsgb3V0cHV0Q29uc29sZS5zY3JvbGxUb3AgPiBvdXRwdXRDb25zb2xlLnNjcm9sbEhlaWdodCAtIDUwO1xuICAgICAgLy8gY29uc29sZS5sb2codHJhY2tpbmcsIGhlaWdodCwgb3V0cHV0Q29uc29sZS5zY3JvbGxUb3AsIG91dHB1dENvbnNvbGUuc2Nyb2xsSGVpZ2h0KTtcbiAgICAgIGlmICghdHJhY2tpbmcpIHJldHVybjtcbiAgICB9XG4gICAgKi9cbiAgICB2YXIgYW5zaUZpbHRlciA9ICRmaWx0ZXIoJ2Fuc2knKVxuICAgICQoJy5qb2Itb3V0cHV0JykubGFzdCgpLmFwcGVuZChhbnNpRmlsdGVyKHZhbHVlKSlcbiAgICBvdXRwdXRDb25zb2xlLnNjcm9sbFRvcCA9IG91dHB1dENvbnNvbGUuc2Nyb2xsSGVpZ2h0O1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgb3V0cHV0Q29uc29sZS5zY3JvbGxUb3AgPSBvdXRwdXRDb25zb2xlLnNjcm9sbEhlaWdodDtcbiAgICB9LCAxMCk7XG4gIH0pO1xuXG4gIC8vIGJ1dHRvbiBoYW5kbGVyc1xuICAkc2NvcGUuc3RhcnREZXBsb3kgPSBmdW5jdGlvbiAoam9iKSB7XG4gICAgJCgnLnRvb2x0aXAnKS5oaWRlKCk7XG4gICAgU3RyaWRlci5kZXBsb3koam9iLnByb2plY3QpO1xuICAgICRzY29wZS5qb2IgPSB7XG4gICAgICBwcm9qZWN0OiAkc2NvcGUuam9iLnByb2plY3QsXG4gICAgICBzdGF0dXM6ICdzdWJtaXR0ZWQnXG4gICAgfTtcbiAgfTtcbiAgJHNjb3BlLnN0YXJ0VGVzdCA9IGZ1bmN0aW9uIChqb2IpIHtcbiAgICAkKCcudG9vbHRpcCcpLmhpZGUoKTtcbiAgICBTdHJpZGVyLmRlcGxveShqb2IucHJvamVjdCk7XG4gICAgJHNjb3BlLmpvYiA9IHtcbiAgICAgIHByb2plY3Q6ICRzY29wZS5qb2IucHJvamVjdCxcbiAgICAgIHN0YXR1czogJ3N1Ym1pdHRlZCdcbiAgICB9O1xuICB9O1xuXG5cbiAgZnVuY3Rpb24gZml4QmxvY2tzKG9iamVjdCwga2V5KSB7XG4gICAgdmFyIGJsb2NrcyA9IG9iamVjdFtrZXldO1xuICAgIGlmICghIGJsb2NrcykgcmV0dXJuO1xuICAgIE9iamVjdC5rZXlzKGJsb2NrcykuZm9yRWFjaChmdW5jdGlvbihwcm92aWRlcikge1xuICAgICAgdmFyIGJsb2NrID0gYmxvY2tzW3Byb3ZpZGVyXTtcbiAgICAgIGJsb2NrLmF0dHJzX2h0bWwgPSBPYmplY3Qua2V5cyhibG9jay5hdHRycykubWFwKGZ1bmN0aW9uKGF0dHIpIHtcbiAgICAgICAgcmV0dXJuIGF0dHIgKyAnPScgKyBibG9jay5hdHRyc1thdHRyXTtcbiAgICAgIH0pLmpvaW4oJyAnKTtcblxuICAgICAgYmxvY2suaHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwoYmxvY2suaHRtbCk7XG5cbiAgICB9KTtcbiAgfVxufVxuXG5cbi8qKiBtYW5hZ2UgdGhlIGZhdmljb25zICoqL1xuZnVuY3Rpb24gc2V0RmF2aWNvbihzdGF0dXMpIHtcbiAgJCgnbGlua1tyZWwqPVwiaWNvblwiXScpLmF0dHIoJ2hyZWYnLCAnL2ltYWdlcy9pY29ucy9mYXZpY29uLScgKyBzdGF0dXMgKyAnLnBuZycpO1xufVxuXG5mdW5jdGlvbiBhbmltYXRlRmF2KCkge1xuICB2YXIgYWx0ID0gZmFsc2U7XG4gIGZ1bmN0aW9uIHN3aXRjaGl0KCkge1xuICAgIHNldEZhdmljb24oJ3J1bm5pbmcnICsgKGFsdCA/ICctYWx0JyA6ICcnKSk7XG4gICAgYWx0ID0gIWFsdDtcbiAgfVxuICByZXR1cm4gc2V0SW50ZXJ2YWwoc3dpdGNoaXQsIDUwMCk7XG59XG5cbnZhciBydW50aW1lID0gbnVsbDtcbmZ1bmN0aW9uIHVwZGF0ZUZhdmljb24odmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSAncnVubmluZycpIHtcbiAgICBpZiAocnVudGltZSA9PT0gbnVsbCkge1xuICAgICAgcnVudGltZSA9IGFuaW1hdGVGYXYoKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKHJ1bnRpbWUgIT09IG51bGwpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwocnVudGltZSk7XG4gICAgICBydW50aW1lID0gbnVsbDtcbiAgICB9XG4gICAgc2V0RmF2aWNvbih2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRTd2l0Y2hlcigkc2NvcGUpIHtcbiAgZnVuY3Rpb24gc3dpdGNoQnVpbGRzKGV2dCkge1xuICAgIHZhciBkeSA9IHs0MDogMSwgMzg6IC0xfVtldnQua2V5Q29kZV1cbiAgICAgICwgaWQgPSAkc2NvcGUuam9iLl9pZFxuICAgICAgLCBpZHg7XG4gICAgaWYgKCFkeSkgcmV0dXJuO1xuICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUuam9icy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCRzY29wZS5qb2JzW2ldLl9pZCA9PT0gaWQpIHtcbiAgICAgICAgaWR4ID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLmxvZygnRmFpbGVkIHRvIGZpbmQgam9iLicpO1xuICAgICAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvblxuICAgIH1cbiAgICBpZHggKz0gZHk7XG4gICAgaWYgKGlkeCA8IDAgfHwgaWR4ID49ICRzY29wZS5qb2JzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAkc2NvcGUuc2VsZWN0Sm9iKCRzY29wZS5qb2JzW2lkeF0uX2lkKTtcbiAgICAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICB9XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBzd2l0Y2hCdWlsZHMpO1xufVxuIiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgWyckc2NvcGUnLCAnJGxvY2F0aW9uJywgJ1N0cmlkZXInLCBMb2dpbkN0cmxdKTtcblxuZnVuY3Rpb24gTG9naW5DdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBTdHJpZGVyKSB7XG5cbiAgU3RyaWRlci5TZXNzaW9uLmdldChmdW5jdGlvbih1c2VyKSB7XG4gICAgaWYgKHVzZXIuaWQpICRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7XG4gIH0pO1xuXG4gICRzY29wZS51c2VyID0ge307XG5cbiAgJHNjb3BlLmxvZ2luID0gZnVuY3Rpb24gbG9naW4odXNlcikge1xuICAgIHZhciBzZXNzaW9uID0gbmV3IChTdHJpZGVyLlNlc3Npb24pKHVzZXIpO1xuICAgIHNlc3Npb24uJHNhdmUoZnVuY3Rpb24oKSB7XG4gICAgICAkbG9jYXRpb24ucGF0aCgnL2Rhc2hib2FyZCcpO1xuICAgIH0pO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmRpcmVjdGl2ZSgnZHluYW1pY0NvbnRyb2xsZXInLCBkeW5hbWljQ29udHJvbGxlcik7XG5cbmZ1bmN0aW9uIGR5bmFtaWNDb250cm9sbGVyKCRjb21waWxlLCAkY29udHJvbGxlcikge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgdGVybWluYWw6IHRydWUsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsbSwgYXR0cnMpIHtcbiAgICAgIHZhciBsYXN0U2NvcGU7XG4gICAgICBzY29wZS4kd2F0Y2goYXR0cnMuZHluYW1pY0NvbnRyb2xsZXIsIGZ1bmN0aW9uKGN0cmxOYW1lKSB7XG4gICAgICAgIGlmICghIGN0cmxOYW1lKSByZXR1cm47XG5cbiAgICAgICAgdmFyIG5ld1Njb3BlID0gc2NvcGUuJG5ldygpO1xuXG4gICAgICAgIHZhciBjdHJsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGN0cmwgPSAkY29udHJvbGxlcihjdHJsTmFtZSwgeyRzY29wZTogbmV3U2NvcGV9KTtcbiAgICAgICAgfSBjYXRjaCAoX2Vycikge1xuICAgICAgICAgIC8vIG5vdCBmb3VuZFxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKGxhc3RTY29wZSkgbGFzdFNjb3BlLiRkZXN0cm95KCk7XG5cbiAgICAgICAgZWxtLmNvbnRlbnRzKCkuZGF0YSgnJG5nQ29udHJvbGxlckNvbnRyb2xsZXInLCBjdHJsKTtcbiAgICAgICAgJGNvbXBpbGUoZWxtLmNvbnRlbnRzKCkpKG5ld1Njb3BlKTtcblxuICAgICAgICBsYXN0U2NvcGUgPSBuZXdTY29wZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufTsiLCJ2YXIgYXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbmFwcC5maWx0ZXIoJ2Fuc2knLCBbJyRzY2UnLCBmdW5jdGlvbiAoJHNjZSkge1xuICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKCFpbnB1dCkgcmV0dXJuICcnO1xuICAgIHZhciB0ZXh0ID0gaW5wdXQucmVwbGFjZSgvXlteXFxuXFxyXSpcXHUwMDFiXFxbMksvZ20sICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFx1MDAxYlxcW0tbXlxcblxccl0qL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvW15cXG5dKlxccihbXlxcbl0pL2csICckMScpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9eW15cXG5dKlxcdTAwMWJcXFswRy9nbSwgJycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuICAgIHJldHVybiAkc2NlLnRydXN0QXNIdG1sKGFuc2lmaWx0ZXIodGV4dCkpO1xuICB9XG59XSk7XG5cbmZ1bmN0aW9uIGFuc2lwYXJzZShzdHIpIHtcbiAgLy9cbiAgLy8gSSdtIHRlcnJpYmxlIGF0IHdyaXRpbmcgcGFyc2Vycy5cbiAgLy9cbiAgdmFyIG1hdGNoaW5nQ29udHJvbCA9IG51bGwsXG4gICAgICBtYXRjaGluZ0RhdGEgPSBudWxsLFxuICAgICAgbWF0Y2hpbmdUZXh0ID0gJycsXG4gICAgICBhbnNpU3RhdGUgPSBbXSxcbiAgICAgIHJlc3VsdCA9IFtdLFxuICAgICAgb3V0cHV0ID0gXCJcIixcbiAgICAgIHN0YXRlID0ge30sXG4gICAgICBlcmFzZUNoYXI7XG5cbiAgdmFyIGhhbmRsZVJlc3VsdCA9IGZ1bmN0aW9uKHApIHtcbiAgICB2YXIgY2xhc3NlcyA9IFtdO1xuXG4gICAgcC5mb3JlZ3JvdW5kICYmIGNsYXNzZXMucHVzaChwLmZvcmVncm91bmQpO1xuICAgIHAuYmFja2dyb3VuZCAmJiBjbGFzc2VzLnB1c2goJ2JnLScgKyBwLmJhY2tncm91bmQpO1xuICAgIHAuYm9sZCAgICAgICAmJiBjbGFzc2VzLnB1c2goJ2JvbGQnKTtcbiAgICBwLml0YWxpYyAgICAgJiYgY2xhc3Nlcy5wdXNoKCdpdGFsaWMnKTtcbiAgICBpZiAoIXAudGV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY2xhc3Nlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBvdXRwdXQgKz0gcC50ZXh0XG4gICAgfVxuICAgIHZhciBzcGFuID0gJzxzcGFuIGNsYXNzPVwiJyArIGNsYXNzZXMuam9pbignICcpICsgJ1wiPicgKyBwLnRleHQgKyAnPC9zcGFuPidcbiAgICBvdXRwdXQgKz0gc3BhblxuICB9XG4gIC8vXG4gIC8vIEdlbmVyYWwgd29ya2Zsb3cgZm9yIHRoaXMgdGhpbmcgaXM6XG4gIC8vIFxcMDMzXFxbMzNtVGV4dFxuICAvLyB8ICAgICB8ICB8XG4gIC8vIHwgICAgIHwgIG1hdGNoaW5nVGV4dFxuICAvLyB8ICAgICBtYXRjaGluZ0RhdGFcbiAgLy8gbWF0Y2hpbmdDb250cm9sXG4gIC8vXG4gIC8vIEluIGZ1cnRoZXIgc3RlcHMgd2UgaG9wZSBpdCdzIGFsbCBnb2luZyB0byBiZSBmaW5lLiBJdCB1c3VhbGx5IGlzLlxuICAvL1xuXG4gIC8vXG4gIC8vIEVyYXNlcyBhIGNoYXIgZnJvbSB0aGUgb3V0cHV0XG4gIC8vXG4gIGVyYXNlQ2hhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5kZXgsIHRleHQ7XG4gICAgaWYgKG1hdGNoaW5nVGV4dC5sZW5ndGgpIHtcbiAgICAgIG1hdGNoaW5nVGV4dCA9IG1hdGNoaW5nVGV4dC5zdWJzdHIoMCwgbWF0Y2hpbmdUZXh0Lmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBlbHNlIGlmIChyZXN1bHQubGVuZ3RoKSB7XG4gICAgICBpbmRleCA9IHJlc3VsdC5sZW5ndGggLSAxO1xuICAgICAgdGV4dCA9IHJlc3VsdFtpbmRleF0udGV4dDtcbiAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvL1xuICAgICAgICAvLyBBIHJlc3VsdCBiaXQgd2FzIGZ1bGx5IGRlbGV0ZWQsIHBvcCBpdCBvdXQgdG8gc2ltcGxpZnkgdGhlIGZpbmFsIG91dHB1dFxuICAgICAgICAvL1xuICAgICAgICByZXN1bHQucG9wKCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2luZGV4XS50ZXh0ID0gdGV4dC5zdWJzdHIoMCwgdGV4dC5sZW5ndGggLSAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobWF0Y2hpbmdDb250cm9sICE9PSBudWxsKSB7XG4gICAgICBpZiAobWF0Y2hpbmdDb250cm9sID09ICdcXDAzMycgJiYgc3RyW2ldID09ICdcXFsnKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIFdlJ3ZlIG1hdGNoZWQgZnVsbCBjb250cm9sIGNvZGUuIExldHMgc3RhcnQgbWF0Y2hpbmcgZm9ybWF0aW5nIGRhdGEuXG4gICAgICAgIC8vXG5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gXCJlbWl0XCIgbWF0Y2hlZCB0ZXh0IHdpdGggY29ycmVjdCBzdGF0ZVxuICAgICAgICAvL1xuICAgICAgICBpZiAobWF0Y2hpbmdUZXh0KSB7XG4gICAgICAgICAgc3RhdGUudGV4dCA9IG1hdGNoaW5nVGV4dDtcbiAgICAgICAgICBoYW5kbGVSZXN1bHQoc3RhdGUpO1xuICAgICAgICAgIHN0YXRlID0ge307XG4gICAgICAgICAgbWF0Y2hpbmdUZXh0ID0gXCJcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIG1hdGNoaW5nQ29udHJvbCA9IG51bGw7XG4gICAgICAgIG1hdGNoaW5nRGF0YSA9ICcnO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIFdlIGZhaWxlZCB0byBtYXRjaCBhbnl0aGluZyAtIG1vc3QgbGlrZWx5IGEgYmFkIGNvbnRyb2wgY29kZS4gV2VcbiAgICAgICAgLy8gZ28gYmFjayB0byBtYXRjaGluZyByZWd1bGFyIHN0cmluZ3MuXG4gICAgICAgIC8vXG4gICAgICAgIG1hdGNoaW5nVGV4dCArPSBtYXRjaGluZ0NvbnRyb2wgKyBzdHJbaV07XG4gICAgICAgIG1hdGNoaW5nQ29udHJvbCA9IG51bGw7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAobWF0Y2hpbmdEYXRhICE9PSBudWxsKSB7XG4gICAgICBpZiAoc3RyW2ldID09ICc7Jykge1xuICAgICAgICAvL1xuICAgICAgICAvLyBgO2Agc2VwYXJhdGVzIG1hbnkgZm9ybWF0dGluZyBjb2RlcywgZm9yIGV4YW1wbGU6IGBcXDAzM1szMzs0M21gXG4gICAgICAgIC8vIG1lYW5zIHRoYXQgYm90aCBgMzNgIGFuZCBgNDNgIHNob3VsZCBiZSBhcHBsaWVkLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUT0RPOiB0aGlzIGNhbiBiZSBzaW1wbGlmaWVkIGJ5IG1vZGlmeWluZyBzdGF0ZSBoZXJlLlxuICAgICAgICAvL1xuICAgICAgICBhbnNpU3RhdGUucHVzaChtYXRjaGluZ0RhdGEpO1xuICAgICAgICBtYXRjaGluZ0RhdGEgPSAnJztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHN0cltpXSA9PSAnbScpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gYG1gIGZpbmlzaGVkIHdob2xlIGZvcm1hdHRpbmcgY29kZS4gV2UgY2FuIHByb2NlZWQgdG8gbWF0Y2hpbmdcbiAgICAgICAgLy8gZm9ybWF0dGVkIHRleHQuXG4gICAgICAgIC8vXG4gICAgICAgIGFuc2lTdGF0ZS5wdXNoKG1hdGNoaW5nRGF0YSk7XG4gICAgICAgIG1hdGNoaW5nRGF0YSA9IG51bGw7XG4gICAgICAgIG1hdGNoaW5nVGV4dCA9ICcnO1xuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIENvbnZlcnQgbWF0Y2hlZCBmb3JtYXR0aW5nIGRhdGEgaW50byB1c2VyLWZyaWVuZGx5IHN0YXRlIG9iamVjdC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETzogRFJZLlxuICAgICAgICAvL1xuICAgICAgICBhbnNpU3RhdGUuZm9yRWFjaChmdW5jdGlvbiAoYW5zaUNvZGUpIHtcbiAgICAgICAgICBpZiAoYW5zaXBhcnNlLmZvcmVncm91bmRDb2xvcnNbYW5zaUNvZGVdKSB7XG4gICAgICAgICAgICBzdGF0ZS5mb3JlZ3JvdW5kID0gYW5zaXBhcnNlLmZvcmVncm91bmRDb2xvcnNbYW5zaUNvZGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpcGFyc2UuYmFja2dyb3VuZENvbG9yc1thbnNpQ29kZV0pIHtcbiAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmQgPSBhbnNpcGFyc2UuYmFja2dyb3VuZENvbG9yc1thbnNpQ29kZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDM5KSB7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUuZm9yZWdyb3VuZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gNDkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5iYWNrZ3JvdW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpcGFyc2Uuc3R5bGVzW2Fuc2lDb2RlXSkge1xuICAgICAgICAgICAgc3RhdGVbYW5zaXBhcnNlLnN0eWxlc1thbnNpQ29kZV1dID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMjIpIHtcbiAgICAgICAgICAgIHN0YXRlLmJvbGQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMjMpIHtcbiAgICAgICAgICAgIHN0YXRlLml0YWxpYyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAyNCkge1xuICAgICAgICAgICAgc3RhdGUudW5kZXJsaW5lID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYW5zaVN0YXRlID0gW107XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbWF0Y2hpbmdEYXRhICs9IHN0cltpXTtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChzdHJbaV0gPT0gJ1xcMDMzJykge1xuICAgICAgbWF0Y2hpbmdDb250cm9sID0gc3RyW2ldO1xuICAgIH1cbiAgICBlbHNlIGlmIChzdHJbaV0gPT0gJ1xcdTAwMDgnKSB7XG4gICAgICBlcmFzZUNoYXIoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBtYXRjaGluZ1RleHQgKz0gc3RyW2ldO1xuICAgIH1cbiAgfVxuXG4gIGlmIChtYXRjaGluZ1RleHQpIHtcbiAgICBzdGF0ZS50ZXh0ID0gbWF0Y2hpbmdUZXh0ICsgKG1hdGNoaW5nQ29udHJvbCA/IG1hdGNoaW5nQ29udHJvbCA6ICcnKTtcbiAgICBoYW5kbGVSZXN1bHQoc3RhdGUpO1xuICB9XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbmFuc2lwYXJzZS5mb3JlZ3JvdW5kQ29sb3JzID0ge1xuICAnMzAnOiAnYmxhY2snLFxuICAnMzEnOiAncmVkJyxcbiAgJzMyJzogJ2dyZWVuJyxcbiAgJzMzJzogJ3llbGxvdycsXG4gICczNCc6ICdibHVlJyxcbiAgJzM1JzogJ21hZ2VudGEnLFxuICAnMzYnOiAnY3lhbicsXG4gICczNyc6ICd3aGl0ZScsXG4gICc5MCc6ICdncmV5J1xufTtcblxuYW5zaXBhcnNlLmJhY2tncm91bmRDb2xvcnMgPSB7XG4gICc0MCc6ICdibGFjaycsXG4gICc0MSc6ICdyZWQnLFxuICAnNDInOiAnZ3JlZW4nLFxuICAnNDMnOiAneWVsbG93JyxcbiAgJzQ0JzogJ2JsdWUnLFxuICAnNDUnOiAnbWFnZW50YScsXG4gICc0Nic6ICdjeWFuJyxcbiAgJzQ3JzogJ3doaXRlJ1xufTtcblxuYW5zaXBhcnNlLnN0eWxlcyA9IHtcbiAgJzEnOiAnYm9sZCcsXG4gICczJzogJ2l0YWxpYycsXG4gICc0JzogJ3VuZGVybGluZSdcbn07XG5cbmZ1bmN0aW9uIGFuc2lmaWx0ZXIoZGF0YSwgcGxhaW50ZXh0LCBjYWNoZSkge1xuXG4gIC8vIGhhbmRsZSB0aGUgY2hhcmFjdGVycyBmb3IgXCJkZWxldGUgbGluZVwiIGFuZCBcIm1vdmUgdG8gc3RhcnQgb2YgbGluZVwiXG4gIHZhciBzdGFydHN3aXRoY3IgPSAvXlteXFxuXSpcXHJbXlxcbl0vLnRlc3QoZGF0YSk7XG4gIHZhciBvdXRwdXQgPSBhbnNpcGFyc2UoZGF0YSk7XG5cbiAgdmFyIHJlcyA9IG91dHB1dC5yZXBsYWNlKC9cXDAzMy9nLCAnJyk7XG4gIGlmIChzdGFydHN3aXRoY3IpIHJlcyA9ICdcXHInICsgcmVzO1xuXG4gIHJldHVybiByZXM7XG59XG5cbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVKb2JTdG9yZTtcbmZ1bmN0aW9uIGNyZWF0ZUpvYlN0b3JlKCkge1xuICByZXR1cm4gbmV3IEpvYlN0b3JlO1xufVxuXG52YXIgUEhBU0VTID0gZXhwb3J0cy5waGFzZXMgPVxuWydlbnZpcm9ubWVudCcsICdwcmVwYXJlJywgJ3Rlc3QnLCAnZGVwbG95JywgJ2NsZWFudXAnXTtcblxudmFyIHN0YXR1c0hhbmRsZXJzID0ge1xuICAnc3RhcnRlZCc6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zdGFydGVkID0gdGltZTtcbiAgICB0aGlzLnBoYXNlID0gJ2Vudmlyb25tZW50JztcbiAgICB0aGlzLnN0YXR1cyA9ICdydW5uaW5nJztcbiAgfSxcbiAgJ2Vycm9yZWQnOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICB0aGlzLmVycm9yID0gZXJyb3I7XG4gICAgdGhpcy5zdGF0dXMgPSAnZXJyb3JlZCc7XG4gIH0sXG4gICdjYW5jZWxlZCc6ICdlcnJvcmVkJyxcbiAgJ3BoYXNlLmRvbmUnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHRoaXMucGhhc2UgPSBQSEFTRVMuaW5kZXhPZihkYXRhLnBoYXNlKSArIDE7XG4gIH0sXG4gIC8vIHRoaXMgaXMganVzdCBzbyB3ZSdsbCB0cmlnZ2VyIHRoZSBcInVua25vd24gam9iXCIgbG9va3VwIHNvb25lciBvbiB0aGUgZGFzaGJvYXJkXG4gICdzdGRvdXQnOiBmdW5jdGlvbiAodGV4dCkge30sXG4gICdzdGRlcnInOiBmdW5jdGlvbiAodGV4dCkge30sXG4gICd3YXJuaW5nJzogZnVuY3Rpb24gKHdhcm5pbmcpIHtcbiAgICBpZiAoIXRoaXMud2FybmluZ3MpIHtcbiAgICAgIHRoaXMud2FybmluZ3MgPSBbXTtcbiAgICB9XG4gICAgdGhpcy53YXJuaW5ncy5wdXNoKHdhcm5pbmcpO1xuICB9LFxuICAncGx1Z2luLWRhdGEnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBwYXRoID0gZGF0YS5wYXRoID8gW2RhdGEucGx1Z2luXS5jb25jYXQoZGF0YS5wYXRoLnNwbGl0KCcuJykpIDogW2RhdGEucGx1Z2luXVxuICAgICwgbGFzdCA9IHBhdGgucG9wKClcbiAgICAsIG1ldGhvZCA9IGRhdGEubWV0aG9kIHx8ICdyZXBsYWNlJ1xuICAgICwgcGFyZW50XG4gICAgcGFyZW50ID0gcGF0aC5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgYXR0cikge1xuICAgICAgcmV0dXJuIG9ialthdHRyXSB8fCAob2JqW2F0dHJdID0ge30pXG4gICAgfSwgdGhpcy5wbHVnaW5fZGF0YSB8fCAodGhpcy5wbHVnaW5fZGF0YSA9IHt9KSlcbiAgICBpZiAobWV0aG9kID09PSAncmVwbGFjZScpIHtcbiAgICAgIHBhcmVudFtsYXN0XSA9IGRhdGEuZGF0YVxuICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSAncHVzaCcpIHtcbiAgICAgIGlmICghcGFyZW50W2xhc3RdKSB7XG4gICAgICAgIHBhcmVudFtsYXN0XSA9IFtdXG4gICAgICB9XG4gICAgICBwYXJlbnRbbGFzdF0ucHVzaChkYXRhLmRhdGEpXG4gICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdleHRlbmQnKSB7XG4gICAgICBpZiAoIXBhcmVudFtsYXN0XSkge1xuICAgICAgICBwYXJlbnRbbGFzdF0gPSB7fVxuICAgICAgfVxuICAgICAgZXh0ZW5kKHBhcmVudFtsYXN0XSwgZGF0YS5kYXRhKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIFwicGx1Z2luIGRhdGFcIiBtZXRob2QgcmVjZWl2ZWQgZnJvbSBwbHVnaW4nLCBkYXRhLnBsdWdpbiwgZGF0YS5tZXRob2QsIGRhdGEpXG4gICAgfVxuICB9LFxuXG4gICdwaGFzZS5kb25lJzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHRoaXMucGhhc2VzW2RhdGEucGhhc2VdLmZpbmlzaGVkID0gZGF0YS50aW1lO1xuICAgIHRoaXMucGhhc2VzW2RhdGEucGhhc2VdLmR1cmF0aW9uID0gZGF0YS5lbGFwc2VkXG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZXhpdENvZGUgPSBkYXRhLmNvZGU7XG4gICAgaWYgKFsncHJlcGFyZScsICdlbnZpcm9ubWVudCcsICdjbGVhbnVwJ10uaW5kZXhPZihkYXRhLnBoYXNlKSAhPT0gLTEpIHtcbiAgICAgIHRoaXMucGhhc2VzW2RhdGEucGhhc2VdLmNvbGxhcHNlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChkYXRhLnBoYXNlID09PSAndGVzdCcpIHRoaXMudGVzdF9zdGF0dXMgPSBkYXRhLmNvZGU7XG4gICAgaWYgKGRhdGEucGhhc2UgPT09ICdkZXBsb3knKSB0aGlzLmRlcGxveV9zdGF0dXMgPSBkYXRhLmNvZGU7XG4gICAgaWYgKCFkYXRhLm5leHQgfHwgIXRoaXMucGhhc2VzW2RhdGEubmV4dF0pIHJldHVybjtcbiAgICB0aGlzLnBoYXNlID0gZGF0YS5uZXh0O1xuICAgIHRoaXMucGhhc2VzW2RhdGEubmV4dF0uc3RhcnRlZCA9IGRhdGEudGltZTtcbiAgfSxcbiAgJ2NvbW1hbmQuY29tbWVudCc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kKTtcbiAgICBjb21tYW5kLmNvbW1hbmQgPSBkYXRhLmNvbW1lbnQ7XG4gICAgY29tbWFuZC5jb21tZW50ID0gdHJ1ZTtcbiAgICBjb21tYW5kLnBsdWdpbiA9IGRhdGEucGx1Z2luO1xuICAgIGNvbW1hbmQuZmluaXNoZWQgPSBkYXRhLnRpbWU7XG4gICAgcGhhc2UuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfSxcbiAgJ2NvbW1hbmQuc3RhcnQnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdmFyIHBoYXNlID0gdGhpcy5waGFzZXNbdGhpcy5waGFzZV1cbiAgICAgICwgY29tbWFuZCA9IGV4dGVuZCh7fSwgU0tFTFMuY29tbWFuZCwgZGF0YSk7XG4gICAgY29tbWFuZC5zdGFydGVkID0gZGF0YS50aW1lO1xuICAgIHBoYXNlLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gIH0sXG4gICdjb21tYW5kLmRvbmUnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdmFyIHBoYXNlID0gdGhpcy5waGFzZXNbdGhpcy5waGFzZV1cbiAgICAgICwgY29tbWFuZCA9IHBoYXNlLmNvbW1hbmRzW3BoYXNlLmNvbW1hbmRzLmxlbmd0aCAtIDFdO1xuICAgIGNvbW1hbmQuZmluaXNoZWQgPSBkYXRhLnRpbWU7XG4gICAgY29tbWFuZC5kdXJhdGlvbiA9IGRhdGEuZWxhcHNlZDtcbiAgICBjb21tYW5kLmV4aXRDb2RlID0gZGF0YS5leGl0Q29kZTtcbiAgICBjb21tYW5kLm1lcmdlZCA9IGNvbW1hbmQuX21lcmdlZDtcbiAgfSxcbiAgJ3N0ZG91dCc6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgY29tbWFuZCA9IGVuc3VyZUNvbW1hbmQodGhpcy5waGFzZXNbdGhpcy5waGFzZV0pO1xuICAgIGNvbW1hbmQub3V0ICs9IHRleHQ7XG4gICAgY29tbWFuZC5fbWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQub3V0ICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkX2xhdGVzdCA9IHRleHQ7XG4gIH0sXG4gICdzdGRlcnInOiBmdW5jdGlvbiAodGV4dCkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdmFyIGNvbW1hbmQgPSBlbnN1cmVDb21tYW5kKHRoaXMucGhhc2VzW3RoaXMucGhhc2VdKTtcbiAgICBjb21tYW5kLmVyciArPSB0ZXh0O1xuICAgIGNvbW1hbmQuX21lcmdlZCArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLmVyciArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLm1lcmdlZCArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLm1lcmdlZF9sYXRlc3QgPSB0ZXh0O1xuICB9XG59XG5cbmZ1bmN0aW9uIEpvYlN0b3JlKCkge1xuICB0aGlzLmpvYnMgPSB7XG4gICAgZGFzaGJvYXJkOiBkYXNoYm9hcmQuYmluZCh0aGlzKSxcbiAgICBwdWJsaWM6IFtdLFxuICAgIHlvdXJzOiBbXSxcbiAgICBsaW1ibzogW11cbiAgfTtcbn1cbnZhciBKUyA9IEpvYlN0b3JlLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gZGFzaGJvYXJkKGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5zb2NrZXQuZW1pdCgnZGFzaGJvYXJkOmpvYnMnLCBmdW5jdGlvbihqb2JzKSB7XG4gICAgc2VsZi5qb2JzLnlvdXJzID0gam9icy55b3VycztcbiAgICBzZWxmLmpvYnMucHVibGljID0gam9icy5wdWJsaWM7XG4gICAgc2VsZi5jaGFuZ2VkKCk7XG4gIH0pO1xufVxuXG5cbi8vLyAtLS0tIEpvYiBTdG9yZSBwcm90b3R5cGUgZnVuY3Rpb25zOiAtLS0tXG5cbi8vLyBjb25uZWN0XG5cbkpTLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KHNvY2tldCwgY2hhbmdlQ2FsbGJhY2spIHtcbiAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG4gIHRoaXMuY2hhbmdlQ2FsbGJhY2sgPSBjaGFuZ2VDYWxsYmFjaztcblxuICBmb3IgKHZhciBzdGF0dXMgaW4gc3RhdHVzSGFuZGxlcnMpIHtcbiAgICBzb2NrZXQub24oJ2pvYi5zdGF0dXMuJyArIHN0YXR1cywgdGhpcy51cGRhdGUuYmluZCh0aGlzLCBzdGF0dXMpKVxuICB9XG5cbiAgc29ja2V0Lm9uKCdqb2IubmV3JywgSlMubmV3Sm9iLmJpbmQodGhpcykpO1xufTtcblxuXG4vLy8gdXBkYXRlIC0gaGFuZGxlIHVwZGF0ZSBldmVudFxuXG5KUy51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZXZlbnQsIGFyZ3MsIGFjY2VzcywgZG9udGNoYW5nZSkge1xuICB2YXIgaWQgPSBhcmdzLnNoaWZ0KClcbiAgICAsIGpvYiA9IHRoaXMuam9iKGlkLCBhY2Nlc3MpXG4gICAgLCBoYW5kbGVyID0gc3RhdHVzSGFuZGxlcnNbZXZlbnRdO1xuICBpZiAoIWpvYikgcmV0dXJuIHRoaXMudW5rbm93bihpZCwgZXZlbnQsIGFyZ3MsIGFjY2VzcylcbiAgaWYgKCFoYW5kbGVyKSByZXR1cm47XG4gIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIGhhbmRsZXIpIHtcbiAgICBqb2Iuc3RhdHVzID0gaGFuZGxlcjtcbiAgfSBlbHNlIHtcbiAgICBoYW5kbGVyLmFwcGx5KGpvYiwgYXJncyk7XG4gIH1cbiAgaWYgKCFkb250Y2hhbmdlKSB0aGlzLmNoYW5nZWQoKTtcbn07XG5cblxuLy8vIG5ld0pvYiAtIHdoZW4gc2VydmVyIG5vdGlmaWVzIG9mIG5ldyBqb2JcblxuSlMubmV3Sm9iID0gZnVuY3Rpb24gbmV3Sm9iKGpvYiwgYWNjZXNzKSB7XG4gIGlmICghIGpvYikgcmV0dXJuO1xuICBpZiAoQXJyYXkuaXNBcnJheShqb2IpKSBqb2IgPSBqb2JbMF07XG5cbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNbYWNjZXNzXVxuICAgICwgZm91bmQgPSAtMVxuICAgICwgb2xkO1xuXG4gIGlmICghIGpvYnMpIHJldHVybjtcblxuICBmdW5jdGlvbiBzZWFyY2goKSB7XG4gICAgZm9yICh2YXIgaT0wOyBpPGpvYnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChqb2JzW2ldLnByb2plY3QubmFtZSA9PT0gam9iLnByb2plY3QubmFtZSkge1xuICAgICAgICBmb3VuZCA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNlYXJjaCgpO1xuICBpZiAoZm91bmQgPCAwKSB7XG4gICAgLy8vIHRyeSBsaW1ib1xuICAgIGpvYnMgPSB0aGlzLmpvYnMubGltYm87XG4gICAgc2VhcmNoKCk7XG4gICAgaWYgKGZvdW5kKSB7XG4gICAgICBqb2JzID0gdGhpcy5qb2JzW2FjY2Vzc107XG4gICAgICBqb2JzLnVuc2hpZnQodGhpcy5qb2JzLmxpbWJvW2ZvdW5kXSk7XG4gICAgICB0aGlzLmpvYnMubGltYm8uc3BsaWNlKGZvdW5kLCAxKTtcbiAgICB9XG4gIH1cblxuICBpZiAoZm91bmQgIT09IC0xKSB7XG4gICAgb2xkID0gam9icy5zcGxpY2UoZm91bmQsIDEpWzBdO1xuICAgIGpvYi5wcm9qZWN0LnByZXYgPSBvbGQucHJvamVjdC5wcmV2O1xuICB9XG4gIC8vIGlmIChqb2IucGhhc2VzKSB7XG4gIC8vICAgLy8gZ2V0IHJpZCBvZiBleHRyYSBkYXRhIC0gd2UgZG9uJ3QgbmVlZCBpdC5cbiAgLy8gICAvLyBub3RlOiB0aGlzIHdvbid0IGJlIHBhc3NlZCB1cCBhbnl3YXkgZm9yIHB1YmxpYyBwcm9qZWN0c1xuICAvLyAgIGNsZWFuSm9iKGpvYik7XG4gIC8vIH1cbiAgLy9qb2IucGhhc2UgPSAnZW52aXJvbm1lbnQnO1xuICBqb2JzLnVuc2hpZnQoam9iKTtcbiAgdGhpcy5jaGFuZ2VkKCk7XG59O1xuXG5cbi8vLyBqb2IgLSBmaW5kIGEgam9iIGJ5IGlkIGFuZCBhY2Nlc3MgbGV2ZWxcblxuSlMuam9iID0gZnVuY3Rpb24gam9iKGlkLCBhY2Nlc3MpIHtcbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNbYWNjZXNzXTtcbiAgdmFyIGpvYiA9IHNlYXJjaChpZCwgam9icyk7XG4gIC8vIGlmIG5vdCBmb3VuZCwgdHJ5IGxpbWJvXG4gIGlmICghIGpvYil7XG4gICAgam9iID0gc2VhcmNoKGlkLCB0aGlzLmpvYnMubGltYm8pO1xuICAgIGlmIChqb2IpIHtcbiAgICAgIGpvYnMudW5zaGlmdChqb2IpO1xuICAgICAgdGhpcy5qb2JzLmxpbWJvLnNwbGljZSh0aGlzLmpvYnMubGltYm8uaW5kZXhPZihqb2IpLCAxKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGpvYjtcbn07XG5cbmZ1bmN0aW9uIHNlYXJjaChpZCwgam9icykge1xuICBmb3IgKHZhciBpPTA7IGk8am9icy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChqb2JzW2ldLl9pZCA9PT0gaWQpIHJldHVybiBqb2JzW2ldO1xuICB9XG59XG5cblxuLy8vIGNoYW5nZWQgLSBub3RpZmllcyBVSSBvZiBjaGFuZ2VzXG5cbkpTLmNoYW5nZWQgPSBmdW5jdGlvbiBjaGFuZ2VkKCkge1xuICB0aGlzLmNoYW5nZUNhbGxiYWNrKCk7XG59O1xuXG5cbi8vLyBsb2FkIOKAlMKgbG9hZHMgYSBqb2JcblxuSlMubG9hZCA9IGZ1bmN0aW9uIGxvYWQoam9iSWQsIGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5zb2NrZXQuZW1pdCgnYnVpbGQ6am9iJywgam9iSWQsIGZ1bmN0aW9uKGpvYikge1xuICAgIHNlbGYubmV3Sm9iKGpvYiwgJ2xpbWJvJyk7XG4gICAgY2Ioam9iKTtcbiAgICBzZWxmLmNoYW5nZWQoKTtcbiAgfSk7XG59O1xuXG5mdW5jdGlvbiBlbnN1cmVDb21tYW5kKHBoYXNlKSB7XG4gIHZhciBjb21tYW5kID0gcGhhc2UuY29tbWFuZHNbcGhhc2UuY29tbWFuZHMubGVuZ3RoIC0gMV07XG4gIGlmICghY29tbWFuZCB8fCB0eXBlb2YoY29tbWFuZC5maW5pc2hlZCkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29tbWFuZCA9IGV4dGVuZCh7fSwgU0tFTFMuY29tbWFuZCk7XG4gICAgcGhhc2UuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfVxuICByZXR1cm4gY29tbWFuZDtcbn0iLCJ2YXIgSm9iU3RvcmUgPSByZXF1aXJlKCcuL2pvYl9zdG9yZScpO1xudmFyIGpvYlN0b3JlID0gSm9iU3RvcmUoKTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gQnVpbGRTdHJpZGVyO1xuXG5mdW5jdGlvbiBCdWlsZFN0cmlkZXIoJHJlc291cmNlLCAkaHR0cCkge1xuICByZXR1cm4gbmV3IFN0cmlkZXIoJHJlc291cmNlLCAkaHR0cCk7XG59XG5cblxudmFyIHNvY2tldDtcbnZhciBzY29wZXMgPSBbXTtcblxuZnVuY3Rpb24gU3RyaWRlcigkcmVzb3VyY2UsICRodHRwLCBvcHRzKSB7XG4gIGlmICghIG9wdHMpIG9wdHMgPSB7fTtcbiAgaWYgKHR5cGVvZiBvcHRzID09ICdzdHJpbmcnKVxuICAgIG9wdHMgPSB7IHVybDogb3B0cyB9O1xuXG4gIHRoaXMudXJsID0gb3B0cy51cmwgfHwgJy8vbG9jYWxob3N0OjMwMDAnO1xuXG4gIC8vLyBSRVNUZnVsIEFQSSBzZXR1cFxuICB2YXIgYXBpQmFzZSAgPSB0aGlzLnVybCArICcvYXBpJztcbiAgdmFyIGxvZ2luVVJMID0gdGhpcy51cmwgKyAnL2xvZ2luJztcbiAgdGhpcy5TZXNzaW9uID0gJHJlc291cmNlKGFwaUJhc2UgKyAnL3Nlc3Npb24vJyk7XG4gIHRoaXMuUmVwbyAgICA9ICRyZXNvdXJjZShhcGlCYXNlICsgJy86b3duZXIvOnJlcG8vJyk7XG4gIHRoaXMuSm9iICAgICA9ICRyZXNvdXJjZShhcGlCYXNlICsgJy86b3duZXIvOnJlcG8vam9iLzpqb2JpZCcpO1xuICB0aGlzLkNvbmZpZyAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvOm93bmVyLzpyZXBvL2NvbmZpZycsIHt9LCB7XG4gICAgZ2V0OiB7XG4gICAgICBtZXRob2Q6ICdHRVQnXG4gICAgfSxcbiAgICBzYXZlOiB7XG4gICAgICBtZXRob2Q6ICdQVVQnXG4gICAgfVxuICB9KTtcbiAgdGhpcy5SZWd1bGFyQ29uZmlnICA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NvbmZpZycsIHt9LCB7XG4gICAgc2F2ZToge1xuICAgICAgbWV0aG9kOiAnUFVUJ1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuQ29uZmlnLkJyYW5jaCA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NvbmZpZy86YnJhbmNoXFxcXC8nLCB7fSwge1xuICAgIHNhdmU6IHtcbiAgICAgIG1ldGhvZDogJ1BVVCdcbiAgICB9XG4gIH0pO1xuICB0aGlzLkNvbmZpZy5CcmFuY2guUnVubmVyID0gJHJlc291cmNlKHRoaXMudXJsICsgJy86b3duZXIvOnJlcG8vY29uZmlnLzpicmFuY2gvcnVubmVyJywge30sIHtcbiAgICBzYXZlOiB7XG4gICAgICBtZXRob2Q6ICdQVVQnXG4gICAgfVxuICB9KTtcbiAgdGhpcy5Db25maWcuQnJhbmNoLlBsdWdpbiAgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9jb25maWcvOmJyYW5jaC86cGx1Z2luJywge30sIHtcbiAgICBzYXZlOiB7XG4gICAgICBtZXRob2Q6ICdQVVQnXG4gICAgfVxuICB9KTtcbiAgdGhpcy5Qcm92aWRlciA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL3Byb3ZpZGVyJyk7XG4gIHRoaXMuQ2FjaGUgICA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NhY2hlJyk7XG4gIHRoaXMuU3RhcnQgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9zdGFydCcpO1xuICB0aGlzLktleWdlbiAgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9rZXlnZW4vOmJyYW5jaFxcXFwvJyk7XG5cbiAgdGhpcy5TdGF0dXNCbG9ja3MgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnL3N0YXR1c0Jsb2NrcycsIHt9LCB7XG4gICAgZ2V0OiB7XG4gICAgICBtZXRob2Q6ICdHRVQnXG4gICAgfVxuICB9KTtcblxuICB0aGlzLmpvYnMgICAgPSBqb2JTdG9yZS5qb2JzO1xuICB0aGlzLnBoYXNlcyAgPSBKb2JTdG9yZS5waGFzZXM7XG5cbiAgdGhpcy4kaHR0cCA9ICRodHRwO1xufVxuXG5cbnZhciBTID0gU3RyaWRlci5wcm90b3R5cGU7XG5cblxuLy8vIGNoYW5nZWQgLSBpbnZva2VkIHdoZW4gVUkgbmVlZHMgdXBkYXRpbmdcbmZ1bmN0aW9uIGNoYW5nZWQoKSB7XG4gIHNjb3Blcy5mb3JFYWNoKGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgc2NvcGUuJGRpZ2VzdCgpO1xuICB9KTtcbn1cblxuXG4vLy8vIC0tLS0gU3RyaWRlciBwcm90b3R5cGUgZnVuY3Rpb25zXG5cbi8vLyBjb25uZWN0XG5cblMuY29ubmVjdCA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gIGlmICghIHNvY2tldCkge1xuICAgIHNvY2tldCA9IGlvLmNvbm5lY3QodGhpcy51cmwpO1xuXG4gICAgLy8vIGNvbm5lY3RzIGpvYiBzdG9yZSB0byBuZXcgc29ja2V0XG4gICAgam9iU3RvcmUuY29ubmVjdChzb2NrZXQsIGNoYW5nZWQpO1xuICB9XG4gIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuXG4gIHNjb3Blcy5wdXNoKHNjb3BlKTtcbiAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSAwIDsgISBmb3VuZCAmJiBpIDwgc2NvcGVzLmxlbmd0aDsgaSArKykge1xuICAgICAgaWYgKHNjb3Blc1tpXSA9PSBzY29wZSkge1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIHNjb3Blcy5zcGxpY2UoaSwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cblxuLy8vIGRlcGxveVxuXG5TLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShwcm9qZWN0KSB7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ2RlcGxveScsIHByb2plY3QubmFtZSB8fCBwcm9qZWN0KTtcbn07XG5cblMudGVzdCA9IGZ1bmN0aW9uIHRlc3QocHJvamVjdCkge1xuICB0aGlzLnNvY2tldC5lbWl0KCd0ZXN0JywgcHJvamVjdC5uYW1lIHx8IHByb2plY3QpO1xufTtcblxuXG4vLy8gam9iXG5cblMuam9iID0gZnVuY3Rpb24gam9iKGpvYklkLCBjYikge1xuICBqb2JTdG9yZS5sb2FkKGpvYklkLCBjYik7XG59O1xuXG5cbi8vLyBIVFRQXG5cblMucG9zdCA9IGZ1bmN0aW9uKHVybCwgYm9keSwgY2IpIHtcbiAgcmV0dXJuIHRoaXMucmVxdWVzdCgnUE9TVCcsIHVybCwgYm9keSwgY2IpO1xufTtcblxuUy5kZWwgPSBmdW5jdGlvbih1cmwsIGNiKSB7XG4gIHJldHVybiB0aGlzLnJlcXVlc3QoJ0RFTEVURScsIHVybCwgY2IpO1xufTtcblxuUy5yZXF1ZXN0ID0gZnVuY3Rpb24obWV0aG9kLCB1cmwsIGJvZHksIGNiKSB7XG4gIGlmICh0eXBlb2YgYm9keSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBib2R5O1xuICAgIGJvZHkgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgcmVxID0gdGhpcy4kaHR0cCh7XG4gICAgbWV0aG9kOiBtZXRob2QsXG4gICAgdXJsOiB0aGlzLnVybCArIHVybCxcbiAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShib2R5KVxuICB9KTtcblxuICByZXEuc3VjY2VzcyhjYik7XG5cbiAgcmV0dXJuIHJlcTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGhhc0tleXNcblxuZnVuY3Rpb24gaGFzS2V5cyhzb3VyY2UpIHtcbiAgICByZXR1cm4gc291cmNlICE9PSBudWxsICYmXG4gICAgICAgICh0eXBlb2Ygc291cmNlID09PSBcIm9iamVjdFwiIHx8XG4gICAgICAgIHR5cGVvZiBzb3VyY2UgPT09IFwiZnVuY3Rpb25cIilcbn1cbiIsInZhciBLZXlzID0gcmVxdWlyZShcIm9iamVjdC1rZXlzXCIpXG52YXIgaGFzS2V5cyA9IHJlcXVpcmUoXCIuL2hhcy1rZXlzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBpZiAoIWhhc0tleXMoc291cmNlKSkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXlzID0gS2V5cyhzb3VyY2UpXG5cbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IGtleXNbal1cbiAgICAgICAgICAgIHRhcmdldFtuYW1lXSA9IHNvdXJjZVtuYW1lXVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uIChmbikge1xuXHR2YXIgaXNGdW5jID0gKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyAmJiAhKGZuIGluc3RhbmNlb2YgUmVnRXhwKSkgfHwgdG9TdHJpbmcuY2FsbChmbikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cdGlmICghaXNGdW5jICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0aXNGdW5jID0gZm4gPT09IHdpbmRvdy5zZXRUaW1lb3V0IHx8IGZuID09PSB3aW5kb3cuYWxlcnQgfHwgZm4gPT09IHdpbmRvdy5jb25maXJtIHx8IGZuID09PSB3aW5kb3cucHJvbXB0O1xuXHR9XG5cdHJldHVybiBpc0Z1bmM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZvckVhY2gob2JqLCBmbikge1xuXHRpZiAoIWlzRnVuY3Rpb24oZm4pKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXRlcmF0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cdH1cblx0dmFyIGksIGssXG5cdFx0aXNTdHJpbmcgPSB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJyxcblx0XHRsID0gb2JqLmxlbmd0aCxcblx0XHRjb250ZXh0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcmd1bWVudHNbMl0gOiBudWxsO1xuXHRpZiAobCA9PT0gK2wpIHtcblx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRpZiAoY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdFx0XHRmbihpc1N0cmluZyA/IG9iai5jaGFyQXQoaSkgOiBvYmpbaV0sIGksIG9iaik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmbi5jYWxsKGNvbnRleHQsIGlzU3RyaW5nID8gb2JqLmNoYXJBdChpKSA6IG9ialtpXSwgaSwgb2JqKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Zm9yIChrIGluIG9iaikge1xuXHRcdFx0aWYgKGhhc093bi5jYWxsKG9iaiwgaykpIHtcblx0XHRcdFx0aWYgKGNvbnRleHQgPT09IG51bGwpIHtcblx0XHRcdFx0XHRmbihvYmpba10sIGssIG9iaik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Zm4uY2FsbChjb250ZXh0LCBvYmpba10sIGssIG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmtleXMgfHwgcmVxdWlyZSgnLi9zaGltJyk7XG5cbiIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcblx0dmFyIHN0ciA9IHRvU3RyaW5nLmNhbGwodmFsdWUpO1xuXHR2YXIgaXNBcmd1bWVudHMgPSBzdHIgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuXHRpZiAoIWlzQXJndW1lbnRzKSB7XG5cdFx0aXNBcmd1bWVudHMgPSBzdHIgIT09ICdbb2JqZWN0IEFycmF5XSdcblx0XHRcdCYmIHZhbHVlICE9PSBudWxsXG5cdFx0XHQmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnXG5cdFx0XHQmJiB0eXBlb2YgdmFsdWUubGVuZ3RoID09PSAnbnVtYmVyJ1xuXHRcdFx0JiYgdmFsdWUubGVuZ3RoID49IDBcblx0XHRcdCYmIHRvU3RyaW5nLmNhbGwodmFsdWUuY2FsbGVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblx0fVxuXHRyZXR1cm4gaXNBcmd1bWVudHM7XG59O1xuXG4iLCIoZnVuY3Rpb24gKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHQvLyBtb2RpZmllZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvZXM1LXNoaW1cblx0dmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG5cdFx0dG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuXHRcdGZvckVhY2ggPSByZXF1aXJlKCcuL2ZvcmVhY2gnKSxcblx0XHRpc0FyZ3MgPSByZXF1aXJlKCcuL2lzQXJndW1lbnRzJyksXG5cdFx0aGFzRG9udEVudW1CdWcgPSAhKHsndG9TdHJpbmcnOiBudWxsfSkucHJvcGVydHlJc0VudW1lcmFibGUoJ3RvU3RyaW5nJyksXG5cdFx0aGFzUHJvdG9FbnVtQnVnID0gKGZ1bmN0aW9uICgpIHt9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgncHJvdG90eXBlJyksXG5cdFx0ZG9udEVudW1zID0gW1xuXHRcdFx0XCJ0b1N0cmluZ1wiLFxuXHRcdFx0XCJ0b0xvY2FsZVN0cmluZ1wiLFxuXHRcdFx0XCJ2YWx1ZU9mXCIsXG5cdFx0XHRcImhhc093blByb3BlcnR5XCIsXG5cdFx0XHRcImlzUHJvdG90eXBlT2ZcIixcblx0XHRcdFwicHJvcGVydHlJc0VudW1lcmFibGVcIixcblx0XHRcdFwiY29uc3RydWN0b3JcIlxuXHRcdF0sXG5cdFx0a2V5c1NoaW07XG5cblx0a2V5c1NoaW0gPSBmdW5jdGlvbiBrZXlzKG9iamVjdCkge1xuXHRcdHZhciBpc09iamVjdCA9IG9iamVjdCAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0Jyxcblx0XHRcdGlzRnVuY3Rpb24gPSB0b1N0cmluZy5jYWxsKG9iamVjdCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG5cdFx0XHRpc0FyZ3VtZW50cyA9IGlzQXJncyhvYmplY3QpLFxuXHRcdFx0dGhlS2V5cyA9IFtdO1xuXG5cdFx0aWYgKCFpc09iamVjdCAmJiAhaXNGdW5jdGlvbiAmJiAhaXNBcmd1bWVudHMpIHtcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3Qua2V5cyBjYWxsZWQgb24gYSBub24tb2JqZWN0XCIpO1xuXHRcdH1cblxuXHRcdGlmIChpc0FyZ3VtZW50cykge1xuXHRcdFx0Zm9yRWFjaChvYmplY3QsIGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0XHR0aGVLZXlzLnB1c2godmFsdWUpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBuYW1lLFxuXHRcdFx0XHRza2lwUHJvdG8gPSBoYXNQcm90b0VudW1CdWcgJiYgaXNGdW5jdGlvbjtcblxuXHRcdFx0Zm9yIChuYW1lIGluIG9iamVjdCkge1xuXHRcdFx0XHRpZiAoIShza2lwUHJvdG8gJiYgbmFtZSA9PT0gJ3Byb3RvdHlwZScpICYmIGhhcy5jYWxsKG9iamVjdCwgbmFtZSkpIHtcblx0XHRcdFx0XHR0aGVLZXlzLnB1c2gobmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoaGFzRG9udEVudW1CdWcpIHtcblx0XHRcdHZhciBjdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yLFxuXHRcdFx0XHRza2lwQ29uc3RydWN0b3IgPSBjdG9yICYmIGN0b3IucHJvdG90eXBlID09PSBvYmplY3Q7XG5cblx0XHRcdGZvckVhY2goZG9udEVudW1zLCBmdW5jdGlvbiAoZG9udEVudW0pIHtcblx0XHRcdFx0aWYgKCEoc2tpcENvbnN0cnVjdG9yICYmIGRvbnRFbnVtID09PSAnY29uc3RydWN0b3InKSAmJiBoYXMuY2FsbChvYmplY3QsIGRvbnRFbnVtKSkge1xuXHRcdFx0XHRcdHRoZUtleXMucHVzaChkb250RW51bSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhlS2V5cztcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGtleXNTaGltO1xufSgpKTtcblxuIl19
;