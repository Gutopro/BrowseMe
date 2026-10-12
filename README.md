# BrowseMe

> Privacy-preserving business verification and investment-discovery protocol built on the Midnight Network.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

BrowseMe is designed to let businesses and investors discover and vet each other without exposing financials, identity, or negotiation details on a public ledger, using zero-knowledge proofs (via [Compact](https://docs.midnight.network/), Midnight's smart contract language). Private form data stays on the client and is bound on-chain by commitments computed in-circuit. After a handshake, each side can choose to send its private details to the other, encrypted to the other side's key, and the receiver checks them against the commitment registered on-chain. Proving claims about that hidden data without revealing it, such as "this business is registered" or "this investor meets the threshold", is still on the roadmap. See [Privacy Model](#privacy-model) below for what's actually enforced on-chain today versus what's still on the roadmap.

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
| Contract (`contracts/`) | Compact smart contract defining registration, attestation, handshake, and encrypted details-delivery logic |
| Local network (`midnight-local-dev`) | Containerized node, indexer, and proof server for development |
| Frontend (`frontend/my-wallet-app`) | Vite + React + TypeScript app that connects a wallet extension to the deployed contract, reads live ledger state, and does the encrypting, decrypting, and commitment checking in the browser |

## How it works

**Registration.** Businesses register on one of two tracks. Track A is for formal businesses with documentation such as a tax ID or registration number. They are listed immediately as Tier 2 and Open. Track B is for informal businesses without that paperwork. They stay unlisted until an attestation is provided. Investors register separately. In every case the private form fields stay in the registering browser, and only a commitment to them goes on-chain, alongside the coarse sector and location used for discovery. See [Privacy Model](#privacy-model).

**Browse.** The Browse page reads registered businesses from chain state and shows sector, location, track, tier, and status. Registered investors initiate handshakes from this page.

**Handshake.** An investor initiates a handshake on a listing, and it starts as PENDING. The business owner shakes back, which seals it. Either side can unshake at any time, before or after sealing. The Deals page lists a user's handshakes. Each side publishes an encryption public key in the handshake: the investor's when initiating, the owner's when shaking.

**Sharing details.** Once a handshake is sealed, either side can open its Details page (Deals, then Details) and choose to share its private details. Nothing is shared automatically. The browser encrypts the registered form, together with the randomness behind its commitment, to the other side's public key and stores the encrypted package on the ledger. The other side's browser decrypts it with a secret key that never leaves that browser, recomputes the commitment, and compares it with the one registered on-chain. The page marks the details verified, or warns when they don't match. Unshaking removes both packages from current ledger state.

## Privacy Model

This is what's actually public versus private on-chain today, not the long-term design goal.

| Field | Visibility today | Notes |
|---|---|---|
| Sector | Public, on-chain | Coarse category used for discovery and matching before a handshake |
| Location | Public, on-chain | Coarse region used for discovery and matching before a handshake |
| Business track, tier, and status | Public, on-chain | Shown on the Browse page; read from contract ledger state |
| Attestation count and union-attestation flag (Track B) | Public, on-chain | Per business ID; shown on the Deals page |
| Business owner address | Public, on-chain | `businessOwners` maps each business ID to its owner's wallet address |
| Investor wallet address | Public, on-chain | Registered investors are keyed by address, and each handshake records which investor address is interested in which business ID |
| Handshake state (PENDING, SEALED, ENDED) | Public, on-chain | Read from contract ledger state and shown on the Deals page |
| Encryption public keys | Public, on-chain | One per wallet, published in each handshake. The same key appears in every handshake a wallet takes part in, so those handshakes are linkable to each other |
| Encrypted detail packages | Public ciphertext, on-chain | Only the counterparty's key opens them. Removed from current ledger state on unshake, but they remain in chain history |
| Business name, description, contact | Not on-chain in the clear | Held in the owner's browser; shared only with a handshake counterparty, encrypted, and only if the owner chooses to |
| Investor name, region, business ID, tax ID | Not on-chain in the clear | Held in the investor's browser; shared only with a handshake counterparty, encrypted, and only if the investor chooses to |
| Attester identity (Track B) | Not on-chain | Only a one-way nullifier derived from it is stored, to block duplicate attestations |
| Financials | Not submitted on-chain | Never sent to the contract |
| Negotiation details | Not submitted on-chain | Exchanged off-chain after handshake |

Sector and location are intentionally public: they're the coarse fields investors and businesses filter on before a handshake, and there is no privacy claim over them. Track, tier, status, attestation counts, addresses, and handshake state are likewise public ledger state.

**Commitment scheme status:** the contract computes each commitment in-circuit with `persistentCommit` over the private form and fresh randomness, both held on the client. The randomness is saved in the registering browser's private state so the commitment can be reopened later. The contract exposes `businessCommitmentOf` and `investorCommitmentOf` as pure circuits, so a receiving browser recomputes a commitment with the same code the registration circuits use. The private fields are never sent to the chain in the clear. See `contracts/main.compact` for the exact construction.

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

Save this address. It's required by the frontend, and each redeploy produces a new one. A redeploy starts from an empty ledger, so earlier registrations and handshakes are gone, and details saved in a browser no longer match any on-chain commitment.

### Running tests

```bash
yarn test
```

Runs `contracts/src/test/browseme.test.ts` against `BrowseMeSimulator` (`contracts/src/test/simulators.ts`). It covers registration, attestations, handshakes, commitment reopening, and details delivery. No local network required.

### Running the frontend

`frontend/my-wallet-app` connects a Midnight wallet extension to the deployed contract. It currently includes registration (business Tracks A/B and investor), a Browse page that reads registered businesses from live chain state, handshake initiation and shake-back, a Deals page, and a Details page for sharing and verifying details after a sealed handshake. See [Status](#status) for what is verified end to end.

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

To try a full handshake you need two wallets, one for the business owner and one for the investor. Use two browser profiles, because each side's private details and encryption key live in its own browser.

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

Then start [the local network](#running-the-local-network), [deploy the contract](#deploying-the-contract), and run `npm run dev` against it with a wallet connected to the `undeployed` network to confirm registration, handshakes, and details sharing work end-to-end (two browser profiles, two wallets).

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
│       ├── witnesses.ts           # private state / witness definitions, form size limits
│       └── test/
│           ├── browseme.test.ts   # simulator-based tests
│           └── simulators.ts      # BrowseMeSimulator used by the tests
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
        ├── RegistrationForm.tsx           # business registration form (Track A/B), byte-limit validation
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
        │   ├── DealsPage.tsx                  # Deals route: handshakes, shake / unshake
        │   ├── DetailsPage.tsx                # Details route: share your details, read and verify theirs
        │   └── BrowsePage.css, DealsPage.css, DetailsPage.css  # page styles
        ├── hooks/
        │   ├── useDeals.ts                    # deal/handshake state for the Deals page
        │   └── useHandshakeDetails.ts         # one handshake: preview of what you share, decrypted and verified counterpart details
        └── contract/
            ├── ContractAPI.ts               # deploy/join/submitTx/state wrapper, details delivery and decryption
            ├── common-types.ts              # shared contract-facing types
            ├── codec.ts                     # text <-> fixed-size bytes (throws instead of truncating)
            └── detailsCrypto.ts             # NaCl box packages for the details exchange
```

## Status

**Working:**
- Wallet connect/disconnect and address display, with a "Connecting... check your wallet" pending state
- Provider initialization (wallet, indexer, proof server, zk config)
- Business registration (Track A/B) end-to-end, via `ContractAPI`, with contact details and byte-limit validation (name 32, description 128, contact 64)
- Investor registration end-to-end, via `ContractAPI`; over-long values are rejected at registration instead of being cut
- Browse page: reads registered businesses from on-chain state and shows sector, location, track, tier, and status (Track A is Tier 2 and Open; Track B stays unlisted until attested)
- Investor-gated handshake initiation (a handshake goes to PENDING on the selected listing)
- Deals page
- Business-side shake back (seals a pending handshake)
- `unshake`, which ends the handshake and removes delivered packages from current ledger state
- Details page: sharing your details, decrypting the other side's, and checking them against the on-chain commitment. Verified end to end with two wallets in two browser profiles: both sides saw the other's details marked as verified
- Automated ZK artifact sync (`predev`/`prebuild` hooks)
- Client-side routing (`react-router-dom`), nav bar, and a shared wallet context

**Not yet in the UI:**
- Attestation flow that moves Track B businesses from unlisted to listed

**Known limitations:**
- Private details live only in the registering browser's private state. Clearing site data or switching browser profile loses them, and a wallet keeps one business form, so registering a second business replaces the first one's saved details
- Delivered packages stay in chain history after `unshake`. Unshaking limits access going forward and does not erase what was already shared
- Each wallet uses one encryption keypair for all of its handshakes, so its handshakes are linkable by that key (as well as by address)
- The investor registration form doesn't show live byte counters yet. Field limits are in bytes, not characters, and over-long values are rejected when you submit
- The Details page's warning states (details that don't match the on-chain commitment, missing encryption key) are covered by the code but haven't been exercised in the browser yet

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

<details>
<summary>Frontend: <code>Contract address not set. Call setContractAddress() before accessing private state.</code></summary>

`ContractAPI.join()` reads saved private state before `findDeployedContract` runs, and the private state provider is scoped per contract address. `join()` must call `providers.privateStateProvider.setContractAddress(contractAddress)` before the first `get`. Also confirm `VITE_BROWSEME_CONTRACT_ADDRESS` is set in `frontend/my-wallet-app/.env`.
</details>

<details>
<summary>Details page: "details stored in this browser don't match" or "encryption key … isn't in this browser"</summary>

Your private details and encryption key are saved in the browser's private state for your wallet address. They are missing or out of date when you cleared site data, opened the app in a different browser profile, registered again from the same wallet (which replaces the saved form), or redeployed the contract (the old on-chain commitment no longer exists). The page refuses to share details that don't match your on-chain commitment, so nothing wrong is sent. Register again from this browser to save details that match.
</details>

## Contributing

Issues and pull requests are welcome. Please open an issue to discuss significant changes before submitting a PR. By submitting a contribution, you agree that it is licensed under the Apache License 2.0, as described in section 5 of the license.

## License

Licensed under the [Apache License, Version 2.0](./LICENSE). See [`NOTICE`](./NOTICE) for attribution.
