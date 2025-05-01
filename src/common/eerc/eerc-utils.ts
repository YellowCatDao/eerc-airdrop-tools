/**
 * EERC Core Utilities
 * Functions for interacting with the EERC contract
 */
import {Address} from "viem";
import {PublicClient} from "wagmi";
import {EERC} from "@avalabs/ac-eerc-sdk";
import {CircuitPaths, EERCInstanceResult, EGCT, EncryptedBalanceResult} from './types.js';
import {BaseConfig, EERCConfig} from '../config/types.js';
import {parseArgs} from '../config/args-utils.js';
import {ClientsResult, createClients} from '../web3/index.js';
import {createProverFunction, getCircuitPaths, verifyCircuitFiles} from './zk-utils.js';

/**
 * Initialize an EERC instance with all necessary configuration
 */
export async function initializeEERC(
    config: EERCConfig,
    clients: ClientsResult,
    circuitPaths: CircuitPaths
): Promise<EERC> {
    const proverFunc = createProverFunction(circuitPaths);

    const eerc = new EERC(
        clients.publicClient,
        clients.walletClient,
        config.eercContractAddress,
        config.registrarAddress,
        true, // converter mode
        proverFunc,
        circuitPaths
    );
    await eerc.generateDecryptionKey();

    return eerc;
}

/**
 * Create and initialize an EERC instance with all dependencies
 * @param config Configuration object (or undefined to use args/env)
 * @param requiredArgs Additional required arguments beyond the standard ones
 * @returns Object containing EERC instance and related objects
 */
export async function createEERCInstance<T extends BaseConfig>(
    config?: T,
    requiredArgs: Array<keyof T> = []
): Promise<EERCInstanceResult> {
    // If config is not provided, parse it from args and env
    let finalConfig: T;
    if (config) {
        finalConfig = config;
    } else {
        finalConfig = parseArgs<T>(requiredArgs);
    }

    // Convert to EERCConfig format
    const eercConfig: EERCConfig = {
        chain: finalConfig.chain,
        eercContractAddress: finalConfig.eercContractAddress,
        registrarAddress: finalConfig.registrarAddress,
        privateKey: finalConfig.privateKey,
        tokenAddress: finalConfig.tokenAddress
    };

    const circuitPaths = getCircuitPaths();
    const clients = createClients(eercConfig);

    // Verify circuit files exist
    const missingFiles = verifyCircuitFiles(circuitPaths);
    if (missingFiles.length > 0) {
        console.warn(`Warning: Missing circuit files: ${missingFiles.join(', ')}`);
    }

    const eerc = await initializeEERC(eercConfig, clients, circuitPaths);

    return {
        eerc,
        config: eercConfig,
        clients,
        circuitPaths
    };
}

/**
 * Ensure an account is registered with the EERC contract
 * @returns True if registration was needed and performed, false if already registered
 */
export async function ensureRegistration(eerc: EERC): Promise<boolean> {
    const publicKey = await eerc.fetchPublicKey(eerc.wallet.account.address);
    const isRegistered = publicKey[0] !== 0n || publicKey[1] !== 0n;

    if (!isRegistered) {
        const registration = await eerc.register();
        console.log(`Registration complete: ${registration.transactionHash}`);
        return true;
    }

    return false;
}

export async function getEncryptedBalance(
    eerc: EERC,
    publicClient: PublicClient,
    eercContractAddress: Address,
    accountAddress: string,
    tokenAddress: Address
): Promise<EncryptedBalanceResult> {
    const contractBalance = await publicClient.readContract({
        address: eercContractAddress,
        abi: eerc.encryptedErcAbi,
        functionName: "getBalanceFromTokenAddress",
        args: [accountAddress, tokenAddress]
    }) as [EGCT, unknown, Array<{ pct: bigint[], index: bigint }>, bigint[]];

    return {
        elGamalCipherText: contractBalance[0],
        amountPCTs: contractBalance[2],
        balancePCT: contractBalance[3]
    };
}

/**
 * Get the decrypted balance for an account and token
 * @returns Decrypted balance as bigint
 */
export async function getDecryptedBalance(
    eerc: EERC,
    publicClient: PublicClient,
    tokenAddress: Address
): Promise<bigint> {
    const {elGamalCipherText, amountPCTs, balancePCT} = await getEncryptedBalance(
        eerc,
        publicClient,
        eerc.contractAddress as Address,
        eerc.wallet.account.address,
        tokenAddress
    );

    return eerc.calculateTotalBalance(elGamalCipherText, amountPCTs, balancePCT);
}

/**
 * Get the auditor public key from the EERC contract
 */
export async function getAuditorPublicKey(
    publicClient: PublicClient,
    eercContractAddress: Address,
    eerc: EERC
): Promise<bigint[]> {
    return await publicClient.readContract({
        address: eercContractAddress,
        abi: eerc.encryptedErcAbi,
        functionName: "auditorPublicKey",
        args: []
    }) as bigint[];
}

/**
 * Get the decimals value from the EERC contract
 */
export async function getEERCDecimals(
    publicClient: PublicClient,
    eercContractAddress: Address,
    eerc: EERC
): Promise<bigint> {
    return await publicClient.readContract({
        address: eercContractAddress,
        abi: eerc.encryptedErcAbi,
        functionName: "decimals",
        args: []
    }) as bigint;
}