/**
 * Check balances for EERC tokens
 */
import {formatEther} from "viem";
import {createEERCInstance, ensureRegistration, getDecryptedBalance} from '../../common/eerc/index.js';
import {getTokenBalance} from '../../common/web3/index.js';


async function main(): Promise<void> {
    console.log("Checking balances...");

    const {eerc, config, clients} = await createEERCInstance();

    console.log(`Account: ${(clients.account.address)}`);
    console.log(`Token: ${(config.tokenAddress)}`);

    await ensureRegistration(eerc);

    const tokenBalance = await getTokenBalance(
        clients.publicClient,
        config.tokenAddress,
        clients.account.address
    );
    console.log(`Token balance: ${formatEther(tokenBalance)} ETH`);

    const encryptedBalance = await getDecryptedBalance(
        eerc,
        clients.publicClient,
        config.tokenAddress
    );

    console.log(`Encrypted balance: ${formatEther(encryptedBalance)} ETH`);
}

main().catch(console.error);