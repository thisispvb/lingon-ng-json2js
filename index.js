var util = require('util');
var path = require('path');
var gutil = require('gulp-util');
var map = require('map-stream');

var TEMPLATE = '(function(module) {\n' +
  '  try {\n' +
  '    module = angular.module(\'%s\');\n' +
  '  } catch (e) {\n' +
  '    module = angular.module(\'%s\', []);\n' +
  '  }\n' +
  '  module.run([\'$cacheFactory\', function($cacheFactory) {\n' +
  '    ($cacheFactory.get(\'%s\') || $cacheFactory(\'%s\')).put(\'%s\',\n      %s);\n' +
  '  }]);\n' +
  '})();\n';

/**
 * Converts JSON files into Javascript files which contain an AngularJS module which automatically pre-loads the JSON
 * file into the [$cacheFactory](http://docs.angularjs.org/api/ng.$cacheFactory).
 * @param [options] - The plugin options
 * @param [options.moduleName] - The name of the module which will be generated. When omitted the fileUrl will be used.
 * @param [options.stripPrefix] - The prefix which should be stripped from the file path
 * @param [options.prefix] - The prefix which should be added to the start of the url
 * @returns {stream}
 */
module.exports = function(options) {
  'use strict';

  options = options || {};
  options.moduleName = options.moduleName || 'templates';

  function ngJson2js(file, callback) {
    if(file.isStream()) {
      return callback(new Error('lingon-ng-json2js: Streaming not supported'));
    }

    if(file.isBuffer()) {
      var filePath = getFileUrl(file, options);
      file.contents = new Buffer(generateModuleDeclaration(filePath, String(file.contents), options));
      file.path = gutil.replaceExtension(file.path, '.js');
    }

    return callback(null, file);
  }

  /**
   * Generates the Javascript code containing the AngularJS module which puts the JSON file into the $cacheFactory.
   * @param fileUrl - The url with which the JSON will be registered in the $cacheFactory.
   * @param contents - The contents of the JSON file.
   * @param [options] - The plugin options
   * @param [options.moduleName] - The name of the module which will be generated. When omitted the fileUrl will be used.
   * @returns {string} - The generated Javascript code.
   */
  function generateModuleDeclaration(fileUrl, contents, options) {
    var escapedContent = escapeContent(fileUrl, contents);
    if(escapedContent) {
      return util.format(TEMPLATE, options.moduleName, options.moduleName, options.moduleName, options.moduleName, fileUrl, escapedContent);
    } else {
      return '/* Invalid JSON syntax in "' + fileUrl + '", skipping content. */\n';
    }
  }

  /**
   * Generates the url of a file.
   * @param file - The file for which a url should be generated
   * @param [options] - The plugin options
   * @param [options.stripPrefix] - The prefix which should be stripped from the file path
   * @param [options.prefix] - The prefix which should be added to the start of the url
   * @returns {string}
   */
  function getFileUrl(file, options) {
    // Start with the relative file path
    var base = (options && options.base) ? options.base : file.base;
    var url = path.relative(base, file.path);

    // Replace '\' with '/' (Windows)
    url = url.replace(/\\/g, '/');

    // Remove the stripPrefix
    if(options && options.stripPrefix && url.indexOf(options.stripPrefix) === 0) {
      url = url.replace(options.stripPrefix, '');
    }
    // Add the prefix
    if(options && options.prefix) {
      url = options.prefix + url;
    }

    return url;
  }

  /**
   * Escapes the content of an string so it can be used in a Javascript string declaration
   * @param {string} content
   * @returns {string}
   */
  function escapeContent(fileUrl, content) {
    try  {
      return JSON.stringify(JSON.parse(content));
    } catch(e) {}
  }

  return map(ngJson2js);
};
