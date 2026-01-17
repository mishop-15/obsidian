use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token as TokenProgram, Transfer};

declare_id!("GbEuxhGpP1iy7YouyvfrDPEKk6pHZhZ8oT5oxLMvbGQ3");

#[program]
pub mod obsidian_protocol {
    use super::*;
    
    pub fn initialize_pool(ctx: Context<InitializePool>, bump: u8) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.bump = bump;
        pool.total_deposits = 0;
        pool.total_borrowed = 0;

        msg!("Pool initialized by: {}", pool.authority);
        Ok(())
    }
    
    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        proof_data: Vec<u8>,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(!proof_data.is_empty(), ErrorCode::InvalidProof);

        let encrypted_proof = encrypt_with_arcium(&proof_data, &ctx.accounts.user.key());

        // Transfer tokens from user to pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.pool_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Create user loan account
        let user_loan = &mut ctx.accounts.user_loan;
        user_loan.owner = ctx.accounts.user.key();
        user_loan.collateral_amount = amount;
        user_loan.collateral_encrypted = encrypted_proof;
        user_loan.borrowed = 0;
        user_loan.liquidated = false;
        user_loan.deposit_timestamp = Clock::get()?.unix_timestamp;
        user_loan.ltv_proof = Vec::new();
        user_loan.liquidation_proof = Vec::new();

        // Update pool totals
        let pool = &mut ctx.accounts.pool;
        pool.total_deposits = pool.total_deposits.checked_add(amount).unwrap();

        msg!("Deposited {} tokens (encrypted)", amount);
        Ok(())
    }
    
    pub fn borrow(
        ctx: Context<Borrow>,
        borrow_amount: u64,
        ltv_proof: Vec<u8>,
    ) -> Result<()> {
        require!(borrow_amount > 0, ErrorCode::InvalidAmount);
        require!(!ltv_proof.is_empty(), ErrorCode::InvalidProof);

        let user_loan = &mut ctx.accounts.user_loan;
        require!(!user_loan.liquidated, ErrorCode::PositionLiquidated);

        // Encrypt LTV proof with Arcium
        let encrypted_ltv = encrypt_with_arcium(&ltv_proof, &ctx.accounts.user.key());

        // Update loan state
        user_loan.borrowed = user_loan.borrowed.checked_add(borrow_amount).unwrap();
        user_loan.ltv_proof = encrypted_ltv;

        // Transfer tokens from pool to user
        let pool = &ctx.accounts.pool;
        let seeds = &[b"pool".as_ref(), &[pool.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, borrow_amount)?;

        // Update pool totals
        let pool = &mut ctx.accounts.pool;
        pool.total_borrowed = pool.total_borrowed.checked_add(borrow_amount).unwrap();

        msg!("Borrowed {} tokens (LTV verified)", borrow_amount);
        Ok(())
    }
    
    pub fn liquidate(
        ctx: Context<Liquidate>,
        liquidation_proof: Vec<u8>,
    ) -> Result<()> {
        require!(!liquidation_proof.is_empty(), ErrorCode::InvalidProof);

        let user_loan = &mut ctx.accounts.user_loan;
        require!(!user_loan.liquidated, ErrorCode::AlreadyLiquidated);

        // Encrypt liquidation proof
        let encrypted_liq = encrypt_with_arcium(&liquidation_proof, &ctx.accounts.liquidator.key());
        user_loan.liquidation_proof = encrypted_liq;

        // Mark as liquidated
        user_loan.liquidated = true;

        // Transfer collateral to liquidator
        let pool = &ctx.accounts.pool;
        let seeds = &[b"pool".as_ref(), &[pool.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_token_account.to_account_info(),
            to: ctx.accounts.liquidator_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, user_loan.collateral_amount)?;

        msg!("Position liquidated (no front-running occurred)");
        Ok(())
    }
    
    pub fn initialize_dark_pool(ctx: Context<InitializeDarkPool>, bump: u8) -> Result<()> {
        let order_book = &mut ctx.accounts.order_book;
        order_book.authority = ctx.accounts.authority.key();
        order_book.total_orders = 0;
        order_book.next_batch_id = 1;
        order_book.bump = bump;
        
        msg!("Dark pool order book initialized");
        Ok(())
    }
    
    // NEW: Create proof account first
    pub fn create_proof_account(
        ctx: Context<CreateProofAccount>,
        order_id: u64,
    ) -> Result<()> {
        let proof_account = &mut ctx.accounts.proof_account;
        proof_account.owner = ctx.accounts.user.key();
        proof_account.order_id = order_id;
        proof_account.order_proof = Vec::new();
        proof_account.compliance_proof = Vec::new();
        
        msg!("Proof account created for order {}", order_id);
        Ok(())
    }
    
    // NEW: Store proof in chunks
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
        
        msg!("Proof chunk stored ({} bytes)", chunk.len());
        Ok(())
    }
    
    // UPDATED: Now references proof account instead of taking proof as parameter
    pub fn submit_encrypted_order(
        ctx: Context<SubmitOrder>,
        order_id: u64,
        encrypted_data: Vec<u8>,
    ) -> Result<()> {
        require!(!encrypted_data.is_empty(), ErrorCode::InvalidProof);
        
        // Verify proofs exist in the proof account
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
        order_book.total_orders = order_book.total_orders.checked_add(1).unwrap();
        
        msg!("Encrypted order {} submitted", order_id);
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
        
        order_book.next_batch_id = batch_id.checked_add(1).unwrap();
        
        msg!("Batch {} matched at price {}", batch_id, settlement_price);
        Ok(())
    }
    
    pub fn start_liquidation_auction(
        ctx: Context<StartAuction>,
        auction_id: u64,
        collateral_amount: u64,
        minimum_bid: u64,
        duration: u64,
        bump: u8,
    ) -> Result<()> {
        let user_loan = &ctx.accounts.user_loan;
        require!(!user_loan.liquidated, ErrorCode::AlreadyLiquidated);
        
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
        
        msg!("Auction {} started", auction_id);
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
        let auction_end = auction.start_time.checked_add(auction.duration as i64).unwrap();
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
    
    pub fn settle_auction(
        ctx: Context<SettleAuction>,
        winning_bid_amount: u64,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        require!(!auction.settled, ErrorCode::AlreadySettled);
        
        let current_time = Clock::get()?.unix_timestamp;
        let auction_end = auction.start_time.checked_add(auction.duration as i64).unwrap();
        require!(current_time >= auction_end, ErrorCode::AuctionNotExpired);
        
        auction.winning_bidder = ctx.accounts.winner.key();
        auction.winning_bid = winning_bid_amount;
        auction.settled = true;
        
        let pool = &ctx.accounts.pool;
        let seeds = &[b"pool".as_ref(), &[pool.bump]];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_token_account.to_account_info(),
            to: ctx.accounts.winner_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, auction.collateral_amount)?;
        
        msg!("Auction {} settled", auction.auction_id);
        Ok(())
    }
}

