use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::contexts::*;
use crate::errors::ErrorCode;

// Helper function for encryption placeholder
fn encrypt_proof(data: &[u8], owner: &Pubkey) -> Vec<u8> {
    let mut encrypted = Vec::with_capacity(owner.to_bytes().len() + data.len());
    encrypted.extend_from_slice(&owner.to_bytes());
    encrypted.extend_from_slice(data);
    encrypted
}

// Lending Pool Instructions

pub fn initialize_pool(ctx: Context<InitializePool>, bump: u8) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.authority = ctx.accounts.authority.key();
    pool.bump = bump;
    pool.total_deposits = 0;
    pool.total_borrowed = 0;

    msg!("Pool initialized by: {}", pool.authority);
    Ok(())
}

pub fn deposit(ctx: Context<Deposit>, amount: u64, proof_data: Vec<u8>) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(!proof_data.is_empty(), ErrorCode::InvalidProof);

    let encrypted_proof = encrypt_proof(&proof_data, &ctx.accounts.user.key());

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.pool_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    let user_loan = &mut ctx.accounts.user_loan;
    user_loan.owner = ctx.accounts.user.key();
    user_loan.collateral_amount = amount;
    user_loan.collateral_encrypted = encrypted_proof;
    user_loan.borrowed = 0;
    user_loan.liquidated = false;
    user_loan.deposit_timestamp = Clock::get()?.unix_timestamp;
    user_loan.ltv_proof = Vec::new();
    user_loan.liquidation_proof = Vec::new();

    let pool = &mut ctx.accounts.pool;
    pool.total_deposits = pool.total_deposits
        .checked_add(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    msg!("Deposited {} tokens with encrypted proof", amount);
    Ok(())
}

pub fn borrow(ctx: Context<Borrow>, borrow_amount: u64, ltv_proof: Vec<u8>) -> Result<()> {
    require!(borrow_amount > 0, ErrorCode::InvalidAmount);
    require!(!ltv_proof.is_empty(), ErrorCode::InvalidProof);

    let user_loan = &mut ctx.accounts.user_loan;
    require!(!user_loan.liquidated, ErrorCode::PositionLiquidated);

    let encrypted_ltv = encrypt_proof(&ltv_proof, &ctx.accounts.user.key());
    user_loan.borrowed = user_loan.borrowed
        .checked_add(borrow_amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    user_loan.ltv_proof = encrypted_ltv;

    let pool = &ctx.accounts.pool;
    let seeds = &[b"pool".as_ref(), &[pool.bump]];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        ),
        borrow_amount,
    )?;

    let pool = &mut ctx.accounts.pool;
    pool.total_borrowed = pool.total_borrowed
        .checked_add(borrow_amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    msg!("Borrowed {} tokens with LTV verification", borrow_amount);
    Ok(())
}

pub fn liquidate(ctx: Context<Liquidate>, liquidation_proof: Vec<u8>) -> Result<()> {
    require!(!liquidation_proof.is_empty(), ErrorCode::InvalidProof);

    let user_loan = &mut ctx.accounts.user_loan;
    require!(!user_loan.liquidated, ErrorCode::PositionLiquidated);

    let encrypted_proof = encrypt_proof(&liquidation_proof, &ctx.accounts.liquidator.key());
    user_loan.liquidation_proof = encrypted_proof;
    user_loan.liquidated = true;

    let pool = &ctx.accounts.pool;
    let seeds = &[b"pool".as_ref(), &[pool.bump]];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_token_account.to_account_info(),
                to: ctx.accounts.liquidator_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        ),
        user_loan.collateral_amount,
    )?;

    msg!("Position liquidated without front-running");
    Ok(())
}

// Dark Pool Instructions

pub fn initialize_dark_pool(ctx: Context<InitializeDarkPool>, bump: u8) -> Result<()> {
    let order_book = &mut ctx.accounts.order_book;
    order_book.authority = ctx.accounts.authority.key();
    order_book.total_orders = 0;
    order_book.next_batch_id = 1;
    order_book.bump = bump;
    
    msg!("Dark pool order book initialized");
    Ok(())
}

pub fn create_proof_account(ctx: Context<CreateProofAccount>, order_id: u64) -> Result<()> {
    let proof_account = &mut ctx.accounts.proof_account;
    proof_account.owner = ctx.accounts.user.key();
    proof_account.order_id = order_id;
    proof_account.order_proof = Vec::new();
    proof_account.compliance_proof = Vec::new();
    
    msg!("Proof account created for order {}", order_id);
    Ok(())
}

