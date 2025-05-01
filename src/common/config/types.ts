/**
 * Configuration Types
 * Type definitions for configuration and environment
 */
import {Address} from "wagmi";

// Chain options
export type ChainOption = 'fuji' | 'mainnet';

// Base configuration for all scripts
export interface BaseConfig {
    chain: ChainOption;
    eercContractAddress: Address;
    registrarAddress: Address;
    privateKey: string;
    tokenAddress: Address;
    envFile: string;
}

// EERC configuration
export interface EERCConfig {
    chain: ChainOption;
    eercContractAddress: Address;
    registrarAddress: Address;
    privateKey: string;
    tokenAddress: Address;
}
