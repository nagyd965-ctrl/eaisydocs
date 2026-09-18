-- Enable Realtime publication for irat, feladat, ugyirat, partner
ALTER TABLE public.irat REPLICA IDENTITY FULL;
ALTER TABLE public.feladat REPLICA IDENTITY FULL;
ALTER TABLE public.ugyirat REPLICA IDENTITY FULL;
ALTER TABLE public.partner REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'irat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.irat;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'feladat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feladat;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ugyirat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ugyirat;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'partner'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partner;
  END IF;
END $$;

-- Update RLS policies to allow ugyintezo and vezeto to manage physical location and borrowing
DROP POLICY IF EXISTS "Fizikai hely szerkesztese" ON public.irat_fizikai_hely;
CREATE POLICY "Fizikai hely szerkesztese" ON public.irat_fizikai_hely
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.felhasznalo_profil
      WHERE id = auth.uid()
        AND docs_szerepkor::text = ANY (ARRAY['iktato'::text, 'admin'::text, 'rendszergazda'::text, 'vezeto'::text, 'ugyintezo'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.felhasznalo_profil
      WHERE id = auth.uid()
        AND docs_szerepkor::text = ANY (ARRAY['iktato'::text, 'admin'::text, 'rendszergazda'::text, 'vezeto'::text, 'ugyintezo'::text])
    )
  );

DROP POLICY IF EXISTS "Kolcsonzesek szerkesztese" ON public.irat_kolcsonzes_naplo;
CREATE POLICY "Kolcsonzesek szerkesztese" ON public.irat_kolcsonzes_naplo
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.felhasznalo_profil
      WHERE id = auth.uid()
        AND docs_szerepkor::text = ANY (ARRAY['iktato'::text, 'admin'::text, 'rendszergazda'::text, 'vezeto'::text, 'ugyintezo'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.felhasznalo_profil
      WHERE id = auth.uid()
        AND docs_szerepkor::text = ANY (ARRAY['iktato'::text, 'admin'::text, 'rendszergazda'::text, 'vezeto'::text, 'ugyintezo'::text])
    )
  );
