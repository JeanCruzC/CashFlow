-- Migration to add Gamification Challenges

CREATE TABLE IF NOT EXISTS public.challenges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    target_amount numeric DEFAULT 0,
    target_count integer DEFAULT 0,
    reward_xp integer DEFAULT 50,
    challenge_type text NOT NULL, -- 'savings_amount', 'streak_days', 'transaction_count'
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.challenges;
CREATE POLICY "Anyone can view active challenges"
    ON public.challenges FOR SELECT
    USING (is_active = true);


CREATE TABLE IF NOT EXISTS public.user_challenges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    status text DEFAULT 'active', -- 'active', 'completed'
    progress numeric DEFAULT 0,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own challenges" ON public.user_challenges;
CREATE POLICY "Users can view their own challenges"
    ON public.user_challenges FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own challenges" ON public.user_challenges;
CREATE POLICY "Users can insert their own challenges"
    ON public.user_challenges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own challenges" ON public.user_challenges;
CREATE POLICY "Users can update their own challenges"
    ON public.user_challenges FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Insert some default challenges for all users to grab later
INSERT INTO public.challenges (title, description, target_amount, reward_xp, challenge_type)
VALUES ('Ahorro Inicial', 'Ahorra tus primeros $50.', 50, 100, 'savings_amount')
ON CONFLICT DO NOTHING;

INSERT INTO public.challenges (title, description, target_count, reward_xp, challenge_type)
VALUES ('Constancia 3 Días', 'Alcanza una racha de 3 días.', 3, 150, 'streak_days')
ON CONFLICT DO NOTHING;

INSERT INTO public.challenges (title, description, target_count, reward_xp, challenge_type)
VALUES ('Primeros Pasos', 'Registra 5 transacciones.', 5, 50, 'transaction_count')
ON CONFLICT DO NOTHING;
