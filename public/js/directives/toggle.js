var App = require('../app');

App.directive("toggle", function() {
  return {
    restrict: "A",
    link: function(scope, element, attrs) {
      if (attrs.toggle !== 'tooltip') return;
      setTimeout(function() {
        $(element).tooltip();
      }, 0);
      attrs.$observe('title', function () {
        $(element).tooltip();
      });
      scope.$on('$destroy', function () {
        $('.tooltip').hide();
        $(element).tooltip('hide');
      });
    }
  };
});