/**
 * Script to check registration status and set contract auditor public key
 */
import {createEERCInstance, ensureRegistration,} from '../../common/index.js';
import {Address} from 'viem';

async function main(): Promise<void> {
    console.log("Ensuring auditor public key is set");

    const {eerc, config, clients} = await createEERCInstance();
    console.log(`Using account: ${clients.account.address}`);

    await ensureRegistration(eerc);

    const auditorAddress = await clients.publicClient.readContract({
        address: config.eercContractAddress as Address,
        abi: eerc.encryptedErcAbi,
        functionName: "auditor",
        args: []
    }) as Address;

    if (auditorAddress.toLowerCase() === clients.account.address.toLowerCase()) {
        console.log("Already auditor, nothing to do");
        return;
    }

    console.log("Setting auditor public key...");
    const tx = await eerc.setContractAuditorPublicKey(clients.account.address);
    console.log(`Transaction: ${tx}`);
    await clients.publicClient.waitForTransactionReceipt({hash: tx});

    console.log("Done");
}

main().catch(console.error);
