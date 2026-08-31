import { listClaims, putClaim, type StoredClaim } from "./store";

/**
 * The three live demo credentials — the exact records written by the
 * 2026-08-30 end-to-end seed. They are real on-chain credentials
 * (tokens #4–#6 on the testnet credential contract), so these records stay
 * true no matter how many times the app is redeployed.
 *
 * Pure data only — bootstrapping never touches the chain.
 */
export const DEMO_CLAIMS: StoredClaim[] = [
  {
    type: "mentoring",
    description:
      "Mentored a first-time hackathon team through Soroban contract deployment, covering auth entries and testnet RPC.",
    event: "HackSpire 2026",
    date: "2026-03-21",
    claimantWallet: "GBR2PJQPVU2MNNWNTABFDSLG7XQAWAZRSSMRXWRPQKNAMVBD7VOCRCKY",
    issuerOrg: "HackSpire",
    evidence: [
      {
        kind: "link",
        url: "https://github.com/stellar/soroban-examples",
        label: "Soroban examples used in the mentoring session",
      },
    ],
    id: "claim_mtfs2isei64g18",
    status: "minted",
    createdAt: "2026-08-30T12:20:37.406Z",
    metadata: {
      standard: "tessera-credential/1",
      name: "HackSpire · Mentoring",
      type: "mentoring",
      description:
        "Mentored a first-time hackathon team through Soroban contract deployment, covering auth entries and testnet RPC.",
      event: "HackSpire 2026",
      date: "2026-03-21",
      claimant: "GBR2PJQPVU2MNNWNTABFDSLG7XQAWAZRSSMRXWRPQKNAMVBD7VOCRCKY",
      issuer: { org: "HackSpire" },
      evidence: [
        {
          kind: "link",
          url: "https://github.com/stellar/soroban-examples",
          label: "Soroban examples used in the mentoring session",
        },
      ],
      issuedBy: "Tessera",
    },
    credential: {
      tokenId: 4,
      cid: "local:claim_mtfs2isei64g18",
      txHash: "34b339b1eeae2d656b3eadc014c0ad2c1c17a72f839a44058879cb22f30b5eba",
    },
  },
  {
    type: "pr",
    description:
      "Merged a pull request adding retry-with-backoff handling to the Soroban RPC client's transaction submission path.",
    event: "js-soroban-client",
    date: "2026-05-14",
    claimantWallet: "GB4BCHR7PFFHZ7QHW2MPIAMEROXTMKKW2D7Z7AFQP6GDM3RI36QDDST5",
    issuerOrg: "GDG Groups",
    evidence: [
      {
        kind: "link",
        url: "https://github.com/stellar/js-soroban-client",
        label: "Repository of the merged PR",
      },
    ],
    id: "claim_mtfs2r1w1d132u",
    status: "minted",
    createdAt: "2026-08-30T12:20:48.116Z",
    metadata: {
      standard: "tessera-credential/1",
      name: "GDG Groups · Open-source contribution",
      type: "pr",
      description:
        "Merged a pull request adding retry-with-backoff handling to the Soroban RPC client's transaction submission path.",
      event: "js-soroban-client",
      date: "2026-05-14",
      claimant: "GB4BCHR7PFFHZ7QHW2MPIAMEROXTMKKW2D7Z7AFQP6GDM3RI36QDDST5",
      issuer: { org: "GDG Groups" },
      evidence: [
        {
          kind: "link",
          url: "https://github.com/stellar/js-soroban-client",
          label: "Repository of the merged PR",
        },
      ],
      issuedBy: "Tessera",
    },
    credential: {
      tokenId: 5,
      cid: "local:claim_mtfs2r1w1d132u",
      txHash: "d139e6a61596911260464d06ca5679ec8bbec7a3bce8c375a23abfd14e9d93b7",
    },
  },
  {
    type: "talk",
    description:
      "Gave a 10-minute lightning talk on soulbound credentials and portable community contribution history on Stellar.",
    event: "GDG DevFest Kolkata",
    date: "2026-04-11",
    claimantWallet: "GCNEERET6QU7K654J4AAJ57KCWVSL77UCU3IMPONATAMKPJQ2QNTWIT3",
    issuerOrg: "FIEM ACM",
    evidence: [
      {
        kind: "link",
        url: "https://gdg.community.dev/",
        label: "GDG community (event host)",
      },
    ],
    id: "claim_mtfs2yrj76ajat",
    status: "minted",
    createdAt: "2026-08-30T12:20:58.111Z",
    metadata: {
      standard: "tessera-credential/1",
      name: "FIEM ACM · Talk",
      type: "talk",
      description:
        "Gave a 10-minute lightning talk on soulbound credentials and portable community contribution history on Stellar.",
      event: "GDG DevFest Kolkata",
      date: "2026-04-11",
      claimant: "GCNEERET6QU7K654J4AAJ57KCWVSL77UCU3IMPONATAMKPJQ2QNTWIT3",
      issuer: { org: "FIEM ACM" },
      evidence: [
        {
          kind: "link",
          url: "https://gdg.community.dev/",
          label: "GDG community (event host)",
        },
      ],
      issuedBy: "Tessera",
    },
    credential: {
      tokenId: 6,
      cid: "local:claim_mtfs2yrj76ajat",
      txHash: "eb00382c0c76d6f5cda088a9cc450958b1fe21bf2745b8889b20950c2f2d43f0",
    },
  },
];

let bootstrapped: Promise<void> | null = null;

/**
 * The claims file is ephemeral on Vercel — after every deploy the store is
 * empty and the organizer dashboard loses its demo content. When any of the
 * live demo credentials is missing, re-hydrate the store with them.
 * Idempotent; at most one check per serverless instance, no chain calls.
 */
export function bootstrapDemoClaims(): Promise<void> {
  if (!bootstrapped) {
    bootstrapped = (async () => {
      try {
        const existing = await listClaims();
        const ids = new Set(existing.map((c) => c.id));
        const missing = DEMO_CLAIMS.filter((c) => !ids.has(c.id));
        for (const c of missing) await putClaim(c);
      } catch {
        /* store unavailable — read paths degrade as before */
      }
    })();
  }
  return bootstrapped;
}
