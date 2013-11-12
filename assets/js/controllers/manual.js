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