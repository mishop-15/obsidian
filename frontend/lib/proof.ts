/* eslint-disable @typescript-eslint/no-explicit-any */
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import compiledCircuit from '@/public/circuits/obsidian_circuits.json'; 

export const CIRCUIT_TYPES = {
  COMPLIANCE: 1,
  DARK_POOL: 2,
  AUCTION: 3,
};
const EMPTY_INPUT = {
  circuit_type: 0,
  user_id_hash: "0x00",
  kyc_registry_root: "0x00",
  merkle_path: new Array(8).fill("0x00"),
  merkle_indices: new Array(8).fill("0x00"),
  order_amount: "0x00",
  order_price: "0x00",
  user_balance: "0x00",
  min_order_size: "0x00",
  max_order_size: "0x00",
  min_price: "0x00",
  max_price: "0x00",
  bid_amount: "0x00",
  bidder_balance: "0x00",
  minimum_bid: "0x00",
  collateral_value: "0x00",
};

// 3. Cache the backend to avoid re-initializing heavy WASM
let backendCache: BarretenbergBackend | null = null;
let noirCache: Noir | null = null;

async function getNoirInstance() {
  if (!backendCache) {
    backendCache = new BarretenbergBackend(compiledCircuit as any);
    noirCache = new Noir(compiledCircuit as any, backendCache);
  }
  return { backend: backendCache, noir: noirCache! };
}

export async function generateZKProof(specificInput: any, circuitType: number): Promise<Uint8Array> {
  try {
    const { backend, noir } = await getNoirInstance();

    // MERGE: Overwrite the empty template with your actual data
    const finalInput = {
      ...EMPTY_INPUT,
      ...specificInput,
      circuit_type: circuitType,
    };

    console.log(`Generating Proof for Type ${circuitType}...`);
    const { witness } = await noir.execute(finalInput);
    const proof = await backend.generateProof(witness);

    console.log("Proof Generated Successfully!");
    return proof.proof;
  } catch (error) {
    console.error('Proof Generation Failed:', error);
    throw new Error('Failed to generate ZK proof');
  }
}