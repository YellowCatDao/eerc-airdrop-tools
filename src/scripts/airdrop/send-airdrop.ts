/**
 * Robust Airdrop EERC tokens to multiple accounts
 * Features:
 * - State tracking with multiple output files
 * - Resumable operations
 * - Registration checking and categorization
 * - Error recovery and detailed logging
 * - Interruptible with 5-second pauses
 */
import {Address, formatEther, parseEther} from "viem";
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {
    BaseConfig,
    createEERCInstance,
    ensureRegistration,
    getAuditorPublicKey,
    getDecryptedBalance,
    parseArgs,
    transferTokens,
} from '../../common/index.js';

interface Recipient {
    address: string | Address;
    amount: string;
}

interface TransferRecord {
    address: string;
    amount: string;
    txHash?: string;
    error?: string;
    timestamp: string;
}

interface AirdropConfig extends BaseConfig {
    recipientsFile: string;
    dryRun?: boolean;
}

interface AirdropState {
    remainingWork: Recipient[];
    unregisteredUsers: Recipient[];
    transferSucceeded: TransferRecord[];
    transferFailed: TransferRecord[];
}

/**
 * CSV utilities for file operations
 */
class CSVManager {
    static parseRecipientsFile(filePath: string): Recipient[] {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');

        // Skip header if present
        const dataLines = lines[0].toLowerCase().includes('address') ? lines.slice(1) : lines;

        return dataLines.map((line, index) => {
            const [address, amount] = line.split(',').map(item => item.trim());

            if (!address || !amount) {
                throw new Error(`Invalid line ${index + 1} in recipients file: ${line}`);
            }

            if (!address.startsWith('0x') || address.length !== 42) {
                throw new Error(`Invalid address on line ${index + 1}: ${address}`);
            }

            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                throw new Error(`Invalid amount on line ${index + 1}: ${amount}`);
            }

            return {address, amount};
        });
    }

    static writeRecipientsFile(filePath: string, recipients: Recipient[]): void {
        const header = 'address,amount\n';
        const content = recipients.map(r => `${r.address},${r.amount}`).join('\n');
        fs.writeFileSync(filePath, header + content);
    }

    static writeTransferRecords(filePath: string, records: TransferRecord[]): void {
        const header = 'address,amount,txHash,error,timestamp\n';
        const content = records.map(r =>
            `${r.address},${r.amount},${r.txHash || ''},${r.error || ''},${r.timestamp}`
        ).join('\n');
        fs.writeFileSync(filePath, header + content);
    }

    static readTransferRecords(filePath: string): TransferRecord[] {
        if (!fs.existsSync(filePath)) return [];

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');

        if (lines.length <= 1) return []; // Header only or empty

        return lines.slice(1).map((line, index) => {
            const parts = line.split(',');
            if (parts.length !== 5) {
                throw new Error(`Invalid CSV format on line ${index + 2}: expected 5 columns, got ${parts.length}`);
            }

            const [address, amount, txHash, error, timestamp] = parts;
            return {
                address: address || '',
                amount: amount || '',
                txHash: txHash || undefined,
                error: error || undefined,
                timestamp: timestamp || ''
            };
        });
    }
}

/**
 * State management for airdrop operations
 */
class AirdropStateManager {
    private basePath: string;
    private files: {
        remainingWork: string;
        unregistered: string;
        succeeded: string;
        failed: string;
    };

