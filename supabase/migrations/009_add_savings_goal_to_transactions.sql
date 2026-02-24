-- Migration 009: Add savings_goal_id to transactions and trigger to auto-update current_amount

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS savings_goal_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transactions_savings_goal_id_fkey'
          AND conrelid = 'transactions'::regclass
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT transactions_savings_goal_id_fkey
        FOREIGN KEY (savings_goal_id)
        REFERENCES savings_goals(id)
        ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_transactions_savings_goal_id ON transactions(savings_goal_id);

CREATE OR REPLACE FUNCTION update_savings_goal_amount()
RETURNS trigger AS $$
BEGIN
    -- If inserting a transaction with a savings_goal_id
    IF (TG_OP = 'INSERT' AND NEW.savings_goal_id IS NOT NULL) THEN
        UPDATE savings_goals 
        SET current_amount = current_amount + NEW.amount 
        WHERE id = NEW.savings_goal_id;
    END IF;

    -- If deleting a transaction with a savings_goal_id
    IF (TG_OP = 'DELETE' AND OLD.savings_goal_id IS NOT NULL) THEN
        UPDATE savings_goals 
        SET current_amount = current_amount - OLD.amount 
        WHERE id = OLD.savings_goal_id;
    END IF;

    -- If updating a transaction
    IF (TG_OP = 'UPDATE') THEN
        -- If the goal changed tracking from NULL to NOT NULL or vice-versa
        IF (OLD.savings_goal_id IS NOT NULL AND NEW.savings_goal_id IS NULL) THEN
            UPDATE savings_goals SET current_amount = current_amount - OLD.amount WHERE id = OLD.savings_goal_id;
        ELSIF (OLD.savings_goal_id IS NULL AND NEW.savings_goal_id IS NOT NULL) THEN
            UPDATE savings_goals SET current_amount = current_amount + NEW.amount WHERE id = NEW.savings_goal_id;
        ELSIF (OLD.savings_goal_id IS NOT NULL AND NEW.savings_goal_id IS NOT NULL) THEN
            -- If the goal moved or the amount changed
            IF (OLD.savings_goal_id != NEW.savings_goal_id) THEN
                UPDATE savings_goals SET current_amount = current_amount - OLD.amount WHERE id = OLD.savings_goal_id;
                UPDATE savings_goals SET current_amount = current_amount + NEW.amount WHERE id = NEW.savings_goal_id;
            ELSIF (OLD.amount != NEW.amount) THEN
                UPDATE savings_goals SET current_amount = current_amount - OLD.amount + NEW.amount WHERE id = NEW.savings_goal_id;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_savings_goal_amount ON transactions;
CREATE TRIGGER trg_update_savings_goal_amount
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_savings_goal_amount();
