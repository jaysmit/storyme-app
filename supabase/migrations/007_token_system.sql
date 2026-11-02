-- Token system for tracking AI generation usage
-- New users get 5 free tokens

-- Add token balance to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;

-- Token transaction log for audit trail
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'signup_bonus', 'character_generation', 'book_preview', 'purchase', 'refund'
  reference_id UUID, -- optional: character_id or book_id
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick user lookups
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at DESC);

-- RLS policies
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own token transactions"
  ON token_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert transactions (via API)
CREATE POLICY "Service role can insert token transactions"
  ON token_transactions FOR INSERT
  WITH CHECK (true);

-- Update existing users to have 5 tokens if they have 0 or null
UPDATE profiles SET tokens = 5 WHERE tokens IS NULL OR tokens = 0;

-- Function to deduct tokens (called from API)
CREATE OR REPLACE FUNCTION deduct_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
  current_balance INTEGER;
  new_bal INTEGER;
BEGIN
  -- Get current balance with lock
  SELECT tokens INTO current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User not found'::TEXT;
    RETURN;
  END IF;

  IF current_balance < p_amount THEN
    RETURN QUERY SELECT false, current_balance, 'Insufficient tokens'::TEXT;
    RETURN;
  END IF;

  -- Deduct tokens
  new_bal := current_balance - p_amount;

  UPDATE profiles
  SET tokens = new_bal, tokens_used = tokens_used + p_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, balance_after, action, reference_id, description)
  VALUES (p_user_id, -p_amount, new_bal, p_action, p_reference_id, p_description);

  RETURN QUERY SELECT true, new_bal, 'Success'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add tokens (for purchases, refunds, bonuses)
CREATE OR REPLACE FUNCTION add_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER) AS $$
DECLARE
  new_bal INTEGER;
BEGIN
  UPDATE profiles
  SET tokens = tokens + p_amount
  WHERE id = p_user_id
  RETURNING tokens INTO new_bal;

  IF new_bal IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, balance_after, action, description)
  VALUES (p_user_id, p_amount, new_bal, p_action, p_description);

  RETURN QUERY SELECT true, new_bal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on columns
COMMENT ON COLUMN profiles.tokens IS 'Current token balance for AI generations';
COMMENT ON COLUMN profiles.tokens_used IS 'Total tokens used lifetime';
