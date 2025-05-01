/**
 * Zero-Knowledge Utilities
 * Functions for ZK circuit paths and proof generation
 */
import path from 'path';
import fs from 'fs';
import * as snarkjs from 'snarkjs';
import {CircuitPaths, EERCProofType, IProof} from './types.js';

/**
 * Get paths to circuit files
 * @returns Circuit paths object
 */
export function getCircuitPaths(): CircuitPaths {
    const zkFilesBasePath: string = path.resolve(process.cwd(), "data", "zk_files");
    const circuits = ["registration", "transfer", "mint", "withdraw", "burn"];

    if (!fs.existsSync(zkFilesBasePath)) {
        throw new Error(`ZK files directory not found at: ${zkFilesBasePath}`);
    }

    const getCircuit = (name: string) => ({
        wasm: path.join(zkFilesBasePath, `${name}/${name}.wasm`),
        zkey: path.join(zkFilesBasePath, `${name}/${name === "registration" || name === "withdraw" ? "circuit_final" : name}.zkey`)
    });

    return Object.fromEntries(circuits.map(circuit => [
        circuit === "registration" ? "register" : circuit,
        getCircuit(circuit)
    ])) as unknown as CircuitPaths;
}

/**
 * Verify that circuit files exist and are accessible
 * @param circuitPaths Circuit paths object
 * @returns Array of missing circuit files, empty if all files exist
 */
export function verifyCircuitFiles(circuitPaths: CircuitPaths): string[] {
    const missingFiles: string[] = [];

    for (const [_, files] of Object.entries(circuitPaths)) {
        if (!fs.existsSync(files.wasm)) {
            missingFiles.push(files.wasm);
        }
        if (!fs.existsSync(files.zkey)) {
            missingFiles.push(files.zkey);
        }
    }

    return missingFiles;
}

/**
 * Create a prover function for generating zero-knowledge proofs
 * @param circuitPaths Circuit paths object
 * @returns Function for generating proofs
 */
export function createProverFunction(circuitPaths: CircuitPaths): (data: string, proofType: EERCProofType) => Promise<IProof> {
    return async (data: string, proofType: EERCProofType) => {
        const input = JSON.parse(data);
        let wasmPath: string;
        let zkeyPath: string;

        switch (proofType) {
            case "REGISTER":
                wasmPath = circuitPaths.register.wasm;
                zkeyPath = circuitPaths.register.zkey;
                break;
            case "MINT":
                wasmPath = circuitPaths.mint.wasm;
                zkeyPath = circuitPaths.mint.zkey;
                break;
            case "WITHDRAW":
                wasmPath = circuitPaths.withdraw.wasm;
                zkeyPath = circuitPaths.withdraw.zkey;
                break;
            case "TRANSFER":
                wasmPath = circuitPaths.transfer.wasm;
                zkeyPath = circuitPaths.transfer.zkey;
                break;
            case "BURN":
                wasmPath = circuitPaths.burn.wasm;
                zkeyPath = circuitPaths.burn.zkey;
                break;
            default:
                throw new Error("Invalid proof type");
        }

        try {
            const {proof, publicSignals} = await snarkjs.groth16.fullProve(
                input.privateInputs ? input.privateInputs : input,
                wasmPath,
                zkeyPath
            );

            // Format the proof exactly as the EERC SDK expects
            return {
                proof: [
                    proof.pi_a[0].toString(),
                    proof.pi_a[1].toString(),
                    proof.pi_b[0][0].toString(),
                    proof.pi_b[0][1].toString(),
                    proof.pi_b[1][0].toString(),
                    proof.pi_b[1][1].toString(),
                    proof.pi_c[0].toString(),
                    proof.pi_c[1].toString()
                ],
                // Looks like this just gets overridden in generateProof?
                // Not sure if publicSignals should get or'd in here anyway.
                publicInputs: input.publicInputs || publicSignals
            };
        } catch (error) {
            console.error(`Error generating proof for ${proofType}:`, error);
            throw error;
        }
    };
}