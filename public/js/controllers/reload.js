var App = require('../app');

App.controller('ReloadCtrl', ['$location', function($location) {
  window.location = $location.path();
}]);