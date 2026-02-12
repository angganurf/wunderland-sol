#!/usr/bin/env node

/**
 * pull-source.mjs — Prebuild script that makes the wunderland package source
 * available for TypeDoc API generation.
 *
 * - In the monorepo (local dev): symlinks .source/wunderland/ to the local package
 * - In CI (standalone repo): shallow-clones from GitHub
 *
 * Run: node scripts/pull-source.mjs
 * Auto-runs via `npm run prebuild` before `npm run build`.
 */

import { copyFileSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE_DIR = resolve(ROOT, '.source');
const TARGET = resolve(SOURCE_DIR, 'wunderland');
const STATIC_MEDIA_DIR = resolve(ROOT, 'static/docs/_media');

// Local monorepo path (when docs-site is inside apps/wunderland-sh/docs-site/)
const LOCAL_PKG = resolve(ROOT, '../../../packages/wunderland');

// GitHub repo URL for CI builds
const REPO_URL = 'https://github.com/jddunn/wunderland.git';

function syncTypedocMedia() {
  // TypeDoc readme gets rewritten to `_media/*` links, but with `trailingSlash: false`
  // those resolve to `/docs/_media/*` (not `/docs/api-reference/_media/*`).
  // Serve these as static files so the links + logo render correctly.
  const docsDir = resolve(TARGET, 'docs');
  const assetsDir = resolve(TARGET, 'assets');

  const files = [
    { src: resolve(docsDir, 'LOCAL_LLM_SETUP.md'), dest: resolve(STATIC_MEDIA_DIR, 'LOCAL_LLM_SETUP.md') },
    { src: resolve(docsDir, 'GUARDRAILS.md'), dest: resolve(STATIC_MEDIA_DIR, 'GUARDRAILS.md') },
    { src: resolve(docsDir, 'PRESETS_AND_PERMISSIONS.md'), dest: resolve(STATIC_MEDIA_DIR, 'PRESETS_AND_PERMISSIONS.md') },
    { src: resolve(docsDir, 'OBSERVABILITY.md'), dest: resolve(STATIC_MEDIA_DIR, 'OBSERVABILITY.md') },
    { src: resolve(assetsDir, 'wunderland-logo.svg'), dest: resolve(STATIC_MEDIA_DIR, 'wunderland-logo.svg') },
    { src: resolve(assetsDir, 'wunderland-logo-light.svg'), dest: resolve(STATIC_MEDIA_DIR, 'wunderland-logo-light.svg') },
  ];

  mkdirSync(STATIC_MEDIA_DIR, { recursive: true });

  for (const file of files) {
    if (!existsSync(file.src)) {
      console.warn(`pull-source: Missing media file: ${file.src}`);
      continue;
    }
    copyFileSync(file.src, file.dest);
  }

  console.log(`pull-source: Synced TypeDoc media to ${STATIC_MEDIA_DIR}\n`);
}

function main() {
  console.log('pull-source: Preparing wunderland source for TypeDoc...\n');

  // If .source/wunderland already exists and has src/index.ts, skip
  if (existsSync(resolve(TARGET, 'src/index.ts'))) {
    console.log('pull-source: Source already present, skipping.\n');
    syncTypedocMedia();
    return;
  }

  // Clean up any stale .source directory
  if (existsSync(SOURCE_DIR)) {
    rmSync(SOURCE_DIR, { recursive: true, force: true });
  }
  mkdirSync(SOURCE_DIR, { recursive: true });

  // Strategy 1: Local monorepo symlink
  if (existsSync(resolve(LOCAL_PKG, 'src/index.ts'))) {
    console.log(`pull-source: Found local package at ${LOCAL_PKG}`);
    console.log('pull-source: Creating symlink...\n');
    symlinkSync(LOCAL_PKG, TARGET, 'dir');
    console.log(`pull-source: Symlinked .source/wunderland/ -> ${LOCAL_PKG}\n`);
    syncTypedocMedia();
    return;
  }

  // Strategy 2: Clone from GitHub (CI environment)
  console.log('pull-source: No local package found, cloning from GitHub...');

  // Use GH_PAT if available (for private repos)
  let cloneUrl = REPO_URL;
  if (process.env.GH_PAT) {
    cloneUrl = REPO_URL.replace('https://', `https://${process.env.GH_PAT}@`);
  }

  try {
    execSync(
      `git clone --depth 1 --single-branch --branch master "${cloneUrl}" "${TARGET}"`,
      { stdio: 'inherit' }
    );
    console.log('\npull-source: Cloned wunderland source successfully.\n');
  } catch (err) {
    console.error('pull-source: Failed to clone wunderland source:', err.message);
    console.error('pull-source: TypeDoc API generation will be skipped.');
    // Create empty directory so build doesn't fail
    mkdirSync(TARGET, { recursive: true });
    return;
  }

  // Verify
  if (!existsSync(resolve(TARGET, 'src/index.ts'))) {
    console.error('pull-source: WARNING — src/index.ts not found in cloned source');
  }

  syncTypedocMedia();
}

main();
