#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const layerDir = path.join(__dirname, 'layers', 'chromium');
const nodejsDir = path.join(layerDir, 'nodejs');
const nodeModulesDir = path.join(nodejsDir, 'node_modules');

console.log('🔨 Building Lambda Layer...\n');

// Check if node_modules already exists with valid content
const hasNodeModules = fs.existsSync(nodeModulesDir) &&
  fs.readdirSync(nodeModulesDir).length > 0;

if (hasNodeModules) {
  console.log('✓ node_modules already present, skipping installation...');
} else {
  // Clean up old builds
  if (fs.existsSync(nodejsDir)) {
    console.log('Removing old nodejs directory...');
    execSync(`rm -rf "${nodejsDir}"`);
  }

  // Create layer structure
  console.log('Creating nodejs directory...');
  fs.mkdirSync(nodejsDir, { recursive: true });

  // Copy package.json to nodejs directory
  console.log('Copying package.json to layer...');
  const packageJsonSrc = path.join(layerDir, 'package.json');
  const packageJsonDest = path.join(nodejsDir, 'package.json');
  fs.copyFileSync(packageJsonSrc, packageJsonDest);

  // Install dependencies in the nodejs directory
  console.log('Installing dependencies...');
  try {
    execSync(`cd "${nodejsDir}" && npm install --omit=dev --no-save`, {
      stdio: 'inherit',
      env: { ...process.env, npm_config_workspaces_enabled: 'false' }
    });
  } catch (error) {
    console.error('Failed to install dependencies');
    process.exit(1);
  }
}

// Verify structure
if (fs.existsSync(nodeModulesDir)) {
  const modules = fs.readdirSync(nodeModulesDir);
  console.log('\n✅ Layer built successfully!');
  console.log(`\n📦 Installed modules (${modules.length}):`);
  modules.slice(0, 5).forEach(m => console.log(`   - ${m}`));
  if (modules.length > 5) console.log(`   ... and ${modules.length - 5} more`);
  console.log(`\n📁 Layer structure: layers/chromium/nodejs/node_modules/`);
} else {
  console.error('\n❌ Failed to create layer structure');
  process.exit(1);
}
