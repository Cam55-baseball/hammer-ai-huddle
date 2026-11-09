/**
 * App Attest verification (Release 0, app_attest_v1). Follows Apple's "Validating apps that connect to your server":
 *  attestation — certificate chain to the pinned Apple App Attestation Root CA, nonce extension
 *  (1.2.840.113635.100.8.2) = SHA256(authData ‖ SHA256(challenge)), keyId = SHA256(public key),
 *  rpIdHash = SHA256(teamId.bundleId), counter 0, aaguid appattest/appattestdevelop, credentialId = keyId;
 *  assertion — ECDSA P-256 signature over SHA256(authenticatorData ‖ SHA256(clientData)), same rpIdHash,
 *  counter strictly greater than the stored counter (replay protection).
 * Pure WebCrypto + local DER/CBOR readers: runs in Deno (edge) and Node (tests).
 */
import { decodeCbor, cborGet } from "./cbor.ts";
import { bytesToB64, b64ToBytes, children, ecdsaDerToRaw, parseCert, pemToDer, readTlv, value, type ParsedCert } from "./der.ts";

const subtle = { digest: (...a: Parameters<SubtleCrypto["digest"]>) => globalThis.crypto.subtle.digest(...a), importKey: (...a: Parameters<SubtleCrypto["importKey"]>) => globalThis.crypto.subtle.importKey(...a), verify: (...a: Parameters<SubtleCrypto["verify"]>) => globalThis.crypto.subtle.verify(...a), sign: (...a: Parameters<SubtleCrypto["sign"]>) => globalThis.crypto.subtle.sign(...a), generateKey: (...a: Parameters<SubtleCrypto["generateKey"]>) => globalThis.crypto.subtle.generateKey(...a), exportKey: (...a: Parameters<SubtleCrypto["exportKey"]>) => globalThis.crypto.subtle.exportKey(...a) } as unknown as SubtleCrypto;
const NONCE_OID = "1.2.840.113635.100.8.2";
const CURVES: Record<string, { name: string; size: number }> = {
  "1.2.840.10045.3.1.7": { name: "P-256", size: 32 },
  "1.3.132.0.34": { name: "P-384", size: 48 },
};
const HASH_FOR_SIG: Record<string, string> = {
  "1.2.840.10045.4.3.2": "SHA-256",
  "1.2.840.10045.4.3.3": "SHA-384",
  "1.2.840.10045.4.3.4": "SHA-512",
};
const AAGUID_PROD = new Uint8Array([...new TextEncoder().encode("appattest"), 0, 0, 0, 0, 0, 0, 0]);
const AAGUID_DEV = new TextEncoder().encode("appattestdevelop");

export class AttestError extends Error { constructor(public code: string) { super(code); } }

const sha256 = async (b: Uint8Array) => new Uint8Array(await subtle.digest("SHA-256", b));
const concat = (a: Uint8Array, b: Uint8Array) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };
const eq = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

async function importKey(spki: Uint8Array, curveOid: string) {
  const c = CURVES[curveOid];
  if (!c) throw new AttestError("unsupported_curve");
  return { key: await subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: c.name }, false, ["verify"]), size: c.size };
}

async function verifySignedBy(child: ParsedCert, issuer: ParsedCert): Promise<boolean> {
  const hash = HASH_FOR_SIG[child.sigAlg];
  if (!hash) throw new AttestError("unsupported_signature");
  const { key, size } = await importKey(issuer.spki, issuer.curve);
  return subtle.verify({ name: "ECDSA", hash }, key, ecdsaDerToRaw(child.signature, size), child.tbs);
}

function parseAuthData(a: Uint8Array) {
  if (a.length < 37) throw new AttestError("bad_auth_data");
  const counter = new DataView(a.buffer, a.byteOffset + 33, 4).getUint32(0);
  const out = { rpIdHash: a.subarray(0, 32), flags: a[32], counter, aaguid: null as Uint8Array | null, credentialId: null as Uint8Array | null };
  if (a.length >= 55) {
    out.aaguid = a.subarray(37, 53);
    const n = (a[53] << 8) | a[54];
    out.credentialId = a.subarray(55, 55 + n);
  }
  return out;
}

/** Nonce from the leaf certificate extension: SEQUENCE { [1] EXPLICIT OCTET STRING }. */
function certNonce(ext: Uint8Array): Uint8Array {
  const seq = readTlv(ext, 0);
  const tagged = children(ext, seq).find((c) => c.tag === 0xa1);
  if (!tagged) throw new AttestError("nonce_missing");
  const oct = children(ext, tagged)[0];
  return value(ext, oct);
}

