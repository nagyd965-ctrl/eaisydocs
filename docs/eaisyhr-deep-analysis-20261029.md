# eaisyHR Rendszerszintű Mélyelemzés — 2026. október 29.

> **Típus:** Deep Analysis audit (csak olvasó kódelemzés — kód, adatbázis-migrációk és dokumentáció kereszthivatkozása alapján)
> **Hatókör:** a teljes eaisyHR modul (minden `/hr/*` oldal, self-service portál, karrierportál, összes server action és a hozzájuk tartozó RLS migrációk)
> **Módszer:** a „helyes működést" a `docs/` döntéstár (ADR-ek, PRD-k, BRD-k, modul-érettségi terv) alapján definiáltuk, majd a tényleges kódot ehhez mértük. **Élő, bejelentkezett teszt nem történt** — a találatok statikus elemzésből származnak, javítás előtt érdemes őket gyors manuális teszttel megerősíteni.
> **Kiindulási állapot:** a `eaisyhr-modul-erettsegi-es-fejlesztesi-terv.md` 89%-os átlagérettséget és 16/30 lezárt feladatot rögzít (2026-10-28).

---

## 0. Vezetői összefoglaló — mit tapasztaltunk nagyban

A rendszer **funkcionális felületi rétege erős**: a dokumentált UX-döntések (TableToolbar, KpiCard, DocumentViewer, 5 lépéses értékelési workflow, orvosi blokkolás, karrierportál-választó, Tiptap szerkesztő) tényleg beépültek, és ott ahol működnek, minőségi munkát látni. **A 2026.10.28-i jogosultsági modernizáció (3 alapszerepkör + modulmátrix) azonban félig sikerült**: az oldalak (page.tsx fájlok) megkapták az új modul-alapú védelmet, de a mögöttük álló server action-ök jelentős része:

1. **régi (legacy) szerepkörneveken végzi az ellenőrzést**, amelyeket a normalizált (`vezeto` / `munkavallalo` / `admin`) szerepkörök soha nem egyeztetnek meg — ettől függően vagy **nem működik a funkció jogos felhasználóknak**, vagy
2. a resolver kompatibilitási szabálya miatt **túl engedékeny** (bárki átjut, akinek egyetlen HR-modulja van), és
3. az adatbázis RLS-réteg **modul-scoped lett, de cég-scoped (tenant-scoped) nem maradt** — több ponton más váég adatai olvashatók/írhatók.

E három gyökérok önmagában magyarázza a talált **29 darab P0** (kritikus) jelölt többségét. Emellett találtunk több **tényleges funkcionális törést** (pl. a vezetői túlóra-kérelmek soha nem jelennek meg) és **jogi/számítási pontatlanságot** (időzóna-torzulás a bérszámfejtésben, Mt. előírások hiánya).

**Mért átfogó érettség: ~84%** (a dokumentált 89% helyett).

---

## 1. A RENDSZERSZINTŰ GYÖKÉROKOK — emberi nyelven

Ez az öt probléma nem egyetlen oldal hibája, hanem **a teljes HR modult átszövő minta**. Ha ezeket megjavítjuk, a P0-k többsége egyszerre zárul.

### 1.1. [P0] A szerepkör-feloldó „kompatibilitási szepe" túl engedékeny

**Hol:** `src/utils/hr/company-role-resolver.ts:364-369`

**Mi lenne a jó működés:** Ha egy server action azt mondja, hogy „ezt a műveletet csak HR-munkatárs, HR-vezető vagy admin hajthatja végre", akkor pontosan ők hajthassák végre — senki más.

**Mit tapasztaltunk:** A resolverben van egy visszamenőleges kompatibilitási szabály: ha a megengedett szerepkör-listában szerepel a régi `hr_munkatars` vagy `hr_vezeto` név, akkor **bármely felhasználó, akinek legalább 1 HR-modulja van** (akár csak a toborzás), jogosultnak minősül. Több tucat action (bérszámfejtés, riportok, audit napló, toborzás) még ezeket a régi listákat használja — így gyakorlatilag **egyetlen modullal rendelkező dolgozó is elérheti a legérzékenyebb műveleteket**, TAJ-adatokat, bankszámlaszámokat, béreket tartalmazó műszerfalakat kaphat.

### 1.2. [P0] Az adatbázis-jogosultsági függvény nem tud a cégekről

**Hol:** `supabase/migrations/20261028000005_sync_hr_rls_and_rpcs_with_module_permissions.sql:8-36`

