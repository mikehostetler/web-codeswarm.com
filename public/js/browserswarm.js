;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!util.isNumber(n) || n < 0)
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (util.isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (util.isUndefined(handler))
    return false;

  if (util.isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (util.isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              util.isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (util.isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (util.isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!util.isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  function g() {
    this.removeListener(type, g);
    listener.apply(this, arguments);
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (util.isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (util.isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (util.isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (util.isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (util.isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};
},{"util":3}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var shims = require('_shims');

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  shims.forEach(array, function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }

  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = shims.reduce(output, function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return shims.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.binarySlice === 'function'
  ;
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":1}],4:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],5:[function(require,module,exports){
var Keys = require("object-keys")
var hasKeys = require("./has-keys")

module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        if (!hasKeys(source)) {
            continue
        }

        var keys = Keys(source)

        for (var j = 0; j < keys.length; j++) {
            var name = keys[j]
            target[name] = source[name]
        }
    }

    return target
}

},{"./has-keys":4,"object-keys":7}],6:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

var isFunction = function (fn) {
	var isFunc = (typeof fn === 'function' && !(fn instanceof RegExp)) || toString.call(fn) === '[object Function]';
	if (!isFunc && typeof window !== 'undefined') {
		isFunc = fn === window.setTimeout || fn === window.alert || fn === window.confirm || fn === window.prompt;
	}
	return isFunc;
};

module.exports = function forEach(obj, fn) {
	if (!isFunction(fn)) {
		throw new TypeError('iterator must be a function');
	}
	var i, k,
		isString = typeof obj === 'string',
		l = obj.length,
		context = arguments.length > 2 ? arguments[2] : null;
	if (l === +l) {
		for (i = 0; i < l; i++) {
			if (context === null) {
				fn(isString ? obj.charAt(i) : obj[i], i, obj);
			} else {
				fn.call(context, isString ? obj.charAt(i) : obj[i], i, obj);
			}
		}
	} else {
		for (k in obj) {
			if (hasOwn.call(obj, k)) {
				if (context === null) {
					fn(obj[k], k, obj);
				} else {
					fn.call(context, obj[k], k, obj);
				}
			}
		}
	}
};


},{}],7:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":9}],8:[function(require,module,exports){
var toString = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toString.call(value);
	var isArguments = str === '[object Arguments]';
	if (!isArguments) {
		isArguments = str !== '[object Array]'
			&& value !== null
			&& typeof value === 'object'
			&& typeof value.length === 'number'
			&& value.length >= 0
			&& toString.call(value.callee) === '[object Function]';
	}
	return isArguments;
};


},{}],9:[function(require,module,exports){
(function () {
	"use strict";

	// modified from https://github.com/kriskowal/es5-shim
	var has = Object.prototype.hasOwnProperty,
		toString = Object.prototype.toString,
		forEach = require('./foreach'),
		isArgs = require('./isArguments'),
		hasDontEnumBug = !({'toString': null}).propertyIsEnumerable('toString'),
		hasProtoEnumBug = (function () {}).propertyIsEnumerable('prototype'),
		dontEnums = [
			"toString",
			"toLocaleString",
			"valueOf",
			"hasOwnProperty",
			"isPrototypeOf",
			"propertyIsEnumerable",
			"constructor"
		],
		keysShim;

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object',
			isFunction = toString.call(object) === '[object Function]',
			isArguments = isArgs(object),
			theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError("Object.keys called on a non-object");
		}

		if (isArguments) {
			forEach(object, function (value) {
				theKeys.push(value);
			});
		} else {
			var name,
				skipProto = hasProtoEnumBug && isFunction;

			for (name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(name);
				}
			}
		}

		if (hasDontEnumBug) {
			var ctor = object.constructor,
				skipConstructor = ctor && ctor.prototype === object;

			forEach(dontEnums, function (dontEnum) {
				if (!(skipConstructor && dontEnum === 'constructor') && has.call(object, dontEnum)) {
					theKeys.push(dontEnum);
				}
			});
		}
		return theKeys;
	};

	module.exports = keysShim;
}());


},{"./foreach":6,"./isArguments":8}],10:[function(require,module,exports){
var Strider = require('./strider');

var App =
exports =
module.exports =
angular.module('BrowserSwarmApp', ['ngRoute', 'ngSanitize']);

/// App Configuration

App.
  config(['$routeProvider', '$locationProvider', '$httpProvider', configureApp]).
  factory('Strider', ['$http', Strider]);

function configureApp($routeProvider, $locationProvider, $httpProvider) {

  /// HTTP

  /// Always do HTTP requests with credentials,
  /// effectively sending out the session cookie
  $httpProvider.defaults.withCredentials = true;

  var interceptor = require('./http_interceptor');

  $httpProvider.responseInterceptors.push(interceptor);


  /// Enable hashbang-less routes

  $locationProvider.html5Mode(true);


  /// Routes

  var reload = {
    controller: 'ReloadCtrl',
    template: '<div>Please wait, redirecting</div>'
  };

  $routeProvider.
    when('/', {
      templateUrl: '/partials/index.html'
    }).
    when('/dashboard', {
      templateUrl: '/partials/dashboard/index.html',
      controller: 'DashboardCtrl',
      reloadOnSearch: false
    }).
    when('/projects', {
      templateUrl: '/partials/projects/index.html',
      controller: 'ProjectsCtrl',
      reloadOnSearch: false
    }).
    when('/login', {
      templateUrl: '/partials/login.html',
      controller: 'LoginCtrl'
    }).
    when('/logout', {
      templateUrl: '/partials/logout.html',
      controller: 'LogoutCtrl'
    }).
    when('/account', {
      templateUrl: '/partials/account.html',
      controller: 'AccountCtrl',
      reloadOnSearch: false
    }).

    when('/auth/github', reload).

    when('/:owner/:repo/config', {
      templateUrl: '/partials/config/index.html',
      controller: 'ConfigCtrl',
      reloadOnSearch: false
    }).
    when('/:owner/:repo', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    }).
    when('/:owner/:repo/job/:jobid', {
      templateUrl: '/partials/job.html',
      controller: 'JobCtrl'
    })
  ;

}


},{"./http_interceptor":33,"./strider":36}],11:[function(require,module,exports){
var App = require('../app');

App.controller('AccountCtrl', ['$scope', '$sce', '$location', 'Strider', AccountCtrl]);

function AccountCtrl($scope, $sce, $location, Strider) {

  $scope.$on('nouser', function() {
    $location.path('/');
  });
  $scope.getUser();

  Strider.get('/api/account', function(reply) {
    $scope.user = reply.user;
    if (! $scope.user) return;
    $scope.providers = reply.providers;
    $scope.userConfigs = reply.userConfigs;
    $scope.accounts = setupAccounts(reply.user);

    /// Trust some HTML

    Object.keys($scope.providers).forEach(function(key) {
      var provider = $scope.providers[key];
      if (provider.html) provider.html = $sce.trustAsHtml(provider.html);
    });

    Object.keys($scope.userConfigs.job).forEach(function(key) {
      var job = $scope.userConfigs.job[key];
      if (job.html) job.html = $sce.trustAsHtml(job.html);
    });

    $scope.deleteAccount = function (account) {
      if (account.unsaved) {
        var idx = $scope.accounts[account.provider].indexOf(account);
        $scope.accounts[account.provider].splice(idx, 1);
        idx = $scope.user.accounts.indexOf(account);
        $scope.user.accounts.splice(idx, 1);
        $scope.success('Account removed');
        return;
      }

      Strider.del('/api/account/' + account.provider + '/' + account.id, success);

      function success() {
        var idx = $scope.accounts[account.provider].indexOf(account);
        $scope.accounts[account.provider].splice(idx, 1);
        idx = $scope.user.accounts.indexOf(account);
        $scope.user.accounts.splice(idx, 1);
        $scope.success('Account removed');
      }
    };

    $scope.addAccount = function (provider) {
      var id = 0
        , aid;
      if (!$scope.accounts[provider]) {
        $scope.accounts[provider] = [];
      }
      for (var i=0; i<$scope.accounts[provider].length; i++) {
        aid = parseInt($scope.accounts[provider][i].id, 10);
        if (aid >= id) {
          id = aid + 1;
        }
      }
      var acct = {
        id: id,
        provider: provider,
        title: provider + ' ' + id,
        last_updated: new Date(),
        config: {},
        cache: [],
        unsaved: true
      };
      $scope.accounts[provider].push(acct);
      $scope.user.accounts.push(acct);
    };

    $scope.saveAccount = function (provider, account, next) {

      Strider.put(
        '/api/account/' +
          encodeURIComponent(provider) +
          '/' + encodeURIComponent(account.id),
        account,
        success);

      function success() {
        delete account.unsaved;
        next();
        $scope.success('Account saved');
      }
    };

    $scope.changePassword = function () {

      Strider.post('/api/account/password', {password: $scope.password}, success);

      function success() {
        $scope.password = '';
        $scope.confirm_password = '';
        $scope.success('Password changed');
      }
    };

    $scope.changeEmail = function () {

      Strider.post('/api/account/email', {email:$scope.user.email}, success);

      function success() {
        $scope.success('Email successfully changed');
      }
    };
  });
}


function setupAccounts(user) {
  var accounts = {};
  if (!user.accounts || !user.accounts.length) return accounts;
  for (var i=0; i<user.accounts.length; i++) {
    if (!accounts[user.accounts[i].provider]) {
      accounts[user.accounts[i].provider] = [];
    }
    accounts[user.accounts[i].provider].push(user.accounts[i]);
  }
  return accounts;
}


App.controller('Account.ProviderController', ['$scope', ProviderCtrl]);

function ProviderCtrl($scope, $element, $attrs) {

  $scope.init = function(name) {
    $scope.$watch('account.config', function (value) {
      $scope.config = value;
    });

    $scope.save = function () {
      $scope.saving = true;
      $scope.saveAccount(name, $scope.account, function () {
        $scope.saving = false;
      });
    };
  }
}

App.controller('Account.JobController', ['$scope', '$element', '$attrs', JobController]);

function JobController($scope, $element, $attrs) {

  $scope.init = function(name) {
    $scope.$watch('user.jobplugins["' + name + '"]', function (value) {
      $scope.config = value;
    });
  }
}
},{"../app":10}],12:[function(require,module,exports){

var app = require('../app');

app.controller('AlertsCtrl', ['$scope', '$sce', AlertsCtrl]);

function AlertsCtrl($scope, $sce) {
  $scope.message = null;

  $scope.error = function (text, digest) {
    $scope.message = {
      text: $sce.trustAsHtml(text),
      type: 'error',
      showing: true
    };
    if (digest) $scope.$root.$digest();
  };

  $scope.info = function (text, digest) {
    $scope.message = {
      text: $sce.trustAsHtml(text),
      type: 'info',
      showing: true
    };
    if (digest) $scope.$root.$digest();
  };
  var waitTime = null;

  $scope.success = function (text, digest, sticky) {
    if (waitTime) {
      clearTimeout(waitTime);
      waitTime = null;
    }
    if (clearTime) {
      clearTimeout(clearTime);
      clearTime = null;
    }
    $scope.message = {
      text: $sce.trustAsHtml('<strong>Done.</strong> ' + text),
      type: 'success',
      showing: true
    };
    if (!sticky) {
      waitTime = setTimeout(function () {
        $scope.clearMessage();
        $scope.$digest();
      }, 5000);
    }
    if (digest) $scope.$root.$digest();
  };
  var clearTime = null;

  $scope.clearMessage = function () {
    if (clearTime) {
      clearTimeout(clearTime);
    }
    if ($scope.message) {
      $scope.message.showing = false;
    }
    clearTime = setTimeout(function () {
      clearTime = null;
      $scope.message = null;
      $scope.$digest();
    }, 1000);
  };
}
},{"../app":10}],13:[function(require,module,exports){
var md5         = require('../lib/md5');
var App         = require('../app');
var fixTemplate = require('./config/_fix_template');
var e           = encodeURIComponent;

App.controller('ConfigCtrl', ['$scope', '$routeParams', '$sce', '$location', 'Strider', ConfigCtrl]);


function ConfigCtrl($scope, $routeParams, $sce, $location, Strider) {

  var options = {
    owner: $routeParams.owner,
    repo: $routeParams.repo
  };

  Strider.get(
    '/api/' + e(options.owner) + '/' + e(options.repo) + '/config' ,
    gotConfig);

  function gotConfig(conf) {

    /// Fix and trust remote HTML

    Object.keys(conf.plugins).forEach(function(key) {
      conf.plugins[key].html = $sce.trustAsHtml(
        fixTemplate(conf.plugins[key].html));
    });

    Object.keys(conf.runners).forEach(function(key) {
      conf.runners[key].html = $sce.trustAsHtml(
        fixTemplate(conf.runners[key].html));
    });

    if (conf.provider) {
      conf.provider.html = $sce.trustAsHtml(
        fixTemplate(conf.provider.html));
    }

    /// Get all the conf into the scope for rendering

    $scope.project = conf.project;
    $scope.provider = conf.provider;
    $scope.plugins = conf.plugins;
    $scope.runners = conf.runners;
    $scope.branches = conf.branches || [];
    $scope.statusBlocks = conf.statusBlocks;
    $scope.collaborators = conf.collaborators;
    $scope.userIsCreator = conf.userIsCreator;
    $scope.userConfigs = conf.userConfigs;
    $scope.configured = {};

    $scope.branch = $scope.project.branches[0];
    $scope.disabled_plugins = {};
    $scope.configs = {};
    $scope.runnerConfigs = {};

    $scope.api_root = '/' + $scope.project.name + '/api/';

    $scope.refreshBranches = function () {
      // TODO implement
      throw Error('Not implemented');
    };

    $scope.setEnabled = function (plugin, enabled) {
      $scope.configs[$scope.branch.name][plugin].enabled = enabled;
      savePluginOrder();
    };

    $scope.savePluginOrder = savePluginOrder;

    $scope.switchToMaster = function () {
      for (var i=0; i<$scope.project.branches.length; i++) {
        if ($scope.project.branches[i].name === 'master') {
          $scope.branch = $scope.project.branches[i];
          return;
        }
      }
    };

    $scope.clearCache = function () {
      $scope.clearingCache = true;
      Strider.del(
        '/' + e(options.owner) + '/' + e(options.repo) + '/cache',
        options,
        success);

      function success() {
        $scope.clearingCache = false;
        $scope.success('Cleared the cache');
      }
    }

    $scope.toggleBranch = function () {
      if ($scope.branch.mirror_master) {
        $scope.branch.mirror_master = false;
        var name = $scope.branch.name
          , master;
        for (var i=0; i<$scope.project.branches.length; i++) {
          if ($scope.project.branches[i].name === 'master') {
            master = $scope.project.branches[i];
            break;
          }
        }
        $scope.branch = $.extend(true, $scope.branch, master);
        $scope.branch.name = name;
        initBranch($scope.branch);
      } else {
        $scope.branch.mirror_master = true;
      }
      $scope.saveGeneralBranch(true);
    };

    $scope.$watch('branch.mirror_master', function (value) {
      setTimeout(function () {
        var tab = value && value.name === 'master' ? 'project' : 'basic';
        $('#' + tab + '-tab-handle').tab('show');
        $('.tab-pane.active').removeClass('active');
        $('#tab-' + tab).addClass('active');
      }, 0);
    });
    $scope.$watch('branch', function (value) {
      setTimeout(function () {
        var tab = value && value.name === 'master' ? 'project' : 'basic';
        $('#' + tab + '-tab-handle').tab('show');
        $('.tab-pane.active').removeClass('active');
        $('#tab-' + tab).addClass('active');
      }, 0);
    });

    $scope.setRunner = function (name) {
      $scope.branch.runner = {
        id: name,
        config: $scope.runnerConfigs[name]
      };
    };

    function updateConfigured() {
      var plugins = $scope.branch.plugins;
      $scope.configured[$scope.branch.name] = {};
      for (var i=0; i<plugins.length; i++) {
        $scope.configured[$scope.branch.name][plugins[i].id] = true;
      }
      savePluginOrder();
    }

    function savePluginOrder() {
      var plugins = $scope.branch.plugins
        , branch = $scope.branch
        , data = [];

      for (var i=0; i<plugins.length; i++) {
        data.push({
          id: plugins[i].id,
          enabled: plugins[i].enabled,
          showStatus: plugins[i].showStatus
        });
      }

      setTimeout(function() {
        Strider.put(
          '/' + e(options.owner) + '/' + e(options.repo) + '/config/' + e(branch.name) + '/',
          { plugin_order: data },
          success);
      });

      function success() {
        $scope.success('Plugin order on branch ' + branch.name + ' saved.');
      }
    }

    // options for the inUse plugin sortable
    $scope.inUseOptions = {
      connectWith: '.disabled-plugins-list',
      distance: 5,
      remove: function (e, ui) {
        updateConfigured();
      },
      receive: function (e, ui) {
        updateConfigured();
        var plugins = $scope.branch.plugins;
        plugins[ui.item.index()].enabled = true;
      }
    };

    function initBranch(branch) {
      var plugins;

      $scope.configured[branch.name] = {};
      $scope.configs[branch.name] = {};
      $scope.runnerConfigs[branch.name] = {};
      $scope.disabled_plugins[branch.name] = [];

      if (!branch.mirror_master) {
        plugins = branch.plugins;
        for (var i=0; i<plugins.length; i++) {
          $scope.configured[branch.name][plugins[i].id] = true;
          $scope.configs[branch.name][plugins[i].id] = plugins[i];
        }
      }

      for (var plugin in $scope.plugins) {
        if ($scope.configured[branch.name][plugin]) continue;
        $scope.configs[branch.name][plugin] = {
          id: plugin,
          enabled: true,
          config: {}
        };
        $scope.disabled_plugins[branch.name].push($scope.configs[branch.name][plugin]);
      }

      if (!branch.mirror_master) {
        $scope.runnerConfigs[branch.name][branch.runner.id] = branch.runner.config;
      }
      for (var runner in $scope.runners) {
        if (!branch.mirror_master && runner === branch.runner.id) continue;
        $scope.runnerConfigs[branch.name][runner] = {};
      }
    }
    function initPlugins() {
      var branches = $scope.project.branches
      for (var i=0; i<branches.length; i++) {
        initBranch(branches[i]);
      }
    }

    $scope.saveGeneralBranch = function (plugins) {
      var branch = $scope.branch
        , data = {
            active: branch.active,
            privkey: branch.privkey,
            pubkey: branch.pubkey,
            envKeys: branch.envKeys,
            mirror_master: branch.mirror_master,
            deploy_on_green: branch.deploy_on_green,
            runner: branch.runner
          };

      if (plugins) data.plugins = branch.plugins;

      setTimeout(function() {
        Strider.put(
          '/' + e(options.owner) + '/' + e(options.repo) + '/config/' + e(branch.name) + '/',
          data,
          success);
      });

      function success() {
        $scope.success('General config for branch ' + branch.name + ' saved.');
      }
    };

    $scope.generateKeyPair = function () {
      bootbox.confirm('Really generate a new keypair? This could break things if you have plugins that use the current ones.', function (really) {
        if (!really) return;

        Strider.post(
          '/' + e(options.owner) + '/' + e(options.repo) + '/keygen/' + e($scope.branch.name) + '/',
          {},
          success);

        function success(data) {
          $scope.branch.privkey = data.privkey;
          $scope.branch.pubkey = data.pubkey;
          $scope.success('Generated new ssh keypair');
        }
      });
    };

    initPlugins();

    $scope.gravatar = function (email) {
      if (!email) return '';
      var hash = md5(email.toLowerCase());
      return 'https://secure.gravatar.com/avatar/' + hash + '?d=identicon';
    }

    // todo: pass in name?
    $scope.runnerConfig = function (branch, data, next) {
      if (arguments.length === 2) {
        next = data;
        data = branch;
        branch = $scope.branch;
      }
      var name = $scope.branch.runner.id;
      if (arguments.length < 2) {
        return $scope.runnerConfigs[name];
      }

      setTimeout(function() {
        Strider.put(
          '/' + e(options.runner) + '/' + e(options.repo) + '/config/master/runner',
          data,
          success);
      });

      function success(data) {
        $scope.success("Runner config saved.");
        $scope.runnerConfigs[name] = data.config;
        next && next(null, data.config);
      }
    };

    $scope.providerConfig = function (data, next) {
      if (arguments.length === 0) {
        return $scope.project.provider.config;
      }
      setTimeout(function() {
        Strider.post(
          '/' + e(options.owner) + '/' + e(options.repo) + '/provider/',
          data,
          success);
      });

      function success() {
        $scope.success("Provider config saved.");
        next && next();
      }
    };

    $scope.pluginConfig = function (name, branch, data, next) {
      if (arguments.length === 3) {
        next = data;
        data = branch;
        branch = $scope.branch;
      }
      if (arguments.length === 1) {
        branch = $scope.branch;
      }
      if (branch.mirror_master) {
        return
      }
      var plugin = $scope.configs[branch.name][name]
      if (arguments.length < 3) {
        return plugin.config;
      }
      if (plugin === null) {
        console.error("pluginConfig called for a plugin that's not configured. " + name, true);
        throw new Error('Plugin not configured: ' + name);
      }

      Strider.put(
        '/' + e(options.owner) + '/' + e(options.repo) + '/config/' +
          e(branch.name) + '/' + e(name),
        data,
        success);

      function success() {
        $scope.success("Config for " + name + " on branch " + branch.name + " saved.");
        $scope.configs[branch.name][name].config = data;
        next(null, data);
      }
    };

    $scope.deleteProject = function () {
      Strider.del('/api/' + e(options.owner) + '/' + e(options.repo), success);

      function success() {
        $location.path('/');
      }
    };

    $scope.startTest = function () {

      Strider.post(
        '/' + e(options.owner) + '/' + e(options.repo) + '/start',
        {
          branch: $scope.branch.name,
          type: "TEST_ONLY",
          page:"config" },
        success);

      function success() {
        $location.path('/' + $scope.project.name);
      }
    };

    $scope.startDeploy = function () {
      Strider.post(
        '/' + e(options.owner) + '/' + e(options.repo) + '/start',
        {
          branch: $scope.branch.name,
          type: "TEST_AND_DEPLOY",
          page:"config" },
        success);

      function success() {
        $location.path('/' + $scope.project.name);
      }
    };

    $scope.saveProject = function () {
      setTimeout(function() {
        Strider.put(
          '/' + e(options.owner) + '/' + e(options.repo) + '/config',
          { public: $scope.project.public },
          success);
      });


      function success() {
        $scope.success('General config saved.');
      }
    };

  };
}
},{"../app":10,"../lib/md5":35,"./config/_fix_template":14}],14:[function(require,module,exports){
module.exports = fixTemplate;

function fixTemplate(s) {
  return s.
    replace(/\[\[/g, '{{').
    replace(/\]\]/g, '}}');
}
},{}],15:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.CollaboratorsCtrl', ['$scope', 'Strider', CollaboratorsCtrl]);

