#!/usr/bin/env node
'use strict';
// Fix for gopd@1.2.0: some environments (e.g. Render) don't unpack gOPD.js from the package.
// This creates it if missing so require('./gOPD') in gopd/index.js works.
const fs = require('fs');
const path = require('path');

const gopdDir = path.join(__dirname, '..', 'node_modules', 'gopd');
const targetFile = path.join(gopdDir, 'gOPD.js');
const content = "'use strict';\n\n/** @type {import('./gOPD')} */\nmodule.exports = Object.getOwnPropertyDescriptor;\n";

if (fs.existsSync(gopdDir) && !fs.existsSync(targetFile)) {
  try {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('patch-gopd: wrote gOPD.js');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
