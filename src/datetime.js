
// 
// Date/time Package
//
// @author     James Brumond
// @copyright  Copyright 2013 James Brumond
// @license    Dual licensed under MIT and GPL
//

var utils  = require('./utils.js');
var ee2    = require('./eventemitter2.js');

// ------------------------------------------------------------------

// 
// Get a timestamp for the current time
// 
exports.now = function() {
	return +(new Date);
};

// ------------------------------------------------------------------

// 
// Shim for window.requestAnimationFrame
// 
(function() {
	var lastTime = 0;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	var funcs = {
		request: window.requestAnimationFrame,
		cancel: window.cancelAnimationFrame
	};

	// 
	// Find a vendor prefixed requestAnimationFrame method
	// 
	for (var i = 0, c = vendors.length; i < c && ! funcs.request; i++) {
		funcs.request = window[vendors[i] + 'RequestAnimationFrame'];
		funcs.cancel = window[vendors[i] + 'RequestCancelAnimationFrame'];
	}

	// 
	// Shim requestAnimationFrame if none was found
	// 
	if (! funcs.request) {
		funcs.request = function(callback, element) {
			var currTime = exports.now();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			
			lastTime = currTime + timeToCall;

			return window.setTimeout(utils.bind(callback, window, timeToCall), timeToCall);
		};
	}

	// 
	// Shim cancelAnimationFrame if none was found
	// 
	if (! funcs.cancel) {
		funcs.cancel = function(id) {
			clearTimeout(id);
		};
	}

	// 
	// Expose the shimmed methods
	// 
	exports.requestAnimationFrame = utils.bind(funcs.request, window);
	exports.cancelAnimationFrame = utils.bind(funcs.cancel, window);
}());

// ------------------------------------------------------------------

// 
// Timer Class
// 
exports.Timer = function() {
	this._running    = false;
	this._total      = 0;
	this._startTime  = 0;
	this._lastLap    = 0;
};

// 
// Start the timer
// 
exports.Timer.prototype.start = function() {
	if (! this._running) {
		this._running = true;
		this._startTime = exports.now();
	}
};

// 
// Stop/pause the timer
// 
exports.Timer.prototype.stop = function() {
	if (this._running) {
		this._lastLap = this.currentLap();
		this._running = false;
		this._total += this._lastLap;
	}
};

// 
// Get the amount of time counted since the last call to this.start
// 
exports.Timer.prototype.currentLap = function() {
	return this._running ? exports.now() - this._startTime : this._lastLap;
};

// 
// Get the current time counted
// 
exports.Timer.prototype.current = function() {
	return this._total + ((this._running) ? this.currentLap() : 0);;
};

// 
// Reset the count to 0
// 
exports.Timer.prototype.reset = function() {
	this._total = 0;
	this._startTime = this._running ? exports.now() ? 0;
	this._lastLap = 0;
};

// ------------------------------------------------------------------

// 
// Tween Class
// 
exports.Tween = function(opts) {
	ee2.EventEmitter2.call(this, {
		wildcard: false,
		delimiter: '.',
		newListener: false,
		maxListeners: 20
	});

	this._state     = 0;
	this._timer     = new exports.Timer();
	this._timeout   = null;
	this._running   = false;
	this._finished  = false;
	this._opts      = this._parseOptions(opts);

	// Bind this now so we don't have to do it on every frame
	this._onFrame = utils.bind(this._onFrame, this);
};

// 
// Default config options
// 
exports.Tween.defaults = {
	total: null,
	useRaf: false,
	interval: 25,
	after: null,
	algo: 'linear'
};

// 
// Tweens should inherit EventEmitter2
// 
exports.Tween.prototype = new ee2.EventEmitter2();

// 
// Parse the options object
// 
exports.Tween.prototype._parseOptions = function(opts) {
	opts = utils.merge({ }, exports.Tween.defaults, opts || { });

	if (typeof opts.algo === 'string') {
		opts.algo = exports.Tween.algorithms[opts.algo];
	}

	return opts;
};

// 
// Use requestAnimationFrame/setTimeout based on the options
// 
exports.Tween.prototype._requestTweenFrame = function(func) {
	if (this.opts.useRaf) {
		this._timeout = exports.requestAnimationFrame(func);
	} else {
		this._timeout = window.setTimeout(func, opts.interval);
	}
};

