use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    
    #[msg("Proof data cannot be empty")]
    InvalidProof,
    
    #[msg("This position has already been liquidated")]
    PositionLiquidated,
    
    #[msg("Unauthorized access to this resource")]
    Unauthorized,
    
    #[msg("This auction has already been settled")]
    AuctionSettled,
    
    #[msg("Auction bidding period has expired")]
    AuctionExpired,
    
    #[msg("Cannot settle auction before expiration time")]
    AuctionNotExpired,
}