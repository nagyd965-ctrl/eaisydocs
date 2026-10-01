# P-037: [HR & Docs] Onboarding Munkaszerződés Előkészítés, Generálás (Mt. 42–45. §) és Személyi Dosszié Iktatás UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]` & `[Docs]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-025: Munkavállalói Hivatalos Dokumentumok Iktatása és Személyi Dosszié UX](./P-025-employee-document-filing-and-dossier-ux.md), [P-026: Munkavállalói Életciklus Dokumentumsablonok](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [P-034: Megújított Onboarding Folyamat](./P-034-onboarding-lifecycle-redesign-and-activation-ux.md), [P-035: Munkahelyi Eszközök és Átadás-Átvétel UX](./P-035-onboarding-manual-intake-and-asset-handover-ux.md), [P-036: Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv UX](./P-036-occupational-safety-and-fire-training-protocol-ux.md)  
**Kapcsolódó forráskód:** `src/utils/hr/employment-contract-pdf-generator.ts`, `src/utils/hr/employment-contract-constants.ts`, `src/app/hr/actions/employment-contract-actions.ts`, `src/components/hr/employment-contract-panel.tsx`, `src/components/hr/onboarding-profile-modal.tsx`, `src/app/hr/onboarding/actions.ts`, `supabase/migrations/20261001000010_hr_munkaszerzodes.sql`

---

## 1. Háttér és Célkitűzés

A munka törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 42. §-a szerint **a munkaviszony munkaszerződéssel jön létre**, amelyet a 44. § alapján kötelezően **írásba kell foglalni**. Az Mt. 45. §-a meghatározza a munkaszerződés elengedhetetlen tartalmi elemeit:
1. A felek megállapodása a **munkavállaló alapbérében**,
2. A munkavállaló **munkakörében**,
3. A **munkaviszony kezdetének napjában** és időtartamában (határozatlan vagy határozott),
4. A **munkaidő mértékében** (teljes vagy részmunkaidő),
5. A **munkavégzés helyében**,
6. Opcionálisan a kikötött **próbaidőben** (legfeljebb három hónap, kollektív szerződés esetén hat hónap).

Korábban az eaisyHR Onboarding moduljában a munkaszerződés csupán egy statikus szöveges checklist-elemként létezett (*„Munkaszerződés előkészítése & aláírása”*), manuális pipálási lehetőséggel, de hiányzott a tényleges szerződés-előkészítő, adatbekérő és törvényes PDF-generáló mechanizmus. Ennek következtében a HR-eseknek külső szövegszerkesztőben kellett megfogalmazniuk a szerződést, ami lassú és hibaérzékeny volt.

Jelen fejlesztés célja a **Munkaszerződés (Mt. 42–45. §)** teljes életciklusának beágyazása az Onboarding modulba:
- A jelölt személyes, azonosító és munkajogi adatainak közvetlen szerkesztése.
- Törvényi előírásoknak megfelelő, eaisyDocs iktatási fejléccel és pecséttel ellátott kétoldalú A4 PDF munkaszerződés automatikus generálása Puppeteerrel.
- Kétlépcsős életciklus: tervezési fázis a pre-onboarding alatt, majd **automatikus beiktatás az eaisyDocs Személyi Dossziéba** a munkavállalói fiók aktiválásakor.
- Az onboarding checklist-feladat automatikus készre jelölése a szerződés előállításakor.
- Aláírt, beszkennelt példány feltöltésének és verziózásának azonnali támogatása.

---

## 2. Kétlépcsős Iktatási Életciklus és eaisyDocs Integráció

Az Mt. szerinti munkaszerződés az irattári tervben az **1.2 - Munkaviszony létesítése iratok** kategóriába tartozik, amelyre a társadalombiztosítási és nyugdíjjogi jogszabályok (1997. évi LXXXI. tv.) alapján kötelezően **50 éves megőrzési idő** és szigorúan `bizalmas` minősítés vonatkozik.

