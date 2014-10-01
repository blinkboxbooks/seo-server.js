'use strict';

module.exports = function (grunt) {

  // load grunt tasks on demand
  require('jit-grunt')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            'dist/*'
          ]
        }]
      }
    },
    jshint: {
      dev: {
        options: {
          jshintrc: '.jshintrc'
        },
        files: [{
          src: [
            'Gruntfile.js',
            'lib/*.js',
            'bin/*.js'
          ]
        }]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        files: [{
          src: [
            'test/**/*.js'
          ]
        }]
      }
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '.',
          dest: 'dist',
          src: [
            'package.json',
            'bin/*',
            'lib/*',
            'node_modules/**/*',
            '!node_modules/grunt*/**',
            '!node_modules/jit-grunt/**'
          ]
        }]
      }
    },
    'update-version': {
      dist: {
        src: 'dist/package.json'
      }
    },
    mochaTest: {
      test: {
        options: {
          // Give PhantomJS process ample time to load the URL and return the result:
          timeout: 5000,
          reporter: 'spec',
          // Require blanket wrapper here to instrument other required
          // files on the fly.
          //
          // NB. We cannot require blanket directly as it
          // detects that we are not running mocha cli and loads differently.
          //
          // NNB. As mocha is 'clever' enough to only run the tests once for
          // each file the following coverage task does not actually run any
          // tests which is why the coverage instrumentation has to be done here
          require: 'blanket'
        },
        src: ['test/**/*.js']
      },
      coverage: {
        options: {
          reporter: 'html-cov',
          // use the quiet flag to suppress the mocha console output
          quiet: true,
          // specify a destination file to capture the mocha
          // output (the quiet option does not suppress this)
          captureFile: 'coverage/coverage.html'
        },
        src: ['test/**/*.js']
      }
    }
  });

  grunt.registerTask('test', [
    'jshint',
    'mochaTest'
  ]);

  grunt.registerTask('build', [
    'jshint',
    'copy',
    'mochaTest'
  ]);

  grunt.registerTask('ci-build', [
    'clean:dist',
    'jshint',
    'mochaTest',
    'copy',
    'update-version'
  ]);

  grunt.registerTask('default', ['build']);

  grunt.registerTask('create-version', function() {
    var buildNumber = process.env.BUILD_NUMBER, // CI build number
      newVersion;
    if (buildNumber) {
      newVersion = grunt.config.get('pkg.version').split('-')[0] + '-' + buildNumber;
      grunt.config.set('pkg.version', newVersion);
    }
  });

  grunt.registerMultiTask('update-version', function () {
    this.filesSrc.forEach(function (file) {
      var pkg = grunt.file.readJSON(file);
      pkg.version = grunt.config.get('pkg.version');
      grunt.file.write(
        file,
          JSON.stringify(pkg, null, 2) + '\n'
      );
      grunt.log.writeln('Updated ' + file.cyan + ' version to ' + pkg.version);
    });
  });

};
