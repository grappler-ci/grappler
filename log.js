module.exports = function() {
  var loggers = [];

  function log(task) {
    return function(namespace) {
      return function(level, str) {
        if (!str) {
          str = level;
          level = 'info';
        }

        loggers.forEach(function(logger) {
          logger(namespace, level, str, task);
        });
      };
    };
  }

  log.push = function(logger) {
    loggers.push(logger);
  };

  return log;
};
