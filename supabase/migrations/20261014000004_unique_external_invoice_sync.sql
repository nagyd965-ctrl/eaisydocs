-- Migráció: Egyedi index a külső számla / irat duplikációk elkerülésére cégenként
-- Megakadályozza, hogy ugyanaz a külső számla (pl. eaisyBill) többször bekerüljön az iratforgalomba.

CREATE UNIQUE INDEX IF NOT EXISTS idx_irat_company_kulso_hivatkozas 
ON public.irat (company_id, kulso_forras, kulso_hivatkozas_id) 
WHERE (kulso_hivatkozas_id IS NOT NULL);
