import Link from 'next/link';
import { Shield, ArrowRight, Code2, Layers, Lock, Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const FEATURES = [
  {
    iconName: 'lock' as const,
    title: 'Dark Pool Trading',
    subtitle: 'INSTITUTIONAL TRADING',
    href: '/darkpool',
    badge: 'LIVE'
  },
  {
    iconName: 'shield' as const,
    title: 'Private Lending',
    subtitle: 'COLLATERAL PRIVACY',
    href: '/lending',
    badge: 'ACTIVE'
  },
  {
    iconName: 'zap' as const,
    title: 'Fair Auctions',
    subtitle: 'MEV RESISTANT',
    href: '/auction',
    badge: 'BETA'
  },
];

const ARCHITECTURE = [
  {
    icon: Lock,
    label: 'Client-Side Proofs',
    value: 'Noir ZK-SNARKs',
    description: 'Generate validity proofs locally without revealing order details or balances'
  },
  {
    icon: Code2,
    label: 'On-Chain Verification',
    value: 'Solana Programs',
    description: 'Smart contracts verify proofs and store encrypted orders in PDA accounts'
  },
  {
    icon: Layers,
    label: 'Encrypted Settlement',
    value: 'Batch Processing',
    description: 'Orders matched off-chain in batches, preventing MEV extraction'
  },
  {
    icon: Eye,
    label: 'Selective Disclosure',
    value: 'Compliance Layer',
    description: 'Prove regulatory requirements met without exposing sensitive data'
  }
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center">
      
      {/* HERO SECTION */}
      <section className="relative z-10 container mx-auto px-4 pt-40 pb-20 text-center animate-fade-in">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#d4af37]/20 bg-[#d4af37]/5 text-xs font-medium text-[#d4af37] tracking-wider uppercase mb-8 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
          </span>
          Devnet Live
        </div>

        <h1 className="text-6xl md:text-7xl font-bold text-[#f5f5f5] tracking-tight mb-8 drop-shadow-2xl">
          The Invisible
          <br />
          <span className="text-gold-gradient">
            Order Book
          </span>
        </h1>
        
        <p className="text-xl text-[#a0a0a0] max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Institutional-grade privacy for Solana. Prevent front-running and MEV 
          with client-side Zero Knowledge proofs.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/darkpool">
            <Button size="lg" variant="primary" className="w-full sm:w-auto min-w-[160px]">
              Launch App
            </Button>
          </Link>
          <a
            href="https://github.com/mishop-15/obsidian"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[160px] group">
              View Code
              <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="container mx-auto px-4 mb-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#f5f5f5] mb-4">Core Features</h2>
          <p className="text-[#a0a0a0] max-w-2xl mx-auto">
            Three privacy-first primitives for institutional DeFi on Solana
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((feature) => (
            <Link key={feature.title} href={feature.href} className="block">
              <Card 
                variant="feature"
                iconName={feature.iconName}
                title={feature.title}
                subtitle={feature.subtitle}
                badge={feature.badge}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS - Architecture explained as user flow */}
      <section className="container mx-auto px-4 mb-24 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-sm font-bold text-[#d4af37] uppercase tracking-widest mb-3">How Privacy Works</h2>
          <p className="text-[#a0a0a0] text-lg max-w-2xl mx-auto">
            From proof generation to settlement, every step protects your trading intent
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ARCHITECTURE.map((tech, index) => {
            const Icon = tech.icon;
            return (
              <div 
                key={tech.label}
                className="luxury-card p-6 text-center group hover:border-[#d4af37]/30 transition-all duration-300 relative"
              >
                {/* Step Number */}
                <div className="absolute -top-3 left-6 h-6 w-6 rounded-full bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                
                <div className="h-12 w-12 rounded-full bg-[#d4af37]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#d4af37]/20 transition-colors">
                  <Icon className="h-5 w-5 text-[#d4af37]" />
                </div>
                <h3 className="text-xs uppercase tracking-wider text-[#707070] mb-2 font-medium">
                  {tech.label}
                </h3>
                <div className="text-sm font-bold text-[#f5f5f5] mb-2">
                  {tech.value}
                </div>
                <p className="text-xs text-[#a0a0a0] leading-relaxed">
                  {tech.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* WHY OBSIDIAN */}
      <section className="container mx-auto px-4 mb-24 max-w-4xl">
        <div className="luxury-card p-8 md:p-12">
          <h2 className="text-2xl font-bold text-[#f5f5f5] mb-6 text-center">
            Why <span className="text-gold-gradient">OBSIDIAN</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-[#a0a0a0] leading-relaxed">
            <div>
              <h3 className="text-[#d4af37] font-bold mb-3 uppercase tracking-wider text-xs">The Problem</h3>
              <p className="mb-4">
                Traditional DeFi exposes every action on-chain. MEV bots extract billions by front-running large orders. 
                Institutional players cannot participate without revealing their strategy to competitors.
              </p>
              <p>
                Lending protocols expose exact collateral positions, making users vulnerable to targeted liquidations 
                when prices approach thresholds.
              </p>
            </div>
            
            <div>
              <h3 className="text-[#d4af37] font-bold mb-3 uppercase tracking-wider text-xs">Our Solution</h3>
              <p className="mb-4">
                OBSIDIAN uses Zero-Knowledge proofs to verify order validity without revealing amounts or prices. 
                Orders are encrypted until batch settlement, eliminating front-running opportunities.
              </p>
              <p>
                Selective disclosure allows compliance (prove you&apos;re KYC&apos;d) while maintaining privacy 
                (hide your net worth and liquidation points).
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}