/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { 
  Banknote, TrendingUp, Shield, ArrowDownUp, 
  PieChart, Activity 
} from 'lucide-react';
import { getProgram } from '@/lib/program'; 
import { ObsidianClient } from '@/lib/client';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

export default function LendingPage() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // --- STATE ---
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  // Balances
  const [balance, setBalance] = useState<number>(0);         // User Wallet SOL
  const [poolBalance, setPoolBalance] = useState<number>(0); // Total Pool TVL
  const [userDeposit, setUserDeposit] = useState<number>(0); // User's Staked Amount
  
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Mock APY for demo
  const APY = 12.5; 

  // --- 1. FETCH DATA (ON-CHAIN + LOCAL STORAGE) ---
  useEffect(() => {
    if (!wallet.publicKey) return;

    const fetchData = async () => {
      try {
        // A. User Wallet Balance (Live from Chain)
        const bal = await connection.getBalance(wallet.publicKey!);
        setBalance(bal / 1e9);

        // B. Pool Stats (Live from Chain)
        const program = getProgram(connection, wallet as any);
        const client = new ObsidianClient(program, wallet.publicKey!);
        
        try {
            // Fetch the actual SOL balance of the Pool PDA
            const poolBal = await connection.getBalance(client.poolPda);
            setPoolBalance(poolBal / 1e9);
        } catch (e) {
            console.log("Pool not initialized yet");
            setPoolBalance(0);
        }

        // C. User's Personal Deposit Position (LocalStorage Mock)
        const savedDeposit = localStorage.getItem(`obsidian_deposit_${wallet.publicKey.toString()}`);
        if (savedDeposit) {
            setUserDeposit(parseFloat(savedDeposit));
        } else {
            setUserDeposit(0);
        }

      } catch (err) {
        console.error("Error fetching lending data", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [wallet.publicKey, connection]);

  // --- 2. DEPOSIT LOGIC (DIRECT SOL TRANSFER) ---
  const handleDeposit = async () => {
    if (!wallet.publicKey || !depositAmount) return;
    setIsLoading(true);
    setLogs(prev => [...prev, `Initiating Deposit of ${depositAmount} SOL...`]);

    try {
      const program = getProgram(connection, wallet as any);
      const client = new ObsidianClient(program, wallet.publicKey);
      const amountLamports = new BN(Number(depositAmount) * 1e9);

      // --- FIX: USE DIRECT TRANSFER ---
      // Your IDL 'deposit' requires SPL tokens and Proofs. 
      // For LP Liquidity, we simply transfer SOL to the Pool Vault.
      
      const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: client.poolPda, // Sending to the Protocol Vault
            lamports: BigInt(amountLamports.toString())
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      // Send via Provider
      const sig = await program.provider.sendAndConfirm!(tx, [], { skipPreflight: true });
      
      setLogs(prev => [...prev, ` Liquidity Provided! Sig: ${sig.slice(0,8)}...`]);
      setDepositAmount('');
      
      // Update State & Persistence
      const addedAmount = Number(depositAmount);
      const newBalance = userDeposit + addedAmount;
      
      setUserDeposit(newBalance); 
      setPoolBalance(prev => prev + addedAmount);
      setBalance(prev => prev - addedAmount);
      
      localStorage.setItem(`obsidian_deposit_${wallet.publicKey.toString()}`, newBalance.toString());

    } catch (e: any) {
      console.error(e);
      setLogs(prev => [...prev, ` Error: ${e.message}`]);
    }
    setIsLoading(false);
  };
  const handleWithdraw = async () => {
     if (!wallet.publicKey || !withdrawAmount) return;
     setIsLoading(true);
     setLogs(prev => [...prev, `Requesting Withdrawal of ${withdrawAmount} SOL...`]);

     try {
       await new Promise(r => setTimeout(r, 1000));

       setLogs(prev => [...prev, ` Withdrawal Processed (Demo Mode)`]);
       setWithdrawAmount('');
       
       const removedAmount = Number(withdrawAmount);
       const newBalance = userDeposit - removedAmount;

       setUserDeposit(newBalance);
       setPoolBalance(prev => prev - removedAmount);
       setBalance(prev => prev + removedAmount);

       localStorage.setItem(`obsidian_deposit_${wallet.publicKey.toString()}`, newBalance.toString());

     } catch (e: any) {
       console.error(e);
       setLogs(prev => [...prev, ` Error: ${e.message}`]);
     }
     setIsLoading(false);
  };

  return (
    <div className="min-h-screen pt-28 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        
        {/* HEADER */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-[#f5f5f5] mb-4">
            Liquidity <span className="text-gold-gradient">Pools</span>
          </h1>
          <p className="text-[#a0a0a0] max-w-2xl text-lg">
            Provide liquidity to the Dark Pool and earn yield from trading fees.
            <br />
            Institutional grade security. No lock-up periods.
          </p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="luxury-card p-6 flex items-center gap-4">
                <div className="p-3 bg-[#d4af37]/10 rounded-xl text-[#d4af37]">
                    <Banknote className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-xs text-[#707070] uppercase font-bold tracking-wider">Total Value Locked</p>
                    <p className="text-2xl font-bold text-white font-mono">{poolBalance.toFixed(2)} SOL</p>
                </div>
            </div>
            
            <div className="luxury-card p-6 flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
                    <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-xs text-[#707070] uppercase font-bold tracking-wider">Current APY</p>
                    <p className="text-2xl font-bold text-white font-mono">{APY}%</p>
                </div>
            </div>

            <div className="luxury-card p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                    <PieChart className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-xs text-[#707070] uppercase font-bold tracking-wider">Your Share</p>
                    <p className="text-2xl font-bold text-white font-mono">
                        {poolBalance > 0 ? ((userDeposit / poolBalance) * 100).toFixed(2) : '0.00'}%
                    </p>
                </div>
            </div>
        </div>

        {/* MAIN INTERFACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT: DEPOSIT/WITHDRAW */}
            <div className="lg:col-span-7 space-y-8">
                
                {/* DEPOSIT CARD */}
                <div className="luxury-card p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <ArrowDownUp className="w-5 h-5 text-[#d4af37]" />
                            Deposit Liquidity
                        </h3>
                        <span className="text-xs text-[#707070] font-mono">Wallet: {balance.toFixed(4)} SOL</span>
                    </div>

                    <div className="relative group mb-6">
                        <input 
                            type="number" 
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-4 pr-16 text-2xl font-mono text-white focus:outline-none focus:border-[#d4af37] transition-all"
                        />
                         <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#707070] font-bold text-sm pointer-events-none">SOL</span>
                    </div>

                    <button 
                        onClick={handleDeposit}
                        disabled={isLoading || !depositAmount}
                        className="w-full py-4 bg-[#d4af37] text-black font-bold text-lg rounded-xl hover:bg-[#e8c547] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isLoading ? <Activity className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                        Supply Liquidity
                    </button>
                </div>

                {/* WITHDRAW CARD (Only show if user has deposits) */}
                <div className={`luxury-card p-8 border border-white/5 transition-all ${userDeposit > 0 ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Withdraw Funds</h3>
                        <span className="text-xs text-[#707070] font-mono">Staked: {userDeposit.toFixed(4)} SOL</span>
                    </div>
                     <div className="flex gap-4">
                        <input 
                            type="number" 
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="Amount"
                            disabled={userDeposit <= 0}
                            className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-3 font-mono text-white focus:outline-none focus:border-[#d4af37]"
                        />
                        <button 
                            onClick={handleWithdraw}
                            disabled={isLoading || !withdrawAmount || userDeposit <= 0}
                            className="px-6 bg-[#1a1a1a] border border-[#333] hover:border-white/20 text-white rounded-lg font-bold transition-all"
                        >
                            Withdraw
                        </button>
                     </div>
                </div>

            </div>

            {/* RIGHT: INFO & LOGS */}
            <div className="lg:col-span-5 space-y-6">
                <div className="luxury-card p-6 h-full flex flex-col">
                    <h3 className="text-sm font-bold text-[#707070] uppercase tracking-widest mb-4 border-b border-[#333] pb-2">
                        Transaction Terminal
                    </h3>
                    <div className="flex-grow space-y-3 font-mono text-xs overflow-y-auto max-h-[300px]">
                        {logs.length === 0 && <span className="text-[#333] italic">Ready for transactions...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2 animate-fade-in">
                                <span className="text-[#d4af37]">➜</span>
                                <span className="text-[#a0a0a0]">{log}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}