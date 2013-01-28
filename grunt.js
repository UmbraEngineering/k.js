
module.exports = function(grunt) {
	grunt.initConfig({
	// Lint
		jshint: {
			options: {
				browser: true,
				bitwise: false,
				camelcase: false,
				eqnull: true,
				latedef: false,
				plusplus: false,
				jquery: true,
				shadow: true,
				smarttabs: true,
				loopfunc: true,
				boss: true
			}
		},
	// Build the application
		hug: {
			simple: {
				src: './src/**/*',
				dest: './build/k.js'
			}
		},
	// JS Min
		min: {
			all: {
				src: './build/k.js',
				dest: './build/k.min.js'
			}
		}
	});
};
		
grunt.registerTask('default', 'lint clean hug min');

grunt.registerTask('clean', function() {
	var fs    = require('fs');
	var path  = require('path');
	
	fs.unlink(relpath('./build/k.js'));
	fs.unlink(relpath('./build/k.min.js'));
	
	function relpath(file) {
		return path.join(__dirname, file);
	}
});
