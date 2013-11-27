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
        $scope.success('Test started for ' + repo.project.name + '. <a href="/' + repo.project.name + '" target="_blank">Click to watch it run</a>');
      }
    };
  });

}