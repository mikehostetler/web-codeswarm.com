(function(global, io) {

  function BuildStrider($resource) {
    return new Strider($resource);
  }

  function Strider($resource, opts) {
    if (! opts) opts = {};
    if (typeof opts == 'string')
      opts = { url: opts };

    this.url = opts.url || '//localhost:3000';

    /// Restful API setup
    var apiBase = this.url + '/api';
    var loginURL = this.url + '/login';
    this.Jobs =    $resource(apiBase + '/jobs');
    this.Session = $resource(apiBase + '/session');
    // this.Session = $resource(apiBase + '/session', {}, {
    //  get: {
    //    method: 'GET',
    //    withCredentials: true,
    //    url: apiBase + '/session'
    //  }
    // });
    // ,  {
    //  login: {
    //    method: 'POST',
    //    url: loginURL
    //  }
    // });

    console.log('Session:', this.Session);
  }

  var S = Strider.prototype;

  S.connect = function connect($scope, cb) {

    var self = this;
    var socket = io.connect(this.url);
    socket.on('connect', function() {
      cb(socket);
    });
  };

  global.Strider = BuildStrider;

})( window, window.io );
