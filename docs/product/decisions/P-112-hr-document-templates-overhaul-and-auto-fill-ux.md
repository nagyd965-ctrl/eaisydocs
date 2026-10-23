# PRD P-112: eaisyHR Munkaügyi Sablonok Teljes Körű Átdolgozása és Automatikus Adat-előtöltés UX

- **Dátum:** 2026-10-23
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [PRD P-096](./P-096-employee-official-documents-dedicated-tab-ux.md), [PRD P-111](./P-111-hr-unified-official-employment-contract-generator-ux.md)

---

## 1. Felhasználói Igény és Probléma

1. **Hiányzó automatikus adat-előtöltés a szerződésgenerálóban:**
   - A 360° profilban a Munkaszerződés generálása során a munkavállaló szerződéses nyilvántartási adatai (születési hely, születési idő, anyja neve, lakcím, TAJ szám, bankszámlaszám) üres helykitöltőként (`Pl. Budapest`, `éééé. hh. nn.`, stb.) jelentek meg ahelyett, hogy a rendszer a meglévő dolgozói adatlapból (`hr_dolgozo_adatlap`), profilból (`felhasznalo_profil`) és titkos adatokból (`hr_dolgozo_titkos_adat` / `get_decrypted_hr_data`) automatikusan kitöltötte volna őket.
2. **Minősíthetetlen, kezdetleges sablonok (Bérmódosítás & Titoktartási nyilatkozat):**
   - Míg a *Hivatalos Munkaköri Leírás* és a *Hivatalos Munkaszerződés* részletes, strukturált A4-es fejlécet és jogi szakaszokat használt, addig a *Bérmódosítás* mindössze egy 2 soros szöveg volt pontozott vonallal (`................ Ft`), a *Titoktartási Nyilatkozat (NDA)* pedig egyetlen mondatból álló sablonként működött.
   - A felhasználó elvárása, hogy a rendszer minden olyan hivatalos sablont emeljen valódi, jogilag érvényes, céges fejléccel és törvényi hivatkozásokkal rendelkező szintre, amely 100%-ban automatikusan kitölti az összes ismert adatot, és interaktívan testreszabható (pl. új bér és hatálybalépés megadása).

---

## 2. Termék és UX Döntések

1. **100%-os Automatikus Adat-előtöltés Minden Sablonban:**
   - A `hr_dolgozo_adatlap` kibővítésre került a `szuletesi_hely` oszloppal (adatbázis migráció `20261023000003_add_szuletesi_hely_to_hr_dolgozo_adatlap.sql`), így a születési hely is állandó, szerkeszthető és menthető mezővé vált a személyes adatok fülön.
   - Létrejött a `getEmployeeContractFillData(dolgozoId)` központi szerver akció, amely egyetlen hívással összefésüli:
     - A dolgozó profil- és címadatait,
     - A születési helyét, születési idejét és anyja nevét,
     - A titkosított TAJ számát, adóazonosító jelét, bankszámlaszámát és aktuális bruttó személyi alapbérét,
     - A feloldott aktív munkakörét és szervezeti egységét.
   - Az `EmploymentContractPanel` ezt azonnal kezdeti állapotként (`initialPersonalData`) és aszinkron betöltésként is megkapja, garantálva, hogy a szerződéskészítő mezői azonnal és hiánytalanul kitöltve várják a HR szakembert.

2. **Hivatalos Munkaszerződés-módosítás (Bérmódosítás - Mt. 58. §) Újragondolása:**
   - **Interaktív vezérlősáv:** Közvetlenül a dokumentum felett egy diszkrét beviteli sávban a HR-es megadhatja az *Új Havi Bruttó Alapbért (Ft)* és a *Hatálybalépés Napját*, amely valós időben azonnal beépül a dokumentum szövegébe (nincsenek pontozott vonalak).
   - **Hivatalos A4-es fejléc és szerkezet:**
     - Munkáltató adatai (cégnév, székhely, cégjegyzékszám, adószám, képviselő).
     - Munkavállaló azonosító adatai (név, születési hely/idő, anyja neve, lakcím, adóazonosító, TAJ, munkakör).
     - Jogalap: Mt. 58. § közös megegyezéses szerződésmódosítás.
     - 1. Pont: Új bruttó alapbér megállapítása és a korábbi alapbér rögzítése.
     - 2. Pont: Kifizetés módja és határideje (tárgyhót követő 10-ig, bankszámlára utalás).
     - 3. Pont: Egyéb feltételek változatlansága.
     - 4. Pont: Záró rendelkezések (2 eredeti példány).
     - Aláírási blokk (Munkáltató képviselője és Munkavállaló).

