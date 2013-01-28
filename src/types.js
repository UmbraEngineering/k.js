
// 
// Variable Type Package
// 
// @author     James Brumond
// @copyright  Copyright 2013 James Brumond
// @license    Dual licensed under MIT and GPL
//

// 
// Used for picking out more general type data from a string
// 
var isEvent = /event$/;
var isError = /error$/;
var isNode = function(obj) {
	if (window.Node && obj instanceof window.Node) {return true;}
	return (typeof obj.nodeType === 'number' && typeof obj.nodeName === 'string' && typeof obj.innerHTML === 'string');
};

// 
// Native object types
// 
var nativeTypes = ['object', 'array', 'regexp', 'function', 'date'];

// 
// Convert a value to a string
// 
var toString = (function() {
	var toStr = Object.prototype.toString;
	return function(obj) {
		return toStr.call(obj);
	};
}());

// ------------------------------------------------------------------

// 
// Gets a string with the given variable's type, like typeof, but more specific
// 
exports.varType = function() {
	// Catch nulls
	if (obj === null) {return 'null';}

	// Get the typeof for primatives
	var type = typeof obj;

	// Handle mutables
	if (type === 'object' || type === 'function') {
		// Get type data from Object.prototype.toString.call(obj)
		type = toString(obj).split(' ')[1].substring(-1).toLowerCase();

		// Test for events
		if (isEvent.test(type)) {
			return 'event';
		}

		// Test for errors
		else if (isError.test(type)) {
			return 'error';
		}

		// Test for nodes
		else if (isNode(obj)) {
			return 'node';
		}

		// Check for types that aren't in the "nativeTypes" list and normalize them to "object"
		if (! contains(nativeTypes, type)) {
			return 'object';
		}
	}

	// Catch NaN values
	else if (type === 'number' && isNaN(obj)) {
		return 'nan';
	}

	return type;
};

// ------------------------------------------------------------------

// 
// Test if the given value is defined
// 
exports.isDefined = function(value) {
	return typeof value !== 'undefined';
};

// 
// Test if the given value is defined and not null
// 
exports.isSet = function(value) {
	return value != null;
};

// 
// Test if the given value is a primative (non-mutable)
// 
exports.isPrimative = function(value) {
	var type = typeof value;
	return (type !== 'function' && (type !== 'object' || value === null));
};

// 
// Test for an enumerable
// 
exports.isEnumerable = function(value) {
	return (exports.isArray(value) || exports.isArguments(value) ||
		(typeof exports.length === 'number' && ! value.propertyIsEnumerable('length')));
};

// ------------------------------------------------------------------

// 
// Test for a number
// 
exports.isNumber = function(value) {
	return (typeof value === 'number' && ! isNaN(value));
};

// 
// Test for a string
// 
exports.isString = function(value) {
	return (typeof value === 'string');
};

// 
// Test for a boolean
// 
exports.isBoolean = function(value) {
	return (typeof value === 'boolean');
};

// ------------------------------------------------------------------

// 
// Test for an object
// 
exports.isObject = function(value) {
	return (typeof value === 'object' && value);
};

// 
// Test for a regular expression
// 
exports.isRegexp = function(value) {
	return (toString(value) === '[object RegExp]');
};

// 
// Test for a date object
// 
exports.isDate = function(value) {
	return (toString(value) === '[object Date]');
};

// 
// Test for an array
// 
exports.isArray = function(value) {
	return (toString(value) === '[object Array]');
};

// 
// Test for a function
// 
exports.isFunction = function(value) {
	return (toString(value) === '[object Function]');
};

// ------------------------------------------------------------------

// 
// Test for an error
// 
exports.isError = function(value) {
	return (exports.varType(value) === 'error');
};

// 
// Test for an event
// 
exports.isEvent = function(value) {
	return (exports.varType(value) === 'event');
};

// 
// Test for an arguments object
// 
exports.isArguments = function(value) {
	return (toString(value) === '[object Arguments]' || (exports.isNumber(value.length) && exports.isFunction(value.callee)));
};

// 
// Test for a node list
// 
exports.isNodeList = function(value) {
	return (! exports.isPrimative(value) && exports.isNumber(value.length) && exports.isFunction(value.item) &&
		exports.isFunction(value.nextNode) && exports.isFunction(value.reset));
};
