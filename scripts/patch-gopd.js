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

