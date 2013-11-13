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

  var reload = {
    controller: 'ReloadCtrl',
    template: '<div>Please wait, redirecting</div>'
  };

  $routeProvider.
    when('/', {
      templateUrl: '/partials/index.html'
    }).
    when('/dashboard', {
      templateUrl: '/partials/dashboard/index.html',
      controller: 'DashboardCtrl',
      reloadOnSearch: false
    }).
    when('/projects', {
      templateUrl: '/partials/projects/index.html',
      controller: 'ProjectsCtrl',
      reloadOnSearch: false
    }).
    when('/login', {
      templateUrl: '/partials/login.html',
      controller: 'LoginCtrl'
    }).
    when('/account', {
      templateUrl: '/partials/account.html',
      controller: 'AccountCtrl',
      reloadOnSearch: false
    }).

    when('/auth/github', reload).

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
    })
  ;

}


},{"./http_interceptor":27,"./strider":30}],2:[function(require,module,exports){
var App = require('../app');

App.controller('AccountCtrl', ['$scope', '$sce', 'Strider', AccountCtrl]);

function AccountCtrl($scope, $sce, Strider) {

  Strider.get('/api/account', function(reply) {
    $scope.user = reply.user;
    $scope.providers = reply.providers;
    $scope.userConfigs = reply.userConfigs;
    $scope.accounts = setupAccounts(reply.user);

    /// Trust some HTML

    Object.keys($scope.providers).forEach(function(key) {
      var provider = $scope.providers[key];
      if (provider.html) provider.html = $sce.trustAsHtml(provider.html);
    });

    Object.keys($scope.userConfigs.job).forEach(function(key) {
      var job = $scope.userConfigs.job[key];
      if (job.html) job.html = $sce.trustAsHtml(job.html);
    });

    $scope.deleteAccount = function (account) {
      if (account.unsaved) {
        var idx = $scope.accounts[account.provider].indexOf(account);
        $scope.accounts[account.provider].splice(idx, 1);
        idx = $scope.user.accounts.indexOf(account);
        $scope.user.accounts.splice(idx, 1);
        $scope.success('Account removed');
        return;
      }

      Strider.del('/api/account/' + account.provider + '/' + account.id, success);

      function success() {
        var idx = $scope.accounts[account.provider].indexOf(account);
        $scope.accounts[account.provider].splice(idx, 1);
        idx = $scope.user.accounts.indexOf(account);
        $scope.user.accounts.splice(idx, 1);
        $scope.success('Account removed');
      }
    };

    $scope.addAccount = function (provider) {
      var id = 0
        , aid;
      if (!$scope.accounts[provider]) {
        $scope.accounts[provider] = [];
      }
      for (var i=0; i<$scope.accounts[provider].length; i++) {
        aid = parseInt($scope.accounts[provider][i].id, 10);
        if (aid >= id) {
          id = aid + 1;
        }
      }
      var acct = {
        id: id,
        provider: provider,
        title: provider + ' ' + id,
        last_updated: new Date(),
        config: {},
        cache: [],
        unsaved: true
      };
      $scope.accounts[provider].push(acct);
      $scope.user.accounts.push(acct);
    };

    $scope.saveAccount = function (provider, account, next) {

      Strider.put(
        '/api/account/' +
          encodeURIComponent(provider) +
          '/' + encodeURIComponent(account.id),
        account,
        success);

      function success() {
        delete account.unsaved;
        next();
        $scope.success('Account saved');
      }
    };

    $scope.changePassword = function () {

      Strider.post('/api/account/password', {password: $scope.password}, success);

      function success() {
        $scope.password = '';
        $scope.confirm_password = '';
        $scope.success('Password changed');
      }
    };

    $scope.changeEmail = function () {

      Strider.post('/api/account/email', {email:$scope.user.email}, success);

      function success() {
        $scope.success('Email successfully changed');
      }
    };
  });
}


function setupAccounts(user) {
  var accounts = {};
  if (!user.accounts || !user.accounts.length) return accounts;
  for (var i=0; i<user.accounts.length; i++) {
    if (!accounts[user.accounts[i].provider]) {
      accounts[user.accounts[i].provider] = [];
    }
    accounts[user.accounts[i].provider].push(user.accounts[i]);
  }
  return accounts;
}


App.controller('Account.ProviderController', ['$scope', ProviderCtrl]);

function ProviderCtrl($scope, $element, $attrs) {

  $scope.init = function(name) {
    $scope.$watch('account.config', function (value) {
      $scope.config = value;
    });

    $scope.save = function () {
      $scope.saving = true;
      $scope.saveAccount(name, $scope.account, function () {
        $scope.saving = false;
      });
    };
  }
}

App.controller('Account.JobController', ['$scope', '$element', '$attrs', JobController]);

function JobController($scope, $element, $attrs) {

  $scope.init = function(name) {
    $scope.$watch('user.jobplugins["' + name + '"]', function (value) {
      $scope.config = value;
    });
  }
}
},{"../app":1}],3:[function(require,module,exports){

var app = require('../app');

app.controller('AlertsCtrl', ['$scope', '$sce', AlertsCtrl]);

function AlertsCtrl($scope, $sce) {
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
}
},{"../app":1}],4:[function(require,module,exports){
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
      Strider.Cache.delete(projectSearchOptions, success);

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

},{"../app":1,"../lib/md5":29,"./config/_fix_template":5}],5:[function(require,module,exports){
module.exports = fixTemplate;

function fixTemplate(s) {
  return s.
    replace(/\[\[/g, '{{').
    replace(/\]\]/g, '}}');
}
},{}],6:[function(require,module,exports){
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

},{"../../app":1}],7:[function(require,module,exports){
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
},{"../../app":1}],8:[function(require,module,exports){
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
},{"../../app":1}],9:[function(require,module,exports){
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
},{"../../app":1}],10:[function(require,module,exports){
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
},{"../../app":1}],11:[function(require,module,exports){
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
},{"../../app":1}],12:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.RunnerController', ['$scope', RunnerController]);

function RunnerController($scope) {

  $scope.init = function(name) {
    $scope.saving = false;
    $scope.$watch('runnerConfigs[branch.name]["' + name + '"]', function (value) {
      // console.log('Runner config', name, value, $scope.runnerConfigs);
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
},{"../../app":1}],13:[function(require,module,exports){
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
},{"../../app":1}],14:[function(require,module,exports){
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
},{"../../app":1}],15:[function(require,module,exports){
var App = require('../app');

App.controller('DashboardCtrl', ['$scope', 'Strider', DashboardCtrl]);

function DashboardCtrl($scope, Strider) {

  $scope.phases = Strider.phases;


  // TODO: make this more declarative:
  Strider.Session.get(function(user) {
    if (user.user) $scope.currentUser = user.user;
  });

  Strider.get('/dashboard', function(resp) {
    $scope.jobs = resp.jobs;
    $scope.availableProviders = resp.availableProviders;

    Strider.connect($scope, $scope.jobs);
  });

  // $scope.jobs = Strider.jobs;
  // Strider.connect($scope);
  // Strider.jobs.dashboard();

  $scope.startDeploy = function deploy(job) {
    Strider.deploy(job.project);
  };

  $scope.startTest = function test(job) {
    Strider.test(job.project);
  };

}
},{"../app":1}],16:[function(require,module,exports){
var App = require('../app');

App.controller('ErrorCtrl', ['$scope', '$rootScope', '$location', '$sce', ErrorCtrl]);

function ErrorCtrl($scope, $rootScope, $location, $sce) {
  $scope.error = {};

  var last;

  $rootScope.$on('error', function(ev, err) {
    last = Date.now();
    $scope.error.message = $sce.trustAsHtml(err.message || err);
  });

  $rootScope.$on('$routeChangeStart', function() {
    if (last && Date.now() - last >  1000) {
      $scope.error.message = '';
    }
  });

  var flash = $location.search().flash;
  if (flash) {
    try {
      flash = JSON.parse(flash);
    } catch(err) {
      // do nothing
    }

    Object.keys(flash).forEach(function(k) {
      $rootScope.$emit('error', flash[k][0]);
    });
  }
}
},{"../app":1}],17:[function(require,module,exports){
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

},{"../app":1}],18:[function(require,module,exports){
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
},{"../app":1}],19:[function(require,module,exports){
var App = require('../app');

function validName(name) {
  return !!name.match(/[\w-]+\/[\w-]+/);
}

App.controller('ManualCtrl', ['$scope', 'Strider', ManualCtrl]);

function ManualCtrl($scope, Strider) {
  // var provider = $attrs.id.split('-')[1];
  $scope.config = {};

  $scope.init = function(provider, projects) {

    $scope.projects = projects;

    $scope.remove = function (project) {
      project.really_remove = 'removing';

      Strider.del('/' + project.name + '/', success);

      function success() {
        $scope.projects.splice($scope.projects.indexOf(project), 1);
        $scope.success('Project removed');
      }
    };

    $scope.create = function () {
      var name = $scope.display_name.toLowerCase();
      if (!validName(name)) return;

      var data = {
        display_name: $scope.display_name,
        display_url: $scope.display_url,
        public: $scope.public,
        provider: {
          id: provider,
          config: $scope.config
        }
      };

      Strider.put('/' + name + '/', data, success);

      function success() {
        $scope.projects.push({
          display_name: $scope.display_name,
          display_url: $scope.display_url,
          provider: {
            id: provider,
            config: $scope.config
          }
        });
        $scope.config = {};
        $scope.display_name = '';
        $scope.display_url = '';
        $scope.success('Created project!');
      }
    }
  }
}
},{"../app":1}],20:[function(require,module,exports){
var App = require('../app');

App.controller('ProjectsCtrl', ['$scope', '$sce', 'Strider', ProjectsCtrl]);

function ProjectsCtrl($scope, $sce, Strider) {

  Strider.get('/api/session', function(session) {
    if (session.user) {
      $scope.currentUser = session.user;
      $scope.accounts = session.user.accounts;
    }
  });

  Strider.get('/api/projects', function(resp) {

    $scope.unconfigured = resp.unconfigured;
    $scope.providers = resp.providers;
    $scope.manual = resp.manual;
    $scope.manualProjects = resp.manualProjects;
    $scope.repos = resp.repos;
    $scope.project_types = resp.project_types;

    $scope.projectsPage = true;


    /// Trust some content

    Object.keys($scope.manual).forEach(function(key) {
      var item = $scope.manual[key];
      if (item.provider && item.provider.html)
        item.provider.html = $sce.trustAsHtml(item.provider.html);
    });


    $scope.removeProject = function (account, repo, group) {
      repo.really_remove = 'removing';

      Strider.del('/' + repo.name + '/', success);

      function success() {
        repo.project = null;
        repo.really_remove = false;
        group.configured--;
      }
    };

    $scope.setupProject = function (account, repo, type, group) {
      var data = {
        display_name: repo.display_name || repo.name,
        display_url: repo.display_url,
        project_type: type,
        provider: {
          id: account.provider,
          account: account.id,
          repo_id: repo.id,
          config: repo.config
        }
      };

      Strider.put('/' + repo.name + '/', data, success);

      function success(data) {
        repo.project = data.project;
        repo.adding = 'done';
        group.configured++;
      }
    };

    $scope.startTest = function (repo) {

      Strider.post('/' + repo.project.name + '/start', success);

      function success() {
        repo.adding = false;
        $scope.success('Test started for ' + repo.project.name + '. <a href="/' + repo.project.name + '/" target="_blank">Click to watch it run</a>');
      }
    };
  });

}
},{"../app":1}],21:[function(require,module,exports){
var App = require('../app');

App.controller('ReloadCtrl', ['$location', function($location) {
  console.log('redirecting...');
  window.location = $location.path();
}]);
},{"../app":1}],22:[function(require,module,exports){
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
           if (ctrlName.indexOf('.') != ctrlName.length - 1)
            log('Could not find controller with name ' + ctrlName);
          return;
        }

        if (lastScope) lastScope.$destroy();

        elm.contents().data('$ngControllerController', ctrl);
        $compile(elm.contents())(newScope);

        var init = attrs.ngInit;
        if (init) newScope.$eval(init);

        lastScope = newScope;
      });
    }
  }
};