// 
// Cancel the frame stored at this._timeout
// 
exports.Tween.prototype._cancelTweenFrame = function() {
	if (this.opts.useRaf) {
		exports.cancelAnimationFrame(this._timeout);
	} else {
		window.clearTimeout(this._timeout);
	}
};

// 
// Run the next frame
// 
exports.Tween.prototype._nextFrame = function() {
	if (this._running) {
		this._requestTweenFrame(this._onFrame);
	}
};

// 
// Do the calculations for a single frame
// 
exports.Tween.prototype._onFrame = function() {
	var current = this._timer.current();
	
	// Calculate the current state
	this._state = this._opts.algo(
		current / this._opts.total,
		current,
		0, 1, // The expected range
		this._opts.total
	);
	
	// Check if we are finished running
	if (this._state >= 1 || current >= this._opts.total) {
		this._state = 1;
		this._running = false;
		this._finished = true;
	}
	
	// Emit the frame event with the current state
	this.emit('frame', state);

	// Either continue with the next frame or clean up it finished
	if (this._running) {
		this._nextFrame();
	} else if (this._finished) {
		this.emit('finished');
	}
};

// 
// Start running the tween
// 
exports.Tween.prototype.start = function() {
	if (! this._running) {
		this.emit('start');
		this._running = true;
		this._timer.start();
		this._nextFrame();
	}
};

// 
// Stop/pause the tween
// 
exports.Tween.prototype.stop = function() {
	if (this._running) {
		this.emit('stop');
		this._running = false;
		this._cancelTweenFrame();
		this._timer.stop();
	}
};

// 
// Reset the tween to 0
// 
exports.Tween.prototype.reset = function() {
	this.emit('reset');
	this.stop();
	this._state = 0;
	this._finished = false;
	this._timer.reset();
};

// ------------------------------------------------------------------
		
