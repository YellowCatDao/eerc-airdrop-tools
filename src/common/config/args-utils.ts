/**
 * Argument Utilities
 * Functions for parsing and validating command-line arguments
 */
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {Address} from "wagmi";
import {BaseConfig} from './types.js';
import {getEnvConfig, loadEnvFile} from './env-utils.js';
import {validateConfig} from './validation.js';

/**
 * Parse and validate command-line args and env variables
 * @param requiredArgs Additional required arguments beyond standard ones
 * @param customYargs Custom yargs instance (optional)
 * @returns Parsed and validated configuration
 */
export function parseArgs<T extends BaseConfig>(
    requiredArgs: Array<keyof T> = [],
    customYargs?: yargs.Argv
): T {
    // Use the provided yargs instance or create a new one
    const yargsInstance = customYargs || yargs(hideBin(process.argv));

    // Define common options for all scripts
    const parser = yargsInstance
        .options({
            'env-file': {
                alias: 'e',
                type: 'string',
                description: 'Path to environment file',
                default: '.env'
            },
            'chain': {
                alias: 'c',
                type: 'string',
                description: 'Chain to use (fuji or mainnet)',
                default: 'fuji',
                choices: ['fuji', 'mainnet']
            },
            'eerc-contract-address': {
                alias: 'eerc',
                type: 'string',
                description: 'EERC contract address'
            },
            'registrar-address': {
                alias: 'reg',
                type: 'string',
                description: 'Registrar contract address'
            },
            'private-key': {
                alias: 'key',
                type: 'string',
                description: 'Private key for transactions'
            },
            'token-address': {
                alias: 'token',
                type: 'string',
                description: 'Token address to interact with'
            }
        })
        .help();

    // Parse arguments
    const args = parser.parseSync();

    // Load environment variables from the .env file
    const envFile = args['env-file'] as string;
    loadEnvFile(envFile);

    // First get environment configuration
    const envConfig = getEnvConfig(args.chain as string);

    // Merge with command line args (CLI args take precedence)
    const config = {
        envFile,
        chain: args.chain || envConfig.chain,
        eercContractAddress: (args['eerc-contract-address'] || envConfig.eercContractAddress) as Address,
        registrarAddress: (args['registrar-address'] || envConfig.registrarAddress) as Address,
        privateKey: args['private-key'] || envConfig.privateKey,
        tokenAddress: (args['token-address'] || envConfig.tokenAddress) as Address,
    } as T;

    // Add custom args from the command line
    const standardKeys = [
        'env-file',
        'chain',
        'eerc-contract-address',
        'registrar-address',
        'private-key',
        'token-address',
        '_',
        '$0'
    ];

    // Helper function to validate config values
    function isValidConfigValue(value: unknown): value is string | number | boolean {
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    }

    for (const [key, value] of Object.entries(args)) {
        // Skip standard keys that are already processed
        if (standardKeys.includes(key)) {
            continue;
        }

        // Convert kebab-case to camelCase for TypeScript compatibility
        const camelKey = key.replace(/-([a-z])/g, (_, g) => g.toUpperCase()) as keyof T;

        // Only set if the value is defined and valid
        if (value !== undefined && isValidConfigValue(value)) {
            (config as any)[camelKey] = value;
        }
    }

    // Validate all config values at once (after merging env and CLI args)
    validateConfig(config);

    // Check for script-specific required arguments
    if (requiredArgs.length > 0) {
        const missingArgs: string[] = [];

        for (const arg of requiredArgs) {
            const key = arg as keyof T;
            const value = config[key];

            // Check if value is missing or empty string
            if (value === undefined || value === null ||
                (typeof value === 'string' && value.trim() === '')) {
                missingArgs.push(arg.toString());
            }
        }

        if (missingArgs.length > 0) {
            throw new Error(`Missing required arguments for this script: ${missingArgs.join(', ')}`);
        }
    }

    return config;
}