// Goes to: frontend/my-wallet-app/src/contract/detailsCrypto.ts
//
// Builds and opens the encrypted packages stored on-chain.
//
// Package layout (zero-padded to the ledger's fixed size):
//   [24-byte NaCl nonce][NaCl box ciphertext of (form fields ++ 32-byte rand)]
//
// The commitment randomness travels inside the package so the receiver can
// recompute the commitment and compare it with the one registered on-chain.
//
// Three kinds of package:
//   - investor / business details, exchanged after a sealed handshake
//   - attester details, sent by an attester to the business owner
//   - an attestation bundle: up to 4 attester forms the owner re-encrypts to
//     an investor after a handshake

import nacl from 'tweetnacl';
import {
  FORM_LIMITS,
  type BusinessForm,
  type InvestorForm,
  type AttesterForm,
  type DetailsKeyPair,
} from '../../../../contracts/src/witnesses.js';
import { concatBytes, isAllZero } from './codec';

// Must match the Bytes<N> sizes in main.compact.
export const INVESTOR_PACKAGE_BYTES = 256;
export const BUSINESS_PACKAGE_BYTES = 384;
export const ATTESTER_PACKAGE_BYTES = 288;
export const ATTESTATION_BUNDLE_BYTES = 1024;
// The contract allows at most 4 attestations per business.
export const MAX_ATTESTATIONS = 4;

const RAND_BYTES = 32;

const INVESTOR_FIELD_SIZES = [FORM_LIMITS.name, FORM_LIMITS.region, FORM_LIMITS.businessId, FORM_LIMITS.taxId];
const BUSINESS_FIELD_SIZES = [
  FORM_LIMITS.name,
  FORM_LIMITS.description,
  FORM_LIMITS.contactInfo,
  FORM_LIMITS.sector,
  FORM_LIMITS.location,
];
const ATTESTER_FIELD_SIZES = [
  FORM_LIMITS.name,
  FORM_LIMITS.organisation,
  FORM_LIMITS.position,
  FORM_LIMITS.contactInfo,
  FORM_LIMITS.registrationId,
];

const sum = (sizes: number[]) => sizes.reduce((a, b) => a + b, 0);
const INVESTOR_PLAINTEXT_BYTES = sum(INVESTOR_FIELD_SIZES) + RAND_BYTES;
const BUSINESS_PLAINTEXT_BYTES = sum(BUSINESS_FIELD_SIZES) + RAND_BYTES;
const ATTESTER_PLAINTEXT_BYTES = sum(ATTESTER_FIELD_SIZES) + RAND_BYTES;
const BUNDLE_PLAINTEXT_BYTES = ATTESTER_PLAINTEXT_BYTES * MAX_ATTESTATIONS;

const OVERHEAD = nacl.box.nonceLength + nacl.box.overheadLength;
if (
  OVERHEAD + INVESTOR_PLAINTEXT_BYTES > INVESTOR_PACKAGE_BYTES ||
  OVERHEAD + BUSINESS_PLAINTEXT_BYTES > BUSINESS_PACKAGE_BYTES ||
  OVERHEAD + ATTESTER_PLAINTEXT_BYTES > ATTESTER_PACKAGE_BYTES ||
  OVERHEAD + BUNDLE_PLAINTEXT_BYTES > ATTESTATION_BUNDLE_BYTES
) {
  throw new Error('Detail packages no longer fit the ledger sizes in main.compact.');
}

export function generateKeyPair(): DetailsKeyPair {
  const pair = nacl.box.keyPair();
  return { publicKey: pair.publicKey, secretKey: pair.secretKey };
}

export const randomBytes = (length: number): Uint8Array => nacl.randomBytes(length);

function seal(
  plaintext: Uint8Array,
  packageSize: number,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array,
): Uint8Array {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const box = nacl.box(plaintext, nonce, recipientPublicKey, senderSecretKey);
  const out = new Uint8Array(packageSize);
  out.set(nonce, 0);
  out.set(box, nonce.length);
  return out;
}

function open(
  pkg: Uint8Array,
  packageSize: number,
  plaintextLength: number,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array,
): Uint8Array | null {
  if (pkg.length !== packageSize) return null;
  const nonce = pkg.slice(0, nacl.box.nonceLength);
  const box = pkg.slice(nacl.box.nonceLength, nacl.box.nonceLength + plaintextLength + nacl.box.overheadLength);
  return nacl.box.open(box, nonce, senderPublicKey, recipientSecretKey);
}

function takeFields(buffer: Uint8Array, sizes: number[]): Uint8Array[] {
  const out: Uint8Array[] = [];
  let offset = 0;
  for (const size of sizes) {
    out.push(buffer.slice(offset, offset + size));
    offset += size;
  }
  return out;
}

// ── Investor details ─────────────────────────────────────────────────

