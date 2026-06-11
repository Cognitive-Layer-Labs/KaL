"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Wallet, ArrowUpDown, Sparkles } from "lucide-react";
import { useAccount } from "wagmi";
import { listContent, type ContentItem } from "@/lib/api";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/WalletButton";
import { useSBTsOfOwner } from "@/lib/contracts";
import { getCourseMeta, type CourseTier } from "@/lib/catalog-config";
import { useMounted } from "@/lib/use-mounted";

type Tab = "all" | CourseTier;
type SortKey = "newest" | "title" | "reward";

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: "all", label: "All", hint: "Everything in the library" },
  { key: "free", label: "Free", hint: "Open to anyone — earn KAL by proving knowledge" },
  { key: "paid", label: "Paid", hint: "Premium courses priced in KAL" },
  { key: "unlocked", label: "Unlocked", hint: "Gated courses unlocked by holding the right SBT" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "title", label: "Title A–Z" },
  { key: "reward", label: "Highest reward" },
];

export function CoursesView() {
  const { address, isConnected } = useAccount();
  const { data: sbtIds } = useSBTsOfOwner(address);
  const mounted = useMounted();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listContent({ status: "ready", limit: 50 });
      setItems(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isConnected) load();
  }, [isConnected]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: items.length, free: 0, paid: 0, unlocked: 0 };
    for (const it of items) c[getCourseMeta(it.knowledgeId, it).tier]++;
    return c;
  }, [items]);

  const visible = useMemo(() => {
    let list = tab === "all" ? items : items.filter((it) => getCourseMeta(it.knowledgeId, it).tier === tab);
    list = [...list].sort((a, b) => {
      if (sort === "title") return (a.title ?? a.source).localeCompare(b.title ?? b.source);
      if (sort === "reward") return getCourseMeta(b.knowledgeId, b).rewardKal - getCourseMeta(a.knowledgeId, a).rewardKal;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
    return list;
  }, [items, tab, sort]);

  // ── wallet gate ──────────────────────────────────────────────────────────
  if (!mounted || !isConnected) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border glass p-10 text-center animate-fade-up">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-kal/15 text-kal-light">
          <Wallet className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold">Connect to enter the library</h2>
        <p className="mx-auto mt-2 mb-6 max-w-xs text-sm text-muted-foreground">
          Your wallet is your login. Connect it to browse every course and see what your SBTs unlock.
        </p>
        <div className="flex justify-center">
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* tab bar + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card/60 p-1.5">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                title={t.hint}
                className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-kal text-white shadow-[0_6px_20px_-8px_rgba(249,38,114,0.8)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <span className={`ml-1.5 tabular-nums text-xs ${active ? "text-white/80" : "text-muted-foreground/70"}`}>
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <label className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground sm:self-auto">
          <ArrowUpDown className="h-4 w-4" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="cursor-pointer bg-transparent text-foreground focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key} className="bg-popover text-foreground">
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* body */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="mb-4">Could not load courses: {error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-kal/50" />
          <p className="text-lg">Nothing here yet.</p>
          <p className="text-sm">No courses in this category — try another tab.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <ContentCard key={item.knowledgeId} item={item} sbtIds={sbtIds as bigint[] | undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
