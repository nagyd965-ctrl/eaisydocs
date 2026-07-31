-- Fix RLS policy on ertesitesi_szabaly to use hr_szerepkor instead of old szerepkor
DROP POLICY IF EXISTS "Csak admin szerkesztheti a szabalyokat" ON public.ertesitesi_szabaly;

CREATE POLICY "Csak admin szerkesztheti a szabalyokat"
    ON public.ertesitesi_szabaly FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.felhasznalo_profil f
            WHERE f.id = auth.uid() 
            AND (
                f.hr_szerepkor::text IN ('admin', 'rendszergazda') 
                OR f.docs_szerepkor::text IN ('admin', 'rendszergazda')
            )
        )
    );