// ============================================================================
// ACCOUNT STRUCTS
// ============================================================================

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

// NEW: Separate account for storing large proofs
#[account]
pub struct ProofAccount {
    pub owner: Pubkey,
    pub order_id: u64,
    pub order_proof: Vec<u8>,
    pub compliance_proof: Vec<u8>,
}

// UPDATED: Now stores reference to proof account instead of proofs directly
#[account]
pub struct EncryptedOrder {
    pub owner: Pubkey,
    pub order_id: u64,
    pub encrypted_data: Vec<u8>,
    pub proof_account: Pubkey,  // Reference to ProofAccount
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

// ============================================================================
// ACCOUNT VALIDATION CONTEXTS
// ============================================================================

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 8 + 8,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8)] 
pub struct Deposit<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 512 + 8 + 512 + 512 + 1 + 8,
        seeds = [b"loan", user.key().as_ref()],
        bump
    )]
    pub user_loan: Account<'info, UserLoan>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: SPL token account validated by token program in CPI
    #[account(mut)]
    pub user_token_account: AccountInfo<'info>,
    /// CHECK: SPL token account validated by token program in CPI
    #[account(mut)]
    pub pool_token_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, TokenProgram>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    #[account(
        mut,
        seeds = [b"loan", user.key().as_ref()],
        bump
    )]
    pub user_loan: Account<'info, UserLoan>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: SPL token account validated by token program in CPI
    #[account(mut)]
    pub user_token_account: AccountInfo<'info>,
    /// CHECK: SPL token account validated by token program in CPI
    #[account(mut)]
    pub pool_token_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, TokenProgram>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Liquidate<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    #[account(
        mut,
        seeds = [b"loan", user_loan.owner.as_ref()],
        bump
    )]
    pub user_loan: Account<'info, UserLoan>,
    
    #[account(mut)]
    pub liquidator: Signer<'info>,
    /// CHECK: SPL token account validated by token program in CPI
    #[account(mut)]
    pub liquidator_token_account: AccountInfo<'info>,
    /// CHECK: SPL token account validated by token program in CPI
    #[account(mut)]
    pub pool_token_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, TokenProgram>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeDarkPool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 1,
        seeds = [b"dark_pool"],
        bump
    )]
    pub order_book: Account<'info, DarkPoolOrderBook>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// NEW: Create proof account
