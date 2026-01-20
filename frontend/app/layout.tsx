import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StarfieldBackground from "@/components/ui/StarfieldBackground";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import Navigation from "@/components/layout/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OBSIDIAN Protocol - MEV-Resistant Dark Pool",
  description: "Private lending and dark pool trading on Solana with zero-knowledge proofs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <StarfieldBackground />
          <Navigation />
          <main className="relative min-h-screen">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}