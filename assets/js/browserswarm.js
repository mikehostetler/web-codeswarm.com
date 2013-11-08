;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Strider = require('./strider');

var App =
exports =
module.exports =
angular.module('BrowserSwarmApp', ['ngRoute', 'ngResource', 'ngSanitize']);

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
    when('/:owner/:repo/config', {
      templateUrl: '/partials/config/index.html',
      controller: 'ConfigCtrl',
      reloadOnSearch: false
    }).
    when('/:owner/:repo/job/:jobid', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    });

}

/// Dynamic Controllers

App.directive('dynamicController', function($compile, $controller) {
  return {
    restrict: 'A',
    terminal: true,
    link: function(scope, elm, attrs) {
      var lastScope;
      scope.$watch(attrs.dynamicController, function(ctrlName) {
        if (lastScope) lastScope.$destroy();
        var newScope = scope.$new();

        var ctrl;

        try {
          ctrl = $controller(ctrlName, {$scope: newScope});
        } catch (err) {
          return;
        }

        elm.contents().data('$ngControllerController', ctrl);
        $compile(elm.contents())(newScope);

        lastScope = newScope;
      });
    }
  }
});
},{"./strider":20}],2:[function(require,module,exports){

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

App.controller('ConfigCtrl', ['$scope', '$routeParams', 'Strider', '$sce', ConfigCtrl]);

function ConfigCtrl($scope, $routeParams, Strider, $sce) {

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
        window.location = '/';
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
        window.location = '/' + $scope.project.name + '/';
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
        window.location = '/' + $scope.project.name + '/';
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

App.controller('Config.GithubCtrl', ['$scope', GithubCtrl]);

function GithubCtrl($scope) {

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
    $.ajax($scope.api_root + 'github/hook', {
      type: 'POST',
      success: function () {
        $scope.loadingWebhooks = false;
        $scope.success('Set github webhooks', true);
      },
      error: function () {
        $scope.loadingWebhooks = false;
        $scope.error('Failed to set github webhooks', true);
      }
    });
  };

  $scope.deleteWebhooks = function () {
    $scope.loadingWebhooks = true;
    $.ajax($scope.api_root + 'github/hook', {
      type: 'DELETE',
      success: function () {
        $scope.loadingWebhooks = false;
        $scope.success('Removed github webhooks', true);
      },
      error: function () {
        $scope.loadingWebhooks = false;
        $scope.error('Failed to remove github webhooks', true);
      }
    });
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

App.controller('JobCtrl', ['$scope', '$routeParams', 'Strider', JobCtrl]);

function JobCtrl($scope, $routeParams, Strider) {

  $scope.phases = Strider.phases;

  var projectSearchOptions = {
    owner: $routeParams.owner,
    repo:  $routeParams.repo
  };

  Strider.Repo.get(projectSearchOptions, function(repo) {
    $scope.repo = repo.project
    $scope.job  = repo.job;
    $scope.jobs = repo.jobs;
  });

  Strider.connect($scope);
  $scope.deploy = function deploy(job) {
    Strider.deploy(job.project);
  };

  $scope.test = function test(job) {
    Strider.test(job.project);
  };

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


},{"../app":1}],19:[function(require,module,exports){
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
},{"xtend":22}],20:[function(require,module,exports){
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
  this.Session = $resource(apiBase + '/session/');
  this.Repo    = $resource(apiBase + '/:owner/:repo/');
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
},{"./job_store":19}],21:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],22:[function(require,module,exports){
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

},{"./has-keys":21,"object-keys":24}],23:[function(require,module,exports){
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


},{}],24:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":26}],25:[function(require,module,exports){
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


},{}],26:[function(require,module,exports){
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


},{"./foreach":23,"./isArguments":25}]},{},[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2FwcC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvYWxlcnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2NvbmZpZy9fZml4X3RlbXBsYXRlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvY29sbGFib3JhdG9ycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL2Vudmlyb25tZW50LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvZ2l0aHViLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvaGVyb2t1LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvam9iLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvbm9kZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3J1bm5lci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3NhdWNlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvd2ViaG9va3MuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2Rhc2hib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvZXJyb3IuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2pvYi5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvbG9naW4uanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2ZpbHRlcnMvYW5zaS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvam9iX3N0b3JlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9zdHJpZGVyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9oYXMta2V5cy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvaW5kZXguanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9mb3JlYWNoLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvaW5kZXguanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pc0FyZ3VtZW50cy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL3NoaW0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgU3RyaWRlciA9IHJlcXVpcmUoJy4vc3RyaWRlcicpO1xuXG52YXIgQXBwID1cbmV4cG9ydHMgPVxubW9kdWxlLmV4cG9ydHMgPVxuYW5ndWxhci5tb2R1bGUoJ0Jyb3dzZXJTd2FybUFwcCcsIFsnbmdSb3V0ZScsICduZ1Jlc291cmNlJywgJ25nU2FuaXRpemUnXSk7XG5cbi8vLyBBcHAgQ29uZmlndXJhdGlvblxuXG5BcHAuXG4gIGNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgJyRsb2NhdGlvblByb3ZpZGVyJywgJyRodHRwUHJvdmlkZXInLCBjb25maWd1cmVBcHBdKS5cbiAgZmFjdG9yeSgnU3RyaWRlcicsIFsnJHJlc291cmNlJywgU3RyaWRlcl0pO1xuXG5mdW5jdGlvbiBjb25maWd1cmVBcHAoJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyKSB7XG5cbiAgLy8vIEhUVFBcblxuICAvLy8gQWx3YXlzIGRvIEhUVFAgcmVxdWVzdHMgd2l0aCBjcmVkZW50aWFscyxcbiAgLy8vIGVmZmVjdGl2ZWx5IHNlbmRpbmcgb3V0IHRoZSBzZXNzaW9uIGNvb2tpZVxuICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgdmFyIGludGVyY2VwdG9yID0gWyckcm9vdFNjb3BlJywgJyRxJywgZnVuY3Rpb24oJHNjb3BlLCAkcSkge1xuXG4gICAgZnVuY3Rpb24gc3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVycm9yKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgc3RhdHVzID0gcmVzcG9uc2Uuc3RhdHVzO1xuXG4gICAgICB2YXIgcmVzcCA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICBpZiAocmVzcCkgdHJ5IHsgcmVzcCA9IEpTT04ucGFyc2UocmVzcCk7IH0gY2F0Y2goZXJyKSB7IH1cblxuICAgICAgaWYgKHJlc3AubWVzc2FnZSkgcmVzcCA9IHJlc3AubWVzc2FnZTtcbiAgICAgIGlmICghIHJlc3ApIHtcbiAgICAgICAgcmVzcCA9ICdFcnJvciBpbiByZXNwb25zZSc7XG4gICAgICAgIGlmIChzdGF0dXMpIHJlc3AgKz0gJyAoJyArIHN0YXR1cyArICcpJztcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLiRlbWl0KCdlcnJvcicsIG5ldyBFcnJvcihyZXNwKSk7XG5cbiAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgcmV0dXJuIHByb21pc2UudGhlbihzdWNjZXNzLCBlcnJvcik7XG4gICAgfVxuXG4gIH1dO1xuXG4gICRodHRwUHJvdmlkZXIucmVzcG9uc2VJbnRlcmNlcHRvcnMucHVzaChpbnRlcmNlcHRvcik7XG5cblxuICAvLy8gRW5hYmxlIGhhc2hiYW5nLWxlc3Mgcm91dGVzXG5cbiAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuXG4gIC8vLyBSb3V0ZXNcblxuICAkcm91dGVQcm92aWRlci5cbiAgICB3aGVuKCcvZGFzaGJvYXJkJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvZGFzaGJvYXJkLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0Rhc2hib2FyZEN0cmwnXG4gICAgfSkuXG4gICAgd2hlbignL2xvZ2luJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvbG9naW4uaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pLlxuICAgIHdoZW4oJy86b3duZXIvOnJlcG8vY29uZmlnJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvY29uZmlnL2luZGV4Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0NvbmZpZ0N0cmwnLFxuICAgICAgcmVsb2FkT25TZWFyY2g6IGZhbHNlXG4gICAgfSkuXG4gICAgd2hlbignLzpvd25lci86cmVwby9qb2IvOmpvYmlkJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvam9iLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0pvYkN0cmwnXG4gICAgfSk7XG5cbn1cblxuLy8vIER5bmFtaWMgQ29udHJvbGxlcnNcblxuQXBwLmRpcmVjdGl2ZSgnZHluYW1pY0NvbnRyb2xsZXInLCBmdW5jdGlvbigkY29tcGlsZSwgJGNvbnRyb2xsZXIpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHRlcm1pbmFsOiB0cnVlLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbG0sIGF0dHJzKSB7XG4gICAgICB2YXIgbGFzdFNjb3BlO1xuICAgICAgc2NvcGUuJHdhdGNoKGF0dHJzLmR5bmFtaWNDb250cm9sbGVyLCBmdW5jdGlvbihjdHJsTmFtZSkge1xuICAgICAgICBpZiAobGFzdFNjb3BlKSBsYXN0U2NvcGUuJGRlc3Ryb3koKTtcbiAgICAgICAgdmFyIG5ld1Njb3BlID0gc2NvcGUuJG5ldygpO1xuXG4gICAgICAgIHZhciBjdHJsO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY3RybCA9ICRjb250cm9sbGVyKGN0cmxOYW1lLCB7JHNjb3BlOiBuZXdTY29wZX0pO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBlbG0uY29udGVudHMoKS5kYXRhKCckbmdDb250cm9sbGVyQ29udHJvbGxlcicsIGN0cmwpO1xuICAgICAgICAkY29tcGlsZShlbG0uY29udGVudHMoKSkobmV3U2NvcGUpO1xuXG4gICAgICAgIGxhc3RTY29wZSA9IG5ld1Njb3BlO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTsiLCJcbnZhciBhcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuYXBwLmNvbnRyb2xsZXIoJ0FsZXJ0c0N0cmwnLCBbJyRzY29wZScsICckc2NlJywgZnVuY3Rpb24gKCRzY29wZSwgJHNjZSkge1xuICAkc2NvcGUubWVzc2FnZSA9IG51bGw7XG5cbiAgJHNjb3BlLmVycm9yID0gZnVuY3Rpb24gKHRleHQsIGRpZ2VzdCkge1xuICAgICRzY29wZS5tZXNzYWdlID0ge1xuICAgICAgdGV4dDogJHNjZS50cnVzdEFzSHRtbCh0ZXh0KSxcbiAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICBzaG93aW5nOiB0cnVlXG4gICAgfTtcbiAgICBpZiAoZGlnZXN0KSAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICB9O1xuXG4gICRzY29wZS5pbmZvID0gZnVuY3Rpb24gKHRleHQsIGRpZ2VzdCkge1xuICAgICRzY29wZS5tZXNzYWdlID0ge1xuICAgICAgdGV4dDogJHNjZS50cnVzdEFzSHRtbCh0ZXh0KSxcbiAgICAgIHR5cGU6ICdpbmZvJyxcbiAgICAgIHNob3dpbmc6IHRydWVcbiAgICB9O1xuICAgIGlmIChkaWdlc3QpICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gIH07XG4gIHZhciB3YWl0VGltZSA9IG51bGw7XG5cbiAgJHNjb3BlLnN1Y2Nlc3MgPSBmdW5jdGlvbiAodGV4dCwgZGlnZXN0LCBzdGlja3kpIHtcbiAgICBpZiAod2FpdFRpbWUpIHtcbiAgICAgIGNsZWFyVGltZW91dCh3YWl0VGltZSk7XG4gICAgICB3YWl0VGltZSA9IG51bGw7XG4gICAgfVxuICAgIGlmIChjbGVhclRpbWUpIHtcbiAgICAgIGNsZWFyVGltZW91dChjbGVhclRpbWUpO1xuICAgICAgY2xlYXJUaW1lID0gbnVsbDtcbiAgICB9XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSB7XG4gICAgICB0ZXh0OiAkc2NlLnRydXN0QXNIdG1sKCc8c3Ryb25nPkRvbmUuPC9zdHJvbmc+ICcgKyB0ZXh0KSxcbiAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgIHNob3dpbmc6IHRydWVcbiAgICB9O1xuICAgIGlmICghc3RpY2t5KSB7XG4gICAgICB3YWl0VGltZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUuY2xlYXJNZXNzYWdlKCk7XG4gICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgICB9LCA1MDAwKTtcbiAgICB9XG4gICAgaWYgKGRpZ2VzdCkgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgfTtcbiAgdmFyIGNsZWFyVGltZSA9IG51bGw7XG5cbiAgJHNjb3BlLmNsZWFyTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoY2xlYXJUaW1lKSB7XG4gICAgICBjbGVhclRpbWVvdXQoY2xlYXJUaW1lKTtcbiAgICB9XG4gICAgaWYgKCRzY29wZS5tZXNzYWdlKSB7XG4gICAgICAkc2NvcGUubWVzc2FnZS5zaG93aW5nID0gZmFsc2U7XG4gICAgfVxuICAgIGNsZWFyVGltZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgY2xlYXJUaW1lID0gbnVsbDtcbiAgICAgICRzY29wZS5tZXNzYWdlID0gbnVsbDtcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSwgMTAwMCk7XG4gIH07XG59XSk7XG4iLCJ2YXIgQXBwICAgICAgICAgPSByZXF1aXJlKCcuLi9hcHAnKTtcbnZhciBmaXhUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vY29uZmlnL19maXhfdGVtcGxhdGUnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZ0N0cmwnLCBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnU3RyaWRlcicsICckc2NlJywgQ29uZmlnQ3RybF0pO1xuXG5mdW5jdGlvbiBDb25maWdDdHJsKCRzY29wZSwgJHJvdXRlUGFyYW1zLCBTdHJpZGVyLCAkc2NlKSB7XG5cbiAgdmFyIHByb2plY3RTZWFyY2hPcHRpb25zID0ge1xuICAgIG93bmVyOiAkcm91dGVQYXJhbXMub3duZXIsXG4gICAgcmVwbzogJHJvdXRlUGFyYW1zLnJlcG9cbiAgfTtcblxuICBTdHJpZGVyLkNvbmZpZy5nZXQocHJvamVjdFNlYXJjaE9wdGlvbnMsIGZ1bmN0aW9uKGNvbmYpIHtcblxuXG4gICAgLy8vIEZpeCBhbmQgdHJ1c3QgcmVtb3RlIEhUTUxcblxuICAgIE9iamVjdC5rZXlzKGNvbmYucGx1Z2lucykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGNvbmYucGx1Z2luc1trZXldLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKFxuICAgICAgICBmaXhUZW1wbGF0ZShjb25mLnBsdWdpbnNba2V5XS5odG1sKSk7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhjb25mLnJ1bm5lcnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBjb25mLnJ1bm5lcnNba2V5XS5odG1sID0gJHNjZS50cnVzdEFzSHRtbChcbiAgICAgICAgZml4VGVtcGxhdGUoY29uZi5ydW5uZXJzW2tleV0uaHRtbCkpO1xuICAgIH0pO1xuXG4gICAgaWYgKGNvbmYucHJvdmlkZXIpIHtcbiAgICAgIGNvbmYucHJvdmlkZXIuaHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwoXG4gICAgICAgIGZpeFRlbXBsYXRlKGNvbmYucHJvdmlkZXIuaHRtbCkpO1xuICAgIH1cblxuICAgIC8vLyBHZXQgYWxsIHRoZSBjb25mIGludG8gdGhlIHNjb3BlIGZvciByZW5kZXJpbmdcblxuICAgICRzY29wZS5wcm9qZWN0ID0gY29uZi5wcm9qZWN0O1xuICAgICRzY29wZS5wcm92aWRlciA9IGNvbmYucHJvdmlkZXI7XG4gICAgJHNjb3BlLnBsdWdpbnMgPSBjb25mLnBsdWdpbnM7XG4gICAgJHNjb3BlLnJ1bm5lcnMgPSBjb25mLnJ1bm5lcnM7XG4gICAgJHNjb3BlLmJyYW5jaGVzID0gY29uZi5icmFuY2hlcyB8fCBbXTtcbiAgICAkc2NvcGUuc3RhdHVzQmxvY2tzID0gY29uZi5zdGF0dXNCbG9ja3M7XG4gICAgJHNjb3BlLmNvbGxhYm9yYXRvcnMgPSBjb25mLmNvbGxhYm9yYXRvcnM7XG4gICAgJHNjb3BlLnVzZXJJc0NyZWF0b3IgPSBjb25mLnVzZXJJc0NyZWF0b3I7XG4gICAgJHNjb3BlLnVzZXJDb25maWdzID0gY29uZi51c2VyQ29uZmlncztcbiAgICAkc2NvcGUuY29uZmlndXJlZCA9IHt9O1xuXG4gICAgJHNjb3BlLmJyYW5jaCA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzWzBdO1xuICAgICRzY29wZS5kaXNhYmxlZF9wbHVnaW5zID0ge307XG4gICAgJHNjb3BlLmNvbmZpZ3MgPSB7fTtcbiAgICAkc2NvcGUucnVubmVyQ29uZmlncyA9IHt9O1xuXG4gICAgJHNjb3BlLmFwaV9yb290ID0gJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvYXBpLyc7XG5cbiAgICAkc2NvcGUucmVmcmVzaEJyYW5jaGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gVE9ETyBpbXBsZW1lbnRcbiAgICAgIHRocm93IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEVuYWJsZWQgPSBmdW5jdGlvbiAocGx1Z2luLCBlbmFibGVkKSB7XG4gICAgICAkc2NvcGUuY29uZmlnc1skc2NvcGUuYnJhbmNoLm5hbWVdW3BsdWdpbl0uZW5hYmxlZCA9IGVuYWJsZWQ7XG4gICAgICBzYXZlUGx1Z2luT3JkZXIoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmVQbHVnaW5PcmRlciA9IHNhdmVQbHVnaW5PcmRlcjtcblxuICAgICRzY29wZS5zd2l0Y2hUb01hc3RlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUucHJvamVjdC5icmFuY2hlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV0ubmFtZSA9PT0gJ21hc3RlcicpIHtcbiAgICAgICAgICAkc2NvcGUuYnJhbmNoID0gJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV07XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jbGVhckNhY2hlID0gZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLmNsZWFyaW5nQ2FjaGUgPSB0cnVlO1xuICAgICAgU3RyaWRlci5DYWNoZS5kZWxldGUoc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5jbGVhcmluZ0NhY2hlID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdDbGVhcmVkIHRoZSBjYWNoZScpO1xuICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS50b2dnbGVCcmFuY2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJHNjb3BlLmJyYW5jaC5taXJyb3JfbWFzdGVyKSB7XG4gICAgICAgICRzY29wZS5icmFuY2gubWlycm9yX21hc3RlciA9IGZhbHNlO1xuICAgICAgICB2YXIgbmFtZSA9ICRzY29wZS5icmFuY2gubmFtZVxuICAgICAgICAgICwgbWFzdGVyO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLnByb2plY3QuYnJhbmNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV0ubmFtZSA9PT0gJ21hc3RlcicpIHtcbiAgICAgICAgICAgIG1hc3RlciA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmFuY2ggPSAkLmV4dGVuZCh0cnVlLCAkc2NvcGUuYnJhbmNoLCBtYXN0ZXIpO1xuICAgICAgICAkc2NvcGUuYnJhbmNoLm5hbWUgPSBuYW1lO1xuICAgICAgICBpbml0QnJhbmNoKCRzY29wZS5icmFuY2gpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaC5taXJyb3JfbWFzdGVyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zYXZlR2VuZXJhbEJyYW5jaCh0cnVlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYnJhbmNoLm1pcnJvcl9tYXN0ZXInLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdGFiID0gdmFsdWUgJiYgdmFsdWUubmFtZSA9PT0gJ21hc3RlcicgPyAncHJvamVjdCcgOiAnYmFzaWMnO1xuICAgICAgICAkKCcjJyArIHRhYiArICctdGFiLWhhbmRsZScpLnRhYignc2hvdycpO1xuICAgICAgICAkKCcudGFiLXBhbmUuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjdGFiLScgKyB0YWIpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgIH0sIDApO1xuICAgIH0pO1xuICAgICRzY29wZS4kd2F0Y2goJ2JyYW5jaCcsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0YWIgPSB2YWx1ZSAmJiB2YWx1ZS5uYW1lID09PSAnbWFzdGVyJyA/ICdwcm9qZWN0JyA6ICdiYXNpYyc7XG4gICAgICAgICQoJyMnICsgdGFiICsgJy10YWItaGFuZGxlJykudGFiKCdzaG93Jyk7XG4gICAgICAgICQoJy50YWItcGFuZS5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyN0YWItJyArIHRhYikuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgfSwgMCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UnVubmVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICRzY29wZS5icmFuY2gucnVubmVyID0ge1xuICAgICAgICBpZDogbmFtZSxcbiAgICAgICAgY29uZmlnOiAkc2NvcGUucnVubmVyQ29uZmlnc1tuYW1lXVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQ29uZmlndXJlZCgpIHtcbiAgICAgIHZhciBwbHVnaW5zID0gJHNjb3BlLmJyYW5jaC5wbHVnaW5zO1xuICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbJHNjb3BlLmJyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgZm9yICh2YXIgaT0wOyBpPHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbJHNjb3BlLmJyYW5jaC5uYW1lXVtwbHVnaW5zW2ldLmlkXSA9IHRydWU7XG4gICAgICB9XG4gICAgICBzYXZlUGx1Z2luT3JkZXIoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlUGx1Z2luT3JkZXIoKSB7XG4gICAgICB2YXIgcGx1Z2lucyA9ICRzY29wZS5icmFuY2gucGx1Z2luc1xuICAgICAgICAsIGJyYW5jaCA9ICRzY29wZS5icmFuY2hcbiAgICAgICAgLCBkYXRhID0gW107XG5cbiAgICAgIGZvciAodmFyIGk9MDsgaTxwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRhdGEucHVzaCh7XG4gICAgICAgICAgaWQ6IHBsdWdpbnNbaV0uaWQsXG4gICAgICAgICAgZW5hYmxlZDogcGx1Z2luc1tpXS5lbmFibGVkLFxuICAgICAgICAgIHNob3dTdGF0dXM6IHBsdWdpbnNbaV0uc2hvd1N0YXR1c1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgU3RyaWRlci5Db25maWcuQnJhbmNoLnNhdmUoXG4gICAgICAgIHtcbiAgICAgICAgICBvd25lcjogcHJvamVjdFNlYXJjaE9wdGlvbnMub3duZXIsXG4gICAgICAgICAgcmVwbzogIHByb2plY3RTZWFyY2hPcHRpb25zLnJlcG8sXG4gICAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSB9LFxuICAgICAgICB7XG4gICAgICAgICAgcGx1Z2luX29yZGVyOiBkYXRhfSxcbiAgICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdQbHVnaW4gb3JkZXIgb24gYnJhbmNoICcgKyBicmFuY2gubmFtZSArICcgc2F2ZWQuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gb3B0aW9ucyBmb3IgdGhlIGluVXNlIHBsdWdpbiBzb3J0YWJsZVxuICAgICRzY29wZS5pblVzZU9wdGlvbnMgPSB7XG4gICAgICBjb25uZWN0V2l0aDogJy5kaXNhYmxlZC1wbHVnaW5zLWxpc3QnLFxuICAgICAgZGlzdGFuY2U6IDUsXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIChlLCB1aSkge1xuICAgICAgICB1cGRhdGVDb25maWd1cmVkKCk7XG4gICAgICB9LFxuICAgICAgcmVjZWl2ZTogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgIHVwZGF0ZUNvbmZpZ3VyZWQoKTtcbiAgICAgICAgdmFyIHBsdWdpbnMgPSAkc2NvcGUuYnJhbmNoLnBsdWdpbnM7XG4gICAgICAgIHBsdWdpbnNbdWkuaXRlbS5pbmRleCgpXS5lbmFibGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5pdEJyYW5jaChicmFuY2gpIHtcbiAgICAgIHZhciBwbHVnaW5zO1xuXG4gICAgICAkc2NvcGUuY29uZmlndXJlZFticmFuY2gubmFtZV0gPSB7fTtcbiAgICAgICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdID0ge307XG4gICAgICAkc2NvcGUuZGlzYWJsZWRfcGx1Z2luc1ticmFuY2gubmFtZV0gPSBbXTtcblxuICAgICAgaWYgKCFicmFuY2gubWlycm9yX21hc3Rlcikge1xuICAgICAgICBwbHVnaW5zID0gYnJhbmNoLnBsdWdpbnM7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbYnJhbmNoLm5hbWVdW3BsdWdpbnNbaV0uaWRdID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luc1tpXS5pZF0gPSBwbHVnaW5zW2ldO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIHBsdWdpbiBpbiAkc2NvcGUucGx1Z2lucykge1xuICAgICAgICBpZiAoJHNjb3BlLmNvbmZpZ3VyZWRbYnJhbmNoLm5hbWVdW3BsdWdpbl0pIGNvbnRpbnVlO1xuICAgICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luXSA9IHtcbiAgICAgICAgICBpZDogcGx1Z2luLFxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgY29uZmlnOiB7fVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZGlzYWJsZWRfcGx1Z2luc1ticmFuY2gubmFtZV0ucHVzaCgkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luXSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghYnJhbmNoLm1pcnJvcl9tYXN0ZXIpIHtcbiAgICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdW2JyYW5jaC5ydW5uZXIuaWRdID0gYnJhbmNoLnJ1bm5lci5jb25maWc7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBydW5uZXIgaW4gJHNjb3BlLnJ1bm5lcnMpIHtcbiAgICAgICAgaWYgKCFicmFuY2gubWlycm9yX21hc3RlciAmJiBydW5uZXIgPT09IGJyYW5jaC5ydW5uZXIuaWQpIGNvbnRpbnVlO1xuICAgICAgICAkc2NvcGUucnVubmVyQ29uZmlnc1ticmFuY2gubmFtZV1bcnVubmVyXSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBpbml0UGx1Z2lucygpIHtcbiAgICAgIHZhciBicmFuY2hlcyA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzXG4gICAgICBmb3IgKHZhciBpPTA7IGk8YnJhbmNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW5pdEJyYW5jaChicmFuY2hlc1tpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHNjb3BlLnNhdmVHZW5lcmFsQnJhbmNoID0gZnVuY3Rpb24gKHBsdWdpbnMpIHtcbiAgICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoXG4gICAgICAgICwgZGF0YSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZTogYnJhbmNoLmFjdGl2ZSxcbiAgICAgICAgICAgIHByaXZrZXk6IGJyYW5jaC5wcml2a2V5LFxuICAgICAgICAgICAgcHVia2V5OiBicmFuY2gucHVia2V5LFxuICAgICAgICAgICAgZW52S2V5czogYnJhbmNoLmVudktleXMsXG4gICAgICAgICAgICBtaXJyb3JfbWFzdGVyOiBicmFuY2gubWlycm9yX21hc3RlcixcbiAgICAgICAgICAgIGRlcGxveV9vbl9ncmVlbjogYnJhbmNoLmRlcGxveV9vbl9ncmVlbixcbiAgICAgICAgICAgIHJ1bm5lcjogYnJhbmNoLnJ1bm5lclxuICAgICAgICAgIH07XG4gICAgICBpZiAocGx1Z2lucykge1xuICAgICAgICBkYXRhLnBsdWdpbnMgPSBicmFuY2gucGx1Z2lucztcbiAgICAgIH1cbiAgICAgIFN0cmlkZXIuQ29uZmlnLkJyYW5jaC5zYXZlKFxuICAgICAgICB7XG4gICAgICAgICAgb3duZXI6IHByb2plY3RTZWFyY2hPcHRpb25zLm93bmVyLFxuICAgICAgICAgIHJlcG86ICBwcm9qZWN0U2VhcmNoT3B0aW9ucy5yZXBvLFxuICAgICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUgfSxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdHZW5lcmFsIGNvbmZpZyBmb3IgYnJhbmNoICcgKyBicmFuY2gubmFtZSArICcgc2F2ZWQuJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5nZW5lcmF0ZUtleVBhaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBib290Ym94LmNvbmZpcm0oJ1JlYWxseSBnZW5lcmF0ZSBhIG5ldyBrZXlwYWlyPyBUaGlzIGNvdWxkIGJyZWFrIHRoaW5ncyBpZiB5b3UgaGF2ZSBwbHVnaW5zIHRoYXQgdXNlIHRoZSBjdXJyZW50IG9uZXMuJywgZnVuY3Rpb24gKHJlYWxseSkge1xuICAgICAgICBpZiAoIXJlYWxseSkgcmV0dXJuO1xuICAgICAgICBTdHJpZGVyLktleWdlbi5zYXZlKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG93bmVyOiBwcm9qZWN0U2VhcmNoT3B0aW9ucy5vd25lcixcbiAgICAgICAgICAgIHJlcG86ICBwcm9qZWN0U2VhcmNoT3B0aW9ucy5yZXBvLFxuICAgICAgICAgICAgYnJhbmNoOiAkc2NvcGUuYnJhbmNoLm5hbWUgfSxcbiAgICAgICAgICB7fSxcbiAgICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICAkc2NvcGUuYnJhbmNoLnByaXZrZXkgPSBkYXRhLnByaXZrZXk7XG4gICAgICAgICAgJHNjb3BlLmJyYW5jaC5wdWJrZXkgPSBkYXRhLnB1YmtleTtcbiAgICAgICAgICAkc2NvcGUuc3VjY2VzcygnR2VuZXJhdGVkIG5ldyBzc2gga2V5cGFpcicpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaW5pdFBsdWdpbnMoKTtcblxuICAgICRzY29wZS5ncmF2YXRhciA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgaWYgKCFlbWFpbCkgcmV0dXJuICcnO1xuICAgICAgdmFyIGhhc2ggPSBtZDUoZW1haWwudG9Mb3dlckNhc2UoKSk7XG4gICAgICByZXR1cm4gJ2h0dHBzOi8vc2VjdXJlLmdyYXZhdGFyLmNvbS9hdmF0YXIvJyArIGhhc2ggKyAnP2Q9aWRlbnRpY29uJztcbiAgICB9XG5cbiAgICAvLyB0b2RvOiBwYXNzIGluIG5hbWU/XG4gICAgJHNjb3BlLnJ1bm5lckNvbmZpZyA9IGZ1bmN0aW9uIChicmFuY2gsIGRhdGEsIG5leHQpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIG5leHQgPSBkYXRhO1xuICAgICAgICBkYXRhID0gYnJhbmNoO1xuICAgICAgICBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgfVxuICAgICAgdmFyIG5hbWUgPSAkc2NvcGUuYnJhbmNoLnJ1bm5lci5pZDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gJHNjb3BlLnJ1bm5lckNvbmZpZ3NbbmFtZV07XG4gICAgICB9XG5cbiAgICAgIFN0cmlkZXIuQ29uZmlnLkJyYW5jaC5SdW5uZXIuc2F2ZShcbiAgICAgICAge1xuICAgICAgICAgIG93bmVyOiBwcm9qZWN0U2VhcmNoT3B0aW9ucy5vd25lcixcbiAgICAgICAgICByZXBvOiAgcHJvamVjdFNlYXJjaE9wdGlvbnMucmVwbyxcbiAgICAgICAgICBicmFuY2g6ICdtYXN0ZXInIH0sXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoXCJSdW5uZXIgY29uZmlnIHNhdmVkLlwiKTtcbiAgICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbbmFtZV0gPSBkYXRhLmNvbmZpZztcbiAgICAgICAgbmV4dCAmJiBuZXh0KG51bGwsIGRhdGEuY29uZmlnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnID0gZnVuY3Rpb24gKGRhdGEsIG5leHQpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUucHJvamVjdC5wcm92aWRlci5jb25maWc7XG4gICAgICB9XG4gICAgICBTdHJpZGVyLlByb3ZpZGVyLnNhdmUocHJvamVjdFNlYXJjaE9wdGlvbnMsIGRhdGEsIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcyhcIlByb3ZpZGVyIGNvbmZpZyBzYXZlZC5cIik7XG4gICAgICAgIG5leHQgJiYgbmV4dCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnID0gZnVuY3Rpb24gKG5hbWUsIGJyYW5jaCwgZGF0YSwgbmV4dCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgbmV4dCA9IGRhdGE7XG4gICAgICAgIGRhdGEgPSBicmFuY2g7XG4gICAgICAgIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGJyYW5jaC5taXJyb3JfbWFzdGVyKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIHBsdWdpbiA9ICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXVtuYW1lXVxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBwbHVnaW4uY29uZmlnO1xuICAgICAgfVxuICAgICAgaWYgKHBsdWdpbiA9PT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwicGx1Z2luQ29uZmlnIGNhbGxlZCBmb3IgYSBwbHVnaW4gdGhhdCdzIG5vdCBjb25maWd1cmVkLiBcIiArIG5hbWUsIHRydWUpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsdWdpbiBub3QgY29uZmlndXJlZDogJyArIG5hbWUpO1xuICAgICAgfVxuXG4gICAgICBTdHJpZGVyLkNvbmZpZy5CcmFuY2guUGx1Z2luLnNhdmUoXG4gICAgICB7XG4gICAgICAgIG93bmVyOiAgcHJvamVjdFNlYXJjaE9wdGlvbnMub3duZXIsXG4gICAgICAgIHJlcG86ICAgcHJvamVjdFNlYXJjaE9wdGlvbnMucmVwbyxcbiAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgICAgcGx1Z2luOiBuYW1lIH0sXG4gICAgICBkYXRhLFxuICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKFwiQ29uZmlnIGZvciBcIiArIG5hbWUgKyBcIiBvbiBicmFuY2ggXCIgKyBicmFuY2gubmFtZSArIFwiIHNhdmVkLlwiKTtcbiAgICAgICAgJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW25hbWVdLmNvbmZpZyA9IGRhdGE7XG4gICAgICAgIG5leHQobnVsbCwgZGF0YSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kZWxldGVQcm9qZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgU3RyaWRlci5SZXBvLmRlbGV0ZShwcm9qZWN0U2VhcmNoT3B0aW9ucywgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9ICcvJztcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnN0YXJ0VGVzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIFN0cmlkZXIuU3RhcnQuc2F2ZShcbiAgICAgICAgcHJvamVjdFNlYXJjaE9wdGlvbnMsXG4gICAgICAgIHtcbiAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gubmFtZSxcbiAgICAgICAgICB0eXBlOiBcIlRFU1RfT05MWVwiLFxuICAgICAgICAgIHBhZ2U6XCJjb25maWdcIiB9LFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uID0gJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvJztcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnN0YXJ0RGVwbG95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgU3RyaWRlci5TdGFydC5zYXZlKFxuICAgICAgICBwcm9qZWN0U2VhcmNoT3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaC5uYW1lLFxuICAgICAgICAgIHR5cGU6IFwiVEVTVF9BTkRfREVQTE9ZXCIsXG4gICAgICAgICAgcGFnZTpcImNvbmZpZ1wiIH0sXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy8nO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZVByb2plY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBTdHJpZGVyLlJlZ3VsYXJDb25maWcuc2F2ZShcbiAgICAgICAgICBwcm9qZWN0U2VhcmNoT3B0aW9ucyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBwdWJsaWM6ICRzY29wZS5wcm9qZWN0LnB1YmxpY1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc3VjY2Vzcyk7XG4gICAgICB9KTtcblxuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnR2VuZXJhbCBjb25maWcgc2F2ZWQuJyk7XG4gICAgICB9XG4gICAgfTtcblxuICB9KTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGZpeFRlbXBsYXRlO1xuXG5mdW5jdGlvbiBmaXhUZW1wbGF0ZShzKSB7XG4gIHJldHVybiBzLlxuICAgIHJlcGxhY2UoL1xcW1xcWy9nLCAne3snKS5cbiAgICByZXBsYWNlKC9cXF1cXF0vZywgJ319Jyk7XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkNvbGxhYm9yYXRvcnNDdHJsJywgWyckc2NvcGUnLCBDb2xsYWJvcmF0b3JzQ3RybF0pO1xuXG5mdW5jdGlvbiBDb2xsYWJvcmF0b3JzQ3RybCgkc2NvcGUpIHtcbiAgJHNjb3BlLm5ld19lbWFpbCA9ICcnO1xuICAkc2NvcGUubmV3X2FjY2VzcyA9IDA7XG4gICRzY29wZS5jb2xsYWJvcmF0b3JzID0gd2luZG93LmNvbGxhYm9yYXRvcnMgfHwgW107XG4gICRzY29wZS5yZW1vdmUgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgIGl0ZW0ubG9hZGluZyA9IHRydWU7XG4gICAgJHNjb3BlLmNsZWFyTWVzc2FnZSgpO1xuICAgICQuYWpheCh7XG4gICAgICB1cmw6ICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2NvbGxhYm9yYXRvcnMvJyxcbiAgICAgIHR5cGU6ICdERUxFVEUnLFxuICAgICAgZGF0YToge2VtYWlsOiBpdGVtLmVtYWlsfSxcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEsIHRzLCB4aHIpIHtcbiAgICAgICAgcmVtb3ZlKCRzY29wZS5jb2xsYWJvcmF0b3JzLCBpdGVtKTtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoaXRlbS5lbWFpbCArIFwiIGlzIG5vIGxvbmdlciBhIGNvbGxhYm9yYXRvciBvbiB0aGlzIHByb2plY3QuXCIsIHRydWUpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRzLCBlKSB7XG4gICAgICAgIGl0ZW0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICBpZiAoeGhyICYmIHhoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9ICQucGFyc2VKU09OKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIGRlbGV0aW5nIGNvbGxhYm9yYXRvcjogXCIgKyBkYXRhLmVycm9yc1swXSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmVycm9yKFwiRXJyb3IgZGVsZXRpbmcgY29sbGFib3JhdG9yOiBcIiArIGUsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRhdGEgPSB7XG4gICAgICBlbWFpbDogJHNjb3BlLm5ld19lbWFpbCxcbiAgICAgIGFjY2VzczogJHNjb3BlLm5ld19hY2Nlc3MgfHwgMCxcbiAgICAgIGdyYXZhdGFyOiAkc2NvcGUuZ3JhdmF0YXIoJHNjb3BlLm5ld19lbWFpbCksXG4gICAgICBvd25lcjogZmFsc2VcbiAgICB9O1xuXG4gICAgJC5hamF4KHtcbiAgICAgIHVybDogJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvY29sbGFib3JhdG9ycy8nLFxuICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICBkYXRhOiBkYXRhLFxuICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgc3VjY2VzczogZnVuY3Rpb24ocmVzLCB0cywgeGhyKSB7XG4gICAgICAgICRzY29wZS5uZXdfYWNjZXNzID0gMDtcbiAgICAgICAgJHNjb3BlLm5ld19lbWFpbCA9ICcnO1xuICAgICAgICBpZiAocmVzLmNyZWF0ZWQpIHtcbiAgICAgICAgICAkc2NvcGUuY29sbGFib3JhdG9ycy5wdXNoKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5zdWNjZXNzKHJlcy5tZXNzYWdlLCB0cnVlLCAhcmVzLmNyZWF0ZWQpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRzLCBlKSB7XG4gICAgICAgIGlmICh4aHIgJiYgeGhyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgIHZhciBkYXRhID0gJC5wYXJzZUpTT04oeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgJHNjb3BlLmVycm9yKFwiRXJyb3IgYWRkaW5nIGNvbGxhYm9yYXRvcjogXCIgKyBkYXRhLmVycm9yc1swXSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmVycm9yKFwiRXJyb3IgYWRkaW5nIGNvbGxhYm9yYXRvcjogXCIgKyBlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiByZW1vdmUoYXIsIGl0ZW0pIHtcbiAgYXIuc3BsaWNlKGFyLmluZGV4T2YoaXRlbSksIDEpO1xufVxuIiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkVudmlyb25tZW50Q3RybCcsIFsnJHNjb3BlJywgRW52aXJvbm1lbnRDdHJsXSk7XG5cbmZ1bmN0aW9uIEVudmlyb25tZW50Q3RybCgkc2NvcGUpe1xuICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXS5lbnYuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlIHx8IHt9O1xuICB9KTtcbiAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdlbnYnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5kZWwgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgZGVsZXRlICRzY29wZS5jb25maWdba2V5XTtcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xuICAkc2NvcGUuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5jb25maWdbJHNjb3BlLm5ld2tleV0gPSAkc2NvcGUubmV3dmFsdWU7XG4gICAgJHNjb3BlLm5ld2tleSA9ICRzY29wZS5uZXd2YWx1ZSA9ICcnO1xuICAgICRzY29wZS5zYXZlKCk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkdpdGh1YkN0cmwnLCBbJyRzY29wZScsIEdpdGh1YkN0cmxdKTtcblxuZnVuY3Rpb24gR2l0aHViQ3RybCgkc2NvcGUpIHtcblxuICAkc2NvcGUuY29uZmlnID0gJHNjb3BlLnByb3ZpZGVyQ29uZmlnKCk7XG4gICRzY29wZS5uZXdfdXNlcm5hbWUgPSBcIlwiO1xuICAkc2NvcGUubmV3X2xldmVsID0gXCJ0ZXN0ZXJcIjtcbiAgJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgPSAkc2NvcGUuY29uZmlnLndoaXRlbGlzdCB8fCBbXTtcbiAgJHNjb3BlLmNvbmZpZy5wdWxsX3JlcXVlc3RzID0gJHNjb3BlLmNvbmZpZy5wdWxsX3JlcXVlc3RzIHx8ICdub25lJztcblxuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUucHJvdmlkZXJDb25maWcoJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge30pO1xuICB9O1xuXG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZy5wdWxsX3JlcXVlc3RzJywgZnVuY3Rpb24gKHZhbHVlLCBvbGQpIHtcbiAgICBpZiAoIW9sZCB8fCB2YWx1ZSA9PT0gb2xkKSByZXR1cm47XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKHtcbiAgICAgIHB1bGxfcmVxdWVzdHM6ICRzY29wZS5jb25maWcucHVsbF9yZXF1ZXN0c1xuICAgIH0pO1xuICB9KTtcblxuICAkc2NvcGUuYWRkV2ViaG9va3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IHRydWU7XG4gICAgJC5hamF4KCRzY29wZS5hcGlfcm9vdCArICdnaXRodWIvaG9vaycsIHtcbiAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnU2V0IGdpdGh1YiB3ZWJob29rcycsIHRydWUpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmVycm9yKCdGYWlsZWQgdG8gc2V0IGdpdGh1YiB3ZWJob29rcycsIHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5kZWxldGVXZWJob29rcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gdHJ1ZTtcbiAgICAkLmFqYXgoJHNjb3BlLmFwaV9yb290ICsgJ2dpdGh1Yi9ob29rJywge1xuICAgICAgdHlwZTogJ0RFTEVURScsXG4gICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ1JlbW92ZWQgZ2l0aHViIHdlYmhvb2tzJywgdHJ1ZSk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuZXJyb3IoJ0ZhaWxlZCB0byByZW1vdmUgZ2l0aHViIHdlYmhvb2tzJywgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLnJlbW92ZVdMID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICB2YXIgaWR4ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QuaW5kZXhPZih1c2VyKTtcbiAgICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIGNvbnNvbGUuZXJyb3IoXCJ0cmllZCB0byByZW1vdmUgYSB3aGl0ZWxpc3QgaXRlbSB0aGF0IGRpZG4ndCBleGlzdFwiKTtcbiAgICB2YXIgd2hpdGVsaXN0ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3Quc2xpY2UoKTtcbiAgICB3aGl0ZWxpc3Quc3BsaWNlKGlkeCwgMSk7XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKHtcbiAgICAgIHdoaXRlbGlzdDogd2hpdGVsaXN0XG4gICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgPSB3aGl0ZWxpc3Q7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmFkZFdMID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICBpZiAoIXVzZXIubmFtZSB8fCAhdXNlci5sZXZlbCkgcmV0dXJuO1xuICAgIHZhciB3aGl0ZWxpc3QgPSAkc2NvcGUuY29uZmlnLndoaXRlbGlzdC5zbGljZSgpO1xuICAgIHdoaXRlbGlzdC5wdXNoKHVzZXIpO1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyh7XG4gICAgICB3aGl0ZWxpc3Q6IHdoaXRlbGlzdFxuICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5jb25maWcud2hpdGVsaXN0ID0gd2hpdGVsaXN0O1xuICAgIH0pO1xuICB9O1xuXG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkhlcm9rdUNvbnRyb2xsZXInLCBbJyRzY29wZScsIEhlcm9rdUN0cmxdKTtcblxuZnVuY3Rpb24gSGVyb2t1Q3RybCgkc2NvcGUsICRlbGVtZW50KSB7XG4gICRzY29wZS4kd2F0Y2goJ3VzZXJDb25maWdzLmhlcm9rdScsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICghdmFsdWUpIHJldHVyblxuICAgICRzY29wZS51c2VyQ29uZmlnID0gdmFsdWU7XG4gICAgaWYgKCEkc2NvcGUuYWNjb3VudCAmJiB2YWx1ZS5hY2NvdW50cyAmJiB2YWx1ZS5hY2NvdW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAkc2NvcGUuYWNjb3VudCA9IHZhbHVlLmFjY291bnRzWzBdO1xuICAgIH1cbiAgfSk7XG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdLmhlcm9rdS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgaWYgKHZhbHVlLmFwcCAmJiAkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50cykge1xuICAgICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS51c2VyQ29uZmlnLmFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICgkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50c1tpXS5pZCA9PT0gdmFsdWUuYXBwLmFjY291bnQpIHtcbiAgICAgICAgICAkc2NvcGUuYWNjb3VudCA9ICRzY29wZS51c2VyQ29uZmlnLmFjY291bnRzW2ldO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdoZXJva3UnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5nZXRBcHBzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghJHNjb3BlLmFjY291bnQpIHJldHVybiBjb25zb2xlLndhcm4oJ3RyaWVkIHRvIGdldEFwcHMgYnV0IG5vIGFjY291bnQnKTtcbiAgICAkLmFqYXgoJy9leHQvaGVyb2t1L2FwcHMvJyArICRzY29wZS5hY2NvdW50LmlkLCB7XG4gICAgICB0eXBlOiAnR0VUJyxcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChib2R5LCByZXEpIHtcbiAgICAgICAgJHNjb3BlLmFjY291bnQuY2FjaGUgPSBib2R5O1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnR290IGFjY291bnRzIGxpc3QgZm9yICcgKyAkc2NvcGUuYWNjb3VudC5lbWFpbCwgdHJ1ZSk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IGFjY291bnRzIGxpc3QgZm9yICcgKyAkc2NvcGUuYWNjb3VudC5lbWFpbCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkpvYkNvbnRyb2xsZXInLCBbJyRzY29wZScsIEpvYkNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gSm9iQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAkc2NvcGUuaW5pdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAkc2NvcGUuJHdhdGNoKCd1c2VyQ29uZmlnc1tcIicgKyBuYW1lICsgJ1wiXScsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgJHNjb3BlLnVzZXJDb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXVtcIicgKyBuYW1lICsgJ1wiXS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAgICRzY29wZS5wbHVnaW5Db25maWcobmFtZSwgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLk5vZGVDb250cm9sbGVyJywgWyckc2NvcGUnLCBOb2RlQ29udHJvbGxlcl0pO1xuXG5mdW5jdGlvbiBOb2RlQ29udHJvbGxlcigkc2NvcGUpIHtcbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0ubm9kZS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gIH0pO1xuICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ25vZGUnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5yZW1vdmVHbG9iYWwgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAkc2NvcGUuY29uZmlnLmdsb2JhbHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xuICAkc2NvcGUuYWRkR2xvYmFsID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghJHNjb3BlLmNvbmZpZy5nbG9iYWxzKSAkc2NvcGUuY29uZmlnLmdsb2JhbHMgPSBbXTtcbiAgICAkc2NvcGUuY29uZmlnLmdsb2JhbHMucHVzaCgkc2NvcGUubmV3X3BhY2thZ2UpO1xuICAgICRzY29wZS5uZXdfcGFja2FnZSA9ICcnO1xuICAgICRzY29wZS5zYXZlKCk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLlJ1bm5lckNvbnRyb2xsZXInLCBbJyRzY29wZScsIFJ1bm5lckNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gUnVubmVyQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAkc2NvcGUuaW5pdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgJHNjb3BlLiR3YXRjaCgncnVubmVyQ29uZmlnc1ticmFuY2gubmFtZV1bXCInICsgbmFtZSArICdcIl0nLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdSdW5uZXIgY29uZmlnJywgbmFtZSwgdmFsdWUsICRzY29wZS5ydW5uZXJDb25maWdzKTtcbiAgICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucnVubmVyQ29uZmlnKCRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5TYXVjZUN0cmwnLCBbJyRzY29wZScsIFNhdWNlQ3RybF0pO1xuXG5mdW5jdGlvbiBTYXVjZUN0cmwoJHNjb3BlKSB7XG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdLnNhdWNlLmNvbmZpZycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICBpZiAoIXZhbHVlKSByZXR1cm47XG4gICAgJHNjb3BlLmJyb3dzZXJfbWFwID0ge307XG4gICAgaWYgKCF2YWx1ZS5icm93c2Vycykge1xuICAgICAgdmFsdWUuYnJvd3NlcnMgPSBbXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaT0wOyBpPHZhbHVlLmJyb3dzZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAkc2NvcGUuYnJvd3Nlcl9tYXBbc2VyaWFsaXplTmFtZSh2YWx1ZS5icm93c2Vyc1tpXSldID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuICAkc2NvcGUuY29tcGxldGVOYW1lID0gY29tcGxldGVOYW1lO1xuICAkc2NvcGUub3BlcmF0aW5nc3lzdGVtcyA9IG9yZ2FuaXplKGJyb3dzZXJzIHx8IFtdKTtcbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmNvbmZpZy5icm93c2VycyA9IFtdO1xuICAgIGZvciAodmFyIG5hbWUgaW4gJHNjb3BlLmJyb3dzZXJfbWFwKSB7XG4gICAgICBpZiAoJHNjb3BlLmJyb3dzZXJfbWFwW25hbWVdKSB7XG4gICAgICAgICRzY29wZS5jb25maWcuYnJvd3NlcnMucHVzaChwYXJzZU5hbWUobmFtZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdzYXVjZScsICRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICB9KTtcbiAgfTtcbiAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5icm93c2VyX21hcCA9IHt9O1xuICAgICRzY29wZS4kZGlnZXN0KCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG9yZ2FuaXplKGJyb3dzZXJzKSB7XG4gIHZhciBvc3MgPSB7fTtcbiAgZm9yICh2YXIgaT0wOyBpPGJyb3dzZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCFvc3NbYnJvd3NlcnNbaV0ub3NdKSB7XG4gICAgICBvc3NbYnJvd3NlcnNbaV0ub3NdID0ge307XG4gICAgfVxuICAgIGlmICghb3NzW2Jyb3dzZXJzW2ldLm9zXVticm93c2Vyc1tpXS5sb25nX25hbWVdKSB7XG4gICAgICBvc3NbYnJvd3NlcnNbaV0ub3NdW2Jyb3dzZXJzW2ldLmxvbmdfbmFtZV0gPSBbXTtcbiAgICB9XG4gICAgb3NzW2Jyb3dzZXJzW2ldLm9zXVticm93c2Vyc1tpXS5sb25nX25hbWVdLnB1c2goYnJvd3NlcnNbaV0pO1xuICAgIGJyb3dzZXJzW2ldLmNvbXBsZXRlX25hbWUgPSBjb21wbGV0ZU5hbWUoYnJvd3NlcnNbaV0pO1xuICB9XG4gIHJldHVybiBvc3M7XG59XG5cbmZ1bmN0aW9uIGNvbXBsZXRlTmFtZSh2ZXJzaW9uKSB7XG4gIHJldHVybiB2ZXJzaW9uLm9zICsgJy0nICsgdmVyc2lvbi5hcGlfbmFtZSArICctJyArIHZlcnNpb24uc2hvcnRfdmVyc2lvbjtcbn1cblxuZnVuY3Rpb24gcGFyc2VOYW1lKG5hbWUpIHtcbiAgdmFyIHBhcnRzID0gbmFtZS5zcGxpdCgnLScpO1xuICByZXR1cm4ge1xuICAgIHBsYXRmb3JtOiBwYXJ0c1swXSxcbiAgICBicm93c2VyTmFtZTogcGFydHNbMV0sXG4gICAgdmVyc2lvbjogcGFydHNbMl0gfHwgJydcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTmFtZShicm93c2VyKSB7XG4gIHJldHVybiBicm93c2VyLnBsYXRmb3JtICsgJy0nICsgYnJvd3Nlci5icm93c2VyTmFtZSArICctJyArIGJyb3dzZXIudmVyc2lvbjtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuV2ViaG9va3NDdHJsJywgWyckc2NvcGUnLCBXZWJob29rc0N0cmxdKTtcblxuZnVuY3Rpb24gV2ViaG9va3NDdHJsKCRzY29wZSkge1xuXG4gIGZ1bmN0aW9uIHJlbW92ZShhciwgaXRlbSkge1xuICAgIGFyLnNwbGljZShhci5pbmRleE9mKGl0ZW0pLCAxKTtcbiAgfVxuXG4gICRzY29wZS5ob29rcyA9ICRzY29wZS5wbHVnaW5Db25maWcoJ3dlYmhvb2tzJykgfHwgW107XG4gIGlmICghQXJyYXkuaXNBcnJheSgkc2NvcGUuaG9va3MpKSAkc2NvcGUuaG9va3MgPSBbXTtcbiAgaWYgKCEkc2NvcGUuaG9va3MubGVuZ3RoKSAkc2NvcGUuaG9va3MucHVzaCh7fSk7XG5cbiAgJHNjb3BlLnJlbW92ZSA9IGZ1bmN0aW9uIChob29rKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnd2ViaG9va3MnLCAkc2NvcGUuaG9va3MsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICAgIGlmICghZXJyKSByZW1vdmUoJHNjb3BlLmhvb2tzLCBob29rKTtcbiAgICAgIGlmICghJHNjb3BlLmhvb2tzLmxlbmd0aCkgJHNjb3BlLmhvb2tzLnB1c2goe30pO1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ3dlYmhvb2tzJywgJHNjb3BlLmhvb2tzLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuaG9va3MucHVzaCh7fSk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignRGFzaGJvYXJkQ3RybCcsIFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdTdHJpZGVyJywgRGFzaGJvYXJkQ3RybF0pO1xuXG5mdW5jdGlvbiBEYXNoYm9hcmRDdHJsKCRzY29wZSwgJGxvY2F0aW9uLCBTdHJpZGVyKSB7XG5cbiAgLy8gVE9ETzogbWFrZSB0aGlzIG1vcmUgZGVjbGFyYXRpdmU6XG4gIFN0cmlkZXIuU2Vzc2lvbi5nZXQoZnVuY3Rpb24odXNlcikge1xuICAgIGlmICghIHVzZXIudXNlcikgJGxvY2F0aW9uLnBhdGgoJy9sb2dpbicpO1xuICAgIGVsc2UgYXV0aGVudGljYXRlZCgpO1xuICB9KTtcblxuICBmdW5jdGlvbiBhdXRoZW50aWNhdGVkKCkge1xuICAgICRzY29wZS5qb2JzID0gU3RyaWRlci5qb2JzO1xuICAgIFN0cmlkZXIuY29ubmVjdCgkc2NvcGUpO1xuICAgIFN0cmlkZXIuam9icy5kYXNoYm9hcmQoKTtcbiAgfVxuXG4gICRzY29wZS5kZXBsb3kgPSBmdW5jdGlvbiBkZXBsb3kocHJvamVjdCkge1xuICAgIFN0cmlkZXIuZGVwbG95KHByb2plY3QpO1xuICB9O1xuXG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignRXJyb3JDdHJsJywgWyckc2NvcGUnLCAnJHJvb3RTY29wZScsIEVycm9yQ3RybF0pO1xuXG5mdW5jdGlvbiBFcnJvckN0cmwoJHNjb3BlLCAkcm9vdFNjb3BlKSB7XG4gICRzY29wZS5lcnJvciA9IHt9O1xuXG4gICRyb290U2NvcGUuJG9uKCdlcnJvcicsIGZ1bmN0aW9uKGV2LCBlcnIpIHtcbiAgICAkc2NvcGUuZXJyb3IubWVzc2FnZSA9IGVyci5tZXNzYWdlIHx8IGVycjtcbiAgfSk7XG5cbiAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgJHNjb3BlLmVycm9yLm1lc3NhZ2UgPSAnJztcbiAgfSk7XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignSm9iQ3RybCcsIFsnJHNjb3BlJywgJyRyb3V0ZVBhcmFtcycsICdTdHJpZGVyJywgSm9iQ3RybF0pO1xuXG5mdW5jdGlvbiBKb2JDdHJsKCRzY29wZSwgJHJvdXRlUGFyYW1zLCBTdHJpZGVyKSB7XG5cbiAgJHNjb3BlLnBoYXNlcyA9IFN0cmlkZXIucGhhc2VzO1xuXG4gIHZhciBwcm9qZWN0U2VhcmNoT3B0aW9ucyA9IHtcbiAgICBvd25lcjogJHJvdXRlUGFyYW1zLm93bmVyLFxuICAgIHJlcG86ICAkcm91dGVQYXJhbXMucmVwb1xuICB9O1xuXG4gIFN0cmlkZXIuUmVwby5nZXQocHJvamVjdFNlYXJjaE9wdGlvbnMsIGZ1bmN0aW9uKHJlcG8pIHtcbiAgICAkc2NvcGUucmVwbyA9IHJlcG8ucHJvamVjdFxuICAgICRzY29wZS5qb2IgID0gcmVwby5qb2I7XG4gICAgJHNjb3BlLmpvYnMgPSByZXBvLmpvYnM7XG4gIH0pO1xuXG4gIFN0cmlkZXIuY29ubmVjdCgkc2NvcGUpO1xuICAkc2NvcGUuZGVwbG95ID0gZnVuY3Rpb24gZGVwbG95KGpvYikge1xuICAgIFN0cmlkZXIuZGVwbG95KGpvYi5wcm9qZWN0KTtcbiAgfTtcblxuICAkc2NvcGUudGVzdCA9IGZ1bmN0aW9uIHRlc3Qoam9iKSB7XG4gICAgU3RyaWRlci50ZXN0KGpvYi5wcm9qZWN0KTtcbiAgfTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICdTdHJpZGVyJywgTG9naW5DdHJsXSk7XG5cbmZ1bmN0aW9uIExvZ2luQ3RybCgkc2NvcGUsICRsb2NhdGlvbiwgU3RyaWRlcikge1xuXG4gIFN0cmlkZXIuU2Vzc2lvbi5nZXQoZnVuY3Rpb24odXNlcikge1xuICAgIGlmICh1c2VyLmlkKSAkbG9jYXRpb24ucGF0aCgnL2Rhc2hib2FyZCcpO1xuICB9KTtcblxuICAkc2NvcGUudXNlciA9IHt9O1xuXG4gICRzY29wZS5sb2dpbiA9IGZ1bmN0aW9uIGxvZ2luKHVzZXIpIHtcbiAgICB2YXIgc2Vzc2lvbiA9IG5ldyAoU3RyaWRlci5TZXNzaW9uKSh1c2VyKTtcbiAgICBzZXNzaW9uLiRzYXZlKGZ1bmN0aW9uKCkge1xuICAgICAgJGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcbiAgICB9KTtcbiAgfTtcbn0iLCJ2YXIgYXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbmFwcC5maWx0ZXIoJ2Fuc2knLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoIWlucHV0KSByZXR1cm4gJyc7XG4gICAgdmFyIHRleHQgPSBpbnB1dC5yZXBsYWNlKC9eW15cXG5cXHJdKlxcdTAwMWJcXFsySy9nbSwgJycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHUwMDFiXFxbS1teXFxuXFxyXSovZywgJycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9bXlxcbl0qXFxyKFteXFxuXSkvZywgJyQxJylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL15bXlxcbl0qXFx1MDAxYlxcWzBHL2dtLCAnJylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG4gICAgcmV0dXJuIGFuc2lmaWx0ZXIodGV4dCk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBhbnNpcGFyc2Uoc3RyKSB7XG4gIC8vXG4gIC8vIEknbSB0ZXJyaWJsZSBhdCB3cml0aW5nIHBhcnNlcnMuXG4gIC8vXG4gIHZhciBtYXRjaGluZ0NvbnRyb2wgPSBudWxsLFxuICAgICAgbWF0Y2hpbmdEYXRhID0gbnVsbCxcbiAgICAgIG1hdGNoaW5nVGV4dCA9ICcnLFxuICAgICAgYW5zaVN0YXRlID0gW10sXG4gICAgICByZXN1bHQgPSBbXSxcbiAgICAgIG91dHB1dCA9IFwiXCIsXG4gICAgICBzdGF0ZSA9IHt9LFxuICAgICAgZXJhc2VDaGFyO1xuXG4gIHZhciBoYW5kbGVSZXN1bHQgPSBmdW5jdGlvbihwKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbXTtcblxuICAgIHAuZm9yZWdyb3VuZCAmJiBjbGFzc2VzLnB1c2gocC5mb3JlZ3JvdW5kKTtcbiAgICBwLmJhY2tncm91bmQgJiYgY2xhc3Nlcy5wdXNoKCdiZy0nICsgcC5iYWNrZ3JvdW5kKTtcbiAgICBwLmJvbGQgICAgICAgJiYgY2xhc3Nlcy5wdXNoKCdib2xkJyk7XG4gICAgcC5pdGFsaWMgICAgICYmIGNsYXNzZXMucHVzaCgnaXRhbGljJyk7XG4gICAgaWYgKCFwLnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNsYXNzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gb3V0cHV0ICs9IHAudGV4dFxuICAgIH1cbiAgICB2YXIgc3BhbiA9ICc8c3BhbiBjbGFzcz1cIicgKyBjbGFzc2VzLmpvaW4oJyAnKSArICdcIj4nICsgcC50ZXh0ICsgJzwvc3Bhbj4nXG4gICAgb3V0cHV0ICs9IHNwYW5cbiAgfVxuICAvL1xuICAvLyBHZW5lcmFsIHdvcmtmbG93IGZvciB0aGlzIHRoaW5nIGlzOlxuICAvLyBcXDAzM1xcWzMzbVRleHRcbiAgLy8gfCAgICAgfCAgfFxuICAvLyB8ICAgICB8ICBtYXRjaGluZ1RleHRcbiAgLy8gfCAgICAgbWF0Y2hpbmdEYXRhXG4gIC8vIG1hdGNoaW5nQ29udHJvbFxuICAvL1xuICAvLyBJbiBmdXJ0aGVyIHN0ZXBzIHdlIGhvcGUgaXQncyBhbGwgZ29pbmcgdG8gYmUgZmluZS4gSXQgdXN1YWxseSBpcy5cbiAgLy9cblxuICAvL1xuICAvLyBFcmFzZXMgYSBjaGFyIGZyb20gdGhlIG91dHB1dFxuICAvL1xuICBlcmFzZUNoYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGluZGV4LCB0ZXh0O1xuICAgIGlmIChtYXRjaGluZ1RleHQubGVuZ3RoKSB7XG4gICAgICBtYXRjaGluZ1RleHQgPSBtYXRjaGluZ1RleHQuc3Vic3RyKDAsIG1hdGNoaW5nVGV4dC5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgZWxzZSBpZiAocmVzdWx0Lmxlbmd0aCkge1xuICAgICAgaW5kZXggPSByZXN1bHQubGVuZ3RoIC0gMTtcbiAgICAgIHRleHQgPSByZXN1bHRbaW5kZXhdLnRleHQ7XG4gICAgICBpZiAodGV4dC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gQSByZXN1bHQgYml0IHdhcyBmdWxseSBkZWxldGVkLCBwb3AgaXQgb3V0IHRvIHNpbXBsaWZ5IHRoZSBmaW5hbCBvdXRwdXRcbiAgICAgICAgLy9cbiAgICAgICAgcmVzdWx0LnBvcCgpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJlc3VsdFtpbmRleF0udGV4dCA9IHRleHQuc3Vic3RyKDAsIHRleHQubGVuZ3RoIC0gMSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG1hdGNoaW5nQ29udHJvbCAhPT0gbnVsbCkge1xuICAgICAgaWYgKG1hdGNoaW5nQ29udHJvbCA9PSAnXFwwMzMnICYmIHN0cltpXSA9PSAnXFxbJykge1xuICAgICAgICAvL1xuICAgICAgICAvLyBXZSd2ZSBtYXRjaGVkIGZ1bGwgY29udHJvbCBjb2RlLiBMZXRzIHN0YXJ0IG1hdGNoaW5nIGZvcm1hdGluZyBkYXRhLlxuICAgICAgICAvL1xuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFwiZW1pdFwiIG1hdGNoZWQgdGV4dCB3aXRoIGNvcnJlY3Qgc3RhdGVcbiAgICAgICAgLy9cbiAgICAgICAgaWYgKG1hdGNoaW5nVGV4dCkge1xuICAgICAgICAgIHN0YXRlLnRleHQgPSBtYXRjaGluZ1RleHQ7XG4gICAgICAgICAgaGFuZGxlUmVzdWx0KHN0YXRlKTtcbiAgICAgICAgICBzdGF0ZSA9IHt9O1xuICAgICAgICAgIG1hdGNoaW5nVGV4dCA9IFwiXCI7XG4gICAgICAgIH1cblxuICAgICAgICBtYXRjaGluZ0NvbnRyb2wgPSBudWxsO1xuICAgICAgICBtYXRjaGluZ0RhdGEgPSAnJztcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAvL1xuICAgICAgICAvLyBXZSBmYWlsZWQgdG8gbWF0Y2ggYW55dGhpbmcgLSBtb3N0IGxpa2VseSBhIGJhZCBjb250cm9sIGNvZGUuIFdlXG4gICAgICAgIC8vIGdvIGJhY2sgdG8gbWF0Y2hpbmcgcmVndWxhciBzdHJpbmdzLlxuICAgICAgICAvL1xuICAgICAgICBtYXRjaGluZ1RleHQgKz0gbWF0Y2hpbmdDb250cm9sICsgc3RyW2ldO1xuICAgICAgICBtYXRjaGluZ0NvbnRyb2wgPSBudWxsO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGVsc2UgaWYgKG1hdGNoaW5nRGF0YSAhPT0gbnVsbCkge1xuICAgICAgaWYgKHN0cltpXSA9PSAnOycpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gYDtgIHNlcGFyYXRlcyBtYW55IGZvcm1hdHRpbmcgY29kZXMsIGZvciBleGFtcGxlOiBgXFwwMzNbMzM7NDNtYFxuICAgICAgICAvLyBtZWFucyB0aGF0IGJvdGggYDMzYCBhbmQgYDQzYCBzaG91bGQgYmUgYXBwbGllZC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETzogdGhpcyBjYW4gYmUgc2ltcGxpZmllZCBieSBtb2RpZnlpbmcgc3RhdGUgaGVyZS5cbiAgICAgICAgLy9cbiAgICAgICAgYW5zaVN0YXRlLnB1c2gobWF0Y2hpbmdEYXRhKTtcbiAgICAgICAgbWF0Y2hpbmdEYXRhID0gJyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChzdHJbaV0gPT0gJ20nKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIGBtYCBmaW5pc2hlZCB3aG9sZSBmb3JtYXR0aW5nIGNvZGUuIFdlIGNhbiBwcm9jZWVkIHRvIG1hdGNoaW5nXG4gICAgICAgIC8vIGZvcm1hdHRlZCB0ZXh0LlxuICAgICAgICAvL1xuICAgICAgICBhbnNpU3RhdGUucHVzaChtYXRjaGluZ0RhdGEpO1xuICAgICAgICBtYXRjaGluZ0RhdGEgPSBudWxsO1xuICAgICAgICBtYXRjaGluZ1RleHQgPSAnJztcblxuICAgICAgICAvL1xuICAgICAgICAvLyBDb252ZXJ0IG1hdGNoZWQgZm9ybWF0dGluZyBkYXRhIGludG8gdXNlci1mcmllbmRseSBzdGF0ZSBvYmplY3QuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE86IERSWS5cbiAgICAgICAgLy9cbiAgICAgICAgYW5zaVN0YXRlLmZvckVhY2goZnVuY3Rpb24gKGFuc2lDb2RlKSB7XG4gICAgICAgICAgaWYgKGFuc2lwYXJzZS5mb3JlZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXSkge1xuICAgICAgICAgICAgc3RhdGUuZm9yZWdyb3VuZCA9IGFuc2lwYXJzZS5mb3JlZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaXBhcnNlLmJhY2tncm91bmRDb2xvcnNbYW5zaUNvZGVdKSB7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kID0gYW5zaXBhcnNlLmJhY2tncm91bmRDb2xvcnNbYW5zaUNvZGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAzOSkge1xuICAgICAgICAgICAgZGVsZXRlIHN0YXRlLmZvcmVncm91bmQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDQ5KSB7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUuYmFja2dyb3VuZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaXBhcnNlLnN0eWxlc1thbnNpQ29kZV0pIHtcbiAgICAgICAgICAgIHN0YXRlW2Fuc2lwYXJzZS5zdHlsZXNbYW5zaUNvZGVdXSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDIyKSB7XG4gICAgICAgICAgICBzdGF0ZS5ib2xkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDIzKSB7XG4gICAgICAgICAgICBzdGF0ZS5pdGFsaWMgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMjQpIHtcbiAgICAgICAgICAgIHN0YXRlLnVuZGVybGluZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGFuc2lTdGF0ZSA9IFtdO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG1hdGNoaW5nRGF0YSArPSBzdHJbaV07XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoc3RyW2ldID09ICdcXDAzMycpIHtcbiAgICAgIG1hdGNoaW5nQ29udHJvbCA9IHN0cltpXTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RyW2ldID09ICdcXHUwMDA4Jykge1xuICAgICAgZXJhc2VDaGFyKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbWF0Y2hpbmdUZXh0ICs9IHN0cltpXTtcbiAgICB9XG4gIH1cblxuICBpZiAobWF0Y2hpbmdUZXh0KSB7XG4gICAgc3RhdGUudGV4dCA9IG1hdGNoaW5nVGV4dCArIChtYXRjaGluZ0NvbnRyb2wgPyBtYXRjaGluZ0NvbnRyb2wgOiAnJyk7XG4gICAgaGFuZGxlUmVzdWx0KHN0YXRlKTtcbiAgfVxuICByZXR1cm4gb3V0cHV0O1xufVxuXG5hbnNpcGFyc2UuZm9yZWdyb3VuZENvbG9ycyA9IHtcbiAgJzMwJzogJ2JsYWNrJyxcbiAgJzMxJzogJ3JlZCcsXG4gICczMic6ICdncmVlbicsXG4gICczMyc6ICd5ZWxsb3cnLFxuICAnMzQnOiAnYmx1ZScsXG4gICczNSc6ICdtYWdlbnRhJyxcbiAgJzM2JzogJ2N5YW4nLFxuICAnMzcnOiAnd2hpdGUnLFxuICAnOTAnOiAnZ3JleSdcbn07XG5cbmFuc2lwYXJzZS5iYWNrZ3JvdW5kQ29sb3JzID0ge1xuICAnNDAnOiAnYmxhY2snLFxuICAnNDEnOiAncmVkJyxcbiAgJzQyJzogJ2dyZWVuJyxcbiAgJzQzJzogJ3llbGxvdycsXG4gICc0NCc6ICdibHVlJyxcbiAgJzQ1JzogJ21hZ2VudGEnLFxuICAnNDYnOiAnY3lhbicsXG4gICc0Nyc6ICd3aGl0ZSdcbn07XG5cbmFuc2lwYXJzZS5zdHlsZXMgPSB7XG4gICcxJzogJ2JvbGQnLFxuICAnMyc6ICdpdGFsaWMnLFxuICAnNCc6ICd1bmRlcmxpbmUnXG59O1xuXG5mdW5jdGlvbiBhbnNpZmlsdGVyKGRhdGEsIHBsYWludGV4dCwgY2FjaGUpIHtcblxuICAvLyBoYW5kbGUgdGhlIGNoYXJhY3RlcnMgZm9yIFwiZGVsZXRlIGxpbmVcIiBhbmQgXCJtb3ZlIHRvIHN0YXJ0IG9mIGxpbmVcIlxuICB2YXIgc3RhcnRzd2l0aGNyID0gL15bXlxcbl0qXFxyW15cXG5dLy50ZXN0KGRhdGEpO1xuICB2YXIgb3V0cHV0ID0gYW5zaXBhcnNlKGRhdGEpO1xuXG4gIHZhciByZXMgPSBvdXRwdXQucmVwbGFjZSgvXFwwMzMvZywgJycpO1xuICBpZiAoc3RhcnRzd2l0aGNyKSByZXMgPSAnXFxyJyArIHJlcztcblxuICByZXR1cm4gcmVzO1xufVxuXG4iLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gY3JlYXRlSm9iU3RvcmU7XG5mdW5jdGlvbiBjcmVhdGVKb2JTdG9yZSgpIHtcbiAgcmV0dXJuIG5ldyBKb2JTdG9yZTtcbn1cblxudmFyIFBIQVNFUyA9IGV4cG9ydHMucGhhc2VzID1cblsnZW52aXJvbm1lbnQnLCAncHJlcGFyZScsICd0ZXN0JywgJ2RlcGxveScsICdjbGVhbnVwJ107XG5cbnZhciBzdGF0dXNIYW5kbGVycyA9IHtcbiAgJ3N0YXJ0ZWQnOiBmdW5jdGlvbiAodGltZSkge1xuICAgIHRoaXMuc3RhcnRlZCA9IHRpbWU7XG4gICAgdGhpcy5waGFzZSA9ICdlbnZpcm9ubWVudCc7XG4gICAgdGhpcy5zdGF0dXMgPSAncnVubmluZyc7XG4gIH0sXG4gICdlcnJvcmVkJzogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgdGhpcy5lcnJvciA9IGVycm9yO1xuICAgIHRoaXMuc3RhdHVzID0gJ2Vycm9yZWQnO1xuICB9LFxuICAnY2FuY2VsZWQnOiAnZXJyb3JlZCcsXG4gICdwaGFzZS5kb25lJzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB0aGlzLnBoYXNlID0gUEhBU0VTLmluZGV4T2YoZGF0YS5waGFzZSkgKyAxO1xuICB9LFxuICAvLyB0aGlzIGlzIGp1c3Qgc28gd2UnbGwgdHJpZ2dlciB0aGUgXCJ1bmtub3duIGpvYlwiIGxvb2t1cCBzb29uZXIgb24gdGhlIGRhc2hib2FyZFxuICAnc3Rkb3V0JzogZnVuY3Rpb24gKHRleHQpIHt9LFxuICAnc3RkZXJyJzogZnVuY3Rpb24gKHRleHQpIHt9LFxuICAnd2FybmluZyc6IGZ1bmN0aW9uICh3YXJuaW5nKSB7XG4gICAgaWYgKCF0aGlzLndhcm5pbmdzKSB7XG4gICAgICB0aGlzLndhcm5pbmdzID0gW107XG4gICAgfVxuICAgIHRoaXMud2FybmluZ3MucHVzaCh3YXJuaW5nKTtcbiAgfSxcbiAgJ3BsdWdpbi1kYXRhJzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgcGF0aCA9IGRhdGEucGF0aCA/IFtkYXRhLnBsdWdpbl0uY29uY2F0KGRhdGEucGF0aC5zcGxpdCgnLicpKSA6IFtkYXRhLnBsdWdpbl1cbiAgICAsIGxhc3QgPSBwYXRoLnBvcCgpXG4gICAgLCBtZXRob2QgPSBkYXRhLm1ldGhvZCB8fCAncmVwbGFjZSdcbiAgICAsIHBhcmVudFxuICAgIHBhcmVudCA9IHBhdGgucmVkdWNlKGZ1bmN0aW9uIChvYmosIGF0dHIpIHtcbiAgICAgIHJldHVybiBvYmpbYXR0cl0gfHwgKG9ialthdHRyXSA9IHt9KVxuICAgIH0sIHRoaXMucGx1Z2luX2RhdGEgfHwgKHRoaXMucGx1Z2luX2RhdGEgPSB7fSkpXG4gICAgaWYgKG1ldGhvZCA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICBwYXJlbnRbbGFzdF0gPSBkYXRhLmRhdGFcbiAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ3B1c2gnKSB7XG4gICAgICBpZiAoIXBhcmVudFtsYXN0XSkge1xuICAgICAgICBwYXJlbnRbbGFzdF0gPSBbXVxuICAgICAgfVxuICAgICAgcGFyZW50W2xhc3RdLnB1c2goZGF0YS5kYXRhKVxuICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSAnZXh0ZW5kJykge1xuICAgICAgaWYgKCFwYXJlbnRbbGFzdF0pIHtcbiAgICAgICAgcGFyZW50W2xhc3RdID0ge31cbiAgICAgIH1cbiAgICAgIGV4dGVuZChwYXJlbnRbbGFzdF0sIGRhdGEuZGF0YSlcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBcInBsdWdpbiBkYXRhXCIgbWV0aG9kIHJlY2VpdmVkIGZyb20gcGx1Z2luJywgZGF0YS5wbHVnaW4sIGRhdGEubWV0aG9kLCBkYXRhKVxuICAgIH1cbiAgfSxcblxuICAncGhhc2UuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5kdXJhdGlvbiA9IGRhdGEuZWxhcHNlZFxuICAgIHRoaXMucGhhc2VzW2RhdGEucGhhc2VdLmV4aXRDb2RlID0gZGF0YS5jb2RlO1xuICAgIGlmIChbJ3ByZXBhcmUnLCAnZW52aXJvbm1lbnQnLCAnY2xlYW51cCddLmluZGV4T2YoZGF0YS5waGFzZSkgIT09IC0xKSB7XG4gICAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5jb2xsYXBzZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoZGF0YS5waGFzZSA9PT0gJ3Rlc3QnKSB0aGlzLnRlc3Rfc3RhdHVzID0gZGF0YS5jb2RlO1xuICAgIGlmIChkYXRhLnBoYXNlID09PSAnZGVwbG95JykgdGhpcy5kZXBsb3lfc3RhdHVzID0gZGF0YS5jb2RlO1xuICAgIGlmICghZGF0YS5uZXh0IHx8ICF0aGlzLnBoYXNlc1tkYXRhLm5leHRdKSByZXR1cm47XG4gICAgdGhpcy5waGFzZSA9IGRhdGEubmV4dDtcbiAgICB0aGlzLnBoYXNlc1tkYXRhLm5leHRdLnN0YXJ0ZWQgPSBkYXRhLnRpbWU7XG4gIH0sXG4gICdjb21tYW5kLmNvbW1lbnQnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdmFyIHBoYXNlID0gdGhpcy5waGFzZXNbdGhpcy5waGFzZV1cbiAgICAgICwgY29tbWFuZCA9IGV4dGVuZCh7fSwgU0tFTFMuY29tbWFuZCk7XG4gICAgY29tbWFuZC5jb21tYW5kID0gZGF0YS5jb21tZW50O1xuICAgIGNvbW1hbmQuY29tbWVudCA9IHRydWU7XG4gICAgY29tbWFuZC5wbHVnaW4gPSBkYXRhLnBsdWdpbjtcbiAgICBjb21tYW5kLmZpbmlzaGVkID0gZGF0YS50aW1lO1xuICAgIHBoYXNlLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gIH0sXG4gICdjb21tYW5kLnN0YXJ0JzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQsIGRhdGEpO1xuICAgIGNvbW1hbmQuc3RhcnRlZCA9IGRhdGEudGltZTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9LFxuICAnY29tbWFuZC5kb25lJzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBwaGFzZS5jb21tYW5kc1twaGFzZS5jb21tYW5kcy5sZW5ndGggLSAxXTtcbiAgICBjb21tYW5kLmZpbmlzaGVkID0gZGF0YS50aW1lO1xuICAgIGNvbW1hbmQuZHVyYXRpb24gPSBkYXRhLmVsYXBzZWQ7XG4gICAgY29tbWFuZC5leGl0Q29kZSA9IGRhdGEuZXhpdENvZGU7XG4gICAgY29tbWFuZC5tZXJnZWQgPSBjb21tYW5kLl9tZXJnZWQ7XG4gIH0sXG4gICdzdGRvdXQnOiBmdW5jdGlvbiAodGV4dCkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdmFyIGNvbW1hbmQgPSBlbnN1cmVDb21tYW5kKHRoaXMucGhhc2VzW3RoaXMucGhhc2VdKTtcbiAgICBjb21tYW5kLm91dCArPSB0ZXh0O1xuICAgIGNvbW1hbmQuX21lcmdlZCArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLm91dCArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLm1lcmdlZCArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLm1lcmdlZF9sYXRlc3QgPSB0ZXh0O1xuICB9LFxuICAnc3RkZXJyJzogZnVuY3Rpb24gKHRleHQpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBjb21tYW5kID0gZW5zdXJlQ29tbWFuZCh0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXSk7XG4gICAgY29tbWFuZC5lcnIgKz0gdGV4dDtcbiAgICBjb21tYW5kLl9tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5lcnIgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWRfbGF0ZXN0ID0gdGV4dDtcbiAgfVxufVxuXG5mdW5jdGlvbiBKb2JTdG9yZSgpIHtcbiAgdGhpcy5qb2JzID0ge1xuICAgIGRhc2hib2FyZDogZGFzaGJvYXJkLmJpbmQodGhpcyksXG4gICAgcHVibGljOiBbXSxcbiAgICB5b3VyczogW10sXG4gICAgbGltYm86IFtdXG4gIH07XG59XG52YXIgSlMgPSBKb2JTdG9yZS5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIGRhc2hib2FyZChjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ2Rhc2hib2FyZDpqb2JzJywgZnVuY3Rpb24oam9icykge1xuICAgIHNlbGYuam9icy55b3VycyA9IGpvYnMueW91cnM7XG4gICAgc2VsZi5qb2JzLnB1YmxpYyA9IGpvYnMucHVibGljO1xuICAgIHNlbGYuY2hhbmdlZCgpO1xuICB9KTtcbn1cblxuXG4vLy8gLS0tLSBKb2IgU3RvcmUgcHJvdG90eXBlIGZ1bmN0aW9uczogLS0tLVxuXG4vLy8gY29ubmVjdFxuXG5KUy5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdChzb2NrZXQsIGNoYW5nZUNhbGxiYWNrKSB7XG4gIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuICB0aGlzLmNoYW5nZUNhbGxiYWNrID0gY2hhbmdlQ2FsbGJhY2s7XG5cbiAgZm9yICh2YXIgc3RhdHVzIGluIHN0YXR1c0hhbmRsZXJzKSB7XG4gICAgc29ja2V0Lm9uKCdqb2Iuc3RhdHVzLicgKyBzdGF0dXMsIHRoaXMudXBkYXRlLmJpbmQodGhpcywgc3RhdHVzKSlcbiAgfVxuXG4gIHNvY2tldC5vbignam9iLm5ldycsIEpTLm5ld0pvYi5iaW5kKHRoaXMpKTtcbn07XG5cblxuLy8vIHVwZGF0ZSAtIGhhbmRsZSB1cGRhdGUgZXZlbnRcblxuSlMudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKGV2ZW50LCBhcmdzLCBhY2Nlc3MsIGRvbnRjaGFuZ2UpIHtcbiAgdmFyIGlkID0gYXJncy5zaGlmdCgpXG4gICAgLCBqb2IgPSB0aGlzLmpvYihpZCwgYWNjZXNzKVxuICAgICwgaGFuZGxlciA9IHN0YXR1c0hhbmRsZXJzW2V2ZW50XTtcbiAgaWYgKCFqb2IpIHJldHVybiB0aGlzLnVua25vd24oaWQsIGV2ZW50LCBhcmdzLCBhY2Nlc3MpXG4gIGlmICghaGFuZGxlcikgcmV0dXJuO1xuICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBoYW5kbGVyKSB7XG4gICAgam9iLnN0YXR1cyA9IGhhbmRsZXI7XG4gIH0gZWxzZSB7XG4gICAgaGFuZGxlci5hcHBseShqb2IsIGFyZ3MpO1xuICB9XG4gIGlmICghZG9udGNoYW5nZSkgdGhpcy5jaGFuZ2VkKCk7XG59O1xuXG5cbi8vLyBuZXdKb2IgLSB3aGVuIHNlcnZlciBub3RpZmllcyBvZiBuZXcgam9iXG5cbkpTLm5ld0pvYiA9IGZ1bmN0aW9uIG5ld0pvYihqb2IsIGFjY2Vzcykge1xuICBpZiAoISBqb2IpIHJldHVybjtcbiAgaWYgKEFycmF5LmlzQXJyYXkoam9iKSkgam9iID0gam9iWzBdO1xuXG4gIHZhciBqb2JzID0gdGhpcy5qb2JzW2FjY2Vzc11cbiAgICAsIGZvdW5kID0gLTFcbiAgICAsIG9sZDtcblxuICBpZiAoISBqb2JzKSByZXR1cm47XG5cbiAgZnVuY3Rpb24gc2VhcmNoKCkge1xuICAgIGZvciAodmFyIGk9MDsgaTxqb2JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoam9ic1tpXS5wcm9qZWN0Lm5hbWUgPT09IGpvYi5wcm9qZWN0Lm5hbWUpIHtcbiAgICAgICAgZm91bmQgPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzZWFyY2goKTtcbiAgaWYgKGZvdW5kIDwgMCkge1xuICAgIC8vLyB0cnkgbGltYm9cbiAgICBqb2JzID0gdGhpcy5qb2JzLmxpbWJvO1xuICAgIHNlYXJjaCgpO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdO1xuICAgICAgam9icy51bnNoaWZ0KHRoaXMuam9icy5saW1ib1tmb3VuZF0pO1xuICAgICAgdGhpcy5qb2JzLmxpbWJvLnNwbGljZShmb3VuZCwgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGZvdW5kICE9PSAtMSkge1xuICAgIG9sZCA9IGpvYnMuc3BsaWNlKGZvdW5kLCAxKVswXTtcbiAgICBqb2IucHJvamVjdC5wcmV2ID0gb2xkLnByb2plY3QucHJldjtcbiAgfVxuICAvLyBpZiAoam9iLnBoYXNlcykge1xuICAvLyAgIC8vIGdldCByaWQgb2YgZXh0cmEgZGF0YSAtIHdlIGRvbid0IG5lZWQgaXQuXG4gIC8vICAgLy8gbm90ZTogdGhpcyB3b24ndCBiZSBwYXNzZWQgdXAgYW55d2F5IGZvciBwdWJsaWMgcHJvamVjdHNcbiAgLy8gICBjbGVhbkpvYihqb2IpO1xuICAvLyB9XG4gIC8vam9iLnBoYXNlID0gJ2Vudmlyb25tZW50JztcbiAgam9icy51bnNoaWZ0KGpvYik7XG4gIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuXG4vLy8gam9iIC0gZmluZCBhIGpvYiBieSBpZCBhbmQgYWNjZXNzIGxldmVsXG5cbkpTLmpvYiA9IGZ1bmN0aW9uIGpvYihpZCwgYWNjZXNzKSB7XG4gIHZhciBqb2JzID0gdGhpcy5qb2JzW2FjY2Vzc107XG4gIHZhciBqb2IgPSBzZWFyY2goaWQsIGpvYnMpO1xuICAvLyBpZiBub3QgZm91bmQsIHRyeSBsaW1ib1xuICBpZiAoISBqb2Ipe1xuICAgIGpvYiA9IHNlYXJjaChpZCwgdGhpcy5qb2JzLmxpbWJvKTtcbiAgICBpZiAoam9iKSB7XG4gICAgICBqb2JzLnVuc2hpZnQoam9iKTtcbiAgICAgIHRoaXMuam9icy5saW1iby5zcGxpY2UodGhpcy5qb2JzLmxpbWJvLmluZGV4T2Yoam9iKSwgMSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBqb2I7XG59O1xuXG5mdW5jdGlvbiBzZWFyY2goaWQsIGpvYnMpIHtcbiAgZm9yICh2YXIgaT0wOyBpPGpvYnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoam9ic1tpXS5faWQgPT09IGlkKSByZXR1cm4gam9ic1tpXTtcbiAgfVxufVxuXG5cbi8vLyBjaGFuZ2VkIC0gbm90aWZpZXMgVUkgb2YgY2hhbmdlc1xuXG5KUy5jaGFuZ2VkID0gZnVuY3Rpb24gY2hhbmdlZCgpIHtcbiAgdGhpcy5jaGFuZ2VDYWxsYmFjaygpO1xufTtcblxuXG4vLy8gbG9hZCDigJTCoGxvYWRzIGEgam9iXG5cbkpTLmxvYWQgPSBmdW5jdGlvbiBsb2FkKGpvYklkLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ2J1aWxkOmpvYicsIGpvYklkLCBmdW5jdGlvbihqb2IpIHtcbiAgICBzZWxmLm5ld0pvYihqb2IsICdsaW1ibycpO1xuICAgIGNiKGpvYik7XG4gICAgc2VsZi5jaGFuZ2VkKCk7XG4gIH0pO1xufTtcblxuZnVuY3Rpb24gZW5zdXJlQ29tbWFuZChwaGFzZSkge1xuICB2YXIgY29tbWFuZCA9IHBoYXNlLmNvbW1hbmRzW3BoYXNlLmNvbW1hbmRzLmxlbmd0aCAtIDFdO1xuICBpZiAoIWNvbW1hbmQgfHwgdHlwZW9mKGNvbW1hbmQuZmluaXNoZWQpICE9PSAndW5kZWZpbmVkJykge1xuICAgIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQpO1xuICAgIHBoYXNlLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gIH1cbiAgcmV0dXJuIGNvbW1hbmQ7XG59IiwidmFyIEpvYlN0b3JlID0gcmVxdWlyZSgnLi9qb2Jfc3RvcmUnKTtcbnZhciBqb2JTdG9yZSA9IEpvYlN0b3JlKCk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEJ1aWxkU3RyaWRlcjtcblxuZnVuY3Rpb24gQnVpbGRTdHJpZGVyKCRyZXNvdXJjZSkge1xuICByZXR1cm4gbmV3IFN0cmlkZXIoJHJlc291cmNlKTtcbn1cblxuXG52YXIgc29ja2V0O1xudmFyIHNjb3BlcyA9IFtdO1xuXG5mdW5jdGlvbiBTdHJpZGVyKCRyZXNvdXJjZSwgb3B0cykge1xuICBpZiAoISBvcHRzKSBvcHRzID0ge307XG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnc3RyaW5nJylcbiAgICBvcHRzID0geyB1cmw6IG9wdHMgfTtcblxuICB0aGlzLnVybCA9IG9wdHMudXJsIHx8ICcvL2xvY2FsaG9zdDozMDAwJztcblxuICAvLy8gUmVzdGZ1bCBBUEkgc2V0dXBcbiAgdmFyIGFwaUJhc2UgID0gdGhpcy51cmwgKyAnL2FwaSc7XG4gIHZhciBsb2dpblVSTCA9IHRoaXMudXJsICsgJy9sb2dpbic7XG4gIHRoaXMuU2Vzc2lvbiA9ICRyZXNvdXJjZShhcGlCYXNlICsgJy9zZXNzaW9uLycpO1xuICB0aGlzLlJlcG8gICAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvOm93bmVyLzpyZXBvLycpO1xuICB0aGlzLkNvbmZpZyAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvOm93bmVyLzpyZXBvL2NvbmZpZycsIHt9LCB7XG4gICAgZ2V0OiB7XG4gICAgICBtZXRob2Q6ICdHRVQnXG4gICAgfSxcbiAgICBzYXZlOiB7XG4gICAgICBtZXRob2Q6ICdQVVQnXG4gICAgfVxuICB9KTtcbiAgdGhpcy5SZWd1bGFyQ29uZmlnICA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NvbmZpZycsIHt9LCB7XG4gICAgc2F2ZToge1xuICAgICAgbWV0aG9kOiAnUFVUJ1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuQ29uZmlnLkJyYW5jaCA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NvbmZpZy86YnJhbmNoXFxcXC8nLCB7fSwge1xuICAgIHNhdmU6IHtcbiAgICAgIG1ldGhvZDogJ1BVVCdcbiAgICB9XG4gIH0pO1xuICB0aGlzLkNvbmZpZy5CcmFuY2guUnVubmVyID0gJHJlc291cmNlKHRoaXMudXJsICsgJy86b3duZXIvOnJlcG8vY29uZmlnLzpicmFuY2gvcnVubmVyJywge30sIHtcbiAgICBzYXZlOiB7XG4gICAgICBtZXRob2Q6ICdQVVQnXG4gICAgfVxuICB9KTtcbiAgdGhpcy5Db25maWcuQnJhbmNoLlBsdWdpbiAgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9jb25maWcvOmJyYW5jaC86cGx1Z2luJywge30sIHtcbiAgICBzYXZlOiB7XG4gICAgICBtZXRob2Q6ICdQVVQnXG4gICAgfVxuICB9KTtcbiAgdGhpcy5Qcm92aWRlciA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL3Byb3ZpZGVyJyk7XG4gIHRoaXMuQ2FjaGUgICA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NhY2hlJyk7XG4gIHRoaXMuU3RhcnQgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9zdGFydCcpO1xuICB0aGlzLktleWdlbiAgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9rZXlnZW4vOmJyYW5jaFxcXFwvJyk7XG5cbiAgdGhpcy5qb2JzICAgID0gam9iU3RvcmUuam9icztcbiAgdGhpcy5waGFzZXMgID0gSm9iU3RvcmUucGhhc2VzO1xufVxuXG5cbnZhciBTID0gU3RyaWRlci5wcm90b3R5cGU7XG5cblxuLy8vIGNoYW5nZWQgLSBpbnZva2VkIHdoZW4gVUkgbmVlZHMgdXBkYXRpbmdcbmZ1bmN0aW9uIGNoYW5nZWQoKSB7XG4gIHNjb3Blcy5mb3JFYWNoKGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgc2NvcGUuJGRpZ2VzdCgpO1xuICB9KTtcbn1cblxuXG4vLy8vIC0tLS0gU3RyaWRlciBwcm90b3R5cGUgZnVuY3Rpb25zXG5cbi8vLyBjb25uZWN0XG5cblMuY29ubmVjdCA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gIGlmICghIHNvY2tldCkge1xuICAgIHNvY2tldCA9IGlvLmNvbm5lY3QodGhpcy51cmwpO1xuXG4gICAgLy8vIGNvbm5lY3RzIGpvYiBzdG9yZSB0byBuZXcgc29ja2V0XG4gICAgam9iU3RvcmUuY29ubmVjdChzb2NrZXQsIGNoYW5nZWQpO1xuICB9XG4gIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuXG4gIHNjb3Blcy5wdXNoKHNjb3BlKTtcbiAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSAwIDsgISBmb3VuZCAmJiBpIDwgc2NvcGVzLmxlbmd0aDsgaSArKykge1xuICAgICAgaWYgKHNjb3Blc1tpXSA9PSBzY29wZSkge1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIHNjb3Blcy5zcGxpY2UoaSwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cblxuLy8vIGRlcGxveVxuXG5TLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShwcm9qZWN0KSB7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ2RlcGxveScsIHByb2plY3QubmFtZSB8fCBwcm9qZWN0KTtcbn07XG5cblMudGVzdCA9IGZ1bmN0aW9uIHRlc3QocHJvamVjdCkge1xuICB0aGlzLnNvY2tldC5lbWl0KCd0ZXN0JywgcHJvamVjdC5uYW1lIHx8IHByb2plY3QpO1xufTtcblxuXG4vLy8gam9iXG5cblMuam9iID0gZnVuY3Rpb24gam9iKGpvYklkLCBjYikge1xuICBqb2JTdG9yZS5sb2FkKGpvYklkLCBjYik7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gaGFzS2V5c1xuXG5mdW5jdGlvbiBoYXNLZXlzKHNvdXJjZSkge1xuICAgIHJldHVybiBzb3VyY2UgIT09IG51bGwgJiZcbiAgICAgICAgKHR5cGVvZiBzb3VyY2UgPT09IFwib2JqZWN0XCIgfHxcbiAgICAgICAgdHlwZW9mIHNvdXJjZSA9PT0gXCJmdW5jdGlvblwiKVxufVxuIiwidmFyIEtleXMgPSByZXF1aXJlKFwib2JqZWN0LWtleXNcIilcbnZhciBoYXNLZXlzID0gcmVxdWlyZShcIi4vaGFzLWtleXNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGlmICghaGFzS2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGtleXMgPSBLZXlzKHNvdXJjZSlcblxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0ga2V5c1tqXVxuICAgICAgICAgICAgdGFyZ2V0W25hbWVdID0gc291cmNlW25hbWVdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKGZuKSB7XG5cdHZhciBpc0Z1bmMgPSAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nICYmICEoZm4gaW5zdGFuY2VvZiBSZWdFeHApKSB8fCB0b1N0cmluZy5jYWxsKGZuKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblx0aWYgKCFpc0Z1bmMgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRpc0Z1bmMgPSBmbiA9PT0gd2luZG93LnNldFRpbWVvdXQgfHwgZm4gPT09IHdpbmRvdy5hbGVydCB8fCBmbiA9PT0gd2luZG93LmNvbmZpcm0gfHwgZm4gPT09IHdpbmRvdy5wcm9tcHQ7XG5cdH1cblx0cmV0dXJuIGlzRnVuYztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XG5cdGlmICghaXNGdW5jdGlvbihmbikpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdpdGVyYXRvciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblx0fVxuXHR2YXIgaSwgayxcblx0XHRpc1N0cmluZyA9IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnLFxuXHRcdGwgPSBvYmoubGVuZ3RoLFxuXHRcdGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IG51bGw7XG5cdGlmIChsID09PSArbCkge1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdGlmIChjb250ZXh0ID09PSBudWxsKSB7XG5cdFx0XHRcdGZuKGlzU3RyaW5nID8gb2JqLmNoYXJBdChpKSA6IG9ialtpXSwgaSwgb2JqKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZuLmNhbGwoY29udGV4dCwgaXNTdHJpbmcgPyBvYmouY2hhckF0KGkpIDogb2JqW2ldLCBpLCBvYmopO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRmb3IgKGsgaW4gb2JqKSB7XG5cdFx0XHRpZiAoaGFzT3duLmNhbGwob2JqLCBrKSkge1xuXHRcdFx0XHRpZiAoY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdGZuKG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmbi5jYWxsKGNvbnRleHQsIG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBPYmplY3Qua2V5cyB8fCByZXF1aXJlKCcuL3NoaW0nKTtcblxuIiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuXHR2YXIgc3RyID0gdG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG5cdHZhciBpc0FyZ3VtZW50cyA9IHN0ciA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG5cdGlmICghaXNBcmd1bWVudHMpIHtcblx0XHRpc0FyZ3VtZW50cyA9IHN0ciAhPT0gJ1tvYmplY3QgQXJyYXldJ1xuXHRcdFx0JiYgdmFsdWUgIT09IG51bGxcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInXG5cdFx0XHQmJiB2YWx1ZS5sZW5ndGggPj0gMFxuXHRcdFx0JiYgdG9TdHJpbmcuY2FsbCh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHR9XG5cdHJldHVybiBpc0FyZ3VtZW50cztcbn07XG5cbiIsIihmdW5jdGlvbiAoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8vIG1vZGlmaWVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9lczUtc2hpbVxuXHR2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcblx0XHR0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdFx0Zm9yRWFjaCA9IHJlcXVpcmUoJy4vZm9yZWFjaCcpLFxuXHRcdGlzQXJncyA9IHJlcXVpcmUoJy4vaXNBcmd1bWVudHMnKSxcblx0XHRoYXNEb250RW51bUJ1ZyA9ICEoeyd0b1N0cmluZyc6IG51bGx9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKSxcblx0XHRoYXNQcm90b0VudW1CdWcgPSAoZnVuY3Rpb24gKCkge30pLnByb3BlcnR5SXNFbnVtZXJhYmxlKCdwcm90b3R5cGUnKSxcblx0XHRkb250RW51bXMgPSBbXG5cdFx0XHRcInRvU3RyaW5nXCIsXG5cdFx0XHRcInRvTG9jYWxlU3RyaW5nXCIsXG5cdFx0XHRcInZhbHVlT2ZcIixcblx0XHRcdFwiaGFzT3duUHJvcGVydHlcIixcblx0XHRcdFwiaXNQcm90b3R5cGVPZlwiLFxuXHRcdFx0XCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLFxuXHRcdFx0XCJjb25zdHJ1Y3RvclwiXG5cdFx0XSxcblx0XHRrZXlzU2hpbTtcblxuXHRrZXlzU2hpbSA9IGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG5cdFx0dmFyIGlzT2JqZWN0ID0gb2JqZWN0ICE9PSBudWxsICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnLFxuXHRcdFx0aXNGdW5jdGlvbiA9IHRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcblx0XHRcdGlzQXJndW1lbnRzID0gaXNBcmdzKG9iamVjdCksXG5cdFx0XHR0aGVLZXlzID0gW107XG5cblx0XHRpZiAoIWlzT2JqZWN0ICYmICFpc0Z1bmN0aW9uICYmICFpc0FyZ3VtZW50cykge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5rZXlzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG5cdFx0fVxuXG5cdFx0aWYgKGlzQXJndW1lbnRzKSB7XG5cdFx0XHRmb3JFYWNoKG9iamVjdCwgZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdHRoZUtleXMucHVzaCh2YWx1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIG5hbWUsXG5cdFx0XHRcdHNraXBQcm90byA9IGhhc1Byb3RvRW51bUJ1ZyAmJiBpc0Z1bmN0aW9uO1xuXG5cdFx0XHRmb3IgKG5hbWUgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdGlmICghKHNraXBQcm90byAmJiBuYW1lID09PSAncHJvdG90eXBlJykgJiYgaGFzLmNhbGwob2JqZWN0LCBuYW1lKSkge1xuXHRcdFx0XHRcdHRoZUtleXMucHVzaChuYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChoYXNEb250RW51bUJ1Zykge1xuXHRcdFx0dmFyIGN0b3IgPSBvYmplY3QuY29uc3RydWN0b3IsXG5cdFx0XHRcdHNraXBDb25zdHJ1Y3RvciA9IGN0b3IgJiYgY3Rvci5wcm90b3R5cGUgPT09IG9iamVjdDtcblxuXHRcdFx0Zm9yRWFjaChkb250RW51bXMsIGZ1bmN0aW9uIChkb250RW51bSkge1xuXHRcdFx0XHRpZiAoIShza2lwQ29uc3RydWN0b3IgJiYgZG9udEVudW0gPT09ICdjb25zdHJ1Y3RvcicpICYmIGhhcy5jYWxsKG9iamVjdCwgZG9udEVudW0pKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKGRvbnRFbnVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGVLZXlzO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0ga2V5c1NoaW07XG59KCkpO1xuXG4iXX0=
;