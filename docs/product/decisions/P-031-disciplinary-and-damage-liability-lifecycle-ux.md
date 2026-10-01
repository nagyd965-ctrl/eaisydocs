# P-031: [HR] Munkáltatói Fegyelmi és Károkozási Határozatok (Mt. 56. §, 179. §) és eaisyDocs Iktatás UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]` & `[Docs]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-025: Employee Document Filing and Dossier UX](./P-025-employee-document-filing-and-dossier-ux.md), [P-026: HR Document Templates and Lifecycle Filing Roadmap](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [P-030: Study Contract Lifecycle and Filing UX](./P-030-study-contract-lifecycle-and-filing-ux.md), [BRD-003: Modular Independence Contract](../business/decisions/003-hr-modular-independence-contract.md)  
**Kapcsolódó forráskód:** `src/app/hr/employee/[id]/tabs/DisciplinaryTab.tsx`, `src/utils/hr/disciplinary-pdf-generator.ts`, `src/app/api/hr/disciplinary-pdf/route.ts`, `src/app/hr/employee/[id]/actions.ts`, `supabase/migrations/20261001000004_hr_fegyelmi_filing.sql`, `src/utils/__tests__/disciplinary-filing.test.ts`

---

## 1. Háttér és Problémafelvetés

A korábbi rendszerben a dolgozói profil *Bizalmas HR adatok* fülén a fegyelmi és kitüntetési ügyek egyetlen egyszerű táblázatban keveredtek:
1. **Fogalmi és motivációs zavar:** A pozitív elismerések (kitüntetések) és a szankciós eljárások (figyelmeztetések, bírságok, kártérítés) egy lapon szerepeltek, ráadásul a bizalmas/titkos HR szekcióba rejtve.
2. **Hiányzó jogi formai kellékek:** Sem írásbeli figyelmeztetésből, sem kártérítési felszólításból nem generálódott törvényes munkáltatói határozat.
3. **Mt. 285. § szerinti jogorvoslati hiányosság:** Munkajogi kötelezés esetén a munkáltató törvényi kötelessége írásban kioktatni a munkavállalót a 30 napos bírósági felülvizsgálati (munkaügyi perindítási) jogáról, valamint arról, hogy a keresetindításnak halasztó hatálya van a kártérítés végrehajtására.
4. **Hiányzó eaisyDocs iktatás:** A fegyelmi határozatok nem kerültek be hivatalos iktatószámmal a munkavállalói személyi dossziéba (`3.1 - HR iratok`).
5. **Védtelen törlés:** Korábban az iktatott fegyelmi tényállásokat is egy kattintással el lehetett tüntetni a rendszerből.

---

## 2. Megoldás és Felhasználói Élmény (UX)

### A. Fegyelmi és Károkozási Ügyek Letisztítása (`DisciplinaryTab.tsx`)
A komponens a *Bizalmas HR adatok* fülön marad, de kizárólag a jogi szankciókra és kártérítési kötelezésekre koncentrál:
- **Intézkedés típusai:**
  - `figyelmeztetes`: Írásbeli Figyelmeztetés (Mt. 56. §) – sárga figyelmeztető badge.
  - `megrovas`: Írásbeli Megrovás (Mt. 56. §) – narancs badge.
  - `karterites`: Kártérítési Kötelezés (Mt. 179. §) – vörös badge kárösszeggel és levonási ütemezéssel.
  - `egyeb`: Egyéb munkáltatói intézkedés.
- **Rögzítő dialógus:**
  - Tágas modal (`sm:max-w-[720px]`).
  - Esemény dátuma és átvétel/kézbesítés dátuma.
  - Határozatszám megadása.
  - Kártérítés esetén megfizetendő kár összege (Ft) és levonási / részletfizetési ütemezés megállapodás.
  - Részletes indoklás és tényállás (kötelezettségszegés körülményei, bizonyítékok).
  - Opcionális: Kézbesített / aláírt határozat feltöltése PDF formátumban.

### B. Hivatalos Munkáltatói Határozat PDF Generátor (`disciplinary-pdf-generator.ts`)
A generált dokumentum megfelel az Mt. alaki és tartalmi szabályainak:
- Fejlécben munkáltatói és munkavállalói adatok, eaisyDocs iktatási fejléc (`Iktatószám: ...`, `Irattári tétel: 3.1`).
- I. Rendelkező rész: megállapítja a szankciót (figyelmeztetés, megrovás, vagy kártérítés megfizetésére kötelezés konkrét összeggel és részletfizetéssel).
- II. Tényállás és indoklás.
- III. **Kötelező jogorvoslati tájékoztató (Mt. 285. § (1) bek.):**
  *„Tájékoztatom a Munkavállalót, hogy a jelen határozat ellen a kézbesítéstől számított 30 (harminc) napon belül keresettel fordulhat az illetékes Törvényszék Munkaügyi Kollégiumához. Kártérítés megfizetésére kötelezés esetén a keresetlevél benyújtásának a határozat végrehajtására halasztó hatálya van.”*
- Aláírási blokk: Munkáltatói jogkör gyakorlója és Munkavállalói átvételi elismervény záradék.

### C. Műveletek és Levéltári Védelem
- 👁️ **Megtekintés:** In-browser PDF megtekintő `PdfViewerDialog` komponenssel (`/api/hr/disciplinary-pdf?id=...&preview=true`).
- 📥 **Letöltés:** Közvetlen PDF letöltő gomb.
- 📁 **Iktatás:** Egykattintásos iktatás az eaisyDocs személyi dossziéba (`3.1 - HR iratok`, megőrzési idő: 5 év az Mt. 286. § szerinti 3 éves általános elévülési idő figyelembevételével, szigorúan `bizalmas` minősítéssel).
- 🗑️ **Törlésvédelem:** Az iktatott határozatok a levéltári szabályzatnak megfelelően nem törölhetők.

---

## 3. Adatbázis Változások

A `20261001000004_hr_fegyelmi_filing.sql` migráció:
```sql
ALTER TABLE public.hr_fegyelmi
  ADD COLUMN IF NOT EXISTS hatarozat_szam TEXT,
  ADD COLUMN IF NOT EXISTS kar_osszeg NUMERIC,
  ADD COLUMN IF NOT EXISTS reszletfizetes_leiras TEXT,
  ADD COLUMN IF NOT EXISTS jogorvoslat_hatarido DATE,
  ADD COLUMN IF NOT EXISTS atvetel_datuma DATE,
  ADD COLUMN IF NOT EXISTS dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fajl_url TEXT,
  ADD COLUMN IF NOT EXISTS iktatoszam TEXT,
  ADD COLUMN IF NOT EXISTS ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL;
```

---

## 4. Tesztelés és Ellenőrzés

- Unit tesztek: `src/utils/__tests__/disciplinary-filing.test.ts` (figyelmeztetés és kártérítés határozati struktúra tesztelve, 2/2 sikeres).
