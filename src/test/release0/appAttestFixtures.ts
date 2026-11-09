/** Test-only builders: a fake "Apple" root → intermediate → leaf chain and CBOR objects shaped like App Attest's. */
const subtle = { digest: (...a: Parameters<SubtleCrypto["digest"]>) => globalThis.crypto.subtle.digest(...a), importKey: (...a: Parameters<SubtleCrypto["importKey"]>) => globalThis.crypto.subtle.importKey(...a), verify: (...a: Parameters<SubtleCrypto["verify"]>) => globalThis.crypto.subtle.verify(...a), sign: (...a: Parameters<SubtleCrypto["sign"]>) => globalThis.crypto.subtle.sign(...a), generateKey: (...a: Parameters<SubtleCrypto["generateKey"]>) => globalThis.crypto.subtle.generateKey(...a), exportKey: (...a: Parameters<SubtleCrypto["exportKey"]>) => globalThis.crypto.subtle.exportKey(...a) } as unknown as SubtleCrypto;

const len = (n: number) => (n < 128 ? [n] : n < 256 ? [0x81, n] : [0x82, n >> 8, n & 255]);
export const tlv = (tag: number, body: Uint8Array) => new Uint8Array([tag, ...len(body.length), ...body]);
const cat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((a, b) => a + b.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
const seq = (...p: Uint8Array[]) => tlv(0x30, cat(...p));
const oidBytes = (s: string) => {
  const n = s.split(".").map(Number);
  const out = [n[0] * 40 + n[1]];
  for (const v of n.slice(2)) { const st: number[] = []; let x = v; st.unshift(x & 127); while ((x >>= 7)) st.unshift((x & 127) | 128); out.push(...st); }
  return tlv(0x06, new Uint8Array(out));
};
const int = (v: number) => tlv(0x02, new Uint8Array([v]));
const utc = (d: Date) => tlv(0x17, new TextEncoder().encode(d.toISOString().replace(/[-:T]/g, "").slice(2, 14) + "Z"));
const name = (cn: string) => seq(tlv(0x31, seq(oidBytes("2.5.4.3"), tlv(0x0c, new TextEncoder().encode(cn)))));
const rawToDer = (raw: Uint8Array) => {
  const h = raw.length / 2;
  const i = (b: Uint8Array) => { let x = b; while (x.length > 1 && x[0] === 0 && !(x[1] & 0x80)) x = x.subarray(1); return tlv(0x02, x[0] & 0x80 ? cat(new Uint8Array([0]), x) : x); };
  return seq(i(raw.subarray(0, h)), i(raw.subarray(h)));
};

export interface KeyPairInfo { pair: CryptoKeyPair; spki: Uint8Array; curve: "P-256" | "P-384" }
export async function ecKey(curve: "P-256" | "P-384"): Promise<KeyPairInfo> {
  const pair = await subtle.generateKey({ name: "ECDSA", namedCurve: curve }, true, ["sign", "verify"]) as CryptoKeyPair;
  return { pair, spki: new Uint8Array(await subtle.exportKey("spki", pair.publicKey)), curve };
}

export async function cert(o: { subject: string; issuer: string; subjectKey: KeyPairInfo; issuerKey: KeyPairInfo; extensions?: Array<[string, Uint8Array]>; notAfter?: Date }) {
  const hash = o.issuerKey.curve === "P-384" ? "SHA-384" : "SHA-256";
  const alg = seq(oidBytes(hash === "SHA-384" ? "1.2.840.10045.4.3.3" : "1.2.840.10045.4.3.2"));
  const exts = o.extensions?.length ? [tlv(0xa3, seq(...o.extensions.map(([id, v]) => seq(oidBytes(id), tlv(0x04, v)))))] : [];
  const tbs = seq(tlv(0xa0, int(2)), int(7), alg, name(o.issuer), seq(utc(new Date("2024-01-01T00:00:00Z")), utc(o.notAfter ?? new Date("2049-01-01T00:00:00Z"))),
    name(o.subject), o.subjectKey.spki, ...exts);
  const raw = new Uint8Array(await subtle.sign({ name: "ECDSA", hash }, o.issuerKey.pair.privateKey, tbs));
  return seq(tbs, alg, tlv(0x03, cat(new Uint8Array([0]), rawToDer(raw))));
}

export const toPem = (der: Uint8Array) => `-----BEGIN CERTIFICATE-----\n${btoa(String.fromCharCode(...der))}\n-----END CERTIFICATE-----`;
export const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
export const sha256 = async (b: Uint8Array) => new Uint8Array(await subtle.digest("SHA-256", b));

// CBOR encoder (subset)
const head = (major: number, n: number) => (n < 24 ? [major << 5 | n] : n < 256 ? [major << 5 | 24, n] : [major << 5 | 25, n >> 8, n & 255]);
export function cbor(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return new Uint8Array([...head(2, v.length), ...v]);
  if (typeof v === "string") { const b = new TextEncoder().encode(v); return new Uint8Array([...head(3, b.length), ...b]); }
  if (Array.isArray(v)) return cat(new Uint8Array(head(4, v.length)), ...v.map(cbor));
  if (typeof v === "number") return new Uint8Array(head(0, v));
  const e = Object.entries(v as Record<string, unknown>);
  return cat(new Uint8Array(head(5, e.length)), ...e.flatMap(([k, x]) => [cbor(k), cbor(x)]));
}

export function authData(o: { rpIdHash: Uint8Array; counter: number; aaguid?: Uint8Array; credentialId?: Uint8Array }) {
  const c = new Uint8Array(4); new DataView(c.buffer).setUint32(0, o.counter);
  const parts = [o.rpIdHash, new Uint8Array([0x40]), c];
  if (o.aaguid && o.credentialId) parts.push(o.aaguid, new Uint8Array([o.credentialId.length >> 8, o.credentialId.length & 255]), o.credentialId);
  return cat(...parts);
}

export const nonceExtension = (nonce: Uint8Array) => seq(tlv(0xa1, tlv(0x04, nonce)));
export const concat = cat;
export { rawToDer };
