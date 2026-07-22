-- 20260721000005_hr_test_data.sql
-- Ez a script létrehoz egy szervezeti fát és 2 teszt beosztottat a te fiókod (testing@gmail.com) alá!

DO $$
DECLARE
    v_manager_id UUID;
    v_szulo_egyseg UUID;
    v_gyerek_egyseg UUID;
    v_dummy1 UUID := gen_random_uuid();
    v_dummy2 UUID := gen_random_uuid();
BEGIN
    -- 1. Megkeressük a te fiókodat
    SELECT id INTO v_manager_id FROM auth.users WHERE email = 'testing@gmail.com' LIMIT 1;
    
    -- Ha valamiért nem ez az email címed, akkor az első admin fiókot használjuk
    IF v_manager_id IS NULL THEN
        SELECT id INTO v_manager_id FROM felhasznalo_profil WHERE szerepkor = 'admin' LIMIT 1;
    END IF;

    -- Ha még mindig nincs meg, kilépünk
    IF v_manager_id IS NULL THEN
        RETURN;
    END IF;

    -- 7. TOBORZÁS TESZTADATOK (PHASE 4) --
    INSERT INTO hr_toborzas (nev, email, pozicio, statusz, naptar_jegyzet) VALUES
    ('Szabó Dávid', 'david.szabo@example.com', 'Junior Fejlesztő', 'uj', 'CV ellenőrzése szükséges'),
    ('Kovács Rita', 'rita.kovacs@example.com', 'UX Designer', 'uj', 'Beajánlott jelölt'),
    ('Németh Gábor', 'gabor.nemeth@example.com', 'Junior Fejlesztő', 'eloszurt', 'Telefonosan egyeztetve'),
    ('Tóth Eszter', 'eszter.toth@example.com', 'HR Menedzser', 'interju', 'Első körös interjú megvolt'),
    ('Varga Bálint', 'balint.varga@example.com', 'Senior Fejlesztő', 'ajanlat', 'Bérigény egyeztetve')
    ON CONFLICT DO NOTHING;

    -- 8. TELJESÍTMÉNY TESZTADATOK (PHASE 4) --
    INSERT INTO hr_teljesitmeny (dolgozo_id, celkituzes, hatarido, ertekeles_szazalek, megjegyzes) VALUES
    (v_dummy1, 'Új HR rendszer sikeres bevezetése (eaisyHR)', '2026-12-31', 80, 'Fejlesztés jól halad'),
    (v_dummy1, 'Technikai adósság csökkentése 20%-kal', '2026-12-31', 45, 'Folyamatban'),
    (v_dummy2, 'Fluktuáció 10% alatt tartása', '2026-12-31', 10, 'Kockázatos, növekszik a felmondások száma')
    ON CONFLICT DO NOTHING;

    -- 2. Szervezeti fa építése
    INSERT INTO szervezeti_egyseg (nev) VALUES ('Vezetőség') RETURNING id INTO v_szulo_egyseg;
    INSERT INTO szervezeti_egyseg (nev, szulo_id) VALUES ('Fejlesztés (Teszt Csapat)', v_szulo_egyseg) RETURNING id INTO v_gyerek_egyseg;

    -- 3. A te fiókodat kinevezzük a Vezetőségbe (Így a Fejlesztés a beosztottad lesz a get_hr_subordinates alapján)
    UPDATE felhasznalo_profil SET szervezeti_egyseg_id = v_szulo_egyseg, szerepkor = 'hr_vezeto' WHERE id = v_manager_id;

    -- 4. Teszt beosztottak létrehozása
    -- auth.users-be kell tenni, különben a foreign key miatt elszáll a profil létrehozás
    INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data) 
    VALUES 
    (v_dummy1, 'authenticated', 'authenticated', 'kovacs.anna@teszt.hu', '{"provider":"email","providers":["email"]}', '{"name":"Kovács Anna"}'),
    (v_dummy2, 'authenticated', 'authenticated', 'szabo.peter@teszt.hu', '{"provider":"email","providers":["email"]}', '{"name":"Szabó Péter"}');

    -- Profilok frissítése (A trigger automatikusan létrehozta őket, amikor beszúrtunk az auth.users-be)
    UPDATE felhasznalo_profil 
    SET nev = 'Kovács Anna', szerepkor = 'munkavallalo', szervezeti_egyseg_id = v_gyerek_egyseg 
    WHERE id = v_dummy1;

    UPDATE felhasznalo_profil 
    SET nev = 'Szabó Péter', szerepkor = 'munkavallalo', szervezeti_egyseg_id = v_gyerek_egyseg 
    WHERE id = v_dummy2;

    -- HR Dolgozó adatlapok létrehozása (Ez kötelező a szabadságokhoz!)
    INSERT INTO hr_dolgozo_adatlap (id, belepes_datuma)
    VALUES 
    (v_dummy1, '2024-01-01'),
    (v_dummy2, '2025-05-10');

    -- 5. Teszt Szabadságkérelmek generálása, hogy legyen mit jóváhagyni!
    INSERT INTO hr_tavollet (dolgozo_id, kezdet_datuma, veg_datuma, tipus, statusz)
    VALUES 
    (v_dummy1, '2026-08-10', '2026-08-15', 'szabadsag', 'jovahagyasra_var'),
    (v_dummy2, '2026-07-20', '2026-07-20', 'beteg', 'jovahagyasra_var');

END $$;