**Mi lenne a jó működés:** Többcégű (multi-tenant) rendszerben egy cég HR-ese csak a **saját cégének** dolgozóit láthatja. A `has_hr_module_access()` függvénynek azt kellene ellenőriznie, hogy a felhasználó **abban a cégben** rendelkezik-e a szükséges modullal, amelyik cég adatához nyúlni akar.

**Mit tapasztaltunk:** A függvény csak azt nézi, hogy a felhasználó van-e bármelyik cég tagjaként a megfelelő szerepkörrel/modullal — **a célrekord cégét nem hasonlítja össze semmivel**. Fordítva nézve: aki a **B cégben** kapott compliance vagy payroll modult, az az **A cég** minden HR-táblájára érvényes jogosultságot kap. Ez az RLS-rétegig mélyíti a rést: a `get_decrypted_hr_data` RPC (amivel a titkosított TAJ-, adó-, bankszámla- és béradatokat lehet visszafejteni) is ezen a függvényen áll — így más cég dolgozójának személyes adatai is visszafejthetők.

### 1.3. [P0] Az „admin" szó két jelentést nyert: szerepkör ÉS modulkulcs

**Hol:** `src/utils/hr/company-role-resolver.ts:340-345`, `src/app/hr/permissions/actions.ts:18`

**Mi lenne a jó működés:** A Jogosultságkezelő Mátrixban (P-120/A-087) **kizárólag admin szerepkörű** felhasználó módosíthatja a dolgozói jogosultságokat.

**Mit tapasztaltunk:** A `requireHrAuthServer(["admin"])` hívás az „admin" **modulkulcsot** ellenőrzi (a 10 szakmai modul egyike), nem az „admin" **szerepkört**. Az „Állomány" modul neve ugyanis szintén `admin`. Így egy nem-admin, de Állomány-modullal rendelkező felhasználó meghívhatja a jogosultság-módosító actiont — és **saját magának adhat teljes admin szerepkört**. Ugyanez a kettősség több más actionnél is átkapcsolja a védelmet a tervezettnél lazábbra.

### 1.4. [P0, funkcionális] A szerepkör-normalizáció elszakította az oldalakat az actionöktől

**Hol:** `src/app/hr/recruitment/actions.ts:26`, `company-presentation-actions.ts:39`, `src/app/hr/onboarding/actions.ts` (több pont), `src/app/hr/offboarding/actions.ts:191` és 7 további hely

**Mi lenne a jó működés:** Aki a Jogosultsági Mátrixban megkapta pl. a „Toborzás" modult, az a toborzás oldalán dolgozhat: hirdetést menthet, jelöltet mozgathat a Kanbanon, interjtút egyeztethet.

**Mit tapasztaltunk:** A oldalak betöltődnek neki (a page-ek az új modulkulcsokat nézik), de a gombok mögötti actionök a **rég egyeztethető szerepkörneveket** várják (`hr_munkatars`, `toborzo`, …), amelyeket a normalizált szerepkör (`vezeto`, `munkavallalo`) soha nem egyeztethet meg. **A toborzás, a beléptetés és a kiléptetés összes írási művelete tehát elutasítódik mindenki számára, aki nem cég-admin.** A 2026-10-28-as „1. P0 — szerveroldali RBAC pótlása" feladat tehát ezeknél a moduloknál valójában nem zárult le.

### 1.5. [P1] Az azonosító-alapú műveletekből hiányzik a cég-ellenőrzés

**Hol:** számos action — pl. `src/app/hr/payroll/actions.ts:663-685` (bérpapír), `src/app/hr/reports/actions.ts:836-917` (T1041), `src/app/hr/recruitment/actions.ts:300-320` (jelölttörlés), `src/app/hr/job/[id]/page.tsx:51-55` (munkakör), `src/app/hr/orgunit/[id]/actions.ts` (szervezeti egység)

**Mi lenne a jó működés:** Ha egy művelet egy konkrét rekordot azonosító (UUID) alapján módosít, a szervernek ellenőriznie kell, hogy az a rekord **a hívó aktív cégéhez tartozik-e**.

**Mit tapasztaltunk:** Több tucat action „csak úgy" betölti az azonosítóhoz tartozó rekordot (akár service-role kulccsal, az RLS megkerülésével), és azonnal módosítja/törli. Mivel a UUID-k nem titkosak (pl. URL-ekben, listákban megjelennek), egy másik cég felhasználója ismert azonosítóval **más cég bérpapírját írhatja felül, T1041-bejelentését igazolhatja, munkakörét olvashatja dolgozónevekkel együtt** stb.

