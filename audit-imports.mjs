#!/usr/bin/env node
/**
 * Comprehensive audit script for Buffr G2P mobile app
 * Checks imports, navigation routes, components, and backend endpoints
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileDir = join(__dirname, 'mobile');
const appDir = join(mobileDir, 'app');
const componentsDir = join(mobileDir, 'components');
const backendDir = join(__dirname, 'backend', 'src');

const issues = {
  missingScreens: [],
  missingComponents: [],
  brokenImports: [],
  brokenNavigation: [],
  missingBackendEndpoints: [],
  verified: {
    screens: [],
    components: [],
    navigation: [],
  }
};

// ===== Helper Functions =====

function getAllFiles(dir, fileList = [], ext = ['.tsx', '.ts']) {
  if (!existsSync(dir)) return fileList;
  
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      if (!file.startsWith('.') && !file.includes('node_modules')) {
        getAllFiles(filePath, fileList, ext);
      }
    } else {
      if (ext.some(e => file.endsWith(e))) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

function resolveImportPath(importPath, currentFile, baseDir) {
  // Handle @/ alias
  if (importPath.startsWith('@/')) {
    return join(mobileDir, importPath.replace('@/', ''));
  }
  
  // Handle relative imports
  if (importPath.startsWith('.')) {
    return join(dirname(currentFile), importPath);
  }
  
  return null;
}

function checkFileExists(path) {
  // Try exact path
  if (existsSync(path)) return true;
  
  // Try with extensions
  const extensions = ['.tsx', '.ts', '.js', '.jsx', ''];
  for (const ext of extensions) {
    if (existsSync(path + ext)) return true;
  }
  
  // Try index files
  if (existsSync(join(path, 'index.tsx'))) return true;
  if (existsSync(join(path, 'index.ts'))) return true;
  
  return false;
}

// ===== Audit Functions =====

function auditImports(files) {
  console.log('\n🔍 Auditing imports...');
  
  const importRegex = /import\s+(?:{[^}]+}|[\w\s,*]+)\s+from\s+['"]([^'"]+)['"]/g;
  
  files.forEach(file => {
    try {
      const content = readFileSync(file, 'utf8');
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Skip node_modules imports
        if (!importPath.startsWith('@/') && !importPath.startsWith('.')) {
          continue;
        }
        
        const resolvedPath = resolveImportPath(importPath, file, mobileDir);
        if (resolvedPath && !checkFileExists(resolvedPath)) {
          issues.brokenImports.push({
            file: file.replace(__dirname + '/', ''),
            import: importPath,
            resolved: resolvedPath.replace(__dirname + '/', '')
          });
        }
      }
    } catch (e) {
      console.error(`Error reading ${file}:`, e.message);
    }
  });
  
  console.log(`  Found ${issues.brokenImports.length} broken imports`);
}

function auditNavigation(files) {
  console.log('\n🧭 Auditing navigation routes...');
  
  const routerPushRegex = /router\.(push|replace)\(['"]([^'"]+)['"]\)/g;
  const hrefRegex = /href=['"]([^'"]+)['"]/g;
  
  files.forEach(file => {
    try {
      const content = readFileSync(file, 'utf8');
      let match;
      
      // Check router.push/replace
      while ((match = routerPushRegex.exec(content)) !== null) {
        const route = match[2];
        const routePath = join(appDir, route);
        
        // Check if route exists (as file or directory with index)
        const exists = checkFileExists(routePath + '.tsx') || 
                      checkFileExists(routePath + '/index.tsx') ||
                      existsSync(routePath);
        
        if (!exists) {
          issues.brokenNavigation.push({
            file: file.replace(__dirname + '/', ''),
            route: route,
            type: match[1]
          });
        } else {
          issues.verified.navigation.push(route);
        }
      }
      
      // Check href links
      while ((match = hrefRegex.exec(content)) !== null) {
        const route = match[1];
        if (!route.startsWith('http')) {
          const routePath = join(appDir, route);
          const exists = checkFileExists(routePath + '.tsx') || 
                        checkFileExists(routePath + '/index.tsx') ||
                        existsSync(routePath);
          
          if (!exists) {
            issues.brokenNavigation.push({
              file: file.replace(__dirname + '/', ''),
              route: route,
              type: 'href'
            });
          } else {
            issues.verified.navigation.push(route);
          }
        }
      }
    } catch (e) {
      console.error(`Error reading ${file}:`, e.message);
    }
  });
  
  console.log(`  Found ${issues.brokenNavigation.length} broken navigation links`);
  console.log(`  Verified ${[...new Set(issues.verified.navigation)].length} working routes`);
}

function auditScreens() {
  console.log('\n📱 Auditing screens...');
  
  const screenFiles = getAllFiles(appDir, [], ['.tsx']);
  issues.verified.screens = screenFiles.map(f => f.replace(__dirname + '/', ''));
  
  console.log(`  Found ${screenFiles.length} screen files`);
}

function auditComponents() {
  console.log('\n🧩 Auditing components...');
  
  const componentFiles = getAllFiles(componentsDir, [], ['.tsx', '.ts']);
  issues.verified.components = componentFiles.map(f => f.replace(__dirname + '/', ''));
  
  console.log(`  Found ${componentFiles.length} component files`);
}

function auditBackendEndpoints() {
  console.log('\n🔌 Auditing backend API endpoints...');
  
  // Extract endpoints called from mobile
  const mobileServiceFiles = getAllFiles(join(mobileDir, 'services'), [], ['.ts']);
  const calledEndpoints = new Set();
  
  const apiCallRegex = /['"`](\/api\/[^'"`]+)['"`]/g;
  
  mobileServiceFiles.forEach(file => {
    try {
      const content = readFileSync(file, 'utf8');
      let match;
      while ((match = apiCallRegex.exec(content)) !== null) {
        calledEndpoints.add(match[1]);
      }
    } catch (e) {
      // Skip
    }
  });
  
  // Extract endpoints defined in backend
  const backendFiles = getAllFiles(backendDir, [], ['.ts']);
  const definedEndpoints = new Set();
  
  const endpointDefRegex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
  
  backendFiles.forEach(file => {
    try {
      const content = readFileSync(file, 'utf8');
      let match;
      while ((match = endpointDefRegex.exec(content)) !== null) {
        definedEndpoints.add(match[2]);
      }
    } catch (e) {
      // Skip
    }
  });
  
  console.log(`  Mobile calls ${calledEndpoints.size} unique endpoints`);
  console.log(`  Backend defines ${definedEndpoints.size} unique endpoints`);
  
  // Check for missing endpoints
  calledEndpoints.forEach(endpoint => {
    // Normalize endpoint (handle params like :id)
    const normalized = endpoint.replace(/\/[^/]*\$\{[^}]+\}/g, '/:param');
    
    let found = false;
    definedEndpoints.forEach(def => {
      if (def === normalized || def.replace(/:\w+/g, ':param') === normalized.replace(/:\w+/g, ':param')) {
        found = true;
      }
    });
    
    if (!found) {
      issues.missingBackendEndpoints.push({
        endpoint: endpoint,
        normalized: normalized
      });
    }
  });
  
  console.log(`  Found ${issues.missingBackendEndpoints.length} potentially missing endpoints`);
}

// ===== Main Audit =====

console.log('═══════════════════════════════════════════════════');
console.log('  BUFFR G2P MOBILE APP - COMPREHENSIVE AUDIT');
console.log('═══════════════════════════════════════════════════');

const allFiles = getAllFiles(appDir, [], ['.tsx', '.ts']);

auditScreens();
auditComponents();
auditImports(allFiles);
auditNavigation(allFiles);
auditBackendEndpoints();

// ===== Generate Report =====

console.log('\n═══════════════════════════════════════════════════');
console.log('  AUDIT REPORT');
console.log('═══════════════════════════════════════════════════');

console.log('\n✅ VERIFIED:');
console.log(`  - Screens: ${issues.verified.screens.length}`);
console.log(`  - Components: ${issues.verified.components.length}`);
console.log(`  - Working navigation links: ${[...new Set(issues.verified.navigation)].length}`);

if (issues.brokenImports.length > 0) {
  console.log('\n❌ BROKEN IMPORTS:');
  issues.brokenImports.forEach(item => {
    console.log(`  ${item.file}`);
    console.log(`    → imports: ${item.import}`);
    console.log(`    → resolved to: ${item.resolved} (NOT FOUND)`);
  });
}

if (issues.brokenNavigation.length > 0) {
  console.log('\n❌ BROKEN NAVIGATION:');
  const uniqueRoutes = [...new Set(issues.brokenNavigation.map(i => i.route))];
  uniqueRoutes.forEach(route => {
    const files = issues.brokenNavigation.filter(i => i.route === route);
    console.log(`  Route: ${route}`);
    files.forEach(f => console.log(`    → used in: ${f.file}`));
  });
}

if (issues.missingBackendEndpoints.length > 0) {
  console.log('\n❌ MISSING BACKEND ENDPOINTS:');
  issues.missingBackendEndpoints.forEach(item => {
    console.log(`  ${item.endpoint}`);
  });
}

if (issues.brokenImports.length === 0 && 
    issues.brokenNavigation.length === 0 && 
    issues.missingBackendEndpoints.length === 0) {
  console.log('\n🎉 NO CRITICAL ISSUES FOUND!');
}

console.log('\n═══════════════════════════════════════════════════\n');

// Exit with error code if issues found
if (issues.brokenImports.length > 0 || 
    issues.brokenNavigation.length > 0 || 
    issues.missingBackendEndpoints.length > 0) {
  process.exit(1);
}
