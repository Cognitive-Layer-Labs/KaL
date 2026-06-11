"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, useAccount, useConnect } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet, mock } from "wagmi/connectors";
import { MOCK, MOCK_ADDRESS } from "@/lib/mock";

const queryClient = new QueryClient();

const hardhat = {
  id: 31337,
  name: "Hardhat",
  network: "hardhat",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
} as const;

const config = createConfig({
  chains: [baseSepolia, hardhat],
  connectors: [
    // dev-only: lets verification reach wallet-gated UI without a real wallet
    ...(MOCK ? [mock({ accounts: [MOCK_ADDRESS], features: { reconnect: true } })] : []),
    injected({ target: "metaMask" }),
    coinbaseWallet({ appName: "KaL — Knowledge as Liquidity" }),
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [hardhat.id]: http(),
  },
});

/** In mock mode, auto-connect the mock wallet so gated surfaces render. */
function MockAutoConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  useEffect(() => {
    if (!MOCK || isConnected) return;
    const m = connectors.find((c) => c.id === "mock" || c.type === "mock");
    if (m) connect({ connector: m });
  }, [isConnected, connect, connectors]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {MOCK && <MockAutoConnect />}
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
