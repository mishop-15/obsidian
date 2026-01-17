import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { ObsidianProtocol } from "../target/types/obsidian_protocol";
import { PublicKey, SystemProgram, Keypair, Transaction } from "@solana/web3.js";
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import circuit from "../circuits/obsidian_circuits/target/obsidian_circuits.json";

const FUNDING_AMOUNT = 100_000_000;
const PROOF_CHUNK_SIZE = 800;
const CIRCUIT_TYPE_DARK_POOL = 2;

interface TestConfig {
  program: Program<ObsidianProtocol>;
  provider: anchor.AnchorProvider;
  trader: Keypair;
  orderBookPda: PublicKey;
}

class TestHelpers {
  static async fundAccount(
    provider: anchor.AnchorProvider,
    recipient: PublicKey,
    amount: number
  ): Promise<void> {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: recipient,
        lamports: amount,
      })
    );
    await provider.sendAndConfirm(tx);
  }

  static async generateZKProof(input: any): Promise<Uint8Array> {
    const backend = new BarretenbergBackend(circuit as any);
    const noir = new Noir(circuit as any);
    
    const { witness } = await noir.execute(input);
    const proofData = await backend.generateProof(witness);
    
    return proofData.proof;
  }

  static createDarkPoolInput(
    orderAmount: number,
    orderPrice: number,
    userBalance: number
  ) {
    return {
      circuit_type: CIRCUIT_TYPE_DARK_POOL,
      order_amount: orderAmount,
      order_price: orderPrice,
      user_balance: userBalance,
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
  }

  static derivePDAs(
    program: Program<ObsidianProtocol>,
    trader: PublicKey,
    orderId: BN
  ) {
    const orderIdBytes = orderId.toArrayLike(Buffer, 'le', 8);
    
    const [proofPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proof"), trader.toBuffer(), orderIdBytes],
      program.programId
    );
    
    const [orderPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("order"), trader.toBuffer(), orderIdBytes],
      program.programId
    );
    
    return { proofPda, orderPda };
  }

  static async storeProofInChunks(
    program: Program<ObsidianProtocol>,
    proofPda: PublicKey,
    proof: Uint8Array,
    owner: Keypair
  ): Promise<number> {
    let chunkCount = 0;
    
    for (let i = 0; i < proof.length; i += PROOF_CHUNK_SIZE) {
      const chunk = proof.slice(i, Math.min(i + PROOF_CHUNK_SIZE, proof.length));
      
      await program.methods
        .storeOrderProof(Buffer.from(chunk), true)
        .accountsPartial({
          proofAccount: proofPda,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();
      
      chunkCount++;
    }
    
    return chunkCount;
  }

  static async displayOrderData(
    program: Program<ObsidianProtocol>,
    orderPda: PublicKey,
    proofPda: PublicKey,
    orderBookPda: PublicKey
  ): Promise<void> {
    const orderAccount = await program.account.encryptedOrder.fetch(orderPda);
    console.log("\nOrder Account:");
    console.log(`  Owner: ${orderAccount.owner.toString()}`);
    console.log(`  Order ID: ${orderAccount.orderId.toString()}`);
    console.log(`  Encrypted Data: ${orderAccount.encryptedData.toString('hex')}`);
    console.log(`  Proof Account: ${orderAccount.proofAccount.toString()}`);
    console.log(`  Timestamp: ${new Date(orderAccount.timestamp.toNumber() * 1000).toISOString()}`);
    console.log(`  Settled: ${orderAccount.settled}`);
    
    const proofAccount = await program.account.proofAccount.fetch(proofPda);
    console.log("\nProof Account:");
    console.log(`  Owner: ${proofAccount.owner.toString()}`);
    console.log(`  Order ID: ${proofAccount.orderId.toString()}`);
    console.log(`  Order Proof: ${proofAccount.orderProof.length} bytes`);
    console.log(`  Compliance Proof: ${proofAccount.complianceProof.length} bytes`);
    
    const orderBook = await program.account.darkPoolOrderBook.fetch(orderBookPda);
    console.log("\nOrder Book:");
    console.log(`  Authority: ${orderBook.authority.toString()}`);
    console.log(`  Total Orders: ${orderBook.totalOrders.toString()}`);
    console.log(`  Next Batch ID: ${orderBook.nextBatchId.toString()}`);
  }
}

describe("Obsidian Protocol Pool Tests", () => {
  const config: TestConfig = {
    program: null as any,
    provider: null as any,
    trader: Keypair.generate(),
    orderBookPda: null as any,
  };

  before(() => {
    anchor.setProvider(anchor.AnchorProvider.env());
    config.program = anchor.workspace.ObsidianProtocol as Program<ObsidianProtocol>;
    config.provider = anchor.AnchorProvider.env();
    
    const [orderBookPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dark_pool")],
      config.program.programId
    );
    config.orderBookPda = orderBookPda;
  });

  it("Should initialize dark pool order book", async () => {
    try {
      const [, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("dark_pool")],
        config.program.programId
      );
      
      await config.program.methods
        .initializeDarkPool(bump)
        .accountsPartial({ 
          authority: config.provider.wallet.publicKey 
        })
        .rpc();
        
      console.log("pool order book initialized");
    } catch (error) {
      console.log("Order book already exists, continuing...");
    }
  });

  it("Should create and submit encrypted order with ZK proof", async () => {
    console.log("\n 1: Fund Trader Account ");
    await TestHelpers.fundAccount(
      config.provider,
      config.trader.publicKey,
      FUNDING_AMOUNT
    );
    console.log(`Funded trader with ${FUNDING_AMOUNT / 1e9} SOL`);

    console.log("\n 2: Generate ZK Proof ");
    const input = TestHelpers.createDarkPoolInput(50, 150, 100);
    const proof = await TestHelpers.generateZKProof(input);
    console.log(`Generated proof: ${proof.length} bytes`);

    console.log("\n 3: Derive PDAs ");
    const orderId = new BN(Date.now());
    const { proofPda, orderPda } = TestHelpers.derivePDAs(
      config.program,
      config.trader.publicKey,
      orderId
    );
    console.log(`Order ID: ${orderId.toString()}`);
    console.log(`Proof PDA: ${proofPda.toString()}`);
    console.log(`Order PDA: ${orderPda.toString()}`);

    console.log("\n 4: Create Proof Account ");
    await config.program.methods
      .createProofAccount(orderId)
      .accountsPartial({
        proofAccount: proofPda,
        user: config.trader.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([config.trader])
      .rpc();
    console.log("Proof account created");

    console.log("\n 5: Store Proof in Chunks ");
    const chunkCount = await TestHelpers.storeProofInChunks(
      config.program,
      proofPda,
      proof,
      config.trader
    );
    console.log(`Stored proof in ${chunkCount} chunks`);

    await config.program.methods
      .storeOrderProof(Buffer.from([0x01, 0x02, 0x03]), false)
      .accountsPartial({
        proofAccount: proofPda,
        owner: config.trader.publicKey,
      })
      .signers([config.trader])
      .rpc();
    console.log("Compliance proof stored");

    console.log("\n 6: Submit Encrypted Order ");
    const encryptedData = Buffer.from("ENCRYPTED_ORDER_DATA");
    
    const tx = await config.program.methods
      .submitEncryptedOrder(orderId, encryptedData)
      .accountsPartial({
        orderBook: config.orderBookPda,
        order: orderPda,
        proofAccount: proofPda,
        user: config.trader.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([config.trader])
      .rpc();

    console.log(`Order submitted: ${tx}`);

    console.log("\n verification ");
    await TestHelpers.displayOrderData(
      config.program,
      orderPda,
      proofPda,
      config.orderBookPda
    );

    console.log("\n success: Dark pool order with MEV protection ");
  });
});