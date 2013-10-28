(function(BrowserSwarm) {

  BrowserSwarm.controller('DashboardCtrl', ['$scope', '$location', 'Strider', DashboardCtrl]);

  function DashboardCtrl($scope, $location, Strider) {

    Strider.Session.get(function(user) {
      if (! user.user) $location.path('/login');
      else authenticated();
    });

    function authenticated() {
      Strider.Jobs.get(gotAllJobs);

      function gotAllJobs(allJobs) {
        $scope.jobs = allJobs.yours;
        console.log($scope.jobs);
      }
    }

  }

})(

  window.BrowserSwarm
);