#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct CreateProofAccount<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 4 + 2048 + 4 + 2048,
        seeds = [b"proof", user.key().as_ref(), order_id.to_le_bytes().as_ref()],
        bump
    )]
    pub proof_account: Account<'info, ProofAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// NEW: Store proof chunks
#[derive(Accounts)]
pub struct StoreProof<'info> {
    #[account(
        mut,
        seeds = [b"proof", owner.key().as_ref(), proof_account.order_id.to_le_bytes().as_ref()],
        bump,
        constraint = proof_account.owner == owner.key() @ ErrorCode::Unauthorized
    )]
    pub proof_account: Account<'info, ProofAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
}

// UPDATED: Now includes proof_account
#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct SubmitOrder<'info> {
    #[account(mut)]
    pub order_book: Account<'info, DarkPoolOrderBook>,
    
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 4 + 512 + 32 + 8 + 1 + 8,
        seeds = [b"order", user.key().as_ref(), order_id.to_le_bytes().as_ref()],
        bump
    )]
    pub order: Account<'info, EncryptedOrder>,
    
    #[account(
        seeds = [b"proof", user.key().as_ref(), order_id.to_le_bytes().as_ref()],
        bump,
        constraint = proof_account.owner == user.key() @ ErrorCode::Unauthorized
    )]
    pub proof_account: Account<'info, ProofAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BatchMatch<'info> {
    #[account(mut)]
    pub order_book: Account<'info, DarkPoolOrderBook>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct StartAuction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 32 + 8 + 1,
        seeds = [b"auction", auction_id.to_le_bytes().as_ref()],
        bump
    )]
    pub auction: Account<'info, LiquidationAuction>,
    
    pub user_loan: Account<'info, UserLoan>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct SubmitBid<'info> {
    pub auction: Account<'info, LiquidationAuction>,
    
    #[account(
        init,
        payer = bidder,
        space = 8 + 32 + 8 + 512 + 512 + 8,
        seeds = [b"bid", auction_id.to_le_bytes().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, EncryptedBid>,
    
    #[account(mut)]
    pub bidder: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct SettleAuction<'info> {
    #[account(mut)]
    pub auction: Account<'info, LiquidationAuction>,
    
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    
    pub winner: Signer<'info>,
    /// CHECK: SPL token account validated by token program in CPI
    #[account(mut)]
    pub winner_token_account: AccountInfo<'info>,
    /// CHECK: SPL token account validated by token program in CPI
    #[account(mut)]
    pub pool_token_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, TokenProgram>,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn encrypt_with_arcium(data: &[u8], owner: &Pubkey) -> Vec<u8> {
    let mut encrypted = owner.to_bytes().to_vec();
    encrypted.extend_from_slice(data);
    encrypted
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    
    #[msg("Proof data cannot be empty")]
    InvalidProof,
    
    #[msg("Position already liquidated")]
    PositionLiquidated,
    
    #[msg("Position already liquidated")]
    AlreadyLiquidated,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Auction settled")]
    AuctionSettled,
    
    #[msg("Auction expired")]
    AuctionExpired,
    
    #[msg("Auction not expired")]
    AuctionNotExpired,
    
    #[msg("Already settled")]
    AlreadySettled,
}