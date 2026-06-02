"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Coins, Brain, BarChart2 } from "lucide-react";
import Link from "next/link";
import { getIndexStatus, getGraph, startVerify, type SessionConfig, type KGGraph } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KGGraphCard } from "@/components/KGGraphCard";
import { useAccount } from "wagmi";
import { WalletButton } from "@/components/WalletButton";
import { bloomColor } from "@/lib/utils";

type DifficultyPreset = "easy" | "medium" | "hard";

const PRESET_META: Record<DifficultyPreset, {
  label: string;
  passThreshold: string;
  importanceThreshold: number;
  minQuestions: number;
  capQuestions: number;
  desc: string;
  kalMax: number;
}> = {
  easy: {
    label: "Easy",
    passThreshold: "Pass at 35%",
    importanceThreshold: 0.80,
    minQuestions: 10,
    capQuestions: 15,
    desc: "Focuses on the top 20% most central concepts. Short test, lower bar. Good for a first read.",
    kalMax: 60,
  },
  medium: {
    label: "Medium",
    passThreshold: "Pass at 50%",
    importanceThreshold: 0.65,
    minQuestions: 15,
    capQuestions: 25,
    desc: "Covers the top 35% of concepts. Balanced breadth and depth with adaptive follow-ups.",
    kalMax: 100,
  },
  hard: {
    label: "Hard",
    passThreshold: "Pass at 65%",
    importanceThreshold: 0.50,
    minQuestions: 20,
    capQuestions: 40,
    desc: "Covers the top 50% of concepts — including secondary ones. Retests failed concepts.",
    kalMax: 150,
  },
};

interface ContentStatus {
  knowledgeId: string;
  status: string;
  title?: string;
  source?: string;
}

interface ConceptStats {
  total: number;
  important: number;
  bloomDist: Record<string, number>;
  topConcepts: Array<{ label: string; bloomLevel: string; importance: number }>;
}

function shortSource(source: string): string {
  try {
    const url = new URL(source);
    return url.hostname + (url.pathname.length > 1 ? url.pathname.slice(0, 40) : "");
  } catch {
    return source.slice(0, 60);
  }
}

function shortId(id: string): string {
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function computeStats(graph: KGGraph, threshold: number): ConceptStats {
  const important = graph.nodes.filter(n => n.importance >= threshold);
  const effective = important.length < 3 ? graph.nodes.slice(0, 3) : important;
  const bloomDist: Record<string, number> = {};
  for (const n of effective) {
    bloomDist[n.bloomLevel] = (bloomDist[n.bloomLevel] ?? 0) + 1;
  }
  const topConcepts = [...effective]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8);
  return { total: graph.nodes.length, important: effective.length, bloomDist, topConcepts };
}

export default function ContentPage() {
  const { id: knowledgeId } = useParams<{ id: string }>();
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [content, setContent] = useState<ContentStatus | null>(null);
  const [rawGraph, setRawGraph] = useState<KGGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DifficultyPreset>("medium");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getIndexStatus(knowledgeId).catch(() => null),
      getGraph(knowledgeId).catch(() => null),
    ]).then(([status, graph]) => {
      setContent(status);
      setRawGraph(graph);
    }).finally(() => setLoading(false));
  }, [knowledgeId]);

  const allStats = rawGraph ? {
    easy:   computeStats(rawGraph, PRESET_META.easy.importanceThreshold),
    medium: computeStats(rawGraph, PRESET_META.medium.importanceThreshold),
    hard:   computeStats(rawGraph, PRESET_META.hard.importanceThreshold),
  } : null;

  const stats = allStats ? allStats[preset] : null;

  async function handleStart() {
    if (!address) return;
    setStarting(true);
    setError(null);
    try {
      const config: SessionConfig = {
        difficulty_preset: preset,
        response: "detailed",
        attest: "onchain",
        chain: {
          controllerAddress: process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS!,
          sbtAddress: process.env.NEXT_PUBLIC_SBT_ADDRESS!,
        },
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

  const displayTitle = content?.title
    || (content?.source ? shortSource(content.source) : null)
    || shortId(knowledgeId);

  const { minQuestions: presetMin, capQuestions: presetCap } = PRESET_META[preset];
  const minQuestions = stats
    ? Math.min(Math.max(presetMin, stats.important), presetCap)
    : presetMin;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Link>

      {/* Title + ID */}
      <div>
        <h1 className="text-2xl font-bold leading-snug">{displayTitle}</h1>
        <p className="text-xs text-muted-foreground font-mono mt-1" title={knowledgeId}>
          {knowledgeId}
        </p>
      </div>

      {/* Concept stats */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#A29BFE]" />
              Knowledge Graph — {stats.total} concepts, {stats.important} key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Bloom distribution bar */}
            <div className="flex gap-1 h-2 rounded-full overflow-hidden">
              {(["Remember","Understand","Apply","Analyze","Evaluate","Create"] as const).map((level) => {
                const count = stats.bloomDist[level] ?? 0;
                if (count === 0) return null;
                const pct = (count / stats.important) * 100;
                return (
                  <div
                    key={level}
                    style={{ width: `${pct}%`, backgroundColor: bloomColor(level) }}
                    title={`${level}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {(["Remember","Understand","Apply","Analyze","Evaluate","Create"] as const)
                .filter(l => stats.bloomDist[l])
                .map(l => (
                  <span key={l} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: bloomColor(l) }} />
                    {l} {stats.bloomDist[l]}
                  </span>
                ))
              }
            </div>

            {/* Top concepts */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {stats.topConcepts.map((c) => (
                <span
                  key={c.label}
                  className="text-xs px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: bloomColor(c.bloomLevel) + "60",
                    color: bloomColor(c.bloomLevel),
                    backgroundColor: bloomColor(c.bloomLevel) + "15",
                  }}
                >
                  {c.label}
                </span>
              ))}
              {stats.important > 8 && (
                <span className="text-xs text-muted-foreground px-2 py-0.5">
                  +{stats.important - 8} more
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground border-t border-border pt-2">
              <Brain className="h-3 w-3 inline mr-1 text-[#A29BFE]" />
              Test will cover all {stats.important} key concepts —{" "}
              {minQuestions === presetCap
                ? `${minQuestions} questions`
                : `${minQuestions}–${presetCap} questions`}
              , exits early when ability converges (SE &lt; 0.40).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Knowledge graph */}
      {rawGraph && <KGGraphCard knowledgeId={knowledgeId} graph={rawGraph} />}

      {/* Difficulty selector */}
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
              const cardStats = allStats?.[p];
              const cardMin = cardStats
                ? Math.min(Math.max(meta.minQuestions, cardStats.important), meta.capQuestions)
                : meta.minQuestions;
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
                  <div className="text-xs text-muted-foreground mb-1">
                    {cardMin === meta.capQuestions
                      ? `${cardMin} questions`
                      : `${cardMin}–${meta.capQuestions} questions`}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{meta.passThreshold}</div>
                  <div className="flex items-center gap-1 text-[#A29BFE] text-xs font-semibold">
                    <Coins className="h-3 w-3" />
                    up to {meta.kalMax} KAL
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected preset description */}
          <p className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-2 leading-relaxed">
            {PRESET_META[preset].desc}
          </p>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          {!isConnected ? (
            <div className="flex items-center gap-3 py-2">
              <p className="text-sm text-muted-foreground">Connect wallet to start the test.</p>
              <WalletButton />
            </div>
          ) : (
            <Button variant="kal" className="w-full" disabled={starting} onClick={handleStart}>
              <BookOpen className="h-4 w-4" />
              {starting ? "Starting…" : "Start Adaptive Test"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
