-- Új tábla az alkalmazáson belüli (UI) értesítéseknek
CREATE TABLE public.alkalmazas_ertesites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cim TEXT NOT NULL,
    szoveg TEXT,
    olvasott BOOLEAN DEFAULT false,
    link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS beállítása
ALTER TABLE public.alkalmazas_ertesites ENABLE ROW LEVEL SECURITY;

-- Minden felhasználó csak a saját értesítéseit láthatja és módosíthatja
CREATE POLICY "Felhasznalok lathatjak a sajat ertesiteseiket"
    ON public.alkalmazas_ertesites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Felhasznalok modosithatjak a sajat ertesiteseiket (olvasott)"
    ON public.alkalmazas_ertesites FOR UPDATE
    USING (auth.uid() = user_id);

-- A szerver / adatbázis tudjon értesítést beszúrni (insert)
CREATE POLICY "Ertesites beszurasa engedelyezett"
    ON public.alkalmazas_ertesites FOR INSERT
    WITH CHECK (true);

-- Index a gyorsabb lekérdezésért (felhasználó + olvasatlanok legelöl)
CREATE INDEX idx_alkalmazas_ertesites_user_id ON public.alkalmazas_ertesites(user_id, olvasott, created_at DESC);
