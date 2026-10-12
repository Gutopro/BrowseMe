// Goes to: frontend/my-wallet-app/src/contract/detailsCrypto.ts
//
// Builds and opens the encrypted detail packages stored on-chain.
//
// Package layout (zero-padded to the ledger's fixed size):
//   [24-byte NaCl nonce][NaCl box ciphertext of (form fields ++ 32-byte rand)]
//
// The commitment randomness travels inside the package so the receiver can
// recompute the commitment and compare it with the one registered on-chain.

import nacl from 'tweetnacl';
import {
  FORM_LIMITS,
  type BusinessForm,
  type InvestorForm,
  type DetailsKeyPair,
} from '../../../../contracts/src/witnesses.js';
import { concatBytes } from './codec';

// Must match the Bytes<N> sizes of investorPackages / businessPackages in main.compact.
export const INVESTOR_PACKAGE_BYTES = 256;
export const BUSINESS_PACKAGE_BYTES = 384;

const RAND_BYTES = 32;

const INVESTOR_FIELD_SIZES = [FORM_LIMITS.name, FORM_LIMITS.region, FORM_LIMITS.businessId, FORM_LIMITS.taxId];
const BUSINESS_FIELD_SIZES = [
  FORM_LIMITS.name,
  FORM_LIMITS.description,
  FORM_LIMITS.contactInfo,
  FORM_LIMITS.sector,
  FORM_LIMITS.location,
];

const sum = (sizes: number[]) => sizes.reduce((a, b) => a + b, 0);
const INVESTOR_PLAINTEXT_BYTES = sum(INVESTOR_FIELD_SIZES) + RAND_BYTES;
const BUSINESS_PLAINTEXT_BYTES = sum(BUSINESS_FIELD_SIZES) + RAND_BYTES;

const OVERHEAD = nacl.box.nonceLength + nacl.box.overheadLength;
if (
  OVERHEAD + INVESTOR_PLAINTEXT_BYTES > INVESTOR_PACKAGE_BYTES ||
  OVERHEAD + BUSINESS_PLAINTEXT_BYTES > BUSINESS_PACKAGE_BYTES
) {
  throw new Error('Detail packages no longer fit the ledger sizes in main.compact.');
}

export function generateKeyPair(): DetailsKeyPair {
  const pair = nacl.box.keyPair();
  return { publicKey: pair.publicKey, secretKey: pair.secretKey };
}

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
