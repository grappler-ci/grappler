grappler
========

Pluggable deploy system

Usage
-----

```js
var grappler = require('grappler');

var app = grappler();

app.hook('github', '/github', function(task, log, fn) {
  // extract webhook info from `task.body` and clone the repo to `task.dir`

  // pass back the extracted info
  fn(err, repoName, branch, sha, event);
});

app.deploy('heroku', function(task, log, fn) {
  // deploy the code in `task.dir`

  // finish the deploy
  fn(err);
});

app.logger(function(namespace, level, str, task) {
  // log messages here
});

// The plugin function can be used to register pre-packaged hooks, deployments, and loggers
var stdout = require('grappler-logger-stdout');
app.plugin(stdout());

var opsworks = require('grappler-deploy-opsworks');
app.plugin(opsworks({
  key: 'key123',
  secret: 'secret456'
}));
```

Tests
-----

```sh
$ npm test
```
