-- Fizikai hely szerkesztési jogosultság frissítése az új docs_szerepkor mezőre
DROP POLICY IF EXISTS "Fizikai hely szerkesztese" ON irat_fizikai_hely;

CREATE POLICY "Fizikai hely szerkesztese" ON irat_fizikai_hely FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM felhasznalo_profil WHERE id = auth.uid() AND docs_szerepkor::text IN ('iktato', 'admin', 'rendszergazda'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM felhasznalo_profil WHERE id = auth.uid() AND docs_szerepkor::text IN ('iktato', 'admin', 'rendszergazda'))
);
