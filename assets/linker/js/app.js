
(function (global, io, Strider) {

  console.log('HERE');
  var BrowserSwarmApp = angular.module('BrowserSwarmApp', ['ngRoute']);

  /// Expose BrowserSearm to Controllers
  /// TODO:
  ///   There is a better way to manage dependencies, either by using
  ///   require.js, Browserify or other.
  global.BrowserSwarm = BrowserSwarmApp;


  /// App Configuration

  console.log('Strider:', Strider);
  BrowserSwarmApp.
    config(['$routeProvider', '$locationProvider', configureBrowserSwarmApp]).
    factory('Strider', [Strider]);

  function configureBrowserSwarmApp($routeProvider, $locationProvider) {

    /// Enable hashbang-less routes

    $locationProvider.html5Mode(true);

    /// Routes

    $routeProvider.
      when('/dashboard', {
        templateUrl: '/partials/dashboard.html',
        controller: 'DashboardCtrl'
      });
  }

  return;


  // as soon as this file is loaded, connect automatically,
  var socket = io.connect();
  if (typeof console !== 'undefined') {
    log('Connecting to Sails.js...');
  }

  socket.on('connect', function socketConnected() {

    // Listen for Comet messages from Sails
    socket.on('message', function messageReceived(message) {

      ///////////////////////////////////////////////////////////
      // Replace the following with your own custom logic
      // to run when a new message arrives from the Sails.js
      // server.
      ///////////////////////////////////////////////////////////
      log('New comet message received :: ', message);
      //////////////////////////////////////////////////////

    });


    ///////////////////////////////////////////////////////////
    // Here's where you'll want to add any custom logic for
    // when the browser establishes its socket connection to
    // the Sails.js server.
    ///////////////////////////////////////////////////////////
    log(
        'Socket is now connected and globally accessible as `socket`.\n' +
        'e.g. to send a GET request to Sails, try \n' +
        '`socket.get("/", function (response) ' +
        '{ console.log(response); })`'
    );
    ///////////////////////////////////////////////////////////


  });


  // Expose connected `socket` instance globally so that it's easy
  // to experiment with from the browser console while prototyping.
  window.socket = socket;


  // Simple log function to keep the example simple
  function log () {
    if (typeof console !== 'undefined') {
      console.log.apply(console, arguments);
    }
  }


})(

  window,
  // In case you're wrapping socket.io to prevent pollution of the global namespace,
  // you can replace `window.io` with your own `io` here:
  window.io,
  window.Strider

);
