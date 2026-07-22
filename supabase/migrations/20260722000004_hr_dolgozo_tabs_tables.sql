-- hr_elozo_munkahely (Előző munkahelyek)
CREATE TABLE hr_elozo_munkahely (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    munkaltato_neve TEXT NOT NULL,
    pozicio TEXT NOT NULL,
    jogviszony_tipusa TEXT,
    kezdet_datuma DATE NOT NULL,
    veg_datuma DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- hr_kepzettseg (Képzettségek, nyelvvizsgák)
CREATE TABLE hr_kepzettseg (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    tipus TEXT NOT NULL CHECK (tipus IN ('iskola', 'szakkepzettseg', 'tanfolyam', 'nyelvvizsga', 'egyeb')),
    megnevezes TEXT NOT NULL,
    intezmeny TEXT,
    bizonyitvany_szam TEXT,
    megszerzes_datuma DATE,
    fokozat TEXT, -- pl. B2 komplex nyelvvizsganal
    dokumentum_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- hr_orvosi_vizsgalat (GDPR 9. cikk)
-- Csak a tény, érvényesség, eredmény. Diagnózis nincs!
CREATE TABLE hr_orvosi_vizsgalat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    tipus TEXT NOT NULL CHECK (tipus IN ('elozetes', 'idoszakos', 'soron_kivuli', 'zaro')),
    vizsgalat_datuma DATE NOT NULL,
    ervenyesseg_datuma DATE NOT NULL,
    eredmeny TEXT NOT NULL CHECK (eredmeny IN ('alkalmas', 'fetelekkel_alkalmas', 'nem_alkalmas')),
    megjegyzes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- hr_fegyelmi (GDPR 9. cikk)
CREATE TABLE hr_fegyelmi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    tipus TEXT NOT NULL CHECK (tipus IN ('figyelmeztetes', 'megrovas', 'karterites', 'kituntetes', 'egyeb')),
    datum DATE NOT NULL,
    indoklas TEXT NOT NULL,
    dokumentum_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- hr_tanulmanyi_szerzodes (Tanulmányi szerződés)
CREATE TABLE hr_tanulmanyi_szerzodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    kepzes_neve TEXT NOT NULL,
    koltseg NUMERIC,
    vallalt_munkaviszony_honap INTEGER,
    lejarat_datuma DATE,
    visszafizetesi_kotelezettseg BOOLEAN DEFAULT TRUE,
    dokumentum_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
