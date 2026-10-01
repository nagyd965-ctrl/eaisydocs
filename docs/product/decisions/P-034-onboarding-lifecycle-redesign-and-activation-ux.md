# P-034: [HR] Megújított Onboarding Folyamat, Kétlépcsős Fiókaktiválás és Letisztult UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-015: Onboarding-Offboarding Checklist UX](./P-015-hr-onboarding-offboarding-checklist-ux.md), [P-025: Employee Document Filing and Dossier UX](./P-025-employee-document-filing-and-dossier-ux.md), [P-026: HR Document Templates and Lifecycle Filing Roadmap](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [P-033: Signed Document Copy Upload and Versioning UX](./P-033-signed-document-copy-upload-and-versioning-ux.md)  
**Kapcsolódó forráskód:** `src/app/hr/onboarding/page.tsx`, `src/app/hr/onboarding/actions.ts`, `src/app/hr/recruitment/actions.ts`, `src/components/hr/onboarding-list.tsx`, `src/components/hr/onboarding-card.tsx`, `src/components/hr/onboarding-profile-modal.tsx`, `supabase/migrations/20261001000007_hr_onboarding_lifecycle.sql`, `src/utils/__tests__/onboarding-lifecycle.test.ts`

---

## 1. Háttér és Problémafelismerés

A korábbi onboarding megvalósítás jelentős hiányosságokkal küzdött a nagyvállalati és életszerű használat során:
1. **Azonnali, korai fiókaktiválás:**
   - A toborzási kanban táblán (`/hr/recruitment`), amint egy jelöltet a HR az *„Elfogadva”* státuszba húzott, a rendszer azonnal legenerált egy éles felhasználói fiókot az `auth.users` és `felhasznalo_profil` táblákban, és Brevo e-mailben kiküldte a jelszót (`Welcome2026!`).
   - A valóságban a jelölt gyakran hetekkel később kezdi meg a munkáját (pl. felmondási idő az előző cégnél). Nem szabad azonnal aktív hozzáférést kapnia a belső rendszerekhez, amíg a munkaszerződés nincs aláírva és a belépés napja el nem érkezik.
2. **Duplikációk a táblán:**
   - A státuszváltás nem vizsgálta, hogy a jelölthöz létezik-e már onboarding rekord. Minden egyes kanban-kártya mozgatás újabb `hr_onboarding` sort szúrt be, többszörös bejegyzéseket eredményezve (pl. 3x Nagy Dániel, 2x Varga Bálint).
3. **Átláthatatlan, nem skálázható felület:**
   - A kártyákon közvetlenül kint volt az összes feladat checkboxokkal, ami miatt néhány munkatárs után a képernyő kezelhetetlenné vált.
   - Nem volt különválasztva a folyamatban lévő és a lezárt folyamat (nem volt archiválás), így a rég belépett dolgozók is a táblán maradtak.

---

## 2. Megoldás és Új Működési Modell (UX)

### A. Toborzási Leválasztás és Duplikációvédelem
- A jelölt *„Elfogadva”* státuszba húzásakor a rendszer **kizárólag egy előkészületi onboarding rekordot** hoz létre `statusz = 'folyamatban'` és `fiok_allapot = 'varakozik'` értékkel.
- Ha az adott jelölthöz már létezik onboarding folyamat, a rendszer nem szúr be új rekordot, megakadályozva a duplikációkat.
- Auth fiók és üdvözlő e-mail ebben a fázisban még **NEM** generálódik.

### B. Kétlépcsős Fiókaktiválás (`activateOnboardingAccount`)
- A munkavállalói eaisyHR fiók létrehozását és az üdvözlő e-mail kiküldését a HR munkatárs indítja el egy dedikált gombbal az Onboarding profil modálban (`OnboardingProfileModal`):
  - **Aktiválásra vár állapotban:** Sárga/kék információs kártya jelenik meg: *„Munkavállalói eaisyHR Fiók Létrehozása & Belépési E-mail”*, megerősítő párbeszédablakkal.
  - Az aktiváláskor lefut a fióklétrehozás, létrejön a `felhasznalo_profil`, a `hr_dolgozo_adatlap`, a `hr_jogviszony`, és a Brevo kiküldi a belépési adatokat.
  - Az onboarding rekord frissül: `fiok_allapot = 'aktivalva'`, `fiok_aktivalva_ekor = now()`, `dolgozo_id = userId`.
  - **Aktivált állapotban:** Zöld ellenőrzött kártya jelenik meg a fiókaktiválás pontos dátumával és egy közvetlen ugróponttal a dolgozó digitális személyi kartonjára (`/hr/employee/[id]`).

### C. Megújított, Letisztult Felület (`OnboardingList` & `OnboardingCard`)
1. **Felső KPI Statisztikai Sáv:**
   - *Aktív belépők* (folyamatban lévő belépések száma).
   - *Aktiválásra vár* (akiknek még nincs felhasználói fiókjuk).
   - *Hamarosan kezd* (következő 30 napban belépők száma).
   - *Átlagos haladás* (%-os feladatteljesítettség).
2. **Kétfülös Navigáció:**
   - **„Folyamatban lévő beléptetések”:** Csak az aktuálisan előkészület alatt álló jelöltek és új belépők.
   - **„Lezárt beléptetések”:** Archivált, sikeresen lezárt folyamatok számláló jelvénnyel.
3. **Kompakt, Modern Kártyák:**
   - Intelligens belépési dátum visszaszámláló (pl. *„Ma kezd!”*, *„Holnap kezd”*, *„14 nap múlva”*).
   - Fiókállapot jelző badge (*„Fiók aktiválásra vár”* vs *„Fiók aktív”*).
   - Haladási sáv számlálóval (pl. *„3 / 5 feladat (60%)”*).
   - Részleg szűrők a feladatokhoz (HR, IT, Bérszámfejtés, EHS).
4. **Beléptetés Lezárása & Újranyitása:**
   - A profil modálban elérhető a **„Beléptetés lezárása”** akció, amely megerősítés után átmozgatja a rekordot a lezárt fülre. Szükség esetén bármikor újranyitható.

---

## 3. Adatbázis Változások

A `20261001000007_hr_onboarding_lifecycle.sql` migráció:
```sql
ALTER TABLE hr_onboarding
ADD COLUMN IF NOT EXISTS dolgozo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fiok_allapot TEXT DEFAULT 'varakozik',
ADD COLUMN IF NOT EXISTS fiok_aktivalva_ekor TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lezarva_ekor TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lezarta_id UUID REFERENCES felhasznalo_profil(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reszleg TEXT;

CREATE INDEX IF NOT EXISTS idx_hr_onboarding_dolgozo_id ON hr_onboarding(dolgozo_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_toborzas_id ON hr_onboarding(toborzas_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_statusz ON hr_onboarding(statusz);

-- Obsolelt tesztadatok kitisztítása
DELETE FROM hr_onboarding;
```
