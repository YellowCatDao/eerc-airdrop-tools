/**
 * EERC write operations utilities
 */
import {Address, Hash} from "viem";
import {EERC} from "@avalabs/ac-eerc-sdk";
import {PublicClient} from "wagmi";
import {getEERCDecimals, getEncryptedBalance} from './eerc-utils.js';

/**
 * Deposits tokens into the EERC contract
 */
export async function depositTokens(
    eerc: EERC,
    publicClient: PublicClient,
    amount: bigint,
    tokenAddress: Address
): Promise<Hash> {
    const eercDecimals = await getEERCDecimals(publicClient, eerc.contractAddress as Address, eerc);
    const depositResult = await eerc.deposit(
        amount,
        tokenAddress,
        eercDecimals
    );
    return depositResult.transactionHash;
}

/**
 * Withdraws tokens from the EERC contract
 */
export async function withdrawTokens(
    eerc: EERC,
    publicClient: PublicClient,
    amount: bigint,
    auditorPublicKey: bigint[],
    tokenAddress: Address
): Promise<Hash> {
    const {elGamalCipherText, amountPCTs, balancePCT} = await getEncryptedBalance(
        eerc,
        publicClient,
        eerc.contractAddress as Address,
        eerc.wallet.account.address,
        tokenAddress
    );

    const balance = eerc.calculateTotalBalance(elGamalCipherText, amountPCTs, balancePCT);
    const withdrawResult = await eerc.withdraw(
        amount,
        [elGamalCipherText.c1.x, elGamalCipherText.c1.y, elGamalCipherText.c2.x, elGamalCipherText.c2.y],
        balance,
        auditorPublicKey,
        tokenAddress
    );

    return withdrawResult.transactionHash;
}

/**
 * Transfers tokens between EERC accounts
 */
export async function transferTokens(
    eerc: EERC,
    publicClient: PublicClient,
    recipient: Address,
    amount: bigint,
    auditorPublicKey: bigint[],
    tokenAddress: Address
): Promise<Hash> {
    const {elGamalCipherText, amountPCTs, balancePCT} = await getEncryptedBalance(
        eerc,
        publicClient,
        eerc.contractAddress as Address,
        eerc.wallet.account.address,
        tokenAddress
    );

    const currentBalance = eerc.calculateTotalBalance(elGamalCipherText, amountPCTs, balancePCT);

    if (currentBalance < amount) {
        throw new Error(`Insufficient balance: ${currentBalance} wei available, trying to send ${amount} wei`);
    }

    const transferResult = await eerc.transfer(
        recipient,
        amount,
        [elGamalCipherText.c1.x, elGamalCipherText.c1.y, elGamalCipherText.c2.x, elGamalCipherText.c2.y],
        currentBalance,
        auditorPublicKey,
        tokenAddress
    );

    return transferResult.transactionHash;
}