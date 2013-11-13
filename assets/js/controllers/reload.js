var App = require('../app');

App.controller('ReloadCtrl', ['$location', function($location) {
  console.log('redirecting...');
  window.location = $location.path();
}]);