-- 20261014000003_add_eaisybill_user_sync_columns.sql
-- DOC-TASK-04: Felhasználói adatforrás szinkronizációhoz szükséges mezők és e-mail szinkron

ALTER TABLE public.felhasznalo_profil 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS eaisybill_user_id UUID,
ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'local',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_felhasznalo_profil_email 
ON public.felhasznalo_profil(email);

CREATE INDEX IF NOT EXISTS idx_felhasznalo_profil_eaisybill_user_id 
ON public.felhasznalo_profil(eaisybill_user_id);

-- Meglévő e-mailek feltöltése auth.users-ből
UPDATE public.felhasznalo_profil fp
SET email = u.email
FROM auth.users u
WHERE fp.id = u.id AND (fp.email IS NULL OR fp.email = '');

-- Automatikus email szinkronizáló trigger
CREATE OR REPLACE FUNCTION public.sync_felhasznalo_profil_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_felhasznalo_profil_email ON public.felhasznalo_profil;
CREATE TRIGGER trg_sync_felhasznalo_profil_email
BEFORE INSERT OR UPDATE ON public.felhasznalo_profil
FOR EACH ROW EXECUTE FUNCTION public.sync_felhasznalo_profil_email();
