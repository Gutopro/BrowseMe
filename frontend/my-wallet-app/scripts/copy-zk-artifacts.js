#!/usr/bin/env node
// Copies the compiled ZK artifacts (keys/ and zkir/) from
// contracts/managed/browseme/ into this app's public/ directory, so
// Vite serves them as static files at dev/build time.
//
// Source path mirrors the relative path ContractAPI.ts already uses for
// CompiledContract.withCompiledFileAssets('../../../../contracts/managed/browseme').
// If that path in ContractAPI.ts ever changes, update SOURCE_DIR below too.

import { existsSync, cpSync, rmSync, statSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// frontend/my-wallet-app/scripts -> up 3 levels -> repo root -> contracts/managed/browseme
const SOURCE_DIR = join(__dirname, '..', '..', '..', 'contracts', 'managed', 'browseme');
const DEST_DIR = join(__dirname, '..', 'public');

const ARTIFACT_DIRS = ['keys', 'zkir'];

// Latest mtime among all files in a directory tree, recursively.
// Used to decide whether the destination is already up to date with
// the source, so unchanged artifacts don't get re-copied (and logged)
// on every single dev/build invocation.
function latestMtime(path) {
  const entry = statSync(path);
  if (!entry.isDirectory()) return entry.mtimeMs;

  let latest = entry.mtimeMs;
  for (const child of readdirSync(path)) {
    const childLatest = latestMtime(join(path, child));
    if (childLatest > latest) latest = childLatest;
  }
  return latest;
}

for (const name of ARTIFACT_DIRS) {
  const src = join(SOURCE_DIR, name);
  const dest = join(DEST_DIR, name);

  if (!existsSync(src)) {
    console.error(
      `[copy-zk-artifacts] Missing ${src} — run "yarn compile" from the repo root first.`,
    );
    process.exit(1);
  }

  // Skip silently if dest already exists and is at least as fresh as
  // src — avoids redundant copies (and log noise) on every dev/build.
  if (existsSync(dest) && latestMtime(dest) >= latestMtime(src)) {
    continue;
  }

  // Clear the destination first so stale artifacts from a previous
  // contract version don't linger alongside newly compiled ones.
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-zk-artifacts] Copied ${name}/ -> public/${name}/`);
}
