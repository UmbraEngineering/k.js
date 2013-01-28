//
// Cookies Package
//
// @author     James Brumond
// @copyright  Copyright 2013 James Brumond
// @license    Dual licensed under MIT and GPL
//
	
// 
// Check if cookies are supported in this client
// 
exports.support = (function() {
	var flag = null;
	// The actual support test
	return function() {
		if (flag === null) {
			var cookie = '_test' + (+new Date);
			var cookieStr = exports.write(cookie, 'testing');
			if (document.cookie !== cookieStr && exports.read(cookie)) {
				flag = true;
				exports.del(cookie);
			} else {
				flag = false;
				document.cookie = void(0);
			}
		}
		return flag;
	};
}());

// 
// Get a list of all cookies
//
exports.list = function() {
	var result = [ ];
	var cookies = document.cookie.split(';');
	for (var i = 0, c = cookies.length; i < c; i++) {
		if (cookies[i] === '') {continue;}
		result.push(cookies[i].split('=')[0]);
	}
	return result;
};

//
// Read a cookie's value
//
exports.read = function(name) {
	var nameEq = name + '=';
	var cookies = document.cookie.split(';');
	for (var i = 0, c = cookies.length; i < c; i++) {
		var cookie = cookies[i];
		while (cookie.charAt(0) === ' ') {
			cookie = cookie.substring(1);
		}
		if (cookie.indexOf(nameEq) === 0) {
			return cookie.substring(nameEq.length);
		}
	}
	return null;
};

//
// Write a cookie
//
exports.write = function(name, value, expires, path, domain, httpOnly, secure) {
	var cookieStr = name + '=' + value;
	// Add the expiration
	if (expires) {
		var date = new Date();
		date.setTime(date.getTime() + expires);
		cookieStr += '; expires=' + date.toGMTString();
	}
	// Add the path
	cookieStr += '; path=' + (path || '/');
	// Add the domain
	if (domain) {
		cookieStr += '; domain=' + domain;
	}
	// Add the httpOnly flag
	if (httpOnly) {
		cookieStr += '; httpOnly';
	}
	// Add the secure flag
	if (secure) {
		cookieStr += '; secure';
	}
	// Set the cookie
	document.cookie = cookieStr;
	return cookieStr;
};

//
// Delete a cookie
//
exports.del = function(name) {
	exports.write(name, '', -1);
};

//
// Encodes semicolons as %3B
//
exports.encode = function(str) {
	while (str.indexOf(';') >= 0) {
		str = str.replace(';', '%3B');
	}
	return str;
};

//
// Decodes semicolons from %3B
//
exports.decode = function(str) {
	while (str.indexOf('%3B') >= 0) {
		str = str.replace('%3B', ';');
	}
	return str;
};
