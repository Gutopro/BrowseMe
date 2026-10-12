import { describe, it, expect } from "vitest";
import { BrowseMeSimulator, testAddress } from "./simulators.js";
import { AttesterType, pureCircuits } from "../../managed/browseme/contract/index.js";

// Bytes<32> fields need 32-byte values — this pads a string for readability in tests
const b32 = (s: string) => {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(s).slice(0, 32));
  return bytes;
};

// Sizes of the encrypted detail packages in main.compact.
const INVESTOR_PACKAGE_BYTES = 256;
const BUSINESS_PACKAGE_BYTES = 384;

const bytes = (size: number, fill: number) => new Uint8Array(size).fill(fill);
const isZero = (b: Uint8Array) => b.every((x) => x === 0);

const sectorAgri = b32("Agriculture");
const locationKwara = b32("Kwara");
const unionSecret = b32("union-attester-secret");
const religiousSecret = b32("religious-attester-secret");

// Track A business (listed immediately) owned by `owner`, an investor
// registered, handshake initiated and shaken. Everything the details tests need.
function sealedHandshake() {
  const owner = testAddress();
  const investor = testAddress();
  const stranger = testAddress();
  const sim = new BrowseMeSimulator(owner);
  const id = sim.registerBusinessTrackA(sectorAgri, locationKwara);
  sim.as(investor).registerInvestor();
  const nonce = b32("sealed-handshake");
  sim.as(investor).initiateHandshake(nonce, id);
  sim.as(owner).shake(nonce);
  return { sim, owner, investor, stranger, id, nonce };
}

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

describe("commitments", () => {
  it("business registration saves its randomness, so the commitment can be reopened", () => {
    const owner = testAddress();
    const sim = new BrowseMeSimulator(owner);
    const id = sim.registerBusinessTrackA(sectorAgri, locationKwara);

    const state = sim.getPrivateState();
    expect(isZero(state.businessFormRand)).toBe(false);

    const onChain = sim.getLedger().businesses.lookup(id).commitment;
    const reopened = pureCircuits.businessCommitmentOf(state.businessForm, state.businessFormRand);
    expect(reopened).toEqual(onChain);
  });

  it("a different randomness or an edited form does not match the on-chain commitment", () => {
    const owner = testAddress();
    const sim = new BrowseMeSimulator(owner);
    const id = sim.registerBusinessTrackA(sectorAgri, locationKwara);

    const state = sim.getPrivateState();
    const onChain = sim.getLedger().businesses.lookup(id).commitment;

    expect(pureCircuits.businessCommitmentOf(state.businessForm, bytes(32, 1))).not.toEqual(onChain);

    const edited = { ...state.businessForm, description: bytes(128, 9) };
    expect(pureCircuits.businessCommitmentOf(edited, state.businessFormRand)).not.toEqual(onChain);
  });

  it("investor registration saves its randomness, so the commitment can be reopened", () => {
    const investor = testAddress();
    const sim = new BrowseMeSimulator(investor);
    sim.registerInvestor();

    const state = sim.getPrivateState();
    expect(isZero(state.investorFormRand)).toBe(false);

    const onChain = sim.getLedger().investors.lookup(investor);
    const reopened = pureCircuits.investorCommitmentOf(state.investorForm, state.investorFormRand);
    expect(reopened).toEqual(onChain);
  });
});

describe("handshake keys", () => {
  it("stores the investor key at initiate and the owner key at shake", () => {
    const owner = testAddress();
    const investor = testAddress();
    const investorKey = b32("investor-public-key");
    const ownerPub = b32("owner-public-key");

    const sim = new BrowseMeSimulator(owner);
    const id = sim.registerBusinessTrackA(sectorAgri, locationKwara);
    sim.as(investor).registerInvestor();
    const nonce = b32("key-nonce");
    sim.as(investor).initiateHandshake(nonce, id, investorKey);

    const pending = sim.getLedger().pendingHandshakes.lookup(nonce);
    expect(pending.investorKey).toEqual(investorKey);
    expect(isZero(pending.ownerKey)).toBe(true);

    sim.as(owner).shake(nonce, ownerPub);
    const sealed = sim.getLedger().pendingHandshakes.lookup(nonce);
    expect(sealed.shaken).toBe(true);
    expect(sealed.investorKey).toEqual(investorKey);
    expect(sealed.ownerKey).toEqual(ownerPub);
  });
});

