**BrowseMe**

Zero-Knowledge Business Verification & Investment Discovery Protocol

*Technical Design Specification*

Version 0.1 — Draft for Midnight Network Hackathon

Built on Compact / Midnight Network

## 1. Overview & Goals

BrowseMe is a privacy-preserving business verification and
investment-discovery platform targeting Nigeria's informal economy. It
allows businesses — from CAC-registered SMEs to unregistered community
businesses — to establish verifiable credibility on-chain without
exposing sensitive commercial data, and lets investors discover and
connect with them through a mutual, consent-gated data exchange.

### 1.1 Problem Statement

- The majority of Nigerian small businesses operate informally, with no
  CAC registration and no accessible way to prove legitimacy to outside
  capital.

- Existing investment-discovery platforms assume formal registration,
  excluding the informal sector entirely.

- Businesses that do want to be discoverable have no way to signal
  credibility without fully doxxing sensitive data (revenue, exact
  address, ownership) to every visitor.

### 1.2 Design Goals

- Support both formal (CAC-registered) and informal (community-attested)
  businesses through a single protocol — the dual-track model.

- Keep all sensitive data off-chain by default; only cryptographic
  commitments (hashes) and coarse, investor-relevant signals are public.

- Let businesses control exactly what is revealed, and to whom, via a
  two-layer selective disclosure model.

- Make trust legible without a central authority, by deriving tiers from
  attester diversity rather than a single registrar.

### 1.3 Non-Goals (v0.1)

- This spec does not cover payment settlement, escrow, or capital
  transfer between investor and business — BrowseMe is a discovery and
  verification layer, not a payments rail.

- Reputation/rating systems (post-connection reviews) are out of scope
  for the hackathon build.

## 2. System Architecture

### 2.1 High-Level Components

| **Component**                 | **Responsibility**                                                           |
|-------------------------------|------------------------------------------------------------------------------|
| Frontend (Homepage / Sign-up) | Routes investors and businesses to their respective onboarding forms         |
| Investor Form                 | Collects investor identity + tax data; writes to investor private state      |
| Business Form                 | Collects business identity/financial data; writes to business private state  |
| Attestation Form              | Collects attester identity + relationship to business; feeds Track B tiering |
| Compact Contracts (on-chain)  | Store commitments, enforce tier logic, mediate the handshake                 |
| Business Page                 | Public, on-chain-sourced listing view (tier, sector, location, status)       |
| Investor Page                 | Investor-facing view with an "Invest" action that triggers the handshake     |

### 2.2 Data Flow Summary

Sign-up writes full-fidelity data into each party's private state only.
The chain only ever sees hashes/commitments of that data, plus the small
set of coarse fields intentionally promoted to the Business Page (tier,
sector, location, status). Nothing else crosses the public/private
boundary until a handshake is mutually completed.

> Investor Sign-Up ──▶ Investor Private State ──▶ [hash] ──▶ On-Chain
> Investor Commitment Business Sign-Up ──▶ Business Private State ──▶
> [hash] ──▶ On-Chain Business Commitment Attestations ──▶ Attestation
> Records ──▶ [hash] ──▶ Tier Derivation (on-chain) │ ▼ Business Page
> (public fields only)

## 3. Data Model

### 3.1 Investor Form

Collected at sign-up; stored in investor private state, never written to
chain in raw form.

| **Field**      | **Notes**                                                                                              |
|----------------|--------------------------------------------------------------------------------------------------------|
| Company Name   | Struck through in original notes — superseded by Company Tax ID as primary identifier                  |
| Company Tax ID | Primary identifier; used to derive the on-chain commitment                                             |
| Address        | Private; disclosed only on handshake completion                                                        |
| Location       | Private; a coarser location value may be promoted separately if investor discovery-by-region is needed |

### 3.2 Business Form

| **Field**                | **Notes**                                                                           |
|--------------------------|-------------------------------------------------------------------------------------|
| Business Name            | Private                                                                             |
| Address                  | Private; disclosed only on handshake completion                                     |
| Location                 | Coarse form (e.g. state) promoted to Business Page; fine-grained form stays private |
| ID                       | Assigned automatically by the contract at registration — not user-supplied          |
| Estimated Annual Revenue | Private; sensitive financial data, never on-chain                                   |
| Sector                   | Promoted to Business Page (e.g. "Agriculture") — needed for investor discovery      |

### 3.3 Attestation Form

Used by Track B (informal business) attesters to vouch for a business.
Each submission is one attester's record.