function CollaboratorsCtrl($scope, Strider) {
  $scope.new_email = '';
  $scope.new_access = 0;
  $scope.collaborators = window.collaborators || [];

  $scope.remove = function (item) {
    item.loading = true;
    $scope.clearMessage();
    Strider.del(
      '/' + $scope.project.name + '/collaborators/',
      {email: item.email},
      success);

    function success() {
      remove($scope.collaborators, item);
      $scope.success(item.email + " is no longer a collaborator on this project.");
    }
  };

  $scope.add = function () {
    var data = {
      email: $scope.new_email,
      access: $scope.new_access || 0,
      gravatar: $scope.gravatar($scope.new_email),
      owner: false
    };

    Strider.post(
      '/' + $scope.project.name + '/collaborators/',
      data,
      success);


    function success(res) {
      $scope.new_access = 0;
      $scope.new_email = '';
      if (res.created) {
        $scope.collaborators.push(data);
      }
      $scope.success(res.message);
    }
  };
}

function remove(ar, item) {
  ar.splice(ar.indexOf(item), 1);
}

},{"../../app":10}],16:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.EnvironmentCtrl', ['$scope', EnvironmentCtrl]);

function EnvironmentCtrl($scope){
  $scope.$watch('configs[branch.name].env.config', function (value) {
    $scope.config = value || {};
  });
  $scope.saving = false;
  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('env', $scope.config, function () {
      $scope.saving = false;
    });
  };
  $scope.del = function (key) {
    delete $scope.config[key];
    $scope.save();
  };
  $scope.add = function () {
    $scope.config[$scope.newkey] = $scope.newvalue;
    $scope.newkey = $scope.newvalue = '';
    $scope.save();
  };
}
},{"../../app":10}],17:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.GithubCtrl', ['$scope', 'Strider', GithubCtrl]);

