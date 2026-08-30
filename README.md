# Tessera — ProofOfContribution

**Soulbound credentials for real-world community contribution, on Stellar.**

Tessera mints *non-transferable* (soulbound) credentials on Stellar's Soroban
smart-contract platform for the work that never lands on a résumé: mentoring at
a hackathon, a merged open-source PR, the talk you actually gave. Authorized
community organizations issue them; they land in a member's Stellar wallet as a
portable, verifiable Web3 resume — a public 3D "credential wall" you can drop a
link to in your bio.

**Pilot communities:** FIEM ACM · GDG Groups · HackSpire

> A *tessera* is a mosaic tile — and, in Rome, the citizen's identity token.

**Target: Soroban testnet. Mainnet is never touched by this codebase.**

---

## Deployed contracts (Soroban testnet)

| Contract | Contract ID |
|---|---|
| `credential-contract` (soulbound token) | `CBU3BDDRG5Z6XOS5JID7FZBOQJE7PZCUUIYZGWTZGS3AGEUPU4RYTF64` |
| `issuer-registry` (org RBAC) | `CD2MLVE5YNLFELC4FKV5NDYFJ3YRN6IQXEQXUNCXTIFZLUUTNFZCK7AH` |

Registry admin / operator account (testnet): `GDQZIUOFLL5OPCYTDJE4YO766AJQYZ3XQQIZ6BO27ADKEE24GMX72LYS`
Registered issuers: FIEM ACM, GDG Groups, HackSpire (one testnet account each).

**App URL:** local → `http://localhost:3000` · Vercel → see *Deploying to Vercel* (requires a one-time `vercel login`).

---

## Architecture

```
                       ┌────────────────────────────────────────────┐
                       │            Next.js (one deployable)        │
                       │                                            │
  browser ────────────▶│  app/        frontend (R3F + Framer + GSAP)│
                       │  app/api/*   orchestration (TypeScript)    │
                       │  lib/ai-verify   verifyClaim(claim, evidence)│
                       │  lib/stellar     contract + wallet helpers │
                       │  lib/ipfs        Pinata metadata uploads   │
                       └───────┬───────────────┬───────────────┬────┘
                               │               │               │
                    JSON-RPC   │   signed tx   │   HTTP        │
                               ▼               ▼               ▼
                     soroban-testnet   credential-contract   Pinata (IPFS)
                     (Horizon + RPC)   + issuer-registry     metadata JSON
                                                   (on-chain: CID only)
```

- **Contracts hold only trust-relevant logic**: issuer authorization,
  non-transferability, holder/issuer revocation. All business data (claim text,
  evidence links, AI citation) lives off-chain; on-chain we store just the
  metadata CID.
- **Orchestration lives in the API routes**: claim lifecycle
  (`pending → verified → approved → minted`), AI verification, IPFS pinning,
  sponsored account creation, org-key signing.

### `credential-contract` (Rust)
- `mint(issuer, to, metadata_cid)` — only addresses the registry confirms as
  authorized issuers can mint; the issuer's key signs the transaction.
- `transfer(from, to, id)` — **always reverts.** This is the soulbound
  invariant (pinned by a dedicated unit test *and* demonstrated live).
- `burn(authorized_by, token_id)` — self-revoke by the holder, or revocation
  by the original issuing org.
- `get_credentials(holder)`, `get_token(id)`, `token_count()` — public reads.

### `issuer-registry` (Rust)
- `initialize(admin)`, admin-gated `add_issuer` / `remove_issuer`.
- Public reads: `is_authorized_issuer`, `org_name`, `get_issuers`, `get_admin`.
- Revoking an issuer stops new mints; previously minted credentials stay valid.

### `lib/ai-verify` — OpenAI-compatible verification
`verifyClaim(claim, evidence) → { approved, confidence, citation, … }`
Evidence is machine-digested first (live GitHub PR state, page snippets),
then a strict verifier LLM cross-checks claim vs. facts. One
OpenAI-compatible adapter (`/chat/completions`) serves every provider:

