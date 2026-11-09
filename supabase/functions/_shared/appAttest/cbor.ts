/** Minimal CBOR decoder (RFC 8949) for App Attest objects: ints, byte/text strings, arrays, maps, tags, simple values. */
export type CborValue = number | bigint | string | Uint8Array | boolean | null | undefined | CborValue[] | Map<CborValue, CborValue>;

export function decodeCbor(bytes: Uint8Array): CborValue {
  let pos = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const need = (n: number) => { if (pos + n > bytes.length) throw new Error("cbor: truncated"); };
  const readLen = (info: number): number => {
    if (info < 24) return info;
    if (info === 24) { need(1); return bytes[pos++]; }
    if (info === 25) { need(2); const v = view.getUint16(pos); pos += 2; return v; }
    if (info === 26) { need(4); const v = view.getUint32(pos); pos += 4; return v; }
    if (info === 27) { need(8); const v = view.getBigUint64(pos); pos += 8; if (v > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("cbor: length too large"); return Number(v); }
    throw new Error("cbor: indefinite lengths are not used by App Attest");
  };
  const item = (depth: number): CborValue => {
    if (depth > 32) throw new Error("cbor: too deep");
    need(1);
    const ib = bytes[pos++];
    const major = ib >> 5, info = ib & 31;
    switch (major) {
      case 0: return readLen(info);
      case 1: return -1 - readLen(info);
      case 2: { const n = readLen(info); need(n); const b = bytes.slice(pos, pos + n); pos += n; return b; }
      case 3: { const n = readLen(info); need(n); const s = new TextDecoder().decode(bytes.subarray(pos, pos + n)); pos += n; return s; }
      case 4: { const n = readLen(info); const out: CborValue[] = []; for (let i = 0; i < n; i++) out.push(item(depth + 1)); return out; }
      case 5: { const n = readLen(info); const m = new Map<CborValue, CborValue>(); for (let i = 0; i < n; i++) { const k = item(depth + 1); m.set(k, item(depth + 1)); } return m; }
      case 6: { readLen(info); return item(depth + 1); }
      case 7:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        if (info === 23) return undefined;
        throw new Error("cbor: unsupported simple/float value");
    }
    throw new Error("cbor: bad major type");
  };
  const v = item(0);
  if (pos !== bytes.length) throw new Error("cbor: trailing bytes");
  return v;
}

export function cborGet(m: CborValue, key: string): CborValue {
  if (!(m instanceof Map)) throw new Error("cbor: expected a map");
  return m.get(key);
}
