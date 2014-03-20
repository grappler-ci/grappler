/**
 * Module dependencies
 */

var stack = require('simple-stack-common');
var tmpdir = require('os').tmpdir();
var join = require('path').join;
var mktmp = require('mktemp').createDir.bind(null, join(tmpdir, 'grappler-' + process.pid + '-XXXXXX'));
var rimraf = require('rimraf');

/**
 * Expose the grappler system
 */

module.exports = function() {
  var app = stack();

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

  app.hook = function(name, path, handle) {
    app.post(path, function(req, res, next) {
      var task = new Task(req, log);

      task.clone(name, handle, function(err) {
        if (err) return next(err);
        res.send(200);
        app.emit('task', task);
      });
    });
    return app;
  };

  app.deploy = function(name, fn) {
    app.on('task', function(task) {
      task.deploy(name, fn);
    });
    return app;
  };

  app.logger = function(fn) {
    loggers.push(fn);
    return app;
  };

  app.plugin = function(fn) {
    return fn(app);
  };

  return app;
};

/**
 * A deployment task
 *
 * @param {Request} req
 * @param {Function} log
 */

function Task(req, log) {
  this.headers = req.headers;
  this.body = req.body;
  this.createLogger = log(this);
  this.log = this.createLogger('task');
  this.pending = 0;
}

/**
 * Clone the repository into a tmp dir with a handler plugin
 *
 * @param {Function} handler
 * @param {Function} cb
 */

Task.prototype.clone = function(name, handler, cb) {
  var self = this;

  mktmp(function(err, path) {
    if (err) return cb(err);

    self.dir = path;
    handler(self, self.createLogger(name), done);
  });

  function done(err, repo, branch, sha, event) {
    if (err) return cleanup(err);

    self.repo = repo;
    self.branch = branch;
    self.sha = sha;
    self.event = event;

    cb(null);
  }

  function cleanup (err) {
    self.cleanup(function() {
      cb(err);
    });
  }
};

/**
 * Deploy the app
 *
 * @param {Function} fn
 */

Task.prototype.deploy = function(name, fn) {
  var self = this;
  self.pending++;
  fn(self, self.createLogger(name), function(err) {
    self.pending--;
    if (err) self.log('error', err.stack);
    self.cleanup();
  });
};

/**
 * Cleanup the cloned repo
 *
 * @param {Function} fn
 */

Task.prototype.cleanup = function(fn) {
  var self = this;
  if (self.pending) return fn();
  self.log('info', 'cleaning up ' + self.dir);
  rimraf(self.dir, function(err) {
    if (err) self.log('err', err.stack);
  });
};
