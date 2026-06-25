/**
 * Register the caller's account with the EERC Registrar.
 *
 * This is the standalone "register" step needed before an address can be set as
 * the auditor on a fresh chain (setAuditorPublicKey reverts unless the auditor is
 * registered). Registration only touches the Registrar — it does NOT need a deployed
 * EERC token contract, so EERC_CONTRACT_ADDRESS can be a placeholder.
 *
 * Usage:
 *   npm run register -- --chain=base --env-file=.env.base
 *
 * The PRIVATE_KEY in the env file must be the AUDITOR's key — registration binds to
 * msg.sender, so the auditor must register from its own EOA (and needs gas on the chain).
 */
import {createEERCInstance, ensureRegistration} from '../../common/index.js';

async function main(): Promise<void> {
    const {eerc, clients, config} = await createEERCInstance();
    console.log(`Chain      : ${config.chain}`);
    console.log(`Registrar  : ${config.registrarAddress}`);
    console.log(`Account    : ${clients.account.address}`);

    const didRegister = await ensureRegistration(eerc);
    if (didRegister) {
        console.log("Registration submitted successfully.");
    } else {
        console.log("Account already registered — nothing to do.");
    }
}

// snarkjs leaves worker threads open, so the process hangs after success —
// force a clean exit once the work is done.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
