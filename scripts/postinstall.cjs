#!/usr/bin/env node
// Postinstall: create node_modules/openclaw symlink so jiti can resolve
// openclaw/plugin-sdk/* imports at runtime.
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pluginRoot = process.cwd();
const nodeModulesDir = path.join(pluginRoot, 'node_modules');
const linkPath = path.join(nodeModulesDir, 'openclaw');

// Already exists — nothing to do
try {
  if (fs.lstatSync(linkPath).isSymbolicLink()) process.exit(0);
} catch { /* does not exist */ }

function hasPackageJson(dir) {
  try { fs.accessSync(path.join(dir, 'package.json')); return true; } catch { return false; }
}

const candidates = [];

// 1. Derive from openclaw binary in PATH
let binPath = null;
try {
  binPath = execSync(
    'command -v openclaw 2>/dev/null || which openclaw 2>/dev/null',
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();
} catch {}

if (binPath) {
  const binDir = path.dirname(binPath);
  // Standard npm global: ~/.npm-global/lib/node_modules/openclaw
  candidates.push(path.resolve(binDir, '..', 'lib', 'node_modules', 'openclaw'));
  candidates.push(path.resolve(binDir, '..', 'node_modules', 'openclaw'));
  // openclaw may be installed adjacent to the bin dir (e.g. ~/.npm-global/bin/../../openclaw)
  candidates.push(path.resolve(binDir, '..', '..', 'openclaw'));

  // Parse the bin shell script to extract the actual openclaw package path
  // e.g. exec ... "$basedir/../../openclaw/openclaw.mjs"
  try {
    const binContent = fs.readFileSync(binPath, 'utf8');
    const mjs = binContent.match(/\$basedir\/([^\s"]+openclaw[^\s"]*\.mjs)/);
    if (mjs) {
      const rel = path.dirname(mjs[1]).replace(/^\$basedir\//, '');
      candidates.push(path.resolve(binDir, rel));
    }
    // Also parse NODE_PATH entries from the bin script
    const np = binContent.match(/NODE_PATH="([^"]+)"/);
    if (np) {
      np[1].split(':').forEach(p => {
        if (p) candidates.push(path.join(p, 'openclaw'));
      });
    }
  } catch {}
}

// 2. npm global root
try {
  const r = execSync('npm root -g', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  if (r) candidates.push(path.join(r, 'openclaw'));
} catch {}

// 3. npm_config_prefix env (set by npm during postinstall)
if (process.env.npm_config_prefix) {
  candidates.push(path.join(process.env.npm_config_prefix, 'lib', 'node_modules', 'openclaw'));
  candidates.push(path.join(process.env.npm_config_prefix, 'node_modules', 'openclaw'));
}

// 4. pnpm global
try {
  const r = execSync('pnpm root -g 2>/dev/null', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  if (r) candidates.push(path.join(r, 'openclaw'));
} catch {}

const target = candidates.find(hasPackageJson);

if (!target) {
  const hint = 'ln -s "$(npm root -g)/openclaw" "' + linkPath + '"';
  console.warn('[openclaw-exchangerate] postinstall: could not locate openclaw.');
  console.warn('  If the plugin fails to load, run:');
  console.warn('   ', hint);
  process.exit(0);
}

try {
  fs.mkdirSync(nodeModulesDir, { recursive: true });
  fs.symlinkSync(target, linkPath);
  console.log('[openclaw-exchangerate] postinstall: openclaw symlink created ->', target);
} catch (err) {
  console.warn('[openclaw-exchangerate] postinstall: could not create symlink:', err.message);
}
