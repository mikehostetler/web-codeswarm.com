var App =
exports =
module.exports =
angular.module('BrowserSwarmApp', ['ngRoute', 'ngResource', 'ngSanitize']);

var Strider = require('./strider');

/// App Configuration

App.
  config(['$routeProvider', '$locationProvider', '$httpProvider', configureApp]).
  factory('Strider', ['$resource', Strider]);


require('./filters/ansi');

function configureApp($routeProvider, $locationProvider, $httpProvider) {

  /// HTTP

  /// Always do HTTP requests with credentials,
  /// effectively sending out the session cookie
  $httpProvider.defaults.withCredentials = true;

  var interceptor = ['$rootScope', '$q', function($scope, $q) {

    function success(response) {
      return response;
    }

    function error(response) {
      var status = response.status;

      var resp = response.data;
      if (resp) try { resp = JSON.parse(resp); } catch(err) { }

      if (resp.message) resp = resp.message;
      if (! resp) {
        resp = 'Error in response';
        if (status) resp += ' (' + status + ')';
      }

      $scope.$emit('error', new Error(resp));

      return $q.reject(response);
    }

    return function (promise) {
      return promise.then(success, error);
    }

  }];

  $httpProvider.responseInterceptors.push(interceptor);


  /// Enable hashbang-less routes

  $locationProvider.html5Mode(true);

  /// Routes

  $routeProvider.
    when('/dashboard', {
      templateUrl: '/partials/dashboard.html',
      controller: 'DashboardCtrl'
    }).
    when('/login', {
      templateUrl: '/partials/login.html',
      controller: 'LoginCtrl'
    }).
    when('/:owner/:repo/config', {
      templateUrl: '/partials/config/index.html',
      controller: 'ConfigCtrl',
      reloadOnSearch: false
    }).
    when('/:owner/:repo/job/:jobid', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    });

}

/// Dynamic Controllers

App.directive('dynamicController', function($compile, $controller) {
  return {
    restrict: 'A',
    terminal: true,
    link: function(scope, elm, attrs) {
      var lastScope;
      scope.$watch(attrs.dynamicController, function(ctrlName) {
        if (lastScope) lastScope.$destroy();
        var newScope = scope.$new();

        var ctrl;

        try {
          ctrl = $controller(ctrlName, {$scope: newScope});
        } catch (err) {
          return;
        }

        elm.contents().data('$ngControllerController', ctrl);
        $compile(elm.contents())(newScope);

        lastScope = newScope;
      });
    }
  }
})


// Simple log function to keep the example simple
function log () {
  if (typeof console !== 'undefined') {
    console.log.apply(console, arguments);
  }
}