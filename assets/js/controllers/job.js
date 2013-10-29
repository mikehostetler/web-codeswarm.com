var App = require('../app');

App.controller('JobCtrl', ['$scope', '$routeParams', 'Strider', JobCtrl]);

function JobCtrl($scope, $routeParams, Strider) {

  Strider.connect($scope);
  Strider.job($routeParams.jobid, function(job) {
    console.log('JOB:', job);
    $scope.job = job;

  });

  $scope.deploy = function deploy(job) {

  }
}