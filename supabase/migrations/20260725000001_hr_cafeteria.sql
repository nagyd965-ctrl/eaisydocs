-- Migration: hr_cafeteria
-- Description: Adds tables for the Cafeteria module (catalog, budget, choices)

-- 1. Cafeteria Katalógus (Központi juttatási elemek)
CREATE TABLE hr_cafeteria_katalogus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nev TEXT NOT NULL,
    leiras TEXT,
    szorzo DECIMAL(4,2) DEFAULT 1.00, -- Pl. 1.28 ha 28% az adó
    kategoria TEXT,
    aktiv BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dolgozói Cafeteria Keret (Adott évi keret)
CREATE TABLE hr_cafeteria_keret (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    ev INTEGER NOT NULL,
    osszeg INTEGER NOT NULL, -- Pl. 400000
    nyilatkozat_lezarva BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dolgozo_id, ev)
);

-- 3. Dolgozói Választások
CREATE TABLE hr_cafeteria_valasztas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    katalogus_elem_id UUID REFERENCES hr_cafeteria_katalogus(id) ON DELETE RESTRICT,
    ev INTEGER NOT NULL,
    kert_osszeg INTEGER NOT NULL,
    levont_keret_osszeg INTEGER NOT NULL, -- kert_osszeg * szorzo
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE hr_cafeteria_katalogus ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_cafeteria_keret ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_cafeteria_valasztas ENABLE ROW LEVEL SECURITY;

-- Katalógus: Minden hitelesített felhasználó olvashatja, de csak HR írhatja
CREATE POLICY "Mindenki olvashatja a cafeteria katalogust" 
ON hr_cafeteria_katalogus FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR szerkesztheti a cafeteria katalogust" 
ON hr_cafeteria_katalogus FOR ALL TO authenticated 
USING ((SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin'));

-- Keret: A dolgozó a sajátját látja, a HR mindenkiét (és írhatja is)
CREATE POLICY "Dolgozó olvashatja a saját cafeteria keretét" 
ON hr_cafeteria_keret FOR SELECT TO authenticated USING (dolgozo_id = auth.uid());

CREATE POLICY "HR kezeli a cafeteria kereteket" 
ON hr_cafeteria_keret FOR ALL TO authenticated 
USING ((SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin'));

-- Választás: A dolgozó a sajátját látja és írhatja, a HR mindenkiét
CREATE POLICY "Dolgozó olvashatja a saját cafeteria választását" 
ON hr_cafeteria_valasztas FOR SELECT TO authenticated USING (dolgozo_id = auth.uid());

CREATE POLICY "Dolgozó módosíthatja a saját cafeteria választását" 
ON hr_cafeteria_valasztas FOR ALL TO authenticated 
USING (dolgozo_id = auth.uid())
WITH CHECK (dolgozo_id = auth.uid());

CREATE POLICY "HR kezeli a cafeteria választásokat" 
ON hr_cafeteria_valasztas FOR ALL TO authenticated 
USING ((SELECT hr_szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin'));

-- Seed data for catalog
INSERT INTO hr_cafeteria_katalogus (nev, leiras, szorzo, kategoria) VALUES
('SZÉP Kártya - Szálláshely', 'Belföldi szálláshely szolgáltatás', 1.28, 'szep_kartya'),
('SZÉP Kártya - Vendéglátás', 'Melegétel fogyasztás', 1.28, 'szep_kartya'),
('SZÉP Kártya - Szabadidő', 'Kulturális és szabadidős szolgáltatások', 1.28, 'szep_kartya'),
('Helyi közlekedési bérlet', 'Adómentes helyi bérlet', 1.00, 'berlet'),
('Egészségpénztár', 'Egészségügyi szolgáltatásokra fordítható', 1.33, 'penztar');
