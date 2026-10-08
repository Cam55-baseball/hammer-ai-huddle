/**
 * Option B (owner, 2026-10-08): purchase link-out ONLY on the US App Store
 * storefront, detected by StoreKit. Any other storefront or unknown = hidden.
 */
import { afterEach, describe, expect, it } from "vitest";
import { getPurchaseAvailability, US_ONLY_APP_STORE_RELEASE } from "../purchaseGate";
import { normalizeStorefront } from "../nativeStorefront";

const w = window as unknown as { __HAMMERS_NATIVE__?: boolean; __HAMMERS_STOREFRONT__?: string };

afterEach(() => {
  delete w.__HAMMERS_NATIVE__;
  delete w.__HAMMERS_STOREFRONT__;
});

describe("purchase gate — Option B, US storefront only", () => {
  it("no longer assumes a US-only listing", () => {
    expect(US_ONLY_APP_STORE_RELEASE).toBe(false);
  });
  it("web is unchanged", () => {
    expect(getPurchaseAvailability()).toMatchObject({ canShowPurchaseUI: true, isNative: false, mode: "web" });
  });
  it("native with unknown storefront shows nothing to buy", () => {
    w.__HAMMERS_NATIVE__ = true;
    expect(getPurchaseAvailability()).toMatchObject({ canShowPurchaseUI: false, mode: "hidden" });
  });
  it("StoreKit 'USA' shows the website link-out", () => {
    w.__HAMMERS_NATIVE__ = true;
    w.__HAMMERS_STOREFRONT__ = normalizeStorefront("USA")!;
    expect(getPurchaseAvailability()).toMatchObject({ canShowPurchaseUI: true, mode: "native-linkout", storefront: "US" });
  });
  it("raw 'USA' on the window is also read as the US", () => {
    w.__HAMMERS_NATIVE__ = true;
    w.__HAMMERS_STOREFRONT__ = "USA";
    expect(getPurchaseAvailability().storefront).toBe("US");
  });
  it.each(["GBR", "CAN", "MEX", "DEU"])("storefront %s shows nothing to buy", (c) => {
    w.__HAMMERS_NATIVE__ = true;
    w.__HAMMERS_STOREFRONT__ = normalizeStorefront(c)!;
    expect(getPurchaseAvailability().canShowPurchaseUI).toBe(false);
  });
  it("garbage storefront values count as unknown", () => {
    expect(normalizeStorefront("")).toBeNull();
    expect(normalizeStorefront(null)).toBeNull();
    expect(normalizeStorefront("U$A")).toBeNull();
  });
});
