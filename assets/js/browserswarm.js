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
    repo:  $routeParams.repo
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
      $.ajax('/' + $scope.project.name + '/cache', {
        type: 'DELETE',
        success: function () {
          $scope.clearingCache = false;
          $scope.success('Cleared the cache', true);
        },
        error: function () {
          $scope.clearingCache = false;
          $scope.error('Failed to clear the cache', true);
        }
      });
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
      $.ajax({
        url: '/' + $scope.project.name + '/config/' + $scope.branch.name + '/',
        type: 'PUT',
        data: JSON.stringify({plugin_order: data}),
        contentType: 'application/json',
        success: function(data, ts, xhr) {
          $scope.success('Plugin order on branch ' + branch.name + ' saved.', true);
        },
        error: function(xhr, ts, e) {
          if (xhr && xhr.responseText) {
            $scope.error("Error saving plugin order on branch " + branch.name + ": " + xhr.responseText, true);
          } else {
            $scope.error("Error saving plugin order on branch " + branch.name + ": " + e, true);
          }
        }
      });
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
      $.ajax({
        url: '/' + $scope.project.name + '/config/' + $scope.branch.name + '/',
        type: 'PUT',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(data, ts, xhr) {
          $scope.success('General config for branch ' + branch.name + ' saved.', true);
        },
        error: function(xhr, ts, e) {
          if (xhr && xhr.responseText) {
            $scope.error("Error saving general config for branch " + branch.name + ": " + xhr.responseText, true);
          } else {
            $scope.error("Error saving general config for branch " + branch.name + ": " + e, true);
          }
        }
      });
    };

    $scope.generateKeyPair = function () {
      bootbox.confirm('Really generate a new keypair? This could break things if you have plugins that use the current ones.', function (really) {
        if (!really) return;
        $.ajax('/' + $scope.project.name + '/keygen/' + $scope.branch.name, {
          type: 'POST',
          success: function (data, ts, xhr) {
            $scope.branch.privkey = data.privkey;
            $scope.branch.pubkey = data.pubkey;
            $scope.success('Generated new ssh keypair', true);
          }
        });
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
      $.ajax({
        url: '/' + $scope.project.name + '/config/master/runner',
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(data, ts, xhr) {
          $scope.success("Runner config saved.");
          $scope.runnerConfigs[name] = data.config;
          next(null, data.config);
          $scope.$root.$digest();
        },
        error: function(xhr, ts, e) {
          if (xhr && xhr.responseText) {
            var data = $.parseJSON(xhr.responseText);
            $scope.error("Error saving runner config: " + data.errors[0]);
          } else {
            $scope.error("Error saving runner config: " + e);
          }
          next();
          $scope.$root.$digest();
        }
      });
    };

    $scope.providerConfig = function (data, next) {
      if (arguments.length === 0) {
        return $scope.project.provider.config;
      }
      $.ajax({
        url: '/' + $scope.project.name + '/provider/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(data, ts, xhr) {
          $scope.success("Provider config saved.");
          next && next();
          $scope.$root.$digest();
        },
        error: function(xhr, ts, e) {
          if (xhr && xhr.responseText) {
            $scope.error("Error saving provider config: " + xhr.responseText);
          } else {
            $scope.error("Error saving provider config: " + e);
          }
          next && next();
          $scope.$root.$digest();
        }
      });
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
      $.ajax({
        url: '/' + $scope.project.name + '/config/' + branch.name + "/" + name,
        type: "PUT",
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(data, ts, xhr) {
          $scope.success("Config for " + name + " on branch " + branch.name + " saved.");
          $scope.configs[branch.name][name].config = data;
          next(null, data);
          $scope.$root.$digest();
        },
        error: function(xhr, ts, e) {
          if (xhr && xhr.responseText) {
            var data = $.parseJSON(xhr.responseText);
            $scope.error("Error saving " + name + " config on branch " + branch.name + ": " + data.errors[0]);
          } else {
            $scope.error("Error saving " + name + " config on branch " + branch.name + ": " + e);
          }
          next();
          $scope.$root.$digest();
        }
      });
    };

    $scope.deleteProject = function () {
      $.ajax({
        url: '/' + $scope.project.name + '/',
        type: 'DELETE',
        success: function () {
          window.location = '/';
        },
        error: function () {
          $scope.deleting = false;
          $scope.error('failed to remove project', true);
        }
      });
    };

    $scope.startTest = function () {
      $.ajax({
        url: '/' + $scope.project.name + '/start',
        data:{branch: $scope.branch.name, type: "TEST_ONLY", page:"config"},
        type: 'POST',
        success: function() {
          window.location = '/' + $scope.project.name + '/';
        },
        error: function(xhr, ts, e) {
          if (xhr && xhr.responseText) {
            var data = $.parseJSON(xhr.responseText);
            $scope.error("Error starting test job for " + name + " on branch " + $scope.branch.name + ": " + data.errors[0]);
          }
        }
      });
    };

    $scope.startDeploy = function () {
      $.ajax({
        url: '/' + $scope.project.name + '/start',
        data:{branch: $scope.branch.name, type: "TEST_AND_DEPLOY", page:"config"},
        type: 'POST',
        success: function() {
          window.location = '/' + $scope.project.name + '/';
        },
        error: function(xhr, ts, e) {
          if (xhr && xhr.responseText) {
            var data = $.parseJSON(xhr.responseText);
            $scope.error("Error starting deploy job for " + name + " on branch " + $scope.branch.name + ": " + data.errors[0]);
          }
        }
      });
    };

    $scope.saveProject = function () {
      $.ajax({
        url: '/' + $scope.project.name + '/config',
        type: 'PUT',
        data: JSON.stringify({
          public: $scope.project.public
        }),
        contentType: 'application/json',
        success: function(data, ts, xhr) {
          $scope.success('General config saved.', true);
        },
        error: function(xhr, ts, e) {
          if (xhr && xhr.responseText) {
            $scope.error("Error saving general config: " + xhr.responseText, true);
          } else {
            $scope.error("Error saving general config: " + e, true);
          }
        }
      });
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
  this.Repo    = $resource(apiBase + '/:owner/:repo');
  this.Config  = $resource(apiBase + '/:owner/:repo/config');

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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2FwcC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvYWxlcnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2NvbmZpZy9fZml4X3RlbXBsYXRlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvY29sbGFib3JhdG9ycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL2Vudmlyb25tZW50LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvZ2l0aHViLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvaGVyb2t1LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvam9iLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvbm9kZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3J1bm5lci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvY29uZmlnL3NhdWNlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9jb250cm9sbGVycy9jb25maWcvd2ViaG9va3MuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2Rhc2hib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvZXJyb3IuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2NvbnRyb2xsZXJzL2pvYi5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvY29udHJvbGxlcnMvbG9naW4uanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vYXNzZXRzL2pzL2ZpbHRlcnMvYW5zaS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9hc3NldHMvanMvam9iX3N0b3JlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL2Fzc2V0cy9qcy9zdHJpZGVyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9oYXMta2V5cy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvaW5kZXguanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9mb3JlYWNoLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvYnJvd3NlcnN3YXJtL3dlYi1icm93c2Vyc3dhcm0uY29tL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvaW5kZXguanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy9icm93c2Vyc3dhcm0vd2ViLWJyb3dzZXJzd2FybS5jb20vbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pc0FyZ3VtZW50cy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL2Jyb3dzZXJzd2FybS93ZWItYnJvd3NlcnN3YXJtLmNvbS9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL3NoaW0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFN0cmlkZXIgPSByZXF1aXJlKCcuL3N0cmlkZXInKTtcblxudmFyIEFwcCA9XG5leHBvcnRzID1cbm1vZHVsZS5leHBvcnRzID1cbmFuZ3VsYXIubW9kdWxlKCdCcm93c2VyU3dhcm1BcHAnLCBbJ25nUm91dGUnLCAnbmdSZXNvdXJjZScsICduZ1Nhbml0aXplJ10pO1xuXG4vLy8gQXBwIENvbmZpZ3VyYXRpb25cblxuQXBwLlxuICBjb25maWcoWyckcm91dGVQcm92aWRlcicsICckbG9jYXRpb25Qcm92aWRlcicsICckaHR0cFByb3ZpZGVyJywgY29uZmlndXJlQXBwXSkuXG4gIGZhY3RvcnkoJ1N0cmlkZXInLCBbJyRyZXNvdXJjZScsIFN0cmlkZXJdKTtcblxuZnVuY3Rpb24gY29uZmlndXJlQXBwKCRyb3V0ZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJGh0dHBQcm92aWRlcikge1xuXG4gIC8vLyBIVFRQXG5cbiAgLy8vIEFsd2F5cyBkbyBIVFRQIHJlcXVlc3RzIHdpdGggY3JlZGVudGlhbHMsXG4gIC8vLyBlZmZlY3RpdmVseSBzZW5kaW5nIG91dCB0aGUgc2Vzc2lvbiBjb29raWVcbiAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gIHZhciBpbnRlcmNlcHRvciA9IFsnJHJvb3RTY29wZScsICckcScsIGZ1bmN0aW9uKCRzY29wZSwgJHEpIHtcblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlcnJvcihyZXNwb25zZSkge1xuICAgICAgdmFyIHN0YXR1cyA9IHJlc3BvbnNlLnN0YXR1cztcblxuICAgICAgdmFyIHJlc3AgPSByZXNwb25zZS5kYXRhO1xuICAgICAgaWYgKHJlc3ApIHRyeSB7IHJlc3AgPSBKU09OLnBhcnNlKHJlc3ApOyB9IGNhdGNoKGVycikgeyB9XG5cbiAgICAgIGlmIChyZXNwLm1lc3NhZ2UpIHJlc3AgPSByZXNwLm1lc3NhZ2U7XG4gICAgICBpZiAoISByZXNwKSB7XG4gICAgICAgIHJlc3AgPSAnRXJyb3IgaW4gcmVzcG9uc2UnO1xuICAgICAgICBpZiAoc3RhdHVzKSByZXNwICs9ICcgKCcgKyBzdGF0dXMgKyAnKSc7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS4kZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IocmVzcCkpO1xuXG4gICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oc3VjY2VzcywgZXJyb3IpO1xuICAgIH1cblxuICB9XTtcblxuICAkaHR0cFByb3ZpZGVyLnJlc3BvbnNlSW50ZXJjZXB0b3JzLnB1c2goaW50ZXJjZXB0b3IpO1xuXG5cbiAgLy8vIEVuYWJsZSBoYXNoYmFuZy1sZXNzIHJvdXRlc1xuXG4gICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLy8gUm91dGVzXG5cbiAgJHJvdXRlUHJvdmlkZXIuXG4gICAgd2hlbignL2Rhc2hib2FyZCcsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2Rhc2hib2FyZC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdEYXNoYm9hcmRDdHJsJ1xuICAgIH0pLlxuICAgIHdoZW4oJy9sb2dpbicsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2xvZ2luLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KS5cbiAgICB3aGVuKCcvOm93bmVyLzpyZXBvL2NvbmZpZycsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2NvbmZpZy9pbmRleC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdDb25maWdDdHJsJyxcbiAgICAgIHJlbG9hZE9uU2VhcmNoOiBmYWxzZVxuICAgIH0pLlxuICAgIHdoZW4oJy86b3duZXIvOnJlcG8vam9iLzpqb2JpZCcsIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL3BhcnRpYWxzL2pvYi5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdKb2JDdHJsJ1xuICAgIH0pO1xuXG59XG5cbi8vLyBEeW5hbWljIENvbnRyb2xsZXJzXG5cbkFwcC5kaXJlY3RpdmUoJ2R5bmFtaWNDb250cm9sbGVyJywgZnVuY3Rpb24oJGNvbXBpbGUsICRjb250cm9sbGVyKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICB0ZXJtaW5hbDogdHJ1ZSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxtLCBhdHRycykge1xuICAgICAgdmFyIGxhc3RTY29wZTtcbiAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5keW5hbWljQ29udHJvbGxlciwgZnVuY3Rpb24oY3RybE5hbWUpIHtcbiAgICAgICAgaWYgKGxhc3RTY29wZSkgbGFzdFNjb3BlLiRkZXN0cm95KCk7XG4gICAgICAgIHZhciBuZXdTY29wZSA9IHNjb3BlLiRuZXcoKTtcblxuICAgICAgICB2YXIgY3RybDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGN0cmwgPSAkY29udHJvbGxlcihjdHJsTmFtZSwgeyRzY29wZTogbmV3U2NvcGV9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxtLmNvbnRlbnRzKCkuZGF0YSgnJG5nQ29udHJvbGxlckNvbnRyb2xsZXInLCBjdHJsKTtcbiAgICAgICAgJGNvbXBpbGUoZWxtLmNvbnRlbnRzKCkpKG5ld1Njb3BlKTtcblxuICAgICAgICBsYXN0U2NvcGUgPSBuZXdTY29wZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7IiwiXG52YXIgYXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbmFwcC5jb250cm9sbGVyKCdBbGVydHNDdHJsJywgWyckc2NvcGUnLCAnJHNjZScsIGZ1bmN0aW9uICgkc2NvcGUsICRzY2UpIHtcbiAgJHNjb3BlLm1lc3NhZ2UgPSBudWxsO1xuXG4gICRzY29wZS5lcnJvciA9IGZ1bmN0aW9uICh0ZXh0LCBkaWdlc3QpIHtcbiAgICAkc2NvcGUubWVzc2FnZSA9IHtcbiAgICAgIHRleHQ6ICRzY2UudHJ1c3RBc0h0bWwodGV4dCksXG4gICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgc2hvd2luZzogdHJ1ZVxuICAgIH07XG4gICAgaWYgKGRpZ2VzdCkgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgfTtcblxuICAkc2NvcGUuaW5mbyA9IGZ1bmN0aW9uICh0ZXh0LCBkaWdlc3QpIHtcbiAgICAkc2NvcGUubWVzc2FnZSA9IHtcbiAgICAgIHRleHQ6ICRzY2UudHJ1c3RBc0h0bWwodGV4dCksXG4gICAgICB0eXBlOiAnaW5mbycsXG4gICAgICBzaG93aW5nOiB0cnVlXG4gICAgfTtcbiAgICBpZiAoZGlnZXN0KSAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICB9O1xuICB2YXIgd2FpdFRpbWUgPSBudWxsO1xuXG4gICRzY29wZS5zdWNjZXNzID0gZnVuY3Rpb24gKHRleHQsIGRpZ2VzdCwgc3RpY2t5KSB7XG4gICAgaWYgKHdhaXRUaW1lKSB7XG4gICAgICBjbGVhclRpbWVvdXQod2FpdFRpbWUpO1xuICAgICAgd2FpdFRpbWUgPSBudWxsO1xuICAgIH1cbiAgICBpZiAoY2xlYXJUaW1lKSB7XG4gICAgICBjbGVhclRpbWVvdXQoY2xlYXJUaW1lKTtcbiAgICAgIGNsZWFyVGltZSA9IG51bGw7XG4gICAgfVxuICAgICRzY29wZS5tZXNzYWdlID0ge1xuICAgICAgdGV4dDogJHNjZS50cnVzdEFzSHRtbCgnPHN0cm9uZz5Eb25lLjwvc3Ryb25nPiAnICsgdGV4dCksXG4gICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICBzaG93aW5nOiB0cnVlXG4gICAgfTtcbiAgICBpZiAoIXN0aWNreSkge1xuICAgICAgd2FpdFRpbWUgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLmNsZWFyTWVzc2FnZSgpO1xuICAgICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgfSwgNTAwMCk7XG4gICAgfVxuICAgIGlmIChkaWdlc3QpICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gIH07XG4gIHZhciBjbGVhclRpbWUgPSBudWxsO1xuXG4gICRzY29wZS5jbGVhck1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGNsZWFyVGltZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KGNsZWFyVGltZSk7XG4gICAgfVxuICAgIGlmICgkc2NvcGUubWVzc2FnZSkge1xuICAgICAgJHNjb3BlLm1lc3NhZ2Uuc2hvd2luZyA9IGZhbHNlO1xuICAgIH1cbiAgICBjbGVhclRpbWUgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGNsZWFyVGltZSA9IG51bGw7XG4gICAgICAkc2NvcGUubWVzc2FnZSA9IG51bGw7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0sIDEwMDApO1xuICB9O1xufV0pO1xuIiwidmFyIEFwcCAgICAgICAgID0gcmVxdWlyZSgnLi4vYXBwJyk7XG52YXIgZml4VGVtcGxhdGUgPSByZXF1aXJlKCcuL2NvbmZpZy9fZml4X3RlbXBsYXRlJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWdDdHJsJywgWyckc2NvcGUnLCAnJHJvdXRlUGFyYW1zJywgJ1N0cmlkZXInLCAnJHNjZScsIENvbmZpZ0N0cmxdKTtcblxuZnVuY3Rpb24gQ29uZmlnQ3RybCgkc2NvcGUsICRyb3V0ZVBhcmFtcywgU3RyaWRlciwgJHNjZSkge1xuXG4gIHZhciBwcm9qZWN0U2VhcmNoT3B0aW9ucyA9IHtcbiAgICBvd25lcjogJHJvdXRlUGFyYW1zLm93bmVyLFxuICAgIHJlcG86ICAkcm91dGVQYXJhbXMucmVwb1xuICB9O1xuXG4gIFN0cmlkZXIuQ29uZmlnLmdldChwcm9qZWN0U2VhcmNoT3B0aW9ucywgZnVuY3Rpb24oY29uZikge1xuXG5cbiAgICAvLy8gRml4IGFuZCB0cnVzdCByZW1vdGUgSFRNTFxuXG4gICAgT2JqZWN0LmtleXMoY29uZi5wbHVnaW5zKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgY29uZi5wbHVnaW5zW2tleV0uaHRtbCA9ICRzY2UudHJ1c3RBc0h0bWwoXG4gICAgICAgIGZpeFRlbXBsYXRlKGNvbmYucGx1Z2luc1trZXldLmh0bWwpKTtcbiAgICB9KTtcblxuICAgIE9iamVjdC5rZXlzKGNvbmYucnVubmVycykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGNvbmYucnVubmVyc1trZXldLmh0bWwgPSAkc2NlLnRydXN0QXNIdG1sKFxuICAgICAgICBmaXhUZW1wbGF0ZShjb25mLnJ1bm5lcnNba2V5XS5odG1sKSk7XG4gICAgfSk7XG5cbiAgICBpZiAoY29uZi5wcm92aWRlcikge1xuICAgICAgY29uZi5wcm92aWRlci5odG1sID0gJHNjZS50cnVzdEFzSHRtbChcbiAgICAgICAgZml4VGVtcGxhdGUoY29uZi5wcm92aWRlci5odG1sKSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnByb2plY3QgPSBjb25mLnByb2plY3Q7XG4gICAgJHNjb3BlLnByb3ZpZGVyID0gY29uZi5wcm92aWRlcjtcbiAgICAkc2NvcGUucGx1Z2lucyA9IGNvbmYucGx1Z2lucztcbiAgICAkc2NvcGUucnVubmVycyA9IGNvbmYucnVubmVycztcbiAgICAkc2NvcGUuYnJhbmNoZXMgPSBjb25mLmJyYW5jaGVzIHx8IFtdO1xuICAgICRzY29wZS5zdGF0dXNCbG9ja3MgPSBjb25mLnN0YXR1c0Jsb2NrcztcbiAgICAkc2NvcGUuY29sbGFib3JhdG9ycyA9IGNvbmYuY29sbGFib3JhdG9ycztcbiAgICAkc2NvcGUudXNlcklzQ3JlYXRvciA9IGNvbmYudXNlcklzQ3JlYXRvcjtcbiAgICAkc2NvcGUudXNlckNvbmZpZ3MgPSBjb25mLnVzZXJDb25maWdzO1xuICAgICRzY29wZS5jb25maWd1cmVkID0ge307XG5cbiAgICAkc2NvcGUuYnJhbmNoID0gJHNjb3BlLnByb2plY3QuYnJhbmNoZXNbMF07XG4gICAgJHNjb3BlLmRpc2FibGVkX3BsdWdpbnMgPSB7fTtcbiAgICAkc2NvcGUuY29uZmlncyA9IHt9O1xuICAgICRzY29wZS5ydW5uZXJDb25maWdzID0ge307XG5cbiAgICAkc2NvcGUuYXBpX3Jvb3QgPSAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy9hcGkvJztcblxuICAgICRzY29wZS5yZWZyZXNoQnJhbmNoZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBUT0RPIGltcGxlbWVudFxuICAgICAgdGhyb3cgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0RW5hYmxlZCA9IGZ1bmN0aW9uIChwbHVnaW4sIGVuYWJsZWQpIHtcbiAgICAgICRzY29wZS5jb25maWdzWyRzY29wZS5icmFuY2gubmFtZV1bcGx1Z2luXS5lbmFibGVkID0gZW5hYmxlZDtcbiAgICAgIHNhdmVQbHVnaW5PcmRlcigpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZVBsdWdpbk9yZGVyID0gc2F2ZVBsdWdpbk9yZGVyO1xuXG4gICAgJHNjb3BlLnN3aXRjaFRvTWFzdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS5wcm9qZWN0LmJyYW5jaGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICgkc2NvcGUucHJvamVjdC5icmFuY2hlc1tpXS5uYW1lID09PSAnbWFzdGVyJykge1xuICAgICAgICAgICRzY29wZS5icmFuY2ggPSAkc2NvcGUucHJvamVjdC5icmFuY2hlc1tpXTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsZWFyQ2FjaGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuY2xlYXJpbmdDYWNoZSA9IHRydWU7XG4gICAgICAkLmFqYXgoJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvY2FjaGUnLCB7XG4gICAgICAgIHR5cGU6ICdERUxFVEUnLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJHNjb3BlLmNsZWFyaW5nQ2FjaGUgPSBmYWxzZTtcbiAgICAgICAgICAkc2NvcGUuc3VjY2VzcygnQ2xlYXJlZCB0aGUgY2FjaGUnLCB0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkc2NvcGUuY2xlYXJpbmdDYWNoZSA9IGZhbHNlO1xuICAgICAgICAgICRzY29wZS5lcnJvcignRmFpbGVkIHRvIGNsZWFyIHRoZSBjYWNoZScsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAkc2NvcGUudG9nZ2xlQnJhbmNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCRzY29wZS5icmFuY2gubWlycm9yX21hc3Rlcikge1xuICAgICAgICAkc2NvcGUuYnJhbmNoLm1pcnJvcl9tYXN0ZXIgPSBmYWxzZTtcbiAgICAgICAgdmFyIG5hbWUgPSAkc2NvcGUuYnJhbmNoLm5hbWVcbiAgICAgICAgICAsIG1hc3RlcjtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPCRzY29wZS5wcm9qZWN0LmJyYW5jaGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5wcm9qZWN0LmJyYW5jaGVzW2ldLm5hbWUgPT09ICdtYXN0ZXInKSB7XG4gICAgICAgICAgICBtYXN0ZXIgPSAkc2NvcGUucHJvamVjdC5icmFuY2hlc1tpXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYnJhbmNoID0gJC5leHRlbmQodHJ1ZSwgJHNjb3BlLmJyYW5jaCwgbWFzdGVyKTtcbiAgICAgICAgJHNjb3BlLmJyYW5jaC5uYW1lID0gbmFtZTtcbiAgICAgICAgaW5pdEJyYW5jaCgkc2NvcGUuYnJhbmNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5icmFuY2gubWlycm9yX21hc3RlciA9IHRydWU7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc2F2ZUdlbmVyYWxCcmFuY2godHJ1ZSk7XG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2JyYW5jaC5taXJyb3JfbWFzdGVyJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRhYiA9IHZhbHVlICYmIHZhbHVlLm5hbWUgPT09ICdtYXN0ZXInID8gJ3Byb2plY3QnIDogJ2Jhc2ljJztcbiAgICAgICAgJCgnIycgKyB0YWIgKyAnLXRhYi1oYW5kbGUnKS50YWIoJ3Nob3cnKTtcbiAgICAgICAgJCgnLnRhYi1wYW5lLmFjdGl2ZScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3RhYi0nICsgdGFiKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICB9LCAwKTtcbiAgICB9KTtcbiAgICAkc2NvcGUuJHdhdGNoKCdicmFuY2gnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdGFiID0gdmFsdWUgJiYgdmFsdWUubmFtZSA9PT0gJ21hc3RlcicgPyAncHJvamVjdCcgOiAnYmFzaWMnO1xuICAgICAgICAkKCcjJyArIHRhYiArICctdGFiLWhhbmRsZScpLnRhYignc2hvdycpO1xuICAgICAgICAkKCcudGFiLXBhbmUuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjdGFiLScgKyB0YWIpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgIH0sIDApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnNldFJ1bm5lciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAkc2NvcGUuYnJhbmNoLnJ1bm5lciA9IHtcbiAgICAgICAgaWQ6IG5hbWUsXG4gICAgICAgIGNvbmZpZzogJHNjb3BlLnJ1bm5lckNvbmZpZ3NbbmFtZV1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUNvbmZpZ3VyZWQoKSB7XG4gICAgICB2YXIgcGx1Z2lucyA9ICRzY29wZS5icmFuY2gucGx1Z2lucztcbiAgICAgICRzY29wZS5jb25maWd1cmVkWyRzY29wZS5icmFuY2gubmFtZV0gPSB7fTtcbiAgICAgIGZvciAodmFyIGk9MDsgaTxwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICRzY29wZS5jb25maWd1cmVkWyRzY29wZS5icmFuY2gubmFtZV1bcGx1Z2luc1tpXS5pZF0gPSB0cnVlO1xuICAgICAgfVxuICAgICAgc2F2ZVBsdWdpbk9yZGVyKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2F2ZVBsdWdpbk9yZGVyKCkge1xuICAgICAgdmFyIHBsdWdpbnMgPSAkc2NvcGUuYnJhbmNoLnBsdWdpbnNcbiAgICAgICAgLCBicmFuY2ggPSAkc2NvcGUuYnJhbmNoXG4gICAgICAgICwgZGF0YSA9IFtdO1xuICAgICAgZm9yICh2YXIgaT0wOyBpPHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZGF0YS5wdXNoKHtcbiAgICAgICAgICBpZDogcGx1Z2luc1tpXS5pZCxcbiAgICAgICAgICBlbmFibGVkOiBwbHVnaW5zW2ldLmVuYWJsZWQsXG4gICAgICAgICAgc2hvd1N0YXR1czogcGx1Z2luc1tpXS5zaG93U3RhdHVzXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy9jb25maWcvJyArICRzY29wZS5icmFuY2gubmFtZSArICcvJyxcbiAgICAgICAgdHlwZTogJ1BVVCcsXG4gICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHtwbHVnaW5fb3JkZXI6IGRhdGF9KSxcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSwgdHMsIHhocikge1xuICAgICAgICAgICRzY29wZS5zdWNjZXNzKCdQbHVnaW4gb3JkZXIgb24gYnJhbmNoICcgKyBicmFuY2gubmFtZSArICcgc2F2ZWQuJywgdHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRzLCBlKSB7XG4gICAgICAgICAgaWYgKHhociAmJiB4aHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgcGx1Z2luIG9yZGVyIG9uIGJyYW5jaCBcIiArIGJyYW5jaC5uYW1lICsgXCI6IFwiICsgeGhyLnJlc3BvbnNlVGV4dCwgdHJ1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIHNhdmluZyBwbHVnaW4gb3JkZXIgb24gYnJhbmNoIFwiICsgYnJhbmNoLm5hbWUgKyBcIjogXCIgKyBlLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIG9wdGlvbnMgZm9yIHRoZSBpblVzZSBwbHVnaW4gc29ydGFibGVcbiAgICAkc2NvcGUuaW5Vc2VPcHRpb25zID0ge1xuICAgICAgY29ubmVjdFdpdGg6ICcuZGlzYWJsZWQtcGx1Z2lucy1saXN0JyxcbiAgICAgIGRpc3RhbmNlOiA1LFxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAoZSwgdWkpIHtcbiAgICAgICAgdXBkYXRlQ29uZmlndXJlZCgpO1xuICAgICAgfSxcbiAgICAgIHJlY2VpdmU6IGZ1bmN0aW9uIChlLCB1aSkge1xuICAgICAgICB1cGRhdGVDb25maWd1cmVkKCk7XG4gICAgICAgIHZhciBwbHVnaW5zID0gJHNjb3BlLmJyYW5jaC5wbHVnaW5zO1xuICAgICAgICBwbHVnaW5zW3VpLml0ZW0uaW5kZXgoKV0uZW5hYmxlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGluaXRCcmFuY2goYnJhbmNoKSB7XG4gICAgICB2YXIgcGx1Z2lucztcblxuICAgICAgJHNjb3BlLmNvbmZpZ3VyZWRbYnJhbmNoLm5hbWVdID0ge307XG4gICAgICAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV0gPSB7fTtcbiAgICAgICRzY29wZS5ydW5uZXJDb25maWdzW2JyYW5jaC5uYW1lXSA9IHt9O1xuICAgICAgJHNjb3BlLmRpc2FibGVkX3BsdWdpbnNbYnJhbmNoLm5hbWVdID0gW107XG5cbiAgICAgIGlmICghYnJhbmNoLm1pcnJvcl9tYXN0ZXIpIHtcbiAgICAgICAgcGx1Z2lucyA9IGJyYW5jaC5wbHVnaW5zO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8cGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICRzY29wZS5jb25maWd1cmVkW2JyYW5jaC5uYW1lXVtwbHVnaW5zW2ldLmlkXSA9IHRydWU7XG4gICAgICAgICAgJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW3BsdWdpbnNbaV0uaWRdID0gcGx1Z2luc1tpXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBwbHVnaW4gaW4gJHNjb3BlLnBsdWdpbnMpIHtcbiAgICAgICAgaWYgKCRzY29wZS5jb25maWd1cmVkW2JyYW5jaC5uYW1lXVtwbHVnaW5dKSBjb250aW51ZTtcbiAgICAgICAgJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW3BsdWdpbl0gPSB7XG4gICAgICAgICAgaWQ6IHBsdWdpbixcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZzoge31cbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmRpc2FibGVkX3BsdWdpbnNbYnJhbmNoLm5hbWVdLnB1c2goJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW3BsdWdpbl0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWJyYW5jaC5taXJyb3JfbWFzdGVyKSB7XG4gICAgICAgICRzY29wZS5ydW5uZXJDb25maWdzW2JyYW5jaC5uYW1lXVticmFuY2gucnVubmVyLmlkXSA9IGJyYW5jaC5ydW5uZXIuY29uZmlnO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgcnVubmVyIGluICRzY29wZS5ydW5uZXJzKSB7XG4gICAgICAgIGlmICghYnJhbmNoLm1pcnJvcl9tYXN0ZXIgJiYgcnVubmVyID09PSBicmFuY2gucnVubmVyLmlkKSBjb250aW51ZTtcbiAgICAgICAgJHNjb3BlLnJ1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdW3J1bm5lcl0gPSB7fTtcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdFBsdWdpbnMoKSB7XG4gICAgICB2YXIgYnJhbmNoZXMgPSAkc2NvcGUucHJvamVjdC5icmFuY2hlc1xuICAgICAgZm9yICh2YXIgaT0wOyBpPGJyYW5jaGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGluaXRCcmFuY2goYnJhbmNoZXNbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgICRzY29wZS5zYXZlR2VuZXJhbEJyYW5jaCA9IGZ1bmN0aW9uIChwbHVnaW5zKSB7XG4gICAgICB2YXIgYnJhbmNoID0gJHNjb3BlLmJyYW5jaFxuICAgICAgICAsIGRhdGEgPSB7XG4gICAgICAgICAgICBhY3RpdmU6IGJyYW5jaC5hY3RpdmUsXG4gICAgICAgICAgICBwcml2a2V5OiBicmFuY2gucHJpdmtleSxcbiAgICAgICAgICAgIHB1YmtleTogYnJhbmNoLnB1YmtleSxcbiAgICAgICAgICAgIGVudktleXM6IGJyYW5jaC5lbnZLZXlzLFxuICAgICAgICAgICAgbWlycm9yX21hc3RlcjogYnJhbmNoLm1pcnJvcl9tYXN0ZXIsXG4gICAgICAgICAgICBkZXBsb3lfb25fZ3JlZW46IGJyYW5jaC5kZXBsb3lfb25fZ3JlZW4sXG4gICAgICAgICAgICBydW5uZXI6IGJyYW5jaC5ydW5uZXJcbiAgICAgICAgICB9O1xuICAgICAgaWYgKHBsdWdpbnMpIHtcbiAgICAgICAgZGF0YS5wbHVnaW5zID0gYnJhbmNoLnBsdWdpbnM7XG4gICAgICB9XG4gICAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6ICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2NvbmZpZy8nICsgJHNjb3BlLmJyYW5jaC5uYW1lICsgJy8nLFxuICAgICAgICB0eXBlOiAnUFVUJyxcbiAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEsIHRzLCB4aHIpIHtcbiAgICAgICAgICAkc2NvcGUuc3VjY2VzcygnR2VuZXJhbCBjb25maWcgZm9yIGJyYW5jaCAnICsgYnJhbmNoLm5hbWUgKyAnIHNhdmVkLicsIHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0cywgZSkge1xuICAgICAgICAgIGlmICh4aHIgJiYgeGhyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yKFwiRXJyb3Igc2F2aW5nIGdlbmVyYWwgY29uZmlnIGZvciBicmFuY2ggXCIgKyBicmFuY2gubmFtZSArIFwiOiBcIiArIHhoci5yZXNwb25zZVRleHQsIHRydWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgZ2VuZXJhbCBjb25maWcgZm9yIGJyYW5jaCBcIiArIGJyYW5jaC5uYW1lICsgXCI6IFwiICsgZSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdlbmVyYXRlS2V5UGFpciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGJvb3Rib3guY29uZmlybSgnUmVhbGx5IGdlbmVyYXRlIGEgbmV3IGtleXBhaXI/IFRoaXMgY291bGQgYnJlYWsgdGhpbmdzIGlmIHlvdSBoYXZlIHBsdWdpbnMgdGhhdCB1c2UgdGhlIGN1cnJlbnQgb25lcy4nLCBmdW5jdGlvbiAocmVhbGx5KSB7XG4gICAgICAgIGlmICghcmVhbGx5KSByZXR1cm47XG4gICAgICAgICQuYWpheCgnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy9rZXlnZW4vJyArICRzY29wZS5icmFuY2gubmFtZSwge1xuICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSwgdHMsIHhocikge1xuICAgICAgICAgICAgJHNjb3BlLmJyYW5jaC5wcml2a2V5ID0gZGF0YS5wcml2a2V5O1xuICAgICAgICAgICAgJHNjb3BlLmJyYW5jaC5wdWJrZXkgPSBkYXRhLnB1YmtleTtcbiAgICAgICAgICAgICRzY29wZS5zdWNjZXNzKCdHZW5lcmF0ZWQgbmV3IHNzaCBrZXlwYWlyJywgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpbml0UGx1Z2lucygpO1xuXG4gICAgJHNjb3BlLmdyYXZhdGFyID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICBpZiAoIWVtYWlsKSByZXR1cm4gJyc7XG4gICAgICB2YXIgaGFzaCA9IG1kNShlbWFpbC50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIHJldHVybiAnaHR0cHM6Ly9zZWN1cmUuZ3JhdmF0YXIuY29tL2F2YXRhci8nICsgaGFzaCArICc/ZD1pZGVudGljb24nO1xuICAgIH1cblxuICAgIC8vIHRvZG86IHBhc3MgaW4gbmFtZT9cbiAgICAkc2NvcGUucnVubmVyQ29uZmlnID0gZnVuY3Rpb24gKGJyYW5jaCwgZGF0YSwgbmV4dCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgbmV4dCA9IGRhdGE7XG4gICAgICAgIGRhdGEgPSBicmFuY2g7XG4gICAgICAgIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgICB9XG4gICAgICB2YXIgbmFtZSA9ICRzY29wZS5icmFuY2gucnVubmVyLmlkO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUucnVubmVyQ29uZmlnc1tuYW1lXTtcbiAgICAgIH1cbiAgICAgICQuYWpheCh7XG4gICAgICAgIHVybDogJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvY29uZmlnL21hc3Rlci9ydW5uZXInLFxuICAgICAgICB0eXBlOiAnUFVUJyxcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEsIHRzLCB4aHIpIHtcbiAgICAgICAgICAkc2NvcGUuc3VjY2VzcyhcIlJ1bm5lciBjb25maWcgc2F2ZWQuXCIpO1xuICAgICAgICAgICRzY29wZS5ydW5uZXJDb25maWdzW25hbWVdID0gZGF0YS5jb25maWc7XG4gICAgICAgICAgbmV4dChudWxsLCBkYXRhLmNvbmZpZyk7XG4gICAgICAgICAgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdHMsIGUpIHtcbiAgICAgICAgICBpZiAoeGhyICYmIHhoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gJC5wYXJzZUpTT04oeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgcnVubmVyIGNvbmZpZzogXCIgKyBkYXRhLmVycm9yc1swXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIHNhdmluZyBydW5uZXIgY29uZmlnOiBcIiArIGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgJHNjb3BlLiRyb290LiRkaWdlc3QoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyA9IGZ1bmN0aW9uIChkYXRhLCBuZXh0KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLnByb2plY3QucHJvdmlkZXIuY29uZmlnO1xuICAgICAgfVxuICAgICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy9wcm92aWRlci8nLFxuICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhLCB0cywgeGhyKSB7XG4gICAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoXCJQcm92aWRlciBjb25maWcgc2F2ZWQuXCIpO1xuICAgICAgICAgIG5leHQgJiYgbmV4dCgpO1xuICAgICAgICAgICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRzLCBlKSB7XG4gICAgICAgICAgaWYgKHhociAmJiB4aHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgcHJvdmlkZXIgY29uZmlnOiBcIiArIHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgcHJvdmlkZXIgY29uZmlnOiBcIiArIGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0ICYmIG5leHQoKTtcbiAgICAgICAgICAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZyA9IGZ1bmN0aW9uIChuYW1lLCBicmFuY2gsIGRhdGEsIG5leHQpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICAgIG5leHQgPSBkYXRhO1xuICAgICAgICBkYXRhID0gYnJhbmNoO1xuICAgICAgICBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChicmFuY2gubWlycm9yX21hc3Rlcikge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciBwbHVnaW4gPSAkc2NvcGUuY29uZmlnc1ticmFuY2gubmFtZV1bbmFtZV1cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gcGx1Z2luLmNvbmZpZztcbiAgICAgIH1cbiAgICAgIGlmIChwbHVnaW4gPT09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcInBsdWdpbkNvbmZpZyBjYWxsZWQgZm9yIGEgcGx1Z2luIHRoYXQncyBub3QgY29uZmlndXJlZC4gXCIgKyBuYW1lLCB0cnVlKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbHVnaW4gbm90IGNvbmZpZ3VyZWQ6ICcgKyBuYW1lKTtcbiAgICAgIH1cbiAgICAgICQuYWpheCh7XG4gICAgICAgIHVybDogJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvY29uZmlnLycgKyBicmFuY2gubmFtZSArIFwiL1wiICsgbmFtZSxcbiAgICAgICAgdHlwZTogXCJQVVRcIixcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEsIHRzLCB4aHIpIHtcbiAgICAgICAgICAkc2NvcGUuc3VjY2VzcyhcIkNvbmZpZyBmb3IgXCIgKyBuYW1lICsgXCIgb24gYnJhbmNoIFwiICsgYnJhbmNoLm5hbWUgKyBcIiBzYXZlZC5cIik7XG4gICAgICAgICAgJHNjb3BlLmNvbmZpZ3NbYnJhbmNoLm5hbWVdW25hbWVdLmNvbmZpZyA9IGRhdGE7XG4gICAgICAgICAgbmV4dChudWxsLCBkYXRhKTtcbiAgICAgICAgICAkc2NvcGUuJHJvb3QuJGRpZ2VzdCgpO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0cywgZSkge1xuICAgICAgICAgIGlmICh4aHIgJiYgeGhyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSAkLnBhcnNlSlNPTih4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIHNhdmluZyBcIiArIG5hbWUgKyBcIiBjb25maWcgb24gYnJhbmNoIFwiICsgYnJhbmNoLm5hbWUgKyBcIjogXCIgKyBkYXRhLmVycm9yc1swXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIHNhdmluZyBcIiArIG5hbWUgKyBcIiBjb25maWcgb24gYnJhbmNoIFwiICsgYnJhbmNoLm5hbWUgKyBcIjogXCIgKyBlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICRzY29wZS4kcm9vdC4kZGlnZXN0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlUHJvamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICQuYWpheCh7XG4gICAgICAgIHVybDogJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvJyxcbiAgICAgICAgdHlwZTogJ0RFTEVURScsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSAnLyc7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0aW5nID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLmVycm9yKCdmYWlsZWQgdG8gcmVtb3ZlIHByb2plY3QnLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydFRlc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6ICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL3N0YXJ0JyxcbiAgICAgICAgZGF0YTp7YnJhbmNoOiAkc2NvcGUuYnJhbmNoLm5hbWUsIHR5cGU6IFwiVEVTVF9PTkxZXCIsIHBhZ2U6XCJjb25maWdcIn0sXG4gICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvJztcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdHMsIGUpIHtcbiAgICAgICAgICBpZiAoeGhyICYmIHhoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gJC5wYXJzZUpTT04oeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBzdGFydGluZyB0ZXN0IGpvYiBmb3IgXCIgKyBuYW1lICsgXCIgb24gYnJhbmNoIFwiICsgJHNjb3BlLmJyYW5jaC5uYW1lICsgXCI6IFwiICsgZGF0YS5lcnJvcnNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydERlcGxveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICQuYWpheCh7XG4gICAgICAgIHVybDogJy8nICsgJHNjb3BlLnByb2plY3QubmFtZSArICcvc3RhcnQnLFxuICAgICAgICBkYXRhOnticmFuY2g6ICRzY29wZS5icmFuY2gubmFtZSwgdHlwZTogXCJURVNUX0FORF9ERVBMT1lcIiwgcGFnZTpcImNvbmZpZ1wifSxcbiAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy8nO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0cywgZSkge1xuICAgICAgICAgIGlmICh4aHIgJiYgeGhyLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSAkLnBhcnNlSlNPTih4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIHN0YXJ0aW5nIGRlcGxveSBqb2IgZm9yIFwiICsgbmFtZSArIFwiIG9uIGJyYW5jaCBcIiArICRzY29wZS5icmFuY2gubmFtZSArIFwiOiBcIiArIGRhdGEuZXJyb3JzWzBdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZVByb2plY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6ICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2NvbmZpZycsXG4gICAgICAgIHR5cGU6ICdQVVQnLFxuICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgcHVibGljOiAkc2NvcGUucHJvamVjdC5wdWJsaWNcbiAgICAgICAgfSksXG4gICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEsIHRzLCB4aHIpIHtcbiAgICAgICAgICAkc2NvcGUuc3VjY2VzcygnR2VuZXJhbCBjb25maWcgc2F2ZWQuJywgdHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRzLCBlKSB7XG4gICAgICAgICAgaWYgKHhociAmJiB4aHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgZ2VuZXJhbCBjb25maWc6IFwiICsgeGhyLnJlc3BvbnNlVGV4dCwgdHJ1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIHNhdmluZyBnZW5lcmFsIGNvbmZpZzogXCIgKyBlLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgfSk7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBmaXhUZW1wbGF0ZTtcblxuZnVuY3Rpb24gZml4VGVtcGxhdGUocykge1xuICByZXR1cm4gcy5cbiAgICByZXBsYWNlKC9cXFtcXFsvZywgJ3t7JykuXG4gICAgcmVwbGFjZSgvXFxdXFxdL2csICd9fScpO1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5Db2xsYWJvcmF0b3JzQ3RybCcsIFsnJHNjb3BlJywgQ29sbGFib3JhdG9yc0N0cmxdKTtcblxuZnVuY3Rpb24gQ29sbGFib3JhdG9yc0N0cmwoJHNjb3BlKSB7XG4gICRzY29wZS5uZXdfZW1haWwgPSAnJztcbiAgJHNjb3BlLm5ld19hY2Nlc3MgPSAwO1xuICAkc2NvcGUuY29sbGFib3JhdG9ycyA9IHdpbmRvdy5jb2xsYWJvcmF0b3JzIHx8IFtdO1xuICAkc2NvcGUucmVtb3ZlID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpdGVtLmxvYWRpbmcgPSB0cnVlO1xuICAgICRzY29wZS5jbGVhck1lc3NhZ2UoKTtcbiAgICAkLmFqYXgoe1xuICAgICAgdXJsOiAnLycgKyAkc2NvcGUucHJvamVjdC5uYW1lICsgJy9jb2xsYWJvcmF0b3JzLycsXG4gICAgICB0eXBlOiAnREVMRVRFJyxcbiAgICAgIGRhdGE6IHtlbWFpbDogaXRlbS5lbWFpbH0sXG4gICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhLCB0cywgeGhyKSB7XG4gICAgICAgIHJlbW92ZSgkc2NvcGUuY29sbGFib3JhdG9ycywgaXRlbSk7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKGl0ZW0uZW1haWwgKyBcIiBpcyBubyBsb25nZXIgYSBjb2xsYWJvcmF0b3Igb24gdGhpcyBwcm9qZWN0LlwiLCB0cnVlKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0cywgZSkge1xuICAgICAgICBpdGVtLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHhociAmJiB4aHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkLnBhcnNlSlNPTih4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAkc2NvcGUuZXJyb3IoXCJFcnJvciBkZWxldGluZyBjb2xsYWJvcmF0b3I6IFwiICsgZGF0YS5lcnJvcnNbMF0sIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIGRlbGV0aW5nIGNvbGxhYm9yYXRvcjogXCIgKyBlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuYWRkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkYXRhID0ge1xuICAgICAgZW1haWw6ICRzY29wZS5uZXdfZW1haWwsXG4gICAgICBhY2Nlc3M6ICRzY29wZS5uZXdfYWNjZXNzIHx8IDAsXG4gICAgICBncmF2YXRhcjogJHNjb3BlLmdyYXZhdGFyKCRzY29wZS5uZXdfZW1haWwpLFxuICAgICAgb3duZXI6IGZhbHNlXG4gICAgfTtcblxuICAgICQuYWpheCh7XG4gICAgICB1cmw6ICcvJyArICRzY29wZS5wcm9qZWN0Lm5hbWUgKyAnL2NvbGxhYm9yYXRvcnMvJyxcbiAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgZGF0YTogZGF0YSxcbiAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlcywgdHMsIHhocikge1xuICAgICAgICAkc2NvcGUubmV3X2FjY2VzcyA9IDA7XG4gICAgICAgICRzY29wZS5uZXdfZW1haWwgPSAnJztcbiAgICAgICAgaWYgKHJlcy5jcmVhdGVkKSB7XG4gICAgICAgICAgJHNjb3BlLmNvbGxhYm9yYXRvcnMucHVzaChkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuc3VjY2VzcyhyZXMubWVzc2FnZSwgdHJ1ZSwgIXJlcy5jcmVhdGVkKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0cywgZSkge1xuICAgICAgICBpZiAoeGhyICYmIHhoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9ICQucGFyc2VKU09OKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIGFkZGluZyBjb2xsYWJvcmF0b3I6IFwiICsgZGF0YS5lcnJvcnNbMF0sIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5lcnJvcihcIkVycm9yIGFkZGluZyBjb2xsYWJvcmF0b3I6IFwiICsgZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlKGFyLCBpdGVtKSB7XG4gIGFyLnNwbGljZShhci5pbmRleE9mKGl0ZW0pLCAxKTtcbn1cbiIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5FbnZpcm9ubWVudEN0cmwnLCBbJyRzY29wZScsIEVudmlyb25tZW50Q3RybF0pO1xuXG5mdW5jdGlvbiBFbnZpcm9ubWVudEN0cmwoJHNjb3BlKXtcbiAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV0uZW52LmNvbmZpZycsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICRzY29wZS5jb25maWcgPSB2YWx1ZSB8fCB7fTtcbiAgfSk7XG4gICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnZW52JywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuZGVsID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGRlbGV0ZSAkc2NvcGUuY29uZmlnW2tleV07XG4gICAgJHNjb3BlLnNhdmUoKTtcbiAgfTtcbiAgJHNjb3BlLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuY29uZmlnWyRzY29wZS5uZXdrZXldID0gJHNjb3BlLm5ld3ZhbHVlO1xuICAgICRzY29wZS5uZXdrZXkgPSAkc2NvcGUubmV3dmFsdWUgPSAnJztcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5HaXRodWJDdHJsJywgWyckc2NvcGUnLCBHaXRodWJDdHJsXSk7XG5cbmZ1bmN0aW9uIEdpdGh1YkN0cmwoJHNjb3BlKSB7XG5cbiAgJHNjb3BlLmNvbmZpZyA9ICRzY29wZS5wcm92aWRlckNvbmZpZygpO1xuICAkc2NvcGUubmV3X3VzZXJuYW1lID0gXCJcIjtcbiAgJHNjb3BlLm5ld19sZXZlbCA9IFwidGVzdGVyXCI7XG4gICRzY29wZS5jb25maWcud2hpdGVsaXN0ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3QgfHwgW107XG4gICRzY29wZS5jb25maWcucHVsbF9yZXF1ZXN0cyA9ICRzY29wZS5jb25maWcucHVsbF9yZXF1ZXN0cyB8fCAnbm9uZSc7XG5cbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnByb3ZpZGVyQ29uZmlnKCRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHt9KTtcbiAgfTtcblxuICAkc2NvcGUuJHdhdGNoKCdjb25maWcucHVsbF9yZXF1ZXN0cycsIGZ1bmN0aW9uICh2YWx1ZSwgb2xkKSB7XG4gICAgaWYgKCFvbGQgfHwgdmFsdWUgPT09IG9sZCkgcmV0dXJuO1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyh7XG4gICAgICBwdWxsX3JlcXVlc3RzOiAkc2NvcGUuY29uZmlnLnB1bGxfcmVxdWVzdHNcbiAgICB9KTtcbiAgfSk7XG5cbiAgJHNjb3BlLmFkZFdlYmhvb2tzID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSB0cnVlO1xuICAgICQuYWpheCgkc2NvcGUuYXBpX3Jvb3QgKyAnZ2l0aHViL2hvb2snLCB7XG4gICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ1NldCBnaXRodWIgd2ViaG9va3MnLCB0cnVlKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5lcnJvcignRmFpbGVkIHRvIHNldCBnaXRodWIgd2ViaG9va3MnLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuZGVsZXRlV2ViaG9va3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmxvYWRpbmdXZWJob29rcyA9IHRydWU7XG4gICAgJC5hamF4KCRzY29wZS5hcGlfcm9vdCArICdnaXRodWIvaG9vaycsIHtcbiAgICAgIHR5cGU6ICdERUxFVEUnLFxuICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUubG9hZGluZ1dlYmhvb2tzID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zdWNjZXNzKCdSZW1vdmVkIGdpdGh1YiB3ZWJob29rcycsIHRydWUpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nV2ViaG9va3MgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmVycm9yKCdGYWlsZWQgdG8gcmVtb3ZlIGdpdGh1YiB3ZWJob29rcycsIHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5yZW1vdmVXTCA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdmFyIGlkeCA9ICRzY29wZS5jb25maWcud2hpdGVsaXN0LmluZGV4T2YodXNlcik7XG4gICAgaWYgKGlkeCA9PT0gLTEpIHJldHVybiBjb25zb2xlLmVycm9yKFwidHJpZWQgdG8gcmVtb3ZlIGEgd2hpdGVsaXN0IGl0ZW0gdGhhdCBkaWRuJ3QgZXhpc3RcIik7XG4gICAgdmFyIHdoaXRlbGlzdCA9ICRzY29wZS5jb25maWcud2hpdGVsaXN0LnNsaWNlKCk7XG4gICAgd2hpdGVsaXN0LnNwbGljZShpZHgsIDEpO1xuICAgICRzY29wZS5wcm92aWRlckNvbmZpZyh7XG4gICAgICB3aGl0ZWxpc3Q6IHdoaXRlbGlzdFxuICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICRzY29wZS5jb25maWcud2hpdGVsaXN0ID0gd2hpdGVsaXN0O1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5hZGRXTCA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgaWYgKCF1c2VyLm5hbWUgfHwgIXVzZXIubGV2ZWwpIHJldHVybjtcbiAgICB2YXIgd2hpdGVsaXN0ID0gJHNjb3BlLmNvbmZpZy53aGl0ZWxpc3Quc2xpY2UoKTtcbiAgICB3aGl0ZWxpc3QucHVzaCh1c2VyKTtcbiAgICAkc2NvcGUucHJvdmlkZXJDb25maWcoe1xuICAgICAgd2hpdGVsaXN0OiB3aGl0ZWxpc3RcbiAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuY29uZmlnLndoaXRlbGlzdCA9IHdoaXRlbGlzdDtcbiAgICB9KTtcbiAgfTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5IZXJva3VDb250cm9sbGVyJywgWyckc2NvcGUnLCBIZXJva3VDdHJsXSk7XG5cbmZ1bmN0aW9uIEhlcm9rdUN0cmwoJHNjb3BlLCAkZWxlbWVudCkge1xuICAkc2NvcGUuJHdhdGNoKCd1c2VyQ29uZmlncy5oZXJva3UnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlKSByZXR1cm5cbiAgICAkc2NvcGUudXNlckNvbmZpZyA9IHZhbHVlO1xuICAgIGlmICghJHNjb3BlLmFjY291bnQgJiYgdmFsdWUuYWNjb3VudHMgJiYgdmFsdWUuYWNjb3VudHMubGVuZ3RoID4gMCkge1xuICAgICAgJHNjb3BlLmFjY291bnQgPSB2YWx1ZS5hY2NvdW50c1swXTtcbiAgICB9XG4gIH0pO1xuICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXS5oZXJva3UuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICAgIGlmICh2YWx1ZS5hcHAgJiYgJHNjb3BlLnVzZXJDb25maWcuYWNjb3VudHMpIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTwkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoJHNjb3BlLnVzZXJDb25maWcuYWNjb3VudHNbaV0uaWQgPT09IHZhbHVlLmFwcC5hY2NvdW50KSB7XG4gICAgICAgICAgJHNjb3BlLmFjY291bnQgPSAkc2NvcGUudXNlckNvbmZpZy5hY2NvdW50c1tpXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gICRzY29wZS5zYXZpbmcgPSBmYWxzZTtcbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnaGVyb2t1JywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUuZ2V0QXBwcyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoISRzY29wZS5hY2NvdW50KSByZXR1cm4gY29uc29sZS53YXJuKCd0cmllZCB0byBnZXRBcHBzIGJ1dCBubyBhY2NvdW50Jyk7XG4gICAgJC5hamF4KCcvZXh0L2hlcm9rdS9hcHBzLycgKyAkc2NvcGUuYWNjb3VudC5pZCwge1xuICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoYm9keSwgcmVxKSB7XG4gICAgICAgICRzY29wZS5hY2NvdW50LmNhY2hlID0gYm9keTtcbiAgICAgICAgJHNjb3BlLnN1Y2Nlc3MoJ0dvdCBhY2NvdW50cyBsaXN0IGZvciAnICsgJHNjb3BlLmFjY291bnQuZW1haWwsIHRydWUpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5lcnJvcignRmFpbGVkIHRvIGdldCBhY2NvdW50cyBsaXN0IGZvciAnICsgJHNjb3BlLmFjY291bnQuZW1haWwsIHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5Kb2JDb250cm9sbGVyJywgWyckc2NvcGUnLCBKb2JDb250cm9sbGVyXSk7XG5cbmZ1bmN0aW9uIEpvYkNvbnRyb2xsZXIoJHNjb3BlKSB7XG5cbiAgJHNjb3BlLmluaXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgJHNjb3BlLiR3YXRjaCgndXNlckNvbmZpZ3NbXCInICsgbmFtZSArICdcIl0nLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICRzY29wZS51c2VyQ29uZmlnID0gdmFsdWU7XG4gICAgfSk7XG4gICAgJHNjb3BlLiR3YXRjaCgnY29uZmlnc1ticmFuY2gubmFtZV1bXCInICsgbmFtZSArICdcIl0uY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgfSk7XG4gICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgICAkc2NvcGUucGx1Z2luQ29uZmlnKG5hbWUsICRzY29wZS5jb25maWcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5Ob2RlQ29udHJvbGxlcicsIFsnJHNjb3BlJywgTm9kZUNvbnRyb2xsZXJdKTtcblxuZnVuY3Rpb24gTm9kZUNvbnRyb2xsZXIoJHNjb3BlKSB7XG4gICRzY29wZS4kd2F0Y2goJ2NvbmZpZ3NbYnJhbmNoLm5hbWVdLm5vZGUuY29uZmlnJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHNjb3BlLmNvbmZpZyA9IHZhbHVlO1xuICB9KTtcbiAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCdub2RlJywgJHNjb3BlLmNvbmZpZywgZnVuY3Rpb24gKCkge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuICAkc2NvcGUucmVtb3ZlR2xvYmFsID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgJHNjb3BlLmNvbmZpZy5nbG9iYWxzLnNwbGljZShpbmRleCwgMSk7XG4gICAgJHNjb3BlLnNhdmUoKTtcbiAgfTtcbiAgJHNjb3BlLmFkZEdsb2JhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoISRzY29wZS5jb25maWcuZ2xvYmFscykgJHNjb3BlLmNvbmZpZy5nbG9iYWxzID0gW107XG4gICAgJHNjb3BlLmNvbmZpZy5nbG9iYWxzLnB1c2goJHNjb3BlLm5ld19wYWNrYWdlKTtcbiAgICAkc2NvcGUubmV3X3BhY2thZ2UgPSAnJztcbiAgICAkc2NvcGUuc2F2ZSgpO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi8uLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0NvbmZpZy5SdW5uZXJDb250cm9sbGVyJywgWyckc2NvcGUnLCBSdW5uZXJDb250cm9sbGVyXSk7XG5cbmZ1bmN0aW9uIFJ1bm5lckNvbnRyb2xsZXIoJHNjb3BlKSB7XG5cbiAgJHNjb3BlLmluaXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgICRzY29wZS4kd2F0Y2goJ3J1bm5lckNvbmZpZ3NbYnJhbmNoLm5hbWVdW1wiJyArIG5hbWUgKyAnXCJdJywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBjb25zb2xlLmxvZygnUnVubmVyIGNvbmZpZycsIG5hbWUsIHZhbHVlLCAkc2NvcGUucnVubmVyQ29uZmlncyk7XG4gICAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLnNhdmluZyA9IHRydWU7XG4gICAgJHNjb3BlLnJ1bm5lckNvbmZpZygkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgfSk7XG4gIH07XG5cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdDb25maWcuU2F1Y2VDdHJsJywgWyckc2NvcGUnLCBTYXVjZUN0cmxdKTtcblxuZnVuY3Rpb24gU2F1Y2VDdHJsKCRzY29wZSkge1xuICAkc2NvcGUuJHdhdGNoKCdjb25maWdzW2JyYW5jaC5uYW1lXS5zYXVjZS5jb25maWcnLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkc2NvcGUuY29uZmlnID0gdmFsdWU7XG4gICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICRzY29wZS5icm93c2VyX21hcCA9IHt9O1xuICAgIGlmICghdmFsdWUuYnJvd3NlcnMpIHtcbiAgICAgIHZhbHVlLmJyb3dzZXJzID0gW107XG4gICAgfVxuICAgIGZvciAodmFyIGk9MDsgaTx2YWx1ZS5icm93c2Vycy5sZW5ndGg7IGkrKykge1xuICAgICAgJHNjb3BlLmJyb3dzZXJfbWFwW3NlcmlhbGl6ZU5hbWUodmFsdWUuYnJvd3NlcnNbaV0pXSA9IHRydWU7XG4gICAgfVxuICB9KTtcbiAgJHNjb3BlLmNvbXBsZXRlTmFtZSA9IGNvbXBsZXRlTmFtZTtcbiAgJHNjb3BlLm9wZXJhdGluZ3N5c3RlbXMgPSBvcmdhbml6ZShicm93c2VycyB8fCBbXSk7XG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICRzY29wZS5jb25maWcuYnJvd3NlcnMgPSBbXTtcbiAgICBmb3IgKHZhciBuYW1lIGluICRzY29wZS5icm93c2VyX21hcCkge1xuICAgICAgaWYgKCRzY29wZS5icm93c2VyX21hcFtuYW1lXSkge1xuICAgICAgICAkc2NvcGUuY29uZmlnLmJyb3dzZXJzLnB1c2gocGFyc2VOYW1lKG5hbWUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnBsdWdpbkNvbmZpZygnc2F1Y2UnLCAkc2NvcGUuY29uZmlnLCBmdW5jdGlvbiAoKSB7XG4gICAgfSk7XG4gIH07XG4gICRzY29wZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuYnJvd3Nlcl9tYXAgPSB7fTtcbiAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBvcmdhbml6ZShicm93c2Vycykge1xuICB2YXIgb3NzID0ge307XG4gIGZvciAodmFyIGk9MDsgaTxicm93c2Vycy5sZW5ndGg7IGkrKykge1xuICAgIGlmICghb3NzW2Jyb3dzZXJzW2ldLm9zXSkge1xuICAgICAgb3NzW2Jyb3dzZXJzW2ldLm9zXSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIW9zc1ticm93c2Vyc1tpXS5vc11bYnJvd3NlcnNbaV0ubG9uZ19uYW1lXSkge1xuICAgICAgb3NzW2Jyb3dzZXJzW2ldLm9zXVticm93c2Vyc1tpXS5sb25nX25hbWVdID0gW107XG4gICAgfVxuICAgIG9zc1ticm93c2Vyc1tpXS5vc11bYnJvd3NlcnNbaV0ubG9uZ19uYW1lXS5wdXNoKGJyb3dzZXJzW2ldKTtcbiAgICBicm93c2Vyc1tpXS5jb21wbGV0ZV9uYW1lID0gY29tcGxldGVOYW1lKGJyb3dzZXJzW2ldKTtcbiAgfVxuICByZXR1cm4gb3NzO1xufVxuXG5mdW5jdGlvbiBjb21wbGV0ZU5hbWUodmVyc2lvbikge1xuICByZXR1cm4gdmVyc2lvbi5vcyArICctJyArIHZlcnNpb24uYXBpX25hbWUgKyAnLScgKyB2ZXJzaW9uLnNob3J0X3ZlcnNpb247XG59XG5cbmZ1bmN0aW9uIHBhcnNlTmFtZShuYW1lKSB7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJy0nKTtcbiAgcmV0dXJuIHtcbiAgICBwbGF0Zm9ybTogcGFydHNbMF0sXG4gICAgYnJvd3Nlck5hbWU6IHBhcnRzWzFdLFxuICAgIHZlcnNpb246IHBhcnRzWzJdIHx8ICcnXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZU5hbWUoYnJvd3Nlcikge1xuICByZXR1cm4gYnJvd3Nlci5wbGF0Zm9ybSArICctJyArIGJyb3dzZXIuYnJvd3Nlck5hbWUgKyAnLScgKyBicm93c2VyLnZlcnNpb247XG59IiwidmFyIEFwcCA9IHJlcXVpcmUoJy4uLy4uL2FwcCcpO1xuXG5BcHAuY29udHJvbGxlcignQ29uZmlnLldlYmhvb2tzQ3RybCcsIFsnJHNjb3BlJywgV2ViaG9va3NDdHJsXSk7XG5cbmZ1bmN0aW9uIFdlYmhvb2tzQ3RybCgkc2NvcGUpIHtcblxuICBmdW5jdGlvbiByZW1vdmUoYXIsIGl0ZW0pIHtcbiAgICBhci5zcGxpY2UoYXIuaW5kZXhPZihpdGVtKSwgMSk7XG4gIH1cblxuICAkc2NvcGUuaG9va3MgPSAkc2NvcGUucGx1Z2luQ29uZmlnKCd3ZWJob29rcycpIHx8IFtdO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoJHNjb3BlLmhvb2tzKSkgJHNjb3BlLmhvb2tzID0gW107XG4gIGlmICghJHNjb3BlLmhvb2tzLmxlbmd0aCkgJHNjb3BlLmhvb2tzLnB1c2goe30pO1xuXG4gICRzY29wZS5yZW1vdmUgPSBmdW5jdGlvbiAoaG9vaykge1xuICAgICRzY29wZS5zYXZpbmcgPSB0cnVlO1xuICAgICRzY29wZS5wbHVnaW5Db25maWcoJ3dlYmhvb2tzJywgJHNjb3BlLmhvb2tzLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAkc2NvcGUuc2F2aW5nID0gZmFsc2U7XG4gICAgICBpZiAoIWVycikgcmVtb3ZlKCRzY29wZS5ob29rcywgaG9vayk7XG4gICAgICBpZiAoISRzY29wZS5ob29rcy5sZW5ndGgpICRzY29wZS5ob29rcy5wdXNoKHt9KTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuc2F2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAkc2NvcGUuc2F2aW5nID0gdHJ1ZTtcbiAgICAkc2NvcGUucGx1Z2luQ29uZmlnKCd3ZWJob29rcycsICRzY29wZS5ob29rcywgZnVuY3Rpb24gKGVycikge1xuICAgICAgJHNjb3BlLnNhdmluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgJHNjb3BlLmhvb2tzLnB1c2goe30pO1xuICB9O1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0Rhc2hib2FyZEN0cmwnLCBbJyRzY29wZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIERhc2hib2FyZEN0cmxdKTtcblxuZnVuY3Rpb24gRGFzaGJvYXJkQ3RybCgkc2NvcGUsICRsb2NhdGlvbiwgU3RyaWRlcikge1xuXG4gIC8vIFRPRE86IG1ha2UgdGhpcyBtb3JlIGRlY2xhcmF0aXZlOlxuICBTdHJpZGVyLlNlc3Npb24uZ2V0KGZ1bmN0aW9uKHVzZXIpIHtcbiAgICBpZiAoISB1c2VyLnVzZXIpICRsb2NhdGlvbi5wYXRoKCcvbG9naW4nKTtcbiAgICBlbHNlIGF1dGhlbnRpY2F0ZWQoKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gYXV0aGVudGljYXRlZCgpIHtcbiAgICAkc2NvcGUuam9icyA9IFN0cmlkZXIuam9icztcbiAgICBTdHJpZGVyLmNvbm5lY3QoJHNjb3BlKTtcbiAgICBTdHJpZGVyLmpvYnMuZGFzaGJvYXJkKCk7XG4gIH1cblxuICAkc2NvcGUuZGVwbG95ID0gZnVuY3Rpb24gZGVwbG95KHByb2plY3QpIHtcbiAgICBTdHJpZGVyLmRlcGxveShwcm9qZWN0KTtcbiAgfTtcblxufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0Vycm9yQ3RybCcsIFsnJHNjb3BlJywgJyRyb290U2NvcGUnLCBFcnJvckN0cmxdKTtcblxuZnVuY3Rpb24gRXJyb3JDdHJsKCRzY29wZSwgJHJvb3RTY29wZSkge1xuICAkc2NvcGUuZXJyb3IgPSB7fTtcblxuICAkcm9vdFNjb3BlLiRvbignZXJyb3InLCBmdW5jdGlvbihldiwgZXJyKSB7XG4gICAgJHNjb3BlLmVycm9yLm1lc3NhZ2UgPSBlcnIubWVzc2FnZSB8fCBlcnI7XG4gIH0pO1xuXG4gICRyb290U2NvcGUuJG9uKCckcm91dGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5lcnJvci5tZXNzYWdlID0gJyc7XG4gIH0pO1xufSIsInZhciBBcHAgPSByZXF1aXJlKCcuLi9hcHAnKTtcblxuQXBwLmNvbnRyb2xsZXIoJ0pvYkN0cmwnLCBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnU3RyaWRlcicsIEpvYkN0cmxdKTtcblxuZnVuY3Rpb24gSm9iQ3RybCgkc2NvcGUsICRyb3V0ZVBhcmFtcywgU3RyaWRlcikge1xuXG4gICRzY29wZS5waGFzZXMgPSBTdHJpZGVyLnBoYXNlcztcblxuICB2YXIgcHJvamVjdFNlYXJjaE9wdGlvbnMgPSB7XG4gICAgb3duZXI6ICRyb3V0ZVBhcmFtcy5vd25lcixcbiAgICByZXBvOiAgJHJvdXRlUGFyYW1zLnJlcG9cbiAgfTtcblxuICBTdHJpZGVyLlJlcG8uZ2V0KHByb2plY3RTZWFyY2hPcHRpb25zLCBmdW5jdGlvbihyZXBvKSB7XG4gICAgJHNjb3BlLnJlcG8gPSByZXBvLnByb2plY3RcbiAgICAkc2NvcGUuam9iICA9IHJlcG8uam9iO1xuICAgICRzY29wZS5qb2JzID0gcmVwby5qb2JzO1xuICB9KTtcblxuICBTdHJpZGVyLmNvbm5lY3QoJHNjb3BlKTtcbiAgJHNjb3BlLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveShqb2IpIHtcbiAgICBTdHJpZGVyLmRlcGxveShqb2IucHJvamVjdCk7XG4gIH07XG5cbiAgJHNjb3BlLnRlc3QgPSBmdW5jdGlvbiB0ZXN0KGpvYikge1xuICAgIFN0cmlkZXIudGVzdChqb2IucHJvamVjdCk7XG4gIH07XG5cbn0iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi4vYXBwJyk7XG5cbkFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBbJyRzY29wZScsICckbG9jYXRpb24nLCAnU3RyaWRlcicsIExvZ2luQ3RybF0pO1xuXG5mdW5jdGlvbiBMb2dpbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24sIFN0cmlkZXIpIHtcblxuICBTdHJpZGVyLlNlc3Npb24uZ2V0KGZ1bmN0aW9uKHVzZXIpIHtcbiAgICBpZiAodXNlci5pZCkgJGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcbiAgfSk7XG5cbiAgJHNjb3BlLnVzZXIgPSB7fTtcblxuICAkc2NvcGUubG9naW4gPSBmdW5jdGlvbiBsb2dpbih1c2VyKSB7XG4gICAgdmFyIHNlc3Npb24gPSBuZXcgKFN0cmlkZXIuU2Vzc2lvbikodXNlcik7XG4gICAgc2Vzc2lvbi4kc2F2ZShmdW5jdGlvbigpIHtcbiAgICAgICRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7XG4gICAgfSk7XG4gIH07XG59IiwidmFyIGFwcCA9IHJlcXVpcmUoJy4uL2FwcCcpO1xuXG5hcHAuZmlsdGVyKCdhbnNpJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKCFpbnB1dCkgcmV0dXJuICcnO1xuICAgIHZhciB0ZXh0ID0gaW5wdXQucmVwbGFjZSgvXlteXFxuXFxyXSpcXHUwMDFiXFxbMksvZ20sICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFx1MDAxYlxcW0tbXlxcblxccl0qL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvW15cXG5dKlxccihbXlxcbl0pL2csICckMScpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9eW15cXG5dKlxcdTAwMWJcXFswRy9nbSwgJycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuICAgIHJldHVybiBhbnNpZmlsdGVyKHRleHQpO1xuICB9XG59KTtcblxuZnVuY3Rpb24gYW5zaXBhcnNlKHN0cikge1xuICAvL1xuICAvLyBJJ20gdGVycmlibGUgYXQgd3JpdGluZyBwYXJzZXJzLlxuICAvL1xuICB2YXIgbWF0Y2hpbmdDb250cm9sID0gbnVsbCxcbiAgICAgIG1hdGNoaW5nRGF0YSA9IG51bGwsXG4gICAgICBtYXRjaGluZ1RleHQgPSAnJyxcbiAgICAgIGFuc2lTdGF0ZSA9IFtdLFxuICAgICAgcmVzdWx0ID0gW10sXG4gICAgICBvdXRwdXQgPSBcIlwiLFxuICAgICAgc3RhdGUgPSB7fSxcbiAgICAgIGVyYXNlQ2hhcjtcblxuICB2YXIgaGFuZGxlUmVzdWx0ID0gZnVuY3Rpb24ocCkge1xuICAgIHZhciBjbGFzc2VzID0gW107XG5cbiAgICBwLmZvcmVncm91bmQgJiYgY2xhc3Nlcy5wdXNoKHAuZm9yZWdyb3VuZCk7XG4gICAgcC5iYWNrZ3JvdW5kICYmIGNsYXNzZXMucHVzaCgnYmctJyArIHAuYmFja2dyb3VuZCk7XG4gICAgcC5ib2xkICAgICAgICYmIGNsYXNzZXMucHVzaCgnYm9sZCcpO1xuICAgIHAuaXRhbGljICAgICAmJiBjbGFzc2VzLnB1c2goJ2l0YWxpYycpO1xuICAgIGlmICghcC50ZXh0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjbGFzc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG91dHB1dCArPSBwLnRleHRcbiAgICB9XG4gICAgdmFyIHNwYW4gPSAnPHNwYW4gY2xhc3M9XCInICsgY2xhc3Nlcy5qb2luKCcgJykgKyAnXCI+JyArIHAudGV4dCArICc8L3NwYW4+J1xuICAgIG91dHB1dCArPSBzcGFuXG4gIH1cbiAgLy9cbiAgLy8gR2VuZXJhbCB3b3JrZmxvdyBmb3IgdGhpcyB0aGluZyBpczpcbiAgLy8gXFwwMzNcXFszM21UZXh0XG4gIC8vIHwgICAgIHwgIHxcbiAgLy8gfCAgICAgfCAgbWF0Y2hpbmdUZXh0XG4gIC8vIHwgICAgIG1hdGNoaW5nRGF0YVxuICAvLyBtYXRjaGluZ0NvbnRyb2xcbiAgLy9cbiAgLy8gSW4gZnVydGhlciBzdGVwcyB3ZSBob3BlIGl0J3MgYWxsIGdvaW5nIHRvIGJlIGZpbmUuIEl0IHVzdWFsbHkgaXMuXG4gIC8vXG5cbiAgLy9cbiAgLy8gRXJhc2VzIGEgY2hhciBmcm9tIHRoZSBvdXRwdXRcbiAgLy9cbiAgZXJhc2VDaGFyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpbmRleCwgdGV4dDtcbiAgICBpZiAobWF0Y2hpbmdUZXh0Lmxlbmd0aCkge1xuICAgICAgbWF0Y2hpbmdUZXh0ID0gbWF0Y2hpbmdUZXh0LnN1YnN0cigwLCBtYXRjaGluZ1RleHQubGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHJlc3VsdC5sZW5ndGgpIHtcbiAgICAgIGluZGV4ID0gcmVzdWx0Lmxlbmd0aCAtIDE7XG4gICAgICB0ZXh0ID0gcmVzdWx0W2luZGV4XS50ZXh0O1xuICAgICAgaWYgKHRleHQubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIEEgcmVzdWx0IGJpdCB3YXMgZnVsbHkgZGVsZXRlZCwgcG9wIGl0IG91dCB0byBzaW1wbGlmeSB0aGUgZmluYWwgb3V0cHV0XG4gICAgICAgIC8vXG4gICAgICAgIHJlc3VsdC5wb3AoKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXN1bHRbaW5kZXhdLnRleHQgPSB0ZXh0LnN1YnN0cigwLCB0ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGlmIChtYXRjaGluZ0NvbnRyb2wgIT09IG51bGwpIHtcbiAgICAgIGlmIChtYXRjaGluZ0NvbnRyb2wgPT0gJ1xcMDMzJyAmJiBzdHJbaV0gPT0gJ1xcWycpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gV2UndmUgbWF0Y2hlZCBmdWxsIGNvbnRyb2wgY29kZS4gTGV0cyBzdGFydCBtYXRjaGluZyBmb3JtYXRpbmcgZGF0YS5cbiAgICAgICAgLy9cblxuICAgICAgICAvL1xuICAgICAgICAvLyBcImVtaXRcIiBtYXRjaGVkIHRleHQgd2l0aCBjb3JyZWN0IHN0YXRlXG4gICAgICAgIC8vXG4gICAgICAgIGlmIChtYXRjaGluZ1RleHQpIHtcbiAgICAgICAgICBzdGF0ZS50ZXh0ID0gbWF0Y2hpbmdUZXh0O1xuICAgICAgICAgIGhhbmRsZVJlc3VsdChzdGF0ZSk7XG4gICAgICAgICAgc3RhdGUgPSB7fTtcbiAgICAgICAgICBtYXRjaGluZ1RleHQgPSBcIlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF0Y2hpbmdDb250cm9sID0gbnVsbDtcbiAgICAgICAgbWF0Y2hpbmdEYXRhID0gJyc7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gV2UgZmFpbGVkIHRvIG1hdGNoIGFueXRoaW5nIC0gbW9zdCBsaWtlbHkgYSBiYWQgY29udHJvbCBjb2RlLiBXZVxuICAgICAgICAvLyBnbyBiYWNrIHRvIG1hdGNoaW5nIHJlZ3VsYXIgc3RyaW5ncy5cbiAgICAgICAgLy9cbiAgICAgICAgbWF0Y2hpbmdUZXh0ICs9IG1hdGNoaW5nQ29udHJvbCArIHN0cltpXTtcbiAgICAgICAgbWF0Y2hpbmdDb250cm9sID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChtYXRjaGluZ0RhdGEgIT09IG51bGwpIHtcbiAgICAgIGlmIChzdHJbaV0gPT0gJzsnKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIGA7YCBzZXBhcmF0ZXMgbWFueSBmb3JtYXR0aW5nIGNvZGVzLCBmb3IgZXhhbXBsZTogYFxcMDMzWzMzOzQzbWBcbiAgICAgICAgLy8gbWVhbnMgdGhhdCBib3RoIGAzM2AgYW5kIGA0M2Agc2hvdWxkIGJlIGFwcGxpZWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE86IHRoaXMgY2FuIGJlIHNpbXBsaWZpZWQgYnkgbW9kaWZ5aW5nIHN0YXRlIGhlcmUuXG4gICAgICAgIC8vXG4gICAgICAgIGFuc2lTdGF0ZS5wdXNoKG1hdGNoaW5nRGF0YSk7XG4gICAgICAgIG1hdGNoaW5nRGF0YSA9ICcnO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoc3RyW2ldID09ICdtJykge1xuICAgICAgICAvL1xuICAgICAgICAvLyBgbWAgZmluaXNoZWQgd2hvbGUgZm9ybWF0dGluZyBjb2RlLiBXZSBjYW4gcHJvY2VlZCB0byBtYXRjaGluZ1xuICAgICAgICAvLyBmb3JtYXR0ZWQgdGV4dC5cbiAgICAgICAgLy9cbiAgICAgICAgYW5zaVN0YXRlLnB1c2gobWF0Y2hpbmdEYXRhKTtcbiAgICAgICAgbWF0Y2hpbmdEYXRhID0gbnVsbDtcbiAgICAgICAgbWF0Y2hpbmdUZXh0ID0gJyc7XG5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gQ29udmVydCBtYXRjaGVkIGZvcm1hdHRpbmcgZGF0YSBpbnRvIHVzZXItZnJpZW5kbHkgc3RhdGUgb2JqZWN0LlxuICAgICAgICAvL1xuICAgICAgICAvLyBUT0RPOiBEUlkuXG4gICAgICAgIC8vXG4gICAgICAgIGFuc2lTdGF0ZS5mb3JFYWNoKGZ1bmN0aW9uIChhbnNpQ29kZSkge1xuICAgICAgICAgIGlmIChhbnNpcGFyc2UuZm9yZWdyb3VuZENvbG9yc1thbnNpQ29kZV0pIHtcbiAgICAgICAgICAgIHN0YXRlLmZvcmVncm91bmQgPSBhbnNpcGFyc2UuZm9yZWdyb3VuZENvbG9yc1thbnNpQ29kZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lwYXJzZS5iYWNrZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXSkge1xuICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZCA9IGFuc2lwYXJzZS5iYWNrZ3JvdW5kQ29sb3JzW2Fuc2lDb2RlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYW5zaUNvZGUgPT0gMzkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5mb3JlZ3JvdW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSA0OSkge1xuICAgICAgICAgICAgZGVsZXRlIHN0YXRlLmJhY2tncm91bmQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lwYXJzZS5zdHlsZXNbYW5zaUNvZGVdKSB7XG4gICAgICAgICAgICBzdGF0ZVthbnNpcGFyc2Uuc3R5bGVzW2Fuc2lDb2RlXV0gPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAyMikge1xuICAgICAgICAgICAgc3RhdGUuYm9sZCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhbnNpQ29kZSA9PSAyMykge1xuICAgICAgICAgICAgc3RhdGUuaXRhbGljID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFuc2lDb2RlID09IDI0KSB7XG4gICAgICAgICAgICBzdGF0ZS51bmRlcmxpbmUgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBhbnNpU3RhdGUgPSBbXTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBtYXRjaGluZ0RhdGEgKz0gc3RyW2ldO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHN0cltpXSA9PSAnXFwwMzMnKSB7XG4gICAgICBtYXRjaGluZ0NvbnRyb2wgPSBzdHJbaV07XG4gICAgfVxuICAgIGVsc2UgaWYgKHN0cltpXSA9PSAnXFx1MDAwOCcpIHtcbiAgICAgIGVyYXNlQ2hhcigpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIG1hdGNoaW5nVGV4dCArPSBzdHJbaV07XG4gICAgfVxuICB9XG5cbiAgaWYgKG1hdGNoaW5nVGV4dCkge1xuICAgIHN0YXRlLnRleHQgPSBtYXRjaGluZ1RleHQgKyAobWF0Y2hpbmdDb250cm9sID8gbWF0Y2hpbmdDb250cm9sIDogJycpO1xuICAgIGhhbmRsZVJlc3VsdChzdGF0ZSk7XG4gIH1cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuYW5zaXBhcnNlLmZvcmVncm91bmRDb2xvcnMgPSB7XG4gICczMCc6ICdibGFjaycsXG4gICczMSc6ICdyZWQnLFxuICAnMzInOiAnZ3JlZW4nLFxuICAnMzMnOiAneWVsbG93JyxcbiAgJzM0JzogJ2JsdWUnLFxuICAnMzUnOiAnbWFnZW50YScsXG4gICczNic6ICdjeWFuJyxcbiAgJzM3JzogJ3doaXRlJyxcbiAgJzkwJzogJ2dyZXknXG59O1xuXG5hbnNpcGFyc2UuYmFja2dyb3VuZENvbG9ycyA9IHtcbiAgJzQwJzogJ2JsYWNrJyxcbiAgJzQxJzogJ3JlZCcsXG4gICc0Mic6ICdncmVlbicsXG4gICc0Myc6ICd5ZWxsb3cnLFxuICAnNDQnOiAnYmx1ZScsXG4gICc0NSc6ICdtYWdlbnRhJyxcbiAgJzQ2JzogJ2N5YW4nLFxuICAnNDcnOiAnd2hpdGUnXG59O1xuXG5hbnNpcGFyc2Uuc3R5bGVzID0ge1xuICAnMSc6ICdib2xkJyxcbiAgJzMnOiAnaXRhbGljJyxcbiAgJzQnOiAndW5kZXJsaW5lJ1xufTtcblxuZnVuY3Rpb24gYW5zaWZpbHRlcihkYXRhLCBwbGFpbnRleHQsIGNhY2hlKSB7XG5cbiAgLy8gaGFuZGxlIHRoZSBjaGFyYWN0ZXJzIGZvciBcImRlbGV0ZSBsaW5lXCIgYW5kIFwibW92ZSB0byBzdGFydCBvZiBsaW5lXCJcbiAgdmFyIHN0YXJ0c3dpdGhjciA9IC9eW15cXG5dKlxcclteXFxuXS8udGVzdChkYXRhKTtcbiAgdmFyIG91dHB1dCA9IGFuc2lwYXJzZShkYXRhKTtcblxuICB2YXIgcmVzID0gb3V0cHV0LnJlcGxhY2UoL1xcMDMzL2csICcnKTtcbiAgaWYgKHN0YXJ0c3dpdGhjcikgcmVzID0gJ1xccicgKyByZXM7XG5cbiAgcmV0dXJuIHJlcztcbn1cblxuIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUpvYlN0b3JlO1xuZnVuY3Rpb24gY3JlYXRlSm9iU3RvcmUoKSB7XG4gIHJldHVybiBuZXcgSm9iU3RvcmU7XG59XG5cbnZhciBQSEFTRVMgPSBleHBvcnRzLnBoYXNlcyA9XG5bJ2Vudmlyb25tZW50JywgJ3ByZXBhcmUnLCAndGVzdCcsICdkZXBsb3knLCAnY2xlYW51cCddO1xuXG52YXIgc3RhdHVzSGFuZGxlcnMgPSB7XG4gICdzdGFydGVkJzogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB0aGlzLnN0YXJ0ZWQgPSB0aW1lO1xuICAgIHRoaXMucGhhc2UgPSAnZW52aXJvbm1lbnQnO1xuICAgIHRoaXMuc3RhdHVzID0gJ3J1bm5pbmcnO1xuICB9LFxuICAnZXJyb3JlZCc6IGZ1bmN0aW9uIChlcnJvcikge1xuICAgIHRoaXMuZXJyb3IgPSBlcnJvcjtcbiAgICB0aGlzLnN0YXR1cyA9ICdlcnJvcmVkJztcbiAgfSxcbiAgJ2NhbmNlbGVkJzogJ2Vycm9yZWQnLFxuICAncGhhc2UuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdGhpcy5waGFzZSA9IFBIQVNFUy5pbmRleE9mKGRhdGEucGhhc2UpICsgMTtcbiAgfSxcbiAgLy8gdGhpcyBpcyBqdXN0IHNvIHdlJ2xsIHRyaWdnZXIgdGhlIFwidW5rbm93biBqb2JcIiBsb29rdXAgc29vbmVyIG9uIHRoZSBkYXNoYm9hcmRcbiAgJ3N0ZG91dCc6IGZ1bmN0aW9uICh0ZXh0KSB7fSxcbiAgJ3N0ZGVycic6IGZ1bmN0aW9uICh0ZXh0KSB7fSxcbiAgJ3dhcm5pbmcnOiBmdW5jdGlvbiAod2FybmluZykge1xuICAgIGlmICghdGhpcy53YXJuaW5ncykge1xuICAgICAgdGhpcy53YXJuaW5ncyA9IFtdO1xuICAgIH1cbiAgICB0aGlzLndhcm5pbmdzLnB1c2god2FybmluZyk7XG4gIH0sXG4gICdwbHVnaW4tZGF0YSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIHBhdGggPSBkYXRhLnBhdGggPyBbZGF0YS5wbHVnaW5dLmNvbmNhdChkYXRhLnBhdGguc3BsaXQoJy4nKSkgOiBbZGF0YS5wbHVnaW5dXG4gICAgLCBsYXN0ID0gcGF0aC5wb3AoKVxuICAgICwgbWV0aG9kID0gZGF0YS5tZXRob2QgfHwgJ3JlcGxhY2UnXG4gICAgLCBwYXJlbnRcbiAgICBwYXJlbnQgPSBwYXRoLnJlZHVjZShmdW5jdGlvbiAob2JqLCBhdHRyKSB7XG4gICAgICByZXR1cm4gb2JqW2F0dHJdIHx8IChvYmpbYXR0cl0gPSB7fSlcbiAgICB9LCB0aGlzLnBsdWdpbl9kYXRhIHx8ICh0aGlzLnBsdWdpbl9kYXRhID0ge30pKVxuICAgIGlmIChtZXRob2QgPT09ICdyZXBsYWNlJykge1xuICAgICAgcGFyZW50W2xhc3RdID0gZGF0YS5kYXRhXG4gICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdwdXNoJykge1xuICAgICAgaWYgKCFwYXJlbnRbbGFzdF0pIHtcbiAgICAgICAgcGFyZW50W2xhc3RdID0gW11cbiAgICAgIH1cbiAgICAgIHBhcmVudFtsYXN0XS5wdXNoKGRhdGEuZGF0YSlcbiAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ2V4dGVuZCcpIHtcbiAgICAgIGlmICghcGFyZW50W2xhc3RdKSB7XG4gICAgICAgIHBhcmVudFtsYXN0XSA9IHt9XG4gICAgICB9XG4gICAgICBleHRlbmQocGFyZW50W2xhc3RdLCBkYXRhLmRhdGEpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgXCJwbHVnaW4gZGF0YVwiIG1ldGhvZCByZWNlaXZlZCBmcm9tIHBsdWdpbicsIGRhdGEucGx1Z2luLCBkYXRhLm1ldGhvZCwgZGF0YSlcbiAgICB9XG4gIH0sXG5cbiAgJ3BoYXNlLmRvbmUnOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmICghIHRoaXMucGhhc2VzKSByZXR1cm47XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZmluaXNoZWQgPSBkYXRhLnRpbWU7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uZHVyYXRpb24gPSBkYXRhLmVsYXBzZWRcbiAgICB0aGlzLnBoYXNlc1tkYXRhLnBoYXNlXS5leGl0Q29kZSA9IGRhdGEuY29kZTtcbiAgICBpZiAoWydwcmVwYXJlJywgJ2Vudmlyb25tZW50JywgJ2NsZWFudXAnXS5pbmRleE9mKGRhdGEucGhhc2UpICE9PSAtMSkge1xuICAgICAgdGhpcy5waGFzZXNbZGF0YS5waGFzZV0uY29sbGFwc2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGRhdGEucGhhc2UgPT09ICd0ZXN0JykgdGhpcy50ZXN0X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoZGF0YS5waGFzZSA9PT0gJ2RlcGxveScpIHRoaXMuZGVwbG95X3N0YXR1cyA9IGRhdGEuY29kZTtcbiAgICBpZiAoIWRhdGEubmV4dCB8fCAhdGhpcy5waGFzZXNbZGF0YS5uZXh0XSkgcmV0dXJuO1xuICAgIHRoaXMucGhhc2UgPSBkYXRhLm5leHQ7XG4gICAgdGhpcy5waGFzZXNbZGF0YS5uZXh0XS5zdGFydGVkID0gZGF0YS50aW1lO1xuICB9LFxuICAnY29tbWFuZC5jb21tZW50JzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBwaGFzZSA9IHRoaXMucGhhc2VzW3RoaXMucGhhc2VdXG4gICAgICAsIGNvbW1hbmQgPSBleHRlbmQoe30sIFNLRUxTLmNvbW1hbmQpO1xuICAgIGNvbW1hbmQuY29tbWFuZCA9IGRhdGEuY29tbWVudDtcbiAgICBjb21tYW5kLmNvbW1lbnQgPSB0cnVlO1xuICAgIGNvbW1hbmQucGx1Z2luID0gZGF0YS5wbHVnaW47XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9LFxuICAnY29tbWFuZC5zdGFydCc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kLCBkYXRhKTtcbiAgICBjb21tYW5kLnN0YXJ0ZWQgPSBkYXRhLnRpbWU7XG4gICAgcGhhc2UuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfSxcbiAgJ2NvbW1hbmQuZG9uZSc6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXVxuICAgICAgLCBjb21tYW5kID0gcGhhc2UuY29tbWFuZHNbcGhhc2UuY29tbWFuZHMubGVuZ3RoIC0gMV07XG4gICAgY29tbWFuZC5maW5pc2hlZCA9IGRhdGEudGltZTtcbiAgICBjb21tYW5kLmR1cmF0aW9uID0gZGF0YS5lbGFwc2VkO1xuICAgIGNvbW1hbmQuZXhpdENvZGUgPSBkYXRhLmV4aXRDb2RlO1xuICAgIGNvbW1hbmQubWVyZ2VkID0gY29tbWFuZC5fbWVyZ2VkO1xuICB9LFxuICAnc3Rkb3V0JzogZnVuY3Rpb24gKHRleHQpIHtcbiAgICBpZiAoISB0aGlzLnBoYXNlcykgcmV0dXJuO1xuICAgIHZhciBjb21tYW5kID0gZW5zdXJlQ29tbWFuZCh0aGlzLnBoYXNlc1t0aGlzLnBoYXNlXSk7XG4gICAgY29tbWFuZC5vdXQgKz0gdGV4dDtcbiAgICBjb21tYW5kLl9tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5vdXQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWQgKz0gdGV4dDtcbiAgICB0aGlzLnN0ZC5tZXJnZWRfbGF0ZXN0ID0gdGV4dDtcbiAgfSxcbiAgJ3N0ZGVycic6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgaWYgKCEgdGhpcy5waGFzZXMpIHJldHVybjtcbiAgICB2YXIgY29tbWFuZCA9IGVuc3VyZUNvbW1hbmQodGhpcy5waGFzZXNbdGhpcy5waGFzZV0pO1xuICAgIGNvbW1hbmQuZXJyICs9IHRleHQ7XG4gICAgY29tbWFuZC5fbWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQuZXJyICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkICs9IHRleHQ7XG4gICAgdGhpcy5zdGQubWVyZ2VkX2xhdGVzdCA9IHRleHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gSm9iU3RvcmUoKSB7XG4gIHRoaXMuam9icyA9IHtcbiAgICBkYXNoYm9hcmQ6IGRhc2hib2FyZC5iaW5kKHRoaXMpLFxuICAgIHB1YmxpYzogW10sXG4gICAgeW91cnM6IFtdLFxuICAgIGxpbWJvOiBbXVxuICB9O1xufVxudmFyIEpTID0gSm9iU3RvcmUucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBkYXNoYm9hcmQoY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNvY2tldC5lbWl0KCdkYXNoYm9hcmQ6am9icycsIGZ1bmN0aW9uKGpvYnMpIHtcbiAgICBzZWxmLmpvYnMueW91cnMgPSBqb2JzLnlvdXJzO1xuICAgIHNlbGYuam9icy5wdWJsaWMgPSBqb2JzLnB1YmxpYztcbiAgICBzZWxmLmNoYW5nZWQoKTtcbiAgfSk7XG59XG5cblxuLy8vIC0tLS0gSm9iIFN0b3JlIHByb3RvdHlwZSBmdW5jdGlvbnM6IC0tLS1cblxuLy8vIGNvbm5lY3RcblxuSlMuY29ubmVjdCA9IGZ1bmN0aW9uIGNvbm5lY3Qoc29ja2V0LCBjaGFuZ2VDYWxsYmFjaykge1xuICB0aGlzLnNvY2tldCA9IHNvY2tldDtcbiAgdGhpcy5jaGFuZ2VDYWxsYmFjayA9IGNoYW5nZUNhbGxiYWNrO1xuXG4gIGZvciAodmFyIHN0YXR1cyBpbiBzdGF0dXNIYW5kbGVycykge1xuICAgIHNvY2tldC5vbignam9iLnN0YXR1cy4nICsgc3RhdHVzLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMsIHN0YXR1cykpXG4gIH1cblxuICBzb2NrZXQub24oJ2pvYi5uZXcnLCBKUy5uZXdKb2IuYmluZCh0aGlzKSk7XG59O1xuXG5cbi8vLyB1cGRhdGUgLSBoYW5kbGUgdXBkYXRlIGV2ZW50XG5cbkpTLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShldmVudCwgYXJncywgYWNjZXNzLCBkb250Y2hhbmdlKSB7XG4gIHZhciBpZCA9IGFyZ3Muc2hpZnQoKVxuICAgICwgam9iID0gdGhpcy5qb2IoaWQsIGFjY2VzcylcbiAgICAsIGhhbmRsZXIgPSBzdGF0dXNIYW5kbGVyc1tldmVudF07XG4gIGlmICgham9iKSByZXR1cm4gdGhpcy51bmtub3duKGlkLCBldmVudCwgYXJncywgYWNjZXNzKVxuICBpZiAoIWhhbmRsZXIpIHJldHVybjtcbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgaGFuZGxlcikge1xuICAgIGpvYi5zdGF0dXMgPSBoYW5kbGVyO1xuICB9IGVsc2Uge1xuICAgIGhhbmRsZXIuYXBwbHkoam9iLCBhcmdzKTtcbiAgfVxuICBpZiAoIWRvbnRjaGFuZ2UpIHRoaXMuY2hhbmdlZCgpO1xufTtcblxuXG4vLy8gbmV3Sm9iIC0gd2hlbiBzZXJ2ZXIgbm90aWZpZXMgb2YgbmV3IGpvYlxuXG5KUy5uZXdKb2IgPSBmdW5jdGlvbiBuZXdKb2Ioam9iLCBhY2Nlc3MpIHtcbiAgaWYgKCEgam9iKSByZXR1cm47XG4gIGlmIChBcnJheS5pc0FycmF5KGpvYikpIGpvYiA9IGpvYlswXTtcblxuICB2YXIgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdXG4gICAgLCBmb3VuZCA9IC0xXG4gICAgLCBvbGQ7XG5cbiAgaWYgKCEgam9icykgcmV0dXJuO1xuXG4gIGZ1bmN0aW9uIHNlYXJjaCgpIHtcbiAgICBmb3IgKHZhciBpPTA7IGk8am9icy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGpvYnNbaV0ucHJvamVjdC5uYW1lID09PSBqb2IucHJvamVjdC5uYW1lKSB7XG4gICAgICAgIGZvdW5kID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2VhcmNoKCk7XG4gIGlmIChmb3VuZCA8IDApIHtcbiAgICAvLy8gdHJ5IGxpbWJvXG4gICAgam9icyA9IHRoaXMuam9icy5saW1ibztcbiAgICBzZWFyY2goKTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIGpvYnMgPSB0aGlzLmpvYnNbYWNjZXNzXTtcbiAgICAgIGpvYnMudW5zaGlmdCh0aGlzLmpvYnMubGltYm9bZm91bmRdKTtcbiAgICAgIHRoaXMuam9icy5saW1iby5zcGxpY2UoZm91bmQsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChmb3VuZCAhPT0gLTEpIHtcbiAgICBvbGQgPSBqb2JzLnNwbGljZShmb3VuZCwgMSlbMF07XG4gICAgam9iLnByb2plY3QucHJldiA9IG9sZC5wcm9qZWN0LnByZXY7XG4gIH1cbiAgLy8gaWYgKGpvYi5waGFzZXMpIHtcbiAgLy8gICAvLyBnZXQgcmlkIG9mIGV4dHJhIGRhdGEgLSB3ZSBkb24ndCBuZWVkIGl0LlxuICAvLyAgIC8vIG5vdGU6IHRoaXMgd29uJ3QgYmUgcGFzc2VkIHVwIGFueXdheSBmb3IgcHVibGljIHByb2plY3RzXG4gIC8vICAgY2xlYW5Kb2Ioam9iKTtcbiAgLy8gfVxuICAvL2pvYi5waGFzZSA9ICdlbnZpcm9ubWVudCc7XG4gIGpvYnMudW5zaGlmdChqb2IpO1xuICB0aGlzLmNoYW5nZWQoKTtcbn07XG5cblxuLy8vIGpvYiAtIGZpbmQgYSBqb2IgYnkgaWQgYW5kIGFjY2VzcyBsZXZlbFxuXG5KUy5qb2IgPSBmdW5jdGlvbiBqb2IoaWQsIGFjY2Vzcykge1xuICB2YXIgam9icyA9IHRoaXMuam9ic1thY2Nlc3NdO1xuICB2YXIgam9iID0gc2VhcmNoKGlkLCBqb2JzKTtcbiAgLy8gaWYgbm90IGZvdW5kLCB0cnkgbGltYm9cbiAgaWYgKCEgam9iKXtcbiAgICBqb2IgPSBzZWFyY2goaWQsIHRoaXMuam9icy5saW1ibyk7XG4gICAgaWYgKGpvYikge1xuICAgICAgam9icy51bnNoaWZ0KGpvYik7XG4gICAgICB0aGlzLmpvYnMubGltYm8uc3BsaWNlKHRoaXMuam9icy5saW1iby5pbmRleE9mKGpvYiksIDEpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gam9iO1xufTtcblxuZnVuY3Rpb24gc2VhcmNoKGlkLCBqb2JzKSB7XG4gIGZvciAodmFyIGk9MDsgaTxqb2JzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGpvYnNbaV0uX2lkID09PSBpZCkgcmV0dXJuIGpvYnNbaV07XG4gIH1cbn1cblxuXG4vLy8gY2hhbmdlZCAtIG5vdGlmaWVzIFVJIG9mIGNoYW5nZXNcblxuSlMuY2hhbmdlZCA9IGZ1bmN0aW9uIGNoYW5nZWQoKSB7XG4gIHRoaXMuY2hhbmdlQ2FsbGJhY2soKTtcbn07XG5cblxuLy8vIGxvYWQg4oCUwqBsb2FkcyBhIGpvYlxuXG5KUy5sb2FkID0gZnVuY3Rpb24gbG9hZChqb2JJZCwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNvY2tldC5lbWl0KCdidWlsZDpqb2InLCBqb2JJZCwgZnVuY3Rpb24oam9iKSB7XG4gICAgc2VsZi5uZXdKb2Ioam9iLCAnbGltYm8nKTtcbiAgICBjYihqb2IpO1xuICAgIHNlbGYuY2hhbmdlZCgpO1xuICB9KTtcbn07XG5cbmZ1bmN0aW9uIGVuc3VyZUNvbW1hbmQocGhhc2UpIHtcbiAgdmFyIGNvbW1hbmQgPSBwaGFzZS5jb21tYW5kc1twaGFzZS5jb21tYW5kcy5sZW5ndGggLSAxXTtcbiAgaWYgKCFjb21tYW5kIHx8IHR5cGVvZihjb21tYW5kLmZpbmlzaGVkKSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb21tYW5kID0gZXh0ZW5kKHt9LCBTS0VMUy5jb21tYW5kKTtcbiAgICBwaGFzZS5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICB9XG4gIHJldHVybiBjb21tYW5kO1xufSIsInZhciBKb2JTdG9yZSA9IHJlcXVpcmUoJy4vam9iX3N0b3JlJyk7XG52YXIgam9iU3RvcmUgPSBKb2JTdG9yZSgpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBCdWlsZFN0cmlkZXI7XG5cbmZ1bmN0aW9uIEJ1aWxkU3RyaWRlcigkcmVzb3VyY2UpIHtcbiAgcmV0dXJuIG5ldyBTdHJpZGVyKCRyZXNvdXJjZSk7XG59XG5cblxudmFyIHNvY2tldDtcbnZhciBzY29wZXMgPSBbXTtcblxuZnVuY3Rpb24gU3RyaWRlcigkcmVzb3VyY2UsIG9wdHMpIHtcbiAgaWYgKCEgb3B0cykgb3B0cyA9IHt9O1xuICBpZiAodHlwZW9mIG9wdHMgPT0gJ3N0cmluZycpXG4gICAgb3B0cyA9IHsgdXJsOiBvcHRzIH07XG5cbiAgdGhpcy51cmwgPSBvcHRzLnVybCB8fCAnLy9sb2NhbGhvc3Q6MzAwMCc7XG5cbiAgLy8vIFJlc3RmdWwgQVBJIHNldHVwXG4gIHZhciBhcGlCYXNlICA9IHRoaXMudXJsICsgJy9hcGknO1xuICB2YXIgbG9naW5VUkwgPSB0aGlzLnVybCArICcvbG9naW4nO1xuICB0aGlzLlNlc3Npb24gPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvc2Vzc2lvbi8nKTtcbiAgdGhpcy5SZXBvICAgID0gJHJlc291cmNlKGFwaUJhc2UgKyAnLzpvd25lci86cmVwbycpO1xuICB0aGlzLkNvbmZpZyAgPSAkcmVzb3VyY2UoYXBpQmFzZSArICcvOm93bmVyLzpyZXBvL2NvbmZpZycpO1xuXG4gIHRoaXMuam9icyAgICA9IGpvYlN0b3JlLmpvYnM7XG4gIHRoaXMucGhhc2VzICA9IEpvYlN0b3JlLnBoYXNlcztcbn1cblxuXG52YXIgUyA9IFN0cmlkZXIucHJvdG90eXBlO1xuXG5cbi8vLyBjaGFuZ2VkIC0gaW52b2tlZCB3aGVuIFVJIG5lZWRzIHVwZGF0aW5nXG5mdW5jdGlvbiBjaGFuZ2VkKCkge1xuICBzY29wZXMuZm9yRWFjaChmdW5jdGlvbihzY29wZSkge1xuICAgIHNjb3BlLiRkaWdlc3QoKTtcbiAgfSk7XG59XG5cblxuLy8vLyAtLS0tIFN0cmlkZXIgcHJvdG90eXBlIGZ1bmN0aW9uc1xuXG4vLy8gY29ubmVjdFxuXG5TLmNvbm5lY3QgPSBmdW5jdGlvbihzY29wZSkge1xuICBpZiAoISBzb2NrZXQpIHtcbiAgICBzb2NrZXQgPSBpby5jb25uZWN0KHRoaXMudXJsKTtcblxuICAgIC8vLyBjb25uZWN0cyBqb2Igc3RvcmUgdG8gbmV3IHNvY2tldFxuICAgIGpvYlN0b3JlLmNvbm5lY3Qoc29ja2V0LCBjaGFuZ2VkKTtcbiAgfVxuICB0aGlzLnNvY2tldCA9IHNvY2tldDtcblxuICBzY29wZXMucHVzaChzY29wZSk7XG4gIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpID0gMCA7ICEgZm91bmQgJiYgaSA8IHNjb3Blcy5sZW5ndGg7IGkgKyspIHtcbiAgICAgIGlmIChzY29wZXNbaV0gPT0gc2NvcGUpIHtcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBzY29wZXMuc3BsaWNlKGksIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuXG5cbi8vLyBkZXBsb3lcblxuUy5kZXBsb3kgPSBmdW5jdGlvbiBkZXBsb3kocHJvamVjdCkge1xuICB0aGlzLnNvY2tldC5lbWl0KCdkZXBsb3knLCBwcm9qZWN0Lm5hbWUgfHwgcHJvamVjdCk7XG59O1xuXG5TLnRlc3QgPSBmdW5jdGlvbiB0ZXN0KHByb2plY3QpIHtcbiAgdGhpcy5zb2NrZXQuZW1pdCgndGVzdCcsIHByb2plY3QubmFtZSB8fCBwcm9qZWN0KTtcbn07XG5cblxuLy8vIGpvYlxuXG5TLmpvYiA9IGZ1bmN0aW9uIGpvYihqb2JJZCwgY2IpIHtcbiAgam9iU3RvcmUubG9hZChqb2JJZCwgY2IpO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGhhc0tleXNcblxuZnVuY3Rpb24gaGFzS2V5cyhzb3VyY2UpIHtcbiAgICByZXR1cm4gc291cmNlICE9PSBudWxsICYmXG4gICAgICAgICh0eXBlb2Ygc291cmNlID09PSBcIm9iamVjdFwiIHx8XG4gICAgICAgIHR5cGVvZiBzb3VyY2UgPT09IFwiZnVuY3Rpb25cIilcbn1cbiIsInZhciBLZXlzID0gcmVxdWlyZShcIm9iamVjdC1rZXlzXCIpXG52YXIgaGFzS2V5cyA9IHJlcXVpcmUoXCIuL2hhcy1rZXlzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBpZiAoIWhhc0tleXMoc291cmNlKSkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXlzID0gS2V5cyhzb3VyY2UpXG5cbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IGtleXNbal1cbiAgICAgICAgICAgIHRhcmdldFtuYW1lXSA9IHNvdXJjZVtuYW1lXVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uIChmbikge1xuXHR2YXIgaXNGdW5jID0gKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyAmJiAhKGZuIGluc3RhbmNlb2YgUmVnRXhwKSkgfHwgdG9TdHJpbmcuY2FsbChmbikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cdGlmICghaXNGdW5jICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0aXNGdW5jID0gZm4gPT09IHdpbmRvdy5zZXRUaW1lb3V0IHx8IGZuID09PSB3aW5kb3cuYWxlcnQgfHwgZm4gPT09IHdpbmRvdy5jb25maXJtIHx8IGZuID09PSB3aW5kb3cucHJvbXB0O1xuXHR9XG5cdHJldHVybiBpc0Z1bmM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZvckVhY2gob2JqLCBmbikge1xuXHRpZiAoIWlzRnVuY3Rpb24oZm4pKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXRlcmF0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cdH1cblx0dmFyIGksIGssXG5cdFx0aXNTdHJpbmcgPSB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJyxcblx0XHRsID0gb2JqLmxlbmd0aCxcblx0XHRjb250ZXh0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcmd1bWVudHNbMl0gOiBudWxsO1xuXHRpZiAobCA9PT0gK2wpIHtcblx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRpZiAoY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdFx0XHRmbihpc1N0cmluZyA/IG9iai5jaGFyQXQoaSkgOiBvYmpbaV0sIGksIG9iaik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmbi5jYWxsKGNvbnRleHQsIGlzU3RyaW5nID8gb2JqLmNoYXJBdChpKSA6IG9ialtpXSwgaSwgb2JqKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Zm9yIChrIGluIG9iaikge1xuXHRcdFx0aWYgKGhhc093bi5jYWxsKG9iaiwgaykpIHtcblx0XHRcdFx0aWYgKGNvbnRleHQgPT09IG51bGwpIHtcblx0XHRcdFx0XHRmbihvYmpba10sIGssIG9iaik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Zm4uY2FsbChjb250ZXh0LCBvYmpba10sIGssIG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmtleXMgfHwgcmVxdWlyZSgnLi9zaGltJyk7XG5cbiIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcblx0dmFyIHN0ciA9IHRvU3RyaW5nLmNhbGwodmFsdWUpO1xuXHR2YXIgaXNBcmd1bWVudHMgPSBzdHIgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuXHRpZiAoIWlzQXJndW1lbnRzKSB7XG5cdFx0aXNBcmd1bWVudHMgPSBzdHIgIT09ICdbb2JqZWN0IEFycmF5XSdcblx0XHRcdCYmIHZhbHVlICE9PSBudWxsXG5cdFx0XHQmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnXG5cdFx0XHQmJiB0eXBlb2YgdmFsdWUubGVuZ3RoID09PSAnbnVtYmVyJ1xuXHRcdFx0JiYgdmFsdWUubGVuZ3RoID49IDBcblx0XHRcdCYmIHRvU3RyaW5nLmNhbGwodmFsdWUuY2FsbGVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblx0fVxuXHRyZXR1cm4gaXNBcmd1bWVudHM7XG59O1xuXG4iLCIoZnVuY3Rpb24gKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHQvLyBtb2RpZmllZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvZXM1LXNoaW1cblx0dmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG5cdFx0dG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuXHRcdGZvckVhY2ggPSByZXF1aXJlKCcuL2ZvcmVhY2gnKSxcblx0XHRpc0FyZ3MgPSByZXF1aXJlKCcuL2lzQXJndW1lbnRzJyksXG5cdFx0aGFzRG9udEVudW1CdWcgPSAhKHsndG9TdHJpbmcnOiBudWxsfSkucHJvcGVydHlJc0VudW1lcmFibGUoJ3RvU3RyaW5nJyksXG5cdFx0aGFzUHJvdG9FbnVtQnVnID0gKGZ1bmN0aW9uICgpIHt9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgncHJvdG90eXBlJyksXG5cdFx0ZG9udEVudW1zID0gW1xuXHRcdFx0XCJ0b1N0cmluZ1wiLFxuXHRcdFx0XCJ0b0xvY2FsZVN0cmluZ1wiLFxuXHRcdFx0XCJ2YWx1ZU9mXCIsXG5cdFx0XHRcImhhc093blByb3BlcnR5XCIsXG5cdFx0XHRcImlzUHJvdG90eXBlT2ZcIixcblx0XHRcdFwicHJvcGVydHlJc0VudW1lcmFibGVcIixcblx0XHRcdFwiY29uc3RydWN0b3JcIlxuXHRcdF0sXG5cdFx0a2V5c1NoaW07XG5cblx0a2V5c1NoaW0gPSBmdW5jdGlvbiBrZXlzKG9iamVjdCkge1xuXHRcdHZhciBpc09iamVjdCA9IG9iamVjdCAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0Jyxcblx0XHRcdGlzRnVuY3Rpb24gPSB0b1N0cmluZy5jYWxsKG9iamVjdCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG5cdFx0XHRpc0FyZ3VtZW50cyA9IGlzQXJncyhvYmplY3QpLFxuXHRcdFx0dGhlS2V5cyA9IFtdO1xuXG5cdFx0aWYgKCFpc09iamVjdCAmJiAhaXNGdW5jdGlvbiAmJiAhaXNBcmd1bWVudHMpIHtcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3Qua2V5cyBjYWxsZWQgb24gYSBub24tb2JqZWN0XCIpO1xuXHRcdH1cblxuXHRcdGlmIChpc0FyZ3VtZW50cykge1xuXHRcdFx0Zm9yRWFjaChvYmplY3QsIGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0XHR0aGVLZXlzLnB1c2godmFsdWUpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBuYW1lLFxuXHRcdFx0XHRza2lwUHJvdG8gPSBoYXNQcm90b0VudW1CdWcgJiYgaXNGdW5jdGlvbjtcblxuXHRcdFx0Zm9yIChuYW1lIGluIG9iamVjdCkge1xuXHRcdFx0XHRpZiAoIShza2lwUHJvdG8gJiYgbmFtZSA9PT0gJ3Byb3RvdHlwZScpICYmIGhhcy5jYWxsKG9iamVjdCwgbmFtZSkpIHtcblx0XHRcdFx0XHR0aGVLZXlzLnB1c2gobmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoaGFzRG9udEVudW1CdWcpIHtcblx0XHRcdHZhciBjdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yLFxuXHRcdFx0XHRza2lwQ29uc3RydWN0b3IgPSBjdG9yICYmIGN0b3IucHJvdG90eXBlID09PSBvYmplY3Q7XG5cblx0XHRcdGZvckVhY2goZG9udEVudW1zLCBmdW5jdGlvbiAoZG9udEVudW0pIHtcblx0XHRcdFx0aWYgKCEoc2tpcENvbnN0cnVjdG9yICYmIGRvbnRFbnVtID09PSAnY29uc3RydWN0b3InKSAmJiBoYXMuY2FsbChvYmplY3QsIGRvbnRFbnVtKSkge1xuXHRcdFx0XHRcdHRoZUtleXMucHVzaChkb250RW51bSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhlS2V5cztcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGtleXNTaGltO1xufSgpKTtcblxuIl19
;