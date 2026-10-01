# P-035: [HR] Közvetlen Beléptetés Indítás és Munkahelyi Eszközfelelősségi Jegyzőkönyv (Mt. 179. §) UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-025: Employee Document Filing and Dossier UX](./P-025-employee-document-filing-and-dossier-ux.md), [P-026: HR Document Templates and Lifecycle Filing Roadmap](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [P-031: Disciplinary and Damage Liability Lifecycle UX](./P-031-disciplinary-and-damage-liability-lifecycle-ux.md), [P-034: Onboarding Lifecycle Redesign and Activation UX](./P-034-onboarding-lifecycle-redesign-and-activation-ux.md)  
**Kapcsolódó forráskód:** `src/app/hr/onboarding/page.tsx`, `src/app/hr/onboarding/actions.ts`, `src/components/hr/add-onboarding-dialog.tsx`, `src/components/hr/asset-handover-dialog.tsx`, `src/components/hr/onboarding-profile-modal.tsx`, `src/app/hr/actions/asset-actions.ts`, `src/utils/hr/asset-handover-pdf-generator.ts`, `supabase/migrations/20261001000008_hr_munkahelyi_eszkoz.sql`, `src/utils/__tests__/asset-handover.test.ts`

---

## 1. Háttér és Célkitűzés

A megújított onboarding folyamat (P-034) stabil alapokat és tiszta életciklust teremtett a toborzásból érkező új munkatársak kezelésére. Ugyanakkor a valós HR gyakorlatban két kritikus funkció hiányzott:

1. **Közvetlen (Nem toborzásból indított) beléptetés:**
   - Sok új kolléga nem a klasszikus nyitott álláshirdetésen / toborzási kanban táblán keresztül érkezik (pl. belső áthelyezések, vezetői / C-level kinevezések, ajánlások, alvállalkozók vagy szezonális munkatársak).
   - Szükség volt egy közvetlen, manuális indítási lehetőségre az Onboarding képernyő fejlécéből (`[+ Új beléptetés indítása]`), amely szerepkör-specifikus feladatsablonokkal automatikusan generálja a checklistet.

2. **Munkahelyi Eszközök és Leltárfelelősség (Mt. 179. §):**
   - Az új belépők számára az IT és a gondnokság értékes vagyontárgyakat ad át (laptop, monitor, okostelefon, céges SIM kártya, belépőkártya, gépkocsi).
   - A Munka Törvénykönyve (2012. évi I. törvény 179. §) szerint a megőrzési felelősség (vétkességre tekintet nélküli leltárfelelősség) csak akkor érvényesíthető a munkavállalóval szemben kár vagy elszámolatlan hiány esetén, ha az átadás-átvétel írásban, tételes jegyzőkönyvvel, szériaszámokkal és visszaszolgáltatási kötelezettségvállalással történt.
   - Ezt a jegyzőkönyvet automatizáltan kell legenerálni, PDF formátumban normalizálni és beiktatni az eaisyDocs személyi dossziéba az `Eszközfelelősség` (3.3 kategória, 5 év megőrzési idő) alatt.

---

## 2. Megoldás és Felhasználói Élmény (UX)

### A. Közvetlen Beléptetés Indítás (`AddOnboardingDialog`)
- Az `/hr/onboarding` fejlécében megjelent az **`[+ Új beléptetés indítása]`** gomb.
- A modálban az alábbi adatok adhatók meg:
  - **Munkatárs neve**, **Kapcsolattartási e-mail**, **Munkakör / Pozíció** (kötelező mezők).
  - **Szervezeti egység / Részleg**, **Tervezett első munkanap (Dátum)**.
  - **Szerepkör-specifikus Sablonválasztó:**
    1. *Általános irodai munkatárs:* Szerződés, T1041, Munkaeszközök, Munkavédelem, Fiókaktiválás.
    2. *IT & Szoftverfejlesztő:* Laptop & perifériák jkv-vel, VPN & GitHub, T1041, Ergonómia oktatás, Fiókaktiválás.
    3. *Vezetői / C-Level sablon:* Vezetői szerződés & NDA, Laptop & okostelefon jkv, Aláírási címpéldány, T1041, Fiókaktiválás.
    4. *Fizikai / Operatív munkatárs:* Munkaruha & EHS védőeszközök, Üzemorvosi alkalmasság, Gépkezelői oktatás, Belépőkártya & kulcs.
