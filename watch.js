#!/usr/bin/env node

require('colors');
var fs    = require('fs');
var spawn = require('child_process').spawn;
var gaze  = require('gaze');

//process.chdir('..');

var executing = false;
var pending = false;

var watch = [
  'public/js/app.js',
  'public/js/strider.js',
  'public/js/controllers/**/*.js',
  'public/js/filters/**/*.js',
  'public/js/directives/**/*.js',
];

gaze(watch, watcher);

function watcher(err, watcher) {
  this.on('all', changed);
  console.log('watching'.green);
}

function changed(event, filepath) {
  console.log('[%s] %s'.yellow, event, filepath);
  run();
}

function run() {
  if (executing) {
    pending = true;
    return;
  }
  executing = true;
  var args = ['public/js/app.js'];

  /// add controllers
  args = args.concat(
    fs.readdirSync(__dirname + '/public/js/controllers').
    map(prefix(__dirname + '/public/js/controllers/')).
    concat(
      fs.readdirSync(__dirname + '/public/js/controllers/config').
      map(prefix(__dirname + '/public/js/controllers/config/'))).
    filter(isJavascript));

  /// add filters
  args = args.concat(
    fs.readdirSync(__dirname + '/public/js/filters').
    filter(isJavascript).
    map(prefix(__dirname + '/public/js/filters/')));

  /// finalize args
  args = args.concat(['-o', 'public/js/browserswarm.js']);
  console.log('browserify %s'.yellow, args.join(' '));
  var child = spawn(__dirname + '/node_modules/.bin/browserify', args, {stdio: 'inherit'});
  child.once('exit', exited);
}

function exited(code, signal) {
  executing = false;
  if (! code) console.log('terminated'.green);
  else console.error('finished with exit code %d'.red, code);
  if (pending) run();
  pending = false;
}

run();

function isJavascript(file) {
  return file.indexOf('.js') != -1;
}

function prefix(prefix) {
  return function(s) {
    return prefix + s;
  };
}