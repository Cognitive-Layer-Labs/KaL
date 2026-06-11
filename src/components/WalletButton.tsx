"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => { setMounted(true); }, []);

  // Render a stable placeholder until client hydration is complete
  if (!mounted) {
    return (
      <Button variant="kal" size="sm" disabled>
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 h-10 text-xs font-mono text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-mono-green animate-pulse-dot" />
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <Button variant="outline" size="sm" className="h-10" onClick={() => disconnect()}>
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
