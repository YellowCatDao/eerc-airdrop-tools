/**
 * EERC basic operations testing script
 */
import {formatEther, parseEther} from "viem";
import {
    createEERCInstance,
    depositTokens,
    ensureRegistration,
    ensureTokenApproval,
    getAuditorPublicKey,
    getDecryptedBalance,
    getTokenBalance,
    withdrawTokens,
} from '../../common/index.js';

async function main(): Promise<void> {
    console.log("Running simple EERC operations...");
    const {eerc, config, clients} = await createEERCInstance();

    console.log(`Account: ${clients.account.address}`);
    await ensureRegistration(eerc);

    const tokenBalance = await getTokenBalance(
        clients.publicClient,
        config.tokenAddress,
        clients.account.address
    );
    console.log(`Token balance: ${formatEther(tokenBalance)} ETH`);

    const auditorPublicKey = await getAuditorPublicKey(
        clients.publicClient,
        config.eercContractAddress,
        eerc
    );

    const currentBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );
    console.log(`Initial encrypted balance: ${formatEther(currentBalance)} ETH`);

    const depositAmount = parseEther("2");
    console.log(`Depositing ${formatEther(depositAmount)} ETH...`);

    await ensureTokenApproval(
        clients.publicClient,
        clients.walletClient,
        config.tokenAddress,
        config.eercContractAddress,
        clients.account.address,
        depositAmount
    );

    const depositTx = await depositTokens(
        eerc,
        clients.publicClient,
        depositAmount,
        config.tokenAddress
    );
    await clients.publicClient.waitForTransactionReceipt({hash: depositTx});
    console.log(`Deposit transaction: ${depositTx}`);

    // Get balance after deposit
    const updatedBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );
    console.log(`Balance after deposit: ${formatEther(updatedBalance)} ETH`);

    const withdrawAmount = parseEther("1"); // 1 ETH
    console.log(`Withdrawing ${formatEther(withdrawAmount)} ETH...`);

    const withdrawTx = await withdrawTokens(
        eerc,
        clients.publicClient,
        withdrawAmount,
        auditorPublicKey,
        config.tokenAddress
    );
    await clients.publicClient.waitForTransactionReceipt({hash: withdrawTx});
    console.log(`Withdraw transaction: ${withdrawTx}`);

    const finalBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );

    const finalTokenBalance = await getTokenBalance(
        clients.publicClient,
        config.tokenAddress,
        clients.account.address
    );

    console.log(`Final encrypted balance: ${formatEther(finalBalance)} ETH`);
    console.log(`Final token balance: ${formatEther(finalTokenBalance)} ETH`);
}

main().catch(console.error);