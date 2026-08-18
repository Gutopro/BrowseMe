# BrowseMe

Privacy-preserving business verification and investment-discovery protocol, built on the Midnight Network using Compact smart contracts.

Full design and architecture: [`docs/spec.md`](./docs/spec.md).

## Prerequisites

- Node.js v22.17.1+
- Docker (for [`midnight-local-dev`](https://github.com/midnightntwrk/midnight-local-dev), which runs the node, indexer, and proof server)
- Git

## Setup

```bash
git clone <repo-url>
cd BrowseMe

corepack enable
yarn install --immutable
```

`--immutable` fails the install if `yarn.lock` doesn't match `package.json`, instead of silently resolving different versions.

Install the Compact toolchain (a system binary, not an npm package):

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update 0.31.1
```

Verify versions against [`VERSIONS.md`](./VERSIONS.md):

```bash
compact --version
compact compile --version
cat package.json    # confirm @midnight-ntwrk/compact-runtime is 0.16.0
```

## Compile

```bash
yarn compile
```

Compiles `contracts/main.compact` into `contracts/managed/browseme`. Use `yarn compile:fast` (`--skip-zk`) while iterating; run the full `yarn compile` before testing or deploying.

## Run the local network

This project uses [`midnight-local-dev`](https://github.com/midnightntwrk/midnight-local-dev) to run the node, indexer, and proof server together (`undeployed` network).

```bash
git clone https://github.com/midnightntwrk/midnight-local-dev.git
cd midnight-local-dev
npm install
npm start
```

`npm start` pulls the pinned Docker images, starts all three services with health checks, initializes a pre-funded genesis wallet, and opens a funding menu. Leave it running in its own terminal.

`deploy.ts` funds its own dev wallet automatically, so the interactive funding menu isn't needed for this project — the standalone container-only mode below is enough:

```bash
docker compose -f standalone.yml up -d    # start
docker compose -f standalone.yml logs -f  # logs
docker compose -f standalone.yml down     # stop
```

Endpoints used by `deploy.ts`: node `ws://127.0.0.1:9944`, indexer `http://127.0.0.1:8088`, proof server `http://127.0.0.1:6300`.

## Deploy

```bash
yarn deploy
```

Runs `contracts/src/deploy.ts`, which derives a dev wallet from a fixed local seed, waits for wallet sync, and deploys the compiled contract. The dev wallet is pre-funded automatically — no manual funding step needed. On success it prints:

```
[OK] Contract deployed at: <contract-address>
```

Save that address — it's needed to interact with the deployed contract, and a redeploy will produce a different one.

## Test

```bash
yarn test
```

Runs `contracts/src/test/browseme.test.ts` against `BrowseMeSimulator`.

## Troubleshooting

**`yarn add` fails with "doesn't seem to be part of the project"**
A stray `package.json` in a parent directory (e.g. your home folder) is being mistaken for a monorepo root. Check with `ls -la ~/package.json ~/yarn.lock`.

**Compiler/runtime version mismatch**
Compare `compact --version` and `compact compile --version` against `VERSIONS.md`. See [Midnight's version mismatch guide](https://docs.midnight.network/how-to/fix-version-mismatches).

**Docker port already allocated**
A previous local-network run still holds the port. From `midnight-local-dev`: `docker compose -f standalone.yml down`, or find the holder with `lsof -i :9944` / `lsof -i :6300`.

**Indexer exits on first start with `block number 1 not found`**
Startup race on a fresh chain — the indexer asked for a block the node hadn't produced yet. Restart it: `docker start midnight-indexer`.

**`expected instance of LedgerParameters` during deploy**
Two different versions of `@midnight-ntwrk/ledger-v8` got resolved in the dependency tree, producing two copies of its WASM module. Fixed via the `resolutions` pin in `package.json` — if this recurs after a dependency bump, confirm the pinned version still satisfies every consumer's declared range.
