
// 
// Utilities Package
//
// @author     James Brumond
// @copyright  Copyright 2013 James Brumond
// @license    Dual licensed under MIT and GPL
// 

var types = require('./types.js');

// ------------------------------------------------------------------

// 
// Shim for Function::bind
// 
if (Function.prototype.bind) {
	exports.bind = function(func) {
		var args = exports.slice(arguments, 1);
		return func.bind.apply(func, args);
	};
} else {
	exports.bind = function(func, scope) {
		var args = exports.slice(arguments, 2);
		return function() {
			var argv = args.concat(exports.slice(arguments));
			return func.apply(scope, argv);
		}
	};	
}

// ------------------------------------------------------------------

// 
// Shim for Array::forEach
// 
if (Array.prototype.forEach) {
	exports.forEach = function(arr, func, scope) {
		return arr.forEach(func);
	};
} else {
	exports.forEach = function(arr, func, scope) {
		for (var i = 0, c = arr.length; i < c; i++) {
			func.call(scope, arr[i], i, arr);
		}
	};
}

// ------------------------------------------------------------------

// 
// Shim for Object::keys
// 
if (Object.prototype.keys) {
	exports.keys = function(obj) {
		return Object.keys(obj);
	};
} else {
	exports.keys = (function() {
		var hasOwnProperty = Object.prototype.hasOwnProperty,
		hasDontEnumBug =! ({ toString: null }).propertyIsEnumerable('toString'),
		dontEnums = [
			'toString',
			'toLocaleString',
			'valueOf',
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
			'constructor'
		],
		dontEnumsLength = dontEnums.length;
 
		return function(obj) {
			if (types.isPrimative(obj)) throw new TypeError('Object.keys called on non-object');
 
			var result = [];
 
			for (var prop in obj) {
				if (hasOwnProperty.call(obj, prop)) {
					result.push(prop);
				}
			}
 
			if (hasDontEnumBug) {
				for (var i=0; i < dontEnumsLength; i++) {
					if (hasOwnProperty.call(obj, dontEnums[i])) {
						result.push(dontEnums[i]);
					}
				}
			}

			return result;
		};
	})();
}

// ------------------------------------------------------------------

// 
// Convert an array-like object to an array
// 
var slice = Array.prototype.slice;
exports.slice = exports.toArray = function(arr, index) {
	return slice.call(arr, index);
};

// ------------------------------------------------------------------

// 
// Flat merge
// 
exports.merge = function(host) {
	var donors = exports.slice(arguments, 1);
	exports.forEach(donors, function(donor) {
		exports.forEach(exports.keys(donor), function(key) {
			host[key] = donor[key];
		});
	});
	return host;
};

// 
// Flat, selective merge
// 
exports.merge.selective = function(keys, host) {
	var donors = exports.slice(arguments, 1);
	exports.forEach(donors, function(donor) {
		exports.forEach(keys, function(key) {
			host[key] = donor[key];
		});
	});
	return host;
};

// 
// Recursive merge
// 
exports.merge.recursive = function(host) {
	var donors = exports.slice(arguments, 1);
	exports.forEach(donors, function(donor) {
		exports.forEach(exports.keys(donor), recurser(host, donor));
	});
	return host;
};

// 
// Recursive, selective merge
// 
exports.merge.selective.recursive = function(keys, host) {
	var donors = slice(arguments, 1);
	exports.forEach(donors, function(donor) {
		exports.forEach(keys, recurser(host, donor));
	});
	return host;
};

// 
// Used by the recursive merge functions for walking the object structure
// 
function recurser(host, donor) {
	return function(key) {
		if (types.isObject(donor[key])) {
			if (types.isObject(host[key])) {
				exports.merge.recursive(host[key], donor[key]);
			} else {
				var base = types.isArray(donor[key]) ? [ ] : { };
				host[key] = exports.recursive(base, donor[key]);
			}
		} else {
			host[key] = donor[key];
		}
	};
}
