import { Keypair, Connection, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { Wallet } from '@project-serum/anchor';
import fetch from 'cross-fetch';

dotenv.config();

async function getQuote(inputMint, outputMint, amount, slippageBps) {
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    const response = await fetch(quoteUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch quote: ${response.statusText}`);
    }
    return await response.json();
}

async function main(inputMint, outputMint, amount, slippageBps) {
    const encodedPrivateKey = process.env.PRIVATE_KEY;
    if (!encodedPrivateKey) {
        console.error('Private key not found in environment variables.');
        process.exit(1);
    }

    let keypair;
    try {
        const decodedPrivateKey = bs58.decode(encodedPrivateKey);
        keypair = Keypair.fromSecretKey(decodedPrivateKey);
        console.log('Keypair created successfully.');
    } catch (error) {
        console.error('Failed to create keypair:', error.message);
        return; // Early return if the keypair creation fails
    }

    const wallet = new Wallet(keypair);
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl);

    try {
        const quoteResponse = await getQuote(inputMint, outputMint, amount, slippageBps);
        console.log("Quote Response:", quoteResponse);

        const swapUrl = 'https://quote-api.jup.ag/v6/swap';
        const { swapTransaction } = await fetch(swapUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey: wallet.publicKey.toString(),
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto' // or custom lamports: 10000
            })
        }).then(res => res.json());

        const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
        var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        console.log(transaction);

        transaction.sign([wallet.payer]);

        const rawTransaction = transaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, { skipPreflight: true, maxRetries: 2 });
        console.log(`Transaction sent with TXID: ${txid}`);

        await checkTransactionConfirmation(txid, connection, 180000); // 180 seconds for manual confirmation check
    } catch (error) {
        console.error("Error during transaction submission or confirmation:", error);
    }
}

// Example usage:
main("So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 100, 50).catch(console.error);

async function checkTransactionConfirmation(txid, connection, timeout = 180000) {
    let startTime = new Date().getTime();
    let status = null;
    while (new Date().getTime() - startTime < timeout) {
        try {
            status = await connection.getSignatureStatuses([txid]);
            if (status && status.value[0] && status.value[0].confirmationStatus === 'finalized') {
                console.log(`Transaction ${txid} confirmed`);
                return;
            }
        } catch (error) {
            console.error(`Error checking transaction status: ${error}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds
    }
    console.log(`Transaction confirmation for ${txid} timed out.`);
}
