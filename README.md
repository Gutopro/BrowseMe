# BrowseMe

> Privacy-preserving business verification and investment-discovery protocol built on the Midnight Network.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

BrowseMe is designed to let businesses and investors discover and vet each other without exposing financials, identity, or negotiation details on a public ledger, using zero-knowledge proofs (via [Compact](https://docs.midnight.network/), Midnight's smart contract language). Private form data stays on the client and is bound on-chain by commitments computed in-circuit. Proving claims about that hidden data without revealing it, such as "this business is registered" or "this investor meets the threshold", is still on the roadmap. See [Privacy Model](#privacy-model) below for what's actually enforced on-chain today versus what's still on the roadmap.

Full design and architecture: [`docs/spec.md`](./docs/spec.md).

## Table of Contents

- [Architecture](#architecture)
- [How it works](#how-it-works)
- [Privacy Model](#privacy-model)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Compiling the contract](#compiling-the-contract)
  - [Running the local network](#running-the-local-network)
  - [Deploying the contract](#deploying-the-contract)
  - [Running tests](#running-tests)
  - [Running the frontend](#running-the-frontend)
- [Verifying a fresh clone](#verifying-a-fresh-clone)
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
| Frontend (`frontend/my-wallet-app`) | Vite + React + TypeScript app that connects a wallet extension to the deployed contract and reads live ledger state |

## How it works

**Registration.** Businesses register on one of two tracks. Track A is for formal businesses with documentation such as a tax ID or registration number. They are listed immediately as Tier 2 and Open. Track B is for informal businesses without that paperwork. They stay unlisted until an attestation is provided. Investors register separately. In every case the private form fields stay on the client, and only a commitment to them goes on-chain, alongside the coarse sector and location used for discovery. See [Privacy Model](#privacy-model).

**Browse.** The Browse page reads registered businesses from chain state and shows sector, location, track, tier, and status. Registered investors initiate handshakes from this page.

**Handshake.** An investor initiates a handshake on a listing, and it starts as PENDING. The business shakes back to complete it. The Deals page lists a user's handshakes. After a completed handshake, the private details are meant to be viewable. That page is not built yet (see [Status](#status)).

## Privacy Model

This is what's actually public versus private on-chain today, not the long-term design goal.

| Field | Visibility today | Notes |
|---|---|---|
| Sector | Public, on-chain | Coarse category used for discovery and matching before a handshake |
| Location | Public, on-chain | Coarse region used for discovery and matching before a handshake |
| Business track, tier, and status | Public, on-chain | Shown on the Browse page; read from contract ledger state |
| Handshake state (PENDING and later) | Public, on-chain | Read from contract ledger state and shown on the Deals page |
| Business name | Not submitted on-chain | Held client-side / off-chain |
| Tax ID / registration number (Track A) | Not submitted on-chain | Held client-side / off-chain |
| Community attestations (Track B) | Not submitted on-chain | Held client-side / off-chain |
| Investor name, region, business ID, tax ID | Not submitted on-chain | Held client-side / off-chain |
| Financials | Not submitted on-chain | Never sent to the contract |
| Negotiation details | Not submitted on-chain | Exchanged off-chain after handshake |

Sector and location are intentionally public: they're the coarse fields investors and businesses filter on before a handshake, and there is no privacy claim over them. Track, tier, status, and handshake state are likewise public ledger state.

**Commitment scheme status:** the contract now computes commitments to the private form fields in-circuit from witness data held on the client, replacing the earlier `placeholderCommitment()`. The private fields themselves are still never sent to the chain. See `contracts/main.compact` for the exact construction.

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | v22.17.1+ | Required for both the root project and the frontend |
| [Docker](https://docs.docker.com/get-docker/) | Latest | Runs [`midnight-local-dev`](https://github.com/midnightntwrk/midnight-local-dev) (node, indexer, proof server) |
| [Git](https://git-scm.com/) | Latest | |
| Compact toolchain | 0.31.1 | Compiler; matching runtime is `@midnight-ntwrk/compact-runtime` 0.16.0. Installed separately, see below |
| Midnight-compatible wallet extension | Latest | Required to use the frontend, connected to the `undeployed` network |

Verify toolchain versions against [`VERSIONS.md`](./VERSIONS.md) before proceeding. These track the [Midnight compatibility matrix](https://docs.midnight.network/relnotes/support-matrix), which can move between releases.

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

`npm start` pulls the Docker images pinned in `standalone.yml`, starts all three services with health checks, and initializes a pre-funded genesis wallet via an interactive funding menu. That menu isn't needed for this project, since `deploy.ts` funds its own dev wallet automatically, so the container-only mode below is sufficient:

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

Save this address. It's required by the frontend, and each redeploy produces a new one.

### Running tests

```bash
yarn test
```

Runs `contracts/src/test/browseme.test.ts` against `BrowseMeSimulator`. No local network required.

### Running the frontend

`frontend/my-wallet-app` connects a Midnight wallet extension to the deployed contract. It currently includes registration (business Tracks A/B and investor), a Browse page that reads registered businesses from live chain state, handshake initiation, and a Deals page. See [Status](#status) for what is verified end to end.

**Prerequisites:** contract compiled and deployed (above), wallet extension connected to the `undeployed` network.

```bash
cd frontend/my-wallet-app
npm install
cp .env.example .env    # fill in deployed contract address
```

**ZK artifacts sync automatically.** Vite's dev server only serves static files from `public/`. The compiled contract's proving/verifying keys and ZK IR live under `contracts/managed/browseme/`, which is gitignored and not visible to the dev server by default. A `predev`/`prebuild` hook (`scripts/copy-zk-artifacts.js`) copies them into `public/keys/` and `public/zkir/` automatically before `npm run dev` or `npm run build`, so no manual step is required. The script skips the copy (and stays silent) if the destination is already up to date, so it only does real work after a fresh `yarn compile`.

If you ever see:

```
Error: Expected ZK artifact, but received text/html from http://localhost:5173/keys/registerBusinessTrackA.verifier
```

see [Troubleshooting](#troubleshooting). It means the hook didn't run or the artifacts are missing at the source.

Start the dev server:

```bash
npm run dev
```

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server (`http://localhost:5173`) |
| `npm run build` | Type-check (`tsc -b`) and production build |
| `npm run preview` | Preview a production build locally |

## Verifying a fresh clone

Before opening a PR or resubmitting for review, confirm the whole stack works from scratch:

```bash
git clone <repo-url>
cd BrowseMe

corepack enable
yarn install --immutable

compact update 0.31.1

yarn compile
yarn test
yarn deploy

cd frontend/my-wallet-app
npm install
cp .env.example .env    # fill in deployed contract address
npm run build
npm run dev
```

Then start [the local network](#running-the-local-network), [deploy the contract](#deploying-the-contract), and run `npm run dev` against it with a wallet connected to the `undeployed` network to confirm registration works end-to-end.

## Project Structure

```
BrowseMe/
├── LICENSE                        # Apache License 2.0
├── NOTICE                         # attribution notice
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
    ├── public/                    # static assets; keys/ + zkir/ synced here automatically (predev/prebuild)
    ├── scripts/
    │   └── copy-zk-artifacts.js       # syncs contracts/managed/browseme/{keys,zkir} into public/
    └── src/
        ├── App.tsx                     # router setup and top-level layout (react-router-dom)
        ├── WalletContext.tsx            # wallet connection state + ContractAPI provider
        ├── NavBar.tsx                   # top navigation
        ├── Homepage.tsx                 # landing page (disconnected state)
        ├── WalletCard.tsx                # connected wallet display/copy/disconnect
        ├── RegistrationForm.tsx           # business registration form (Track A/B)
        ├── InvestorRegistrationForm.tsx    # investor registration form (name, region, business ID, tax ID as private commitment fields)
        ├── selectWallet.ts                # wallet extension discovery/selection
        ├── providers.ts                   # wallet + indexer + proof server + zk config setup
        ├── types.ts                       # shared frontend types
        ├── main.tsx                       # entry point
        ├── *.css, assets/                 # component styles and static images
        ├── pages/                         # route components
        │   ├── HomePage.tsx                   # Home route
        │   ├── WalletPage.tsx                 # Wallet route
        │   ├── RegisterBusinessPage.tsx       # business registration route
        │   ├── RegisterInvestorPage.tsx       # investor registration route
        │   ├── ListedBusinessesPage.tsx       # Browse route: registered businesses from chain state, handshake initiation
        │   ├── DealsPage.tsx                  # Deals route: handshakes
        │   └── BrowsePage.css, DealsPage.css  # page styles
        ├── hooks/
        │   └── useDeals.ts                    # deal/handshake state for the Deals page
        └── contract/
            ├── ContractAPI.ts               # deploy/join/submitTx/state wrapper
            └── common-types.ts              # shared contract-facing types
```

## Status

**Working:**
- Wallet connect/disconnect and address display, with a "Connecting... check your wallet" pending state
- Provider initialization (wallet, indexer, proof server, zk config)
- Business registration (Track A/B) end-to-end, via `ContractAPI`
- Investor registration end-to-end, via `ContractAPI`
- Browse page: reads registered businesses from on-chain state and shows sector, location, track, tier, and status (Track A is Tier 2 and Open; Track B stays unlisted until attested)
- Investor-gated handshake initiation (a handshake goes to PENDING on the selected listing)
- Automated ZK artifact sync (`predev`/`prebuild` hooks)
- Client-side routing (`react-router-dom`), nav bar, and a shared wallet context
- Deals page
- Business-side shake back (completes a pending handshake)
- `unshake`

**Not yet in the UI:**
- Attestation flow that moves Track B businesses from unlisted to listed
- Page for viewing the private details after a completed handshake

**Known limitations:**
- Form text is encoded to `Bytes<32>` by `toBytes32`, which silently truncates at 32 bytes. The registration forms don't validate length yet, so longer values (including business descriptions) are cut before they are committed
- `contactInfo` isn't collected by the business form and is sent as an empty `Bytes<32>`

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

Startup race on a fresh chain: the indexer asked for a block the node hadn't produced yet. Restart it: `docker start midnight-indexer`.
</details>

<details>
<summary><code>expected instance of LedgerParameters</code> during deploy</summary>

Two different versions of `@midnight-ntwrk/ledger-v8` got resolved in the dependency tree, producing two copies of its WASM module. Fixed via the `resolutions` pin in `package.json`. If this recurs after a dependency bump, confirm the pinned version still satisfies every consumer's declared range.
</details>

<details>
<summary>Frontend: <code>Expected ZK artifact, but received text/html from .../keys/&lt;circuit&gt;.verifier</code></summary>

The compiled contract's ZK artifacts (`keys/`, `zkir/`) live under `contracts/managed/browseme/`, which is gitignored and not visible to Vite's dev server. Only files under `frontend/my-wallet-app/public/` are served statically. A request for a missing static file falls through to Vite's SPA fallback (`index.html`), producing HTML instead of the expected binary key file.

`predev`/`prebuild` hooks (`scripts/copy-zk-artifacts.js`) sync these automatically, so this shouldn't come up in normal use. If it does:

1. Make sure the contract was compiled first, from the repo root:
```bash
   yarn compile
```
2. Make sure you ran `npm run dev` or `npm run build` and not some other entry point that bypasses the npm lifecycle hooks.
3. Manually re-run the sync from `frontend/my-wallet-app`:
```bash
   node scripts/copy-zk-artifacts.js
```
</details>

<details>
<summary>Frontend: <code>Unexpected error executing scoped transaction '&lt;unnamed&gt;': expected instance of StateValue</code></summary>

Two different versions of `@midnight-ntwrk/onchain-runtime-v3` got resolved in the frontend's dependency tree (`compact-runtime` pulling one version, `midnight-js-protocol` pulling another), producing two copies of its WASM module and two incompatible `StateValue` classes. Fixed via an `overrides` pin in `frontend/my-wallet-app/package.json`. If this recurs after a dependency bump, check which versions are actually resolved:

```bash
npm ls @midnight-ntwrk/onchain-runtime-v3
```

and confirm the pinned version still satisfies every consumer's declared range.
</details>

<details>
<summary>Contract fails to load with a <code>compact-runtime</code> version error</summary>

The compiled contract checks its runtime version on load (see `checkRuntimeVersion` near the top of `contracts/managed/browseme/contract/index.js`). `@midnight-ntwrk/compact-runtime` must be the same version in the root `package.json` and `frontend/my-wallet-app/package.json`, and must match the compiler (0.16.0 for Compact 0.31.1). If you change the compiler version, update both, recompile, and reinstall.
</details>

<details>
<summary>Submit fails with <code>1010 Invalid Transaction: Custom error: 170</code> (<code>InvalidDustSpendProof</code>)</summary>

The DUST spend proof failed verification at the fee layer, before the node reaches the contract. The wallet's local view of its DUST coins has drifted from the node's real state, for example after a failed submission or a local chain reset. On the `undeployed` network, also check that the wallet's fast sync isn't pulling a remote snapshot for a different network: a mainnet snapshot is rejected on network ID mismatch, and the DUST refresh then fails silently. Clear the wallet's cache and force a full resync from the local node.
</details>

## Contributing

Issues and pull requests are welcome. Please open an issue to discuss significant changes before submitting a PR. By submitting a contribution, you agree that it is licensed under the Apache License 2.0, as described in section 5 of the license.

## License

Licensed under the [Apache License, Version 2.0](./LICENSE). See [`NOTICE`](./NOTICE) for attribution.
