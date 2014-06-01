/**
 * Module dependencies
 */

var stack = require('simple-stack-common');
var Log = require('./log');
var Task = require('./task');

/**
 * Expose the grappler system
 */

exports = module.exports = function(opts) {
  var app = stack(opts);

  var log = Log();

  app.createTask = function(info) {
    var task = new Task(info, log);
    app.emit('task', task);
    return task;
  };

  app.hook = function(name, path, handle) {
    app.post(path, function(req, res, next) {
      handle(req, log(null)(name), function(err, info, event) {
        if (err === 'pass') return res.send(200);
        if (err) return next(err);
        res.send(200);
        var task = app.createTask(info);
        event ? task.emit(event) : task.ready();
      });
    });
    return app;
  };

  app.deploy = function(name, fn) {
    app.on('task', function(task) {
      task.on('ready', function() {
        task.deploy(name, fn);
      });
    });
    return app;
  };

  app.test = function(name, fn) {
    app.on('task', function(task) {
      task.on('complete', function() {
        task.test(name, fn);
      });
    });
  };

  app.logger = function(fn) {
    log.push(fn);
    return app;
  };

  app.plugin = function(fn) {
    return fn(app);
  };

  return app;
};
