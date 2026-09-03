#!/usr/bin/env node
// Copies the compiled ZK artifacts (keys/ and zkir/) from
// contracts/managed/browseme/ into this app's public/ directory, so
// Vite serves them as static files at dev/build time.
//
// Source path mirrors the relative path ContractAPI.ts already uses for
// CompiledContract.withCompiledFileAssets('../../../../contracts/managed/browseme').
// If that path in ContractAPI.ts ever changes, update SOURCE_DIR below too.

import { existsSync, cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// frontend/my-wallet-app/scripts -> up 3 levels -> repo root -> contracts/managed/browseme
const SOURCE_DIR = join(__dirname, '..', '..', '..', 'contracts', 'managed', 'browseme');
const DEST_DIR = join(__dirname, '..', 'public');

const ARTIFACT_DIRS = ['keys', 'zkir'];

for (const name of ARTIFACT_DIRS) {
  const src = join(SOURCE_DIR, name);
  const dest = join(DEST_DIR, name);

  if (!existsSync(src)) {
    console.error(
      `[copy-zk-artifacts] Missing ${src} — run "yarn compile" from the repo root first.`,
    );
    process.exit(1);
  }

  // Clear the destination first so stale artifacts from a previous
  // contract version don't linger alongside newly compiled ones.
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-zk-artifacts] Copied ${name}/ -> public/${name}/`);
}
