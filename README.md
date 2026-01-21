# OBSIDIAN PROTOCOL

> The Invisible Order Book for Solana.
> Institutional-grade privacy, MEV resistance, and sealed-bid liquidations powered by Zero-Knowledge proofs.

![License](https://img.shields.io/badge/license-MIT-blue)
![Network](https://img.shields.io/badge/solana-devnet-green)
![Status](https://img.shields.io/badge/status-live-orange)

## The Problem

Public blockchains force a trade-off: Transparency vs. Strategy.

* **MEV & Front-running:** High-frequency trading bots observe large pending orders in the mempool and "sandwich-attack" them.
* **Strategy Leakage:** Institutions cannot enter DeFi markets because their positions and wallet balances are fully visible.
* **Predatory Liquidations:** Lending protocols reveal exact liquidation prices, allowing attackers to force liquidations.

## The Solution: Obsidian

Obsidian is a privacy-preserving DeFi protocol built on Solana. It utilizes **Client-Side Zero-Knowledge Proofs (Noir)** to verify trade validity without revealing the trade amount, direction, or price to the public network.

---

## Tech Stack

* **Blockchain:** Solana (Devnet)
* **Smart Contracts:** Anchor Framework (Rust)
* **Frontend:** Next.js 14, TypeScript, Tailwind CSS
* **Privacy Engine:** Noir (ZK-SNARKs)

---

## Getting Started

Follow these instructions to run the Obsidian monorepo locally.

### Prerequisites
* Node.js (v18+)
* Rust & Cargo
* Solana CLI
* Anchor CLI
* **Nargo (Noir CLI)** - [Install Guide](https://noir-lang.org/docs/getting_started/installation/)
  ```bash
  curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
  noirup
  ```

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/mishop-15/obsidian.git
cd obsidian
```

### 2. Compile ZK Circuits (Crucial Step)

Before running the app, you must compile the Noir circuits to generate the proof artifacts.

```bash
cd circuits/obsidian_circuits
nargo compile
cd ../..
```

### 3. Run the Frontend (App)

The frontend handles all ZK-Proof generation using the compiled circuits.

```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000 to view the application.

### 4. Run the Backend (Smart Contracts)

*Note: The program is currently deployed to Solana Devnet.*

To run local tests or redeploy:
```bash
cd obsidian_protocol
anchor build
anchor test
```

---

## How to Test (Demo Flow)

### Scenario A: The Dark Pool
1.  Navigate to **/darkpool**.
2.  Deposit SOL into your Shielded Balance.
3.  Place a **Limit Order** (e.g., Sell 1 SOL @ 50).
4.  Observe that the order appears in the "Active Orders" list, but the specific details (Amount/Price) are masked to external observers.

### Scenario B: Fair Auctions (Anti-MEV)
1.  Navigate to **/auction**.
2.  Identify an active "Distressed Asset" card.
3.  Enter a bid amount (e.g., 1.5 SOL).
4.  Click **"Place Sealed Bid"**.
5.  The bid is encrypted locally and submitted on-chain. The UI reflects a successful transaction, but the "Current Top Bid" remains hidden (`???.??`).

### Scenario C: Providing Liquidity
1.  Navigate to **/lending**.
2.  Deposit SOL to earn yield.
3.  Refresh the page to verify that the "Staked Balance" persists.

---

## License
This project is open-source under the MIT License.
