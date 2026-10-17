"use client";

import { useSyncExternalStore } from "react";
import { del, get, set } from "idb-keyval";
import { generateMnemonic, mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import {
  exportPublic,
  fromB64,
  importAesKey,
  isSealed,
  linkCode,
  linkKey,
  newJournalKey,
  newLinkKeys,
  openValue,
  randomBytes,
  sealValue,
  toB64,
  unwrap,
  wrap,
  wrappingKeyFromPassphrase,
  wrappingKeyFromSecret,
  PASSPHRASE_ITERATIONS,
} from "./crypto";

/*
 * The journal key on this device. Locked until it is unlocked once (passkey, recovery
 * phrase, passphrase or another device); then this device keeps its own wrapped copy, under
 * a key the browser can't hand out, so everyday use asks for nothing. Signing out forgets it.
 */

export type KeyKind = "phrase" | "passphrase" | "passkey";

export interface VaultKey {
  id: string;
  kind: KeyKind;
  label: string | null;
  wrapped: string;
  salt: string | null;
  iterations: number | null;
  credentialId: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface VaultStatus {
  /** The journal is locked with a key (set up). */
  set: boolean;
  /** A known value sealed with the journal key, to tell a right key from a wrong one. */
  check: string | null;
  keys: VaultKey[];
  /** Some of the journal is still stored unencrypted (from before), waiting to be sealed. */
  legacy: boolean;
}

type Status = "idle" | "none" | "locked" | "unlocked";
interface State {
  userId: string | null;
  status: Status;
  key: CryptoKey | null;
}

const SERVER_STATE: State = { userId: null, status: "idle", key: null };
let state: State = SERVER_STATE;
/** Raw key bytes, only while unlocked: needed to add an unlock method or link a device. */
let raw: Uint8Array<ArrayBuffer> | null = null;
const listeners = new Set<() => void>();

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useVault() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER_STATE
  );
}

export class VaultLockedError extends Error {
  constructor() {
    super("Your journal is locked on this device.");
  }
}
export class WrongKeyError extends Error {
  constructor(message = "That doesn't unlock this journal.") {
    super(message);
  }
}

export function isUnlocked() {
  return state.status === "unlocked" && !!state.key;
}

function key() {
  if (!state.key) throw new VaultLockedError();
  return state.key;
}

// ---------- sealing ----------

/** For encrypting files (lib/vault/files). */
export function journalKeyForFiles() {
  return key();
}

export function seal(value: unknown) {
  return sealValue(key(), value);
}

/** Seal each named field that has a value (null and undefined stay as they are). */
export async function sealFields<T extends object>(obj: T, fields: (keyof T)[]): Promise<T> {
  const out = { ...obj } as Record<string, unknown>;
  await Promise.all(
    fields.map(async (f) => {
      const v = obj[f];
      if (v !== undefined && v !== null && !isSealed(v)) out[f as string] = await seal(v);
    })
  );
  return out as T;
}

/** Seal every value of a record, keeping its keys (so the server can still merge by key). */
export async function sealValues<V>(record: Record<string, V>): Promise<Record<string, string>> {
  const entries = await Promise.all(Object.entries(record).map(async ([k, v]) => [k, isSealed(v) ? v : await seal(v)] as const));
  return Object.fromEntries(entries);
}

/** Open every sealed value anywhere in a response (objects and arrays, any depth). */
export async function openDeep<T>(value: T): Promise<T> {
  if (isSealed(value)) return (await openValue(key(), value)) as T;
  if (Array.isArray(value)) return (await Promise.all(value.map((v) => openDeep(v)))) as T;
  if (value && typeof value === "object") {
    const entries = await Promise.all(Object.entries(value as Record<string, unknown>).map(async ([k, v]) => [k, await openDeep(v)] as const));
    return Object.fromEntries(entries) as T;
  }
  return value;
}

