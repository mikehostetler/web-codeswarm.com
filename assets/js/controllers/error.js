var App = require('../app');

App.controller('ErrorCtrl', ['$scope', '$rootScope', '$location', '$sce', ErrorCtrl]);

function ErrorCtrl($scope, $rootScope, $location, $sce) {
  $scope.error = {};

  var last;

  $rootScope.$on('error', function(ev, err) {
    last = Date.now();
    $scope.error.message = $sce.trustAsHtml(err.message || err);
  });

  $rootScope.$on('$routeChangeStart', function() {
    if (last && Date.now() - last >  1000) {
      $scope.error.message = '';
    }
  });

  var flash = $location.search().flash;
  if (flash) {
    try {
      flash = JSON.parse(flash);
    } catch(err) {
      // do nothing
    }

    Object.keys(flash).forEach(function(k) {
      $rootScope.$emit('error', flash[k][0]);
    });
  }
}