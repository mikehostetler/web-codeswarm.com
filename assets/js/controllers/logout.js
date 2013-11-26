var App = require('../app');

App.controller('LogoutCtrl', ['$scope', '$rootScope', '$location', 'Strider', LogoutCtrl]);

function LogoutCtrl($scope, $rootScope, $location, Strider) {

  Strider.del('/api/session', function() {
    $rootScope.$emit('logout');
    $location.path('/');
  });

}