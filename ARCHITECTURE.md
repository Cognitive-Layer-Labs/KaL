# KaL — Knowledge as Liquidity
## Architecture & Tokenomics Model

---

## 1. Core Thesis

Most blockchain education systems treat credentials as static certificates (Blockcerts, Hyperledger Learning Tokens).
KaL's contribution is making **verified knowledge liquid** — the depth and difficulty of what you proved you know
directly determines the economic value of the tokens you receive.

**The invariant:** you cannot earn KAL without first earning an SBT. The SBT is unforgeable (IRT-verified).
Therefore KAL is backed by real cognitive work.

---

## 2. System Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3 — Liquidity (KaL)                                  │
│  KAL ERC-20 · ContentRegistry · Staking pools              │
│  Creator royalties · Governance · Access gating             │
└────────────────────────┬────────────────────────────────────┘
                         │ mint KAL on SBT event
┌────────────────────────▼────────────────────────────────────┐
│  Layer 2 — Verification (PoCW)                              │
│  Oracle service (Node.js) · 4PL IRT adaptive test           │
│  Oracle signs attestation (EIP-191)                         │
│  PoCW_Controller.verifyAndMint() → PoCW_SBT (ERC-1155)     │
└────────────────────────┬────────────────────────────────────┘
                         │ index content, run test
┌────────────────────────▼────────────────────────────────────┐
│  Layer 1 — Knowledge (Content Store)                        │
│  PDF / URL / text → Oracle parser → chunking                │
│  LLM extracts Knowledge Graph → FalkorDB                    │
│  IRT predictor sidecar (XGBoost) calibrates item params     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Token Model

### Two tokens, two purposes

| Token | Standard | Transferable | Purpose |
|---|---|---|---|
| **PoCW SBT** | ERC-1155 | No (soulbound) | Tamper-proof proof of knowledge |
| **KAL** | ERC-20 | Yes | Liquid reward for proven knowledge |

The SBT encodes the full cognitive profile on-chain (θ score, bloom level, content ID, oracle signature).
KAL is minted by the `KaL_Controller` contract in the same transaction as the SBT.

---

## 4. KAL Minting Formula

```
         B · M · Σ(sᵢ · wᵢ)
KAL  =  ──────────────────────
              Σ(100 · wᵢ)
```

| Symbol | Name | Description |
|---|---|---|
| `B` | Base emission | 100 KAL (governance param) |
| `M` | Content boost multiplier | 1.0 (default) · 1.2 · 1.5 · 2.0 (see below) |
| `sᵢ` | Score on question `i` | 0–100 per question |
| `wᵢ` | Bloom weight of question `i` | 0.10 (Remember) → 2.00 (Create) |

The fraction `Σ(sᵢ·wᵢ) / Σ(100·wᵢ)` is the normalised weighted score (0–1).
Each question contributes its actual score times its Bloom weight — the Bloom distribution of the
entire session determines KAL output, not the peak level reached.

**Content boost multiplier M** (set per content item by governance or creator):

| M | Label | When to use |
|---|---|---|
| 1.0 | Standard | Default for all content |
| 1.2 | Featured | Actively promoted content, trending topic |
| 1.5 | High-demand | Newly released material, rapidly growing field |
| 2.0 | Critical | Rare expertise, hard subject with low learner count |

`M` is a governance-controlled or creator-requested parameter, not automatic.
It is the only external signal injected into the formula — everything else derives
from the learner's own session performance.

**Bloom weights** (match PoCW IRT engine):

| Bloom Level | Weight |
|---|---|
| Remember    | 0.10 |
| Understand  | 0.25 |
| Apply       | 0.50 |
| Analyze     | 0.80 |
| Evaluate    | 1.30 |
| Create      | 2.00 |

---

## 5. Retake Policy

One SBT per (user, content). On retake:

| Scenario | SBT | KAL |
|---|---|---|
| First attempt — pass | Minted | Full formula |
| First attempt — fail | Not minted | 0 |
| Retake — score improves | Metadata updated (best score) | Delta: KAL(new) − KAL(old) |
| Retake — same or lower score | Unchanged | 0 |

The delta rule prevents farming: grinding retakes with no improvement yields nothing.
The SBT always reflects the learner's peak demonstrated ability.

---

## 6. Revenue Split on Mint

Every SBT mint triggers:
- **75%** of KAL → learner
- **20%** of KAL → content creator (ContentRegistry royalty)
- **5%** of KAL → platform treasury (governance-controlled)

Content creators have an economic incentive to upload high-quality content because they earn on every learner
who passes — not just one-time upload fees.

---

## 7. KAL Utility (Spending Sinks)

Without spending sinks, a reward token inflates to zero. KAL has three sinks:

1. **Content Access** — unlock gated content (creator sets a KAL price)
2. **Knowledge Staking** — stake KAL in a content pool; earn yield when others learn it
3. **Governance** — vote on content quality disputes, platform parameters

---

## 8. Liquidity Model

> **Implementation status (current build).** The protocol as implemented is intentionally
> simplified: **KAL is minted 100% to the learner**, atomically with their SBT inside
> `PoCW_Controller.verifyAndMint` (the controller is the KAL owner, so KAL can only be created
> through a signed, expiring, nonce-protected oracle attestation). There is **no treasury cut, no
> revenue split, no royalties, and no protocol-owned liquidity** on-chain. The multi-layer
> liquidity design below is the longer-term vision, not what the contracts currently do. The paid
> course paywall (`KalPaywall`) does route purchase KAL to a treasury address, but no automated
> market-making or staking is wired up.

KAL has three distinct liquidity layers (vision).

### Layer 1 — Market Liquidity (DEX)

