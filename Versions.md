# Component Versions

Verified against the [official Midnight compatibility matrix](https://docs.midnight.network/relnotes/support-matrix) (Preview network, last checked Jul 2026).

## Versions in Use

- Compact devtools (`compact`): 0.5.1
- Compact compiler (`compact compile`): 0.31.1
- Compact runtime (`@midnight-ntwrk/compact-runtime`): 0.16.0
- Proof server: 8.1.0
- Node.js: 22.17.1+
- Yarn: 4.14.1 (managed via Corepack, see `packageManager` in `package.json`)

## Updating Versions

Always update related components together — never bump one in isolation. Check the compatibility matrix first, then update:

1. `package.json` (runtime/JS packages)
2. `.compactc-version` (compiler pin)
3. This file
4. `docker-compose.yml` or proof server run command, if pinned there

After updating, recompile all contracts and re-run tests before merging.
