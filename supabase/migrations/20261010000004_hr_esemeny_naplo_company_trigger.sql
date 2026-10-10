-- Trigger to ensure hr_esemeny_naplo always has a valid company_id
CREATE OR REPLACE FUNCTION public.set_hr_esemeny_naplo_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    -- 1. Try to find the company from company_members where user_id = NEW.felhasznalo_id
    SELECT cm.company_id INTO NEW.company_id 
    FROM public.company_members cm 
    WHERE cm.user_id = NEW.felhasznalo_id 
    ORDER BY cm.created_at ASC 
    LIMIT 1;

    -- 2. Fallback to the default company
    IF NEW.company_id IS NULL THEN
      SELECT id INTO NEW.company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_hr_esemeny_naplo_company_id ON public.hr_esemeny_naplo;
CREATE TRIGGER trg_hr_esemeny_naplo_company_id
BEFORE INSERT ON public.hr_esemeny_naplo
FOR EACH ROW
EXECUTE FUNCTION public.set_hr_esemeny_naplo_company_id();

CREATE INDEX IF NOT EXISTS idx_hr_esemeny_naplo_company_id_created_at 
ON public.hr_esemeny_naplo(company_id, created_at DESC);
