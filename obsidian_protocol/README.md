# OBSIDIAN Protocol

**MEV-resistant dark pool on Solana with private lending and encrypted liquidation auctions.**

## What is OBSIDIAN?

A Solana program that combines:
- **Dark Pool Trading** - Submit encrypted orders with ZK proofs to prevent front-running
- **Private Lending** - Deposit, borrow, and liquidate with privacy
- **MEV-Resistant Auctions** - Fair liquidations with encrypted bids

## Quick Setup

### Prerequisites

Install these in order:

```bash
# 1. Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 3. Anchor (v0.32.1)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.32.1
avm use 0.32.1

# 4. Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g yarn

# 5. Noir (ZK circuits)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# 6. ZK Proof Parameters (one-time, ~500MB)
mkdir -p ~/.bb-crs
curl -L -o ~/.bb-crs/bn254_g1_data https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/monomial/transcript00.dat
curl -L -o ~/.bb-crs/bn254_g2_data https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/g2.dat
```

### Installation

```bash
# Clone and setup
git clone https://github.com/mishop-15/obsidian.git
cd obsidian/obsidian_protocol
yarn install

# Configure Solana
solana config set --url devnet
solana-keygen new
solana airdrop 2

# Compile circuits
cd circuits/obsidian_circuits
nargo compile
cd ../..
```

### Build & Test

```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy

# Run tests
anchor test
```

## Project Structure

```
obsidian_protocol/
├── programs/obsidian_protocol/src/
│   ├── lib.rs           # Entry point
│   ├── constants.rs     # PDA seeds
│   ├── errors.rs        # Error types
│   ├── state.rs         # Account structures
│   ├── contexts.rs      # Account validation
│   └── instructions.rs  # Business logic
├── circuits/obsidian_circuits/src/
│   └── main.nr          # ZK circuits
└── tests/
    └── obsidian_protocol.ts
```

## Key Features

- **Zero-Knowledge Proofs**: Prove order validity without revealing amounts
- **MEV Protection**: Orders encrypted until batch settlement
- **Institutional Ready**: Compliance proofs with privacy
- **Chunked Storage**: Handles large ZK proofs efficiently

## Troubleshooting

```bash
# Need more SOL
solana airdrop 2

# Anchor version mismatch
yarn upgrade @coral-xyz/anchor@0.32.1

# Missing ZK parameters
ls ~/.bb-crs/  # Should show bn254_g1_data and bn254_g2_data
```

## Program ID

`GbEuxhGpP1iy7YouyvfrDPEKk6pHZhZ8oT5oxLMvbGQ3` (Devnet)

## License

MIT
