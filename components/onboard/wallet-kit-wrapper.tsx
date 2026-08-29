"use client";

import { useEffect, useState } from "react";
import { ConnectButton, WalletProvider, useWallet, WalletType, NetworkType } from "stellar-wallet-kit";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

/**
 * Thin wrapper around the Stellar Wallets Kit: provider config for testnet +
 * a connect button and (once connected) the connected address.
 */
function Inner() {
  const { account, isConnected, isConnecting, error } = useWallet();
  const [render, setRender] = useState(false);

  useEffect(() => setRender(true), []);
  if (!render) return null;

  return (
    <div className="flex flex-col items-start gap-3">
      <ConnectButton
        label={isConnected ? "Change wallet" : "Connect"}
        onConnect={() => {}}
      />
      {isConnecting && <Badge tone="primary">Connecting…</Badge>}
      {error && <p className="text-xs text-bad">{error.message}</p>}
      {isConnected && account && (
        <div className="flex items-center gap-2">
          <Badge tone="good">connected</Badge>
          <span className="font-mono text-xs text-muted">
            {account.address.slice(0, 6)}…{account.address.slice(-4)}
          </span>
          <Link
            href={`/profile/${account.address}`}
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            open profile →
          </Link>
        </div>
      )}
    </div>
  );
}

export function WalletKitWrapper() {
  const [render, setRender] = useState(false);
  useEffect(() => setRender(true), []);
  if (!render) return null;
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
      <Inner />
    </WalletProvider>
  );
}
