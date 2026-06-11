/**
 * KaL oracle API client — all calls go through the Next.js proxy route.
 * POCW_API_KEY is never exposed to the browser.
 */

import { MOCK, MOCK_CONTENT, MOCK_GRAPH, mockStatus } from "./mock";

const PROXY = "/api/oracle";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = "open" | "mcq" | "true_false" | "scenario";
export type DifficultyPreset = "easy" | "medium" | "hard";

export interface VerifyQuestion {
  text: string;
  number: number;
  type: QuestionType;
  bloomLevel: string;
  difficulty: number;
  totalQuestions: number;
  options?: string[];
}

export interface AnswerFeedback {
  correct: boolean;
  score: number;
  reasoning: string;
  dimensions?: {
    accuracy: number;
    depth: number;
    specificity: number;
    reasoning: number;
  };
  referenceKeyPoints?: string[];
  correctAnswer?: string;
  progress: {
    questionNumber: number;
    theta: number;
    se: number;
    bloomLevel: string;
  };
  isComplete: boolean;
  nextQuestion?: VerifyQuestion;
}

export interface ScoreBreakdown {
  question: string;
  type: QuestionType;
  score: number;
  difficulty: number;
  bloomLevel: string;
  correct: boolean;
}

export interface OnchainAttestation {
  type: "onchain";
  signature: string;
  contentId: number;
  score: number;
  /** KAL reward in wei (18-dec, decimal string) — minted atomically with the SBT in verifyAndMint */
  kalAmount: string;
  oracle: string;
  controllerAddress: string;
  sbtAddress: string;
  nonce: string;
  expiry: number;
  tokenUri: string;
}

export interface OffchainAttestation {
  type: "offchain";
  signature: string;
  contentId: number;
  score: number;
  kalAmount: string;
  oracle: string;
  nonce: string;
  expiry: number;
  tokenUri: string;
}

export type AttestationResult = OnchainAttestation | OffchainAttestation;

export interface PoCWResult {
  competenceIndicator: boolean;
  score: number;
  theta: number;
  se: number;
  converged: boolean;
  confidence_interval: [number, number];
  questions_asked: number;
  kalAmount?: number;
  response_detail?: ScoreBreakdown[];
  attestation?: AttestationResult;
  knowledgeId: string;
  contentId: number;
  subject: string;
  timestamp: string;
  tokenUri?: string;
}

export interface UnlockRule {
  mode: "any";
  /** Integer content_ids; holding ANY ONE SBT for these courses unlocks access. */
  sbtContentIds: number[];
}

export interface ContentItem {
  knowledgeId: string;
  contentId: number;
  source: string;
  status: "ready" | "indexing" | "failed";
  title?: string;
  contentType?: string;
  createdAt?: string;
  /** Access tier — present when returned by the backend. */
  tier?: "free" | "paid" | "unlocked";
  /** KAL cost (paid tier only). */
  kalPrice?: number;
  /** Unlock rule (unlocked tier only). */
  unlockRule?: UnlockRule;
}

export interface SessionConfig {
  max_questions?: number;
  difficulty?: number;
  difficulty_preset?: DifficultyPreset;
  q_types?: QuestionType[];
  threshold?: number;
  response?: "boolean" | "score" | "detailed";
  model?: string;
  language?: string;
  attest?: "onchain" | "offchain" | "none";
  chain?: {
    controllerAddress: string;
    sbtAddress: string;
    rpc?: string;
  };
}

export interface KGGraph {
  nodes: Array<{
    id: string;
    label: string;
    bloomLevel: string;
    importance: number;
    type?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relation: string;
  }>;
}

// ─── Content API ──────────────────────────────────────────────────────────────

export async function listContent(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ContentItem[]; total: number }> {
  if (MOCK) return { items: MOCK_CONTENT, total: MOCK_CONTENT.length };
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const url = `${PROXY}/index${qs.size ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await extractError(res, "List failed"));
  // Oracle returns { rows: ContentRow[], total } with snake_case field names.
  // Normalise to { items: ContentItem[], total } with camelCase.
  const data = await res.json();
  const raw: any[] = data.rows ?? data.items ?? [];
  const items: ContentItem[] = raw.map((r) => ({
    knowledgeId: r.knowledge_id ?? r.knowledgeId,
    contentId:   r.content_id   ?? r.contentId,
    source:      r.source,
    status:      r.status,
    title:       r.title ?? undefined,
    contentType: r.content_type ?? r.contentType ?? undefined,
    createdAt:   r.created_at   ?? r.createdAt,
    tier:        r.tier         ?? undefined,
    kalPrice:    r.kal_price    ?? r.kalPrice   ?? undefined,
    unlockRule:  r.unlock_rule  ? (typeof r.unlock_rule === "string" ? JSON.parse(r.unlock_rule) : r.unlock_rule) : undefined,
  }));
  return { items, total: data.total ?? items.length };
}

export async function getIndexStatus(
  knowledgeId: string
): Promise<{ knowledgeId: string; status: string; title?: string; source?: string; error?: string }> {
  if (MOCK) return mockStatus(knowledgeId);
  const res = await fetch(`${PROXY}/index/${knowledgeId}`);
  if (!res.ok) throw new Error(await extractError(res, "Status check failed"));
  const d = await res.json();
  return {
    knowledgeId: d.knowledge_id ?? d.knowledgeId,
    status:      d.status,
    title:       d.title  ?? undefined,
    source:      d.source ?? undefined,
    error:       d.error  ?? undefined,
  };
}

export async function indexUrl(
  source: string
): Promise<{ knowledgeId: string; status: string; contentId?: number }> {
  const res = await fetch(`${PROXY}/index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Index failed"));
  const d = await res.json();
  return { knowledgeId: d.knowledge_id ?? d.knowledgeId, status: d.status, contentId: d.content_id ?? d.contentId };
}

