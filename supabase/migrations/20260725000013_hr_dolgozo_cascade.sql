-- Fix foreign keys to allow cascading deletes for employees

ALTER TABLE hr_dolgozo_titkos_adat DROP CONSTRAINT IF EXISTS hr_dolgozo_titkos_adat_dolgozo_id_fkey;
ALTER TABLE hr_tavollet DROP CONSTRAINT IF EXISTS hr_tavollet_dolgozo_id_fkey;
ALTER TABLE hr_teljesitmeny DROP CONSTRAINT IF EXISTS hr_teljesitmeny_dolgozo_id_fkey;

ALTER TABLE hr_dolgozo_titkos_adat 
  ADD CONSTRAINT hr_dolgozo_titkos_adat_dolgozo_id_fkey 
  FOREIGN KEY (dolgozo_id) REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE;

ALTER TABLE hr_tavollet 
  ADD CONSTRAINT hr_tavollet_dolgozo_id_fkey 
  FOREIGN KEY (dolgozo_id) REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE;

ALTER TABLE hr_teljesitmeny 
  ADD CONSTRAINT hr_teljesitmeny_dolgozo_id_fkey 
  FOREIGN KEY (dolgozo_id) REFERENCES hr_dolgozo_adatlap(id) ON DELETE CASCADE;
