# P-040: [HR] Megújított Offboarding Folyamat, Mt. Jogi Dokumentumgenerálás, eaisyDocs Iktatás és Kilépési HR Analytics UX

**Dátum:** 2026-10-02  
**Hatókör:** `[HR]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-015: Onboarding és offboarding checklist](./P-015-hr-onboarding-offboarding-checklist-ux.md), [P-034: Megújított Onboarding Folyamat](./P-034-onboarding-lifecycle-redesign-and-activation-ux.md), [P-035: Munkahelyi Eszközfelelősségi Jegyzőkönyv](./P-035-onboarding-manual-intake-and-asset-handover-ux.md), [P-037: Munkaszerződés Generátor és Iktatás](./P-037-onboarding-employment-contract-generator-and-filing-ux.md), [P-039: NAV T1041 Bejelentés](./P-039-onboarding-t1041-job-description-and-mt46-ux.md)  
**Kapcsolódó ADR-ek:** [A-026: Személyi Dosszié Híd](../../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md)  
**Érintett komponensek:** `src/app/hr/offboarding/*`, `src/components/hr/offboarding-profile-modal.tsx`, `src/components/hr/offboarding-card.tsx`, `src/components/hr/exit-interview-summary.tsx`, `src/components/hr/termination-panel.tsx`, `src/components/hr/asset-return-panel.tsx`, `src/components/hr/t1041-panel.tsx`, `src/components/hr/exit-interview-panel.tsx`, `src/components/hr/add-offboarding-dialog.tsx`, `src/utils/hr/termination-pdf-generator.ts`, `src/utils/hr/asset-return-pdf-generator.ts`

---

## 1. Háttér és Célkitűzés

Az Offboarding (Kiléptetés) modul korábbi verziója funkcionálisan és vizuálisan is jelentősen elmaradt a modernizált Onboarding modultól:
1. **Egyszerű checklist és hiányzó workflow:** A feladatok nem voltak osztályozva szervezeti felelősök (HR, IT, Bérszámfejtés, Üzemeltetés, Vezető) szerint, és a feladatok mellől hiányoztak a közvetlen funkcionális műveleti hivatkozások.
2. **Dokumentum-előkészítés és jogi automatizmus hiánya:** Nem állt rendelkezésre hivatalos Mt. (Munka Törvénykönyve) szerinti *Munkaviszony Megszüntetési Megállapodás* generáló (közös megegyezés, munkáltatói felmondás, munkavállalói felmondás, próbaidős azonnali hatály), sem pedig *Eszköz Visszavételi és Vagyoni Leszámoló Lap*, ami a munkavállaló leltári felelősségét végérvényesen megszünteti (Mt. 179. § / Mt. 80. §).
3. **Hiányzó személyi dosszié iktatás:** A kilépő dokumentumok nem kerültek beiktatásra a munkavállaló eaisyDocs személyi dossziéjába a kötelező jogi megőrzési időkkel (50 év és 5 év).
4. **"Gagyi" hatású Kilépési Interjú összesítő:** A korábbi felület egy minimális, struktúrálatlan szöveges lista volt, amelyből hiányoztak a HR-vezetők számára nélkülözhetetlen fluktuációs és elégedettségi KPI-ok, dimenzió-értékelések és elemzések.

---

## 2. Megvalósított Új Architektúra és UX

### A) Megújított Kiléptetési Karton Modál (`OffboardingProfileModal`)
- **Beágyazott füles struktúra:** A modálon belüli munkavégzés megszünteti az egymásra nyíló ablakokat. 5 dedikált fül érhető el:
  1. `Teendők (Checklist)`: Szervezeti egység / felelős szerinti szűrőchipekkel (HR, IT, Bérszámfejtés, Üzemeltetés, Vezető).
  2. `Megszüntetés`: Munkaviszony megszüntetési megállapodás konfigurátor és iktató panel.
  3. `Eszközök`: Munkaeszköz visszavételi és leltári leszámoló jegyzőkönyv.
  4. `T1041 Kijelentés`: NAV kijelentési ("T") adatlap, ÁNYK másoló és hatósági nyugta csatolás.
  5. `Kilépési Interjú`: Strukturált 4-dimenziós értékelés, fluktuációs okok és részletes visszajelzés.
- **Kontextuális Akciógombok a Teendők mellett:**
  - `[ Megszüntetés előkészítése ]` -> Azonnal a Megszüntetés fülre vált.
  - `[ Eszköz visszavétel & Jkv ]` -> Az Eszközök fülre vált.
  - `[ NAV T1041 kijelentés ]` -> A T1041 Kijelentés fülre vált.
  - `[ Kilépési interjú ]` -> Az Interjú fülre vált.
- **Fejléc Információk & Végleges Lezárás:**
  - Munkavállaló avatarja, betöltött munkaköre, részlege, utolsó munkanapja és távozási jogcíme (közös megegyezés, felmondás stb.).
  - Valós idejű előrehaladási sáv és archiválási megerősítő párbeszédablak.

### B) Munkaviszony Megszüntetési Megállapodás Generátor (`TerminationPanel` & `termination-pdf-generator.ts`)
- **Jogszabályi megfelelőség (Mt. 64–85. §):**
  - Közös megegyezés (Mt. 64. § (1) a)),
  - Munkáltatói felmondás (Mt. 64. § (1) b), 66. §) 30 napos bírósági jogorvoslati záradékkal (Mt. 287. §),
  - Munkavállalói felmondás (Mt. 67. §),
  - Azonnali hatályú megszüntetés próbaidő alatt (Mt. 79. § (1) a)),
  - Rendkívüli azonnali hatályú felmondás kötelezettségszegés miatt (Mt. 78. §).
- **Pénzügyi kalkuláció és paraméterezés:**
  - Utolsó munkanap és munkaviszony vége dátumok,
  - Felmentési idő munkanapokban (Mt. 70. §),
  - Megváltandó szabadság napok száma (Mt. 134. §),
  - Végkielégítés összege forintban (Mt. 77. §),
  - Megszüntetés hivatalos indoklása és egyedi záradékok.
- **Hiteles A4 PDF és eaisyDocs Iktatás:**
  - Vállalati adatokkal, iktatási pecséttel vagy tervezet vízjellel ellátott Puppeteer A4 PDF.
  - Automatikus iktatás az eaisyDocs személyi dossziéba az `1.2 - Munkaviszony megszüntetés` tétel alá (**50 év megőrzési idővel**).
  - Automatikusan teljesítettnek jelöli a kilépési papírok előkészítése feladatot.

### C) Eszköz Visszavételi és Vagyoni Leszámoló Lap (`AssetReturnPanel` & `asset-return-pdf-generator.ts`)
- **Leltári felelősség megszüntetése (Mt. 179. § / Mt. 80. §):**
  - Tételes eszközlista meglévő kiadott munkahelyi eszközökből (`hr_munkahelyi_eszkoz`), vagy új eszközök hozzáadásával.
  - Visszavételi állapot minősítés: *Ép / Hibátlan*, *Rendeltetésszerűen kopott*, *Sérült / Hibás*, *Hiányzik / Nem adott le*.
  - Sérülés vagy hiány esetén kártérítési összeg meghatározása és levonási záradék (Mt. 161. §).
  - Nullás vagyoni igazolás: igazolja a teljes tartozásmentességet és a leltári felelősség végérvényes megszűnését.
- **eaisyDocs Iktatás:**
  - Automatikus iktatás a személyi dossziéba az `1.4 - Eszköz átadás-átvételi jegyzőkönyvek` tétel alá (**5 év megőrzési idővel**).
  - Kapcsolódó eszközleadási és IT jogosultság-megvonási checklist feladatok automatikus készrepipálása.

### D) NAV T1041 Kijelentés & Nyugta Csatolás (`T1041Panel`)
- A T1041 panelt kiterjesztettük `initialType = "T"` (Törlés / Kijelentés) móddal és `offboardingId` kötéssel.
- Vágólapra másolható ÁNYK/ONYA adatok és hivatalos kijelentési adatlap.
- Hatósági NAV befogadási nyugta feltöltése azonnal készre állítja a T1041 feladatot és rögzíti a nyugta tárolási URL-jét az offboarding rekordban.

### E) Halasztott Iktatás és Csoportos Beiktatás a Kiléptetés Lezárásakor (Onboarding-paritás)
- **Folyamat közbeni mentés (Piszkozat / Draft):**
  - A kiléptetés során a megállapodások és leszámoló lapok generálásakor nem keletkezik azonnali, visszavonhatatlan iktatószám.
  - A dokumentumok mentésre kerülnek a tárolóba, és a felületen a jól ismert borostyán színű jelvény jelenik meg: `Mentve (Iktatás a kiléptetés lezárásakor)`.
  - A PDF-ek azonnal megtekinthetők (`Megtekintés`) és letölthetők (`Letöltés`) aláírásra vagy egyeztetésre. Szükség esetén bármikor újragenerálhatók.
  - Igény esetén a HR felelős az `[ Iktatás a dossziéba ]` gombbal egyedileg is beiktathatja bármelyik kész dokumentumot még a lezárás előtt.
- **Csoportos beiktatás Kiléptetés lezárásakor (`closeOffboarding`):**
  - A "Kiléptetés lezárása" gomb megnyomásakor a rendszer az összes addig be nem iktatott kilépési dokumentumot (Megszüntetési megállapodás, Eszközleszámoló lap, NAV T1041 iratok) automatikusan beiktatja a munkavállaló eaisyDocs személyi dossziéjába gap-mentes alszámokkal.
  - A még nyitott offboarding feladatok automatikusan elvégzett státuszba kerülnek.
  - A személyi dosszié hivatalos irattári archivált státuszba lép (`irattarban`), lezárva a munkavállalói életutat.

### F) Új Prémium Kilépési HR Analytics & Fluktuációs Műszerfal (`ExitInterviewSummary`)
A korábbi puritán szöveges nézet helyett egy modern, vállalati szintű HR Dashboard készült:
- **4 Felső KPI Kártya:**
  - *Összes lefolytatott interjú* és rögzítési arány.
  - *Átlagos össz-elégedettség* (1-5 csillagos skálán, vizuális csillagokkal).
  - *eNPS (Ajánlaná-e a céget)* százalékos arányban, zöld/piros bontással.
  - *Top Távozási Főok* (pl. Karrierlehetőség hiánya, Kompenzáció).
- **Dimenzió-szintű Értékelési Radar / Sávok:**
  - Mennyire volt elégedett a közvetlen vezetővel (Vezetés és Menedzsment),
  - Munkakörülmények és irodai környezet,
  - Előrelépési és karrierlehetőségek,
  - Kompenzáció és juttatások.
- **Távozási Okok Megoszlása & Új Karrier Céllomások:**
  - Százalékos sávos bontás a felmondási döntések mozgatórugóiról.
  - Új pozíciók megoszlása (Konkurens, Más iparág, Vállalkozás indítása, Pihenés/Képzés).
- **Szöveges Idézetek & Visszajelzés Kártyák:**
  - Pozitív tapasztalatok és javítandó területek strukturált, címkézett kártyái keresővel és szűrőkkel.
  - Részletes interjú-megtekintő modál minden dolgozóhoz.

### G) Gazdagabb Kilépő Dolgozó Hozzáadási Dialógus (`AddOffboardingDialog`)
- Munkavállaló kiválasztása név és pozíció szerint.
- Megszűnés jogcímének kiválasztása (Közös megegyezés, Munkáltatói felmondás stb.).
- Utolsó munkanap és jogviszony megszűnésének pontos dátumai.
- Szervezeti egység és munkakör automatikus átemelése, 7 standard feladat előkészítése.

---

## 3. Adatbázis és Migrációs Változások

A `supabase/migrations/20261001000014_hr_offboarding_enhancements.sql` migráció végrehajtásra került:
- `hr_offboarding` kiegészítve:
  - `megszunes_modja`: TEXT,
  - `indoklas`: TEXT,
  - `utolso_munkaban_toltott_nap`: DATE,
  - `felmentesi_ido_nap`: INTEGER,
  - `megvaltott_szabadsag_nap`: NUMERIC(4, 1),
  - `vegkielegites_osszeg`: NUMERIC(12, 2),
  - `reszleg`: TEXT,
  - `munkakor`: TEXT,
  - `szerzodes_pdf_url`: TEXT,
  - `eszkoz_elszamolas_pdf_url`: TEXT,
  - `t1041_nyugta_url`: TEXT.
- `hr_munkahelyi_eszkoz` és `hr_t1041_bejelentes` táblákhoz hozzáadva: `offboarding_id UUID REFERENCES hr_offboarding(id) ON DELETE SET NULL`.

---

## 4. Eredmények és Minőségbiztosítás

- **Automatizált tesztek:** 73/73 egységteszt sikeresen lefut (16 tesztcsomag), beleértve az új `src/utils/__tests__/termination-and-asset-return-pdf.test.ts` fájlt is.
- **Szigorú TypeScript típusellenőrzés:** `npx tsc --noEmit` 0 hibával zárult.
- **Vizuális és funkcionális konzisztencia:** Az Offboarding modul mostantól a nemzetközi enterprise HCM (Workday/BambooHR) színvonalán illeszkedik az eaisyDocs rendszeréhez.
