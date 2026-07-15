TRUNCATE TABLE ertesites_naplo, ertesites_szabaly, irat_kapcsolat, irat_fajl, irat, ugyirat, ugy, partner RESTART IDENTITY CASCADE;

ALTER TABLE esemeny_naplo DISABLE TRIGGER ALL;
TRUNCATE TABLE esemeny_naplo RESTART IDENTITY CASCADE;
ALTER TABLE esemeny_naplo ENABLE TRIGGER ALL;
