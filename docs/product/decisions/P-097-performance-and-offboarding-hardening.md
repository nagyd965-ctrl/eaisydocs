# PRD P-097: Teljesítményértékelés és Dolgozói Életút (Offboarding) Hardening és Integráció [HR]

## Státusz
Elfogadva

## Kontextus és Célok
A HR Munkaasztal auditja során két kiemelt terület igényelt azonnali fejlesztést és javítást:
1. **Teljesítményértékelés (`/hr/performance` és `/hr/performance/dashboard`):**
   - Korábbi hiányosság: A KPI célok (`hr_teljesitmeny`) és értékelési ciklusok (`hr_teljesitmeny_ciklus`) lekérdezései és beszúrásai nem rendelkeztek explicit `company_id` szűréssel és hozzárendeléssel, így a cégváltó használata során cégközi adatszivárgás kockázata állt fenn.
2. **Dolgozói Életút: Offboarding (`/hr/offboarding` és `/hr/employee/[id]`):**
   - Korábbi hiányosság: A kiléptetési folyamat létrehozásakor (`createOffboarding`) a rekord nem kapott `company_id`-t, ami miatt a szigorú cég szerinti szűrés (`.eq("company_id", activeCompanyId)`) alatt az újonnan indított folyamat láthatatlanná válhatott.
   - Emellett a dolgozói 360° adatlapon (`/hr/employee/[id]`) semmilyen visszajelzés nem volt a folyamatban lévő vagy lezárt kiléptetésről, és a HR-nek manuálisan át kellett navigálnia a `/hr/offboarding` oldalra, majd ott kikeresnie a dolgozót a listából.
3. **Belső karrieroldal (`/hr/self-service/career`):**
   - Az álláshirdetések lekérdezése nem vette figyelembe az aktív cég azonosítóját.

## Termékkövetelmények és UX Megvalósítás

### 1. Teljesítményértékelés Multi-Tenant Izoláció és Jogosultságkezelés
- **Szerver Akciók (`src/app/hr/performance/actions.ts`):**
  - Mind az `addKpi`, mind az `addCycle` beemeli az aktív cég azonosítóját (`activeCompanyId = await getActiveCompanyIdServer()`), és rögzíti a beszúráskor (`company_id: activeCompanyId`).
- **Értékelési Főoldal (`src/app/hr/performance/page.tsx`):**
  - A céghez tartozó dolgozók azonosítóit (`safeMemberIds`) lekéri a `company_members` táblából.
  - A `hr_teljesitmeny`, `hr_teljesitmeny_ciklus`, `hr_dolgozo_adatlap` és `hr_esemeny_naplo` lekérdezések szigorúan `safeMemberIds` és `company_id` szerint szűrtek.
- **Vezetői Teljesítmény Dashboard (`src/app/hr/performance/dashboard/page.tsx`):**
  - Jogosultság-ellenőrzés `requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "auditor"])` segítségével.
  - Minden ciklus, KPI és dolgozói aggregáció az aktív cégre izolált.

### 2. Offboarding Munkafolyamat Javítása és Dolgozói Integráció
- **Cégszintű rögzítés és kiterjesztett revalidáció (`src/app/hr/offboarding/actions.ts`):**
  - A `createOffboarding` szerver akció rögzíti a `company_id: activeCompanyId` értéket a `hr_offboarding` és a generált `hr_offboarding_feladat` rekordokban is.
  - A folyamat indításakor, lezárásakor (`closeOffboarding`) és újranyitásakor (`reopenOffboarding`) a rendszer automatikusan újragyorsítótárazza a dolgozói adatlapot (`/hr/employee/[dolgozoId]`), a munkatársi listát és az admin munkaasztalt.
- **Közvetlen Kiléptetés Indítási Dialógus (`src/components/hr/add-offboarding-dialog.tsx`):**
  - Támogatja az opcionális `preselectedEmployeeId` és `preselectedEmployeeName` tulajdonságokat.
  - Ha az adatlap felől hívják meg, a nagy legördülő lista helyett egy letisztult, közvetlen dolgozói névkártyát jelenít meg "Kiválasztva" jelzéssel.
  - Sikeres mentést követően `router.refresh()` segítségével azonnal frissíti a kliens állapotát.
