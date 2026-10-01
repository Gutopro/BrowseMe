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
const unionSecret = b32("union-attester-secret");
const religiousSecret = b32("religious-attester-secret");

describe("BrowseMe", () => {
  it("Track B business is not listed below 2 attestations", () => {
    const amaka = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionSecret);
    const ledger = sim.getLedger();
    expect(ledger.businesses.lookup(id).listed).toEqual(false);
  });

  it("lists after union + one more attestation", () => {
    const amaka = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionSecret);
    sim.submitAttestation(id, AttesterType.RELIGIOUS, religiousSecret);
    const ledger = sim.getLedger();
    expect(ledger.businesses.lookup(id).listed).toEqual(true);
    expect(ledger.businesses.lookup(id).tier).toEqual(3n);
  });

  it("rejects a duplicate attester", () => {
    const amaka = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionSecret);
    expect(() => sim.submitAttestation(id, AttesterType.UNION, unionSecret)).toThrow();
  });

  it("rejects the same attester switching type", () => {
    const amaka = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionSecret);
    expect(() => sim.submitAttestation(id, AttesterType.RELIGIOUS, unionSecret)).toThrow();
  });

  it("Track A business is listed immediately", () => {
    const amaka = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackA(sectorAgri, locationKwara);
    const ledger = sim.getLedger();
    expect(ledger.businesses.lookup(id).listed).toEqual(true);
    expect(ledger.businesses.lookup(id).tier).toEqual(2n);
  });

  it("only the business owner can shake", () => {
    const amaka = testAddress();
    const tunde = testAddress();
    const stranger = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionSecret);
    sim.submitAttestation(id, AttesterType.RELIGIOUS, religiousSecret);

    sim.as(tunde).registerInvestor();
    const nonce = b32("handshake-nonce-1");
    sim.as(tunde).initiateHandshake(nonce, id);

    expect(() => sim.as(stranger).shake(nonce)).toThrow();
    expect(() => sim.as(amaka).shake(nonce)).not.toThrow();
  });

  it("either party can unshake without the other", () => {
    const amaka = testAddress();
    const tunde = testAddress();
    const sim = new BrowseMeSimulator(amaka);
    const id = sim.registerBusinessTrackB(sectorAgri, locationKwara);
    sim.submitAttestation(id, AttesterType.UNION, unionSecret);
    sim.submitAttestation(id, AttesterType.RELIGIOUS, religiousSecret);

    sim.as(tunde).registerInvestor();
    const nonce = b32("handshake-nonce-2");
    sim.as(tunde).initiateHandshake(nonce, id);
    sim.as(tunde).unshake(nonce);

    const ledger = sim.getLedger();
    expect(ledger.pendingHandshakes.lookup(nonce).unshaken).toEqual(true);
  });
});