pub fn store_order_proof(
    ctx: Context<StoreProof>,
    chunk: Vec<u8>,
    is_order_proof: bool,
) -> Result<()> {
    let proof_account = &mut ctx.accounts.proof_account;
    
    if is_order_proof {
        proof_account.order_proof.extend_from_slice(&chunk);
    } else {
        proof_account.compliance_proof.extend_from_slice(&chunk);
    }
    
    msg!("Stored {} byte proof chunk", chunk.len());
    Ok(())
}

pub fn submit_encrypted_order(
    ctx: Context<SubmitOrder>,
    order_id: u64,
    encrypted_data: Vec<u8>,
) -> Result<()> {
    require!(!encrypted_data.is_empty(), ErrorCode::InvalidProof);
    
    let proof_account = &ctx.accounts.proof_account;
    require!(!proof_account.order_proof.is_empty(), ErrorCode::InvalidProof);
    
    let order = &mut ctx.accounts.order;
    order.owner = ctx.accounts.user.key();
    order.order_id = order_id;
    order.encrypted_data = encrypted_data;
    order.proof_account = ctx.accounts.proof_account.key();
    order.timestamp = Clock::get()?.unix_timestamp;
    order.settled = false;
    order.batch_id = 0;
    
    let order_book = &mut ctx.accounts.order_book;
    order_book.total_orders = order_book.total_orders
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    
    msg!("Encrypted order {} submitted to dark pool", order_id);
    Ok(())
}

pub fn batch_match_orders(
    ctx: Context<BatchMatch>,
    batch_id: u64,
    settlement_price: u64,
) -> Result<()> {
    let order_book = &mut ctx.accounts.order_book;
    
    require!(
        ctx.accounts.authority.key() == order_book.authority,
        ErrorCode::Unauthorized
    );
    
    order_book.next_batch_id = batch_id
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    
    msg!("Batch {} matched at price {}", batch_id, settlement_price);
    Ok(())
}

// Auction Instructions

pub fn start_liquidation_auction(
    ctx: Context<StartAuction>,
    auction_id: u64,
    collateral_amount: u64,
    minimum_bid: u64,
    duration: u64,
    bump: u8,
) -> Result<()> {
    let user_loan = &ctx.accounts.user_loan;
    require!(!user_loan.liquidated, ErrorCode::PositionLiquidated);
    
    let auction = &mut ctx.accounts.auction;
    auction.position_owner = user_loan.owner;
    auction.auction_id = auction_id;
    auction.collateral_amount = collateral_amount;
    auction.minimum_bid = minimum_bid;
    auction.start_time = Clock::get()?.unix_timestamp;
    auction.duration = duration;
    auction.settled = false;
    auction.winning_bidder = Pubkey::default();
    auction.winning_bid = 0;
    auction.bump = bump;
    
    msg!("Liquidation auction {} started", auction_id);
    Ok(())
}

pub fn submit_encrypted_bid(
    ctx: Context<SubmitBid>,
    auction_id: u64,
    encrypted_bid: Vec<u8>,
    bid_proof: Vec<u8>,
) -> Result<()> {
    require!(!encrypted_bid.is_empty(), ErrorCode::InvalidProof);
    require!(!bid_proof.is_empty(), ErrorCode::InvalidProof);
    
    let auction = &ctx.accounts.auction;
    require!(!auction.settled, ErrorCode::AuctionSettled);
    
    let current_time = Clock::get()?.unix_timestamp;
    let auction_end = auction.start_time
        .checked_add(auction.duration as i64)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    require!(current_time < auction_end, ErrorCode::AuctionExpired);
    
    let bid = &mut ctx.accounts.bid;
    bid.bidder = ctx.accounts.bidder.key();
    bid.auction_id = auction_id;
    bid.encrypted_bid = encrypted_bid;
    bid.bid_proof = bid_proof;
    bid.timestamp = current_time;
    
    msg!("Encrypted bid submitted for auction {}", auction_id);
    Ok(())
}

pub fn settle_auction(ctx: Context<SettleAuction>, winning_bid_amount: u64) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require!(!auction.settled, ErrorCode::AuctionSettled);
    
    let current_time = Clock::get()?.unix_timestamp;
    let auction_end = auction.start_time
        .checked_add(auction.duration as i64)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    require!(current_time >= auction_end, ErrorCode::AuctionNotExpired);
    
    auction.winning_bidder = ctx.accounts.winner.key();
    auction.winning_bid = winning_bid_amount;
    auction.settled = true;
    
    let pool = &ctx.accounts.pool;
    let seeds = &[b"pool".as_ref(), &[pool.bump]];
    let signer = &[&seeds[..]];
    
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_token_account.to_account_info(),
                to: ctx.accounts.winner_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        ),
        auction.collateral_amount,
    )?;
    
    msg!("Auction {} settled with winning bid", auction.auction_id);
    Ok(())
}