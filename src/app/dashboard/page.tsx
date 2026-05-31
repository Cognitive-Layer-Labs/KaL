"use client";

import { useAccount } from "wagmi";
import { Award, Coins, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletButton } from "@/components/WalletButton";
import { useKALBalance, useSBTsOfOwner } from "@/lib/contracts";
import { formatKAL } from "@/lib/utils";
import { formatEther } from "viem";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data: kalBalanceRaw } = useKALBalance(address);
  const { data: sbtIds } = useSBTsOfOwner(address);

  const kalBalance = kalBalanceRaw != null
    ? parseFloat(formatEther(kalBalanceRaw as bigint))
    : null;

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <Wallet className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">Your Dashboard</h1>
        <p className="text-muted-foreground">Connect your wallet to see your tokens and history.</p>
        <WalletButton />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-[#A29BFE]" />
              KAL Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#A29BFE]">
              {kalBalance != null ? formatKAL(kalBalance) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Knowledge as Liquidity tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-[#A29BFE]" />
              Soulbound Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {sbtIds ? (sbtIds as bigint[]).length : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Verified knowledge credentials</p>
          </CardContent>
        </Card>
      </div>

      {sbtIds && (sbtIds as bigint[]).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My SBTs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(sbtIds as bigint[]).map((id) => (
                <div
                  key={id.toString()}
                  className="border border-[#6C5CE7]/30 bg-[#6C5CE7]/10 rounded-lg px-3 py-2 text-sm"
                >
                  <Award className="inline h-3.5 w-3.5 text-[#A29BFE] mr-1" />
                  Token #{id.toString()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground font-mono break-all">{address}</p>
        </CardContent>
      </Card>
    </div>
  );
}
