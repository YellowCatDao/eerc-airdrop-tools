/**
 * Web3 Types
 * Type definitions for blockchain and wallet interactions
 */
import {PublicClient, WalletClient} from "wagmi";
import {Account, Address} from "viem";

// Blockchain clients result
export interface ClientsResult {
    walletClient: WalletClient;
    publicClient: PublicClient;
    account: Account;
}

// Type guard for Address validation
export function isValidAddress(value: string): value is Address {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
}