3. **Hivatalos Titoktartási és Adatvédelmi Nyilatkozat (NDA - Mt. 8. § és 2018. évi LIV. tv.) Újragondolása:**
   - **Teljes körű jogi instrumentum:**
     - Fejléc és a nyilatkozó munkavállaló teljes azonosítása.
     - 1. Pont: Üzleti titok és bizalmas információ fogalma (fejlesztések, forráskódok, szerződések, know-how, személyes adatok).
     - 2. Pont: Titoktartási kötelezettség időbeli korlát nélküli hatálya (munkaviszony alatt és annak megszűnése után is).
     - 3. Pont: Információbiztonsági szabályok, IT eszközök és hozzáférések védelme, eszközök elszámolása és leadása.
     - 4. Pont: Jogi felelősség és szankciók:
       - Azonnali hatályú felmondás (Mt. 78. §),
       - Kártérítési felelősség (Mt. 179. §),
       - Büntetőjogi következmények: Btk. 418. § szerinti üzleti titok megsértése (3 évig terjedő szabadságvesztés).
     - 5. Pont: Záró nyilatkozat és önkéntes kötelezettségvállalás.
     - Aláírási blokk két tanú hivatalos záradékával.

4. **1:1 Pontosságú Puppeteer PDF Nyomtatás:**
   - A `generateAndSaveContract` szerver akció stílusrendszere kibővült az A4-es margókkal, rácsokkal (`grid-cols-2`), szegélyekkel és tipográfiával, így a generált és elmentett PDF teljesen megegyezik a képernyőn látható prémium nézettel.

---

## 3. Érintett Képernyők és Komponensek

| Fájl | Típus | Módosítás |
|---|---|---|
| `supabase/migrations/20261023000003_add_szuletesi_hely_to_hr_dolgozo_adatlap.sql` | SQL Migráció | `szuletesi_hely` oszlop hozzáadása a `hr_dolgozo_adatlap` táblához |
| `src/app/hr/employee/[id]/actions.ts` | Server Action | `updateGeneralPersonalInfo` felvértezése `szuletesi_hely` kezelésével |
| `src/app/hr/employee/[id]/tabs/GeneralPersonalInfoTab.tsx` | UI Komponens | Születési hely megjelenítése és szerkesztése a személyes adatok kártyán |
| `src/app/hr/actions/employment-contract-actions.ts` | Server Action | `getEmploymentContractRecord` automatikus összefésülése a dolgozói adatlap és titkos adatok alapján |
| `src/components/hr/employment-contract-panel.tsx` | UI Komponens | `adatlap` és `initialPersonalData` azonnali bevitele a kezdeti állapotokba |
| `src/app/hr/actions/contract-actions.ts` | Server Action | `getEmployeeContractFillData` létrehozása és A4 Puppeteer stílusok bővítése |
| `src/components/hr/contract-generator-dialog.tsx` | UI Komponens | Bérmódosítás és Titoktartási nyilatkozat teljes átdolgozása, automatikus adat-előtöltés |

---

## 4. Elfogadási Kritériumok (Acceptance Criteria)

- [x] A szerződésgenerálóban a munkavállaló összes szerződéses adata (születési hely, születési idő, anyja neve, lakcím, adóazonosító, TAJ szám, bankszámla) azonnal ki van töltve a rendszerben tárolt valós adatokkal.
- [x] A Bérmódosítás sablon a Munka Törvénykönyve 58. §-ának megfelelő, hivatalos kétoszlopos fejléccel és törvényi záradékokkal rendelkezik.
- [x] A Bérmódosításnál az új bér és a hatálybalépés dátuma közvetlenül állítható, és élőben frissül a dokumentumban.
- [x] A Titoktartási Nyilatkozat (NDA) a 2018. évi LIV. tv., az Mt. 8. § és a Btk. 418. § szerinti jogi szankciókat tartalmazó, hivatalos vállalati nyilatkozattá vált tanúzási blokkal.
- [x] A Zero-Emoji és No-Decorative-Icons irányelvek maradéktalanul teljesülnek.
- [x] A `npx tsc --noEmit` típusellenőrzés sikeresen lefut.
