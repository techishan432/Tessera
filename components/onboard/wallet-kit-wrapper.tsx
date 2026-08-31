"use client";

import { useEffect } from "react";
import { ConnectButton, WalletProvider, useWallet, WalletType, NetworkType } from "stellar-wallet-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Thin wrapper around the Stellar Wallets Kit: provider config for testnet +
 * a connect button. Once a wallet is connected the full address is shown and
 * reported to the parent via onConnected so the wizard can continue.
 */
function Inner({ onConnected }: { onConnected: (address: string) => void }) {
  const { account, isConnected, isConnecting, error, disconnect } = useWallet();

  useEffect(() => {
    if (isConnected && account?.address) onConnected(account.address);
  }, [isConnected, account?.address, onConnected]);

  return (
    <div className="flex flex-col items-start gap-4">
      <ConnectButton
        label={isConnected ? "Switch wallet" : "Connect Freighter"}
        onConnect={() => {}}
      />
      {isConnecting && <Badge tone="primary">Connecting…</Badge>}
      {error && (
        <div className="w-full rounded-xl border border-bad/30 bg-bad/10 px-4 py-3">
          <p className="text-xs font-medium text-bad">Could not connect</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{error.message}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Make sure the Freighter extension is installed and set to the
            <em> testnet</em> profile, then try again — or take the sponsored
            account path instead.
          </p>
        </div>
      )}
      {isConnected && account && (
        <div className="w-full rounded-xl border border-good/30 bg-good/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge tone="good">connected</Badge>
            <Link
              href={`/profile/${account.address}`}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              open profile →
            </Link>
          </div>
          <p className="mt-2 break-all font-mono text-xs text-foreground/90">{account.address}</p>
          <div className="mt-3">
            <Button size="sm" variant="ghost" onClick={() => disconnect()}>
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WalletKitWrapper({ onConnected }: { onConnected: (address: string) => void }) {
  return (
    <WalletProvider
      config={{
        network: NetworkType.TESTNET,
        defaultWallet: WalletType.FREIGHTER,
        appName: "Tessera",
        theme: {
          mode: "dark",
          primaryColor: "#8b7cff",
          backgroundColor: "#0e0e18",
          textColor: "#f4f3fa",
          borderRadius: "16px",
        },
      }}
    >
      <Inner onConnected={onConnected} />
    </WalletProvider>
  );
}
