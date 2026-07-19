CREATE TABLE mentett_kereses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nev TEXT NOT NULL,
    kereso_parameterek JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mentett_kereses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentett keresések megtekintése" ON mentett_kereses
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Mentett keresések létrehozása" ON mentett_kereses
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mentett keresések módosítása" ON mentett_kereses
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mentett keresések törlése" ON mentett_kereses
FOR DELETE TO authenticated USING (auth.uid() = user_id);
