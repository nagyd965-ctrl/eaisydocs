-- eaisyDocs Database Schema

-- Enums
CREATE TYPE ugy_statusz AS ENUM ('folyamatban', 'felfuggesztve', 'lezart', 'irattarozott', 'selejtezett');
CREATE TYPE ugyirat_statusz AS ENUM ('iktatva', 'szignalt', 'ugyintezes_alatt', 'elintezett', 'lezart', 'irattarban', 'selejtezheto');
CREATE TYPE irat_irany AS ENUM ('bejovo', 'kimeno', 'belso');
CREATE TYPE erkezes_modja AS ENUM ('posta', 'email', 'szemelyes', 'cegkapu', 'fax', 'rendszer');
CREATE TYPE irat_minosites AS ENUM ('nyilt', 'belso', 'bizalmas', 'szigoruan_bizalmas');
CREATE TYPE adathordozo_tipus AS ENUM ('papir_digitalizalt', 'elektronikus_eredeti');
CREATE TYPE kapcsolat_tipus AS ENUM ('targya', 'melleklete', 'hivatkozas', 'elozmeny');
CREATE TYPE entitas_tipus AS ENUM ('partner', 'tranzakcio', 'folyamat', 'projekt', 'szerzodes', 'szamla');
CREATE TYPE entitas_forras AS ENUM ('belso', 'erp', 'crm');
CREATE TYPE esemeny_tipus AS ENUM ('erkeztetve', 'iktatva', 'szignalva', 'megtekintve', 'modositva', 'letoltve', 'nyomtatva', 'tovabbitva', 'elintezve', 'lezarva', 'irattarozva', 'selejtezve', 'jogosultsag_valtozott');

-- Tables
CREATE TABLE irattari_terv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tetelszam TEXT NOT NULL UNIQUE,
    megnevezes TEXT NOT NULL,
    megorzesi_ido_ev INTEGER NOT NULL,
    selejtezheto BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ugy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ugyszam TEXT NOT NULL UNIQUE,
    targy TEXT NOT NULL,
    ugytipus_id UUID REFERENCES irattari_terv(id),
    statusz ugy_statusz DEFAULT 'folyamatban',
    felelos_user_id UUID,
    hatarido DATE,
    letrehozva TIMESTAMPTZ DEFAULT NOW(),
    lezarva TIMESTAMPTZ
);

CREATE TABLE ugyirat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ugy_id UUID REFERENCES ugy(id),
    iktatoszam TEXT NOT NULL UNIQUE,
    iktatas_datuma TIMESTAMPTZ DEFAULT NOW(),
    iktato_user_id UUID,
    irattari_tetel_id UUID REFERENCES irattari_terv(id),
    megorzesi_ido_vege DATE,
    statusz ugyirat_statusz DEFAULT 'iktatva',
    helye TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE partner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nev TEXT NOT NULL,
    adoszam TEXT,
    cegjegyzekszam TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE irat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ugyirat_id UUID REFERENCES ugyirat(id),
    erkeztetoszam TEXT,
    irany irat_irany NOT NULL,
    erkezes_modja erkezes_modja NOT NULL,
    erkezes_datuma TIMESTAMPTZ DEFAULT NOW(),
    kuldo_partner_id UUID REFERENCES partner(id),
    targy TEXT NOT NULL,
    leiras TEXT,
    adathordozo_tipus adathordozo_tipus NOT NULL,
    minosites irat_minosites DEFAULT 'nyilt',
    kereso_vektor TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE irat_fajl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    irat_id UUID REFERENCES irat(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    eredeti_fajlnev TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    meret_byte BIGINT NOT NULL,
    sha256 TEXT NOT NULL,
    pdfa_path TEXT,
    ocr_szoveg TEXT,
    verzio INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE irat_kapcsolat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    irat_id UUID REFERENCES irat(id) ON DELETE CASCADE,
    ugyirat_id UUID REFERENCES ugyirat(id) ON DELETE CASCADE,
    entitas_tipus entitas_tipus NOT NULL,
    entitas_id TEXT NOT NULL,
    entitas_forras entitas_forras DEFAULT 'belso',
    kapcsolat_tipusa kapcsolat_tipus NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE esemeny_naplo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tortent TIMESTAMPTZ DEFAULT NOW(),
    entitas_tipus TEXT NOT NULL,
    entitas_id UUID NOT NULL,
    esemeny_tipus esemeny_tipus NOT NULL,
    user_id UUID,
    ip_cim TEXT,
    user_agent TEXT,
    elozo_ertek JSONB,
    uj_ertek JSONB,
    indoklas TEXT
);

-- Iktatószám allokáció tábla
CREATE TABLE iktatoszam_allokacio (
    ev INTEGER PRIMARY KEY,
    utolso_sorszam INTEGER NOT NULL DEFAULT 0
);
