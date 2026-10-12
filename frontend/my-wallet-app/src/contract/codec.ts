// Goes to: frontend/my-wallet-app/src/contract/codec.ts
//
// Text <-> fixed-size byte helpers shared by the forms, ContractAPI and the
// details crypto. Unlike the old toBytes32, encodeText THROWS when a value
// does not fit, so nothing is ever silently truncated.

import {
  FORM_LIMITS,
  type BusinessForm,
  type InvestorForm,
} from '../../../../contracts/src/witnesses.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const byteLength = (text: string): number => encoder.encode(text).length;

export function encodeText(text: string, size: number, label = 'Value'): Uint8Array {
  const bytes = encoder.encode(text);
  if (bytes.length > size) {
    throw new Error(`${label} is ${bytes.length} bytes; the limit is ${size}.`);
  }
  const out = new Uint8Array(size);
  out.set(bytes);
  return out;
}

// Inverse of encodeText: drops the trailing zero padding and decodes UTF-8.
export function decodeText(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return decoder.decode(bytes.slice(0, end));
}

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const isAllZero = (bytes: Uint8Array): boolean => bytes.every((b) => b === 0);

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export interface BusinessFormText {
  name: string;
  description: string;
  contactInfo: string;
  sector: string;
  location: string;
}

// Use this in RegisterBusinessPage to build the form passed to setBusinessForm.
export function encodeBusinessForm(v: BusinessFormText): BusinessForm {
  return {
    name: encodeText(v.name, FORM_LIMITS.name, 'Business name'),
    description: encodeText(v.description, FORM_LIMITS.description, 'Description'),
    contactInfo: encodeText(v.contactInfo, FORM_LIMITS.contactInfo, 'Contact'),
    sector: encodeText(v.sector, FORM_LIMITS.sector, 'Sector'),
    location: encodeText(v.location, FORM_LIMITS.location, 'Location'),
  };
}

export interface InvestorFormText {
  name: string;
  region: string;
  businessId: string;
  taxId: string;
}

export function encodeInvestorForm(v: InvestorFormText): InvestorForm {
  return {
    name: encodeText(v.name, FORM_LIMITS.name, 'Name'),
    region: encodeText(v.region, FORM_LIMITS.region, 'Region'),
    businessId: encodeText(v.businessId, FORM_LIMITS.businessId, 'Business ID'),
    taxId: encodeText(v.taxId, FORM_LIMITS.taxId, 'Tax ID'),
  };
}
