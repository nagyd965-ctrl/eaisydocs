# P-036: [HR & Docs] Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv (Mvt. 55. §, Ttv. 22. §) és Onboarding Iktatás UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]` & `[Docs]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-026: Munkavállalói Életciklus Dokumentumsablonok és Iratkezelési Terv](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [P-034: Megújított Onboarding Folyamat](./P-034-onboarding-lifecycle-redesign-and-activation-ux.md), [P-035: Közvetlen Beléptetés és Eszközátadás UX](./P-035-onboarding-manual-intake-and-asset-handover-ux.md)  
**Kapcsolódó forráskód:** `src/utils/hr/safety-training-pdf-generator.ts`, `src/app/hr/actions/safety-training-actions.ts`, `src/components/hr/safety-training-dialog.tsx`, `src/components/hr/onboarding-profile-modal.tsx`, `src/app/hr/employee/[id]/tabs/MedicalTab.tsx`

---

## 1. Háttér és Célkitűzés

A munkavédelemről szóló 1993. évi XCIII. törvény (Mvt.) 55. § (1) bekezdése alapján a munkáltatónak kötelezően oktatás keretében kell gondoskodnia arról, hogy a munkavállaló munkába álláskor elsajátítsa a biztonságos munkavégzés elméleti és gyakorlati ismereteit. A törvény szigorú rendelkezése szerint **a munkavállaló az oktatás elvégzéséig önállóan nem foglalkoztatható**. Ezzel párhuzamosan az 1996. évi XXXI. törvény (Ttv.) 22. §-a és az Országos Tűzvédelmi Szabályzat (OTSZ) kötelezővé teszi a tűzvédelmi szabályok, menekülési útvonalak és tűzoltó készülékek használatának igazolt oktatását.

Korábban az Onboarding modulban ugyan szerepelt egy teendő (feladat) az oktatás megtartására, de nem állt rendelkezésre törvényes formátumú, aláírható és hivatalosan beiktatható oktatási jegyzőkönyv generátor.

Jelen döntés célja a **Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv** generátor megvalósítása, az Onboarding folyamatba történő szerves beágyazása, valamint a kétlépcsős iktatási életciklus biztosítása az eaisyDocs rendszerrel.

---

## 2. Kétlépcsős Iktatási Életciklus (Pre-onboarding vs. Aktív Dolgozó)

Az eszközátadási jegyzőkönyvhöz (`P-035`) hasonlóan az oktatási jegyzőkönyv is igazodik a jelölt státuszához:

1. **Pre-onboarding fázis (amíg a munkavállalói fiók nincs aktiválva):**
   - A HR felelős vagy az EHS megbízott a jelölt modáljából vagy a teendőlistából elindítja a jegyzőkönyv készítését.
   - A gomb felirata: **„Jegyzőkönyv Generálása (PDF)”**.
   - A rendszer előállítja az Mvt. és OTSZ szerinti hivatalos PDF-et, elmenti a folyamathoz és az új `hr_munkavedelmi_oktatas` táblába.
   - A dokumentum borostyán jelvénnyel jelenik meg: `Generálva (Iktatás a fiók aktiválásakor)`.
   - A jegyzőkönyv kinyomtatható, hogy az első munkanapon a belépő munkatárs személyesen aláírhassa az elméleti és gyakorlati oktatás elvégzése után.
   - Az onboarding teendőlistában lévő oktatási feladat **automatikusan készre (done) pipálódik**.

2. **Fiókaktiváláskor (a „Fiók aktiválása” gombra nyomva):**
   - Amikor a HR aktiválja a leendő kolléga eaisyHR fiókját, létrejön a hivatalos felhasználói profilja és az eaisyDocs **Személyi Dossziéja**.
   - Az `activateOnboardingAccount` szerverakció automatikusan hozzárendeli a jegyzőkönyvet az új dolgozói profilhoz, és **azonnal beiktatja a személyi dossziéba**.
   - Irattári tétel: **3.4 - Munkavédelmi iratok** (Megőrzési idő: 10 év az Mvt. alapján).
   - A státusz átvált zöldre: `Beiktatva: IK-2026/000X`.

3. **Aktív dolgozó esetén (vagy a Munkavállalói Adatlapról):**
   - A dolgozói kartonon a *Megfelelőség & Egészségügy* (`MedicalTab`) fülről is indítható éves ismétlő vagy rendkívüli oktatás.
   - Ekkor a gomb közvetlenül: **„Jegyzőkönyv Generálása & Iktatás”**, és a generáláskor azonnal létrejön az iktatószám a személyi dossziéban.

---

## 3. Jegyzőkönyv Tartalma és Jogszabályi Megfelelősége