describe("details delivery", () => {
  it("cannot deliver before the handshake is sealed", () => {
    const owner = testAddress();
    const investor = testAddress();
    const sim = new BrowseMeSimulator(owner);
    const id = sim.registerBusinessTrackA(sectorAgri, locationKwara);
    sim.as(investor).registerInvestor();
    const nonce = b32("not-sealed-yet");
    sim.as(investor).initiateHandshake(nonce, id);

    expect(() => sim.as(investor).deliverInvestorDetails(nonce, bytes(INVESTOR_PACKAGE_BYTES, 1))).toThrow();
    expect(() => sim.as(owner).deliverBusinessDetails(nonce, bytes(BUSINESS_PACKAGE_BYTES, 1))).toThrow();
  });

  it("cannot deliver for a handshake that does not exist", () => {
    const owner = testAddress();
    const sim = new BrowseMeSimulator(owner);
    expect(() =>
      sim.deliverBusinessDetails(b32("no-such-handshake"), bytes(BUSINESS_PACKAGE_BYTES, 1))
    ).toThrow();
  });

  it("only the investor can deliver investor details, and only the owner business details", () => {
    const { sim, owner, investor, stranger, nonce } = sealedHandshake();

    expect(() => sim.as(owner).deliverInvestorDetails(nonce, bytes(INVESTOR_PACKAGE_BYTES, 1))).toThrow();
    expect(() => sim.as(stranger).deliverInvestorDetails(nonce, bytes(INVESTOR_PACKAGE_BYTES, 1))).toThrow();
    expect(() => sim.as(investor).deliverBusinessDetails(nonce, bytes(BUSINESS_PACKAGE_BYTES, 1))).toThrow();
    expect(() => sim.as(stranger).deliverBusinessDetails(nonce, bytes(BUSINESS_PACKAGE_BYTES, 1))).toThrow();
  });

  it("stores each party's package under the handshake nonce", () => {
    const { sim, owner, investor, nonce } = sealedHandshake();
    const investorPackage = bytes(INVESTOR_PACKAGE_BYTES, 7);
    const businessPackage = bytes(BUSINESS_PACKAGE_BYTES, 9);

    sim.as(investor).deliverInvestorDetails(nonce, investorPackage);
    sim.as(owner).deliverBusinessDetails(nonce, businessPackage);

    const ledger = sim.getLedger();
    expect(ledger.investorPackages.lookup(nonce)).toEqual(investorPackage);
    expect(ledger.businessPackages.lookup(nonce)).toEqual(businessPackage);
  });

  it("each package can only be delivered once", () => {
    const { sim, owner, investor, nonce } = sealedHandshake();
    sim.as(investor).deliverInvestorDetails(nonce, bytes(INVESTOR_PACKAGE_BYTES, 1));
    sim.as(owner).deliverBusinessDetails(nonce, bytes(BUSINESS_PACKAGE_BYTES, 1));

    expect(() => sim.as(investor).deliverInvestorDetails(nonce, bytes(INVESTOR_PACKAGE_BYTES, 2))).toThrow();
    expect(() => sim.as(owner).deliverBusinessDetails(nonce, bytes(BUSINESS_PACKAGE_BYTES, 2))).toThrow();
  });

  it("unshake removes both delivered packages from ledger state", () => {
    const { sim, owner, investor, nonce } = sealedHandshake();
    sim.as(investor).deliverInvestorDetails(nonce, bytes(INVESTOR_PACKAGE_BYTES, 1));
    sim.as(owner).deliverBusinessDetails(nonce, bytes(BUSINESS_PACKAGE_BYTES, 1));

    sim.as(investor).unshake(nonce);

    const ledger = sim.getLedger();
    expect(ledger.pendingHandshakes.lookup(nonce).unshaken).toBe(true);
    expect(ledger.investorPackages.member(nonce)).toBe(false);
    expect(ledger.businessPackages.member(nonce)).toBe(false);
  });

  it("cannot deliver after the handshake was unshaken", () => {
    const { sim, owner, investor, nonce } = sealedHandshake();
    sim.as(owner).unshake(nonce);

    expect(() => sim.as(investor).deliverInvestorDetails(nonce, bytes(INVESTOR_PACKAGE_BYTES, 1))).toThrow();
    expect(() => sim.as(owner).deliverBusinessDetails(nonce, bytes(BUSINESS_PACKAGE_BYTES, 1))).toThrow();
  });

  it("unshake works when nothing was delivered", () => {
    const { sim, investor, nonce } = sealedHandshake();
    expect(() => sim.as(investor).unshake(nonce)).not.toThrow();
    expect(sim.getLedger().pendingHandshakes.lookup(nonce).unshaken).toBe(true);
  });
});
