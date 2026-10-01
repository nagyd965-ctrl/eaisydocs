# P-029: [HR] Cafeteria Nyilatkozat In-Browser Megtekintés, Letöltés és eaisyDocs Iktatás UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]` & `[Docs]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-025: Employee Document Filing and Dossier UX](./P-025-employee-document-filing-and-dossier-ux.md), [P-026: HR Document Templates and Lifecycle Filing Roadmap](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [BRD-003: Modular Independence Contract](../business/decisions/003-hr-modular-independence-contract.md)  
**Kapcsolódó forráskód:** `src/app/hr/employee/[id]/tabs/CafeteriaTab.tsx`, `src/components/hr/cafeteria-declaration.tsx`, `src/utils/hr/cafeteria-pdf-generator.ts`, `src/app/api/hr/cafeteria-pdf/route.ts`, `src/app/hr/cafeteria-actions.ts`, `supabase/migrations/20261001000002_hr_cafeteria_filing.sql`

---

## 1. Háttér és Problémafelvetés

Az eaisyHR Cafeteria moduljában a munkavállalók az éves cafeteria keretükből (pl. 300.000 Ft) választhatnak juttatási elemeket (SZÉP-kártya, egészségpénztár, helyi bérlet stb.). A nyilatkozat véglegesítése után azonban több UX és jogi megfelelőségi hiányosság állt fenn:
1. **Nem volt in-browser megtekintés:** A felhasználónak le kellett töltenie a fájlt lemezre, nem tudta a felugró PDF modalban azonnal áttekinteni a nyilatkozatot.
2. **Hiányzott az eaisyDocs iktatási integráció:** A lezárt nyilatkozat nem került be a munkavállaló eaisyDocs személyi dossziéjába (`HR/2026/00038/x`), nem kapott hivatalos gap-mentes iktatószámot és nem kapcsolódott az auditált irattári rendszerhez.
3. **Dolgozói önkiszolgáló korlát:** A dolgozó a leadás után látta a táblázatot, de nem tudta megtekinteni vagy letölteni a hivatalos, aláírható PDF dokumentumot.
4. **Újranyitási levéltári védelem:** Év közbeni módosításkor az újranyitás figyelmeztetés nélkül törölhette a korábbi állapotot, nem tisztázva, hogy az iktatott példány archivált iratként megmarad-e.

---

## 2. Megoldás és Felhasználói Élmény (UX)

### A. HR Admin és Menedzser Nézet (`CafeteriaTab.tsx`)
A dolgozói profil *Cafeteria* fülén a „Leadott Nyilatkozat” kártya felülete az alábbi funkciókkal bővült:
1. 👁️ **Megtekintés (In-Browser Preview):** `PdfViewerDialog` komponens integrálása, amely a böngésző elhagyása és lemezre mentés nélkül azonnal megjeleníti az A4-es, hivatalos Cafeteria Nyilatkozatot.
2. 📥 **Letöltés:** Közvetlen PDF letöltő gomb a nyilatkozat helyi mentéséhez vagy nyomtatásához.
3. 📁 **Iktatás az eaisyDocs személyi dossziéba:**
   - Ha még nincs iktatva: `Iktatás` gomb (Archive ikon, egykattintásos indítás, loader visszajelzés).
   - Iktatás során a rendszer generálja a PDF-et, feltölti az `irat_files` Supabase storage vödörbe, és a `3.1 - HR és Munkaügyi iratok` kategóriába iktatja 50 év megőrzési idővel és `bizalmas` minősítéssel.
   - Ha már iktatva van: zöld badge jelenik meg az iktatószámmal (`Iktatva: HR/2026/00038/5`), közvetlen külső linkkel az eaisyDocs ügyirat-keresőre (`Dosszié megnyitása`).
4. 🔄 **Újranyitás megerősítő párbeszédablak:**
   - Iktatott nyilatkozat esetén sárga figyelmeztető blokk tájékoztatja a felhasználót, hogy a korábbi iktatott példány a levéltári törvénynek megfelelően megmarad az archívumban, és az új leadás új iratként iktatható.

### B. Dolgozói Önkiszolgáló Nézet (`CafeteriaDeclaration.tsx`)
A dolgozó a `/hr/self-service/benefits` oldalon a nyilatkozat lezárása után:
- Megtekintheti a saját hivatalos PDF nyilatkozatát (`PdfViewerDialog`).
- Letöltheti a PDF-et.
- Látja a hivatalos eaisyDocs iktatási státuszt és iktatószámot.

### C. Hivatalos Szja tv. 71. § szerinti PDF Előállítás (`cafeteria-pdf-generator.ts`)
A generált A4-es PDF dokumentum tartalmazza:
- Céges és munkavállalói fejlécadatok (Munkakör, Szervezeti egység).
- Tárgyév és nyilatkozati azonosítók.
- Keretösszeg-összesítő (Megállapított keret, Levont összeg, Fennmaradó keret, Kihasználtság %).
- Részletes táblázat tételenként, kért összeggel, szorzóval és levont összeggel.
- Munkavállalói jognyilatkozat (Cafeteria szabályzat elfogadása, feltételek igazolása, levonási hozzájárulás).
- Kétoldalú aláírási blokk (Munkavállaló és Munkáltató képviselője).
- Iktatási fejléc és záradék (`IKTATÓSZÁM: HR/...`).

---

## 3. Adatbázis Változások

A `20261001000002_hr_cafeteria_filing.sql` migráció bővítette a `hr_cafeteria_keret` táblát:
- `dokumentum_id UUID REFERENCES hr_dokumentum(id)`
- `fajl_url TEXT`
- `iktatoszam TEXT`
- `ugyirat_id UUID REFERENCES ugyirat(id)`
- `irat_id UUID REFERENCES irat(id)`
- `lezaras_datuma TIMESTAMPTZ`
- Indexek a `dokumentum_id`, `iktatoszam` és `ugyirat_id` mezőkön.

---

## 4. Minőségbiztosítás és Tesztelés

- **Unit tesztek:** `src/utils/__tests__/cafeteria-filing.test.ts` (3/3 zöld teszt: keretszámítás, HTML struktúra, tervezet állapot).
- **Integrációs tesztfutás:** A teljes HR tesztcsomag (22/22 teszt) hibátlanul lefutott.
- **Typecheck:** `npx tsc --noEmit` hiba nélkül befejeződött.