The **5% treasury cut** on every KAL mint accumulates and is deployed as Protocol-Owned Liquidity
(KAL/USDC on Uniswap v3, Base network). The platform never relies on external LPs.

- **Fair launch**: zero KAL at genesis; all supply earned through verified learning only
- **No pre-mine, no VC allocation**: every KAL is backed by a real test session
- **POL grows with learning activity**: more mints → deeper treasury → deeper liquidity
- Liquidity mining (paying LPs in KAL) is explicitly avoided — it creates circular inflation
  that collapses when incentives dry up

### Layer 2 — Knowledge Liquidity (staking pools)

Users stake KAL into per-content pools. New learners pay KAL to access gated content; that KAL
flows to stakers as yield. High-demand topics attract more stakers, creating a **knowledge demand
oracle** — staking APY signals real-world value of a skill without any centralised curation.

| Action | Supply effect |
|---|---|
| Stake KAL | Removed from circulation |
| Earn yield from learners | KAL flows to staker |
| Buy content access | KAL enters pool (buy pressure) |

### Layer 3 — Content Liquidity (spending sink)

Creators gate content behind a KAL price. Learners spend KAL to unlock it; that KAL enters
the staking pool for that content — not burned, recycled into yield. New learners buy KAL on
the DEX or earn it from other sessions, keeping the cycle self-sustaining.

### Full flow

```
                    ┌─────────────────┐
                    │   DEX Pool      │
                    │  KAL / USDC     │◄── external buyers
                    └────┬────────────┘
                         │ buy KAL
                         ▼
          ┌──────────────────────────────┐
          │        Learner Wallet        │
          │  earns KAL via SBT mints     │
          │  spends KAL on content       │
          └──────┬───────────────────────┘
                 │ spend KAL
                 ▼
     ┌─────────────────────────┐
     │  Knowledge Staking Pool │◄── stakers lock KAL
     │  (per content topic)    │──► stakers earn yield
     └─────────────────────────┘
                 ▲
     ┌───────────┴─────────────┐
     │  Platform Treasury (5%) │──► deploys KAL/USDC POL
     └─────────────────────────┘
```

---

## 9. Knowledge Staking Pools (detail)

Inspired by Uniswap liquidity pools but for knowledge:

```
KAL stakers deposit into a "Solidity Fundamentals" pool
→ New learner passes Solidity test → pool earns protocol yield
→ Stakers earn proportional cut
→ High-demand topics attract more stakers → signals to learners what's valuable
```

This creates a **knowledge demand oracle** — staking APY reflects real-world demand for a skill,
without any centralized curation.

---

## 10. Smart Contract Architecture

```
KaL_Controller
  ├── registerContent(source, creatorAddress) → contentId
  ├── onSBTMint(user, contentId, score, bloomLevel, rank) → mints KAL, splits royalties
  └── setBloomWeight(level, weight)            (governance)

KAL (ERC-20)
  ├── minter role: KaL_Controller only
  └── standard transfer / approve

ContentRegistry
  ├── content[contentId] → { creator, totalMints, totalKALEmitted }
  └── claimRoyalties(contentId)

KnowledgeStaking (optional)
  ├── stake(contentId, amount)
  ├── unstake(contentId, amount)
  └── distributeYield(contentId)           (called by oracle on each mint)
```

`KaL_Controller` is wired into `PoCW_Controller` — when `verifyAndMint()` emits an SBT, it calls
`KaL_Controller.onSBTMint()` in the same transaction.

---

## 11. Related Research

| Paper / Project | What it does | Gap KaL fills |
|---|---|---|
| Buterin, Weyl, Ohlhaver (2022) — *DeSoc* | Defines SBTs as non-transferable social credentials | No fungible reward layer, no adaptive testing |
| Bravo-Marquez et al. (2019) — *Proof-of-Learning* | ML competition as consensus mechanism | No educational UX, no user-facing credentials |
| Blockcerts / MIT Media Lab | Static badge issuance on blockchain | No difficulty calibration, no token reward |
| Hyperledger Learning Tokens | Fungible tokens for course completion | Completion ≠ comprehension; no IRT |
| Layer3.xyz / RabbitHole | Quest completion → token rewards | Centralized grading; gameable without real learning |
| Ocean Protocol | Data NFTs + data tokens | Knowledge consumption, not knowledge verification |

**KaL's novel intersection:**
- Formal **4PL IRT** adaptive testing (psychometrically sound)
- **Bloom's taxonomy depth** as token weight (rewards depth, not just pass/fail)
- **SBT (unforgeable) + KAL (liquid)** in the same mint transaction
- Content creator **royalty mechanism** tied to learning outcomes

---

## 12. Monetization Loop (Platform)

```
                 Creator uploads content
                         │
                 Platform indexes + hosts
                         │
              ┌──────────▼──────────┐
              │  Learner pays KAL   │  ← KAL earned from prior learning
              │  (or stablecoin)    │    or bought on market
              └──────────┬──────────┘
                         │ test session
                ┌────────▼────────┐
                │  Pass → SBT +   │
                │  KAL minted     │
                └────┬────────┬───┘
                     │        │
              75% learner   20% creator
                     │        │
              Learner spends    Creator re-invests
              KAL on more       in more content
              content           uploads
                     │
              5% platform treasury
              → funds oracle infra,
                governance, grants
```

The loop is **self-reinforcing**: better content → more learners → more KAL emitted to creator → creator
uploads more content.

---

## 13. Differentiation Summary

> KaL is not another credential platform. It is the first system where the **economic value of a token
> is directly and verifiably proportional to the cognitive depth of the knowledge it represents**,
> as measured by a psychometrically calibrated adaptive test.

The SBT proves the knowledge is real. The KAL token makes that knowledge liquid.
