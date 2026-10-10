# PRD: P-057 - eaisyHR Szabadságkiadási Megfelelőség és Év Végi Riasztás UX

## Státusz
**Decided** (2026-10-10)

## Hatókör
`[HR]`

## Kategória
`HR / Compliance & Leave Management`

## Kontextus és Felhasználói Probléma
1. **Mt. 122. § (3) - 14 napos egybefüggő pihenőidő:**
   - A törvény szerint a munkavállalót naptári évenként legalább 14 összefüggő napra mentesíteni kell a munkavégzés alól.
   - A HR vezetőknek eddig manuálisan kellett számolniuk a naptárban a szabadságokat és hétvégéket, ami 50-100+ munkavállaló esetén hibalehetőséget teremtett.
   - Ugyanakkor a való életben gyakori, hogy a munkavállaló nem kíván egyben 14 napot kivenni; a törvény engedi a felek írásbeli eltérő megállapodását. Ennek rögzítése és jogszerű kezelése eddig nem volt biztosított.
2. **Mt. 123. § - Év végi maradványszabadság felhalmozódás:**
   - Novemberhez közeledve a vezetők és a HR gyakran szembesülnek azzal, hogy több heti kiadatlan szabadság maradt, amit a hátralévő munkanapok szűkössége miatt már fizikailag lehetetlen az esedékesség évében kiadni.
   - Szükség volt egy proaktív, 4. negyedéves és novemberi riasztási rendszerre mind vállalati aggregált, mind egyéni dolgozói szinten.

## Megoldás és Felhasználói Élmény (UX)

### 1. Központi Vállalati Megfelelőségi Hub (`/hr/compliance`)
- **Statisztikai Sáv (Kanonikus `KpiCard` rács):**
  - **Megfelelőségi Ráta:** Százalékos arány a 14 napos feltételt teljesítő vagy mentesített dolgozókról (`tabular-nums`).
  - **14 Napos Mentesülés Hiány:** Azon munkatársak száma, akiknél sem 14 napos pihenő, sem eltérő megállapodás nincs rögzítve.
  - **Év Végi Maradványszabadság Riasztás:** Azon munkatársak száma, akiknél a maradványszabadság kiadása veszélyben van (sárga Q4 figyelmeztetés vagy piros kritikus munkanaphiány).
  - **Eltérő Megállapodások:** Azon dolgozók száma, akikkel törvényes megállapodás született a rugalmas szabadságkivételről.
- **Kanonikus `TableToolbar` Kereső és Szűrősáv:**
  - Keresőmező: név, munkakör vagy szervezeti egység szerinti azonnali szűrés.
  - Zöld **Szűrés Popover:**
    - 14 napos kötelezettség szerint: Teljesítve, Betervezve, Megállapodással mentes, Hiányzik.
    - Év végi kockázat szerint: Kritikus, Figyelmeztetés (November), Rendben.
    - Szervezeti egység (részleg) szerint dinamikusan kinyert lista.
  - Oszlopválasztó Popover (`Columns3`).
  - **CSV Export:** Teljes megfelelőségi és kockázati lista letöltése Excel/bérszámfejtő kompatibilis formátumban.
- **Megfelelőségi Adattáblázat:**
  - Dolgozó neve, avatarja, szervezeti egysége, munkaköre.
  - Szabadságkeret összefoglaló oszlop (Éves keret / Kivett / Betervezett / Maradvány).
  - 14 napos állapot: Badge jelvény (zöld Teljesült, kék Betervezve, lila Eltérő megállapodás, piros Hiányzik) + leghosszabb blokk intervalluma.
  - Év végi kockázat: Piros `Kritikus`, sárga `Q4 Riasztás`, zöld `Rendben` badge + fennmaradó napok vs. hátralévő munkanapok aránya.
  - In-place gyors műveletek: Eltérő megállapodás jóváhagyási kapcsoló (`Checkbox`), valamint közvetlen ugrás az adatlapra.

### 2. Dolgozói Szabadság Fül (`src/app/hr/employee/[id]?tab=leaves`)
- Közvetlenül a szabadság egyenleg alatt egy új **Mt. Szabadságkiadási Megfelelőség** panel kapott helyet.
- Két oszlopos Linear-inspirált elrendezés:
  - **Bal oldal (Mt. 122. § (3)):** Részletes tájékoztatás az egybefüggő pihenő állapotáról, pontos dátumintervallummal. HR/admin jogosultsággal egy azonnali kapcsoló (`Switch`) az Eltérő megállapodás érvényesítésére toast értesítéssel.
  - **Jobb oldal (Mt. 123. §):** Fennmaradó szabadság és évből hátralévő munkanapok összevetése, automatikus figyelemfelhívó szövegezéssel kritikus vagy novemberi kockázat esetén.
- Közvetlen hivatkozás a Vállalati Megfelelőségi Hubra.

## Kapcsolódó Kód és Hivatkozások
- ADR: [A-038](../../architecture/decisions/A-038-hr-leave-compliance-and-year-end-alert-engine.md)
- Felületek:
  - `src/app/hr/compliance/page.tsx`
  - `src/components/hr/leave-compliance-table.tsx`
  - `src/app/hr/employee/[id]/tabs/LeaveTab.tsx`
- Motor és műveletek:
  - `src/utils/hr/leave-compliance-calculator.ts`
  - `src/app/hr/compliance/compliance-actions.ts`
  - `supabase/migrations/20261010000001_add_leave_compliance_fields.sql`