1. **Pre-onboarding fázis (a leendő kolléga még nem rendelkezik éles fiókkal):**
   - A HR felelős az Onboarding profil modál **Munkaszerződés (Mt. 42. §)** fülén megadja vagy ellenőrzi a szerződés paramétereit (munkakör, kezdés dátuma, alapbér, munkaidő, próbaidő, személyes azonosítók).
   - A gomb felirata: **„Munkaszerződés Előkészítése (PDF Tervezet)”**.
   - A rendszer legenerálja a hiteles PDF-et, elmenti a `hr_munkaszerzodes` táblába és a Supabase storage-be.
   - A szerződés állapota borostyán kártyával jelenik meg: `Tervezet előkészítve (Iktatás a fiók aktiválásakor)`.
   - A szerződés kinyomtatható, elektronikusan kiküldhető vagy személyesen aláíratható a belépés előtt/napján.
   - Az onboarding folyamat kapcsolódó feladata (*„Munkaszerződés előkészítése & aláírása”*) **automatikusan készre (done) pipálódik**.

2. **Fiókaktiváláskor (a „Fiók aktiválása” gombra kattintva):**
   - Amikor a HR aktiválja a belépő fiókját (`activateOnboardingAccount`), a rendszer:
     - Létrehozza a `felhasznalo_profil` és `hr_dolgozo_adatlap` rekordokat.
     - Átmásolja a szerződésben rögzített adatokat a személyi adatlapra (belépés dátuma, lakcím, születési adatok, anyja neve).
     - Megnyitja a dolgozó hivatalos eaisyDocs **Személyi Dossziéját**.
     - A tárolt munkaszerződést **automatikusan beiktatja a személyi dossziéba** az `1.2 - Munkaviszony létesítése iratok` tételhez, 50 éves megőrzési idővel.
     - A szerződés állapota átvált hivatalos zöld jelvényre: `Beiktatva: HR/2026/.../1`.

3. **Aktív dolgozó esetén:**
   - Amennyiben a fiók már eleve aktiválva van, az `Iktatás Személyi Dossziéba` gomb azonnal végrehajtja a gap-mentes iktatást.

---

## 3. A Munkaszerződés Jogi Tartalma (Mt. 42–45. §)

A `generateEmploymentContractPdfBuffer` által előállított nyomdai minőségű A4 PDF a következő pontokból épül fel:

1. **eaisyDocs Fejléc és Iktatási Pecsét:**
   - Cégadatok: Cégnév, székhely, adószám, cégjegyzékszám, törvényes képviselő.
   - Iktatási pecsét: `IKTATVA: HR/2026/000X/Y` vagy `TERVEZET - IKTATÁSRA VÁR`.
   - Irattári tétel: `1.2 • Munkaviszony létesítése (50 év megőrzés)`.

2. **Szerződő Felek Adatai:**
   - **Munkáltató:** Vállalati adatok és képviselő neve.
   - **Munkavállaló:** Név, születési név, születési hely és idő, anyja leánykori neve, lakcím, adóazonosító jel, TAJ szám, bankszámlaszám.

3. **Munkajogi Rendelkezések (Mt. szerint):**
   - **1. pont – Munkaviszony kezdete és jellege:** Kezdőnap megjelölése, határozatlan vagy határozott időtartam (utóbbi esetén a lejárati nap pontos rögzítése).
   - **2. pont – Munkakör és munkaköri leírás:** Munkakör megnevezése, utalás az átadott külön munkaköri leírásra.
   - **3. pont – Munkaidő és munkarend:** Napi munkaidő (pl. 8 óra vagy részmunkaidő esetén óraszám), teljes vagy részmunkaidős besorolás.
   - **4. pont – Munkabér és juttatások:** Bruttó havi alapbér (Ft/hó) számmal és szövegesen kiírva, havi utólagos banki átutalásos elszámolás az Mt. 157. § szerint.
   - **5. pont – Próbaidő:** Próbaidő kikötése (hónapban, max 3 hónap az Mt. 45. § (5) bek. szerint), azonnali hatályú indoklás nélküli megszüntethetőség.
   - **6. pont – Munkavégzés helye és távmunka:** Székhely/telephely vagy változó munkavégzési hely, megállapodás hibrid/távmunka végzésről.
   - **7. pont – Titoktartás és jogorvoslat:** Mt. 8. § szerinti üzleti titoktartási kötelezettség, Mt. 285. § szerinti munkaügyi bírósági jogorvoslati kioktatás.
   - **8. pont – Aláírási blokk:** Kétoldalú, cégszerű munkáltatói és dolgozói aláírási mezők helységgel és dátummal.

---

## 4. Adatbázis Séma (`hr_munkaszerzodes`)