- A folyamat elindításakor létrejön az onboarding rekord `fiok_allapot = 'varakozik'` státusszal, és az adott sablon feladatai automatikusan kiosztásra kerülnek a felelős részlegekhez (HR, IT, Bérszámfejtés, EHS, Pénzügy).

### B. Munkahelyi Eszközök és Átadás-Átvételi Jegyzőkönyv (`AssetHandoverDialog`)
- **Elérhetőség:**
  - Közvetlenül elérhető az onboarding profil fejlécéből: `[Eszközök & Jkv]` gomb.
  - Közvetlenül beágyazva minden olyan onboarding checklist feladat mellé, amely munkaeszközökre vagy informatikára vonatkozik (pl. *„Laptop & perifériák átadása”*, *„Munkahelyi eszközök átadása & jegyzőkönyv”*).
- **Funkciók a modálban:**
  - **Gyors előválasztó sablonok (1-kattintásos felvitel):** `+ Laptop (Mac/PC)`, `+ Mobiltelefon (SIM)`, `+ Belépőkártya`.
  - **Tételes eszközkezelés:** Kategória (IT, Telekommunikáció, Iroda, Gépjármű, Egyéb), eszköz megnevezése, gyári szám / IMEI, tartozékok listája, fizikai állapot (Új, Újszerű, Használt, Sérült).
  - **Tételes lista táblázat:** Valós idejű hozzáadás és törlés Supabase perzisztenciával.
  - **Jegyzőkönyv generálás & Iktatás (`[Jegyzőkönyv generálása és iktatása]`):**
    - Puppeteer PDF generátor meghívása a tételes adatokkal és Mt. 179. § szerinti jogi záradékokkal.
    - Fájl feltöltése a Supabase Storage `irat_files` vödörbe SHA-256 integritási hash-sel.
    - Automatikus iktatás az eaisyDocs rendszerbe a munkavállaló személyi dossziéjába (`Eszközfelelősség`, 3.3 kategória, 5 év megőrzési idő).
    - Az onboarding folyamatban lévő eszközátadási feladat **automatikus készre pipálása** a jegyzőkönyv sikeres lezárásakor.
    - In-browser PDF előnézet és letöltés biztosítása a felhasználó számára.

---

## 3. Adatbázis Architektúra

Új tábla: `hr_munkahelyi_eszkoz` (`20261001000008_hr_munkahelyi_eszkoz.sql`):
```sql
CREATE TABLE IF NOT EXISTS hr_munkahelyi_eszkoz (
  id UUID PRIMARY KEY DEFAULT gen_random_process_uuid(),
  dolgozo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
  onboarding_id UUID REFERENCES hr_onboarding(id) ON DELETE CASCADE,
  eszkoz_kategoria TEXT NOT NULL DEFAULT 'it', -- 'it', 'telekom', 'iroda', 'jarmu', 'egyeb'
  megnevezes TEXT NOT NULL,
  gyari_szam TEXT,
  tartozekok TEXT,
  allapot TEXT DEFAULT 'uj', -- 'uj', 'ujszeru', 'hasznalt', 'serult'
  atadas_datuma DATE DEFAULT CURRENT_DATE,
  visszavetel_datuma DATE,
  dokumentum_id UUID REFERENCES hr_dokumentum(id) ON DELETE SET NULL,
  megjegyzes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Jogi és Szabályozási Megfelelőség

- **Mt. 179. § (Megőrzési felelősség):** A Munkavállaló a visszaszolgáltatási kötelezettséggel átvett, kizárólagos őrizetében tartott vagyontárgyakban bekövetkezett hiányért vétkességére tekintet nélkül felel.
- **Iratkezelési kategória:** `Eszközfelelősség` (3.3 kategória).
- **Megőrzési idő:** 5 év (általános munkaügyi elévülési idő a munkaviszony megszűnésétől vagy az eszköz visszavételétől számítva).

---

## 5. Tesztelés és Minőségbiztosítás

- `src/utils/__tests__/asset-handover.test.ts`: 4 új egységteszt fedi le:
  1. Az Mt. 179. § leltárfelelősségi záradékok és tételes eszközök HTML megjelenítését.
  2. A vázlat (nem iktatott) állapotú tervezet vízjelet és iktatási pecsétet.
  3. Az eaisyDocs dosszié besorolást és 5 éves elévülési időt.
  4. A szerepkör-alapú onboarding sablonok feladat- és részlegallokációját.
- Teljes projekt tesztlefedettség: **52/52 teszt sikeres (100% zöld)**.