function GithubCtrl($scope, Strider) {

  $scope.config = $scope.providerConfig();
  $scope.new_username = "";
  $scope.new_level = "tester";
  $scope.config.whitelist = $scope.config.whitelist || [];
  $scope.config.pull_requests = $scope.config.pull_requests || 'none';

  $scope.save = function () {
    $scope.providerConfig($scope.config, function () {});
  };

  $scope.$watch('config.pull_requests', function (value, old) {
    if (!old || value === old) return;
    $scope.providerConfig({
      pull_requests: $scope.config.pull_requests
    });
  });

  $scope.addWebhooks = function () {
    $scope.loadingWebhooks = true;

    Strider.post($scope.api_root + 'github/hook', success);

    function success() {
      console.log('SUCCESS');
      $scope.loadingWebhooks = false;
      $scope.success('Set github webhooks');
    }
  };

  $scope.deleteWebhooks = function () {
    $scope.loadingWebhooks = true;

    Strider.del($scope.api_root + 'github/hook', success);

    function success() {
      $scope.loadingWebhooks = false;
      $scope.success('Removed github webhooks');
    }
  };

  $scope.removeWL = function (user) {
    var idx = $scope.config.whitelist.indexOf(user);
    if (idx === -1) return console.error("tried to remove a whitelist item that didn't exist");
    var whitelist = $scope.config.whitelist.slice();
    whitelist.splice(idx, 1);
    $scope.providerConfig({
      whitelist: whitelist
    }, function () {
      $scope.config.whitelist = whitelist;
    });
  };

  $scope.addWL = function (user) {
    if (!user.name || !user.level) return;
    var whitelist = $scope.config.whitelist.slice();
    whitelist.push(user);
    $scope.providerConfig({
      whitelist: whitelist
    }, function () {
      $scope.config.whitelist = whitelist;
    });
  };

}
},{"../../app":10}],18:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.HerokuController', ['$scope', 'Strider', HerokuCtrl]);

