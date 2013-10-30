var App = require('../app');

App.controller('JobCtrl', ['$scope', '$routeParams', 'Strider', JobCtrl]);

function JobCtrl($scope, $routeParams, Strider) {

  $scope.phases = Strider.phases;

  var projectSearchOptions = {
    owner: $routeParams.owner,
    repo:  $routeParams.repo
  };

  Strider.Project.get(projectSearchOptions, function(project) {
    $scope.repo = project;
  });

  Strider.connect($scope);
  Strider.job($routeParams.jobid, function(job) {
    $scope.job = job;
  });

  Strider.ProjectJobs.query(projectSearchOptions, function(jobs) {
    $scope.jobs = jobs;
  });

  $scope.deploy = function deploy(job) {
    Strider.deploy(job.project);
  };

  $scope.test = function test(job) {
    Strider.test(job.project);
  };

}