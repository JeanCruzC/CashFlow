-- Migration to add Gamification Pets

CREATE TABLE IF NOT EXISTS public.user_pets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text DEFAULT 'Cerdito',
    pet_type text DEFAULT 'piggy',
    health integer DEFAULT 100,
    hunger integer DEFAULT 100,
    happiness integer DEFAULT 100,
    status text DEFAULT 'happy', -- 'happy', 'hungry', 'sad', 'sick'
    last_interacted_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.user_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pet" ON public.user_pets;
CREATE POLICY "Users can view their own pet"
    ON public.user_pets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pet" ON public.user_pets;
CREATE POLICY "Users can insert their own pet"
    ON public.user_pets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pet" ON public.user_pets;
CREATE POLICY "Users can update their own pet"
    ON public.user_pets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Also add a trigger to update 'updated_at' if we haven't already globally or per table
-- For simplicity, we assume application updates 'updated_at' or we can leave it as is.
