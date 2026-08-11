const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
const schemaPath = path.join(root, 'prisma', 'schema.prisma');
const migrationPath = path.join(root, 'prisma', 'migrations', '20260811120000_init', 'migration.sql');

const sql = execFileSync(process.execPath, [
  prismaCli,
  'migrate', 'diff',
  '--from-empty',
  '--to-schema-datamodel', schemaPath,
  '--script',
], { encoding: 'utf8', cwd: root });

fs.writeFileSync(migrationPath, sql, { encoding: 'utf8' });
console.log('Migration SQL written:', migrationPath, '(' + sql.length + ' bytes)');
