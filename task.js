/**
 * Module dependencies
 */

var tmpdir = require('os').tmpdir();
var join = require('path').join;
var mktmp = require('mktemp').createDir.bind(null, join(tmpdir, 'grappler-' + process.pid + '-XXXXXX'));
var rimraf = require('rimraf');
var Emitter = require('component-emitter');

/**
 * Expose the task
 */

module.exports = Task;

/**
 * A deployment task
 *
 * @param {Request} req
 * @param {Function} log
 */

function Task(info, log) {
  this.info = info;
  this.createLogger = log(this);
  this.log = this.createLogger('task');
  this.pending = 0;
  this.stack = [];
  var self = this;
  this.on('complete', function() {
    self.cleanup();
  });
}
Emitter(Task.prototype);

/**
 * Clone the repository into a tmp dir with a handler plugin
 *
 * @param {Function} handler
 * @param {Function} cb
 */

Task.prototype.clone = function(name, handler) {
  var self = this;

  mktmp(function(err, path) {
    if (err) return done(err);

    self.dir = path;
    handler(path, self.createLogger(name), done);
  });

  function done(err) {
    if (err) return self.emit('error', err);
  }
  return this;
};

Task.prototype.ready = function() {
  var self = this;
  run(self, 0, function(err) {
    if (err === 'pass') return self.emit('complete');
    if (err) return self.emit('error', err);
    self.emit('ready');
  });
  return this;
};

Task.prototype.use = function(fn) {
  this.stack.push(fn);
  return this;
};

/**
 * Deploy the app
 *
 * @param {Function} name
 * @param {Function} fn
 */

Task.prototype.deploy = function(name, fn) {
  var self = this;
  self.pending++;
  fn(self, self.createLogger(name), function(err) {
    self.pending--;
    if (err) self.emit('error', err, name);
    else self.emit('deployed', name);

    if (self.pending) return;
    self.emit('complete');
  });
  return this;
};

Task.prototype.test = function(name, fn) {
  var self = this;
  self.testing++;
  fn(self, self.createLogger(name), function(err) {
    self.testing--;
    if (err) self.emit('error', err, name);
    else self.emit('passed', name);

    if (self.testing) return;
    self.emit('success');
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
    if (err) self.log('error', err.stack);
  });
  return this;
};

function run(task, i, done) {
  var fn = task.stack[i];
  if (!fn) return done();
  try {
    fn(task, function(err) {
      if (err) return done(err);
      run(task, i + 1, done);
    });
  } catch (err) {
    done(err);
  };
}
