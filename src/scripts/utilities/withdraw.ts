/**
 * Withdraw EERC tokens from encrypted balance to regular token balance
 */
import {formatEther, parseEther} from "viem";
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {
    BaseConfig,
    createEERCInstance,
    ensureRegistration,
    getAuditorPublicKey,
    getDecryptedBalance,
    getTokenBalance,
    parseArgs,
    withdrawTokens,
} from '../../common/index.js';

interface WithdrawConfig extends BaseConfig {
    amount: string;
}

async function main(): Promise<void> {
    console.log("Starting withdraw...");

    // Withdraw-specific arguments
    const yargsInstance = yargs(hideBin(process.argv))
        .options({
            'amount': {
                type: 'string',
                description: 'Amount to withdraw (in ETH)',
                demandOption: true
            }
        })
        .help();

    const args = parseArgs<WithdrawConfig>(['amount'], yargsInstance);
    const {eerc, config, clients} = await createEERCInstance(args);

    const amount = parseEther(args.amount);
    console.log(`Withdraw ${args.amount} ETH of ${config.tokenAddress} from encrypted balance to regular balance`);

    await ensureRegistration(eerc);

    const currentEncryptedBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );
    console.log(`Current encrypted balance: ${formatEther(currentEncryptedBalance)} ETH`);

    if (currentEncryptedBalance < amount) {
        throw new Error(`Insufficient encrypted balance: have ${formatEther(currentEncryptedBalance)} ETH, trying to withdraw ${formatEther(amount)} ETH`);
    }

    const currentTokenBalance = await getTokenBalance(
        clients.publicClient,
        config.tokenAddress,
        clients.account.address
    );
    console.log(`Current token balance: ${formatEther(currentTokenBalance)} ETH`);

    const auditorPublicKey = await getAuditorPublicKey(
        clients.publicClient,
        config.eercContractAddress,
        eerc
    );

    console.log("Executing withdraw...");
    const withdrawTxHash = await withdrawTokens(
        eerc,
        clients.publicClient,
        amount,
        auditorPublicKey,
        config.tokenAddress
    );

    console.log(`Transaction: ${withdrawTxHash}`);
    await clients.publicClient.waitForTransactionReceipt({hash: withdrawTxHash});

    const updatedEncryptedBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );
    
    const updatedTokenBalance = await getTokenBalance(
        clients.publicClient,
        config.tokenAddress,
        clients.account.address
    );

    console.log(`Withdraw complete. New encrypted balance: ${formatEther(updatedEncryptedBalance)} ETH`);
    console.log(`New token balance: ${formatEther(updatedTokenBalance)} ETH`);
}

main().catch(console.error);