    constructor(originalFilePath: string) {
        const dir = path.dirname(originalFilePath);
        const name = path.basename(originalFilePath, '.csv');

        this.basePath = path.join(dir, `${name}_airdrop_state`);

        this.files = {
            remainingWork: path.join(this.basePath, 'remaining_work.csv'),
            unregistered: path.join(this.basePath, 'users_not_registered.csv'),
            succeeded: path.join(this.basePath, 'transfer_succeeded.csv'),
            failed: path.join(this.basePath, 'failed_to_transfer.csv')
        };

        // Create state directory if it doesn't exist
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, {recursive: true});
        }
    }

    loadState(): AirdropState {
        return {
            remainingWork: fs.existsSync(this.files.remainingWork)
                ? CSVManager.parseRecipientsFile(this.files.remainingWork)
                : [],
            unregisteredUsers: fs.existsSync(this.files.unregistered)
                ? CSVManager.parseRecipientsFile(this.files.unregistered)
                : [],
            transferSucceeded: CSVManager.readTransferRecords(this.files.succeeded),
            transferFailed: CSVManager.readTransferRecords(this.files.failed)
        };
    }

    saveState(state: AirdropState): void {
        CSVManager.writeRecipientsFile(this.files.remainingWork, state.remainingWork);
        CSVManager.writeRecipientsFile(this.files.unregistered, state.unregisteredUsers);
        CSVManager.writeTransferRecords(this.files.succeeded, state.transferSucceeded);
        CSVManager.writeTransferRecords(this.files.failed, state.transferFailed);
    }

    initializeFromOriginal(originalFile: string): AirdropState {
        const allRecipients = CSVManager.parseRecipientsFile(originalFile);
        const state: AirdropState = {
            remainingWork: allRecipients,
            unregisteredUsers: [],
            transferSucceeded: [],
            transferFailed: []
        };
        this.saveState(state);
        return state;
    }

    getStatePath(): string {
        return this.basePath;
    }
}

/**
 * Sleep utility with interrupt capability
 */
async function interruptibleSleep(seconds: number): Promise<void> {
    console.log(`Waiting ${seconds} seconds... (Press Ctrl+C to interrupt)`);

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            cleanup();
            resolve();
        }, seconds * 1000);

        const handleSignal = () => {
            clearTimeout(timeout);
            cleanup();
            console.log('\nInterrupted by user. Current progress has been saved.');
            process.exit(0);
        };

        const cleanup = () => {
            process.removeListener('SIGINT', handleSignal);
            process.removeListener('SIGTERM', handleSignal);
        };

        process.once('SIGINT', handleSignal);
        process.once('SIGTERM', handleSignal);
    });
}

