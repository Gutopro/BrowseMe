import { describe, it, expect } from "vitest";
import { BrowseMeSimulator, testAddress, defaultOwnerKey, defaultAttesterForm, ATTESTER_PACKAGE_BYTES } from "./simulators.js";
import { AttesterType, pureCircuits } from "../../managed/browseme/contract/index.js";

const b32 = (s: string) => {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(s).slice(0, 32));
  return bytes;
};
const bytes = (size: number, fill: number) => new Uint8Array(size).fill(fill);

const ATTESTATION_BUNDLE_BYTES = 1024;

const sectorAgri = b32("Agriculture");
const locationKwara = b32("Kwara");

const recordsFor = (sim: BrowseMeSimulator, businessId: bigint) => {
  const out: any[] = [];
  for (const [, rec] of sim.getLedger().attestations) {
    if (rec.businessId === businessId) out.push(rec);
  }
  return out;
};

// Track B business with a union and a religious attestation (so it is listed),
// an investor, and a sealed handshake.
function sealedTrackBHandshake() {
  const owner = testAddress();
  const investor = testAddress();
  const stranger = testAddress();
  const sim = new BrowseMeSimulator(owner);
  const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
  sim.submitAttestation(id, AttesterType.UNION, b32("union-1"));
  sim.submitAttestation(id, AttesterType.RELIGIOUS, b32("religious-1"));
  sim.as(investor).registerInvestor();
  const nonce = b32("track-b-handshake");
  sim.as(investor).initiateHandshake(nonce, id);
  sim.as(owner).shake(nonce);
  return { sim, owner, investor, stranger, id, nonce };
}

describe("attester forms", () => {
  it("Track B registration publishes the owner's encryption key", () => {
    const owner = testAddress();
    const key = b32("my-owner-key");
    const sim = new BrowseMeSimulator(owner);
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara, key);
    expect(sim.getLedger().businessKeys.lookup(id)).toEqual(key);
  });

  it("stores a record per attestation, with a commitment to the attester's form", () => {
    const sim = new BrowseMeSimulator(testAddress());
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);

    const form = defaultAttesterForm();
    const rand = bytes(32, 7);
    const ephemeralKey = b32("ephemeral-key-1");
    const details = bytes(ATTESTER_PACKAGE_BYTES, 3);
    sim.submitAttestation(id, AttesterType.UNION, b32("union-1"), { form, rand, ephemeralKey, details });

    const records = recordsFor(sim, id);
    expect(records).toHaveLength(1);
    expect(records[0].attesterType).toEqual(AttesterType.UNION);
    expect(records[0].publicKey).toEqual(ephemeralKey);
    expect(records[0].details).toEqual(details);
    expect(records[0].commitment).toEqual(pureCircuits.attesterCommitmentOf(form, rand));
  });

  it("a different form or randomness does not match the stored commitment", () => {
    const sim = new BrowseMeSimulator(testAddress());
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);

    const form = defaultAttesterForm();
    const rand = bytes(32, 7);
    sim.submitAttestation(id, AttesterType.UNION, b32("union-1"), { form, rand });
    const onChain = recordsFor(sim, id)[0].commitment;

    expect(pureCircuits.attesterCommitmentOf(form, bytes(32, 8))).not.toEqual(onChain);
    const edited = { ...form, organisation: bytes(32, 9) };
    expect(pureCircuits.attesterCommitmentOf(edited, rand)).not.toEqual(onChain);
  });

  it("two identical forms with different randomness commit differently", () => {
    const form = defaultAttesterForm();
    expect(pureCircuits.attesterCommitmentOf(form, bytes(32, 1))).not.toEqual(
      pureCircuits.attesterCommitmentOf(form, bytes(32, 2)),
    );
  });

  it("accepts several attestations of the same type and reaches tier 1 at four", () => {
    const sim = new BrowseMeSimulator(testAddress());
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);

    sim.submitAttestation(id, AttesterType.UNION, b32("union-1"));
    sim.submitAttestation(id, AttesterType.UNION, b32("union-2"));
    sim.submitAttestation(id, AttesterType.RELIGIOUS, b32("religious-1"));
    sim.submitAttestation(id, AttesterType.RELIGIOUS, b32("religious-2"));

    const ledger = sim.getLedger();
    expect(ledger.attestationCounts.lookup(id)).toEqual(4n);
    expect(ledger.businesses.lookup(id).listed).toBe(true);
    expect(ledger.businesses.lookup(id).tier).toEqual(1n);
    expect(recordsFor(sim, id)).toHaveLength(4);
  });

  it("rejects a fifth attestation", () => {
    const sim = new BrowseMeSimulator(testAddress());
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, b32("a1"));
    sim.submitAttestation(id, AttesterType.RELIGIOUS, b32("a2"));
    sim.submitAttestation(id, AttesterType.COMMUNITY, b32("a3"));
    sim.submitAttestation(id, AttesterType.EDUCATION, b32("a4"));
    expect(() => sim.submitAttestation(id, AttesterType.UNION, b32("a5"))).toThrow();
  });

  it("the same identity can attest for two different businesses", () => {
    const sim = new BrowseMeSimulator(testAddress());
    const first = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    const second = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    const secret = b32("one-identity");
    sim.submitAttestation(first, AttesterType.UNION, secret);
    expect(() => sim.submitAttestation(second, AttesterType.UNION, secret)).not.toThrow();
    expect(recordsFor(sim, first)).toHaveLength(1);
    expect(recordsFor(sim, second)).toHaveLength(1);
  });

  it("rejects the same identity attesting twice for one business, whatever its form", () => {
    const sim = new BrowseMeSimulator(testAddress());
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    const secret = b32("one-identity");
    sim.submitAttestation(id, AttesterType.UNION, secret);
    expect(() =>
      sim.submitAttestation(id, AttesterType.RELIGIOUS, secret, {
        form: { ...defaultAttesterForm(), name: bytes(32, 4) },
      }),
    ).toThrow();
  });

  it("rejects an attestation for a Track A business", () => {
    const sim = new BrowseMeSimulator(testAddress());
    const id = sim.registerBusinessTrackA(sectorAgri, locationKwara);
    expect(() => sim.submitAttestation(id, AttesterType.UNION, b32("union-1"))).toThrow();
  });
});

