import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ObsidianProtocol } from "../target/types/obsidian_protocol";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';

import circuit from "../circuits/obsidian_circuits/target/obsidian_circuits.json";

describe("obsidian_protocol_v2", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  
  const program = anchor.workspace.ObsidianProtocol as Program<ObsidianProtocol>;
  const provider = anchor.AnchorProvider.env();
  
  const trader = anchor.web3.Keypair.generate();

  const [orderBookPda, orderBookBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("dark_pool")],
    program.programId
  );

  it("Initialize Dark Pool Order Book", async () => {
    try {
      const tx = await program.methods
        .initializeDarkPool(orderBookBump)
        .accounts({
          authority: provider.wallet.publicKey,
        })
        .rpc();
        
      console.log("Order Book Initialized:", tx);
    } catch (error) {
      console.log("Order Book might already exist, continuing...");
    }
  });

  it("Generate ZK Proof & Submit Encrypted Order (3-Step Process)", async () => {
    console.log("\nSTEP 1: Funding trader account...");
    const transferTx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: trader.publicKey,
        lamports: 100_000_000,
      })
    );
    await provider.sendAndConfirm(transferTx);
    console.log("Trader funded with 0.1 SOL");

    console.log("\nSTEP 2: Generating ZK proof...");
    const backend = new BarretenbergBackend(circuit as any);
    const noir = new Noir(circuit as any);

    const input = {
      circuit_type: 2,
      order_amount: 50,
      order_price: 150,
      user_balance: 100,
      min_order_size: 10,
      max_order_size: 1000,
      min_price: 10,
      max_price: 200,
      user_id_hash: 0,
      kyc_registry_root: 0,
      merkle_path: Array(8).fill(0),
      merkle_indices: Array(8).fill(0),
      bid_amount: 0,
      bidder_balance: 0,
      minimum_bid: 0,
      collateral_value: 0
    };
    
    const { witness } = await noir.execute(input);
    const proofData = await backend.generateProof(witness);
    const proof = proofData.proof;
    
    console.log(`ZK Proof generated (${proof.length} bytes)`);

    console.log("\nSTEP 3: Creating order and proof accounts...");
    const orderId = new anchor.BN(Date.now());
    console.log(`Order ID: ${orderId.toString()}`);

    const [proofPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proof"),
        trader.publicKey.toBuffer(),
        orderId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    console.log(`Proof PDA: ${proofPda.toString()}`);

    const [orderPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        trader.publicKey.toBuffer(),
        orderId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    console.log(`Order PDA: ${orderPda.toString()}`);

    console.log("\nSTEP 4: Creating proof account on-chain...");
    const createProofTx = await program.methods
      .createProofAccount(orderId)
      .accounts({
        proofAccount: proofPda,
        user: trader.publicKey,
        systemProgram: SystemProgram.programId,
      }as any)
      .signers([trader])
      .rpc();
    
    console.log("Proof account created:", createProofTx);

    console.log("\nSTEP 5: Storing ZK proof in chunks...");
    const CHUNK_SIZE = 800;
    
    let chunkCount = 0;
    for (let i = 0; i < proof.length; i += CHUNK_SIZE) {
      const chunk = proof.slice(i, Math.min(i + CHUNK_SIZE, proof.length));
      
      await program.methods
        .storeOrderProof(Buffer.from(chunk), true)
        .accounts({
          proofAccount: proofPda,
          owner: trader.publicKey,
        }as any)
        .signers([trader])
        .rpc();
      
      chunkCount++;
      console.log(`Chunk ${chunkCount} stored (${chunk.length} bytes)`);
    }
    console.log(`Order proof stored in ${chunkCount} chunk(s)`);

    const complianceProof = Buffer.from([0x01, 0x02, 0x03]);
    await program.methods
      .storeOrderProof(complianceProof, false)
      .accounts({
        proofAccount: proofPda,
        owner: trader.publicKey,
      }as any)
      .signers([trader])
      .rpc();
    
    console.log("Compliance proof stored");

    console.log("\nSTEP 6: Submitting encrypted order...");
    const encryptedData = Buffer.from("ENCRYPTED_ORDER_PAYLOAD_FROM_ARCIUM");
    
    const submitOrderTx = await program.methods
      .submitEncryptedOrder(orderId, encryptedData)
      .accounts({
        orderBook: orderBookPda,
        order: orderPda,
        proofAccount: proofPda,
        user: trader.publicKey,
        systemProgram: SystemProgram.programId,
      }as any)
      .signers([trader])
      .rpc();

    console.log("Encrypted order submitted!");
    console.log(`Transaction signature: ${submitOrderTx}`);
    
    console.log("\nVERIFICATION: Fetching on-chain data...");
    
    const orderAccount = await program.account.encryptedOrder.fetch(orderPda);
    console.log("\nOrder Account Data:");
    console.log(`  Owner: ${orderAccount.owner.toString()}`);
    console.log(`  Order ID: ${orderAccount.orderId.toString()}`);
    console.log(`  Encrypted Data: ${orderAccount.encryptedData.toString('hex')}`);
    console.log(`  Proof Account: ${orderAccount.proofAccount.toString()}`);
    console.log(`  Timestamp: ${new Date(orderAccount.timestamp.toNumber() * 1000).toISOString()}`);
    console.log(`  Settled: ${orderAccount.settled}`);
    console.log(`  Batch ID: ${orderAccount.batchId.toString()}`);
    
    const proofAccount = await program.account.proofAccount.fetch(proofPda);
    console.log("\nProof Account Data:");
    console.log(`  Owner: ${proofAccount.owner.toString()}`);
    console.log(`  Order ID: ${proofAccount.orderId.toString()}`);
    console.log(`  Order Proof Length: ${proofAccount.orderProof.length} bytes`);
    console.log(`  Compliance Proof Length: ${proofAccount.complianceProof.length} bytes`);
    
    const orderBook = await program.account.darkPoolOrderBook.fetch(orderBookPda);
    console.log("\nOrder Book Stats:");
    console.log(`  Authority: ${orderBook.authority.toString()}`);
    console.log(`  Total Orders: ${orderBook.totalOrders.toString()}`);
    console.log(`  Next Batch ID: ${orderBook.nextBatchId.toString()}`);
    
    console.log("\nSUCCESS! Dark pool order fully submitted with MEV protection!");
  });
});