| **Field**    | **Notes**                                                                 |
|--------------|---------------------------------------------------------------------------|
| Name         | Attester's name                                                           |
| ID No.       | Attester's identifying number (role-dependent — e.g. union membership ID) |
| Position     | Attester's role within their organization                                 |
| Organization | The community/religious/union/education body the attester represents      |
| Address      | Attester's address, for auditability of the attestation                   |

## 4. Verification Tracks

Businesses are verified through one of two tracks, reflecting the
reality that most Nigerian informal businesses cannot produce CAC
paperwork but can produce community standing.

### 4.1 Track A — CAC-Registered SME

- Verification input: Business Name + Tax ID.

- This is the simpler path — formal registration is treated as
  sufficient proof of legitimacy on its own.

### 4.2 Track B — Community-Attested Informal Business

Track B businesses have no formal registration, so credibility is built
from multiple independent attesters instead. This is the core innovation
for reaching the informal economy.

Minimum 2 attestations, maximum 4, required before a business is
eligible for listing. Four attester types are defined:

1.  Community / local authority

2.  Religious authority

3.  Union authority — marked required in the original design; a Track B
    business cannot reach the minimum threshold without at least one
    union attestation

4.  Local education authority

Only businesses that reach the required attestation threshold are listed
on-chain (i.e., appear on the Business Page). Businesses below threshold
exist in private/pending state but are not publicly discoverable.

## 5. Tier Assignment

Tiers communicate business credibility to investors without exposing the
underlying attestation data itself.

- Tiers run from T3 (lowest / newly listed) up to T1 (highest
  confidence).

- Tier is assigned based on the strength of attestation — for Track B,
  this is a function of attester count and attester-type diversity; for
  Track A, formal registration itself may be sufficient for a baseline
  tier.

- Tier is one of the few fields promoted to the public Business Page
  (see §6).

*Design note: the exact scoring function (e.g. weighted attester types
vs. simple count threshold) is not yet finalized in the source notes and
is flagged as an open question in §12.*

## 6. On-Chain Disclosure Surface

This is the complete set of fields intended to be publicly visible on
the Business Page. Everything else lives exclusively in private state
and is only shared via the handshake.

| **Field** | **Example**      | **Source**                                 |
|-----------|------------------|--------------------------------------------|
| Tier      | Tier 3           | Derived on-chain from attestation strength |
| Status    | Investing / Open | Business-controlled toggle                 |
| Sector    | Agriculture      | From Business Form                         |
| Location  | Kwara            | Coarse form of Business Form location      |

Keeping this list short and deliberately coarse is the core privacy
property of the system: an investor can filter and browse by
tier/sector/location/status without ever seeing revenue, exact address,
or business identity until both parties opt in via handshake.

## 7. Handshake Protocol

The handshake is the mechanism by which an interested investor and a
business mutually and symmetrically exchange private data — neither side
receives the other's private data unless both have opted in. Either
party can unilaterally withdraw at any time via Unshake, which destroys
any data already exchanged and does not require the other party's
cooperation.

### 7.1 Sequence

1.  Investor clicks "Invest" on a listed business → a nonce is generated
    and sent to the business.

2.  Investor data is copied from investor private state and stored
    (associated with that nonce), pending the business's response — the
    investor's data is not yet delivered anywhere public or to the
    business.

3.  Business clicks "Shake" (accept) → the reception of the investor's
    nonce is the trigger for this step.

4.  On Shake: investor data is delivered to the business, and business
    data is delivered to the investor, symmetrically.

5.  Either party may call "Unshake" (withdrawal) unilaterally, at any
    point, without requiring the other party's consent. Unshake
    immediately destroys any data associated with that handshake — the
    investor's staged-but-undelivered data if called before Shake, or
    both parties' exchanged data if called after Shake. Because it's
    unilateral, Unshake works even if the counterparty is unresponsive,
    closing the pending-state gap noted in §9.5.

### 7.2 Data Path Distinction (Handshake vs. Shake)

| **Step**                        | **What moves**                                                                          | **Where it comes from**                                          |
|---------------------------------|-----------------------------------------------------------------------------------------|------------------------------------------------------------------|
| Handshake (Invest click)        | Nonce only, to business. Investor data copied out of investor private state and staged. | Investor private state → staged copy                             |
| Shake (accept click)            | Investor data → business. Business data → investor.                                     | Sent directly from each party's private state                    |
| Unshake (unilateral withdrawal) | Nothing delivered; all data associated with the handshake is destroyed on both sides.   | Callable by either party alone; no counterparty consent required |