- **Dolgozói 360° Adatlap Header Integráció (`src/app/hr/employee/[id]/page.tsx`):**
  - Valós idejű lekérdezés a legfrissebb `hr_offboarding` rekordra.
  - **Dinamikus Fejléc Státuszjelvény:**
    - Folyamatban lévő kiléptetés esetén: Sárga `Kiléptetés folyamatban (Kilépés: YYYY.MM.DD)` jelvény kattintható linkkel a feladatokhoz.
    - Lezárt / kilépett státusz esetén: Neutrális szürke `Kilépett (Dátum / Inaktív)` jelvény.
    - Normál esetben: Zöld `Aktív` jelvény.
  - **HR / Admin Fejléc Művelet:**
    - Aktív dolgozónál: Jobb oldalon diszkrét **`Kiléptetés indítása`** gomb (`UserMinus` ikon), amellyel a HR közvetlenül az adatlapról kezdeményezheti a felmondást / közös megegyezést.
    - Folyamatban lévő kiléptetésnél: **`Offboarding feladatok kezelése`** gomb közvetlen átirányítással.

### 3. Belső Álláshirdetések Cégszintű Szűrése (`src/app/hr/self-service/career/page.tsx`)
- Az aktív cég azonosítója alapján szűri a nyitott pozíciókat (`company_id.eq.${activeCompanyId},company_id.is.null`), megakadályozva a más cégekhez tartozó belső hirdetések megjelenítését.

### 4. Központi HR Teendők & Figyelmeztetések Rendszerintegráció (`src/app/hr/admin/page.tsx`)
- **Aktív Beléptetések (Onboarding):**
  - Automatikus riasztás minden aktív beillesztési folyamatról a teendők listában (`HrTasksAndAlertsTable`).
  - **Sürgősségi besorolás:**
    - `critical` (piros): Belépés napja elérkezett vagy múltbéli (`belepes <= today`) – azonnali T1041 NAV bejelentés és munkaszerződés ellenőrzés szükséges.
    - `warning` (sárga): Belépés 7 napon belül esedékes vagy nyitott feladatok állnak fenn (eszközigény, hozzáférések).
    - `info` (kék): Előkészület alatt álló beléptetés.
- **Aktív Kiléptetések (Offboarding):**
  - Automatikus riasztás a folyamatban lévő kiléptetésekről (`statusz === 'folyamatban'`).
  - **Sürgősségi besorolás:**
    - `critical` (piros): Kilépés napja elérkezett vagy múltbéli (`kilepes <= today`) – az Mt. 80. § szerinti szigorú 5 munkanapos elszámolási és igazolás-kiadási határidőre való kiemelt figyelmeztetés.
    - `warning` (sárga): Utolsó munkanap 7 napon belül, eszközleadás és feladatok függőben.
    - `info` (kék): Kiléptetés előkészület alatt.
- **Közvetlen műveletgombok és szűrők:**
  - Közvetlen "Onboarding" és "Kiléptetés" navigációs gombok a teendő sorokban.
  - A `TableToolbar` Szűrés menüjében a "Beléptetés (Onboarding)" és "Kiléptetés (Offboarding)" kategóriák szűrhetők és megjelennek a dedikált statisztikai KPI kártyákban.

### 5. Kiléptetési Folyamat Lezárási Integritás és Feladat-védelem (`src/app/hr/offboarding/actions.ts` & `src/components/hr/offboarding-profile-modal.tsx`)
- **Automatikus hamis készrejelölés megszüntetése:**
  - Eltávolításra került a korábbi kód, amely a kiléptetés lezárásakor automatikusan `statusz: 'done'` értékre állította az összes még nyitott teendőt. A rendszer a feladatokat soha nem hamisítja készre, az audit naplóban és a felületen a valós állapot marad érvényben.
- **Szerveroldali lezárási korlát és validáció (`closeOffboarding`):**
  - Ha a folyamatban vannak függőben lévő feladatok (`pendingTasks.length > 0`), a lezárást a rendszer alapértelmezetten elutasítja (`return { error: ... }`).
  - Kivételes lezárás (`force: true`) csak kifejezett megerősítéssel lehetséges, és a feladatok ebben az esetben is `pending` állapotban maradnak.
- **Kliensoldali UX figyelmeztetés és jóváhagyás (`OffboardingProfileModal` & `AlertDialog` javítás):**
  - Megszűnt az a megjelenítési hiba, amely miatt a lezárás megerősítő ablaka a háttér modalba olvadva, árnyék és sötétítés nélkül, torz és összenyomott 320px szélességben lebegett a feladatlista közepén:
    - Az `AlertDialogOverlay` réteg sötét háttérkitöltést kapott (`bg-black/60 backdrop-blur-xs`) és prioritásos `z-[100]` rétegzést, így megnyitáskor a teljes képernyőt és a szülő modált is látványosan elhalványítja, fókuszba állítva a döntési dialógust.
    - Az `AlertDialogContent` valós kiemelést (`shadow-2xl border bg-background p-6 rounded-xl`) és kényelmes szélességet (`max-w-[calc(100%-2rem)] sm:max-w-lg`) kapott, megszüntetve a korábbi erőszakos `data-[size=default]:max-w-xs` attribútum-korlátot, a teendők és a megerősítő nyilatkozat pedig tágas, ergonomikus elrendezésben jelenik meg.
