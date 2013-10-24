(function(BrowserSwarm) {

	BrowserSwarm.controller('DashboardCtrl', ['$scope', '$location', 'Strider', DashboardCtrl]);

	function DashboardCtrl($scope, $location, Strider) {

		Strider.Session.get(function(user) {
			if (! user.user) $location.path('/login');
			else authenticated();
		});

		function authenticated() {
			Strider.Jobs.query(gotAllJobs);

			function gotAllJobs(allJobs) {
				console.log('all jobs', allJobs);
			}
		}

  }

})(

  window.BrowserSwarm
);