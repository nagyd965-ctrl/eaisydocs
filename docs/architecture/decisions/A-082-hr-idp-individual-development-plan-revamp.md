# ADR A-082: Egyéni Fejlesztési Terv (IDP) Architektúra és Tanúsítvány-igazolási Életciklus

- **Dátum:** 2026-10-23
- **Státusz:** `Decided`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](./A-029-global-ui-consistency-and-unified-components.md), [ADR A-074](./A-074-universal-document-viewer-and-employee-documents-architecture.md), [PRD P-106](../product/decisions/P-106-hr-idp-individual-development-plan-revamp-ux.md)

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR korábbi IDP (Egyéni Fejlesztési Terv) megvalósítása alapvető hiányosságokkal küzdött:
1. **Elkülönülés a Teljesítményértékeléstől:** A rendszerben korábban keveredett a vezetői KPI/teljesítményértékelés (`hr_teljesitmeny`) és a szakmai egyéni fejlődési célkitűzés (`hr_fejlesztesi_terv` és `hr_fejlesztesi_cel`).
2. **Hiányzó Entitás-kapcsolatok:** A mentor/felelős mező statikus szabad szöveges beviteli mező volt (`<Input placeholder="pl. Kovács Péter" />`), nem kapcsolta össze a célokat valódi kollégákkal (`felhasznalo_profil`, `hr_dolgozo_adatlap`), és nem kezelte a képzési intézményt, a finanszírozási modellt (céges, dolgozói önrész, ingyenes belső mentorálás), a képzési költséget és a kapcsolódó Mt. 229. § tanulmányi szerződéseket (`hr_tanulmanyi_szerzodes`).
3. **Hiányzó Tanúsítvány-leadási és Jóváhagyási Munkamenet:** A dolgozó nem tudta csatolni a megszerzett oklevelet/tanúsítványt, a vezető pedig nem rendelkezett in-place elbírálási (jóváhagyás / javításra visszaküldés indoklással) felülettel.
4. **Hiányzó Automatizációs Szinergia:** A megszerzett képzések nem kerültek be automatikusan a dolgozó „Szakmai háttér” (`hr_kepzettseg`) és „Hivatalos dokumentumok” (`hr_dokumentum`) nyilvántartásaiba.

## 2. Döntés

1. **Adatbázis Séma Kiterjesztés (`hr_fejlesztesi_cel`):**
   - Hozzáadtuk a következő új oszlopokat a `hr_fejlesztesi_cel` táblához:
     - `mentor_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL`
     - `intezmeny TEXT` (Képző intézmény, egyetem, platform neve)
     - `koltseg NUMERIC` (Képzés bruttó/nettó díja)
     - `finanszirozas TEXT` (`ceg`, `dolgozo`, `ingyenes`, `vegyes`)
     - `tanusitvany_url TEXT` (Tárhely útvonal a megszerzett igazoláshoz / oklevélhez az `irat_files` vödörben)
     - `tanusitvany_nev TEXT` (Eredeti fájlnév)
     - `tanusitvany_feltoltve_at TIMESTAMPTZ` (Feltöltés időpontja)
     - `elutasitas_indoklas TEXT` (Vezetői elutasítás vagy javításkérés szöveges indoklása)
   - Létrehoztuk az indexeket: `idx_hr_fejlesztesi_cel_mentor_id`, `idx_hr_fejlesztesi_cel_statusz`.

2. **Dinamikus Mentor és Szerződés Lekérdezés (Multi-tenant):**
   - Megvalósítottuk a `getCompanyMentorsAction(companyId?)` szerver akciót, amely a céghez rendelt dolgozói adatlapokból és tagokból dinamikus legördülő listát állít elő névvel és munkakörrel.
   - Megvalósítottuk a `getEmployeeStudyContractsAction(dolgozoId)` akciót, amely listázza az érintett munkavállaló aktív tanulmányi szerződéseit.

3. **Tanúsítvány Feltöltés és Biztonságos Előnézet:**
   - A dolgozó az `uploadIDPCertificateAction` akción keresztül töltheti fel a tanúsítványát (PDF/PNG/JPG, max 10MB) az `irat_files` védett vödörbe. A cél státusza `jovahagyasra_var` állapotba lép, és audit bejegyzés készül a haladási naplóba.
   - Az előnézet a `getSignedCertificateUrl(storagePath)` segítségével időkorlátos (1 órás) aláírt URL-t biztosít, megakadályozva az illetéktelen hozzáférést.

4. **Kétirányú Vezetői Elbírálás és Keresztmoduláris Automatizmus:**
   - **Jóváhagyás (`approveDevelopmentGoal`):** Státusz `teljesitve`, rögzül a teljesítés dátuma. Ha a cél `kepzes` vagy `nyelv` típusú, automatikusan létrejön egy rekord a `hr_kepzettseg` táblában. Ha tanúsítvány fájl is tartozott hozzá, automatikusan létrejön egy bejegyzés a `hr_dokumentum` táblában is (`tanusitvany` kategóriával).
   - **Elutasítás / Javításkérés (`rejectDevelopmentGoal`):** A cél visszakerül `folyamatban` állapotba, rögzül az `elutasitas_indoklas`, és a dolgozó felületén kiemelt figyelmeztető doboz jelenik meg az új tanúsítvány feltöltésének lehetőségével.

5. **Linear-Flat UI és Zero-Emoji Szabályozás:**
   - Mind a vezetői részletes adatlapon (`IDPTab`), mind a dolgozói önkiszolgáló felületen (`EmployeeIdpView`) 4-oszlopos `KpiCard` összegző sáv jelenik meg (Összes cél, Folyamatban, Jóváhagyásra vár, Sikeresen teljesítve).
   - Törlésre kerültek a felesleges kerekített dekoratív ikondobozok és emojik.

## 3. Érintett Komponensek és Fájlok

- `supabase/migrations/20261023000001_idp_revamp_columns.sql` (Adatbázis migráció)
- `src/app/hr/actions/idp-actions.ts` (Szerver akciók, jogosultságok, automatizmusok)
- `src/components/hr/idp/idp-dialog.tsx` (IDP cél létrehozó/szerkesztő párbeszédablak)
- `src/components/hr/idp/idp-certificate-upload-dialog.tsx` (Tanúsítvány feltöltő modál)
- `src/components/hr/idp/idp-certificate-viewer-dialog.tsx` (Tanúsítvány betekintő modál)
- `src/components/hr/idp/idp-rejection-dialog.tsx` (Vezetői elutasítás/javításkérés indokló modál)
- `src/components/hr/idp/idp-list-card.tsx` (Vezetői célkártya lista, elbírálási akciósávval)
- `src/app/hr/employee/[id]/tabs/IDPTab.tsx` (Dolgozói részletes nézet IDP füle)
- `src/app/hr/self-service/idp/page.tsx` (Dolgozói önkiszolgáló oldal)
- `src/components/hr/idp/employee-idp-view.tsx` (Dolgozói önkiszolgáló nézet)

## 4. Következmények

- Teljesen transzparens, papírmentes és auditálható folyamat jött létre a munkavállalói karrierfejlődés és képzésmenedzsment számára.
- A vezetők egy kattintással ellenőrizhetik és igazolhatják a megszerzett képesítéseket, amelyek azonnal megjelennek a munkavállaló hivatalos HR törzsadatai között.
- Megvalósult az eaisyHR és eaisyDocs moduláris függetlensége és a szigorú UI egységesség.
