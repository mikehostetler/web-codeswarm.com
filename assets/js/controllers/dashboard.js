var App = require('../app');

App.controller('DashboardCtrl', ['$scope', '$location', 'Strider', DashboardCtrl]);

function DashboardCtrl($scope, $location, Strider) {

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