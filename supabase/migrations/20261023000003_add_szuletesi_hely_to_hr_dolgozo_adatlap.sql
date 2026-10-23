-- Add szuletesi_hely to hr_dolgozo_adatlap for comprehensive employee identification prefill
ALTER TABLE hr_dolgozo_adatlap ADD COLUMN IF NOT EXISTS szuletesi_hely text;
