/**
 * KaL catalog metadata — frontend data layer with backend-data preference.
 *
 * When a ContentItem from the oracle includes tier/kalPrice/unlockRule (set via
 * the admin API), those fields take priority. The COURSE_META map and the
 * deterministic hash fallback are used only when backend fields are absent.
 */

export type CourseTier = "free" | "paid" | "unlocked";
export type SourceType = "youtube" | "pdf" | "web" | "file";

export interface CourseMeta {
  tier: CourseTier;
  /** KAL you can earn by passing the test. */
  rewardKal: number;
  /** Paid tier only: KAL required to access. */
  kalPrice?: number;
  /**
   * Unlocked tier only: list of prerequisite SBT content-ids (integers).
   * The course unlocks when the user holds ANY ONE of these.
   */
  unlockSbtIds?: number[];
  /** @deprecated use unlockSbtIds[0]. Kept for display compat until Phase 2 fully migrates. */
  unlockSbtId?: number;
}

/**
 * Explicit per-course overrides. Key by `knowledgeId`.
 * Populate with real course ids for the demo; anything not listed falls back to
 * the deterministic assignment below so all three tabs are populated.
 */
export const COURSE_META: Record<string, CourseMeta> = {
  // "0xabc…": { tier: "paid", rewardKal: 120, kalPrice: 80 },
  // "0xdef…": { tier: "unlocked", rewardKal: 200, unlockSbtId: 1 },
};

export const TIER_LABEL: Record<CourseTier, string> = {
  free: "Free",
  paid: "Paid",
  unlocked: "Unlocked",
};

// ─── deterministic helpers ──────────────────────────────────────────────────

/** FNV-1a — small, stable, well-distributed string hash. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Resolve a course's metadata. Priority order:
 *   1. Backend-provided tier/kalPrice/unlockRule (from ContentItem returned by oracle)
 *   2. Explicit COURSE_META override (keyed by knowledgeId)
 *   3. Deterministic hash fallback (so all three tabs populate in dev/demo)
 *
 * Pass the full ContentItem when available to benefit from backend data.
 */
export function getCourseMeta(
  knowledgeId: string,
  item?: { tier?: string; kalPrice?: number; unlockRule?: { mode: string; sbtContentIds: number[] } }
): CourseMeta {
  // 1. Backend data takes priority
  if (item?.tier) {
    const tier = item.tier as CourseTier;
    const h = hash(knowledgeId);
    const rewardKal = 40 + (h % 4) * 20; // stable reward even for backend-tiered courses
    if (tier === "paid") {
      return { tier, rewardKal, kalPrice: item.kalPrice };
    }
    if (tier === "unlocked") {
      const ids = item.unlockRule?.sbtContentIds ?? [];
      return { tier, rewardKal, unlockSbtIds: ids, unlockSbtId: ids[0] };
    }
    return { tier: "free", rewardKal };
  }

  // 2. Explicit override
  const explicit = COURSE_META[knowledgeId];
  if (explicit) return explicit;

  // 3. Deterministic hash fallback
  const h = hash(knowledgeId);
  const bucket = h % 10;
  if (bucket < 6) {
    return { tier: "free", rewardKal: 40 + (h % 4) * 20 };
  }
  if (bucket < 9) {
    return { tier: "paid", rewardKal: 100 + (h % 3) * 25, kalPrice: 50 + (h % 3) * 25 };
  }
  // derive the unlock id from a different slice of the hash than the tier bucket,
  // so requirements vary across the unlocked tier
  const sbtId = ((h >> 8) % 5) + 1;
  return { tier: "unlocked", rewardKal: 150 + (h % 3) * 50, unlockSbtIds: [sbtId], unlockSbtId: sbtId };
}

/** Detect material type from the source URL (+ optional indexed content type). */
export function detectSourceType(source: string, contentType?: string): SourceType {
  const s = (source || "").toLowerCase();
  const ct = (contentType || "").toLowerCase();
  if (/youtube\.com|youtu\.be/.test(s)) return "youtube";
  if (s.endsWith(".pdf") || ct.includes("pdf")) return "pdf";
  if (/^https?:\/\//.test(s) || /^ipfs:\/\//.test(s)) return "web";
  return "file";
}

/** Extract a YouTube video id from common URL shapes. */
export function youtubeId(source: string): string | null {
  if (!source) return null;
  const m =
    source.match(/[?&]v=([\w-]{11})/) ||
    source.match(/youtu\.be\/([\w-]{11})/) ||
    source.match(/youtube\.com\/embed\/([\w-]{11})/) ||
    source.match(/youtube\.com\/shorts\/([\w-]{11})/);
  return m ? m[1] : null;
}

/** Build an embeddable YouTube URL, or null if not a YouTube source. */
export function youtubeEmbed(source: string): string | null {
  const id = youtubeId(source);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
}

// ─── gradient banner ─────────────────────────────────────────────────────────

/**
 * ~20 brand-harmonious colors arranged around the wheel
 * (deep purple → magenta → hot pink → coral → orange → yellow → green → cyan →
 * blue → purple) so any two adjacent stops blend into a beautiful gradient.
 */
export const GRADIENT_STOPS = [
  "#2D0B3A", "#4A0E5C", "#6B1FA0", "#8E2DE2", "#A833C9",
  "#C81E5B", "#E0218A", "#F92672", "#FF2E97", "#FF4D94",
  "#FF6FA5", "#FF8FB0", "#FFB199", "#FD971F", "#E6DB74",
  "#A6E22E", "#66D9EF", "#5B6BFF", "#7B5BFF", "#AE81FF",
];

/**
 * Deterministic, distinct-but-cohesive gradient seeded by a course id.
 * Picks 3 nearby stops on the ordered wheel and a varied angle.
 */
export function courseGradient(seed: string): string {
  const h = hash(seed);
  const n = GRADIENT_STOPS.length;
  const i = h % n;
  const j = (i + 2 + (h % 3)) % n;
  const k = (j + 2 + ((h >> 3) % 3)) % n;
  const angle = 110 + (h % 80);
  return `linear-gradient(${angle}deg, ${GRADIENT_STOPS[i]}, ${GRADIENT_STOPS[j]} 55%, ${GRADIENT_STOPS[k]})`;
}

// ─── unlock logic ─────────────────────────────────────────────────────────────

/**
 * A course is accessible unless it's an SBT-gated tier the user hasn't unlocked.
 *
 * Unlock rule: user must hold ANY ONE SBT whose token id (= contentId integer)
 * is in `meta.unlockSbtIds`. This correctly compares on-chain integer token ids.
 */
export function isUnlocked(meta: CourseMeta, sbtIds: readonly bigint[] | undefined): boolean {
  if (meta.tier !== "unlocked") return true;
  const prereqs = meta.unlockSbtIds ?? (meta.unlockSbtId != null ? [meta.unlockSbtId] : []);
  if (prereqs.length === 0) return false;
  const heldSet = new Set(sbtIds?.map(Number) ?? []);
  return prereqs.some((prereqId) => heldSet.has(prereqId));
}
