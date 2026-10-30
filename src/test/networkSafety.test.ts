import { expect, it } from "vitest";

it("blocks hosted database requests before they reach the network", async () => {
  await expect(fetch("https://hosted-database.example/rest/v1/profiles"))
    .rejects.toThrow("Hosted network access is disabled");
});

it("blocks hosted auth requests before they reach the network", async () => {
  await expect(fetch(new Request("https://hosted-database.example/auth/v1/token", { method: "POST" })))
    .rejects.toThrow("Hosted network access is disabled");
});