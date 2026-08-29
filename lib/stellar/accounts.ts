import {
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { getRpc, networkPassphrase, operatorKeypair, TESTNET } from "./client";

let horizon: Horizon.Server | null = null;

function getHorizon(): Horizon.Server {
  if (!horizon) horizon = new Horizon.Server(TESTNET.horizon);
  return horizon;
}

export async function accountExists(address: string): Promise<boolean> {
  try {
    await getRpc().getAccount(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure `address` exists on testnet. New accounts are created by the
 * operator/sponsor with exactly 1 XLM (the base reserve) — the recipient
 * never needs XLM of their own to receive a credential.
 */
export async function ensureAccount(address: string): Promise<{ created: boolean }> {
  if (await accountExists(address)) return { created: false };

  const operator = operatorKeypair();
  const horizon = getHorizon();
  const [src, baseFee] = await Promise.all([
    horizon.loadAccount(operator.publicKey()),
    horizon.fetchBaseFee(),
  ]);
  const tx = new TransactionBuilder(src, { fee: String(baseFee) })
    .setNetworkPassphrase(networkPassphrase())
    .addOperation(
      Operation.createAccount({
        source: operator.publicKey(),
        destination: address,
        startingBalance: "1",
      })
    )
    .setTimeout(60)
    .build();
  tx.sign(operator);

  // submitTransaction throws on non-2xx (e.g. insufficient balance), so a
  // resolved promise means the create-account transaction was accepted.
  await horizon.submitTransaction(tx);
  return { created: true };
}

/**
 * Generate a fresh sponsored account. Returns the secret key ONCE — the
 * onboarding flow hands it to the member for import into their wallet.
 */
export async function createSponsoredAccount(): Promise<{
  address: string;
  secretKey: string;
}> {
  const keypair = Keypair.random();
  await ensureAccount(keypair.publicKey());
  return { address: keypair.publicKey(), secretKey: keypair.secret() };
}
