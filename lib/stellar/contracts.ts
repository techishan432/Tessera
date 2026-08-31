import {
  Address,
  Contract,
  Keypair,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import {
  credentialContractId,
  getRpc,
  issuerKeyForOrg,
  networkPassphrase,
  operatorKeypair,
  registryContractId,
} from "./client";
import {
  scvBool,
  scvCredential,
  scvIssuerPair,
  scvOption,
  scvString,
  scvU32,
  scvVec,
  type CredentialOnChain,
} from "./scval";

const BASE_FEE = "100";

/**
 * Contract.call expects xdr.ScVal arguments (not raw JS), so convert here:
 * Address -> ScvAddress, string -> ScvString, number -> ScvU32, bigint -> ScvU64.
 */
function toScVal(v: unknown): xdr.ScVal {
  if (v instanceof Address) {
    const sv = v.toScVal() as unknown;
    return sv as xdr.ScVal;
  }
  // Already an ScVal (all xdr classes expose toXdrObject).
  if (typeof v === "object" && v !== null && typeof (v as { toXdrObject?: unknown }).toXdrObject === "function") {
    return v as xdr.ScVal;
  }
  if (typeof v === "string") return xdr.ScVal.scvString(v);
  if (typeof v === "number") return xdr.ScVal.scvU32(v);
  if (typeof v === "bigint") return xdr.ScVal.scvU64(v);
  if (typeof v === "boolean") return xdr.ScVal.scvBool(v);
  throw new Error(`unsupported contract arg type: ${typeof v}`);
}

function callArgs(args: unknown[]): [xdr.ScVal, ...xdr.ScVal[]] {
  return args.map(toScVal) as [xdr.ScVal, ...xdr.ScVal[]];
}

/**
 * Read-only contract call via simulation (no transaction, no fee, no auth).
 * Returns the decoded return value, or null for unit-returning calls.
 */
async function callRead(
  contractId: string,
  fn: string,
  args: unknown[]
): Promise<xdr.ScVal | null> {
  const rpc = getRpc();
  const contract = new Contract(contractId);
  const source = operatorKeypair().publicKey();
  const account = await rpc.getAccount(source);
  const op = contract.call(fn, ...callArgs(args));
  const tx = new TransactionBuilder(account, { fee: BASE_FEE })
    .setNetworkPassphrase(networkPassphrase())
    .setTimeout(30)
    .addOperation(op)
    .build();

  const sim = await rpc.simulateTransaction(tx as never);
  if ("error" in sim) {
    throw new Error(`simulation of ${fn} failed: ${sim.error}`);
  }
  return sim.result?.retval ?? null;
}

/** Write contract call: build, prepare (auth/footprint), sign, submit, confirm. */
async function callWrite(
  contractId: string,
  fn: string,
  args: unknown[],
  signerSecret: string
): Promise<{ txHash: string }> {
  const rpc = getRpc();
  const signer = Keypair.fromSecret(signerSecret);
  const contract = new Contract(contractId);
  const account = await rpc.getAccount(signer.publicKey());
  const op = contract.call(fn, ...callArgs(args));
  const tx = new TransactionBuilder(account, { fee: BASE_FEE })
    .setNetworkPassphrase(networkPassphrase())
    .setTimeout(60)
    .addOperation(op)
    .build();

  const prepared = await rpc.prepareTransaction(tx as never);
  prepared.sign(signer);

  const send = await rpc.sendTransaction(prepared);
  if (send.status === "ERROR" || send.status === "DUPLICATE") {
    throw new Error(`submit of ${fn} rejected: ${send.status}`);
  }

  // PENDING: poll until the transaction lands.
  for (let i = 0; i < 15; i++) {
    const status = await rpc.getTransaction(send.hash);
    if (status.status === "SUCCESS") return { txHash: send.hash };
    if (status.status === "FAILED") {
      throw new Error(`transaction ${fn} failed on-chain (${send.hash})`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`timed out waiting for ${fn} transaction ${send.hash}`);
}

// ── credential-contract ──────────────────────────────────────────────────────

export async function readCredentials(holder: string): Promise<CredentialOnChain[]> {
  const scv = await callRead(
    credentialContractId(),
    "get_credentials",
    [new Address(holder)]
  );
  if (!scv) return [];
  return scvVec(scv).map(scvCredential);
}

export async function readCredential(id: number): Promise<CredentialOnChain> {
  const scv = await callRead(credentialContractId(), "get_token", [id]);
  if (!scv) throw new Error(`credential ${id} not found`);
  return scvCredential(scv);
}

export async function readTokenCount(): Promise<number> {
  const scv = await callRead(credentialContractId(), "token_count", []);
  return scv ? scvU32(scv) : 0;
}

/**
 * Mint a credential. The pilot org's key (from ORG_ISSUER_KEYS) signs the
 * transaction — the registry must list that address as an authorized issuer.
 * Returns the token id (counter is global and monotonically increasing).
 */
export async function mintCredential(
  org: string,
  to: string,
  metadataCid: string
): Promise<{ tokenId: number; txHash: string }> {
  const before = await readTokenCount();
  const signerSecret = issuerKeyForOrg(org);
  const issuer = Keypair.fromSecret(signerSecret);
  const { txHash } = await callWrite(
    credentialContractId(),
    "mint",
    [new Address(issuer.publicKey()), new Address(to), metadataCid],
    signerSecret
  );
  return { tokenId: before + 1, txHash };
}

/**
 * Attempt a credential transfer — always reverts (soulbound). Exposed so the
 * seed script can demonstrate the non-transferable invariant live.
 */
export async function attemptTransfer(
  from: string,
  to: string,
  tokenId: number,
  signerSecret: string
): Promise<void> {
  await callWrite(
    credentialContractId(),
    "transfer",
    [new Address(from), new Address(to), tokenId],
    signerSecret
  );
}

// ── issuer-registry ──────────────────────────────────────────────────────────

export async function readIssuers(): Promise<{ address: string; orgName: string }[]> {
  const scv = await callRead(registryContractId(), "get_issuers", []);
  if (!scv) throw new Error("get_issuers returned no data — the issuer registry may not be initialized");
  return scvVec(scv).map(scvIssuerPair);
}

export async function isAuthorizedIssuer(address: string): Promise<boolean> {
  const scv = await callRead(registryContractId(), "is_authorized_issuer", [
    new Address(address),
  ]);
  return scv ? scvBool(scv) : false;
}

export async function readOrgName(address: string): Promise<string | null> {
  const scv = await callRead(registryContractId(), "org_name", [new Address(address)]);
  return scv ? scvOption(scv, scvString) : null;
}

export async function addIssuer(
  adminSecret: string,
  issuer: string,
  orgName: string
): Promise<{ txHash: string }> {
  const admin = Keypair.fromSecret(adminSecret);
  return callWrite(
    registryContractId(),
    "add_issuer",
    [new Address(admin.publicKey()), new Address(issuer), orgName],
    adminSecret
  );
}

export async function removeIssuer(
  adminSecret: string,
  issuer: string
): Promise<{ txHash: string }> {
  const admin = Keypair.fromSecret(adminSecret);
  return callWrite(
    registryContractId(),
    "remove_issuer",
    [new Address(admin.publicKey()), new Address(issuer)],
    adminSecret
  );
}
