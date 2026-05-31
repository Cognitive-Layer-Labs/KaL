"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy, XCircle, Coins, Award, ArrowRight, Home, CheckCircle, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useVerifyAndMint } from "@/lib/contracts";
import { useAccount } from "wagmi";
import type { PoCWResult, OnchainAttestation } from "@/lib/api";
import { formatKAL, bloomColor } from "@/lib/utils";

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [result, setResult] = useState<PoCWResult | null>(null);
  const { address } = useAccount();
  const { verifyAndMint, isPending, isConfirming, isSuccess, hash } = useVerifyAndMint();
  const [mintError, setMintError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`result_${sessionId}`);
    if (raw) {
      try {
        setResult(JSON.parse(raw));
        return;
      } catch {}
    }
    // If no cached result (e.g. direct nav), try to show from URL params
    const passed = searchParams.get("passed") === "1";
    router.replace(passed ? router.toString() : "/");
  }, [sessionId, searchParams, router]);

  async function handleMintSBT() {
    if (!result?.attestation || result.attestation.type !== "onchain") return;
    const att = result.attestation as OnchainAttestation;
    setMintError(null);
    try {
      await verifyAndMint(
        {
          subject: att.oracle as `0x${string}`,
          contentId: BigInt(att.contentId),
          score: BigInt(att.score),
          nonce: att.nonce as `0x${string}`,
          expiry: BigInt(att.expiry),
          tokenUri: att.tokenUri,
          contentHash: att.contentHash as `0x${string}`,
        },
        att.signature as `0x${string}`
      );
    } catch (e) {
      setMintError((e as Error).message);
    }
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Loading result…
      </div>
    );
  }

  const passed = result.competenceIndicator;
  const scorePercent = Math.round(result.score);
  const kal = result.kalAmount ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 text-center ${
        passed
          ? "bg-gradient-to-b from-[#6C5CE7]/20 to-[#6C5CE7]/5 border border-[#6C5CE7]/30"
          : "bg-gradient-to-b from-rose-600/20 to-rose-600/5 border border-rose-600/30"
      }`}>
        {passed ? (
          <Trophy className="h-12 w-12 text-[#A29BFE] mx-auto mb-3" />
        ) : (
          <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
        )}
        <h1 className="text-2xl font-bold mb-1">
          {passed ? "Competence Verified!" : "Not Passed"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {passed
            ? "You demonstrated sufficient knowledge of this content."
            : "You can retake the test to improve."}
        </p>
      </div>

      {/* Score summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Score Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Score</span>
              <span className="font-bold">{scorePercent}%</span>
            </div>
            <Progress value={scorePercent} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-[#A29BFE]">{result.questions_asked}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{result.theta.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">θ Estimate</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{(result.confidence_interval[1] - result.confidence_interval[0]).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">CI Width</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KAL earned */}
      {passed && kal > 0 && (
        <Card className="border-[#6C5CE7]/30 bg-[#6C5CE7]/5">
          <CardContent className="flex items-center gap-4 pt-6">
            <Coins className="h-8 w-8 text-[#A29BFE] shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">KAL Earned</p>
              <p className="text-3xl font-bold text-[#A29BFE]">{formatKAL(kal)} <span className="text-lg">KAL</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">Minted automatically by the oracle</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bloom breakdown */}
      {result.response_detail && result.response_detail.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bloom Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.response_detail.map((q, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: bloomColor(q.bloomLevel) }}
                  />
                  <span className="flex-1 truncate text-xs text-muted-foreground">{q.question}</span>
                  <Badge variant={q.correct ? "easy" : "hard"} className="shrink-0">
                    {q.score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SBT minting */}
      {passed && result.attestation?.type === "onchain" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-[#A29BFE]" />
              Soulbound Token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isSuccess ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="h-4 w-4" />
                SBT minted!{" "}
                <a
                  href={`https://sepolia.basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View tx
                </a>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Mint a non-transferable Proof of Cognitive Work token to your wallet.
                </p>
                {mintError && (
                  <div className="flex items-center gap-2 text-rose-400 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {mintError}
                  </div>
                )}
                <Button
                  variant="kal"
                  className="w-full"
                  disabled={isPending || isConfirming || !address}
                  onClick={handleMintSBT}
                >
                  <Award className="h-4 w-4" />
                  {isPending || isConfirming ? "Minting…" : "Mint SBT"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            Catalog
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/dashboard">
            <ArrowRight className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