---

## 2. MODULONKÉNTI ELEMZÉS

### 2.1. Dolgozói Portál (Employee Self-Service) — mért: ~84% (dokumentált: 87%)

**8 aloldal:** `/hr`, `/hr/self-service/{profile, time, documents, goals, idp, payroll, career}`

**Mi működik jól:** A szabadságigénylés valós keret- és ünnepnap-ellenőrzéssel fut; az aláírt dokumentum-feltöltés a P-122/A-089 szerinti egyszeri véglegesítéssel és verziókezeléssel pontosan azt csinálja, amit a doksija ír; a bérpapír-nyugtázás és PDF-letöltés tulajdonos-védett; a helyettesítési dialóg (P-114) működik.

#### Talált problémák

**[P0] A Fejlődési Tervem (IDP) státuszváltója védtelen, és hamis végzettséget rögzít**
- **Jó működés (A-082/P-106):** A dolgozó a saját célját jelölheti „elkezdtem"-re, de a **teljesítést (és az automatikus képzettségrögzítést) a vezető jóváhagyása** után kaphatja meg.
- **Tapasztalt:** Az `updateDevelopmentGoalStatus` action-ben (`src/app/hr/actions/idp-actions.ts:264-321`) **egyetlen ellenőrzés sincs** — még bejelentkezést sem néz. Bármely felhasználó bármely célját `teljesitve`-re teheti, és a kód ekkor **automatikusan hamis `hr_kepzettseg` rekordot hoz létre** a dolgozó törzsállományába — a vezetői jóváhagyás megkerülésével.

**[P0] A Célkitűzések oldala más cégek adatait is letölti**
- **Jó működés (P-121):** A dolgozó a saját KPI-jait és azok előzményeit látja.
- **Tapasztalt:** A `/hr/self-service/goals` oldal (`page.tsx:30-39`) service-role kliensen lekéri a teljes `hr_esemeny_naplo`-t és az összes értékelési ciklust **cég- és felhasználó-szűrés nélkül** — a böngészőbe kerül minden cég teljesítmény-aktivitása (nevekkel, értékelés-kivonatokkal). Ráadásul az adatot a komponens fel sem használja: tiszta, felesleges adatszivárgás.

**[P0] Az önértékelést bárki írhatja bárki KPI-jára**
- **Jó működés (P-103):** A dolgozó **saját maga** KPI-jára tölti fel az önértékelést és a mért értéket.
- **Tapasztalt:** Az `addKpiSelfEvaluation` action (`src/app/hr/performance/actions.ts:331-395`) nem ellenőrzi, hogy a KPI a hívó sajátja-e — **bármely dolgozó bármely (más céghez tartozó) KPI-ját módosíthatja, pontszámot írhat bele**.

**[P0] A jelenlétkorrekciót a dolgozó saját magának hagyhatja jóvá**
- **Jó működés (A-033/P-052):** A korrekciót a **vezető vagy HR** bírálja el; a jóváhagyás után kerül be a `hr_jelenlet`-be.
- **Tapasztalt:** A `handleAttendanceCorrectionApproval` (`src/app/hr/attendance-actions.ts:657-696`) csak bejelentkezést ellenőriz — **nincs vezetői, HR- vagy cég-ellenőrzés** —, majd service-role kliensen írja felül a jelenléti adatot. Egy dolgozó tehát saját magának „jóváhagyhat" korrekciót, és ezzel közvetlenül a **bérszámfejtés alapadatait** írja át.

**[P1] Időzóna-bug: minden jóváhagyott korrekció órákkal torzul**
- **Jó működés:** A dolgozó által beírt idő (pl. 08:30) úgy jelenik meg és úgy mentődik, ahogy beírta.
- **Tapasztalt:** A szerver (Vercel = UTC) a `${datum}T${ido}:00` stringet saját időzónájában értelmezi (`self-service/actions.ts:818-819`), így a 08:30-ból megjelenítéskor **09:30** lesz — a hiba becsúszik a jelenléti ívbe, a PDF-igazolásba és a bérszámfejtésbe.

**[P1] A TAJ-, adó- és bankszámlaadatainkat validáció nélkül lehet felülírni** — a `updateSecretData` (`self-service/actions.ts:570-607`) közvetlenül fogadja a kliensértéket; hibás (pl. elütött) TAJ-szám kerülhet a bérszámfejtésbe. *(Ez a dokumentált 13. nyitott feladat — itt igazolódott.)*

