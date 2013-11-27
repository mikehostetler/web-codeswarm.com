;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Strider = require('./strider');

var App =
exports =
module.exports =
angular.module('BrowserSwarmApp', ['ngRoute', 'ngSanitize']);

/// App Configuration

App.
  config(['$routeProvider', '$locationProvider', '$httpProvider', configureApp]).
  factory('Strider', ['$http', Strider]);

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
    when('/logout', {
      templateUrl: '/partials/logout.html',
      controller: 'LogoutCtrl'
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


},{"./http_interceptor":29,"./strider":32}],2:[function(require,module,exports){
var App = require('../app');

App.controller('AccountCtrl', ['$scope', '$sce', '$location', 'Strider', AccountCtrl]);

function AccountCtrl($scope, $sce, $location, Strider) {

  $scope.$on('nouser', function() {
    $location.path('/');
  });
  $scope.getUser();

  Strider.get('/api/account', function(reply) {
    $scope.user = reply.user;
    if (! $scope.user) return;
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
var e           = encodeURIComponent;

App.controller('ConfigCtrl', ['$scope', '$routeParams', '$sce', '$location', 'Strider', ConfigCtrl]);


function ConfigCtrl($scope, $routeParams, $sce, $location, Strider) {

  var options = {
    owner: $routeParams.owner,
    repo: $routeParams.repo
  };

  Strider.get(
    '/api/' + e(options.owner) + '/' + e(options.repo) + '/config' ,
    gotConfig);

  function gotConfig(conf) {

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
      Strider.del(
        '/' + e(options.owner) + '/' + e(options.repo) + '/cache',
        options,
        success);

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

      setTimeout(function() {
        Strider.put(
          '/' + e(options.owner) + '/' + e(options.repo) + '/config/' + e(branch.name) + '/',
          { plugin_order: data },
          success);
      });

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

      if (plugins) data.plugins = branch.plugins;

      setTimeout(function() {
        Strider.put(
          '/' + e(options.owner) + '/' + e(options.repo) + '/config/' + e(branch.name) + '/',
          data,
          success);
      });

      function success() {
        $scope.success('General config for branch ' + branch.name + ' saved.');
      }
    };

    $scope.generateKeyPair = function () {
      bootbox.confirm('Really generate a new keypair? This could break things if you have plugins that use the current ones.', function (really) {
        if (!really) return;

        Strider.post(
          '/' + e(options.owner) + '/' + e(options.repo) + '/keygen/' + e($scope.branch.name) + '/',
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

      setTimeout(function() {
        Strider.put(
          '/' + e(options.runner) + '/' + e(options.repo) + '/config/master/runner',
          data,
          success);
      });

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
      setTimeout(function() {
        Strider.post(
          '/' + e(options.owner) + '/' + e(options.repo) + '/provider/',
          data,
          success);
      });

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

      Strider.put(
        '/' + e(options.owner) + '/' + e(options.repo) + '/config/' +
          e(branch.name) + '/' + e(name),
        data,
        success);

      function success() {
        $scope.success("Config for " + name + " on branch " + branch.name + " saved.");
        $scope.configs[branch.name][name].config = data;
        next(null, data);
      }
    };

    $scope.deleteProject = function () {
      Strider.del('/api/' + e(options.owner) + '/' + e(options.repo), success);

      function success() {
        $location.path('/');
      }
    };

    $scope.startTest = function () {

      Strider.post(
        '/' + e(options.owner) + '/' + e(options.repo) + '/start',
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
      Strider.post(
        '/' + e(options.owner) + '/' + e(options.repo) + '/start',
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
        Strider.put(
          '/' + e(options.owner) + '/' + e(options.repo) + '/config',
          { public: $scope.project.public },
          success);
      });


      function success() {
        $scope.success('General config saved.');
      }
    };

  };
}
},{"../app":1,"../lib/md5":31,"./config/_fix_template":5}],5:[function(require,module,exports){
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
var e   = encodeURIComponent;

App.controller('JobCtrl', ['$scope', '$routeParams', '$sce', '$filter', '$location', '$route', 'Strider', JobCtrl]);

function JobCtrl($scope, $routeParams, $sce, $filter, $location, $route, Strider) {


  // TODO: remove this DOM stuff from the controller
  var outputConsole = document.querySelector('.console-output');

  $scope.phases = Strider.phases;
  $scope.page = 'build';

  var jobId = $routeParams.jobId;
  var options = {
    owner: $routeParams.owner,
    repo:  $routeParams.repo
  };
  var projectName = e(options.owner) + '/' + e(options.repo);

  Strider.get('/api/' + projectName + '\/', gotRepo);

  function gotRepo(repo) {
    $scope.project = repo.project;
    if (! jobId) jobId = repo && repo.job && repo.job._id;
    if (! jobId) return;

    $scope.jobs = repo.jobs;

    Strider.connect($scope, connected);


    // Object.keys($scope.job.phases).forEach(function(phaseKey) {
    //   var phase = $scope.job.phases[phaseKey];
    //   Object.keys(phase.commands).forEach(function(commandKey) {
    //     var command = phase.commands[commandKey];
    //     command.merged = $sce.trustAsHtml(command.merged);
    //   })
    // });
  }

  function connected() {
    Strider.job(jobId, $scope.project, loadedJob);
  }

  function loadedJob(job) {
    $scope.job = job;

    /// - If there is a job id on the URL redirect the user
    ///   to the new job URL.
    /// - Do not redirect the user to the new job when there
    ///   is a job id on the URL.
    if (! $routeParams.jobId) {
      Strider.store.on('newjob', onNewJob);
      $scope.$on('$destroy', function() {
        Strider.store.removeListener('newjob', onNewJob);
      });
    }

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
  }


  function onNewJob(job) {
    if (job.project.name == projectName) {
      var newPath = '/' + projectName + '/job/' + e(job._id);
      $location.path(newPath);
      $scope.$apply();
    }
  }


  Strider.get('/statusblocks', function(statusBlocks) {
    $scope.statusBlocks = statusBlocks;
    ['runner', 'provider', 'job'].forEach(function(key) {
      fixBlocks(statusBlocks, key);
    });
  });

  Strider.get('/api/session', function(user) {
    if (user.user) $scope.currentUser = user;
  });

  /// Scope functions

  $scope.clearCache = function clearCache() {
    $scope.clearingCache = true;

    Strider.del('/' + e(options.owner) + '/' + e(options.repo) + '/cache', success);

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
  //   if (jobId !== params.id) {
  //     jobId = params.id;
  //     var cached = jobman.get(jobId, function (err, job, cached) {
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
  //         if ($scope.jobs[i]._id === jobId) {
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
      '/' + encodeURIComponent(options.owner) +
      '/' + encodeURIComponent(options.repo) +
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

App.controller('LoginCtrl', ['$scope', '$location', '$rootScope', 'Strider', LoginCtrl]);

function LoginCtrl($scope, $location, $rootScope, Strider) {

  $scope.user = {email: undefined, password: undefined};

  $scope.login = function login() {
    Strider.post('/api/session', $scope.user, function() {
      $rootScope.$emit('login');
      $location.path('/dashboard');
    });
  };
}
},{"../app":1}],19:[function(require,module,exports){
var App = require('../app');

App.controller('LogoutCtrl', ['$scope', '$rootScope', '$location', 'Strider', LogoutCtrl]);

function LogoutCtrl($scope, $rootScope, $location, Strider) {

  Strider.del('/api/session', function() {
    $rootScope.$emit('logout');
    $location.path('/');
  });

}
},{"../app":1}],20:[function(require,module,exports){
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
},{"../app":1}],21:[function(require,module,exports){
var App = require('../app');

App.controller('ProjectsCtrl', ['$scope', '$sce', 'Strider', ProjectsCtrl]);

function ProjectsCtrl($scope, $sce, Strider) {

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
},{"../app":1}],22:[function(require,module,exports){
var App = require('../app');

App.controller('ReloadCtrl', ['$location', function($location) {
  window.location = $location.path();
}]);
},{"../app":1}],23:[function(require,module,exports){
var App = require('../app');

App.controller('RootCtrl', ['$scope', '$rootScope', '$location', 'Strider', RootCrtl]);

function RootCrtl($scope, $rootScope, $location, Strider) {

  function getUser() {
    Strider.get('/api/session', function(session) {
      if (session.user) {
        $scope.currentUser = session.user;
        $scope.accounts = session.user.accounts;
      } else {
       $rootScope.$broadcast('nouser');
      }
    });
  }

  $scope.getUser = function() {
    if (! $scope.currentUser) getUser();
  };

  $rootScope.$on('logout', function() {
    $scope.currentUser = undefined;
  });

  $rootScope.$on('login', getUser);

  getUser();
}
},{"../app":1}],24:[function(require,module,exports){
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
},{"../app":1}],25:[function(require,module,exports){

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
},{"../app":1}],26:[function(require,module,exports){
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
},{"../app":1}],27:[function(require,module,exports){
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


},{"../app":1}],28:[function(require,module,exports){
var App = require('../app');

App.filter('percentage', function () {
  return function (input, prec) {
    if (!input && parseInt(input) !== 0) return '';
    var by = Math.pow(10, prec || 1)
    return parseInt(parseFloat(input) * by, 10)/by + '%'
  }
});

},{"../app":1}],29:[function(require,module,exports){
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
},{}],30:[function(require,module,exports){
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
      , command = phase.commands[phase.commands.length - 1];
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

  setInterval(function() {
    console.log('STORE JOBS:', store.jobs);
  }, 5000);
}

inherits(JobStore, EventEmitter);

var JS = JobStore.prototype;


/// Dashboard Data

JS.dashboard = function dashboard(cb) {
  var self = this;
  this.socket.emit('dashboard:jobs', function(jobs) {
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
  this.jobs.yours = jobs.yours;
  this.jobs.public = jobs.public;
  this.jobs.yours.forEach(fixJob);
  this.jobs.public.forEach(fixJob);
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
},{"events":34,"util":35,"xtend":37}],31:[function(require,module,exports){
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
},{}],32:[function(require,module,exports){
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
},{"./job_store":30}],33:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],34:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!util.isNumber(n) || n < 0)
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (util.isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (util.isUndefined(handler))
    return false;

  if (util.isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (util.isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              util.isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (util.isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (util.isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!util.isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  function g() {
    this.removeListener(type, g);
    listener.apply(this, arguments);
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (util.isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (util.isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (util.isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (util.isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (util.isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};
},{"util":35}],35:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var shims = require('_shims');

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  shims.forEach(array, function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }

  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = shims.reduce(output, function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return shims.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.binarySlice === 'function'
  ;
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":33}],36:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],37:[function(require,module,exports){
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

},{"./has-keys":36,"object-keys":39}],38:[function(require,module,exports){
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


},{}],39:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":41}],40:[function(require,module,exports){
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


},{}],41:[function(require,module,exports){
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


},{"./foreach":38,"./isArguments":40}]},{},[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,27,28,24,25,26])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2FwcC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvYWNjb3VudC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvYWxlcnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2NvbmZpZy9fZml4X3RlbXBsYXRlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvY29sbGFib3JhdG9ycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL2Vudmlyb25tZW50LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvZ2l0aHViLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvaGVyb2t1LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvam9iLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvbm9kZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3J1bm5lci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3NhdWNlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvd2ViaG9va3MuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2Rhc2hib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvZXJyb3IuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2pvYi5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvbG9naW4uanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2xvZ291dC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvbWFudWFsLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9wcm9qZWN0cy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvcmVsb2FkLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9yb290LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9kaXJlY3RpdmVzL2R5bmFtaWNfY29udHJvbGxlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvZGlyZWN0aXZlcy90aW1lLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9kaXJlY3RpdmVzL3RvZ2dsZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvZmlsdGVycy9hbnNpLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9maWx0ZXJzL3BlcmNlbnRhZ2UuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2h0dHBfaW50ZXJjZXB0b3IuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2pvYl9zdG9yZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvbGliL21kNS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvc3RyaWRlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL19zaGltcy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL2V2ZW50cy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL3V0aWwuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL2hhcy1rZXlzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2ZvcmVhY2guanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2lzQXJndW1lbnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvc2hpbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgU3RyaWRlciA9IHJlcXVpcmUoJy4vc3RyaWRlcicpO1xuXG52YXIgQXBwID1cbmV4cG9ydHMgPVxubW9kdWxlLmV4cG9ydHMgPVxuYW5ndWxhci5tb2R1bGUoJ0Jyb3dzZXJTd2FybUFwcCcsIFsnbmdSb3V0ZScsICduZ1Nhbml0aXplJ10pO1xuXG4vLy8gQXBwIENvbmZpZ3VyYXRpb25cblxuQXBwLlxuICBjb25maWcoWyckcm91dGVQcm92aWRlcicsICckbG9jYXRpb25Qcm92aWRlcicsICckaHR0cFByb3ZpZGVyJywgY29uZmlndXJlQXBwXSkuXG4gIGZhY3RvcnkoJ1N0cmlkZXInLCBbJyRodHRwJywgU3RyaWRlcl0pO1xuXG5mdW5jdGlvbiBjb25maWd1cmVBcHAoJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyKSB7XG5cbiAgLy8vIEhUVFBcblxuICAvLy8gQWx3YXlzIGRvIEhUVFAgcmVxdWVzdHMgd2l0aCBjcmVkZW50aWFscyxcbiAgLy8vIGVmZmVjdGl2ZWx5IHNlbmRpbmcgb3V0IHRoZSBzZXNzaW9uIGNvb2tpZVxuICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgdmFyIGludGVyY2VwdG9yID0gcmVxdWlyZSgnLi9odHRwX2ludGVyY2VwdG9yJyk7XG5cbiAgJGh0dHBQcm92aWRlci5yZXNwb25zZUludGVyY2VwdG9ycy5wdXNoKGludGVyY2VwdG9yKTtcblxuXG4gIC8vLyBFbmFibGUgaGFzaGJhbmctbGVzcyByb3V0ZXNcblxuICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG5cblxuICAvLy8gUm91dGVzXG5cbiAgdmFyIHJlbG9hZCA9IHtcbiAgICBjb250cm9sbGVyOiAnUmVsb2FkQ3RybCcsXG4gICAgdGVtcGxhdGU6ICc8ZGl2PlBsZWFzZSB3YWl0LCByZWRpcmVjdGluZzwvZGl2PidcbiAgfTtcblxuICAkcm91dGVQcm92aWRlci5cbiAgICB3aGVuKCcvJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvaW5kZXguaHRtbCdcbiAgICB9KS5cbiAgICB3aGVuKCcvZGFzaGJvYXJkJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvZGFzaGJvYXJkL2luZGV4Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0Rhc2hib2FyZEN0cmwnLFxuICAgICAgcmVsb2FkT25TZWFyY2g6IGZhbHNlXG4gICAgfSkuXG4gICAgd2hlbignL3Byb2plY3RzJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvcHJvamVjdHMvaW5kZXguaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiAnUHJvamVjdHNDdHJsJyxcbiAgICAgIHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuICAgIH0pLlxuICAgIHdoZW4oJy9sb2dpbicsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2xvZ2luLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KS5cbiAgICB3aGVuKCcvbG9nb3V0Jywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvbG9nb3V0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0xvZ291dEN0cmwnXG4gICAgfSkuXG4gICAgd2hlbignL2FjY291bnQnLCB7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9wYXJ0aWFscy9hY2NvdW50Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0FjY291bnRDdHJsJyxcbiAgICAgIHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuICAgIH0pLlxuXG4gICAgd2hlbignL2F1dGgvZ2l0aHViJywgcmVsb2FkKS5cblxuICAgIHdoZW4oJy86b3duZXIvOnJlcG8vY29uZmlnJywge1xuICAgICAgdGVtcGxhdGVVcmw6ICcvcGFydGlhbHMvY29uZmlnL2luZGV4Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0NvbmZpZ0N0cmwnLFxuICAgICAgcmVsb2FkT25TZWFyY2g6IGZhbHNlXG4gICAgfSkuXG4gICAgd2hlbignLzpvd25lci86cmVwbycsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2pvYi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdKb2JDdHJsJ1xuICAgIH0pLlxuICAgIHdoZW4oJy86b3duZXIvOnJlcG8vam9iLzpqb2JpZCcsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2pvYi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdKb2JDdHJsJ1xuICAgIH0pXG4gIDtcblxufVxuXG4iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdBY2NvdW50Q3RybCcsIFsnJHNjb3BlJywgJyRzY2UnLCAnJGxvY2F0aW9uJywgJ1N0cmlkZXInLCBBY2NvdW50Q3RybF0pO1xuXG5mdW5jdGlvbiBBY2NvdW50Q3RybCgkc2NvcGUsICRzY2UsICRsb2NhdGlvbiwgU3RyaWRlcikge1xuXG4gICRzY29wZS4kb24oJ25vdXNlcicsIGZ1bmN0aW9uKCkge1xuICAgICRsb2NhdGlvbi5wYXRoKCcvJyk7XG4gIH0pO1xuICAkc2NvcGUuZ2V0VXNlcigpO1xuXG4gIFN0cmlkZXIuZ2V0KCcvYXBpL2FjY291bnQnLCBmdW5jdGlvbihyZXBseSkge1xuICAgICRzY29wZS51c2VyID0gcmVwbHkudXNlcjtcbiAgICBpZiAoISAkc2NvcGUudXNlcikgcmV0dXJuO1xuICAgICRzY29wZS5wcm92aWRlcnMgPSByZXBseS5wcm92aWRlcnM7XG4gICAgJHNjb3BlLnVzZXJDb25maWdzID0gcmVwbHkudXNlckNvbmZpZ3M7XG4gICAgJHNjb3BlLmFjY291bnRzID0gc2V0dXBBY2NvdW50cyhyZXBseS51c2VyKTtcblxuICAgIC8vLyBUcnVzdCBzb21lIEhUTUxcblxuICAgIE9iamVjdC5rZXlzKCRzY29wZS5wcm92aWRlcnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgcHJvdmlkZXIgPSAkc2NvcGUucHJvdmlkZXJzW2tleV07XG4gICAgICBpZiAocHJvdmlkZXIuaHRtbCkgcHJvdmlkZXIuaHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwocHJvdmlkZXIuaHRtbCk7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cygkc2NvcGUudXNlckNvbmZpZ3Muam9iKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIGpvYiA9ICRzY29wZS51c2VyQ29uZmlncy5qb2Jba2V5XTtcbiAgICAgIGlmIChqb2IuaHRtbCkgam9iLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKGpvYi5odG1sKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5kZWxldGVBY2NvdW50ID0gZnVuY3Rpb24gKGFjY291bnQpIHtcbiAgICAgIGlmIChhY2NvdW50LnVuc2F2ZWQpIHtcbiAgICAgICAgdmFyIGlkeCA9ICRzY29wZS5hY2NvdW50c1thY2NvdW50LnByb3ZpZGVyXS5pbmRleE9mKGFjY291bnQpO1xuICAgICAgICAkc2NvcGUuYWNjb3VudHNbYWNjb3VudC5wcm92aWRlcl0uc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIGlkeCA9ICRzY29wZS51c2VyLmFjY291bnRzLmluZGV4T2YoYWNjb3VudCk7XG4gICAgICAgICRzY29wZS51c2VyLmFjY291bnRzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnQWNjb3VudCByZW1vdmVkJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgU3RyaWRlci5kZWwoJy9hcGkvYWNjb3VudC8nICsgYWNjb3VudC5wcm92aWRlciArICcvJyArIGFjY291bnQuaWQsIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICB2YXIgaWR4ID0gJHNjb3BlLmFjY291bnRzW2FjY291bnQucHJvdmlkZXJdLmluZGV4T2YoYWNjb3VudCk7XG4gICAgICAgICRzY29wZS5hY2NvdW50c1thY2NvdW50LnByb3ZpZGVyXS5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgaWR4ID0gJHNjb3BlLnVzZXIuYWNjb3VudHMuaW5kZXhPZihhY2NvdW50KTtcbiAgICAgICAgJHNjb3BlLnVzZXIuYWNjb3VudHMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdBY2NvdW50IHJlbW92ZWQnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEFjY291bnQgPSBmdW5jdGlvbiAocHJvdmlkZXIpIHtcbiAgICAgIHZhciBpZCA9IDBcbiAgICAgICAgLCBhaWQ7XG4gICAgICBpZiAoISRzY29wZS5hY2NvdW50c1twcm92aWRlcl0pIHtcbiAgICAgICAgJHNjb3BlLmFjY291bnRzW3Byb3ZpZGVyXSA9IFtdO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS5hY2NvdW50c1twcm92aWRlcl0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYWlkID0gcGFyc2VJbnQoJHNjb3BlLmFjY291bnRzW3Byb3ZpZGVyXVtpXS5pZCwgMTApO1xuICAgICAgICBpZiAoYWlkID49IGlkKSB7XG4gICAgICAgICAgaWQgPSBhaWQgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgYWNjdCA9IHtcbiAgICAgICAgaWQ6IGlkLFxuICAgICAgICBwcm92aWRlcjogcHJvdmlkZXIsXG4gICAgICAgIHRpdGxlOiBwcm92aWRlciArICcgJyArIGlkLFxuICAgICAgICBsYXN0X3VwZGF0ZWQ6IG5ldyBEYXRlKCksXG4gICAgICAgIGNvbmZpZzoge30sXG4gICAgICAgIGNhY2hlOiBbXSxcbiAgICAgICAgdW5zYXZlZDogdHJ1ZVxuICAgICAgfTtcbiAgICAgICRzY29wZS5hY2NvdW50c1twcm92aWRlcl0ucHVzaChhY2N0KTtcbiAgICAgICRzY29wZS51c2VyLmFjY291bnRzLnB1c2goYWNjdCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlQWNjb3VudCA9IGZ1bmN0aW9uIChwcm92aWRlciwgYWNjb3VudCwgbmV4dCkge1xuXG4gICAgICBTdHJpZGVyLnB1dChcbiAgICAgICAgJy9hcGkvYWNjb3VudC8nICtcbiAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQocHJvdmlkZXIpICtcbiAgICAgICAgICAnLycgKyBlbmNvZGVVUklDb21wb25lbnQoYWNjb3VudC5pZCksXG4gICAgICAgIGFjY291bnQsXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICBkZWxldGUgYWNjb3VudC51bnNhdmVkO1xuICAgICAgICBuZXh0KCk7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdBY2NvdW50IHNhdmVkJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jaGFuZ2VQYXNzd29yZCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgU3RyaWRlci5wb3N0KCcvYXBpL2FjY291bnQvcGFzc3dvcmQnLCB7cGFzc3dvcmQ6ICRzY29wZS5wYXNzd29yZH0sIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUucGFzc3dvcmQgPSAnJztcbiAgICAgICAgJHNjb3BlLmNvbmZpcm1fcGFzc3dvcmQgPSAnJztcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ1Bhc3N3b3JkIGNoYW5nZWQnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNoYW5nZUVtYWlsID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICBTdHJpZGVyLnBvc3QoJy9hcGkvYWNjb3VudC9lbWFpbCcsIHtlbWFpbDokc2NvcGUudXNlci5lbWFpbH0sIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnRW1haWwgc3VjY2Vzc2Z1bGx5IGNoYW5nZWQnKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbn1cblxuXG5mdW5jdGlvbiBzZXR1cEFjY291bnRzKHVzZXIpIHtcbiAgdmFyIGFjY291bnRzID0ge307XG4gIGlmICghdXNlci5hY2NvdW50cyB8fCAhdXNlci5hY2NvdW50cy5sZW5ndGgpIHJldHVybiBhY2NvdW50cztcbiAgZm9yICh2YXIgaT0wOyBpPHVzZXIuYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoIWFjY291bnRzW3VzZXIuYWNjb3VudHNbaV0ucHJvdmlkZXJdKSB7XG4gICAgICBhY2NvdW50c1t1c2VyLmFjY291bnRzW2ldLnByb3ZpZGVyXSA9IFtdO1xuICAgIH1cbiAgICBhY2NvdW50c1t1c2VyLmFjY291bnRzW2ldLnByb3ZpZGVyXS5wdXNoKHVzZXIuYWNjb3VudHNbaV0pO1xuICB9XG4gIHJldHVybiBhY2NvdW50cztcbn1cblxuXG5BcHAuY29udHJvbGxlcignQWNjb3VudC5Qcm92aWRlckNvbnRyb2xsZXInLCBbJyRzY29wZScsIFByb3ZpZGVyQ3RybF0pO1xuXG5mdW5jdGlvbiBQcm92aWRlckN0cmwoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XG5cbiAgJHNjb3BlLmluaXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgJHNjb3BlLiR3YXRjaCgnYWNjb3VudC5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgICAkc2NvcGUuc2F2ZUFjY291bnQobmFtZSwgJHNjb3BlLmFjY291bnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuXG5BcHAuY29udHJvbGxlcignQWNjb3VudC5Kb2JDb250cm9sbGVyJywgWyckc2NvcGUnLCAnJGVsZW1lbnQnLCAnJGF0dHJzJywgSm9iQ29udHJvbGxlcl0pO1xuXG5mdW5jdGlvbiBKb2JDb250cm9sbGVyKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xuXG4gICRzY29wZS5pbml0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgICRzY29wZS4kd2F0Y2goJ3VzZXIuam9icGx1Z2luc1tcIicgKyBuYW1lICsgJ1wiXScsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICAgIH0pO1xuICB9XG59IiwiXG52YXIgYXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbmFwcC5jb250cm9sbGVyKCdBbGVydHNDdHJsJywgWyckc2NvcGUnLCAnJHNjZScsIEFsZXJ0c0N0cmxdKTtcblxuZnVuY3Rpb24gQWxlcnRzQ3RybCgkc2NvcGUsICRzY2UpIHtcbiAgJHNjb3BlLm1lc3NhZ2UgPSBudWxsO1xuXG4gICRzY29wZS5lcnJvciA9IGZ1bmN0aW9uICh0ZXh0LCBkaWdlc3QpIHtcbiAgICAkc2NvcGUubWVzc2FnZSA9IHtcbiAgICAgIHRleHQ6ICRzY2UudHJ1c3RBc0h0bWwodGV4dCksXG4gICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgc2hvd2luZzogdHJ1ZVxuICAgIH07XG4gICAgaWYgKGRpZ2VzdCkgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgfTtcblxuICAkc2NvcGUuaW5mbyA9IGZ1bmN0aW9uICh0ZXh0LCBkaWdlc3QpIHtcbiAgICAkc2NvcGUubWVzc2FnZSA9IHtcbiAgICAgIHRleHQ6ICRzY2UudHJ1c3RBc0h0bWwodGV4dCksXG4gICAgICB0eXBlOiAnaW5mbycsXG4gICAgICBzaG93aW5nOiB0cnVlXG4gICAgfTtcbiAgICBpZiAoZGlnZXN0KSAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICB9O1xuICB2YXIgd2FpdFRpbWUgPSBudWxsO1xuXG4gICRzY29wZS5zdWNjZXNzID0gZnVuY3Rpb24gKHRleHQsIGRpZ2VzdCwgc3RpY2t5KSB7XG4gICAgaWYgKHdhaXRUaW1lKSB7XG4gICAgICBjbGVhclRpbWVvdXQod2FpdFRpbWUpO1xuICAgICAgd2FpdFRpbWUgPSBudWxsO1xuICAgIH1cbiAgICBpZiAoY2xlYXJUaW1lKSB7XG4gICAgICBjbGVhclRpbWVvdXQoY2xlYXJUaW1lKTtcbiAgICAgIGNsZWFyVGltZSA9IG51bGw7XG4gICAgfVxuICAgICRzY29wZS5tZXNzYWdlID0ge1xuICAgICAgdGV4dDogJHNjZS50cnVzdEFzSHRtbCgnPHN0cm9uZz5Eb25lLjwvc3Ryb25nPiAnICsgdGV4dCksXG4gICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICBzaG93aW5nOiB0cnVlXG4gICAgfTtcbiAgICBpZiAoIXN0aWNreSkge1xuICAgICAgd2FpdFRpbWUgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLmNsZWFyTWVzc2FnZSgpO1xuICAgICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgfSwgNTAwMCk7XG4gICAgfVxuICAgIGlmIChkaWdlc3QpICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gIH07XG4gIHZhciBjbGVhclRpbWUgPSBudWxsO1xuXG4gICRzY29wZS5jbGVhck1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGNsZWFyVGltZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KGNsZWFyVGltZSk7XG4gICAgfVxuICAgIGlmICgkc2NvcGUubWVzc2FnZSkge1xuICAgICAgJHNjb3BlLm1lc3NhZ2Uuc2hvd2luZyA9IGZhbHNlO1xuICAgIH1cbiAgICBjbGVhclRpbWUgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGNsZWFyVGltZSA9IG51bGw7XG4gICAgICAkc2NvcGUubWVzc2FnZSA9IG51bGw7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0sIDEwMDApO1xuICB9O1xufSIsInZhciBtZDUgICAgICAgICA9IHJlcXVpcmUoJy4uL2xpYi9tZDUnKTtcbnZhciBBcHAgICAgICAgICA9IHJlcXVpcmUoJy4uL2FwcCcpO1xudmFyIGZpeFRlbXBsYXRlID0gcmVxdWlyZSgnLi9jb25maWcvX2ZpeF90ZW1wbGF0ZScpO1xudmFyIGUgICAgICAgICAgID0gZW5jb2RlVVJJQ29tcG9uZW50O1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnQ3RybCcsIFsnJHNjb3BlJywgJyRyb3V0ZVBhcmFtcycsICckc2NlJywgJyRsb2NhdGlvbicsICdTdHJpZGVyJywgQ29uZmlnQ3RybF0pO1xuXG5cbmZ1bmN0aW9uIENvbmZpZ0N0cmwoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRzY2UsICRsb2NhdGlvbiwgU3RyaWRlcikge1xuXG4gIHZhciBvcHRpb25zID0ge1xuICAgIG93bmVyOiAkcm91dGVQYXJhbXMub3duZXIsXG4gICAgcmVwbzogJHJvdXRlUGFyYW1zLnJlcG9cbiAgfTtcblxuICBTdHJpZGVyLmdldChcbiAgICAnL2FwaS8nICsgZShvcHRpb25zLm93bmVyKSArICcvJyArIGUob3B0aW9ucy5yZXBvKSArICcvY29uZmlnJyAsXG4gICAgZ290Q29uZmlnKTtcblxuICBmdW5jdGlvbiBnb3RDb25maWcoY29uZikge1xuXG4gICAgLy8vIEZpeCBhbmQgdHJ1c3QgcmVtb3RlIEhUTUxcblxuICAgIE9iamVjdC5rZXlzKGNvbmYucGx1Z2lucykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGNvbmYucGx1Z2luc1trZXldLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKFxuICAgICAgICBmaXhUZW1wbGF0ZShjb25mLnBsdWdpbnNba2V5XS5odG1sKSk7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhjb25mLnJ1bm5lcnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBjb25mLnJ1bm5lcnNba2V5XS5odG1sID0gJHNjZS50cnVzdEFzSHRtbChcbiAgICAgICAgZml4VGVtcGxhdGUoY29uZi5ydW5uZXJzW2tleV0uaHRtbCkpO1xuICAgIH0pO1xuXG4gICAgaWYgKGNvbmYucHJvdmlkZXIpIHtcbiAgICAgIGNvbmYucHJvdmlkZXIuaHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwoXG4gICAgICAgIGZpeFRlbXBsYXRlKGNvbmYucHJvdmlkZXIuaHRtbCkpO1xuICAgIH1cblxuICAgIC8vLyBHZXQgYWxsIHRoZSBjb25mIGludG8gdGhlIHNjb3BlIGZvciByZW5kZXJpbmdcblxuICAgICRzY29wZS5wcm9qZWN0ID0gY29uZi5wcm9qZWN0O1xuICAgICRzY29wZS5wcm92aWRlciA9IGNvbmYucHJvdmlkZXI7XG4gICAgJHNjb3BlLnBsdWdpbnMgPSBjb25mLnBsdWdpbnM7XG4gICAgJHNjb3BlLnJ1bm5lcnMgPSBjb25mLnJ1bm5lcnM7XG4gICAgJHNjb3BlLmJyYW5jaGVzID0gY29uZi5icmFuY2hlcyB8fCBbXTtcbiAgICAkc2NvcGUuc3RhdHVzQmxvY2tzID0gY29uZi5zdGF0dXNCbG9ja3M7XG4gICAgJHNjb3BlLmNvbGxhYm9yYXRvcnMgPSBjb25mLmNvbGxhYm9yYXRvcnM7XG4gICAgJHNjb3BlLnVzZXJJc0NyZWF0b3IgPSBjb25mLnVzZXJJc0NyZWF0b3I7XG4gICAgJHNjb3BlLnVzZXJDb25maWdzID0gY29uZi51c2VyQ29uZmlncztcbiAgICAkc2NvcGUuY29uZmlndXJlZCA9IHt9O1xuXG4gICAgJHNjb3BlLmJyYW5jaCA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzWzBdO1xuICAgICRzY29wZS5kaXNhYmxlZF9wbHVnaW5zID0ge307XG4gICAgJHNjb3BlLmNvbmZpZ3MgPSB7fTtcbiAgICAkc2NvcGUucnVubmVyQ29uZmlncyA9IHt9O1xuXG4gICAgJHNjb3BlLmFwaV9yb290ID0gJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvYXBpLyc7XG5cbiAgICAkc2NvcGUucmVmcmVzaEJyYW5jaGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gVE9ETyBpbXBsZW1lbnRcbiAgICAgIHRocm93IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEVuYWJsZWQgPSBmdW5jdGlvbiAocGx1Z2luLCBlbmFibGVkKSB7XG4gICAgICAkc2NvcGUuY29uZmlnc1skc2NvcGUuYnJhbmNoLm5hbWVdW3BsdWdpbl0uZW5hYmxlZCA9IGVuYWJsZWQ7XG4gICAgICBzYXZlUGx1Z2luT3JkZXIoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmVQbHVnaW5PcmRlciA9IHNhdmVQbHVnaW5PcmRlcjtcblxuICAgICRzY29wZS5zd2l0Y2hUb01hc3RlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUucHJvamVjdC5icmFuY2hlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV0ubmFtZSA9PT0gJ21hc3RlcicpIHtcbiAgICAgICAgICAkc2NvcGUuYnJhbmNoID0gJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV07XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jbGVhckNhY2hlID0gZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLmNsZWFyaW5nQ2FjaGUgPSB0cnVlO1xuICAgICAgU3RyaWRlci5kZWwoXG4gICAgICAgICcvJyArIGUob3B0aW9ucy5vd25lcikgKyAnLycgKyBlKG9wdGlvbnMucmVwbykgKyAnL2NhY2hlJyxcbiAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5jbGVhcmluZ0NhY2hlID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdDbGVhcmVkIHRoZSBjYWNoZScpO1xuICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS50b2dnbGVCcmFuY2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJHNjb3BlLmJyYW5jaC5taXJyb3JfbWFzdGVyKSB7XG4gICAgICAgICRzY29wZS5icmFuY2gubWlycm9yX21hc3RlciA9IGZhbHNlO1xuICAgICAgICB2YXIgbmFtZSA9ICRzY29wZS5icmFuY2gubmFtZVxuICAgICAgICAgICwgbWFzdGVyO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLnByb2plY3QuYnJhbmNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbaV0ubmFtZSA9PT0gJ21hc3RlcicpIHtcbiAgICAgICAgICAgIG1hc3RlciA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmFuY2ggPSAkLmV4dGVuZCh0cnVlLCAkc2NvcGUuYnJhbmNoLCBtYXN0ZXIpO1xuICAgICAgICAkc2NvcGUuYnJhbmNoLm5hbWUgPSBuYW1lO1xuICAgICAgICBpbml0QnJhbmNoKCRzY29wZS5icmFuY2gpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaC5taXJyb3JfbWFzdGVyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zYXZlR2VuZXJhbEJyYW5jaCh0cnVlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYnJhbmNoLm1pcnJvcl9tYXN0ZXInLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdGFiID0gdmFsdWUgJiYgdmFsdWUubmFtZSA9PT0gJ21hc3RlcicgPyAncHJvamVjdCcgOiAnYmFzaWMnO1xuICAgICAgICAkKCcjJyArIHRhYiArICctdGFiLWhhbmRsZScpLnRhYignc2hvdycpO1xuICAgICAgICAkKCcudGFiLXBhbmUuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjdGFiLScgKyB0YWIpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgIH0sIDApO1xuICAgIH0pO1xuICAgICRzY29wZS4kd2F0Y2goJ2JyYW5jaCcsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0YWIgPSB2YWx1ZSAmJiB2YWx1ZS5uYW1lID09PSAnbWFzdGVyJyA/ICdwcm9qZWN0JyA6ICdiYXNpYyc7XG4gICAgICAgICQoJyMnICsgdGFiICsgJy10YWItaGFuZGxlJykudGFiKCdzaG93Jyk7XG4gICAgICAgICQoJy50YWItcGFuZS5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyN0YWItJyArIHRhYikuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgfSwgMCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UnVubmVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICRzY29wZS5icmFuY2gucnVubmVyID0ge1xuICAgICAgICBpZDogbmFtZSxcbiAgICAgICAgY29uZmlnOiAkc2NvcGUucnVubmVyQ29uZmlnc1tuYW1lXVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQ29uZmlndXJlZCgpIHtcbiAgICAgIHZhciBwbHVnaW5zID0gJHNjb3BlLmJyYW5jaC5wbHVnaW5zO1xuICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbJHNjb3BlLmJyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgZm9yICh2YXIgaT0wOyBpPHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbJHNjb3BlLmJyYW5jaC5uYW1lXVtwbHVnaW5zW2ldLmlkXSA9IHRydWU7XG4gICAgICB9XG4gICAgICBzYXZlUGx1Z2luT3JkZXIoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlUGx1Z2luT3JkZXIoKSB7XG4gICAgICB2YXIgcGx1Z2lucyA9ICRzY29wZS5icmFuY2gucGx1Z2luc1xuICAgICAgICAsIGJyYW5jaCA9ICRzY29wZS5icmFuY2hcbiAgICAgICAgLCBkYXRhID0gW107XG5cbiAgICAgIGZvciAodmFyIGk9MDsgaTxwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRhdGEucHVzaCh7XG4gICAgICAgICAgaWQ6IHBsdWdpbnNbaV0uaWQsXG4gICAgICAgICAgZW5hYmxlZDogcGx1Z2luc1tpXS5lbmFibGVkLFxuICAgICAgICAgIHNob3dTdGF0dXM6IHBsdWdpbnNbaV0uc2hvd1N0YXR1c1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgU3RyaWRlci5wdXQoXG4gICAgICAgICAgJy8nICsgZShvcHRpb25zLm93bmVyKSArICcvJyArIGUob3B0aW9ucy5yZXBvKSArICcvY29uZmlnLycgKyBlKGJyYW5jaC5uYW1lKSArICcvJyxcbiAgICAgICAgICB7IHBsdWdpbl9vcmRlcjogZGF0YSB9LFxuICAgICAgICAgIHN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdQbHVnaW4gb3JkZXIgb24gYnJhbmNoICcgKyBicmFuY2gubmFtZSArICcgc2F2ZWQuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gb3B0aW9ucyBmb3IgdGhlIGluVXNlIHBsdWdpbiBzb3J0YWJsZVxuICAgICRzY29wZS5pblVzZU9wdGlvbnMgPSB7XG4gICAgICBjb25uZWN0V2l0aDogJy5kaXNhYmxlZC1wbHVnaW5zLWxpc3QnLFxuICAgICAgZGlzdGFuY2U6IDUsXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIChlLCB1aSkge1xuICAgICAgICB1cGRhdGVDb25maWd1cmVkKCk7XG4gICAgICB9LFxuICAgICAgcmVjZWl2ZTogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgIHVwZGF0ZUNvbmZpZ3VyZWQoKTtcbiAgICAgICAgdmFyIHBsdWdpbnMgPSAkc2NvcGUuYnJhbmNoLnBsdWdpbnM7XG4gICAgICAgIHBsdWdpbnNbdWkuaXRlbS5pbmRleCgpXS5lbmFibGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5pdEJyYW5jaChicmFuY2gpIHtcbiAgICAgIHZhciBwbHVnaW5zO1xuXG4gICAgICAkc2NvcGUuY29uZmlndXJlZFticmFuY2gubmFtZV0gPSB7fTtcbiAgICAgICRzY29wZS5jb25maWdzW2JyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdID0ge307XG4gICAgICAkc2NvcGUuZGlzYWJsZWRfcGx1Z2luc1ticmFuY2gubmFtZV0gPSBbXTtcblxuICAgICAgaWYgKCFicmFuY2gubWlycm9yX21hc3Rlcikge1xuICAgICAgICBwbHVnaW5zID0gYnJhbmNoLnBsdWdpbnM7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbYnJhbmNoLm5hbWVdW3BsdWdpbnNbaV0uaWRdID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luc1tpXS5pZF0gPSBwbHVnaW5zW2ldO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIHBsdWdpbiBpbiAkc2NvcGUucGx1Z2lucykge1xuICAgICAgICBpZiAoJHNjb3BlLmNvbmZpZ3VyZWRbYnJhbmNoLm5hbWVdW3BsdWdpbl0pIGNvbnRpbnVlO1xuICAgICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luXSA9IHtcbiAgICAgICAgICBpZDogcGx1Z2luLFxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgY29uZmlnOiB7fVxuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuZGlzYWJsZWRfcGx1Z2luc1ticmFuY2gubmFtZV0ucHVzaCgkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bcGx1Z2luXSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghYnJhbmNoLm1pcnJvcl9tYXN0ZXIpIHtcbiAgICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdW2JyYW5jaC5ydW5uZXIuaWRdID0gYnJhbmNoLnJ1bm5lci5jb25maWc7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBydW5uZXIgaW4gJHNjb3BlLnJ1bm5lcnMpIHtcbiAgICAgICAgaWYgKCFicmFuY2gubWlycm9yX21hc3RlciAmJiBydW5uZXIgPT09IGJyYW5jaC5ydW5uZXIuaWQpIGNvbnRpbnVlO1xuICAgICAgICAkc2NvcGUucnVubmVyQ29uZmlnc1ticmFuY2gubmFtZV1bcnVubmVyXSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBpbml0UGx1Z2lucygpIHtcbiAgICAgIHZhciBicmFuY2hlcyA9ICRzY29wZS5wcm9qZWN0LmJyYW5jaGVzXG4gICAgICBmb3IgKHZhciBpPTA7IGk8YnJhbmNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW5pdEJyYW5jaChicmFuY2hlc1tpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHNjb3BlLnNhdmVHZW5lcmFsQnJhbmNoID0gZnVuY3Rpb24gKHBsdWdpbnMpIHtcbiAgICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoXG4gICAgICAgICwgZGF0YSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZTogYnJhbmNoLmFjdGl2ZSxcbiAgICAgICAgICAgIHByaXZrZXk6IGJyYW5jaC5wcml2a2V5LFxuICAgICAgICAgICAgcHVia2V5OiBicmFuY2gucHVia2V5LFxuICAgICAgICAgICAgZW52S2V5czogYnJhbmNoLmVudktleXMsXG4gICAgICAgICAgICBtaXJyb3JfbWFzdGVyOiBicmFuY2gubWlycm9yX21hc3RlcixcbiAgICAgICAgICAgIGRlcGxveV9vbl9ncmVlbjogYnJhbmNoLmRlcGxveV9vbl9ncmVlbixcbiAgICAgICAgICAgIHJ1bm5lcjogYnJhbmNoLnJ1bm5lclxuICAgICAgICAgIH07XG5cbiAgICAgIGlmIChwbHVnaW5zKSBkYXRhLnBsdWdpbnMgPSBicmFuY2gucGx1Z2lucztcblxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgU3RyaWRlci5wdXQoXG4gICAgICAgICAgJy8nICsgZShvcHRpb25zLm93bmVyKSArICcvJyArIGUob3B0aW9ucy5yZXBvKSArICcvY29uZmlnLycgKyBlKGJyYW5jaC5uYW1lKSArICcvJyxcbiAgICAgICAgICBkYXRhLFxuICAgICAgICAgIHN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdHZW5lcmFsIGNvbmZpZyBmb3IgYnJhbmNoICcgKyBicmFuY2gubmFtZSArICcgc2F2ZWQuJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5nZW5lcmF0ZUtleVBhaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBib290Ym94LmNvbmZpcm0oJ1JlYWxseSBnZW5lcmF0ZSBhIG5ldyBrZXlwYWlyPyBUaGlzIGNvdWxkIGJyZWFrIHRoaW5ncyBpZiB5b3UgaGF2ZSBwbHVnaW5zIHRoYXQgdXNlIHRoZSBjdXJyZW50IG9uZXMuJywgZnVuY3Rpb24gKHJlYWxseSkge1xuICAgICAgICBpZiAoIXJlYWxseSkgcmV0dXJuO1xuXG4gICAgICAgIFN0cmlkZXIucG9zdChcbiAgICAgICAgICAnLycgKyBlKG9wdGlvbnMub3duZXIpICsgJy8nICsgZShvcHRpb25zLnJlcG8pICsgJy9rZXlnZW4vJyArIGUoJHNjb3BlLmJyYW5jaC5uYW1lKSArICcvJyxcbiAgICAgICAgICB7fSxcbiAgICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICAkc2NvcGUuYnJhbmNoLnByaXZrZXkgPSBkYXRhLnByaXZrZXk7XG4gICAgICAgICAgJHNjb3BlLmJyYW5jaC5wdWJrZXkgPSBkYXRhLnB1YmtleTtcbiAgICAgICAgICAkc2NvcGUuc3VjY2VzcygnR2VuZXJhdGVkIG5ldyBzc2gga2V5cGFpcicpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaW5pdFBsdWdpbnMoKTtcblxuICAgICRzY29wZS5ncmF2YXRhciA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgaWYgKCFlbWFpbCkgcmV0dXJuICcnO1xuICAgICAgdmFyIGhhc2ggPSBtZDUoZW1haWwudG9Mb3dlckNhc2UoKSk7XG4gICAgICByZXR1cm4gJ2h0dHBzOi8vc2VjdXJlLmdyYXZhdGFyLmNvbS9hdmF0YXIvJyArIGhhc2ggKyAnP2Q9aWRlbnRpY29uJztcbiAgICB9XG5cbiAgICAvLyB0b2RvOiBwYXNzIGluIG5hbWU/XG4gICAgJHNjb3BlLnJ1bm5lckNvbmZpZyA9IGZ1bmN0aW9uIChicmFuY2gsIGRhdGEsIG5leHQpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIG5leHQgPSBkYXRhO1xuICAgICAgICBkYXRhID0gYnJhbmNoO1xuICAgICAgICBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgfVxuICAgICAgdmFyIG5hbWUgPSAkc2NvcGUuYnJhbmNoLnJ1bm5lci5pZDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gJHNjb3BlLnJ1bm5lckNvbmZpZ3NbbmFtZV07XG4gICAgICB9XG5cbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIFN0cmlkZXIucHV0KFxuICAgICAgICAgICcvJyArIGUob3B0aW9ucy5ydW5uZXIpICsgJy8nICsgZShvcHRpb25zLnJlcG8pICsgJy9jb25maWcvbWFzdGVyL3J1bm5lcicsXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICBzdWNjZXNzKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoXCJSdW5uZXIgY29uZmlnIHNhdmVkLlwiKTtcbiAgICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbbmFtZV0gPSBkYXRhLmNvbmZpZztcbiAgICAgICAgbmV4dCAmJiBuZXh0KG51bGwsIGRhdGEuY29uZmlnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnID0gZnVuY3Rpb24gKGRhdGEsIG5leHQpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUucHJvamVjdC5wcm92aWRlci5jb25maWc7XG4gICAgICB9XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBTdHJpZGVyLnBvc3QoXG4gICAgICAgICAgJy8nICsgZShvcHRpb25zLm93bmVyKSArICcvJyArIGUob3B0aW9ucy5yZXBvKSArICcvcHJvdmlkZXIvJyxcbiAgICAgICAgICBkYXRhLFxuICAgICAgICAgIHN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKFwiUHJvdmlkZXIgY29uZmlnIHNhdmVkLlwiKTtcbiAgICAgICAgbmV4dCAmJiBuZXh0KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5wbHVnaW5Db25maWcgPSBmdW5jdGlvbiAobmFtZSwgYnJhbmNoLCBkYXRhLCBuZXh0KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBuZXh0ID0gZGF0YTtcbiAgICAgICAgZGF0YSA9IGJyYW5jaDtcbiAgICAgICAgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoYnJhbmNoLm1pcnJvcl9tYXN0ZXIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgcGx1Z2luID0gJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW25hbWVdXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgcmV0dXJuIHBsdWdpbi5jb25maWc7XG4gICAgICB9XG4gICAgICBpZiAocGx1Z2luID09PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJwbHVnaW5Db25maWcgY2FsbGVkIGZvciBhIHBsdWdpbiB0aGF0J3Mgbm90IGNvbmZpZ3VyZWQuIFwiICsgbmFtZSwgdHJ1ZSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUGx1Z2luIG5vdCBjb25maWd1cmVkOiAnICsgbmFtZSk7XG4gICAgICB9XG5cbiAgICAgIFN0cmlkZXIucHV0KFxuICAgICAgICAnLycgKyBlKG9wdGlvbnMub3duZXIpICsgJy8nICsgZShvcHRpb25zLnJlcG8pICsgJy9jb25maWcvJyArXG4gICAgICAgICAgZShicmFuY2gubmFtZSkgKyAnLycgKyBlKG5hbWUpLFxuICAgICAgICBkYXRhLFxuICAgICAgICBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoXCJDb25maWcgZm9yIFwiICsgbmFtZSArIFwiIG9uIGJyYW5jaCBcIiArIGJyYW5jaC5uYW1lICsgXCIgc2F2ZWQuXCIpO1xuICAgICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bbmFtZV0uY29uZmlnID0gZGF0YTtcbiAgICAgICAgbmV4dChudWxsLCBkYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZVByb2plY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBTdHJpZGVyLmRlbCgnL2FwaS8nICsgZShvcHRpb25zLm93bmVyKSArICcvJyArIGUob3B0aW9ucy5yZXBvKSwgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKCcvJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydFRlc3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIFN0cmlkZXIucG9zdChcbiAgICAgICAgJy8nICsgZShvcHRpb25zLm93bmVyKSArICcvJyArIGUob3B0aW9ucy5yZXBvKSArICcvc3RhcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgYnJhbmNoOiAkc2NvcGUuYnJhbmNoLm5hbWUsXG4gICAgICAgICAgdHlwZTogXCJURVNUX09OTFlcIixcbiAgICAgICAgICBwYWdlOlwiY29uZmlnXCIgfSxcbiAgICAgICAgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKCcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc3RhcnREZXBsb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBTdHJpZGVyLnBvc3QoXG4gICAgICAgICcvJyArIGUob3B0aW9ucy5vd25lcikgKyAnLycgKyBlKG9wdGlvbnMucmVwbykgKyAnL3N0YXJ0JyxcbiAgICAgICAge1xuICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaC5uYW1lLFxuICAgICAgICAgIHR5cGU6IFwiVEVTVF9BTkRfREVQTE9ZXCIsXG4gICAgICAgICAgcGFnZTpcImNvbmZpZ1wiIH0sXG4gICAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmVQcm9qZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgU3RyaWRlci5wdXQoXG4gICAgICAgICAgJy8nICsgZShvcHRpb25zLm93bmVyKSArICcvJyArIGUob3B0aW9ucy5yZXBvKSArICcvY29uZmlnJyxcbiAgICAgICAgICB7IHB1YmxpYzogJHNjb3BlLnByb2plY3QucHVibGljIH0sXG4gICAgICAgICAgc3VjY2Vzcyk7XG4gICAgICB9KTtcblxuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnR2VuZXJhbCBjb25maWcgc2F2ZWQuJyk7XG4gICAgICB9XG4gICAgfTtcblxuICB9O1xufSIsIm1vZHVsZS5leHBvcnRzID0gZml4VGVtcGxhdGU7XG5cbmZ1bmN0aW9uIGZpeFRlbXBsYXRlKHMpIHtcbiAgcmV0dXJuIHMuXG4gICAgcmVwbGFjZSgvXFxbXFxbL2csICd7eycpLlxuICAgIHJlcGxhY2UoL1xcXVxcXS9nLCAnfX0nKTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuQ29sbGFib3JhdG9yc0N0cmwnLCBbJyRzY29wZScsICdTdHJpZGVyJywgQ29sbGFib3JhdG9yc0N0cmxdKTtcblxuZnVuY3Rpb24gQ29sbGFib3JhdG9yc0N0cmwoJHNjb3BlLCBTdHJpZGVyKSB7XG4gICRzY29wZS5uZXdfZW1haWwgPSAnJztcbiAgJHNjb3BlLm5ld19hY2Nlc3MgPSAwO1xuICAkc2NvcGUuY29sbGFib3JhdG9ycyA9IHdpbmRvdy5jb2xsYWJvcmF0b3JzIHx8IFtdO1xuXG4gICRzY29wZS5yZW1vdmUgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgIGl0ZW0ubG9hZGluZyA9IHRydWU7XG4gICAgJHNjb3BlLmNsZWFyTWVzc2FnZSgpO1xuICAgIFN0cmlkZXIuZGVsKFxuICAgICAgJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvY29sbGFib3JhdG9ycy8nLFxuICAgICAge2VtYWlsOiBpdGVtLmVtYWlsfSxcbiAgICAgIHN1Y2Nlc3MpO1xuXG4gICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgIHJlbW92ZSgkc2NvcGUuY29sbGFib3JhdG9ycywgaXRlbSk7XG4gICAgICAkc2NvcGUuc3VjY2VzcyhpdGVtLmVtYWlsICsgXCIgaXMgbm8gbG9uZ2VyIGEgY29sbGFib3JhdG9yIG9uIHRoaXMgcHJvamVjdC5cIik7XG4gICAgfVxuICB9O1xuXG4gICRzY29wZS5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRhdGEgPSB7XG4gICAgICBlbWFpbDogJHNjb3BlLm5ld19lbWFpbCxcbiAgICAgIGFjY2VzczogJHNjb3BlLm5ld19hY2Nlc3MgfHwgMCxcbiAgICAgIGdyYXZhdGFyOiAkc2NvcGUuZ3JhdmF0YXIoJHNjb3BlLm5ld19lbWFpbCksXG4gICAgICBvd25lcjogZmFsc2VcbiAgICB9O1xuXG4gICAgU3RyaWRlci5wb3N0KFxuICAgICAgJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvY29sbGFib3JhdG9ycy8nLFxuICAgICAgZGF0YSxcbiAgICAgIHN1Y2Nlc3MpO1xuXG5cbiAgICBmdW5jdGlvbiBzdWNjZXNzKHJlcykge1xuICAgICAgJHNjb3BlLm5ld19hY2Nlc3MgPSAwO1xuICAgICAgJHNjb3BlLm5ld19lbWFpbCA9ICcnO1xuICAgICAgaWYgKHJlcy5jcmVhdGVkKSB7XG4gICAgICAgICRzY29wZS5jb2xsYWJvcmF0b3JzLnB1c2goZGF0YSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc3VjY2VzcyhyZXMubWVzc2FnZSk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiByZW1vdmUoYXIsIGl0ZW0pIHtcbiAgYXIuc3BsaWNlKGFyLmluZGV4T2YoaXRlbSksIDEpO1xufVxuIiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkVudmlyb25tZW50Q3RybCcsIFsnJHNjb3BlJywgRW52aXJvbm1lbnRDdHJsXSk7XG5cbmZ1bmN0aW9uIEVudmlyb25tZW50Q3RybCgkc2NvcGUpe1xuICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXS5lbnYuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlIHx8IHt9O1xuICB9KTtcbiAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdlbnYnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5kZWwgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgZGVsZXRlICRzY29wZS5jb25maWdba2V5XTtcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xuICAkc2NvcGUuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5jb25maWdbJHNjb3BlLm5ld2tleV0gPSAkc2NvcGUubmV3dmFsdWU7XG4gICAgJHNjb3BlLm5ld2tleSA9ICRzY29wZS5uZXd2YWx1ZSA9ICcnO1xuICAgICRzY29wZS5zYXZlKCk7XG4gIH07XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLkdpdGh1YkN0cmwnLCBbJyRzY29wZScsICdTdHJpZGVyJywgR2l0aHViQ3RybF0pO1xuXG5mdW5jdGlvbiBHaXRodWJDdHJsKCRzY29wZSwgU3RyaWRlcikge1xuXG4gICRzY29wZS5jb25maWcgPSAkc2NvcGUucHJvdmlkZXJDb25maWcoKTtcbiAgJHNjb3BlLm5ld191c2VybmFtZSA9IFwiXCI7XG4gICRzY29wZS5uZXdfbGV2ZWwgPSBcInRlc3RlclwiO1xuICAkc2NvcGUuY29uZmlnLndoaXRlbGlzdCA9ICRzY29wZS5jb25maWcud2hpdGVsaXN0IHx8IFtdO1xuICAkc2NvcGUuY29uZmlnLnB1bGxfcmVxdWVzdHMgPSAkc2NvcGUuY29uZmlnLnB1bGxfcmVxdWVzdHMgfHwgJ25vbmUnO1xuXG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZygkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7fSk7XG4gIH07XG5cbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnLnB1bGxfcmVxdWVzdHMnLCBmdW5jdGlvbiAodmFsdWUsIG9sZCkge1xuICAgIGlmICghb2xkIHx8IHZhbHVlID09PSBvbGQpIHJldHVybjtcbiAgICAkc2NvcGUucHJvdmlkZXJDb25maWcoe1xuICAgICAgcHVsbF9yZXF1ZXN0czogJHNjb3BlLmNvbmZpZy5wdWxsX3JlcXVlc3RzXG4gICAgfSk7XG4gIH0pO1xuXG4gICRzY29wZS5hZGRXZWJob29rcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gdHJ1ZTtcblxuICAgIFN0cmlkZXIucG9zdCgkc2NvcGUuYXBpX3Jvb3QgKyAnZ2l0aHViL2hvb2snLCBzdWNjZXNzKTtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICBjb25zb2xlLmxvZygnU1VDQ0VTUycpO1xuICAgICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ1NldCBnaXRodWIgd2ViaG9va3MnKTtcbiAgICB9XG4gIH07XG5cbiAgJHNjb3BlLmRlbGV0ZVdlYmhvb2tzID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSB0cnVlO1xuXG4gICAgU3RyaWRlci5kZWwoJHNjb3BlLmFwaV9yb290ICsgJ2dpdGh1Yi9ob29rJywgc3VjY2Vzcyk7XG5cbiAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ1JlbW92ZWQgZ2l0aHViIHdlYmhvb2tzJyk7XG4gICAgfVxuICB9O1xuXG4gICRzY29wZS5yZW1vdmVXTCA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdmFyIGlkeCA9ICRzY29wZS5jb25maWcud2hpdGVsaXN0LmluZGV4T2YodXNlcik7XG4gICAgaWYgKGlkeCA9PT0gLTEpIHJldHVybiBjb25zb2xlLmVycm9yKFwidHJpZWQgdG8gcmVtb3ZlIGEgd2hpdGVsaXN0IGl0ZW0gdGhhdCBkaWRuJ3QgZXhpc3RcIik7XG4gICAgdmFyIHdoaXRlbGlzdCA9ICRzY29wZS5jb25maWcud2hpdGVsaXN0LnNsaWNlKCk7XG4gICAgd2hpdGVsaXN0LnNwbGljZShpZHgsIDEpO1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyh7XG4gICAgICB3aGl0ZWxpc3Q6IHdoaXRlbGlzdFxuICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5jb25maWcud2hpdGVsaXN0ID0gd2hpdGVsaXN0O1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5hZGRXTCA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgaWYgKCF1c2VyLm5hbWUgfHwgIXVzZXIubGV2ZWwpIHJldHVybjtcbiAgICB2YXIgd2hpdGVsaXN0ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3Quc2xpY2UoKTtcbiAgICB3aGl0ZWxpc3QucHVzaCh1c2VyKTtcbiAgICAkc2NvcGUucHJvdmlkZXJDb25maWcoe1xuICAgICAgd2hpdGVsaXN0OiB3aGl0ZWxpc3RcbiAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuY29uZmlnLndoaXRlbGlzdCA9IHdoaXRlbGlzdDtcbiAgICB9KTtcbiAgfTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5IZXJva3VDb250cm9sbGVyJywgWyckc2NvcGUnLCAnU3RyaWRlcicsIEhlcm9rdUN0cmxdKTtcblxuZnVuY3Rpb24gSGVyb2t1Q3RybCgkc2NvcGUsIFN0cmlkZXIpIHtcbiAgJHNjb3BlLiR3YXRjaCgndXNlckNvbmZpZ3MuaGVyb2t1JywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSkgcmV0dXJuXG4gICAgJHNjb3BlLnVzZXJDb25maWcgPSB2YWx1ZTtcbiAgICBpZiAoISRzY29wZS5hY2NvdW50ICYmIHZhbHVlLmFjY291bnRzICYmIHZhbHVlLmFjY291bnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICRzY29wZS5hY2NvdW50ID0gdmFsdWUuYWNjb3VudHNbMF07XG4gICAgfVxuICB9KTtcbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0uaGVyb2t1LmNvbmZpZycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgICBpZiAodmFsdWUuYXBwICYmICRzY29wZS51c2VyQ29uZmlnLmFjY291bnRzKSB7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLnVzZXJDb25maWcuYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCRzY29wZS51c2VyQ29uZmlnLmFjY291bnRzW2ldLmlkID09PSB2YWx1ZS5hcHAuYWNjb3VudCkge1xuICAgICAgICAgICRzY29wZS5hY2NvdW50ID0gJHNjb3BlLnVzZXJDb25maWcuYWNjb3VudHNbaV07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ2hlcm9rdScsICRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcbiAgJHNjb3BlLmdldEFwcHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCEkc2NvcGUuYWNjb3VudCkgcmV0dXJuIGNvbnNvbGUud2FybigndHJpZWQgdG8gZ2V0QXBwcyBidXQgbm8gYWNjb3VudCcpO1xuICAgIFN0cmlkZXIuZ2V0KCcvZXh0L2hlcm9rdS9hcHBzLycgKyBlbmNvZGVVUklDb21wb25lbnQoJHNjb3BlLmFjY291bnQuaWQpLCBzdWNjZXNzKTtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MgKGJvZHksIHJlcSkge1xuICAgICAgJHNjb3BlLmFjY291bnQuY2FjaGUgPSBib2R5O1xuICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0dvdCBhY2NvdW50cyBsaXN0IGZvciAnICsgJHNjb3BlLmFjY291bnQuZW1haWwsIHRydWUpO1xuICAgIH1cbiAgfTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuSm9iQ29udHJvbGxlcicsIFsnJHNjb3BlJywgSm9iQ29udHJvbGxlcl0pO1xuXG5mdW5jdGlvbiBKb2JDb250cm9sbGVyKCRzY29wZSkge1xuXG4gICRzY29wZS5pbml0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgICRzY29wZS4kd2F0Y2goJ3VzZXJDb25maWdzW1wiJyArIG5hbWUgKyAnXCJdJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAkc2NvcGUudXNlckNvbmZpZyA9IHZhbHVlO1xuICAgIH0pO1xuICAgICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdW1wiJyArIG5hbWUgKyAnXCJdLmNvbmZpZycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICAgIH0pO1xuICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICAgJHNjb3BlLnBsdWdpbkNvbmZpZyhuYW1lLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuTm9kZUNvbnRyb2xsZXInLCBbJyRzY29wZScsIE5vZGVDb250cm9sbGVyXSk7XG5cbmZ1bmN0aW9uIE5vZGVDb250cm9sbGVyKCRzY29wZSkge1xuICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXS5ub2RlLmNvbmZpZycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICRzY29wZS5jb25maWcgPSB2YWx1ZTtcbiAgfSk7XG4gICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnbm9kZScsICRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcbiAgJHNjb3BlLnJlbW92ZUdsb2JhbCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICRzY29wZS5jb25maWcuZ2xvYmFscy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICRzY29wZS5zYXZlKCk7XG4gIH07XG4gICRzY29wZS5hZGRHbG9iYWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCEkc2NvcGUuY29uZmlnLmdsb2JhbHMpICRzY29wZS5jb25maWcuZ2xvYmFscyA9IFtdO1xuICAgICRzY29wZS5jb25maWcuZ2xvYmFscy5wdXNoKCRzY29wZS5uZXdfcGFja2FnZSk7XG4gICAgJHNjb3BlLm5ld19wYWNrYWdlID0gJyc7XG4gICAgJHNjb3BlLnNhdmUoKTtcbiAgfTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuUnVubmVyQ29udHJvbGxlcicsIFsnJHNjb3BlJywgUnVubmVyQ29udHJvbGxlcl0pO1xuXG5mdW5jdGlvbiBSdW5uZXJDb250cm9sbGVyKCRzY29wZSkge1xuXG4gICRzY29wZS5pbml0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgICAkc2NvcGUuJHdhdGNoKCdydW5uZXJDb25maWdzW2JyYW5jaC5uYW1lXVtcIicgKyBuYW1lICsgJ1wiXScsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ1J1bm5lciBjb25maWcnLCBuYW1lLCB2YWx1ZSwgJHNjb3BlLnJ1bm5lckNvbmZpZ3MpO1xuICAgICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5ydW5uZXJDb25maWcoJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuXG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLlNhdWNlQ3RybCcsIFsnJHNjb3BlJywgU2F1Y2VDdHJsXSk7XG5cbmZ1bmN0aW9uIFNhdWNlQ3RybCgkc2NvcGUpIHtcblxuICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXS5zYXVjZS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICRzY29wZS5icm93c2VyX21hcCA9IHt9O1xuICAgIGlmICghdmFsdWUuYnJvd3NlcnMpIHtcbiAgICAgIHZhbHVlLmJyb3dzZXJzID0gW107XG4gICAgfVxuICAgIGZvciAodmFyIGk9MDsgaTx2YWx1ZS5icm93c2Vycy5sZW5ndGg7IGkrKykge1xuICAgICAgJHNjb3BlLmJyb3dzZXJfbWFwW3NlcmlhbGl6ZU5hbWUodmFsdWUuYnJvd3NlcnNbaV0pXSA9IHRydWU7XG4gICAgfVxuICB9KTtcbiAgJHNjb3BlLmNvbXBsZXRlTmFtZSA9IGNvbXBsZXRlTmFtZTtcbiAgJHNjb3BlLm9wZXJhdGluZ3N5c3RlbXMgPSBvcmdhbml6ZShicm93c2VycyB8fCBbXSk7XG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5jb25maWcuYnJvd3NlcnMgPSBbXTtcbiAgICBmb3IgKHZhciBuYW1lIGluICRzY29wZS5icm93c2VyX21hcCkge1xuICAgICAgaWYgKCRzY29wZS5icm93c2VyX21hcFtuYW1lXSkge1xuICAgICAgICAkc2NvcGUuY29uZmlnLmJyb3dzZXJzLnB1c2gocGFyc2VOYW1lKG5hbWUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnc2F1Y2UnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuYnJvd3Nlcl9tYXAgPSB7fTtcbiAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBvcmdhbml6ZShicm93c2Vycykge1xuICB2YXIgb3NzID0ge307XG4gIGZvciAodmFyIGk9MDsgaTxicm93c2Vycy5sZW5ndGg7IGkrKykge1xuICAgIGlmICghb3NzW2Jyb3dzZXJzW2ldLm9zXSkge1xuICAgICAgb3NzW2Jyb3dzZXJzW2ldLm9zXSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIW9zc1ticm93c2Vyc1tpXS5vc11bYnJvd3NlcnNbaV0ubG9uZ19uYW1lXSkge1xuICAgICAgb3NzW2Jyb3dzZXJzW2ldLm9zXVticm93c2Vyc1tpXS5sb25nX25hbWVdID0gW107XG4gICAgfVxuICAgIG9zc1ticm93c2Vyc1tpXS5vc11bYnJvd3NlcnNbaV0ubG9uZ19uYW1lXS5wdXNoKGJyb3dzZXJzW2ldKTtcbiAgICBicm93c2Vyc1tpXS5jb21wbGV0ZV9uYW1lID0gY29tcGxldGVOYW1lKGJyb3dzZXJzW2ldKTtcbiAgfVxuICByZXR1cm4gb3NzO1xufVxuXG5mdW5jdGlvbiBjb21wbGV0ZU5hbWUodmVyc2lvbikge1xuICByZXR1cm4gdmVyc2lvbi5vcyArICctJyArIHZlcnNpb24uYXBpX25hbWUgKyAnLScgKyB2ZXJzaW9uLnNob3J0X3ZlcnNpb247XG59XG5cbmZ1bmN0aW9uIHBhcnNlTmFtZShuYW1lKSB7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJy0nKTtcbiAgcmV0dXJuIHtcbiAgICBwbGF0Zm9ybTogcGFydHNbMF0sXG4gICAgYnJvd3Nlck5hbWU6IHBhcnRzWzFdLFxuICAgIHZlcnNpb246IHBhcnRzWzJdIHx8ICcnXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZU5hbWUoYnJvd3Nlcikge1xuICByZXR1cm4gYnJvd3Nlci5wbGF0Zm9ybSArICctJyArIGJyb3dzZXIuYnJvd3Nlck5hbWUgKyAnLScgKyBicm93c2VyLnZlcnNpb247XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLldlYmhvb2tzQ3RybCcsIFsnJHNjb3BlJywgV2ViaG9va3NDdHJsXSk7XG5cbmZ1bmN0aW9uIFdlYmhvb2tzQ3RybCgkc2NvcGUpIHtcblxuICBmdW5jdGlvbiByZW1vdmUoYXIsIGl0ZW0pIHtcbiAgICBhci5zcGxpY2UoYXIuaW5kZXhPZihpdGVtKSwgMSk7XG4gIH1cblxuICAkc2NvcGUuaG9va3MgPSAkc2NvcGUucGx1Z2luQ29uZmlnKCd3ZWJob29rcycpIHx8IFtdO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoJHNjb3BlLmhvb2tzKSkgJHNjb3BlLmhvb2tzID0gW107XG4gIGlmICghJHNjb3BlLmhvb2tzLmxlbmd0aCkgJHNjb3BlLmhvb2tzLnB1c2goe30pO1xuXG4gICRzY29wZS5yZW1vdmUgPSBmdW5jdGlvbiAoaG9vaykge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ3dlYmhvb2tzJywgJHNjb3BlLmhvb2tzLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgICBpZiAoIWVycikgcmVtb3ZlKCRzY29wZS5ob29rcywgaG9vayk7XG4gICAgICBpZiAoISRzY29wZS5ob29rcy5sZW5ndGgpICRzY29wZS5ob29rcy5wdXNoKHt9KTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCd3ZWJob29rcycsICRzY29wZS5ob29rcywgZnVuY3Rpb24gKGVycikge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmhvb2tzLnB1c2goe30pO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0Rhc2hib2FyZEN0cmwnLCBbJyRzY29wZScsICdTdHJpZGVyJywgRGFzaGJvYXJkQ3RybF0pO1xuXG5mdW5jdGlvbiBEYXNoYm9hcmRDdHJsKCRzY29wZSwgU3RyaWRlcikge1xuXG4gICRzY29wZS5waGFzZXMgPSBTdHJpZGVyLnBoYXNlcztcblxuXG4gIFN0cmlkZXIuZ2V0KCcvZGFzaGJvYXJkJywgZnVuY3Rpb24ocmVzcCkge1xuICAgICRzY29wZS5qb2JzID0gcmVzcC5qb2JzO1xuICAgICRzY29wZS5hdmFpbGFibGVQcm92aWRlcnMgPSByZXNwLmF2YWlsYWJsZVByb3ZpZGVycztcblxuICAgIFN0cmlkZXIuY29ubmVjdCgkc2NvcGUsICRzY29wZS5qb2JzKTtcbiAgfSk7XG5cbiAgLy8gJHNjb3BlLmpvYnMgPSBTdHJpZGVyLmpvYnM7XG4gIC8vIFN0cmlkZXIuY29ubmVjdCgkc2NvcGUpO1xuICAvLyBTdHJpZGVyLmpvYnMuZGFzaGJvYXJkKCk7XG5cbiAgJHNjb3BlLnN0YXJ0RGVwbG95ID0gZnVuY3Rpb24gZGVwbG95KGpvYikge1xuICAgIFN0cmlkZXIuZGVwbG95KGpvYi5wcm9qZWN0KTtcbiAgfTtcblxuICAkc2NvcGUuc3RhcnRUZXN0ID0gZnVuY3Rpb24gdGVzdChqb2IpIHtcbiAgICBTdHJpZGVyLnRlc3Qoam9iLnByb2plY3QpO1xuICB9O1xuXG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignRXJyb3JDdHJsJywgWyckc2NvcGUnLCAnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnJHNjZScsIEVycm9yQ3RybF0pO1xuXG5mdW5jdGlvbiBFcnJvckN0cmwoJHNjb3BlLCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sICRzY2UpIHtcbiAgJHNjb3BlLmVycm9yID0ge307XG5cbiAgdmFyIGxhc3Q7XG5cbiAgJHJvb3RTY29wZS4kb24oJ2Vycm9yJywgZnVuY3Rpb24oZXYsIGVycikge1xuICAgIGxhc3QgPSBEYXRlLm5vdygpO1xuICAgICRzY29wZS5lcnJvci5tZXNzYWdlID0gJHNjZS50cnVzdEFzSHRtbChlcnIubWVzc2FnZSB8fCBlcnIpO1xuICB9KTtcblxuICAkcm9vdFNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAobGFzdCAmJiBEYXRlLm5vdygpIC0gbGFzdCA+ICAxMDAwKSB7XG4gICAgICAkc2NvcGUuZXJyb3IubWVzc2FnZSA9ICcnO1xuICAgIH1cbiAgfSk7XG5cbiAgdmFyIGZsYXNoID0gJGxvY2F0aW9uLnNlYXJjaCgpLmZsYXNoO1xuICBpZiAoZmxhc2gpIHtcbiAgICB0cnkge1xuICAgICAgZmxhc2ggPSBKU09OLnBhcnNlKGZsYXNoKTtcbiAgICB9IGNhdGNoKGVycikge1xuICAgICAgLy8gZG8gbm90aGluZ1xuICAgIH1cblxuICAgIE9iamVjdC5rZXlzKGZsYXNoKS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgICRyb290U2NvcGUuJGVtaXQoJ2Vycm9yJywgZmxhc2hba11bMF0pO1xuICAgIH0pO1xuICB9XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xudmFyIGUgICA9IGVuY29kZVVSSUNvbXBvbmVudDtcblxuQXBwLmNvbnRyb2xsZXIoJ0pvYkN0cmwnLCBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnJHNjZScsICckZmlsdGVyJywgJyRsb2NhdGlvbicsICckcm91dGUnLCAnU3RyaWRlcicsIEpvYkN0cmxdKTtcblxuZnVuY3Rpb24gSm9iQ3RybCgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJHNjZSwgJGZpbHRlciwgJGxvY2F0aW9uLCAkcm91dGUsIFN0cmlkZXIpIHtcblxuXG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIERPTSBzdHVmZiBmcm9tIHRoZSBjb250cm9sbGVyXG4gIHZhciBvdXRwdXRDb25zb2xlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnNvbGUtb3V0cHV0Jyk7XG5cbiAgJHNjb3BlLnBoYXNlcyA9IFN0cmlkZXIucGhhc2VzO1xuICAkc2NvcGUucGFnZSA9ICdidWlsZCc7XG5cbiAgdmFyIGpvYklkID0gJHJvdXRlUGFyYW1zLmpvYklkO1xuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBvd25lcjogJHJvdXRlUGFyYW1zLm93bmVyLFxuICAgIHJlcG86ICAkcm91dGVQYXJhbXMucmVwb1xuICB9O1xuICB2YXIgcHJvamVjdE5hbWUgPSBlKG9wdGlvbnMub3duZXIpICsgJy8nICsgZShvcHRpb25zLnJlcG8pO1xuXG4gIFN0cmlkZXIuZ2V0KCcvYXBpLycgKyBwcm9qZWN0TmFtZSArICdcXC8nLCBnb3RSZXBvKTtcblxuICBmdW5jdGlvbiBnb3RSZXBvKHJlcG8pIHtcbiAgICAkc2NvcGUucHJvamVjdCA9IHJlcG8ucHJvamVjdDtcbiAgICBpZiAoISBqb2JJZCkgam9iSWQgPSByZXBvICYmIHJlcG8uam9iICYmIHJlcG8uam9iLl9pZDtcbiAgICBpZiAoISBqb2JJZCkgcmV0dXJuO1xuXG4gICAgJHNjb3BlLmpvYnMgPSByZXBvLmpvYnM7XG5cbiAgICBTdHJpZGVyLmNvbm5lY3QoJHNjb3BlLCBjb25uZWN0ZWQpO1xuXG5cbiAgICAvLyBPYmplY3Qua2V5cygkc2NvcGUuam9iLnBoYXNlcykuZm9yRWFjaChmdW5jdGlvbihwaGFzZUtleSkge1xuICAgIC8vICAgdmFyIHBoYXNlID0gJHNjb3BlLmpvYi5waGFzZXNbcGhhc2VLZXldO1xuICAgIC8vICAgT2JqZWN0LmtleXMocGhhc2UuY29tbWFuZHMpLmZvckVhY2goZnVuY3Rpb24oY29tbWFuZEtleSkge1xuICAgIC8vICAgICB2YXIgY29tbWFuZCA9IHBoYXNlLmNvbW1hbmRzW2NvbW1hbmRLZXldO1xuICAgIC8vICAgICBjb21tYW5kLm1lcmdlZCA9ICRzY2UudHJ1c3RBc0h0bWwoY29tbWFuZC5tZXJnZWQpO1xuICAgIC8vICAgfSlcbiAgICAvLyB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3RlZCgpIHtcbiAgICBTdHJpZGVyLmpvYihqb2JJZCwgJHNjb3BlLnByb2plY3QsIGxvYWRlZEpvYik7XG4gIH1cblxuICBmdW5jdGlvbiBsb2FkZWRKb2Ioam9iKSB7XG4gICAgJHNjb3BlLmpvYiA9IGpvYjtcblxuICAgIC8vLyAtIElmIHRoZXJlIGlzIGEgam9iIGlkIG9uIHRoZSBVUkwgcmVkaXJlY3QgdGhlIHVzZXJcbiAgICAvLy8gICB0byB0aGUgbmV3IGpvYiBVUkwuXG4gICAgLy8vIC0gRG8gbm90IHJlZGlyZWN0IHRoZSB1c2VyIHRvIHRoZSBuZXcgam9iIHdoZW4gdGhlcmVcbiAgICAvLy8gICBpcyBhIGpvYiBpZCBvbiB0aGUgVVJMLlxuICAgIGlmICghICRyb3V0ZVBhcmFtcy5qb2JJZCkge1xuICAgICAgU3RyaWRlci5zdG9yZS5vbignbmV3am9iJywgb25OZXdKb2IpO1xuICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgU3RyaWRlci5zdG9yZS5yZW1vdmVMaXN0ZW5lcignbmV3am9iJywgb25OZXdKb2IpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCRzY29wZS5qb2IgJiYgJHNjb3BlLmpvYi5waGFzZXMudGVzdC5jb21tYW5kcy5sZW5ndGgpIHtcbiAgICAgIGlmICgkc2NvcGUuam9iLnBoYXNlcy5lbnZpcm9ubWVudCkge1xuICAgICAgICAkc2NvcGUuam9iLnBoYXNlcy5lbnZpcm9ubWVudC5jb2xsYXBzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCRzY29wZS5qb2IucGhhc2VzLnByZXBhcmUpIHtcbiAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMucHJlcGFyZS5jb2xsYXBzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCRzY29wZS5qb2IucGhhc2VzLmNsZWFudXApIHtcbiAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMuY2xlYW51cC5jb2xsYXBzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgZnVuY3Rpb24gb25OZXdKb2Ioam9iKSB7XG4gICAgaWYgKGpvYi5wcm9qZWN0Lm5hbWUgPT0gcHJvamVjdE5hbWUpIHtcbiAgICAgIHZhciBuZXdQYXRoID0gJy8nICsgcHJvamVjdE5hbWUgKyAnL2pvYi8nICsgZShqb2IuX2lkKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKG5ld1BhdGgpO1xuICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgIH1cbiAgfVxuXG5cbiAgU3RyaWRlci5nZXQoJy9zdGF0dXNibG9ja3MnLCBmdW5jdGlvbihzdGF0dXNCbG9ja3MpIHtcbiAgICAkc2NvcGUuc3RhdHVzQmxvY2tzID0gc3RhdHVzQmxvY2tzO1xuICAgIFsncnVubmVyJywgJ3Byb3ZpZGVyJywgJ2pvYiddLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBmaXhCbG9ja3Moc3RhdHVzQmxvY2tzLCBrZXkpO1xuICAgIH0pO1xuICB9KTtcblxuICBTdHJpZGVyLmdldCgnL2FwaS9zZXNzaW9uJywgZnVuY3Rpb24odXNlcikge1xuICAgIGlmICh1c2VyLnVzZXIpICRzY29wZS5jdXJyZW50VXNlciA9IHVzZXI7XG4gIH0pO1xuXG4gIC8vLyBTY29wZSBmdW5jdGlvbnNcblxuICAkc2NvcGUuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uIGNsZWFyQ2FjaGUoKSB7XG4gICAgJHNjb3BlLmNsZWFyaW5nQ2FjaGUgPSB0cnVlO1xuXG4gICAgU3RyaWRlci5kZWwoJy8nICsgZShvcHRpb25zLm93bmVyKSArICcvJyArIGUob3B0aW9ucy5yZXBvKSArICcvY2FjaGUnLCBzdWNjZXNzKTtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAkc2NvcGUuY2xlYXJpbmdDYWNoZSA9IGZhbHNlO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9XG4gIH1cblxuICAvLyB2YXIgbGFzdFJvdXRlO1xuXG4gIC8vICRzY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbihldmVudCkge1xuICAvLyAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL1xcL2NvbmZpZyQvKSkge1xuICAvLyAgICAgd2luZG93LmxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuICAvLyAgICAgcmV0dXJuO1xuICAvLyAgIH1cbiAgLy8gICBwYXJhbXMgPSAkcm91dGVQYXJhbXM7XG4gIC8vICAgaWYgKCFwYXJhbXMuaWQpIHBhcmFtcy5pZCA9ICRzY29wZS5qb2JzWzBdLl9pZDtcbiAgLy8gICAvLyBkb24ndCByZWZyZXNoIHRoZSBwYWdlXG4gIC8vICAgJHJvdXRlLmN1cnJlbnQgPSBsYXN0Um91dGU7XG4gIC8vICAgaWYgKGpvYklkICE9PSBwYXJhbXMuaWQpIHtcbiAgLy8gICAgIGpvYklkID0gcGFyYW1zLmlkO1xuICAvLyAgICAgdmFyIGNhY2hlZCA9IGpvYm1hbi5nZXQoam9iSWQsIGZ1bmN0aW9uIChlcnIsIGpvYiwgY2FjaGVkKSB7XG4gIC8vICAgICAgIGlmIChqb2IucGhhc2VzLmVudmlyb25tZW50KSB7XG4gIC8vICAgICAgICAgam9iLnBoYXNlcy5lbnZpcm9ubWVudC5jb2xsYXBzZWQgPSB0cnVlO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgIGlmIChqb2IucGhhc2VzLnByZXBhcmUpIHtcbiAgLy8gICAgICAgICBqb2IucGhhc2VzLnByZXBhcmUuY29sbGFwc2VkID0gdHJ1ZTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICBpZiAoam9iLnBoYXNlcy5jbGVhbnVwKSB7XG4gIC8vICAgICAgICAgam9iLnBoYXNlcy5jbGVhbnVwLmNvbGxhcHNlZCA9IHRydWU7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgICAgJHNjb3BlLmpvYiA9IGpvYjtcbiAgLy8gICAgICAgaWYgKCRzY29wZS5qb2IucGhhc2VzLnRlc3QuY29tbWFuZHMubGVuZ3RoKSB7XG4gIC8vICAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMuZW52aXJvbm1lbnQuY29sbGFwc2VkID0gdHJ1ZTtcbiAgLy8gICAgICAgICAkc2NvcGUuam9iLnBoYXNlcy5wcmVwYXJlLmNvbGxhcHNlZCA9IHRydWU7XG4gIC8vICAgICAgICAgJHNjb3BlLmpvYi5waGFzZXMuY2xlYW51cC5jb2xsYXBzZWQgPSB0cnVlO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgIGlmICghY2FjaGVkKSAkc2NvcGUuJGRpZ2VzdCgpO1xuICAvLyAgICAgfSk7XG4gIC8vICAgICBpZiAoIWNhY2hlZCkge1xuICAvLyAgICAgICBmb3IgKHZhciBpPTA7IGk8JHNjb3BlLmpvYnMubGVuZ3RoOyBpKyspIHtcbiAgLy8gICAgICAgICBpZiAoJHNjb3BlLmpvYnNbaV0uX2lkID09PSBqb2JJZCkge1xuICAvLyAgICAgICAgICAgJHNjb3BlLmpvYiA9ICRzY29wZS5qb2JzW2ldO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyB9KTtcblxuICAkc2NvcGUudHJpZ2dlcnMgPSB7XG4gICAgY29tbWl0OiB7XG4gICAgICBpY29uOiAnY29kZS1mb3JrJyxcbiAgICAgIHRpdGxlOiAnQ29tbWl0J1xuICAgIH0sXG4gICAgbWFudWFsOiB7XG4gICAgICBpY29uOiAnaGFuZC1yaWdodCcsXG4gICAgICB0aXRsZTogJ01hbnVhbCdcbiAgICB9LFxuICAgIHBsdWdpbjoge1xuICAgICAgaWNvbjogJ3B1enpsZS1waWVjZScsXG4gICAgICB0aXRsZTogJ1BsdWdpbidcbiAgICB9LFxuICAgIGFwaToge1xuICAgICAgaWNvbjogJ2Nsb3VkJyxcbiAgICAgIHRpdGxlOiAnQ2xvdWQnXG4gICAgfVxuICB9O1xuXG4gICRzY29wZS5zZWxlY3RKb2IgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAkbG9jYXRpb24ucGF0aChcbiAgICAgICcvJyArIGVuY29kZVVSSUNvbXBvbmVudChvcHRpb25zLm93bmVyKSArXG4gICAgICAnLycgKyBlbmNvZGVVUklDb21wb25lbnQob3B0aW9ucy5yZXBvKSArXG4gICAgICAnL2pvYi8nICsgZW5jb2RlVVJJQ29tcG9uZW50KGlkKSk7XG4gIH07XG5cbiAgJHNjb3BlLiR3YXRjaCgnam9iLnN0YXR1cycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHVwZGF0ZUZhdmljb24odmFsdWUpO1xuICB9KTtcblxuICAkc2NvcGUuJHdhdGNoKCdqb2Iuc3RkLm1lcmdlZF9sYXRlc3QnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvKiBUcmFja2luZyBpc24ndCBxdWl0ZSB3b3JraW5nIHJpZ2h0XG4gICAgaWYgKCRzY29wZS5qb2Iuc3RhdHVzID09PSAncnVubmluZycpIHtcbiAgICAgIGhlaWdodCA9IG91dHB1dENvbnNvbGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgdHJhY2tpbmcgPSBoZWlnaHQgKyBvdXRwdXRDb25zb2xlLnNjcm9sbFRvcCA+IG91dHB1dENvbnNvbGUuc2Nyb2xsSGVpZ2h0IC0gNTA7XG4gICAgICAvLyBjb25zb2xlLmxvZyh0cmFja2luZywgaGVpZ2h0LCBvdXRwdXRDb25zb2xlLnNjcm9sbFRvcCwgb3V0cHV0Q29uc29sZS5zY3JvbGxIZWlnaHQpO1xuICAgICAgaWYgKCF0cmFja2luZykgcmV0dXJuO1xuICAgIH1cbiAgICAqL1xuICAgIHZhciBhbnNpRmlsdGVyID0gJGZpbHRlcignYW5zaScpXG4gICAgJCgnLmpvYi1vdXRwdXQnKS5sYXN0KCkuYXBwZW5kKGFuc2lGaWx0ZXIodmFsdWUpKVxuICAgIG91dHB1dENvbnNvbGUuc2Nyb2xsVG9wID0gb3V0cHV0Q29uc29sZS5zY3JvbGxIZWlnaHQ7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBvdXRwdXRDb25zb2xlLnNjcm9sbFRvcCA9IG91dHB1dENvbnNvbGUuc2Nyb2xsSGVpZ2h0O1xuICAgIH0sIDEwKTtcbiAgfSk7XG5cbiAgLy8gYnV0dG9uIGhhbmRsZXJzXG4gICRzY29wZS5zdGFydERlcGxveSA9IGZ1bmN0aW9uIChqb2IpIHtcbiAgICAkKCcudG9vbHRpcCcpLmhpZGUoKTtcbiAgICBTdHJpZGVyLmRlcGxveShqb2IucHJvamVjdCk7XG4gICAgJHNjb3BlLmpvYiA9IHtcbiAgICAgIHByb2plY3Q6ICRzY29wZS5qb2IucHJvamVjdCxcbiAgICAgIHN0YXR1czogJ3N1Ym1pdHRlZCdcbiAgICB9O1xuICB9O1xuICAkc2NvcGUuc3RhcnRUZXN0ID0gZnVuY3Rpb24gKGpvYikge1xuICAgICQoJy50b29sdGlwJykuaGlkZSgpO1xuICAgIFN0cmlkZXIuZGVwbG95KGpvYi5wcm9qZWN0KTtcbiAgICAkc2NvcGUuam9iID0ge1xuICAgICAgcHJvamVjdDogJHNjb3BlLmpvYi5wcm9qZWN0LFxuICAgICAgc3RhdHVzOiAnc3VibWl0dGVkJ1xuICAgIH07XG4gIH07XG5cblxuICBmdW5jdGlvbiBmaXhCbG9ja3Mob2JqZWN0LCBrZXkpIHtcbiAgICB2YXIgYmxvY2tzID0gb2JqZWN0W2tleV07XG4gICAgaWYgKCEgYmxvY2tzKSByZXR1cm47XG4gICAgT2JqZWN0LmtleXMoYmxvY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG4gICAgICB2YXIgYmxvY2sgPSBibG9ja3NbcHJvdmlkZXJdO1xuICAgICAgYmxvY2suYXR0cnNfaHRtbCA9IE9iamVjdC5rZXlzKGJsb2NrLmF0dHJzKS5tYXAoZnVuY3Rpb24oYXR0cikge1xuICAgICAgICByZXR1cm4gYXR0ciArICc9JyArIGJsb2NrLmF0dHJzW2F0dHJdO1xuICAgICAgfSkuam9pbignICcpO1xuXG4gICAgICBibG9jay5odG1sID0gJHNjZS50cnVzdEFzSHRtbChibG9jay5odG1sKTtcblxuICAgIH0pO1xuICB9XG59XG5cblxuLyoqIG1hbmFnZSB0aGUgZmF2aWNvbnMgKiovXG5mdW5jdGlvbiBzZXRGYXZpY29uKHN0YXR1cykge1xuICAkKCdsaW5rW3JlbCo9XCJpY29uXCJdJykuYXR0cignaHJlZicsICcvaW1hZ2VzL2ljb25zL2Zhdmljb24tJyArIHN0YXR1cyArICcucG5nJyk7XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGVGYXYoKSB7XG4gIHZhciBhbHQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gc3dpdGNoaXQoKSB7XG4gICAgc2V0RmF2aWNvbigncnVubmluZycgKyAoYWx0ID8gJy1hbHQnIDogJycpKTtcbiAgICBhbHQgPSAhYWx0O1xuICB9XG4gIHJldHVybiBzZXRJbnRlcnZhbChzd2l0Y2hpdCwgNTAwKTtcbn1cblxudmFyIHJ1bnRpbWUgPSBudWxsO1xuZnVuY3Rpb24gdXBkYXRlRmF2aWNvbih2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09ICdydW5uaW5nJykge1xuICAgIGlmIChydW50aW1lID09PSBudWxsKSB7XG4gICAgICBydW50aW1lID0gYW5pbWF0ZUZhdigpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAocnVudGltZSAhPT0gbnVsbCkge1xuICAgICAgY2xlYXJJbnRlcnZhbChydW50aW1lKTtcbiAgICAgIHJ1bnRpbWUgPSBudWxsO1xuICAgIH1cbiAgICBzZXRGYXZpY29uKHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBidWlsZFN3aXRjaGVyKCRzY29wZSkge1xuICBmdW5jdGlvbiBzd2l0Y2hCdWlsZHMoZXZ0KSB7XG4gICAgdmFyIGR5ID0gezQwOiAxLCAzODogLTF9W2V2dC5rZXlDb2RlXVxuICAgICAgLCBpZCA9ICRzY29wZS5qb2IuX2lkXG4gICAgICAsIGlkeDtcbiAgICBpZiAoIWR5KSByZXR1cm47XG4gICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS5qb2JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoJHNjb3BlLmpvYnNbaV0uX2lkID09PSBpZCkge1xuICAgICAgICBpZHggPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlkeCA9PT0gLTEpIHtcbiAgICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb25cbiAgICB9XG4gICAgaWR4ICs9IGR5O1xuICAgIGlmIChpZHggPCAwIHx8IGlkeCA+PSAkc2NvcGUuam9icy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgJHNjb3BlLnNlbGVjdEpvYigkc2NvcGUuam9ic1tpZHhdLl9pZCk7XG4gICAgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgfVxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgc3dpdGNoQnVpbGRzKTtcbn1cbiIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICckcm9vdFNjb3BlJywgJ1N0cmlkZXInLCBMb2dpbkN0cmxdKTtcblxuZnVuY3Rpb24gTG9naW5DdHJsKCRzY29wZSwgJGxvY2F0aW9uLCAkcm9vdFNjb3BlLCBTdHJpZGVyKSB7XG5cbiAgJHNjb3BlLnVzZXIgPSB7ZW1haWw6IHVuZGVmaW5lZCwgcGFzc3dvcmQ6IHVuZGVmaW5lZH07XG5cbiAgJHNjb3BlLmxvZ2luID0gZnVuY3Rpb24gbG9naW4oKSB7XG4gICAgU3RyaWRlci5wb3N0KCcvYXBpL3Nlc3Npb24nLCAkc2NvcGUudXNlciwgZnVuY3Rpb24oKSB7XG4gICAgICAkcm9vdFNjb3BlLiRlbWl0KCdsb2dpbicpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcbiAgICB9KTtcbiAgfTtcbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdMb2dvdXRDdHJsJywgWyckc2NvcGUnLCAnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIExvZ291dEN0cmxdKTtcblxuZnVuY3Rpb24gTG9nb3V0Q3RybCgkc2NvcGUsICRyb290U2NvcGUsICRsb2NhdGlvbiwgU3RyaWRlcikge1xuXG4gIFN0cmlkZXIuZGVsKCcvYXBpL3Nlc3Npb24nLCBmdW5jdGlvbigpIHtcbiAgICAkcm9vdFNjb3BlLiRlbWl0KCdsb2dvdXQnKTtcbiAgICAkbG9jYXRpb24ucGF0aCgnLycpO1xuICB9KTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuZnVuY3Rpb24gdmFsaWROYW1lKG5hbWUpIHtcbiAgcmV0dXJuICEhbmFtZS5tYXRjaCgvW1xcdy1dK1xcL1tcXHctXSsvKTtcbn1cblxuQXBwLmNvbnRyb2xsZXIoJ01hbnVhbEN0cmwnLCBbJyRzY29wZScsICdTdHJpZGVyJywgTWFudWFsQ3RybF0pO1xuXG5mdW5jdGlvbiBNYW51YWxDdHJsKCRzY29wZSwgU3RyaWRlcikge1xuICAvLyB2YXIgcHJvdmlkZXIgPSAkYXR0cnMuaWQuc3BsaXQoJy0nKVsxXTtcbiAgJHNjb3BlLmNvbmZpZyA9IHt9O1xuXG4gICRzY29wZS5pbml0ID0gZnVuY3Rpb24ocHJvdmlkZXIsIHByb2plY3RzKSB7XG5cbiAgICAkc2NvcGUucHJvamVjdHMgPSBwcm9qZWN0cztcblxuICAgICRzY29wZS5yZW1vdmUgPSBmdW5jdGlvbiAocHJvamVjdCkge1xuICAgICAgcHJvamVjdC5yZWFsbHlfcmVtb3ZlID0gJ3JlbW92aW5nJztcblxuICAgICAgU3RyaWRlci5kZWwoJy8nICsgcHJvamVjdC5uYW1lICsgJy8nLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgJHNjb3BlLnByb2plY3RzLnNwbGljZSgkc2NvcGUucHJvamVjdHMuaW5kZXhPZihwcm9qZWN0KSwgMSk7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdQcm9qZWN0IHJlbW92ZWQnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBuYW1lID0gJHNjb3BlLmRpc3BsYXlfbmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaWYgKCF2YWxpZE5hbWUobmFtZSkpIHJldHVybjtcblxuICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgIGRpc3BsYXlfbmFtZTogJHNjb3BlLmRpc3BsYXlfbmFtZSxcbiAgICAgICAgZGlzcGxheV91cmw6ICRzY29wZS5kaXNwbGF5X3VybCxcbiAgICAgICAgcHVibGljOiAkc2NvcGUucHVibGljLFxuICAgICAgICBwcm92aWRlcjoge1xuICAgICAgICAgIGlkOiBwcm92aWRlcixcbiAgICAgICAgICBjb25maWc6ICRzY29wZS5jb25maWdcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgU3RyaWRlci5wdXQoJy8nICsgbmFtZSArICcvJywgZGF0YSwgc3VjY2Vzcyk7XG5cbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICAgICRzY29wZS5wcm9qZWN0cy5wdXNoKHtcbiAgICAgICAgICBkaXNwbGF5X25hbWU6ICRzY29wZS5kaXNwbGF5X25hbWUsXG4gICAgICAgICAgZGlzcGxheV91cmw6ICRzY29wZS5kaXNwbGF5X3VybCxcbiAgICAgICAgICBwcm92aWRlcjoge1xuICAgICAgICAgICAgaWQ6IHByb3ZpZGVyLFxuICAgICAgICAgICAgY29uZmlnOiAkc2NvcGUuY29uZmlnXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLmNvbmZpZyA9IHt9O1xuICAgICAgICAkc2NvcGUuZGlzcGxheV9uYW1lID0gJyc7XG4gICAgICAgICRzY29wZS5kaXNwbGF5X3VybCA9ICcnO1xuICAgICAgICAkc2NvcGUuc3VjY2VzcygnQ3JlYXRlZCBwcm9qZWN0IScpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ1Byb2plY3RzQ3RybCcsIFsnJHNjb3BlJywgJyRzY2UnLCAnU3RyaWRlcicsIFByb2plY3RzQ3RybF0pO1xuXG5mdW5jdGlvbiBQcm9qZWN0c0N0cmwoJHNjb3BlLCAkc2NlLCBTdHJpZGVyKSB7XG5cbiAgU3RyaWRlci5nZXQoJy9hcGkvcHJvamVjdHMnLCBmdW5jdGlvbihyZXNwKSB7XG5cbiAgICAkc2NvcGUudW5jb25maWd1cmVkID0gcmVzcC51bmNvbmZpZ3VyZWQ7XG4gICAgJHNjb3BlLnByb3ZpZGVycyA9IHJlc3AucHJvdmlkZXJzO1xuICAgICRzY29wZS5tYW51YWwgPSByZXNwLm1hbnVhbDtcbiAgICAkc2NvcGUubWFudWFsUHJvamVjdHMgPSByZXNwLm1hbnVhbFByb2plY3RzO1xuICAgICRzY29wZS5yZXBvcyA9IHJlc3AucmVwb3M7XG4gICAgJHNjb3BlLnByb2plY3RfdHlwZXMgPSByZXNwLnByb2plY3RfdHlwZXM7XG5cbiAgICAkc2NvcGUucHJvamVjdHNQYWdlID0gdHJ1ZTtcblxuXG4gICAgLy8vIFRydXN0IHNvbWUgY29udGVudFxuXG4gICAgT2JqZWN0LmtleXMoJHNjb3BlLm1hbnVhbCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBpdGVtID0gJHNjb3BlLm1hbnVhbFtrZXldO1xuICAgICAgaWYgKGl0ZW0ucHJvdmlkZXIgJiYgaXRlbS5wcm92aWRlci5odG1sKVxuICAgICAgICBpdGVtLnByb3ZpZGVyLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKGl0ZW0ucHJvdmlkZXIuaHRtbCk7XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5yZW1vdmVQcm9qZWN0ID0gZnVuY3Rpb24gKGFjY291bnQsIHJlcG8sIGdyb3VwKSB7XG4gICAgICByZXBvLnJlYWxseV9yZW1vdmUgPSAncmVtb3ZpbmcnO1xuXG4gICAgICBTdHJpZGVyLmRlbCgnLycgKyByZXBvLm5hbWUgKyAnLycsIHN1Y2Nlc3MpO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICByZXBvLnByb2plY3QgPSBudWxsO1xuICAgICAgICByZXBvLnJlYWxseV9yZW1vdmUgPSBmYWxzZTtcbiAgICAgICAgZ3JvdXAuY29uZmlndXJlZC0tO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0dXBQcm9qZWN0ID0gZnVuY3Rpb24gKGFjY291bnQsIHJlcG8sIHR5cGUsIGdyb3VwKSB7XG4gICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgZGlzcGxheV9uYW1lOiByZXBvLmRpc3BsYXlfbmFtZSB8fCByZXBvLm5hbWUsXG4gICAgICAgIGRpc3BsYXlfdXJsOiByZXBvLmRpc3BsYXlfdXJsLFxuICAgICAgICBwcm9qZWN0X3R5cGU6IHR5cGUsXG4gICAgICAgIHByb3ZpZGVyOiB7XG4gICAgICAgICAgaWQ6IGFjY291bnQucHJvdmlkZXIsXG4gICAgICAgICAgYWNjb3VudDogYWNjb3VudC5pZCxcbiAgICAgICAgICByZXBvX2lkOiByZXBvLmlkLFxuICAgICAgICAgIGNvbmZpZzogcmVwby5jb25maWdcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgU3RyaWRlci5wdXQoJy8nICsgcmVwby5uYW1lICsgJy8nLCBkYXRhLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgIHJlcG8ucHJvamVjdCA9IGRhdGEucHJvamVjdDtcbiAgICAgICAgcmVwby5hZGRpbmcgPSAnZG9uZSc7XG4gICAgICAgIGdyb3VwLmNvbmZpZ3VyZWQrKztcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnN0YXJ0VGVzdCA9IGZ1bmN0aW9uIChyZXBvKSB7XG5cbiAgICAgIFN0cmlkZXIucG9zdCgnLycgKyByZXBvLnByb2plY3QubmFtZSArICcvc3RhcnQnLCBzdWNjZXNzKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcygpIHtcbiAgICAgICAgcmVwby5hZGRpbmcgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ1Rlc3Qgc3RhcnRlZCBmb3IgJyArIHJlcG8ucHJvamVjdC5uYW1lICsgJy4gPGEgaHJlZj1cIi8nICsgcmVwby5wcm9qZWN0Lm5hbWUgKyAnL1wiIHRhcmdldD1cIl9ibGFua1wiPkNsaWNrIHRvIHdhdGNoIGl0IHJ1bjwvYT4nKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ1JlbG9hZEN0cmwnLCBbJyRsb2NhdGlvbicsIGZ1bmN0aW9uKCRsb2NhdGlvbikge1xuICB3aW5kb3cubG9jYXRpb24gPSAkbG9jYXRpb24ucGF0aCgpO1xufV0pOyIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ1Jvb3RDdHJsJywgWyckc2NvcGUnLCAnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIFJvb3RDcnRsXSk7XG5cbmZ1bmN0aW9uIFJvb3RDcnRsKCRzY29wZSwgJHJvb3RTY29wZSwgJGxvY2F0aW9uLCBTdHJpZGVyKSB7XG5cbiAgZnVuY3Rpb24gZ2V0VXNlcigpIHtcbiAgICBTdHJpZGVyLmdldCgnL2FwaS9zZXNzaW9uJywgZnVuY3Rpb24oc2Vzc2lvbikge1xuICAgICAgaWYgKHNlc3Npb24udXNlcikge1xuICAgICAgICAkc2NvcGUuY3VycmVudFVzZXIgPSBzZXNzaW9uLnVzZXI7XG4gICAgICAgICRzY29wZS5hY2NvdW50cyA9IHNlc3Npb24udXNlci5hY2NvdW50cztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdub3VzZXInKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gICRzY29wZS5nZXRVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCEgJHNjb3BlLmN1cnJlbnRVc2VyKSBnZXRVc2VyKCk7XG4gIH07XG5cbiAgJHJvb3RTY29wZS4kb24oJ2xvZ291dCcsIGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5jdXJyZW50VXNlciA9IHVuZGVmaW5lZDtcbiAgfSk7XG5cbiAgJHJvb3RTY29wZS4kb24oJ2xvZ2luJywgZ2V0VXNlcik7XG5cbiAgZ2V0VXNlcigpO1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmRpcmVjdGl2ZSgnZHluYW1pY0NvbnRyb2xsZXInLCBkeW5hbWljQ29udHJvbGxlcik7XG5cbmZ1bmN0aW9uIGR5bmFtaWNDb250cm9sbGVyKCRjb21waWxlLCAkY29udHJvbGxlcikge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgdGVybWluYWw6IHRydWUsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsbSwgYXR0cnMpIHtcbiAgICAgIHZhciBsYXN0U2NvcGU7XG4gICAgICBzY29wZS4kd2F0Y2goYXR0cnMuZHluYW1pY0NvbnRyb2xsZXIsIGZ1bmN0aW9uKGN0cmxOYW1lKSB7XG4gICAgICAgIGlmICghIGN0cmxOYW1lKSByZXR1cm47XG5cbiAgICAgICAgdmFyIG5ld1Njb3BlID0gc2NvcGUuJG5ldygpO1xuXG4gICAgICAgIHZhciBjdHJsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGN0cmwgPSAkY29udHJvbGxlcihjdHJsTmFtZSwgeyRzY29wZTogbmV3U2NvcGV9KTtcbiAgICAgICAgfSBjYXRjaCAoX2Vycikge1xuICAgICAgICAgIC8vIG5vdCBmb3VuZFxuICAgICAgICAgICBpZiAoY3RybE5hbWUuaW5kZXhPZignLicpICE9IGN0cmxOYW1lLmxlbmd0aCAtIDEpXG4gICAgICAgICAgICBsb2coJ0NvdWxkIG5vdCBmaW5kIGNvbnRyb2xsZXIgd2l0aCBuYW1lICcgKyBjdHJsTmFtZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxhc3RTY29wZSkgbGFzdFNjb3BlLiRkZXN0cm95KCk7XG5cbiAgICAgICAgZWxtLmNvbnRlbnRzKCkuZGF0YSgnJG5nQ29udHJvbGxlckNvbnRyb2xsZXInLCBjdHJsKTtcbiAgICAgICAgJGNvbXBpbGUoZWxtLmNvbnRlbnRzKCkpKG5ld1Njb3BlKTtcblxuICAgICAgICB2YXIgaW5pdCA9IGF0dHJzLm5nSW5pdDtcbiAgICAgICAgaWYgKGluaXQpIG5ld1Njb3BlLiRldmFsKGluaXQpO1xuXG4gICAgICAgIGxhc3RTY29wZSA9IG5ld1Njb3BlO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIGlmIChjb25zb2xlICYmIGNvbnNvbGUubG9nKSBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xufSIsIlxuLy8gaW5zdGVhZCBvZiBcImFib3V0ICVkIGhvdXJzXCJcbiQudGltZWFnby5zZXR0aW5ncy5zdHJpbmdzLmhvdXIgPSAnYW4gaG91cic7XG4kLnRpbWVhZ28uc2V0dGluZ3Muc3RyaW5ncy5ob3VycyA9ICclZCBob3Vycyc7XG4kLnRpbWVhZ28uc2V0dGluZ3MubG9jYWxlVGl0bGUgPSB0cnVlO1xuXG52YXIgdGltZV91bml0cyA9IFtcbiAge1xuICAgIG1zOiA2MCAqIDYwICogMTAwMCxcbiAgICBjbHM6ICdob3VycycsXG4gICAgc3VmZml4OiAnaCdcbiAgfSwge1xuICAgIG1zOiA2MCAqIDEwMDAsXG4gICAgY2xzOiAnbWludXRlcycsXG4gICAgc3VmZml4OiAnbSdcbiAgfSwge1xuICAgIG1zOiAxMDAwLFxuICAgIGNsczogJ3NlY29uZHMnLFxuICAgIHN1ZmZpeDogJ3MnXG4gIH0sIHtcbiAgICBtczogMCxcbiAgICBjbHM6ICdtaWxpc2Vjb25kcycsXG4gICAgc3VmZml4OiAnbXMnXG4gIH1cbl07XG5cblxuZnVuY3Rpb24gdGV4dER1cmF0aW9uKGR1cmF0aW9uLCBlbCwgd2hvbGUpIHtcbiAgaWYgKCFkdXJhdGlvbikgcmV0dXJuICQoZWwpLnRleHQoJycpO1xuICB2YXIgY2xzID0gJycsIHRleHQ7XG4gIGZvciAodmFyIGk9MDsgaTx0aW1lX3VuaXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGR1cmF0aW9uIDwgdGltZV91bml0c1tpXS5tcykgY29udGludWU7XG4gICAgY2xzID0gdGltZV91bml0c1tpXS5jbHM7XG4gICAgdGV4dCA9IGR1cmF0aW9uICsgJyc7XG4gICAgaWYgKHRpbWVfdW5pdHNbaV0ubXMpIHtcbiAgICAgIGlmICh3aG9sZSkgdGV4dCA9IHBhcnNlSW50KGR1cmF0aW9uIC8gdGltZV91bml0c1tpXS5tcylcbiAgICAgIGVsc2UgdGV4dCA9IHBhcnNlSW50KGR1cmF0aW9uIC8gdGltZV91bml0c1tpXS5tcyAqIDEwKSAvIDEwXG4gICAgfVxuICAgIHRleHQgKz0gdGltZV91bml0c1tpXS5zdWZmaXg7XG4gICAgYnJlYWs7XG4gIH1cbiAgJChlbCkuYWRkQ2xhc3MoY2xzKS50ZXh0KHRleHQpO1xufVxuXG5mdW5jdGlvbiBzaW5jZShzdGFtcCwgZWwpIHtcbiAgdmFyIHRoZW4gPSBuZXcgRGF0ZShzdGFtcCkuZ2V0VGltZSgpO1xuICBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIHRleHREdXJhdGlvbihub3cgLSB0aGVuLCBlbCwgdHJ1ZSk7XG4gIH1cbiAgdXBkYXRlKCk7XG4gIHJldHVybiBzZXRJbnRlcnZhbCh1cGRhdGUsIDUwMCk7XG59XG5cbnZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuLy8gdGltZWFnbyBkaXJlY3RpdmVcbkFwcC5kaXJlY3RpdmUoXCJ0aW1lXCIsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiBcIkVcIixcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgIGlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGF0dHJzLnNpbmNlICYmICFhdHRycy5kdXJhdGlvbikge1xuICAgICAgICB2YXIgaXZhbCA9IHNpbmNlKGF0dHJzLnNpbmNlLCBlbGVtZW50KTtcbiAgICAgICAgJChlbGVtZW50KS50b29sdGlwKHt0aXRsZTogJ1N0YXJ0ZWQgJyArIG5ldyBEYXRlKGF0dHJzLnNpbmNlKS50b0xvY2FsZVN0cmluZygpfSk7XG4gICAgICAgIGF0dHJzLiRvYnNlcnZlKCdzaW5jZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkKGVsZW1lbnQpLnRvb2x0aXAoe3RpdGxlOiAnU3RhcnRlZCAnICsgbmV3IERhdGUoYXR0cnMuc2luY2UpLnRvTG9jYWxlU3RyaW5nKCl9KTtcbiAgICAgICAgICBjbGVhckludGVydmFsKGl2YWwpO1xuICAgICAgICAgIGl2YWwgPSBzaW5jZShhdHRycy5zaW5jZSwgZWxlbWVudCk7XG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaXZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB2YXIgZGF0ZVxuICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgYXR0cnMuZGF0ZXRpbWUpIHtcbiAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKGF0dHJzLmRhdGV0aW1lKTtcbiAgICAgICAgJChlbGVtZW50KS50b29sdGlwKHt0aXRsZTogZGF0ZS50b0xvY2FsZVN0cmluZygpfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGF0dHJzLmR1cmF0aW9uKSB7XG4gICAgICAgIGF0dHJzLiRvYnNlcnZlKCdkdXJhdGlvbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0ZXh0RHVyYXRpb24oYXR0cnMuZHVyYXRpb24sIGVsZW1lbnQpO1xuICAgICAgICB9KVxuICAgICAgICByZXR1cm4gdGV4dER1cmF0aW9uKGF0dHJzLmR1cmF0aW9uLCBlbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgYXR0cnMuJG9ic2VydmUoJ2RhdGV0aW1lJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBkYXRlID0gbmV3IERhdGUoYXR0cnMuZGF0ZXRpbWUpO1xuICAgICAgICAkKGVsZW1lbnQpLnRvb2x0aXAoe3RpdGxlOiBkYXRlLnRvTG9jYWxlU3RyaW5nKCl9KTtcbiAgICAgICAgJChlbGVtZW50KS50ZXh0KCQudGltZWFnbyhkYXRlKSk7XG4gICAgICB9KVxuICAgICAgLy8gVE9ETzogdXNlIG1vbWVudC5qc1xuICAgICAgJChlbGVtZW50KS50ZXh0KCQudGltZWFnbyhkYXRlKSk7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChlbGVtZW50KS50aW1lYWdvKCk7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gIH07XG59KTsiLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5kaXJlY3RpdmUoXCJ0b2dnbGVcIiwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6IFwiQVwiLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgaWYgKGF0dHJzLnRvZ2dsZSAhPT0gJ3Rvb2x0aXAnKSByZXR1cm47XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAkKGVsZW1lbnQpLnRvb2x0aXAoKTtcbiAgICAgIH0sIDApO1xuICAgICAgYXR0cnMuJG9ic2VydmUoJ3RpdGxlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGVsZW1lbnQpLnRvb2x0aXAoKTtcbiAgICAgIH0pO1xuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCgnLnRvb2x0aXAnKS5oaWRlKCk7XG4gICAgICAgICQoZWxlbWVudCkudG9vbHRpcCgnaGlkZScpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7IiwidmFyIGFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5hcHAuZmlsdGVyKCdhbnNpJywgWyckc2NlJywgZnVuY3Rpb24gKCRzY2UpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmICghaW5wdXQpIHJldHVybiAnJztcbiAgICB2YXIgdGV4dCA9IGlucHV0LnJlcGxhY2UoL15bXlxcblxccl0qXFx1MDAxYlxcWzJLL2dtLCAnJylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcdTAwMWJcXFtLW15cXG5cXHJdKi9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1teXFxuXSpcXHIoW15cXG5dKS9nLCAnJDEnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXlteXFxuXSpcXHUwMDFiXFxbMEcvZ20sICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgICByZXR1cm4gJHNjZS50cnVzdEFzSHRtbChhbnNpZmlsdGVyKHRleHQpKTtcbiAgfVxufV0pO1xuXG5mdW5jdGlvbiBhbnNpcGFyc2Uoc3RyKSB7XG4gIC8vXG4gIC8vIEknbSB0ZXJyaWJsZSBhdCB3cml0aW5nIHBhcnNlcnMuXG4gIC8vXG4gIHZhciBtYXRjaGluZ0NvbnRyb2wgPSBudWxsLFxuICAgICAgbWF0Y2hpbmdEYXRhID0gbnVsbCxcbiAgICAgIG1hdGNoaW5nVGV4dCA9ICcnLFxuICAgICAgYW5zaVN0YXRlID0gW10sXG4gICAgICByZXN1bHQgPSBbXSxcbiAgICAgIG91dHB1dCA9IFwiXCIsXG4gICAgICBzdGF0ZSA9IHt9LFxuICAgICAgZXJhc2VDaGFyO1xuXG4gIHZhciBoYW5kbGVSZXN1bHQgPSBmdW5jdGlvbihwKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbXTtcblxuICAgIHAuZm9yZWdyb3VuZCAmJiBjbGFzc2VzLnB1c2gocC5mb3JlZ3JvdW5kKTtcbiAgICBwLmJhY2tncm91bmQgJiYgY2xhc3Nlcy5wdXNoKCdiZy0nICsgcC5iYWNrZ3JvdW5kKTtcbiAgICBwLmJvbGQgICAgICAgJiYgY2xhc3Nlcy5wdXNoKCdib2xkJyk7XG4gICAgcC5pdGFsaWMgICAgICYmIGNsYXNzZXMucHVzaCgnaXRhbGljJyk7XG4gICAgaWYgKCFwLnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNsYXNzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gb3V0cHV0ICs9IHAudGV4dFxuICAgIH1cbiAgICB2YXIgc3BhbiA9ICc8c3BhbiBjbGFzcz1cIicgKyBjbGFzc2VzLmpvaW4oJyAnKSArICdcIj4nICsgcC50ZXh0ICsgJzwvc3Bhbj4nXG4gICAgb3V0cHV0ICs9IHNwYW5cbiAgfVxuICAvL1xuICAvLyBHZW5lcmFsIHdvcmtmbG93IGZvciB0aGlzIHRoaW5nIGlzOlxuICAvLyBcXDAzM1xcWzMzbVRleHRcbiAgLy8gfCAgICAgfCAgfFxuICAvLyB8ICAgICB8ICBtYXRjaGluZ1RleHRcbiAgLy8gfCAgICAgbWF0Y2hpbmdEYXRhXG4gIC8vIG1hdGNoaW5nQ29udHJvbFxuICAvL1xuICAvLyBJbiBmdXJ0aGVyIHN0ZXBzIHdlIGhvcGUgaXQncyBhbGwgZ29pbmcgdG8gYmUgZmluZS4gSXQgdXN1YWxseSBpcy5cbiAgLy9cblxuICAvL1xuICAvLyBFcmFzZXMgYSBjaGFyIGZyb20gdGhlIG91dHB1dFxuICAvL1xuICBlcmFzZUNoYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGluZGV4LCB0ZXh0O1xuICAgIGlmIChtYXRjaGluZ1RleHQubGVuZ3RoKSB7XG4gICAgICBtYXRjaGluZ1RleHQgPSBtYXRjaGluZ1RleHQuc3Vic3RyKDAsIG1hdGNoaW5nVGV4dC5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgZWxzZSBpZiAocmVzdWx0Lmxlbmd0aCkge1xuICAgICAgaW5kZXggPSByZXN1bHQubGVuZ3RoIC0gMTtcbiAgICAgIHRleHQgPSByZXN1bHRbaW5kZXhdLnRleHQ7XG4gICAgICBpZiAodGV4dC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gQSByZXN1bHQgYml0IHdhcyBmdWxseSBkZWxldGVkLCBwb3AgaXQgb3V0IHRvIHNpbXBsaWZ5IHRoZSBmaW5hbCBvdXRwdXRcbiAgICAgICAgLy9cbiAgICAgICAgcmVzdWx0LnBvcCgpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJlc3VsdFtpbmRleF0udGV4dCA9IHRleHQuc3Vic3RyKDAsIHRleHQubGVuZ3RoIC0gMSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG1hdGNoaW5nQ29udHJvbCAhPT0gbnVsbCkge1xuICAgICAgaWYgKG1hdGNoaW5nQ29udHJvbCA9PSAnXFwwMzMnICYmIHN0cltpXSA9PSAnXFxbJykge1xuICAgICAgICAvL1xuICAgICAgICAvLyBXZSd2ZSBtYXRjaGVkIGZ1bGwgY29udHJvbCBjb2RlLiBMZXRzIHN0YXJ0IG1hdGNoaW5nIGZvcm1hdGluZyBkYXRhLlxuICAgICAgICAvL1xuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFwiZW1pdFwiIG1hdGNoZWQgdGV4dCB3aXRoIGNvcnJlY3Qgc3RhdGVcbiAgICAgICAgLy9cbiAgICAgICAgaWYgKG1hdGNoaW5nVGV4dCkge1xuICAgICAgICAgIHN0YXRlLnRleHQgPSBtYXRjaGluZ1RleHQ7XG4gICAgICAgICAgaGFuZGxlUmVzdWx0KHN0YXRlKTtcbiAgICAgICAgICBzdGF0ZSA9IHt9O1xuICAgICAgICAgIG1hdGNoaW5nVGV4dCA9IFwiXCI7XG4gICAgICAgIH1cblxuICAgICAgICBtYXRjaGluZ0NvbnRyb2wgPSBudWxsO1xuICAgICAgICBtYXRjaGluZ0RhdGEgPSAnJztcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAvL1xuICAgICAgICAvLyBXZSBmYWlsZWQgdG8gbWF0Y2ggYW55dGhpbmcgLSBtb3N0IGxpa2VseSBhIGJhZCBjb250cm9sIGNvZGUuIFdlXG4gICAgICAgIC8vIGdvIGJhY2sgdG8gbWF0Y2hpbmcgcmVndWxhciBzdHJpbmdzLlxuICAgICAgICAvL1xuICAgICAgICBtYXRjaGluZ1RleHQgKz0gbWF0Y2hpbmdDb250cm9sICsgc3RyW2ldO1xuICAgICAgICBtYXRjaGluZ0NvbnRyb2wgPSBudWxsO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGVsc2UgaWYgKG1hdGNoaW5nRGF0YSAhPT0gbnVsbCkge1xuICAgICAgaWYgKHN0cltpXSA9PSAnOycpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gYDtgIHNlcGFyYXRlcyBtYW55IGZvcm1hdHRpbmcgY29kZXMsIGZvciBleGFtcGxlOiBgXFwwMzNbMzM7NDNtYFxuICAgICAgICAvLyBtZWFucyB0aGF0IGJvdGggYDMzYCBhbmQgYDQzYCBzaG91bGQgYmUgYXBwbGllZC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETzogdGhpcyBjYW4gYmUgc2ltcGxpZmllZCBieSBtb2RpZnlpbmcgc3RhdGUgaGVyZS5cbiAgICAgICAgLy9cbiAgICAgICAgYW5zaVN0YXRlLnB1c2gobWF0Y2hpbmdEYXRhKTtcbiAgICAgICAgbWF0Y2hpbmdEYXRhID0gJyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChzdHJbaV0gPT0gJ20nKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIGBtYCBmaW5pc2hlZCB3aG9sZSBmb3JtYXR0aW5nIGNvZGUuIFdlIGNhbiBwcm9jZWVkIHRvIG1hdGNoaW5nXG4gICAgICAgIC8vIGZvcm1hdHRlZCB0ZXh0LlxuICAgICAgICAvL1xuICAgICAgICBhbnNpU3RhdGUucHVzaChtYXRjaGluZ0RhdGEpO1xuICAgICAgICBtYXRjaGluZ0RhdGEgPSBudWxsO1xuICAgICAgICBtYXRjaGluZ1RleHQgPSAnJztcblxuICAgICAgICAvL1xuICAgICAgICAvLyBDb252ZXJ0IG1hdGNoZWQgZm9ybWF0dGluZyBkYXRhIGludG8gdXNlci1mcmllbmRseSBzdGF0ZSBvYmplY3QuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE86IERSWS5cbiAgICAgICAgLy9cbiAgICAgICAgYW5zaVN0YXRlLmZvckVhY2goZnVuY3Rpb24gKGFuc2lDb2RlKSB7XG4gICAgICAgICAgaWYgKGFuc2lwYXJzZS5mb3JlZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXSkge1xuICAgICAgICAgICAgc3RhdGUuZm9yZWdyb3VuZCA9IGFuc2lwYXJzZS5mb3JlZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaXBhcnNlLmJhY2tncm91bmRDb2xvcnNbYW5zaUNvZGVdKSB7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kID0gYW5zaXBhcnNlLmJhY2tncm91bmRDb2xvcnNbYW5zaUNvZGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAzOSkge1xuICAgICAgICAgICAgZGVsZXRlIHN0YXRlLmZvcmVncm91bmQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDQ5KSB7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUuYmFja2dyb3VuZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaXBhcnNlLnN0eWxlc1thbnNpQ29kZV0pIHtcbiAgICAgICAgICAgIHN0YXRlW2Fuc2lwYXJzZS5zdHlsZXNbYW5zaUNvZGVdXSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDIyKSB7XG4gICAgICAgICAgICBzdGF0ZS5ib2xkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDIzKSB7XG4gICAgICAgICAgICBzdGF0ZS5pdGFsaWMgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMjQpIHtcbiAgICAgICAgICAgIHN0YXRlLnVuZGVybGluZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGFuc2lTdGF0ZSA9IFtdO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG1hdGNoaW5nRGF0YSArPSBzdHJbaV07XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoc3RyW2ldID09ICdcXDAzMycpIHtcbiAgICAgIG1hdGNoaW5nQ29udHJvbCA9IHN0cltpXTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3RyW2ldID09ICdcXHUwMDA4Jykge1xuICAgICAgZXJhc2VDaGFyKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbWF0Y2hpbmdUZXh0ICs9IHN0cltpXTtcbiAgICB9XG4gIH1cblxuICBpZiAobWF0Y2hpbmdUZXh0KSB7XG4gICAgc3RhdGUudGV4dCA9IG1hdGNoaW5nVGV4dCArIChtYXRjaGluZ0NvbnRyb2wgPyBtYXRjaGluZ0NvbnRyb2wgOiAnJyk7XG4gICAgaGFuZGxlUmVzdWx0KHN0YXRlKTtcbiAgfVxuICByZXR1cm4gb3V0cHV0O1xufVxuXG5hbnNpcGFyc2UuZm9yZWdyb3VuZENvbG9ycyA9IHtcbiAgJzMwJzogJ2JsYWNrJyxcbiAgJzMxJzogJ3JlZCcsXG4gICczMic6ICdncmVlbicsXG4gICczMyc6ICd5ZWxsb3cnLFxuICAnMzQnOiAnYmx1ZScsXG4gICczNSc6ICdtYWdlbnRhJyxcbiAgJzM2JzogJ2N5YW4nLFxuICAnMzcnOiAnd2hpdGUnLFxuICAnOTAnOiAnZ3JleSdcbn07XG5cbmFuc2lwYXJzZS5iYWNrZ3JvdW5kQ29sb3JzID0ge1xuICAnNDAnOiAnYmxhY2snLFxuICAnNDEnOiAncmVkJyxcbiAgJzQyJzogJ2dyZWVuJyxcbiAgJzQzJzogJ3llbGxvdycsXG4gICc0NCc6ICdibHVlJyxcbiAgJzQ1JzogJ21hZ2VudGEnLFxuICAnNDYnOiAnY3lhbicsXG4gICc0Nyc6ICd3aGl0ZSdcbn07XG5cbmFuc2lwYXJzZS5zdHlsZXMgPSB7XG4gICcxJzogJ2JvbGQnLFxuICAnMyc6ICdpdGFsaWMnLFxuICAnNCc6ICd1bmRlcmxpbmUnXG59O1xuXG5mdW5jdGlvbiBhbnNpZmlsdGVyKGRhdGEsIHBsYWludGV4dCwgY2FjaGUpIHtcblxuICAvLyBoYW5kbGUgdGhlIGNoYXJhY3RlcnMgZm9yIFwiZGVsZXRlIGxpbmVcIiBhbmQgXCJtb3ZlIHRvIHN0YXJ0IG9mIGxpbmVcIlxuICB2YXIgc3RhcnRzd2l0aGNyID0gL15bXlxcbl0qXFxyW15cXG5dLy50ZXN0KGRhdGEpO1xuICB2YXIgb3V0cHV0ID0gYW5zaXBhcnNlKGRhdGEpO1xuXG4gIHZhciByZXMgPSBvdXRwdXQucmVwbGFjZSgvXFwwMzMvZywgJycpO1xuICBpZiAoc3RhcnRzd2l0aGNyKSByZXMgPSAnXFxyJyArIHJlcztcblxuICByZXR1cm4gcmVzO1xufVxuXG4iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5maWx0ZXIoJ3BlcmNlbnRhZ2UnLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoaW5wdXQsIHByZWMpIHtcbiAgICBpZiAoIWlucHV0ICYmIHBhcnNlSW50KGlucHV0KSAhPT0gMCkgcmV0dXJuICcnO1xuICAgIHZhciBieSA9IE1hdGgucG93KDEwLCBwcmVjIHx8IDEpXG4gICAgcmV0dXJuIHBhcnNlSW50KHBhcnNlRmxvYXQoaW5wdXQpICogYnksIDEwKS9ieSArICclJ1xuICB9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gWyckcm9vdFNjb3BlJywgJyRxJywgZnVuY3Rpb24oJHNjb3BlLCAkcSkge1xuXG4gIGZ1bmN0aW9uIHN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH1cblxuICBmdW5jdGlvbiBlcnJvcihyZXNwb25zZSkge1xuICAgIHZhciBzdGF0dXMgPSByZXNwb25zZS5zdGF0dXM7XG5cbiAgICB2YXIgcmVzcCA9IHJlc3BvbnNlLmRhdGE7XG4gICAgaWYgKHJlc3ApIHRyeSB7IHJlc3AgPSBKU09OLnBhcnNlKHJlc3ApOyB9IGNhdGNoKGVycikgeyB9XG5cbiAgICBpZiAocmVzcC5tZXNzYWdlKSByZXNwID0gcmVzcC5tZXNzYWdlO1xuICAgIGlmICghIHJlc3ApIHtcbiAgICAgIHJlc3AgPSAnRXJyb3IgaW4gcmVzcG9uc2UnO1xuICAgICAgaWYgKHN0YXR1cykgcmVzcCArPSAnICgnICsgc3RhdHVzICsgJyknO1xuICAgIH1cblxuICAgICRzY29wZS4kZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IocmVzcCkpO1xuXG4gICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKHN1Y2Nlc3MsIGVycm9yKTtcbiAgfVxuXG59XTsiLCJ2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIGluaGVyaXRzICAgICA9IHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cztcbnZhciBleHRlbmQgICAgICAgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVKb2JTdG9yZTtcbmZ1bmN0aW9uIGNyZWF0ZUpvYlN0b3JlKCkge1xuICByZXR1cm4gbmV3IEpvYlN0b3JlO1xufVxuXG52YXIgUEhBU0VTID0gZXhwb3J0cy5waGFzZXMgPVxuWydlbnZpcm9ubWVudCcsICdwcmVwYXJlJywgJ3Rlc3QnLCAnZGVwbG95JywgJ2NsZWFudXAnXTtcblxudmFyIHN0YXR1c0hhbmRsZXJzID0ge1xuICAnc3RhcnRlZCc6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zdGFydGVkID0gdGltZTtcbiAgICB0aGlzLnBoYXNlID0gJ2Vudmlyb25tZW50JztcbiAgICB0aGlzLnN0YXR1cyA9ICdydW5uaW5nJztcbiAgfSxcbiAgJ2Vycm9yZWQnOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICB0aGlzLmVycm9yID0gZXJyb3I7XG4gICAgdGhpcy5zdGF0dXMgPSAnZXJyb3JlZCc7XG4gIH0sXG4gICdjYW5jZWxlZCc6ICdlcnJvcmVkJyxcbiAgJ3BoYXNlLmRvbmUnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHRoaXMucGhhc2UgPSBQSEFTRVMuaW5kZXhPZihkYXRhLnBoYXNlKSArIDE7XG4gIH0sXG4gIC8vIHRoaXMgaXMganVzdCBzbyB3ZSdsbCB0cmlnZ2VyIHRoZSBcInVua25vd24gam9iXCIgbG9va3VwIHNvb25lciBvbiB0aGUgZGFzaGJvYXJkXG4gICd3YXJuaW5nJzogZnVuY3Rpb24gKHdhcm5pbmcpIHtcbiAgICBpZiAoIXRoaXMud2FybmluZ3MpIHtcbiAgICAgIHRoaXMud2FybmluZ3MgPSBbXTtcbiAgICB9XG4gICAgdGhpcy53YXJuaW5ncy5wdXNoKHdhcm5pbmcpO1xuICB9LFxuICAncGx1Z2luLWRhdGEnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBwYXRoID0gZGF0YS5wYXRoID8gW2RhdGEucGx1Z2luXS5jb25jYXQoZGF0YS5wYXRoLnNwbGl0KCcuJykpIDogW2RhdGEucGx1Z2luXVxuICAgICwgbGFzdCA9IHBhdGgucG9wKClcbiAgICAsIG1ldGhvZCA9IGRhdGEubWV0aG9kIHx8ICdyZXBsYWNlJ1xuICAgICwgcGFyZW50XG4gICAgcGFyZW50ID0gcGF0aC5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgYXR0cikge1xuICAgICAgcmV0dXJuIG9ialthdHRyXSB8fCAob2JqW2F0dHJdID0ge30pXG4gICAgfSwgdGhpcy5wbHVnaW5fZGF0YSB8fCAodGhpcy5wbHVnaW5fZGF0YSA9IHt9KSlcbiAgICBpZiAobWV0aG9kID09PSAncmVwbGFjZScpIHtcbiAgICAgIHBhcmVudFtsYXN0XSA9IGRhdGEuZGF0YVxuICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSAncHVzaCcpIHtcbiAgICAgIGlmICghcGFyZW50W2xhc3RdKSB7XG4gICAgICAgIHBhcmVudFtsYXN0XSA9IFtdXG4gICAgICB9XG4gICAgICBwYXJlbnRbbGFzdF0ucHVzaChkYXRhLmRhdGEpXG4gICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdleHRlbmQnKSB7XG4gICAgICBpZiAoIXBhcmVudFtsYXN0XSkge1xuICAgICAgICBwYXJlbnRbbGFzdF0gPSB7fVxuICAgICAgfVxuICAgICAgZXh0ZW5kKHBhcmVudFtsYXN0XSwgZGF0YS5kYXRhKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZygnSW52YWxpZCBcInBsdWdpbiBkYXRhXCIgbWV0aG9kIHJlY2VpdmVkIGZyb20gcGx1Z2luJywgZGF0YS5wbHVnaW4sIGRhdGEubWV0aG9kLCBkYXRhKVxuICAgIH1cbiAgfSxcblxuICAncGhhc2UuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZmluaXNoZWQgPSBkYXRhLnRpbWU7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZHVyYXRpb24gPSBkYXRhLmVsYXBzZWRcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5leGl0Q29kZSA9IGRhdGEuY29kZTtcbiAgICBpZiAoWydwcmVwYXJlJywgJ2Vudmlyb25tZW50JywgJ2NsZWFudXAnXS5pbmRleE9mKGRhdGEucGhhc2UpICE9PSAtMSkge1xuICAgICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uY29sbGFwc2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGRhdGEucGhhc2UgPT09ICd0ZXN0JykgdGhpcy50ZXN0X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoZGF0YS5waGFzZSA9PT0gJ2RlcGxveScpIHRoaXMuZGVwbG95X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoIWRhdGEubmV4dCB8fCAhdGhpcy5waGFzZXNbZGF0YS5uZXh0XSkgcmV0dXJuO1xuICAgIHRoaXMucGhhc2UgPSBkYXRhLm5leHQ7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5uZXh0XS5zdGFydGVkID0gZGF0YS50aW1lO1xuICB9LFxuICAnY29tbWFuZC5jb21tZW50JzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kKTtcbiAgICBjb21tYW5kLmNvbW1hbmQgPSBkYXRhLmNvbW1lbnQ7XG4gICAgY29tbWFuZC5jb21tZW50ID0gdHJ1ZTtcbiAgICBjb21tYW5kLnBsdWdpbiA9IGRhdGEucGx1Z2luO1xuICAgIGNvbW1hbmQuZmluaXNoZWQgPSBkYXRhLnRpbWU7XG4gICAgcGhhc2UuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfSxcbiAgJ2NvbW1hbmQuc3RhcnQnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQsIGRhdGEpO1xuICAgIGNvbW1hbmQuc3RhcnRlZCA9IGRhdGEudGltZTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9LFxuICAnY29tbWFuZC5kb25lJzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gcGhhc2UuY29tbWFuZHNbcGhhc2UuY29tbWFuZHMubGVuZ3RoIC0gMV07XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBjb21tYW5kLmR1cmF0aW9uID0gZGF0YS5lbGFwc2VkO1xuICAgIGNvbW1hbmQuZXhpdENvZGUgPSBkYXRhLmV4aXRDb2RlO1xuICAgIGNvbW1hbmQubWVyZ2VkID0gY29tbWFuZC5fbWVyZ2VkO1xuICB9LFxuICAnc3Rkb3V0JzogZnVuY3Rpb24gKHRleHQpIHtcbiAgICB2YXIgY29tbWFuZCA9IGVuc3VyZUNvbW1hbmQodGhpcy5waGFzZXNbdGhpcy5waGFzZV0pO1xuICAgIGNvbW1hbmQub3V0ICs9IHRleHQ7XG4gICAgY29tbWFuZC5fbWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQub3V0ICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkX2xhdGVzdCA9IHRleHQ7XG4gIH0sXG4gICdzdGRlcnInOiBmdW5jdGlvbiAodGV4dCkge1xuICAgIHZhciBjb21tYW5kID0gZW5zdXJlQ29tbWFuZCh0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXSk7XG4gICAgY29tbWFuZC5lcnIgKz0gdGV4dDtcbiAgICBjb21tYW5kLl9tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5lcnIgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWRfbGF0ZXN0ID0gdGV4dDtcbiAgfVxufVxuXG5mdW5jdGlvbiBKb2JTdG9yZSgpIHtcbiAgdmFyIHN0b3JlID0gdGhpcztcbiAgc3RvcmUuam9icyA9IHtcbiAgICBwdWJsaWM6IFtdLFxuICAgIHlvdXJzOiBbXVxuICB9O1xuXG4gIHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKCdTVE9SRSBKT0JTOicsIHN0b3JlLmpvYnMpO1xuICB9LCA1MDAwKTtcbn1cblxuaW5oZXJpdHMoSm9iU3RvcmUsIEV2ZW50RW1pdHRlcik7XG5cbnZhciBKUyA9IEpvYlN0b3JlLnByb3RvdHlwZTtcblxuXG4vLy8gRGFzaGJvYXJkIERhdGFcblxuSlMuZGFzaGJvYXJkID0gZnVuY3Rpb24gZGFzaGJvYXJkKGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5zb2NrZXQuZW1pdCgnZGFzaGJvYXJkOmpvYnMnLCBmdW5jdGlvbihqb2JzKSB7XG4gICAgc2VsZi5qb2JzLnlvdXJzID0gam9icy55b3VycztcbiAgICBzZWxmLmpvYnMucHVibGljID0gam9icy5wdWJsaWM7XG4gICAgc2VsZi5qb2JzLnlvdXJzLmZvckVhY2goZml4Sm9iKTtcbiAgICBzZWxmLmpvYnMucHVibGljLmZvckVhY2goZml4Sm9iKTtcbiAgICBpZiAoY2IpIGNiKCk7XG4gICAgc2VsZi5jaGFuZ2VkKCk7XG4gIH0pO1xufVxuXG5cbi8vLyAtLS0tIEpvYiBTdG9yZSBwcm90b3R5cGUgZnVuY3Rpb25zOiAtLS0tXG5cbi8vLyBjb25uZWN0XG5cbkpTLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KHNvY2tldCwgY2hhbmdlQ2FsbGJhY2spIHtcbiAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG4gIHRoaXMuY2hhbmdlQ2FsbGJhY2sgPSBjaGFuZ2VDYWxsYmFjaztcblxuICBmb3IgKHZhciBzdGF0dXMgaW4gc3RhdHVzSGFuZGxlcnMpIHtcbiAgICBzb2NrZXQub24oJ2pvYi5zdGF0dXMuJyArIHN0YXR1cywgdGhpcy51cGRhdGUuYmluZCh0aGlzLCBzdGF0dXMpKVxuICB9XG5cbiAgc29ja2V0Lm9uKCdqb2IubmV3JywgSlMubmV3Sm9iLmJpbmQodGhpcykpO1xufTtcblxuLy8vIHNldEpvYnNcblxuSlMuc2V0Sm9icyA9IGZ1bmN0aW9uIHNldEpvYnMoam9icykge1xuICB0aGlzLmpvYnMueW91cnMgPSBqb2JzLnlvdXJzO1xuICB0aGlzLmpvYnMucHVibGljID0gam9icy5wdWJsaWM7XG4gIHRoaXMuam9icy55b3Vycy5mb3JFYWNoKGZpeEpvYik7XG4gIHRoaXMuam9icy5wdWJsaWMuZm9yRWFjaChmaXhKb2IpO1xufTtcblxuXG4vLy8gdXBkYXRlIC0gaGFuZGxlIHVwZGF0ZSBldmVudFxuXG5KUy51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZXZlbnQsIGFyZ3MsIGFjY2VzcywgZG9udGNoYW5nZSkge1xuICB2YXIgaWQgPSBhcmdzLnNoaWZ0KClcbiAgICAsIGpvYiA9IHRoaXMuam9iKGlkLCBhY2Nlc3MpXG4gICAgLCBoYW5kbGVyID0gc3RhdHVzSGFuZGxlcnNbZXZlbnRdO1xuXG4gIGlmICgham9iKSByZXR1cm47IC8vIHRoaXMudW5rbm93bihpZCwgZXZlbnQsIGFyZ3MsIGFjY2VzcylcbiAgaWYgKCFoYW5kbGVyKSByZXR1cm47XG5cbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgaGFuZGxlcikge1xuICAgIGpvYi5zdGF0dXMgPSBoYW5kbGVyO1xuICB9IGVsc2Uge1xuICAgIGhhbmRsZXIuYXBwbHkoam9iLCBhcmdzKTtcbiAgfVxuICBpZiAoIWRvbnRjaGFuZ2UpIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuXG4vLy8gbmV3Sm9iIC0gd2hlbiBzZXJ2ZXIgbm90aWZpZXMgb2YgbmV3IGpvYlxuXG5KUy5uZXdKb2IgPSBmdW5jdGlvbiBuZXdKb2Ioam9iLCBhY2Nlc3MpIHtcbiAgaWYgKCEgam9iKSByZXR1cm47XG4gIGlmIChBcnJheS5pc0FycmF5KGpvYikpIGpvYiA9IGpvYlswXTtcblxuICB2YXIgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdXG4gICAgLCBmb3VuZCA9IC0xXG4gICAgLCBvbGQ7XG5cbiAgZm9yICh2YXIgaT0wOyBpPGpvYnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoam9ic1tpXSAmJiBqb2JzW2ldLnByb2plY3QubmFtZSA9PT0gam9iLnByb2plY3QubmFtZSkge1xuICAgICAgZm91bmQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKGZvdW5kID4gLTEpIHtcbiAgICBvbGQgPSBqb2JzLnNwbGljZShmb3VuZCwgMSlbMF07XG4gICAgam9iLnByb2plY3QucHJldiA9IG9sZC5wcm9qZWN0LnByZXY7XG4gIH1cblxuICBqb2JzLnVuc2hpZnQoam9iKTtcblxuICBmaXhKb2Ioam9iKTtcblxuICB0aGlzLmVtaXQoJ25ld2pvYicsIGpvYik7XG4gIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuXG4vLy8gam9iIC0gZmluZCBhIGpvYiBieSBpZCBhbmQgYWNjZXNzIGxldmVsXG5cbkpTLmpvYiA9IGZ1bmN0aW9uIGpvYihpZCwgYWNjZXNzKSB7XG4gIHJldHVybiBzZWFyY2goaWQsIHRoaXMuam9ic1thY2Nlc3NdKTtcbn07XG5cbmZ1bmN0aW9uIHNlYXJjaChpZCwgam9icykge1xuICB2YXIgam9iO1xuICBmb3IgKHZhciBpPTA7IGk8am9icy5sZW5ndGg7IGkrKykge1xuICAgIGpvYiA9IGpvYnNbaV07XG4gICAgaWYgKGpvYiAmJiBqb2IuX2lkID09PSBpZCkgcmV0dXJuIGpvYjtcbiAgfVxufVxuXG5cbi8vLyBjaGFuZ2VkIC0gbm90aWZpZXMgVUkgb2YgY2hhbmdlc1xuXG5KUy5jaGFuZ2VkID0gZnVuY3Rpb24gY2hhbmdlZCgpIHtcbiAgdGhpcy5jaGFuZ2VDYWxsYmFjaygpO1xufTtcblxuXG4vLy8gbG9hZCDigJTCoGxvYWRzIGEgam9iXG5cbkpTLmxvYWQgPSBmdW5jdGlvbiBsb2FkKGpvYklkLCBwcm9qZWN0LCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGRlc3RpbmF0aW9uID0gcHJvamVjdC5hY2Nlc3NfbGV2ZWwgPiAxID8gJ3lvdXJzJyA6ICdwdWJsaWMnO1xuXG4gIHRoaXMuc29ja2V0LmVtaXQoJ2J1aWxkOmpvYicsIGpvYklkLCBmdW5jdGlvbihqb2IpIHtcbiAgICAvLy8gSEFDSzogdGhlIHNvY2tldCBlbWl0cyBhIGpvYiB0aGF0IGlzIG1pc3NpbmcgdGhlIGBwcm9qZWN0YFxuICAgIC8vLyBzdHJ1Y3R1cmUgKGluc3RlYWQgdGhlIGBwcm9qZWN0YCB2YWx1ZSBpcyBhIHN0cmluZylcbiAgICAvLy8gQXR0YWNoIGEgcHJvcGVyIHByb2plY3Qgc3RydWN0dXJlIHRvIGl0LlxuICAgIGpvYi5wcm9qZWN0ID0gcHJvamVjdDtcblxuICAgIC8vLyBOZXcgam9iIGhhcyB1bmtub3duIGFjY2Vzcz9cbiAgICBzZWxmLm5ld0pvYihqb2IsIGRlc3RpbmF0aW9uKTtcbiAgICBjYihqb2IpO1xuICAgIHNlbGYuY2hhbmdlZCgpO1xuICB9KTtcbn07XG5cbmZ1bmN0aW9uIGVuc3VyZUNvbW1hbmQocGhhc2UpIHtcbiAgdmFyIGNvbW1hbmQgPSBwaGFzZS5jb21tYW5kc1twaGFzZS5jb21tYW5kcy5sZW5ndGggLSAxXTtcbiAgaWYgKCFjb21tYW5kIHx8IHR5cGVvZiBjb21tYW5kLmZpbmlzaGVkICE9ICd1bmRlZmluZWQnKSB7XG4gICAgY29tbWFuZCA9IGV4dGVuZCh7fSwgU0tFTFMuY29tbWFuZCk7XG4gICAgcGhhc2UuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfVxuICByZXR1cm4gY29tbWFuZDtcbn1cblxuXG4vLy8gSEFDSzogRml4IGpvYiBzdHJ1Y3R1cmVcblxuZnVuY3Rpb24gZml4Sm9iKGpvYikge1xuXG4gIGlmICghIGpvYi5waGFzZXMpIHtcbiAgICBqb2IucGhhc2VzID0ge307XG4gICAgUEhBU0VTLmZvckVhY2goZnVuY3Rpb24ocGhhc2UpIHtcbiAgICAgIGpvYi5waGFzZXNbcGhhc2VdID0ge1xuICAgICAgICBjb21tYW5kczogW11cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBpZiAoISBqb2IucGhhc2UpIGpvYi5waGFzZSA9IFBIQVNFU1swXTtcblxuICBpZiAoISBqb2Iuc3RkKSBqb2Iuc3RkID0gZXh0ZW5kKHt9LCBTS0VMUy5qb2Iuc3RkKTtcbn1cblxuXG52YXIgU0tFTFMgPSB7XG4gIGpvYjoge1xuICAgIGlkOiBudWxsLFxuICAgIGRhdGE6IG51bGwsXG4gICAgcGhhc2VzOiB7fSxcbiAgICBwaGFzZTogUEhBU0VTWzBdLFxuICAgIHF1ZXVlZDogbnVsbCxcbiAgICBzdGFydGVkOiBudWxsLFxuICAgIGZpbmlzaGVkOiBudWxsLFxuICAgIHRlc3Rfc3RhdHVzOiBudWxsLFxuICAgIGRlcGxveV9zdGF0dXM6IG51bGwsXG4gICAgcGx1Z2luX2RhdGE6IHt9LFxuICAgIHdhcm5pbmdzOiBbXSxcbiAgICBzdGQ6IHtcbiAgICAgIG91dDogJycsXG4gICAgICBlcnI6ICcnLFxuICAgICAgbWVyZ2VkOiAnJyxcbiAgICAgIG1lcmdlZF9sYXRlc3Q6ICcnXG4gICAgfVxuICB9LFxuICBjb21tYW5kOiB7XG4gICAgb3V0OiAnJyxcbiAgICBlcnI6ICcnLFxuICAgIG1lcmdlZDogJycsXG4gICAgX21lcmdlZDogJycsXG4gICAgc3RhcnRlZDogbnVsbCxcbiAgICBjb21tYW5kOiAnJyxcbiAgICBwbHVnaW46ICcnXG4gIH0sXG4gIHBoYXNlOiB7XG4gICAgZmluaXNoZWQ6IG51bGwsXG4gICAgZXhpdENvZGU6IG51bGwsXG4gICAgY29tbWFuZHM6IFtdXG4gIH1cbn0iLCJmdW5jdGlvbiBtZDVjeWNsZSh4LCBrKSB7XG52YXIgYSA9IHhbMF0sIGIgPSB4WzFdLCBjID0geFsyXSwgZCA9IHhbM107XG5cbmEgPSBmZihhLCBiLCBjLCBkLCBrWzBdLCA3LCAtNjgwODc2OTM2KTtcbmQgPSBmZihkLCBhLCBiLCBjLCBrWzFdLCAxMiwgLTM4OTU2NDU4Nik7XG5jID0gZmYoYywgZCwgYSwgYiwga1syXSwgMTcsICA2MDYxMDU4MTkpO1xuYiA9IGZmKGIsIGMsIGQsIGEsIGtbM10sIDIyLCAtMTA0NDUyNTMzMCk7XG5hID0gZmYoYSwgYiwgYywgZCwga1s0XSwgNywgLTE3NjQxODg5Nyk7XG5kID0gZmYoZCwgYSwgYiwgYywga1s1XSwgMTIsICAxMjAwMDgwNDI2KTtcbmMgPSBmZihjLCBkLCBhLCBiLCBrWzZdLCAxNywgLTE0NzMyMzEzNDEpO1xuYiA9IGZmKGIsIGMsIGQsIGEsIGtbN10sIDIyLCAtNDU3MDU5ODMpO1xuYSA9IGZmKGEsIGIsIGMsIGQsIGtbOF0sIDcsICAxNzcwMDM1NDE2KTtcbmQgPSBmZihkLCBhLCBiLCBjLCBrWzldLCAxMiwgLTE5NTg0MTQ0MTcpO1xuYyA9IGZmKGMsIGQsIGEsIGIsIGtbMTBdLCAxNywgLTQyMDYzKTtcbmIgPSBmZihiLCBjLCBkLCBhLCBrWzExXSwgMjIsIC0xOTkwNDA0MTYyKTtcbmEgPSBmZihhLCBiLCBjLCBkLCBrWzEyXSwgNywgIDE4MDQ2MDM2ODIpO1xuZCA9IGZmKGQsIGEsIGIsIGMsIGtbMTNdLCAxMiwgLTQwMzQxMTAxKTtcbmMgPSBmZihjLCBkLCBhLCBiLCBrWzE0XSwgMTcsIC0xNTAyMDAyMjkwKTtcbmIgPSBmZihiLCBjLCBkLCBhLCBrWzE1XSwgMjIsICAxMjM2NTM1MzI5KTtcblxuYSA9IGdnKGEsIGIsIGMsIGQsIGtbMV0sIDUsIC0xNjU3OTY1MTApO1xuZCA9IGdnKGQsIGEsIGIsIGMsIGtbNl0sIDksIC0xMDY5NTAxNjMyKTtcbmMgPSBnZyhjLCBkLCBhLCBiLCBrWzExXSwgMTQsICA2NDM3MTc3MTMpO1xuYiA9IGdnKGIsIGMsIGQsIGEsIGtbMF0sIDIwLCAtMzczODk3MzAyKTtcbmEgPSBnZyhhLCBiLCBjLCBkLCBrWzVdLCA1LCAtNzAxNTU4NjkxKTtcbmQgPSBnZyhkLCBhLCBiLCBjLCBrWzEwXSwgOSwgIDM4MDE2MDgzKTtcbmMgPSBnZyhjLCBkLCBhLCBiLCBrWzE1XSwgMTQsIC02NjA0NzgzMzUpO1xuYiA9IGdnKGIsIGMsIGQsIGEsIGtbNF0sIDIwLCAtNDA1NTM3ODQ4KTtcbmEgPSBnZyhhLCBiLCBjLCBkLCBrWzldLCA1LCAgNTY4NDQ2NDM4KTtcbmQgPSBnZyhkLCBhLCBiLCBjLCBrWzE0XSwgOSwgLTEwMTk4MDM2OTApO1xuYyA9IGdnKGMsIGQsIGEsIGIsIGtbM10sIDE0LCAtMTg3MzYzOTYxKTtcbmIgPSBnZyhiLCBjLCBkLCBhLCBrWzhdLCAyMCwgIDExNjM1MzE1MDEpO1xuYSA9IGdnKGEsIGIsIGMsIGQsIGtbMTNdLCA1LCAtMTQ0NDY4MTQ2Nyk7XG5kID0gZ2coZCwgYSwgYiwgYywga1syXSwgOSwgLTUxNDAzNzg0KTtcbmMgPSBnZyhjLCBkLCBhLCBiLCBrWzddLCAxNCwgIDE3MzUzMjg0NzMpO1xuYiA9IGdnKGIsIGMsIGQsIGEsIGtbMTJdLCAyMCwgLTE5MjY2MDc3MzQpO1xuXG5hID0gaGgoYSwgYiwgYywgZCwga1s1XSwgNCwgLTM3ODU1OCk7XG5kID0gaGgoZCwgYSwgYiwgYywga1s4XSwgMTEsIC0yMDIyNTc0NDYzKTtcbmMgPSBoaChjLCBkLCBhLCBiLCBrWzExXSwgMTYsICAxODM5MDMwNTYyKTtcbmIgPSBoaChiLCBjLCBkLCBhLCBrWzE0XSwgMjMsIC0zNTMwOTU1Nik7XG5hID0gaGgoYSwgYiwgYywgZCwga1sxXSwgNCwgLTE1MzA5OTIwNjApO1xuZCA9IGhoKGQsIGEsIGIsIGMsIGtbNF0sIDExLCAgMTI3Mjg5MzM1Myk7XG5jID0gaGgoYywgZCwgYSwgYiwga1s3XSwgMTYsIC0xNTU0OTc2MzIpO1xuYiA9IGhoKGIsIGMsIGQsIGEsIGtbMTBdLCAyMywgLTEwOTQ3MzA2NDApO1xuYSA9IGhoKGEsIGIsIGMsIGQsIGtbMTNdLCA0LCAgNjgxMjc5MTc0KTtcbmQgPSBoaChkLCBhLCBiLCBjLCBrWzBdLCAxMSwgLTM1ODUzNzIyMik7XG5jID0gaGgoYywgZCwgYSwgYiwga1szXSwgMTYsIC03MjI1MjE5NzkpO1xuYiA9IGhoKGIsIGMsIGQsIGEsIGtbNl0sIDIzLCAgNzYwMjkxODkpO1xuYSA9IGhoKGEsIGIsIGMsIGQsIGtbOV0sIDQsIC02NDAzNjQ0ODcpO1xuZCA9IGhoKGQsIGEsIGIsIGMsIGtbMTJdLCAxMSwgLTQyMTgxNTgzNSk7XG5jID0gaGgoYywgZCwgYSwgYiwga1sxNV0sIDE2LCAgNTMwNzQyNTIwKTtcbmIgPSBoaChiLCBjLCBkLCBhLCBrWzJdLCAyMywgLTk5NTMzODY1MSk7XG5cbmEgPSBpaShhLCBiLCBjLCBkLCBrWzBdLCA2LCAtMTk4NjMwODQ0KTtcbmQgPSBpaShkLCBhLCBiLCBjLCBrWzddLCAxMCwgIDExMjY4OTE0MTUpO1xuYyA9IGlpKGMsIGQsIGEsIGIsIGtbMTRdLCAxNSwgLTE0MTYzNTQ5MDUpO1xuYiA9IGlpKGIsIGMsIGQsIGEsIGtbNV0sIDIxLCAtNTc0MzQwNTUpO1xuYSA9IGlpKGEsIGIsIGMsIGQsIGtbMTJdLCA2LCAgMTcwMDQ4NTU3MSk7XG5kID0gaWkoZCwgYSwgYiwgYywga1szXSwgMTAsIC0xODk0OTg2NjA2KTtcbmMgPSBpaShjLCBkLCBhLCBiLCBrWzEwXSwgMTUsIC0xMDUxNTIzKTtcbmIgPSBpaShiLCBjLCBkLCBhLCBrWzFdLCAyMSwgLTIwNTQ5MjI3OTkpO1xuYSA9IGlpKGEsIGIsIGMsIGQsIGtbOF0sIDYsICAxODczMzEzMzU5KTtcbmQgPSBpaShkLCBhLCBiLCBjLCBrWzE1XSwgMTAsIC0zMDYxMTc0NCk7XG5jID0gaWkoYywgZCwgYSwgYiwga1s2XSwgMTUsIC0xNTYwMTk4MzgwKTtcbmIgPSBpaShiLCBjLCBkLCBhLCBrWzEzXSwgMjEsICAxMzA5MTUxNjQ5KTtcbmEgPSBpaShhLCBiLCBjLCBkLCBrWzRdLCA2LCAtMTQ1NTIzMDcwKTtcbmQgPSBpaShkLCBhLCBiLCBjLCBrWzExXSwgMTAsIC0xMTIwMjEwMzc5KTtcbmMgPSBpaShjLCBkLCBhLCBiLCBrWzJdLCAxNSwgIDcxODc4NzI1OSk7XG5iID0gaWkoYiwgYywgZCwgYSwga1s5XSwgMjEsIC0zNDM0ODU1NTEpO1xuXG54WzBdID0gYWRkMzIoYSwgeFswXSk7XG54WzFdID0gYWRkMzIoYiwgeFsxXSk7XG54WzJdID0gYWRkMzIoYywgeFsyXSk7XG54WzNdID0gYWRkMzIoZCwgeFszXSk7XG5cbn1cblxuZnVuY3Rpb24gY21uKHEsIGEsIGIsIHgsIHMsIHQpIHtcbmEgPSBhZGQzMihhZGQzMihhLCBxKSwgYWRkMzIoeCwgdCkpO1xucmV0dXJuIGFkZDMyKChhIDw8IHMpIHwgKGEgPj4+ICgzMiAtIHMpKSwgYik7XG59XG5cbmZ1bmN0aW9uIGZmKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbnJldHVybiBjbW4oKGIgJiBjKSB8ICgofmIpICYgZCksIGEsIGIsIHgsIHMsIHQpO1xufVxuXG5mdW5jdGlvbiBnZyhhLCBiLCBjLCBkLCB4LCBzLCB0KSB7XG5yZXR1cm4gY21uKChiICYgZCkgfCAoYyAmICh+ZCkpLCBhLCBiLCB4LCBzLCB0KTtcbn1cblxuZnVuY3Rpb24gaGgoYSwgYiwgYywgZCwgeCwgcywgdCkge1xucmV0dXJuIGNtbihiIF4gYyBeIGQsIGEsIGIsIHgsIHMsIHQpO1xufVxuXG5mdW5jdGlvbiBpaShhLCBiLCBjLCBkLCB4LCBzLCB0KSB7XG5yZXR1cm4gY21uKGMgXiAoYiB8ICh+ZCkpLCBhLCBiLCB4LCBzLCB0KTtcbn1cblxuZnVuY3Rpb24gbWQ1MShzKSB7XG50eHQgPSAnJztcbnZhciBuID0gcy5sZW5ndGgsXG5zdGF0ZSA9IFsxNzMyNTg0MTkzLCAtMjcxNzMzODc5LCAtMTczMjU4NDE5NCwgMjcxNzMzODc4XSwgaTtcbmZvciAoaT02NDsgaTw9cy5sZW5ndGg7IGkrPTY0KSB7XG5tZDVjeWNsZShzdGF0ZSwgbWQ1YmxrKHMuc3Vic3RyaW5nKGktNjQsIGkpKSk7XG59XG5zID0gcy5zdWJzdHJpbmcoaS02NCk7XG52YXIgdGFpbCA9IFswLDAsMCwwLCAwLDAsMCwwLCAwLDAsMCwwLCAwLDAsMCwwXTtcbmZvciAoaT0wOyBpPHMubGVuZ3RoOyBpKyspXG50YWlsW2k+PjJdIHw9IHMuY2hhckNvZGVBdChpKSA8PCAoKGklNCkgPDwgMyk7XG50YWlsW2k+PjJdIHw9IDB4ODAgPDwgKChpJTQpIDw8IDMpO1xuaWYgKGkgPiA1NSkge1xubWQ1Y3ljbGUoc3RhdGUsIHRhaWwpO1xuZm9yIChpPTA7IGk8MTY7IGkrKykgdGFpbFtpXSA9IDA7XG59XG50YWlsWzE0XSA9IG4qODtcbm1kNWN5Y2xlKHN0YXRlLCB0YWlsKTtcbnJldHVybiBzdGF0ZTtcbn1cblxuLyogdGhlcmUgbmVlZHMgdG8gYmUgc3VwcG9ydCBmb3IgVW5pY29kZSBoZXJlLFxuICogdW5sZXNzIHdlIHByZXRlbmQgdGhhdCB3ZSBjYW4gcmVkZWZpbmUgdGhlIE1ELTVcbiAqIGFsZ29yaXRobSBmb3IgbXVsdGktYnl0ZSBjaGFyYWN0ZXJzIChwZXJoYXBzXG4gKiBieSBhZGRpbmcgZXZlcnkgZm91ciAxNi1iaXQgY2hhcmFjdGVycyBhbmRcbiAqIHNob3J0ZW5pbmcgdGhlIHN1bSB0byAzMiBiaXRzKS4gT3RoZXJ3aXNlXG4gKiBJIHN1Z2dlc3QgcGVyZm9ybWluZyBNRC01IGFzIGlmIGV2ZXJ5IGNoYXJhY3RlclxuICogd2FzIHR3byBieXRlcy0tZS5nLiwgMDA0MCAwMDI1ID0gQCUtLWJ1dCB0aGVuXG4gKiBob3cgd2lsbCBhbiBvcmRpbmFyeSBNRC01IHN1bSBiZSBtYXRjaGVkP1xuICogVGhlcmUgaXMgbm8gd2F5IHRvIHN0YW5kYXJkaXplIHRleHQgdG8gc29tZXRoaW5nXG4gKiBsaWtlIFVURi04IGJlZm9yZSB0cmFuc2Zvcm1hdGlvbjsgc3BlZWQgY29zdCBpc1xuICogdXR0ZXJseSBwcm9oaWJpdGl2ZS4gVGhlIEphdmFTY3JpcHQgc3RhbmRhcmRcbiAqIGl0c2VsZiBuZWVkcyB0byBsb29rIGF0IHRoaXM6IGl0IHNob3VsZCBzdGFydFxuICogcHJvdmlkaW5nIGFjY2VzcyB0byBzdHJpbmdzIGFzIHByZWZvcm1lZCBVVEYtOFxuICogOC1iaXQgdW5zaWduZWQgdmFsdWUgYXJyYXlzLlxuICovXG5mdW5jdGlvbiBtZDVibGsocykgeyAvKiBJIGZpZ3VyZWQgZ2xvYmFsIHdhcyBmYXN0ZXIuICAgKi9cbnZhciBtZDVibGtzID0gW10sIGk7IC8qIEFuZHkgS2luZyBzYWlkIGRvIGl0IHRoaXMgd2F5LiAqL1xuZm9yIChpPTA7IGk8NjQ7IGkrPTQpIHtcbm1kNWJsa3NbaT4+Ml0gPSBzLmNoYXJDb2RlQXQoaSlcbisgKHMuY2hhckNvZGVBdChpKzEpIDw8IDgpXG4rIChzLmNoYXJDb2RlQXQoaSsyKSA8PCAxNilcbisgKHMuY2hhckNvZGVBdChpKzMpIDw8IDI0KTtcbn1cbnJldHVybiBtZDVibGtzO1xufVxuXG52YXIgaGV4X2NociA9ICcwMTIzNDU2Nzg5YWJjZGVmJy5zcGxpdCgnJyk7XG5cbmZ1bmN0aW9uIHJoZXgobilcbntcbnZhciBzPScnLCBqPTA7XG5mb3IoOyBqPDQ7IGorKylcbnMgKz0gaGV4X2NoclsobiA+PiAoaiAqIDggKyA0KSkgJiAweDBGXVxuKyBoZXhfY2hyWyhuID4+IChqICogOCkpICYgMHgwRl07XG5yZXR1cm4gcztcbn1cblxuZnVuY3Rpb24gaGV4KHgpIHtcbmZvciAodmFyIGk9MDsgaTx4Lmxlbmd0aDsgaSsrKVxueFtpXSA9IHJoZXgoeFtpXSk7XG5yZXR1cm4geC5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gbWQ1KHMpIHtcbnJldHVybiBoZXgobWQ1MShzKSk7XG59XG5cbi8qIHRoaXMgZnVuY3Rpb24gaXMgbXVjaCBmYXN0ZXIsXG5zbyBpZiBwb3NzaWJsZSB3ZSB1c2UgaXQuIFNvbWUgSUVzXG5hcmUgdGhlIG9ubHkgb25lcyBJIGtub3cgb2YgdGhhdFxubmVlZCB0aGUgaWRpb3RpYyBzZWNvbmQgZnVuY3Rpb24sXG5nZW5lcmF0ZWQgYnkgYW4gaWYgY2xhdXNlLiAgKi9cblxuZnVuY3Rpb24gYWRkMzIoYSwgYikge1xucmV0dXJuIChhICsgYikgJiAweEZGRkZGRkZGO1xufVxuXG5pZiAobWQ1KCdoZWxsbycpICE9ICc1ZDQxNDAyYWJjNGIyYTc2Yjk3MTlkOTExMDE3YzU5MicpIHtcbmZ1bmN0aW9uIGFkZDMyKHgsIHkpIHtcbnZhciBsc3cgPSAoeCAmIDB4RkZGRikgKyAoeSAmIDB4RkZGRiksXG5tc3cgPSAoeCA+PiAxNikgKyAoeSA+PiAxNikgKyAobHN3ID4+IDE2KTtcbnJldHVybiAobXN3IDw8IDE2KSB8IChsc3cgJiAweEZGRkYpO1xufVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gbWQ1OyIsInZhciBKb2JTdG9yZSA9IHJlcXVpcmUoJy4vam9iX3N0b3JlJyk7XG52YXIgam9iU3RvcmUgPSBKb2JTdG9yZSgpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBCdWlsZFN0cmlkZXI7XG5cbmZ1bmN0aW9uIEJ1aWxkU3RyaWRlcigkaHR0cCkge1xuICByZXR1cm4gbmV3IFN0cmlkZXIoJGh0dHApO1xufVxuXG5cbnZhciBzb2NrZXQ7XG52YXIgc2NvcGVzID0gW107XG5cbmZ1bmN0aW9uIFN0cmlkZXIoJGh0dHAsIG9wdHMpIHtcbiAgaWYgKCEgb3B0cykgb3B0cyA9IHt9O1xuICBpZiAodHlwZW9mIG9wdHMgPT0gJ3N0cmluZycpXG4gICAgb3B0cyA9IHsgdXJsOiBvcHRzIH07XG5cbiAgdGhpcy51cmwgPSBvcHRzLnVybCB8fCAnLy9sb2NhbGhvc3Q6MzAwMCc7XG5cbiAgdGhpcy5waGFzZXMgID0gSm9iU3RvcmUucGhhc2VzO1xuXG4gIHRoaXMuc3RvcmUgPSBqb2JTdG9yZTtcblxuICB0aGlzLiRodHRwID0gJGh0dHA7XG59XG5cblxudmFyIFMgPSBTdHJpZGVyLnByb3RvdHlwZTtcblxuXG4vLy8gY2hhbmdlZCAtIGludm9rZWQgd2hlbiBVSSBuZWVkcyB1cGRhdGluZ1xuZnVuY3Rpb24gY2hhbmdlZCgpIHtcbiAgc2NvcGVzLmZvckVhY2goZnVuY3Rpb24oc2NvcGUpIHtcbiAgICBzY29wZS4kZGlnZXN0KCk7XG4gIH0pO1xufVxuXG5cbi8vLy8gLS0tLSBTdHJpZGVyIHByb3RvdHlwZSBmdW5jdGlvbnNcblxuLy8vIGNvbm5lY3Qgd2Vic29ja2V0XG5cblMuY29ubmVjdCA9IGZ1bmN0aW9uKHNjb3BlLCBqb2JzLCBjYikge1xuICBpZiAodHlwZW9mIGpvYnMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gam9icztcbiAgICBqb2JzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCEgc29ja2V0KSB7XG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQgPSBpby5jb25uZWN0KHRoaXMudXJsKTtcbiAgICBqb2JTdG9yZS5jb25uZWN0KHNvY2tldCwgY2hhbmdlZCk7XG4gIH1cblxuICAvLy8gY29ubmVjdHMgam9iIHN0b3JlIHRvIG5ldyBzb2NrZXRcbiAgaWYgKGpvYnMpIHtcbiAgICBqb2JTdG9yZS5zZXRKb2JzKGpvYnMpO1xuICAgIGlmIChjYikgY2IoKTtcbiAgfSBlbHNlIHtcbiAgICBqb2JTdG9yZS5jb25uZWN0KHNvY2tldCwgY2hhbmdlZCk7XG4gICAgdGhpcy5zdG9yZS5kYXNoYm9hcmQoY2IpO1xuICB9XG5cbiAgc2NvcGVzLnB1c2goc2NvcGUpO1xuICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgZm9yICh2YXIgaSA9IDAgOyAhIGZvdW5kICYmIGkgPCBzY29wZXMubGVuZ3RoOyBpICsrKSB7XG4gICAgICBpZiAoc2NvcGVzW2ldID09IHNjb3BlKSB7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgc2NvcGVzLnNwbGljZShpLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufTtcblxuXG4vLy8gZGVwbG95XG5cblMuZGVwbG95ID0gZnVuY3Rpb24gZGVwbG95KHByb2plY3QpIHtcbiAgdGhpcy5zb2NrZXQuZW1pdCgnZGVwbG95JywgcHJvamVjdC5uYW1lIHx8IHByb2plY3QpO1xufTtcblxuUy50ZXN0ID0gZnVuY3Rpb24gdGVzdChwcm9qZWN0KSB7XG4gIHRoaXMuc29ja2V0LmVtaXQoJ3Rlc3QnLCBwcm9qZWN0Lm5hbWUgfHwgcHJvamVjdCk7XG59O1xuXG5cbi8vLyBqb2JcblxuUy5qb2IgPSBmdW5jdGlvbiBqb2Ioam9iSWQsIHByb2plY3QsIGNiKSB7XG4gIGpvYlN0b3JlLmxvYWQoam9iSWQsIHByb2plY3QsIGNiKTtcbn07XG5cblxuLy8vIEhUVFBcblxuUy5wb3N0ID0gZnVuY3Rpb24odXJsLCBib2R5LCBjYikge1xuICByZXR1cm4gdGhpcy5yZXF1ZXN0KCdQT1NUJywgdXJsLCBib2R5LCBjYik7XG59O1xuXG5TLnB1dCA9IGZ1bmN0aW9uKHVybCwgYm9keSwgY2IpIHtcbiAgcmV0dXJuIHRoaXMucmVxdWVzdCgnUFVUJywgdXJsLCBib2R5LCBjYik7XG59O1xuXG5TLmRlbCA9IGZ1bmN0aW9uKHVybCwgYm9keSwgY2IpIHtcbiAgcmV0dXJuIHRoaXMucmVxdWVzdCgnREVMRVRFJywgdXJsLCBib2R5LCBjYik7XG59O1xuXG5TLmdldCA9IGZ1bmN0aW9uKHVybCwgY2IpIHtcbiAgcmV0dXJuIHRoaXMucmVxdWVzdCgnR0VUJywgdXJsLCBjYik7XG59O1xuXG5TLnJlcXVlc3QgPSBmdW5jdGlvbihtZXRob2QsIHVybCwgYm9keSwgY2IpIHtcbiAgaWYgKHR5cGVvZiBib2R5ID09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGJvZHk7XG4gICAgYm9keSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhciByZXEgPSB0aGlzLiRodHRwKHtcbiAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICB1cmw6IHRoaXMudXJsICsgdXJsLFxuICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGJvZHkpXG4gIH0pO1xuXG4gIHJlcS5zdWNjZXNzKGNiKTtcblxuICByZXR1cm4gcmVxO1xufSIsIlxuXG4vL1xuLy8gVGhlIHNoaW1zIGluIHRoaXMgZmlsZSBhcmUgbm90IGZ1bGx5IGltcGxlbWVudGVkIHNoaW1zIGZvciB0aGUgRVM1XG4vLyBmZWF0dXJlcywgYnV0IGRvIHdvcmsgZm9yIHRoZSBwYXJ0aWN1bGFyIHVzZWNhc2VzIHRoZXJlIGlzIGluXG4vLyB0aGUgb3RoZXIgbW9kdWxlcy5cbi8vXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyBBcnJheS5pc0FycmF5IGlzIHN1cHBvcnRlZCBpbiBJRTlcbmZ1bmN0aW9uIGlzQXJyYXkoeHMpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gdHlwZW9mIEFycmF5LmlzQXJyYXkgPT09ICdmdW5jdGlvbicgPyBBcnJheS5pc0FycmF5IDogaXNBcnJheTtcblxuLy8gQXJyYXkucHJvdG90eXBlLmluZGV4T2YgaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZih4cywgeCkge1xuICBpZiAoeHMuaW5kZXhPZikgcmV0dXJuIHhzLmluZGV4T2YoeCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoeCA9PT0geHNbaV0pIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn07XG5cbi8vIEFycmF5LnByb3RvdHlwZS5maWx0ZXIgaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5maWx0ZXIgPSBmdW5jdGlvbiBmaWx0ZXIoeHMsIGZuKSB7XG4gIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZm4pO1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZm4oeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG4vLyBBcnJheS5wcm90b3R5cGUuZm9yRWFjaCBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoKHhzLCBmbiwgc2VsZikge1xuICBpZiAoeHMuZm9yRWFjaCkgcmV0dXJuIHhzLmZvckVhY2goZm4sIHNlbGYpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm4uY2FsbChzZWxmLCB4c1tpXSwgaSwgeHMpO1xuICB9XG59O1xuXG4vLyBBcnJheS5wcm90b3R5cGUubWFwIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmV4cG9ydHMubWFwID0gZnVuY3Rpb24gbWFwKHhzLCBmbikge1xuICBpZiAoeHMubWFwKSByZXR1cm4geHMubWFwKGZuKTtcbiAgdmFyIG91dCA9IG5ldyBBcnJheSh4cy5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0W2ldID0gZm4oeHNbaV0sIGksIHhzKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLnJlZHVjZSBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLnJlZHVjZSA9IGZ1bmN0aW9uIHJlZHVjZShhcnJheSwgY2FsbGJhY2ssIG9wdF9pbml0aWFsVmFsdWUpIHtcbiAgaWYgKGFycmF5LnJlZHVjZSkgcmV0dXJuIGFycmF5LnJlZHVjZShjYWxsYmFjaywgb3B0X2luaXRpYWxWYWx1ZSk7XG4gIHZhciB2YWx1ZSwgaXNWYWx1ZVNldCA9IGZhbHNlO1xuXG4gIGlmICgyIDwgYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHZhbHVlID0gb3B0X2luaXRpYWxWYWx1ZTtcbiAgICBpc1ZhbHVlU2V0ID0gdHJ1ZTtcbiAgfVxuICBmb3IgKHZhciBpID0gMCwgbCA9IGFycmF5Lmxlbmd0aDsgbCA+IGk7ICsraSkge1xuICAgIGlmIChhcnJheS5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgaWYgKGlzVmFsdWVTZXQpIHtcbiAgICAgICAgdmFsdWUgPSBjYWxsYmFjayh2YWx1ZSwgYXJyYXlbaV0sIGksIGFycmF5KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGFycmF5W2ldO1xuICAgICAgICBpc1ZhbHVlU2V0ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG5pZiAoJ2FiJy5zdWJzdHIoLTEpICE9PSAnYicpIHtcbiAgZXhwb3J0cy5zdWJzdHIgPSBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuZ3RoKSB7XG4gICAgLy8gZGlkIHdlIGdldCBhIG5lZ2F0aXZlIHN0YXJ0LCBjYWxjdWxhdGUgaG93IG11Y2ggaXQgaXMgZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmdcbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcblxuICAgIC8vIGNhbGwgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uXG4gICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbmd0aCk7XG4gIH07XG59IGVsc2Uge1xuICBleHBvcnRzLnN1YnN0ciA9IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW5ndGgpIHtcbiAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuZ3RoKTtcbiAgfTtcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS50cmltIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmV4cG9ydHMudHJpbSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKTtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG59O1xuXG4vLyBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLmJpbmQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgdmFyIGZuID0gYXJncy5zaGlmdCgpO1xuICBpZiAoZm4uYmluZCkgcmV0dXJuIGZuLmJpbmQuYXBwbHkoZm4sIGFyZ3MpO1xuICB2YXIgc2VsZiA9IGFyZ3Muc2hpZnQoKTtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICBmbi5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChbQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKV0pKTtcbiAgfTtcbn07XG5cbi8vIE9iamVjdC5jcmVhdGUgaXMgc3VwcG9ydGVkIGluIElFOVxuZnVuY3Rpb24gY3JlYXRlKHByb3RvdHlwZSwgcHJvcGVydGllcykge1xuICB2YXIgb2JqZWN0O1xuICBpZiAocHJvdG90eXBlID09PSBudWxsKSB7XG4gICAgb2JqZWN0ID0geyAnX19wcm90b19fJyA6IG51bGwgfTtcbiAgfVxuICBlbHNlIHtcbiAgICBpZiAodHlwZW9mIHByb3RvdHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICd0eXBlb2YgcHJvdG90eXBlWycgKyAodHlwZW9mIHByb3RvdHlwZSkgKyAnXSAhPSBcXCdvYmplY3RcXCcnXG4gICAgICApO1xuICAgIH1cbiAgICB2YXIgVHlwZSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIFR5cGUucHJvdG90eXBlID0gcHJvdG90eXBlO1xuICAgIG9iamVjdCA9IG5ldyBUeXBlKCk7XG4gICAgb2JqZWN0Ll9fcHJvdG9fXyA9IHByb3RvdHlwZTtcbiAgfVxuICBpZiAodHlwZW9mIHByb3BlcnRpZXMgIT09ICd1bmRlZmluZWQnICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMob2JqZWN0LCBwcm9wZXJ0aWVzKTtcbiAgfVxuICByZXR1cm4gb2JqZWN0O1xufVxuZXhwb3J0cy5jcmVhdGUgPSB0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJyA/IE9iamVjdC5jcmVhdGUgOiBjcmVhdGU7XG5cbi8vIE9iamVjdC5rZXlzIGFuZCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyBpcyBzdXBwb3J0ZWQgaW4gSUU5IGhvd2V2ZXJcbi8vIHRoZXkgZG8gc2hvdyBhIGRlc2NyaXB0aW9uIGFuZCBudW1iZXIgcHJvcGVydHkgb24gRXJyb3Igb2JqZWN0c1xuZnVuY3Rpb24gbm90T2JqZWN0KG9iamVjdCkge1xuICByZXR1cm4gKCh0eXBlb2Ygb2JqZWN0ICE9IFwib2JqZWN0XCIgJiYgdHlwZW9mIG9iamVjdCAhPSBcImZ1bmN0aW9uXCIpIHx8IG9iamVjdCA9PT0gbnVsbCk7XG59XG5cbmZ1bmN0aW9uIGtleXNTaGltKG9iamVjdCkge1xuICBpZiAobm90T2JqZWN0KG9iamVjdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0LmtleXMgY2FsbGVkIG9uIGEgbm9uLW9iamVjdFwiKTtcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBbXTtcbiAgZm9yICh2YXIgbmFtZSBpbiBvYmplY3QpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIG5hbWUpKSB7XG4gICAgICByZXN1bHQucHVzaChuYW1lKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gZ2V0T3duUHJvcGVydHlOYW1lcyBpcyBhbG1vc3QgdGhlIHNhbWUgYXMgT2JqZWN0LmtleXMgb25lIGtleSBmZWF0dXJlXG4vLyAgaXMgdGhhdCBpdCByZXR1cm5zIGhpZGRlbiBwcm9wZXJ0aWVzLCBzaW5jZSB0aGF0IGNhbid0IGJlIGltcGxlbWVudGVkLFxuLy8gIHRoaXMgZmVhdHVyZSBnZXRzIHJlZHVjZWQgc28gaXQganVzdCBzaG93cyB0aGUgbGVuZ3RoIHByb3BlcnR5IG9uIGFycmF5c1xuZnVuY3Rpb24gcHJvcGVydHlTaGltKG9iamVjdCkge1xuICBpZiAobm90T2JqZWN0KG9iamVjdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgY2FsbGVkIG9uIGEgbm9uLW9iamVjdFwiKTtcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBrZXlzU2hpbShvYmplY3QpO1xuICBpZiAoZXhwb3J0cy5pc0FycmF5KG9iamVjdCkgJiYgZXhwb3J0cy5pbmRleE9mKG9iamVjdCwgJ2xlbmd0aCcpID09PSAtMSkge1xuICAgIHJlc3VsdC5wdXNoKCdsZW5ndGgnKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG52YXIga2V5cyA9IHR5cGVvZiBPYmplY3Qua2V5cyA9PT0gJ2Z1bmN0aW9uJyA/IE9iamVjdC5rZXlzIDoga2V5c1NoaW07XG52YXIgZ2V0T3duUHJvcGVydHlOYW1lcyA9IHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyA9PT0gJ2Z1bmN0aW9uJyA/XG4gIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIDogcHJvcGVydHlTaGltO1xuXG5pZiAobmV3IEVycm9yKCkuaGFzT3duUHJvcGVydHkoJ2Rlc2NyaXB0aW9uJykpIHtcbiAgdmFyIEVSUk9SX1BST1BFUlRZX0ZJTFRFUiA9IGZ1bmN0aW9uIChvYmosIGFycmF5KSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgRXJyb3JdJykge1xuICAgICAgYXJyYXkgPSBleHBvcnRzLmZpbHRlcihhcnJheSwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5hbWUgIT09ICdkZXNjcmlwdGlvbicgJiYgbmFtZSAhPT0gJ251bWJlcicgJiYgbmFtZSAhPT0gJ21lc3NhZ2UnO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbiAgfTtcblxuICBleHBvcnRzLmtleXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIEVSUk9SX1BST1BFUlRZX0ZJTFRFUihvYmplY3QsIGtleXMob2JqZWN0KSk7XG4gIH07XG4gIGV4cG9ydHMuZ2V0T3duUHJvcGVydHlOYW1lcyA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICByZXR1cm4gRVJST1JfUFJPUEVSVFlfRklMVEVSKG9iamVjdCwgZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpKTtcbiAgfTtcbn0gZWxzZSB7XG4gIGV4cG9ydHMua2V5cyA9IGtleXM7XG4gIGV4cG9ydHMuZ2V0T3duUHJvcGVydHlOYW1lcyA9IGdldE93blByb3BlcnR5TmFtZXM7XG59XG5cbi8vIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgLSBzdXBwb3J0ZWQgaW4gSUU4IGJ1dCBvbmx5IG9uIGRvbSBlbGVtZW50c1xuZnVuY3Rpb24gdmFsdWVPYmplY3QodmFsdWUsIGtleSkge1xuICByZXR1cm4geyB2YWx1ZTogdmFsdWVba2V5XSB9O1xufVxuXG5pZiAodHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgdHJ5IHtcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHsnYSc6IDF9LCAnYScpO1xuICAgIGV4cG9ydHMuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIElFOCBkb20gZWxlbWVudCBpc3N1ZSAtIHVzZSBhIHRyeSBjYXRjaCBhbmQgZGVmYXVsdCB0byB2YWx1ZU9iamVjdFxuICAgIGV4cG9ydHMuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gdmFsdWVPYmplY3QodmFsdWUsIGtleSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufSBlbHNlIHtcbiAgZXhwb3J0cy5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPSB2YWx1ZU9iamVjdDtcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCF1dGlsLmlzTnVtYmVyKG4pIHx8IG4gPCAwKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAodXRpbC5pc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmICh1dGlsLmlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAodXRpbC5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodXRpbC5pc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgdXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAodXRpbC5pc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCF1dGlsLmlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIXV0aWwuaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG4gICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCF1dGlsLmlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICh1dGlsLmlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKHV0aWwuaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmICh1dGlsLmlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAodXRpbC5pc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKHV0aWwuaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIHNoaW1zID0gcmVxdWlyZSgnX3NoaW1zJyk7XG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgc2hpbXMuZm9yRWFjaChhcnJheSwgZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcyk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IHNoaW1zLmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gc2hpbXMuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cblxuICBzaGltcy5mb3JFYWNoKGtleXMsIGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IHNoaW1zLmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChzaGltcy5pbmRleE9mKGN0eC5zZWVuLCBkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gc2hpbXMucmVkdWNlKG91dHB1dCwgZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIHNoaW1zLmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmIG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmJpbmFyeVNsaWNlID09PSAnZnVuY3Rpb24nXG4gIDtcbn1cbmV4cG9ydHMuaXNCdWZmZXIgPSBpc0J1ZmZlcjtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gZnVuY3Rpb24oY3Rvciwgc3VwZXJDdG9yKSB7XG4gIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yO1xuICBjdG9yLnByb3RvdHlwZSA9IHNoaW1zLmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgY29uc3RydWN0b3I6IHtcbiAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH1cbiAgfSk7XG59O1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gc2hpbXMua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBoYXNLZXlzXG5cbmZ1bmN0aW9uIGhhc0tleXMoc291cmNlKSB7XG4gICAgcmV0dXJuIHNvdXJjZSAhPT0gbnVsbCAmJlxuICAgICAgICAodHlwZW9mIHNvdXJjZSA9PT0gXCJvYmplY3RcIiB8fFxuICAgICAgICB0eXBlb2Ygc291cmNlID09PSBcImZ1bmN0aW9uXCIpXG59XG4iLCJ2YXIgS2V5cyA9IHJlcXVpcmUoXCJvYmplY3Qta2V5c1wiKVxudmFyIGhhc0tleXMgPSByZXF1aXJlKFwiLi9oYXMta2V5c1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG4gICAgdmFyIHRhcmdldCA9IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgaWYgKCFoYXNLZXlzKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5cyA9IEtleXMoc291cmNlKVxuXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBrZXlzW2pdXG4gICAgICAgICAgICB0YXJnZXRbbmFtZV0gPSBzb3VyY2VbbmFtZV1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbiAoZm4pIHtcblx0dmFyIGlzRnVuYyA9ICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicgJiYgIShmbiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHx8IHRvU3RyaW5nLmNhbGwoZm4pID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHRpZiAoIWlzRnVuYyAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGlzRnVuYyA9IGZuID09PSB3aW5kb3cuc2V0VGltZW91dCB8fCBmbiA9PT0gd2luZG93LmFsZXJ0IHx8IGZuID09PSB3aW5kb3cuY29uZmlybSB8fCBmbiA9PT0gd2luZG93LnByb21wdDtcblx0fVxuXHRyZXR1cm4gaXNGdW5jO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmb3JFYWNoKG9iaiwgZm4pIHtcblx0aWYgKCFpc0Z1bmN0aW9uKGZuKSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2l0ZXJhdG9yIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXHR9XG5cdHZhciBpLCBrLFxuXHRcdGlzU3RyaW5nID0gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZycsXG5cdFx0bCA9IG9iai5sZW5ndGgsXG5cdFx0Y29udGV4dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gYXJndW1lbnRzWzJdIDogbnVsbDtcblx0aWYgKGwgPT09ICtsKSB7XG5cdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0aWYgKGNvbnRleHQgPT09IG51bGwpIHtcblx0XHRcdFx0Zm4oaXNTdHJpbmcgPyBvYmouY2hhckF0KGkpIDogb2JqW2ldLCBpLCBvYmopO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm4uY2FsbChjb250ZXh0LCBpc1N0cmluZyA/IG9iai5jaGFyQXQoaSkgOiBvYmpbaV0sIGksIG9iaik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGZvciAoayBpbiBvYmopIHtcblx0XHRcdGlmIChoYXNPd24uY2FsbChvYmosIGspKSB7XG5cdFx0XHRcdGlmIChjb250ZXh0ID09PSBudWxsKSB7XG5cdFx0XHRcdFx0Zm4ob2JqW2tdLCBrLCBvYmopO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZuLmNhbGwoY29udGV4dCwgb2JqW2tdLCBrLCBvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5rZXlzIHx8IHJlcXVpcmUoJy4vc2hpbScpO1xuXG4iLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG5cdHZhciBzdHIgPSB0b1N0cmluZy5jYWxsKHZhbHVlKTtcblx0dmFyIGlzQXJndW1lbnRzID0gc3RyID09PSAnW29iamVjdCBBcmd1bWVudHNdJztcblx0aWYgKCFpc0FyZ3VtZW50cykge1xuXHRcdGlzQXJndW1lbnRzID0gc3RyICE9PSAnW29iamVjdCBBcnJheV0nXG5cdFx0XHQmJiB2YWx1ZSAhPT0gbnVsbFxuXHRcdFx0JiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0J1xuXHRcdFx0JiYgdHlwZW9mIHZhbHVlLmxlbmd0aCA9PT0gJ251bWJlcidcblx0XHRcdCYmIHZhbHVlLmxlbmd0aCA+PSAwXG5cdFx0XHQmJiB0b1N0cmluZy5jYWxsKHZhbHVlLmNhbGxlZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cdH1cblx0cmV0dXJuIGlzQXJndW1lbnRzO1xufTtcblxuIiwiKGZ1bmN0aW9uICgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0Ly8gbW9kaWZpZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL2VzNS1zaGltXG5cdHZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuXHRcdHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcblx0XHRmb3JFYWNoID0gcmVxdWlyZSgnLi9mb3JlYWNoJyksXG5cdFx0aXNBcmdzID0gcmVxdWlyZSgnLi9pc0FyZ3VtZW50cycpLFxuXHRcdGhhc0RvbnRFbnVtQnVnID0gISh7J3RvU3RyaW5nJzogbnVsbH0pLnByb3BlcnR5SXNFbnVtZXJhYmxlKCd0b1N0cmluZycpLFxuXHRcdGhhc1Byb3RvRW51bUJ1ZyA9IChmdW5jdGlvbiAoKSB7fSkucHJvcGVydHlJc0VudW1lcmFibGUoJ3Byb3RvdHlwZScpLFxuXHRcdGRvbnRFbnVtcyA9IFtcblx0XHRcdFwidG9TdHJpbmdcIixcblx0XHRcdFwidG9Mb2NhbGVTdHJpbmdcIixcblx0XHRcdFwidmFsdWVPZlwiLFxuXHRcdFx0XCJoYXNPd25Qcm9wZXJ0eVwiLFxuXHRcdFx0XCJpc1Byb3RvdHlwZU9mXCIsXG5cdFx0XHRcInByb3BlcnR5SXNFbnVtZXJhYmxlXCIsXG5cdFx0XHRcImNvbnN0cnVjdG9yXCJcblx0XHRdLFxuXHRcdGtleXNTaGltO1xuXG5cdGtleXNTaGltID0gZnVuY3Rpb24ga2V5cyhvYmplY3QpIHtcblx0XHR2YXIgaXNPYmplY3QgPSBvYmplY3QgIT09IG51bGwgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcsXG5cdFx0XHRpc0Z1bmN0aW9uID0gdG9TdHJpbmcuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBGdW5jdGlvbl0nLFxuXHRcdFx0aXNBcmd1bWVudHMgPSBpc0FyZ3Mob2JqZWN0KSxcblx0XHRcdHRoZUtleXMgPSBbXTtcblxuXHRcdGlmICghaXNPYmplY3QgJiYgIWlzRnVuY3Rpb24gJiYgIWlzQXJndW1lbnRzKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0LmtleXMgY2FsbGVkIG9uIGEgbm9uLW9iamVjdFwiKTtcblx0XHR9XG5cblx0XHRpZiAoaXNBcmd1bWVudHMpIHtcblx0XHRcdGZvckVhY2gob2JqZWN0LCBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdFx0dGhlS2V5cy5wdXNoKHZhbHVlKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgbmFtZSxcblx0XHRcdFx0c2tpcFByb3RvID0gaGFzUHJvdG9FbnVtQnVnICYmIGlzRnVuY3Rpb247XG5cblx0XHRcdGZvciAobmFtZSBpbiBvYmplY3QpIHtcblx0XHRcdFx0aWYgKCEoc2tpcFByb3RvICYmIG5hbWUgPT09ICdwcm90b3R5cGUnKSAmJiBoYXMuY2FsbChvYmplY3QsIG5hbWUpKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKG5hbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGhhc0RvbnRFbnVtQnVnKSB7XG5cdFx0XHR2YXIgY3RvciA9IG9iamVjdC5jb25zdHJ1Y3Rvcixcblx0XHRcdFx0c2tpcENvbnN0cnVjdG9yID0gY3RvciAmJiBjdG9yLnByb3RvdHlwZSA9PT0gb2JqZWN0O1xuXG5cdFx0XHRmb3JFYWNoKGRvbnRFbnVtcywgZnVuY3Rpb24gKGRvbnRFbnVtKSB7XG5cdFx0XHRcdGlmICghKHNraXBDb25zdHJ1Y3RvciAmJiBkb250RW51bSA9PT0gJ2NvbnN0cnVjdG9yJykgJiYgaGFzLmNhbGwob2JqZWN0LCBkb250RW51bSkpIHtcblx0XHRcdFx0XHR0aGVLZXlzLnB1c2goZG9udEVudW0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoZUtleXM7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBrZXlzU2hpbTtcbn0oKSk7XG5cbiJdfQ==
;