# P-033: [HR & Docs] Hivatalos HR Dokumentumok Aláírt Példányának Csatolása és Verziókezelése UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]` & `[Docs]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-025: Employee Document Filing and Dossier UX](./P-025-employee-document-filing-and-dossier-ux.md), [P-026: HR Document Templates and Lifecycle Filing Roadmap](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [P-030: Study Contract Lifecycle and Filing UX](./P-030-study-contract-lifecycle-and-filing-ux.md), [P-031: Disciplinary and Damage Liability Lifecycle UX](./P-031-disciplinary-and-damage-liability-lifecycle-ux.md), [P-032: Awards and Honors Lifecycle UX](./P-032-awards-and-honors-lifecycle-ux.md), [A-026: Employee Personal Dossier and HR Filing Bridge](../../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md)  
**Kapcsolódó forráskód:** `src/components/hr/upload-signed-document-dialog.tsx`, `src/app/hr/employee/[id]/page.tsx`, `src/app/hr/employee/[id]/actions.ts`, `supabase/migrations/20261001000006_hr_dokumentum_signed_copy.sql`, `src/utils/__tests__/signed-document-filing.test.ts`

---

## 1. Háttér és Munkajogi Tisztázás

A munkavállalói életciklus során keletkező dokumentumok jogi és bizonyítási jellege eltérő:
1. **Rendszer által vezetett elektronikus nyilvántartások:**
   - Pl. a havi jelenléti ív (Mt. 134. §), az éves szabadság-nyilvántartás, vagy az elismerő díszoklevelek.
   - Ezeknél a jogszabály a munkáltató nyilvántartási kötelezettségét írja elő; a modern nagyvállalati gyakorlatban (pl. Bosch) a beléptető és munkaügyi szoftver által hitelesített elektronikus zárlat önmagában bizonyító erejű, a munkavállalónak nem szükséges havonta papíron aláírnia.
2. **Kétoldalú megállapodások és kártérítési felelősségvállalások:**
   - Pl. munkaszerződés és módosításai (Mt. 44. §), tanulmányi szerződés (Mt. 229. §), munkavállalói kártérítés átvétele (Mt. 179. §), eszközátvétel.
   - Ezeknél a hatósági ellenőrzések és munkaügyi perek során kötelező felmutatni a mindkét fél által aláírt (kézi vagy minősített digitális) okiratot.

---

## 2. Megoldás és Felhasználói Élmény (UX)

### A. Központi Idővonal Integráció (`page.tsx`)
Ahelyett, hogy a HR munkatársnak a különböző al-füleken (szerződés, tanulmányi, fegyelmi) kellene keresgélnie a feltöltési pontokat, a **Hivatalos Dokumentumok** központi idővonala kapta meg az aláírt példányok kezelését:
- **Állapotjelző jelvények:**
  - `Tervezet`: Szürke badge, ha a dokumentumból eddig csak a rendszer által generált sablon létezik.
  - `✓ Aláírt példány`: Zöldesszürke / teal kiemelt badge, ha a beszkennelt, aláírt példány csatolásra került.
- **Dátumbélyegző:** A kártya metaadatai között megjelenik az aláírás/csatolás pontos időpontja (`• Aláírva: 2026. 10. 01. 17:50`).

### B. Aláírt Példány Feltöltő Modál (`UploadSignedDocumentDialog.tsx`)
- Minden dokumentum sorában elérhető egy közvetlen műveleti gomb:
  - Ha még nincs aláírt példány: `[Aláírt példány feltöltése]` (toll ikonnal).
  - Ha már van: `[Aláírt példány cseréje]` (frissítés ikonnal).
- Felugró ablakban:
  - Dokumentum neve és kapcsolódó eaisyDocs iktatószáma.
  - Drag & drop fájlfeltöltő felület (PDF, JPG, PNG támogatással, méret- és típusellenőrzéssel).
  - Levéltári tájékoztató: megerősíti, hogy a feltöltött példány a meglévő iktatószám alatt új verzióként kerül rögzítésre.

### C. Automatikus eaisyDocs Verziókövetés (`uploadSignedDocumentAction`)
1. A feltöltött fájl biztonságosan bekerül az `irat_files` tárhely `signed_documents/${employeeId}/...` mappájába.
2. Ha a dokumentum már be volt iktatva (`doc.irat_id` nem null):
   - Az `irat_fajl` táblába bekerül a következő verzió (`verzio: 2`, `[ALÁÍRT]` előtaggal és SHA-256 hash-sel).
   - Az eaisyDocs `esemeny_naplo` táblájába `irat_modositas` bejegyzés íródik.
3. A `hr_dokumentum` táblában frissül: `alairt_fajl_url`, `alairva_ekor`, `alairas_statusz = 'alairva'`, `alairo_neve`.
4. A kapcsolódó domain rekordok (`hr_tanulmanyi_szerzodes`, `hr_fegyelmi`, `hr_kituntetes`, `hr_orvosi_vizsgalat`) fájl útvonala is szinkronizálódik.
5. A megtekintés (`PdfViewerDialog`) és a közvetlen letöltés prioritásként az aláírt példányt szolgálja ki.

---

## 3. Adatbázis Változások

A `20261001000006_hr_dokumentum_signed_copy.sql` migráció:
```sql
ALTER TABLE public.hr_dokumentum
  ADD COLUMN IF NOT EXISTS alairt_fajl_url TEXT,
  ADD COLUMN IF NOT EXISTS alairva_ekor TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS alairas_statusz TEXT DEFAULT 'vazlat',
  ADD COLUMN IF NOT EXISTS alairo_neve TEXT;

CREATE INDEX IF NOT EXISTS idx_hr_dokumentum_alairas_statusz ON public.hr_dokumentum(alairas_statusz);
```

---

## 4. Tesztelés és Ellenőrzés

- Unit tesztek: `src/utils/__tests__/signed-document-filing.test.ts` (3/3 sikeres teszt: prioritásos displayUrl, tervezet fallback, verziószám növelés).
