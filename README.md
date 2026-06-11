# KaL — Knowledge as Liquidity (frontend)

Next.js dApp for the PoCW protocol: learners prove knowledge through an adaptive IRT test, then
**claim a soulbound credential (SBT) and a KAL reward** on-chain. Paid courses are gated by an
on-chain paywall.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full system design, and the
[`PoCW`](../PoCW) repo for the oracle backend + Solidity contracts.

## Setup

```bash
npm install
cp .env.local.example .env.local   # or edit .env.local directly
npm run dev
```

Environment (`.env.local`):

| Var | Purpose |
|---|---|
| `POCW_ORACLE_BASE_URL` | Oracle service URL (server-side proxy target) |
| `NEXT_PUBLIC_CHAIN_ID` | `84532` Base Sepolia · `31337` Hardhat |
| `NEXT_PUBLIC_{SBT,CONTROLLER,KAL,PAYWALL}_ADDRESS` | Contract addresses — copy **all four** from `PoCW/deployments/<network>.json` after deploying |

> The contracts were upgraded (EIP-712, per-holder SBT ids, atomic KAL mint), so they must be
> **redeployed** and all four addresses refreshed together.

## Mint / claim flow

- After passing, the result page mints the **SBT and KAL together** in one `verifyAndMint` tx
  (`useVerifyAndMint`). KAL goes 100% to the learner.
- **No gas right now?** You can claim later — "Retry with a fresh attestation" calls the oracle's
  `reattest` endpoint for a new signature. The account page lists earned SBTs via `GET /api/sbts/:addr`
  (no full-chain scan) and verifies them with on-chain `balanceOf`.

## Token logos in explorers

- **SBT (NFT):** the logo is embedded **on-chain** in each token's metadata (`image` data-URI), so
  Basescan / wallets render it automatically — nothing to submit.
- **KAL (ERC-20):** explorers don't read on-chain logos. After deploying, submit the logo on
  Basescan → token page → **"Update Token Info"**, using [`public/kal-logo.svg`](public/kal-logo.svg)
  (convert to a 256×256 PNG if required). [`public/kal-tokenlist.json`](public/kal-tokenlist.json) is
  a ready Uniswap-standard token list — fill in the deployed KAL `address` + `chainId` before sharing it.
