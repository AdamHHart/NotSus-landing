#!/usr/bin/env node
'use strict';
// Patch node_modules where npm install on Render omits files from published packages.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'node_modules');

// 1. gopd@1.2.0: missing gOPD.js
const gopdDir = path.join(root, 'gopd');
const gopdFile = path.join(gopdDir, 'gOPD.js');
const gopdContent = "'use strict';\n\n/** @type {import('./gOPD')} */\nmodule.exports = Object.getOwnPropertyDescriptor;\n";
if (fs.existsSync(gopdDir) && !fs.existsSync(gopdFile)) {
  fs.writeFileSync(gopdFile, gopdContent, 'utf8');
  console.log('patch-deps: wrote gopd/gOPD.js');
}

// 2. validator: missing lib/util/nullUndefinedCheck.js
const validatorUtil = path.join(root, 'validator', 'lib', 'util');
const validatorFile = path.join(validatorUtil, 'nullUndefinedCheck.js');
const validatorContent = [
  '"use strict";',
  '',
  'Object.defineProperty(exports, "__esModule", { value: true });',
  'exports.default = isNullOrUndefined;',
  'function isNullOrUndefined(value) { return value === null || value === undefined; }',
  'module.exports = exports.default;',
  'module.exports.default = exports.default;'
].join('\n');
if (fs.existsSync(validatorUtil) && !fs.existsSync(validatorFile)) {
  fs.writeFileSync(validatorFile, validatorContent, 'utf8');
  console.log('patch-deps: wrote validator/lib/util/nullUndefinedCheck.js');
}
