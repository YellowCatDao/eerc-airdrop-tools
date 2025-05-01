/**
 * Client Utilities
 * Functions for creating and managing blockchain clients
 */
import {Chain, createPublicClient, createWalletClient, Hex, http} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {avalanche, avalancheFuji} from 'viem/chains';
import {PublicClient, WalletClient} from "wagmi";
import {ClientsResult} from './types.js';
import {ChainOption, EERCConfig} from '../config/types.js';

/**
 * Get the appropriate chain configuration
 * @param chainOption Chain option (fuji or mainnet)
 * @returns Chain configuration
 */
export function getChainConfig(chainOption: ChainOption): Chain {
    return chainOption === 'mainnet' ? avalanche : avalancheFuji;
}


// Helper function to validate private key format
function isValidHexPrivateKey(key: string): key is Hex {
    return /^0x[a-fA-F0-9]{64}$/.test(key);
}

/**
 * Create blockchain clients for interacting with the network
 * @param config EERC configuration
 * @returns Object containing wallet client, public client, and account
 */
export function createClients(config: EERCConfig): ClientsResult {
    // Validate private key format before conversion
    if (!isValidHexPrivateKey(config.privateKey)) {
        throw new Error('Invalid private key format');
    }

    const account = privateKeyToAccount(config.privateKey);
    const chainConfig = getChainConfig(config.chain);

    // Create viem clients
    const viemWalletClient = createWalletClient({
        account,
        transport: http(),
        chain: chainConfig
    });

    const viemPublicClient = createPublicClient({
        transport: http(),
        chain: chainConfig
    });

    // Convert viem clients to compatible wagmi client types for EERC SDK
    // This is necessary because the EERC SDK expects wagmi client types
    // while we're using viem directly
    const walletClient = viemWalletClient as WalletClient;
    const publicClient = viemPublicClient as PublicClient;

    return {walletClient, publicClient, account};
}