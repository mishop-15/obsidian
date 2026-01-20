'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Shield } from 'lucide-react';

const ROUTES = [
  { href: '/', label: 'Home' },
  { href: '/lending', label: 'Lending' },
  { href: '/darkpool', label: 'Dark Pool' },
  { href: '/auction', label: 'Auctions' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
              <Shield className="h-6 w-6 text-obsidian-primary" />
              OBSIDIAN
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {ROUTES.map((route) => {
                const isActive = pathname === route.href;
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {route.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}