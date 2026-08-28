# BrowseMe

> Privacy-preserving business verification and investment-discovery protocol built on the Midnight Network.

BrowseMe lets businesses and investors discover and vet each other without exposing financials, identity, or negotiation details on a public ledger. It uses zero-knowledge proofs (via [Compact](https://docs.midnight.network/), Midnight's smart contract language) so claims like "this business is registered" or "this investor meets the threshold" can be verified on-chain without revealing the underlying data.

Full design and architecture: [`docs/spec.md`](./docs/spec.md).

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Compiling the contract](#compiling-the-contract)
  - [Running the local network](#running-the-local-network)
  - [Deploying the contract](#deploying-the-contract)
  - [Running tests](#running-tests)
  - [Running the frontend](#running-the-frontend)
- [Project Structure](#project-structure)
- [Status](#status)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Architecture

| Layer | Description |
|---|---|
| Contract (`contracts/`) | Compact smart contract defining registration, attestation, and handshake logic |
| Local network (`midnight-local-dev`) | Containerized node, indexer, and proof server for development |
| Frontend (`frontend/my-wallet-app`) | Vite + React + TypeScript app that connects a wallet extension to the deployed contract |

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | v22.17.1+ | Required for both the root project and the frontend |
| [Docker](https://docs.docker.com/get-docker/) | Latest | Runs [`midnight-local-dev`](https://github.com/midnightntwrk/midnight-local-dev) (node, indexer, proof server) |
| [Git](https://git-scm.com/) | Latest | |
| Compact toolchain | 0.31.1 | Compiler; matching runtime is `@midnight-ntwrk/compact-runtime` 0.16.0. Installed separately, see below |
| Midnight-compatible wallet extension | Latest | Required to use the frontend, connected to the `undeployed` network |

Verify toolchain versions against [`VERSIONS.md`](./VERSIONS.md) before proceeding — these track the [Midnight compatibility matrix](https://docs.midnight.network/relnotes/support-matrix), which can move between releases.

## Installation

```bash
git clone <repo-url>
cd BrowseMe

corepack enable
yarn install --immutable
```

`--immutable` fails the install if `yarn.lock` doesn't match `package.json`, rather than silently resolving different dependency versions.

Install the Compact compiler (a system binary, not an npm package):

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update 0.31.1
```

Verify:

```bash
compact --version
compact compile --version
cat package.json    # confirm @midnight-ntwrk/compact-runtime is 0.16.0
```

## Usage

### Compiling the contract

```bash
yarn compile
```

Compiles `contracts/main.compact` into `contracts/managed/browseme/`, including the ZK proving/verifying keys required at runtime. Use `yarn compile:fast` (`--skip-zk`) for faster iteration during development; always run a full `yarn compile` before testing, deploying, or running the frontend.

### Running the local network

[`midnight-local-dev`](https://github.com/midnightntwrk/midnight-local-dev) runs the node, indexer, and proof server together as Docker containers (`undeployed` network). Clone and start it in a separate directory:

```bash
git clone https://github.com/midnightntwrk/midnight-local-dev.git
cd midnight-local-dev
npm install
npm start
```

`npm start` pulls the Docker images pinned in `standalone.yml`, starts all three services with health checks, and initializes a pre-funded genesis wallet via an interactive funding menu. That menu isn't needed for this project — `deploy.ts` funds its own dev wallet automatically — so the container-only mode below is sufficient:

```bash
docker compose -f standalone.yml up -d    # start
docker compose -f standalone.yml logs -f  # logs
docker compose -f standalone.yml down     # stop
```

| Service | Endpoint |
|---|---|
| Node | `ws://127.0.0.1:9944` |
| Indexer (GraphQL) | `http://127.0.0.1:8088/api/v4/graphql` |
| Proof server | `http://127.0.0.1:6300` |

These are also the fixed defaults the Lace wallet extension uses for the `undeployed` network, so a wallet configured for "Undeployed" points here automatically with no extra endpoint config.

### Deploying the contract

```bash
yarn deploy
```

Runs `contracts/src/deploy.ts`: derives a dev wallet from a fixed local seed, waits for wallet sync, funds it automatically, and deploys the compiled contract. On success:

```
[OK] Contract deployed at: <contract-address>
```

Save this address — it's required by the frontend, and each redeploy produces a new one.

### Running tests

```bash
yarn test
```

Runs `contracts/src/test/browseme.test.ts` against `BrowseMeSimulator`. No local network required.

### Running the frontend

`frontend/my-wallet-app` connects a Midnight wallet extension to the deployed contract.

**Prerequisites:** contract compiled and deployed (above), wallet extension connected to the `undeployed` network.

```bash
cd frontend/my-wallet-app
npm install
cp .env.example .env    # fill in deployed contract address
```

**Sync ZK artifacts.** Vite's dev server only serves static files from `public/`. The compiled contract's proving/verifying keys and ZK IR live under `contracts/managed/browseme/`, which is gitignored and not visible to the dev server by default. Copy them into `public/` before starting:

```bash
mkdir -p public/keys public/zkir
cp ../../contracts/managed/browseme/keys/* public/keys/
cp -r ../../contracts/managed/browseme/zkir/* public/zkir/
```

Skipping this produces:

```
Error: Expected ZK artifact, but received text/html from http://localhost:5173/keys/registerBusinessTrackA.verifier
```

Re-run this copy after every contract recompile — see [Troubleshooting](#troubleshooting).

Start the dev server:

```bash
npm run dev
```

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server (`http://localhost:5173`) |
| `npm run build` | Type-check (`tsc -b`) and production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview a production build locally |

## Project Structure

```
BrowseMe/
├── contracts/
│   ├── main.compact              # contract source
│   ├── managed/browseme/         # compiled output (gitignored): contract/, keys/, zkir/
│   └── src/
│       ├── deploy.ts              # deploy script
│       ├── witnesses.ts           # private state / witness definitions
│       └── test/browseme.test.ts  # simulator-based tests
├── docs/
│   └── spec.md                    # full design and architecture
└── frontend/my-wallet-app/
    ├── public/                    # static assets; keys/ + zkir/ synced here manually
    └── src/
        ├── App.tsx                 # top-level view state, wallet connect/disconnect
        ├── Homepage.tsx             # landing page (disconnected state)
        ├── WalletCard.tsx            # connected wallet display/copy/disconnect
        ├── RegistrationForm.tsx       # business registration form (Track A/B)
        ├── selectWallet.ts            # wallet extension discovery/selection
        ├── providers.ts               # wallet + indexer + proof server + zk config setup
        ├── types.ts                   # shared frontend types
        ├── main.tsx                   # entry point
        └── contract/
            ├── ContractAPI.ts           # deploy/join/submitTx/state wrapper
            └── common-types.ts          # shared contract-facing types
```

## Status

**Working:**
- Wallet connect/disconnect and address display
- Provider initialization (wallet, indexer, proof server, zk config)
- Business registration (Track A/B) end-to-end, via `ContractAPI`

**Known limitations:**
- `sector` and `location` form fields are plain text and need `Bytes<32>` encoding before being sent to the contract; long values will be silently truncated once added
- ZK artifact sync (`public/keys/`, `public/zkir/`) is manual and must be repeated after every contract recompile — no automated hook yet

## Troubleshooting

<details>
<summary><code>yarn add</code> fails with "doesn't seem to be part of the project"</summary>

A stray `package.json` in a parent directory (e.g. your home folder) is being mistaken for a monorepo root. Check with `ls -la ~/package.json ~/yarn.lock`.
</details>

<details>
<summary>Compiler/runtime version mismatch</summary>

Compare `compact --version` and `compact compile --version` against [`VERSIONS.md`](./VERSIONS.md). See [Midnight's version mismatch guide](https://docs.midnight.network/how-to/fix-version-mismatches).
</details>

<details>
<summary>Docker port already allocated</summary>

A previous local-network run still holds the port. From `midnight-local-dev`: `docker compose -f standalone.yml down`, or find the holder with `lsof -i :9944` / `lsof -i :6300`.
</details>

<details>
<summary>Indexer exits on first start with <code>block number 1 not found</code></summary>

Startup race on a fresh chain — the indexer asked for a block the node hadn't produced yet. Restart it: `docker start midnight-indexer`.
</details>

<details>
<summary><code>expected instance of LedgerParameters</code> during deploy</summary>

Two different versions of `@midnight-ntwrk/ledger-v8` got resolved in the dependency tree, producing two copies of its WASM module. Fixed via the `resolutions` pin in `package.json` — if this recurs after a dependency bump, confirm the pinned version still satisfies every consumer's declared range.
</details>

<details>
<summary>Frontend: <code>Expected ZK artifact, but received text/html from .../keys/&lt;circuit&gt;.verifier</code></summary>

The compiled contract's ZK artifacts (`keys/`, `zkir/`) live under `contracts/managed/browseme/`, which is gitignored and not visible to Vite's dev server — only files under `frontend/my-wallet-app/public/` are served statically. A request for a missing static file falls through to Vite's SPA fallback (`index.html`), producing HTML instead of the expected binary key file.

From `frontend/my-wallet-app`:

```bash
mkdir -p public/keys public/zkir
cp ../../contracts/managed/browseme/keys/* public/keys/
cp -r ../../contracts/managed/browseme/zkir/* public/zkir/
```

Re-run this after every contract recompile.
</details>

## Contributing

Issues and pull requests are welcome. Please open an issue to discuss significant changes before submitting a PR.

## License

TBD.
