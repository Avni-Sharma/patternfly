#!/usr/bin/env node
'use strict';

var Rx = require('rxjs/Rx'),
    fs = require('fs-extra'),
    path = require('path'),
    handlebars = require('handlebars'),
    helpers = require('handlebars-helpers')(),
    readdir = Rx.Observable.bindNodeCallback(fs.readdir),
    readFile = Rx.Observable.bindNodeCallback(fs.readFile),
    writeFile = Rx.Observable.bindNodeCallback(fs.writeFile),
    ensureDir = Rx.Observable.bindNodeCallback(fs.ensureDir);

function escapeHtml (string) {
  let entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return entityMap[s];
  });
}

// Register a custom helper
handlebars.registerHelper('include', (filepath)  => {
  let html = fs.readFileSync(filepath, 'utf8');
  return html.trim();
} );

// Register a custom helper
handlebars.registerHelper('template', (filepath)  => {
  let html = '<pre class="prettyprint lang-html">';
  html = html + escapeHtml(fs.readFileSync(filepath, 'utf8').trim());
  html = html + "</pre>";
  // console.log(html)
  return html;
} );

// Register a custom helper
handlebars.registerHelper('code', (filepath, filetype)  => {
  let langClass = typeof filetype === 'string' ? ' lang-'+filetype : '';
  let html = '<pre class="prettyprint'+ langClass +'">';
  let code = fs.readFileSync(filepath, 'utf8').trim();
  html += escapeCode ? escapeHtml(code) : code;
  html += "</pre>";
  // console.log(html)
  return html;
} );

let escapeCode = true;

function builder(sourcePath, distPath, options) {
  options = options || {};
  escapeCode = options.escapeCode || escapeCode;
  return ensureDir(distPath + '/src')
    .switchMap(() => readdir(sourcePath))
    .mergeMap(array => array)
    .filter(filename => path.extname(filename) === '.hbs')
    .mergeMap(filename => {
      return readFile(sourcePath + '/' + filename, 'utf8')
      .map(function(template) {
        var hbs = handlebars.compile(template);
        var data = {
          message : 'Hello World!'
        }
        var html = hbs(data);
        return html;
      })
      .map(html => ({
        html: html,
        path: distPath,
        filename: filename.replace(/\.hbs$/, '.html')
      }))
    })
    .flatMap(result => writeFile(`${result.path}/${result.filename}`, result.html)
      .map(() => `${result.path}/${result.filename}`)
    );
}

module.exports = {
  builder: builder
}