This two-step structure (stage-then-release) means an investor's data is
never exposed to a business that hasn't reciprocally agreed to share its
own — the business must act (Shake) before either side receives
anything. Unshake adds a unilateral exit valve: either party can walk
away and force-destroy the exchange without needing the other party to
cooperate, which is what makes the privacy guarantee enforceable even
against a silent or unresponsive counterparty.

## 8. Compact Contract Design

This section proposes a circuit-level structure consistent with the
NightRoom precedent (struct-based attester patterns, only cryptographic
hashes on-chain) and the security lessons already surfaced in that
review.

### 8.1 Public Ledger State

> export ledger businesses: Map\<BusinessId, BusinessListing>; export
> ledger investors: Map\<InvestorId, Bytes\<32>>; // commitment only
> export ledger attestationCounts: Map\<BusinessId, Uint\<8>>; export
> ledger pendingHandshakes: Map\<Bytes\<32>, HandshakeState>; // keyed
> by nonce

### 8.2 Core Structs

> struct BusinessListing { tier: Uint\<8>, // 1-3 status: Uint\<8>, //
> enum: Investing \| Open sector: Bytes\<32>, location: Bytes\<32>,
> commitment: Bytes\<32> // hash of full private BusinessForm } struct
> AttesterRecord { attesterType: Uint\<8>, // Community \| Religious \|
> Union \| Education attesterHash: Bytes\<32>, businessId: Bytes\<32>,
> timestamp: Uint\<64> // supplied as PUBLIC input — see §9.1 } struct
> HandshakeState { investorId: Bytes\<32>, businessId: Bytes\<32>,
> investorDataStaged: Boolean, shaken: Boolean, unshaken: Boolean // set
> true by either party's unilateral withdrawal }

### 8.3 Circuit Boundaries

| **Circuit**            | **Track** | **Public Effect**                                                                                                       |
|------------------------|-----------|-------------------------------------------------------------------------------------------------------------------------|
| registerBusinessTrackA | A         | Commits business hash; assigns baseline tier                                                                            |
| registerBusinessTrackB | B         | Commits business hash; tier withheld until threshold reached                                                            |
| submitAttestation      | B         | Increments attestationCounts; recomputes tier if threshold crossed                                                      |
| initiateHandshake      | Both      | Writes nonce + stages investor data reference; does not reveal data                                                     |
| shake                  | Both      | Symmetric release of both parties' private data; clears pending state                                                   |
| unshake                | Either    | Callable by investor OR business alone; destroys all data tied to the handshake; sets unshaken and clears pending state |

## 9. Security Considerations

Carried forward from the NightRoom review, since the same failure
classes apply directly to BrowseMe's handshake and tiering logic:

### 9.1 Timestamps as Private Witnesses

In NightRoom, current_timestamp() supplied as a private witness
undermined time-gated logic — a malicious prover could submit any
timestamp they liked. Any time-sensitive check in BrowseMe (e.g.
attestation freshness, handshake expiry) must take the timestamp as a
public input validated against the ledger's own clock, never as a
private witness.

### 9.2 Struct Fields vs. Enforceable Value

NightRoom stored payment amounts as struct fields rather than real token
primitives, making escrow unenforceable. BrowseMe's handshake does not
move value directly, but if a future version adds staking or fees tied
to a handshake, those must use real token primitives, not struct-encoded
numbers that carry no on-chain enforcement.

### 9.3 Attestation Integrity

- Attester identity should be committed (hashed), not stored in
  plaintext, consistent with the "only hashes on-chain" principle
  already established for NightRoom.

- The required union-authority attestation (§4.2) should be enforced as
  a circuit-level precondition for Track B tier assignment, not just a
  UI-level checkbox — otherwise it's trivially bypassable.

- Duplicate attestations from the same attester/business pair should be
  rejected on-chain (e.g. via a nullifier keyed on attester commitment +
  business ID) to prevent one attester inflating a business's attester
  count.

### 9.4 Handshake Race & Replay

- The nonce used to initiate a handshake must be single-use; the
  contract should reject a second "Shake" against an already-shaken or
  already-unshaken nonce.

- Because investor data is staged before the business responds, an
  investor should be able to unilaterally Unshake (withdraw) a pending
  handshake without needing the business to act — this gives a
  deliberate, user-initiated cleanup path in addition to any passive
  expiry, so staged sensitive data does not depend on the counterparty's
  cooperation to be removed.

### 9.5 Incomplete-Logic Risk (carried forward)

NightRoom's damage-claim and cancellation logic was flagged as
incomplete for an MVP skeleton. BrowseMe closes the equivalent gap with
a unilateral Unshake circuit (§7.1/§8.3): either party can withdraw and
force-destroy handshake data at any time, without needing the other side
to respond. This means an unresponsive business no longer traps investor
data indefinitely — the investor can always exit unilaterally. A passive
expiry/TTL (§10.3) is still worth adding as a backstop for handshakes
nobody bothers to cancel, but it's no longer the only way out.

## 10. Performance & Optimization

### 10.1 On-Chain Footprint

- Keep the public Business Page fields exactly as scoped in §6 — four
  small fields per listing. Every additional public field is permanent
  ledger bloat and a permanent privacy leak; resist scope creep here in
  particular.

- Store attestations as counts/hashes rather than full attester structs
  in the hot map used for Business Page reads; keep full attester
  records in a secondary map only consulted during tier recomputation or
  dispute.

### 10.2 Circuit Efficiency

- Tier recomputation should be triggered incrementally on each
  submitAttestation call rather than requiring a full re-scan of all
  attestations for a business — track a running count per business
  (attestationCounts) and only recompute tier when a new attestation
  pushes past a threshold boundary.

- Avoid recursive or unbounded-loop patterns in circuits handling Track
  B's variable attester count (2–4); since the bound is small and fixed,
  prefer a fixed-size array/struct over a dynamic collection to keep
  circuit size predictable and provable.

### 10.3 Handshake State Cleanup

- Expired, shaken, or unshaken handshake entries in pendingHandshakes
  should be prunable (or use a TTL pattern) so this map doesn't grow
  unbounded as a function of total platform interest rather than active
  interest. Since Unshake is unilateral (§7.1), most cleanup should
  happen via user action; TTL/expiry is a backstop for handshakes
  neither party bothers to close out, not the primary mechanism.

### 10.4 Frontend / Indexing

- Business Page browsing (filter by tier/sector/location/status) is a
  read-heavy, public-data pattern — this is a good candidate for an
  off-chain indexer reading emitted events, rather than requiring every
  filter operation to query the chain directly.

## 11. Software Engineering Practices

### 11.1 Repository Structure (proposed)

```
browseme/
├── contracts/
│   ├── src/
│   │   ├── business.compact
│   │   ├── investor.compact
│   │   ├── attestation.compact
│   │   └── handshake.compact
│   └── test/
├── frontend/
│   ├── src/pages/       (Homepage, SignUp, InvestorPage, BusinessPage)
│   └── src/forms/       (InvestorForm, BusinessForm, AttestationForm)
├── indexer/             # off-chain read model for Business Page filtering
├── docs/
│   └── spec.md
└── README.md
```

### 11.2 Build Discipline

- Local-first development against the hackathon prototype, then a clean
  rewrite into the public repo during the event window — as already
  planned; this spec should be the shared reference both versions are
  built against, so behavior doesn't silently drift between prototype
  and final submission.

- Each circuit in §8.3 should have an independent test covering: happy
  path, threshold boundary (exactly 2 / exactly 4 attestations), and at
  least one adversarial case per §9 (bad timestamp, duplicate
  attestation, replayed nonce).

- Struct definitions (BusinessListing, AttesterRecord, HandshakeState)
  should be defined once in a shared module and imported everywhere, not
  redeclared per-circuit — reduces drift risk found in ad hoc struct
  patterns.

### 11.3 Documentation Hygiene

- Keep this spec versioned alongside the contracts; when a circuit's
  behavior changes, the corresponding section here should be updated in
  the same PR.

- Track open questions explicitly (§12) rather than letting undecided
  behavior get implicitly decided by whatever the first implementation
  happens to do.

## 12. Open Questions & Next Steps

1. Tier scoring function: is Track B tier a simple attester-count
    threshold, or weighted by attester type (e.g. union + education >
    two community attestations)? Not yet specified in source notes.

2. Track A tiering: does CAC registration alone grant a fixed tier, or
    is there a separate strength gradient (e.g. years registered,
    revenue band) within Track A?

3. Handshake timeout: with unilateral Unshake available, is a passive
    expiry/TTL still needed as a backstop, and if so what window — or is
    user-initiated Unshake sufficient on its own?

4. Coarse vs. fine location: confirm whether "Location" on the Business
    Form needs an explicit coarse/fine split (state vs. exact address)
    or whether that's handled entirely by only ever writing the coarse
    value to BusinessListing.

5. CAC registration of BrowseMe's own Abuja office (as the platform's
    first Track A verified business) — flagged separately as a
    time-sensitive prerequisite outside this spec's technical scope.

6. Decide nullifier design for attestation duplicate-prevention (§9.3)
    before implementation begins, since it affects the AttesterRecord
    struct shape.