export function sealInvestorDetails(
  form: InvestorForm,
  rand: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array,
): Uint8Array {
  const plaintext = concatBytes([form.name, form.region, form.businessId, form.taxId, rand]);
  return seal(plaintext, INVESTOR_PACKAGE_BYTES, recipientPublicKey, senderSecretKey);
}

export function openInvestorDetails(
  pkg: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array,
): { form: InvestorForm; rand: Uint8Array } | null {
  const plaintext = open(pkg, INVESTOR_PACKAGE_BYTES, INVESTOR_PLAINTEXT_BYTES, senderPublicKey, recipientSecretKey);
  if (!plaintext) return null;
  const [name, region, businessId, taxId, rand] = takeFields(plaintext, [...INVESTOR_FIELD_SIZES, RAND_BYTES]);
  return { form: { name, region, businessId, taxId }, rand };
}

// ── Business details ─────────────────────────────────────────────────

export function sealBusinessDetails(
  form: BusinessForm,
  rand: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array,
): Uint8Array {
  const plaintext = concatBytes([form.name, form.description, form.contactInfo, form.sector, form.location, rand]);
  return seal(plaintext, BUSINESS_PACKAGE_BYTES, recipientPublicKey, senderSecretKey);
}

export function openBusinessDetails(
  pkg: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array,
): { form: BusinessForm; rand: Uint8Array } | null {
  const plaintext = open(pkg, BUSINESS_PACKAGE_BYTES, BUSINESS_PLAINTEXT_BYTES, senderPublicKey, recipientSecretKey);
  if (!plaintext) return null;
  const [name, description, contactInfo, sector, location, rand] = takeFields(plaintext, [
    ...BUSINESS_FIELD_SIZES,
    RAND_BYTES,
  ]);
  return { form: { name, description, contactInfo, sector, location }, rand };
}

// ── Attester details ─────────────────────────────────────────────────

export interface AttesterEntry {
  form: AttesterForm;
  rand: Uint8Array;
}

const attesterPlaintext = (form: AttesterForm, rand: Uint8Array): Uint8Array =>
  concatBytes([form.name, form.organisation, form.position, form.contactInfo, form.registrationId, rand]);

function parseAttesterPlaintext(plaintext: Uint8Array): AttesterEntry {
  const [name, organisation, position, contactInfo, registrationId, rand] = takeFields(plaintext, [
    ...ATTESTER_FIELD_SIZES,
    RAND_BYTES,
  ]);
  return { form: { name, organisation, position, contactInfo, registrationId }, rand };
}

// Attester -> business owner. senderSecretKey is the attester's throwaway key
// for this attestation; its public half is stored on the attestation record.
export function sealAttesterDetails(
  form: AttesterForm,
  rand: Uint8Array,
  ownerPublicKey: Uint8Array,
  ephemeralSecretKey: Uint8Array,
): Uint8Array {
  return seal(attesterPlaintext(form, rand), ATTESTER_PACKAGE_BYTES, ownerPublicKey, ephemeralSecretKey);
}

export function openAttesterDetails(
  pkg: Uint8Array,
  attesterPublicKey: Uint8Array,
  ownerSecretKey: Uint8Array,
): AttesterEntry | null {
  const plaintext = open(pkg, ATTESTER_PACKAGE_BYTES, ATTESTER_PLAINTEXT_BYTES, attesterPublicKey, ownerSecretKey);
  return plaintext ? parseAttesterPlaintext(plaintext) : null;
}

// ── Attestation bundle (owner -> investor) ───────────────────────────
//
// Up to MAX_ATTESTATIONS fixed-size slots. An unused slot is all zeros, so a
// slot whose randomness is all zero is skipped when opening.

export function sealAttestationBundle(
  entries: AttesterEntry[],
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array,
): Uint8Array {
  if (entries.length > MAX_ATTESTATIONS) {
    throw new Error(`A bundle holds at most ${MAX_ATTESTATIONS} attesters.`);
  }
  const slots = entries.map((e) => attesterPlaintext(e.form, e.rand));
  while (slots.length < MAX_ATTESTATIONS) slots.push(new Uint8Array(ATTESTER_PLAINTEXT_BYTES));
  return seal(concatBytes(slots), ATTESTATION_BUNDLE_BYTES, recipientPublicKey, senderSecretKey);
}

export function openAttestationBundle(
  pkg: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array,
): AttesterEntry[] | null {
  const plaintext = open(pkg, ATTESTATION_BUNDLE_BYTES, BUNDLE_PLAINTEXT_BYTES, senderPublicKey, recipientSecretKey);
  if (!plaintext) return null;
  const out: AttesterEntry[] = [];
  for (let i = 0; i < MAX_ATTESTATIONS; i++) {
    const slot = plaintext.slice(i * ATTESTER_PLAINTEXT_BYTES, (i + 1) * ATTESTER_PLAINTEXT_BYTES);
    const entry = parseAttesterPlaintext(slot);
    if (isAllZero(entry.rand)) continue;
    out.push(entry);
  }
  return out;
}
