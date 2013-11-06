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