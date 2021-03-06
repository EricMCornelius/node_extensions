var mkdirp = require('mkdirp');
var clone = require('clone');

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var proc = require('child_process');
var util = require('util');
var assert = require('assert');

require('./object.js');

util.clone = clone;

// extends util with isFunction
util.isFunction = function(arg) {
  return typeof(arg) == 'function';
};

// extends util with exists
util.exists = function(obj) {
  return (obj !== undefined && obj !== null);
}

// extends util with zip
util.zip = function(arr) {
  var args = [].slice.call(arguments);
  return args[0].map(function(_, i) {
    return args.map(function(arr) {
      return arr[i];
    });
  });
}

util.__nextid = 0;
util.__pending = {};

// extends util with method to force single callback execution
util.force = function(cb, msg) {
  var id = ++util.__nextid;
  var wrapped = function() {
    delete util.__pending[id];
    return cb.apply(null, arguments);
  };
  util.__pending[id] = (msg ? msg + ' - ' : '') + 'initialized at ' + __marker;
  return wrapped;
}

process.on('exit', function() {
  assert(Object.keys(util.__pending).length === 0, 
        'Unexecuted callbacks: ' + Object.values(util.__pending).reduce(function(prev, curr) { return prev + '\n' + curr.toString(); }, ''));
})

// pretty-printed json dump
util.dump = function(obj) {
  return JSON.stringify(obj, null, 2);
}

// serializes object to file
util.cache = function(file, obj, cb) {
  mkdirp.sync(path.dirname(file));
  if (util.exists(cb))
    fs.writeFile(file, util.dump(obj), cb);
  else
    fs.writeFileSync(file, util.dump(obj));
}

// retrieves object from file
util.retrieve = function(file, cb) {
  if (util.exists(cb)) {
    fs.readFile(file, function(err, data) {
      if (err)
        return cb(err);
      cb(null, JSON.parse(data));
    });
  }
  else 
    return JSON.parse(fs.readFileSync(file));
}

// writes string to file
util.write = function(file, str, cb) {
  mkdirp.sync(path.dirname(file));
  if (util.exists(cb))
    fs.writeFile(file, str, cb);
  else
    fs.writeFileSync(file, str);
}

// hashes the contents of a file
util.hash = function(file, cb) {
  var h = crypto.createHash('sha1');
  var s = fs.ReadStream(file);
  s.on('data', function(d) {
    h.update(d);
  });

  s.on('end', function() {
    cb(null, h.digest('hex'));
  });

  s.on('error', function(err) {
    cb('Failed hashing file: ' + file);
  });
};

util.replace = function(str, replacements) {
  for (key in replacements)
    str = str.replace(key, replacements[key]);
  return str;
}

util.launch = function(args, cb) {
  args.opts = args.opts || {};
  var root = args.opts.cwd || __dirname;

  var invocation = {
    cmd: [args.cmd].concat(args.args).join(' '),
    cwd: root,
    stdout: '',
    stderr: '',
    exit_code: 0
  };

  proc.exec(invocation.cmd, args.opts, function(error, stdout, stderr) {
    invocation.exit_code = error;
    invocation.stdout = stdout;
    invocation.stderr = stderr;
    cb(error, invocation);
  });
};

util.message = function(msg) {
  return function(cb) {
    console.log(msg);
    cb();
  }
}

util.public = function(args, module) {
  args.forEach(function(arg) {
    if (util.isFunction(arg))
      module.exports[arg.name] = arg;
    else {
      for (key in arg) 
        module.exports[key] = arg[key];
    }
  });
}

util.invalidate_module = function(module_path) {
  delete require.cache[module_path];
}

/*
// example of event execution when the libuv queue drained
function drained() {
  var handles = process._getActiveHandles();
  var requests = process._getActiveRequests();
  if (handles.length === 1 && handles[0] === this)
    process.exit();
  }
};

setInterval(drained, 100);
*/