async function main(): Promise<void> {
    console.log("Starting robust EERC airdrop...");

    const yargsInstance = yargs(hideBin(process.argv))
        .options({
            'recipients-file': {
                type: 'string',
                description: 'Path to CSV file with recipients',
                demandOption: true,
                alias: 'file'
            },
            'dry-run': {
                type: 'boolean',
                description: 'Run without making actual transfers',
                default: false
            }
        })
        .help();

    const args = parseArgs<AirdropConfig>(['recipientsFile'], yargsInstance);

    // Make path absolute if it's relative
    const absoluteFilePath = path.isAbsolute(args.recipientsFile)
        ? args.recipientsFile
        : path.resolve(process.cwd(), args.recipientsFile);

    if (!fs.existsSync(absoluteFilePath)) {
        throw new Error(`Recipients file not found: ${absoluteFilePath}`);
    }

    const stateManager = new AirdropStateManager(absoluteFilePath);
    console.log(`State directory: ${stateManager.getStatePath()}`);

    // Load or initialize state
    let state = stateManager.loadState();
    if (state.remainingWork.length === 0 && state.transferSucceeded.length === 0 && state.transferFailed.length === 0) {
        console.log("Initializing from original file...");
        state = stateManager.initializeFromOriginal(absoluteFilePath);
    } else {
        console.log("Resuming from existing state...");
    }

    console.log(`Progress: ${state.transferSucceeded.length} succeeded, ${state.transferFailed.length} failed, ${state.unregisteredUsers.length} unregistered, ${state.remainingWork.length} remaining`);

    if (state.remainingWork.length === 0) {
        console.log("No remaining work. Airdrop appears to be complete.");
        return;
    }

    const {eerc, config, clients} = await createEERCInstance(args);

    // Calculate total amount for remaining work
    let totalAmount = 0n;
    for (const recipient of state.remainingWork) {
        totalAmount += parseEther(recipient.amount);
    }

    console.log(`Remaining distribution: ${formatEther(totalAmount)} ETH`);
    console.log(`Token: ${config.tokenAddress}`);
    console.log(`From: ${clients.account.address}`);
    console.log(`Dry run: ${args.dryRun ? 'Yes' : 'No'}`);

    await ensureRegistration(eerc);

    const currentBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );

    if (currentBalance < totalAmount) {
        throw new Error(`Insufficient balance: have ${formatEther(currentBalance)} ETH, need ${formatEther(totalAmount)} ETH`);
    }
    console.log(`Current balance: ${formatEther(currentBalance)} ETH`);

    const auditorPublicKey = await getAuditorPublicKey(
        clients.publicClient,
        config.eercContractAddress,
        eerc
    );

    // Check registration status for remaining recipients
    console.log("Checking recipient registration status...");
    const stillToProcess: Recipient[] = [];

    for (const recipient of state.remainingWork) {
        try {
            const recipientPublicKey = await eerc.fetchPublicKey(recipient.address as Address);
            const isRegistered = recipientPublicKey[0] !== 0n ||
                recipientPublicKey[1] !== 0n;

            if (!isRegistered) {
                console.warn(`Warning: ${recipient.address} not registered, moving to unregistered list`);
                state.unregisteredUsers.push(recipient);
            } else {
                stillToProcess.push(recipient);
            }
        } catch (error) {
            console.error(`Error checking registration for ${recipient.address}: ${error}`);
            // Move to failed list with registration check error
            state.transferFailed.push({
                address: recipient.address as string,
                amount: recipient.amount,
                error: `Registration check failed: ${error}`,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Update remaining work to only registered users
    state.remainingWork = stillToProcess;
    stateManager.saveState(state);

    console.log(`${stillToProcess.length} registered recipients ready for transfer`);
    console.log(`${state.unregisteredUsers.length} unregistered users moved to separate file`);

    if (args.dryRun) {
        console.log("\nDRY RUN - No transfers will be made");
        for (const recipient of stillToProcess) {
            console.log(`Would transfer ${recipient.amount} ETH to ${recipient.address}`);
        }
        console.log("Dry run complete");
        return;
    }

    if (stillToProcess.length === 0) {
        console.log("No registered recipients to process.");
        return;
    }

    console.log("Processing transfers...");
    console.log("Note: 5-second pause between transfers. Press Ctrl+C to interrupt safely.\n");

    for (let i = 0; i < stillToProcess.length; i++) {
        const recipient = stillToProcess[i];
        const amount = parseEther(recipient.amount);

        console.log(`[${i + 1}/${stillToProcess.length}] Sending ${recipient.amount} ETH to ${recipient.address}`);

        try {
            const transferTxHash = await transferTokens(
                eerc,
                clients.publicClient,
                recipient.address as Address,
                amount,
                auditorPublicKey,
                config.tokenAddress
            );

            console.log(`Transaction: ${transferTxHash}`);

            // Wait for transaction confirmation; 3 confirmations to avoid 'eth_getBlockByNumber' issues in old viem.
            await clients.publicClient.waitForTransactionReceipt({hash: transferTxHash as Address, confirmations: 3});

            // Record success
            state.transferSucceeded.push({
                address: recipient.address as string,
                amount: recipient.amount,
                txHash: transferTxHash,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ Success!`);

        } catch (error) {
            console.error(`❌ Failed: ${error}`);

            // Record failure
            state.transferFailed.push({
                address: recipient.address as string,
                amount: recipient.amount,
                error: String(error),
                timestamp: new Date().toISOString()
            });
        }

        // Remove from remaining work
        state.remainingWork = stillToProcess.slice(i + 1);

        // Save state after each transfer
        stateManager.saveState(state);

        // Pause between transfers (except for the last one)
        if (i < stillToProcess.length - 1) {
            await interruptibleSleep(2);
        }
    }

    console.log(`\nAirdrop complete!`);
    console.log(`✅ Successful transfers: ${state.transferSucceeded.length}`);
    console.log(`❌ Failed transfers: ${state.transferFailed.length}`);
    console.log(`⚠️  Unregistered users: ${state.unregisteredUsers.length}`);
    console.log(`\nState files saved in: ${stateManager.getStatePath()}`);

    const finalBalance = await getDecryptedBalance(eerc, clients.publicClient, config.tokenAddress);
    console.log(`Final balance: ${formatEther(finalBalance)} ETH`);
}

main().catch(console.error);