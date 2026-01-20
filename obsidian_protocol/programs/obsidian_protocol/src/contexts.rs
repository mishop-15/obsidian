use anchor_lang::prelude::*;
use anchor_spl::token::Token as TokenProgram;
use crate::state::*;
use crate::errors::ErrorCode;

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
    
    /// CHECK: Token account validated by SPL token program
    #[account(mut)]
    pub user_token_account: AccountInfo<'info>,
    
    /// CHECK: Token account validated by SPL token program
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
    
    /// CHECK: Token account validated by SPL token program
    #[account(mut)]
    pub user_token_account: AccountInfo<'info>,
    
    /// CHECK: Token account validated by SPL token program
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
    
    /// CHECK: Token account validated by SPL token program
    #[account(mut)]
    pub liquidator_token_account: AccountInfo<'info>,
    
    /// CHECK: Token account validated by SPL token program
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
    
    /// CHECK: Token account validated by SPL token program
    #[account(mut)]
    pub winner_token_account: AccountInfo<'info>,
    
    /// CHECK: Token account validated by SPL token program
    #[account(mut)]
    pub pool_token_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, TokenProgram>,
}