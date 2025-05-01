/**
 * ERC20 Utilities
 * Functions for interacting with ERC20 tokens
 */
import {Abi} from "viem";
import {Address, PublicClient, WalletClient} from "wagmi";

// Simple ERC20 ABI for token operations
export const erc20Abi: Abi = [
    {
        inputs: [{name: "owner", type: "address"}, {name: "spender", type: "address"}],
        name: "allowance",
        outputs: [{name: "", type: "uint256"}],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{name: "spender", type: "address"}, {name: "amount", type: "uint256"}],
        name: "approve",
        outputs: [{name: "", type: "bool"}],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [{name: "", type: "address"}],
        name: "balanceOf",
        outputs: [{name: "", type: "uint256"}],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{name: "", type: "uint8"}],
        stateMutability: "view",
        type: "function"
    }
];

/**
 * Get token balance for an account
 * @returns Balance as bigint
 */
export async function getTokenBalance(
    publicClient: PublicClient,
    tokenAddress: Address,
    accountAddress: Address
): Promise<bigint> {
    return await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [accountAddress]
    }) as bigint;
}

/**
 * Check if an account has approved the EERC contract to spend tokens and approve if needed
 * @returns True if approval was needed and executed, false if already approved
 */
export async function ensureTokenApproval(
    publicClient: PublicClient,
    walletClient: WalletClient,
    tokenAddress: Address,
    eercContractAddress: Address,
    accountAddress: Address,
    amount: bigint
): Promise<boolean> {
    const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [accountAddress, eercContractAddress]
    }) as bigint;

    if (allowance < amount) {
        const approveTx = await walletClient.writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [eercContractAddress, amount],
            account: walletClient.account,
            chain: walletClient.chain
        });

        await publicClient.waitForTransactionReceipt({hash: approveTx});
        return true;
    }

    return false;
}