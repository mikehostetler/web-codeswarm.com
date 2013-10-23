(function(BrowserSwarm) {

	BrowserSwarm.controller('DashboardCtrl', ['$scope', 'Strider', DashboardCtrl]);

	function DashboardCtrl($scope, Strider) {
		Strider.connect($scope, function(server) {

		});
  }

})(

  window.BrowserSwarm
);