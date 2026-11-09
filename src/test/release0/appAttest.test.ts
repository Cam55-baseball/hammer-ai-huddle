import { describe, it, expect, beforeAll } from "vitest";
import { verifyAttestation, verifyAssertion, assertionClientData, AttestError } from "../../../supabase/functions/_shared/appAttest/verify";
import { decodeCbor } from "../../../supabase/functions/_shared/appAttest/cbor";
import { parseCert, pemToDer } from "../../../supabase/functions/_shared/appAttest/der";
import { APPLE_APP_ATTEST_ROOT_PEM } from "../../../supabase/functions/_shared/appAttest/appleRoot";
import { authData, b64, cbor, cert, concat, ecKey, nonceExtension, rawToDer, sha256, toPem, type KeyPairInfo } from "./appAttestFixtures";

const APP_ID = "MN5BLLTAMV.org.hammersmodality.app";
const PROD = new Uint8Array([...new TextEncoder().encode("appattest"), 0, 0, 0, 0, 0, 0, 0]);
let rootKey: KeyPairInfo, interKey: KeyPairInfo, leafKey: KeyPairInfo, rootPem: string, interDer: Uint8Array, keyId: Uint8Array, rpIdHash: Uint8Array;

async function attestation(challenge: string, o: { aaguid?: Uint8Array; counter?: number; app?: string; wrongNonce?: boolean } = {}) {
  const ad = authData({ rpIdHash: await sha256(new TextEncoder().encode(o.app ?? APP_ID)), counter: o.counter ?? 0, aaguid: o.aaguid ?? PROD, credentialId: keyId });
  const nonce = await sha256(concat(ad, await sha256(new TextEncoder().encode(o.wrongNonce ? "other" : challenge))));
  const leaf = await cert({ subject: "leaf", issuer: "Apple App Attestation CA 1", subjectKey: leafKey, issuerKey: interKey, extensions: [["1.2.840.113635.100.8.2", nonceExtension(nonce)]] });
  return b64(cbor({ fmt: "apple-appattest", attStmt: { x5c: [leaf, interDer], receipt: new Uint8Array([1, 2, 3]) }, authData: ad }));
}

async function assertion(clientData: string, counter: number, key = leafKey) {
  const ad = authData({ rpIdHash, counter });
  const nonce = await sha256(concat(ad, await sha256(new TextEncoder().encode(clientData))));
  const raw = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key.pair.privateKey, nonce));
  return b64(cbor({ signature: rawToDer(raw), authenticatorData: ad }));
}

beforeAll(async () => {
  rootKey = await ecKey("P-384"); interKey = await ecKey("P-384"); leafKey = await ecKey("P-256");
  rootPem = toPem(await cert({ subject: "Test Root", issuer: "Test Root", subjectKey: rootKey, issuerKey: rootKey }));
  interDer = await cert({ subject: "Apple App Attestation CA 1", issuer: "Test Root", subjectKey: interKey, issuerKey: rootKey });
  keyId = await sha256(new Uint8Array(await crypto.subtle.exportKey("raw", leafKey.pair.publicKey)));
  rpIdHash = await sha256(new TextEncoder().encode(APP_ID));
});

describe("App Attest server verification (Release 0, app_attest_v1)", () => {
  it("the pinned Apple root parses and is valid until 2045", () => {
    const root = parseCert(pemToDer(APPLE_APP_ATTEST_ROOT_PEM));
    expect(root.curve).toBe("1.3.132.0.34");
    expect(root.notAfter.getUTCFullYear()).toBe(2045);
  });

  it("accepts a correct attestation and stores the device key as production", async () => {
    const r = await verifyAttestation({ attestationB64: await attestation("chal-1"), keyIdB64: b64(keyId), challenge: "chal-1", appId: APP_ID, rootPem });
    expect(r.environment).toBe("production");
    expect(r.signCount).toBe(0);
    expect(r.publicKeySpkiB64).toBe(b64(leafKey.spki));
  });

  it("rejects a wrong challenge, a different app, a used counter, a chain from another root", async () => {
    const base = { keyIdB64: b64(keyId), challenge: "chal-2", appId: APP_ID, rootPem };
    await expect(verifyAttestation({ ...base, attestationB64: await attestation("chal-2", { wrongNonce: true }) })).rejects.toThrow("nonce_mismatch");
    await expect(verifyAttestation({ ...base, attestationB64: await attestation("chal-2", { app: "OTHER.app" }) })).rejects.toThrow("app_id_mismatch");
    await expect(verifyAttestation({ ...base, attestationB64: await attestation("chal-2", { counter: 3 }) })).rejects.toThrow("counter_not_zero");
    await expect(verifyAttestation({ ...base, rootPem: APPLE_APP_ATTEST_ROOT_PEM, attestationB64: await attestation("chal-2") })).rejects.toThrow("chain_invalid");
  });

  it("assertions: valid signature passes; a reused counter, other words or another key fail", async () => {
    const spki = b64(leafKey.spki);
    const cd = await assertionClientData('{"value":42}', 1_700_000_000_000);
    expect((await verifyAssertion({ assertionB64: await assertion(cd, 5), clientData: cd, publicKeySpkiB64: spki, previousCount: 4, appId: APP_ID })).signCount).toBe(5);
    await expect(verifyAssertion({ assertionB64: await assertion(cd, 5), clientData: cd, publicKeySpkiB64: spki, previousCount: 5, appId: APP_ID })).rejects.toThrow("replayed");
    const other = await assertionClientData('{"value":99}', 1_700_000_000_000);
    await expect(verifyAssertion({ assertionB64: await assertion(cd, 6), clientData: other, publicKeySpkiB64: spki, previousCount: 5, appId: APP_ID })).rejects.toThrow("signature_invalid");
    const stranger = await ecKey("P-256");
    await expect(verifyAssertion({ assertionB64: await assertion(cd, 7, stranger), clientData: cd, publicKeySpkiB64: spki, previousCount: 5, appId: APP_ID })).rejects.toBeInstanceOf(AttestError);
  });

  it("CBOR reader decodes maps, byte strings and arrays exactly", () => {
    const m = decodeCbor(cbor({ a: [1, "x"], b: new Uint8Array([9]) })) as Map<unknown, unknown>;
    expect(m.get("a")).toEqual([1, "x"]);
    expect(m.get("b")).toEqual(new Uint8Array([9]));
  });
});
