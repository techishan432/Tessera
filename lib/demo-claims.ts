import { listClaims, putClaim, type StoredClaim } from "./store";

/**
 * The three live demo credentials — the exact records written by the
 * 2026-08-31 end-to-end seed on the v2 contracts (tokens #1-#3). They are
 * real on-chain credentials, so these records stay true no matter how many
 * times the app is redeployed.
 *
 * Pure data only — bootstrapping never touches the chain.
 */
export const DEMO_CLAIMS: StoredClaim[] = [
  {
    "type": "mentoring",
    "description": "Mentored a first-time hackathon team through Soroban contract deployment, covering auth entries and testnet RPC.",
    "event": "HackSpire 2026",
    "date": "2026-03-21",
    "claimantWallet": "GC6WLOXCCWZHE34FA5NBS45CHYRXJA7FMKE47Y52JWPH46QJP6LY2HT4",
    "issuerOrg": "HackSpire",
    "evidence": [
      {
        "kind": "link",
        "url": "https://github.com/stellar/soroban-examples",
        "label": "Soroban examples used in the mentoring session"
      }
    ],
    "id": "claim_mthdrrfh3dr2po",
    "status": "minted",
    "createdAt": "2026-08-31T15:15:53.117Z",
    "metadata": {
      "standard": "tessera-credential/1",
      "name": "HackSpire · Mentoring",
      "type": "mentoring",
      "description": "Mentored a first-time hackathon team through Soroban contract deployment, covering auth entries and testnet RPC.",
      "event": "HackSpire 2026",
      "date": "2026-03-21",
      "claimant": "GC6WLOXCCWZHE34FA5NBS45CHYRXJA7FMKE47Y52JWPH46QJP6LY2HT4",
      "issuer": {
        "org": "HackSpire"
      },
      "evidence": [
        {
          "kind": "link",
          "url": "https://github.com/stellar/soroban-examples",
          "label": "Soroban examples used in the mentoring session"
        }
      ],
      "issuedBy": "Tessera"
    },
    "credential": {
      "tokenId": 1,
      "cid": "local:claim_mthdrrfh3dr2po",
      "txHash": "cc14b76cdb998d856e4831cfc899f34127eba491437779457788b4c42b5fe236"
    }
  },
  {
    "type": "pr",
    "description": "Merged a pull request adding retry-with-backoff handling to the Soroban RPC client's transaction submission path.",
    "event": "js-soroban-client",
    "date": "2026-05-14",
    "claimantWallet": "GC4NMHEYOMPDIFDLQZJ3O36XPQAKRN3O4FHLK2PV6DAP6IAWEUXL5P2D",
    "issuerOrg": "GDG Groups",
    "evidence": [
      {
        "kind": "link",
        "url": "https://github.com/stellar/js-soroban-client",
        "label": "Repository of the merged PR"
      }
    ],
    "id": "claim_mthdrz5gpakqbu",
    "status": "minted",
    "createdAt": "2026-08-31T15:16:03.125Z",
    "metadata": {
      "standard": "tessera-credential/1",
      "name": "GDG Groups · Open-source contribution",
      "type": "pr",
      "description": "Merged a pull request adding retry-with-backoff handling to the Soroban RPC client's transaction submission path.",
      "event": "js-soroban-client",
      "date": "2026-05-14",
      "claimant": "GC4NMHEYOMPDIFDLQZJ3O36XPQAKRN3O4FHLK2PV6DAP6IAWEUXL5P2D",
      "issuer": {
        "org": "GDG Groups"
      },
      "evidence": [
        {
          "kind": "link",
          "url": "https://github.com/stellar/js-soroban-client",
          "label": "Repository of the merged PR"
        }
      ],
      "issuedBy": "Tessera"
    },
    "credential": {
      "tokenId": 2,
      "cid": "local:claim_mthdrz5gpakqbu",
      "txHash": "e13be1f720b1453d3fb22ec206d9267182ed97a3ab244ea4405a393de0c70b00"
    }
  },
  {
    "type": "talk",
    "description": "Gave a 10-minute lightning talk on soulbound credentials and portable community contribution history on Stellar.",
    "event": "GDG DevFest Kolkata",
    "date": "2026-04-11",
    "claimantWallet": "GAURX4VRXXCX6Y6A6PSR5M342CR5LKU7RZP4FFSWWXDPRK22LXCJEQSK",
    "issuerOrg": "FIEM ACM",
    "evidence": [
      {
        "kind": "link",
        "url": "https://gdg.community.dev/",
        "label": "GDG community (event host)"
      }
    ],
    "id": "claim_mthds6bh38swgn",
    "status": "minted",
    "createdAt": "2026-08-31T15:16:12.413Z",
    "metadata": {
      "standard": "tessera-credential/1",
      "name": "FIEM ACM · Talk",
      "type": "talk",
      "description": "Gave a 10-minute lightning talk on soulbound credentials and portable community contribution history on Stellar.",
      "event": "GDG DevFest Kolkata",
      "date": "2026-04-11",
      "claimant": "GAURX4VRXXCX6Y6A6PSR5M342CR5LKU7RZP4FFSWWXDPRK22LXCJEQSK",
      "issuer": {
        "org": "FIEM ACM"
      },
      "evidence": [
        {
          "kind": "link",
          "url": "https://gdg.community.dev/",
          "label": "GDG community (event host)"
        }
      ],
      "issuedBy": "Tessera"
    },
    "credential": {
      "tokenId": 3,
      "cid": "local:claim_mthds6bh38swgn",
      "txHash": "4309edbf8512523fa2949a3f8df9a1c68bb5c94b1a96cb02a87b49f81a3a7b8b"
    }
  }
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