function HerokuCtrl($scope, Strider) {
  $scope.$watch('userConfigs.heroku', function (value) {
    if (!value) return
    $scope.userConfig = value;
    if (!$scope.account && value.accounts && value.accounts.length > 0) {
      $scope.account = value.accounts[0];
    }
  });
  $scope.$watch('configs[branch.name].heroku.config', function (value) {
    $scope.config = value;
    if (value.app && $scope.userConfig.accounts) {
      for (var i=0; i<$scope.userConfig.accounts.length; i++) {
        if ($scope.userConfig.accounts[i].id === value.app.account) {
          $scope.account = $scope.userConfig.accounts[i];
          break;
        }
      }
    }
  });
  $scope.saving = false;
  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('heroku', $scope.config, function () {
      $scope.saving = false;
    });
  };
  $scope.getApps = function () {
    if (!$scope.account) return console.warn('tried to getApps but no account');
    Strider.get('/ext/heroku/apps/' + encodeURIComponent($scope.account.id), success);

    function success (body, req) {
      $scope.account.cache = body;
      $scope.success('Got accounts list for ' + $scope.account.email, true);
    }
  };
}
},{"../../app":10}],19:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.JobController', ['$scope', JobController]);

function JobController($scope) {

  $scope.init = function(name) {
    $scope.$watch('userConfigs["' + name + '"]', function (value) {
      $scope.userConfig = value;
    });
    $scope.$watch('configs[branch.name]["' + name + '"].config', function (value) {
      $scope.config = value;
    });
    $scope.saving = false;
    $scope.save = function () {
      $scope.saving = true;
      $scope.pluginConfig(name, $scope.config, function () {
        $scope.saving = false;
      });
    };
  }
}
},{"../../app":10}],20:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.NodeController', ['$scope', NodeController]);

function NodeController($scope) {
  $scope.$watch('configs[branch.name].node.config', function (value) {
    $scope.config = value;
  });
  $scope.saving = false;
  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('node', $scope.config, function () {
      $scope.saving = false;
    });
  };
  $scope.removeGlobal = function (index) {
    $scope.config.globals.splice(index, 1);
    $scope.save();
  };
  $scope.addGlobal = function () {
    if (!$scope.config.globals) $scope.config.globals = [];
    $scope.config.globals.push($scope.new_package);
    $scope.new_package = '';
    $scope.save();
  };
}
},{"../../app":10}],21:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.RunnerController', ['$scope', RunnerController]);

function RunnerController($scope) {

  $scope.init = function(name) {
    $scope.saving = false;
    $scope.$watch('runnerConfigs[branch.name]["' + name + '"]', function (value) {
      // console.log('Runner config', name, value, $scope.runnerConfigs);
      $scope.config = value;
    });
  };

  $scope.save = function () {
    $scope.saving = true;
    $scope.runnerConfig($scope.config, function () {
      $scope.saving = false;
    });
  };

}
},{"../../app":10}],22:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.SauceCtrl', ['$scope', SauceCtrl]);

function SauceCtrl($scope) {

  $scope.$watch('configs[branch.name].sauce.config', function (value) {
    $scope.config = value;
    if (!value) return;
    $scope.browser_map = {};
    if (!value.browsers) {
      value.browsers = [];
    }
    for (var i=0; i<value.browsers.length; i++) {
      $scope.browser_map[serializeName(value.browsers[i])] = true;
    }
  });
  $scope.completeName = completeName;
  $scope.operatingsystems = organize(browsers || []);
  $scope.save = function () {
    $scope.config.browsers = [];
    for (var name in $scope.browser_map) {
      if ($scope.browser_map[name]) {
        $scope.config.browsers.push(parseName(name));
      }
    }
    $scope.pluginConfig('sauce', $scope.config, function () {
    });
  };
  $scope.clear = function () {
    $scope.browser_map = {};
    $scope.$digest();
  };
}

function organize(browsers) {
  var oss = {};
  for (var i=0; i<browsers.length; i++) {
    if (!oss[browsers[i].os]) {
      oss[browsers[i].os] = {};
    }
    if (!oss[browsers[i].os][browsers[i].long_name]) {
      oss[browsers[i].os][browsers[i].long_name] = [];
    }
    oss[browsers[i].os][browsers[i].long_name].push(browsers[i]);
    browsers[i].complete_name = completeName(browsers[i]);
  }
  return oss;
}

