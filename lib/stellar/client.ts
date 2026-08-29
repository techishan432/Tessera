import { Keypair, rpc } from "@stellar/stellar-sdk";

export const TESTNET = {
  rpc: "https://soroban-testnet.stellar.org",
  horizon: "https://horizon-testnet.stellar.org",
  passphrase: "Test SDF Network ; September 2015",
};

let rpcServer: rpc.Server | null = null;

/** Soroban RPC server for the configured network (testnet). */
export function getRpc(): rpc.Server {
  if (!rpcServer) {
    rpcServer = new rpc.Server(process.env.SOROBAN_RPC_URL || TESTNET.rpc);
  }
  return rpcServer;
}

export function networkPassphrase(): string {
  return process.env.SOROBAN_NETWORK_PASSPHRASE || TESTNET.passphrase;
}

export function credentialContractId(): string {
  const id = process.env.CREDENTIAL_CONTRACT_ID;
  if (!id) throw new Error("CREDENTIAL_CONTRACT_ID is not set in env");
  return id;
}

export function registryContractId(): string {
  const id = process.env.ISSUER_REGISTRY_CONTRACT_ID;
  if (!id) throw new Error("ISSUER_REGISTRY_CONTRACT_ID is not set in env");
  return id;
}

/** Operator/sponsor keypair — pays fees, creates and funds recipient accounts. */
export function operatorKeypair(): Keypair {
  const secret = process.env.ISSUER_SECRET_KEY;
  if (!secret) throw new Error("ISSUER_SECRET_KEY is not set in env");
  return Keypair.fromSecret(secret);
}

/** Org name -> issuer secret key (each pilot org signs its own mints). */
export function orgIssuerKeys(): Record<string, string> {
  try {
    return JSON.parse(process.env.ORG_ISSUER_KEYS || "{}") as Record<string, string>;
  } catch {
    throw new Error("ORG_ISSUER_KEYS is not valid JSON (expected {orgName: secretKey})");
  }
}

export function issuerKeyForOrg(org: string): string {
  const keys = orgIssuerKeys();
  const key = keys[org];
  if (!key) {
    const known = Object.keys(keys).join(", ") || "none";
    throw new Error(`No issuer key configured for org "${org}". Configured: ${known}`);
  }
  return key;
}

export function organizerKey(): string {
  const key = process.env.ORGANIZER_API_KEY;
  if (!key) throw new Error("ORGANIZER_API_KEY is not set in env");
  return key;
}