| `LLM_PROVIDER` | Endpoint | Default model |
|---|---|---|
| `qwen` (default) | DashScope compatible-mode (intl) | `qwen3-32b` |
| `openai` | api.openai.com | `gpt-4o-mini` |
| `anthropic` | Claude Messages API | `claude-sonnet-4-20250514` |
| `custom` | any OpenAI-compatible gateway via `LLM_BASE_URL` | `qwen3-32b` |

`LLM_MODEL` overrides the model id; `LLM_BASE_URL` overrides the endpoint
(DashScope CN, vLLM, LiteLLM, Ollama…). Auto-approve at
`VERIFY_AUTO_APPROVE_THRESHOLD` (default 0.8); below that the claim is
flagged for the organizer.

### Frontend
Light/dark theming (light is the default; choice persisted in
`localStorage` and applied pre-paint, so no flash) via an animated toggle in
the global nav — all colors are CSS-variable tokens, so every component,
including glass surfaces and the 3D wall backgrounds, follows the theme.

- **Landing `/`** — long-scroll marketing page: R3F hero (procedural tessera
  badge; GSAP ScrollTrigger drives the badge/camera on scroll), org strip,
  staggered how-it-works, on-chain/off-chain credential anatomy, live
  count-up stats, pilot-community reviews, soulbound + triple-verification
  explainer, org detail cards, roadmap, CTA split, animated FAQ.
- **Dashboard `/dashboard`** — status summary cards (click to filter), org
  filter, claim queue with layout animations, hover-reveal actions,
  approve pulse, evidence links, AI verdict panel, issuer registry table.
  Organizer-key auth (`x-organizer-key`).
- **Profile `/profile/[wallet]`** — the shareable piece: a 3D credential wall
  (R3F arc of flip cards, click to flip, detail panel with evidence links),
  2D flip-card fallback for mobile / `prefers-reduced-motion`, generated
  OpenGraph image so the link previews well in bios.
- **Onboarding `/onboard`** — connect Freighter via Stellar Wallets Kit, or
  get a sponsored account funded with the 1 XLM reserve (zero XLM needed to
  receive credentials).

## Tech stack

| Layer | Choice |
|---|---|
| Contracts | Rust, soroban-sdk 27.0.6, deployed via `stellar` CLI 28 (testnet, protocol 28) |
| App | Next.js 16 (App Router) + TypeScript + Tailwind 4 — one deployable |
| 3D / motion | React Three Fiber 9 + drei, Framer Motion 13, GSAP + ScrollTrigger |
| Wallet | Stellar Wallets Kit (`stellar-wallet-kit`, Freighter) + sponsored accounts |
| Stellar SDK | `@stellar/stellar-sdk` 17 (includes `rpc.Server`; the standalone `soroban-client` 1.0.1 predates protocol-28 JSON-RPC and is not used) |
| AI | provider-agnostic module, anthropic/qwen adapters via env |
| Metadata | IPFS via Pinata (CID on-chain); local fallback when unconfigured |
| Claims store | local JSON file (`data/claims.json`, gitignored) — swap for KV/Postgres for multi-instance hosting |
| Deploy | Vercel (app) · `stellar` CLI (contracts) |

## Repo layout

```
├── contracts/
│   ├── credential-contract/     # soulbound token (+ tests)
│   └── issuer-registry/         # issuer RBAC (+ tests)
├── app/
│   ├── (marketing)/             # landing page
│   ├── api/{claims,verify,mint,issuers,onboard,stats}
│   ├── dashboard/               # organizer console
│   ├── profile/[wallet]/        # public 3D credential wall + OG image
│   └── onboard/                 # wallet onboarding wizard
├── components/
│   ├── ui/                      # design-system primitives
│   ├── 3d/                      # R3F scenes (hero, credential wall, tessera)
│   ├── animations/              # GSAP registration + motion variants
│   ├── dashboard/  profile/  onboard/  landing sections
├── lib/
│   ├── ai-verify/               # verifyClaim + provider adapters
│   ├── stellar/                 # rpc client, contract calls, ScVal codecs, accounts
│   ├── ipfs/                    # Pinata upload
│   ├── store.ts                 # claims store
│   └── auth.ts                  # organizer-key check
├── scripts/seed.ts              # end-to-end demo seeder
└── tests/                       # vitest suites (AI verify)
```

