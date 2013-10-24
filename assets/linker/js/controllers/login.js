(function(BrowserSwarm) {

  BrowserSwarm.controller('LoginCtrl', ['$scope', '$location', 'Strider', LoginCtrl]);

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

})(

  window.BrowserSwarm
);