// 
// Many of these algorithms borrowed from jQuery and jQuery Easing Plugin
//
// @link  http://jquery.com
// @link  http://gsgd.co.uk/sandbox/jquery/easing/
// 
exports.Tween.algorithms = {
	// The basic linear algorithm
	linear: function(p, n, firstNum, diff) {
		return firstNum + diff * p;
	},
	// A curvy algorithm
	swing: function(p, n, firstNum, diff) {
		return ((-Math.cos(p * Math.PI) / 2) + 0.5) * diff + firstNum;
	},
	// A bouncy curve algorithm
	bounce: function(p, n, firstNum, diff, d) {
		if ((n /= d) < (1 / 2.75)) {
			return diff * (7.5625 * n * n) + firstNum;
		} else if (n < (2 / 2.75)) {
			return diff * (7.5625 * (n -= (1.5 / 2.75)) * n + .75) + firstNum;
		} else if (n < (2.5 / 2.75)) {
			return diff * (7.5625 * (n -= (2.25 /2.75 )) * n + .9375) + firstNum;
		} else {
			return diff * (7.5625 * (n -= (2.625 / 2.75)) * n + .984375) + firstNum;
		}
	},
	// A linear step algorithm
	step: function(p, n, firstNum, diff) {
		var value = pkg.Tween.algorithms.linear(p, n, firstNum, diff);
		if (value === 0) { return 0; }
		if (value > 0 && value <= 0.2) { return 0.2; }
		if (value > 0.2 && value <= 0.4) { return 0.4; }
		if (value > 0.4 && value <= 0.6) { return 0.6; }
		if (value > 0.6 && value <= 0.8) { return 0.8; }
		if (value > 0.8 && value <= 1.0) { return 1.0; }
	},
// Some more algorithms, borrowed from jQuery Easing Plugin
	easeInQuad: function (x, t, b, c, d) {
		return c*(t/=d)*t + b;
	},
	easeOutQuad: function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic: function (x, t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (x, t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine: function (x, t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine: function (x, t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine: function (x, t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo: function (x, t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (x, t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (x, t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc: function (x, t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (x, t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158; 
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce: function (x, t, b, c, d) {
		return c - pkg.Tween.algoritms.easeOutBounce (x, d-t, 0, c, d) + b;
	},
	easeOutBounce: function (x, t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (x, t, b, c, d) {
		if (t < d/2) return pkg.Tween.algoritms.easeInBounce (x, t*2, 0, c, d) * .5 + b;
		return pkg.Tween.algoritms.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
};

// ------------------------------------------------------------------

// 
// Date/time formatter
// @link  http://blog.stevenlevithan.com/archives/date-time-format
// 
// Allowed formatting tokens:
//
//  d         - Day of the month as digits; no leading zero for single-digit days
//  dd        - Day of the month as digits; leading zero for single-digit days
//  ddd       - Day of the week as a three-letter abbreviation
//  dddd      - Day of the week as its full name.
//  m         - Month as digits; no leading zero for single-digit months.
//  mm        - Month as digits; leading zero for single-digit months.
//  mmm       - Month as a three-letter abbreviation.
//  mmmm      - Month as its full name.
//  yy        - Year as last two digits; leading zero for years less than 10.
//  yyyy      - Year represented by four digits.
//  h         - Hours; no leading zero for single-digit hours (12-hour clock).
//  hh        - Hours; leading zero for single-digit hours (12-hour clock).
//  H         - Hours; no leading zero for single-digit hours (24-hour clock).
//  HH        - Hours; leading zero for single-digit hours (24-hour clock).
//  M         - Minutes; no leading zero for single-digit minutes.
//  MM        - Minutes; leading zero for single-digit minutes.
//  s         - Seconds; no leading zero for single-digit seconds.
//  ss        - Seconds; leading zero for single-digit seconds.
//  l or L    - Milliseconds. l gives 3 digits. L gives 2 digits.
//  t         - Lowercase, single-character time marker string: a or p.
//  tt        - Lowercase, two-character time marker string: am or pm.
//  T         - Uppercase, single-character time marker string: A or P.
//  TT        - Uppercase, two-character time marker string: AM or PM.
//  Z         - US timezone abbreviation, e.g. EST or MDT. With non-US timezones
//              or in the Opera browser, the GMT/UTC offset is returned, e.g. GMT-0500
//  o         - GMT/UTC timezone offset, e.g. -0500 or +0230.
//  S         - The date's ordinal suffix (st, nd, rd, or th). Works well with d.
//  '' or ""  - Literal character sequence. Surrounding quotes are removed.
// 

var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
var timezoneClip = /[^-+\dA-Z]/g;

var pad = function (val, len) {
	val = val + '';
	len = len || 2;
	while (val.length < len) {
		val = "0" + val;
	}
	return val;
};

exports.format = function(date, mask, utc) {
	// Get a Date object
	var type = typeof date;
	if (type === 'undefined') {
		date = new Date();
	} else if (type === 'string' || type === 'number') {
		date = new Date(date);
	}
	if (! types.isDate(date) || isNaN(date)) {
		return false;
	}
	// Get the format mask
	mask = (exports.format.masks[mask] || mask || exports.format.masks["default"]) + '';
	// Get the date information
	var
	_ = utc ? "getUTC" : "get",
	d = date[_ + "Date"](),
	D = date[_ + "Day"](),
	m = date[_ + "Month"](),
	y = date[_ + "FullYear"](),
	H = date[_ + "Hours"](),
	M = date[_ + "Minutes"](),
	s = date[_ + "Seconds"](),
	L = date[_ + "Milliseconds"](),
	o = utc ? 0 : date.getTimezoneOffset(),
	flags = {
		d:    d,
		dd:   pad(d),
		ddd:  exports.format.dayNames[D],
		dddd: exports.format.dayNames[D + 7],
		m:    m + 1,
		mm:   pad(m + 1),
		mmm:  exports.format.monthNames[m],
		mmmm: exports.format.monthNames[m + 12],
		yy:   String(y).slice(2),
		yyyy: y,
		h:    H % 12 || 12,
		hh:   pad(H % 12 || 12),
		H:    H,
		HH:   pad(H),
		M:    M,
		MM:   pad(M),
		s:    s,
		ss:   pad(s),
		l:    pad(L, 3),
		L:    pad(L > 99 ? Math.round(L / 10) : L),
		t:    H < 12 ? "a"  : "p",
		tt:   H < 12 ? "am" : "pm",
		T:    H < 12 ? "A"  : "P",
		TT:   H < 12 ? "AM" : "PM",
		Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
		o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
		S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
	};
	// Build and return the formatted string
	return mask.replace(token, function ($0) {
		return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
	});
};

// ----------------------------------------------------------------------------
//  Build the list of day/month names and masks for the format function

exports.format.dayNames = [
	'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
	'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

exports.format.monthNames = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

exports.format.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};