A `generateSafetyTrainingPdf` Puppeteer alapú motor a következő hivatalos elemeket jeleníti meg:

1. **Cégadatok és eaisyDocs Iktató Pecsét:**
   - Cégnév, székhely, adószám, képviselő neve.
   - Iktatási pecsét (`IKTATVA: HR/2026/000X/Y` vagy `TERVEZET - IKTATÁSRA VÁR`).
   - Irattári tétel: `3.4 • Munkavédelem (10 év megőrzés)`.

2. **Oktatott és Oktató Adatai:**
   - Munkavállaló neve, munkaköre, részlege, születési helye, ideje, anyja neve, lakcíme.
   - Oktató neve, beosztása / jogosultsága (pl. Munkavédelmi és Tűzvédelmi Megbízott).
   - Oktatás típusa (Előzetes munkába állási / Éves ismétlő / Rendkívüli).

3. **7 Pontos Részletes Tematika (Mvt. és OTSZ szerint):**
   - Munkáltatói és munkavállalói jogok, kötelezettségek (Mvt. 54–60. §).
   - Képernyős munkavégzés ergonómiája és kockázatai (50/1999. EüM rendelet).
   - Balesetek és veszélyhelyzetek bejelentése, elsősegélynyújtás rendje.
   - Tűzvédelmi Szabályzat és Házirend, dohányzási tilalom és kijelölt helyek (Ttv. 22. §).
   - Tűzjelzés rendje (112), menekülési útvonalak, vészkijáratok és külső gyülekezőhelyek.
   - Kézi tűzoltó készülékek elhelyezése és szakszerű használata.
   - Munkaterület rendje, villamos biztonság, IT eszközök kábelvezetése.

4. **Kifejezett Munkavállalói Elismerő Nyilatkozat:**
   - Elismeri a szabályok megértését és magára nézve kötelező jellegét.
   - Nyilatkozik arról, hogy munkavégzésre alkalmas fizikai és szellemi állapotban van.
   - Oktató és Munkavállaló különálló aláírási vonala és neve.

---

## 4. Adatbázis Séma (`hr_munkavedelmi_oktatas`)

```sql
CREATE TABLE public.hr_munkavedelmi_oktatas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES public.felhasznalo_profil(id) ON DELETE CASCADE,
    onboarding_id UUID REFERENCES public.hr_onboarding(id) ON DELETE CASCADE,
    oktatas_tipusa TEXT NOT NULL DEFAULT 'elozetes_munkaba_allasi',
    oktatas_datuma DATE NOT NULL DEFAULT CURRENT_DATE,
    oktato_neve TEXT NOT NULL,
    oktato_beosztasa TEXT,
    tematika JSONB NOT NULL DEFAULT '[]'::jsonb,
    megjegyzes TEXT,
    dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

---

## 5. UI Megjelenés és Integráció

1. **Onboarding Profil Modál beágyazott fül architektúra (`OnboardingProfileModal.tsx` & `SafetyTrainingPanel.tsx`):**
   - **Nincs modál a modálban ("popup a popupban"):** Az eszközátadási panelhez hasonlóan a munkavédelmi oktatás közvetlen beágyazott fülként (`munkavedelem`) él az Onboarding modálban a Teendők és a Munkahelyi Eszközök mellett.
   - **Fejléc gomb:** A fejlécben a `Munkavédelmi Jkv` gombra kattintva a modál zökkenőmentesen átvált a munkavédelmi fülre (visszaváltás: `Teendők nézet`).
   - **Teendőlista gyorsgomb:** A feladatlistában lévő munkavédelmi teendőnél az `Oktatási jkv.` gomb szintén a beágyazott fülre navigál.
   - **Vissza gomb:** A panel tetején a `Vissza` gomb azonnal visszaviszi a felhasználót az `Onboarding Teendők` listához.
2. **Dolgozói Karton (`MedicalTab.tsx` & `SafetyTrainingDialog.tsx`):**
   - Az önálló munkavállalói adatlapon (`/hr/employee/[id]`) a *Megfelelőség & Egészségügy* fülről a `SafetyTrainingDialog` önálló modálként nyitható meg, amely a közös `SafetyTrainingPanel` komponenst használja fel újra.
3. **Jegyzőkönyv Kezelés:**
   - Űrlap az oktató nevével, beosztásával, oktatás típusával, dátumával és 7 pontos tematikájával.
   - Meglévő jegyzőkönyv esetén állapotjelző kártya (iktatott vagy pre-onboarding tervezet), PDF előnézet (`PdfViewerDialog`), letöltés és manuális iktatási lehetőség.
