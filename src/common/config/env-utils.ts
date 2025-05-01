/**
 * Environment Utilities
 * Functions for loading environment variables
 */
import dotenv, {DotenvConfigOutput} from 'dotenv';
import {Address} from "wagmi";
import {EERCConfig} from './types.js';

/**
 * Load environment variables from a .env file
 */
export function loadEnvFile(envFile: string = '.env'): DotenvConfigOutput {
    return dotenv.config({path: envFile});
}

/**
 * Extract configuration from environment variables
 * @param chain Chain option (fuji or mainnet)
 * @returns Configuration object based on environment variables
 */
export function getEnvConfig(chain: string = 'fuji'): EERCConfig {
    // Validation will happen after merging with command line args
    return {
        chain: (chain === 'mainnet' ? 'mainnet' : 'fuji'),
        eercContractAddress: process.env.EERC_CONTRACT_ADDRESS as Address,
        registrarAddress: process.env.REGISTRAR_ADDRESS as Address,
        privateKey: process.env.PRIVATE_KEY || '',
        tokenAddress: process.env.TOKEN_ADDRESS as Address
    };
}