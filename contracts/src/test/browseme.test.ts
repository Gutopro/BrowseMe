import { describe, it, expect } from "vitest";
import { BrowseMeSimulator } from "./simulators.js";
import { testAddress } from "./simulators.js";
import { AttesterType } from "../../managed/browseme/contract/index.js";

// Bytes<32> fields need 32-byte values — this pads a string for readability in tests
const b32 = (s: string) => {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(s).slice(0, 32));
  return bytes;
};

const commitmentA = b32("amaka-business-commitment");
const sectorAgri = b32("Agriculture");
const locationKwara = b32("Kwara");
const unionCommitment = b32("union-attester-commitment");
const religiousCommitment = b32("religious-attester-commitment");

describe("BrowseMe", () => {
  it("Track B business is not listed below 2 attestations", () => {
    const amaka = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(commitmentA, sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionCommitment);
    const ledger = sim.getLedger();
    expect(ledger.businesses.lookup(id).listed).toEqual(false);
  });

  it("lists after union + one more attestation", () => {
    const amaka = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(commitmentA, sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionCommitment);
    sim.submitAttestation(id, AttesterType.RELIGIOUS, religiousCommitment);
    const ledger = sim.getLedger();
    expect(ledger.businesses.lookup(id).listed).toEqual(true);
    expect(ledger.businesses.lookup(id).tier).toEqual(3n);
  });

  it("rejects a duplicate attester", () => {
    const amaka = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(commitmentA, sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionCommitment);
    expect(() => sim.submitAttestation(id, AttesterType.UNION, unionCommitment)).toThrow();
  });

  it("only the business owner can shake", () => {
    const amaka = testAddress();
    const tunde = testAddress();
    const stranger = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(commitmentA, sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionCommitment);
    sim.submitAttestation(id, AttesterType.RELIGIOUS, religiousCommitment);

    sim.as(tunde).registerInvestor(b32("tunde-investor-commitment"));
    const nonce = b32("handshake-nonce-1");
    sim.as(tunde).initiateHandshake(nonce, id);

    expect(() => sim.as(stranger).shake(nonce)).toThrow();
    expect(() => sim.as(amaka).shake(nonce)).not.toThrow();
  });

  it("either party can unshake without the other", () => {
    const amaka = testAddress();
    const tunde = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(commitmentA, sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionCommitment);
    sim.submitAttestation(id, AttesterType.RELIGIOUS, religiousCommitment);

    sim.as(tunde).registerInvestor(b32("tunde-investor-commitment"));
    const nonce = b32("handshake-nonce-2");
    sim.as(tunde).initiateHandshake(nonce, id);
    sim.as(tunde).unshake(nonce);

    const ledger = sim.getLedger();
    expect(ledger.pendingHandshakes.lookup(nonce).unshaken).toEqual(true);
  });
});