**[P1] A „Függőben lévő" KPI csak a szabadságkérelmeket számolja** — a korrekciók és túlóra-kérelmek kimaradnak, aluljelent.

**További P1/P2:** a HR-eszkaláció más cég HR-eséhez irányulhat; a `hr_tulora_felhasznalás` rekordoknál hiányzik a `company_id`; a cafeteria-deklarációnál a szerver a kliens által küldött keretlevonást fogadja el; a bérpapír-lista cég-szűrés nélküli; a `createSignedUrls` hibája kezeltetlen.

**Top 3 javaslat:** (1) a négy P0 action guard + tulajdonos + cég-ellenőrzése; (2) időzóna-javítás (helyi idő explicit tárolása); (3) TAJ/adó/IBAN CDV-validáció + HR-jóváhagyási küszöb.

---

### 2.2. Vezetői nézet és Teljesítményértékelés — mért: 74% / 85% / 90% (dokumentált: 83% / 94%)

**[P0, funkcionális] A vezető SOHA nem látja a túlóra-kérelmeket**
- **Jó működés (P-052/A-033):** Az Egységes Jóváhagyási Központ három kérelestípust kezel: távollét, jelenlétkorrekció, **túlóra**.
- **Tapasztalt:** A manager oldal túlóra-lekérdezése a `hr_tulora_felhasznalás` táblán `.eq("company_id", …)` szűrést alkalmaz (`src/app/hr/manager/page.tsx:96-98`) — **de erre a táblára egyetlen migráció sem adott `company_id` oszlopet** (ellenőrizve az összes releváns migrációt). A PostgREST hibát ad, amit a kód csendesen elnyel, a „Túlóra" fül pedig **mindig üres** marad. Ráadásul a beküldő action sem tölti ki ezt a mezőt — az oszlop nélkül a lánc két végén törött.

**[P0] Túlóra-jóváhagyás: elbírált kérelmek újra-bíráhatók, egyenleg-korruptció lehetséges**
- **Jó működés:** Csak függő (`jovahagyasra_var`) kérelem bírálandó el, pontosan egyszer.
- **Tapasztalt:** A `handleOvertimeApproval` (`attendance-actions.ts:576-655`) nincs cég-ellenőrzésre, nincs státusz-őrző feltétel — egy már **elutasított** kérelmet utólag „jóváhagyhat" bárki, és az adatbázis-trigger nem kezeli ezt az átmenetet → a túlóra-egyenleg elromolhat. A jóváhagyott túlórához kapcsolt csúsztatási távollét státusza sosem frissül → a workflow **elakad**.

**[P1] A helyettes nem látja a túlóra-kérelmeket** — a helyettesítési átszignálás (A-084) csak a távollétekre és korrekciókra fut le; *(dokumentált nyitott feladat, megerősítve)*.

**[P1] A ciklus-módosító/törlő actionök cég-szűrés nélkül futnak** (`performance/actions.ts:268-329`), kombinálva az 1.1-es gyökérokkel: alacsony jogosultságú felhasználó más cég értékelési ciklusait írhatja.

**[P2] A dokumentált KPI-sablontár nincs bekötve** — az `AddKpiDialog` megkapja ugyan a katalógus-adatot, de sosem olvassa ki: a P-102/A-078-ban ígért „egy kattintásos sablonkitöltés" gyakorlatban hiányzik. *(Dokumentum-kód eltérés.)*

**[P2] A teljesítmény dashboardon lezárt munkakör jelenhet meg aktívként** (fallback a `[0]` beosztásra) és cég-specifikus részlegnevek vannak keményezve.

**Top 3 javaslat:** (1) `hr_tulora_felhasznalás.company_id` migráció + action-javítások egy csomagban; (2) jóváhagyó actionök guard + vezetői-kapcsolat ellenőrzés; (3) sablontár valódi bekötése.

---

### 2.3. HR Munkaasztal — mért: 87% / 86% / 82% / 78% / 80% (dokumentált: 90% / 90% / 82%)

