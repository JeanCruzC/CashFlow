-- Migration to add Gamification Support

CREATE TABLE IF NOT EXISTS public.user_gamification (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    xp_points integer DEFAULT 0,
    current_level integer DEFAULT 1,
    current_streak integer DEFAULT 0,
    highest_streak integer DEFAULT 0,
    last_action_date timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gamification data"
    ON public.user_gamification FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gamification data"
    ON public.user_gamification FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gamification data"
    ON public.user_gamification FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION handle_new_user_gamification()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_gamification (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In a real environment, you'd trigger this on auth.users insert, 
-- but we might also UPSERT manually via the application.
