(function(global, io) {

	console.log('Strider');
	function BuildStrider(opts) {
		return new Strider(opts);
	}

	function Strider(opts) {
		console.log('Strider 2', this);
		if (! opts) opts = {};
		if (typeof opts == 'string')
			opts = { url: opts };

		this.url = opts.url || '//localhost:3000';
	}

	var S = Strider.prototype;

	S.connect = function connect($scope, cb) {
		var socket = io.connect(this.url);
		socket.on('connect', function() {
			cb(socket);
		});
	};

	global.Strider = BuildStrider;

})( window, window.io );