**[P0] A beállítások mögötti actionök gyakorlatilag védtelenek** — a `src/app/hr/settings/actions.ts` fájlban **egyetlen `requireHrAuthServer` sincs**, miközben a legsúlyosabb műveletek élnek itt:
- **`removeEmployeeFromHR` (299-327):** *Jó működés:* csak admin törölhet dolgozót, auditnyommal. *Tapasztalt:* **még bejelentkezést sem ellenőriz** — service-role kulccsal CASCADE-törli a dolgozói kartont a jogviszonnyal és beosztással együtt; URL-ről, hitelesítés nélkül hívható.
- **`updateEmployeeInfo` (68-194):** *Jó működés:* a szerepkört csak a Jogosultsági Mátrixban lehet változtatni. *Tapasztalt:* **bármely bejelentkezett felhasználó — akár saját magának — `admin` szerepkört írhat**, cég-ellenőrzés nélkül. Teljes jogosultság-eszkaláció.
- **Szervezeti egység CRUD (329-437):** más cég egységei átnevezhetők/törölhetők.

**[P0] A Jogosultsági Mátrix öneszkalációra nyit** — l. 1.3-as gyökérok (`permissions/actions.ts:18`): *jó működés szerint kizárólag admin szerepkör módosíthat; tapasztalt: Állomány-modulos felhasználó is.*

**[P0] A szervezeti egység actionjei a eaisyDocs-oldalszervezetet is felülírják** — az `assignEmployeeToOrgUnit` (`orgunit/[id]/actions.ts:20`) csendben módosítja a `szervezeti_egyseg_id` (a Docs-osztály!) mezőt is, ráadásul legacy-guard mögött, cég-ellenőrzés nélkül.

**[P1] A munkakör- és egység-adatlapok más cég adatait mutatják** — a `/hr/job/[id]` és `/hr/orgunit/[id]` oldalak service-role-lel, `company_id` ellenőrzése nélkül töltik az adatot: idegen cég munkaköradata **és a hozzárendelt dolgozók nevei** olvashatók (GDPR/multi-tenant sértés).

**[P1] `deleteMunkakor` a történetet is törli** — *jó működés:* használatban lévő munkakör nem törölhető, a beosztás-előzmények megmaradnak (lezárással). *Tapasztalt:* az action előre törli az összes `hr_beosztas` sort — a dolgozók munkakör-előzményei **visszavonhatatlanul elvesznek**.

**[P1, dokumentált] Mt. 104. § (napi 11 óra pihenőidő) és Mt. 93-94. § (munkaidőkeret) ellenőrzése hiányzik** a műszaktervezőből — két egymást követő műszak (22:00-ig + 06:00-tól) gond nélkül menthető. *(A `/hr/time` dokumentáltan is a leggyengébb modul — a mérés ezt megerősítette.)*

**Pozitívum:** az orvosi alkalmassági blokkolás (A-040) **end-to-end működik** (checker → action → hétmásolás → UI) — a modulkészlet legjobban sikerült compliance-eleme. A `/hr/time` route-guardja mintaszerű (`requireHrAuthServer(["time"])`).

**Top 3 javaslat:** (1) `settings/actions.ts` azonnali hardening; (2) adatlapokra cég-ellenőrzés; (3) Mt. 104/93 implementálása.

---

### 2.4. 360° Dolgozói Adatlap — mért: ~79% (dokumentált: 90%)

**[P0] A teljes karton cég-ellenőrzés nélkül, service-role-lel töltődik** — *jó működés (A-044):* csak a saját cég HR-e, vezetője vagy maga a dolgozó láthatja a kartont. *Tapasztalt:* az oldal az összes érzékeny adatot (távollét, orvosi, fegyelmi, bérpapírok, dokumentumok + aláírt URL-ek) service-role klienssel kéri le, és a belépési guard **sehol nem hasonlítja össze a dolgozó cégét a hívó aktív cégével**. Egy másik cég megfelelő modulú felhasználója ismert UUID-val a teljes kartont látja.

**[P0] A beosztás-történet RPC-t bárki hívhatja** — az `update_hr_beosztas_history` SECURITY DEFINER függvényben (migráció `20260729000001`) **nincs jogosultság-ellenőrzés** és PUBLIC-ra van engedve. *Jó működés:* munkakört, FTE-t, **bérkategóriát** csak HR módosíthat. *Tapasztalt:* bármely bejelentkezett dolgozó — önmagán és másokon is — átírhatja.