## Local setup

```bash
# 1. Environment (testnet keys only)
cp .env.example .env.local       # then fill in (see below)

# 2. App
npm install
npm run dev                      # http://localhost:3000

# 3. Contracts (if redeploying)
cd contracts && cargo test --workspace
stellar contract deploy --wasm target/wasm32v1-none/release/issuer_registry.wasm --network testnet --source <admin>
stellar contract deploy --wasm target/wasm32v1-none/release/credential_contract.wasm --network testnet --source <admin>
# then initialize + add issuers, and update the IDs in .env.local

# 4. Demo data (server must be running)
npm run seed
```

Required `.env.local` values (all testnet):

| Var | Purpose |
|---|---|
| `CREDENTIAL_CONTRACT_ID` / `ISSUER_REGISTRY_CONTRACT_ID` | deployed contract IDs (above) |
| `ISSUER_SECRET_KEY` | operator/sponsor key — pays fees, funds recipient accounts |
| `ORG_ISSUER_KEYS` | JSON map `{ "FIEM ACM": "S…", "GDG Groups": "S…", "HackSpire": "S…" }` |
| `ORGANIZER_API_KEY` | shared key the dashboard sends as `x-organizer-key` |
| `PINATA_API_KEY` / `PINATA_API_SECRET` | IPFS pinning (optional — local fallback otherwise) |
| `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` | AI verification — OpenAI-compatible; `qwen` (DashScope, `qwen3-32b`) is the default; optional `LLM_BASE_URL` for CN/self-hosted (optional — manual approval otherwise) |
| `VERIFY_AUTO_APPROVE_THRESHOLD` | confidence threshold for auto-approve (default 0.8) |

## Demo walkthrough

1. **Claim submitted** — a member (or the organizer on their behalf) submits a
   contribution with evidence links (`POST /api/claims`).
2. **AI verifies** — `POST /api/verify` machine-digests the evidence (e.g. live
   GitHub PR state) and an LLM returns confidence + citation. Above threshold
   → auto-approve; below → flagged for the organizer.
3. **Organizer approves** — in the dashboard, review the verdict, approve.
4. **Minted** — `POST /api/mint` ensures the recipient account is sponsored
   (1 XLM reserve, no XLM needed from the member), pins the metadata JSON to
   IPFS, and calls `credential-contract.mint()` signed by the org's key.
5. **Profile** — the credential appears on the member's public 3D credential
   wall, instantly shareable (`/profile/[wallet]`, OG image included).
6. **Soulbound** — any `transfer` attempt reverts on-chain (the seed script
   demonstrates this live).

`npm run seed` runs all of the above for three demo contributions
(mentoring / PR / talk) across the three pilot orgs, and is idempotent on
rerun.

## Deploying to Vercel

One-time auth, then deploy:

```bash
npx vercel login          # browser OAuth
npx vercel --prod         # from the repo root
```

Then set the same env vars as `.env.local` in the Vercel project
(**Settings → Environment Variables**): contract IDs, `ISSUER_SECRET_KEY`,
`ORG_ISSUER_KEYS`, `ORGANIZER_API_KEY`, Pinata + LLM keys. Testnet secrets in
Vercel env are fine for this build.

Notes:
- The claims store is a local JSON file; on Vercel it's ephemeral (claims reset
  between deploys/scales). Contract state, metadata (IPFS), and profiles are
  durable. For a persistent multi-instance deploy, swap `lib/store.ts` for a
  KV/Postgres backend.
- If the contracts are redeployed, update the contract-ID env vars.

## Tests

```bash
cd contracts && cargo test --workspace   # 16 contract tests (incl. soulbound + RBAC)
npx vitest run                          # 13 AI-verification tests
npm run build                           # full typecheck + production build
```

## Credits

Pilot communities: **FIEM ACM**, **GDG Groups**, **HackSpire**.
Built on Stellar Soroban (testnet), Next.js, React Three Fiber, and the
Stellar Wallets Kit.
