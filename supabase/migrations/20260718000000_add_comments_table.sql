-- Add ugyirat_megjegyzes table for internal communication on dossiers

CREATE TABLE ugyirat_megjegyzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ugyirat_id UUID REFERENCES ugyirat(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    szoveg TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ugyirat_megjegyzes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to insert
CREATE POLICY "Allow insert for authenticated users on ugyirat_megjegyzes" 
ON ugyirat_megjegyzes FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow all authenticated users to read
CREATE POLICY "Allow select for authenticated users on ugyirat_megjegyzes" 
ON ugyirat_megjegyzes FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to delete their own comments (optional, we might not need this right away, but good for completeness)
CREATE POLICY "Allow delete own on ugyirat_megjegyzes" 
ON ugyirat_megjegyzes FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
