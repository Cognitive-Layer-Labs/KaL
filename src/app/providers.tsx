"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

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
    injected({ target: "metaMask" }),
    coinbaseWallet({ appName: "KaL — Knowledge as Liquidity" }),
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [hardhat.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