- **Újranyitás és feladat-visszaállítás (`reopenOffboarding`, `resetOffboardingTasks`):**
  - Az "Újranyitás" dialógus támogatja a feladatok státuszának automatikus nyitottra (`pending`) való visszaállítását (`resetTasksOnReopen`), így a korábban tévesen lezárt folyamatok azonnal korrigálhatók.
  - A teendők listájának fejlécében megjelent az "Összes újranyitása" gomb a gyors visszaállításhoz.

### 6. Beléptetési és Kiléptetési Listasáv Tisztítás és Eszköztár Ergonómia (`src/components/hr/onboarding-list.tsx` & `src/components/hr/offboarding-list.tsx`)
- **Felesleges beágyazott szűrők megszüntetése:**
  - A kiléptetési felületen a zavaró `Megállapodás: Mind | Megszüntetés hiányzik | Beiktatva` pill-sor törlésre került.
  - A beléptetési felületen a redundáns `Fiók állapot: Mind | Aktiválásra vár | Fiók aktív` pill-sor törlésre került.
- **Közös, egységes eszköztár (Toolbar) és nézetváltás:**
  - A `[Kártyák] [Táblázat]` nézetváltó gombok átkerültek a fehér eszköztár jobb oldalára a kereső mellé, így egyetlen letisztult vezérlősáv szolgálja ki a listakezelést.
  - Bal oldalon: Letisztult keresőmező instant törlőgombbal (`X`).
  - Jobb oldalon: Vizuális nézetváltó (`Kártyák` / `Táblázat`).
- **Feszes függőleges elrendezés (Vertical Rhythm):**
  - A korábbi nagy üres holttér és felesleges paddingok (`border-b pb-3`, `space-y-6`) eltávolításra kerültek.
### 7. Beléptetési és Kiléptetési Dátumok Adatbázis- és UI Szinkronizációja (`OnboardingCard`, `OffboardingCard`, `OffboardingProfileModal`, `OffboardingList`, `OnboardingList`)
- **Adatbázis-oszlop eltérés feloldása (Offboarding):**
  - A PostgreSQL adatbázisban a kiléptetés dátumai `utolso_munkaban_toltott_nap` és `kilepes_datuma` oszlopokban tárolódnak (a sémában nincs `utolso_munkanap` oszlop).
  - A szerveroldali lapbetöltés (`/hr/offboarding/page.tsx`) és a részletbetöltő akció (`getOffboardingDetailData`) mostantól expliciten hozzárendeli az `utolso_munkanap: item.utolso_munkaban_toltott_nap || item.kilepes_datuma` alias mezőt.
- **Letisztult dátumformátum (Onboarding & Offboarding):**
  - Mind a beléptetésnél (`OnboardingCard`, `OnboardingList`), mind a kiléptetésnél (`OffboardingCard`, `OffboardingList`) megszűnt a zavaró relatív napkiírás (`(X napja)`, `(X nap múlva)`).
  - Helyette a kártyákon és a táblázatokban egységesen és letisztultan a hivatalos dátum formátum jelenik meg (pl. `2026. 10. 14.`), semleges keretes jelvényben vagy cellában.
- **Modál dátummező vezérelt állapota (`OffboardingProfileModal`):**
  - A korábbi uncontrolled `defaultValue` helyett a "Hivatalos Utolsó Munkanap" mező vezérelt `value={currentDate}` állapotot kapott, amely azonnal felveszi a propból és az aszinkron `detailData`-ból érkező dátumot.
  - A dátum szerkesztésekor a modál helyben és a szerveren (`updateOffboardingDate`) is frissíti a dátumot, és átadja a kapcsolódó paneleknek (`TerminationPanel`, `ExitCertificatePanel`).

## Érintett Fájlok
- `src/app/hr/performance/actions.ts`
- `src/app/hr/performance/page.tsx`
- `src/app/hr/performance/dashboard/page.tsx`
- `src/app/hr/offboarding/actions.ts`
- `src/app/hr/offboarding/page.tsx`
- `src/components/hr/offboarding-profile-modal.tsx`
- `src/components/hr/offboarding-card.tsx`
- `src/components/hr/offboarding-list.tsx`
- `src/components/hr/onboarding-card.tsx`
- `src/components/hr/onboarding-list.tsx`
- `src/components/hr/add-offboarding-dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/app/hr/employee/[id]/page.tsx`
- `src/app/hr/self-service/career/page.tsx`
- `src/app/hr/admin/page.tsx`

