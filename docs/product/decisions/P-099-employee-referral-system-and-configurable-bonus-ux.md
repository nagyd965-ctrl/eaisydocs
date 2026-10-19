# P-099 [HR] Dolgozói Ajánlási Rendszer és Beállítható Bónusz UX

## Státusz
Elfogadva (Implemented) - 2026-10-19

## Kontextus és Felhasználói Igény
A dolgozói önkiszolgáló portál karrier oldalán (`/hr/self-service/career`) a munkatársak böngészhetnek a nyitott pozíciók között. Felmerült az üzleti és munkavállalói igény, hogy a kollégák közvetlenül beajánlhassanak külsős ismerősöket, szakembereket a nyitott állásokra vagy a cég általános tehetségbázisába (Talent pool).
A felhasználó az **"A" opciót** választotta:
1. **Fülek a Karrier oldalon:** A belső álláshirdetések mellett megjelenik a **"Saját ajánlásaim"** fül valós idejű számláló jelvénnyel.
2. **Közvetlen ajánlási indítás:**
   - A fejlécből elérhető egy kiemelt `[+ Ismerős ajánlása]` gomb.
   - Minden egyes álláskártyán elérhető egy `[Ajánlás]` gomb, amely automatikusan előválasztja az adott pozíciót a modálban.
3. **Fix, cég szinten testreszabható bónusz:**
   - A cégbeállításoknál (`/hr/settings` -> Cég fül) a cégtulajdonos/admin egy szerkeszthető mezőben (`referral_bonus_amount`) állíthatja be a fix sikerdíj összegét (alapértelmezett: 150 000 Ft).
   - Ez az összeg transzparensen megjelenik a fejlécben, az álláskártyákon és az ajánlási űrlapon.

## Tervezési és UX Döntések

### 1. Kétfülös Linear Flat Elrendezés (`InternalCareerView`)
- **"Álláshirdetések (N)" fül:**
  - Letisztult, szöveges fülmegjelenítés felesleges dekoratív ikonok nélkül (ADR A-029).
  - 4 kanonikus `KpiCard` (Nyitott pozíciók, Belső pályázatok, Érintett területek, Ajánlási sikerdíj).
  - Szabványos `TableToolbar` instant kereséssel és részleg/jelleg szűrő popoverrel.
  - Álláskártyák két akciógombbal: `[Ajánlás]` (személy beajánlása erre az állásra) és `[Pályázás]` (részletek és saját jelentkezés).
- **"Saját ajánlásaim (M)" fül (`MyReferralsView`):**
  - Letisztult, szöveges fülmegjelenítés valós darabszámláló jelvénnyel.
  - 4 Linear Flat `KpiCard`: Összes ajánlásom, Folyamatban, Sikeres felvétel, Jóváhagyott bónusz összeg.
  - Figyelemfelkeltő információs sáv a bónuszprogram működéséről és a fix kifizetés feltételeiről (redundáns gomb nélkül; a felület egyetlen kanonikus `[Ismerős ajánlása]` gombja a fejléc jobb felső sarkában található).
  - Szabványos `TableToolbar` keresővel és bónusz státusz szűrővel.
  - Ajánlások listája: Jelölt neve, megpályázott pozíció, toborzási fázis jelvény, bónusz státusz jelvény, sikerdíj összege, LinkedIn link, csatolt önéletrajz letöltési gomb, valamint függőben lévő ajánlás esetén **Ajánlás visszavonása** kuka gomb.
  - **Kanonikus `AlertDialog` modál megerősítés:** A visszavonás nem böngészős felugrót használ, hanem a rendszer szabványos shadcn `AlertDialog` dialógusát a jelölt nevével, tájékoztató szöveggel és megerősítő gombbal.
  - Üres állapot esetén barátságos felhívás a fejléc gomb használatára.

### 2. Ismerős Ajánlása Modál (`ReferralDialog`)
- **Pozíció választó:** Előválasztott vagy választható álláshirdetés, plusz *"🎯 Általános ajánlás (Talent pool)"* opció.
- **Jelölt adatai:** Teljes név, e-mail cím (validált), telefonszám, LinkedIn profil URL.
- **Önéletrajz feltöltése:** PDF/DOCX állományok (max 10 MB), kliens- és szerveroldali típus- és méretellenőrzéssel.
- **Személyes indoklás:** Szöveges ajánló levél (miért alkalmas a jelölt).
- **Bónusz kiemelő sáv:** Diszkrét, flat figyelemfelkeltő doboz a bónusz összegével és a próbaidőhöz kötött kifizetési szabállyal.
- **GDPR nyilatkozat:** Kötelező checkbox a jelölt előzetes hozzájárulásáról.

### 3. Cégbeállítások Integráció (`CompanySettingsTab`)
- A `/hr/settings` oldalon a "Cég" fülön a cégadatok űrlapon új mező: **Dolgozói ajánlási bónusz (Ft)**.
- Csak a cég tulajdonosa/adminja szerkesztheti.
- Mentéskor az aktív cég rekordjában perzisztálódik.

## Érintett Komponensek és Fájlok
- `src/components/hr/internal-career-view.tsx`
- `src/components/hr/my-referrals-view.tsx`
- `src/components/hr/referral-dialog.tsx`
- `src/components/settings/company-settings-tab.tsx`
- `src/app/hr/self-service/career/page.tsx`
- `src/app/hr/self-service/career/referral-actions.ts`
- `src/types/hr.ts`
- `src/types/company.ts`

## Következmények és Eredmények
- A munkatársak egy helyen, maximális átláthatósággal látják ajánlásaik előrehaladását és a megszerezhető bónuszt.
- Az ATS toborzási folyamat (`hr_toborzas`) azonnal értesül az új jelöltekről, biztosítva a gyors feldolgozást.
- A rendszer szigorúan megfelel a Linear Flat vizuális szabványnak (ADR A-029).
