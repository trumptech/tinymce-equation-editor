const { CheckerPlugin } = require('awesome-typescript-loader');
const LiveReloadPlugin = require('webpack-livereload-plugin');
const path = require('path');
const swag = require('@ephox/swag');

module.exports = function (grunt) {
    var packageData = grunt.file.readJSON('package.json');
    var BUILD_VERSION = packageData.version + '-' + (process.env.BUILD_NUMBER ? process.env.BUILD_NUMBER : '0');
    const libPluginPath = 'lib/main/ts/Main.js';
    const scratchPluginPath = 'scratch/compiled/plugin.js';
    const scratchPluginMinPath = 'scratch/compiled/plugin.min.js';
    const tsDemoSourceFile = path.resolve('src/demo/ts/Demo.ts');
    const jsDemoDestFile = path.resolve('scratch/compiled/demo.js');

    grunt.initConfig({
        pkg: packageData,

        clean: {
            dirs: ['dist', 'scratch']
        },

        tslint: {
            options: {
                configuration: 'tslint.json'
            },
            plugin: ['src/**/*.ts']
        },

        shell: {
            command: 'tsc'
        },

        rollup: {
            options: {
                treeshake: true,
                format: 'iife',
                onwarn: swag.onwarn,
                plugins: [
                    swag.nodeResolve({
                        basedir: __dirname,
                        prefixes: {}
                    }),
                    swag.remapImports()
                ]
            },
            plugin: {
                files: [
                    {
                        src: libPluginPath,
                        dest: scratchPluginPath
                    }
                ]
            }
        },

        uglify: {
            plugin: {
                files: [
                    {
                        src: scratchPluginPath,
                        dest: scratchPluginMinPath
                    }
                ]
            }
        },

        concat: {
            license: {
                options: {
                    process: function (src) {
                        var buildSuffix = process.env.BUILD_NUMBER
                            ? '-' + process.env.BUILD_NUMBER
                            : '';
                        return src.replace(
                            /@BUILD_NUMBER@/g,
                            packageData.version + buildSuffix
                        );
                    }
                },
                // scratchPluginMinPath is used twice on purpose, all outputs will be minified for premium plugins
                files: {
                    'dist/equation-editor/plugin.js': [
                        'src/text/license-header.js',
                        scratchPluginMinPath
                    ],
                    'dist/equation-editor/plugin.min.js': [
                        'src/text/license-header.js',
                        scratchPluginMinPath
                    ]
                }
            }
        },

        copy: {
            css: {
                files: [
                    {
                        src: ['LICENSE'],
                        dest: 'dist/equation-editor',
                        expand: true
                    },
                    { src: ['CHANGELOG.md'], dest: 'dist/equation-editor', expand: true },
                    { cwd: 'src/demo/html/editor', src: ['**'], dest: 'dist/equation-editor/editor', expand: true, filter: 'isFile' },
                ]
            }
        },

        webpack: {
            options: {
                mode: 'development',
                watch: true
            },
            dev: {
                entry: tsDemoSourceFile,
                devtool: 'source-map',

                resolve: {
                    extensions: ['.ts', '.js']
                },

                module: {
                    rules: [
                        {
                            test: /\.js$/,
                            use: ['source-map-loader'],
                            enforce: 'pre'
                        },
                        {
                            test: /\.ts$/,
                            use: [
                                {
                                    loader: 'ts-loader',
                                    options: {
                                        transpileOnly: true,
                                        experimentalWatchApi: true
                                    }
                                }
                            ]
                        }
                    ]
                },

                plugins: [new LiveReloadPlugin(), new CheckerPlugin()],

                output: {
                    filename: path.basename(jsDemoDestFile),
                    path: path.dirname(jsDemoDestFile)
                }
            }
        }
    });

    require('load-grunt-tasks')(grunt);
    grunt.loadNpmTasks('@ephox/swag');

    grunt.registerTask('version', 'Creates a version file', function () {
        grunt.file.write('dist/equation-editor/version.txt', BUILD_VERSION);
    });

    grunt.registerTask('default', [
        'clean',
        'tslint',
        // 'shell',
        'rollup',
        'uglify',
        'concat',
        'copy',
        'version'
    ]);
};
