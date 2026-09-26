/**
 * Documents why native purchase UI is visible: the App Store listing is
 * US-only (US_ONLY_APP_STORE_RELEASE). If availability ever expands beyond the
 * US, real storefront detection is mandatory first — the fail-closed branch
 * below must still hide purchase UI when the constant is false.
 */
import { afterEach, describe, expect, it } from "vitest";
import { getPurchaseAvailability, US_ONLY_APP_STORE_RELEASE } from "../purchaseGate";

const w = window as unknown as { __HAMMERS_NATIVE__?: boolean; __HAMMERS_STOREFRONT__?: string };

afterEach(() => {
  delete w.__HAMMERS_NATIVE__;
  delete w.__HAMMERS_STOREFRONT__;
});

describe("purchase gate — US-only App Store release", () => {
  it("the release is declared US-only (App Store Connect availability = United States only)", () => {
    expect(US_ONLY_APP_STORE_RELEASE).toBe(true);
  });

  it("web is unchanged", () => {
    const a = getPurchaseAvailability();
    expect(a).toMatchObject({ canShowPurchaseUI: true, isNative: false, mode: "web" });
  });

  it("native with unknown storefront shows link-out purchase while the release is US-only", () => {
    w.__HAMMERS_NATIVE__ = true;
    expect(getPurchaseAvailability()).toMatchObject({ canShowPurchaseUI: true, mode: "native-linkout" });
  });

  it("DEPENDENCY: without the US-only listing, unknown storefront fails closed", () => {
    w.__HAMMERS_NATIVE__ = true;
    expect(getPurchaseAvailability({ usOnlyRelease: false })).toMatchObject({
      canShowPurchaseUI: false,
      mode: "hidden",
    });
  });

  it("a reported non-US storefront is always hidden", () => {
    w.__HAMMERS_NATIVE__ = true;
    w.__HAMMERS_STOREFRONT__ = "GB";
    expect(getPurchaseAvailability().canShowPurchaseUI).toBe(false);
  });

  it("a reported US storefront is allowed even after the constant is turned off", () => {
    w.__HAMMERS_NATIVE__ = true;
    w.__HAMMERS_STOREFRONT__ = "US";
    expect(getPurchaseAvailability({ usOnlyRelease: false }).canShowPurchaseUI).toBe(true);
  });
});
