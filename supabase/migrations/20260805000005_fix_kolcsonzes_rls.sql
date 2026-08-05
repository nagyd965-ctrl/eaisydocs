-- Kölcsönzési napló szerkesztési jogosultság frissítése az új docs_szerepkor mezőre
DROP POLICY IF EXISTS "Kolcsonzesek szerkesztese" ON irat_kolcsonzes_naplo;

CREATE POLICY "Kolcsonzesek szerkesztese" ON irat_kolcsonzes_naplo FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM felhasznalo_profil WHERE id = auth.uid() AND docs_szerepkor::text IN ('iktato', 'admin', 'rendszergazda'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM felhasznalo_profil WHERE id = auth.uid() AND docs_szerepkor::text IN ('iktato', 'admin', 'rendszergazda'))
);
