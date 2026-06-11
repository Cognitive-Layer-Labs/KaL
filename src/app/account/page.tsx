"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import {
  Award, Coins, Wallet, ArrowUpDown, ArrowRight, ShieldCheck, BookOpen,
  CheckCircle2, XCircle, Brain, Clock, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/WalletButton";
import { useKALBalance, useSBTsOfOwner, useSBTMetadatas, type SBTMetadata } from "@/lib/contracts";
import { formatKAL } from "@/lib/utils";
import { listContent, type ContentItem } from "@/lib/api";
import { getCourseMeta, isUnlocked } from "@/lib/catalog-config";
import { useMounted } from "@/lib/use-mounted";

type SortKey = "reward" | "title";

// ─── SBT mini-card ────────────────────────────────────────────────────────────

function attr(meta: SBTMetadata, traitType: string): string | number | undefined {
  return meta.attributes?.find((a) => a.trait_type === traitType)?.value;
}

function formatTs(value: string | number | undefined): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return String(value); }
}

function SBTCard({ tokenId, meta }: { tokenId: bigint; meta: SBTMetadata | null }) {
  const id = Number(tokenId);
  const title     = meta ? String(attr(meta, "Title") ?? `Token #${id}`) : `Token #${id}`;
  const score     = meta ? Number(attr(meta, "Score") ?? 0) : null;
  const bloom     = meta ? String(attr(meta, "Bloom") ?? "—") : null;
  const theta     = meta ? Number(attr(meta, "Theta") ?? 0) : null;
  const questions = meta ? Number(attr(meta, "Questions") ?? 0) : null;
  const passed    = meta ? Number(attr(meta, "Passed") ?? 0) === 1 : null;
  const ts        = meta ? formatTs(attr(meta, "Timestamp")) : null;
  const source    = meta ? String(attr(meta, "Source") ?? "") : null;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-mono-purple/25 bg-mono-purple/5 p-4 transition-colors hover:border-mono-purple/50">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-mono-purple/10 blur-2xl" />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug">{title}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">SBT #{id}</p>
        </div>
        {passed !== null && (
          passed
            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-mono-green" />
            : <XCircle className="h-4 w-4 shrink-0 text-mono-red" />
        )}
      </div>
      {meta && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {score !== null && (
            <span className="flex items-center gap-1 font-mono text-kal-light">
              <Target className="h-3 w-3" />{score}/100
            </span>
          )}
          {bloom && (
            <span className="flex items-center gap-1 text-mono-cyan">
              <Brain className="h-3 w-3" />{bloom}
            </span>
          )}
          {theta !== null && (
            <span className="font-mono text-muted-foreground">θ = {theta.toFixed(2)}</span>
          )}
          {questions !== null && (
            <span className="text-muted-foreground">{questions} Qs</span>
          )}
        </div>
      )}
      {(ts || source) && (
        <div className="mt-3 space-y-0.5 border-t border-mono-purple/15 pt-2.5">
          {ts && (
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />{ts}
            </p>
          )}
          {source && (
            <p className="tape truncate text-muted-foreground" title={source}>{source}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const { address, isConnected } = useAccount();
  const { data: kalBalanceRaw } = useKALBalance(address);
  const { data: sbtIdsRaw } = useSBTsOfOwner(address);
  const mounted = useMounted();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [sort, setSort] = useState<SortKey>("reward");

  useEffect(() => {
    if (!isConnected) return;
    listContent({ status: "ready", limit: 50 })
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, [isConnected]);

  const sbtIds = (sbtIdsRaw as bigint[] | undefined) ?? [];
  const kalBalance = kalBalanceRaw != null ? parseFloat(formatEther(kalBalanceRaw as bigint)) : null;

  const { decoded: sbtMetas, isLoading: sbtMetaLoading } = useSBTMetadatas(sbtIds);

  const unlockedCourses = useMemo(() => {
    const list = items.filter((it) => {
      const meta = getCourseMeta(it.knowledgeId, it);
      return meta.tier === "unlocked" && isUnlocked(meta, sbtIds);
    });
    return list.sort((a, b) => {
      if (sort === "title") return (a.title ?? a.source).localeCompare(b.title ?? b.source);
      return getCourseMeta(b.knowledgeId, b).rewardKal - getCourseMeta(a.knowledgeId, a).rewardKal;
    });
  }, [items, sbtIds, sort]);

  if (!mounted || !isConnected) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-kal/15 text-kal-light">
          <Wallet className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold">Your account</h1>
        <p className="mx-auto mt-2 mb-6 max-w-xs text-sm text-muted-foreground">
          Connect your wallet to see your KAL balance, credentials, and unlocked courses.
        </p>
        <div className="flex justify-center">
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header className="animate-fade-up">
        <p className="tape uppercase tracking-[0.2em] text-kal-light">Account</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">Your knowledge wallet</h1>
      </header>

      {/* balance + credentials */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden border-kal/25">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-kal/15 blur-2xl" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Coins className="h-4 w-4 text-kal-light" />
              KAL Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-4xl font-bold text-kal-light">
              {kalBalance != null ? formatKAL(kalBalance) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Knowledge-as-Liquidity tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-mono-purple" />
              Soulbound Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-4xl font-bold">{sbtIds.length || "0"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Verified, non-transferable proofs</p>
          </CardContent>
        </Card>
      </div>

      {/* SBT mini-cards with decoded on-chain metadata */}
      {sbtIds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Award className="h-4 w-4 text-mono-purple" />
              My SBTs
              <span className="ml-auto font-mono text-xs text-mono-purple">
                {sbtIds.length} credential{sbtIds.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sbtMetaLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sbtIds.map((id) => (
                  <div key={id.toString()} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sbtIds.map((id, i) => (
                  <SBTCard key={id.toString()} tokenId={id} meta={sbtMetas[i] ?? null} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* unlocked courses */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="h-4 w-4 text-mono-green" />
            Unlocked Courses
          </CardTitle>
          {unlockedCourses.length > 0 && (
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="cursor-pointer bg-transparent text-foreground focus:outline-none"
              >
                <option value="reward" className="bg-popover">Highest reward</option>
                <option value="title" className="bg-popover">Title A–Z</option>
              </select>
            </label>
          )}
        </CardHeader>
        <CardContent>
          {unlockedCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No SBT-gated courses unlocked yet. Earn the right credential and they&apos;ll appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {unlockedCourses.map((it) => {
                const meta = getCourseMeta(it.knowledgeId, it);
                return (
                  <Link
                    key={it.knowledgeId}
                    href={`/learn/${it.knowledgeId}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3 transition-colors hover:border-mono-purple/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{it.title ?? it.source}</p>
                      <p className="tape truncate text-muted-foreground">{it.source}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {meta.unlockSbtIds && meta.unlockSbtIds.length > 0 && (
                        <Badge variant="unlocked">SBT #{meta.unlockSbtIds[0]}</Badge>
                      )}
                      <span className="font-mono text-xs text-kal-light">+{meta.rewardKal} KAL</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* wallet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="break-all font-mono text-xs text-muted-foreground">{address}</p>
        </CardContent>
      </Card>
    </div>
  );
}
