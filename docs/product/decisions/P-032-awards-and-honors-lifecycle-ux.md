# P-032: [HR] Munkavállalói Kitüntetések, Szakmai Elismerések és Elismerő Oklevél UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]` & `[Docs]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-025: Employee Document Filing and Dossier UX](./P-025-employee-document-filing-and-dossier-ux.md), [P-026: HR Document Templates and Lifecycle Filing Roadmap](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [P-030: Study Contract Lifecycle and Filing UX](./P-030-study-contract-lifecycle-and-filing-ux.md), [P-031: Disciplinary and Damage Liability Lifecycle UX](./P-031-disciplinary-and-damage-liability-lifecycle-ux.md), [BRD-003: Modular Independence Contract](../business/decisions/003-hr-modular-independence-contract.md)  
**Kapcsolódó forráskód:** `src/app/hr/employee/[id]/tabs/AwardsTab.tsx`, `src/utils/hr/award-certificate-pdf-generator.ts`, `src/app/api/hr/award-pdf/route.ts`, `src/app/hr/employee/[id]/actions.ts`, `supabase/migrations/20261001000005_hr_kituntetes_modul.sql`, `src/utils/__tests__/award-filing.test.ts`

---

## 1. Háttér és Problémafelvetés

A korábbi rendszerben a dolgozói profil *Bizalmas HR adatok* fülén a fegyelmi és kitüntetési ügyek egyetlen egyszerű táblázatban keveredtek:
1. **Szakmai és etikai összeférhetetlenség:** A pozitív elismerések és kitüntetések a fegyelmi szankciókkal és kártérítésekkel egy helyen szerepeltek, elrejtve a bizalmas HR fül alá.
2. **Kollaboratív láthatóság hiánya:** Egy munkavállaló kitüntetéseit, nívódíjait és jubileumi elismeréseit büszkén kell prezentálni a *Szakmai Háttér* és életút részeként.
3. **Hiányzó oklevél generálás:** Nem készült hivatalos, díszes elismerő oklevél az átadáshoz vagy digitális nyilvántartáshoz.
4. **Hiányzó irattári kapcsolat:** Az elismerések nem kerültek be hivatalos iktatószámmal a munkavállaló eaisyDocs személyi dossziéjába (`3.1 - HR iratok`).

---

## 2. Megoldás és Felhasználói Élmény (UX)

### A. Kitüntetések és Elismerések Önálló Modulja (`AwardsTab.tsx`)
A kitüntetések a *Szakmai Háttér* szekcióba kerültek a dolgozói adatlapon:
- **Kategóriák és vizuális jelölések:**
  - `vallalati_dij`: Vállalati Kiválósági Díj (arany trófea, borostyán badge).
  - `szakmai_innovacio`: Szakmai és Technológiai Innováció (ciánkék csillag badge).
  - `projekt_kivalosag`: Kiemelkedő Projekt Teljesítmény (kék érem badge).
  - `jubileum`: Törzsgárda és Jubileumi Elismerés (lila medál badge).
  - `csapatmunka`: Kiemelkedő Csapatmunka (zöld pipa badge).
  - `vezeto_dicseret`: Vezérigazgatói Dicséret (rózsa badge).
  - `egyeb`: Általános Szakmai Elismerés.
- **Rögzítő dialógus:**
  - Tágas modal (`sm:max-w-[700px]`).
  - Elismerés / Díj megnevezése, kategória és dátum.
  - Adományozó szervezet / vezető megjelölése (pl. Vezérigazgató és Igazgatótanács).
  - Kapcsolódó pénzjutalom összege (Ft-ban, opcionális).
  - Hivatalos méltatás és indoklás részletezése.
  - Opcionális: Már átadott / aláírt díszoklevél szkennelt példányának feltöltése.

### B. Reprezentatív Elismerő Oklevél PDF Generátor (`award-certificate-pdf-generator.ts`)
- Fekvő A4 formátum, díszes arany/teal szegéllyel és sarokdíszekkel.
- Tipográfia: 'Cinzel' és 'Montserrat' betűcsaládok a formális megjelenésért.
- Fejlécben vállalati arculat és eaisyDocs iktatási pecsét (`Iktatószám: ...`, `Irattári tétel: 3.1 • eaisyDocs Személyi Dosszié`).
- Díjazott neve, munkaköre, elismerés megnevezése és az adományozás indoklása (méltatás).
- Opcionális pénzjutalom megjelölése vagy erkölcsi elismerés záradék.
- Aláírási és pecséthely.

### C. Műveletek és Levéltári Védelem
- 👁️ **Megtekintés:** In-browser PDF megtekintő `PdfViewerDialog` komponenssel (`/api/hr/award-pdf?id=...&preview=true`).
- 📥 **Letöltés:** Közvetlen PDF letöltés.
- 📁 **Iktatás:** Egykattintásos iktatás a személyi dossziéba (`3.1 - HR iratok`, megőrzési idő: 50 év a munkaviszony megszűnésétől).
- 🗑️ **Törlésvédelem:** Az iktatott elismerések védettek a törléstől.

---

## 3. Adatbázis Változások

A `20261001000005_hr_kituntetes_modul.sql` migráció:
```sql
CREATE TABLE IF NOT EXISTS public.hr_kituntetes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID NOT NULL REFERENCES public.hr_dolgozo_adatlap(id) ON DELETE CASCADE,
    megnevezes TEXT NOT NULL,
    kategoria TEXT NOT NULL DEFAULT 'vallalati_dij',
    datum DATE NOT NULL,
    adomanyozo TEXT,
    indoklas TEXT NOT NULL,
    jutalom_osszeg NUMERIC,
    dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    fajl_url TEXT,
    iktatoszam TEXT,
    ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL,
    irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Tesztelés és Ellenőrzés

- Unit tesztek: `src/utils/__tests__/award-filing.test.ts` (díszoklevél HTML és pénzbeli/erkölcsi variációk tesztelve, 2/2 sikeres).