**[P0] A HR-szabadság-rögzítés „rossz irányba nyitott"** — *jó működés:* a dolgozó kérelmet ad be, a HR rögzíthet helyette is (jóváhagyva). *Tapasztalt fordítva:* a `hrSubmitLeaveRequest` action guard nélküli és `jovahagyva` státusszal rögzít — **magának a dolgozónak is felajánlja a kényelmes önjóváhagyást** (a self-service kemény keretellenőrzése megkerülhető), miközben a valódi HR-felhasználó insertjét az RLS-t **elutasítja**. A funkció tehát pont azoknak nem működik, akiknek kellene, és azoknak nyit, akiknek nem kellene.

**[P1] Orvosi és fegyelmi PDF-ek vezetőnek/önmagának is letölthetők** — a fül-szintű védelem (orvosi/fegyelmi fül rejtése) értelmetlen, mert ugyanez tartalom PDF-ben a „Hivatalos dokumentumok" fülről **mindenki számára letölthető** (GDPR Art. 9 egészségügyi adat).

**[P1] Saját pótszabadság-alapok HR-jóváhagyás nélkül módosíthatók** — a dolgozó a `gyermekek_szama` (Mt. 118: +2/+4/+7 nap) és `megvaltozott_munkakepessegu` (+5 nap) mezőket közvetlenül írhatja → **közvetlenül manipulálhatja a saját szabadságkeretét**.

**P2:** minden HR irat uniform 50 év / „bizalmas" megőrzést kap (a P-026 mátrix differenciálást ír elő); az AuditLog fül a dolgozónak örökre üres; `visszavonva` státusz nyers stringként jelenik meg.

**Top 3 javaslat:** (1) cég-ellenőrzés a betöltésre + RPC-guard; (2) távollét-INSERT policy + action-guard rendbetétele; (3) dokumentum-hozzáférési mátrix (kategória × szerepkör).

---

### 2.5. Bérszámfejtés, Riportok, Compliance, Eseménynapló, Beállítások — mért: 82% / 80% / 84% / 93% / 65%

**[P0] Bérszámfejtés:** legacy guard-listák miatt **bármely 1-modulos felhasználó** megkaphatja a teljes bérszámfejtési műszerfalamat (TAJ, adószám, bankszámla, bruttó bér) és bérpapírt generálhat; a `updateSinglePayslipAction` **más cég bérpapírját írhatja át** (cross-tenant írás). **A jóváhagyott túlóra soha nem épül be a bérpapírba** (a payroll-modul nem is olvassa a túlóra-táblát), és a `plannedWorkdays` ünnepek nélkül számol → **bérfizetési tételt érintő pontatlanság** ünnepes hónapokban.

**[P0] Riportok:** az `uploadT1041ReceiptFromReport` és `deleteArchiveRecordAdmin` actionök **gyakorlatilag nyitottak** (csak bejelentkezés) — bármely dolgozó bármely cég T1041-bejelentését teheti „igazolva" státuszba, archívum-bejegyzést törölhet auditnyom nélkül.

**[P0] Compliance:** a hat actionből **egyetlen egyben sincs `requireHrAuthServer`**; a heti/éves `hr_jelenlet`-lekérdezések cég-szűrés nélküliek; az ebédszünet (`szunet_ms`) nincs levonva a túlóra-motorból → **hamis 48 órás Mt.-jogsértés-jelzések** keletkeznek.

**Eseménynapló (93%, a legerősebb modul):** a szigorú cég-izoláció (A-091) tényleg megvan — DE az `authorizeAuditRequest` túlengedő listája miatt a Kiküldési Napló (e-mail/SMS tartalmak!) **bármely modulos felhasználónak olvasható**, és a dúsítás nem létező `hr_munkaviszony` táblából olvas (a munkakör-oszlop sosem töltődik fel).

**Beállítások (65%, a legkritikusabb):** l. 2.3 — a `settings/actions.ts` itt lakik.

**Top 3 javaslat:** (1) legacy guard-listák cseréje `payroll`/`reports`/`compliance` modulkulcsokra; (2) közös adatbetöltő (ünnepek + szünet + túlóra) a payroll és a riportok alá; (3) audit-authorize szűkítése + `hr_munkaviszony` → `hr_jogviszony` javítás.

---

### 2.6. Toborzás, Karrierportál, Onboarding, Offboarding — mért: 89% / 90% / 84% / 84% (dokumentált: 93% / 88%)

**[P0, funkcionális] A szerepkör-törés (1.4-es gyökérok) itt üt a legjobban vissza:** a toborzó/beléptető/kiléptető HR-es **látja az oldalt, de minden mentő gombja elutasítódik** — `verifyRecruitmentAccess` (`recruitment/actions.ts:26`), a prezentáció-actionök, az onboarding 4 és az offboarding 8 actionje legacy szerepkörneveken egyeztet.

