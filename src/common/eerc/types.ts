/**
 * EERC Types
 * Type definitions for EERC and Zero-Knowledge operations
 */
import {EERC} from "@avalabs/ac-eerc-sdk";
import {ClientsResult} from "../web3/types.js";
import {EERCConfig} from "../config/types.js";

// Circuit file paths
export interface CircuitPaths {
    register: { wasm: string; zkey: string };
    transfer: { wasm: string; zkey: string };
    mint: { wasm: string; zkey: string };
    withdraw: { wasm: string; zkey: string };
    burn: { wasm: string; zkey: string };
}

// EGCT as defined in the SDK
export type EGCT = {
    c1: { x: bigint; y: bigint };
    c2: { x: bigint; y: bigint };
};

// Encrypted balance result using SDK types
export type EncryptedBalanceResult = {
    elGamalCipherText: EGCT;
    amountPCTs: Array<{ pct: bigint[], index: bigint }>;
    balancePCT: bigint[];
};

// SDK-compatible proof result
export interface IProof {
    proof: string[];
    publicInputs: string[];
}

// EERC proof types
export type EERCProofType = "REGISTER" | "MINT" | "WITHDRAW" | "TRANSFER" | "BURN";

// Interface for EERC instance result
export interface EERCInstanceResult {
    eerc: EERC;
    config: EERCConfig;
    clients: ClientsResult;
    circuitPaths: CircuitPaths;
}