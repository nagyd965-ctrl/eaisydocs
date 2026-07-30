-- Fix RLS policy on ertesitesi_szabaly to include docs_szerepkor
DROP POLICY IF EXISTS "Csak admin szerkesztheti a szabalyokat" ON public.ertesitesi_szabaly;
CREATE POLICY "Csak admin szerkesztheti a szabalyokat"
    ON public.ertesitesi_szabaly FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.felhasznalo_profil f
            WHERE f.id = auth.uid() AND (f.szerepkor = 'admin' OR f.docs_szerepkor = 'admin' OR f.szerepkor = 'rendszergazda' OR f.docs_szerepkor = 'rendszergazda')
        )
    );