**[P1] `getSignedFileUrl` (offboarding) hitelesítés nélkül** — *jó működés:* a védett HR-iratokhoz (szerződések, T1041, kilépő igazolások) csak jogosult felhasználó kaphat letöltési linket. *Tapasztalt:* az action **egyetlen ellenőrzés nélkül** ad 1 órás aláírt URL-t **tetszőleges útvonalra** az `irat_files` bucketból. Hasonló IDOR: IDP-tanúsítvány, ajánlói CV, jelölti CV URL-generátorok.

**[P1] Belső állásra a publikus action-rétegen bárki jelentkezhet** — *jó működés (A-088):* a belső hirdetés csak az adott cég igazolt dolgozója elől érhető el; a `submitApplication` szerveroldalon ellenőrzi. *Tapasztalt:* a **page** rétegen megvan a védelem (notFound()), de maga a **publikus server action** nem nézi a `is_internal` jelzőt — ismert hirdetés-UUID-val külső jelentkező is beadhatja. Ugyanitt: a pályázat-státusz e-mail alapján, kód nélkül, rate-limit nélkül lekérdezhető (GDPR-adatkinyerés).

**[P1] A GDPR-csomag hiányos a toborzásnál** — *jó működés (BRD-007/A-014):* perzisztált hozzájárulás, külön 12 hónapos Talent Pool-hozzájárulás, elutasítottak 30 napos anonimizálása, automatikus törlő cron. *Tapasztalt:* a hozzájárulás **csak kliensoldali állapot** (nem perzisztálódik, nem bizonyítható); a tájékoztató 6 hónapot mond a BRD 30 napja/12 hónapja helyett; **az anonimizáló cron nem létezik** — a jelölti adatok határidő után korlátlanul megmaradnak; jelölttörléskor a CV a storage-ben árva marad.

**[P1] Cross-tenant műveletek:** interjú-egyeztetés idegen cég jelöltjére (a rekord cégét átirja a saját cégére!); hirdetés-jelzők (`publikus`/`is_internal`) kizáró szinkronja csak kliensoldalon — a szerver mindkettőt true-n fogadja el; `company_id` nélküli legacy belső hirdetéseknél **más cég dolgozója is beléphet** a részletoldalra.

**[P1] Mt. 126. § pontatlanság a kilépő igazolásban** — a tárgyévi betegszabadság a „beteg" (TB-táppénz) napokat is beszámolja, és a munkanapszámítás magyar ünnepek nélkül számol → **a hivatalos igazolásban szereplő szám pontatlan lehet**.

**P2:** AI-hirdetés-generátor csak bejelentkezést ellenőriz (költségvisszaélés); hirdetéstörlés böngésző-klienssel `confirm()`-dal (projekt-konvenció ellen); e-mail HTML-injection a jelölt nevében; prezentáció-képfeltöltésnél nincs MIME/magic-byte validálás.

**Pozitívum:** a karrierportál page-szintű multi-tenant logikája (A-088) rendben van; a duplikáció-védelem működik; a `getBaseUrl` localhost-szűrése jó; a Tiptap/in-place szerkesztés (A-093/P-126) és az új törlés-funkció (A-094/P-127) a doksival egyezően működik.

**Top 3 javaslat:** (1) BUG-0 javítása (modulkulcsok) — ez visszaadja a modulokat a jogos felhasználóknak; (2) signed-URL actionök tulajdon-ellenőrzése; (3) GDPR-csomag (consent + cron + retenció-egység).

---

## 3. ÖSSZESÍTŐ ÉRETTSÉGI MÁTRIX

