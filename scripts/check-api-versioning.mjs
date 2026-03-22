#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routesDir = path.join(root, 'apps/smartpay-backend/src/routes');
const indexFile = path.join(root, 'apps/smartpay-backend/src/index.ts');

const allowedLegacyPrefixes = ['/api/copilot', '/api/buffr', '/api/obs'];
const routePattern = /router\.(?:get|post|put|patch|delete|use)\(\s*['"`]([^'"`]+)['"`]/g;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

function isAllowedLegacy(p) {
  return allowedLegacyPrefixes.some((prefix) => p.startsWith(prefix));
}

const violations = [];
for (const file of walk(routesDir)) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = routePattern.exec(content)) !== null) {
    const p = match[1];
    if (!p.startsWith('/api/')) continue;
    if (p.startsWith('/api/v1/')) continue;
    if (isAllowedLegacy(p)) continue;
    violations.push({
      file: path.relative(root, file),
      path: p,
    });
  }
}

const indexContent = fs.readFileSync(indexFile, 'utf8');
const requiredAliases = [
  "app.use('/api/v1/buffr', buffrRoutes);",
  "app.use('/api/v1/buffr', buffrWebhooks);",
];
const missingAliases = requiredAliases.filter((s) => !indexContent.includes(s));

if (violations.length > 0 || missingAliases.length > 0) {
  console.error('API versioning check failed for fintech.');
  if (violations.length > 0) {
    console.error('\nUnexpected unversioned routes:');
    for (const v of violations) {
      console.error(`- ${v.path} (${v.file})`);
    }
  }
  if (missingAliases.length > 0) {
    console.error('\nMissing required /api/v1 aliases in index.ts:');
    for (const m of missingAliases) console.error(`- ${m}`);
  }
  process.exit(1);
}

console.log('API versioning check passed for fintech.');
