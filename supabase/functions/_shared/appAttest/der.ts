/** Minimal DER reader for X.509 certificates (only what App Attest verification needs). */
export interface Tlv { tag: number; start: number; headerLen: number; len: number; bytes: Uint8Array }

export function readTlv(buf: Uint8Array, at: number): Tlv {
  if (at + 2 > buf.length) throw new Error("der: truncated");
  const tag = buf[at];
  let len = buf[at + 1], headerLen = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4 || at + 2 + n > buf.length) throw new Error("der: bad length");
    len = 0;
    for (let i = 0; i < n; i++) len = (len * 256) + buf[at + 2 + i];
    headerLen = 2 + n;
  }
  if (at + headerLen + len > buf.length) throw new Error("der: truncated value");
  return { tag, start: at, headerLen, len, bytes: buf.subarray(at, at + headerLen + len) };
}

export const value = (buf: Uint8Array, t: Tlv) => buf.subarray(t.start + t.headerLen, t.start + t.headerLen + t.len);

export function children(buf: Uint8Array, t: Tlv): Tlv[] {
  const out: Tlv[] = [];
  let p = t.start + t.headerLen;
  const end = p + t.len;
  while (p < end) { const c = readTlv(buf, p); out.push(c); p = c.start + c.headerLen + c.len; }
  return out;
}

export function oid(bytes: Uint8Array): string {
  const parts: number[] = [Math.floor(bytes[0] / 40), bytes[0] % 40];
  let v = 0;
  for (let i = 1; i < bytes.length; i++) { v = v * 128 + (bytes[i] & 0x7f); if (!(bytes[i] & 0x80)) { parts.push(v); v = 0; } }
  return parts.join(".");
}

function time(buf: Uint8Array, t: Tlv): Date {
  const s = new TextDecoder().decode(value(buf, t));
  const m = t.tag === 0x17 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s) : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s);
  if (!m) throw new Error("der: bad time");
  const y = t.tag === 0x17 ? (Number(m[1]) >= 50 ? 1900 : 2000) + Number(m[1]) : Number(m[1]);
  return new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])));
}

export interface ParsedCert {
  der: Uint8Array;
  tbs: Uint8Array;
  sigAlg: string;
  signature: Uint8Array;
  spki: Uint8Array;
  /** Raw public key (BIT STRING contents without the unused-bits byte). */
  publicKey: Uint8Array;
  curve: string;
  notBefore: Date;
  notAfter: Date;
  extensions: Map<string, Uint8Array>;
}

export function parseCert(der: Uint8Array): ParsedCert {
  const cert = readTlv(der, 0);
  const [tbsT, algT, sigT] = children(der, cert);
  const tbsKids = children(der, tbsT);
  let i = 0;
  if (tbsKids[0].tag === 0xa0) i++; // version
  const validity = tbsKids[i + 3], spkiT = tbsKids[i + 5];
  const [nb, na] = children(der, validity);
  const [spkiAlg, spkiKey] = children(der, spkiT);
  const algKids = children(der, spkiAlg);
  const keyBits = value(der, spkiKey);
  const extensions = new Map<string, Uint8Array>();
  for (const k of tbsKids.slice(i + 6)) {
    if (k.tag !== 0xa3) continue;
    const seq = children(der, k)[0];
    for (const ext of children(der, seq)) {
      const parts = children(der, ext);
      extensions.set(oid(value(der, parts[0])), value(der, parts[parts.length - 1]));
    }
  }
  const sigBits = value(der, sigT);
  return {
    der, tbs: tbsT.bytes, sigAlg: oid(value(der, children(der, algT)[0])), signature: sigBits.subarray(1),
    spki: spkiT.bytes, publicKey: keyBits.subarray(1), curve: algKids[1] ? oid(value(der, algKids[1])) : "",
    notBefore: time(der, nb), notAfter: time(der, na), extensions,
  };
}

/** ECDSA DER signature (SEQUENCE { r, s }) → raw r||s for WebCrypto. */
export function ecdsaDerToRaw(sig: Uint8Array, size: number): Uint8Array {
  const seq = readTlv(sig, 0);
  const [r, s] = children(sig, seq);
  const out = new Uint8Array(size * 2);
  const put = (v: Uint8Array, off: number) => {
    let b = v;
    while (b.length > size && b[0] === 0) b = b.subarray(1);
    if (b.length > size) throw new Error("der: bad ecdsa integer");
    out.set(b, off + size - b.length);
  };
  put(value(sig, r), 0);
  put(value(sig, s), size);
  return out;
}

export function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
  return b64ToBytes(b64);
}

export function b64ToBytes(b64: string): Uint8Array {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm + "===".slice((norm.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
