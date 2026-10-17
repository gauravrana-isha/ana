/*
 * The cryptography behind "only you can read your journal". Web Crypto only (AES-GCM,
 * HKDF, PBKDF2, ECDH); nothing here ever leaves the device unencrypted.
 *
 * One random 256-bit key (the journal key) encrypts everything. It is never stored as is:
 * each way of unlocking (recovery phrase, passphrase, passkey, this device) keeps its own
 * copy, encrypted ("wrapped") with a key only that method can produce.
 *
 * A sealed value is the string "e1:" + base64url(iv ‖ ciphertext) of the value's JSON, so
 * it fits in any text or JSON column and a reader can recognise it anywhere in a response.
 */

export const SEALED_PREFIX = "e1:";
const IV_BYTES = 12;
const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------- bytes ----------

export function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(parts.reduce((n, p) => n + p.length, 0)));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// ---------- the journal key ----------

/** A new journal key: raw bytes (kept only in memory and in wrapped form). */
export function newJournalKey(): Uint8Array<ArrayBuffer> {
  return randomBytes(32);
}

export function importAesKey(raw: Uint8Array<ArrayBuffer>, usages: KeyUsage[] = ["encrypt", "decrypt"]) {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, usages);
}

// ---------- values ----------

export async function sealBytes(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const iv = randomBytes(IV_BYTES);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  return concat(iv, ct);
}

export async function openBytes(key: CryptoKey, sealed: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const iv = sealed.slice(0, IV_BYTES);
  const ct = sealed.slice(IV_BYTES);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
}

/** Any JSON value → "e1:…". */
export async function sealValue(key: CryptoKey, value: unknown): Promise<string> {
  return SEALED_PREFIX + toB64(await sealBytes(key, enc.encode(JSON.stringify(value))));
}

export function isSealed(v: unknown): v is string {
  return typeof v === "string" && v.startsWith(SEALED_PREFIX);
}

export async function openValue<T = unknown>(key: CryptoKey, sealed: string): Promise<T> {
  const bytes = await openBytes(key, fromB64(sealed.slice(SEALED_PREFIX.length)));
  return JSON.parse(dec.decode(bytes)) as T;
}

// ---------- wrapping keys ----------

async function hkdfKey(ikm: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>, info: string) {
  const base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: enc.encode(info) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** From high-entropy secrets (a recovery phrase's 128 bits, a passkey's PRF output). */
export function wrappingKeyFromSecret(secret: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>, info: string) {
  return hkdfKey(secret, salt, info);
}

export const PASSPHRASE_ITERATIONS = 600_000;

/** From a passphrase a person chose: deliberately slow (PBKDF2-SHA256, 600k rounds). */
export async function wrappingKeyFromPassphrase(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations = PASSPHRASE_ITERATIONS) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function wrap(wrappingKey: CryptoKey, journalKey: Uint8Array<ArrayBuffer>) {
  return toB64(await sealBytes(wrappingKey, journalKey));
}

export async function unwrap(wrappingKey: CryptoKey, wrapped: string) {
  return openBytes(wrappingKey, fromB64(wrapped));
}

// ---------- linking a device (ECDH P-256) ----------

export async function newLinkKeys() {
  return crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
}

export async function exportPublic(key: CryptoKey) {
  return toB64(await crypto.subtle.exportKey("raw", key));
}

export async function linkKey(mine: CryptoKey, theirPublic: string) {
  const theirs = await crypto.subtle.importKey("raw", fromB64(theirPublic), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = await crypto.subtle.deriveKey(
    { name: "ECDH", public: theirs },
    mine,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(new ArrayBuffer(32)), info: enc.encode("ana link v1") },
    shared,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

/**
 * The code a new device shows, made from its public key. The other device only answers a
 * request whose key gives the same code, so the server can't slip its own key in between.
 */
export async function linkCode(publicKey: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", fromB64(publicKey)));
  let code = "";
  for (let i = 0; i < 10; i++) code += CODE_ALPHABET[hash[i] % CODE_ALPHABET.length];
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function normaliseCode(input: string) {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 10 ? `${s.slice(0, 5)}-${s.slice(5)}` : null;
}
