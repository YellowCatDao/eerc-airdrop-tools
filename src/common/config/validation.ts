/**
 * Configuration Validation
 * Functions for validating configuration values
 */
import {BaseConfig, ChainOption} from './types.js';
import {isValidAddress} from '../web3/types.js';

export function validateChain(chain: string): chain is ChainOption {
    return chain === 'fuji' || chain === 'mainnet';
}

export function validatePrivateKey(key?: string): boolean {
    if (!key) return false;
    return /^0x[a-fA-F0-9]{64}$/.test(key);
}

/**
 * Convert and validate configuration values
 * Throws error if validation fails
 * @param config Configuration object to validate
 * @returns Validated configuration
 */
export function validateConfig<T extends BaseConfig>(config: T): T {
    if (!validateChain(config.chain)) {
        throw new Error(`Invalid chain: ${config.chain}. Must be "fuji" or "mainnet".`);
    }

    // Validate required fields
    const requiredFields: Array<keyof BaseConfig> = [
        'chain', 'eercContractAddress', 'registrarAddress', 'privateKey', 'tokenAddress'
    ];

    const missingFields = requiredFields.filter(field => {
        const value = config[field];
        return value === undefined || value === null ||
            (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (!isValidAddress(config.eercContractAddress)) {
        throw new Error(`Invalid EERC contract address: ${config.eercContractAddress}`);
    }

    if (!isValidAddress(config.registrarAddress)) {
        throw new Error(`Invalid registrar address: ${config.registrarAddress}`);
    }

    if (!validatePrivateKey(config.privateKey)) {
        throw new Error('Invalid private key format');
    }

    if (!isValidAddress(config.tokenAddress)) {
        throw new Error(`Invalid token address: ${config.tokenAddress}`);
    }

    return config;
}