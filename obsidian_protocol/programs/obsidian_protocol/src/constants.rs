// PDA Seeds
pub const POOL_SEED: &[u8] = b"pool";
pub const LOAN_SEED: &[u8] = b"loan";
pub const DARK_POOL_SEED: &[u8] = b"dark_pool";
pub const PROOF_SEED: &[u8] = b"proof";
pub const ORDER_SEED: &[u8] = b"order";
pub const AUCTION_SEED: &[u8] = b"auction";
pub const BID_SEED: &[u8] = b"bid";

// Account Space Components
pub const DISCRIMINATOR: usize = 8;
pub const PUBKEY_SIZE: usize = 32;
pub const U64_SIZE: usize = 8;
pub const U8_SIZE: usize = 1;
pub const I64_SIZE: usize = 8;
pub const BOOL_SIZE: usize = 1;
pub const VEC_PREFIX: usize = 4;

// Account Sizes
pub const POOL_SIZE: usize = DISCRIMINATOR + PUBKEY_SIZE + U8_SIZE + U64_SIZE + U64_SIZE;
pub const DARK_POOL_ORDER_BOOK_SIZE: usize = 
    DISCRIMINATOR + PUBKEY_SIZE + U64_SIZE + U64_SIZE + U8_SIZE;
pub const PROOF_ACCOUNT_SIZE: usize = 
    DISCRIMINATOR + PUBKEY_SIZE + U64_SIZE + VEC_PREFIX + 2048 + VEC_PREFIX + 2048;
pub const ENCRYPTED_ORDER_SIZE: usize = 
    DISCRIMINATOR + PUBKEY_SIZE + U64_SIZE + VEC_PREFIX + 512 + PUBKEY_SIZE + I64_SIZE + BOOL_SIZE + U64_SIZE;
pub const LIQUIDATION_AUCTION_SIZE: usize = 
    DISCRIMINATOR + PUBKEY_SIZE + U64_SIZE + U64_SIZE + U64_SIZE + I64_SIZE + U64_SIZE + BOOL_SIZE + PUBKEY_SIZE + U64_SIZE + U8_SIZE;
pub const ENCRYPTED_BID_SIZE: usize = 
    DISCRIMINATOR + PUBKEY_SIZE + U64_SIZE + VEC_PREFIX + 512 + VEC_PREFIX + 512 + I64_SIZE;
pub const USER_LOAN_SIZE: usize = 
    DISCRIMINATOR + PUBKEY_SIZE + U64_SIZE + VEC_PREFIX + 512 + U64_SIZE + VEC_PREFIX + 512 + VEC_PREFIX + 512 + BOOL_SIZE + I64_SIZE;

// Initial Values
pub const INITIAL_BATCH_ID: u64 = 1;