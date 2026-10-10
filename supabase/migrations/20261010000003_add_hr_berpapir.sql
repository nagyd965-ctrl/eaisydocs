-- Migration: 20261010000003_add_hr_berpapir.sql
-- Havi Bérpapír (Bérjegyzék) és Digitális Átvételi Nyugta (Mt. 155. §)

CREATE TABLE IF NOT EXISTS public.hr_berpapir (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES public.felhasznalo_profil(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    ev INTEGER NOT NULL,
    honap INTEGER NOT NULL CHECK (honap >= 1 AND honap <= 12),
    statusz TEXT NOT NULL DEFAULT 'tervezet' CHECK (statusz IN ('tervezet', 'kikuldve', 'atveve')),
    
    -- Jövedelem elemek
    brutto_alapber NUMERIC(12,2) NOT NULL DEFAULT 0,
    tervezett_munkanap INTEGER DEFAULT 0,
    ledolgozott_munkanap INTEGER DEFAULT 0,
    ledolgozott_munkaora NUMERIC(6,2) DEFAULT 0,
    alapber_reszlet NUMERIC(12,2) DEFAULT 0,
    szabadsag_nap INTEGER DEFAULT 0,
    szabadsag_dij NUMERIC(12,2) DEFAULT 0,
    betegszabadsag_nap INTEGER DEFAULT 0,
    betegszabadsag_dij NUMERIC(12,2) DEFAULT 0,
    tulora_ora NUMERIC(6,2) DEFAULT 0,
    tulora_potlek NUMERIC(12,2) DEFAULT 0,
    bonusz_jutalom NUMERIC(12,2) DEFAULT 0,
    cafeteria_brutto NUMERIC(12,2) DEFAULT 0,
    brutto_osszesen NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Opcionális adókedvezmények (25 év alattiak SZJA mentessége, családi kedvezmény, személyi kedvezmény)
    kedvezmeny_25_ev_alatti BOOLEAN DEFAULT false,
    csaladi_kedvezmeny_osszeg NUMERIC(12,2) DEFAULT 0,
    egyeb_adokedvezmeny_osszeg NUMERIC(12,2) DEFAULT 0,
    adokedvezmenyek_osszesen NUMERIC(12,2) DEFAULT 0,

    -- Törvényes levonások (SZJA 15%, TB 18.5%, bírósági letiltások)
    szja_alap NUMERIC(12,2) DEFAULT 0,
    szja_levonas NUMERIC(12,2) DEFAULT 0,
    tb_jarulek_alap NUMERIC(12,2) DEFAULT 0,
    tb_jarulek_levonas NUMERIC(12,2) DEFAULT 0,
    letiltas_egyeb_levonas NUMERIC(12,2) DEFAULT 0,
    levonasok_osszesen NUMERIC(12,2) DEFAULT 0,

    -- Nettó kifizetés & Munkáltatói teher
    netto_kifizetendo NUMERIC(12,2) NOT NULL DEFAULT 0,
    szocho_munkaltatoi NUMERIC(12,2) DEFAULT 0,
    bankszamlaszam TEXT,
    kifizetes_modja TEXT DEFAULT 'átutalás',
    kifizetes_hatarido DATE,

    -- Digitális átvétel (Mt. 155. §) & PDF
    kikuldes_datuma TIMESTAMPTZ,
    atvetel_datuma TIMESTAMPTZ,
    atvetel_ip TEXT,
    pdf_url TEXT,
    pdf_sha256 TEXT,
    megjegyzes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT hr_berpapir_dolgozo_ev_honap_key UNIQUE (dolgozo_id, ev, honap)
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_hr_berpapir_dolgozo_id ON public.hr_berpapir(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_berpapir_ev_honap ON public.hr_berpapir(ev, honap);
CREATE INDEX IF NOT EXISTS idx_hr_berpapir_statusz ON public.hr_berpapir(statusz);
CREATE INDEX IF NOT EXISTS idx_hr_berpapir_company ON public.hr_berpapir(company_id);

-- RLS
ALTER TABLE public.hr_berpapir ENABLE ROW LEVEL SECURITY;

-- Dolgozói olvasás: saját bérpapírok megtekintése
CREATE POLICY "Dolgozo megtekintheti sajat berpapirjait" ON public.hr_berpapir
    FOR SELECT TO authenticated
    USING (dolgozo_id = auth.uid());

-- Dolgozói frissítés: kizárólag az átvétel nyugtázása (atvetel_datuma, atvetel_ip, statusz='atveve')
CREATE POLICY "Dolgozo nyugtazhatja sajat berpapirjat" ON public.hr_berpapir
    FOR UPDATE TO authenticated
    USING (dolgozo_id = auth.uid())
    WITH CHECK (dolgozo_id = auth.uid());

-- HR & Vezetők teljes kezelési joga
CREATE POLICY "HR es Vezetok kezelik a berpapirokat" ON public.hr_berpapir
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.felhasznalo_profil
            WHERE id = auth.uid()
            AND (
                hr_szerepkor::text IN ('admin', 'hr_vezeto', 'hr_munkatars') OR
                szerepkor::text = 'admin' OR
                docs_szerepkor::text = 'admin'
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.felhasznalo_profil
            WHERE id = auth.uid()
            AND (
                hr_szerepkor::text IN ('admin', 'hr_vezeto', 'hr_munkatars') OR
                szerepkor::text = 'admin' OR
                docs_szerepkor::text = 'admin'
            )
        )
    );
