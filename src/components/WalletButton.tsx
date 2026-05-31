"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }

  const metaMask = connectors.find((c) => c.name === "MetaMask") ?? connectors[0];

  return (
    <Button
      variant="kal"
      size="sm"
      disabled={isPending}
      onClick={() => metaMask && connect({ connector: metaMask })}
    >
      <Wallet className="h-4 w-4" />
      {isPending ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}