| Modul | Dokumentált | **Mért** | Változás | Kulcsindok |
|---|:---:|:---:|:---:|---|
| `/hr` Áttekintés | 86% | **84%** | −2 | service-role guard nélkül; KPI-eltérés |
| Profilom | 76% | **75%** | −1 | verzió-nem-kötött nyugtázás; validáció nélküli PII-írás |
| Dokumentumaim | 92% | **90%** | −2 | szerveroldali fájlvalidáció hiánya |
| Jelenlét (ESS) | 92% | **87%** | −5 | P0 jóváhagyási lyukak + időzóna-bug |
| Célkitűzések | 88% | **82%** | −6 | napló-szivárgás + IDOR |
| Fejlődési Tervem | 85% | **79%** | −6 | védtelen státuszváltó |
| Bérpapírjaim | 88% | **87%** | −1 | cég-szűrés hiánya |
| Belső Állások | 95% | **91%** | −4 | CV-IDOR; ajánlás-törlés |
| `/hr/manager` | 83% | **74%** | −9 | **túlóra-panel törött** + jóváhagyási lyukak |
| `/hr/performance` | 94% | **85%** | −9 | IDOR + ciklus-actionök |
| `/hr/performance/dashboard` | — | **90%** | — | kisebb fallback-hibák |
| `/hr/admin` Állomány | 90% | **87%** | −3 | action-réteg P0-i |
| `/hr/organization` | 90% | **86%** | −4 | mátrix-öneszkaláció; CRUD-lyukak |
| `/hr/job/[id]` | — | **82%** | — | cross-tenant olvasás |
| `/hr/orgunit/[id]` | — | **78%** | — | cross-tenant + docs-egység felülírás |
| `/hr/time` Műszakok | 82% | **80%** | −2 | Mt. 104/93 hiány (dokumentált) |
| `/hr/employee/[id]` 360° | 90% | **~79%** | −11 | company-blind betöltés; önjóváhagyás |
| `/hr/payroll` | 84% | **82%** | −2 | nyitott actionök; túlóra nem épül be |
| `/hr/reports` | 84% | **80%** | −4 | T1041/archívum action-lyukak |
| `/hr/compliance` | 88% | **84%** | −4 | nulla action-auth; szünet-hiánya |
| `/hr/audit` | 98% | **93%** | −5 | túlengedő authorize; halott tábla |
| `/hr/settings` | — | **65%** | — | **legkritikusabb biztonsági állapot** |
| `/hr/recruitment` + ATS | 93% | **~89%** | −4 | szerepkör-törés (funkcionális P0) |
| `/karrier` + Cégünkről | — | **~90%** | — | GDPR-csomag hiány |
| `/hr/onboarding` | 88% | **84%** | −4 | szerepkör-törés; cross-tenant aktiválás |
| `/hr/offboarding` | 88% | **84%** | −4 | védtelen signed-URL; Mt. 126 pontatlanság |

**Találatok összesen: 29 db P0 (ebből 5 rendszer-szintű gyökérok), ~61 db P1, ~55 db P2.**

---

## 4. JAVÍTÁSI PRIORITÁSI SORREND (javaslat)

1. **Resolver kompat-szabály szűkítése + legacy guard-listák cseréje modulkulcsokra** — *egyetlen sprintben a P0-k többsége zárható, és visszaáll a nem-admin HR-esek munkaképessége is* (1.1 + 1.4 gyökérok).
2. **`has_hr_module_access` cég-scoped újraírása** (migráció + RPC-k) — a cross-tenant RLS-rés (1.2).
3. **„admin" modulkulcs-ütközés feloldása** a Jogosultsági Mátrixban (1.3).
4. **`settings/actions.ts` azonnali hardening** (auth + cég + role-validáció) — a 65%-os modul és a legsúlyosabb eszkalációs utak.
5. **`hr_tulora_felhasznalás.company_id` migráció + action-javítás** — a vezetői túlóra-panel helyreállítása.
6. **Signed-URL actionök tulajdon-ellenőrzése** (offboarding, IDP, ajánlás, CV).
7. **Időzóna-javítás** a jelenlétkorrekciókban (bérszámfejtési pontosság).
8. **GDPR-csomag a toborzásnál** (perzisztált consent, anonimizáló cron, egységes retenció).
9. **Mt. 104. § / 93. § munkaidő-szabályok** a műszaktervezőben (dokumentált P1).
10. **Dokumentum-hozzáférési mátrix** a 360° kartonon (orvosi/fegyelmi PDF-ek kategória-szintű védése).

---

## 5. MEGJEGYZÉSEK

- Az elemzés **nem módosított semmit** a kódban.
- A találatok forráspontossággal készültek (fájl + sor), de statikus elemzésből — a P0 jelölteket javítás előtt érdemes gyors manuális teszttel is megerősíteni (pl. második cég fiókjával).
- Néhány dokumentum-elavulás is napvilágot látott (P-078/P-079 hivatkozási zavar, „13 füles" IA-lista a P-096/P-109 előttről, `resolvePerformanceAccessContext` név), amelyeket érdemes a következő doc-syncben rendbe tenni.
