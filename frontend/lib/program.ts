/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnchorProvider, Program, Idl, setProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
// Import the JSON directly
import idl from '@/public/idl/obsidian_protocol.json'; 

export const PROGRAM_ID = new PublicKey("GbEuxhGpP1iy7YouyvfrDPEKk6pHZhZ8oT5oxLMvbGQ3");

export const getProgram = (connection: Connection, wallet: AnchorWallet) => {
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: 'processed',
  });
  
  // Set global provider (helps with some wallet adapters)
  setProvider(provider);

  // CRITICAL FIX: Handle Next.js JSON Module wrapping
  // If 'idl' has a 'default' property, use that. Otherwise use 'idl' directly.
  const idlObject = (idl as any).default ? (idl as any).default : idl;

  // Anchor 0.32+ Program constructor
  return new Program(idlObject as Idl, provider);
};