function completeName(version) {
  return version.os + '-' + version.api_name + '-' + version.short_version;
}

function parseName(name) {
  var parts = name.split('-');
  return {
    platform: parts[0],
    browserName: parts[1],
    version: parts[2] || ''
  };
}

function serializeName(browser) {
  return browser.platform + '-' + browser.browserName + '-' + browser.version;
}
},{"../../app":10}],23:[function(require,module,exports){
var App = require('../../app');

App.controller('Config.WebhooksCtrl', ['$scope', WebhooksCtrl]);

function WebhooksCtrl($scope) {

  function remove(ar, item) {
    ar.splice(ar.indexOf(item), 1);
  }

  $scope.hooks = $scope.pluginConfig('webhooks') || [];
  if (!Array.isArray($scope.hooks)) $scope.hooks = [];
  if (!$scope.hooks.length) $scope.hooks.push({});

  $scope.remove = function (hook) {
    $scope.saving = true;
    $scope.pluginConfig('webhooks', $scope.hooks, function (err) {
      $scope.saving = false;
      if (!err) remove($scope.hooks, hook);
      if (!$scope.hooks.length) $scope.hooks.push({});
    });
  };

  $scope.save = function () {
    $scope.saving = true;
    $scope.pluginConfig('webhooks', $scope.hooks, function (err) {
      $scope.saving = false;
    });
  };

  $scope.add = function () {
    $scope.hooks.push({});
  };
}
},{"../../app":10}],24:[function(require,module,exports){
var App = require('../app');

App.controller('DashboardCtrl', ['$scope', 'Strider', DashboardCtrl]);

function DashboardCtrl($scope, Strider) {

  $scope.phases = Strider.phases;


  Strider.get('/dashboard', function(resp) {
    $scope.jobs = resp.jobs;
    $scope.availableProviders = resp.availableProviders;

    Strider.connect($scope, $scope.jobs);
  });

  // $scope.jobs = Strider.jobs;
  // Strider.connect($scope);
  // Strider.jobs.dashboard();

  $scope.startDeploy = function deploy(job) {
    Strider.deploy(job.project);
  };

  $scope.startTest = function test(job) {
    Strider.test(job.project);
  };

}
},{"../app":10}],25:[function(require,module,exports){
var App = require('../app');

App.controller('ErrorCtrl', ['$scope', '$rootScope', '$location', '$sce', ErrorCtrl]);

function ErrorCtrl($scope, $rootScope, $location, $sce) {
  $scope.error = {};

  var last;

  $rootScope.$on('error', function(ev, err) {
    last = Date.now();
    $scope.error.message = $sce.trustAsHtml(err.message || err);
  });

  $rootScope.$on('$routeChangeStart', function() {
    if (last && Date.now() - last >  1000) {
      $scope.error.message = '';
    }
  });

  var flash = $location.search().flash;
  if (flash) {
    try {
      flash = JSON.parse(flash);
    } catch(err) {
      // do nothing
    }

    Object.keys(flash).forEach(function(k) {
      $rootScope.$emit('error', flash[k][0]);
    });
  }
}
},{"../app":10}],26:[function(require,module,exports){
var App = require('../app');
var e   = encodeURIComponent;

App.controller('JobCtrl', ['$scope', '$routeParams', '$sce', '$filter', '$location', '$route', 'Strider', JobCtrl]);

function JobCtrl($scope, $routeParams, $sce, $filter, $location, $route, Strider) {


  // TODO: remove this DOM stuff from the controller
  var outputConsole = document.querySelector('.console-output');

  $scope.phases = Strider.phases;
  $scope.page = 'build';

  var jobId = $routeParams.jobid;
  var options = {
    owner: $routeParams.owner,
    repo:  $routeParams.repo
  };
  var projectName = e(options.owner) + '/' + e(options.repo);

  Strider.get('/api/' + projectName + '\/', gotRepo);

  function gotRepo(repo) {
    $scope.project = repo.project;
    if (! jobId) jobId = repo && repo.job && repo.job._id;
    if (! jobId) return;

    $scope.jobs = repo.jobs;

    Strider.connect($scope, connected);
  }

  function connected() {
    Strider.job(jobId, $scope.project, loadedJob);
  }

  function loadedJob(job) {
    $scope.job = job;

    /// - If there is a job id on the URL redirect the user
    ///   to the new job URL.
    /// - Do not redirect the user to the new job when there
    ///   is a job id on the URL.
    if (! $routeParams.jobId) {
      Strider.store.on('newjob', onNewJob);
      $scope.$on('$destroy', function() {
        Strider.store.removeListener('newjob', onNewJob);
      });
    }

    if ($scope.job && $scope.job.phases.test.commands.length) {
      if ($scope.job.phases.environment) {
        $scope.job.phases.environment.collapsed = true;
      }
      if ($scope.job.phases.prepare) {
        $scope.job.phases.prepare.collapsed = true;
      }
      if ($scope.job.phases.cleanup) {
        $scope.job.phases.cleanup.collapsed = true;
      }
    }
  }


  function onNewJob(job) {
    if (job.project.name == projectName) {
      var newPath = '/' + projectName + '/job/' + e(job._id);
      $location.path(newPath);
      $scope.$apply();
    }
  }


  Strider.get('/statusblocks', function(statusBlocks) {
    $scope.statusBlocks = statusBlocks;
    ['runner', 'provider', 'job'].forEach(function(key) {
      fixBlocks(statusBlocks, key);
    });
  });

  Strider.get('/api/session', function(user) {
    if (user.user) $scope.currentUser = user;
  });

  /// Scope functions

  $scope.clearCache = function clearCache() {
    $scope.clearingCache = true;

    Strider.del('/' + e(options.owner) + '/' + e(options.repo) + '/cache', success);

    function success() {
      $scope.clearingCache = false;
      $scope.$digest();
    }
  }

  $scope.triggers = {
    commit: {
      icon: 'code-fork',
      title: 'Commit'
    },
    manual: {
      icon: 'hand-right',
      title: 'Manual'
    },
    plugin: {
      icon: 'puzzle-piece',
      title: 'Plugin'
    },
    api: {
      icon: 'cloud',
      title: 'Cloud'
    }
  };

  $scope.selectJob = function (id) {
    $location.path(
      '/' + encodeURIComponent(options.owner) +
      '/' + encodeURIComponent(options.repo) +
      '/job/' + encodeURIComponent(id));
  };

  $scope.$watch('job.status', function (value) {
    updateFavicon(value);
  });

  $scope.$watch('job.std.merged_latest', function (value) {
    var ansiFilter = $filter('ansi')
    $('.job-output').last().append(ansiFilter(value))
    outputConsole.scrollTop = outputConsole.scrollHeight;
    setTimeout(function () {
      outputConsole.scrollTop = outputConsole.scrollHeight;
    }, 10);
  });

  // button handlers
  $scope.startDeploy = function (job) {
    $('.tooltip').hide();
    Strider.deploy(job.project);
    $scope.job = {
      project: $scope.job.project,
      status: 'submitted'
    };
  };

  $scope.startTest = function (job) {
    $('.tooltip').hide();
    Strider.deploy(job.project);
    $scope.job = {
      project: $scope.job.project,
      status: 'submitted'
    };
  };


  function fixBlocks(object, key) {
    var blocks = object[key];
    if (! blocks) return;
    Object.keys(blocks).forEach(function(provider) {
      var block = blocks[provider];
      block.attrs_html = Object.keys(block.attrs).map(function(attr) {
        return attr + '=' + block.attrs[attr];
      }).join(' ');

      block.html = $sce.trustAsHtml(block.html);

    });
  }
}


/** manage the favicons **/
function setFavicon(status) {
  $('link[rel*="icon"]').attr('href', '/images/icons/favicon-' + status + '.png');
}

function animateFav() {
  var alt = false;
  function switchit() {
    setFavicon('running' + (alt ? '-alt' : ''));
    alt = !alt;
  }
  return setInterval(switchit, 500);
}

var runtime = null;
function updateFavicon(value) {
  if (value === 'running') {
    if (runtime === null) {
      runtime = animateFav();
    }
  } else {
    if (runtime !== null) {
      clearInterval(runtime);
      runtime = null;
    }
    setFavicon(value);
  }
}
},{"../app":10}],27:[function(require,module,exports){
var App = require('../app');

App.controller('LoginCtrl', ['$scope', '$location', '$rootScope', 'Strider', LoginCtrl]);

function LoginCtrl($scope, $location, $rootScope, Strider) {

  $scope.user = {email: undefined, password: undefined};

  $scope.login = function login() {
    Strider.post('/api/session', $scope.user, function() {
      $rootScope.$emit('login');
      $location.path('/dashboard');
    });
  };
}
},{"../app":10}],28:[function(require,module,exports){
var App = require('../app');

App.controller('LogoutCtrl', ['$scope', '$rootScope', '$location', 'Strider', LogoutCtrl]);

function LogoutCtrl($scope, $rootScope, $location, Strider) {

  Strider.del('/api/session', function() {
    $rootScope.$emit('logout');
    $location.path('/');
  });

}
},{"../app":10}],29:[function(require,module,exports){
var App = require('../app');

function validName(name) {
  return !!name.match(/[\w-]+\/[\w-]+/);
}

App.controller('ManualCtrl', ['$scope', 'Strider', ManualCtrl]);

function ManualCtrl($scope, Strider) {
  // var provider = $attrs.id.split('-')[1];
  $scope.config = {};

  $scope.init = function(provider, projects) {

    $scope.projects = projects;

    $scope.remove = function (project) {
      project.really_remove = 'removing';

      Strider.del('/' + project.name + '/', success);

      function success() {
        $scope.projects.splice($scope.projects.indexOf(project), 1);
        $scope.success('Project removed');
      }
    };

    $scope.create = function () {
      var name = $scope.display_name.toLowerCase();
      if (!validName(name)) return;

      var data = {
        display_name: $scope.display_name,
        display_url: $scope.display_url,
        public: $scope.public,
        provider: {
          id: provider,
          config: $scope.config
        }
      };

      Strider.put('/' + name + '/', data, success);

      function success() {
        $scope.projects.push({
          display_name: $scope.display_name,
          display_url: $scope.display_url,
          provider: {
            id: provider,
            config: $scope.config
          }
        });
        $scope.config = {};
        $scope.display_name = '';
        $scope.display_url = '';
        $scope.success('Created project!');
      }
    }
  }
}
},{"../app":10}],30:[function(require,module,exports){
var App = require('../app');

App.controller('ProjectsCtrl', ['$scope', '$sce', 'Strider', ProjectsCtrl]);

function ProjectsCtrl($scope, $sce, Strider) {

  Strider.get('/api/projects', function(resp) {

    $scope.unconfigured = resp.unconfigured;
    $scope.providers = resp.providers;
    $scope.manual = resp.manual;
    $scope.manualProjects = resp.manualProjects;
    $scope.repos = resp.repos;
    $scope.project_types = resp.project_types;

    $scope.projectsPage = true;


    /// Trust some content

    Object.keys($scope.manual).forEach(function(key) {
      var item = $scope.manual[key];
      if (item.provider && item.provider.html)
        item.provider.html = $sce.trustAsHtml(item.provider.html);
    });


    $scope.removeProject = function (account, repo, group) {
      repo.really_remove = 'removing';

      Strider.del('/' + repo.name + '/', success);

      function success() {
        repo.project = null;
        repo.really_remove = false;
        group.configured--;
      }
    };

    $scope.setupProject = function (account, repo, type, group) {
      var data = {
        display_name: repo.display_name || repo.name,
        display_url: repo.display_url,
        project_type: type,
        provider: {
          id: account.provider,
          account: account.id,
          repo_id: repo.id,
          config: repo.config
        }
      };

      Strider.put('/' + repo.name + '/', data, success);

      function success(data) {
        repo.project = data.project;
        repo.adding = 'done';
        group.configured++;
      }
    };

    $scope.startTest = function (repo) {

      Strider.post('/' + repo.project.name + '/start', success);

      function success() {
        repo.adding = false;
        $scope.success('Test started for ' + repo.project.name + '. <a href="/' + repo.project.name + '" target="_blank">Click to watch it run</a>');
      }
    };
  });

}
},{"../app":10}],31:[function(require,module,exports){
var App = require('../app');

App.controller('ReloadCtrl', ['$location', function($location) {
  window.location = $location.path();
}]);
},{"../app":10}],32:[function(require,module,exports){
var App = require('../app');

App.controller('RootCtrl', ['$scope', '$rootScope', '$location', 'Strider', RootCrtl]);

function RootCrtl($scope, $rootScope, $location, Strider) {

  function getUser() {
    Strider.get('/api/session', function(session) {
      if (session.user) {
        $scope.currentUser = session.user;
        $scope.accounts = session.user.accounts;
      } else {
       $rootScope.$broadcast('nouser');
      }
    });
  }

  $scope.getUser = function() {
    if (! $scope.currentUser) getUser();
  };

  $rootScope.$on('logout', function() {
    $scope.currentUser = undefined;
  });

  $rootScope.$on('login', getUser);

  getUser();
}
},{"../app":10}],33:[function(require,module,exports){
module.exports = ['$rootScope', '$q', function($scope, $q) {

  function success(response) {
    return response;
  }

  function error(response) {
    var status = response.status;

    var resp = response.data;
    if (resp) try { resp = JSON.parse(resp); } catch(err) { }

    if (resp.message) resp = resp.message;
    if (! resp) {
      resp = 'Error in response';
      if (status) resp += ' (' + status + ')';
    }

    $scope.$emit('error', new Error(resp));

    return $q.reject(response);
  }

  return function (promise) {
    return promise.then(success, error);
  }

}];
},{}],34:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;
var inherits     = require('util').inherits;
var extend       = require('xtend');

