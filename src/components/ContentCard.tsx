"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  Network, BookOpen, GraduationCap, Coins, Lock, Loader2,
  Youtube, FileText, Globe, File as FileIcon,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContentItem } from "@/lib/api";
import { fetchPriceQuote } from "@/lib/api";
import { usePaidAccess, useApproveKAL, usePurchaseCourse } from "@/lib/contracts";
import {
  getCourseMeta, detectSourceType, courseGradient, isUnlocked,
  TIER_LABEL, type SourceType,
} from "@/lib/catalog-config";

/** Build 2 drip emitters with fully random positions per mount. */
function buildRandomDrips(): Array<{ left: string; dur: string; delay: string }> {
  return Array.from({ length: 2 }, () => ({
    left:  `${8 + Math.random() * 84}%`,      // 8% – 92% across card width
    dur:   `${4 + Math.random() * 3.5}s`,     // 4 s – 7.5 s  (rarer than before)
    delay: `${Math.random() * 7}s`,           // 0 s – 7 s initial stagger
  }));
}

interface ContentCardProps {
  item: ContentItem;
  /** Held SBT ids — drives unlock state for the `unlocked` tier. */
  sbtIds?: readonly bigint[];
}

const TYPE_ICON: Record<SourceType, typeof Youtube> = {
  youtube: Youtube,
  pdf: FileText,
  web: Globe,
  file: FileIcon,
};

const TYPE_LABEL: Record<SourceType, string> = {
  youtube: "Video",
  pdf: "PDF",
  web: "Article",
  file: "File",
};

const STATUS_META: Record<ContentItem["status"], { dot: string; label: string }> = {
  ready: { dot: "bg-mono-green shadow-[0_0_8px_2px_rgba(166,226,46,0.7)]", label: "Ready" },
  indexing: { dot: "bg-mono-yellow shadow-[0_0_8px_2px_rgba(230,219,116,0.7)]", label: "Indexing" },
  failed: { dot: "bg-mono-red shadow-[0_0_8px_2px_rgba(255,92,87,0.7)]", label: "Failed" },
};

function shortSource(source: string): string {
  try {
    const url = new URL(source);
    return url.hostname + (url.pathname.length > 1 ? url.pathname.slice(0, 30) + "…" : "");
  } catch {
    return source.slice(0, 40) + (source.length > 40 ? "…" : "");
  }
}

// ─── Purchase button for paid-tier cards ─────────────────────────────────────

function PurchaseButton({ item, kalPrice }: { item: ContentItem; kalPrice: number }) {
  const { address } = useAccount();
  const { hasPaid, isLoading } = usePaidAccess(address, item.contentId);
  const { approveKAL, isPending: approving } = useApproveKAL();
  const { purchaseCourse, isPending: purchasing, isConfirming } = usePurchaseCourse();
  const [step, setStep] = useState<"idle" | "approving" | "quoting" | "purchasing" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (isLoading) return (
    <Button variant="outline" size="sm" className="col-span-2 h-9" disabled>
      <Loader2 className="h-4 w-4 animate-spin" />
    </Button>
  );

  // Already paid — show Start Test normally
  if (hasPaid) return (
    <Button variant="kal" size="sm" className="col-span-2 h-9" asChild>
      <Link href={`/content/${item.knowledgeId}`}>
        <GraduationCap className="h-4 w-4" /> Start Test
      </Link>
    </Button>
  );

  const busy = step === "approving" || step === "quoting" || step === "purchasing" || approving || purchasing || isConfirming;

  async function handlePurchase() {
    if (!address) return;
    setErr(null);
    try {
      // 1. Fetch oracle-signed price quote
      setStep("quoting");
      const quote = await fetchPriceQuote(item.knowledgeId, address);

      // The oracle returns an unsigned placeholder when it isn't configured to sign; the paywall
      // would reject it (InvalidSignature). Surface a clear error instead of a confusing revert.
      if (quote.unsigned || quote.signature === "0x") {
        throw new Error("Payments are not available yet — the oracle is not configured to sign price quotes.");
      }

      // 2. Approve KAL spend
      setStep("approving");
      await approveKAL(BigInt(quote.priceWei));

      // 3. Call paywall.purchase
      setStep("purchasing");
      await purchaseCourse({
        contentId: quote.contentId,
        priceWei: quote.priceWei,
        priceKal: quote.priceKal,
        expiry: quote.expiry,
        nonce: quote.nonce as `0x${string}`,
        signature: quote.signature as `0x${string}`,
      });
      setStep("done");
    } catch (e) {
      setErr((e as Error).message.slice(0, 80));
      setStep("error");
    }
  }

  if (step === "done") return (
    <Button variant="kal" size="sm" className="col-span-2 h-9" asChild>
      <Link href={`/content/${item.knowledgeId}`}>
        <GraduationCap className="h-4 w-4" /> Start Test
      </Link>
    </Button>
  );

  return (
    <div className="col-span-2 flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-9 border-kal/40 text-kal-light hover:bg-kal/10"
        disabled={busy}
        onClick={handlePurchase}
        title={err ?? undefined}
      >
        {busy ? (
          <><Loader2 className="h-4 w-4 animate-spin" />
            {step === "quoting" ? "Getting quote…" : step === "approving" ? "Approving…" : "Purchasing…"}
          </>
        ) : (
          <><Coins className="h-4 w-4" /> Unlock — {kalPrice} KAL</>
        )}
      </Button>
      {err && <p className="truncate text-[10px] text-rose-400">{err}</p>}
    </div>
  );
}