```sql
CREATE TABLE public.hr_munkaszerzodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dolgozo_id UUID REFERENCES public.felhasznalo_profil(id) ON DELETE CASCADE,
    onboarding_id UUID REFERENCES public.hr_onboarding(id) ON DELETE CASCADE,
    szerzodes_szam TEXT,
    munkakor TEXT NOT NULL,
    kezdes_datuma DATE NOT NULL DEFAULT CURRENT_DATE,
    szerzodes_tipusa TEXT NOT NULL DEFAULT 'hatarozatlan', -- 'hatarozatlan' | 'hatarozott'
    hatarozott_lejarat DATE,
    munkaido_tipus TEXT NOT NULL DEFAULT 'teljes',        -- 'teljes' | 'reszmunkaido'
    napi_munkaido_ora NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    probaido_honap INTEGER NOT NULL DEFAULT 3,
    alapber NUMERIC(12,2) NOT NULL DEFAULT 0,
    munkavegzes_helye TEXT NOT NULL DEFAULT 'Székhely / Változó munkahely',
    tavmunka_megallapodas BOOLEAN NOT NULL DEFAULT false,
    szuletesi_hely TEXT,
    szuletesi_datum DATE,
    anyja_neve TEXT,
    lakcim TEXT,
    adoazonosito_jel TEXT,
    taj_szam TEXT,
    bankszamlaszam TEXT,
    dokumentum_id UUID REFERENCES public.hr_dokumentum(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

---

## 5. UI Megjelenés és Integráció

1. **Beágyazott Fül az Onboarding Modálban (`OnboardingProfileModal.tsx`):**
   - **Nincs „popup a popupban”:** A munkaszerződés a teendők, munkahelyi eszközök és munkavédelmi oktatás mellett negyedik egyenrangú fülként (`szerzodes`) jelenik meg:
     - `1. Onboarding Teendők`
     - `2. Munkaszerződés (Mt. 42. §)`
     - `3. Munkahelyi Eszközök (Mt. 179. §)`
     - `4. Munkavédelmi Oktatás`
   - A teendőlistában a *Munkaszerződés előkészítése & aláírása* feladat jobb szélén közvetlen **`[Szerződés előkészítése]`** gomb található, amely azonnal a szerződés fülre navigál.

2. **Egységes Akciókártya és Vezérlés (`EmploymentContractPanel.tsx`):**
   - Visszagomb a bal felső sarokban: `← Vissza a teendőkhöz`.
   - Státuszkártya az eszközökhöz és munkavédelemhez igazodva:
     - 👁️ **Megtekintés:** In-browser PDF megtekintő a szerződés azonnali ellenőrzéséhez.
     - 📥 **Letöltés:** Közvetlen PDF fájl letöltés.
     - ✍️ **Aláírt példány feltöltése:** Nyitja az `UploadSignedDocumentDialog`-ot, amellyel a fizikai vagy digitális aláírással ellátott szerződés csatolható és verziózható.
     - 📁 **Iktatás:** Kézi iktatási lehetőség aktív profillal rendelkező munkatársaknál.

3. **Űrlap Csoportosítás:**
   - *Munkaviszony Feltételei (Mt. 42–45. §):* Munkakör, kezdés dátuma, szerződés típusa, munkaidő típusa, napi munkaórák, havi bruttó alapbér (Ft), próbaidő (hónap), munkavégzés helye, távmunka kapcsoló.
   - *Munkavállaló Személyi és Azonosító Adatai:* Születési hely és idő, anyja leánykori neve, lakcím, adóazonosító jel, TAJ szám, bankszámlaszám.

---

## 6. Verifikáció és Tesztelés

- **Unit tesztek (`src/utils/__tests__/employment-contract-pdf.test.ts`):**
  - Mt. 42–45. § kötelező elemek meglétének ellenőrzése a HTML struktúrában.
  - Iktatott állapot pecsétjének és az `1.2` irattári tételnek a verifikációja.
  - Határozott idejű és részmunkaidős szerződés jogi záradékainak tesztelése.
  - Puppeteer PDF buffer érvényességének vizsgálata.
- **Teljes tesztkészlet:** 61/61 sikeres teszt 10 tesztcsomagban.
- **TypeScript fordítás:** `npx tsc --noEmit` 0 hibával lefutva.
