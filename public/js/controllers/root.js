var App = require('../app');

App.controller('RootCtrl', ['$scope', '$rootScope', '$location', 'Strider', RootCrtl]);

function RootCrtl($scope, $rootScope, $location, Strider) {

  function getUser() {
    Strider.get('/api/session', function(session) {
      if (session.user) {
        $scope.currentUser = session.user;
        $scope.accounts = session.user.accounts;
      } else {
       $rootScope.$broadcast('nouser');
      }
    });
  }

  $scope.getUser = function() {
    if (! $scope.currentUser) getUser();
  };

  $rootScope.$on('logout', function() {
    $scope.currentUser = undefined;
  });

  $rootScope.$on('login', getUser);

  getUser();
}