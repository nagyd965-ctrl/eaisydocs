ALTER TABLE public.partner ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.irat ADD COLUMN IF NOT EXISTS rogzito_user_id UUID REFERENCES auth.users(id);
