import { describe, it, expect } from "vitest";
import { createClaim, getClaim, putClaim, listClaims, type StoredClaim } from "../lib/store";

describe("Claim Lifecycle Store", () => {
  it("creates a new pending contribution claim with valid initial state", async () => {
    const claim = await createClaim({
      issuerOrg: "FIEM ACM",
      claimantWallet: "GBOCN6DMZYM6HH75NIKWHDGM3VCNAWVSHFHBFBZTWVSREED4PWYIM2GW",
      type: "mentoring",
      event: "HackSpire 2026",
      date: "2026-08-30",
      description: "Mentored 12 student teams on Soroban smart contracts.",
      evidence: [
        {
          kind: "link",
          url: "https://hackspire.dev/mentors/indrajit",
          label: "Mentor Directory",
        },
      ],
    });

    expect(claim.id).toBeDefined();
    expect(claim.status).toBe("pending");
    expect(claim.claimantWallet).toBe("GBOCN6DMZYM6HH75NIKWHDGM3VCNAWVSHFHBFBZTWVSREED4PWYIM2GW");
    expect(claim.issuerOrg).toBe("FIEM ACM");

    const retrieved = await getClaim(claim.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.description).toBe("Mentored 12 student teams on Soroban smart contracts.");
  });

  it("updates claim status during AI verification and organizer approval", async () => {
    const claim = await createClaim({
      issuerOrg: "GDG Groups",
      claimantWallet: "GASI3MYJJQFKZBORHRXRY6NZ62Q3VUCKY6UQYADGKXSUNE33GPK4IM7K",
      type: "pr",
      event: "portal",
      date: "2026-08-28",
      description: "Merged PR #42 in community portal.",
      evidence: [
        {
          kind: "link",
          url: "https://github.com/gdg-dev/portal/pull/42",
          label: "GitHub Pull Request",
        },
      ],
    });

    // Verification update
    claim.status = "verified";
    claim.verification = {
      provider: "qwen",
      model: "qwen-max",
      confidence: 0.94,
      approved: true,
      citation: "Verified PR #42 merged by maintainer in gdg-dev/portal.",
      checkedAt: new Date().toISOString(),
    };
    const updated = await putClaim(claim);
    expect(updated.status).toBe("verified");
    expect(updated.verification?.confidence).toBe(0.94);

    // Minting update
    claim.status = "minted";
    claim.credential = {
      tokenId: 12,
      cid: "bafybeicredential123456",
      txHash: "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
    };
    const minted = await putClaim(claim);
    expect(minted.status).toBe("minted");
    expect(minted.credential?.tokenId).toBe(12);
  });

  it("filters claims by status correctly", async () => {
    const all = await listClaims();
    expect(Array.isArray(all)).toBe(true);

    const mintedList = await listClaims("minted");
    expect(mintedList.every((c) => c.status === "minted")).toBe(true);
  });
});