/** fetch → JSON → opened. Throws VaultLockedError if the journal is locked. */
export async function fetchOpen<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status}`);
  return openDeep((await res.json()) as T);
}

// ---------- this device ----------

const DEVICE = "ana-vault-device";
interface DeviceRecord {
  userId: string;
  deviceKey: CryptoKey;
  wrapped: string;
}

async function rememberOnDevice(userId: string, journal: Uint8Array<ArrayBuffer>) {
  // Non-extractable: script on the page can use it but never read it out.
  const deviceKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  try {
    await set(DEVICE, { userId, deviceKey, wrapped: await wrap(deviceKey, journal) } satisfies DeviceRecord);
  } catch {
    /* storage blocked (private window): unlocked for this visit only */
  }
}

/** Forget the key on this device (sign out, or "lock this device"). */
export async function forgetDevice() {
  raw = null;
  update({ status: state.userId ? "locked" : "idle", key: null });
  await del(DEVICE).catch(() => {});
}

async function become(userId: string, journal: Uint8Array<ArrayBuffer>, check: string | null, remember = true) {
  const k = await importAesKey(journal);
  if (check) {
    const ok = await openValue<string>(k, check).then((v) => v === checkText(userId)).catch(() => false);
    if (!ok) throw new WrongKeyError();
  }
  raw = journal;
  update({ userId, status: "unlocked", key: k });
  if (remember) await rememberOnDevice(userId, journal);
}

const checkText = (userId: string) => `ana:${userId}`;

/** On load: the journal's state, and unlock from this device's copy if there is one. */
export async function start(userId: string, status: Pick<VaultStatus, "set" | "check">) {
  if (state.userId === userId && state.status === "unlocked") return;
  if (!status.set) {
    update({ userId, status: "none", key: null });
    return;
  }
  const rec = await get<DeviceRecord>(DEVICE).catch(() => undefined);
  if (rec && rec.userId === userId) {
    try {
      const journal = await unwrap(rec.deviceKey, rec.wrapped);
      await become(userId, journal, status.check, false);
      return;
    } catch {
      await del(DEVICE).catch(() => {});
    }
  } else if (rec) {
    await del(DEVICE).catch(() => {}); // someone else's
  }
  update({ userId, status: "locked", key: null });
}

// ---------- server ----------

export async function fetchStatus(): Promise<VaultStatus> {
  const res = await fetch("/api/vault", { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't reach your journal");
  return res.json();
}

type NewKey = Omit<VaultKey, "id" | "createdAt" | "lastUsedAt">;

async function postJSON(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

function markUsed(id: string) {
  postJSON("/api/vault/keys", { id }, "PATCH").catch(() => {});
}

// ---------- recovery phrase ----------

export function newPhrase() {
  return generateMnemonic(wordlist, 128);
}

export function isValidPhrase(phrase: string) {
  return validateMnemonic(cleanPhrase(phrase), wordlist);
}

export function cleanPhrase(phrase: string) {
  return phrase.toLowerCase().trim().split(/\s+/).join(" ");
}

export const PHRASE_WORDS = wordlist;

async function phraseKey(phrase: string, journal: Uint8Array<ArrayBuffer>): Promise<NewKey> {
  const salt = randomBytes(16);
  const secret = new Uint8Array(mnemonicToEntropy(cleanPhrase(phrase), wordlist));
  const wk = await wrappingKeyFromSecret(secret, salt, "ana phrase v1");
  return { kind: "phrase", label: null, wrapped: await wrap(wk, journal), salt: toB64(salt), iterations: null, credentialId: null };
}

export async function unlockWithPhrase(userId: string, status: VaultStatus, phrase: string) {
  if (!isValidPhrase(phrase)) throw new WrongKeyError("Those words don't make a recovery phrase. Check each one.");
  const secret = new Uint8Array(mnemonicToEntropy(cleanPhrase(phrase), wordlist));
  for (const k of status.keys.filter((k) => k.kind === "phrase")) {
    try {
      const wk = await wrappingKeyFromSecret(secret, fromB64(k.salt!), "ana phrase v1");
      await become(userId, await unwrap(wk, k.wrapped), status.check);
      markUsed(k.id);
      return;
    } catch {
      /* try the next one */
    }
  }
  throw new WrongKeyError("That recovery phrase is for a different journal, or a word is off.");
}

// ---------- passphrase ----------

async function passphraseKey(passphrase: string, journal: Uint8Array<ArrayBuffer>): Promise<NewKey> {
  const salt = randomBytes(16);
  const wk = await wrappingKeyFromPassphrase(passphrase, salt);
  return { kind: "passphrase", label: null, wrapped: await wrap(wk, journal), salt: toB64(salt), iterations: PASSPHRASE_ITERATIONS, credentialId: null };
}

export async function unlockWithPassphrase(userId: string, status: VaultStatus, passphrase: string) {
  for (const k of status.keys.filter((k) => k.kind === "passphrase")) {
    try {
      const wk = await wrappingKeyFromPassphrase(passphrase, fromB64(k.salt!), k.iterations ?? PASSPHRASE_ITERATIONS);
      await become(userId, await unwrap(wk, k.wrapped), status.check);
      markUsed(k.id);
      return;
    } catch {
      /* next */
    }
  }
  throw new WrongKeyError("That passphrase doesn't unlock this journal.");
}

// ---------- passkey (WebAuthn PRF) ----------

type PrfResults = { enabled?: boolean; results?: { first?: ArrayBuffer } };
type PrfInputs = { prf: { eval?: { first: BufferSource }; evalByCredential?: Record<string, { first: BufferSource }> } };

const PRF_SALT = new TextEncoder().encode("ana journal key v1");

/** Whether this browser can unlock with a passkey (a passkey that supports PRF). */
export async function passkeySupport(): Promise<"yes" | "no" | "maybe"> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return "no";
  const caps = await (PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> })
    .getClientCapabilities?.()
    .catch(() => undefined);
  if (caps && "extension:prf" in caps) return caps["extension:prf"] ? "yes" : "no";
  const uv = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false);
  return uv ? "maybe" : "no";
}

export class PasskeyUnsupportedError extends Error {
  constructor() {
    super("This passkey can't hold your journal key. Use a passphrase instead.");
  }
}

async function prfFrom(credentialId: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>) {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: "public-key", id: credentialId }],
      userVerification: "required",
      extensions: { prf: { eval: { first: salt } } } as PrfInputs as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const out = (assertion?.getClientExtensionResults() as { prf?: PrfResults })?.prf?.results?.first;
  if (!out) throw new PasskeyUnsupportedError();
  return new Uint8Array(out);
}

async function passkeyKey(journal: Uint8Array<ArrayBuffer>, who: { name: string; email: string }): Promise<NewKey> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "ana" },
      user: { id: randomBytes(16), name: who.email || who.name, displayName: who.name || who.email },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      extensions: { prf: { eval: { first: PRF_SALT } } } as PrfInputs as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new PasskeyUnsupportedError();
  const prf = (cred.getClientExtensionResults() as { prf?: PrfResults }).prf;
  if (prf && prf.enabled === false) throw new PasskeyUnsupportedError();
  const id = new Uint8Array(cred.rawId);
  // Some authenticators give the secret at creation; others only when the passkey is used.
  const secret = prf?.results?.first ? new Uint8Array(prf.results.first) : await prfFrom(id, PRF_SALT);
  const salt = randomBytes(16);
  const wk = await wrappingKeyFromSecret(secret, salt, "ana passkey v1");
  return { kind: "passkey", label: deviceLabel(), wrapped: await wrap(wk, journal), salt: toB64(salt), iterations: null, credentialId: toB64(id) };
}

export async function unlockWithPasskey(userId: string, status: VaultStatus) {
  const keys = status.keys.filter((k) => k.kind === "passkey" && k.credentialId);
  if (!keys.length) throw new WrongKeyError("There's no passkey for this journal yet.");
  const evalByCredential = Object.fromEntries(keys.map((k) => [k.credentialId!, { first: PRF_SALT }]));
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: keys.map((k) => ({ type: "public-key" as const, id: fromB64(k.credentialId!) })),
      userVerification: "required",
      extensions: { prf: { evalByCredential } } as PrfInputs as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) throw new WrongKeyError("No passkey was used.");
  const used = toB64(new Uint8Array(assertion.rawId));
  const k = keys.find((x) => x.credentialId === used);
  const out = (assertion.getClientExtensionResults() as { prf?: PrfResults }).prf?.results?.first;
  if (!k || !out) throw new PasskeyUnsupportedError();
  const wk = await wrappingKeyFromSecret(new Uint8Array(out), fromB64(k.salt!), "ana passkey v1");
  await become(userId, await unwrap(wk, k.wrapped), status.check);
  markUsed(k.id);
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "This device";
  return `${device} passkey`;
}

// ---------- setting up ----------

/**
 * A journal key being set up: made first, then the ways to unlock it are added one by one
 * (a passkey right on the tap, as browsers require), then the recovery phrase, then it's
 * saved. Nothing reaches the server until `finishVault`.
 */
export interface VaultDraft {
  journal: Uint8Array<ArrayBuffer>;
  keys: NewKey[];
}

export function newDraft(): VaultDraft {
  return { journal: newJournalKey(), keys: [] };
}

export async function draftAddPasskey(draft: VaultDraft, who: { name: string; email: string }) {
  draft.keys = [...draft.keys.filter((k) => k.kind !== "passkey"), await passkeyKey(draft.journal, who)];
}

export async function draftAddPassphrase(draft: VaultDraft, passphrase: string) {
  draft.keys = [...draft.keys.filter((k) => k.kind !== "passphrase"), await passphraseKey(passphrase, draft.journal)];
}

/** Save the key (with its recovery phrase) and unlock this device. */
export async function finishVault(userId: string, draft: VaultDraft, phrase: string) {
  const keys = [await phraseKey(phrase, draft.journal), ...draft.keys];
  const k = await importAesKey(draft.journal);
  await postJSON("/api/vault", { check: await sealValue(k, checkText(userId)), keys });
  await become(userId, draft.journal, null);
}

/** Add a way to unlock (needs the journal unlocked here). */
export async function addKey(kind: "passkey" | "passphrase", opts: { passphrase?: string; who?: { name: string; email: string } }) {
  if (!raw) throw new VaultLockedError();
  const k = kind === "passkey" ? await passkeyKey(raw, opts.who!) : await passphraseKey(opts.passphrase!, raw);
  return postJSON("/api/vault/keys", k);
}

/** A new recovery phrase; the old one stops working. Returns the new phrase to show once. */
export async function replacePhrase(status: VaultStatus) {
  if (!raw) throw new VaultLockedError();
  const phrase = newPhrase();
  await postJSON("/api/vault/keys", { ...(await phraseKey(phrase, raw)), replace: status.keys.filter((k) => k.kind === "phrase").map((k) => k.id) });
  return phrase;
}

export async function removeKey(id: string) {
  return postJSON("/api/vault/keys", { id }, "DELETE");
}

// ---------- linking another device ----------

/** New device: ask to be let in. Returns the code to show and a waiter for the answer. */
export async function requestLink(userId: string, status: VaultStatus) {
  const pair = await newLinkKeys();
  const publicKey = await exportPublic(pair.publicKey);
  const { id } = await postJSON("/api/vault/link", { publicKey });
  const code = await linkCode(publicKey);
  let stopped = false;
  const wait = async () => {
    while (!stopped) {
      await new Promise((r) => setTimeout(r, 2000));
      if (stopped) break;
      const res = await fetch(`/api/vault/link/${id}`, { cache: "no-store" });
      if (res.status === 404) throw new Error("That request has ended. Start again.");
      const data = await res.json().catch(() => ({}));
      if (data.response) {
        const { publicKey: theirs, wrapped } = JSON.parse(data.response) as { publicKey: string; wrapped: string };
        const shared = await linkKey(pair.privateKey, theirs);
        await become(userId, await unwrap(shared, wrapped), status.check);
        fetch(`/api/vault/link/${id}`, { method: "DELETE" }).catch(() => {});
        return;
      }
    }
  };
  return {
    code,
    wait,
    cancel: () => {
      stopped = true;
      fetch(`/api/vault/link/${id}`, { method: "DELETE" }).catch(() => {});
    },
  };
}

/** Unlocked device: let in the device showing this code. */
export async function approveLink(code: string) {
  if (!raw) throw new VaultLockedError();
  const res = await fetch("/api/vault/link", { cache: "no-store" });
  const pending = ((await res.json().catch(() => ({}))).requests ?? []) as { id: string; publicKey: string }[];
  for (const r of pending) {
    if ((await linkCode(r.publicKey)) !== code) continue;
    const pair = await newLinkKeys();
    const shared = await linkKey(pair.privateKey, r.publicKey);
    const response = JSON.stringify({ publicKey: await exportPublic(pair.publicKey), wrapped: await wrap(shared, raw) });
    await postJSON(`/api/vault/link/${r.id}`, { response }, "PUT");
    return;
  }
  throw new WrongKeyError("No device is waiting with that code. Check it, or start again on the new device.");
}

/** For showing a phrase as numbered words. */
export function phraseWords(phrase: string) {
  return cleanPhrase(phrase).split(" ");
}

