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