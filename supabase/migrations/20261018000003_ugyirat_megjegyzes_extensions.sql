-- [Docs] Belső megjegyzések bővítése (P-095):
--   szerkesztés (szerkesztve_at + UPDATE policy), csatolmányok, olvasatlan jelzés.
-- A törlés fizikai (a saját megjegyzésre meglévő DELETE policy), a törölt szöveg az append-only
-- esemeny_naplo-ban megmarad.

-- 1. Szerkesztés
ALTER TABLE ugyirat_megjegyzes
    ADD COLUMN IF NOT EXISTS szerkesztve_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Allow update own on ugyirat_megjegyzes" ON ugyirat_megjegyzes;
CREATE POLICY "Allow update own on ugyirat_megjegyzes"
ON ugyirat_megjegyzes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Csatolmányok
CREATE TABLE IF NOT EXISTS ugyirat_megjegyzes_csatolmany (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    megjegyzes_id UUID NOT NULL REFERENCES ugyirat_megjegyzes(id) ON DELETE CASCADE,
    ugyirat_id UUID NOT NULL REFERENCES ugyirat(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    fajlnev TEXT NOT NULL,
    mime_type TEXT,
    meret_byte BIGINT,
    feltoltotte_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_megjegyzes_csatolmany_megjegyzes
    ON ugyirat_megjegyzes_csatolmany (megjegyzes_id);
CREATE INDEX IF NOT EXISTS idx_megjegyzes_csatolmany_ugyirat
    ON ugyirat_megjegyzes_csatolmany (ugyirat_id);

ALTER TABLE ugyirat_megjegyzes_csatolmany ENABLE ROW LEVEL SECURITY;

-- Olvasás: csak az, aki az ügyiratot (az ugyirat tábla RLS-én keresztül) látja
DROP POLICY IF EXISTS "Select megjegyzes_csatolmany if dossier visible" ON ugyirat_megjegyzes_csatolmany;
CREATE POLICY "Select megjegyzes_csatolmany if dossier visible"
ON ugyirat_megjegyzes_csatolmany FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM ugyirat u WHERE u.id = ugyirat_megjegyzes_csatolmany.ugyirat_id));

DROP POLICY IF EXISTS "Insert own megjegyzes_csatolmany" ON ugyirat_megjegyzes_csatolmany;
CREATE POLICY "Insert own megjegyzes_csatolmany"
ON ugyirat_megjegyzes_csatolmany FOR INSERT
TO authenticated
WITH CHECK (feltoltotte_user_id = auth.uid());

DROP POLICY IF EXISTS "Delete own megjegyzes_csatolmany" ON ugyirat_megjegyzes_csatolmany;
CREATE POLICY "Delete own megjegyzes_csatolmany"
ON ugyirat_megjegyzes_csatolmany FOR DELETE
TO authenticated
USING (feltoltotte_user_id = auth.uid());

-- 3. Olvasatlan jelzés (felhasználónként és ügyiratonként az utolsó olvasás időpontja)
CREATE TABLE IF NOT EXISTS ugyirat_megjegyzes_olvasas (
    ugyirat_id UUID NOT NULL REFERENCES ugyirat(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ugyirat_id, user_id)
);

ALTER TABLE ugyirat_megjegyzes_olvasas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select own megjegyzes_olvasas" ON ugyirat_megjegyzes_olvasas;
CREATE POLICY "Select own megjegyzes_olvasas"
ON ugyirat_megjegyzes_olvasas FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Insert own megjegyzes_olvasas" ON ugyirat_megjegyzes_olvasas;
CREATE POLICY "Insert own megjegyzes_olvasas"
ON ugyirat_megjegyzes_olvasas FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Update own megjegyzes_olvasas" ON ugyirat_megjegyzes_olvasas;
CREATE POLICY "Update own megjegyzes_olvasas"
ON ugyirat_megjegyzes_olvasas FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Privát tároló a megjegyzés-csatolmányoknak (sosem publikus; hozzáférés csak aláírt URL-lel)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'megjegyzes_csatolmanyok',
    'megjegyzes_csatolmanyok',
    false,
    10485760,
    ARRAY[
        'image/png', 'image/jpeg', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Az objektum útvonala: {ugyirat_id}/{megjegyzes_id}/{fájl} – az ügyirat láthatósága dönt
DROP POLICY IF EXISTS "Insert megjegyzes_csatolmanyok objects" ON storage.objects;
CREATE POLICY "Insert megjegyzes_csatolmanyok objects" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'megjegyzes_csatolmanyok'
    AND EXISTS (SELECT 1 FROM ugyirat u WHERE u.id::text = (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Select megjegyzes_csatolmanyok objects" ON storage.objects;
CREATE POLICY "Select megjegyzes_csatolmanyok objects" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'megjegyzes_csatolmanyok'
    AND EXISTS (SELECT 1 FROM ugyirat u WHERE u.id::text = (storage.foldername(name))[1])
);
