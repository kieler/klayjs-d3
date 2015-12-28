/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.name %> version <%= pkg.version %> build ' +
      '<%= grunt.template.today("yyyymmddhhmm") %>*/\n',
      //'<%= pkg.licenseText.join("") %>' +
    // Task configuration.
    clean: [
      'dist/'
    ],
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      dist: {
        options: {
          process: {
            data: {
              worker: "false"
            }
          }
        },
        src: [
          'src/**/*.js',
        ],
        dest: 'dist/<%= pkg.name %>.js'
      },
      dist_ww: {
        options: {
          process: {
            data: {
              worker: "true"
            }
          }
        },
        src: [
          'src/**/*.js',
        ],
        dest: 'dist/<%= pkg.name %>-ww.js'
     }  
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'dist/<%= pkg.name %>.min.js'
      },
      dist_ww: {
        src: '<%= concat.dist_ww.dest %>',
        dest: 'dist/<%= pkg.name %>-ww.min.js'
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        browser: true,
        globals: {
          jQuery: true
        }
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib_test: {
        src: ['lib/**/*.js', 'test/**/*.js']
      }
    },
    //qunit: {
    //  files: ['test/**/*.html']
    //},
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib_test: {
        files: '<%= jshint.lib_test.src %>',
        tasks: ['jshint:lib_test', 'qunit']
      },
      src: {
        files: ['src/**/*.js'],
        tasks: ['jshint', 'concat']
      }
    },
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // Default task.
  grunt.registerTask('default', ['jshint', 'clean', /*'qunit',*/ 'concat', 'uglify']);

};
