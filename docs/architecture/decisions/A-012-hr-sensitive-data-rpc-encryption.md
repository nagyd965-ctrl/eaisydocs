# [HR] A-012: eaisyHR Szenzitív Dolgozói Adatok (TAJ, Adóazonosító, Bér) RPC és RLS Védelme

**Status:** Decided  
**Date:** 2026-07-21 (Rögzítve: 2026-09-30)  
**Scope:** `[HR]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `supabase/migrations/20260721000001_eaisyhr_backend_core.sql`, `20260810000002_fix_hr_rls_and_rpcs.sql`, `20260817000001_ber_titkos_adat.sql`, `src/app/hr/employee/[id]/actions.ts`

---

## 1. Context (Kontextus)
A GDPR és a hazai adatvédelmi törvények szerint a munkavállalók személyes azonosítói (TAJ szám, adóazonosító jel, bankszámlaszám, bruttó/nettó béradatok) különleges bánásmódot igénylő szenzitív adatok.
Ezeket az adatokat nem szabad egyetlen sima `SELECT *` lekérdezéssel kiszolgálni, és még egy mezei HR asszisztens vagy részlegvezető sem láthatja a cég összes dolgozójának adószámát vagy fizetését.

---

## 2. Decision (A Meghozott Döntés)
1. **Adatmodellezési Szétválasztás:**
   - A nyilvános munkahelyi adatok (név, céges e-mail, beosztás, szervezeti egység) a `felhasznalo_profil` és a `hr_dolgozo_adatlap` táblákban élnek.
   - A szenzitív személyes és béradatok egy dedikált, titkosított táblában kaptak helyet: **`hr_dolgozo_titkos_adat`**.
   - Mezők: `taj_szam_titkositott`, `adoazonosito_titkositott`, `bankszamla_titkositott`, `brutto_ber_titkositott`, `netto_ber_titkositott` (`BYTEA` típusú mezők).
2. **Kizárólagos Security Definer RPC Megtekintés és Módosítás:**
   - A frontend közvetlen `SELECT` vagy `UPDATE` lekérdezése az adatbázis RLS szabályok miatt üres eredményt ad vagy hibára fut.
   - Az adatok elérésére és módosítására két PostgreSQL Security Definer tárolt eljárás szolgál:
     - `public.get_decrypted_hr_data(p_dolgozo_id UUID)`: Ellenőrzi, hogy a hívó HR vezető / admin-e, vagy a saját adatait kéri le. Siker esetén dekódolja és visszaadja a szöveges értékeket.
     - `public.update_decrypted_hr_data(...)`: Titkosítja és elmenti az új értékeket `BYTEA` formátumban.
3. **Audit Naplózás (`hr_esemeny_naplo`):**
   - Minden egyes szenzitív adatlekérés és módosítás automatikusan rögzítésre kerül a `hr_esemeny_naplo` táblában, feljegyezve a megtekintő személyét és az időpontot.

---

## 3. Consequences (Következmények)
* **Pozitív:** Kiemelkedő GDPR megfelelőség; belső adatszivárgás vagy jogosulatlan betekintés kizárása közvetlenül adatbázis szinten.
* **Karbantartás:** A titkosítási kulcsot és az RPC függvényeket szigorúan védeni kell; az adatbázis adminisztrátor sem férhet hozzá közvetlen szövegként a béradatokhoz a táblában.
