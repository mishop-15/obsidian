use anchor_lang::prelude::*;

mod constants;
mod errors;
mod state;
mod instructions;
mod contexts;

pub use constants::*;
//pub use errors::*;
pub use state::*;
pub use contexts::*;

declare_id!("GbEuxhGpP1iy7YouyvfrDPEKk6pHZhZ8oT5oxLMvbGQ3");

#[program]
pub mod obsidian_protocol {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>, bump: u8) -> Result<()> {
        instructions::initialize_pool(ctx, bump)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, proof_data: Vec<u8>) -> Result<()> {
        instructions::deposit(ctx, amount, proof_data)
    }

    pub fn borrow(ctx: Context<Borrow>, amount: u64, ltv_proof: Vec<u8>) -> Result<()> {
        instructions::borrow(ctx, amount, ltv_proof)
    }

    pub fn liquidate(ctx: Context<Liquidate>, liquidation_proof: Vec<u8>) -> Result<()> {
        instructions::liquidate(ctx, liquidation_proof)
    }

    pub fn initialize_dark_pool(ctx: Context<InitializeDarkPool>, bump: u8) -> Result<()> {
        instructions::initialize_dark_pool(ctx, bump)
    }

    pub fn create_proof_account(ctx: Context<CreateProofAccount>, order_id: u64) -> Result<()> {
        instructions::create_proof_account(ctx, order_id)
    }

    pub fn store_order_proof(
        ctx: Context<StoreProof>,
        chunk: Vec<u8>,
        is_order_proof: bool,
    ) -> Result<()> {
        instructions::store_order_proof(ctx, chunk, is_order_proof)
}

    pub fn submit_encrypted_order(
        ctx: Context<SubmitOrder>,
    order_id: u64,
    encrypted_data: Vec<u8>,
    ) -> Result<()> {
        instructions::submit_encrypted_order(ctx, order_id, encrypted_data)
    }

    pub fn batch_match_orders(
    ctx: Context<BatchMatch>,
        batch_id: u64,
        settlement_price: u64,
    ) -> Result<()> {
        instructions::batch_match_orders(ctx, batch_id, settlement_price)
    }

    pub fn start_liquidation_auction(
    ctx: Context<StartAuction>,
    auction_id: u64,
        collateral_amount: u64,
        minimum_bid: u64,
        duration: u64,
        bump: u8,
    ) -> Result<()> {
        instructions::start_liquidation_auction(
            ctx,
            auction_id,
            collateral_amount,
            minimum_bid,
            duration,
            bump,
        )
    }
    pub fn submit_encrypted_bid(
        ctx: Context<SubmitBid>,
        auction_id: u64,
        encrypted_bid: Vec<u8>,
        bid_proof: Vec<u8>,
    ) -> Result<()> {
        instructions::submit_encrypted_bid(ctx, auction_id, encrypted_bid, bid_proof)
    }

    pub fn settle_auction(ctx: Context<SettleAuction>, winning_bid_amount: u64) -> Result<()> {
        instructions::settle_auction(ctx, winning_bid_amount)
    }
}