(function(BrowserSwarm) {

	BrowserSwarm.controller('ErrorCtrl', ['$scope', '$rootScope', ErrorCtrl]);

	function ErrorCtrl($scope, $rootScope) {
		$scope.error = {};

		$rootScope.$on('error', function(ev, err) {
			$scope.error.message = err.message || err;
		});

		$rootScope.$on('$routeChangeStart', function() {
			$scope.error.message = '';
		});
  }

})(

  window.BrowserSwarm
);