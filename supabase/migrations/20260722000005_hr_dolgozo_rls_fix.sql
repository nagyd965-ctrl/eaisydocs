-- Enable RLS and add policies for the new HR tabs tables

ALTER TABLE hr_elozo_munkahely ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_kepzettseg ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_tanulmanyi_szerzodes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and write
CREATE POLICY "Munkahely olvasas" ON hr_elozo_munkahely FOR SELECT TO authenticated USING (true);
CREATE POLICY "Munkahely iras" ON hr_elozo_munkahely FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Kepzettseg olvasas" ON hr_kepzettseg FOR SELECT TO authenticated USING (true);
CREATE POLICY "Kepzettseg iras" ON hr_kepzettseg FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Szerzodes olvasas" ON hr_tanulmanyi_szerzodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Szerzodes iras" ON hr_tanulmanyi_szerzodes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow Orvosi and Fegyelmi just in case for later
ALTER TABLE hr_orvosi_vizsgalat ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_fegyelmi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orvosi olvasas" ON hr_orvosi_vizsgalat FOR SELECT TO authenticated USING (true);
CREATE POLICY "Orvosi iras" ON hr_orvosi_vizsgalat FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Fegyelmi olvasas" ON hr_fegyelmi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fegyelmi iras" ON hr_fegyelmi FOR ALL TO authenticated USING (true) WITH CHECK (true);
