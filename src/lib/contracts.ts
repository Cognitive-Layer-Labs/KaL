import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { sbtsOfOwner } from "./api";
import { MOCK, MOCK_KAL_BALANCE, MOCK_SBT_IDS, MOCK_SBT_META } from "./mock";

// ─── ABIs (minimal) ───────────────────────────────────────────────────────────

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

const SBT_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // PoCW_SBT has no enumeration (tokensOfOwner doesn't exist). We get the candidate token ids
    // from the oracle (/api/sbts/:addr), then confirm on-chain ownership with balanceOfBatch.
    name: "balanceOfBatch",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "accounts", type: "address[]" },
      { name: "ids", type: "uint256[]" },
    ],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "uri",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

// ─── SBT metadata types ───────────────────────────────────────────────────────

export interface SBTAttribute {
  trait_type: string;
  value: string | number;
}

export interface SBTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: SBTAttribute[];
}

/** Decode a `data:application/json;base64,...` token URI → parsed JSON or null. */
export function decodeSBTUri(uri: string): SBTMetadata | null {
  try {
    const b64 = uri.split(",")[1];
    if (!b64) return null;
    return JSON.parse(atob(b64)) as SBTMetadata;
  } catch {
    return null;
  }
}

const CONTROLLER_ABI = [
  {
    name: "verifyAndMint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "contentId", type: "uint256" },
      { name: "score", type: "uint256" },
      { name: "kalAmount", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "tokenUri", type: "string" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const PAYWALL_ABI = [
  {
    name: "hasPaid",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "contentId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "purchase",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contentId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ─── Env-sourced addresses ────────────────────────────────────────────────────

export const KAL_ADDRESS = (process.env.NEXT_PUBLIC_KAL_ADDRESS ?? "") as Address;
export const SBT_ADDRESS = (process.env.NEXT_PUBLIC_SBT_ADDRESS ?? "") as Address;
export const CONTROLLER_ADDRESS = (process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS ?? "") as Address;
export const PAYWALL_ADDRESS = (process.env.NEXT_PUBLIC_PAYWALL_ADDRESS ?? "") as Address;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useKALBalance(address?: Address) {
  const result = useReadContract({
    address: KAL_ADDRESS || undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!KAL_ADDRESS },
  });
  if (MOCK) return { ...result, data: address ? MOCK_KAL_BALANCE : undefined } as typeof result;
  return result;
}

/**
 * List the SBT token ids the user holds. The contract has no enumeration, so we fetch the
 * candidate ids the oracle recorded (no full-chain scan), then confirm on-chain ownership with
 * a single balanceOfBatch. Returns only actually-minted ids.
 */
export function useSBTsOfOwner(address?: Address): { data: bigint[] | undefined; isLoading: boolean } {
  const { data: earned, isLoading: earnedLoading } = useQuery({
    queryKey: ["sbts-of-owner", address],
    queryFn: () => sbtsOfOwner(address as string),
    enabled: !!address && !MOCK,
  });

  const tokenIds = (earned ?? []).map((s) => BigInt(s.tokenId));
  const balances = useReadContract({
    address: SBT_ADDRESS || undefined,
    abi: SBT_ABI,
    functionName: "balanceOfBatch",
    args: address && tokenIds.length > 0 ? [tokenIds.map(() => address), tokenIds] : undefined,
    query: { enabled: !!address && tokenIds.length > 0 && !!SBT_ADDRESS && !MOCK },
  });

  if (MOCK) return { data: address ? (MOCK_SBT_IDS as bigint[]) : undefined, isLoading: false };

  const bal = balances.data as bigint[] | undefined;
  // Once balances load, keep only minted ids; before that, show the earned set optimistically.
  const data = !address
    ? undefined
    : bal
      ? tokenIds.filter((_, i) => (bal[i] ?? BigInt(0)) > BigInt(0))
      : tokenIds;
  return { data, isLoading: earnedLoading || balances.isLoading };
}

/**
 * Batch-fetch and decode the tokenURI for every SBT id the user holds.
 * Always returns `decoded: (SBTMetadata | null)[]` — indices match `tokenIds`.
 */
export function useSBTMetadatas(tokenIds: bigint[]): {
  decoded: (SBTMetadata | null)[];
  isLoading: boolean;
} {
  const contracts = tokenIds.map((id) => ({
    address: (SBT_ADDRESS || undefined) as Address | undefined,
    abi: SBT_ABI,
    functionName: "uri" as const,
    args: [id] as const,
  }));

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const result = useReadContracts({
    contracts,
    query: { enabled: tokenIds.length > 0 && !!SBT_ADDRESS },
  });

  if (MOCK) {
    return {
      decoded: tokenIds.map((id) => MOCK_SBT_META[Number(id)] ?? null),
      isLoading: false,
    };
  }

  const decoded = (result.data ?? []).map((r) =>
    r.status === "success" ? decodeSBTUri(r.result as string) : null
  );
  return { decoded, isLoading: result.isLoading };
}

// ─── Payment hooks ────────────────────────────────────────────────────────────

/**
 * Check whether the connected user has already paid for a course.
 * Returns { hasPaid: boolean, isLoading }.
 */
export function usePaidAccess(address?: Address, contentId?: number) {
  const result = useReadContract({
    address: PAYWALL_ADDRESS || undefined,
    abi: PAYWALL_ABI,
    functionName: "hasPaid",
    args: address && contentId != null ? [address, BigInt(contentId)] : undefined,
    query: { enabled: !!address && contentId != null && !!PAYWALL_ADDRESS },
  });

  if (MOCK) {
    // In mock mode, treat all paid courses as already purchased for demo purposes
    return { hasPaid: true, isLoading: false };
  }

  return { hasPaid: (result.data as boolean | undefined) ?? false, isLoading: result.isLoading };
}

/**
 * Approve the paywall to spend `priceWei` KAL on behalf of the user.
 */
export function useApproveKAL() {
  const { writeContractAsync, isPending } = useWriteContract();
  const approveKAL = (priceWei: bigint) =>
    writeContractAsync({
      address: KAL_ADDRESS,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [PAYWALL_ADDRESS, priceWei],
    });
  return { approveKAL, isPending };
}

export interface PurchaseQuote {
  contentId: number;
  priceWei: string;
  priceKal: number;
  expiry: number;
  nonce: `0x${string}`;
  signature: `0x${string}`;
}

/**
 * Submit a purchase transaction to the paywall.
 * Caller must approve KAL first, then fetch a quote from /api/access/quote.
 */
export function usePurchaseCourse() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function purchaseCourse(quote: PurchaseQuote) {
    return writeContractAsync({
      address: PAYWALL_ADDRESS,
      abi: PAYWALL_ABI,
      functionName: "purchase",
      args: [
        BigInt(quote.contentId),
        BigInt(quote.priceWei),
        BigInt(quote.expiry),
        quote.nonce,
        quote.signature,
      ],
    });
  }

  return { purchaseCourse, isPending, isConfirming, isSuccess, hash };
}

export function useVerifyAndMint() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function verifyAndMint(args: {
    user: Address;
    contentId: bigint;
    score: bigint;
    kalAmount: bigint;
    expiry: bigint;
    nonce: `0x${string}`;
    tokenUri: string;
    signature: `0x${string}`;
  }) {
    return writeContractAsync({
      address: CONTROLLER_ADDRESS,
      abi: CONTROLLER_ABI,
      functionName: "verifyAndMint",
      args: [
        args.user,
        args.contentId,
        args.score,
        args.kalAmount,
        args.expiry,
        args.nonce,
        args.tokenUri,
        args.signature,
      ],
    });
  }

  return { verifyAndMint, isPending, isConfirming, isSuccess, hash };
}