function log() {
  if (console && console.log) console.log.apply(console, arguments);
}
},{"../app":1}],23:[function(require,module,exports){

// instead of "about %d hours"
$.timeago.settings.strings.hour = 'an hour';
$.timeago.settings.strings.hours = '%d hours';
$.timeago.settings.localeTitle = true;

var time_units = [
  {
    ms: 60 * 60 * 1000,
    cls: 'hours',
    suffix: 'h'
  }, {
    ms: 60 * 1000,
    cls: 'minutes',
    suffix: 'm'
  }, {
    ms: 1000,
    cls: 'seconds',
    suffix: 's'
  }, {
    ms: 0,
    cls: 'miliseconds',
    suffix: 'ms'
  }
];


function textDuration(duration, el, whole) {
  if (!duration) return $(el).text('');
  var cls = '', text;
  for (var i=0; i<time_units.length; i++) {
    if (duration < time_units[i].ms) continue;
    cls = time_units[i].cls;
    text = duration + '';
    if (time_units[i].ms) {
      if (whole) text = parseInt(duration / time_units[i].ms)
      else text = parseInt(duration / time_units[i].ms * 10) / 10
    }
    text += time_units[i].suffix;
    break;
  }
  $(el).addClass(cls).text(text);
}

function since(stamp, el) {
  var then = new Date(stamp).getTime();
  function update() {
    var now = new Date().getTime();
    textDuration(now - then, el, true);
  }
  update();
  return setInterval(update, 500);
}

var App = require('../app');

// timeago directive
App.directive("time", function() {
  return {
    restrict: "E",
    link: function(scope, element, attrs) {
      if ('undefined' !== typeof attrs.since && !attrs.duration) {
        var ival = since(attrs.since, element);
        $(element).tooltip({title: 'Started ' + new Date(attrs.since).toLocaleString()});
        attrs.$observe('since', function () {
          $(element).tooltip({title: 'Started ' + new Date(attrs.since).toLocaleString()});
          clearInterval(ival);
          ival = since(attrs.since, element);
        })
        return scope.$on('$destroy', function () {
          clearInterval(ival);
        });
      }

      var date
      if ('undefined' !== typeof attrs.datetime) {
        date = new Date(attrs.datetime);
        $(element).tooltip({title: date.toLocaleString()});
      }

      if ('undefined' !== typeof attrs.duration) {
        attrs.$observe('duration', function () {
          textDuration(attrs.duration, element);
        })
        return textDuration(attrs.duration, element);
      }

      attrs.$observe('datetime', function () {
        date = new Date(attrs.datetime);
        $(element).tooltip({title: date.toLocaleString()});
        $(element).text($.timeago(date));
      })
      // TODO: use moment.js
      $(element).text($.timeago(date));
      setTimeout(function () {
        $(element).timeago();
      }, 0);
    }
  };
});
},{"../app":1}],24:[function(require,module,exports){
var App = require('../app');

App.directive("toggle", function() {
  return {
    restrict: "A",
    link: function(scope, element, attrs) {
      if (attrs.toggle !== 'tooltip') return;
      setTimeout(function() {
        $(element).tooltip();
      }, 0);
      attrs.$observe('title', function () {
        $(element).tooltip();
      });
      scope.$on('$destroy', function () {
        $('.tooltip').hide();
        $(element).tooltip('hide');
      });
    }
  };
});
},{"../app":1}],25:[function(require,module,exports){
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


},{"../app":1}],26:[function(require,module,exports){
var App = require('../app');

App.filter('percentage', function () {
  return function (input, prec) {
    if (!input && parseInt(input) !== 0) return '';
    var by = Math.pow(10, prec || 1)
    return parseInt(parseFloat(input) * by, 10)/by + '%'
  }
});

},{"../app":1}],27:[function(require,module,exports){
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
},{}],28:[function(require,module,exports){
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
      console.log('Invalid "plugin data" method received from plugin', data.plugin, data.method, data)
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
    // dashboard: dashboard.bind(this),
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

/// setJobs

JS.setJobs = function setJobs(jobs) {
  this.jobs.yours = jobs.yours;
  this.jobs.public = jobs.public;
};


/// update - handle update event

JS.update = function update(event, args, access, dontchange) {
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

  if (found > -1) {
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
},{"xtend":32}],29:[function(require,module,exports){
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
},{}],30:[function(require,module,exports){
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

S.connect = function(scope, jobs) {
  if (! socket) {
    socket = io.connect(this.url);

    /// connects job store to new socket
    if (jobs) jobStore.setJobs(jobs);

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
},{"./job_store":28}],31:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],32:[function(require,module,exports){
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

},{"./has-keys":31,"object-keys":34}],33:[function(require,module,exports){
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


},{}],34:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":36}],35:[function(require,module,exports){
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


},{}],36:[function(require,module,exports){
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


},{"./foreach":33,"./isArguments":35}]},{},[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,25,26,22,23,24])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2FwcC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvYWNjb3VudC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvYWxlcnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2NvbmZpZy9fZml4X3RlbXBsYXRlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvY29sbGFib3JhdG9ycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL2Vudmlyb25tZW50LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvZ2l0aHViLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvaGVyb2t1LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvam9iLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvbm9kZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3J1bm5lci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3NhdWNlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvd2ViaG9va3MuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2Rhc2hib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvZXJyb3IuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2pvYi5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvbG9naW4uanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL21hbnVhbC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvcHJvamVjdHMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL3JlbG9hZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvZGlyZWN0aXZlcy9keW5hbWljX2NvbnRyb2xsZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2RpcmVjdGl2ZXMvdGltZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvZGlyZWN0aXZlcy90b2dnbGUuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2ZpbHRlcnMvYW5zaS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvZmlsdGVycy9wZXJjZW50YWdlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9odHRwX2ludGVyY2VwdG9yLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9qb2Jfc3RvcmUuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2xpYi9tZDUuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL3N0cmlkZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL2hhcy1rZXlzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2ZvcmVhY2guanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2lzQXJndW1lbnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvc2hpbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgU3RyaWRlciA9IHJlcXVpcmUoJy4vc3RyaWRlcicpO1xuXG52YXIgQXBwID1cbmV4cG9ydHMgPVxubW9kdWxlLmV4cG9ydHMgPVxuYW5ndWxhci5tb2R1bGUoJ0Jyb3dzZXJTd2FybUFwcCcsIFsnbmdSb3V0ZScsICduZ1Jlc291cmNlJywgJ25nU2FuaXRpemUnXSk7XG5cbi8vLyBBcHAgQ29uZmlndXJhdGlvblxuXG5BcHAuXG4gIGNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgJyRsb2NhdGlvblByb3ZpZGVyJywgJyRodHRwUHJvdmlkZXInLCBjb25maWd1cmVBcHBdKS5cbiAgZmFjdG9yeSgnU3RyaWRlcicsIFsnJHJlc291cmNlJywgJyRodHRwJywgU3RyaWRlcl0pO1xuXG5mdW5jdGlvbiBjb25maWd1cmVBcHAoJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyKSB7XG5cbiAgLy8vIEhUVFBcblxuICAvLy8gQWx3YXlzIGRvIEhUVFAgcmVxdWVzdHMgd2l0aCBjcmVkZW50aWFscyxcbiAgLy8vIGVmZmVjdGl2ZWx5IHNlbmRpbmcgb3V0IHRoZSBzZXNzaW9uIGNvb2tpZVxuICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgdmFyIGludGVyY2VwdG9yID0gcmVxdWlyZSgnLi9odHRwX2ludGVyY2VwdG9yJyk7XG5cbiAgJGh0dHBQcm92aWRlci5yZXNwb25zZUludGVyY2VwdG9ycy5wdXNoKGludGVyY2VwdG9yKTtcblxuXG4gIC8vLyBFbmFibGUgaGFzaGJhbmctbGVzcyByb3V0ZXNcblxuICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG5cbiAgLy8vIFJvdXRlc1xuXG4gIHZhciByZWxvYWQgPSB7XG4gICAgY29udHJvbGxlcjogJ1JlbG9hZEN0cmwnLFxuICAgIHRlbXBsYXRlOiAnPGRpdj5QbGVhc2Ugd2FpdCwgcmVkaXJlY3Rpbmc8L2Rpdj4nXG4gIH07XG5cbiAgJHJvdXRlUHJvdmlkZXIuXG4gICAgd2hlbignLycsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2luZGV4Lmh0bWwnXG4gICAgfSkuXG4gICAgd2hlbignL2Rhc2hib2FyZCcsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2Rhc2hib2FyZC9pbmRleC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdEYXNoYm9hcmRDdHJsJyxcbiAgICAgIHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuICAgIH0pLlxuICAgIHdoZW4oJy9wcm9qZWN0cycsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL3Byb2plY3RzL2luZGV4Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ1Byb2plY3RzQ3RybCcsXG4gICAgICByZWxvYWRPblNlYXJjaDogZmFsc2VcbiAgICB9KS5cbiAgICB3aGVuKCcvbG9naW4nLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9wYXJ0aWFscy9sb2dpbi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSkuXG4gICAgd2hlbignL2FjY291bnQnLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9wYXJ0aWFscy9hY2NvdW50Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0FjY291bnRDdHJsJyxcbiAgICAgIHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuICAgIH0pLlxuXG4gICAgd2hlbignL2F1dGgvZ2l0aHViJywgcmVsb2FkKS5cblxuICAgIHdoZW4oJy86b3duZXIvOnJlcG8vY29uZmlnJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvY29uZmlnL2luZGV4Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0NvbmZpZ0N0cmwnLFxuICAgICAgcmVsb2FkT25TZWFyY2g6IGZhbHNlXG4gICAgfSkuXG4gICAgd2hlbignLzpvd25lci86cmVwbycsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2pvYi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdKb2JDdHJsJ1xuICAgIH0pLlxuICAgIHdoZW4oJy86b3duZXIvOnJlcG8vam9iLzpqb2JpZCcsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2pvYi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdKb2JDdHJsJ1xuICAgIH0pXG4gIDtcblxufVxuXG4iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdBY2NvdW50Q3RybCcsIFsnJHNjb3BlJywgJyRzY2UnLCAnU3RyaWRlcicsIEFjY291bnRDdHJsXSk7XG5cbmZ1bmN0aW9uIEFjY291bnRDdHJsKCRzY29wZSwgJHNjZSwgU3RyaWRlcikge1xuXG4gIFN0cmlkZXIuZ2V0KCcvYXBpL2FjY291bnQnLCBmdW5jdGlvbihyZXBseSkge1xuICAgICRzY29wZS51c2VyID0gcmVwbHkudXNlcjtcbiAgICAkc2NvcGUucHJvdmlkZXJzID0gcmVwbHkucHJvdmlkZXJzO1xuICAgICRzY29wZS51c2VyQ29uZmlncyA9IHJlcGx5LnVzZXJDb25maWdzO1xuICAgICRzY29wZS5hY2NvdW50cyA9IHNldHVwQWNjb3VudHMocmVwbHkudXNlcik7XG5cbiAgICAvLy8gVHJ1c3Qgc29tZSBIVE1MXG5cbiAgICBPYmplY3Qua2V5cygkc2NvcGUucHJvdmlkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIHByb3ZpZGVyID0gJHNjb3BlLnByb3ZpZGVyc1trZXldO1xuICAgICAgaWYgKHByb3ZpZGVyLmh0bWwpIHByb3ZpZGVyLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKHByb3ZpZGVyLmh0bWwpO1xuICAgIH0pO1xuXG4gICAgT2JqZWN0LmtleXMoJHNjb3BlLnVzZXJDb25maWdzLmpvYikuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBqb2IgPSAkc2NvcGUudXNlckNvbmZpZ3Muam9iW2tleV07XG4gICAgICBpZiAoam9iLmh0bWwpIGpvYi5odG1sID0gJHNjZS50cnVzdEFzSHRtbChqb2IuaHRtbCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZGVsZXRlQWNjb3VudCA9IGZ1bmN0aW9uIChhY2NvdW50KSB7XG4gICAgICBpZiAoYWNjb3VudC51bnNhdmVkKSB7XG4gICAgICAgIHZhciBpZHggPSAkc2NvcGUuYWNjb3VudHNbYWNjb3VudC5wcm92aWRlcl0uaW5kZXhPZihhY2NvdW50KTtcbiAgICAgICAgJHNjb3BlLmFjY291bnRzW2FjY291bnQucHJvdmlkZXJdLnNwbGljZShpZHgsIDEpO1xuICAgICAgICBpZHggPSAkc2NvcGUudXNlci5hY2NvdW50cy5pbmRleE9mKGFjY291bnQpO1xuICAgICAgICAkc2NvcGUudXNlci5hY2NvdW50cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0FjY291bnQgcmVtb3ZlZCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIFN0cmlkZXIuZGVsKCcvYXBpL2FjY291bnQvJyArIGFjY291bnQucHJvdmlkZXIgKyAnLycgKyBhY2NvdW50LmlkLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgdmFyIGlkeCA9ICRzY29wZS5hY2NvdW50c1thY2NvdW50LnByb3ZpZGVyXS5pbmRleE9mKGFjY291bnQpO1xuICAgICAgICAkc2NvcGUuYWNjb3VudHNbYWNjb3VudC5wcm92aWRlcl0uc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIGlkeCA9ICRzY29wZS51c2VyLmFjY291bnRzLmluZGV4T2YoYWNjb3VudCk7XG4gICAgICAgICRzY29wZS51c2VyLmFjY291bnRzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnQWNjb3VudCByZW1vdmVkJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5hZGRBY2NvdW50ID0gZnVuY3Rpb24gKHByb3ZpZGVyKSB7XG4gICAgICB2YXIgaWQgPSAwXG4gICAgICAgICwgYWlkO1xuICAgICAgaWYgKCEkc2NvcGUuYWNjb3VudHNbcHJvdmlkZXJdKSB7XG4gICAgICAgICRzY29wZS5hY2NvdW50c1twcm92aWRlcl0gPSBbXTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUuYWNjb3VudHNbcHJvdmlkZXJdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFpZCA9IHBhcnNlSW50KCRzY29wZS5hY2NvdW50c1twcm92aWRlcl1baV0uaWQsIDEwKTtcbiAgICAgICAgaWYgKGFpZCA+PSBpZCkge1xuICAgICAgICAgIGlkID0gYWlkICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGFjY3QgPSB7XG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyLFxuICAgICAgICB0aXRsZTogcHJvdmlkZXIgKyAnICcgKyBpZCxcbiAgICAgICAgbGFzdF91cGRhdGVkOiBuZXcgRGF0ZSgpLFxuICAgICAgICBjb25maWc6IHt9LFxuICAgICAgICBjYWNoZTogW10sXG4gICAgICAgIHVuc2F2ZWQ6IHRydWVcbiAgICAgIH07XG4gICAgICAkc2NvcGUuYWNjb3VudHNbcHJvdmlkZXJdLnB1c2goYWNjdCk7XG4gICAgICAkc2NvcGUudXNlci5hY2NvdW50cy5wdXNoKGFjY3QpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZUFjY291bnQgPSBmdW5jdGlvbiAocHJvdmlkZXIsIGFjY291bnQsIG5leHQpIHtcblxuICAgICAgU3RyaWRlci5wdXQoXG4gICAgICAgICcvYXBpL2FjY291bnQvJyArXG4gICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHByb3ZpZGVyKSArXG4gICAgICAgICAgJy8nICsgZW5jb2RlVVJJQ29tcG9uZW50KGFjY291bnQuaWQpLFxuICAgICAgICBhY2NvdW50LFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgZGVsZXRlIGFjY291bnQudW5zYXZlZDtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnQWNjb3VudCBzYXZlZCcpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2hhbmdlUGFzc3dvcmQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIFN0cmlkZXIucG9zdCgnL2FwaS9hY2NvdW50L3Bhc3N3b3JkJywge3Bhc3N3b3JkOiAkc2NvcGUucGFzc3dvcmR9LCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnBhc3N3b3JkID0gJyc7XG4gICAgICAgICRzY29wZS5jb25maXJtX3Bhc3N3b3JkID0gJyc7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdQYXNzd29yZCBjaGFuZ2VkJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jaGFuZ2VFbWFpbCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgU3RyaWRlci5wb3N0KCcvYXBpL2FjY291bnQvZW1haWwnLCB7ZW1haWw6JHNjb3BlLnVzZXIuZW1haWx9LCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0VtYWlsIHN1Y2Nlc3NmdWxseSBjaGFuZ2VkJyk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gc2V0dXBBY2NvdW50cyh1c2VyKSB7XG4gIHZhciBhY2NvdW50cyA9IHt9O1xuICBpZiAoIXVzZXIuYWNjb3VudHMgfHwgIXVzZXIuYWNjb3VudHMubGVuZ3RoKSByZXR1cm4gYWNjb3VudHM7XG4gIGZvciAodmFyIGk9MDsgaTx1c2VyLmFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCFhY2NvdW50c1t1c2VyLmFjY291bnRzW2ldLnByb3ZpZGVyXSkge1xuICAgICAgYWNjb3VudHNbdXNlci5hY2NvdW50c1tpXS5wcm92aWRlcl0gPSBbXTtcbiAgICB9XG4gICAgYWNjb3VudHNbdXNlci5hY2NvdW50c1tpXS5wcm92aWRlcl0ucHVzaCh1c2VyLmFjY291bnRzW2ldKTtcbiAgfVxuICByZXR1cm4gYWNjb3VudHM7XG59XG5cblxuQXBwLmNvbnRyb2xsZXIoJ0FjY291bnQuUHJvdmlkZXJDb250cm9sbGVyJywgWyckc2NvcGUnLCBQcm92aWRlckN0cmxdKTtcblxuZnVuY3Rpb24gUHJvdmlkZXJDdHJsKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xuXG4gICRzY29wZS5pbml0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgICRzY29wZS4kd2F0Y2goJ2FjY291bnQuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICAgJHNjb3BlLnNhdmVBY2NvdW50KG5hbWUsICRzY29wZS5hY2NvdW50LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbn1cblxuQXBwLmNvbnRyb2xsZXIoJ0FjY291bnQuSm9iQ29udHJvbGxlcicsIFsnJHNjb3BlJywgJyRlbGVtZW50JywgJyRhdHRycycsIEpvYkNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gSm9iQ29udHJvbGxlcigkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpIHtcblxuICAkc2NvcGUuaW5pdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAkc2NvcGUuJHdhdGNoKCd1c2VyLmpvYnBsdWdpbnNbXCInICsgbmFtZSArICdcIl0nLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgfVxufSIsIlxudmFyIGFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5hcHAuY29udHJvbGxlcignQWxlcnRzQ3RybCcsIFsnJHNjb3BlJywgJyRzY2UnLCBBbGVydHNDdHJsXSk7XG5cbmZ1bmN0aW9uIEFsZXJ0c0N0cmwoJHNjb3BlLCAkc2NlKSB7XG4gICRzY29wZS5tZXNzYWdlID0gbnVsbDtcblxuICAkc2NvcGUuZXJyb3IgPSBmdW5jdGlvbiAodGV4dCwgZGlnZXN0KSB7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSB7XG4gICAgICB0ZXh0OiAkc2NlLnRydXN0QXNIdG1sKHRleHQpLFxuICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIHNob3dpbmc6IHRydWVcbiAgICB9O1xuICAgIGlmIChkaWdlc3QpICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gIH07XG5cbiAgJHNjb3BlLmluZm8gPSBmdW5jdGlvbiAodGV4dCwgZGlnZXN0KSB7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSB7XG4gICAgICB0ZXh0OiAkc2NlLnRydXN0QXNIdG1sKHRleHQpLFxuICAgICAgdHlwZTogJ2luZm8nLFxuICAgICAgc2hvd2luZzogdHJ1ZVxuICAgIH07XG4gICAgaWYgKGRpZ2VzdCkgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgfTtcbiAgdmFyIHdhaXRUaW1lID0gbnVsbDtcblxuICAkc2NvcGUuc3VjY2VzcyA9IGZ1bmN0aW9uICh0ZXh0LCBkaWdlc3QsIHN0aWNreSkge1xuICAgIGlmICh3YWl0VGltZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KHdhaXRUaW1lKTtcbiAgICAgIHdhaXRUaW1lID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKGNsZWFyVGltZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KGNsZWFyVGltZSk7XG4gICAgICBjbGVhclRpbWUgPSBudWxsO1xuICAgIH1cbiAgICAkc2NvcGUubWVzc2FnZSA9IHtcbiAgICAgIHRleHQ6ICRzY2UudHJ1c3RBc0h0bWwoJzxzdHJvbmc+RG9uZS48L3N0cm9uZz4gJyArIHRleHQpLFxuICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgc2hvd2luZzogdHJ1ZVxuICAgIH07XG4gICAgaWYgKCFzdGlja3kpIHtcbiAgICAgIHdhaXRUaW1lID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5jbGVhck1lc3NhZ2UoKTtcbiAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgIH0sIDUwMDApO1xuICAgIH1cbiAgICBpZiAoZGlnZXN0KSAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICB9O1xuICB2YXIgY2xlYXJUaW1lID0gbnVsbDtcblxuICAkc2NvcGUuY2xlYXJNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjbGVhclRpbWUpIHtcbiAgICAgIGNsZWFyVGltZW91dChjbGVhclRpbWUpO1xuICAgIH1cbiAgICBpZiAoJHNjb3BlLm1lc3NhZ2UpIHtcbiAgICAgICRzY29wZS5tZXNzYWdlLnNob3dpbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgY2xlYXJUaW1lID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBjbGVhclRpbWUgPSBudWxsO1xuICAgICAgJHNjb3BlLm1lc3NhZ2UgPSBudWxsO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9LCAxMDAwKTtcbiAgfTtcbn0iLCJ2YXIgbWQ1ICAgICAgICAgPSByZXF1aXJlKCcuLi9saWIvbWQ1Jyk7XG52YXIgQXBwICAgICAgICAgPSByZXF1aXJlKCcuLi9hcHAnKTtcbnZhciBmaXhUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vY29uZmlnL19maXhfdGVtcGxhdGUnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZ0N0cmwnLCBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnJHNjZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIENvbmZpZ0N0cmxdKTtcblxuZnVuY3Rpb24gQ29uZmlnQ3RybCgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJHNjZSwgJGxvY2F0aW9uLCBTdHJpZGVyKSB7XG5cbiAgdmFyIHByb2plY3RTZWFyY2hPcHRpb25zID0ge1xuICAgIG93bmVyOiAkcm91dGVQYXJhbXMub3duZXIsXG4gICAgcmVwbzogJHJvdXRlUGFyYW1zLnJlcG9cbiAgfTtcblxuICBTdHJpZGVyLkNvbmZpZy5nZXQocHJvamVjdFNlYXJjaE9wdGlvbnMsIGZ1bmN0aW9uKGNvbmYpIHtcblxuICAgIC8vLyBGaXggYW5kIHRydXN0IHJlbW90ZSBIVE1MXG5cbiAgICBPYmplY3Qua2V5cyhjb25mLnBsdWdpbnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBjb25mLnBsdWdpbnNba2V5XS5odG1sID0gJHNjZS50cnVzdEFzSHRtbChcbiAgICAgICAgZml4VGVtcGxhdGUoY29uZi5wbHVnaW5zW2tleV0uaHRtbCkpO1xuICAgIH0pO1xuXG4gICAgT2JqZWN0LmtleXMoY29uZi5ydW5uZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgY29uZi5ydW5uZXJzW2tleV0uaHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwoXG4gICAgICAgIGZpeFRlbXBsYXRlKGNvbmYucnVubmVyc1trZXldLmh0bWwpKTtcbiAgICB9KTtcblxuICAgIGlmIChjb25mLnByb3ZpZGVyKSB7XG4gICAgICBjb25mLnByb3ZpZGVyLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKFxuICAgICAgICBmaXhUZW1wbGF0ZShjb25mLnByb3ZpZGVyLmh0bWwpKTtcbiAgICB9XG5cbiAgICAvLy8gR2V0IGFsbCB0aGUgY29uZiBpbnRvIHRoZSBzY29wZSBmb3IgcmVuZGVyaW5nXG5cbiAgICAkc2NvcGUucHJvamVjdCA9IGNvbmYucHJvamVjdDtcbiAgICAkc2NvcGUucHJvdmlkZXIgPSBjb25mLnByb3ZpZGVyO1xuICAgICRzY29wZS5wbHVnaW5zID0gY29uZi5wbHVnaW5zO1xuICAgICRzY29wZS5ydW5uZXJzID0gY29uZi5ydW5uZXJzO1xuICAgICRzY29wZS5icmFuY2hlcyA9IGNvbmYuYnJhbmNoZXMgfHwgW107XG4gICAgJHNjb3BlLnN0YXR1c0Jsb2NrcyA9IGNvbmYuc3RhdHVzQmxvY2tzO1xuICAgICRzY29wZS5jb2xsYWJvcmF0b3JzID0gY29uZi5jb2xsYWJvcmF0b3JzO1xuICAgICRzY29wZS51c2VySXNDcmVhdG9yID0gY29uZi51c2VySXNDcmVhdG9yO1xuICAgICRzY29wZS51c2VyQ29uZmlncyA9IGNvbmYudXNlckNvbmZpZ3M7XG4gICAgJHNjb3BlLmNvbmZpZ3VyZWQgPSB7fTtcblxuICAgICRzY29wZS5icmFuY2ggPSAkc2NvcGUucHJvamVjdC5icmFuY2hlc1swXTtcbiAgICAkc2NvcGUuZGlzYWJsZWRfcGx1Z2lucyA9IHt9O1xuICAgICRzY29wZS5jb25maWdzID0ge307XG4gICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3MgPSB7fTtcblxuICAgICRzY29wZS5hcGlfcm9vdCA9ICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2FwaS8nO1xuXG4gICAgJHNjb3BlLnJlZnJlc2hCcmFuY2hlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFRPRE8gaW1wbGVtZW50XG4gICAgICB0aHJvdyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRFbmFibGVkID0gZnVuY3Rpb24gKHBsdWdpbiwgZW5hYmxlZCkge1xuICAgICAgJHNjb3BlLmNvbmZpZ3NbJHNjb3BlLmJyYW5jaC5uYW1lXVtwbHVnaW5dLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgc2F2ZVBsdWdpbk9yZGVyKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlUGx1Z2luT3JkZXIgPSBzYXZlUGx1Z2luT3JkZXI7XG5cbiAgICAkc2NvcGUuc3dpdGNoVG9NYXN0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLnByb2plY3QuYnJhbmNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldLm5hbWUgPT09ICdtYXN0ZXInKSB7XG4gICAgICAgICAgJHNjb3BlLmJyYW5jaCA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5jbGVhcmluZ0NhY2hlID0gdHJ1ZTtcbiAgICAgIFN0cmlkZXIuQ2FjaGUuZGVsZXRlKHByb2plY3RTZWFyY2hPcHRpb25zLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLmNsZWFyaW5nQ2FjaGUgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0NsZWFyZWQgdGhlIGNhY2hlJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHNjb3BlLnRvZ2dsZUJyYW5jaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICgkc2NvcGUuYnJhbmNoLm1pcnJvcl9tYXN0ZXIpIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaC5taXJyb3JfbWFzdGVyID0gZmFsc2U7XG4gICAgICAgIHZhciBuYW1lID0gJHNjb3BlLmJyYW5jaC5uYW1lXG4gICAgICAgICAgLCBtYXN0ZXI7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUucHJvamVjdC5icmFuY2hlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmICgkc2NvcGUucHJvamVjdC5icmFuY2hlc1tpXS5uYW1lID09PSAnbWFzdGVyJykge1xuICAgICAgICAgICAgbWFzdGVyID0gJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmJyYW5jaCA9ICQuZXh0ZW5kKHRydWUsICRzY29wZS5icmFuY2gsIG1hc3Rlcik7XG4gICAgICAgICRzY29wZS5icmFuY2gubmFtZSA9IG5hbWU7XG4gICAgICAgIGluaXRCcmFuY2goJHNjb3BlLmJyYW5jaCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuYnJhbmNoLm1pcnJvcl9tYXN0ZXIgPSB0cnVlO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNhdmVHZW5lcmFsQnJhbmNoKHRydWUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdicmFuY2gubWlycm9yX21hc3RlcicsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0YWIgPSB2YWx1ZSAmJiB2YWx1ZS5uYW1lID09PSAnbWFzdGVyJyA/ICdwcm9qZWN0JyA6ICdiYXNpYyc7XG4gICAgICAgICQoJyMnICsgdGFiICsgJy10YWItaGFuZGxlJykudGFiKCdzaG93Jyk7XG4gICAgICAgICQoJy50YWItcGFuZS5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyN0YWItJyArIHRhYikuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgJHNjb3BlLiR3YXRjaCgnYnJhbmNoJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRhYiA9IHZhbHVlICYmIHZhbHVlLm5hbWUgPT09ICdtYXN0ZXInID8gJ3Byb2plY3QnIDogJ2Jhc2ljJztcbiAgICAgICAgJCgnIycgKyB0YWIgKyAnLXRhYi1oYW5kbGUnKS50YWIoJ3Nob3cnKTtcbiAgICAgICAgJCgnLnRhYi1wYW5lLmFjdGl2ZScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3RhYi0nICsgdGFiKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICB9LCAwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRSdW5uZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgJHNjb3BlLmJyYW5jaC5ydW5uZXIgPSB7XG4gICAgICAgIGlkOiBuYW1lLFxuICAgICAgICBjb25maWc6ICRzY29wZS5ydW5uZXJDb25maWdzW25hbWVdXG4gICAgICB9O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVDb25maWd1cmVkKCkge1xuICAgICAgdmFyIHBsdWdpbnMgPSAkc2NvcGUuYnJhbmNoLnBsdWdpbnM7XG4gICAgICAkc2NvcGUuY29uZmlndXJlZFskc2NvcGUuYnJhbmNoLm5hbWVdID0ge307XG4gICAgICBmb3IgKHZhciBpPTA7IGk8cGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAkc2NvcGUuY29uZmlndXJlZFskc2NvcGUuYnJhbmNoLm5hbWVdW3BsdWdpbnNbaV0uaWRdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHNhdmVQbHVnaW5PcmRlcigpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNhdmVQbHVnaW5PcmRlcigpIHtcbiAgICAgIHZhciBwbHVnaW5zID0gJHNjb3BlLmJyYW5jaC5wbHVnaW5zXG4gICAgICAgICwgYnJhbmNoID0gJHNjb3BlLmJyYW5jaFxuICAgICAgICAsIGRhdGEgPSBbXTtcblxuICAgICAgZm9yICh2YXIgaT0wOyBpPHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZGF0YS5wdXNoKHtcbiAgICAgICAgICBpZDogcGx1Z2luc1tpXS5pZCxcbiAgICAgICAgICBlbmFibGVkOiBwbHVnaW5zW2ldLmVuYWJsZWQsXG4gICAgICAgICAgc2hvd1N0YXR1czogcGx1Z2luc1tpXS5zaG93U3RhdHVzXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBTdHJpZGVyLkNvbmZpZy5CcmFuY2guc2F2ZShcbiAgICAgICAge1xuICAgICAgICAgIG93bmVyOiBwcm9qZWN0U2VhcmNoT3B0aW9ucy5vd25lcixcbiAgICAgICAgICByZXBvOiAgcHJvamVjdFNlYXJjaE9wdGlvbnMucmVwbyxcbiAgICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBwbHVnaW5fb3JkZXI6IGRhdGF9LFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ1BsdWdpbiBvcmRlciBvbiBicmFuY2ggJyArIGJyYW5jaC5uYW1lICsgJyBzYXZlZC4nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBvcHRpb25zIGZvciB0aGUgaW5Vc2UgcGx1Z2luIHNvcnRhYmxlXG4gICAgJHNjb3BlLmluVXNlT3B0aW9ucyA9IHtcbiAgICAgIGNvbm5lY3RXaXRoOiAnLmRpc2FibGVkLXBsdWdpbnMtbGlzdCcsXG4gICAgICBkaXN0YW5jZTogNSxcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgIHVwZGF0ZUNvbmZpZ3VyZWQoKTtcbiAgICAgIH0sXG4gICAgICByZWNlaXZlOiBmdW5jdGlvbiAoZSwgdWkpIHtcbiAgICAgICAgdXBkYXRlQ29uZmlndXJlZCgpO1xuICAgICAgICB2YXIgcGx1Z2lucyA9ICRzY29wZS5icmFuY2gucGx1Z2lucztcbiAgICAgICAgcGx1Z2luc1t1aS5pdGVtLmluZGV4KCldLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBpbml0QnJhbmNoKGJyYW5jaCkge1xuICAgICAgdmFyIHBsdWdpbnM7XG5cbiAgICAgICRzY29wZS5jb25maWd1cmVkW2JyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdID0ge307XG4gICAgICAkc2NvcGUucnVubmVyQ29uZmlnc1ticmFuY2gubmFtZV0gPSB7fTtcbiAgICAgICRzY29wZS5kaXNhYmxlZF9wbHVnaW5zW2JyYW5jaC5uYW1lXSA9IFtdO1xuXG4gICAgICBpZiAoIWJyYW5jaC5taXJyb3JfbWFzdGVyKSB7XG4gICAgICAgIHBsdWdpbnMgPSBicmFuY2gucGx1Z2lucztcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAkc2NvcGUuY29uZmlndXJlZFticmFuY2gubmFtZV1bcGx1Z2luc1tpXS5pZF0gPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXVtwbHVnaW5zW2ldLmlkXSA9IHBsdWdpbnNbaV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgcGx1Z2luIGluICRzY29wZS5wbHVnaW5zKSB7XG4gICAgICAgIGlmICgkc2NvcGUuY29uZmlndXJlZFticmFuY2gubmFtZV1bcGx1Z2luXSkgY29udGludWU7XG4gICAgICAgICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXVtwbHVnaW5dID0ge1xuICAgICAgICAgIGlkOiBwbHVnaW4sXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBjb25maWc6IHt9XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5kaXNhYmxlZF9wbHVnaW5zW2JyYW5jaC5uYW1lXS5wdXNoKCRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXVtwbHVnaW5dKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFicmFuY2gubWlycm9yX21hc3Rlcikge1xuICAgICAgICAkc2NvcGUucnVubmVyQ29uZmlnc1ticmFuY2gubmFtZV1bYnJhbmNoLnJ1bm5lci5pZF0gPSBicmFuY2gucnVubmVyLmNvbmZpZztcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIHJ1bm5lciBpbiAkc2NvcGUucnVubmVycykge1xuICAgICAgICBpZiAoIWJyYW5jaC5taXJyb3JfbWFzdGVyICYmIHJ1bm5lciA9PT0gYnJhbmNoLnJ1bm5lci5pZCkgY29udGludWU7XG4gICAgICAgICRzY29wZS5ydW5uZXJDb25maWdzW2JyYW5jaC5uYW1lXVtydW5uZXJdID0ge307XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXRQbHVnaW5zKCkge1xuICAgICAgdmFyIGJyYW5jaGVzID0gJHNjb3BlLnByb2plY3QuYnJhbmNoZXNcbiAgICAgIGZvciAodmFyIGk9MDsgaTxicmFuY2hlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpbml0QnJhbmNoKGJyYW5jaGVzW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkc2NvcGUuc2F2ZUdlbmVyYWxCcmFuY2ggPSBmdW5jdGlvbiAocGx1Z2lucykge1xuICAgICAgdmFyIGJyYW5jaCA9ICRzY29wZS5icmFuY2hcbiAgICAgICAgLCBkYXRhID0ge1xuICAgICAgICAgICAgYWN0aXZlOiBicmFuY2guYWN0aXZlLFxuICAgICAgICAgICAgcHJpdmtleTogYnJhbmNoLnByaXZrZXksXG4gICAgICAgICAgICBwdWJrZXk6IGJyYW5jaC5wdWJrZXksXG4gICAgICAgICAgICBlbnZLZXlzOiBicmFuY2guZW52S2V5cyxcbiAgICAgICAgICAgIG1pcnJvcl9tYXN0ZXI6IGJyYW5jaC5taXJyb3JfbWFzdGVyLFxuICAgICAgICAgICAgZGVwbG95X29uX2dyZWVuOiBicmFuY2guZGVwbG95X29uX2dyZWVuLFxuICAgICAgICAgICAgcnVubmVyOiBicmFuY2gucnVubmVyXG4gICAgICAgICAgfTtcbiAgICAgIGlmIChwbHVnaW5zKSB7XG4gICAgICAgIGRhdGEucGx1Z2lucyA9IGJyYW5jaC5wbHVnaW5zO1xuICAgICAgfVxuICAgICAgU3RyaWRlci5Db25maWcuQnJhbmNoLnNhdmUoXG4gICAgICAgIHtcbiAgICAgICAgICBvd25lcjogcHJvamVjdFNlYXJjaE9wdGlvbnMub3duZXIsXG4gICAgICAgICAgcmVwbzogIHByb2plY3RTZWFyY2hPcHRpb25zLnJlcG8sXG4gICAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSB9LFxuICAgICAgICBkYXRhLFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0dlbmVyYWwgY29uZmlnIGZvciBicmFuY2ggJyArIGJyYW5jaC5uYW1lICsgJyBzYXZlZC4nKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmdlbmVyYXRlS2V5UGFpciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGJvb3Rib3guY29uZmlybSgnUmVhbGx5IGdlbmVyYXRlIGEgbmV3IGtleXBhaXI/IFRoaXMgY291bGQgYnJlYWsgdGhpbmdzIGlmIHlvdSBoYXZlIHBsdWdpbnMgdGhhdCB1c2UgdGhlIGN1cnJlbnQgb25lcy4nLCBmdW5jdGlvbiAocmVhbGx5KSB7XG4gICAgICAgIGlmICghcmVhbGx5KSByZXR1cm47XG4gICAgICAgIFN0cmlkZXIuS2V5Z2VuLnNhdmUoXG4gICAgICAgICAge1xuICAgICAgICAgICAgb3duZXI6IHByb2plY3RTZWFyY2hPcHRpb25zLm93bmVyLFxuICAgICAgICAgICAgcmVwbzogIHByb2plY3RTZWFyY2hPcHRpb25zLnJlcG8sXG4gICAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gubmFtZSB9LFxuICAgICAgICAgIHt9LFxuICAgICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgICRzY29wZS5icmFuY2gucHJpdmtleSA9IGRhdGEucHJpdmtleTtcbiAgICAgICAgICAkc2NvcGUuYnJhbmNoLnB1YmtleSA9IGRhdGEucHVia2V5O1xuICAgICAgICAgICRzY29wZS5zdWNjZXNzKCdHZW5lcmF0ZWQgbmV3IHNzaCBrZXlwYWlyJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpbml0UGx1Z2lucygpO1xuXG4gICAgJHNjb3BlLmdyYXZhdGFyID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICBpZiAoIWVtYWlsKSByZXR1cm4gJyc7XG4gICAgICB2YXIgaGFzaCA9IG1kNShlbWFpbC50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIHJldHVybiAnaHR0cHM6Ly9zZWN1cmUuZ3JhdmF0YXIuY29tL2F2YXRhci8nICsgaGFzaCArICc/ZD1pZGVudGljb24nO1xuICAgIH1cblxuICAgIC8vIHRvZG86IHBhc3MgaW4gbmFtZT9cbiAgICAkc2NvcGUucnVubmVyQ29uZmlnID0gZnVuY3Rpb24gKGJyYW5jaCwgZGF0YSwgbmV4dCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgbmV4dCA9IGRhdGE7XG4gICAgICAgIGRhdGEgPSBicmFuY2g7XG4gICAgICAgIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgICB9XG4gICAgICB2YXIgbmFtZSA9ICRzY29wZS5icmFuY2gucnVubmVyLmlkO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUucnVubmVyQ29uZmlnc1tuYW1lXTtcbiAgICAgIH1cblxuICAgICAgU3RyaWRlci5Db25maWcuQnJhbmNoLlJ1bm5lci5zYXZlKFxuICAgICAgICB7XG4gICAgICAgICAgb3duZXI6IHByb2plY3RTZWFyY2hPcHRpb25zLm93bmVyLFxuICAgICAgICAgIHJlcG86ICBwcm9qZWN0U2VhcmNoT3B0aW9ucy5yZXBvLFxuICAgICAgICAgIGJyYW5jaDogJ21hc3RlcicgfSxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcyhcIlJ1bm5lciBjb25maWcgc2F2ZWQuXCIpO1xuICAgICAgICAkc2NvcGUucnVubmVyQ29uZmlnc1tuYW1lXSA9IGRhdGEuY29uZmlnO1xuICAgICAgICBuZXh0ICYmIG5leHQobnVsbCwgZGF0YS5jb25maWcpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUucHJvdmlkZXJDb25maWcgPSBmdW5jdGlvbiAoZGF0YSwgbmV4dCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5wcm9qZWN0LnByb3ZpZGVyLmNvbmZpZztcbiAgICAgIH1cbiAgICAgIFN0cmlkZXIuUHJvdmlkZXIuc2F2ZShwcm9qZWN0U2VhcmNoT3B0aW9ucywgZGF0YSwgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKFwiUHJvdmlkZXIgY29uZmlnIHNhdmVkLlwiKTtcbiAgICAgICAgbmV4dCAmJiBuZXh0KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5wbHVnaW5Db25maWcgPSBmdW5jdGlvbiAobmFtZSwgYnJhbmNoLCBkYXRhLCBuZXh0KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBuZXh0ID0gZGF0YTtcbiAgICAgICAgZGF0YSA9IGJyYW5jaDtcbiAgICAgICAgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoYnJhbmNoLm1pcnJvcl9tYXN0ZXIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgcGx1Z2luID0gJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW25hbWVdXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgcmV0dXJuIHBsdWdpbi5jb25maWc7XG4gICAgICB9XG4gICAgICBpZiAocGx1Z2luID09PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJwbHVnaW5Db25maWcgY2FsbGVkIGZvciBhIHBsdWdpbiB0aGF0J3Mgbm90IGNvbmZpZ3VyZWQuIFwiICsgbmFtZSwgdHJ1ZSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUGx1Z2luIG5vdCBjb25maWd1cmVkOiAnICsgbmFtZSk7XG4gICAgICB9XG5cbiAgICAgIFN0cmlkZXIuQ29uZmlnLkJyYW5jaC5QbHVnaW4uc2F2ZShcbiAgICAgICAge1xuICAgICAgICAgIG93bmVyOiAgcHJvamVjdFNlYXJjaE9wdGlvbnMub3duZXIsXG4gICAgICAgICAgcmVwbzogICBwcm9qZWN0U2VhcmNoT3B0aW9ucy5yZXBvLFxuICAgICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICAgICAgcGx1Z2luOiBuYW1lXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcyhcIkNvbmZpZyBmb3IgXCIgKyBuYW1lICsgXCIgb24gYnJhbmNoIFwiICsgYnJhbmNoLm5hbWUgKyBcIiBzYXZlZC5cIik7XG4gICAgICAgICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXVtuYW1lXS5jb25maWcgPSBkYXRhO1xuICAgICAgICBuZXh0KG51bGwsIGRhdGEpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlUHJvamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIFN0cmlkZXIuUmVwby5kZWxldGUocHJvamVjdFNlYXJjaE9wdGlvbnMsIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc3RhcnRUZXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgU3RyaWRlci5TdGFydC5zYXZlKFxuICAgICAgICBwcm9qZWN0U2VhcmNoT3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaC5uYW1lLFxuICAgICAgICAgIHR5cGU6IFwiVEVTVF9PTkxZXCIsXG4gICAgICAgICAgcGFnZTpcImNvbmZpZ1wiIH0sXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnN0YXJ0RGVwbG95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgU3RyaWRlci5TdGFydC5zYXZlKFxuICAgICAgICBwcm9qZWN0U2VhcmNoT3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaC5uYW1lLFxuICAgICAgICAgIHR5cGU6IFwiVEVTVF9BTkRfREVQTE9ZXCIsXG4gICAgICAgICAgcGFnZTpcImNvbmZpZ1wiIH0sXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmVQcm9qZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgU3RyaWRlci5SZWd1bGFyQ29uZmlnLnNhdmUoXG4gICAgICAgICAgcHJvamVjdFNlYXJjaE9wdGlvbnMsXG4gICAgICAgICAge1xuICAgICAgICAgICAgcHVibGljOiAkc2NvcGUucHJvamVjdC5wdWJsaWNcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0dlbmVyYWwgY29uZmlnIHNhdmVkLicpO1xuICAgICAgfVxuICAgIH07XG5cbiAgfSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZpeFRlbXBsYXRlO1xuXG5mdW5jdGlvbiBmaXhUZW1wbGF0ZShzKSB7XG4gIHJldHVybiBzLlxuICAgIHJlcGxhY2UoL1xcW1xcWy9nLCAne3snKS5cbiAgICByZXBsYWNlKC9cXF1cXF0vZywgJ319Jyk7XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkNvbGxhYm9yYXRvcnNDdHJsJywgWyckc2NvcGUnLCAnU3RyaWRlcicsIENvbGxhYm9yYXRvcnNDdHJsXSk7XG5cbmZ1bmN0aW9uIENvbGxhYm9yYXRvcnNDdHJsKCRzY29wZSwgU3RyaWRlcikge1xuICAkc2NvcGUubmV3X2VtYWlsID0gJyc7XG4gICRzY29wZS5uZXdfYWNjZXNzID0gMDtcbiAgJHNjb3BlLmNvbGxhYm9yYXRvcnMgPSB3aW5kb3cuY29sbGFib3JhdG9ycyB8fCBbXTtcblxuICAkc2NvcGUucmVtb3ZlID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpdGVtLmxvYWRpbmcgPSB0cnVlO1xuICAgICRzY29wZS5jbGVhck1lc3NhZ2UoKTtcbiAgICBTdHJpZGVyLmRlbChcbiAgICAgICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2NvbGxhYm9yYXRvcnMvJyxcbiAgICAgIHtlbWFpbDogaXRlbS5lbWFpbH0sXG4gICAgICBzdWNjZXNzKTtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICByZW1vdmUoJHNjb3BlLmNvbGxhYm9yYXRvcnMsIGl0ZW0pO1xuICAgICAgJHNjb3BlLnN1Y2Nlc3MoaXRlbS5lbWFpbCArIFwiIGlzIG5vIGxvbmdlciBhIGNvbGxhYm9yYXRvciBvbiB0aGlzIHByb2plY3QuXCIpO1xuICAgIH1cbiAgfTtcblxuICAkc2NvcGUuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkYXRhID0ge1xuICAgICAgZW1haWw6ICRzY29wZS5uZXdfZW1haWwsXG4gICAgICBhY2Nlc3M6ICRzY29wZS5uZXdfYWNjZXNzIHx8IDAsXG4gICAgICBncmF2YXRhcjogJHNjb3BlLmdyYXZhdGFyKCRzY29wZS5uZXdfZW1haWwpLFxuICAgICAgb3duZXI6IGZhbHNlXG4gICAgfTtcblxuICAgIFN0cmlkZXIucG9zdChcbiAgICAgICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2NvbGxhYm9yYXRvcnMvJyxcbiAgICAgIGRhdGEsXG4gICAgICBzdWNjZXNzKTtcblxuXG4gICAgZnVuY3Rpb24gc3VjY2VzcyhyZXMpIHtcbiAgICAgICRzY29wZS5uZXdfYWNjZXNzID0gMDtcbiAgICAgICRzY29wZS5uZXdfZW1haWwgPSAnJztcbiAgICAgIGlmIChyZXMuY3JlYXRlZCkge1xuICAgICAgICAkc2NvcGUuY29sbGFib3JhdG9ycy5wdXNoKGRhdGEpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnN1Y2Nlc3MocmVzLm1lc3NhZ2UpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlKGFyLCBpdGVtKSB7XG4gIGFyLnNwbGljZShhci5pbmRleE9mKGl0ZW0pLCAxKTtcbn1cbiIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5FbnZpcm9ubWVudEN0cmwnLCBbJyRzY29wZScsIEVudmlyb25tZW50Q3RybF0pO1xuXG5mdW5jdGlvbiBFbnZpcm9ubWVudEN0cmwoJHNjb3BlKXtcbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0uZW52LmNvbmZpZycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICRzY29wZS5jb25maWcgPSB2YWx1ZSB8fCB7fTtcbiAgfSk7XG4gICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnZW52JywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuZGVsID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGRlbGV0ZSAkc2NvcGUuY29uZmlnW2tleV07XG4gICAgJHNjb3BlLnNhdmUoKTtcbiAgfTtcbiAgJHNjb3BlLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuY29uZmlnWyRzY29wZS5uZXdrZXldID0gJHNjb3BlLm5ld3ZhbHVlO1xuICAgICRzY29wZS5uZXdrZXkgPSAkc2NvcGUubmV3dmFsdWUgPSAnJztcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5HaXRodWJDdHJsJywgWyckc2NvcGUnLCAnU3RyaWRlcicsIEdpdGh1YkN0cmxdKTtcblxuZnVuY3Rpb24gR2l0aHViQ3RybCgkc2NvcGUsIFN0cmlkZXIpIHtcblxuICAkc2NvcGUuY29uZmlnID0gJHNjb3BlLnByb3ZpZGVyQ29uZmlnKCk7XG4gICRzY29wZS5uZXdfdXNlcm5hbWUgPSBcIlwiO1xuICAkc2NvcGUubmV3X2xldmVsID0gXCJ0ZXN0ZXJcIjtcbiAgJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgPSAkc2NvcGUuY29uZmlnLndoaXRlbGlzdCB8fCBbXTtcbiAgJHNjb3BlLmNvbmZpZy5wdWxsX3JlcXVlc3RzID0gJHNjb3BlLmNvbmZpZy5wdWxsX3JlcXVlc3RzIHx8ICdub25lJztcblxuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUucHJvdmlkZXJDb25maWcoJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge30pO1xuICB9O1xuXG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZy5wdWxsX3JlcXVlc3RzJywgZnVuY3Rpb24gKHZhbHVlLCBvbGQpIHtcbiAgICBpZiAoIW9sZCB8fCB2YWx1ZSA9PT0gb2xkKSByZXR1cm47XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKHtcbiAgICAgIHB1bGxfcmVxdWVzdHM6ICRzY29wZS5jb25maWcucHVsbF9yZXF1ZXN0c1xuICAgIH0pO1xuICB9KTtcblxuICAkc2NvcGUuYWRkV2ViaG9va3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IHRydWU7XG5cbiAgICBTdHJpZGVyLnBvc3QoJHNjb3BlLmFwaV9yb290ICsgJ2dpdGh1Yi9ob29rJywgc3VjY2Vzcyk7XG5cbiAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgY29uc29sZS5sb2coJ1NVQ0NFU1MnKTtcbiAgICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSBmYWxzZTtcbiAgICAgICRzY29wZS5zdWNjZXNzKCdTZXQgZ2l0aHViIHdlYmhvb2tzJyk7XG4gICAgfVxuICB9O1xuXG4gICRzY29wZS5kZWxldGVXZWJob29rcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gdHJ1ZTtcblxuICAgIFN0cmlkZXIuZGVsKCRzY29wZS5hcGlfcm9vdCArICdnaXRodWIvaG9vaycsIHN1Y2Nlc3MpO1xuXG4gICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSBmYWxzZTtcbiAgICAgICRzY29wZS5zdWNjZXNzKCdSZW1vdmVkIGdpdGh1YiB3ZWJob29rcycpO1xuICAgIH1cbiAgfTtcblxuICAkc2NvcGUucmVtb3ZlV0wgPSBmdW5jdGlvbiAodXNlcikge1xuICAgIHZhciBpZHggPSAkc2NvcGUuY29uZmlnLndoaXRlbGlzdC5pbmRleE9mKHVzZXIpO1xuICAgIGlmIChpZHggPT09IC0xKSByZXR1cm4gY29uc29sZS5lcnJvcihcInRyaWVkIHRvIHJlbW92ZSBhIHdoaXRlbGlzdCBpdGVtIHRoYXQgZGlkbid0IGV4aXN0XCIpO1xuICAgIHZhciB3aGl0ZWxpc3QgPSAkc2NvcGUuY29uZmlnLndoaXRlbGlzdC5zbGljZSgpO1xuICAgIHdoaXRlbGlzdC5zcGxpY2UoaWR4LCAxKTtcbiAgICAkc2NvcGUucHJvdmlkZXJDb25maWcoe1xuICAgICAgd2hpdGVsaXN0OiB3aGl0ZWxpc3RcbiAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuY29uZmlnLndoaXRlbGlzdCA9IHdoaXRlbGlzdDtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuYWRkV0wgPSBmdW5jdGlvbiAodXNlcikge1xuICAgIGlmICghdXNlci5uYW1lIHx8ICF1c2VyLmxldmVsKSByZXR1cm47XG4gICAgdmFyIHdoaXRlbGlzdCA9ICRzY29wZS5jb25maWcud2hpdGVsaXN0LnNsaWNlKCk7XG4gICAgd2hpdGVsaXN0LnB1c2godXNlcik7XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKHtcbiAgICAgIHdoaXRlbGlzdDogd2hpdGVsaXN0XG4gICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgPSB3aGl0ZWxpc3Q7XG4gICAgfSk7XG4gIH07XG5cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuSGVyb2t1Q29udHJvbGxlcicsIFsnJHNjb3BlJywgJ1N0cmlkZXInLCBIZXJva3VDdHJsXSk7XG5cbmZ1bmN0aW9uIEhlcm9rdUN0cmwoJHNjb3BlLCBTdHJpZGVyKSB7XG4gICRzY29wZS4kd2F0Y2goJ3VzZXJDb25maWdzLmhlcm9rdScsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICghdmFsdWUpIHJldHVyblxuICAgICRzY29wZS51c2VyQ29uZmlnID0gdmFsdWU7XG4gICAgaWYgKCEkc2NvcGUuYWNjb3VudCAmJiB2YWx1ZS5hY2NvdW50cyAmJiB2YWx1ZS5hY2NvdW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAkc2NvcGUuYWNjb3VudCA9IHZhbHVlLmFjY291bnRzWzBdO1xuICAgIH1cbiAgfSk7XG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdLmhlcm9rdS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgaWYgKHZhbHVlLmFwcCAmJiAkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50cykge1xuICAgICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS51c2VyQ29uZmlnLmFjY291bnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICgkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50c1tpXS5pZCA9PT0gdmFsdWUuYXBwLmFjY291bnQpIHtcbiAgICAgICAgICAkc2NvcGUuYWNjb3VudCA9ICRzY29wZS51c2VyQ29uZmlnLmFjY291bnRzW2ldO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdoZXJva3UnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5nZXRBcHBzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghJHNjb3BlLmFjY291bnQpIHJldHVybiBjb25zb2xlLndhcm4oJ3RyaWVkIHRvIGdldEFwcHMgYnV0IG5vIGFjY291bnQnKTtcbiAgICBTdHJpZGVyLmdldCgnL2V4dC9oZXJva3UvYXBwcy8nICsgZW5jb2RlVVJJQ29tcG9uZW50KCRzY29wZS5hY2NvdW50LmlkKSwgc3VjY2Vzcyk7XG5cbiAgICBmdW5jdGlvbiBzdWNjZXNzIChib2R5LCByZXEpIHtcbiAgICAgICRzY29wZS5hY2NvdW50LmNhY2hlID0gYm9keTtcbiAgICAgICRzY29wZS5zdWNjZXNzKCdHb3QgYWNjb3VudHMgbGlzdCBmb3IgJyArICRzY29wZS5hY2NvdW50LmVtYWlsLCB0cnVlKTtcbiAgICB9XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkpvYkNvbnRyb2xsZXInLCBbJyRzY29wZScsIEpvYkNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gSm9iQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAkc2NvcGUuaW5pdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAkc2NvcGUuJHdhdGNoKCd1c2VyQ29uZmlnc1tcIicgKyBuYW1lICsgJ1wiXScsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgJHNjb3BlLnVzZXJDb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXVtcIicgKyBuYW1lICsgJ1wiXS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAgICRzY29wZS5wbHVnaW5Db25maWcobmFtZSwgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLk5vZGVDb250cm9sbGVyJywgWyckc2NvcGUnLCBOb2RlQ29udHJvbGxlcl0pO1xuXG5mdW5jdGlvbiBOb2RlQ29udHJvbGxlcigkc2NvcGUpIHtcbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0ubm9kZS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gIH0pO1xuICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ25vZGUnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5yZW1vdmVHbG9iYWwgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAkc2NvcGUuY29uZmlnLmdsb2JhbHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xuICAkc2NvcGUuYWRkR2xvYmFsID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghJHNjb3BlLmNvbmZpZy5nbG9iYWxzKSAkc2NvcGUuY29uZmlnLmdsb2JhbHMgPSBbXTtcbiAgICAkc2NvcGUuY29uZmlnLmdsb2JhbHMucHVzaCgkc2NvcGUubmV3X3BhY2thZ2UpO1xuICAgICRzY29wZS5uZXdfcGFja2FnZSA9ICcnO1xuICAgICRzY29wZS5zYXZlKCk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLlJ1bm5lckNvbnRyb2xsZXInLCBbJyRzY29wZScsIFJ1bm5lckNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gUnVubmVyQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAkc2NvcGUuaW5pdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgJHNjb3BlLiR3YXRjaCgncnVubmVyQ29uZmlnc1ticmFuY2gubmFtZV1bXCInICsgbmFtZSArICdcIl0nLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdSdW5uZXIgY29uZmlnJywgbmFtZSwgdmFsdWUsICRzY29wZS5ydW5uZXJDb25maWdzKTtcbiAgICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucnVubmVyQ29uZmlnKCRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5TYXVjZUN0cmwnLCBbJyRzY29wZScsIFNhdWNlQ3RybF0pO1xuXG5mdW5jdGlvbiBTYXVjZUN0cmwoJHNjb3BlKSB7XG5cbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0uc2F1Y2UuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAkc2NvcGUuYnJvd3Nlcl9tYXAgPSB7fTtcbiAgICBpZiAoIXZhbHVlLmJyb3dzZXJzKSB7XG4gICAgICB2YWx1ZS5icm93c2VycyA9IFtdO1xuICAgIH1cbiAgICBmb3IgKHZhciBpPTA7IGk8dmFsdWUuYnJvd3NlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICRzY29wZS5icm93c2VyX21hcFtzZXJpYWxpemVOYW1lKHZhbHVlLmJyb3dzZXJzW2ldKV0gPSB0cnVlO1xuICAgIH1cbiAgfSk7XG4gICRzY29wZS5jb21wbGV0ZU5hbWUgPSBjb21wbGV0ZU5hbWU7XG4gICRzY29wZS5vcGVyYXRpbmdzeXN0ZW1zID0gb3JnYW5pemUoYnJvd3NlcnMgfHwgW10pO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuY29uZmlnLmJyb3dzZXJzID0gW107XG4gICAgZm9yICh2YXIgbmFtZSBpbiAkc2NvcGUuYnJvd3Nlcl9tYXApIHtcbiAgICAgIGlmICgkc2NvcGUuYnJvd3Nlcl9tYXBbbmFtZV0pIHtcbiAgICAgICAgJHNjb3BlLmNvbmZpZy5icm93c2Vycy5wdXNoKHBhcnNlTmFtZShuYW1lKSk7XG4gICAgICB9XG4gICAgfVxuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ3NhdWNlJywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmJyb3dzZXJfbWFwID0ge307XG4gICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gb3JnYW5pemUoYnJvd3NlcnMpIHtcbiAgdmFyIG9zcyA9IHt9O1xuICBmb3IgKHZhciBpPTA7IGk8YnJvd3NlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoIW9zc1ticm93c2Vyc1tpXS5vc10pIHtcbiAgICAgIG9zc1ticm93c2Vyc1tpXS5vc10gPSB7fTtcbiAgICB9XG4gICAgaWYgKCFvc3NbYnJvd3NlcnNbaV0ub3NdW2Jyb3dzZXJzW2ldLmxvbmdfbmFtZV0pIHtcbiAgICAgIG9zc1ticm93c2Vyc1tpXS5vc11bYnJvd3NlcnNbaV0ubG9uZ19uYW1lXSA9IFtdO1xuICAgIH1cbiAgICBvc3NbYnJvd3NlcnNbaV0ub3NdW2Jyb3dzZXJzW2ldLmxvbmdfbmFtZV0ucHVzaChicm93c2Vyc1tpXSk7XG4gICAgYnJvd3NlcnNbaV0uY29tcGxldGVfbmFtZSA9IGNvbXBsZXRlTmFtZShicm93c2Vyc1tpXSk7XG4gIH1cbiAgcmV0dXJuIG9zcztcbn1cblxuZnVuY3Rpb24gY29tcGxldGVOYW1lKHZlcnNpb24pIHtcbiAgcmV0dXJuIHZlcnNpb24ub3MgKyAnLScgKyB2ZXJzaW9uLmFwaV9uYW1lICsgJy0nICsgdmVyc2lvbi5zaG9ydF92ZXJzaW9uO1xufVxuXG5mdW5jdGlvbiBwYXJzZU5hbWUobmFtZSkge1xuICB2YXIgcGFydHMgPSBuYW1lLnNwbGl0KCctJyk7XG4gIHJldHVybiB7XG4gICAgcGxhdGZvcm06IHBhcnRzWzBdLFxuICAgIGJyb3dzZXJOYW1lOiBwYXJ0c1sxXSxcbiAgICB2ZXJzaW9uOiBwYXJ0c1syXSB8fCAnJ1xuICB9O1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVOYW1lKGJyb3dzZXIpIHtcbiAgcmV0dXJuIGJyb3dzZXIucGxhdGZvcm0gKyAnLScgKyBicm93c2VyLmJyb3dzZXJOYW1lICsgJy0nICsgYnJvd3Nlci52ZXJzaW9uO1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5XZWJob29rc0N0cmwnLCBbJyRzY29wZScsIFdlYmhvb2tzQ3RybF0pO1xuXG5mdW5jdGlvbiBXZWJob29rc0N0cmwoJHNjb3BlKSB7XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGFyLCBpdGVtKSB7XG4gICAgYXIuc3BsaWNlKGFyLmluZGV4T2YoaXRlbSksIDEpO1xuICB9XG5cbiAgJHNjb3BlLmhvb2tzID0gJHNjb3BlLnBsdWdpbkNvbmZpZygnd2ViaG9va3MnKSB8fCBbXTtcbiAgaWYgKCFBcnJheS5pc0FycmF5KCRzY29wZS5ob29rcykpICRzY29wZS5ob29rcyA9IFtdO1xuICBpZiAoISRzY29wZS5ob29rcy5sZW5ndGgpICRzY29wZS5ob29rcy5wdXNoKHt9KTtcblxuICAkc2NvcGUucmVtb3ZlID0gZnVuY3Rpb24gKGhvb2spIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCd3ZWJob29rcycsICRzY29wZS5ob29rcywgZnVuY3Rpb24gKGVycikge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICAgaWYgKCFlcnIpIHJlbW92ZSgkc2NvcGUuaG9va3MsIGhvb2spO1xuICAgICAgaWYgKCEkc2NvcGUuaG9va3MubGVuZ3RoKSAkc2NvcGUuaG9va3MucHVzaCh7fSk7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnd2ViaG9va3MnLCAkc2NvcGUuaG9va3MsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5ob29rcy5wdXNoKHt9KTtcbiAgfTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdEYXNoYm9hcmRDdHJsJywgWyckc2NvcGUnLCAnU3RyaWRlcicsIERhc2hib2FyZEN0cmxdKTtcblxuZnVuY3Rpb24gRGFzaGJvYXJkQ3RybCgkc2NvcGUsIFN0cmlkZXIpIHtcblxuICAkc2NvcGUucGhhc2VzID0gU3RyaWRlci5waGFzZXM7XG5cblxuICAvLyBUT0RPOiBtYWtlIHRoaXMgbW9yZSBkZWNsYXJhdGl2ZTpcbiAgU3RyaWRlci5TZXNzaW9uLmdldChmdW5jdGlvbih1c2VyKSB7XG4gICAgaWYgKHVzZXIudXNlcikgJHNjb3BlLmN1cnJlbnRVc2VyID0gdXNlci51c2VyO1xuICB9KTtcblxuICBTdHJpZGVyLmdldCgnL2Rhc2hib2FyZCcsIGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAkc2NvcGUuam9icyA9IHJlc3Auam9icztcbiAgICAkc2NvcGUuYXZhaWxhYmxlUHJvdmlkZXJzID0gcmVzcC5hdmFpbGFibGVQcm92aWRlcnM7XG5cbiAgICBTdHJpZGVyLmNvbm5lY3QoJHNjb3BlLCAkc2NvcGUuam9icyk7XG4gIH0pO1xuXG4gIC8vICRzY29wZS5qb2JzID0gU3RyaWRlci5qb2JzO1xuICAvLyBTdHJpZGVyLmNvbm5lY3QoJHNjb3BlKTtcbiAgLy8gU3RyaWRlci5qb2JzLmRhc2hib2FyZCgpO1xuXG4gICRzY29wZS5zdGFydERlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShqb2IpIHtcbiAgICBTdHJpZGVyLmRlcGxveShqb2IucHJvamVjdCk7XG4gIH07XG5cbiAgJHNjb3BlLnN0YXJ0VGVzdCA9IGZ1bmN0aW9uIHRlc3Qoam9iKSB7XG4gICAgU3RyaWRlci50ZXN0KGpvYi5wcm9qZWN0KTtcbiAgfTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0Vycm9yQ3RybCcsIFsnJHNjb3BlJywgJyRyb290U2NvcGUnLCAnJGxvY2F0aW9uJywgJyRzY2UnLCBFcnJvckN0cmxdKTtcblxuZnVuY3Rpb24gRXJyb3JDdHJsKCRzY29wZSwgJHJvb3RTY29wZSwgJGxvY2F0aW9uLCAkc2NlKSB7XG4gICRzY29wZS5lcnJvciA9IHt9O1xuXG4gIHZhciBsYXN0O1xuXG4gICRyb290U2NvcGUuJG9uKCdlcnJvcicsIGZ1bmN0aW9uKGV2LCBlcnIpIHtcbiAgICBsYXN0ID0gRGF0ZS5ub3coKTtcbiAgICAkc2NvcGUuZXJyb3IubWVzc2FnZSA9ICRzY2UudHJ1c3RBc0h0bWwoZXJyLm1lc3NhZ2UgfHwgZXJyKTtcbiAgfSk7XG5cbiAgJHJvb3RTY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKGxhc3QgJiYgRGF0ZS5ub3coKSAtIGxhc3QgPiAgMTAwMCkge1xuICAgICAgJHNjb3BlLmVycm9yLm1lc3NhZ2UgPSAnJztcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBmbGFzaCA9ICRsb2NhdGlvbi5zZWFyY2goKS5mbGFzaDtcbiAgaWYgKGZsYXNoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGZsYXNoID0gSlNPTi5wYXJzZShmbGFzaCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICB9XG5cbiAgICBPYmplY3Qua2V5cyhmbGFzaCkuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgICAkcm9vdFNjb3BlLiRlbWl0KCdlcnJvcicsIGZsYXNoW2tdWzBdKTtcbiAgICB9KTtcbiAgfVxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0pvYkN0cmwnLCBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnJHNjZScsICckZmlsdGVyJywgJyRsb2NhdGlvbicsICckcm91dGUnLCAnU3RyaWRlcicsIEpvYkN0cmxdKTtcblxuZnVuY3Rpb24gSm9iQ3RybCgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJHNjZSwgJGZpbHRlciwgJGxvY2F0aW9uLCAkcm91dGUsIFN0cmlkZXIpIHtcblxuXG4gIHZhciBvdXRwdXRDb25zb2xlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnNvbGUtb3V0cHV0Jyk7XG5cbiAgJHNjb3BlLnBoYXNlcyA9IFN0cmlkZXIucGhhc2VzO1xuICAkc2NvcGUucGFnZSA9ICdidWlsZCc7XG5cbiAgdmFyIGpvYmlkID0gJHJvdXRlUGFyYW1zLmpvYmlkO1xuICBjb25zb2xlLmxvZygnam9iaWQ6Jywgam9iaWQpO1xuICB2YXIgc2VhcmNoT3B0aW9ucyA9IHtcbiAgICBvd25lcjogJHJvdXRlUGFyYW1zLm93bmVyLFxuICAgIHJlcG86ICAkcm91dGVQYXJhbXMucmVwb1xuICB9O1xuXG4gIFN0cmlkZXIuUmVwby5nZXQoc2VhcmNoT3B0aW9ucywgZnVuY3Rpb24ocmVwbykge1xuICAgICRzY29wZS5wcm9qZWN0ID0gcmVwby5wcm9qZWN0XG4gICAgaWYgKCEgam9iaWQpICRzY29wZS5qb2IgID0gcmVwby5qb2I7XG4gICAgJHNjb3BlLmpvYnMgPSByZXBvLmpvYnM7XG5cbiAgICBpZiAoJHNjb3BlLmpvYiAmJiAkc2NvcGUuam9iLnBoYXNlcy50ZXN0LmNvbW1hbmRzLmxlbmd0aCkge1xuICAgICAgaWYgKCRzY29wZS5qb2IucGhhc2VzLmVudmlyb25tZW50KSB7XG4gICAgICAgICRzY29wZS5qb2IucGhhc2VzLmVudmlyb25tZW50LmNvbGxhcHNlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoJHNjb3BlLmpvYi5waGFzZXMucHJlcGFyZSkge1xuICAgICAgICAkc2NvcGUuam9iLnBoYXNlcy5wcmVwYXJlLmNvbGxhcHNlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoJHNjb3BlLmpvYi5waGFzZXMuY2xlYW51cCkge1xuICAgICAgICAkc2NvcGUuam9iLnBoYXNlcy5jbGVhbnVwLmNvbGxhcHNlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT2JqZWN0LmtleXMoJHNjb3BlLmpvYi5waGFzZXMpLmZvckVhY2goZnVuY3Rpb24ocGhhc2VLZXkpIHtcbiAgICAvLyAgIHZhciBwaGFzZSA9ICRzY29wZS5qb2IucGhhc2VzW3BoYXNlS2V5XTtcbiAgICAvLyAgIE9iamVjdC5rZXlzKHBoYXNlLmNvbW1hbmRzKS5mb3JFYWNoKGZ1bmN0aW9uKGNvbW1hbmRLZXkpIHtcbiAgICAvLyAgICAgdmFyIGNvbW1hbmQgPSBwaGFzZS5jb21tYW5kc1tjb21tYW5kS2V5XTtcbiAgICAvLyAgICAgY29tbWFuZC5tZXJnZWQgPSAkc2NlLnRydXN0QXNIdG1sKGNvbW1hbmQubWVyZ2VkKTtcbiAgICAvLyAgIH0pXG4gICAgLy8gfSk7XG4gIH0pO1xuXG4gIGlmIChqb2JpZCkge1xuICAgIFN0cmlkZXIuSm9iLmdldCh7XG4gICAgICBvd25lcjogJHJvdXRlUGFyYW1zLm93bmVyLFxuICAgICAgcmVwbzogICRyb3V0ZVBhcmFtcy5yZXBvLFxuICAgICAgam9iaWQ6IGpvYmlkXG4gICAgfSwgZnVuY3Rpb24oam9iKSB7XG4gICAgICAkc2NvcGUuam9iID0gam9iO1xuICAgIH0pO1xuICB9XG5cbiAgU3RyaWRlci5TdGF0dXNCbG9ja3MuZ2V0KGZ1bmN0aW9uKHN0YXR1c0Jsb2Nrcykge1xuICAgICRzY29wZS5zdGF0dXNCbG9ja3MgPSBzdGF0dXNCbG9ja3M7XG4gICAgWydydW5uZXInLCAncHJvdmlkZXInLCAnam9iJ10uZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGZpeEJsb2NrcyhzdGF0dXNCbG9ja3MsIGtleSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIFN0cmlkZXIuY29ubmVjdCgkc2NvcGUpO1xuXG4gIFN0cmlkZXIuU2Vzc2lvbi5nZXQoZnVuY3Rpb24odXNlcikge1xuICAgIGlmICh1c2VyLnVzZXIpICRzY29wZS5jdXJyZW50VXNlciA9IHVzZXI7XG4gIH0pO1xuXG4gIC8vLyBTY29wZSBmdW5jdGlvbnNcblxuICAkc2NvcGUuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uIGNsZWFyQ2FjaGUoKSB7XG4gICAgJHNjb3BlLmNsZWFyaW5nQ2FjaGUgPSB0cnVlO1xuICAgIFN0cmlkZXIuQ2FjaGUuZGVsZXRlKCBzZWFyY2hPcHRpb25zLCBzdWNjZXNzKTtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAkc2NvcGUuY2xlYXJpbmdDYWNoZSA9IGZhbHNlO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9XG4gIH1cblxuICAvLyB2YXIgbGFzdFJvdXRlO1xuXG4gIC8vICRzY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbihldmVudCkge1xuICAvLyAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL1xcL2NvbmZpZyQvKSkge1xuICAvLyAgICAgd2luZG93LmxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuICAvLyAgICAgcmV0dXJuO1xuICAvLyAgIH1cbiAgLy8gICBwYXJhbXMgPSAkcm91dGVQYXJhbXM7XG4gIC8vICAgaWYgKCFwYXJhbXMuaWQpIHBhcmFtcy5pZCA9ICRzY29wZS5qb2JzWzBdLl9pZDtcbiAgLy8gICAvLyBkb24ndCByZWZyZXNoIHRoZSBwYWdlXG4gIC8vICAgJHJvdXRlLmN1cnJlbnQgPSBsYXN0Um91dGU7XG4gIC8vICAgaWYgKGpvYmlkICE9PSBwYXJhbXMuaWQpIHtcbiAgLy8gICAgIGpvYmlkID0gcGFyYW1zLmlkO1xuICAvLyAgICAgdmFyIGNhY2hlZCA9IGpvYm1hbi5nZXQoam9iaWQsIGZ1bmN0aW9uIChlcnIsIGpvYiwgY2FjaGVkKSB7XG4gIC8vICAgICAgIGlmIChqb2IucGhhc2VzLmVudmlyb25tZW50KSB7XG4gIC8vICAgICAgICAgam9iLnBoYXNlcy5lbnZpcm9ubWVudC5jb2xsYXBzZWQgPSB0cnVlO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgIGlmIChqb2IucGhhc2VzLnByZXBhcmUpIHtcbiAgLy8gICAgICAgICBqb2IucGhhc2VzLnByZXBhcmUuY29sbGFwc2VkID0gdHJ1ZTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICBpZiAoam9iLnBoYXNlcy5jbGVhbnVwKSB7XG4gIC8vICAgICAgICAgam9iLnBoYXNlcy5jbGVhbnVwLmNvbGxhcHNlZCA9IHRydWU7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgICAgJHNjb3BlLmpvYiA9IGpvYjtcbiAgLy8gICAgICAgaWYgKCRzY29wZS5qb2IucGhhc2VzLnRlc3QuY29tbWFuZHMubGVuZ3RoKSB7XG4gIC8vICAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMuZW52aXJvbm1lbnQuY29sbGFwc2VkID0gdHJ1ZTtcbiAgLy8gICAgICAgICAkc2NvcGUuam9iLnBoYXNlcy5wcmVwYXJlLmNvbGxhcHNlZCA9IHRydWU7XG4gIC8vICAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMuY2xlYW51cC5jb2xsYXBzZWQgPSB0cnVlO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgIGlmICghY2FjaGVkKSAkc2NvcGUuJGRpZ2VzdCgpO1xuICAvLyAgICAgfSk7XG4gIC8vICAgICBpZiAoIWNhY2hlZCkge1xuICAvLyAgICAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLmpvYnMubGVuZ3RoOyBpKyspIHtcbiAgLy8gICAgICAgICBpZiAoJHNjb3BlLmpvYnNbaV0uX2lkID09PSBqb2JpZCkge1xuICAvLyAgICAgICAgICAgJHNjb3BlLmpvYiA9ICRzY29wZS5qb2JzW2ldO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyB9KTtcblxuICAkc2NvcGUudHJpZ2dlcnMgPSB7XG4gICAgY29tbWl0OiB7XG4gICAgICBpY29uOiAnY29kZS1mb3JrJyxcbiAgICAgIHRpdGxlOiAnQ29tbWl0J1xuICAgIH0sXG4gICAgbWFudWFsOiB7XG4gICAgICBpY29uOiAnaGFuZC1yaWdodCcsXG4gICAgICB0aXRsZTogJ01hbnVhbCdcbiAgICB9LFxuICAgIHBsdWdpbjoge1xuICAgICAgaWNvbjogJ3B1enpsZS1waWVjZScsXG4gICAgICB0aXRsZTogJ1BsdWdpbidcbiAgICB9LFxuICAgIGFwaToge1xuICAgICAgaWNvbjogJ2Nsb3VkJyxcbiAgICAgIHRpdGxlOiAnQ2xvdWQnXG4gICAgfVxuICB9O1xuXG4gICRzY29wZS5zZWxlY3RKb2IgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAkbG9jYXRpb24ucGF0aChcbiAgICAgICcvJyArIGVuY29kZVVSSUNvbXBvbmVudChzZWFyY2hPcHRpb25zLm93bmVyKSArXG4gICAgICAnLycgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoT3B0aW9ucy5yZXBvKSArXG4gICAgICAnL2pvYi8nICsgZW5jb2RlVVJJQ29tcG9uZW50KGlkKSk7XG4gIH07XG5cbiAgJHNjb3BlLiR3YXRjaCgnam9iLnN0YXR1cycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHVwZGF0ZUZhdmljb24odmFsdWUpO1xuICB9KTtcblxuICAkc2NvcGUuJHdhdGNoKCdqb2Iuc3RkLm1lcmdlZF9sYXRlc3QnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvKiBUcmFja2luZyBpc24ndCBxdWl0ZSB3b3JraW5nIHJpZ2h0XG4gICAgaWYgKCRzY29wZS5qb2Iuc3RhdHVzID09PSAncnVubmluZycpIHtcbiAgICAgIGhlaWdodCA9IG91dHB1dENvbnNvbGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgdHJhY2tpbmcgPSBoZWlnaHQgKyBvdXRwdXRDb25zb2xlLnNjcm9sbFRvcCA+IG91dHB1dENvbnNvbGUuc2Nyb2xsSGVpZ2h0IC0gNTA7XG4gICAgICAvLyBjb25zb2xlLmxvZyh0cmFja2luZywgaGVpZ2h0LCBvdXRwdXRDb25zb2xlLnNjcm9sbFRvcCwgb3V0cHV0Q29uc29sZS5zY3JvbGxIZWlnaHQpO1xuICAgICAgaWYgKCF0cmFja2luZykgcmV0dXJuO1xuICAgIH1cbiAgICAqL1xuICAgIHZhciBhbnNpRmlsdGVyID0gJGZpbHRlcignYW5zaScpXG4gICAgJCgnLmpvYi1vdXRwdXQnKS5sYXN0KCkuYXBwZW5kKGFuc2lGaWx0ZXIodmFsdWUpKVxuICAgIG91dHB1dENvbnNvbGUuc2Nyb2xsVG9wID0gb3V0cHV0Q29uc29sZS5zY3JvbGxIZWlnaHQ7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBvdXRwdXRDb25zb2xlLnNjcm9sbFRvcCA9IG91dHB1dENvbnNvbGUuc2Nyb2xsSGVpZ2h0O1xuICAgIH0sIDEwKTtcbiAgfSk7XG5cbiAgLy8gYnV0dG9uIGhhbmRsZXJzXG4gICRzY29wZS5zdGFydERlcGxveSA9IGZ1bmN0aW9uIChqb2IpIHtcbiAgICAkKCcudG9vbHRpcCcpLmhpZGUoKTtcbiAgICBTdHJpZGVyLmRlcGxveShqb2IucHJvamVjdCk7XG4gICAgJHNjb3BlLmpvYiA9IHtcbiAgICAgIHByb2plY3Q6ICRzY29wZS5qb2IucHJvamVjdCxcbiAgICAgIHN0YXR1czogJ3N1Ym1pdHRlZCdcbiAgICB9O1xuICB9O1xuICAkc2NvcGUuc3RhcnRUZXN0ID0gZnVuY3Rpb24gKGpvYikge1xuICAgICQoJy50b29sdGlwJykuaGlkZSgpO1xuICAgIFN0cmlkZXIuZGVwbG95KGpvYi5wcm9qZWN0KTtcbiAgICAkc2NvcGUuam9iID0ge1xuICAgICAgcHJvamVjdDogJHNjb3BlLmpvYi5wcm9qZWN0LFxuICAgICAgc3RhdHVzOiAnc3VibWl0dGVkJ1xuICAgIH07XG4gIH07XG5cblxuICBmdW5jdGlvbiBmaXhCbG9ja3Mob2JqZWN0LCBrZXkpIHtcbiAgICB2YXIgYmxvY2tzID0gb2JqZWN0W2tleV07XG4gICAgaWYgKCEgYmxvY2tzKSByZXR1cm47XG4gICAgT2JqZWN0LmtleXMoYmxvY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG4gICAgICB2YXIgYmxvY2sgPSBibG9ja3NbcHJvdmlkZXJdO1xuICAgICAgYmxvY2suYXR0cnNfaHRtbCA9IE9iamVjdC5rZXlzKGJsb2NrLmF0dHJzKS5tYXAoZnVuY3Rpb24oYXR0cikge1xuICAgICAgICByZXR1cm4gYXR0ciArICc9JyArIGJsb2NrLmF0dHJzW2F0dHJdO1xuICAgICAgfSkuam9pbignICcpO1xuXG4gICAgICBibG9jay5odG1sID0gJHNjZS50cnVzdEFzSHRtbChibG9jay5odG1sKTtcblxuICAgIH0pO1xuICB9XG59XG5cblxuLyoqIG1hbmFnZSB0aGUgZmF2aWNvbnMgKiovXG5mdW5jdGlvbiBzZXRGYXZpY29uKHN0YXR1cykge1xuICAkKCdsaW5rW3JlbCo9XCJpY29uXCJdJykuYXR0cignaHJlZicsICcvaW1hZ2VzL2ljb25zL2Zhdmljb24tJyArIHN0YXR1cyArICcucG5nJyk7XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGVGYXYoKSB7XG4gIHZhciBhbHQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gc3dpdGNoaXQoKSB7XG4gICAgc2V0RmF2aWNvbigncnVubmluZycgKyAoYWx0ID8gJy1hbHQnIDogJycpKTtcbiAgICBhbHQgPSAhYWx0O1xuICB9XG4gIHJldHVybiBzZXRJbnRlcnZhbChzd2l0Y2hpdCwgNTAwKTtcbn1cblxudmFyIHJ1bnRpbWUgPSBudWxsO1xuZnVuY3Rpb24gdXBkYXRlRmF2aWNvbih2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09ICdydW5uaW5nJykge1xuICAgIGlmIChydW50aW1lID09PSBudWxsKSB7XG4gICAgICBydW50aW1lID0gYW5pbWF0ZUZhdigpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAocnVudGltZSAhPT0gbnVsbCkge1xuICAgICAgY2xlYXJJbnRlcnZhbChydW50aW1lKTtcbiAgICAgIHJ1bnRpbWUgPSBudWxsO1xuICAgIH1cbiAgICBzZXRGYXZpY29uKHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZFN3aXRjaGVyKCRzY29wZSkge1xuICBmdW5jdGlvbiBzd2l0Y2hCdWlsZHMoZXZ0KSB7XG4gICAgdmFyIGR5ID0gezQwOiAxLCAzODogLTF9W2V2dC5rZXlDb2RlXVxuICAgICAgLCBpZCA9ICRzY29wZS5qb2IuX2lkXG4gICAgICAsIGlkeDtcbiAgICBpZiAoIWR5KSByZXR1cm47XG4gICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS5qb2JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoJHNjb3BlLmpvYnNbaV0uX2lkID09PSBpZCkge1xuICAgICAgICBpZHggPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlkeCA9PT0gLTEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gZmluZCBqb2IuJyk7XG4gICAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uXG4gICAgfVxuICAgIGlkeCArPSBkeTtcbiAgICBpZiAoaWR4IDwgMCB8fCBpZHggPj0gJHNjb3BlLmpvYnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICRzY29wZS5zZWxlY3RKb2IoJHNjb3BlLmpvYnNbaWR4XS5faWQpO1xuICAgICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gIH1cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHN3aXRjaEJ1aWxkcyk7XG59XG4iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBbJyRzY29wZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIExvZ2luQ3RybF0pO1xuXG5mdW5jdGlvbiBMb2dpbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24sIFN0cmlkZXIpIHtcblxuICBTdHJpZGVyLlNlc3Npb24uZ2V0KGZ1bmN0aW9uKHVzZXIpIHtcbiAgICBpZiAodXNlci5pZCkgJGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcbiAgfSk7XG5cbiAgJHNjb3BlLnVzZXIgPSB7fTtcblxuICAkc2NvcGUubG9naW4gPSBmdW5jdGlvbiBsb2dpbih1c2VyKSB7XG4gICAgdmFyIHNlc3Npb24gPSBuZXcgKFN0cmlkZXIuU2Vzc2lvbikodXNlcik7XG4gICAgc2Vzc2lvbi4kc2F2ZShmdW5jdGlvbigpIHtcbiAgICAgICRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7XG4gICAgfSk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5mdW5jdGlvbiB2YWxpZE5hbWUobmFtZSkge1xuICByZXR1cm4gISFuYW1lLm1hdGNoKC9bXFx3LV0rXFwvW1xcdy1dKy8pO1xufVxuXG5BcHAuY29udHJvbGxlcignTWFudWFsQ3RybCcsIFsnJHNjb3BlJywgJ1N0cmlkZXInLCBNYW51YWxDdHJsXSk7XG5cbmZ1bmN0aW9uIE1hbnVhbEN0cmwoJHNjb3BlLCBTdHJpZGVyKSB7XG4gIC8vIHZhciBwcm92aWRlciA9ICRhdHRycy5pZC5zcGxpdCgnLScpWzFdO1xuICAkc2NvcGUuY29uZmlnID0ge307XG5cbiAgJHNjb3BlLmluaXQgPSBmdW5jdGlvbihwcm92aWRlciwgcHJvamVjdHMpIHtcblxuICAgICRzY29wZS5wcm9qZWN0cyA9IHByb2plY3RzO1xuXG4gICAgJHNjb3BlLnJlbW92ZSA9IGZ1bmN0aW9uIChwcm9qZWN0KSB7XG4gICAgICBwcm9qZWN0LnJlYWxseV9yZW1vdmUgPSAncmVtb3ZpbmcnO1xuXG4gICAgICBTdHJpZGVyLmRlbCgnLycgKyBwcm9qZWN0Lm5hbWUgKyAnLycsIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUucHJvamVjdHMuc3BsaWNlKCRzY29wZS5wcm9qZWN0cy5pbmRleE9mKHByb2plY3QpLCAxKTtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ1Byb2plY3QgcmVtb3ZlZCcpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG5hbWUgPSAkc2NvcGUuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAoIXZhbGlkTmFtZShuYW1lKSkgcmV0dXJuO1xuXG4gICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgZGlzcGxheV9uYW1lOiAkc2NvcGUuZGlzcGxheV9uYW1lLFxuICAgICAgICBkaXNwbGF5X3VybDogJHNjb3BlLmRpc3BsYXlfdXJsLFxuICAgICAgICBwdWJsaWM6ICRzY29wZS5wdWJsaWMsXG4gICAgICAgIHByb3ZpZGVyOiB7XG4gICAgICAgICAgaWQ6IHByb3ZpZGVyLFxuICAgICAgICAgIGNvbmZpZzogJHNjb3BlLmNvbmZpZ1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBTdHJpZGVyLnB1dCgnLycgKyBuYW1lICsgJy8nLCBkYXRhLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnByb2plY3RzLnB1c2goe1xuICAgICAgICAgIGRpc3BsYXlfbmFtZTogJHNjb3BlLmRpc3BsYXlfbmFtZSxcbiAgICAgICAgICBkaXNwbGF5X3VybDogJHNjb3BlLmRpc3BsYXlfdXJsLFxuICAgICAgICAgIHByb3ZpZGVyOiB7XG4gICAgICAgICAgICBpZDogcHJvdmlkZXIsXG4gICAgICAgICAgICBjb25maWc6ICRzY29wZS5jb25maWdcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUuY29uZmlnID0ge307XG4gICAgICAgICRzY29wZS5kaXNwbGF5X25hbWUgPSAnJztcbiAgICAgICAgJHNjb3BlLmRpc3BsYXlfdXJsID0gJyc7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdDcmVhdGVkIHByb2plY3QhJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignUHJvamVjdHNDdHJsJywgWyckc2NvcGUnLCAnJHNjZScsICdTdHJpZGVyJywgUHJvamVjdHNDdHJsXSk7XG5cbmZ1bmN0aW9uIFByb2plY3RzQ3RybCgkc2NvcGUsICRzY2UsIFN0cmlkZXIpIHtcblxuICBTdHJpZGVyLmdldCgnL2FwaS9zZXNzaW9uJywgZnVuY3Rpb24oc2Vzc2lvbikge1xuICAgIGlmIChzZXNzaW9uLnVzZXIpIHtcbiAgICAgICRzY29wZS5jdXJyZW50VXNlciA9IHNlc3Npb24udXNlcjtcbiAgICAgICRzY29wZS5hY2NvdW50cyA9IHNlc3Npb24udXNlci5hY2NvdW50cztcbiAgICB9XG4gIH0pO1xuXG4gIFN0cmlkZXIuZ2V0KCcvYXBpL3Byb2plY3RzJywgZnVuY3Rpb24ocmVzcCkge1xuXG4gICAgJHNjb3BlLnVuY29uZmlndXJlZCA9IHJlc3AudW5jb25maWd1cmVkO1xuICAgICRzY29wZS5wcm92aWRlcnMgPSByZXNwLnByb3ZpZGVycztcbiAgICAkc2NvcGUubWFudWFsID0gcmVzcC5tYW51YWw7XG4gICAgJHNjb3BlLm1hbnVhbFByb2plY3RzID0gcmVzcC5tYW51YWxQcm9qZWN0cztcbiAgICAkc2NvcGUucmVwb3MgPSByZXNwLnJlcG9zO1xuICAgICRzY29wZS5wcm9qZWN0X3R5cGVzID0gcmVzcC5wcm9qZWN0X3R5cGVzO1xuXG4gICAgJHNjb3BlLnByb2plY3RzUGFnZSA9IHRydWU7XG5cblxuICAgIC8vLyBUcnVzdCBzb21lIGNvbnRlbnRcblxuICAgIE9iamVjdC5rZXlzKCRzY29wZS5tYW51YWwpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgaXRlbSA9ICRzY29wZS5tYW51YWxba2V5XTtcbiAgICAgIGlmIChpdGVtLnByb3ZpZGVyICYmIGl0ZW0ucHJvdmlkZXIuaHRtbClcbiAgICAgICAgaXRlbS5wcm92aWRlci5odG1sID0gJHNjZS50cnVzdEFzSHRtbChpdGVtLnByb3ZpZGVyLmh0bWwpO1xuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUucmVtb3ZlUHJvamVjdCA9IGZ1bmN0aW9uIChhY2NvdW50LCByZXBvLCBncm91cCkge1xuICAgICAgcmVwby5yZWFsbHlfcmVtb3ZlID0gJ3JlbW92aW5nJztcblxuICAgICAgU3RyaWRlci5kZWwoJy8nICsgcmVwby5uYW1lICsgJy8nLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgcmVwby5wcm9qZWN0ID0gbnVsbDtcbiAgICAgICAgcmVwby5yZWFsbHlfcmVtb3ZlID0gZmFsc2U7XG4gICAgICAgIGdyb3VwLmNvbmZpZ3VyZWQtLTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldHVwUHJvamVjdCA9IGZ1bmN0aW9uIChhY2NvdW50LCByZXBvLCB0eXBlLCBncm91cCkge1xuICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgIGRpc3BsYXlfbmFtZTogcmVwby5kaXNwbGF5X25hbWUgfHwgcmVwby5uYW1lLFxuICAgICAgICBkaXNwbGF5X3VybDogcmVwby5kaXNwbGF5X3VybCxcbiAgICAgICAgcHJvamVjdF90eXBlOiB0eXBlLFxuICAgICAgICBwcm92aWRlcjoge1xuICAgICAgICAgIGlkOiBhY2NvdW50LnByb3ZpZGVyLFxuICAgICAgICAgIGFjY291bnQ6IGFjY291bnQuaWQsXG4gICAgICAgICAgcmVwb19pZDogcmVwby5pZCxcbiAgICAgICAgICBjb25maWc6IHJlcG8uY29uZmlnXG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIFN0cmlkZXIucHV0KCcvJyArIHJlcG8ubmFtZSArICcvJywgZGF0YSwgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICByZXBvLnByb2plY3QgPSBkYXRhLnByb2plY3Q7XG4gICAgICAgIHJlcG8uYWRkaW5nID0gJ2RvbmUnO1xuICAgICAgICBncm91cC5jb25maWd1cmVkKys7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydFRlc3QgPSBmdW5jdGlvbiAocmVwbykge1xuXG4gICAgICBTdHJpZGVyLnBvc3QoJy8nICsgcmVwby5wcm9qZWN0Lm5hbWUgKyAnL3N0YXJ0Jywgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgIHJlcG8uYWRkaW5nID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdUZXN0IHN0YXJ0ZWQgZm9yICcgKyByZXBvLnByb2plY3QubmFtZSArICcuIDxhIGhyZWY9XCIvJyArIHJlcG8ucHJvamVjdC5uYW1lICsgJy9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5DbGljayB0byB3YXRjaCBpdCBydW48L2E+Jyk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG5cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdSZWxvYWRDdHJsJywgWyckbG9jYXRpb24nLCBmdW5jdGlvbigkbG9jYXRpb24pIHtcbiAgY29uc29sZS5sb2coJ3JlZGlyZWN0aW5nLi4uJyk7XG4gIHdpbmRvdy5sb2NhdGlvbiA9ICRsb2NhdGlvbi5wYXRoKCk7XG59XSk7IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuZGlyZWN0aXZlKCdkeW5hbWljQ29udHJvbGxlcicsIGR5bmFtaWNDb250cm9sbGVyKTtcblxuZnVuY3Rpb24gZHluYW1pY0NvbnRyb2xsZXIoJGNvbXBpbGUsICRjb250cm9sbGVyKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICB0ZXJtaW5hbDogdHJ1ZSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxtLCBhdHRycykge1xuICAgICAgdmFyIGxhc3RTY29wZTtcbiAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5keW5hbWljQ29udHJvbGxlciwgZnVuY3Rpb24oY3RybE5hbWUpIHtcbiAgICAgICAgaWYgKCEgY3RybE5hbWUpIHJldHVybjtcblxuICAgICAgICB2YXIgbmV3U2NvcGUgPSBzY29wZS4kbmV3KCk7XG5cbiAgICAgICAgdmFyIGN0cmw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY3RybCA9ICRjb250cm9sbGVyKGN0cmxOYW1lLCB7JHNjb3BlOiBuZXdTY29wZX0pO1xuICAgICAgICB9IGNhdGNoIChfZXJyKSB7XG4gICAgICAgICAgLy8gbm90IGZvdW5kXG4gICAgICAgICAgIGlmIChjdHJsTmFtZS5pbmRleE9mKCcuJykgIT0gY3RybE5hbWUubGVuZ3RoIC0gMSlcbiAgICAgICAgICAgIGxvZygnQ291bGQgbm90IGZpbmQgY29udHJvbGxlciB3aXRoIG5hbWUgJyArIGN0cmxOYW1lKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFzdFNjb3BlKSBsYXN0U2NvcGUuJGRlc3Ryb3koKTtcblxuICAgICAgICBlbG0uY29udGVudHMoKS5kYXRhKCckbmdDb250cm9sbGVyQ29udHJvbGxlcicsIGN0cmwpO1xuICAgICAgICAkY29tcGlsZShlbG0uY29udGVudHMoKSkobmV3U2NvcGUpO1xuXG4gICAgICAgIHZhciBpbml0ID0gYXR0cnMubmdJbml0O1xuICAgICAgICBpZiAoaW5pdCkgbmV3U2NvcGUuJGV2YWwoaW5pdCk7XG5cbiAgICAgICAgbGFzdFNjb3BlID0gbmV3U2NvcGU7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGxvZygpIHtcbiAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG59IiwiXG4vLyBpbnN0ZWFkIG9mIFwiYWJvdXQgJWQgaG91cnNcIlxuJC50aW1lYWdvLnNldHRpbmdzLnN0cmluZ3MuaG91ciA9ICdhbiBob3VyJztcbiQudGltZWFnby5zZXR0aW5ncy5zdHJpbmdzLmhvdXJzID0gJyVkIGhvdXJzJztcbiQudGltZWFnby5zZXR0aW5ncy5sb2NhbGVUaXRsZSA9IHRydWU7XG5cbnZhciB0aW1lX3VuaXRzID0gW1xuICB7XG4gICAgbXM6IDYwICogNjAgKiAxMDAwLFxuICAgIGNsczogJ2hvdXJzJyxcbiAgICBzdWZmaXg6ICdoJ1xuICB9LCB7XG4gICAgbXM6IDYwICogMTAwMCxcbiAgICBjbHM6ICdtaW51dGVzJyxcbiAgICBzdWZmaXg6ICdtJ1xuICB9LCB7XG4gICAgbXM6IDEwMDAsXG4gICAgY2xzOiAnc2Vjb25kcycsXG4gICAgc3VmZml4OiAncydcbiAgfSwge1xuICAgIG1zOiAwLFxuICAgIGNsczogJ21pbGlzZWNvbmRzJyxcbiAgICBzdWZmaXg6ICdtcydcbiAgfVxuXTtcblxuXG5mdW5jdGlvbiB0ZXh0RHVyYXRpb24oZHVyYXRpb24sIGVsLCB3aG9sZSkge1xuICBpZiAoIWR1cmF0aW9uKSByZXR1cm4gJChlbCkudGV4dCgnJyk7XG4gIHZhciBjbHMgPSAnJywgdGV4dDtcbiAgZm9yICh2YXIgaT0wOyBpPHRpbWVfdW5pdHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZHVyYXRpb24gPCB0aW1lX3VuaXRzW2ldLm1zKSBjb250aW51ZTtcbiAgICBjbHMgPSB0aW1lX3VuaXRzW2ldLmNscztcbiAgICB0ZXh0ID0gZHVyYXRpb24gKyAnJztcbiAgICBpZiAodGltZV91bml0c1tpXS5tcykge1xuICAgICAgaWYgKHdob2xlKSB0ZXh0ID0gcGFyc2VJbnQoZHVyYXRpb24gLyB0aW1lX3VuaXRzW2ldLm1zKVxuICAgICAgZWxzZSB0ZXh0ID0gcGFyc2VJbnQoZHVyYXRpb24gLyB0aW1lX3VuaXRzW2ldLm1zICogMTApIC8gMTBcbiAgICB9XG4gICAgdGV4dCArPSB0aW1lX3VuaXRzW2ldLnN1ZmZpeDtcbiAgICBicmVhaztcbiAgfVxuICAkKGVsKS5hZGRDbGFzcyhjbHMpLnRleHQodGV4dCk7XG59XG5cbmZ1bmN0aW9uIHNpbmNlKHN0YW1wLCBlbCkge1xuICB2YXIgdGhlbiA9IG5ldyBEYXRlKHN0YW1wKS5nZXRUaW1lKCk7XG4gIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgdGV4dER1cmF0aW9uKG5vdyAtIHRoZW4sIGVsLCB0cnVlKTtcbiAgfVxuICB1cGRhdGUoKTtcbiAgcmV0dXJuIHNldEludGVydmFsKHVwZGF0ZSwgNTAwKTtcbn1cblxudmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG4vLyB0aW1lYWdvIGRpcmVjdGl2ZVxuQXBwLmRpcmVjdGl2ZShcInRpbWVcIiwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6IFwiRVwiLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgYXR0cnMuc2luY2UgJiYgIWF0dHJzLmR1cmF0aW9uKSB7XG4gICAgICAgIHZhciBpdmFsID0gc2luY2UoYXR0cnMuc2luY2UsIGVsZW1lbnQpO1xuICAgICAgICAkKGVsZW1lbnQpLnRvb2x0aXAoe3RpdGxlOiAnU3RhcnRlZCAnICsgbmV3IERhdGUoYXR0cnMuc2luY2UpLnRvTG9jYWxlU3RyaW5nKCl9KTtcbiAgICAgICAgYXR0cnMuJG9ic2VydmUoJ3NpbmNlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQoZWxlbWVudCkudG9vbHRpcCh7dGl0bGU6ICdTdGFydGVkICcgKyBuZXcgRGF0ZShhdHRycy5zaW5jZSkudG9Mb2NhbGVTdHJpbmcoKX0pO1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaXZhbCk7XG4gICAgICAgICAgaXZhbCA9IHNpbmNlKGF0dHJzLnNpbmNlLCBlbGVtZW50KTtcbiAgICAgICAgfSlcbiAgICAgICAgcmV0dXJuIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY2xlYXJJbnRlcnZhbChpdmFsKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBkYXRlXG4gICAgICBpZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBhdHRycy5kYXRldGltZSkge1xuICAgICAgICBkYXRlID0gbmV3IERhdGUoYXR0cnMuZGF0ZXRpbWUpO1xuICAgICAgICAkKGVsZW1lbnQpLnRvb2x0aXAoe3RpdGxlOiBkYXRlLnRvTG9jYWxlU3RyaW5nKCl9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgYXR0cnMuZHVyYXRpb24pIHtcbiAgICAgICAgYXR0cnMuJG9ic2VydmUoJ2R1cmF0aW9uJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRleHREdXJhdGlvbihhdHRycy5kdXJhdGlvbiwgZWxlbWVudCk7XG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiB0ZXh0RHVyYXRpb24oYXR0cnMuZHVyYXRpb24sIGVsZW1lbnQpO1xuICAgICAgfVxuXG4gICAgICBhdHRycy4kb2JzZXJ2ZSgnZGF0ZXRpbWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRhdGUgPSBuZXcgRGF0ZShhdHRycy5kYXRldGltZSk7XG4gICAgICAgICQoZWxlbWVudCkudG9vbHRpcCh7dGl0bGU6IGRhdGUudG9Mb2NhbGVTdHJpbmcoKX0pO1xuICAgICAgICAkKGVsZW1lbnQpLnRleHQoJC50aW1lYWdvKGRhdGUpKTtcbiAgICAgIH0pXG4gICAgICAvLyBUT0RPOiB1c2UgbW9tZW50LmpzXG4gICAgICAkKGVsZW1lbnQpLnRleHQoJC50aW1lYWdvKGRhdGUpKTtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGVsZW1lbnQpLnRpbWVhZ28oKTtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgfTtcbn0pOyIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmRpcmVjdGl2ZShcInRvZ2dsZVwiLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogXCJBXCIsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICBpZiAoYXR0cnMudG9nZ2xlICE9PSAndG9vbHRpcCcpIHJldHVybjtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICQoZWxlbWVudCkudG9vbHRpcCgpO1xuICAgICAgfSwgMCk7XG4gICAgICBhdHRycy4kb2JzZXJ2ZSgndGl0bGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoZWxlbWVudCkudG9vbHRpcCgpO1xuICAgICAgfSk7XG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkKCcudG9vbHRpcCcpLmhpZGUoKTtcbiAgICAgICAgJChlbGVtZW50KS50b29sdGlwKCdoaWRlJyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTsiLCJ2YXIgYXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbmFwcC5maWx0ZXIoJ2Fuc2knLCBbJyRzY2UnLCBmdW5jdGlvbiAoJHNjZSkge1xuICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKCFpbnB1dCkgcmV0dXJuICcnO1xuICAgIHZhciB0ZXh0ID0gaW5wdXQucmVwbGFjZSgvXlteXFxuXFxyXSpcXHUwMDFiXFxbMksvZ20sICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFx1MDAxYlxcW0tbXlxcblxccl0qL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvW15cXG5dKlxccihbXlxcbl0pL2csICckMScpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9eW15cXG5dKlxcdTAwMWJcXFswRy9nbSwgJycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuICAgIHJldHVybiAkc2NlLnRydXN0QXNIdG1sKGFuc2lmaWx0ZXIodGV4dCkpO1xuICB9XG59XSk7XG5cbmZ1bmN0aW9uIGFuc2lwYXJzZShzdHIpIHtcbiAgLy9cbiAgLy8gSSdtIHRlcnJpYmxlIGF0IHdyaXRpbmcgcGFyc2Vycy5cbiAgLy9cbiAgdmFyIG1hdGNoaW5nQ29udHJvbCA9IG51bGwsXG4gICAgICBtYXRjaGluZ0RhdGEgPSBudWxsLFxuICAgICAgbWF0Y2hpbmdUZXh0ID0gJycsXG4gICAgICBhbnNpU3RhdGUgPSBbXSxcbiAgICAgIHJlc3VsdCA9IFtdLFxuICAgICAgb3V0cHV0ID0gXCJcIixcbiAgICAgIHN0YXRlID0ge30sXG4gICAgICBlcmFzZUNoYXI7XG5cbiAgdmFyIGhhbmRsZVJlc3VsdCA9IGZ1bmN0aW9uKHApIHtcbiAgICB2YXIgY2xhc3NlcyA9IFtdO1xuXG4gICAgcC5mb3JlZ3JvdW5kICYmIGNsYXNzZXMucHVzaChwLmZvcmVncm91bmQpO1xuICAgIHAuYmFja2dyb3VuZCAmJiBjbGFzc2VzLnB1c2goJ2JnLScgKyBwLmJhY2tncm91bmQpO1xuICAgIHAuYm9sZCAgICAgICAmJiBjbGFzc2VzLnB1c2goJ2JvbGQnKTtcbiAgICBwLml0YWxpYyAgICAgJiYgY2xhc3Nlcy5wdXNoKCdpdGFsaWMnKTtcbiAgICBpZiAoIXAudGV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY2xhc3Nlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBvdXRwdXQgKz0gcC50ZXh0XG4gICAgfVxuICAgIHZhciBzcGFuID0gJzxzcGFuIGNsYXNzPVwiJyArIGNsYXNzZXMuam9pbignICcpICsgJ1wiPicgKyBwLnRleHQgKyAnPC9zcGFuPidcbiAgICBvdXRwdXQgKz0gc3BhblxuICB9XG4gIC8vXG4gIC8vIEdlbmVyYWwgd29ya2Zsb3cgZm9yIHRoaXMgdGhpbmcgaXM6XG4gIC8vIFxcMDMzXFxbMzNtVGV4dFxuICAvLyB8ICAgICB8ICB8XG4gIC8vIHwgICAgIHwgIG1hdGNoaW5nVGV4dFxuICAvLyB8ICAgICBtYXRjaGluZ0RhdGFcbiAgLy8gbWF0Y2hpbmdDb250cm9sXG4gIC8vXG4gIC8vIEluIGZ1cnRoZXIgc3RlcHMgd2UgaG9wZSBpdCdzIGFsbCBnb2luZyB0byBiZSBmaW5lLiBJdCB1c3VhbGx5IGlzLlxuICAvL1xuXG4gIC8vXG4gIC8vIEVyYXNlcyBhIGNoYXIgZnJvbSB0aGUgb3V0cHV0XG4gIC8vXG4gIGVyYXNlQ2hhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5kZXgsIHRleHQ7XG4gICAgaWYgKG1hdGNoaW5nVGV4dC5sZW5ndGgpIHtcbiAgICAgIG1hdGNoaW5nVGV4dCA9IG1hdGNoaW5nVGV4dC5zdWJzdHIoMCwgbWF0Y2hpbmdUZXh0Lmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICBlbHNlIGlmIChyZXN1bHQubGVuZ3RoKSB7XG4gICAgICBpbmRleCA9IHJlc3VsdC5sZW5ndGggLSAxO1xuICAgICAgdGV4dCA9IHJlc3VsdFtpbmRleF0udGV4dDtcbiAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvL1xuICAgICAgICAvLyBBIHJlc3VsdCBiaXQgd2FzIGZ1bGx5IGRlbGV0ZWQsIHBvcCBpdCBvdXQgdG8gc2ltcGxpZnkgdGhlIGZpbmFsIG91dHB1dFxuICAgICAgICAvL1xuICAgICAgICByZXN1bHQucG9wKCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2luZGV4XS50ZXh0ID0gdGV4dC5zdWJzdHIoMCwgdGV4dC5sZW5ndGggLSAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobWF0Y2hpbmdDb250cm9sICE9PSBudWxsKSB7XG4gICAgICBpZiAobWF0Y2hpbmdDb250cm9sID09ICdcXDAzMycgJiYgc3RyW2ldID09ICdcXFsnKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIFdlJ3ZlIG1hdGNoZWQgZnVsbCBjb250cm9sIGNvZGUuIExldHMgc3RhcnQgbWF0Y2hpbmcgZm9ybWF0aW5nIGRhdGEuXG4gICAgICAgIC8vXG5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gXCJlbWl0XCIgbWF0Y2hlZCB0ZXh0IHdpdGggY29ycmVjdCBzdGF0ZVxuICAgICAgICAvL1xuICAgICAgICBpZiAobWF0Y2hpbmdUZXh0KSB7XG4gICAgICAgICAgc3RhdGUudGV4dCA9IG1hdGNoaW5nVGV4dDtcbiAgICAgICAgICBoYW5kbGVSZXN1bHQoc3RhdGUpO1xuICAgICAgICAgIHN0YXRlID0ge307XG4gICAgICAgICAgbWF0Y2hpbmdUZXh0ID0gXCJcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIG1hdGNoaW5nQ29udHJvbCA9IG51bGw7XG4gICAgICAgIG1hdGNoaW5nRGF0YSA9ICcnO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIFdlIGZhaWxlZCB0byBtYXRjaCBhbnl0aGluZyAtIG1vc3QgbGlrZWx5IGEgYmFkIGNvbnRyb2wgY29kZS4gV2VcbiAgICAgICAgLy8gZ28gYmFjayB0byBtYXRjaGluZyByZWd1bGFyIHN0cmluZ3MuXG4gICAgICAgIC8vXG4gICAgICAgIG1hdGNoaW5nVGV4dCArPSBtYXRjaGluZ0NvbnRyb2wgKyBzdHJbaV07XG4gICAgICAgIG1hdGNoaW5nQ29udHJvbCA9IG51bGw7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAobWF0Y2hpbmdEYXRhICE9PSBudWxsKSB7XG4gICAgICBpZiAoc3RyW2ldID09ICc7Jykge1xuICAgICAgICAvL1xuICAgICAgICAvLyBgO2Agc2VwYXJhdGVzIG1hbnkgZm9ybWF0dGluZyBjb2RlcywgZm9yIGV4YW1wbGU6IGBcXDAzM1szMzs0M21gXG4gICAgICAgIC8vIG1lYW5zIHRoYXQgYm90aCBgMzNgIGFuZCBgNDNgIHNob3VsZCBiZSBhcHBsaWVkLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUT0RPOiB0aGlzIGNhbiBiZSBzaW1wbGlmaWVkIGJ5IG1vZGlmeWluZyBzdGF0ZSBoZXJlLlxuICAgICAgICAvL1xuICAgICAgICBhbnNpU3RhdGUucHVzaChtYXRjaGluZ0RhdGEpO1xuICAgICAgICBtYXRjaGluZ0RhdGEgPSAnJztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHN0cltpXSA9PSAnbScpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gYG1gIGZpbmlzaGVkIHdob2xlIGZvcm1hdHRpbmcgY29kZS4gV2UgY2FuIHByb2NlZWQgdG8gbWF0Y2hpbmdcbiAgICAgICAgLy8gZm9ybWF0dGVkIHRleHQuXG4gICAgICAgIC8vXG4gICAgICAgIGFuc2lTdGF0ZS5wdXNoKG1hdGNoaW5nRGF0YSk7XG4gICAgICAgIG1hdGNoaW5nRGF0YSA9IG51bGw7XG4gICAgICAgIG1hdGNoaW5nVGV4dCA9ICcnO1xuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIENvbnZlcnQgbWF0Y2hlZCBmb3JtYXR0aW5nIGRhdGEgaW50byB1c2VyLWZyaWVuZGx5IHN0YXRlIG9iamVjdC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETzogRFJZLlxuICAgICAgICAvL1xuICAgICAgICBhbnNpU3RhdGUuZm9yRWFjaChmdW5jdGlvbiAoYW5zaUNvZGUpIHtcbiAgICAgICAgICBpZiAoYW5zaXBhcnNlLmZvcmVncm91bmRDb2xvcnNbYW5zaUNvZGVdKSB7XG4gICAgICAgICAgICBzdGF0ZS5mb3JlZ3JvdW5kID0gYW5zaXBhcnNlLmZvcmVncm91bmRDb2xvcnNbYW5zaUNvZGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpcGFyc2UuYmFja2dyb3VuZENvbG9yc1thbnNpQ29kZV0pIHtcbiAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmQgPSBhbnNpcGFyc2UuYmFja2dyb3VuZENvbG9yc1thbnNpQ29kZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDM5KSB7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUuZm9yZWdyb3VuZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gNDkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5iYWNrZ3JvdW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpcGFyc2Uuc3R5bGVzW2Fuc2lDb2RlXSkge1xuICAgICAgICAgICAgc3RhdGVbYW5zaXBhcnNlLnN0eWxlc1thbnNpQ29kZV1dID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMjIpIHtcbiAgICAgICAgICAgIHN0YXRlLmJvbGQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMjMpIHtcbiAgICAgICAgICAgIHN0YXRlLml0YWxpYyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAyNCkge1xuICAgICAgICAgICAgc3RhdGUudW5kZXJsaW5lID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYW5zaVN0YXRlID0gW107XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbWF0Y2hpbmdEYXRhICs9IHN0cltpXTtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChzdHJbaV0gPT0gJ1xcMDMzJykge1xuICAgICAgbWF0Y2hpbmdDb250cm9sID0gc3RyW2ldO1xuICAgIH1cbiAgICBlbHNlIGlmIChzdHJbaV0gPT0gJ1xcdTAwMDgnKSB7XG4gICAgICBlcmFzZUNoYXIoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBtYXRjaGluZ1RleHQgKz0gc3RyW2ldO1xuICAgIH1cbiAgfVxuXG4gIGlmIChtYXRjaGluZ1RleHQpIHtcbiAgICBzdGF0ZS50ZXh0ID0gbWF0Y2hpbmdUZXh0ICsgKG1hdGNoaW5nQ29udHJvbCA/IG1hdGNoaW5nQ29udHJvbCA6ICcnKTtcbiAgICBoYW5kbGVSZXN1bHQoc3RhdGUpO1xuICB9XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbmFuc2lwYXJzZS5mb3JlZ3JvdW5kQ29sb3JzID0ge1xuICAnMzAnOiAnYmxhY2snLFxuICAnMzEnOiAncmVkJyxcbiAgJzMyJzogJ2dyZWVuJyxcbiAgJzMzJzogJ3llbGxvdycsXG4gICczNCc6ICdibHVlJyxcbiAgJzM1JzogJ21hZ2VudGEnLFxuICAnMzYnOiAnY3lhbicsXG4gICczNyc6ICd3aGl0ZScsXG4gICc5MCc6ICdncmV5J1xufTtcblxuYW5zaXBhcnNlLmJhY2tncm91bmRDb2xvcnMgPSB7XG4gICc0MCc6ICdibGFjaycsXG4gICc0MSc6ICdyZWQnLFxuICAnNDInOiAnZ3JlZW4nLFxuICAnNDMnOiAneWVsbG93JyxcbiAgJzQ0JzogJ2JsdWUnLFxuICAnNDUnOiAnbWFnZW50YScsXG4gICc0Nic6ICdjeWFuJyxcbiAgJzQ3JzogJ3doaXRlJ1xufTtcblxuYW5zaXBhcnNlLnN0eWxlcyA9IHtcbiAgJzEnOiAnYm9sZCcsXG4gICczJzogJ2l0YWxpYycsXG4gICc0JzogJ3VuZGVybGluZSdcbn07XG5cbmZ1bmN0aW9uIGFuc2lmaWx0ZXIoZGF0YSwgcGxhaW50ZXh0LCBjYWNoZSkge1xuXG4gIC8vIGhhbmRsZSB0aGUgY2hhcmFjdGVycyBmb3IgXCJkZWxldGUgbGluZVwiIGFuZCBcIm1vdmUgdG8gc3RhcnQgb2YgbGluZVwiXG4gIHZhciBzdGFydHN3aXRoY3IgPSAvXlteXFxuXSpcXHJbXlxcbl0vLnRlc3QoZGF0YSk7XG4gIHZhciBvdXRwdXQgPSBhbnNpcGFyc2UoZGF0YSk7XG5cbiAgdmFyIHJlcyA9IG91dHB1dC5yZXBsYWNlKC9cXDAzMy9nLCAnJyk7XG4gIGlmIChzdGFydHN3aXRoY3IpIHJlcyA9ICdcXHInICsgcmVzO1xuXG4gIHJldHVybiByZXM7XG59XG5cbiIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmZpbHRlcigncGVyY2VudGFnZScsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCwgcHJlYykge1xuICAgIGlmICghaW5wdXQgJiYgcGFyc2VJbnQoaW5wdXQpICE9PSAwKSByZXR1cm4gJyc7XG4gICAgdmFyIGJ5ID0gTWF0aC5wb3coMTAsIHByZWMgfHwgMSlcbiAgICByZXR1cm4gcGFyc2VJbnQocGFyc2VGbG9hdChpbnB1dCkgKiBieSwgMTApL2J5ICsgJyUnXG4gIH1cbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBbJyRyb290U2NvcGUnLCAnJHEnLCBmdW5jdGlvbigkc2NvcGUsICRxKSB7XG5cbiAgZnVuY3Rpb24gc3VjY2VzcyhyZXNwb25zZSkge1xuICAgIHJldHVybiByZXNwb25zZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVycm9yKHJlc3BvbnNlKSB7XG4gICAgdmFyIHN0YXR1cyA9IHJlc3BvbnNlLnN0YXR1cztcblxuICAgIHZhciByZXNwID0gcmVzcG9uc2UuZGF0YTtcbiAgICBpZiAocmVzcCkgdHJ5IHsgcmVzcCA9IEpTT04ucGFyc2UocmVzcCk7IH0gY2F0Y2goZXJyKSB7IH1cblxuICAgIGlmIChyZXNwLm1lc3NhZ2UpIHJlc3AgPSByZXNwLm1lc3NhZ2U7XG4gICAgaWYgKCEgcmVzcCkge1xuICAgICAgcmVzcCA9ICdFcnJvciBpbiByZXNwb25zZSc7XG4gICAgICBpZiAoc3RhdHVzKSByZXNwICs9ICcgKCcgKyBzdGF0dXMgKyAnKSc7XG4gICAgfVxuXG4gICAgJHNjb3BlLiRlbWl0KCdlcnJvcicsIG5ldyBFcnJvcihyZXNwKSk7XG5cbiAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIHJldHVybiBwcm9taXNlLnRoZW4oc3VjY2VzcywgZXJyb3IpO1xuICB9XG5cbn1dOyIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVKb2JTdG9yZTtcbmZ1bmN0aW9uIGNyZWF0ZUpvYlN0b3JlKCkge1xuICByZXR1cm4gbmV3IEpvYlN0b3JlO1xufVxuXG52YXIgUEhBU0VTID0gZXhwb3J0cy5waGFzZXMgPVxuWydlbnZpcm9ubWVudCcsICdwcmVwYXJlJywgJ3Rlc3QnLCAnZGVwbG95JywgJ2NsZWFudXAnXTtcblxudmFyIHN0YXR1c0hhbmRsZXJzID0ge1xuICAnc3RhcnRlZCc6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zdGFydGVkID0gdGltZTtcbiAgICB0aGlzLnBoYXNlID0gJ2Vudmlyb25tZW50JztcbiAgICB0aGlzLnN0YXR1cyA9ICdydW5uaW5nJztcbiAgfSxcbiAgJ2Vycm9yZWQnOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICB0aGlzLmVycm9yID0gZXJyb3I7XG4gICAgdGhpcy5zdGF0dXMgPSAnZXJyb3JlZCc7XG4gIH0sXG4gICdjYW5jZWxlZCc6ICdlcnJvcmVkJyxcbiAgJ3BoYXNlLmRvbmUnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHRoaXMucGhhc2UgPSBQSEFTRVMuaW5kZXhPZihkYXRhLnBoYXNlKSArIDE7XG4gIH0sXG4gIC8vIHRoaXMgaXMganVzdCBzbyB3ZSdsbCB0cmlnZ2VyIHRoZSBcInVua25vd24gam9iXCIgbG9va3VwIHNvb25lciBvbiB0aGUgZGFzaGJvYXJkXG4gICd3YXJuaW5nJzogZnVuY3Rpb24gKHdhcm5pbmcpIHtcbiAgICBpZiAoIXRoaXMud2FybmluZ3MpIHtcbiAgICAgIHRoaXMud2FybmluZ3MgPSBbXTtcbiAgICB9XG4gICAgdGhpcy53YXJuaW5ncy5wdXNoKHdhcm5pbmcpO1xuICB9LFxuICAncGx1Z2luLWRhdGEnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBwYXRoID0gZGF0YS5wYXRoID8gW2RhdGEucGx1Z2luXS5jb25jYXQoZGF0YS5wYXRoLnNwbGl0KCcuJykpIDogW2RhdGEucGx1Z2luXVxuICAgICwgbGFzdCA9IHBhdGgucG9wKClcbiAgICAsIG1ldGhvZCA9IGRhdGEubWV0aG9kIHx8ICdyZXBsYWNlJ1xuICAgICwgcGFyZW50XG4gICAgcGFyZW50ID0gcGF0aC5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgYXR0cikge1xuICAgICAgcmV0dXJuIG9ialthdHRyXSB8fCAob2JqW2F0dHJdID0ge30pXG4gICAgfSwgdGhpcy5wbHVnaW5fZGF0YSB8fCAodGhpcy5wbHVnaW5fZGF0YSA9IHt9KSlcbiAgICBpZiAobWV0aG9kID09PSAncmVwbGFjZScpIHtcbiAgICAgIHBhcmVudFtsYXN0XSA9IGRhdGEuZGF0YVxuICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSAncHVzaCcpIHtcbiAgICAgIGlmICghcGFyZW50W2xhc3RdKSB7XG4gICAgICAgIHBhcmVudFtsYXN0XSA9IFtdXG4gICAgICB9XG4gICAgICBwYXJlbnRbbGFzdF0ucHVzaChkYXRhLmRhdGEpXG4gICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdleHRlbmQnKSB7XG4gICAgICBpZiAoIXBhcmVudFtsYXN0XSkge1xuICAgICAgICBwYXJlbnRbbGFzdF0gPSB7fVxuICAgICAgfVxuICAgICAgZXh0ZW5kKHBhcmVudFtsYXN0XSwgZGF0YS5kYXRhKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZygnSW52YWxpZCBcInBsdWdpbiBkYXRhXCIgbWV0aG9kIHJlY2VpdmVkIGZyb20gcGx1Z2luJywgZGF0YS5wbHVnaW4sIGRhdGEubWV0aG9kLCBkYXRhKVxuICAgIH1cbiAgfSxcblxuICAncGhhc2UuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5kdXJhdGlvbiA9IGRhdGEuZWxhcHNlZFxuICAgIHRoaXMucGhhc2VzW2RhdGEucGhhc2VdLmV4aXRDb2RlID0gZGF0YS5jb2RlO1xuICAgIGlmIChbJ3ByZXBhcmUnLCAnZW52aXJvbm1lbnQnLCAnY2xlYW51cCddLmluZGV4T2YoZGF0YS5waGFzZSkgIT09IC0xKSB7XG4gICAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5jb2xsYXBzZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoZGF0YS5waGFzZSA9PT0gJ3Rlc3QnKSB0aGlzLnRlc3Rfc3RhdHVzID0gZGF0YS5jb2RlO1xuICAgIGlmIChkYXRhLnBoYXNlID09PSAnZGVwbG95JykgdGhpcy5kZXBsb3lfc3RhdHVzID0gZGF0YS5jb2RlO1xuICAgIGlmICghZGF0YS5uZXh0IHx8ICF0aGlzLnBoYXNlc1tkYXRhLm5leHRdKSByZXR1cm47XG4gICAgdGhpcy5waGFzZSA9IGRhdGEubmV4dDtcbiAgICB0aGlzLnBoYXNlc1tkYXRhLm5leHRdLnN0YXJ0ZWQgPSBkYXRhLnRpbWU7XG4gIH0sXG4gICdjb21tYW5kLmNvbW1lbnQnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdmFyIHBoYXNlID0gdGhpcy5waGFzZXNbdGhpcy5waGFzZV1cbiAgICAgICwgY29tbWFuZCA9IGV4dGVuZCh7fSwgU0tFTFMuY29tbWFuZCk7XG4gICAgY29tbWFuZC5jb21tYW5kID0gZGF0YS5jb21tZW50O1xuICAgIGNvbW1hbmQuY29tbWVudCA9IHRydWU7XG4gICAgY29tbWFuZC5wbHVnaW4gPSBkYXRhLnBsdWdpbjtcbiAgICBjb21tYW5kLmZpbmlzaGVkID0gZGF0YS50aW1lO1xuICAgIHBoYXNlLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gIH0sXG4gICdjb21tYW5kLnN0YXJ0JzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQsIGRhdGEpO1xuICAgIGNvbW1hbmQuc3RhcnRlZCA9IGRhdGEudGltZTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9LFxuICAnY29tbWFuZC5kb25lJzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBwaGFzZS5jb21tYW5kc1twaGFzZS5jb21tYW5kcy5sZW5ndGggLSAxXTtcbiAgICBjb21tYW5kLmZpbmlzaGVkID0gZGF0YS50aW1lO1xuICAgIGNvbW1hbmQuZHVyYXRpb24gPSBkYXRhLmVsYXBzZWQ7XG4gICAgY29tbWFuZC5leGl0Q29kZSA9IGRhdGEuZXhpdENvZGU7XG4gICAgY29tbWFuZC5tZXJnZWQgPSBjb21tYW5kLl9tZXJnZWQ7XG4gIH0sXG4gICdzdGRvdXQnOiBmdW5jdGlvbiAodGV4dCkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdmFyIGNvbW1hbmQgPSBlbnN1cmVDb21tYW5kKHRoaXMucGhhc2VzW3RoaXMucGhhc2VdKTtcbiAgICBjb21tYW5kLm91dCArPSB0ZXh0O1xuICAgIGNvbW1hbmQuX21lcmdlZCArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLm91dCArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLm1lcmdlZCArPSB0ZXh0O1xuICAgIHRoaXMuc3RkLm1lcmdlZF9sYXRlc3QgPSB0ZXh0O1xuICB9LFxuICAnc3RkZXJyJzogZnVuY3Rpb24gKHRleHQpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBjb21tYW5kID0gZW5zdXJlQ29tbWFuZCh0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXSk7XG4gICAgY29tbWFuZC5lcnIgKz0gdGV4dDtcbiAgICBjb21tYW5kLl9tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5lcnIgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWRfbGF0ZXN0ID0gdGV4dDtcbiAgfVxufVxuXG5mdW5jdGlvbiBKb2JTdG9yZSgpIHtcbiAgdGhpcy5qb2JzID0ge1xuICAgIC8vIGRhc2hib2FyZDogZGFzaGJvYXJkLmJpbmQodGhpcyksXG4gICAgcHVibGljOiBbXSxcbiAgICB5b3VyczogW10sXG4gICAgbGltYm86IFtdXG4gIH07XG59XG52YXIgSlMgPSBKb2JTdG9yZS5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIGRhc2hib2FyZChjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ2Rhc2hib2FyZDpqb2JzJywgZnVuY3Rpb24oam9icykge1xuICAgIHNlbGYuam9icy55b3VycyA9IGpvYnMueW91cnM7XG4gICAgc2VsZi5qb2JzLnB1YmxpYyA9IGpvYnMucHVibGljO1xuICAgIHNlbGYuY2hhbmdlZCgpO1xuICB9KTtcbn1cblxuXG4vLy8gLS0tLSBKb2IgU3RvcmUgcHJvdG90eXBlIGZ1bmN0aW9uczogLS0tLVxuXG4vLy8gY29ubmVjdFxuXG5KUy5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdChzb2NrZXQsIGNoYW5nZUNhbGxiYWNrKSB7XG4gIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuICB0aGlzLmNoYW5nZUNhbGxiYWNrID0gY2hhbmdlQ2FsbGJhY2s7XG5cbiAgZm9yICh2YXIgc3RhdHVzIGluIHN0YXR1c0hhbmRsZXJzKSB7XG4gICAgc29ja2V0Lm9uKCdqb2Iuc3RhdHVzLicgKyBzdGF0dXMsIHRoaXMudXBkYXRlLmJpbmQodGhpcywgc3RhdHVzKSlcbiAgfVxuXG4gIHNvY2tldC5vbignam9iLm5ldycsIEpTLm5ld0pvYi5iaW5kKHRoaXMpKTtcbn07XG5cbi8vLyBzZXRKb2JzXG5cbkpTLnNldEpvYnMgPSBmdW5jdGlvbiBzZXRKb2JzKGpvYnMpIHtcbiAgdGhpcy5qb2JzLnlvdXJzID0gam9icy55b3VycztcbiAgdGhpcy5qb2JzLnB1YmxpYyA9IGpvYnMucHVibGljO1xufTtcblxuXG4vLy8gdXBkYXRlIC0gaGFuZGxlIHVwZGF0ZSBldmVudFxuXG5KUy51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZXZlbnQsIGFyZ3MsIGFjY2VzcywgZG9udGNoYW5nZSkge1xuICB2YXIgaWQgPSBhcmdzLnNoaWZ0KClcbiAgICAsIGpvYiA9IHRoaXMuam9iKGlkLCBhY2Nlc3MpXG4gICAgLCBoYW5kbGVyID0gc3RhdHVzSGFuZGxlcnNbZXZlbnRdO1xuXG4gIGlmICgham9iKSByZXR1cm47IC8vIHRoaXMudW5rbm93bihpZCwgZXZlbnQsIGFyZ3MsIGFjY2VzcylcbiAgaWYgKCFoYW5kbGVyKSByZXR1cm47XG4gIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIGhhbmRsZXIpIHtcbiAgICBqb2Iuc3RhdHVzID0gaGFuZGxlcjtcbiAgfSBlbHNlIHtcbiAgICBoYW5kbGVyLmFwcGx5KGpvYiwgYXJncyk7XG4gIH1cbiAgaWYgKCFkb250Y2hhbmdlKSB0aGlzLmNoYW5nZWQoKTtcbn07XG5cblxuLy8vIG5ld0pvYiAtIHdoZW4gc2VydmVyIG5vdGlmaWVzIG9mIG5ldyBqb2JcblxuSlMubmV3Sm9iID0gZnVuY3Rpb24gbmV3Sm9iKGpvYiwgYWNjZXNzKSB7XG4gIGlmICghIGpvYikgcmV0dXJuO1xuICBpZiAoQXJyYXkuaXNBcnJheShqb2IpKSBqb2IgPSBqb2JbMF07XG5cbiAgdmFyIGpvYnMgPSB0aGlzLmpvYnNbYWNjZXNzXVxuICAgICwgZm91bmQgPSAtMVxuICAgICwgb2xkO1xuXG4gIGlmICghIGpvYnMpIHJldHVybjtcblxuICBmdW5jdGlvbiBzZWFyY2goKSB7XG4gICAgZm9yICh2YXIgaT0wOyBpPGpvYnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChqb2JzW2ldLnByb2plY3QubmFtZSA9PT0gam9iLnByb2plY3QubmFtZSkge1xuICAgICAgICBmb3VuZCA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNlYXJjaCgpO1xuICBpZiAoZm91bmQgPCAwKSB7XG4gICAgLy8vIHRyeSBsaW1ib1xuICAgIGpvYnMgPSB0aGlzLmpvYnMubGltYm87XG4gICAgc2VhcmNoKCk7XG4gICAgaWYgKGZvdW5kKSB7XG4gICAgICBqb2JzID0gdGhpcy5qb2JzW2FjY2Vzc107XG4gICAgICBqb2JzLnVuc2hpZnQodGhpcy5qb2JzLmxpbWJvW2ZvdW5kXSk7XG4gICAgICB0aGlzLmpvYnMubGltYm8uc3BsaWNlKGZvdW5kLCAxKTtcbiAgICB9XG4gIH1cblxuICBpZiAoZm91bmQgPiAtMSkge1xuICAgIG9sZCA9IGpvYnMuc3BsaWNlKGZvdW5kLCAxKVswXTtcbiAgICBqb2IucHJvamVjdC5wcmV2ID0gb2xkLnByb2plY3QucHJldjtcbiAgfVxuICAvLyBpZiAoam9iLnBoYXNlcykge1xuICAvLyAgIC8vIGdldCByaWQgb2YgZXh0cmEgZGF0YSAtIHdlIGRvbid0IG5lZWQgaXQuXG4gIC8vICAgLy8gbm90ZTogdGhpcyB3b24ndCBiZSBwYXNzZWQgdXAgYW55d2F5IGZvciBwdWJsaWMgcHJvamVjdHNcbiAgLy8gICBjbGVhbkpvYihqb2IpO1xuICAvLyB9XG4gIC8vam9iLnBoYXNlID0gJ2Vudmlyb25tZW50JztcbiAgam9icy51bnNoaWZ0KGpvYik7XG4gIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuXG4vLy8gam9iIC0gZmluZCBhIGpvYiBieSBpZCBhbmQgYWNjZXNzIGxldmVsXG5cbkpTLmpvYiA9IGZ1bmN0aW9uIGpvYihpZCwgYWNjZXNzKSB7XG4gIHZhciBqb2JzID0gdGhpcy5qb2JzW2FjY2Vzc107XG4gIHZhciBqb2IgPSBzZWFyY2goaWQsIGpvYnMpO1xuICAvLyBpZiBub3QgZm91bmQsIHRyeSBsaW1ib1xuICBpZiAoISBqb2Ipe1xuICAgIGpvYiA9IHNlYXJjaChpZCwgdGhpcy5qb2JzLmxpbWJvKTtcbiAgICBpZiAoam9iKSB7XG4gICAgICBqb2JzLnVuc2hpZnQoam9iKTtcbiAgICAgIHRoaXMuam9icy5saW1iby5zcGxpY2UodGhpcy5qb2JzLmxpbWJvLmluZGV4T2Yoam9iKSwgMSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBqb2I7XG59O1xuXG5mdW5jdGlvbiBzZWFyY2goaWQsIGpvYnMpIHtcbiAgdmFyIGpvYjtcbiAgZm9yICh2YXIgaT0wOyBpPGpvYnMubGVuZ3RoOyBpKyspIHtcbiAgICBqb2IgPSBqb2JzW2ldO1xuICAgIGlmIChqb2IgJiYgam9iLl9pZCA9PT0gaWQpIHJldHVybiBqb2I7XG4gIH1cbn1cblxuXG4vLy8gY2hhbmdlZCAtIG5vdGlmaWVzIFVJIG9mIGNoYW5nZXNcblxuSlMuY2hhbmdlZCA9IGZ1bmN0aW9uIGNoYW5nZWQoKSB7XG4gIHRoaXMuY2hhbmdlQ2FsbGJhY2soKTtcbn07XG5cblxuLy8vIGxvYWQg4oCUwqBsb2FkcyBhIGpvYlxuXG5KUy5sb2FkID0gZnVuY3Rpb24gbG9hZChqb2JJZCwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNvY2tldC5lbWl0KCdidWlsZDpqb2InLCBqb2JJZCwgZnVuY3Rpb24oam9iKSB7XG4gICAgc2VsZi5uZXdKb2Ioam9iLCAnbGltYm8nKTtcbiAgICBjYihqb2IpO1xuICAgIHNlbGYuY2hhbmdlZCgpO1xuICB9KTtcbn07XG5cbmZ1bmN0aW9uIGVuc3VyZUNvbW1hbmQocGhhc2UpIHtcbiAgdmFyIGNvbW1hbmQgPSBwaGFzZS5jb21tYW5kc1twaGFzZS5jb21tYW5kcy5sZW5ndGggLSAxXTtcbiAgaWYgKCFjb21tYW5kIHx8IHR5cGVvZihjb21tYW5kLmZpbmlzaGVkKSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kKTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9XG4gIHJldHVybiBjb21tYW5kO1xufSIsImZ1bmN0aW9uIG1kNWN5Y2xlKHgsIGspIHtcbnZhciBhID0geFswXSwgYiA9IHhbMV0sIGMgPSB4WzJdLCBkID0geFszXTtcblxuYSA9IGZmKGEsIGIsIGMsIGQsIGtbMF0sIDcsIC02ODA4NzY5MzYpO1xuZCA9IGZmKGQsIGEsIGIsIGMsIGtbMV0sIDEyLCAtMzg5NTY0NTg2KTtcbmMgPSBmZihjLCBkLCBhLCBiLCBrWzJdLCAxNywgIDYwNjEwNTgxOSk7XG5iID0gZmYoYiwgYywgZCwgYSwga1szXSwgMjIsIC0xMDQ0NTI1MzMwKTtcbmEgPSBmZihhLCBiLCBjLCBkLCBrWzRdLCA3LCAtMTc2NDE4ODk3KTtcbmQgPSBmZihkLCBhLCBiLCBjLCBrWzVdLCAxMiwgIDEyMDAwODA0MjYpO1xuYyA9IGZmKGMsIGQsIGEsIGIsIGtbNl0sIDE3LCAtMTQ3MzIzMTM0MSk7XG5iID0gZmYoYiwgYywgZCwgYSwga1s3XSwgMjIsIC00NTcwNTk4Myk7XG5hID0gZmYoYSwgYiwgYywgZCwga1s4XSwgNywgIDE3NzAwMzU0MTYpO1xuZCA9IGZmKGQsIGEsIGIsIGMsIGtbOV0sIDEyLCAtMTk1ODQxNDQxNyk7XG5jID0gZmYoYywgZCwgYSwgYiwga1sxMF0sIDE3LCAtNDIwNjMpO1xuYiA9IGZmKGIsIGMsIGQsIGEsIGtbMTFdLCAyMiwgLTE5OTA0MDQxNjIpO1xuYSA9IGZmKGEsIGIsIGMsIGQsIGtbMTJdLCA3LCAgMTgwNDYwMzY4Mik7XG5kID0gZmYoZCwgYSwgYiwgYywga1sxM10sIDEyLCAtNDAzNDExMDEpO1xuYyA9IGZmKGMsIGQsIGEsIGIsIGtbMTRdLCAxNywgLTE1MDIwMDIyOTApO1xuYiA9IGZmKGIsIGMsIGQsIGEsIGtbMTVdLCAyMiwgIDEyMzY1MzUzMjkpO1xuXG5hID0gZ2coYSwgYiwgYywgZCwga1sxXSwgNSwgLTE2NTc5NjUxMCk7XG5kID0gZ2coZCwgYSwgYiwgYywga1s2XSwgOSwgLTEwNjk1MDE2MzIpO1xuYyA9IGdnKGMsIGQsIGEsIGIsIGtbMTFdLCAxNCwgIDY0MzcxNzcxMyk7XG5iID0gZ2coYiwgYywgZCwgYSwga1swXSwgMjAsIC0zNzM4OTczMDIpO1xuYSA9IGdnKGEsIGIsIGMsIGQsIGtbNV0sIDUsIC03MDE1NTg2OTEpO1xuZCA9IGdnKGQsIGEsIGIsIGMsIGtbMTBdLCA5LCAgMzgwMTYwODMpO1xuYyA9IGdnKGMsIGQsIGEsIGIsIGtbMTVdLCAxNCwgLTY2MDQ3ODMzNSk7XG5iID0gZ2coYiwgYywgZCwgYSwga1s0XSwgMjAsIC00MDU1Mzc4NDgpO1xuYSA9IGdnKGEsIGIsIGMsIGQsIGtbOV0sIDUsICA1Njg0NDY0MzgpO1xuZCA9IGdnKGQsIGEsIGIsIGMsIGtbMTRdLCA5LCAtMTAxOTgwMzY5MCk7XG5jID0gZ2coYywgZCwgYSwgYiwga1szXSwgMTQsIC0xODczNjM5NjEpO1xuYiA9IGdnKGIsIGMsIGQsIGEsIGtbOF0sIDIwLCAgMTE2MzUzMTUwMSk7XG5hID0gZ2coYSwgYiwgYywgZCwga1sxM10sIDUsIC0xNDQ0NjgxNDY3KTtcbmQgPSBnZyhkLCBhLCBiLCBjLCBrWzJdLCA5LCAtNTE0MDM3ODQpO1xuYyA9IGdnKGMsIGQsIGEsIGIsIGtbN10sIDE0LCAgMTczNTMyODQ3Myk7XG5iID0gZ2coYiwgYywgZCwgYSwga1sxMl0sIDIwLCAtMTkyNjYwNzczNCk7XG5cbmEgPSBoaChhLCBiLCBjLCBkLCBrWzVdLCA0LCAtMzc4NTU4KTtcbmQgPSBoaChkLCBhLCBiLCBjLCBrWzhdLCAxMSwgLTIwMjI1NzQ0NjMpO1xuYyA9IGhoKGMsIGQsIGEsIGIsIGtbMTFdLCAxNiwgIDE4MzkwMzA1NjIpO1xuYiA9IGhoKGIsIGMsIGQsIGEsIGtbMTRdLCAyMywgLTM1MzA5NTU2KTtcbmEgPSBoaChhLCBiLCBjLCBkLCBrWzFdLCA0LCAtMTUzMDk5MjA2MCk7XG5kID0gaGgoZCwgYSwgYiwgYywga1s0XSwgMTEsICAxMjcyODkzMzUzKTtcbmMgPSBoaChjLCBkLCBhLCBiLCBrWzddLCAxNiwgLTE1NTQ5NzYzMik7XG5iID0gaGgoYiwgYywgZCwgYSwga1sxMF0sIDIzLCAtMTA5NDczMDY0MCk7XG5hID0gaGgoYSwgYiwgYywgZCwga1sxM10sIDQsICA2ODEyNzkxNzQpO1xuZCA9IGhoKGQsIGEsIGIsIGMsIGtbMF0sIDExLCAtMzU4NTM3MjIyKTtcbmMgPSBoaChjLCBkLCBhLCBiLCBrWzNdLCAxNiwgLTcyMjUyMTk3OSk7XG5iID0gaGgoYiwgYywgZCwgYSwga1s2XSwgMjMsICA3NjAyOTE4OSk7XG5hID0gaGgoYSwgYiwgYywgZCwga1s5XSwgNCwgLTY0MDM2NDQ4Nyk7XG5kID0gaGgoZCwgYSwgYiwgYywga1sxMl0sIDExLCAtNDIxODE1ODM1KTtcbmMgPSBoaChjLCBkLCBhLCBiLCBrWzE1XSwgMTYsICA1MzA3NDI1MjApO1xuYiA9IGhoKGIsIGMsIGQsIGEsIGtbMl0sIDIzLCAtOTk1MzM4NjUxKTtcblxuYSA9IGlpKGEsIGIsIGMsIGQsIGtbMF0sIDYsIC0xOTg2MzA4NDQpO1xuZCA9IGlpKGQsIGEsIGIsIGMsIGtbN10sIDEwLCAgMTEyNjg5MTQxNSk7XG5jID0gaWkoYywgZCwgYSwgYiwga1sxNF0sIDE1LCAtMTQxNjM1NDkwNSk7XG5iID0gaWkoYiwgYywgZCwgYSwga1s1XSwgMjEsIC01NzQzNDA1NSk7XG5hID0gaWkoYSwgYiwgYywgZCwga1sxMl0sIDYsICAxNzAwNDg1NTcxKTtcbmQgPSBpaShkLCBhLCBiLCBjLCBrWzNdLCAxMCwgLTE4OTQ5ODY2MDYpO1xuYyA9IGlpKGMsIGQsIGEsIGIsIGtbMTBdLCAxNSwgLTEwNTE1MjMpO1xuYiA9IGlpKGIsIGMsIGQsIGEsIGtbMV0sIDIxLCAtMjA1NDkyMjc5OSk7XG5hID0gaWkoYSwgYiwgYywgZCwga1s4XSwgNiwgIDE4NzMzMTMzNTkpO1xuZCA9IGlpKGQsIGEsIGIsIGMsIGtbMTVdLCAxMCwgLTMwNjExNzQ0KTtcbmMgPSBpaShjLCBkLCBhLCBiLCBrWzZdLCAxNSwgLTE1NjAxOTgzODApO1xuYiA9IGlpKGIsIGMsIGQsIGEsIGtbMTNdLCAyMSwgIDEzMDkxNTE2NDkpO1xuYSA9IGlpKGEsIGIsIGMsIGQsIGtbNF0sIDYsIC0xNDU1MjMwNzApO1xuZCA9IGlpKGQsIGEsIGIsIGMsIGtbMTFdLCAxMCwgLTExMjAyMTAzNzkpO1xuYyA9IGlpKGMsIGQsIGEsIGIsIGtbMl0sIDE1LCAgNzE4Nzg3MjU5KTtcbmIgPSBpaShiLCBjLCBkLCBhLCBrWzldLCAyMSwgLTM0MzQ4NTU1MSk7XG5cbnhbMF0gPSBhZGQzMihhLCB4WzBdKTtcbnhbMV0gPSBhZGQzMihiLCB4WzFdKTtcbnhbMl0gPSBhZGQzMihjLCB4WzJdKTtcbnhbM10gPSBhZGQzMihkLCB4WzNdKTtcblxufVxuXG5mdW5jdGlvbiBjbW4ocSwgYSwgYiwgeCwgcywgdCkge1xuYSA9IGFkZDMyKGFkZDMyKGEsIHEpLCBhZGQzMih4LCB0KSk7XG5yZXR1cm4gYWRkMzIoKGEgPDwgcykgfCAoYSA+Pj4gKDMyIC0gcykpLCBiKTtcbn1cblxuZnVuY3Rpb24gZmYoYSwgYiwgYywgZCwgeCwgcywgdCkge1xucmV0dXJuIGNtbigoYiAmIGMpIHwgKCh+YikgJiBkKSwgYSwgYiwgeCwgcywgdCk7XG59XG5cbmZ1bmN0aW9uIGdnKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbnJldHVybiBjbW4oKGIgJiBkKSB8IChjICYgKH5kKSksIGEsIGIsIHgsIHMsIHQpO1xufVxuXG5mdW5jdGlvbiBoaChhLCBiLCBjLCBkLCB4LCBzLCB0KSB7XG5yZXR1cm4gY21uKGIgXiBjIF4gZCwgYSwgYiwgeCwgcywgdCk7XG59XG5cbmZ1bmN0aW9uIGlpKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbnJldHVybiBjbW4oYyBeIChiIHwgKH5kKSksIGEsIGIsIHgsIHMsIHQpO1xufVxuXG5mdW5jdGlvbiBtZDUxKHMpIHtcbnR4dCA9ICcnO1xudmFyIG4gPSBzLmxlbmd0aCxcbnN0YXRlID0gWzE3MzI1ODQxOTMsIC0yNzE3MzM4NzksIC0xNzMyNTg0MTk0LCAyNzE3MzM4NzhdLCBpO1xuZm9yIChpPTY0OyBpPD1zLmxlbmd0aDsgaSs9NjQpIHtcbm1kNWN5Y2xlKHN0YXRlLCBtZDVibGsocy5zdWJzdHJpbmcoaS02NCwgaSkpKTtcbn1cbnMgPSBzLnN1YnN0cmluZyhpLTY0KTtcbnZhciB0YWlsID0gWzAsMCwwLDAsIDAsMCwwLDAsIDAsMCwwLDAsIDAsMCwwLDBdO1xuZm9yIChpPTA7IGk8cy5sZW5ndGg7IGkrKylcbnRhaWxbaT4+Ml0gfD0gcy5jaGFyQ29kZUF0KGkpIDw8ICgoaSU0KSA8PCAzKTtcbnRhaWxbaT4+Ml0gfD0gMHg4MCA8PCAoKGklNCkgPDwgMyk7XG5pZiAoaSA+IDU1KSB7XG5tZDVjeWNsZShzdGF0ZSwgdGFpbCk7XG5mb3IgKGk9MDsgaTwxNjsgaSsrKSB0YWlsW2ldID0gMDtcbn1cbnRhaWxbMTRdID0gbio4O1xubWQ1Y3ljbGUoc3RhdGUsIHRhaWwpO1xucmV0dXJuIHN0YXRlO1xufVxuXG4vKiB0aGVyZSBuZWVkcyB0byBiZSBzdXBwb3J0IGZvciBVbmljb2RlIGhlcmUsXG4gKiB1bmxlc3Mgd2UgcHJldGVuZCB0aGF0IHdlIGNhbiByZWRlZmluZSB0aGUgTUQtNVxuICogYWxnb3JpdGhtIGZvciBtdWx0aS1ieXRlIGNoYXJhY3RlcnMgKHBlcmhhcHNcbiAqIGJ5IGFkZGluZyBldmVyeSBmb3VyIDE2LWJpdCBjaGFyYWN0ZXJzIGFuZFxuICogc2hvcnRlbmluZyB0aGUgc3VtIHRvIDMyIGJpdHMpLiBPdGhlcndpc2VcbiAqIEkgc3VnZ2VzdCBwZXJmb3JtaW5nIE1ELTUgYXMgaWYgZXZlcnkgY2hhcmFjdGVyXG4gKiB3YXMgdHdvIGJ5dGVzLS1lLmcuLCAwMDQwIDAwMjUgPSBAJS0tYnV0IHRoZW5cbiAqIGhvdyB3aWxsIGFuIG9yZGluYXJ5IE1ELTUgc3VtIGJlIG1hdGNoZWQ/XG4gKiBUaGVyZSBpcyBubyB3YXkgdG8gc3RhbmRhcmRpemUgdGV4dCB0byBzb21ldGhpbmdcbiAqIGxpa2UgVVRGLTggYmVmb3JlIHRyYW5zZm9ybWF0aW9uOyBzcGVlZCBjb3N0IGlzXG4gKiB1dHRlcmx5IHByb2hpYml0aXZlLiBUaGUgSmF2YVNjcmlwdCBzdGFuZGFyZFxuICogaXRzZWxmIG5lZWRzIHRvIGxvb2sgYXQgdGhpczogaXQgc2hvdWxkIHN0YXJ0XG4gKiBwcm92aWRpbmcgYWNjZXNzIHRvIHN0cmluZ3MgYXMgcHJlZm9ybWVkIFVURi04XG4gKiA4LWJpdCB1bnNpZ25lZCB2YWx1ZSBhcnJheXMuXG4gKi9cbmZ1bmN0aW9uIG1kNWJsayhzKSB7IC8qIEkgZmlndXJlZCBnbG9iYWwgd2FzIGZhc3Rlci4gICAqL1xudmFyIG1kNWJsa3MgPSBbXSwgaTsgLyogQW5keSBLaW5nIHNhaWQgZG8gaXQgdGhpcyB3YXkuICovXG5mb3IgKGk9MDsgaTw2NDsgaSs9NCkge1xubWQ1Ymxrc1tpPj4yXSA9IHMuY2hhckNvZGVBdChpKVxuKyAocy5jaGFyQ29kZUF0KGkrMSkgPDwgOClcbisgKHMuY2hhckNvZGVBdChpKzIpIDw8IDE2KVxuKyAocy5jaGFyQ29kZUF0KGkrMykgPDwgMjQpO1xufVxucmV0dXJuIG1kNWJsa3M7XG59XG5cbnZhciBoZXhfY2hyID0gJzAxMjM0NTY3ODlhYmNkZWYnLnNwbGl0KCcnKTtcblxuZnVuY3Rpb24gcmhleChuKVxue1xudmFyIHM9JycsIGo9MDtcbmZvcig7IGo8NDsgaisrKVxucyArPSBoZXhfY2hyWyhuID4+IChqICogOCArIDQpKSAmIDB4MEZdXG4rIGhleF9jaHJbKG4gPj4gKGogKiA4KSkgJiAweDBGXTtcbnJldHVybiBzO1xufVxuXG5mdW5jdGlvbiBoZXgoeCkge1xuZm9yICh2YXIgaT0wOyBpPHgubGVuZ3RoOyBpKyspXG54W2ldID0gcmhleCh4W2ldKTtcbnJldHVybiB4LmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBtZDUocykge1xucmV0dXJuIGhleChtZDUxKHMpKTtcbn1cblxuLyogdGhpcyBmdW5jdGlvbiBpcyBtdWNoIGZhc3RlcixcbnNvIGlmIHBvc3NpYmxlIHdlIHVzZSBpdC4gU29tZSBJRXNcbmFyZSB0aGUgb25seSBvbmVzIEkga25vdyBvZiB0aGF0XG5uZWVkIHRoZSBpZGlvdGljIHNlY29uZCBmdW5jdGlvbixcbmdlbmVyYXRlZCBieSBhbiBpZiBjbGF1c2UuICAqL1xuXG5mdW5jdGlvbiBhZGQzMihhLCBiKSB7XG5yZXR1cm4gKGEgKyBiKSAmIDB4RkZGRkZGRkY7XG59XG5cbmlmIChtZDUoJ2hlbGxvJykgIT0gJzVkNDE0MDJhYmM0YjJhNzZiOTcxOWQ5MTEwMTdjNTkyJykge1xuZnVuY3Rpb24gYWRkMzIoeCwgeSkge1xudmFyIGxzdyA9ICh4ICYgMHhGRkZGKSArICh5ICYgMHhGRkZGKSxcbm1zdyA9ICh4ID4+IDE2KSArICh5ID4+IDE2KSArIChsc3cgPj4gMTYpO1xucmV0dXJuIChtc3cgPDwgMTYpIHwgKGxzdyAmIDB4RkZGRik7XG59XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBtZDU7IiwidmFyIEpvYlN0b3JlID0gcmVxdWlyZSgnLi9qb2Jfc3RvcmUnKTtcbnZhciBqb2JTdG9yZSA9IEpvYlN0b3JlKCk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEJ1aWxkU3RyaWRlcjtcblxuZnVuY3Rpb24gQnVpbGRTdHJpZGVyKCRyZXNvdXJjZSwgJGh0dHApIHtcbiAgcmV0dXJuIG5ldyBTdHJpZGVyKCRyZXNvdXJjZSwgJGh0dHApO1xufVxuXG5cbnZhciBzb2NrZXQ7XG52YXIgc2NvcGVzID0gW107XG5cbmZ1bmN0aW9uIFN0cmlkZXIoJHJlc291cmNlLCAkaHR0cCwgb3B0cykge1xuICBpZiAoISBvcHRzKSBvcHRzID0ge307XG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnc3RyaW5nJylcbiAgICBvcHRzID0geyB1cmw6IG9wdHMgfTtcblxuICB0aGlzLnVybCA9IG9wdHMudXJsIHx8ICcvL2xvY2FsaG9zdDozMDAwJztcblxuICAvLy8gUkVTVGZ1bCBBUEkgc2V0dXBcbiAgdmFyIGFwaUJhc2UgID0gdGhpcy51cmwgKyAnL2FwaSc7XG4gIHZhciBsb2dpblVSTCA9IHRoaXMudXJsICsgJy9sb2dpbic7XG4gIHRoaXMuU2Vzc2lvbiA9ICRyZXNvdXJjZShhcGlCYXNlICsgJy9zZXNzaW9uLycpO1xuICB0aGlzLlJlcG8gICAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvOm93bmVyLzpyZXBvLycpO1xuICB0aGlzLkpvYiAgICAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvOm93bmVyLzpyZXBvL2pvYi86am9iaWQnKTtcbiAgdGhpcy5Db25maWcgID0gJHJlc291cmNlKGFwaUJhc2UgKyAnLzpvd25lci86cmVwby9jb25maWcnLCB7fSwge1xuICAgIGdldDoge1xuICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgIH0sXG4gICAgc2F2ZToge1xuICAgICAgbWV0aG9kOiAnUFVUJ1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuUmVndWxhckNvbmZpZyAgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9jb25maWcnLCB7fSwge1xuICAgIHNhdmU6IHtcbiAgICAgIG1ldGhvZDogJ1BVVCdcbiAgICB9XG4gIH0pO1xuICB0aGlzLkNvbmZpZy5CcmFuY2ggPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9jb25maWcvOmJyYW5jaFxcXFwvJywge30sIHtcbiAgICBzYXZlOiB7XG4gICAgICBtZXRob2Q6ICdQVVQnXG4gICAgfVxuICB9KTtcbiAgdGhpcy5Db25maWcuQnJhbmNoLlJ1bm5lciA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NvbmZpZy86YnJhbmNoL3J1bm5lcicsIHt9LCB7XG4gICAgc2F2ZToge1xuICAgICAgbWV0aG9kOiAnUFVUJ1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuQ29uZmlnLkJyYW5jaC5QbHVnaW4gID0gJHJlc291cmNlKHRoaXMudXJsICsgJy86b3duZXIvOnJlcG8vY29uZmlnLzpicmFuY2gvOnBsdWdpbicsIHt9LCB7XG4gICAgc2F2ZToge1xuICAgICAgbWV0aG9kOiAnUFVUJ1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuUHJvdmlkZXIgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9wcm92aWRlcicpO1xuICB0aGlzLkNhY2hlICA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2NhY2hlJyk7XG4gIHRoaXMuU3RhcnQgPSAkcmVzb3VyY2UodGhpcy51cmwgKyAnLzpvd25lci86cmVwby9zdGFydCcpO1xuICB0aGlzLktleWdlbiA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvOm93bmVyLzpyZXBvL2tleWdlbi86YnJhbmNoXFxcXC8nKTtcblxuICB0aGlzLlN0YXR1c0Jsb2NrcyA9ICRyZXNvdXJjZSh0aGlzLnVybCArICcvc3RhdHVzQmxvY2tzJywge30sIHtcbiAgICBnZXQ6IHtcbiAgICAgIG1ldGhvZDogJ0dFVCdcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMucGhhc2VzICA9IEpvYlN0b3JlLnBoYXNlcztcblxuICB0aGlzLiRodHRwID0gJGh0dHA7XG59XG5cblxudmFyIFMgPSBTdHJpZGVyLnByb3RvdHlwZTtcblxuXG4vLy8gY2hhbmdlZCAtIGludm9rZWQgd2hlbiBVSSBuZWVkcyB1cGRhdGluZ1xuZnVuY3Rpb24gY2hhbmdlZCgpIHtcbiAgc2NvcGVzLmZvckVhY2goZnVuY3Rpb24oc2NvcGUpIHtcbiAgICBzY29wZS4kZGlnZXN0KCk7XG4gIH0pO1xufVxuXG5cbi8vLy8gLS0tLSBTdHJpZGVyIHByb3RvdHlwZSBmdW5jdGlvbnNcblxuLy8vIGNvbm5lY3RcblxuUy5jb25uZWN0ID0gZnVuY3Rpb24oc2NvcGUsIGpvYnMpIHtcbiAgaWYgKCEgc29ja2V0KSB7XG4gICAgc29ja2V0ID0gaW8uY29ubmVjdCh0aGlzLnVybCk7XG5cbiAgICAvLy8gY29ubmVjdHMgam9iIHN0b3JlIHRvIG5ldyBzb2NrZXRcbiAgICBpZiAoam9icykgam9iU3RvcmUuc2V0Sm9icyhqb2JzKTtcblxuICAgIGpvYlN0b3JlLmNvbm5lY3Qoc29ja2V0LCBjaGFuZ2VkKTtcbiAgfVxuICB0aGlzLnNvY2tldCA9IHNvY2tldDtcblxuICBzY29wZXMucHVzaChzY29wZSk7XG4gIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpID0gMCA7ICEgZm91bmQgJiYgaSA8IHNjb3Blcy5sZW5ndGg7IGkgKyspIHtcbiAgICAgIGlmIChzY29wZXNbaV0gPT0gc2NvcGUpIHtcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBzY29wZXMuc3BsaWNlKGksIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuXG5cbi8vLyBkZXBsb3lcblxuUy5kZXBsb3kgPSBmdW5jdGlvbiBkZXBsb3kocHJvamVjdCkge1xuICB0aGlzLnNvY2tldC5lbWl0KCdkZXBsb3knLCBwcm9qZWN0Lm5hbWUgfHwgcHJvamVjdCk7XG59O1xuXG5TLnRlc3QgPSBmdW5jdGlvbiB0ZXN0KHByb2plY3QpIHtcbiAgdGhpcy5zb2NrZXQuZW1pdCgndGVzdCcsIHByb2plY3QubmFtZSB8fCBwcm9qZWN0KTtcbn07XG5cblxuLy8vIGpvYlxuXG5TLmpvYiA9IGZ1bmN0aW9uIGpvYihqb2JJZCwgY2IpIHtcbiAgam9iU3RvcmUubG9hZChqb2JJZCwgY2IpO1xufTtcblxuXG4vLy8gSFRUUFxuXG5TLnBvc3QgPSBmdW5jdGlvbih1cmwsIGJvZHksIGNiKSB7XG4gIHJldHVybiB0aGlzLnJlcXVlc3QoJ1BPU1QnLCB1cmwsIGJvZHksIGNiKTtcbn07XG5cblMucHV0ID0gZnVuY3Rpb24odXJsLCBib2R5LCBjYikge1xuICByZXR1cm4gdGhpcy5yZXF1ZXN0KCdQVVQnLCB1cmwsIGJvZHksIGNiKTtcbn07XG5cblMuZGVsID0gZnVuY3Rpb24odXJsLCBib2R5LCBjYikge1xuICByZXR1cm4gdGhpcy5yZXF1ZXN0KCdERUxFVEUnLCB1cmwsIGJvZHksIGNiKTtcbn07XG5cblMuZ2V0ID0gZnVuY3Rpb24odXJsLCBjYikge1xuICByZXR1cm4gdGhpcy5yZXF1ZXN0KCdHRVQnLCB1cmwsIGNiKTtcbn07XG5cblMucmVxdWVzdCA9IGZ1bmN0aW9uKG1ldGhvZCwgdXJsLCBib2R5LCBjYikge1xuICBpZiAodHlwZW9mIGJvZHkgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gYm9keTtcbiAgICBib2R5ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIHJlcSA9IHRoaXMuJGh0dHAoe1xuICAgIG1ldGhvZDogbWV0aG9kLFxuICAgIHVybDogdGhpcy51cmwgKyB1cmwsXG4gICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoYm9keSlcbiAgfSk7XG5cbiAgcmVxLnN1Y2Nlc3MoY2IpO1xuXG4gIHJldHVybiByZXE7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBoYXNLZXlzXG5cbmZ1bmN0aW9uIGhhc0tleXMoc291cmNlKSB7XG4gICAgcmV0dXJuIHNvdXJjZSAhPT0gbnVsbCAmJlxuICAgICAgICAodHlwZW9mIHNvdXJjZSA9PT0gXCJvYmplY3RcIiB8fFxuICAgICAgICB0eXBlb2Ygc291cmNlID09PSBcImZ1bmN0aW9uXCIpXG59XG4iLCJ2YXIgS2V5cyA9IHJlcXVpcmUoXCJvYmplY3Qta2V5c1wiKVxudmFyIGhhc0tleXMgPSByZXF1aXJlKFwiLi9oYXMta2V5c1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG4gICAgdmFyIHRhcmdldCA9IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgaWYgKCFoYXNLZXlzKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5cyA9IEtleXMoc291cmNlKVxuXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBrZXlzW2pdXG4gICAgICAgICAgICB0YXJnZXRbbmFtZV0gPSBzb3VyY2VbbmFtZV1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbiAoZm4pIHtcblx0dmFyIGlzRnVuYyA9ICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicgJiYgIShmbiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHx8IHRvU3RyaW5nLmNhbGwoZm4pID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHRpZiAoIWlzRnVuYyAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGlzRnVuYyA9IGZuID09PSB3aW5kb3cuc2V0VGltZW91dCB8fCBmbiA9PT0gd2luZG93LmFsZXJ0IHx8IGZuID09PSB3aW5kb3cuY29uZmlybSB8fCBmbiA9PT0gd2luZG93LnByb21wdDtcblx0fVxuXHRyZXR1cm4gaXNGdW5jO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmb3JFYWNoKG9iaiwgZm4pIHtcblx0aWYgKCFpc0Z1bmN0aW9uKGZuKSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2l0ZXJhdG9yIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXHR9XG5cdHZhciBpLCBrLFxuXHRcdGlzU3RyaW5nID0gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZycsXG5cdFx0bCA9IG9iai5sZW5ndGgsXG5cdFx0Y29udGV4dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gYXJndW1lbnRzWzJdIDogbnVsbDtcblx0aWYgKGwgPT09ICtsKSB7XG5cdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0aWYgKGNvbnRleHQgPT09IG51bGwpIHtcblx0XHRcdFx0Zm4oaXNTdHJpbmcgPyBvYmouY2hhckF0KGkpIDogb2JqW2ldLCBpLCBvYmopO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm4uY2FsbChjb250ZXh0LCBpc1N0cmluZyA/IG9iai5jaGFyQXQoaSkgOiBvYmpbaV0sIGksIG9iaik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGZvciAoayBpbiBvYmopIHtcblx0XHRcdGlmIChoYXNPd24uY2FsbChvYmosIGspKSB7XG5cdFx0XHRcdGlmIChjb250ZXh0ID09PSBudWxsKSB7XG5cdFx0XHRcdFx0Zm4ob2JqW2tdLCBrLCBvYmopO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZuLmNhbGwoY29udGV4dCwgb2JqW2tdLCBrLCBvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5rZXlzIHx8IHJlcXVpcmUoJy4vc2hpbScpO1xuXG4iLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG5cdHZhciBzdHIgPSB0b1N0cmluZy5jYWxsKHZhbHVlKTtcblx0dmFyIGlzQXJndW1lbnRzID0gc3RyID09PSAnW29iamVjdCBBcmd1bWVudHNdJztcblx0aWYgKCFpc0FyZ3VtZW50cykge1xuXHRcdGlzQXJndW1lbnRzID0gc3RyICE9PSAnW29iamVjdCBBcnJheV0nXG5cdFx0XHQmJiB2YWx1ZSAhPT0gbnVsbFxuXHRcdFx0JiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0J1xuXHRcdFx0JiYgdHlwZW9mIHZhbHVlLmxlbmd0aCA9PT0gJ251bWJlcidcblx0XHRcdCYmIHZhbHVlLmxlbmd0aCA+PSAwXG5cdFx0XHQmJiB0b1N0cmluZy5jYWxsKHZhbHVlLmNhbGxlZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cdH1cblx0cmV0dXJuIGlzQXJndW1lbnRzO1xufTtcblxuIiwiKGZ1bmN0aW9uICgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0Ly8gbW9kaWZpZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL2VzNS1zaGltXG5cdHZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuXHRcdHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcblx0XHRmb3JFYWNoID0gcmVxdWlyZSgnLi9mb3JlYWNoJyksXG5cdFx0aXNBcmdzID0gcmVxdWlyZSgnLi9pc0FyZ3VtZW50cycpLFxuXHRcdGhhc0RvbnRFbnVtQnVnID0gISh7J3RvU3RyaW5nJzogbnVsbH0pLnByb3BlcnR5SXNFbnVtZXJhYmxlKCd0b1N0cmluZycpLFxuXHRcdGhhc1Byb3RvRW51bUJ1ZyA9IChmdW5jdGlvbiAoKSB7fSkucHJvcGVydHlJc0VudW1lcmFibGUoJ3Byb3RvdHlwZScpLFxuXHRcdGRvbnRFbnVtcyA9IFtcblx0XHRcdFwidG9TdHJpbmdcIixcblx0XHRcdFwidG9Mb2NhbGVTdHJpbmdcIixcblx0XHRcdFwidmFsdWVPZlwiLFxuXHRcdFx0XCJoYXNPd25Qcm9wZXJ0eVwiLFxuXHRcdFx0XCJpc1Byb3RvdHlwZU9mXCIsXG5cdFx0XHRcInByb3BlcnR5SXNFbnVtZXJhYmxlXCIsXG5cdFx0XHRcImNvbnN0cnVjdG9yXCJcblx0XHRdLFxuXHRcdGtleXNTaGltO1xuXG5cdGtleXNTaGltID0gZnVuY3Rpb24ga2V5cyhvYmplY3QpIHtcblx0XHR2YXIgaXNPYmplY3QgPSBvYmplY3QgIT09IG51bGwgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcsXG5cdFx0XHRpc0Z1bmN0aW9uID0gdG9TdHJpbmcuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBGdW5jdGlvbl0nLFxuXHRcdFx0aXNBcmd1bWVudHMgPSBpc0FyZ3Mob2JqZWN0KSxcblx0XHRcdHRoZUtleXMgPSBbXTtcblxuXHRcdGlmICghaXNPYmplY3QgJiYgIWlzRnVuY3Rpb24gJiYgIWlzQXJndW1lbnRzKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0LmtleXMgY2FsbGVkIG9uIGEgbm9uLW9iamVjdFwiKTtcblx0XHR9XG5cblx0XHRpZiAoaXNBcmd1bWVudHMpIHtcblx0XHRcdGZvckVhY2gob2JqZWN0LCBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdFx0dGhlS2V5cy5wdXNoKHZhbHVlKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgbmFtZSxcblx0XHRcdFx0c2tpcFByb3RvID0gaGFzUHJvdG9FbnVtQnVnICYmIGlzRnVuY3Rpb247XG5cblx0XHRcdGZvciAobmFtZSBpbiBvYmplY3QpIHtcblx0XHRcdFx0aWYgKCEoc2tpcFByb3RvICYmIG5hbWUgPT09ICdwcm90b3R5cGUnKSAmJiBoYXMuY2FsbChvYmplY3QsIG5hbWUpKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKG5hbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGhhc0RvbnRFbnVtQnVnKSB7XG5cdFx0XHR2YXIgY3RvciA9IG9iamVjdC5jb25zdHJ1Y3Rvcixcblx0XHRcdFx0c2tpcENvbnN0cnVjdG9yID0gY3RvciAmJiBjdG9yLnByb3RvdHlwZSA9PT0gb2JqZWN0O1xuXG5cdFx0XHRmb3JFYWNoKGRvbnRFbnVtcywgZnVuY3Rpb24gKGRvbnRFbnVtKSB7XG5cdFx0XHRcdGlmICghKHNraXBDb25zdHJ1Y3RvciAmJiBkb250RW51bSA9PT0gJ2NvbnN0cnVjdG9yJykgJiYgaGFzLmNhbGwob2JqZWN0LCBkb250RW51bSkpIHtcblx0XHRcdFx0XHR0aGVLZXlzLnB1c2goZG9udEVudW0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoZUtleXM7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBrZXlzU2hpbTtcbn0oKSk7XG5cbiJdfQ==
;