var App = require('../../app');

App.controller('Config.CollaboratorsCtrl', ['$scope', 'Strider', CollaboratorsCtrl]);

function CollaboratorsCtrl($scope, Strider) {
  $scope.new_email = '';
  $scope.new_access = 0;
  $scope.collaborators = window.collaborators || [];

  $scope.remove = function (item) {
    item.loading = true;
    $scope.clearMessage();
    Strider.del(
      '/' + $scope.project.name + '/collaborators/',
      {email: item.email},
      success);

    function success() {
      remove($scope.collaborators, item);
      $scope.success(item.email + " is no longer a collaborator on this project.");
    }
  };

  $scope.add = function () {
    var data = {
      email: $scope.new_email,
      access: $scope.new_access || 0,
      gravatar: $scope.gravatar($scope.new_email),
      owner: false
    };

    Strider.post(
      '/' + $scope.project.name + '/collaborators/',
      data,
      success);


    function success(res) {
      $scope.new_access = 0;
      $scope.new_email = '';
      if (res.created) {
        $scope.collaborators.push(data);
      }
      $scope.success(res.message);
    }
  };
}

function remove(ar, item) {
  ar.splice(ar.indexOf(item), 1);
}
