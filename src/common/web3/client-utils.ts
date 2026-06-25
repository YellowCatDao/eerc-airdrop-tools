/**
 * Client Utilities
 * Functions for creating and managing blockchain clients
 */
import {Chain, createPublicClient, createWalletClient, defineChain, Hex, http} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {avalanche, avalancheFuji, base} from 'viem/chains';
import {PublicClient, WalletClient} from "wagmi";
import {ClientsResult} from './types.js';
import {ChainOption, EERCConfig} from '../config/types.js';

// HyperEVM (Hyperliquid) is not shipped by viem, so define it here.
export const hyperevm = defineChain({
    id: 999,
    name: 'HyperEVM',
    network: 'hyperevm',
    nativeCurrency: {name: 'HYPE', symbol: 'HYPE', decimals: 18},
    rpcUrls: {
        default: {http: ['https://rpc.hyperliquid.xyz/evm']},
        public: {http: ['https://rpc.hyperliquid.xyz/evm']},
    },
    blockExplorers: {
        default: {name: 'HyperEVMScan', url: 'https://hyperevmscan.io'},
    },
});

/**
 * Get the appropriate chain configuration
 * @param chainOption Chain option (fuji, mainnet, base, hyperevm)
 * @returns Chain configuration
 */
export function getChainConfig(chainOption: ChainOption): Chain {
    switch (chainOption) {
        case 'mainnet':
            return avalanche;
        case 'base':
            return base;
        case 'hyperevm':
            return hyperevm;
        case 'fuji':
        default:
            return avalancheFuji;
    }
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

    // Optional RPC override (per-chain via the loaded .env file); falls back to the
    // chain's default RPC when unset.
    const rpcUrl = process.env.RPC_URL || undefined;

    // Create viem clients
    const viemWalletClient = createWalletClient({
        account,
        transport: http(rpcUrl),
        chain: chainConfig
    });

    const viemPublicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: chainConfig
    });

    // Convert viem clients to compatible wagmi client types for EERC SDK
    // This is necessary because the EERC SDK expects wagmi client types
    // while we're using viem directly
    const walletClient = viemWalletClient as WalletClient;
    const publicClient = viemPublicClient as PublicClient;

    return {walletClient, publicClient, account};
}