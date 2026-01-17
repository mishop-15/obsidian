use anchor_lang::prelude::*;

#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub bump: u8,
    pub total_deposits: u64,
    pub total_borrowed: u64,
}

#[account]
pub struct UserLoan {
    pub owner: Pubkey,
    pub collateral_amount: u64,
    pub collateral_encrypted: Vec<u8>,
    pub borrowed: u64,
    pub ltv_proof: Vec<u8>,
    pub liquidation_proof: Vec<u8>,
    pub liquidated: bool,
    pub deposit_timestamp: i64,
}

#[account]
pub struct DarkPoolOrderBook {
    pub authority: Pubkey,
    pub total_orders: u64,
    pub next_batch_id: u64,
    pub bump: u8,
}

#[account]
pub struct ProofAccount {
    pub owner: Pubkey,
    pub order_id: u64,
    pub order_proof: Vec<u8>,
    pub compliance_proof: Vec<u8>,
}

#[account]
pub struct EncryptedOrder {
    pub owner: Pubkey,
    pub order_id: u64,
    pub encrypted_data: Vec<u8>,
    pub proof_account: Pubkey,
    pub timestamp: i64,
    pub settled: bool,
    pub batch_id: u64,
}

#[account]
pub struct LiquidationAuction {
    pub position_owner: Pubkey,
    pub auction_id: u64,
    pub collateral_amount: u64,
    pub minimum_bid: u64,
    pub start_time: i64,
    pub duration: u64,
    pub settled: bool,
    pub winning_bidder: Pubkey,
    pub winning_bid: u64,
    pub bump: u8,
}

#[account]
pub struct EncryptedBid {
    pub bidder: Pubkey,
    pub auction_id: u64,
    pub encrypted_bid: Vec<u8>,
    pub bid_proof: Vec<u8>,
    pub timestamp: i64,
}