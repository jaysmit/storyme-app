import { SupabaseClient } from "@supabase/supabase-js";
import { TOKEN_COSTS } from "./types";

export type TokenAction = "character_generation" | "book_preview" | "purchase" | "refund" | "signup_bonus";

interface DeductResult {
  success: boolean;
  newBalance: number;
  message: string;
}

/**
 * Check if user has enough tokens for an action
 */
export async function checkTokens(
  supabase: SupabaseClient,
  userId: string,
  requiredTokens: number
): Promise<{ hasEnough: boolean; balance: number }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", userId)
    .single();

  const balance = profile?.tokens ?? 0;
  return {
    hasEnough: balance >= requiredTokens,
    balance,
  };
}

/**
 * Deduct tokens from user's balance
 * Returns success status and new balance
 */
export async function deductTokens(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  action: TokenAction,
  referenceId?: string,
  description?: string
): Promise<DeductResult> {
  // Try to use the database function first
  const { data, error } = await supabase.rpc("deduct_tokens", {
    p_user_id: userId,
    p_amount: amount,
    p_action: action,
    p_reference_id: referenceId || null,
    p_description: description || null,
  });

  if (error) {
    // Fallback to manual deduction if function doesn't exist
    console.log("RPC not available, using manual deduction:", error.message);
    return await manualDeductTokens(supabase, userId, amount, action, referenceId, description);
  }

  const result = data?.[0];
  return {
    success: result?.success ?? false,
    newBalance: result?.new_balance ?? 0,
    message: result?.message ?? "Unknown error",
  };
}

/**
 * Manual token deduction (fallback if RPC not available)
 */
async function manualDeductTokens(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  action: TokenAction,
  referenceId?: string,
  description?: string
): Promise<DeductResult> {
  // Get current balance
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("tokens, tokens_used")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    return { success: false, newBalance: 0, message: "User not found" };
  }

  const currentBalance = profile.tokens ?? 0;

  if (currentBalance < amount) {
    return { success: false, newBalance: currentBalance, message: "Insufficient tokens" };
  }

  const newBalance = currentBalance - amount;

  // Update balance
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      tokens: newBalance,
      tokens_used: (profile.tokens_used ?? 0) + amount,
    })
    .eq("id", userId);

  if (updateError) {
    return { success: false, newBalance: currentBalance, message: "Failed to update balance" };
  }

  // Log transaction (best effort, don't fail if this errors)
  try {
    await supabase.from("token_transactions").insert({
      user_id: userId,
      amount: -amount,
      balance_after: newBalance,
      action,
      reference_id: referenceId || null,
      description,
    });
  } catch {
    // Ignore logging errors
  }

  return { success: true, newBalance, message: "Success" };
}

/**
 * Add tokens to user's balance
 */
export async function addTokens(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  action: TokenAction,
  description?: string
): Promise<{ success: boolean; newBalance: number }> {
  // Try RPC first
  const { data, error } = await supabase.rpc("add_tokens", {
    p_user_id: userId,
    p_amount: amount,
    p_action: action,
    p_description: description || null,
  });

  if (!error && data?.[0]) {
    return {
      success: data[0].success,
      newBalance: data[0].new_balance,
    };
  }

  // Fallback to manual
  const { data: profile } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", userId)
    .single();

  const newBalance = (profile?.tokens ?? 0) + amount;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ tokens: newBalance })
    .eq("id", userId);

  if (updateError) {
    return { success: false, newBalance: profile?.tokens ?? 0 };
  }

  return { success: true, newBalance };
}

/**
 * Get token cost for an action
 */
export function getTokenCost(action: keyof typeof TOKEN_COSTS): number {
  return TOKEN_COSTS[action];
}
