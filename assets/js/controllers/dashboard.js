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

    console.log('setting strider jobs to', $scope.jobs);
    Strider.jobs = $scope.jobs;
    Strider.connect($scope);
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