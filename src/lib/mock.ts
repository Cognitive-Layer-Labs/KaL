/**
 * Dev-only mock layer for visual verification.
 *
 * Enabled with NEXT_PUBLIC_MOCK=1. Lets the wallet-gated, oracle-backed surfaces
 * (catalog, /learn, /account) render without a wallet or a running oracle, so the
 * redesign can be screenshotted end-to-end. Inert in production (flag off).
 */

import type { ContentItem, KGGraph } from "./api";
import type { SBTMetadata } from "./contracts";

export const MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

export const MOCK_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`;

// Holds SBT #2 → unlocks the unlocked-tier courses gated on #2; the one gated on
// #3 stays locked, so both states are visible.
export const MOCK_SBT_IDS: bigint[] = [BigInt(1), BigInt(2), BigInt(4)];

// 1,340 KAL (18 decimals)
export const MOCK_KAL_BALANCE = BigInt("1340000000000000000000");

export const MOCK_CONTENT: ContentItem[] = [
  // free
  { knowledgeId: "kal-course-1",  contentId: 1,  tier: "free", source: "https://www.youtube.com/watch?v=aircAruvnKk", status: "ready",    title: "Neural Networks, From the Ground Up",   createdAt: "2026-05-28" },
  { knowledgeId: "kal-course-4",  contentId: 4,  tier: "free", source: "https://bitcoin.org/bitcoin.pdf",              status: "ready",    title: "The Bitcoin Whitepaper",               createdAt: "2026-05-20" },
  { knowledgeId: "kal-course-5",  contentId: 5,  tier: "free", source: "https://en.wikipedia.org/wiki/Zero-knowledge_proof", status: "ready", title: "Zero-Knowledge Proofs Explained",  createdAt: "2026-05-12" },
  { knowledgeId: "kal-course-6",  contentId: 6,  tier: "free", source: "ethereum-yellowpaper.pdf",                     status: "indexing", title: "Ethereum Yellow Paper",                createdAt: "2026-05-30" },
  // paid (kalPrice in KAL)
  { knowledgeId: "kal-course-0",  contentId: 0,  tier: "paid", kalPrice: 75,  source: "https://youtu.be/Y3pHpJzZjok",                     status: "ready",  title: "Solidity Masterclass",                cratedAt: "2026-05-29" } as ContentItem,
  { knowledgeId: "kal-course-2",  contentId: 2,  tier: "paid", kalPrice: 100, source: "https://arxiv.org/pdf/1706.03762.pdf",             status: "ready",  title: "Attention Is All You Need",           createdAt: "2026-05-25" },
  { knowledgeId: "kal-course-3",  contentId: 3,  tier: "paid", kalPrice: 50,  source: "https://vitalik.eth.limo/general/2021/01/05/rollup.html", status: "failed", title: "An Incomplete Guide to Rollups", createdAt: "2026-04-30" },
  { knowledgeId: "kal-course-12", contentId: 12, tier: "paid", kalPrice: 120, source: "https://www.youtube.com/watch?v=gyMwXuJrbJQ",      status: "ready",  title: "Distributed Systems in 100 Minutes",  createdAt: "2026-05-08" },
  // unlocked — sbtContentIds are the contentId(s) of prerequisite courses
  // Course 10 unlocks if you hold SBT #1 OR #4 (any of [1,4])
  { knowledgeId: "kal-course-10", contentId: 10, tier: "unlocked", unlockRule: { mode: "any", sbtContentIds: [1, 4] }, source: "https://www.youtube.com/watch?v=rOgGFRy_Rs0", status: "ready", title: "Advanced Cryptography",       createdAt: "2026-05-22" },
  // Course 27 unlocks if you hold SBT #2 (held by mock wallet → unlocked)
  { knowledgeId: "kal-course-27", contentId: 27, tier: "unlocked", unlockRule: { mode: "any", sbtContentIds: [2] },    source: "https://arxiv.org/pdf/1801.00553.pdf",       status: "ready", title: "Adversarial Machine Learning", createdAt: "2026-05-18" },
  // Course 41 unlocks if you hold SBT #3 (NOT held by mock wallet → locked)
  { knowledgeId: "kal-course-41", contentId: 41, tier: "unlocked", unlockRule: { mode: "any", sbtContentIds: [3] },    source: "https://example.com/quantum-computing",      status: "ready", title: "Quantum Computing Foundations", createdAt: "2026-05-15" },
];

export const MOCK_GRAPH: KGGraph = {
  nodes: [
    { id: "a", label: "Neurons", bloomLevel: "Remember", importance: 0.9 },
    { id: "b", label: "Activation", bloomLevel: "Understand", importance: 0.72 },
    { id: "c", label: "Backpropagation", bloomLevel: "Apply", importance: 0.85 },
    { id: "d", label: "Gradient Descent", bloomLevel: "Analyze", importance: 0.6 },
    { id: "e", label: "Loss Function", bloomLevel: "Evaluate", importance: 0.55 },
    { id: "f", label: "Architecture", bloomLevel: "Create", importance: 0.5 },
  ],
  edges: [
    { source: "a", target: "b", relation: "feeds" },
    { source: "b", target: "c", relation: "enables" },
    { source: "c", target: "d", relation: "uses" },
    { source: "d", target: "e", relation: "minimizes" },
    { source: "e", target: "f", relation: "guides" },
    { source: "a", target: "c", relation: "input to" },
  ],
};

/**
 * Mock SBT metadata keyed by integer token id.
 * The real on-chain data is a base64-encoded JSON with the attributes array
 * from PoCW_SBT.sol / metadata-store.ts. We replicate the same shape here.
 */
export const MOCK_SBT_META: Record<number, SBTMetadata> = {
  1: {
    name: "Proof of Cognitive Work",
    description: 'Demonstrated knowledge of "Neural Networks, From the Ground Up". Score: 87/100.',
    attributes: [
      { trait_type: "Title", value: "Neural Networks, From the Ground Up" },
      { trait_type: "Score", value: 87 },
      { trait_type: "Bloom", value: "Analyze" },
      { trait_type: "Theta", value: 1.24 },
      { trait_type: "Questions", value: 18 },
      { trait_type: "Passed", value: 1 },
      { trait_type: "Timestamp", value: "2026-05-29T14:33:21Z" },
      { trait_type: "Content ID", value: 1 },
      { trait_type: "Source", value: "https://www.youtube.com/watch?v=aircAruvnKk" },
    ],
  },
  2: {
    name: "Proof of Cognitive Work",
    description: 'Demonstrated knowledge of "The Bitcoin Whitepaper". Score: 91/100.',
    attributes: [
      { trait_type: "Title", value: "The Bitcoin Whitepaper" },
      { trait_type: "Score", value: 91 },
      { trait_type: "Bloom", value: "Evaluate" },
      { trait_type: "Theta", value: 1.67 },
      { trait_type: "Questions", value: 22 },
      { trait_type: "Passed", value: 1 },
      { trait_type: "Timestamp", value: "2026-06-01T09:12:44Z" },
      { trait_type: "Content ID", value: 4 },
      { trait_type: "Source", value: "https://bitcoin.org/bitcoin.pdf" },
    ],
  },
  4: {
    name: "Proof of Cognitive Work",
    description: 'Demonstrated knowledge of "Attention Is All You Need". Score: 78/100.',
    attributes: [
      { trait_type: "Title", value: "Attention Is All You Need" },
      { trait_type: "Score", value: 78 },
      { trait_type: "Bloom", value: "Apply" },
      { trait_type: "Theta", value: 0.93 },
      { trait_type: "Questions", value: 20 },
      { trait_type: "Passed", value: 1 },
      { trait_type: "Timestamp", value: "2026-06-02T17:55:10Z" },
      { trait_type: "Content ID", value: 2 },
      { trait_type: "Source", value: "https://arxiv.org/pdf/1706.03762.pdf" },
    ],
  },
};

export function mockStatus(knowledgeId: string) {
  const item = MOCK_CONTENT.find((c) => c.knowledgeId === knowledgeId) ?? MOCK_CONTENT[0];
  return { knowledgeId, status: item.status, title: item.title, source: item.source };
}