export async function uploadFile(
  file: File
): Promise<{ knowledgeId: string; status: string; contentId?: number }> {
  const res = await fetch(`${PROXY}/upload`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: await file.arrayBuffer(),
  });
  if (!res.ok) throw new Error(await extractError(res, "Upload failed"));
  const d = await res.json();
  return { knowledgeId: d.knowledge_id ?? d.knowledgeId, status: d.status, contentId: d.content_id ?? d.contentId };
}

export async function getGraph(knowledgeId: string): Promise<KGGraph> {
  if (MOCK) return MOCK_GRAPH;
  const res = await fetch(`${PROXY}/graph/${knowledgeId}`);
  if (!res.ok) throw new Error(await extractError(res, "Graph fetch failed"));
  const data = await res.json();
  return {
    nodes: data.nodes ?? [],
    edges: (data.edges ?? []).map((e: any) => ({
      source: e.source,
      target: e.target,
      relation: e.relation ?? e.relationship ?? "",
    })),
  };
}

// ─── Verify API ───────────────────────────────────────────────────────────────

export async function startVerify(
  knowledgeId: string,
  subject: string,
  config?: SessionConfig
): Promise<{ sessionId: string; question: VerifyQuestion; importantConceptCount: number; maxQuestions: number }> {
  const res = await fetch(`${PROXY}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ knowledgeId, subject, config }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Start verify failed"));
  return res.json();
}

export async function submitAnswer(
  sessionId: string,
  answer: string
): Promise<AnswerFeedback> {
  const res = await fetch(`${PROXY}/verify/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Answer failed"));
  return res.json();
}

export async function getResult(sessionId: string): Promise<PoCWResult> {
  const res = await fetch(`${PROXY}/verify/${sessionId}/result`);
  if (!res.ok) throw new Error(await extractError(res, "Result fetch failed"));
  return res.json();
}

/** An SBT the learner has earned (from oracle records), used by the account page. */
export interface EarnedSBT {
  contentId: number;
  /** ERC-1155 token id (per-holder) as a decimal string. */
  tokenId: string;
  knowledgeId: string | null;
  score: number;
  tokenUri: string;
}

/** List the SBTs a learner earned — no full-chain scan; the frontend verifies with balanceOf. */
export async function sbtsOfOwner(address: string): Promise<EarnedSBT[]> {
  const res = await fetch(`${PROXY}/sbts/${address}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.sbts ?? []) as EarnedSBT[];
}

/** Re-issue a fresh attestation (new nonce/expiry) so a learner can mint later (recovery). */
export async function reattest(
  address: string,
  contentId: number
): Promise<{ attestation: AttestationResult; subject: string; contentId: number; tokenUri: string }> {
  const res = await fetch(`${PROXY}/verify/reattest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, contentId }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Re-attest failed"));
  return res.json();
}

// ─── Admin API ───────────────────────────────────────────────────────────────

/**
 * List all content items with their access-control fields.
 * Requires the connected wallet to be the admin wallet (sent as X-Admin-Address).
 */
export async function listAccessAdmin(adminAddress: string): Promise<ContentItem[]> {
  const res = await fetch(`${PROXY}/admin/access`, {
    headers: { "x-admin-address": adminAddress },
  });
  if (!res.ok) throw new Error(await extractError(res, "Admin list failed"));
  const data = await res.json();
  return (data.items ?? []).map((r: any) => ({
    knowledgeId:  r.knowledgeId,
    contentId:    r.contentId,
    source:       r.source,
    status:       r.status,
    title:        r.title ?? undefined,
    tier:         r.tier ?? "free",
    kalPrice:     r.kalPrice ?? undefined,
    unlockRule:   r.unlockRule ?? undefined,
  }));
}

/**
 * Fetch an oracle-signed price quote for a paid-tier course.
 * The quote is then passed to KalPaywall.purchase() via the usePurchaseCourse hook.
 */
export async function fetchPriceQuote(
  knowledgeId: string,
  buyer: string
): Promise<{
  contentId: number;
  priceWei: string;
  priceKal: number;
  expiry: number;
  nonce: `0x${string}`;
  signature: `0x${string}`;
  unsigned?: boolean;
}> {
  const res = await fetch(`${PROXY}/access/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ knowledgeId, buyer }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Quote failed"));
  return res.json();
}

/** Re-derive and store the title for an already-indexed content entry. */
export async function rederiveContentTitle(
  knowledgeId: string,
  adminAddress: string
): Promise<{ knowledgeId: string; title: string }> {
  const res = await fetch(`${PROXY}/index/${knowledgeId}/title`, {
    method: "PATCH",
    headers: { "x-admin-address": adminAddress },
  });
  if (!res.ok) throw new Error(await extractError(res, "Title re-derive failed"));
  return res.json();
}

export async function setContentAccess(
  knowledgeId: string,
  access: { tier: "free" | "paid" | "unlocked"; kalPrice?: number; unlockRule?: UnlockRule },
  adminAddress: string
): Promise<void> {
  const res = await fetch(`${PROXY}/admin/access/${knowledgeId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-admin-address": adminAddress,
    },
    body: JSON.stringify(access),
  });
  if (!res.ok) throw new Error(await extractError(res, "Access update failed"));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function extractError(res: Response, prefix: string): Promise<string> {
  try {
    const body = await res.clone().json();
    if (typeof body?.error === "string") return `${prefix}: ${body.error}`;
  } catch {
    // not JSON
  }
  return `${prefix} (${res.status})`;
}
