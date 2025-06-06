/**
 * Deposit regular tokens into EERC encrypted balance
 */
import {formatEther, parseEther} from "viem";
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {
    BaseConfig,
    createEERCInstance,
    depositTokens,
    ensureRegistration,
    ensureTokenApproval,
    getDecryptedBalance,
    getTokenBalance,
    parseArgs,
} from '../../common/index.js';

interface DepositConfig extends BaseConfig {
    amount: string;
}

async function main(): Promise<void> {
    console.log("Starting deposit...");

    // Deposit-specific arguments
    const yargsInstance = yargs(hideBin(process.argv))
        .options({
            'amount': {
                type: 'string',
                description: 'Amount to deposit (in ETH)',
                demandOption: true
            }
        })
        .help();

    
    const args = parseArgs<DepositConfig>(['amount'], yargsInstance);
    const {eerc, config, clients} = await createEERCInstance(args);

    const amount = parseEther(args.amount);
    console.log(`Deposit ${args.amount} ETH of ${config.tokenAddress} from regular balance to encrypted balance`);

    await ensureRegistration(eerc);

    const currentTokenBalance = await getTokenBalance(
        clients.publicClient,
        config.tokenAddress,
        clients.account.address
    );
    console.log(`Current token balance: ${formatEther(currentTokenBalance)} ETH`);

    if (currentTokenBalance < amount) {
        throw new Error(`Insufficient token balance: have ${formatEther(currentTokenBalance)} ETH, trying to deposit ${formatEther(amount)} ETH`);
    }

    const currentEncryptedBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );
    console.log(`Current encrypted balance: ${formatEther(currentEncryptedBalance)} ETH`);

    console.log("Checking token approval...");
    const approvalNeeded = await ensureTokenApproval(
        clients.publicClient,
        clients.walletClient,
        config.tokenAddress,
        config.eercContractAddress,
        clients.account.address,
        amount
    );

    if (approvalNeeded) {
        console.log("Token approval granted.");
    } else {
        console.log("Token already approved.");
    }

    console.log("Executing deposit...");
    const depositTxHash = await depositTokens(
        eerc,
        clients.publicClient,
        amount,
        config.tokenAddress
    );

    console.log(`Transaction: ${depositTxHash}`);
    await clients.publicClient.waitForTransactionReceipt({hash: depositTxHash});

    const updatedTokenBalance = await getTokenBalance(
        clients.publicClient,
        config.tokenAddress,
        clients.account.address
    );

    const updatedEncryptedBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );

    console.log(`Deposit complete. New token balance: ${formatEther(updatedTokenBalance)} ETH`);
    console.log(`New encrypted balance: ${formatEther(updatedEncryptedBalance)} ETH`);
}

main().catch(console.error);