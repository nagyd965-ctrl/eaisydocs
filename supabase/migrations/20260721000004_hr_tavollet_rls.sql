-- 20260721000004_hr_tavollet_rls.sql
-- Hiányzó RLS Policiák pótlása a hr_tavollet (Szabadság) táblához

-- 1. A dolgozó láthatja a saját szabadságait, a vezető pedig a beosztottjaiét
CREATE POLICY "Láthatóság: Saját vagy beosztott szabadsága" ON hr_tavollet
FOR SELECT TO authenticated
USING (
  dolgozo_id = auth.uid() OR 
  dolgozo_id IN (SELECT get_hr_subordinates(auth.uid())) OR
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);

-- 2. A dolgozó rögzíthet magának új szabadságot (INSERT)
CREATE POLICY "Dolgozó rögzíthet saját szabadságot" ON hr_tavollet
FOR INSERT TO authenticated
WITH CHECK (
  dolgozo_id = auth.uid()
);

-- 3. A vezető módosíthatja (jóváhagyhatja/elutasíthatja) a beosztottjai szabadságát
CREATE POLICY "Vezető jóváhagyhatja a beosztott szabadságát" ON hr_tavollet
FOR UPDATE TO authenticated
USING (
  dolgozo_id IN (SELECT get_hr_subordinates(auth.uid())) OR
  (SELECT szerepkor::text FROM felhasznalo_profil WHERE id = auth.uid()) IN ('hr_munkatars', 'hr_vezeto', 'admin')
);
