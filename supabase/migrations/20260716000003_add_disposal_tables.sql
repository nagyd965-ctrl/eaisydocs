CREATE TYPE csomag_statusz AS ENUM ('jovahagyasra_var', 'jovahagyva', 'elutasitva');

CREATE TABLE selejtezes_csomag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    javaslattevo_user_id UUID NOT NULL,
    jovahagyo_user_id UUID,
    statusz csomag_statusz DEFAULT 'jovahagyasra_var',
    jegyzokonyv_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    jovahagyva_at TIMESTAMPTZ
);

CREATE TABLE selejtezes_tetel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    csomag_id UUID NOT NULL REFERENCES selejtezes_csomag(id) ON DELETE CASCADE,
    ugyirat_id UUID NOT NULL REFERENCES ugyirat(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(csomag_id, ugyirat_id)
);

ALTER TABLE selejtezes_csomag ENABLE ROW LEVEL SECURITY;
ALTER TABLE selejtezes_tetel ENABLE ROW LEVEL SECURITY;

-- Minden autentikált felhasználó láthatja
CREATE POLICY "Mindenki lathatja a csomagokat" ON selejtezes_csomag FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Mindenki lathatja a teteleket" ON selejtezes_tetel FOR SELECT USING (auth.role() = 'authenticated');

-- Létrehozás: Bárki létrehozhatja saját magát megadva javaslattevőként
CREATE POLICY "Felhasznalok letrehozhatnak csomagot" ON selejtezes_csomag FOR INSERT WITH CHECK (auth.uid() = javaslattevo_user_id);
CREATE POLICY "Tetelek letrehozasa" ON selejtezes_tetel FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Frissítés (Négy Szem Elve)
-- Csak akkor frissíthető, ha még nem végleges, ÉS a módosító nem a javaslattevő.
CREATE POLICY "Negy szem elve a frissitesnel" ON selejtezes_csomag FOR UPDATE 
USING (
    statusz = 'jovahagyasra_var' 
    AND auth.uid() != javaslattevo_user_id
)
WITH CHECK (
    statusz IN ('jovahagyva', 'elutasitva')
    AND jovahagyo_user_id = auth.uid()
);
