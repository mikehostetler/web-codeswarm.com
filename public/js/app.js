var App =
exports =
module.exports =
angular.module('BrowserSwarmApp', ['ngRoute', 'ngSanitize']);

/// App Config

var strider = $('meta[name=strider]').attr('content')
App.value('strider.url', strider);

/// App Configuration

var Strider = require('./strider');

App.
  config(['$routeProvider', '$locationProvider', '$httpProvider', configureApp]).
  factory('Strider', ['strider.url', '$http', Strider]);

function configureApp($routeProvider, $locationProvider, $httpProvider) {

  /// HTTP

  /// Always do HTTP requests with credentials,
  /// effectively sending out the session cookie
  $httpProvider.defaults.withCredentials = true;

  var interceptor = require('./http_interceptor');

  $httpProvider.responseInterceptors.push(interceptor);


  /// Enable hashbang-less routes

  $locationProvider.html5Mode(true);


  /// Routes

  var reload = {
    controller: 'ReloadCtrl',
    template: '<div>Please wait, redirecting</div>'
  };

  $routeProvider.
    when('/', {
      templateUrl: '/partials/index.html'
    }).
    when('/dashboard', {
      templateUrl: '/partials/dashboard/index.html',
      controller: 'DashboardCtrl',
      reloadOnSearch: false
    }).
    when('/projects', {
      templateUrl: '/partials/projects/index.html',
      controller: 'ProjectsCtrl',
      reloadOnSearch: false
    }).
    when('/login', {
      templateUrl: '/partials/login.html',
      controller: 'LoginCtrl'
    }).
    when('/logout', {
      templateUrl: '/partials/logout.html',
      controller: 'LogoutCtrl'
    }).
    when('/account', {
      templateUrl: '/partials/account.html',
      controller: 'AccountCtrl',
      reloadOnSearch: false
    }).

    when('/auth/github', reload).

    when('/:owner/:repo/config', {
      templateUrl: '/partials/config/index.html',
      controller: 'ConfigCtrl',
      reloadOnSearch: false
    }).
    when('/:owner/:repo', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    }).
    when('/:owner/:repo/job/:jobid', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    }).
    otherwise({
      templateUrl: '/partials/404.html'
    })
  ;

}

