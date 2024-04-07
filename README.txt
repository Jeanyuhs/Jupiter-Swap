Created to better understand Jupiter DEX and Solana blockchain

Goal: create a program to swap tokens SOL -> USDC

Install

npm i @solana/web3.js
npm i cross-fetch
npm i @project-serum/anchor
npm i bs58

create don env file 
    PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

Example is set to swap SOL or USDC

NODE swap.mjs

Returns TX ID but does not reach blockchain 
* Attempted w/ public RPC, Alchemy RPC and Helius RPC - same results
** Attempted to raise priority fee to 1000000 or .01 SOL - Same results

Source: https://station.jup.ag/docs/apis/swap-api