export interface AttestationResult { publicKeySpkiB64: string; environment: "production" | "development"; receiptB64: string | null; signCount: number }

export async function verifyAttestation(input: {
  attestationB64: string; keyIdB64: string; challenge: string; appId: string; rootPem: string; now?: Date;
}): Promise<AttestationResult> {
  const now = input.now ?? new Date();
  const att = decodeCbor(b64ToBytes(input.attestationB64));
  if (cborGet(att, "fmt") !== "apple-appattest") throw new AttestError("bad_format");
  const stmt = cborGet(att, "attStmt");
  const x5c = cborGet(stmt, "x5c");
  const authData = cborGet(att, "authData");
  if (!Array.isArray(x5c) || x5c.length < 2 || !(authData instanceof Uint8Array)) throw new AttestError("bad_statement");
  const [leaf, inter] = [parseCert(x5c[0] as Uint8Array), parseCert(x5c[1] as Uint8Array)];
  const root = parseCert(pemToDer(input.rootPem));
  for (const c of [leaf, inter, root]) if (now < c.notBefore || now > c.notAfter) throw new AttestError("certificate_expired");
  if (!(await verifySignedBy(leaf, inter)) || !(await verifySignedBy(inter, root))) throw new AttestError("chain_invalid");

  const clientDataHash = await sha256(new TextEncoder().encode(input.challenge));
  const nonce = await sha256(concat(authData, clientDataHash));
  const ext = leaf.extensions.get(NONCE_OID);
  if (!ext || !eq(certNonce(ext), nonce)) throw new AttestError("nonce_mismatch");

  const keyId = b64ToBytes(input.keyIdB64);
  if (!eq(await sha256(leaf.publicKey), keyId)) throw new AttestError("key_id_mismatch");
  const ad = parseAuthData(authData);
  if (!eq(ad.rpIdHash, await sha256(new TextEncoder().encode(input.appId)))) throw new AttestError("app_id_mismatch");
  if (ad.counter !== 0) throw new AttestError("counter_not_zero");
  const env = ad.aaguid && eq(ad.aaguid, AAGUID_PROD) ? "production" : ad.aaguid && eq(ad.aaguid, AAGUID_DEV) ? "development" : null;
  if (!env) throw new AttestError("bad_aaguid");
  if (!ad.credentialId || !eq(ad.credentialId, keyId)) throw new AttestError("credential_mismatch");
  const receipt = cborGet(stmt, "receipt");
  return { publicKeySpkiB64: bytesToB64(leaf.spki), environment: env, receiptB64: receipt instanceof Uint8Array ? bytesToB64(receipt) : null, signCount: 0 };
}

export async function verifyAssertion(input: {
  assertionB64: string; clientData: string; publicKeySpkiB64: string; previousCount: number; appId: string;
}): Promise<{ signCount: number }> {
  const a = decodeCbor(b64ToBytes(input.assertionB64));
  const sig = cborGet(a, "signature"), authData = cborGet(a, "authenticatorData");
  if (!(sig instanceof Uint8Array) || !(authData instanceof Uint8Array)) throw new AttestError("bad_assertion");
  const nonce = await sha256(concat(authData, await sha256(new TextEncoder().encode(input.clientData))));
  const key = await subtle.importKey("spki", b64ToBytes(input.publicKeySpkiB64), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  if (!(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, ecdsaDerToRaw(sig, 32), nonce))) throw new AttestError("signature_invalid");
  const ad = parseAuthData(authData);
  if (!eq(ad.rpIdHash, await sha256(new TextEncoder().encode(input.appId)))) throw new AttestError("app_id_mismatch");
  if (ad.counter <= input.previousCount) throw new AttestError("replayed");
  return { signCount: ad.counter };
}

/**
 * What the iPhone app signs for a measurement save: the SHA-256 of the exact request body plus a
 * timestamp, so an assertion cannot be reused for different numbers or replayed later.
 */
export async function assertionClientData(bodyJson: string, timestampMs: number): Promise<string> {
  const h = await sha256(new TextEncoder().encode(bodyJson));
  return `${[...h].map((b) => b.toString(16).padStart(2, "0")).join("")}.${timestampMs}`;
}

export const ASSERTION_MAX_AGE_MS = 5 * 60_000;
