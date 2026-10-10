# PRD: P-058 - eaisyHR Munkavédelmi és Tűzvédelmi Oktatások Központi Lejárati Mátrixa UX

## Státusz
**Decided** (2026-10-10)

## Hatókör
`[HR]`

## Kategória
`HR / Compliance & Occupational Safety`

## Kontextus és Felhasználói Igény
A munkáltatóknak törvényi kötelezettségük biztosítani, hogy minden dolgozó rendelkezzen érvényes munkavédelmi és tűzvédelmi oktatással (Mvt. 55. §, Ttv. 22. §). Hatósági ellenőrzéskor a cégnek azonnal be kell mutatnia az érvényes jegyzőkönyveket.
Korábban az oktatási jegyzőkönyvek csak szétszórtan, az egyes munkavállalók profiljának megnyitásával voltak megtekinthetők. A HR vezetőnek és a munkavédelmi felelősnek szüksége volt egy központi felügyeleti műszerfalra, ahol egyetlen pillantással látható az egész cég érvényessége, a lejáró és hiányzó oktatások, valamint egy kattintással elérhető az iktatott jegyzőkönyv és a pótlólagos oktatás rögzítése.

## Megoldás és Felhasználói Élmény (UX)

### 1. Kétfüles Munkaügyi Megfelelőség Hub (`/hr/compliance`)
- A meglévő oldalt elegáns, Linear-stílusú `Tabs` navigációval bővítettük:
  - **Fül 1: Szabadságkiadás (Mt. 122. §):** A 14 napos egybefüggő pihenő és az év végi maradványszabadságok táblázata.
  - **Fül 2: Munkavédelem & Tűzvédelem (Mvt. / Ttv.):** Az új központi munkavédelmi és tűzvédelmi oktatási lejárati mátrix.

### 2. Statisztikai Sáv (4 db Kanonikus `KpiCard`):
- **Munkavédelmi érvényesség:** Érvényes oktatással rendelkező dolgozók aránya az aktív állományban (pl. `6 / 8 fő`, `75% céges lefedettség`).
- **Érvényes oktatások:** Zöld kiemelésű darabszám a hatósági auditra felkészült dolgozókról.
- **Hamarosan lejáró (30 nap):** Sárga figyelmeztetés a következő 30 napon belül lejáró oktatásokról (éves ismétlés megszervezése).
- **Lejárt vagy hiányzik:** Piros riasztás az azonnali pótlást igénylő dolgozókról a munkavédelmi bírságok megelőzésére.

### 3. Oktatási Mátrix Táblázat (`SafetyTrainingTable`):
- **Kanonikus `TableToolbar`:**
  - Szöveges szűrés (név, munkakör, szervezeti egység).
  - Oszlopválasztó Popover (`Columns3`).
  - Zöld **Szűrés Popover:**
    - Státusz szűrő: Összes, Érvényes (>30 nap), Hamarosan lejár (30 napon belül), Lejárt, Hiányzik.
    - Oktatás típusa: Előzetes munkába állási (Onboarding), Éves időszakos ismétlő, Rendkívüli, Munkakör változás miatti.
    - Részleg szűrő: Szervezeti egységek dinamikus listája.
  - **Exportálás (CSV):** Hatósági jegyzék azonnali letöltése Excel/CSV formátumban.
- **Táblázat sorok:**
  - Munkatárs neve, profilképe, munkaköre és szervezeti egysége.
  - Oktatás típusa, utolsó oktatás dátuma, érvényesség lejárata (és a hátralévő napok száma).
  - Szemantikus HSL státusz jelvények:
    - 🟢 `Érvényes`
    - 🟡 `Hamarosan lejár (X nap)`
    - 🔴 `Lejárt (X napja)`
    - 🔴 `Hiányzik`
  - Iktatott jegyzőkönyv: `FileCheck2` jelvény iktatószámmal, amely kattintásra közvetlen ugrást biztosít a dossziéba, mellette `Eye` ikon a helyben megnyíló `PdfViewerDialog`-hoz.
  - **Gyors Művelet:** Minden munkatársnál közvetlen **„Munkavédelmi Oktatás”** gomb (`SafetyTrainingDialog`), amely előtölti a dolgozó adatait, legenerálja az új jegyzőkönyvet és automatikusan beiktatja a személyi dossziéba.

## Kapcsolódó Kód és Hivatkozások
- ADR: [A-039](../../architecture/decisions/A-039-hr-occupational-safety-compliance-matrix-architecture.md)
- Felületek:
  - `src/app/hr/compliance/page.tsx`
  - `src/components/hr/safety-training-table.tsx`
- Motor és műveletek:
  - `src/utils/hr/safety-compliance-calculator.ts`
  - `src/app/hr/compliance/compliance-actions.ts`
  - `src/app/hr/actions/safety-training-actions.ts`
  - `supabase/migrations/20261010000002_add_safety_training_validity.sql`
