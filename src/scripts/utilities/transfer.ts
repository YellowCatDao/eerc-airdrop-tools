/**
 * Transfer EERC tokens between accounts
 */
import {Address, formatEther, parseEther} from "viem";
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

interface TransferConfig extends BaseConfig {
    recipient: string | Address;
    amount: string;
}

async function main(): Promise<void> {
    console.log("Starting transfer...");

    // Transfer-specific arguments
    const yargsInstance = yargs(hideBin(process.argv))
        .options({
            'recipient': {
                type: 'string',
                description: 'Recipient address',
                demandOption: true,
                alias: 'to'
            },
            'amount': {
                type: 'string',
                description: 'Amount to transfer (in ETH)',
                demandOption: true
            }
        })
        .help();

    const args = parseArgs<TransferConfig>(['recipient', 'amount'], yargsInstance);
    const {eerc, config, clients} = await createEERCInstance(args);

    const amount = parseEther(args.amount);
    console.log(`Transfer ${args.amount} ETH of ${(config.tokenAddress)} from ${clients.account.address} to ${args.recipient}`);

    await ensureRegistration(eerc);

    const recipientPublicKey = await eerc.fetchPublicKey(args.recipient as Address);
    const isRecipientRegistered = recipientPublicKey[0] !== 0n || recipientPublicKey[1] !== 0n;
    if (!isRecipientRegistered) {
        throw new Error(`Recipient ${args.recipient} is not registered. They must register before receiving funds.`);
    }

    const currentBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );
    console.log(`Current balance: ${formatEther(currentBalance)} ETH`);

    const auditorPublicKey = await getAuditorPublicKey(
        clients.publicClient,
        config.eercContractAddress,
        eerc
    );

    console.log("Executing transfer...");
    const transferTxHash = await transferTokens(
        eerc,
        clients.publicClient,
        args.recipient as Address,
        amount,
        auditorPublicKey,
        config.tokenAddress
    );

    console.log(`Transaction: ${transferTxHash}`);
    await clients.publicClient.waitForTransactionReceipt({hash: transferTxHash as Address});

    const updatedBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );
    console.log(`Transfer complete. New balance: ${formatEther(updatedBalance)} ETH`);
}

main().catch(console.error);
