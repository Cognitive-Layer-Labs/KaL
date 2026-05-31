import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, parseEther } from "viem";

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
    name: "tokensOfOwner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
] as const;

const CONTROLLER_ABI = [
  {
    name: "verifyAndMint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "attestation",
        type: "tuple",
        components: [
          { name: "subject", type: "address" },
          { name: "contentId", type: "uint256" },
          { name: "score", type: "uint256" },
          { name: "nonce", type: "bytes32" },
          { name: "expiry", type: "uint256" },
          { name: "tokenUri", type: "string" },
          { name: "contentHash", type: "bytes32" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

// ─── Env-sourced addresses ────────────────────────────────────────────────────

export const KAL_ADDRESS = (process.env.NEXT_PUBLIC_KAL_ADDRESS ?? "") as Address;
export const SBT_ADDRESS = (process.env.NEXT_PUBLIC_SBT_ADDRESS ?? "") as Address;
export const CONTROLLER_ADDRESS = (process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS ?? "") as Address;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useKALBalance(address?: Address) {
  return useReadContract({
    address: KAL_ADDRESS || undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!KAL_ADDRESS },
  });
}

export function useSBTsOfOwner(address?: Address) {
  return useReadContract({
    address: SBT_ADDRESS || undefined,
    abi: SBT_ABI,
    functionName: "tokensOfOwner",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!SBT_ADDRESS },
  });
}

export function useVerifyAndMint() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function verifyAndMint(attestation: {
    subject: Address;
    contentId: bigint;
    score: bigint;
    nonce: `0x${string}`;
    expiry: bigint;
    tokenUri: string;
    contentHash: `0x${string}`;
  }, signature: `0x${string}`) {
    return writeContractAsync({
      address: CONTROLLER_ADDRESS,
      abi: CONTROLLER_ABI,
      functionName: "verifyAndMint",
      args: [attestation, signature],
    });
  }

  return { verifyAndMint, isPending, isConfirming, isSuccess, hash };
}
