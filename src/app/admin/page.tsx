"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Upload, Link as LinkIcon, CheckCircle, AlertCircle, RefreshCw,
  ShieldAlert, Settings2, Coins, Lock, Sparkles, Save, ChevronDown, Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/WalletButton";
import { indexUrl, uploadFile, getIndexStatus, listAccessAdmin, setContentAccess, rederiveContentTitle, type ContentItem, type UnlockRule } from "@/lib/api";
import { useMounted } from "@/lib/use-mounted";

const ADMIN_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? "").toLowerCase();

type IndexResult = { knowledgeId: string; status: string; contentId?: number };

// ─── Access editor for a single course ──────────────────────────────────────

function AccessEditor({
  item,
  allItems,
  adminAddress,
  onSaved,
}: {
  item: ContentItem;
  allItems: ContentItem[];
  adminAddress: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<"free" | "paid" | "unlocked">(item.tier ?? "free");
  const [kalPrice, setKalPrice] = useState(String(item.kalPrice ?? ""));
  const [prereqIds, setPrereqIds] = useState<number[]>(item.unlockRule?.sbtContentIds ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [derivingTitle, setDerivingTitle] = useState(false);
  const [derivedTitle, setDerivedTitle] = useState<string | null>(null);

  const togglePrereq = (contentId: number) => {
    setPrereqIds((prev) =>
      prev.includes(contentId) ? prev.filter((x) => x !== contentId) : [...prev, contentId]
    );
  };

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const access: Parameters<typeof setContentAccess>[1] = { tier };
      if (tier === "paid") access.kalPrice = Number(kalPrice);
      if (tier === "unlocked") access.unlockRule = { mode: "any", sbtContentIds: prereqIds };
      await setContentAccess(item.knowledgeId, access, adminAddress);
      setOpen(false);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const tierColor = { free: "text-mono-green", paid: "text-kal-light", unlocked: "text-mono-purple" };

  async function handleRederiveTitle() {
    setDerivingTitle(true);
    setErr(null);
    try {
      const result = await rederiveContentTitle(item.knowledgeId, adminAddress);
      setDerivedTitle(result.title);
      onSaved(); // refresh list
    } catch (e) {
      setErr((e as Error).message.slice(0, 80));
    } finally {
      setDerivingTitle(false);
    }
  }

  const displayTitle = derivedTitle ?? item.title ?? item.source;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayTitle}</p>
          <p className="tape mt-0.5 truncate text-muted-foreground" title={item.knowledgeId}>
            {item.knowledgeId.slice(0, 24)}…
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={item.tier ?? "free" as "free" | "paid" | "unlocked"}>
            {item.tier ?? "free"}
          </Badge>
          {/* Re-derive title via LLM — fixes stale/wrong titles from old indexing */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            title="Re-derive title using LLM (fixes wrong titles from old indexing)"
            disabled={derivingTitle}
            onClick={handleRederiveTitle}
          >
            <Wand2 className={`h-3.5 w-3.5 ${derivingTitle ? "animate-pulse" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen(!open)}>
            <Settings2 className="h-3.5 w-3.5" />
            Edit
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>
      {err && <p className="mt-1 text-[11px] text-rose-400">{err}</p>}

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {/* Tier selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tier</label>
            <div className="flex gap-2">
              {(["free", "paid", "unlocked"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    tier === t
                      ? `border-transparent bg-kal/15 ${tierColor[t]}`
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "free" && <Sparkles className="mr-1 inline h-3.5 w-3.5" />}
                  {t === "paid" && <Coins className="mr-1 inline h-3.5 w-3.5" />}
                  {t === "unlocked" && <Lock className="mr-1 inline h-3.5 w-3.5" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* KAL price (paid) */}
          {tier === "paid" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                KAL price to access
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={kalPrice}
                  onChange={(e) => setKalPrice(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-32 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-kal"
                />
                <span className="text-xs text-muted-foreground">KAL</span>
              </div>
            </div>
          )}

          {/* Prerequisite SBTs (unlocked) */}
          {tier === "unlocked" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Prerequisite SBTs — hold ANY ONE of these to unlock
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                Each SBT corresponds to a course the user passed. Select which ones can unlock this course.
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-secondary/50 p-2">
                {allItems
                  .filter((other) => other.knowledgeId !== item.knowledgeId && other.contentId != null)
                  .map((other) => {
                    const checked = prereqIds.includes(other.contentId!);
                    return (
                      <label
                        key={other.knowledgeId}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-card"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePrereq(other.contentId!)}
                          className="accent-kal"
                        />
                        <span className="min-w-0 text-xs">
                          <span className="truncate font-medium">{other.title ?? other.source}</span>
                          <span className="ml-1 text-muted-foreground">(#{other.contentId})</span>
                        </span>
                      </label>
                    );
                  })}
              </div>
              {prereqIds.length > 0 && (
                <p className="mt-1 text-xs text-mono-purple">
                  Selected: SBT #{prereqIds.join(", #")}
                </p>
              )}
            </div>
          )}

          {err && <p className="text-xs text-rose-400">{err}</p>}

          <Button variant="kal" size="sm" disabled={saving} onClick={save} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const mounted = useMounted();

  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IndexResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Access editor state
  const [accessItems, setAccessItems] = useState<ContentItem[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  const isAdmin = mounted && isConnected && address?.toLowerCase() === ADMIN_ADDRESS;

  async function loadAccess() {
    if (!address) return;
    setAccessLoading(true);
    try {
      const items = await listAccessAdmin(address);
      setAccessItems(items);
    } catch {
      setAccessItems([]);
    } finally {
      setAccessLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) loadAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function handleIndexUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await indexUrl(url.trim());
      setResult(data);
      if (data.status !== "ready") startPolling(data.knowledgeId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await uploadFile(file);
      setResult(data);
      if (data.status !== "ready") startPolling(data.knowledgeId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function startPolling(knowledgeId: string) {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const status = await getIndexStatus(knowledgeId);
        setResult((prev) => prev ? { ...prev, status: status.status } : null);
        if (status.status === "ready" || status.status === "failed") {
          clearInterval(interval);
          setPolling(false);
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
      }
    }, 5000);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  // Not connected or not admin
  if (!mounted || !isConnected) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Admin</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">Connect your wallet to continue.</p>
        <div className="flex justify-center"><WalletButton /></div>
      </div>
    );
  }

  if (!isAdmin && ADMIN_ADDRESS) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-mono-red" />
        <h1 className="font-display text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is restricted to the PoCW deployer wallet.
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{ADMIN_ADDRESS}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <p className="tape uppercase tracking-[0.2em] text-kal-light">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">Content Management</h1>
      </header>

      {/* ── Access Tier Editor ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Course Access Rules</h2>
          <Button variant="outline" size="sm" onClick={loadAccess} disabled={accessLoading}>
            <RefreshCw className={`h-4 w-4 ${accessLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Set each course as Free, Paid (KAL price), or Unlocked (requires holding an SBT).
          Any one of the selected prerequisite SBTs unlocks the course.
        </p>
        {accessLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : accessItems.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
            No indexed content yet. Index a URL or upload a file below.
          </p>
        ) : (
          <div className="space-y-2">
            {accessItems.map((item) => (
              <AccessEditor
                key={item.knowledgeId}
                item={item}
                allItems={accessItems}
                adminAddress={address!}
                onSaved={loadAccess}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Content Upload ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Index Content</h2>

        {/* URL indexing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="h-4 w-4 text-kal-light" />
              Index a URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article  or  ipfs://CID"
                className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-kal placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === "Enter" && handleIndexUrl()}
              />
              <Button variant="kal" size="sm" disabled={loading || !url.trim()} onClick={handleIndexUrl}>
                Index
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File upload */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-kal-light" />
              Upload a File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-kal/50"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Drop a PDF or text file here, or click to browse</p>
              )}
              <input
                id="file-input"
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button variant="kal" className="w-full" disabled={loading || !file} onClick={handleUpload}>
              <Upload className="h-4 w-4" />
              {loading ? "Uploading…" : "Upload & Index"}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className={result.status === "ready" ? "border-emerald-500/30" : "border-amber-500/30"}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center gap-2">
                {result.status === "ready" ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <RefreshCw className={`h-4 w-4 text-amber-400 ${polling ? "animate-spin" : ""}`} />
                )}
                <span className="text-sm font-medium capitalize">{result.status}</span>
              </div>
              <p className="tape text-muted-foreground">knowledgeId: {result.knowledgeId}</p>
              {result.contentId != null && (
                <p className="tape text-muted-foreground">contentId: {result.contentId}</p>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-rose-500/30">
            <CardContent className="flex items-center gap-2 pt-4 text-sm text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
