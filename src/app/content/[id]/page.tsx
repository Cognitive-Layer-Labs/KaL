"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Coins } from "lucide-react";
import Link from "next/link";
import { getIndexStatus, startVerify, type ContentItem, type SessionConfig } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KGGraphModal } from "@/components/KGGraphModal";
import { useAccount } from "wagmi";
import { WalletButton } from "@/components/WalletButton";

type DifficultyPreset = "easy" | "medium" | "hard";

const PRESET_META: Record<DifficultyPreset, { label: string; desc: string; kalMax: number }> = {
  easy:   { label: "Easy",   desc: "~5 questions · lower threshold",   kalMax: 60  },
  medium: { label: "Medium", desc: "~7 questions · standard threshold", kalMax: 100 },
  hard:   { label: "Hard",   desc: "~10 questions · high threshold",    kalMax: 150 },
};

export default function ContentPage() {
  const { id: knowledgeId } = useParams<{ id: string }>();
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DifficultyPreset>("medium");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIndexStatus(knowledgeId)
      .then((data) => setContent(data as unknown as ContentItem))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [knowledgeId]);

  async function handleStart() {
    if (!address) return;
    setStarting(true);
    setError(null);
    try {
      const config: SessionConfig = {
        difficulty_preset: preset,
        response: "detailed",
        attest: "onchain",
      };
      const { sessionId, question } = await startVerify(knowledgeId, address, config);
      sessionStorage.setItem(`q_${sessionId}`, JSON.stringify(question));
      router.push(`/session/${sessionId}?knowledgeId=${knowledgeId}`);
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{content?.title ?? knowledgeId}</h1>
          <p className="text-sm text-muted-foreground font-mono">{content?.source}</p>
        </div>
        <KGGraphModal knowledgeId={knowledgeId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#A29BFE]" />
            Choose difficulty
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {(["easy", "medium", "hard"] as DifficultyPreset[]).map((p) => {
              const meta = PRESET_META[p];
              return (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    preset === p
                      ? "border-[#6C5CE7] bg-[#6C5CE7]/10"
                      : "border-border hover:border-[#6C5CE7]/40"
                  }`}
                >
                  <div className="font-semibold mb-1">{meta.label}</div>
                  <div className="text-xs text-muted-foreground">{meta.desc}</div>
                  <div className="mt-2 flex items-center gap-1 text-[#A29BFE] text-xs font-semibold">
                    <Coins className="h-3 w-3" />
                    up to {meta.kalMax} KAL
                  </div>
                </button>
              );
            })}
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          {!isConnected ? (
            <div className="flex items-center gap-3 py-2">
              <p className="text-sm text-muted-foreground">Connect wallet to start the test.</p>
              <WalletButton />
            </div>
          ) : (
            <Button
              variant="kal"
              className="w-full"
              disabled={starting}
              onClick={handleStart}
            >
              <BookOpen className="h-4 w-4" />
              {starting ? "Starting…" : "Start Adaptive Test"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
