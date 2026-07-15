-- Enable RLS on all tables
ALTER TABLE irattari_terv ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugy ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugyirat ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner ENABLE ROW LEVEL SECURITY;
ALTER TABLE irat ENABLE ROW LEVEL SECURITY;
ALTER TABLE irat_fajl ENABLE ROW LEVEL SECURITY;
ALTER TABLE irat_kapcsolat ENABLE ROW LEVEL SECURITY;
ALTER TABLE esemeny_naplo ENABLE ROW LEVEL SECURITY;
ALTER TABLE iktatoszam_allokacio ENABLE ROW LEVEL SECURITY;

-- esemeny_naplo: Append Only (INSERT and SELECT) for authenticated users
CREATE POLICY "Esemeny naplo is insert only for authenticated" ON esemeny_naplo
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Esemeny naplo is readable for authenticated" ON esemeny_naplo
FOR SELECT TO authenticated USING (true);

-- NOTE: No UPDATE or DELETE policies are created for esemeny_naplo. 
-- This enforces the "append-only" requirement at the database level.

-- Temporary baseline policies for authenticated users on other tables
-- (These will be refined with strict ABAC/RBAC roles in later phases, 
-- but are needed now so the UI can function for logged in users)
CREATE POLICY "Allow all operations for authenticated users on ugy" ON ugy FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on ugyirat" ON ugyirat FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on irat" ON irat FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on irat_fajl" ON irat_fajl FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on irat_kapcsolat" ON irat_kapcsolat FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on partner" ON partner FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on irattari_terv" ON irattari_terv FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on iktatoszam_allokacio" ON iktatoszam_allokacio FOR ALL TO authenticated USING (true) WITH CHECK (true);
