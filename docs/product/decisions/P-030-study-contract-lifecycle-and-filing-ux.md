# P-030: [HR] Tanulmányi Szerződések Életciklusa, Mt. 229. § Megfelelőség és eaisyDocs Iktatás UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]` & `[Docs]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-025: Employee Document Filing and Dossier UX](./P-025-employee-document-filing-and-dossier-ux.md), [P-026: HR Document Templates and Lifecycle Filing Roadmap](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [P-029: Cafeteria Declaration Filing and Preview UX](./P-029-cafeteria-declaration-filing-and-preview-ux.md), [BRD-003: Modular Independence Contract](../business/decisions/003-hr-modular-independence-contract.md)  
**Kapcsolódó forráskód:** `src/app/hr/employee/[id]/tabs/StudyContractTab.tsx`, `src/utils/hr/study-contract-pdf-generator.ts`, `src/app/api/hr/study-contract-pdf/route.ts`, `src/app/hr/employee/[id]/actions.ts`, `supabase/migrations/20261001000003_hr_tanulmanyi_szerzodes_filing.sql`, `src/utils/__tests__/study-contract-filing.test.ts`

---

## 1. Háttér és Problémafelvetés

A korábbi rendszerben a dolgozói profil *Munkaviszony és szerződések* fülén a tanulmányi szerződések kezelése egy rendkívül leegyszerűsített, mindössze 4 mezős űrlapból állt (képzés neve, költség, vállalt hónap, lejárati dátum, visszafizetési checkbox).

Ez a megvalósítás több súlyos jogi és funkcionális hiányosságot hordozott:
1. **Mt. 229. § jogszabályi hiányosságok:** Nem volt lehetőség rögzíteni a képző intézmény nevét, a képzés szintjét (pl. mesterképzés, hatósági vizsga, szakmai továbbképzés), valamint a kötelező tanulmányi munkaidő-kedvezményt (pl. vizsganapokra és konzultációkra járó mentesülést távolléti díjjal).
2. **Nem létezett hivatalos iratpéldány:** A rögzítésből nem generálódott jogszabályilag érvényes, kétoldalúan aláírható szerződéspéldány, sem in-browser megtekintés.
3. **Hiányzott az eaisyDocs iktatás:** A tanulmányi szerződés nem került be a munkavállaló személyi dossziéjába (`3.1 - HR iratok`), nem kapott gap-mentes iktatószámot.
4. **Védtelen törlés:** Bármikor egy kattintással törölhető volt, ami pénzügyi és munkajogi kockázatot jelentett a munkáltató számára.

---

## 2. Megoldás és Felhasználói Élmény (UX)

### A. Megújított Rögzítő Dialógus (`StudyContractTab.tsx`)
A modális ablak tágas (`sm:max-w-[720px]`), áttekinthető kétoszlopos struktúrát kapott, logikai blokkokba szervezve:
- **Képzés és intézmény adatai:** Képzés megnevezése, Képző intézmény / szolgáltató (pl. Budapesti Műszaki Egyetem), Képzés jellege / szintje.
- **Támogatás és munkaviszony-vállalás (Mt. 229. §):**
  - Támogatás összege (Ft-ban).
  - Vállalt munkaviszony (hónapban, Mt. 229. § (2) bek. szerinti max. 36 hónap érvényesítéssel).
  - Tanulmányok vége / szerződés lejárata.
  - Tanulmányi munkaidő-kedvezmény szöveges leírása.
  - Időarányos visszafizetési záradék (Mt. 229. § (5) bek.) jelölőnégyzete magyarázó szöveggel.
- **Aláírt szerződés feltöltése (opcionális PDF):** Ha a felek papíron már aláírták a szerződést, az beszkennelve azonnal feltölthető az `irat_files` tárhelyre.

### B. Táblázatos Megjelenítés és Műveletek
A táblázat oszlopai:
- **Képzés és Intézmény:** Képzés neve, intézmény és szint jelölése ikonnal.
- **Támogatás:** Formázott Ft összeg vagy költségmentes jelzés.
- **Vállalt Időtartam:** Vállalt hónapok száma.
- **Lejárat:** Tanulmányok tervezett befejezése.
- **Visszafizetés:** "Időarányos" vagy "Mentes" szemantikus badge.
- **Iktatás:** Zöld státusz badge (`Iktatva: HR/2026/00042/3`) közvetlen linkkel a személyi dossziéra (`/dossiers?open=...`), vagy szürke "Nem iktatott".
- **Műveletsor (Action Icons):**
  1. 👁️ **Megtekintés:** `PdfViewerDialog` beágyazott PDF olvasóval (azonnali betöltés `/api/hr/study-contract-pdf?id=...&preview=true`).
  2. 📥 **Letöltés:** Közvetlen PDF letöltés.
  3. 📁 **Iktatás:** Egykattintásos iktatási gomb (`Archive` ikon) az eaisyDocs személyi dossziéba.
  4. 🗑️ **Törlés:** Csak nem iktatott piszkozat esetén engedélyezett. Iktatott szerződés esetén a gomb letiltott és tájékoztat a levéltári védelemről.

### C. Hivatalos Mt. 229. § Szerződés PDF Generátor (`study-contract-pdf-generator.ts`)
A generált dokumentum megfelel a hatályos Mt. formai és tartalmi követelményeinek:
- Munkáltató és Munkavállaló teljes azonosító adatai (lakcím, adóazonosító, TAJ, munkakör, székhely, cégjegyzékszám).
- 1. Pont: Tanulmányok meghatározása (intézmény, szint, tervezett befejezés).
- 2. Pont: Munkáltató kötelezettségvállalása (képzési költség és munkaidő-kedvezmény).
- 3. Pont: Munkavállaló kötelezettségvállalása (eredményes befejezés és a kikötött idejű munkaviszony-fenntartás).
- 4. Pont: Időarányos visszafizetési záradék (Mt. 229. § (5)-(6) bek. szerint pontos felmondási és arányosítási szabályok).
- 5. Pont: Hatálybalépés, vitarendezés, aláírási blokk.
- Fejlécben az eaisyDocs iktatószám és a `3.1 - HR iratok` irattári tétel.

---

## 3. Adatbázis Változások

A `20261001000003_hr_tanulmanyi_szerzodes_filing.sql` migráció:
```sql
ALTER TABLE public.hr_tanulmanyi_szerzodes
  ADD COLUMN IF NOT EXISTS intezmeny_neve TEXT,
  ADD COLUMN IF NOT EXISTS kepzes_szintje TEXT,
  ADD COLUMN IF NOT EXISTS munkaido_kedvezmeny TEXT,
  ADD COLUMN IF NOT EXISTS szerzodes_szam TEXT,
  ADD COLUMN IF NOT EXISTS dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fajl_url TEXT,
  ADD COLUMN IF NOT EXISTS iktatoszam TEXT,
  ADD COLUMN IF NOT EXISTS ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL;
```

---

## 4. Tesztelés és Ellenőrzés

- Unit tesztek: `src/utils/__tests__/study-contract-filing.test.ts` (3/3 teszt lefutott és sikeres).
- TypeScript ellenőrzés: `tsc --noEmit` hibátlanul lefutott (0 hiba).