export function ContentCard({ item, sbtIds }: ContentCardProps) {
  const meta = getCourseMeta(item.knowledgeId, item);
  const type = detectSourceType(item.source, item.contentType);
  const TypeIcon = TYPE_ICON[type];
  const status = STATUS_META[item.status] ?? STATUS_META.ready;
  const unlocked = isUnlocked(meta, sbtIds);
  const locked = meta.tier === "unlocked" && !unlocked;
  const title = item.title ?? shortSource(item.source);
  // Random positions per mount — no deterministic seed
  const [drips] = useState(() => buildRandomDrips());

  return (
    // Wrapper fills the grid cell (h-full) so all cards in a row are the same height.
    // No overflow-hidden here so drops can fall below the card border.
    <div className="relative h-full">
      <Card className="group relative flex flex-col overflow-hidden h-full transition-all duration-300 hover:-translate-y-1 hover:border-kal/40 hover:shadow-[0_18px_50px_-18px_rgba(249,38,114,0.55)]">
      {/* gradient preview banner */}
      <div
        className="relative h-28 w-full overflow-hidden"
        style={{ backgroundImage: courseGradient(item.knowledgeId) }}
      >
        {/* watermark icon — contained within the banner (overflow-hidden above) */}
        <TypeIcon className="absolute -right-2 -bottom-2 h-20 w-20 text-white/15" strokeWidth={1.25} />

        {/* legibility scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/10 to-transparent" />

        {/* type chip */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/35 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <TypeIcon className="h-3.5 w-3.5" />
          {TYPE_LABEL[type]}
        </div>

        {/* blinking status dot (replaces the old READY badge) */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5" title={status.label}>
          <span className={`h-2.5 w-2.5 rounded-full animate-pulse-dot ${status.dot}`} />
        </div>

        {/* tier badge sits on the banner's bottom edge */}
        <div className="absolute bottom-2.5 left-3">
          <Badge variant={meta.tier}>{TIER_LABEL[meta.tier]}</Badge>
        </div>
      </div>

      <CardContent className="flex-1 space-y-2 p-4">
        <h3 className="font-display text-base font-bold leading-snug line-clamp-2">
          {title}
        </h3>
        <p className="tape truncate text-muted-foreground" title={item.source}>
          {shortSource(item.source)}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs">
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-kal-light">
            <Coins className="h-3.5 w-3.5" />
            +{meta.rewardKal} KAL
          </span>
          {meta.tier === "paid" && meta.kalPrice != null && (
            <span className="font-mono text-muted-foreground">{meta.kalPrice} KAL to enter</span>
          )}
          {meta.tier === "unlocked" && meta.unlockSbtIds && meta.unlockSbtIds.length > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-mono-purple">
              <Lock className="h-3 w-3" />
              SBT #{meta.unlockSbtIds[0]}
              {meta.unlockSbtIds.length > 1 && ` +${meta.unlockSbtIds.length - 1}`}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {locked ? (
          /* SBT-gated and not unlocked */
          <Button variant="outline" className="w-full cursor-not-allowed text-muted-foreground" disabled>
            <Lock className="h-4 w-4" />
            Unlock with SBT #{meta.unlockSbtIds?.[0] ?? meta.unlockSbtId}
          </Button>
        ) : (
          <div className="grid w-full grid-cols-4 gap-2">
            {/* Paid-tier: purchase button (checks hasPaid on-chain; mock treats all as paid) */}
            {meta.tier === "paid" && meta.kalPrice != null ? (
              <PurchaseButton item={item} kalPrice={meta.kalPrice} />
            ) : (
              /* Free or already-unlocked: Start Test */
              <Button variant="kal" size="sm" className="col-span-2 h-9" asChild>
                <Link href={`/content/${item.knowledgeId}`}>
                  <GraduationCap className="h-4 w-4" />
                  Start Test
                </Link>
              </Button>
            )}
            {/* Open Knowledge Graph — quarter width */}
            <Button variant="outline" size="sm" className="col-span-1 h-9" title="Open Knowledge Graph" asChild>
              <Link href={`/graph/${item.knowledgeId}`} target="_blank">
                <Network className="h-4 w-4" />
              </Link>
            </Button>
            {/* Open Material — quarter width */}
            <Button variant="outline" size="sm" className="col-span-1 h-9" title="Open learning material" asChild>
              <Link href={`/learn/${item.knowledgeId}`}>
                <BookOpen className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>

    {/* ── Drop emitters — OUTSIDE the card, fall downward below the card border ──
        Siblings of <Card> inside the no-overflow wrapper. Positioned at bottom: 0
        of the wrapper (= card's bottom edge). The ::after teardrop grows downward
        (transform-origin: top center) and falls outside the card into free space.
    */}
    {drips.map((d, i) => (
      <span
        key={i}
        className="drop-pipe"
        style={{
          left: d.left,
          "--drip-dur": d.dur,
          "--drip-delay": d.delay,
        } as React.CSSProperties}
      />
    ))}
    </div>
  );
}
