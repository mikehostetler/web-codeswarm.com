var App = require('../app');

App.directive('dynamicController', dynamicController);

function dynamicController($compile, $controller) {
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
});