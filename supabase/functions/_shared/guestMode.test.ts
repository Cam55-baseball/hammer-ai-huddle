import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { guestRequestError, guestResultFrom } from "./guestMode.ts";

const f = "data:image/jpeg;base64,AAAA";
const ok = { sport: "baseball", module: "hitting", frames: [f, f, f], under13: false };

Deno.test("guest request with 13+ player runs", () => assertEquals(guestRequestError(ok), null));
Deno.test("under-13 guest blocked without parent permission", () => {
  assert(guestRequestError({ ...ok, under13: true }));
  assertEquals(guestRequestError({ ...ok, under13: true, parentPermissionConfirmed: true }), null);
});
Deno.test("age answer is required", () => assert(guestRequestError({ ...ok, under13: undefined })));
Deno.test("non-image frames refused", () => assert(guestRequestError({ ...ok, frames: ["x", "y", "z"] })));
Deno.test("result keeps only shown fields and clamps score", () => {
  assertEquals(guestResultFrom({ score: 140, strengths: ["a"], fixes: [], drills: [], name: "Leak" }),
    { score: 100, strengths: ["a"], fixes: [], drills: [] });
});