describe("attester detail delivery to an investor", () => {
  it("cannot deliver before the handshake is sealed", () => {
    const owner = testAddress();
    const investor = testAddress();
    const sim = new BrowseMeSimulator(owner);
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, b32("union-1"));
    sim.submitAttestation(id, AttesterType.RELIGIOUS, b32("religious-1"));
    sim.as(investor).registerInvestor();
    const nonce = b32("not-sealed-yet");
    sim.as(investor).initiateHandshake(nonce, id);

    expect(() => sim.as(owner).deliverAttestationDetails(nonce, bytes(ATTESTATION_BUNDLE_BYTES, 1))).toThrow();
  });

  it("only the business owner can deliver attester details", () => {
    const { sim, investor, stranger, nonce } = sealedTrackBHandshake();
    expect(() => sim.as(investor).deliverAttestationDetails(nonce, bytes(ATTESTATION_BUNDLE_BYTES, 1))).toThrow();
    expect(() => sim.as(stranger).deliverAttestationDetails(nonce, bytes(ATTESTATION_BUNDLE_BYTES, 1))).toThrow();
  });

  it("stores the bundle under the handshake nonce, once", () => {
    const { sim, owner, nonce } = sealedTrackBHandshake();
    const bundle = bytes(ATTESTATION_BUNDLE_BYTES, 6);
    sim.as(owner).deliverAttestationDetails(nonce, bundle);

    expect(sim.getLedger().attestationPackages.lookup(nonce)).toEqual(bundle);
    expect(() => sim.as(owner).deliverAttestationDetails(nonce, bytes(ATTESTATION_BUNDLE_BYTES, 7))).toThrow();
  });

  it("unshake removes the bundle from ledger state", () => {
    const { sim, owner, investor, nonce } = sealedTrackBHandshake();
    sim.as(owner).deliverAttestationDetails(nonce, bytes(ATTESTATION_BUNDLE_BYTES, 6));
    sim.as(investor).unshake(nonce);
    expect(sim.getLedger().attestationPackages.member(nonce)).toBe(false);
  });

  it("cannot deliver after the handshake was unshaken", () => {
    const { sim, owner, investor, nonce } = sealedTrackBHandshake();
    sim.as(investor).unshake(nonce);
    expect(() => sim.as(owner).deliverAttestationDetails(nonce, bytes(ATTESTATION_BUNDLE_BYTES, 1))).toThrow();
  });
});
