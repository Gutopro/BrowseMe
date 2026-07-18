# BrowseMe

Privacy-preserving dApp built on the Midnight Network using Compact smart contracts.

## Prerequisites

- Node.js v22.17.1 or higher
- Docker (for the local proof server)
- `git`

## Environment Setup

Follow these steps in order. This gets you a working Compact + Midnight dev environment matching the project's pinned versions.

### 1. Clone the repo

```bash
git clone <repo-url>
cd BrowseMe
```

### 2. Enable Corepack

Corepack reads the `packageManager` field in `package.json` and automatically installs the exact matching Yarn version — no manual Yarn install needed.

```bash
corepack enable
```

### 3. Install JS dependencies

```bash
yarn install --immutable
```

`--immutable` fails the install if `yarn.lock` doesn't exactly match `package.json`, instead of silently resolving different versions. This is the flag to use for setup and CI — not `yarn install` alone.

### 4. Install the Compact toolchain

The Compact compiler is a system-level binary, not an npm package, so it's installed separately:

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
```

Then pin it to the version this project uses:

```bash
compact update 0.31.1
```

### 5. Verify your versions

Check everything matches [`VERSIONS.md`](./VERSIONS.md):

```bash
compact --version
compact compile --version
cat package.json    # confirm @midnight-ntwrk/compact-runtime is 0.16.0
```

### 6. Run the local proof server

```bash
docker run -p 6300:6300 midnightntwrk/proof-server:latest midnight-proof-server -v
```

Keep this running in its own terminal — it handles zero-knowledge proof generation for local development.

## Version Policy

This project pins **exact** versions for the Compact toolchain and Midnight runtime packages (no `^` or `~` ranges). This is intentional — mismatched compiler/runtime versions are a common source of confusing build and proof errors.

If you need to bump a version, update it for the whole team at once:

1. Check the [official compatibility matrix](https://docs.midnight.network/relnotes/support-matrix)
2. Update `package.json`, `.compactc-version`, and `VERSIONS.md` together
3. Recompile all contracts and re-run tests before committing

Do not silently upgrade one component without checking the matrix.

## Common Issues

**`yarn add` fails with "doesn't seem to be part of the project"**
Usually means a stray `package.json` exists in a parent directory (e.g. your home folder) that Yarn is mistaking for a monorepo root. Check with `ls -la ~/package.json ~/yarn.lock`.

**Compiler/runtime version mismatch errors**
Run `compact --version` and `compact compile --version`, compare against `VERSIONS.md`. See [Midnight's version mismatch guide](https://docs.midnight.network/how-to/fix-version-mismatches).

**Docker port already allocated**
Another container or process is already bound to 6300. Check with `docker ps --filter "publish=6300"`, or run on a different host port with `-p 6301:6300`.

## Contract Compilation

```bash
yarn compact
```

Compiles all `.compact` source files into the `managed/` directory via the system-installed `compactc`.
