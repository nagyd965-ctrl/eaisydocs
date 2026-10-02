-- Add 'inaktiv' value to hr_szerepkor_enum for offboarded employees
ALTER TYPE hr_szerepkor_enum ADD VALUE IF NOT EXISTS 'inaktiv';
