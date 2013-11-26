var App = require('../app');

App.controller('LoginCtrl', ['$scope', '$location', '$rootScope', 'Strider', LoginCtrl]);

function LoginCtrl($scope, $location, $rootScope, Strider) {

  $scope.user = {email: undefined, password: undefined};

  $scope.login = function login() {
    Strider.post('/api/session', $scope.user, function() {
      $rootScope.$emit('login');
      $location.path('/dashboard');
    });
  };
}