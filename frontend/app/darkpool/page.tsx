/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { BN } from '@coral-xyz/anchor';
import { 
  Lock, TrendingUp, Shield, Activity, CheckCircle2, 
  EyeOff, Zap, Book, RefreshCw, Hash, AlertTriangle 
} from 'lucide-react';
import { getProgram, PROGRAM_ID } from '@/lib/program'; 
import { ObsidianClient } from '@/lib/client';
import { generateZKProof, CIRCUIT_TYPES } from '@/lib/proof';
import { SystemProgram } from '@solana/web3.js';

// --- HELPER: Time Ago Formatter ---
const timeAgo = (timestamp: number | null | undefined) => {
  if (!timestamp) return 'Just now';
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

// --- COMPONENT: Status Tracker ---
const StatusStep = ({ current, step, label }: { current: number; step: number; label: string }) => {
  const isActive = current === step;
  const isDone = current > step;
  return (
    <div className={`flex items-center gap-3 transition-all duration-500 ${isActive ? 'translate-x-2' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border transition-colors duration-300 ${
        isActive ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37] animate-pulse shadow-[0_0_15px_-3px_rgba(212,175,55,0.4)]' : 
        isDone ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-[#333] bg-[#1a1a1a] text-[#555]'
      }`}>
        {isDone ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <span className={`text-sm font-medium ${isActive ? 'text-[#d4af37]' : isDone ? 'text-green-500' : 'text-[#555]'}`}>
        {label}
      </span>
    </div>
  );
};
const ExplorerRow = ({ signature, slot, type, age, status, highlight }: any) => (
  <div className={`grid grid-cols-12 gap-4 py-3 border-b border-[#222] text-xs font-mono transition-colors items-center animate-fade-in ${
    highlight ? 'bg-[#d4af37]/10' : 'hover:bg-white/5'
  }`}>
    <div className="col-span-5 flex items-center gap-2 text-[#d4af37]">
      <Hash className="w-3 h-3 opacity-50" />
      <a href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} target="_blank" rel="noreferrer" className="hover:underline truncate">
        {signature.slice(0, 25)}...
      </a>
    </div>
    <div className="col-span-2 text-blue-400">
      <a href={`https://explorer.solana.com/block/${slot}?cluster=devnet`} target="_blank" rel="noreferrer" className="hover:underline">
        {slot}
      </a>
    </div>
    <div className={`col-span-2 truncate ${highlight ? 'text-green-400 font-bold' : 'text-white/70'}`}>
      {type}
    </div>
    <div className="col-span-2 text-[#707070]">{age}</div>
    <div className="col-span-1">
      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
        status === 'Success' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'
      }`}>
        {status}
      </span>
    </div>
  </div>
);

export default function DarkPoolPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // --- STATE ---
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [marketPrice, setMarketPrice] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  
  // Process State
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(0); 
  const [logs, setLogs] = useState<string[]>([]);
  const [txHash, setTxHash] = useState('');
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [isSettling, setIsSettling] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-5), msg]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const signatures = await connection.getSignaturesForAddress(
          PROGRAM_ID, 
          { limit: 5 }
        );
        const formatted = signatures.map(sig => {
          const isMyOrder = sig.signature === txHash;
          return {
            sig: sig.signature,
            slot: sig.slot,
            type: isMyOrder ? 'Encrypted Sell Order' : 'Zero-Knowledge Proof Sync',
            age: timeAgo(sig.blockTime),
            status: sig.err ? 'Failed' : 'Success',
            highlight: isMyOrder 
          };
        });
        
        setRecentTxns(formatted);
      } catch (e) {
        console.log("No history found", e);
      }
    };
    if (txHash) fetchHistory(); 
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [connection, txHash]);

  useEffect(() => {
    if (!wallet.publicKey) return;

    const fetchBalance = async () => {
      const bal = await connection.getBalance(wallet.publicKey!);
      setBalance(bal / 1e9);
    };
    fetchBalance();

    const subscriptionId = connection.onAccountChange(
      wallet.publicKey,
      (updatedAccountInfo) => {
        setBalance(updatedAccountInfo.lamports / 1e9);
      },
      "confirmed"
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [wallet.publicKey, connection]);

  // --- 3. MARKET DATA ---
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await res.json();
        setMarketPrice(data.solana.usd);
        if (orderType === 'market') setPrice(data.solana.usd.toString());
      } catch (e) { console.error("Price fetch failed", e); }
    };
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [orderType]);

  // --- 4. FETCH ORDERBOOK STATS ---
  useEffect(() => {
    if (wallet.publicKey) {
      const fetchStats = async () => {
  try {
    const program = getProgram(connection, wallet as any);
    const client = new ObsidianClient(program, wallet.publicKey!);
    const book = await (program.account as any).darkPoolOrderBook.fetch(client.darkPoolPda);
    setTotalOrders(book.totalOrders.toNumber());
  } catch (e) { console.log("Pool not initialized"); }
};
      fetchStats();
    }
  }, [wallet.publicKey, connection]);

  const handleAirdrop = async () => {
    if (!wallet.publicKey) return;
    setIsAirdropping(true);
    try {
      const sig = await connection.requestAirdrop(wallet.publicKey, 5 * 1e9);
      await connection.confirmTransaction(sig, 'confirmed');
      addLog("System Airdrop Received: +5 SOL");
    } catch (e) { console.error(e); }
    setIsAirdropping(false);
  };
  const handleSubmit = async () => {
    if (!wallet.publicKey || !amount || !price) return;

    try {
      setIsProcessing(true);
      setStep(1);
      setLogs([]);
      addLog("[Obsidian] Initializing Secure Enclave...");

      const program = getProgram(connection, wallet as any);
      const client = new ObsidianClient(program, wallet.publicKey);
      const orderId = new BN(Date.now()).add(new BN(Math.floor(Math.random() * 100000)));
      console.log("New Order ID generated:", orderId.toString());

      // STEP 1: PROVE (Noir)
      addLog(`[Obsidian] Generating ZK Proof for ${amount} SOL...`);
      const proofInput = {
        order_amount: Math.floor(Number(amount) * 1e9).toString(),
        order_price: Math.floor(Number(price) * 100).toString(),
        user_balance: Math.floor(balance * 1e9).toString(),
        min_order_size: "100000",
        max_order_size: "1000000000000",
        min_price: "1",
        max_price: "1000000",
      };
      
      const proof = await generateZKProof(proofInput, CIRCUIT_TYPES.DARK_POOL);
      addLog("[Obsidian] Proof Generated. Requesting Signatures...");
      setStep(2);
      await client.uploadProof(proof, orderId, true);
      addLog("[Obsidian] Proof Bundle Confirmed on-chain.");
      setStep(3);
      addLog("[Obsidian] Encrypting sensitive order data...");
      const rawData = new TextEncoder().encode(JSON.stringify({ amount, price, type: orderType }));
      const encryptedData = await client.mockEncrypt(rawData);

      // STEP 4: SUBMIT (Finalize)
      addLog("[Obsidian] Finalizing Order Commitment... & Locking Assets...");
      
      const tx = await program.methods
        .submitEncryptedOrder(orderId, Buffer.from(encryptedData))
        .accounts({
          orderBook: client.darkPoolPda,
          order: client.getOrderPda(orderId),
          proofAccount: client.getProofPda(orderId),
          user: wallet.publicKey,
        })
        .transaction();
      const lamportsToLock = new BN(Number(amount) * 1e9);
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: client.darkPoolPda, 
        lamports: BigInt(lamportsToLock.toString()),
      });
      tx.add(transferInstruction);
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      const signature = await program.provider.sendAndConfirm!(tx, [], {
        commitment: 'confirmed',
        skipPreflight: true,
      });

      setTxHash(signature);
      setStep(4);
      addLog(`[Obsidian] Success! ${amount} SOL locked in Dark Pool.`);
      
      const slot = await connection.getSlot();
      const newTx = {
        sig: signature,
        slot: slot,
        type: 'Encrypted Sell Order',
        age: 'Just now',
        status: 'Success'
      };
      setRecentTxns(prev => [newTx, ...prev]);
      const book = await (program.account as any).darkPoolOrderBook.fetch(client.darkPoolPda);
      setTotalOrders(book.totalOrders.toNumber());

    } catch (error: any) {
      console.error(error);
      const msg = error.message || "Transaction failed";
      
      if (msg.includes("User rejected") || msg.includes("Signature request denied")) {
        addLog(" Action Cancelled by User");
      } else {
        addLog(` Error: ${msg.slice(0, 30)}...`);
      }
      
      setIsProcessing(false);
      setStep(0);
    }
  };

  const handleReset = () => {
    setIsProcessing(false);
    setStep(0);
    setAmount('');
    if (orderType === 'market') setPrice(marketPrice.toString());
    else setPrice('');
  };

const handleSettle = async () => {
    if (!wallet.publicKey) return;
    try {
      setIsSettling(true);
      addLog("[Node] initiating Batch Settlement Protocol...");
      const program = getProgram(connection, wallet as any);
      const client = new ObsidianClient(program, wallet.publicKey);
      const book = await (program.account as any).darkPoolOrderBook.fetch(client.darkPoolPda);
      const currentBatch = book.nextBatchId.sub(new BN(1)); 
      
      if (currentBatch.lt(new BN(0))) {
        addLog("[Node] No active batches to settle.");
        setIsSettling(false);
        return;
      }
      const signature = await client.settleBatch(currentBatch, marketPrice);
      addLog(`[Node] Batch #${currentBatch.toString()} Settled Successfully!`);
      addLog("[Obsidian] Trades have been cleared on-chain.");
      const currentSlot = await connection.getSlot();
      setRecentTxns(prev => [{
        sig: signature, 
        slot: currentSlot,
        type: 'BATCH CLEARED',
        age: 'Just now',
        status: 'Success',
        highlight: true
      }, ...prev]);

    } catch (e: any) {
      console.error(e);
      addLog(`[Node Error] ${e.message}`);
    }
    setIsSettling(false);
  };

  return (
    <div className="min-h-screen pt-28 pb-12 px-4 relative">
      <div className="container mx-auto max-w-7xl relative z-10">
        
        {/* HEADER */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.05)] text-[#d4af37] text-xs font-bold tracking-widest uppercase mb-6">
            <Lock className="w-3 h-3" />
            Institutional Grade Privacy
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-[#f5f5f5] mb-4">
            Dark Pool <span className="text-gold-gradient">Exchange</span>
          </h1>
          <p className="text-[#a0a0a0] max-w-2xl mx-auto text-lg">
            Zero-slippage block trades secured by ZK-SNARKs. 
            <br className="hidden md:block"/>
            Your positions remain invisible to MEV bots.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          
          {/* LEFT COLUMN: Data & Tools */}
          <div className="lg:col-span-4 space-y-6">
            <div className="luxury-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f5f5f5]">SOL / USDC</h3>
                  <p className="text-xs text-[#707070]">Oracle Price</p>
                </div>
              </div>
              <div className="text-3xl font-bold font-mono text-[#f5f5f5]">
                ${marketPrice.toFixed(2)}
              </div>
            </div>

            <div className="luxury-card p-6 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#f5f5f5]">Your Balance</h3>
                    <p className="text-xs text-[#707070]">Available Collateral</p>
                  </div>
                </div>
                {balance < 10 && (
                  <button 
                    onClick={handleAirdrop}
                    disabled={isAirdropping}
                    className="text-xs bg-[#d4af37] text-black px-3 py-1 rounded font-bold hover:bg-[#e8c547] flex items-center gap-1 transition-colors"
                  >
                    {isAirdropping ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3" />}
                    Faucet
                  </button>
                )}
              </div>
              <div className="text-3xl font-bold font-mono text-[#f5f5f5]">
                {balance.toFixed(4)} <span className="text-sm text-[#707070]">SOL</span>
              </div>
            </div>

            <div className="luxury-card p-6">
               <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37]">
                  <Book className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f5f5f5]">Dark Orderbook</h3>
                  <p className="text-xs text-[#707070]">Total Private Positions</p>
                </div>
              </div>
              <div className="text-3xl font-bold font-mono text-[#f5f5f5]">
                {totalOrders}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Trading Interface */}
          <div className="lg:col-span-8">
            <div className="luxury-card p-8 h-full relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#d4af37]/5 rounded-full blur-[100px] pointer-events-none" />

              {!wallet.publicKey ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                  <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-[#333]">
                    <EyeOff className="w-8 h-8 text-[#555]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Private Access Only</h3>
                    <p className="text-[#707070] max-w-sm mx-auto">Connect your wallet to generate Zero-Knowledge proofs and access the dark pool.</p>
                  </div>
                  <WalletMultiButton />
                </div>
              ) : isProcessing ? (
                <div className="h-full flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center mb-8 border-b border-[#333] pb-6">
                    <h2 className="text-xl font-bold text-[#f5f5f5] flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#d4af37] animate-pulse" />
                      Securing Transaction
                    </h2>
                    <span className="text-xs font-mono text-[#707070]">ID: {Date.now().toString().slice(-8)}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-grow">
                    <div className="space-y-8 py-4">
                      <StatusStep current={step} step={1} label="Generating ZK Proof (Noir)" />
                      <StatusStep current={step} step={2} label="Upload Encrypted Chunks" />
                      <StatusStep current={step} step={3} label="Encrypting Order Data" />
                      <StatusStep current={step} step={4} label="Verifying On-Chain" />
                    </div>

                    <div className="bg-[#050505] rounded-xl border border-[#333] p-4 font-mono text-xs flex flex-col shadow-inner">
                      <div className="text-[#555] uppercase tracking-widest font-bold mb-3 border-b border-[#222] pb-2">
                        Client Operations
                      </div>
                      <div className="flex-grow space-y-2 overflow-y-auto">
                        {logs.map((log, i) => (
                          <div key={i} className="flex gap-2 animate-fade-in">
                            <span className="text-[#d4af37]">➜</span>
                            <span className="text-[#a0a0a0]">{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {step === 4 && (
                    <div className="mt-8 text-center animate-fade-in">
                      <div className="mb-4 text-green-500 font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Order Confirmed
                      </div>
                      <div className="flex justify-center gap-4">
                        <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-xs text-[#d4af37] hover:underline">
                          View on Explorer
                        </a>
                        <button onClick={handleReset} className="text-xs text-white hover:text-[#d4af37]">
                          Place New Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">New Order</h2>
                    <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#333]">
                      <button onClick={() => setOrderType('limit')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${orderType === 'limit' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-[#707070] hover:text-white'}`}>Limit</button>
                      <button onClick={() => { setOrderType('market'); if (marketPrice > 0) setPrice(marketPrice.toString()); }} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${orderType === 'market' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-[#707070] hover:text-white'}`}>Market</button>
                    </div>
                  </div>

                  <div className="space-y-8 flex-grow">
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-[#707070] font-bold ml-1">Amount to Sell</label>
                      <div className="relative group">
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#0a0a0a] border border-[#333] rounded-2xl p-5 pr-16 text-2xl font-mono text-white focus:outline-none focus:border-[#d4af37] focus:shadow-[0_0_30px_-5px_rgba(212,175,55,0.15)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#707070] font-bold text-sm">SOL</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-[#707070] font-bold ml-1">Limit Price (USDC)</label>
                      <div className="relative group">
                        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" disabled={orderType === 'market'} className={`w-full bg-[#0a0a0a] border border-[#333] rounded-2xl p-5 pr-20 text-2xl font-mono text-white focus:outline-none focus:border-[#d4af37] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${orderType === 'market' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#707070] font-bold text-sm">USDC</span>
                      </div>
                    </div>

                    <div className="bg-[#d4af37]/5 border border-[#d4af37]/10 rounded-xl p-4 flex justify-between items-center">
                      <span className="text-sm text-[#a0a0a0]">Estimated Value</span>
                      <span className="text-lg font-bold font-mono text-[#f5f5f5]">
                        {amount && price ? (Number(amount) * Number(price)).toLocaleString('en-US', {style:'currency', currency:'USD'}) : '$0.00'}
                      </span>
                    </div>
                  </div>

                  <button onClick={handleSubmit} disabled={!amount || !price || Number(amount) <= 0} className="w-full mt-8 py-5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#e8c547] hover:to-[#d4af37] text-black font-bold text-lg rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.2)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]">
                    <Lock className="w-5 h-5" />
                    {orderType === 'market' ? 'Place Market Order' : 'Place Limit Order'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="luxury-card p-6 animate-fade-in border-t border-[#d4af37]/20">
          <div className="flex items-center gap-2 mb-6 border-b border-[#222] pb-4">
             <Activity className="w-4 h-4 text-[#d4af37]" />
             <h3 className="text-sm font-bold text-[#f5f5f5] uppercase tracking-widest">Live Encrypted Feed</h3>
             <div className="ml-auto flex items-center gap-2 text-xs text-[#707070]">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               Devnet
             </div>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 pb-2 text-[10px] uppercase font-bold text-[#555] px-2">
                <div className="col-span-5">Transaction Signature</div>
                <div className="col-span-2">Block</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-1">Status</div>
              </div>
              
              {/* Rows */}
              <div className="space-y-1">
                {recentTxns.length === 0 ? (
                  <div className="text-center py-4 text-[#333] italic text-xs">Waiting for incoming signals...</div>
                ) : (
                  recentTxns.map((tx, i) => (
                    <ExplorerRow 
                      key={i}
                      signature={tx.sig}
                      slot={tx.slot}
                      type={tx.type}
                      age={tx.age}
                      status={tx.status}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
                <div className="mt-12 p-1 border-t border-[#333] pt-8 pb-20">
           <div className="flex flex-col items-center justify-center space-y-4 opacity-70 hover:opacity-100 transition-opacity">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#555] font-bold">
                [ Hackathon Demo Controls ]
              </div>
              
              <button 
                onClick={handleSettle}
                disabled={isSettling}
                className="group relative px-6 py-2 bg-[#1a1a1a] border border-[#333] hover:border-[#d4af37] rounded text-xs font-mono text-[#707070] hover:text-[#d4af37] transition-all"
              >
                {isSettling ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin"/> Running Solver...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Activity className="w-3 h-3 group-hover:animate-pulse" /> 
                    Trigger Batch Settlement
                  </span>
                )}
              </button>
              
              <p className="text-[10px] text-[#444] max-w-md text-center">
                * In Mainnet, this step is performed automatically by the decentralized MPC network. 
                For this demo, I am acting as the Node Operator to clear the orderbook.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}