exports = module.exports = createJobStore;
function createJobStore() {
  return new JobStore;
}

var PHASES = exports.phases =
['environment', 'prepare', 'test', 'deploy', 'cleanup'];

var statusHandlers = {
  'started': function (time) {
    this.started = time;
    this.phase = 'environment';
    this.status = 'running';
  },
  'errored': function (error) {
    this.error = error;
    this.status = 'errored';
  },
  'canceled': 'errored',
  // this is just so we'll trigger the "unknown job" lookup sooner on the dashboard
  'warning': function (warning) {
    if (!this.warnings) {
      this.warnings = [];
    }
    this.warnings.push(warning);
  },
  'plugin-data': function (data) {
    var path = data.path ? [data.plugin].concat(data.path.split('.')) : [data.plugin]
    , last = path.pop()
    , method = data.method || 'replace'
    , parent
    parent = path.reduce(function (obj, attr) {
      return obj[attr] || (obj[attr] = {})
    }, this.plugin_data || (this.plugin_data = {}))
    if (method === 'replace') {
      parent[last] = data.data
    } else if (method === 'push') {
      if (!parent[last]) {
        parent[last] = []
      }
      parent[last].push(data.data)
    } else if (method === 'extend') {
      if (!parent[last]) {
        parent[last] = {}
      }
      extend(parent[last], data.data)
    } else {
      console.log('Invalid "plugin data" method received from plugin', data.plugin, data.method, data)
    }
  },

  'phase.done': function (data) {
    this.phases[data.phase].finished = data.time;
    this.phases[data.phase].duration = data.elapsed
    this.phases[data.phase].exitCode = data.code;
    if (['prepare', 'environment', 'cleanup'].indexOf(data.phase) !== -1) {
      this.phases[data.phase].collapsed = true;
    }
    if (data.phase === 'test') this.test_status = data.code;
    if (data.phase === 'deploy') this.deploy_status = data.code;
    if (!data.next || !this.phases[data.next]) {
      if (!this.test_status && ! this.deploy_status) this.status = 'passed';
      else this.status = 'failed';
      return;
    }
    this.phase = data.next;
    this.phases[data.next].started = data.time;
  },
  'command.comment': function (data) {
    var phase = this.phases[this.phase]
      , command = extend({}, SKELS.command);
    command.command = data.comment;
    command.comment = true;
    command.plugin = data.plugin;
    command.finished = data.time;
    phase.commands.push(command);
  },
  'command.start': function (data) {
    var phase = this.phases[this.phase]
      , command = extend({}, SKELS.command, data);
    command.started = data.time;
    phase.commands.push(command);
  },
  'command.done': function (data) {
    var phase = this.phases[this.phase]
      , command = ensureCommand(this.phases[this.phase]);
    command.finished = data.time;
    command.duration = data.elapsed;
    command.exitCode = data.exitCode;
    command.merged = command._merged;
  },
  'stdout': function (text) {
    var command = ensureCommand(this.phases[this.phase]);
    command.out += text;
    command._merged += text;
    this.std.out += text;
    this.std.merged += text;
    this.std.merged_latest = text;
  },
  'stderr': function (text) {
    var command = ensureCommand(this.phases[this.phase]);
    command.err += text;
    command._merged += text;
    this.std.err += text;
    this.std.merged += text;
    this.std.merged_latest = text;
  }
}

