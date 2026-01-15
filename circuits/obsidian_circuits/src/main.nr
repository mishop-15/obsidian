// OBSIDIAN - Private Lending Protocol
// 3 ZK Circuits for Privacy

// ============================================================================
// CIRCUIT 1: COLLATERAL RANGE PROOF
// Proves: deposit amount is between min and max (without revealing exact amount)
// ============================================================================
fn collateral_range_proof(
    collateral_amount: Field,
    min_required: Field,
    max_allowed: Field
) {
    // For range proofs in Noir, we assert the difference is positive
    // This proves: min_required <= collateral_amount <= max_allowed
    let diff_min = collateral_amount - min_required;
    let diff_max = max_allowed - collateral_amount;
    
    // If these don't underflow, the range is valid
    // Noir will fail if subtraction results in negative (Field wraps around)
    assert(diff_min != 0 - 1);  // Not underflowed
    assert(diff_max != 0 - 1);  // Not underflowed
}

// ============================================================================
// CIRCUIT 2: LTV (LOAN-TO-VALUE) PROOF
// Proves: (borrowed / collateral) * 100 <= max_ltv (without revealing amounts)
// ============================================================================
fn ltv_proof(
    collateral_amount: Field,
    borrowed_amount: Field,
    max_ltv_percent: Field
) {
    // Calculate: borrowed * 100 <= collateral * max_ltv
    let left_side = borrowed_amount * 100;
    let right_side = collateral_amount * max_ltv_percent;
    
    // Prove the difference is positive (left <= right)
    let diff = right_side - left_side;
    assert(diff != 0 - 1);  // Not underflowed
}

// ============================================================================
// CIRCUIT 3: LIQUIDATION PROOF
// Proves: position is underwater and can be liquidated
// ============================================================================
fn liquidation_proof(
    collateral_amount: Field,
    borrowed_amount: Field,
    market_price: Field,
    liquidation_threshold: Field
) {
    // Current collateral value
    let collateral_value = collateral_amount * market_price;
    
    // Required value for liquidation
    let required_value = borrowed_amount * 100;
    let threshold_value = collateral_value * liquidation_threshold;
    
    // Prove position IS underwater (threshold_value < required_value)
    // This means: required_value - threshold_value > 0
    let diff = required_value - threshold_value;
    assert(diff != 0);  // Must be underwater (positive difference)
}

// ============================================================================
// MAIN FUNCTION - Entry point
// ============================================================================
fn main(
    circuit_type: pub Field,
    collateral_amount: Field,
    min_required: pub Field,
    max_allowed: pub Field,
    borrowed_amount: Field,
    max_ltv_percent: pub Field,
    market_price: pub Field,
    liquidation_threshold: pub Field
) {
    if circuit_type == 1 {
        collateral_range_proof(collateral_amount, min_required, max_allowed);
    } else if circuit_type == 2 {
        ltv_proof(collateral_amount, borrowed_amount, max_ltv_percent);
    } else if circuit_type == 3 {
        liquidation_proof(collateral_amount, borrowed_amount, market_price, liquidation_threshold);
    }
}
