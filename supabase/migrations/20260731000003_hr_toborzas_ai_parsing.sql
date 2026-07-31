-- 20260731000003_hr_toborzas_ai_parsing.sql
ALTER TABLE hr_toborzas ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE hr_toborzas ADD COLUMN IF NOT EXISTS ai_relevance_score INTEGER CHECK (ai_relevance_score >= 0 AND ai_relevance_score <= 100);
ALTER TABLE hr_toborzas ADD COLUMN IF NOT EXISTS ai_skills TEXT[];
ALTER TABLE hr_toborzas ADD COLUMN IF NOT EXISTS ai_status TEXT DEFAULT 'pending';
