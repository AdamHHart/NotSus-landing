// File: scripts/check-migration.js
const fs = require('fs');
const path = require('path');

// Read and display the migration file
try {
    const migrationPath = path.join(__dirname, '..', 'migrations', '00001_initial_schema.js');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    console.log('Current migration file content:');
    console.log(migrationContent);
} catch (err) {
    console.error('Error reading migration file:', err);
}