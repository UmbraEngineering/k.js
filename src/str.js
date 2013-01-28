
//
// String Package
//
// @author     James Brumond
// @copyright  Copyright 2013 James Brumond
// @license    Dual licensed under MIT and GPL
//

var types = require('./types.js');

var whitespace = ' \t\n\r\f\v';
var letters = 'abcdefghijklmnopqrstuvwxyz';

// ------------------------------------------------------------------

// 
// Repeats a string multiple times
// 
exports.repeat = function(text, count) {
	return new Array(count + 1).join(text);
};

//
// Capitalizes the first letter of each word in a string
//
exports.capitalizeWords = function(text) {
	var ret = '';
	var startOfWord = true;
	for (var i = 0, c = text.length; i < c; i++) {
		var ch = text.charAt(i);
		if (startOfWord) {
			startOfWord = false;
			if (letters.indexOf(ch) > -1) {
				ret += ch.toUpperCase();
			}
		} else {
			ret += ch;
		}
		startOfWord = (whitespace.indexOf(ch) > -1);
	}
	return ret;
};

//
// Pad a number string with zeros to get a minimum length
//
exports.padNumber = function(num, digits) {
	num = String(num);
	var len = num.length;
	if (len < digits) {
		num = exports.repeat('0', digits - len) + num;
	}
	return num;
};

// 
// Replace all occurences of a substring
// 
exports.replaceAll = function(str, search, replace) {
	while (str.indexOf(search) >= 0) {
		str = str.replace(search, replace);
	}
	return str;
};

// ------------------------------------------------------------------

var trimLeft = /^\s+/;
var trimRight = /\s+$/;

//
// Trims whitespace off of a string
//
if (String.prototype.trim) {
	exports.trim = function(text) {
		return text.trim();
	};
} else {
	exports.trim = function(text) {
		return text.replace(trimLeft, '').replace(trimRight, '');
	};
}

// 
// Trims whitespace off the left of a string
// 
if (String.prototype.trimLeft) {
	exports.trimLeft = function(text) {
		return text.trimLeft();
	};
} else {
	exports.trimLeft = function(text) {
		return text.replace(trimLeft, '');
	};
}

// 
// Trims whitespace off the Right of a string
// 
if (String.prototype.trimRight) {
	exports.trimRight = function(text) {
		return text.trimRight();
	};
} else {
	exports.trimRight = function(text) {
		return text.replace(trimRight, '');
	};
}

// ------------------------------------------------------------------

//
// Error constructor for handling errors in string formatting
//
exports.SprintfError = function() {
	Error.apply(this, arguments);
	this.type = 'SprintfError';
};

exports.SprintfError.prototype = new Error();

// ------------------------------------------------------------------

function raise() {
	throw new exports.SprintfError(
		exports.sprintf.apply(exports, arguments)
	);
}

var regexes = {
	notS: /[^s]/,
	def: /[def]/,
	notPercent: /^[^\x25]+/,
	doublePercent: /^\x25{2}/,
	fieldName: /^([a-z_][a-z_\d]*)/i,
	dotFieldName: /^\.([a-z_][a-z_\d]*)/i,
	bracketedDigit: /^\[(\d+)\]/,
	percentEscape: /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/
};

//
// Formats a string using an sprintf style interning
//
// @link    http://www.diveintojavascript.com/projects/javascript-sprintf
//
exports.sprintf = (function() {
	
	var str_format = function() {
		if (! str_format.cache.hasOwnProperty(arguments[0])) {
			str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
		}
		return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
	};

	str_format.format = function(parse_tree, argv) {
		var cursor = 1;
		var tree_length = parse_tree.length;
		var node_type = '';
		var output = [];
		var arg, i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = types.varType(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							raise('property "%s" does not exist', match[2][k]);
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (regexes.notS.test(match[8]) && (get_type(arg) != 'number')) {
					raise('expecting number but found %s', get_type(arg));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = Math.abs(arg); break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (regexes.def.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? exports.repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	str_format.cache = {};
	
	str_format.parse = function(fmt) {
		var _fmt = fmt;
		var match = [];
		var parse_tree = [];
		var arg_names = 0;
		while (_fmt) {
			if ((match = regexes.notPercent.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = regexes.doublePercent.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = regexes.percentEscape.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = regexes.fieldName.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = regexes.dotFieldName.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = regexes.bracketedDigit.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								raise('huh?');
							}
						}
					}
					else {
						raise('huh?');
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					raise('mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				raise('huh?');
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	return str_format;
})();

/**
 * Sprintf as above, but takes an array of values
 *
 * @access  public
 * @param   string    the format string
 * @param   array     the parameters
 * @return  string
 */
exports.vsprintf = function(format, args) {
	args.unshift(format);
	return exports.sprintf.apply(this, args);
};



