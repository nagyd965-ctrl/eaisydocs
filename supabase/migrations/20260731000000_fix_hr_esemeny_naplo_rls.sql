-- Fix hr_esemeny_naplo RLS to use hr_szerepkor instead of old szerepkor

DROP POLICY IF EXISTS "Eseménynapló olvasás HR és Admin számára" ON hr_esemeny_naplo;

CREATE POLICY "Eseménynapló olvasás HR és Admin számára"
    ON hr_esemeny_naplo
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM felhasznalo_profil 
            WHERE felhasznalo_profil.id = auth.uid() 
            AND hr_szerepkor::text IN ('hr_munkatars', 'hr_vezeto', 'admin')
        )
    );
