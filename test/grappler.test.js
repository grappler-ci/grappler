/**
 * Module dependencies
 */

var should = require('should');
var grappler = require('..');
var request = require('supertest');

describe('grappler', function() {
  it('should work', function(done) {
    var app = grappler();

    app.hook('github', '/github', function(task, log, fn) {
      var dir = task.dir;
      var body = task.body;
      var repo = body.repo;
      var branch = body.branch;
      var sha = body.sha;
      var event = body.event;
      log('cloning ' + repo + '#' + branch + ' at ' + sha + ' to ' + dir);
      fn(null, repo, branch, sha, event);
    });

    app.deploy('heroku', function(task, log, fn) {
      var branch = task.branch;
      if (branch === 'master') branch = 'build';
      var app = 'gl-' + task.repo.replace(/-/g, '') + '-' + branch.replace(/-/g, '');
      log('deploying ' + task.repo + ' from ' + task.dir + ' to ' + app);
      fn(null);
    });

    app.logger(function(namespace, level, str, task) {
      var repo = task.repo;
      var branch = task.branch;
      console.log(namespace + ':' + level, repo + '#' + branch, str);
    });

    request(app)
      .post('/github')
      .send({repo: 'my-app', branch: 'master', sha: '12091723'})
      .expect(200, done);
  });
});