function JobStore() {
  var store = this;
  store.jobs = {
    public: [],
    yours: []
  };

  setInterval(function() {
    console.log('STORE JOBS:', store.jobs);
  }, 5000);
}

inherits(JobStore, EventEmitter);

var JS = JobStore.prototype;


/// Dashboard Data

JS.dashboard = function dashboard(cb) {
  var self = this;
  this.socket.emit('dashboard:jobs', function(jobs) {
    self.jobs.yours = jobs.yours;
    self.jobs.public = jobs.public;
    self.jobs.yours.forEach(fixJob);
    self.jobs.public.forEach(fixJob);
    if (cb) cb();
    self.changed();
  });
}


/// ---- Job Store prototype functions: ----

/// connect

JS.connect = function connect(socket, changeCallback) {
  this.socket = socket;
  this.changeCallback = changeCallback;

  for (var status in statusHandlers) {
    socket.on('job.status.' + status, this.update.bind(this, status))
  }

  socket.on('job.new', JS.newJob.bind(this));
};

/// setJobs

JS.setJobs = function setJobs(jobs) {
  this.jobs.yours = jobs.yours;
  this.jobs.public = jobs.public;
  this.jobs.yours.forEach(fixJob);
  this.jobs.public.forEach(fixJob);
};


/// update - handle update event

JS.update = function update(event, args, access, dontchange) {
  var id = args.shift()
    , job = this.job(id, access)
    , handler = statusHandlers[event];

  if (!job) return; // this.unknown(id, event, args, access)
  if (!handler) return;

  if ('string' === typeof handler) {
    job.status = handler;
  } else {
    handler.apply(job, args);
  }
  if (!dontchange) this.changed();
};


/// newJob - when server notifies of new job

JS.newJob = function newJob(job, access) {
  if (! job) return;
  if (Array.isArray(job)) job = job[0];

  var jobs = this.jobs[access]
    , found = -1
    , old;

  for (var i=0; i<jobs.length; i++) {
    if (jobs[i] && jobs[i].project.name === job.project.name) {
      found = i;
      break;
    }
  }

  if (found > -1) {
    old = jobs.splice(found, 1)[0];
    job.project.prev = old.project.prev;
  }

  jobs.unshift(job);

  fixJob(job);

  this.emit('newjob', job);
  this.changed();
};


/// job - find a job by id and access level

JS.job = function job(id, access) {
  return search(id, this.jobs[access]);
};

function search(id, jobs) {
  var job;
  for (var i=0; i<jobs.length; i++) {
    job = jobs[i];
    if (job && job._id === id) return job;
  }
}


/// changed - notifies UI of changes

JS.changed = function changed() {
  this.changeCallback();
};


/// load — loads a job

JS.load = function load(jobId, project, cb) {
  var self = this;

  var destination = project.access_level > 1 ? 'yours' : 'public';

  this.socket.emit('build:job', jobId, function(job) {
    /// HACK: the socket emits a job that is missing the `project`
    /// structure (instead the `project` value is a string)
    /// Attach a proper project structure to it.
    job.project = project;

    /// New job has unknown access?
    self.newJob(job, destination);
    cb(job);
    self.changed();
  });
};

function ensureCommand(phase) {
  var command = phase.commands[phase.commands.length - 1];
  if (!command || typeof command.finished != 'undefined') {
    command = extend({}, SKELS.command);
    phase.commands.push(command);
  }
  return command;
}


/// HACK: Fix job structure

function fixJob(job) {

  if (! job.phases) {
    job.phases = {};
    PHASES.forEach(function(phase) {
      job.phases[phase] = {
        commands: []
      };
    });
  }

  if (! job.phase) job.phase = PHASES[0];

  if (! job.std) job.std = extend({}, SKELS.job.std);
}


var SKELS = {
  job: {
    id: null,
    data: null,
    phases: {},
    phase: PHASES[0],
    queued: null,
    started: null,
    finished: null,
    test_status: null,
    deploy_status: null,
    plugin_data: {},
    warnings: [],
    std: {
      out: '',
      err: '',
      merged: '',
      merged_latest: ''
    }
  },
  command: {
    out: '',
    err: '',
    merged: '',
    _merged: '',
    started: null,
    command: '',
    plugin: ''
  },
  phase: {
    finished: null,
    exitCode: null,
    commands: []
  }
}
},{"events":2,"util":3,"xtend":5}],35:[function(require,module,exports){
function md5cycle(x, k) {
var a = x[0], b = x[1], c = x[2], d = x[3];

a = ff(a, b, c, d, k[0], 7, -680876936);
d = ff(d, a, b, c, k[1], 12, -389564586);
c = ff(c, d, a, b, k[2], 17,  606105819);
b = ff(b, c, d, a, k[3], 22, -1044525330);
a = ff(a, b, c, d, k[4], 7, -176418897);
d = ff(d, a, b, c, k[5], 12,  1200080426);
c = ff(c, d, a, b, k[6], 17, -1473231341);
b = ff(b, c, d, a, k[7], 22, -45705983);
a = ff(a, b, c, d, k[8], 7,  1770035416);
d = ff(d, a, b, c, k[9], 12, -1958414417);
c = ff(c, d, a, b, k[10], 17, -42063);
b = ff(b, c, d, a, k[11], 22, -1990404162);
a = ff(a, b, c, d, k[12], 7,  1804603682);
d = ff(d, a, b, c, k[13], 12, -40341101);
c = ff(c, d, a, b, k[14], 17, -1502002290);
b = ff(b, c, d, a, k[15], 22,  1236535329);

a = gg(a, b, c, d, k[1], 5, -165796510);
d = gg(d, a, b, c, k[6], 9, -1069501632);
c = gg(c, d, a, b, k[11], 14,  643717713);
b = gg(b, c, d, a, k[0], 20, -373897302);
a = gg(a, b, c, d, k[5], 5, -701558691);
d = gg(d, a, b, c, k[10], 9,  38016083);
c = gg(c, d, a, b, k[15], 14, -660478335);
b = gg(b, c, d, a, k[4], 20, -405537848);
a = gg(a, b, c, d, k[9], 5,  568446438);
d = gg(d, a, b, c, k[14], 9, -1019803690);
c = gg(c, d, a, b, k[3], 14, -187363961);
b = gg(b, c, d, a, k[8], 20,  1163531501);
a = gg(a, b, c, d, k[13], 5, -1444681467);
d = gg(d, a, b, c, k[2], 9, -51403784);
c = gg(c, d, a, b, k[7], 14,  1735328473);
b = gg(b, c, d, a, k[12], 20, -1926607734);

a = hh(a, b, c, d, k[5], 4, -378558);
d = hh(d, a, b, c, k[8], 11, -2022574463);
c = hh(c, d, a, b, k[11], 16,  1839030562);
b = hh(b, c, d, a, k[14], 23, -35309556);
a = hh(a, b, c, d, k[1], 4, -1530992060);
d = hh(d, a, b, c, k[4], 11,  1272893353);
c = hh(c, d, a, b, k[7], 16, -155497632);
b = hh(b, c, d, a, k[10], 23, -1094730640);
a = hh(a, b, c, d, k[13], 4,  681279174);
d = hh(d, a, b, c, k[0], 11, -358537222);
c = hh(c, d, a, b, k[3], 16, -722521979);
b = hh(b, c, d, a, k[6], 23,  76029189);
a = hh(a, b, c, d, k[9], 4, -640364487);
d = hh(d, a, b, c, k[12], 11, -421815835);
c = hh(c, d, a, b, k[15], 16,  530742520);
b = hh(b, c, d, a, k[2], 23, -995338651);

a = ii(a, b, c, d, k[0], 6, -198630844);
d = ii(d, a, b, c, k[7], 10,  1126891415);
c = ii(c, d, a, b, k[14], 15, -1416354905);
b = ii(b, c, d, a, k[5], 21, -57434055);
a = ii(a, b, c, d, k[12], 6,  1700485571);
d = ii(d, a, b, c, k[3], 10, -1894986606);
c = ii(c, d, a, b, k[10], 15, -1051523);
b = ii(b, c, d, a, k[1], 21, -2054922799);
a = ii(a, b, c, d, k[8], 6,  1873313359);
d = ii(d, a, b, c, k[15], 10, -30611744);
c = ii(c, d, a, b, k[6], 15, -1560198380);
b = ii(b, c, d, a, k[13], 21,  1309151649);
a = ii(a, b, c, d, k[4], 6, -145523070);
d = ii(d, a, b, c, k[11], 10, -1120210379);
c = ii(c, d, a, b, k[2], 15,  718787259);
b = ii(b, c, d, a, k[9], 21, -343485551);

x[0] = add32(a, x[0]);
x[1] = add32(b, x[1]);
x[2] = add32(c, x[2]);
x[3] = add32(d, x[3]);

}

function cmn(q, a, b, x, s, t) {
a = add32(add32(a, q), add32(x, t));
return add32((a << s) | (a >>> (32 - s)), b);
}

function ff(a, b, c, d, x, s, t) {
return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function md51(s) {
txt = '';
var n = s.length,
state = [1732584193, -271733879, -1732584194, 271733878], i;
for (i=64; i<=s.length; i+=64) {
md5cycle(state, md5blk(s.substring(i-64, i)));
}
s = s.substring(i-64);
var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
for (i=0; i<s.length; i++)
tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
tail[i>>2] |= 0x80 << ((i%4) << 3);
if (i > 55) {
md5cycle(state, tail);
for (i=0; i<16; i++) tail[i] = 0;
}
tail[14] = n*8;
md5cycle(state, tail);
return state;
}

/* there needs to be support for Unicode here,
 * unless we pretend that we can redefine the MD-5
 * algorithm for multi-byte characters (perhaps
 * by adding every four 16-bit characters and
 * shortening the sum to 32 bits). Otherwise
 * I suggest performing MD-5 as if every character
 * was two bytes--e.g., 0040 0025 = @%--but then
 * how will an ordinary MD-5 sum be matched?
 * There is no way to standardize text to something
 * like UTF-8 before transformation; speed cost is
 * utterly prohibitive. The JavaScript standard
 * itself needs to look at this: it should start
 * providing access to strings as preformed UTF-8
 * 8-bit unsigned value arrays.
 */
function md5blk(s) { /* I figured global was faster.   */
var md5blks = [], i; /* Andy King said do it this way. */
for (i=0; i<64; i+=4) {
md5blks[i>>2] = s.charCodeAt(i)
+ (s.charCodeAt(i+1) << 8)
+ (s.charCodeAt(i+2) << 16)
+ (s.charCodeAt(i+3) << 24);
}
return md5blks;
}

var hex_chr = '0123456789abcdef'.split('');

function rhex(n)
{
var s='', j=0;
for(; j<4; j++)
s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
+ hex_chr[(n >> (j * 8)) & 0x0F];
return s;
}

function hex(x) {
for (var i=0; i<x.length; i++)
x[i] = rhex(x[i]);
return x.join('');
}

function md5(s) {
return hex(md51(s));
}

/* this function is much faster,
so if possible we use it. Some IEs
are the only ones I know of that
need the idiotic second function,
generated by an if clause.  */

function add32(a, b) {
return (a + b) & 0xFFFFFFFF;
}

if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
function add32(x, y) {
var lsw = (x & 0xFFFF) + (y & 0xFFFF),
msw = (x >> 16) + (y >> 16) + (lsw >> 16);
return (msw << 16) | (lsw & 0xFFFF);
}
}


module.exports = md5;
},{}],36:[function(require,module,exports){
var JobStore = require('./job_store');
var jobStore = JobStore();

exports = module.exports = BuildStrider;

function BuildStrider($http) {
  return new Strider($http);
}


var socket;
var scopes = [];

function Strider($http, opts) {
  if (! opts) opts = {};
  if (typeof opts == 'string')
    opts = { url: opts };

  this.url = opts.url || '//localhost:3000';

  this.phases  = JobStore.phases;

  this.store = jobStore;

  this.$http = $http;
}


var S = Strider.prototype;


/// changed - invoked when UI needs updating
function changed() {
  scopes.forEach(function(scope) {
    scope.$digest();
  });
}


//// ---- Strider prototype functions

/// connect websocket

S.connect = function(scope, jobs, cb) {
  if (typeof jobs == 'function') {
    cb = jobs;
    jobs = undefined;
  }

  if (! socket) {
    this.socket = socket = io.connect(this.url);
    jobStore.connect(socket, changed);
  }

  /// connects job store to new socket
  if (jobs) {
    jobStore.setJobs(jobs);
    if (cb) cb();
  } else {
    jobStore.connect(socket, changed);
    this.store.dashboard(cb);
  }

  scopes.push(scope);
  scope.$on('$destroy', function() {
    var found = false;
    for (var i = 0 ; ! found && i < scopes.length; i ++) {
      if (scopes[i] == scope) {
        found = true;
        scopes.splice(i, 1);
      }
    }
  });
};


/// deploy

S.deploy = function deploy(project) {
  this.socket.emit('deploy', project.name || project);
};

S.test = function test(project) {
  this.socket.emit('test', project.name || project);
};


/// job

S.job = function job(jobId, project, cb) {
  jobStore.load(jobId, project, cb);
};


/// HTTP

S.post = function(url, body, cb) {
  return this.request('POST', url, body, cb);
};

S.put = function(url, body, cb) {
  return this.request('PUT', url, body, cb);
};

S.del = function(url, body, cb) {
  return this.request('DELETE', url, body, cb);
};

S.get = function(url, cb) {
  return this.request('GET', url, cb);
};

S.request = function(method, url, body, cb) {
  if (typeof body == 'function') {
    cb = body;
    body = undefined;
  }

  var req = this.$http({
    method: method,
    url: this.url + url,
    data: JSON.stringify(body)
  });

  req.success(cb);

  return req;
}
},{"./job_store":34}]},{},[10,11,12,13,24,25,26,27,28,29,30,31,32,14,15,16,17,18,19,20,21,22,23])
;