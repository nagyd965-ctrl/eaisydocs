# eaisyDocs & eaisyHR – Rendszer Változásnapló (Changelog)

Minden jelentős fejlesztési mérföldkő, release és sprint időrendi naplója.

## [Unreleased] – Fejlesztés alatt (2026-10-10)

### 🔗 eaisyDocs & EaisyBILL: Felhasználókezelés és Adatforrás Integrációs Kutatás (DOC-04)
- **Átfogó Kódbázis és Adatmodell Felmérés:**
  - Teljes mélységű kutatás a VisiBILL / EaisyBILL kódbázis felépítéséről, profilkezeléséről (`profiles` tábla), szervezeti egységeiről (`departments`) és szerepköreiről (`app_role`).
  - Létrejött az átfogó integrációs és architektúra dokumentum: [`docs/integrations/eaisybill-user-sync-research-and-architecture.md`](../integrations/eaisybill-user-sync-research-and-architecture.md).
- **Négyfázisú Megvalósítási Terv:**
  - *Fázis 1:* Adatbázis sémakiterjesztés (`external_id`, `sync_source`, `last_synced_at`, `eaisybill_config` tábla).
  - *Fázis 2:* Biztonságos EaisyBILL API és szinkronizációs kliens (`src/utils/integrations/eaisybill-client.ts`).
  - *Fázis 3:* Szinkronizációs varázsló UI a Beállítások oldalon (`/settings?tab=integrations`).
  - *Fázis 4:* Automatizált inkrementális háttérszinkronizáció (CRON és Webhook támogatás).

### 🎨 Rendszerszintű UI/UX Tisztítás és Ikon-Minimalizálás (Linear Flat Design Standard – A-029 / P-043)
- **Címekből és Kártyafejlécekből a Dekoratív Ikonok Eltávolítása:**
  - A projekt szabályzat (`.agents/AGENTS.md`) és az [A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md) szellemében felszámolásra kerültek az ad-hoc, redundáns dekoratív ikonok és kerekített ikondobozok.
  - **Iktatási Szabályok (`/rules`):** Eltávolítva a címsor (`Sliders`), fülek (`Sliders`, `Brain`), kártyafejlécek (`CardTitle`), modál címek és üres állapotok dekoratív ikonjai.
  - **Rendszerbeállítások (`/settings`):** Eltávolítva az összes kártyacím-ikon a profil, cég, szervezeti egység, irattári terv és adminisztrációs blokkokból.
  - **Jelenlét és Szabadság (`/hr/self-service/time`):** Eltávolítva a `CalendarDays` ikon a „Jelenléti Ív” kártya kibontható fejlécéből, és a `CalendarClock` ikon a „Helyettesítés” kártyacímből. Tisztítva a kapcsolódó munkaidő-korrekciós és túlóra modálok címei is.
  - **HR Főoldalak:** Megtisztítva a Bérszámfejtés (`/hr/payroll`, `/hr/self-service/payroll`) és Teljesítményértékelés (`/hr/performance/dashboard`) fejléc-ikonjai.

### 🛡️ eaisyDocs: Központi Eseménynapló Teljes Újragondolása és Dedikált Modul (A-050 / P-069)
- **Dedikált Főútvonal és Oldalsáv Navigáció (`/audit`):**
  - A korábbi, nehezen hozzáférhető és kezdetleges „Globális Audit Napló” átkerült a Beállítások felület legaljáról egy dedikált, kiemelt felületre (`/audit`).
  - Az oldalsáv navigációba (`app-sidebar.tsx`) bekerült az **„Eseménynapló”** menüpont (`ShieldAlert` ikonnal), amely a jogosult szerepkörök (`admin`, `rendszergazda`, `auditor`, `vezeto`) számára azonnal elérhető.
  - A beállítások oldalról (`/settings`) a felesleges redundáns kód és a szerveroldali naplólekérés maradéktalanul kivezetésre került.
- **Központi Képernyő Teljes Megújítása az eaisyHR Mintájára:**
  - Modern, kifejező felület a legfrissebb Linear flat design irányelvek szerint.
  - Új szemantikus műveleti motor (`DOCS_EVENT_CONFIG`): 6 logikai kategóriára bontott műveletek (Betekintés/Megnyitás, Iktatás/Létrehozás, Módosítás, Szignálás, Selejtezés, Lezárás/Archiválás), színkódolt szemantikus HSL jelvényekkel és ikonokkal.
  - Központi `formatAuditLogEvent` motor integráció ([A-046](../architecture/decisions/A-046-canonical-audit-log-formatting-engine.md)): Emberileg azonnal érthető magyar leírások, iktatószámok és részletek.
- **Kanonikus KPI Statisztikai Kártyák (Linear Flat Grid - A-029):**
  - Négy dedikált `KpiCard` kártya a fejléc alatt: *Összes Audit Esemény*, *Irat Betekintés & Letöltés*, *Iktatások & Módosítások*, valamint *Közreműködő Felhasználók*.
- **Kanonikus TableToolbar és Többdimenziós Szűrés:**
  - Integrálásra került a központi `TableToolbar` komponens:
    - **Felhasználói szűrés:** Dinamikusan generált választólista az eseményekben szereplő kollégákból és adminokból.
    - **Műveletkategória szűrés:** Megtekintés, Létrehozás/Iktatás, Módosítás, Szignálás, Selejtezés, Lezárás.
    - **Entitástípus szűrés:** Irat, Ügyirat, Irattári tétel, Helyettesítés, Rendszer.
    - **Dátumtartomány:** Kezdő és záró dátum mezők, valamint instant gyorsgombok (*Mind*, *Ma*, *Elmúlt 7 nap*, *Elmúlt 30 nap*).
    - **Azonnali Keresőmező:** `Search` ikonnal, valós idejű gépelési szűréssel és törlőgombbal.
    - **Oszlopválasztó (`Columns3`):** Testreszabható látható oszlopok.
    - **CSV Export:** Microsoft Excel-kompatibilis UTF-8 BOM (`\uFEFF`) kódolású export, a kiválasztott cég nevével a fájlnévben.
- **Részletes Audit Esemény Betekintő Modal (`Dialog`):**
  - Bármely bejegyzésre kattintva megnyitható a részletes adatlap:
    - Közreműködő adatai: név, szerepkör, IP cím és böngésző User-Agent.
    - Esemény adatai: pontos időbélyeg, cégazonosító, entitás típus és ID.
    - Értékváltozás (Diff) összehasonlító táblázat: korábbi érték piros áthúzással, új érték zöld kiemeléssel a JSON módosításokhoz.
- **Többcég-kezelés (Multi-Tenancy) és GDPR Védelem:**
  - A felület szorosan együttműködik a `useCompany()` hookkal: a felső sávban cégváltáskor az audit napló azonnal az aktív vállalathoz tartozó eseményekre frissül.
  - A fejléc a kanonikus `Building2` cégjelvénnyel egyértelműen mutatja az aktív szervezetet.
- **Dokumentáció:** [ADR A-050](../architecture/decisions/A-050-eaisydocs-central-audit-log-overhaul.md), [PRD P-069](../product/decisions/P-069-eaisydocs-central-audit-log-overhaul-ux.md).


### 🏢 eaisyHR: Központi Áttekintés Többcég-kezelés és Pontos KPI Metrikák (A-049 / P-068)
- **Cég szerinti szigorú adatizoláció (`/hr/admin/overview`):**
  - Megszűnt a cégcsoportos áttekintőben tapasztalt adatszivárgás: a statisztikák korábban globálisan, cégfüggetlenül mutatták az aktív dolgozókat, a nyitott pozíciókat, a távolléteket és az onboarding folyamatokat.
  - A szerveroldali lekérdezések mostantól a sütiből feloldott `activeCompanyId` / `companyScope` hatókörben futnak:
    - **Aktív Dolgozók:** Csak a `company_members` alapján az aktív céghez rendelt dolgozók száma jelenik meg (pl. Teszt Kft.-nél pontosan 2 fő, Think AI Kft.-nél 6 fő).
    - **Nyitott Pozíciók & Toborzás:** Csak az adott céghez tartozó álláshirdetések és pályázati fázisok (`hr_toborzas.company_id`).
    - **Aktív Onboarding:** Szigorúan az aktív céghez tartozó folyamatban lévő beillesztések (`hr_onboarding.company_id`).
    - **Mai Hiányzók & Szabadságkérelmek:** Céghez kötött távolléti adatok (`hr_tavollet.company_id`).
    - **Lejárati Figyelmeztetések:** Orvosi alkalmasságiak, próbaidők és határozott idejű szerződések szűrése az aktív cég tagjaira (`safeMemberIds`).
- **Céghez kötött adminisztratív akciók:**
  - A `reassignPendingLeaves` szerver akció mostantól a `getActiveCompanyIdServer()` segítségével kizárólag a kiválasztott cég függő szabadságkérelmeit szignálja át.
- **Vizuális Visszajelzés:**
  - A fejléc a kanonikus Linear flat stílusú `Building2` cégjelvénnyel (`Badge`) azonnal és egyértelműen mutatja a munkakörnyezetül szolgáló aktív vállalat nevét.
- **Dokumentáció:** [ADR A-049](../architecture/decisions/A-049-hr-central-overview-multi-tenant-scoping-and-kpi-accuracy.md), [PRD P-068](../product/decisions/P-068-hr-central-overview-multi-tenant-scoping-and-kpi-accuracy-ux.md).

### 📊 eaisyHR: Központi Eseménynapló Teljes Újragondolása, Kanonikus TableToolbar és Többdimenziós Szűrés (A-048 / P-067)
- **Központi Képernyő Teljes Megújítása (`/hr/audit`):**
  - Felszámolásra került az eddigi nyers prototípus felület, ahol a bejegyzések 95%-a semmitmondó „Ismeretlen” jelvénnyel és belső SQL táblanevekkel (`hr_dolgozo_titkos_adat`, `hr_munkavedelmi_oktatas`, `hr_offboarding`, `hr_onboarding_feladat`) jelent meg.
  - Új szemantikus leképező motor: `HR_ENTITY_CONFIG` és `HR_EVENT_CONFIG` magyar modulnevekkel, kategóriákkal és színkódolt HSL badge-ekkel (kék `info` olvasáshoz, zöld `success` létrehozáshoz, sárga `warning` módosításhoz, piros `destructive` törléshez).
  - A megjegyzésekből automatikusan kitisztításra kerültek a belső UUID azonosítók.
- **Kanonikus KPI Statisztikai Kártyák (Linear Flat Grid - A-029):**
  - Négy dedikált `KpiCard` kártya a lap tetején: *Összes Audit Esemény*, *Érzékeny Adat Betekintés* (kiemelt kerettel), *Módosítások & Törlések*, valamint *Közreműködő Felhasználók*.
- **Kanonikus TableToolbar és Többdimenziós Szűrés:**
  - Integrálásra került a központi `TableToolbar` komponens:
    - **Felhasználói szűrés:** Dinamikusan generált választólista a naplóban szereplő összes HR munkatársból és adminisztrátorból.
    - **Művelettípus szűrés:** Megtekintés / Olvasás, Létrehozás / Iktatás, Módosítás, Jóváhagyás / Nyugtázás, Törlés, Rendszeresemény.
    - **Modul / Szakterület szűrés:** Bizalmas adatok, Személyes adatok, Iratok & Szerződések, Munkavédelem & Egészségügy, Munkaidő & Jelenlét, Beléptetés & Kiléptetés, Cafeteria, Bérszámfejtés stb.
    - **Dátumtartomány:** `Kezdő dátum` és `Záró dátum` mezők, valamint instant gyorsgombok: *Mind*, *Ma*, *Elmúlt 7 nap*, *Elmúlt 30 nap*.
    - **Azonnali Keresőmező:** `Search` ikonnal, valós idejű gépelési szűréssel és `X` törlőgombbal.
    - **Oszlopválasztó (`Columns3`):** Testreszabható oszlopnézet.
    - **CSV Export:** Teljes szűrt napló exportálása Microsoft Excel-kompatibilis UTF-8 BOM karakterkódolással.
- **Részletes Esemény Betekintő Modal (`Dialog`):**
  - Részletes adatlap felugró modálban a kiválasztott bejegyzéshez:
    - Végrehajtó neve, munkaköri pozíciója és HR szerepköre.
    - Érintett modul, entitástípus és rekordazonosító.
    - Teljes tisztított indoklás / megjegyzés.
    - Mezőszintű változáskövetés (korábbi áthúzott és új érték összehasonlító diff tábla magyar mezőnevekkel).
    - Technikai metaadatok: IP cím és böngésző User Agent.
- **Reszponzív Lapozás:**
  - Választható lapméret (15, 25, 50, 100 elem / oldal) tiszta oldalnavigációval.
- **Többcég-kezelés (Multi-Tenancy) és GDPR Hatókör Izoláció:**
  - Az Eseménynapló összekapcsolásra került a `useCompany()` kontextussal: a fejléc menüjében kiválasztott cég váltásakor (`selectedCompany.id`) a napló azonnal újratöltődik az adott vállalkozás eseményeire szűrve.
  - A fejlécben és az esemény részletező modálban kiemelt jelvény mutatja az aktív céget.
  - A CSV exportálás fájlneve és minden adatsora tartalmazza az adott vállalat nevét.
  - Új adatbázis trigger (`trg_hr_esemeny_naplo_company_id`): gondoskodik róla, hogy minden bejövő audit esemény automatikusan megkapja a végrehajtóhoz tartozó vállalat azonosítóját, ha az nem került explicit átadásra.
- **Dokumentáció:** [ADR A-048](../architecture/decisions/A-048-eaisyhr-central-audit-log-overhaul-and-query-hardening.md), [PRD P-067](../product/decisions/P-067-eaisyhr-central-audit-log-overhaul-and-unified-filtering-ux.md).
- **Félrevezető eseményelnevezés megszüntetése:**
  - Megszűnt az `Érzékeny Adatok (TAJ, Adó) - irat_megtekintes` nyers, megtévesztő kiírás. A felhasználók azt hihették, hogy nem létező iratot tekintettek meg, holott a háttérben az `esemeny_tipus: "irat_megtekintes"` volt hibásan hardkódolva a titkosított személyes adatok feloldására (`revealEmployeeSecretData`).
  - Új, tiszta magyar megnevezések: `Érzékeny adatok (TAJ, Adó, Bér) feloldása` és `Érzékeny adatok (TAJ, Adó, Bér) módosítása`.
  - A megjegyzésekből automatikusan kitisztításra kerültek a belső technikai UUID azonosítók.
- **Duplikáció- és Ghost-Trigger védelem:**
  - Kijavításra került a `PersonalDataTab` és `PersonalDataCard` mentési logikája: korábban a mentés sikere után egy `handleReveal()` + `setTimeout(handleReveal, 100)` duplikált hívás feleslegesen újabb megtekintési naplóbejegyzést szült az adatbázisban. A komponensek most közvetlenül a helyi React állapotot frissítik.
  - Új szerveroldali védelem: 15 másodperces időablakos throttling a `revealEmployeeSecretData` és `revealSecretData` függvényekben (ugyanazon felhasználó gyors ki-be kapcsolása vagy dupla kattintása nem többszörözi meg a naplót).
  - Kliensoldali intelligens tömörítés az `AuditLogTab`-ban: az 1 percen belüli egymást követő azonos feloldások egyetlen bejegyzésként jelennek meg (`(2×) feloldva 1 percen belül`).
- **Dolgozói Életút és Iratkezelési Események Integrációja:**
  - A `getEmployeeAuditLogs` mostantól lekéri a dolgozóhoz tartozó `hr_dokumentum` rekordok azonosítóit is, így a munkaszerződések, orvosi alkalmassági igazolások, tanulmányi szerződések és fegyelmi határozatok iktatási/törlési előzményei is azonnal láthatóvá válnak a dolgozó „Előzmények” lapján.
- **UI és UX Fejlesztések:**
  - Keresőmező és kategória szűrő gombok (`Összes`, `Érzékeny adatok`, `Módosítások`, `Iratok & Szerződések`).
  - Szemantikus eseményjelvények (`Megtekintés`, `Módosítás`, `Létrehozás`, `Törlés`), ikonok és tiszta magyar mezőcímkék a módosult értékek összehasonlító nézetében.
  - Dokumentáció: [ADR A-047](../architecture/decisions/A-047-eaisyhr-audit-log-deduplication-and-semantic-event-resolution.md), [PRD P-066](../product/decisions/P-066-eaisyhr-audit-log-deduplication-and-semantic-event-resolution.md).

### 📋 eaisyDocs: Kanonikus Eseménynapló Formázó Motor és Szemantikus Naplófeloldás (A-046 / P-065)
- **Tervezési és UX háttér:**
  - Megszüntetésre került a semmitmondó „Ügyirat módosítva” generikus címdömping az eseménynaplóban és az irattörténetben.
  - Új központi eseményfeldolgozó motor: `src/utils/audit-log-formatter.ts`, amely minden művelethez (iktatás, feladatkiírás, feladat lezárás, kimenő válaszlevél előállítás, kiküldés, piszkozat törlés, belső megjegyzések, státuszváltozások, explicit jogosultságok, kölcsönzés) pontos, magyar nyelvű címet, leírást és szemantikus ikont rendel.
  - Megszűnt a megjegyzéseknél korábban látott „Megjegyzés hozzáadva / Megjegyzés hozzáadva” redundáns címduplikáció: a rendszer a konkrét megjegyzésszöveget jeleníti meg.
  - A szerveroldali megjegyzésmentés (`src/app/dossiers/[id]/actions.ts`) kiegészült a beírt szöveg előnézetével és structured JSON mezővel.
  - Kibővült a `TimelineIconName` ikonkészlet: `send`, `message-square`, `list-todo`, `sparkles`, `link`, `upload`, `archive`, `shield`, `download`, `refresh-cw`, `clock`.
  - Az ügyiratlapon (`src/app/dossiers/[id]/page.tsx`), a bejövő irat nézetben (`src/app/inbox/view/[id]/page.tsx`) és a hivatalos PDF életciklus exportban (`src/app/dossiers/[id]/lifecycle-export.ts`) is a kanonikus formázó motor működik.
  - Új egységteszt csomag: `src/utils/__tests__/audit-log-formatter.test.ts` (9/9 sikeres teszteset).
  - Dokumentáció: [ADR A-046](../architecture/decisions/A-046-canonical-audit-log-formatting-engine.md), [PRD P-065](../product/decisions/P-065-canonical-audit-log-formatting-ux.md).

### 🔒 eaisyDocs: Iktatott és Expediált Kimenő Iratok Törlésvédelme (A-006 / A-008)
- A jogszabályi előírásoknak (335/2005. Korm. rend., Levéltári tv.) megfelelően a már hivatalosan beiktatott (alszámmal ellátott) vagy expediált (kiküldött) kimenő iratok mellett nem jelenik meg kuka gomb a felületen, megvédve az iktatási sorszámfolytonosságot (gap-mentesség).
- Kijavításra került a paramétersorrend a kimenő iratok törlési függvényhívásában.

### 📁 eaisyDocs: Beágyazott Feladatkészítő, Modálmentesítés és Háromlépcsős AI Válaszlevél Varázsló (DOC-TASK-01 / DOC-01)
- **Tervezési és UX háttér (Linear Flat & Zero-Nested-Modal elv):**
  - Felszámolásra került a többszörösen egymásba nyíló felugró ablakok (modál a modálban) zavaró működése: korábban az „Új feladat” egy modált nyitott, a sablonok egy 2. modált, az új sablon pedig egy 3. modált.
  - A feladatok és belső megjegyzések felülete tágas, kétoszlopos munkatérré alakult: bal oldalon (65%) a feladatlista és a közvetlen feladatkészítő, jobb oldalon (35%) a teljes magasságú belső megjegyzések és üzenőfal (@ említés támogatással).
  - A feladatkészítő kártya (`TasksTab`) tetején **Gyors Sablonszalag** kapott helyet 1-kattintásos gyorsgombokkal (`Jóváhagyás`, `Könyvelés`, `Jogi felülvizsgálat`, `Válaszlevél készítése`, `Árajánlat kérése`, `Irat feldolgozása`) és lenyitható teljes sablonkatalógussal.
- **Dedikált Válaszlevelek & Expediálás Lap (`OutgoingDocumentsTab`):**
  - A kimenő válaszlevelek és expediálás új dedikált lapra (`TabsTrigger value="outgoing"`) került az ügyirat adatlapon (`/dossiers/[id]`).
  - Háromlépcsős lineáris varázsló:
    - **1. lépés: Címzett & Kézbesítési csatorna:** Partner adatok betöltése, csatorna választó kártyák (`E-MAIL`, `POSTA`, `CSAK IKTATÁS`).
    - **2. lépés: Levél megfogalmazása (0 Modál!):** Beágyazott fülváltó három szerkesztési móddal:
      - `[ ✏️ Saját szöveg ]`: Tárgy és levéltörzs közvetlen megadása.
      - `[ ✨ AI varázsló ]`: Gemini AI integráció 4 hivatalos hangvétellel (`hivatalos`, `baratsagos`, `tajekoztato`, `felszolito`), kérések és instrukciók megadásával, azonnali vázlatgenerálással és finomhangolással.
      - `[ 📄 Sablonok ]`: Hivatalos ügyviteli sablonok beillesztése 1 kattintással (hiánypótlási felhívás, elfogadó nyilatkozat, megkeresés megválaszolása, számlareklamáció).
    - **3. lépés: Véglegesítés & Kiküldés:** PDF melléklet csatolása, partner e-mail címének mentése partnertörzsbe, kimenő iratként való azonnali iktatás és expediálás.
  - Generált/elküldött kimenő iratok listája kézbesítési státusz jelvénnyel, in-place PDF megtekintéssel (`DocumentViewer`) és törléssel.
- **Szerveroldali Műveletek és AI Integráció (`src/app/dossiers/[id]/ai-reply-actions.ts`):**
  - `generateAiReplyAction`: Google Gemini 2.5 Flash API integráció determinisztikus, hivatali stílusú magyar válaszlevelek generálására, fallback tartalék motorral hálózati kimaradás esetére.
  - Safe cookies/request-store védelem unit tesztek és CI környezetek számára.
- **Tesztek és Minőségbiztosítás:**
  - Új tesztcsomag: `src/utils/__tests__/ai-reply-wizard.test.ts` (6/6 sikeres egységteszt: 4 hangvétel generálás, hibakezelés hiányzó instrukcióra, fallback működés offline módban, sablonok beillesztése).
  - Teljes projekt tesztfutás: 122/122 egységteszt sikeres (16 tesztcsomag, 0 hiba).
  - TypeScript fordítás: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-045](../architecture/decisions/A-045-embedded-task-composer-and-ai-reply-wizard-architecture.md), [PRD P-064](../product/decisions/P-064-embedded-task-composer-and-ai-reply-wizard-ux.md).
- **Törvényi és adatvédelmi háttér (GDPR 5. cikk, 32. cikk):**
  - Többvállalatos holding struktúrában kritikus követelmény az adatelkülönítés (multi-tenancy isolation). Egy munkavállaló személyes, bér- és távolléti adatai szigorúan csak ahhoz a jogi személyhez tartozhatnak, amellyel munkaviszonyban áll.
  - Feloldásra került a cégcsoportos HR dilemma: a modern architektúra natívan támogatja mind a központi/holding HR-es modellt, mind az önálló leányvállalati dedikált HR-es modellt a `company_members` táblához kötött `hr_szerepkor` és `docs_szerepkor` feloldással.
  - Megszűnt a Kettős Szerepkör (Dual-Role) biztonsági rése: ha egy felhasználó az "A" cégben HR vezető, de a "B" cégben egyszerű munkavállaló, a rendszer cégváltáskor azonnal a célcégbeli jogosultságaira állítja a felhasználót, megelőzve az illetéktelen béradat-betekintést.
- **Dinamikus Szerepkör-feloldó és Védelmi Motor (`src/utils/hr/`):**
  - `company-role-resolver.ts`: Tiszta függvénykönyvtár (`resolveUserCompanyRoles`, `validateEmployeeCompanyAccess`, `isUserAuthorizedForHrView`). Elsőbbséget ad a `company_members` tagsági szerepkörnek a globális profillal szemben, automatikusan érvényesíti az admin/owner jogosultságokat, és nem tagság esetén azonnali elutasítást ad (`none`).
  - `company-server.ts`: Kiegészítve az `getActiveCompanyMemberRolesServer` szerveroldali segédfüggvénnyel, amely Next.js Server Components és Server Actions környezetben feloldja az aktív céghez tartozó scoped szerepköröket.
  - `hr-auth-guard.ts`: `requireHrAuthServer(allowedRoles, fallbackRedirect)` egységes védelmi kapu átirányítási és inline hiba-kezelési támogatással.
- **Alkalmazásszintű Scoping és Átfogó Képernyővédelem:**
  - `src/app/layout.tsx`: A globális profil helyett a cég-specifikus feloldott szerepköröket adja át az oldalsávoknak (`HrSidebar`, `AppSidebar`), garantálva a dinamikus menümegjelenést.
  - **Bérszámfejtés (`/hr/payroll`):** Cégre szűrt dolgozók, céghez kapcsolt új bérpapír előállítás, `companies` táblából dinamikusan feloldott hivatalos munkáltatói név, cím és adószám a generált bérpapír PDF-eken (`downloadPayslipPdfAction`).
  - **Toborzás (`/hr/recruitment`):** `verifyRecruitmentAccess` védelem, csak az aktív cég álláshirdetéseinek és pályázóinak listázása és mentése.
  - **Vezetői Műszerfal (`/hr/manager`):** Cégre szűrt csapattagok, távollétek, jelenléti korrekciók és túlóra-felhasználások.
  - **Riportok (`/hr/reports`):** `loadHrMasterData` cégre szűrt dolgozói, jogviszony, szervezeti egység és munkakör adatokkal (NAV T1041, KSH, Bérriport).
  - **Beléptetés & Kiléptetés (`/hr/onboarding`, `/hr/offboarding`):** Cégre szűrt folyamatok és sablonok.
  - **HR Beállítások (`/hr/settings`):** Cégre szűrt szervezeti struktúra, munkakörök és munkatársak kezelése.
  - **Re-render és Állapot-szivárgás védelem:** Minden érintett oldalon gyökér szintű `key={companyScope}` / `key={activeCompanyId}` biztosítja a React komponensek tiszta unmount/remount folyamatát cégváltáskor.
- **Tesztek és Minőségbiztosítás:**
  - Új dedikált tesztcsomag: `src/utils/__tests__/company-role-resolver.test.ts` (7/7 sikeres teszt: tagsági felülbírálás, fallback, owner/admin feloldás, kettős szerepkör izoláció, nem-tag elutasítás, dolgozói kereszt-cég hozzáférés-ellenőrzés).
  - Teljes projekt tesztfutás: 116/116 egységteszt sikeres (16 tesztcsomag, 0 hiba).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-044](../architecture/decisions/A-044-hr-multi-tenancy-and-strict-gdpr-isolation.md), [PRD P-063](../product/decisions/P-063-hr-multi-tenancy-and-strict-gdpr-isolation-ux.md).

### ⏱️ eaisyHR: Munkaidőkorlátok (Mt. 99. § 48h) és Éves Túlórakeret (Mt. 135. §) Számláló (HR-TASK-02)
- **Törvényi háttér és üzleti cél:**
  - A Munka Törvénykönyve (Mt. 99. § (2) bek.) előírja, hogy a heti munkaidő a rendes és rendkívüli munkaidővel együtt sem haladhatja meg a **48 órát**.
  - Az Mt. 135. § (1)-(2) bek. alapján naptári évenként legfeljebb **250 óra** rendkívüli munkaidő (túlóra) rendelhető el egyoldalúan, míg írásbeli megállapodással („önként vállalt túlmunka”) a keret legfeljebb **400 óra**.
  - A munkaügyi bírságok megelőzése érdekében mind a tervezési, mind az elszámolási fázisban valós idejű felügyelet épült ki.
- **Új Adatbázis Mezők (`hr_dolgozo_adatlap`):**
  - Migráció: `supabase/migrations/20261010000004_add_overtime_compliance_fields.sql`.
  - `onkent_vallalt_tulora_400h BOOLEAN DEFAULT false`: Az Mt. 135. § szerinti írásbeli megállapodás jelölője.
  - `onkent_vallalt_tulora_datum DATE`: A megállapodás keltének / hatálybalépésének dátuma.
- **Tiszta Számító Motor (`src/utils/hr/overtime-engine.ts`):**
  - `determineAnnualOvertimeLimit`: 250 vagy 400 órás keret megállapítása.
  - `calculateOvertimeQuotaStatus`: 0-79% zöld (normál), 80-99% sárga küszöb (figyelmeztetés), 100%+ piros riasztás (keret kimerült).
  - `checkWeeklyHoursCompliance`: heti 40h rendes, 40-48h túlóra, >48h törvénysértés szintek.
  - `calculateDailyOvertimeFromAttendance`: jelenléti ívek tény túlóráinak és pihenőnapi munkavégzésének pontos számítása.
  - `validateShiftAssignmentOvertimeRisk`: műszaktervező előzetes kockázatelemzés.
- **Központi Megfelelőségi Hub (`/hr/compliance` – 3. Fül):**
  - Új fül: `Munkaidő & Túlórakeret (Mt. 99. §, 135. §)`.
  - 4 kanonikus `KpiCard`: Heti 48h limit túllépés (kiemelt piros), Éves keret 80% felett (küszöb), Éves keret kimerült (100%+), Önként vállalt megállapodás (400h).
  - Interaktív `OvertimeComplianceTable`: instant gépelési kereső, oszlopválasztó, tematikus szűrők (heti megfelelőség, éves szint, megállapodás, részleg), Linear Flat progress bar, in-place 400h megállapodás kapcsoló.
- **Dolgozói Profil & Túlóra Egyenleg Kártya (`OvertimeBalanceCard`):**
  - Kiegészült az éves Mt. 135. § progress barral, 250h/400h jelvénnyel és a hátralévő órák számával.
- **Műszaktervező Integráció (`ShiftPlannerWeeklyGrid` & `shift-actions.ts`):**
  - A `saveShiftAssignmentAction` műszak mentése előtt ellenőrzi a heti összóraszámot, és >48h esetén figyelmeztetést ad.
  - A műszak-hozzárendelő és módosító popoverekben automatikus figyelmeztető banner jelenik meg a 48h-t elérő vagy meghaladó dolgozóknál.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/overtime-engine.test.ts` (5/5 sikeres egységteszt).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-043](../architecture/decisions/A-043-hr-working-hours-and-annual-overtime-compliance-architecture.md), [PRD P-062](../product/decisions/P-062-hr-working-hours-and-annual-overtime-compliance-ux.md).

### 💰 eaisyHR: Ütemezett Bérpapír Előállítás és Dolgozói Digitális Átvételi Nyugtázás (HR-TASK-07)
- **Törvényi háttér és megfelelőség:**
  - A Munka Törvénykönyve (Mt. 155. §) alapján a munkáltató köteles a tárgyhónapot követő hónap 10-ig írásbeli tájékoztatást (bérjegyzéket) átadni a munkavállalónak a munkabér elszámolásáról és a levonásokról. Az elektronikus közlés joghatásos (Mt. 22. §), amennyiben a munkavállaló megismerheti és az átvétel auditálhatóan bizonyított.
- **Új Adatbázis Tábla (`public.hr_berpapir`):**
  - Migráció: `supabase/migrations/20261010000003_add_hr_berpapir.sql`.
  - 43 mezőből álló, szigorú RLS védelemmel ellátott reláció: a munkavállaló kizárólag a saját bérpapírjait láthatja és nyugtázhatja (`dolgozo_id = auth.uid()`), a HR pedig a teljes céges állományt kezeli.
  - Tételes mezők: alapbér, ledolgozott napok/órák, fizetett szabadság, betegszabadság (Mt. 146. § 70%), túlóra pótlék (150%), bónusz, cafeteria bruttó, bruttó összesen.
  - Opcionális adókedvezmények: 25 év alattiak SZJA mentessége (576.601 Ft keretig), családi adó- és járulékkedvezmény, személyi kedvezmény.
  - Törvényes levonások: SZJA 15%, TB járulék 18,5%, bírósági letiltások.
  - Nettó kifizetés, munkáltatói SZOCHO (13%), bankszámlaszám, digitális átvételi időbélyeg (`atvetel_datuma`, `atvetel_ip`).
- **Kalkulációs és PDF Generáló Motor (`src/utils/hr/`):**
  - `payslip-calculator.ts`: Determinisztikus bér- és járulékkalkulátor levonásfelosztással és digitális átvételi nyugtázó segéddel.
  - `payslip-pdf-generator.ts`: Hivatalos, formázott A4-es magyar Bérjegyzék PDF sablon (Puppeteer / `launchPdfBrowser`), digitális átvételi záradékkal és 50 éves irattári hivatkozással.
- **HR Munkaasztal Kezelőfelület (`/hr/payroll`):**
  - Önálló menüpont az oldalsávban (`Bérszámfejtés & Bérpapírok`).
  - Havi időszakválasztó léptetővel.
  - 5 Linear Flat `KpiCard`: Összes dolgozó, Előállított bérpapír, Átvéve és nyugtázva (zöld), Átvételre vár (sárga), Havi nettó kifizetés.
  - Központi `TableToolbar`: azonnali keresés név, adójel, TAJ, beosztás, részleg szerint; státusz és részleg szűrők.
  - Egy kattintásos kötegelt előállítás és közzététel: *„Havi Bérpapírok Előállítása & Közzététele (Mt. 155. §)”*.
  - Soronkénti in-place PDF megtekintés (`PdfViewerDialog`), letöltés és egyedi korrekciós modál (bónusz, 25 év alatti, családi kedvezmény, letiltás).
- **Dolgozói Önkiszolgáló Portál (`/hr/self-service/payroll`):**
  - Új menüpont az Önkiszolgáló pultban: **`Bérpapírjaim`**.
  - Havi lista időrendben, kiemelt nettó kifizetési doboz bankszámlaszámmal, tételes jövedelem- és levonásbontás.
  - **„Átvételt igazolom (Mt. 155. §)”** gomb: megerősítő modállal rögzíti az átvétel időbélyegét és IP címét, naplózza az `esemeny_naplo`-ba, és zöld hitelesített bélyegzőt kap.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/payslip-calculator.test.ts` (7/7 sikeres teszteset).
  - `src/utils/__tests__/payslip-pdf.test.ts` (4/4 sikeres teszteset).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-042](../architecture/decisions/A-042-hr-scheduled-payroll-generation-and-digital-receipt-architecture.md), [PRD P-061](../product/decisions/P-061-hr-scheduled-payroll-generation-and-digital-receipt-ux.md).

### 📋 eaisyHR: Offboarding Kötelező Hatósági Kilépőigazolások és eaisyDocs Iktatás (HR-TASK-06)
- **Törvényi háttér és audit megállapítás:**
  - A Munka Törvénykönyve (Mt. 80. § (2) bek.), a foglalkoztatási törvény (Flt. 36/A. §) és a hatósági szabályok alapján a munkaviszony megszűnésekor a munkáltató köteles kiadni az igazolásokat (munkaviszony igazolás, álláskeresési járadék adatlap, letiltási nyilatkozat, betegszabadság elszámolás, NAV adóadatlap és TB kiskönyv bejegyzés).
  - Az audit megerősítette, hogy az offboardingban a P-041 döntés során elkészült a hatósági PDF generátor (`exit-certificate-pdf-generator.ts`) és az `ExitCertificatePanel`.
  - A mostani fejlesztés felszámolta a feltárt kockázatokat és automatizálta a folyamatot.
- **Lezáráskori automatikus védőháló (Fail-Safe Filing):**
  - A `closeOffboarding` folyamatzáró akcióba beépült egy automatikus ellenőrzés: amennyiben a folyamathoz még nem készült el a kilépő igazolás, a motor automatikusan előállítja azt a dolgozó személyi kartonja, a kiléptetés paraméterei és a valós távolléti adatok alapján.
  - A generált igazolást a rendszer kötegelten beiktatja a munkavállaló eaisyDocs személyi dossziéjába (`3.1` tétel, 50 év megőrzési idővel, gap-mentes alszámmal és PDF/A-2b archiválási példánnyal).
- **Tárgyévi betegszabadság automatikus összesítése (Mt. 126. §):**
  - A `getOffboardingDetailData` és a `generateExitCertificateAction` automatikusan összesíti a dolgozó tárgyévi, jóváhagyott betegszabadság napjait a `hr_tavollet` táblából, és előtölti az űrlapon.
- **Azonnali egyedi beiktatási lehetőség (`ExitCertificatePanel`):**
  - Új „Beiktatás a személyi dossziéba most” akciógomb jelent meg a panelen a még le nem zárt offboardingokhoz (pl. ha a munkavállaló az utolsó munkanapon bent írja alá a dokumentumot, de az IT vagy bérszámfejtési folyamat még 1-2 napig nyitott marad).
- **Tesztek és Minőség:**
  - `src/utils/__tests__/exit-certificate-pdf.test.ts` (6/6 sikeres teszt: PDF struktúra, Puppeteer buffer, letiltások, végkielégítés, 5 kötelező igazolás).
  - `src/utils/__tests__/offboarding-compliance.test.ts` (5/5 sikeres teszt: 5 hatósági okirat, betegszabadság aggregáció, fail-safe lista, adatlap fallback).
  - TypeScript fordítás: 0 hiba (`npx tsc --noEmit`).
- **Kapcsolódó dokumentáció:** [ADR A-041](../architecture/decisions/A-041-hr-offboarding-statutory-exit-certificates-and-filing-safety-net.md), [PRD P-060](../product/decisions/P-060-hr-offboarding-statutory-exit-certificates-and-filing-ux.md).

### 🩺 eaisyHR: Orvosi Alkalmassági és Beosztási Blokkolás Összehangolása (HR-TASK-05)
- **Törvényi háttér és audit megállapítás:**
  - Az 1993. évi XCIII. tv. (Mvt.) 49. § (1) bek. és a 33/1998. (VI. 24.) NM rendelet alapján a munkavállaló csak olyan munkára és akkor alkalmazható, amelyre orvosilag alkalmasnak bizonyult.
  - Az alapos kód- és folyamataudit feltárta, hogy a rendszerben korábban **nem létezett aktív orvosi blokkolás**: a dolgozói jelenlét rögzítésekor (`toggleCheckIn`) semmilyen orvosi vizsgálat nem történt, az előzetes műszaktervezőben pedig a lejárat csupán egy nem gátló sárga felkiáltójelet mutatott, de a mentést teljes mértékben engedélyezte.
- **Központi érvényesség-ellenőrző motor (`medical-compliance-checker.ts`):**
  - Elkészült a `checkMedicalValidityForDate(supabase, dolgozoId, targetDateStr)` típusbiztos segédfüggvény.
  - Lekérdezi a dolgozó legfrissebb orvosi vizsgálatát (`hr_orvosi_vizsgalat`), és szigorúan ellenőrzi az érvényességi intervallumot (`vizsgalat_idopontja` – `ervenyesseg_vege`), valamint a minősítést (`nem_alkalmas`).
  - Standard hibakódokat és magyarázatokat ad vissza: `missing`, `not_yet_valid`, `expired`, `nem_alkalmas`.
- **Valós idejű jelenléti kemény blokkolás (`self-service/actions.ts`):**
  - Munkakezdés (`check_in`) és szünetről visszatérés (`work`) esetén a rendszer ellenőrzi a mai napra vonatkozó orvosi érvényességet.
  - Ha az orvosi lejárt vagy hiányzik, a művelet azonnal sikertelen (`success: false`), és törvényi hivatkozású hibaüzenetet kap a dolgozó.
  - **Munkavállalói védelem:** A műszakzárás / távozás (`checkout`) sosem blokkolt, így az érvénytelen alkalmasságú dolgozó szabályosan be tudja fejezni a jelenlétét.
- **Műszakbeosztás és csoportos másolás védelem (`shift-actions.ts`):**
  - `saveShiftAssignmentAction`: Új műszak rögzítésekor vagy módosításakor szigorúan a műszak konkrét céldátumára vizsgálja a vizsgálat érvényességét. Érvénytelenség esetén azonnali elutasítás (`error` objektum). A műszak törlése engedélyezett marad a hibás beosztások javításához.
  - `copyPreviousWeekRosterAction`: Csoportos heti másoláskor a motor kiszűri és automatikusan átugorja azon napokat, amikor a célhéten a dolgozó orvosija már nem érvényes, és `skippedMedicalCount` számlálóval értesíti a vezetőt.
- **Műszaktervező vizuális kapu (`ShiftPlannerWeeklyGrid`):**
  - Piros orvosi ikon (`Stethoscope`) és finom színezés jelzi a cellában az érvénytelen napokat.
  - A cella Popoverjében kiemelt figyelmeztető banner jelenik meg a lejárati dátummal, közvetlen navigációs linkkel a dolgozói profilra új vizsgálat rögzítéséhez.
  - A sablonválasztó gombok inaktívvá válnak (`disabled`), megakadályozva a hibás beosztás kísérletét.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/medical-compliance.test.ts` (5/5 sikeres teszteset).
  - TypeScript fordítás: 0 hiba (`npx tsc --noEmit`).
- **Kapcsolódó dokumentáció:** [ADR A-040](../architecture/decisions/A-040-hr-medical-compliance-and-roster-blocking-architecture.md), [PRD P-059](../product/decisions/P-059-hr-medical-compliance-and-roster-blocking-ux.md).

### 🦺 eaisyHR: Munkavédelmi és Tűzvédelmi Oktatások Központi Lejárati Mátrixa (HR-TASK-04)
- **Törvényi háttér és megvalósítás:**
  - Az 1993. évi XCIII. tv. (Mvt. 55. §) és az 1996. évi XXXI. tv. (Ttv. 22. §) alapján minden aktív munkavállaló köteles érvényes munkavédelmi és tűzvédelmi oktatással rendelkezni (évente kötelező ismétlő oktatással).
  - Létrejött az automatikus lejáratszámító motor (`safety-compliance-calculator.ts`), amely 4 állapotot különböztet meg:
    - 🟢 `Érvényes`: > 30 nap van hátra a lejárati határidőig.
    - 🟡 `Hamarosan lejár`: 30 napon belül lejár (teendő: éves ismétlő oktatás szervezése).
    - 🔴 `Lejárt`: Múltbeli lejárati dátum (bírságveszély!).
    - 🔴 `Hiányzik`: A munkavállalóhoz még nincs egyetlen rögzített oktatási jegyzőkönyv sem.
- **Adatbázis módosítás:**
  - Migráció: `supabase/migrations/20261010000002_add_safety_training_validity.sql`.
  - Hozzáadva `public.hr_munkavedelmi_oktatas.ervenyesseg_vege DATE` oszlop és index, automatikus 1 éves kitöltéssel.
  - A jegyzőkönyv generálás (`generateAndFileSafetyTrainingAction`) automatikusan beállítja a lejárati dátumot (`oktatasDatuma + 1 év`).
- **Központi Megfelelőség Hub Bővítés (`/hr/compliance`):**
  - Kétfüles `Tabs` navigáció: *Szabadságkiadás (Mt. 122. §)* és *Munkavédelem & Tűzvédelem (Mvt. / Ttv.)*.
  - 4 db új kanonikus `KpiCard`: Munkavédelmi érvényesség arány, Érvényes oktatások száma, 30 napon belül lejárók száma, Lejárt vagy hiányzó dolgozók száma.
  - Új táblázatkomponens: `SafetyTrainingTable` kanonikus `TableToolbar`-ral (azonnali keresés, oszlopválasztó, státusz-, típus- és részlegszűrő popover, CSV export).
  - In-place gyors elérés: a csatolt eaisyDocs jegyzőkönyvek azonnali megnyitása (`PdfViewerDialog`), illetve új/pótlólagos oktatás rögzítése 1 kattintással (`SafetyTrainingDialog`) a dolgozó adataival előtöltve.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/safety-compliance.test.ts` (6/6 sikeres unit teszt: érvényes, 30 napon belüli, ma lejáró, lejárt, hiányzó oktatás detektálás, és cégszintű statisztikai aggregáció).
  - `npx tsc --noEmit` hibátlan (0 error).
- **Kapcsolódó dokumentáció:** [ADR A-039](../architecture/decisions/A-039-hr-occupational-safety-compliance-matrix-architecture.md), [PRD P-058](../product/decisions/P-058-hr-occupational-safety-compliance-matrix-ux.md).

### 🏖️ eaisyHR: Szabadságkiadási Megfelelőség és Év Végi Riasztás (HR-TASK-03)
- **Törvényi háttér és megvalósítás:**
  1. **Mt. 122. § (3) – 14 nap összefüggő mentesülés:**
     - Determinisztikus kalkulátor (`leave-compliance-calculator.ts`), amely a tárgyév összes napját ellenőrzi: jóváhagyott fizetett szabadság (`hr_tavollet`), szombat/vasárnap pihenőnapok és hivatalos magyar munkaszüneti napok láncolatában.
     - **Műszakfelülbírálat:** Ha a vezető egy hétvégi napra aktív műszakot osztott be (`tervezett_ora > 0`), az szabályosan megszakítja a pihenőláncot.
     - **Törvényes eltérő megállapodás:** Az Mt. kifejezett felhatalmazása alapján ("eltérő megállapodás hiányában") a munkavállalóval kötött írásos megállapodás esetén a rendszer nem jelzi mulasztásként a 14 nap elmaradását, hanem jogszerűen mentesítettként kezeli.
  2. **Mt. 123. § – Év végi maradványszabadság riasztás (November / Q4):**
     - Kiszámítja a hátralévő szabadságnapok és a hátralévő munkanapok arányát az év végéig.
     - Sárga figyelmeztetés lép életbe Q4-ben (különösen november 1-től), és piros kritikus riasztás, ha a hátralévő szabadságok száma meghaladja az évből még hátralévő összes munkanapot.
- **Adatbázis módosítás:**
  - Migráció: `supabase/migrations/20261010000001_add_leave_compliance_fields.sql`.
  - Hozzáadva `public.hr_dolgozo_adatlap.eltero_megallapodas_14_nap BOOLEAN NOT NULL DEFAULT false`.
- **Központi Megfelelőségi Hub (`/hr/compliance`):**
  - Korábbi átirányítás helyett teljes értékű felügyeleti központ jött létre.
  - Multi-tenant cégszintű aggregáció (`getActiveCompanyIdServer()`).
  - 4 kanonikus `KpiCard`: Megfelelőségi ráta (%), 14 napos hiány, Év végi kockázat, Eltérő megállapodások.
  - Kanonikus `TableToolbar`: azonnali keresés, oszlopválasztó, szűrő popover (14 napos státusz, év végi kockázat, szervezeti egység), CSV export.
  - Gyors műveletek: Eltérő megállapodás jóváhagyási kapcsoló (`Checkbox`), adatlap gyorslink.
- **Dolgozói Profil Integráció (`src/app/hr/employee/[id]?tab=leaves`):**
  - A Szabadság fülön megjelent az Mt. Megfelelőségi kártya: pontos dátumintervallummal és leghosszabb összefüggő nappal.
  - HR/admin jogosultsággal közvetlen kapcsoló (`Switch`) az Eltérő megállapodás rögzítéséhez/visszavonásához toast értesítéssel.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/leave-compliance.test.ts` (8/8 sikeres unit teszt: 10 munkanap + hétvégék 16 napos pihenő, 5 munkanap 9 nap nem elég, hétvégi műszak megszakítás, betervezett státusz, eltérő megállapodás, novemberi riasztás, kritikus munkanaphiány, naptárgenerálás).
  - `npx tsc --noEmit` hibátlan (0 error).
- **Kapcsolódó dokumentáció:** [ADR A-038](../architecture/decisions/A-038-hr-leave-compliance-and-year-end-alert-engine.md), [PRD P-057](../product/decisions/P-057-hr-leave-compliance-and-year-end-alert-ux.md).

### 📅 eaisyHR: Előzetes Műszaktervező és Heti Rács (HR-TASK-01)
- **Felhasználói igény és megvalósítás:** A meglévő `/hr/time` (Munkaidő & Távollét) oldalon létrehoztunk egy 3 füles egyesített felületet (`TimeTabsView`):
  1. **Műszakbeosztás Tervező (Heti rács):** Interaktív táblázat dolgozónkénti és részlegenkénti bontásban, 1-kattintásos sablonhozzárendeléssel (`D`, `DU`, `É`, `N`), heti óraszám-összesítővel, valamint napi létszám- és műszaklefedettségi lábléccel.
  2. **Távollétek & Csapatnaptár:** A meglévő havi és éves szabadság/táppénz naptár (`TeamCalendar`) teljes megtartása.
  3. **Műszaksablonok:** Céges munkarendek és műszakok kezelése (kezdés, befejezés, munkaóra, szünet, színkód választó élő előnézettel).
- **Adatbázis és Multi-Tenancy:**
  - Migráció: `supabase/migrations/20261009000004_create_hr_shift_planning.sql`.
  - Új táblák: `public.hr_muszak_sablon` és `public.hr_muszak_beosztas`.
  - Szigorú multi-tenant elszigetelés (`company_id` és RESTRICTIVE RLS a `user_has_company_access(company_id)` szabállyal).
  - 4 alapsablon automatikus generálása minden céghez: `D` (06:00-14:00), `DU` (14:00-22:00), `É` (22:00-06:00), `N` (08:00-16:30).
- **Intelligens Másolás és Távollét Védelem:**
  - "Előző hét másolása" funkció (`copyPreviousWeekRosterAction` és `filterShiftsForCopy`), amely automatikusan kihagyja azokat a napokat, ahol a munkatársnak már jóváhagyott szabadsága vagy táppénze van a cél héten (`hr_tavollet` integráció).
- **Havi Jelenléti Ív és Műszak Összekötés (Timesheet Integration):**
  - Alapértelmezett munkanapokon (hétfőtől péntekig), ha nincs beosztva egyedi műszak, a jelenléti ív automatikusan az alapértelmezett 8 órával (FTE arányosan) számol.
  - Hétvégi napokon alapértelmezetten a tervezett munkaidő 0 óra (pihenőnap).
  - Ha a Műszaktervezőben hétvégi napra (pl. szombatra vagy vasárnapra) műszak kerül beosztásra (pl. `D: Délelőttös` 8h):
    - A jelenléti ív automatikusan érzékeli és `Terv: 8h`-val, valamint borostyánsárga `Hétvégi műszak (D)` jelvénnyel jelöli a napot.
    - A havi tervezett munkaórák és a túlóra egyenleg automatikusan hozzáadja ezt a 8 órát.
    - Ha a dolgozó becsekkol a hétvégén, a tényleges ledolgozott órák és a túlóramegállapítás automatikusan összevetődik a tervezett műszakórával.
    - A havi PDF generátor (`timesheet-pdf-generator.ts`) és a Dolgozói Önkiszolgáló (`employee-timesheet.tsx`) felület is azonnal megjeleníti a hétvégi műszakokat.
- **Megfelelőség és Ellenőrzések:**
  - Heti 48 órás Mt. korlát túllépés figyelmeztetés (`checkWeeklyHoursLimit` - `HR-TASK-02`).
  - Orvosi alkalmasság lejárati jelzés és figyelmeztetés mentéskor (`determineMedicalStatus` - `HR-TASK-05`).
- **Tesztek és Minőség:**
  - `src/utils/__tests__/shift-planner.test.ts` (5/5 sikeres unit teszt: heti óraszámítás, 48h Mt. korlát, orvosi lejárati státusz, távollét-védett hétmásolás, havi jelenléti ív és műszak összekötés).
  - `npx tsc --noEmit` hibátlan (0 error).
- **Kapcsolódó dokumentáció:** [ADR A-037](../architecture/decisions/A-037-hr-shift-planning-roster-architecture.md), [PRD P-056](../product/decisions/P-056-hr-shift-planning-and-roster-management-ux.md).

### ⚙️ Céges Iktatási és AI Szabálymotor (Multi-Tenancy 2-Tier Rules Engine)
- **Felhasználói igény és koncepció:** A Visibill kétfüles mintájára kialakított, az eaisyDocs iktatási adatlapjához igazított céges szabályrendszer. Megszüntettük a felesleges könyvelési kategóriákat (pl. kontírozási szám, pénzügyi megjegyzés), és két tiszta, valódi célú fülre bontottuk a rendszert:
  1. **Iktatási Szabályok (Determinisztikus fül):** Pontos szövegminta, partnernév vagy adószám alapján 100%-os biztonsággal, tokenfogyasztás nélkül automatikusan kitölti a Cél Szervezeti Egységet (Osztály), Irattári tételszámot (megőrzési idő), Dokumentumtípust és Tárgy előtagot.
  2. **AI Prompt Könyvtár (Természetes nyelvű fül):** Gemini 2.5 Flash-nek átadott magas prioritású direktívák (pl. felelősök, összetett irattípusok, határozatok kezelése).
- **Adatbázis és RLS:**
  - Létrejött a `public.company_filing_rules` tábla a determinisztikus szabályokhoz (`id`, `company_id`, `rule_name`, `search_pattern`, `partner_name`, `partner_tax_number`, `match_type`, `target_department_id`, `target_irattari_tetel_id`, `target_document_type`, `target_subject_prefix`, `scope`, `is_active`).
  - Létrejött a `public.company_prompt_rules` tábla az AI utasításokhoz (`id`, `company_id`, `rule_name`, `rule_prompt`, `category`, `is_active`).
  - Mindkét táblán Restrictive RLS házirend védi az adatokat a `public.user_has_company_access(company_id)` ellenőrzéssel és támogatja a globális (`scope = 'all'`) szabályokat.
- **Iktatási és AI Integráció (Kétlépcsős Feldolgozás):**
  - Az `executeAiMetadataExtraction` (`src/app/inbox/filing-actions.ts`) folyamatában:
    1. **1. szint:** A `matchFilingRules` (`src/utils/filing-rules-engine.ts`) azonnal lefut az irat szövegére és felismert partnerére. Ha talál egyezést, felülbírálja és kőbe vési a szervezeti egységet, irattári tételt, típust és tárgyat.
    2. **2. szint:** A Gemini 2.5 Flash a céges `company_prompt_rules` direktívák figyelembevételével kitölti az esetlegesen még üresen maradt mezőket (pl. hivatkozott szám, határidő, pontosabb megnevezés).
- **Kezelőfelület és Navigáció (`/rules`):**
  - **Kétfüles navigáció:** „Iktatási szabályok (Automatikus)” és „AI Prompt könyvtár (Természetes nyelvű)” fülek.
  - Linear Flat design, azonnali aktív/inaktív kapcsolók, törlés és szerkesztés modálok, beépített KKV sablonkártyák.
  - Navigációs sáv (`Sliders` ikon) és Cégbeállítások (`/settings`) gyorslink integráció.
  - Dinamikus cégváltás (`key={companyScope}`).
- **Tesztek és Minőség:**
  - `src/utils/__tests__/filing-rules-engine.test.ts` (4/4 sikeres unit teszt)
  - `src/utils/__tests__/company-prompt-rules.test.ts` (5/5 sikeres unit teszt)
- **Kapcsolódó dokumentáció:** [ADR A-036](../architecture/decisions/A-036-company-prompt-rules-accounting-engine.md), [PRD P-055](../product/decisions/P-055-company-prompt-rules-accounting-engine-ux.md).

---

## [2026-10-08]

### 🔄 Dinamikus Cégváltási Frissítés (Partnerek és Iktatókönyv Táblázatok)
- **Probléma:** Amikor a felhasználó a felső cégválasztóban céget váltott (pl. `Teszt Kft.` és `Think AI Kft.` között) a Partnerek (`/partners`) vagy az Iktatókönyv (`/dossiers`) oldalon, a felület nem frissült azonnal az új cég adataival, hanem kézi F5 böngészőfrissítésre volt szükség, bár F5 után az adatok helyesen jelentek meg.
- **Kiváltó ok:** A `PartnersTableClient` és a `DossiersTableClient` a szerverről kapott `initialPartners` és `initialDossiers` propokat a komponens inicializálásakor egyetlen egyszer mentette el belső `useState`-be (`useState(initialPartners)`, `useState(initialDossiers)`). Amikor a cégválasztó meghívta a `router.refresh()`-t, a Next.js szerveroldalon sikeresen újra lekérte az új cég adatait, de a kliens oldali táblázatkomponensek figyelmen kívül hagyták a friss propokat a belső merev állapot miatt, ráadásul nem rendelkeztek cégváltási kulccsal (`key`).
- **Megoldás és Módosítások:**
  - **`src/app/partners/partners-table-client.tsx`:** A felesleges `useState(initialPartners)` állapot megszűnt, a komponens közvetlenül az `initialPartners` propot használja fel a statisztikák és a szűrések számításához (`const partners = initialPartners`).
  - **`src/app/partners/page.tsx`:** A `<PartnersTableClient key={companyScope} ... />` megkapta a `companyScope` egyedi kulcsot, így cégváltáskor a kliens komponens és a szűrősáv automatikusan tiszta lappal, azonnal újrarenderelődik az új cég adataival.
  - **`src/app/dossiers/dossiers-table-client.tsx`:** Hasonlóan javítva: `const dossiers = initialDossiers`.
  - **`src/app/dossiers/page.tsx`:** Hozzáadva a `key={companyScope}` a `<DossiersTableClient key={companyScope} ... />`-hez.
  - **További érintett oldalak prevenciója:** `src/app/archive/page.tsx`, `src/app/inbox/page.tsx`, `src/app/tasks/page.tsx`, `src/app/page.tsx` mind megkapták a `key={companyScope}` cégizolációs kulcsot az azonnali, zökkenőmentes dinamikus átváltáshoz.

### 🗄️ Irattár és Selejtezés (`/archive`) Többcég Szűrés és Akció Izoláció
- **Probléma:** Az Irattár és Selejtezés felületen (`/archive`) a felhasználó a felső sávban kiválasztott másodlagos cég (pl. `Teszt Kft.`) esetén is az alapértelmezett cég (`Think AI Kft.`) irattári ügyiratait, selejtezési javaslatait és jóváhagyandó tételeit látta, mivel a szerverkomponens és a selejtezési akciók nem szűrték a lekérdezéseket az aktív cégre (`company_id`).
- **Megoldás és Módosítások:**
  - **`src/app/archive/page.tsx`:**
    - Beépítve a szerveroldali aktív cég azonosítása (`getActiveCompanyIdServer()`).
    - Az `ugyirat` lekérdezés explicit `.eq("company_id", companyScope)` szűrést kapott, így kizárólag a kiválasztott vállalkozás lezárt és megőrzés alatt álló dossziéi jelennek meg a KPI kártyákon és a táblázatokban.
    - A `selejtezes_csomag` lekérdezés szűrve lett az aktív vállalatra (`.eq("company_id", activeCompanyId)`).
  - **`src/app/archive/actions.ts` (`forceExpireAllDossiers`):**
    - A tesztelési célú lejárat-generálás ezentúl kizárólag az aktív cég ügyiratait állítja lejártra.
  - **`src/app/archive/disposal-actions.ts` (`proposeDisposal`, `approveDisposal`):**
    - Új selejtezési csomag (`selejtezes_csomag`) létrehozásakor és a selejtezési / levéltári eseménynapló bejegyzések beszúrásakor a `company_id` értéke kötelezően rögzítésre kerül az aktív cég azonosítójával.

### 📥 eaisyBill Számlaimport és Kötegelt Szkenner Többcég Cég-hozzárendelés Javítás
- **Probléma:** Amikor a felhasználó a fejlécben aktív cégként egy újonnan felvett vagy másodlagos céget választott (pl. `Teszt Kft.`), az eaisyBill bejövő számlák importálásakor a beérkeztetett irat (`irat`) nem a kiválasztott céghez, hanem a rendszer alapértelmezett cégéhez (`Think AI Kft.`) került, mert a beszúráskor nem adódott át a dinamikus `company_id`, így a PostgreSQL tábladefault lépett érvénybe.
- **Megoldás és Módosítások:**
  - **`eaisybill-actions.ts`:**
    - `getImportableEaisyBillInvoices`: Dinamikusan lekéri a munkamenethez tartozó aktív cég azonosítóját (`getActiveCompanyIdServer()`). Az eaisyBill számlák lekérésekor intelligensen párosítja az aktív cég adószámát vagy nevét az eaisyBill cégtárral (nem létező külső cég esetén stabil fallbackkel a felhasználó fiókjára).
    - A már importált számlák szűrése (`alreadyImported`) ezentúl vállalatonként (`company_id = activeCompanyId`) izoláltan vizsgálja a duplikációkat, így ugyanaz a partner számla több független céghez is beérkeztethető.
    - `importInvoiceFromEaisyBill`: A létrehozott `irat` rekordba, a partnert létrehozó/feloldó `findOrCreatePartner` hívásba és a duplikáció-ellenőrzésbe expliciten bekerült a `company_id: activeCompanyId`.
  - **`batch-scanner.ts` és `batch-actions.ts`:**
    - Az `IngestBatchMetadata` interfész és az `ingestSplitDocuments` függvény fel lett készítve a `companyId` mező fogadására és bejegyzésére az `irat` táblába.
    - Az `uploadAndSplitBatch` szerverakció automatikusan átadja az aktív cégazonosítót mind a feltöltött kötegelt iratok, mind az elválasztólapos automata felbontás során felismert partnerek részére.
  - **Adatkorrekció:** A korábban tévesen `Think AI Kft.` alá érkeztetett `Mistral AI SAS – MSTRL-API-930968-001` (E/2026/00103) számla és annak partnere sikeresen átmozgatásra került a `Teszt Kft.` céghez.

### 🎨 Céglogó Kezelés, Testreszabható Iktató Prefix és Tag Szerepkör Módosítás
- **Céglogó Feltöltése és Megjelenítése (`logo_url`):**
  - **Adatbázis séma:** `ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;` (Supabase migráció `20261008000004_company_logo_and_filing_prefix.sql`).
  - **Tárolás:** Supabase Storage `avatars` bucket alá mentve egyedi időbélyeges elérési úttal (`companies/${companyId}/logo_${Date.now()}.${ext}`).
  - **Jogosultság:** Kizárólag a cég tulajdonosa tölthet fel (PNG, JPG, WebP, SVG, max. 2 MB) vagy távolíthat el céglogót (`uploadCompanyLogoAction`, `removeCompanyLogoAction`).
  - **Megjelenítés:** A `CompanySelector` oldalsáv fejlécében és lenyíló listájában a generikus épületikon helyett automatikusan a vállalat arculati logója jelenik meg miniatűrként.
  - **Cégbeállítások:** A `CompanySettingsTab` dedikált arculati blokkot kapott előnézettel, feltöltő gombbal és logótörlési lehetőséggel.
- **Cég-specifikus Iktatókönyv Előtag (`filing_prefix`):**
  - **Adatbázis séma:** `ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS filing_prefix TEXT DEFAULT 'DOCS';`.
  - **Konfiguráció:** A cég adatai között a tulajdonos szabadon megadhatja a cég iktató előtagját (pl. `THINK`, `TESZT`, `HOLDING`, `DOCS`, max. 10 karakter, nagybetűsítve).
  - **Dinamikus iktatás:** A `fileIncomingDocument` szerverakció automatikusan lekéri az aktív cég `filing_prefix` értékét, és azzal hívja a gapless `generate_iktatoszam` és `generate_ugyszam` PostgreSQL funkciókat, így az iktatószámok vállalatonként teljesen szeparáltan és az egyedi előtaggal képződnek (`${prefix}/${ev}/${sorszam}`).
  - **Gyors szerkesztés:** A `CompanySelector` ceruza ikonjával elérhető gyors szerkesztő modálban is közvetlenül módosítható az előtag.
- **Tagok Szerepkörének Helyben Történő Módosítása (`EditMemberRoleDialog`):**
  - **Probléma:** Korábban ha egy cégtag szerepkörét (pl. munkavállalóból céges adminná vagy iktatóvá) szerették volna módosítani, törölni kellett a tagot és új meghívót kellett küldeni.
  - **Megoldás:** A `CompanySettingsTab` taglistájában a tulajdonos számára minden tag mellett megjelent egy ceruza (Szerkesztés) gomb.
  - **Modál és akció (`updateCompanyMemberRoleAction`):**
    - `EditMemberRoleDialog` komponens: kiválasztható a cég szintű szerepkör (`admin` / `member`), az eaisyDocs szerepkör (`ugyintezo`, `iktato`, `vezeto`, `betekinto`, `auditor`, `admin`, `rendszergazda`) és az eaisyHR szerepkör (`munkavallalo`, `hr_munkatars`, `hr_vezeto`, stb.).
    - Védelmi logika: A tulajdonos szerepköre nem módosítható; kizárólag a tulajdonos módosíthatja mások jogait; a mentés mind a `company_members` rekordot, mind a `felhasznalo_profil` táblát szinkronizálja.


### 🏢 Többcég-kezelés (Multi-Tenancy) és Adatelkülönítés (Visibill Minta Alapján)
- **Központi Többcég Architektúra és Cégkezelés:**
  - **Probléma:** Az eaisyDocs és eaisyHR rendszerek korábban single-tenant módon működtek, így könyvelőirodák, holdingok és cégcsoportok nem tudtak több önálló vállalkozást egyetlen fiókból biztonságosan kezelni.
  - **Megoldás:** A `visibill-ea0dbcac` bevált multi-tenancy architektúráját teljes körűen adaptáltuk az eaisyDocs és eaisyHR rendszerekbe.
- **Adatbázis Séma és Triggerek (`20261008000001_...`, `20261008000002_...`, `20261008000003_...`):**
  - **`companies` törzstábla:** Cégnév, adószám, székhely cím, képviselő neve, telefonszám, tulajdonos (`owner_id`), megosztási meghívókód (`share_token`).
  - **`company_members` kapcsolótábla:** Felhasználók és cégek összerendelése egyedi `(user_id, company_id)` párral és vállalatonkénti szerepkörökkel (`role`: owner/admin/member, `docs_szerepkor`, `hr_szerepkor`).
  - **`user_company_access_cache` gyorsítótár:** Denormalizált tábla az RLS rekurziók megelőzésére, automatikus triggeres szinkronizációval (`sync_company_member_cache`).
  - **`company_id` oszlop és indexek:** Hozzáadva mind a 37 eaisyDocs és eaisyHR üzleti táblához (`irat`, `ugyirat`, `ugy`, `partner`, `szervezeti_egyseg`, `feladat`, `irattari_terv`, `selejtezes_csomag`, `hr_dolgozo_adatlap`, `hr_jogviszony`, `hr_jelenlet`, stb.).
  - **100% Adatbiztonság és Null-vesztés:** Minden meglévő rekord és mind a 22 meglévő felhasználó automatikusan a `Think AI Kft.` alapértelmezett céghez lett rendelve.
  - **Visszaállíthatósági garancia:** Teljes JSON adatbázis snapshot (`backup_pre_multitenancy_latest.json`) és párhuzamosan megírt, tesztelt rollback scriptek.
- **PostgreSQL RESTRICTIVE RLS Házirendek:**
  - Bevezetve a `public.user_has_company_access(company_id)` STABLE biztonsági függvény.
  - Minden többcég-hatókörű táblán érvénybe lépett a `tenant_isolation_restrictive` házirend `AS RESTRICTIVE` kulcsszóval. Adatbázis motor szinten lehetetlen más cég adataihoz hozzáférni vagy abba beszúrni.
- **Oldalsáv Cégválasztó (`CompanySelector`):**
  - Linear flat dizájnú dropdown közvetlenül a modulválasztó alatt az `AppSidebar`-ban és `HrSidebar`-ban.
  - Élő gépelési szűrés a cégek között, ABC-rendezés, aktív cég zöld pipa jelölése.
  - `+ Új cég hozzáadása` modál magyar adószám formátum-ellenőrzéssel és automatikus tulajdonosi beállítással.
  - `Csatlakozás kóddal` modál tokenes meghívók beváltásához (`join_company_by_token` RPC).
- **Szerveroldali Cookie Perzisztencia és Reaktív Kliens Környezet:**
  - `eaisydocs_selected_company_id` cookie alapú aktív cég azonosítás (`getActiveCompanyIdServer()`).
  - `CompanyProvider` és `useCompany()` kontextus gondoskodik a kliensoldali azonnali állapotfrissülésről.
  - Minden fő oldal (`page.tsx`, `inbox`, `dossiers`, `partners`, `tasks`, `hr/admin`, `hr/time`) és szerverakció (érkeztetés, iktatás, partnermentés, feladatfelvétel, jelenlét rögzítés, dolgozói onboarding) automatikusan az aktív céghez kapcsolja az új és lekérdezett rekordokat.
- **E2E Teszteléssel és Böngésző Verifikációval Igazolva:**
  - `scripts/test-multitenancy-e2e.ts` automatizált teszt sikeresen igazolta a cégalapítást, a tagsági triggereket, az adatelkülönítést és a takarítást.
  - Böngészőben rögzítve a popover és az új cég dialógus vizuális megjelenése.

### 🛡️ Cégbeállítások Tulajdonosi Jogosultságkezelés és Tagvédelem (`CompanySettingsTab` & `company-actions.ts`)
- **Probléma:**
  - Sima munkavállalóként vagy tagként bejelentkezve korábban a Cég beállítások fülön elérhető és szerkeszthető volt a cég adatlapja (mentés gombbal), látható volt a vállalat teljes taglistája a törlés (kuka) ikonnal, és a megosztási meghívókód generálása is hozzáférhető volt. Így egy munkavállaló véletlenül módosíthatta a cég adatait vagy eltávolíthatta a saját fiókját a cégből.
- **Megoldás és Jogosultsági Szigorítás:**
  - **Tagok kártya elrejtése:** A *Tagok* kártya kizárólag a cég tulajdonosa (`isOwner === true`) számára renderelődik. Sima munkatársak számára a kártya teljesen rejtve van, a `getCompanyMembersAction` pedig szerveroldalon is blokkolja az illetéktelen lekérést.
  - **Cégadatok zárolása (Csak megtekintés):** Nem-tulajdonos esetén az űrlapmezők (cégnév, adószám, székhely, ország, képviselő, telefon) inaktívak (`disabled`), a mentés gomb helyén diszkrét infóbadge jelenik meg: *„Csak megtekintés • A cég adatait kizárólag a tulajdonos szerkesztheti.”*. A fejlécben külön szerepkörjelző badge (*Tulajdonos* / *Munkavállaló / Tag*) látható.
  - **Cég hozzáférési kód (Meghívó generálás) védelme:** A 6 karakteres, 10 perces csatlakozási kód generálása és másolása kizárólag a cég tulajdonosa számára érhető el.
  - **Kanonikus megerősítő törlő modál (`AlertDialog`):** A tagtörlés natív böngészős `confirm()` helyett a rendszer egységes `<AlertDialog>` komponensét használja a tag nevének, emailjének és cégének feltüntetésével, figyelmeztető leírással és töltésjelzővel. A tulajdonos nem távolítható el.
  - **Szerveroldali Védelmi Kapuk:** `updateCompanyAction`, `generateCompanyShareTokenAction`, `getCompanyMembersAction`, `removeCompanyMemberAction`, és `inviteCompanyMemberAction` mind szigorú szerveroldali tulajdonosi ellenőrzést kaptak.
  - **Globális Admin felületek védelme:** A `/settings` oldalon a *Csapat* és *Szervezeti Egységek* fülek, valamint a `deleteUser` akció kizárólag rendszeradminisztrátorok (`isAdmin`) számára érhető el.


---

## Korábbi Verziók (2026-10-07)

### 👑 Egységes Vezetői Jóváhagyási Központ (Unified Approvals Hub) és Jelenléti Korrekció Vizuális Visszajelzés
- **Egységes Jóváhagyási Panel a Vezetői Nézetben (`UnifiedApprovalsPanel`, `/hr/manager`):**
  - **Probléma:** Korábban a jóváhagyásra váró kérelmek darabokra voltak tördelve: a rendes szabadságok a képernyő tetején, míg az újonnan bevezetett munkaidő korrekciók és a túlóra jóváhagyások a hatalmas havi csapatnaptár alá voltak szórva különálló kis dobozokban. Ez szétverte a frontend oldalszerkezetét és a vezetői élményt.
  - **Megoldás:** Minden függő vezetői feladat (Szabadság & Távollét, Munkaidő korrekció, Túlóra felhasználás & Csúsztatás) egyetlen, központi **Linear-flat jóváhagyási hubba** került a csapatnaptár fölött.
  - **Kategória Szűrőfülek:** `Összes (N)`, `Távollét (N)`, `Munkaidő (N)`, `Túlóra (N)` azonnali szűrés számláló jelvényekkel.
  - **Egységes Kártyák & Akciógombok:** Minden kérelemnél egységes avatar, dolgozó neve, beküldési időpont, szemantikus típusjelvény, kért részletek (pl. *2026. 10. 07. • Hiányzó jelenlét ➔ Kért: 08:00 – 15:30*), indoklás és egységes `[ ✕ Elutasít ]` / `[ ✓ Jóváhagy ]` gombok azonnali frissítéssel.
  - **Elutasítási Indoklás Modál:** Opcionális elutasítási magyarázat megadása, amelyet a dolgozó automatikus in-app értesítésben is megkap.
  - **Központi Fejléc Statisztika:** A vezetői nézet fejlécében lévő „függő kérelem” számláló mindhárom kérelmi típus összegét (`totalPendingCount`) mutatja.
- **Jelenléti Ív Dolgozói és Profil Vizuális Jelzése (`AttendanceTab.tsx`):**
  - **Probléma:** A dolgozói profilon a *Jelenlét* fülön (`/hr/employee/[id]`) nem látszott, ha az adott munkanapra korrekciós kérelem volt folyamatban, így a 08:00 – 15:30-as kért idő hiába szerepelt az adatbázisban, az íven sima üres munkanapként jelent meg.
  - **Megoldás:**
    - A nap sorában sárga `Korrekció bírálat alatt` jelvény és alatta a kért idősáv kiemelése: `Kért idő: 08:00 – 15:30 („indoklás”)`.
    - A *Becsekkolás* és *Kicsekkolás* oszlopokban diszkrét, meleg tónusú jelzés mutatja a kért időpontot: `(08:00)` és `(15:30)` (vagy meglévő adat felülírásakor `09:00 → 08:00`).
    - A sor enyhe meleg háttérszínt (`bg-amber-500/[0.04]`) kap a könnyű észrevehetőség érdekében.

- **Dolgozói Főoldali Szabadságnap Számítás Pontosítása (`src/app/hr/page.tsx`):**
  - **Hiba oka:** A dolgozói kezdőlapon a felhasznált szabadságot korábban a jóváhagyott kérelmek darabszáma (`tavolletek.filter(...).length`) alapján jelenítette meg a rendszer a ténylegesen kivett munkanapok összege helyett. Így egy 10 munkanapos szabadság csak 1 napként jelent meg a kártyán és a progress barban.
  - **Javítás:** Bevezetve a `calculateWorkingDays` kalkulátor a magyar munkaszüneti napok (`hr_munkaszuneti_nap`) figyelembevételével és a `munkanapok_szama` összegzésével.
  - Hozzáadva a nullával való osztás elleni védelem (`totalLeave > 0 ? ... : 0`).
- **Globális Csapatnaptár Szűrőrendszer (`TeamCalendar`, `src/app/hr/time/page.tsx`):**
  - Bővítve a csapatszintű naptárfelületet teljes körű szűrési és keresési eszköztárral:
    - **Élő keresőmező:** Azonnali szűrés munkatárs neve és munkaköre szerint gyors törlés gombbal.
    - **Részleg / Szervezeti Egység Szűrő:** Dinamikusan betöltött szervezeti egységek (`hr_szervezeti_egyseg`) szerinti csoportosítás.
    - **Típus Választó:** Szabadság, Betegszabadság, Csúsztatás (Túlóra), Fizetetlen, Tanulmányi szűrés.
    - **"Csak távollévők" kapcsoló:** A teljes céges állományból egy kattintással csak az éppen távol lévő kollégák megjelenítése.
    - Aktív szűrők darabszám-jelvénye és "Szűrők törlése" reset gomb, üres állapotok kulturált kezelése.
- **Időrögzítés Megújítása, Ebédszünet és Munkaidő Korrekciós Jóváhagyási Rendszer:**
  - **Szigorú Vezetői Jóváhagyási Workflow:** A dolgozó közvetlenül nem írhatja felül a jelenléti ívet. Az utólagos módosítások (elfelejtett be-/kicsekkolás, eltérő időpont) **korrekciós kérelemként** kerülnek benyújtásra a közvetlen vezető felé.
  - **Új Adatbázis Tábla (`hr_jelenlet_korrekcio`):** Dedikált migráció (`20261007000002_hr_jelenlet_korrekcio.sql`) tárolja a kérelmeket (eredeti és kért időpontok, indoklás, `jovahagyasra_var`, `jovahagyva`, `elutasitva` státuszok, audit időbélyegek) RLS jogosultságokkal.
  - **Vezetői Bíráló Felület (`AttendanceCorrectionRequestsPanel`, `/hr/manager`):** A vezetők a Vezetői Nézetben látják a beosztottak korrekciós kérelmeit (dolgozó neve, dátum, eredeti ➔ kért idősáv, indoklás), amelyeket egyetlen kattintással jóváhagyhatnak vagy elutasíthatnak.
  - **Automatikus Érvényesítés Jóváhagyáskor (`handleAttendanceCorrectionApproval`):** Csak jóváhagyás után frissül a `hr_jelenlet` tábla, a rendszer automatikus in-app értesítést küld a dolgozónak és hitelesített bejegyzést rögzít a `hr_esemeny_naplo` audit táblában.
  - **Jelenléti Ív Állapotjelző (`EmployeeTimesheet`):** A havi jelenléti ív a bírálat alatt lévő napoknál sárga `Bírálat alatt` jelvénnyel tájékoztatja a munkavállalót a folyamatban lévő korrekcióról.
  - **Ebédszünet / Szünetkezelés:** A `TimeTrackingCard` egykattintásos ebédszünet indítást és lezárást kapott, amely szünetelteti a számlálót és levonja a szünetet a nettó munkaidőből.
  - **Munka Folytatása (Resumption):** Kicsekkolás után nem tiltja le a gombot, hanem engedélyezi a munka folytatását (`toggleCheckIn` újranyitással).
- **Kétcsatornás Csúsztatási Igénylés:**
  - **Távollét Űrlap (`LeaveRequestDialog`):** Új `Csúsztatás (Túlóra terhére)` opció, automatikus munkanapszámítással (8h/nap) és valós idejű egyenlegellenőrzéssel. Hiány esetén informatív hibaüzenet és beküldési tiltás.
  - **Túlóra Egyenleg Kártya (`OvertimeBalanceCard`):** Új interaktív csúsztatási modál naptárral, gyors gombokkal (`Egész nap (8h)`, `Fél nap (4h)`, `Egyedi óra`) és élő egyenlegkalkulációval (aktuális, levonandó, jóváhagyás utáni).
- **Túlóra Kifizetés Igénylése:**
  - Új pénzbeli kifizetés igénylő modál óraszám-megadással vagy `Teljes egyenleg kifizetése` gyorsgombbal, maximális egyenlegkorláttal és vezetői megjegyzéssel.
- **Jelenlét és Szabadság Oldali Integráció (`/hr/self-service/time`):**
  - A felső statisztikai sáv 4 kártyás Linear-flat rácsra bővült (`grid-cols-2 lg:grid-cols-4`), ahol a 4. kártya közvetlenül a *Túlóra Egyenleg* (`KpiCard`).
  - A kártyára kattintva azonnal megnyílik az `OvertimeActionDialog` csúsztatási és kifizetési modál, míg lent a `Saját kérelmeim` lista teljes szélességében, tisztán és zavartalanul jelenik meg.
  - **Felesleges duplikáció megszüntetése:** A fő Dolgozói Áttekintés (`/hr`) irányítópult aljáról eltávolításra került a redundáns `OvertimeBalanceCard`, mivel a túlóra kezelése fókuszáltan és tisztán a *Jelenlét & Szabadság* oldalon érhető el.
- **Adatbázis-szintű Kétirányú Szinkronizáció és Levonás:**
  - Bővítve a `hr_tavollet_tipus` enum a `'csusztatas'` értékkel, új `datum` és `tavollet_id` mezők a `hr_tulora_felhasznalás` táblán.
  - Kétirányú, nem-rekurzív PostgreSQL triggerek: `trg_tulora_felhasznalas_approval` automatikusan levonja a perceket jóváhagyáskor a `hr_tulora_egyenleg` táblából és szinkronizálja a kapcsolt `hr_tavollet` rekordot; `trg_tavollet_csusztatas_sync` garantálja, hogy ha a vezető a rendes távolléti listából hagyja jóvá a csúsztatást, a túlóra felhasználás is automatikusan jóváhagyódik és levonódik.
- **Vezetői Felület és Értesítések (`OvertimeRequestsPanel`, `attendance-actions.ts`):**
  - A beosztotti kérelmek megjelenítik a csúsztatás pontos dátumát és indoklását. A jóváhagyás a `handleOvertimeApproval` szerverakción keresztül történik azonnali dolgozói in-app értesítéssel.
- **Timesheet & Riport Kompatibilitás:**
  - A `calculateMonthlyTimesheet` kalkulátorban és a havi zárási PDF generátorban a csúsztatás fizetett távollétként jelenik meg, nem generálva munkaidő-hiányt.

### 🧹 Dolgozói Portál Tisztítása: Redundáns „Céges Szabályzatok” Kivezetése
- **Megszüntetve:** Eltávolítva a dolgozói irányítópult (`/hr`) fejlécéből a zavaró, pulzáló számlálóval ellátott „Céges Szabályzatok” gomb és a mögötte lévő felesleges adatbázis-lekérdezés (`hr_ceges_dokumentum`).
- **Indoklás:** Az Onboarding folyamat (P-034 – P-039) során a munkavállaló minden jogszabályilag előírt hivatalos dokumentumot (munkaszerződés, munkaköri leírás, Mt. 46. § tájékoztató, tűz- és munkavédelmi oktatási jegyzőkönyv, eszközfelelősségi jegyzőkönyv) kötelezően megkap, cégszerűen aláír és beiktatásra kerül az eaisyDocs személyi dossziéjába. A portálon lévő korábbi „Elfogadom” gombos, üres sablonos funkció redundáns és jogilag nem hiteles volt.
- **Átirányítás & Kódtisztítás:** A korábbi `/hr/self-service/dokumentumok` útvonal biztonságos szerveroldali átirányítást kapott a dolgozó valódi személyi profiljára (`/hr/self-service/profile`), a felesleges mock sablonkomponensek (`DocumentList`) és műveletek törölve lettek.

### 🐛 Hibajavítás: Windows Chromium PDF Generálás Elhárítása (`src/utils/pdf-browser.ts`)
- **Hiba:** Helyi Windows környezetben a Cafeteria nyilatkozat (és egyéb HR dokumentumok) in-browser megtekintésekor és generálásakor a böngésző azonnal összeomlott: `Failed to launch the browser process: Code: 2147483651` (STATUS_BREAKPOINT / 0x80000003).
- **Kiváltó ok:** A `CHROMIUM_ARGS` tömbben szereplő `--single-process` és `--no-zygote` kapcsolók a modern asztali Chrome és Edge architektúrában nem engedélyezettek és azonnali process crash-t idéztek elő.
- **Megoldás:**
  - Szétválasztva a helyi asztali (`LOCAL_CHROMIUM_ARGS`) és a Vercel/serverless (`SERVERLESS_CHROMIUM_ARGS`) Chromium argumentumokat.
  - Továbbfejlesztve a Windows Chrome és Edge útvonalkeresőt (`process.env.ProgramFiles`, `process.env['ProgramFiles(x86)']`, `process.env.LOCALAPPDATA`).
  - Helyi böngésző indítási hiba esetén intelligens automatikus fallback a beépített `puppeteer` csomagra.

### 📊 HR Riportok Modul Teljes Megújítása ([P-050](../product/decisions/P-050-hr-reports-t1041-ksh-payroll-overhaul.md), [A-031](../architecture/decisions/A-031-hr-reports-data-aggregation-and-export-architecture.md))
- **Teljes körű Funkcionális és Vizuális Refaktorálás (Global UI Consistency - P-043 / A-029):**
  - Megszüntetve a korábbi kezdetleges állapotot és a hibás, egyetlen oszlopba tömörülő, sérült ékezetes CSV fájlokat (pl. `BelĂ©pĂ©s`).
  - Új, 4 füles interaktív adatközpont: *NAV T1041*, *KSH Riport*, *Bérszámfejtés* és *Bevallás Archívum*.
- **Multi-Engine Export Pipeline (`src/utils/hr/reports-export.ts`):**
  - **Formázott SheetJS `.xlsx` Munkafüzetek:** Automatikus oszlopszélességek, formázott fejlécek és numerikus típuskezelés (munkaórák, munkanapok, Ft összegek).
  - **Magyar Excel Kompatibilis CSV Engine:** UTF-8 BOM (`\uFEFF`) és pontosvessző (`;`) határoló, garantálva a hibátlan megjelenést a hazai Microsoft Excel táblázatkezelőkben.
  - **ÁNYK / ONYA Vágólap Szinkronizáció:** Egykattintásos tabulátoros másolás a hatósági ÁNYK és ONYA nyomtatványkitöltőkhöz.
  - **Két Munkalapos KSH Riport:** Különálló *KSH_Fomutatok* és *Reszleg_Bontas* munkalapok egyetlen Excel munkafüzetben.
  - **19 Oszlopos Bérszámfejtési Csomag:** Részletes bérprogram-előkészítő állomány (jelenlétek, túlórák, szabadság, betegszabadság, táppénz, cafeteria és havi zárási státusz).
  - **Cafeteria Részletező Export:** Munkavállalónkénti juttatási kategória bontás (.xlsx).
- **Intelligens Server Action Adatgyűjtés (`src/app/hr/reports/actions.ts`):**
  - `getT1041ReportData`: meglévő bejelentések feldolgozása, automatikus gap-detektálás a havi belépő/kilépő munkavállalóknál (`Bejelentésre vár`), titkosított érzékeny adatok (TAJ, adójel) feloldása, aláírt URL generálás az A4 adatlaphoz és NAV nyugtához.
  - `getKshReportData`: szétválasztott Terv (törvényes havi norma munkaidő-alap: naptári munkanapok × 8 óra × FTE) és Tény (valós becsekkolások a `hr_jelenlet` táblából), teljesülési arány (%), fluktuáció és részlegenkénti norma/tény bontás.
  - `getPayrollReportData`: dolgozónkénti Terv munkanap és munkaóra vs. Tény jelenléti adatok, túlóra, távolléti jogcímek, cafeteria és vezetői jóváhagyási státuszok (`hr_havi_jelenlet_zaras`).
  - `uploadT1041ReceiptFromReport`: közvetlen NAV befogadási nyugta feltöltése a táblázat soraiból, Supabase tárolás, iratkezelői iktatás (`executeHrDocumentFiling`), és azonnali `Igazolva` státuszfrissítés audit naplózással.
- **Elavult Compliance Modul Kivezetése és Konszolidációja a Riportokba:**
  - Eltávolítva a redundáns és elavult `Compliance` menüpont az oldalsávból (`src/components/hr-sidebar.tsx`).
  - A `/hr/compliance` útvonal tiszta Next.js szerver átirányítást (`redirect("/hr/reports")`) kapott a könyvjelzők és külső linkek védelmére.
  - Törölve a korábbi kezdetleges segédkomponensek (`nav-t1041-generator.tsx`, `ksh-report-generator.tsx`).
- **Egyéni Dolgozói Riport és Hatósági Adatlap Készítés:**
  - **Bérszámfejtés:** Beépítve a munkavállaló szerinti szűrő a `TableToolbar`-ba, valamint minden sorban közvetlen **„Egyéni export (.xlsx)”** letöltés (`exportSingleEmployeePayrollToXlsx`), amely két munkalapon (dolgozói adatlap és bérprogram sor) bontja ki az adott személy havi adatait. Emellett beépítve a közvetlen munkavállalói jelenlét/dosszié hivatkozás is.
  - **NAV T1041:** Új, közvetlen **„+ Egyéni T1041 Készítése”** modál, ahol a vállalat bármely aktív dolgozójára azonnal generálható ÁNYK vágólapos szöveg, illetve hivatalos A4-es T1041 PDF adatlap előnézet, amely automatikusan beiktatásra kerül a személyi dossziéba.
- **Kanonikus UI / UX Elemek és Globális Elrendezés-Finomítás (`src/components/hr/reports-tabs.tsx`, `src/components/table-toolbar/table-toolbar.tsx`):**
  - **Felső Statisztikai Sáv:** Megszüntetve a korábbi különálló, helypazarló felső időszakválasztó kártyát; a Linear Flat `KpiCard` sáv mostantól – a szoftver többi oldalához hasonlóan – közvetlenül a `Riportok` cím és alcím alatt helyezkedik el mint elsődleges összefoglaló, és fülváltáskor dinamikusan frissül az aktív riport adataira.
  - **Beépített Időszakválasztó a `TableToolbar`-ban:** A központi [TableToolbar](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/table-toolbar/table-toolbar.tsx) kapott egy beépített `periodPicker` propot, így a havi naptárválasztó és az azonnali adatfrissítő gomb közvetlenül a zöld **Szűrés** gomb mellé épült be a hatósági riportok és a bérszámfejtés eszköztárába.
  - Linear Flat `KpiCard` sáv mind a 4 fülön díszítő ikonok és vastag bal oldali szegélyek nélkül.
  - Szabványos `TableToolbar` valós idejű gépelési kereséssel és tematikus szűrőcsoportokkal.
  - In-place dokumentum és hatósági nyugta betekintés (`DocumentPreviewFrame`) közvetlen felugró modálban; külső Supabase Storage Signed URL-eknél a cross-origin CORS és hitelesítő adatok (`credentials: "omit"`) optimalizálásával garantálva a hibátlan böngészős PDF betöltést.
  - Kereshető Bevallás Archívum új feltöltési felülettel és törlési megerősítő párbeszédablakkal.

---

## [Release v1.6.0] – (2026-10-05)

### 📜 AI Alapú Üzleti Szerződés- és Megállapodásgenerátor ([P-049](../product/decisions/P-049-ai-business-contract-and-agreement-generator-ux.md))
- **Természetes Nyelvű AI Szerződéskészítés (Gemini 2.5 Flash + Determinisztikus Tartalék):**
  - Bevezetve az általános B2B/B2C szerződésgenerátor motor (`src/utils/contract-templates.ts`, `src/app/partners/contract-actions.ts`), amely a partner törzsadatait (név, székhely, adószám, képviselő) és a felhasználó szabadszöveges instrukcióit (pl. díjazás, óradíj, határidők, kötbér, SLA) hatályos magyar polgári jogi (Ptk.) fejezetekre és számozott bekezdésekre bontott szerződéssé formálja.
  - Hálózati vagy API korlátok esetén az intelligens determinisztikus jogi mintamotor azonnal és zökkenőmentesen átveszi a munkát, így a felhasználó sosem akad el.
- **Kiterjedt Üzleti Sablonkatalógus:**
  - 5 előre definiált, egykattintásos mintapromptokkal és záradékokkal ellátott szerződéstípus:
    1. *Megbízási Szerződés* (fejlesztési, tanácsadói és alvállalkozói megbízásokhoz)
    2. *Titoktartási Megállapodás (NDA)* (kétoldalú és egyoldalú üzleti/műszaki védelem kötbérrel)
    3. *Szolgáltatási Keretszerződés* (egyedi lehívásos megrendelésekhez és SLA feltételekhez)
    4. *Teljesítésigazolási Jegyzőkönyv* (mérföldkövek átvételéhez és számlázás engedélyezéséhez)
    5. *Egyedi Üzleti Megállapodás* (szabadon konfigurálható együttműködési konstrukciókhoz)
- **Hivatalos Kétoldalú A4 PDF Generátor (`src/utils/contract-pdf-generator.ts`):**
  - Formális fejléc és lapszámozás, WinAnsi kódolásbiztos karakterkezelés (ő/ű -> ö/ü).
  - Számozott fejezetek és automatikus szövegtördelés több oldalra.
  - Kétoszlopos cégszerű aláírási blokk (Megbízó vs Megbízott/Partner képviselői aláírási vonalakkal).
- **Zökkenőmentes Iktatási & Expedíciós Híd:**
  - Választási lehetőség: új dedikált ügyirat nyitása vagy meglévő folyamatban lévő ügyirathoz csatolás.
  - Kimenő irat (`irany = 'kimeno'`) rögzítése a partnerhez polimorf `irat_kapcsolat`-tal, SHA-256 hash kalkulációval és append-only `esemeny_naplo` audit bejegyzéssel.
  - Opcionális azonnali expediálás: a partner e-mail címére közvetlen PDF csatolmánnyal kiküldhető az elkészült szerződés.
- **Modern Linear Flat UI Modál (`ContractGeneratorDialog`):**
  - Integrálva a Partner Részletes Lapján (`src/app/partners/[id]/page.tsx`) és a Partnertáblázat soraiban (`src/app/partners/partners-table-client.tsx`).
- **Pénzügyi Adatok és Promptek Szétválasztása (Single Source of Truth):**
  - Megszüntetve a díjösszegek és időtartamok duplikációját a felső strukturált beviteli mezők (`feeAmount`, `currency`, `validityMonths`) és a mintapromptok között.
  - A felső numerikus beviteli mező az elsődleges mérvadó pénzügyi adat (megbízási díj, igazolt összeg vagy kötbér), alapértelmezetten tiszta / üres indítással és dinamikus kétirányú promptszinkronnal.
- **Dinamikus Sablonváltás Prompt-frissítéssel:**
  - Sablonváltáskor a prompt azonnal és automatikusan átveszi az újonnan kiválasztott sablon mintapromptját, megszűnt a korábbi sablon promptjának beragadása.
- **Valós Idejű A4-es PDF Előnézet és Betekintő (`generateContractPdfPreviewAction`):**
  - A 2. lépés fejlécében diszkrét `[ 👁️ PDF Előnézet ]` gombbal egyetlen kattintással előhívható az aktuálisan szerkesztett szövegből a memóriában generált, valós A4-es PDF előnézeti modál (`DocumentPreviewFrame`), lapozással, nagyítással és közvetlen `[ ⬇ PDF Letöltése ]` opcióval.
- **Kanonikus `AlertDialog` Sablontörlési Megerősítés:**
  - A natív böngészős `window.confirm()` popup helyett a rendszerszintű, Linear-flat `AlertDialog` komponens gondoskodik az egyedi sablonok biztonságos és stílusos törléséről.
- **Base UI `nativeButton` Figyelmeztetés Megszüntetése:**
  - A sikeres iktatást követő eredménykártyán az ügyirat megnyitása gomb a kanonikus `<Link className={buttonVariants(...)}>` formátumra módosult, megszüntetve a Base UI natív gomb inkompatibilitási figyelmeztetését.
- **Storage Bucket Hiba Elhárítása (`irat_files`):**
  - Javítva a szerződés véglegesítésekor fellépő `Bucket not found` hiba: a nem létező `iratok` helyett a rendszerben kanonikus `irat_files` storage bucket és admin fallback került beállításra.
- **Jövőbeli Továbbfejlesztési Backlog Rögzítése:**
  - Lejárati feladat-emlékeztetők, kétnyelvű (HU-EN) generálás, digitális aláírási lánc (AVDH/e-Szignó) és Partner 360° aktív szerződés widget rögzítve a P-049 PRD-ben és a központi specifikációban (`EaisyDOCS_funkciok_es_backlog_v2.md`).

### ✉️ Kimenő Irat, Válaszlevél és Expediálási Architektúra UX ([P-048](../product/decisions/P-048-outgoing-document-and-dispatch-architecture-ux.md))
- **Teljes Mező-Duplikáció Felszámolása (Zero Redundancy):**
  - Megszüntetve a közvetlen levélírás korábbi hibáját, ahol egymás alatt duplán kellett megadni a tárgyat és az üzenetet („Kimenő levél tárgya” + „Válaszlevél szövege” és „E-mail tárgya” + „Kísérőszöveg a partnernek”).
  - Az új, letisztult modellben kizárólag **1 címzett e-mail cím, 1 tárgy és 1 válaszlevél szövege** szerepel.
  - A megadott szövegből a rendszer automatikusan formális fejlécű A4-es PDF dokumentumot generál az irattár és az iktatókönyv számára, és azonos tartalommal azonnal kiküldi e-mailben a partnernek a csatolt PDF-fel együtt.
- **Tökéletesen Kiegyensúlyozott, Szimmetrikus Grid Elrendezés (`h-[500px]`):**
  - Megszüntetve a bal oldali kártya korábbi 900+ pixeles monolitikus túlzsúfoltságát.
  - A bal oldali *„Válaszlevelek és Expediálás”* panel és a jobb oldali *„Belső Megjegyzések”* kártya immár szigorúan **azonos magasságú (`h-[500px]`)**, azonos fejléc vizuális súlyú és tökéletesen illeszkedik a Linear Flat dizájnrendszerbe.
- **Letisztult Modális Munkafolyamatok (Focused Action Dialogs):**
  - A 3 iratkészítési művelethez fókuszált modális dialógusok tartoznak:
    - `[ ✉️ Válaszlevél írása ]` (Kiemelt zöld gomb): közvetlen válasz megfogalmazása és azonnali expediálása.
    - `[ 📁 PDF feltöltése ]`: meglévő PDF dokumentum csatolása és kézbesítése (e-mailben, postai feladással vagy későbbi iktatással).
    - `[ 📝 Sablon használata ]`: hivatalos iratsablonok (hiánypótlás, számlabefogadási igazolás, tájékoztató levél) kiválasztása, szerkesztése és PDF generálása.
- **Kimenő Iratok Listája, Gyors Megtekintő és Utólagos Expediálás:**
  - A panel görgethető listájában megjelennek az ügyirathoz tartozó kimenő iratok (`outgoingDocs`) alszámmal és címzettel.
  - Szemantikus státuszjelvények: `Kiküldve e-mailben (dátum)`, `Postázva (dátum)` és `Expediálásra vár`.
  - Beépített `DocumentViewer` előnézet szem ikonnal a csatolt és generált PDF-ekhez.
  - Utólagos expediálás (`ExpediteDialog`) a korábban még ki nem küldött iratokhoz.
- **Válaszlevél és Feladat Sablon Katalógus & Teljes CRUD Kezelés (`ReplyTemplatePicker`, `TaskTemplatePicker`):**
  - Mindegyik sablonnál (beépített alapértelmezett és egyéni sablonoknál is) elérhetővé téve a 3 pontos műveleti menü (`Sablon módosítása`, `Sablon törlése`), így a szervezeti igényeknek megfelelően bármelyik sablon átírható vagy törölhető a `rendszer_beallitas` táblából.
  - Dedikált keresés név, tárgy és szöveg alapján, kategória szerinti szűrés és azonnali alkalmazás mind a közvetlen válaszlevélnél, mind a sablonos generálásnál.
  - **Interaktív Lebegő Előnézet (Hover Card):** Az egér sablonkártyára húzásakor (`HoverCard`) azonnal megjelenik egy elegáns lebegő panel a teljes levélszöveggel, pontos irattárggyal, karakterszámmal és közvetlen „Alkalmazás” gombbal.
- **Kiküldetlen Kimenő Iratok Törlése (`deleteOutgoingDocument`):**
  - Megvalósítva a még expedícióra váró kimenő irat vázlatok végleges törlése megerősítő modállal, a csatolt storage fájlok biztonságos felszabadításával és append-only audit naplózással (`esemeny_naplo`).
- **Válaszlevél, Sablon és PDF Melléklet feltöltésének Egységesítése (Unified Reply & Attachment Workflow):**
  - Megszüntetve a válaszlevél írása, a sablon használata és a PDF feltöltése közötti mesterséges szétválasztást.
  - A korábbi 3 különálló dialógus helyett **egyetlen egységes kimenő irat modál** jött létre, ahol a felhasználó:
    1. Kiválaszthatja a sablont a legördülőből (vagy az élő lebegő előnézetes Katalógusból), illetve írhat egyedi szöveget.
    2. Ugyanabban az ablakban a beépített drag-and-drop és kattintható PDF csatolómezőben **külső PDF mellékletet csatolhat** (pl. számla, szerződéstervezet, igazolás, nyilatkozat).
    3. Kiválaszthatja a kézbesítési módot (`email`, `posta`, `none`), és egyetlen gombnyomással (`Válaszlevél elküldése és iktatása`) kiküldheti mindkettőt.
  - A szerver akció (`generateAndExpediteReply`) automatikusan legenerálja a fejlécadatokkal ellátott A4-es hivatalos válaszlevél PDF-et, feltölti a csatolt külső PDF-et, összekapcsolja mindkettőt az irattal (`irat_fajl`), és e-mailben **mindkét PDF dokumentumot csatolmányként azonnal kiküldi a partnernek**.
  - A kimenő iratok listájában a többcsatolmányos iratoknál minden csatolt fájl külön gombbal (`Eye` és `Paperclip`) megjelenik és a `DocumentViewer`-ben megtekinthető.
  - A panel tetején az akciógombok 2 kiegyensúlyozott gombra egyszerűsödtek: `[ ✉️ Válaszlevél készítése és küldése ]` és `[ ✨ Sablonok katalógusa ]`.
- **Modális Elrendezés és Vízszintes Elcsúszás Javítása (Zero Horizontal Scroll):**
  - Megszüntetve a textarea `field-sizing-content` böngésző-szintű konténertágulása és a `DialogFooter` negatív margója miatti vízszintes scrollbar és gomb-levágódási hiba a válaszlevél és sablongeneráló modálokban.

### 📁 Ügyirat Életciklus, Szakmai Elintézés és Lezárási Architektúra UX ([P-047](../product/decisions/P-047-dossier-lifecycle-and-settlement-architecture-ux.md))
- **Kétfázisú Életciklus Szétválasztása (Elintézés vs Irattározás):**
  - **Szakmai Elintézés („Ügyirat elintézése” / `elintezett`):** Bevezetve az ügyintézők és vezetők számára a szakmai munka befejezésének formális aktusa, amely igazolja, hogy a számlaigazolás, feladatok és válaszlevelek mind teljesültek.
  - **Hivatalos Lezárás és Irattározás (`irattarban`):** A folyamat végleges, archív fázisa, amely a megőrzési idő számítását indítja el, kizárólag a jogosult vezetők és irattárosok számára.
  - **Visszahelyezés Ügyintézésbe:** Ha egy szakmailag elintézett ügyiratban mégis további érdemi teendő merülne fel, egyetlen kattintással visszaállítható `ugyintezes_alatt` státuszba.
- **Kritikus Logikai Hiba Javítása a Feladatok Lezárásánál:**
  - Megszüntetve a hibás formulát (`completedTasks + rejectedTasks === totalTasks`), amely elutasított feladat esetén is késznek minősítette az ügyiratot.
  - Az új, szigorú feltételrendszer: **Kizárólag akkor engedélyezett az elintézés, ha az összes feladat kész (`completedTasks === totalTasks`) és EGYETLEN elutasított feladat sincs (`rejectedTasks === 0`)**.
- **Kanonikus Fejléc Életciklus Kezelő (`DossierLifecycleActions`):**
  - Az ügyirat részletes lapján (`src/app/dossiers/[id]/page.tsx`) a korábbi magányos és ügyintézőknek tiltott gomb helyett intelligens, állapotfüggő műveleti sáv működik:
    - `ugyintezes_alatt`: „Ügyirat elintézése” modál állapot-diagnosztikával (elutasított vagy nyitott feladatok esetén részletes figyelmeztetés és blokkolás).
    - `elintezett`: Zöld jelvény, „Lezárás és Irattározás” (irattárosoknak/vezetőknek) és „Visszahelyezés ügyintézésbe” gombok.
    - `irattarban`: Véglegesített, biztonságos archív állapot.
- **Feladatok Tab Megtisztítása (`src/components/tasks-tab.tsx`):**
  - Kivezetve az oda nem illő, félrevezető gombot az ügyirati feladatok kártya fejlécéből.
  - Elutasított feladat esetén egyértelmű figyelmeztető banner tájékoztat a teendők rendezésének szükségességéről.
  - Ha minden feladat sikeresen lezárult, elegáns sikerbanner és közvetlen elintézési gomb segíti a munkafolyamatot.
- **Szerver Oldali Védelem (`src/app/dossiers/[id]/actions.ts`):**
  - Az `updateDossierStatus` és a `closeDossier` szerver actionök közvetlenül adatbázis szinten ellenőrzik a kapcsolódó feladatok státuszát, kizárva a felület megkerülésének lehetőségét.
  - Az eseménynaplóban (`esemeny_naplo`) rögzítésre kerül az `elintezve` eseménytípus, amely a timeline-on zöld pipával és pontos indoklással jelenik meg.

### 👥 eaisyHR Modul Teljes Rendszerszintű UI/UX & Design Tisztítás ([A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [P-043](../product/decisions/P-043-global-ui-consistency-and-unified-components.md))
- **Linear Flat Design & Szemantikus HSL Színrendszer 100%-os Kiterjesztése az Egész eaisyHR-re:**
  - **Zero Árnyék Garancia:** Kigyomlálva az összes dobozárnyék (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xs`, `shadow-2xs`) a kártyákról, modálokról, tabokról és gombokról (`src/app/hr/*`, `src/components/hr/*`).
  - **Szemantikus Színleképezés (0 Nyers Szín):** Eltávolítva az összes közvetlen színosztály (`emerald-*`, `amber-*`, `blue-*`, `purple-*`, `green-*`, `rose-*`, `indigo-*`, `teal-*`, `sky-*`, `orange-*`, `red-*`), kizárólag a platformszintű szemantikus tokeneket használva: `primary`, `success`, `warning`, `info`, `destructive`, `muted`.
  - **Hardcoded Hex Színek Eltávolítása:** Megszüntetve az összes `#02b8cc` és `#029db0` egyedi hex szín a gombokról és űrlapokról, átállítva a standard `Button` komponensekre és `primary` tokenekre.
- **Tipográfiai és Táblázat Egységesítés:**
  - **Címek és Modál Fejlécek:** Mindenhol `font-semibold` címkézés az elavult vagy túl vastag `font-bold` helyett.
  - **Numerikus Adatok:** Számok, összegek, dátumok és százalékos értékek egységesen `tabular-nums` formázást kaptak.
  - **Kompakt Táblázatok (`.compact-table`):** Minden HR táblázat (jelenlét, orvosi alkalmasság, KSH jelentés, értékelési ciklusok, munkakörök, dolgozók) megkapta a `.compact-table` osztályt és a kötelező `<div className="overflow-x-auto">` burkolót.
- **Kanonikus KPI Kártyák & Komponens Tisztítás:**
  - A szervezeti egység (`orgunit/[id]`), munkaügyi és munkaköri oldalak ad-hoc ikondobozos kártyái átállítva a kanonikus `<KpiCard>` komponensre (aszimmetrikus vastag keretek és dekoratív ikonok nélkül).
  - A toborzási jelöltkezelő lista (`talent-pool-list.tsx`) átállítva a kanonikus `TableToolbar` komponensre (`FilterGroup`, `activeFiltersCount`).
- **Kódminőség & Fordítási Stabilitás:**
  - A teljes projekt `npx tsc --noEmit` típusellenőrzése **0 hibával** fut le.
- **Linear Flat Design & Szemantikus HSL Színrendszer Teljes Rendszeresítése:**
  - Kivezetve az összes közvetlen Tailwind színosztály (`amber-500`, `emerald-500`, `blue-500`, `rose-500`, `purple-500`).
  - Helyettük kizárólag a platformszintű HSL tokenek érvényesülnek: `warning`, `success`, `info`, `destructive`, `primary`.
  - Eltávolítva a tiltott `shadow-sm` és `shadow-lg` árnyékok a kártyákról és a vezérlőelemekről (`src/components/dashboard-overview.tsx`, `src/app/settings/notification-settings.tsx`).
- **Kompakt Táblázat Magasság (`.compact-table` - 45px) Minden eaisyDocs Táblázaton:**
  - `src/components/inbox-table-client.tsx` (Bejövő iratok)
  - `src/app/dossiers/dossiers-table-client.tsx` (Iktatókönyv)
  - `src/app/tasks/task-list.tsx` (Saját feladataim lista nézet)
  - `src/app/partners/partners-table-client.tsx` (Partnerek törzsadat)
  - `src/components/archive-client.tsx` (Irattár & Selejtezés mind az 5 belső táblázata)
  - `src/components/iratok-lista.tsx` (Ügyirat részletes adatlap iratlistája)
  - `src/app/settings/notification-settings.tsx` (Kiküldési audit napló)
  - `src/components/irattari-terv-manager.tsx` (Nyers HTML `<table>` átalakítva szabványos shadcn `<Table className="compact-table">`-re).
  - Minden táblázat tárolója elláttatott a kötelező `overflow-x-auto` vízszintes görgetési védelemmel.
- **Központi Eszköztár (`TableToolbar`) és Gyors Betekintő (Quick View):**
  - **Iktatókönyv (`/dossiers`):** Beépítve a dedikált *Műveletek* oszlop a szabványos `Eye` gyors betekintő gombbal és egy felugró modállal (`Dialog`), amely azonnal mutatja az iktatószámot, tárgyat, felelőst, határidőt és irattári helyet anélkül, hogy el kellene hagyni a listát.
  - **Bejövő sor (`/inbox`):** Integrálva a csatolt fájlok in-place `DocumentViewer` előnézete, javított `irat_fajl` lekérdezéssel.
  - **Feladatok (`/tasks`):** Kiegészítve a hiányzó `TableToolbar`-ral (kereső, oszlopválasztó, határidő szűrő, állapotcsoportos szűrés).
  - **Partnerek (`/partners`):** Egyedi ad-hoc KPI sáv lecserélve a kanonikus `<KpiCard>` komponensre (dekoratív ikonok és vastag bal szegélyek nélkül).
  - **Irattár (`/archive`):** Bevezetve a 4 oszlopos kanonikus `KpiCard` összegző sáv (Irattárban lévő, Selejtezési javaslat, Jóváhagyandó, Selejtezett iratok).
- **Feladat Elutasítás Vizuális Újratervezése (Kamu Input Mezők & Aránytalan Dobozok Megszüntetése):**
  - **Kanban tábla (`src/app/tasks/kanban-board.tsx`):** Megszüntetve a túlméretezett piros dobozt és a szöveges beviteli mezőre hasonlító kamu keretet. A kártya megtartja az elegáns és kompakt Linear-flat méretét, az indoklás diszkrét, finom kurzív idézetként jelenik meg egy kis piros `Ban` ikonnal (`„teszt”`).
  - **Ügyirat Feladatok fül (`src/components/tasks-tab.tsx`):** Eltávolítva a kétszeresen beágyazott, input-szerű indoklás mezőt, a felesleges magyarázkodó segédszöveget és a tiltott `shadow-xs` árnyékokat. Helyette egy letisztult, egyrétegű, diszkrét `bg-destructive/5 border-destructive/20` indoklás doboz működik.
  - **Feladatlista nézet (`src/app/tasks/task-list.tsx`):** Kompakt és finom indoklás chip a táblázatsorban.
  - **Állapotok és Gombok:** Teljes HSL szemantikus átállás (`text-info`, `text-success`, `text-warning`, `text-destructive`).
- **Kódminőség & Fordítási Stabilitás:**
  - A teljes projekt `npx tsc --noEmit` típusellenőrzése 0 hibával fut le, böngészőben validálva.

---

## [Unreleased] – Fejlesztés alatt (2026-10-02)

### 👥 Egységesített Munkatársi Beléptetés & eaisyDocs Integrációs Modál ([P-045](../product/decisions/P-045-unified-employee-intake-and-docs-integration-ux.md), [A-005](../architecture/decisions/A-005-hr-modular-independence-architecture.md), [A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md))
- **Teljes Felületi Egységesség a HR Munkaasztalon és a HR Beállításokban:**
  - A HR Munkaasztalon (`src/app/hr/admin/page.tsx`) és a HR Beállításokban (`src/app/hr/settings/page.tsx`) azonos kanonikus `AddEmployeeDialog` (`src/components/hr/add-employee-dialog.tsx`) működik.
  - Mindkét felület a központi `availableDocsUsers` lekérdezést használja, amely szűri az eaisyDocs-hoz rendelt fiókokat és feloldja a szerepköröket.
- **Letisztult Vizuális Kommunikáció & Kétfülös Működés:**
  - **Meglévő eaisyDocs fiók fül:**
    - Finom teal/zöldes háttérszínű doboz (`border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10`) felesleges ikonok nélkül:
      > *"Ha a meglévő eaisyDocs fiókok közül választasz munkatársat, a felhasználó hozzáférést kap az eaisyHR modulhoz is."*
    - Dinamikus címke és kereshető legördülő lista eaisyDocs szerepkörökkel és *"Már HR dolgozó"* indikátorral.
  - **Új fiók (Csak eaisyHR) fül:**
    - Diszkrét tájékoztató sáv a moduláris szeparációról:
      > *"Ez a fiók kizárólag az eaisyHR rendszerhez kap hozzáférést, az eaisyDocs iratkezelőt nem éri el."*

### 🎨 Linear Flat Design Tisztítás & ESLint 0-Hiba Kódminőség
- **Tiltott Hover Árnyékok Teljes Kivezetése (Design Drift Fix):**
  - Eltávolítva az összes `hover:shadow-md`, `hover:shadow-xs` és `shadow-sm` lebegtetés:
    - `src/components/portal/document-list.tsx`
    - `src/components/hr/candidate-profile-sheet.tsx`
    - `src/components/hr/exit-interview-summary.tsx`
    - `src/app/karrier/page.tsx`
    - `src/app/hr/self-service/career/page.tsx`
  - Helyette a kanonikus Linear flat stílus (`border hover:border-primary/40 transition-colors`) érvényesül.
- **Tiltott Bal Oldali Vastag Szegély (`border-l-4`) Kivezetése:**
  - `src/components/hr/leave-history-list.tsx`: Letisztított, egységes `hover:bg-muted/40` sorstílus státusz-border nélkül.
- **Kanonikus KPI Kártya Komponens & Kezdő Képernyők Teljes Egységesítése (`src/components/kpi-card.tsx`):**
  - Elkészült a központi, kanonikus `KpiCard` komponens az ADR [A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md) és a design szabályzat alapján.
  - **eaisyDocs kezdőképernyő (`src/components/dashboard-overview.tsx`):** Megszüntetve az aszimmetrikus bal oldali vastag szegély (`borderLeftWidth: 3`), a színezett nagyméretű szám és az alsó "Megnyitás" link. Helyette a kanonikus Linear flat grid működik jobb oldali kerekített, színezett ikondobozzal (`w-10 h-10 rounded-lg`), uppercase felirattal és `text-2xl font-semibold tabular-nums` számokkal.
  - **eaisyHR kezdőképernyő (`src/app/hr/page.tsx` és `src/app/hr/admin/overview/page.tsx`):** A kézi kártyák átállítva a központi `KpiCard` komponensre, `font-bold` helyett `font-semibold tabular-nums` tipográfiával és egységes interaktivitással.
- **KPI Tipográfia és Tabular Nums Egységesítés:**
  - `src/components/hr/onboarding-list.tsx` és `src/components/hr/offboarding-list.tsx`: A KPI számoknál `font-bold` helyett a szabványos `font-semibold tabular-nums` formázás bevezetése.
- **Kritikus ESLint & React Hook Hibák Megszüntetése (25 hiba ➔ 0 hiba):**
  - `src/components/hr/batch-file-hr-documents-dialog.tsx`: React Rules of Hooks hiba javítva (a feltételes kilépés elé helyezve az `useEffect`).
  - `src/components/global-header-search.tsx`: `performDeepSearch` deklaráció előtti hívásának megszüntetése az `useEffect` átrendezésével.
  - `src/components/document-preview-frame.tsx`: Rekurzív önhívás ref-be csomagolása és render közbeni ref-módosítás megszüntetése.
  - `src/utils/pdf-extractor.ts`: `@ts-ignore` cseréje szigorúbb `@ts-expect-error`-ra.
  - `src/app/api/hr/download-document/route.ts` és PDF generátorok: `prefer-const` és nem használt változók automatikus rendezése.
  - **Eredmény:** Az ESLint hibák száma 0 (`npx eslint --quiet src/` hibátlanul lefut), a TypeScript fordítás (`npx tsc --noEmit`) 0 hibás.

### 🛡️ ThinkAI Biztonsági Audit & Alkalmazásszintű Keményítés ([A-030](../architecture/decisions/A-030-code-level-security-hardening.md), [P-044](../product/decisions/P-044-code-level-security-hardening.md))
- **Nyílt E-mail Relé Lezárása (`src/app/api/send-email/route.ts`):**
  - Autentikációs kapu (`supabase.auth.getUser()`) bevezetése.
  - Szigorú regex validáció a címzettre és feladóra, belső hibaüzenetek maszkolása.
- **HR Dokumentum Letöltési Jogosultság & IDOR Védelem (`src/app/api/hr/download-document/route.ts`):**
  - Jogosultságellenőrzés a `hr-documents` vödörből való letöltéseknél:
    - Belső munkaköri leírások megtekinthetők munkatársak számára.
    - Személyi és munkajogi iratok kizárólag a dokumentum tulajdonosa (dolgozó) vagy HR/Rendszergazda számára tölthetők le.
- **Időzített Cron Végpontok Keményítése (`src/app/api/cron/*`):**
  - Eltávolítva a beégetett teszt fallback kulcs (`teszt-cron-kulcs-123`) a `nightly` és `morning` végpontokról.
  - Szigorú `CRON_SECRET` kötelezettség a `src/app/api/cron/imap/route.ts` végponton.
- **PDF Konverziós Végpont Védelem (`src/app/api/pdf/convert/route.ts`):**
  - Autentikált munkamenet VAGY belső `x-internal-secret` (`CRON_SECRET`) fejléc megkövetelése.
  - Belső hívások (`inbox/actions.ts`, `batch-scanner.ts`) felkészítve a belső secret átadására.
- **AI CV Feldolgozás Védelem (`src/app/api/hr/parse-cv/route.ts`):**
  - Munkamenet-hitelesítés és `hr_admin` / `admin` szerepkör ellenőrzés a Gemini AI modell hívása előtt.
- **Karrier Portál Fájlfeltöltési Validáció & XSS Megelőzés (`src/app/karrier/[id]/*`):**
  - Kiterjesztés- és MIME típus fehérlista (`.pdf`, `.docx`, `.doc`), magic bytes ellenőrzés (`%PDF-`), 10 MB méretlimit.
  - Kivezetve a `dangerouslySetInnerHTML` a pozícióleírásoknál (`whitespace-pre-wrap` biztonságos szövegformázás).
- **IMAP Csatolmány Path Traversal Védelem (`src/utils/imap-service.ts`):**
  - Csatolmány fájlnevek tisztítása (`replace(/[^a-zA-Z0-9._-]/g, '_')` és `..` szekvenciák tiltása).
- **Middleware Védett Útvonalak Bővítése (`src/utils/supabase/middleware.ts` & `src/app/partners/page.tsx`):**
  - Bővítve a védett útvonalak köre: `/partners`, `/tasks`, `/settings`, `/security-policy`, `/documents`, `/hr`.
- **OAuth Callback Handler (`src/app/auth/callback/route.ts`):**
  - Megvalósítva a PKCE kódcsere (`exchangeCodeForSession`), nyílt átirányítás (Open Redirect) elleni védelemmel.
- **HTTP Biztonsági Fejlécek (`next.config.ts`):**
  - `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **Teljes Git Reverzibilitás:**
  - Valamennyi biztonsági javítás kizárólag a kód/alkalmazás rétegben valósult meg, távoli Supabase adatbázis mutáció nélkül.
- **Szabványos Jobb Oldali `TableToolbar` Integráció:**
  - Teljes vizuális és funkcionális összhang az eaisyDocs többi felületével (pl. Partnerek lista, Bejövő sor).
  - Bal oldalon: Valós idejű keresőmező (`Search` és gyors `X` törlő gombbal).
  - Jobb oldalon:
    - **Oszlopválasztó Popover (`Columns3` ikon):** Irány, Azonosító, Tárgy, Ügyirat, Dátum és Műveletek oszlopok dinamikus ki/bekapcsolása.
    - **Jobb oldali `Szűrés` Popover Gomb (aktív számláló badge-dzsel):**
      - Dátum tartomány szűrés (`Dátum tól` / `Dátum ig`).
      - Irat iránya szűrőcsoport (`Bejövő iratok`, `Kimenő iratok`).
      - Iktatási állapot szűrőcsoport (`Iktatott iratok`, `Iktatlan iratok`).
      - Biztonsági minősítés szűrőcsoport (`Nyílt`, `Belső`, `Bizalmas`, `Szigorúan bizalmas`).
      - "Szűrők törlése" gomb.
- **Gyors Megtekintés (Quick View):**
  - **Irat / Fájl Gyors Megtekintés:** Minden irat sorában dedikált Megtekintés (`Eye`) gomb:
    - Csatolt fájl esetén azonnal megnyitja a beépített `DocumentViewer`-t (biztonságos jogosultságellenőrzéssel és auditnaplózással).
    - Fájl nélküli irat esetén megnyit egy részletes Irat Adatlap gyorsbetekintő dialógust közvetlen iktatói navigációval.
  - **Ügyirat Gyors Betekintő:** Az iktatott iratoknál az "Ügyirat" oszlopban megjelenő diszkrét "Betekintés" gombra kattintva felugró modál mutatja az ügyirat iktatószámát, státuszát (`StatusBadge`), tárgyát, ügyszámát, iktatási dátumát, határidejét és irattári helyét, egykattintásos ugrással az iktatókönyvi nézetre (`/dossiers/[id]`).

### 🐛 Partner Adatlap Iratforgalom Hibajavítás (`src/app/partners/[id]/page.tsx`)
- **Hiba oka:** A partner részletes adatlapon az iratok lekérdezésében közvetlenül szerepelt az `irat.iktatoszam` oszlop (`.select("... iktatoszam ...")`). Mivel a relációs sémában az `iktatoszam` kizárólag az `ugyirat` táblán létezik (az `irat` táblán `erkeztetoszam`, `alszam` és `ugyirat_id` van), a PostgREST/Postgres `42703: column irat.iktatoszam does not exist` hibát dobott, emiatt a lekérdezés `null`-lal tért vissza.
- **Tünet:** A partner adatlapon 0 db iratforgalmat és üres listát mutatott a rendszer, miközben a partnerek listázásánál látszott a forgalom.
- **Megoldás és Továbbfejlesztés:**
  - A lekérdezés relációs összekapcsolással (`ugyirat:ugyirat_id (id, iktatoszam, ugy:ugy_id (targy))`) és az `alszam` bevonásával kéri le az iktatási adatokat.
  - A felületen a dokumentum azonosítója iktatott irat esetén automatikusan feloldja a teljes iktatószámot (`iktatoszam/alszam`), iktatlan irat esetén az `erkeztetoszam`-ot jeleníti meg.
  - Az "Ügyirat" oszlopban megjelenik az ügyirat valós iktatószáma (vagy "Iktatlan" badge), amely közvetlen hivatkozásként szolgál a dossier nézetre.
  - A "Csatolt Ügyek" fülön a kapcsolt iratok esetén is feloldásra került az `iktatoszam` és a közvetlen `/inbox/[id]` link.

### ⚖️ Konfigurálható Négyszem-elv (B10) & Rendszerbeállítások Tábla
- **Új `rendszer_beallitas` Adatbázis Tábla & Migráció (`supabase/migrations/20261002000001_configurable_four_eyes.sql`):**
  - Generikus kulcs-érték tábla JSONB struktúrával (`kulcs TEXT PK`, `ertek JSONB NOT NULL`, `leiras TEXT`).
  - Beültetett kulcs: `'negy_szem_elve_selejtezesnel'` (`{"kotelezo": true}` alapértelmezett értékkel).
  - PostgreSQL segédfüggvény: `is_negy_szem_elve_kotelezo()` SECURITY DEFINER jogosultsággal.
  - Frissített `selejtezes_csomag` UPDATE RLS szabály: `NOT public.is_negy_szem_elve_kotelezo() OR auth.uid() != javaslattevo_user_id`.
- **Rendszerbeállítás Segédmodul (`src/utils/system-settings.ts`):**
  - `getSystemSetting<T>()` és `isFourEyesDisposalRequired()` típusbiztos szerveroldali segédfüggvények.
- **Rendszergazda Beállítások Kezelőfelület (`settings-client.tsx`, `admin-actions.ts`):**
  - Új dedikált kártya a Rendszergazda fülön: **Selejtezési Szabályzat & Négyszem-elv (B10)**.
  - Váltókapcsoló (Switch) Sonner toast visszajelzéssel:
    - *Bekapcsolva (alapértelmezett / szigorú audit mód):* A felterjesztő munkatárs semmilyen szerepkörben nem hagyhatja jóvá a saját javaslatát.
    - *Kikapcsolva (egyfelhasználós / KKV / tesztelési mód):* A vezető vagy adminisztrátor saját felterjesztését is jóváhagyhatja egyetlen lépésben.
- **Irattár Kliensoldali Dinamikus Viselkedés (`archive-client.tsx`, `src/app/archive/page.tsx`):**
  - Ha a négyszem-elv fel van oldva (KKV mód), a rendszer **nem tiltja le a jelölőnégyzetet**, hanem smaragdzöld kísérő badge-dzsel jelzi: `Saját felterjesztés (Jóváhagyható)`.
  - A fejléc banner és a megerősítő modál dinamikusan adaptálódik a beállításhoz.
- **Audit Naplózás & Hivatalos Jegyzőkönyv Integritás (`disposal-actions.ts`, `disposal-protocol-pdf.ts`):**
  - Egyfelhasználós jóváhagyáskor az `esemeny_naplo`-ba bekerül a záradék: `(Egyfelhasználós jóváhagyás - a négyszem-elv feloldva a rendszerbeállítások alapján)`.
  - A PDF Selejtezési Jegyzőkönyv jogi nyilatkozata és aláírási sávja tanúsítja az egyfelhasználós eljárásrendet.
- **Kapcsolódó döntések:** ADR [A-028](../../architecture/decisions/A-028-configurable-four-eyes-disposal.md), PRD [P-042](../../product/decisions/P-042-configurable-four-eyes-disposal-ux.md), BRD [BRD-008](../../business/decisions/008-configurable-four-eyes-disposal-and-sme-mode.md).

### 🚪 Megújított Offboarding (Kiléptetés) Folyamat, Mt. Jogi Dokumentumgenerálás & Prémium HR Analytics UX
- **Globális KPI Stat Kártya Harmonizáció (Linear Flat Design) (`job-postings-list.tsx`, `hr/page.tsx`, `admin/page.tsx`, `admin/overview/page.tsx`, `employee-timesheet.tsx`):**
  - A korábbi elavult `border-l-4` vastag színes szegélyes kártyastílus teljes kivezetése a design rendszer elveinek megfelelően.
  - Egységesített, prémium Linear flat Onboarding / Offboarding kártyamodell bevezetése minden felületen:
    - Bal oldal: kisméretű uppercase felirat (`text-xs font-medium text-muted-foreground uppercase tracking-wider`) és nagy, tabular-nums érték (`text-2xl font-bold tracking-tight mt-1`).
    - Jobb oldal: kerekített finom ikon-konténer (`w-10 h-10 rounded-lg bg-... flex items-center justify-center shrink-0`).
    - Figyelmeztetések és teendők esetén finom átlátszó háttérszínezés (`bg-amber-500/5 border-amber-500/20`).
  - Átalakított nézetek: **Toborzás (Álláshirdetések)**, **Főoldal (Dolgozói önkiszolgáló)**, **HR Munkaasztal**, **Admin Áttekintés** és **Munkaidő-nyilvántartás (Timesheet)**.
- **Automatikus Supabase Auth Fiókletiltás & Jogosultságmegvonás (`actions.ts`):**
  - A kiléptetési folyamat lezárásakor (`closeOffboarding`) a rendszer a Supabase Admin API-n keresztül azonnal és automatikusan letiltja a távozó munkatárs Auth felhasználói fiókját (`ban_duration: '876000h'`), megelőzve az illetéktelen belépést vagy adatletöltést.
  - Azonnali szerepkör-megvonás az adatbázisban: `felhasznalo_profil.hr_szerepkor = 'inaktiv'`, valamint `hr_dolgozo_adatlap.munkaviszony_vege` rögzítése a jogszabályi kilépési dátummal.
  - Kiléptetés téves lezárása esetén az újranyitáskor (`reopenOffboarding`) a rendszer automatikusan feloldja a fióktiltást (`ban_duration: 'none'`), visszaállítja a `munkavallalo` szerepkört és törli a jogviszony vége záradékot.
- **Szervezet és Munkatársak Intelligens Állapotszűrés (`settings-employee-table.tsx`, `settings/page.tsx`):**
  - Munkajogi és nyugdíjtörvényi előírás (Mt. 80. §, 1997. évi LXXXI. tv.) miatt a volt dolgozók fizikai törlése (SQL DELETE) szigorúan tilos az 50 éves megőrzési idő alatt.
  - A Beállítások felületen új 3-állású szűrősáv: `Aktív munkatársak (X)` (alapértelmezett, letisztult nézet), `Kilépett / Archivált (Y)` és `Összes (Z)`.
  - A kártya fejléce kizárólag a valós aktív létszámot mutatja (`Munkatársak (X aktív fő)`).
  - Az archivált munkatársak sorában áthúzott név, lakat ikonnal ellátott `Kilépett (Fiók letiltva)` badge és a kilépés dátuma jelenik meg, az aktív munkatársak névsorát nem zavarva.
- **HR Vezetői Műszerfal Létszámszinkron (`admin/page.tsx`):**
  - Az aktív dolgozói létszám és bérköltség statisztikák kalkulációja automatikusan kiszűri a már kilépett vagy inaktivált munkavállalókat.
- **Teljes Modál Átalakítás (`OffboardingProfileModal.tsx`, `OffboardingCard.tsx`):**
  - Beágyazott, egymásra nyíló popoverek nélküli 5 paneles navigáció: `Teendők (Checklist)`, `Megszüntetés`, `Eszközök`, `T1041 Kijelentés`, `Kilépési Interjú`.
  - Szervezeti egység / felelős szerinti szűrőchipek: `HR`, `IT`, `Bérszámfejtés`, `Üzemeltetés`, `Vezető`.
  - Kontextuális funkciógombok a checklist feladatok mellett (`[ Megszüntetés előkészítése ]`, `[ Eszköz visszavétel & Jkv ]`, `[ NAV T1041 kijelentés ]`, `[ Kilépési interjú ]`), amelyek közvetlenül a megfelelő szakaszra navigálnak.
  - Fejléc avatarral, munkakörrel, részleggel (`Building2`), kilépési jogcímmel, élő előrehaladási sávval és biztonsági megerősítéses archiváló lezárással.
- **Munkaviszony Megszüntetési Megállapodás Generátor & eaisyDocs Iktatás (`termination-pdf-generator.ts`, `termination-panel.tsx`, `actions.ts`):**
  - Mt. 64–85. § szerinti jogszabályi megfelelőség valamennyi kilépési jogcímre: Közös megegyezés, Munkáltatói felmondás (30 napos Mt. 287. § keresetlevél jogorvoslati tájékoztatással), Munkavállalói felmondás, Azonnali hatályú felmondás próbaidő alatt, Rendkívüli felmondás.
  - Pénzügyi paraméterezés: felmentési idő munkanapokban, megváltandó szabadság napok száma, végkielégítés összege forintban, utolsó munkában töltött nap.
  - Puppeteerrel generált, céges pecséttel ellátott hivatalos A4 PDF.
  - Automatikus iktatás az eaisyDocs Személyi Dossziéba az `1.2 - Munkaviszony megszüntetés` tétel alá (**50 év megőrzési idővel**).
  - Automatikusan készre pipálja a megszüntetési checklist feladatot.
- **Eszköz Visszavételi és Vagyoni Leszámoló Lap & Leltári Mentesség (`asset-return-pdf-generator.ts`, `asset-return-panel.tsx`):**
  - Mt. 179. § és Mt. 80. § szerinti munkaügyi vagyoni elszámolás: tételes eszközlista a dolgozónak kiadott munkahelyi eszközökből (`hr_munkahelyi_eszkoz`) állapotminősítéssel (*Ép / Hibátlan*, *Rendeltetésszerűen kopott*, *Sérült / Hibás*, *Hiányzik*).
  - Sérülés vagy hiány esetén kártérítési összeg meghatározása és levonási záradék (Mt. 161. §).
  - Teljes vagyoni és eszközbeli tartozásmentességi záradék: végérvényesen megszünteti a munkavállaló leltári felelősségét.
  - Automatikus iktatás az eaisyDocs Személyi Dossziéba az `1.4 - Eszköz átadás-átvételi jegyzőkönyvek` tétel alá (**5 év megőrzési idővel**).
  - Automatikusan teljesítettnek jelöli az eszközök és belépőkártyák leadása feladatokat.
- **NAV T1041 Kijelentés & Nyugta Csatolás (`t1041-panel.tsx`, `t1041-actions.ts`):**
  - T1041 kijelentési mód támogatása (`initialType = "T"`) az offboarding folyamatban.
  - ÁNYK / ONYA egykattintásos másoló chipek, hatósági PDF adatlap és NAV befogadási nyugta feltöltési híd, amely teljesíti a hatósági kijelentési teendőt.
- **Új Prémium Kilépési HR Analytics & Fluktuációs Műszerfal (`exit-interview-summary.tsx`):**
  - A korábbi egyszerű lista helyett egy átfogó HCM műszerfal készült.
  - 4 Felső KPI Kártya: Összes lefolytatott interjú, Átlagos össz-elégedettség (1-5 csillag), eNPS ajánlási arány, Top távozási főok.
  - 4 Dimenziós Értékelési sávok: Vezetés és Menedzsment, Munkakörülmények, Előrelépési lehetőségek, Kompenzáció és juttatások.
  - Távozási mozgatórugók és új célállomások (karrier elágazások) százalékos megoszlása.
  - Kereshető és szűrhető szöveges idézetkártyák és részletes interjú-megtekintő modál.
- **Gazdagabb Kilépő Dolgozó Hozzáadási Dialógus (`AddOffboardingDialog.tsx`):**
  - Munkavállaló kiválasztása, távozás jogcíme, utolsó munkanap és jogviszony vége dátumok, valamint munkakör és részleg automatikus átemelése.
- **Adatbázis Migráció (`supabase/migrations/20261001000014_hr_offboarding_enhancements.sql`):**
  - `hr_offboarding` mezők: `megszunes_modja`, `indoklas`, `utolso_munkaban_toltott_nap`, `felmentesi_ido_nap`, `megvaltott_szabadsag_nap`, `vegkielegites_osszeg`, `reszleg`, `munkakor`, `szerzodes_pdf_url`, `eszkoz_elszamolas_pdf_url`, `t1041_nyugta_url`.
  - `hr_munkahelyi_eszkoz` és `hr_t1041_bejelentes` kapcsolata `offboarding_id`-val.
- **Törvényes Kilépő Igazolás & Átadás-Átvételi Nyugta Generátor (`exit-certificate-pdf-generator.ts`, `exit-certificate-panel.tsx`, `actions.ts`):**
  - Mt. 80. § (2) bek., Flt. 36/A. §, és az adózási-TB jogszabályok szerinti törvényes munkáltatói kilépő igazolás és átadás-átvételi nyugta generálása Puppeteerrel.
  - Tartalmazza a munkaviszony időtartamát, munkakört, FEOR-08 kódot, megszűnés jogcímét, adó- és TB azonosítókat, igénybe vett betegszabadság napokat (Mt. 126. §), kifizetett végkielégítést és a munkabérből történő letiltások/levonások jogszabályi nyilatkozatát.
  - Választható átadási mód (személyes átvétel munkavállalói aláírással vs. postai tértivevényes feladás ragszámmal és feladási dátummal).
  - Közvetlen in-browser PDF előnézet (`PdfViewerDialog`) és letöltés.
  - A generálás befejeztével a rendszer automatikusan készre jelöli a *"Törvényes kilépő igazolások kiadása (Mt. 80. §)"* feladatot, és a folyamat lezárásakor beiktatja a dokumentumot az eaisyDocs személyi dossziéba (`1.2 Munkaviszony`, 50 év megőrzés).
- **Döntési háttér:** [PRD P-040](../product/decisions/P-040-hr-offboarding-analytics-and-filing-revamp.md), [PRD P-041](../product/decisions/P-041-statutory-exit-certificate-and-handover-ux.md).

## [Unreleased] – Fejlesztés alatt (2026-10-01)

### 📑 Pre-Onboarding Munkaköri Leírás, NAV T1041 Hatósági Bejelentés & Mt. 46. § Tájékoztató UX
- **Hivatalos NAV T1041 Bejelentési Adatlap & ÁNYK / ONYA Segédlet (`t1041-pdf-generator.ts`, `t1041-actions.ts`, `t1041-panel.tsx`):**
  - Art. 22. § és Tbj. 40. § szerinti hivatalos A4 PDF bejelentő adatlap generálása Puppeteerrel (Új bejelentés `U`, Változás `V`, Törlés `T`).
  - ÁNYK 13-as pótlap és ONYA másoló segédlet: egykattintásos vágólapra másolási chipek (Adószám, Adóazonosító, TAJ, Jogviszony kód `1101`, Kezdete, FEOR kód `4121`, Heti óraszám).
  - Visszaigazoló NAV nyugta / igazolás PDF feltöltése közvetlenül az onboarding felületen, amely azonnal elvégzettnek jelöli a hatósági bejelentési feladatot.
  - Fiókaktiváláskor automatikus iktatás az eaisyDocs Személyi Dossziéba (`1.3 - Hatósági bejelentések`, 50 év megőrzési idő).
- **Hivatalos Munkaköri Leírás a Pre-Onboarding Szakaszban (`job-description-pdf-generator.ts`, `onboarding-job-actions.ts`, `job-description-panel.tsx`):**
  - Munkavállalói profil előtti (pre-onboarding) munkaköri leírás kezelés 3 rugalmas opcióval:
    1. *Központi Katalógus Verzió kiválasztása* a jóváhagyott munkaköri leírás sablonokból.
    2. *Dinamikus A4 PDF generálás* Mt. 45. § (4) szerinti kötelező feladatokkal, felelősségekkel, kompetenciákkal, FEOR számmal és iktatási pecséttel.
    3. *Aláírt / Egyedi PDF feltöltése*.
  - Fiókaktiváláskor automatikus iktatás az eaisyDocs Személyi Dossziéba (`1.1 - Munkaköri leírások`, 50 év megőrzési idő) és átkötés a létrejövő munkatársi profilra.
- **Mt. 46. § Munkáltatói Írásbeli Tájékoztató Generátor (`mt46-notice-generator.ts`, `employment-contract-panel.tsx`):**
  - Törvényi előírásoknak megfelelő kétoldalas A4 PDF írásbeli tájékoztató generálása az Mt. 46. § (1) bekezdés mind a 9 kötelező pontjával (munkaidő-beosztás, pihenőnapok, pótlékok, bérfizetés napja, felmondási idők, kollektív szerződés hiánya, NAV bejelentés helye).
  - Egykattintásos generálás és letöltés közvetlenül a munkaszerződés panelből.
- **Onboarding Felület Megújítása & Tiszta Fül Navigáció (`OnboardingProfileModal.tsx`):**
  - Töröltük a zavaró vízszintes oldalsávot/gombhúzót: helyette tiszta, áttekinthető beágyazott füles rendszer készült (`Teendők`, `Munkaszerződés`, `Munkaköri leírás`, `NAV T1041`, `Munkahelyi eszközök`, `Munkavédelmi oktatás`).
  - Fejlécben közvetlen navigációs gombok és állapotjelvények (Munkaszerződés, Munkaköri leírás, T1041), a teendőlistában pedig kontextuális ugrógombok találhatók a megfelelő fülre.
- **Adatbázis Migrációk:**
  - `supabase/migrations/20261001000012_hr_t1041_bejelentes.sql`: `hr_t1041_bejelentes` tábla, RLS házirendek és storage bucket házirendek.
  - `supabase/migrations/20261001000013_hr_onboarding_munkakor.sql`: `onboarding_id` oszlop a `hr_munkakori_leiras_dokumentum` és `hr_munkakor_leiras_verzio` táblákban, valamint RLS jogosultságok.
- **Döntési háttér:** [ADR A-027](../architecture/decisions/A-027-pre-onboarding-filing-and-t1041-bridge.md), [PRD P-039](../product/decisions/P-039-onboarding-t1041-job-description-and-mt46-ux.md).

### 🏢 Dinamikus Szervezeti Egység és Munkakör Katalógus Választó UX
- **eaisyHR Nyilvántartott Munkakörök és Szervezeti Egységek Integrációja (`job-org-actions.ts`, `job-org-selector.tsx`):**
  - Központi szerver action (`getJobsAndOrgUnitsAction`) a jóváhagyott `hr_szervezeti_egyseg` és `hr_munkakor` katalógustételek lekérdezésére.
  - Új univerzális, kétirányúan szinkronizált komponens (`JobOrgSelector`):
    - **Egység szerinti szűrés (Unit First):** Szervezeti egység (pl. `IT`, `HR`, `FCM`) kiválasztásakor a munkakör legördülő lista dinamikusan szűkül a részleghez kapcsolt munkakörökre.
    - **Munkakör alapú automatikus kitöltés (Job First / ATS):** Munkakör (pl. `Flottakezelő`) kiválasztásakor a rendszer azonnal és automatikusan beállítja a kapcsolódó szervezeti egységet (`FCM`).
    - **Fallback egyéni mód:** Megmaradt a szabad szöveges bevitel lehetősége ad-hoc munkakörök és egységek rögzítésére.
- **Toborzási (ATS) Pipeline Átadás (`recruitment/actions.ts`):**
  - Amikor egy jelölt felvételt nyer (`elfogadva` státusz), a munkakörhöz tartozó szervezeti egység (`hr_munkakor -> hr_szervezeti_egyseg.nev`) automatikusan lekeresésre kerül és elmentődik az újonnan induló `hr_onboarding` rekord `reszleg` mezőjébe.
- **Onboarding és Szerződéskötési Felületek Frissítése:**
  - `AddOnboardingDialog`: Közvetlen manuális felvételnél kötelezően a katalógusból választandó ki az egység és a munkakör.
  - `EmploymentContractPanel`: A munkaszerződés előkészítésekor a részleg és a munkakör dinamikusan választható és szinkronizálódik a szerződés és az onboarding rekordok között.
  - `OnboardingCard`, `OnboardingList`, `OnboardingProfileModal`: A munkatárs szervezeti egysége (`Building2` ikonnal) közvetlenül megjelenik a munkakör mellett (pl. `Flottakezelő • FCM`).
- **Adatbázis Migráció (`20261001000011_hr_munkaszerzodes_reszleg.sql`):**
  - `reszleg TEXT` oszlop hozzáadása a `hr_munkaszerzodes` táblához.
  - Létező Onboarding adatok retroaktív korrigálása (`Nagy Dániel` - `Flottakezelő` -> `FCM`).
- **Döntési háttér:** [PRD P-038](../product/decisions/P-038-onboarding-dynamic-job-and-org-unit-catalog-selector-ux.md).

### 📜 Onboarding Munkaszerződés Előkészítés, Generálás (Mt. 42–45. §) & Személyi Dosszié Iktatás UX
- **Hivatalos Mt. 42–45. § Munkaszerződés Generátor (`employment-contract-pdf-generator.ts`, `employment-contract-actions.ts`):**
  - Törvényi előírásoknak megfelelő, kétoldalú A4 PDF munkaszerződés előállítása Puppeteerrel.
  - Tartalmazza a kötelező tartalmi elemeket: munkakör, kezdőnap, szerződés jellege (határozatlan / határozott lejárattal), munkaidő (teljes 8 óra / részmunkaidő napi órákkal), bruttó havi alapbér (számmal és betűvel kiírva), próbaidő (max 3 hónap), munkavégzés helye és távmunka megállapodás.
  - Munkavállaló személyi és azonosító adatai: születési hely és idő, anyja neve, lakcím, adóazonosító jel, TAJ szám, bankszámlaszám.
  - Fejlécben vállalati adatok és eaisyDocs iktatási pecsét (`1.2 - Munkaviszony létesítése iratok`, kötelező 50 éves megőrzési idő az 1997. évi LXXXI. tv. alapján).
- **Kétlépcsős Pre-onboarding és Fiókaktiválási Életciklus:**
  - Amíg a belépő munkavállaló még nem rendelkezik éles felhasználói fiókkal, a szerződés PDF tervezetként előkészíthető és letárolható a folyamatban (letölthető, kinyomtatható a belépéskori fizikai aláíráshoz).
  - A kapcsolódó onboarding feladat (*„Munkaszerződés előkészítése & aláírása”*) a tervezet előállításakor **automatikusan készre (done) pipálódik**.
  - Amint a HR aktiválja a fiókot az Onboarding modálban, a rendszer a szerződésben szereplő adatokat (belépés dátuma, lakcím, születési adatok, anyja neve) szinkronizálja a dolgozói adatlapra, és a munkaszerződést **automatikusan beiktatja az újonnan megnyíló eaisyDocs Személyi Dossziéba** (`1.2` irattári tétel, 50 év megőrzés).
- **Beágyazott Fül az Onboarding Modálban (`OnboardingProfileModal.tsx`, `EmploymentContractPanel.tsx`):**
  - **Megszüntetett „popup a popupban”:** Negyedik egyenrangú fülként (`Munkaszerződés (Mt. 42. §)`) került integrálásra az Onboarding modálba.
  - Az onboarding teendőlistában a szerződéskötési feladat mellett elhelyezett **`[Szerződés előkészítése]`** gomb közvetlenül a beágyazott fülre vált át, visszagombbal a teendőkhöz.
  - Egységes akciókártya az eszközökhöz és munkavédelemhez hasonlóan: *Megtekintés*, *Letöltés*, *Aláírt példány feltöltése* (`UploadSignedDocumentDialog`), valamint aktív profil esetén *Iktatás*.
- **Adatbázis Migráció (`20261001000010_hr_munkaszerzodes.sql`):**
  - Dedikált tábla a munkaszerződés rekordok nyilvántartására, RLS szabályok HR és Admin hozzáféréssel.
- **Döntési háttér:** [PRD P-037](../product/decisions/P-037-onboarding-employment-contract-generator-and-filing-ux.md).

### 🦺 Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv (Mvt. 55. §, Ttv. 22. §) & Onboarding Iktatás UX
- **Hivatalos Oktatási Jegyzőkönyv Generátor (`safety-training-pdf-generator.ts`, `safety-training-actions.ts`):**
  - Puppeteer PDF generálás a munkavédelemről szóló 1993. évi XCIII. tv. (Mvt.) 55. § és a tűzvédelemről szóló 1996. évi XXXI. tv. (Ttv.) 22. § alapján.
  - Fejlécben vállalati adatok és eaisyDocs iktatási pecsét (`3.4 - Munkavédelmi iratok`, 10 év megőrzési idő).
  - 7 pontos szabványosított oktatási tematika (munkahelyi kockázatok, ergonómia 50/1999. EüM, baleset-elhárítás, tűzriadó és menekülés, kézi tűzoltó készülékek használata, villamos biztonság).
  - Munkavállalói kifejezett elismerő és felelősségvállalási nyilatkozat, oktatói és dolgozói aláírási blokk.
- **Kétlépcsős Pre-onboarding és Fiókaktiválási Életciklus:**
  - Amíg a belépő munkatárs fiókja nincs aktiválva, a jegyzőkönyv „Generálás (PDF)” gombbal előkészíthető és letárolható az onboarding folyamatban (letölthető, kinyomtatható a munkába állás napján történő aláíráshoz).
  - A kapcsolódó onboarding feladat (`Munkavédelmi és tűzvédelmi oktatás`) a jegyzőkönyv elkészültekor **automatikusan készre (done) pipálódik**.
  - Amint a HR aktiválja a fiókot, a rendszer az előkészített jegyzőkönyvet automatikusan beiktatja az újonnan megnyíló eaisyDocs Személyi Dossziéba.
- **Közvetlen UI Integráció és Beágyazott Fül Architektúra (`SafetyTrainingPanel.tsx`, `SafetyTrainingDialog.tsx`, `OnboardingProfileModal.tsx`, `MedicalTab.tsx`):**
  - **Megszüntetett modál a modálban ("popup a popupban"):** Az eszközátadási fülhöz hasonlóan a munkavédelmi oktatás közvetlen beágyazott fülként (`munkavedelem`) él az Onboarding profil modálban, tiszta füles navigációval (`Onboarding Teendők`, `Munkahelyi Eszközök`, `Munkavédelmi Oktatás`).
  - Az Onboarding profil modál fejlécében a `Munkavédelmi Jkv` gomb és a teendőlistában lévő `Oktatási jkv.` gomb közvetlenül a beágyazott fülre vált át, vissza gombbal a teendőkhöz.
  - A Munkavállalói adatlapon a *Megfelelőség & Egészségügy* (`MedicalTab`) fülön a `SafetyTrainingDialog` önálló párbeszédablakként nyitható meg, amely a közös `SafetyTrainingPanel` komponenst használja.
- **Adatbázis Migráció (`20261001000009_hr_munkavedelmi_oktatas.sql`):**
  - Dedikált tábla a munkavédelmi oktatások nyilvántartására, RLS szabályok Munkavédelmi felelős (`munkavedelmi`), HR és Admin hozzáféréssel.
- **Döntési háttér:** [PRD P-036](../product/decisions/P-036-occupational-safety-and-fire-training-protocol-ux.md).

### 💻 Munkahelyi Eszközök és Átadás-Átvételi Jegyzőkönyv (Mt. 179. §) & Beépített Onboarding Fül UX
- **Integrált Modál Fül Nézet (`OnboardingProfileModal.tsx`, `AssetHandoverPanel.tsx`):**
  - A korábbi zavaró, egymásba ágyazódó felugró ablakok ("popup a popupban") helyett az Onboarding profil modálban natív füles navigáció készült: `Onboarding Teendők` és `Munkahelyi Eszközök & Jkv (Mt. 179. §)`.
  - Tételes eszközkezelés (IT laptop/PC, telekommunikáció mobil/SIM, irodai kulcs/belépőkártya, gépkocsi, egyéb munkaeszköz) gyári számmal/IMEI-vel, tartozékokkal és fizikai állapottal.
  - Gyors sablon gombok: `+ Laptop`, `+ Telefon`, `+ Belépőkártya` azonnali 1-kattintásos felvitelhez.
- **Hivatalos Átadás-Átvételi Jegyzőkönyv és Iktatás (`asset-actions.ts`, `asset-handover-pdf-generator.ts`):**
  - Puppeteer PDF generálás az Mt. 179. § szerinti vétkességre tekintet nélküli leltár- és megőrzési felelősségvállalási záradékkal, felek adataival és visszaszolgáltatási kötelezettséggel.
  - **Pre-onboarding és Fiókaktiválási Iktatási Életciklus:** Amíg a belépő munkavállaló még nem rendelkezik éles fiókkal (`dolgozo_id` nincs aktiválva), a rendszer „Jegyzőkönyv generálása (PDF)” műveletként előkészíti és letárolja az iratot az onboarding folyamaton belül (letölthető, kinyomtatható a belépéskori fizikai aláíráshoz).
  - **Automatikus és Utólagos Iktatás:** Amint a HR rákattint a „Fiók aktiválása” gombra, a létrehozott dolgozói profilhoz és az újonnan megnyíló eaisyDocs Személyi Dossziéba az előkészített jegyzőkönyv automatikusan beiktatásra kerül (vagy az Eszközök fülön közvetlenül beiktatható). Ha a fiók eleve aktív, a generálás egy lépésben azonnal be is iktat.
  - Az onboarding folyamatban lévő eszközátadási feladat **automatikus készre pipálása** a jegyzőkönyv kiállításakor.
- **Döntési háttér:** [PRD P-035](../product/decisions/P-035-onboarding-manual-intake-and-asset-handover-ux.md).

### 🚀 Megújított Onboarding Folyamat, Kétlépcsős Fiókaktiválás és Közvetlen Beléptetés UX
- **Kétlépcsős Fiókaktiválás és Duplikációvédelem (`onboarding-list.tsx`, `onboarding-card.tsx`, `onboarding-profile-modal.tsx`):**
  - A toborzási kanbanból való átmozgatás szétválasztásra került: az azonnali auth fiók és e-mail helyett előkészületi onboarding rekord jön létre, megelőzve a duplikációkat.
  - A tényleges eaisyHR fiókaktiválást és üdvözlő e-mail kiküldést a HR indítja el az Onboarding profil modálból, amikor a belépés esedékessé válik.
  - Kétfülös navigáció: *Folyamatban lévő beléptetések* és *Lezárt beléptetések* különválasztása, beléptetés lezárása és újranyitása opciókkal.
  - Felső statisztikai KPI kártyák (aktív belépők, aktiválásra várók, hamarosan kezdők, átlagos haladás).
- **Közvetlen Manuális Beléptetés Sablonokkal (`add-onboarding-dialog.tsx`, `actions.ts`):**
  - `[+ Új beléptetés indítása]` gomb a fejlécben, amely toborzási hirdetés nélkül teszi lehetővé új munkatárs indítását (pl. belső kinevezések, vezetők, ajánlások).
  - Szerepkör-specifikus feladatsablonok: Általános irodai munkatárs, IT & Szoftverfejlesztő, Vezetői / C-Level, Fizikai / Operatív munkatárs.
- **Döntési háttér:** [PRD P-034](../product/decisions/P-034-onboarding-lifecycle-redesign-and-activation-ux.md).

### ✍️ Hivatalos HR Dokumentumok Aláírt Példányának Csatolása és Verziókezelése UX
- **Központi Aláírt Példány Kezelés a Hivatalos Dokumentumok Idővonalon (`page.tsx`, `UploadSignedDocumentDialog.tsx`):**
  - A *Munkaviszony & Szerződések* fül központi irat-idővonalán minden munkavállalói dokumentum közvetlen gombot kapott a beszkennelt, aláírt példány rögzítésére (`[Aláírt példány feltöltése]` ill. `[Aláírt példány cseréje]`).
  - Átlátható állapotjelzés: `Tervezet` (szürke) vs. `✓ Aláírt példány` (zöldesszürke / teal kiemelt jelvény), feltöltési dátumbélyegzővel.
  - Tágas, modern modális ablak drag & drop PDF/kép feltöltővel és fájlméret-ellenőrzéssel.
- **Automatikus eaisyDocs Verziókövetés és Archiválás (`uploadSignedDocumentAction`):**
  - Ha az irat már be volt iktatva, az aláírt példány új verzióként (`verzio: 2`, `[ALÁÍRT]` előtaggal és SHA-256 hash-sel) csatolódik a meglévő iktatószám alá az `irat_fajl` táblába.
  - Automatikus eseménynaplózás az eaisyDocs `esemeny_naplo` és `hr_esemeny_naplo` táblákban.
  - A megtekintés (`PdfViewerDialog`) és a közvetlen letöltés prioritásként azonnal a feltöltött aláírt változatot nyitja meg.
  - Szinkronizáció a kapcsolódó domain rekordokkal (`hr_tanulmanyi_szerzodes`, `hr_fegyelmi`, `hr_kituntetes`, `hr_orvosi_vizsgalat`).
- **Adatbázis Migráció (`20261001000006_hr_dokumentum_signed_copy.sql`):**
  - `hr_dokumentum` tábla bővítése: `alairt_fajl_url`, `alairva_ekor`, `alairas_statusz`, `alairo_neve` oszlopokkal és indexszel.
- **Döntési háttér:** [PRD P-033](../product/decisions/P-033-signed-document-copy-upload-and-versioning-ux.md).

### 🏆 Munkavállalói Kitüntetések, Szakmai Elismerések és Elismerő Oklevél UX
- **Önálló Elismerési Modul a Szakmai Háttér Fülön (`AwardsTab.tsx`):**
  - A korábbi gyakorlattal szakítva a kitüntetések és szakmai elismerések teljesen elválasztásra kerültek a fegyelmi ügyektől, és kiemelt, pozitív helyre kerültek a dolgozó *Szakmai Háttér* szekciójában.
  - 7 dedikált elismerési kategória (Vállalati Kiválósági Díj, Szakmai és Technológiai Innováció, Kiemelkedő Projekt Teljesítmény, Törzsgárda és Jubileum, Kiemelkedő Csapatmunka, Vezérigazgatói Dicséret, Egyéb Szakmai Elismerés).
  - Tágas modal (`sm:max-w-[700px]`) díj megnevezéssel, adományozó testülettel, opcionális pénzjutalom összeggel (Ft) és részletes hivatalos méltatással.
  - Opcionális: Már átadott / papíron aláírt díszoklevél szkennelt példányának feltöltése.
- **Reprezentatív Elismerő Oklevél PDF Generátor (`award-certificate-pdf-generator.ts`):**
  - Fekvő A4 formátumú, díszes arany és teal keretes oklevél a 'Cinzel' és 'Montserrat' betűcsaládokkal.
  - Fejlécben vállalati arculat és eaisyDocs iktatási pecsét (`Iktatószám: ...`, `Irattári tétel: 3.1 • eaisyDocs Személyi Dosszié`).
  - Központi méltatás, díjazott neve és munkaköre, adományozó aláírási és pecsétmezője.
- **In-Browser Megtekintés, Letöltés és eaisyDocs Iktatás (`/api/hr/award-pdf`, `fileKituntetesAction`):**
  - 👁️ **Megtekintés:** `PdfViewerDialog` segítségével közvetlen felugró megtekintő a böngészőben.
  - 📥 **Letöltés:** Közvetlen PDF letöltés.
  - 📁 **Iktatás:** Egykattintásos hivatalos iktatás a dolgozó eaisyDocs személyi dossziéjába (`3.1 - HR iratok`, 50 év megőrzési idő).
  - 🗑️ **Törlésvédelem:** Az iktatott elismerések törlése védett a levéltári szabályok szerint.
- **Adatbázis Migráció (`20261001000005_hr_kituntetes_modul.sql`):**
  - Új `public.hr_kituntetes` tábla RLS szabályokkal és idegen kulcsokkal (`hr_dolgozo_adatlap`, `hr_dokumentum`, `ugyirat`, `irat`).
- **Döntési háttér:** [PRD P-032](../product/decisions/P-032-awards-and-honors-lifecycle-ux.md).

### ⚖️ Munkáltatói Fegyelmi és Károkozási Határozatok (Mt. 56. §, 179. §) és eaisyDocs Iktatás UX
- **Letisztított Fegyelmi és Károkozási Modul (`DisciplinaryTab.tsx`):**
  - A *Bizalmas HR adatok* fülön kizárólag a jogi szankciók és kártérítési kötelezések maradtak meg, szigorúan HR-vezetőkre és auditorokra korlátozott jogosultsággal.
  - Kategóriák: Írásbeli Figyelmeztetés (Mt. 56. §), Írásbeli Megrovás (Mt. 56. §), Kártérítési Kötelezés (Mt. 179. §), Egyéb munkáltatói intézkedés.
  - Károkozás esetén a megfizetendő kárösszeg és munkabérből történő részletfizetési ütemezés rögzítése.
- **Törvényes Munkáltatói Határozat PDF Generátor (`disciplinary-pdf-generator.ts`):**
  - Alaki és tartalmi megfelelőség az Mt. szabályai szerint: I. Rendelkező rész, II. Tényállás és indoklás, III. Kötelező 30 napos bírósági jogorvoslati kioktatás (Mt. 285. § (1) bek.) a keresetindítás kártérítésre vonatkozó halasztó hatályának megjelölésével.
  - eaisyDocs iktatási fejléc és személyi dosszié besorolás (`3.1 - HR iratok`, megőrzési idő: 5 év az Mt. 286. § szerinti 3 éves általános elévülés figyelembevételével, szigorúan `bizalmas`).
- **In-Browser Megtekintés, Letöltés és eaisyDocs Iktatás (`/api/hr/disciplinary-pdf`, `fileDisciplinaryAction`):**
  - 👁️ Megtekintés inline `PdfViewerDialog` ablakban.
  - 📥 Letöltés PDF fájlként.
  - 📁 Iktatás a személyi dossziéba iktatószámmal és dosszié linkkel.
  - 🗑️ Törlésvédelem a hivatalosan beiktatott munkáltatói határozatokra.
- **Adatbázis Migráció (`20261001000004_hr_fegyelmi_filing.sql`):**
  - `hr_fegyelmi` tábla bővítése: `hatarozat_szam`, `kar_osszeg`, `reszletfizetes_leiras`, `jogorvoslat_hatarido`, `atvetel_datuma`, `dokumentum_id`, `fajl_url`, `iktatoszam`, `ugyirat_id`, `irat_id`.
- **Döntési háttér:** [PRD P-031](../product/decisions/P-031-disciplinary-and-damage-liability-lifecycle-ux.md).

### 🎓 Tanulmányi Szerződések Életciklusa, Mt. 229. § Megfelelőség és eaisyDocs Iktatás UX
- **Megújított Tanulmányi Szerződés Rögzítő Dialógus (`StudyContractTab.tsx`):**
  - Tágas, áttekinthető modális felület (`sm:max-w-[720px]`) logikailag csoportosított mezőkkel:
    - Képzés és intézmény adatai: képzés megnevezése, képző intézmény/egyetem megnevezése, képzés jellege/szintje.
    - Anyagi és munkajogi feltételek: támogatás összege (Ft), vállalt munkaviszony (hónapban, Mt. szerinti max 36 hónap), tanulmányok befejezése / szerződés lejárata.
    - Tanulmányi munkaidő-kedvezmény szöveges leírása (vizsganapok, mentesülés távolléti díjjal).
    - Mt. 229. § (5) bek. szerinti időarányos visszafizetési záradék jelölőnégyzete.
    - Opcionális: Mindkét fél által papíron aláírt és beszkennelt tanulmányi szerződés PDF csatolása.
- **Hivatalos Mt. 229. § Tanulmányi Szerződés PDF Generátor (`study-contract-pdf-generator.ts`):**
  - A4-es, nyomdai minőségű kétoldalú szerződés a Munkáltató és Munkavállaló adataival, Mt. 229. § preambulummal.
  - Részletezi a képzés adatait, a munkáltató anyagi támogatását és munkaidő-kedvezményét, a munkavállaló eredményes tanulmányi és munkaviszony-fenntartási kötelezettségét.
  - Szigorúan törvényi, időarányos visszafizetési és elszámolási záradék, cégszerű és munkavállalói aláírási blokk.
  - Megjeleníti a hivatalos eaisyDocs iktatási fejlécet és a `3.1 - HR iratok` irattári tételt.
- **In-Browser Megtekintés és Közvetlen Letöltés (`/api/hr/study-contract-pdf`):**
  - 👁️ **Megtekintés:** `PdfViewerDialog` komponens a szerződés azonnali felugró megtekintéséhez inline módban.
  - 📥 **Letöltés:** Közvetlen PDF letöltés.
- **eaisyDocs Személyi Dosszié Iktatás (`fileStudyContractAction`):**
  - Egykattintásos hivatalos iktatás az eaisyDocs munkavállalói személyi dossziéba (`HR/ÉÉÉÉ/SORSZÁM/ALSZÁM`).
  - `3.1 - HR iratok` kategória, 50 év megőrzési idő, szigorúan `bizalmas` minősítés.
  - Iktatás után zöld státuszjelvény (`Iktatva: HR/...`) közvetlen hivatkozással a személyi dossziéra.
  - 🗑️ **Törlésvédelem:** Az iktatott tanulmányi szerződés adatbázis és UI szinten védett, nem törölhető a munkaügyi rendszerből.
- **Adatbázis Migráció (`20261001000003_hr_tanulmanyi_szerzodes_filing.sql`):**
  - `hr_tanulmanyi_szerzodes` tábla bővítve: `intezmeny_neve`, `kepzes_szintje`, `munkaido_kedvezmeny`, `szerzodes_szam`, `dokumentum_id`, `fajl_url`, `iktatoszam`, `ugyirat_id`, `irat_id` oszlopokkal és indexekkel.
- **Döntési háttér:** [PRD P-030](../product/decisions/P-030-study-contract-lifecycle-and-filing-ux.md).

### ☕ Cafeteria Nyilatkozat In-Browser Megtekintés, Letöltés és eaisyDocs Iktatás UX
- **Közvetlen In-Browser Megtekintés (`PdfViewerDialog`):**
  - Mind a HR dolgozói adatlapon (`CafeteriaTab.tsx`), mind a dolgozói önkiszolgáló portálon (`CafeteriaDeclaration.tsx`) bevezetésre került a felugró, böngészőn belüli hivatalos PDF megtekintő (Eye ikon).
  - Az `/api/hr/cafeteria-pdf` végpont immár támogatja a `preview=true` (inline) és `download=true` (attachment) paramétereket.
- **Hivatalos Szja tv. 71. § szerinti Cafeteria Nyilatkozat Generátor (`cafeteria-pdf-generator.ts`):**
  - A4-es, nyomdai minőségű hivatalos dokumentum munkavállalói és céges adatokkal, keretgazdálkodási metrikákkal (300.000 Ft éves keret, felhasznált keret, kihasználtság %).
  - Részletes választási táblázat elemenként (SZÉP Kártya, Egészségpénztár, Helyi bérlet stb.), alkalmazott adó/költségszorzókkal és bruttó levonásokkal.
  - Törvényi munkavállalói jognyilatkozat és kétoldalú munkavállaló/munkáltató aláírási zóna.
- **eaisyDocs Személyi Dosszié Iktatás (`fileCafeteriaDeclarationAction`):**
  - Egykattintásos hivatalos iktatás a dolgozó eaisyDocs személyi dossziéjába (`HR/ÉÉÉÉ/SORSZÁM/ALSZÁM`).
  - `3.1 - HR és Munkaügyi iratok` besorolás 50 év megőrzési idővel, szigorúan `bizalmas` minősítéssel.
  - Iktatás után zöld státuszjelvény (`Iktatva: HR/...`) közvetlen hivatkozással a személyi dossziéra.
- **Levéltári Védelemmel Ellátott Újranyitás:**
  - Év közbeni módosítás esetén az újranyitási modál figyelmezteti a HR-est, hogy a korábban beiktatott példány megőrzött jogi archívum marad, és az új leadás új iktatási alszámot kap.
- **Adatbázis Migráció (`20261001000002_hr_cafeteria_filing.sql`):**
  - `hr_cafeteria_keret` kibővítése `dokumentum_id`, `fajl_url`, `iktatoszam`, `ugyirat_id`, `irat_id`, `lezaras_datuma` oszlopokkal és indexekkel.
- **Döntési háttér:** [PRD P-029](../product/decisions/P-029-cafeteria-declaration-filing-and-preview-ux.md).

### 🩺 Foglalkozás-egészségügyi Alkalmassági Vizsgálatok Dokumentumkezelése és Érvényesség UX
- **Érvényesség Számítási Hiba Javítása (`/hr/self-service/profile`):**
  - Kijavítva a korábbi anomália, ahol a múltbeli lejárati dátumok (pl. `2025. október 10.`) hibásan „Hamarosan lejár” figyelmeztetésként jelentek meg.
  - A rendszer immár szigorúan különválasztja a **Lejárt** (`diff < 0`, piros `text-destructive`, `bg-destructive/10`), **Hamarosan lejár** (`0 <= diff < 30 nap`, borostyán sárga), valamint **Érvényes** (`diff >= 30 nap`, zöld/diszkrét) státuszokat a profil fejléc chipjében és az alapadatok kártyán.
- **Hivatalos Lelet / Igazolás Csatolás (`MedicalTab.tsx`):**
  - Az új vizsgálat rögzítése modál kiegészült opcionális fájlfeltöltéssel (PDF vagy kép), kiadó orvos nevével és foglalkozás-egészségügyi szolgálat megnevezésével.
  - A feltöltött fájlok biztonságosan az `irat_files` Supabase storage vödörbe kerülnek, automatikus `hr_dokumentum` tétel kapcsolással.
- **33/1998. (VI. 24.) NM rendelet szerinti Hivatalos Alkalmassági Vélemény Generátor (`medical-sheet-pdf-generator.ts`):**
  - Amennyiben nincs feltöltött szakorvosi igazolás, a rendszer automatikusan kiállítja az A4-es, hivatalos „Elsőfokú Munkaköri Alkalmassági Vélemény” PDF-et a dolgozó személyes adataival, munkakörével, kockázati tényezőivel, orvosi döntésével és 15 napos jogorvoslati záradékával.
- **Közvetlen Megtekintés, Letöltés és eaisyDocs Személyi Dosszié Iktatás:**
  - 👁️ **Megtekintés:** In-browser PDF előnézet `PdfViewerDialog` komponenssel az `/api/hr/medical-pdf` végponton keresztül (mind a feltöltött leletekre, mind a generált véleményekre).
  - 📥 **Letöltés:** Közvetlen PDF letöltés.
  - 📁 **Iktatás eaisyDocs-ba (`fileMedicalExaminationAction`):** Hivatalos személyi dosszié iktatás `HR/...` gap-mentes iktatószámmal, `3.1 - HR és Munkaügyi iratok` (50 év megőrzés, Mt. 134. §), szigorúan `bizalmas` minősítéssel (GDPR 9. cikk).
  - 🗑️ **Törlésvédelem:** Az iktatott orvosi iratok levéltári védelem alatt állnak, a törlés inaktívvá válik magyarázó tooltip-pel.
- **Adatbázis Migráció (`20261001000001_hr_orvosi_vizsgalat_filing.sql`):** `hr_orvosi_vizsgalat` bővítése `dokumentum_id`, `fajl_url`, `iktatoszam`, `ugyirat_id`, `irat_id`, `orvos_neve`, `szakrendeles` mezőkkel és indexekkel.
- **Döntési háttér:** [PRD P-028](../product/decisions/P-028-occupational-health-examination-filing-and-validity-ux.md).

### 🏖️ Hivatalos Éves Szabadság Nyilvántartó Lap (Mt. 134. §) és Távolléti Igazolások
- **Dolgozói Portál Megtekintés & Letöltés (`LeaveHistoryList`):** A korábbi letöltő `Igazolás` gomb helyett külön **Megtekintés** (`PdfViewerDialog` beágyazott PDF előnézettel) és **Letöltés** gomb került bevezetésre.
- **Központi HR Távollét Fül (`LeaveTab.tsx`):**
  - A korábbi puszta táblázat kibővült soronkénti **Megtekintés** és **Letöltés** gombokkal minden jóváhagyott távollétnél.
  - **Hivatalos Éves Szabadság-nyilvántartó Lap (Mt. 134. §):** Gomb a tárgyévi nyomtatvány megnyitására, letöltésére és közvetlen beiktatására a dolgozó eaisyDocs személyi dossziéjába (`HR/ÉÉÉÉ/SORSZÁM/ALSZÁM`).
- **Mt. szerinti Törvényes Keretlevezetés (`leave-calculator.ts`):** `getAnnualLeaveBreakdown` és `calculateAnnualLeave` a születési év (életkori pótszabadság Mt. 117. §), gyermekek száma (Mt. 118. §) és megváltozott munkaképesség (Mt. 120. §) alapján automatikusan részletezi a törvényes keretet az A4-es hivatalos nyomtatványban.
- **Tárgyévi Távolléti Napló & Egyenlegzárás:** Kronologikus táblázat munkanap-számítással és aláírási záradékkal.
- **Döntési háttér:** [PRD P-027](../product/decisions/P-027-annual-leave-sheet-and-leave-certificates-ux.md).

### ⏱️ Havi Jelenléti Ív PDF Generálás & eaisyDocs Személyi Dosszié Iktatási Híd
- **Hiteles Mt. 99–106. § szerinti Munkaidő-nyilvántartás:** Elkészült a hivatalos havi jelenléti ív PDF generáló motor ([src/utils/hr/timesheet-pdf-generator.ts](../../src/utils/hr/timesheet-pdf-generator.ts)), amely a havi rögzített jelenléti napok, jóváhagyott távollétek (szabadság, betegség) és munkaszüneti napok alapján állít elő nyomdai minőségű A4-es hivatalos elszámolást.
- **Naponkénti Részletező & Összesítő:** Naponkénti érkezési/távozási időpontok, ledolgozott munkaórák, jogcímek, valamint havi összesített munkaóra, elvárt norma (FTE alapján) és időszaki egyenleg / túlóra kimutatás.
- **Közvetlen Böngészőn Belüli Megtekintés (`PdfViewerDialog`):** Az új `/api/hr/timesheet-pdf` API végponton keresztül a dolgozó vagy a HR felelős letöltés nélkül, közvetlenül a felugró PDF-olvasóban tekintheti meg az ívet bármelyik hónapra.
- **Egykattintásos Hivatalos Iktatás (`fileMonthlyTimesheet`):**
  - A hónap jóváhagyása után a HR-es egyetlen gombnyomással beiktathatja a havi jelenléti ívet a dolgozó eaisyDocs személyi dossziéjába (`HR/ÉÉÉÉ/SORSZÁM/ALSZÁM`).
  - Automatikusan feltölti a hiteles PDF-et a Supabase Storage-be (`timesheets/{employeeId}/...`).
  - Létrehozza a `hr_dokumentum` rekordot `Havi jelenléti ív` kategóriával.
  - A `3.2 - Munkaidő nyilvántartások` irattári tételhez rendeli 5 éves megőrzési idővel és bizalmas minősítéssel.
  - Audit bejegyzést készít a `hr_esemeny_naplo` táblába.
- **Megújult Jelenléti Fejléc (`AttendanceTab.tsx`):**
  - „Megtekintés” gomb a PDF előnézethez.
  - „Iktatás dossziéba” gomb lezárt hónapoknál.
  - Zöld `Iktatva: HR/...` státuszjelző badge és közvetlen hivatkozás az eaisyDocs személyi dosszié nézetre.
- **TDD Tesztek:** Kibővített tesztkészlet (`src/utils/__tests__/hr-filing-bridge.test.ts`), 12/12 zöld teszt.
- **Döntési háttér:** [PRD P-026](../product/decisions/P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [ADR A-026](../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md).

### 📄 eaisyHR Munkakör Katalógus ↔ Dolgozói Munkaköri Leírás Integráció és Dinamikus Generálás
- **Munkakör Katalógus Verzió Átvétele (`hr_munkakor_leiras_verzio`):** A dolgozó profiloldalán (`/hr/employee/[id]`) feloldásra kerül az aktív beosztáshoz tartozó `hr_munkakor` és a hozzá feltöltött legfrissebb hivatalos verzió a katalógusból.
- **Linear-Stílusú Átvételi Kártya (`JobDescriptionBadgeAction`):**
  - Jelzi az aktív munkakört, a katalógusbeli verziószámot (`v1`), a feltöltött fájl nevét és kiadásának dátumát.
  - Egykattintásos biztonságos fájlletöltés és megtekintés.
  - Egykattintásos hozzárendelés a dolgozóhoz (`assignJobDescriptionToEmployee`), amely `Munkaköri leírás` kategóriájú `hr_dokumentum` tételt képez és bejegyzi a `hr_esemeny_naplo`-ba.
  - Intelligens státuszjelző: zöld pipa ha már iktatva van vagy hozzá van rendelve; figyelmeztető badge, ha új verzió érhető el a katalógusból.
- **Mt. szerinti Dinamikus Munkaköri Leírás Generátor (`ContractGeneratorDialog`):**
  - Új sablon: "Hivatalos Munkaköri Leírás".
  - Automatikusan beemeli a dolgozó személyes adatait, belépési idejét, munkarendjét és közvetlen vezetőjének nevét.
  - Dinamikusan integrálja a munkakör FEOR kódját, besorolási szintjét, célját/küldetését (`leiras`), feladatait és hatásköreit (`feladatok_es_hataskorok`), elvárt kompetenciáit (`elvart_kompetenciak`), valamint munkavédelmi előírásait.
  - Generálás és mentés után azonnal iktatható a dolgozó eaisyDocs személyi dossziéjába.
- **Biztonságos Letöltési API (`src/app/api/hr/download-document/route.ts`):** Hitelesített, RLS-védett végpont a Supabase Storage-ben tárolt HR és munkaköri leírás dokumentumok közvetlen letöltéséhez és előnézetéhez admin fallbackkel.
- **TDD Tesztek:** Kibővített tesztkészlet (`src/utils/__tests__/hr-filing-bridge.test.ts`), 10/10 sikeres teszt.
- **Döntési háttér:** [PRD P-026](../product/decisions/P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [ADR A-026](../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md).

### 📁 eaisyHR ↔ eaisyDocs Munkavállalói Személyi Dosszié & Hivatalos Iktatási Híd (B9)
- **Munkavállalói Személyi Dosszié Modell:** A vak, tömeges dokumentum-áttöltés helyett megvalósítottuk a munkajogi és irattári törvényeknek megfelelő központi személyi dosszié struktúrát ([ADR A-026](../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md)).
- **Automatikus Dosszié Megnyitás & Alszám Képzés:** A dolgozó első dokumentumának iktatásakor a rendszer automatikusan megnyitja a központi személyi dossziét (`HR/ÉV/SORSZÁM - [Dolgozó Neve] személyi dossziéja`), majd a későbbi dokumentumok ebbe a dossziéba kerülnek gap-mentes alszámként (`.../1`, `.../2`, stb.).
- **50 Éves Megőrzési Szabályzat & Irattári Tétel:** A dokumentumok automatikusan a `3.1 - HR és Munkaügyi dokumentumok` irattári tételhez rendelődnek, 50 éves lejárati idővel és selejtezési tilalommal.
- **GDPR & Bizalmas Minősítés:** Minden iktatott HR irat alapértelmezetten `bizalmas` minősítést kap, garantálva, hogy illetéktelenek nem láthatják az eaisyDocs-ban a dolgozói munkabér, egészségügyi vagy személyes adatokat.
- **Kétirányú Polimorf Integritás (`irat_kapcsolat`):** Az irat és az ügyirat közvetlenül összekapcsolódik a `munkavallalo` és a `hr_dokumentum` entitásokkal `belso` forrással.
- **Iktatott Iratok Törlés Elleni Védelme:** Az iktatást követően a dokumentum nem törölhető a HR felületről sem véletlenül, sem szándékosan; a törlés gomb helyét lakat ikon veszi át a jogszabályi integritás biztosítására.
- **Felhasználói Felület (`FileHrDocumentDialog`):** Linear-stílusú iktatási ablak, szerkeszthető irattárggyal, dosszié-előnézettel, státusz badge-ekkel (zöld iktatott iktatószámmal vs. szürke belső HR vázlat), és közvetlen hivatkozással az eaisyDocs dosszié nézetre ([PRD P-025](../product/decisions/P-025-employee-document-filing-and-dossier-ux.md)).
- **Teszteltség:** Tiszta TDD tesztkészlet ([src/utils/__tests__/hr-filing-bridge.test.ts](../../src/utils/__tests__/hr-filing-bridge.test.ts)) és valós adatbázison sikeresen lefutott E2E verifikáció.

### 🏷️ Globális Legördülő Menü Címke-Feloldás (Base UI Select Auto-Labeling)
- **Hiba oka:** A `@base-ui/react/select` nem vizsgálta meg a zárt állapotban lévő elemek belső DOM-ját, és ha a `Select.Root` nem kapott explicit `items` szótárat, a kiválasztott érték nyers kulcsát (pl. `ceg`, `vevo`, `atutalas`, `aktiv`, UUID) jelenítette meg az emberi felirat helyett.
- **Globális Megoldás (`src/components/ui/select.tsx`):** A `Select` komponens rendereléskor automatikusan rekurzívan végigpásztázza a gyermekelemeket (`collectSelectItems`, `extractText`), kinyeri az összes `SelectItem` szöveges feliratát vagy explicit `label` attribútumát, és automatikusan átadja a Base UI store-nak a feloldó `items` szótárat.
- **Alkalmazott Javítás:** Az alkalmazás összes (37+) Select mezője (Partner adatok, iktatási ablak, HR modulok, keresők) mostantól megbízhatóan és automatikusan a felhasználóbarát magyar feliratot jeleníti meg a nyers kódok helyett.

### 🏢 Partnertörzs Bővítése & Kapcsolattartó Kezelés (B7 / MAN-05)
- **Kettős Besorolási Rendszer:** Jogi forma (`tipus`: Cég, Magánszemély, EV, Hivatal) és Üzleti szerepkör (`szerepkor`: Vevő, Szállító, Mindkettő, Hatóság, Bank, Egyéb) szétválasztása.
- **Pénzügyi & Szerződéses Feltételek:** `bankszamlaszam`, `fizetesi_hatarido_nap`, `fizetesi_mod` (Banki átutalás, Készpénz, Bankkártya, Egyéb) kezelése.
- **Kapcsolattartók Alrendszer:** `partner_kapcsolattarto` relációs tábla, elsődleges kapcsolattartó kijelölés, CRUD műveletek és dialógus.
- **Partner Státusz:** `aktiv` / `inaktiv` státuszkezelés, közvetlen gyorsváltó kapcsoló.

### 📊 Dashboard Statisztikai Bővítés & Dinamikus Időszakszűrő (MAN-04)
- **Dinamikus Iratforgalom Trend:** Az AreaChart nem fix 7 napos, hanem a felső szűrő (`Ma`, `7 nap`, `Hónap`, `Év`, `Összes`) alapján dinamikusan számolja az adatpontokat és igazítja a felbontást (órás, napi, havi), a fejlécet és a magyarázó szövegeket.
- **Bizonylattípus-megoszlás (Recharts Vízszintes BarChart):** A kiválasztott időszak iratainak és ügyiratainak kategorizált kimutatása (Számlák és pénzügyi bizonylatok, Szerződések, HR & munkaügy, Igazolások & jegyzőkönyvek, Kereskedelmi és általános iratok) darabszámmal, százalékos aránnyal és egyedi színkódokkal.
- **Top Partnerek kimutatás:** A legaktívabb küldők és címzettek rangsora, bejövő és kimenő darabszámokkal, valamint relatív forgalmi aránymutatókkal.
- **Linear-Inspirált 2 Soros Prémium Elrendezés:**
  - 1. sor: Iratforgalom (2 oszlop) + Érkezési csatornák fánkdiagram (1 oszlop)
  - 2. sor: Bizonylattípus-megoszlás (2 oszlop) + Top partnerek (1 oszlop)
  - 3. sor: Lejáró határidők & Saját feladataim

### ⚡ Globális Gyorskereső és Parancsközpont (`Ctrl + K`) [MAN-03]
- **Dedikált Keresőoldal Kivezetése:** A bal oldali menüből eltávolításra került a külön `/search` navigációs gomb; közvetlen URL látogatás esetén szerveroldali átirányítás történik a főoldalra a paraméterek átadásával.
- **Egyesített Command Palette (`Ctrl + K` / `⌘K`):** A jobb felső fejlécben lévő keresősávból vagy a globális `Ctrl+K` gyorsbillentyűvel bármelyik képernyőről megnyitható a felugró parancsközpont és intelligens kereső.
- **Megőrzött és Teljes Funkcionalitású Keresőmotor:**
  - Valós idejű gépelés közbeni gyorskeresés (Ügyiratok, Partnerek, Dokumentumok).
  - Postgres Magyar FTS (`kereso_vektor`) és hibrid szemantikus keresés (`search_iratok_hybrid` RPC) teljes szöveges szövegrészlet-kiemeléssel (`snippet`), pontszámokkal és találati jelölőkkel (`Szemantikus`, `Hibrid`).
- **Beépített Részletes Szűrőpanel:** Partner neve, iktatószám, érkeztetőszám, irat iránya, minősítés, valamint dátumintervallum szerinti szűrés aktív szűrőcímkékkel és számlálóval.
- **Mentett Keresések és Értesítési Alertek:**
  - Keresési feltételek mentése egyedi névvel és profilkezeléssel.
  - Egykattintásos értesítési alert ki/bekapcsolás (`Bell` / `BellOff`) új, feltételeknek megfelelő bejövő iratok esetén.
  - Mentett profilok azonnali betöltése és törlése közvetlenül a felugró ablakból.
- **Keresési Előzmények és Gyorsparancsok:** Legutóbbi keresések tárolása (`localStorage`), egykattintásos újrafuttatás és törlés, valamint üres keresőnél gyors navigációs parancsok (Új érkeztetés, Iktatókönyv, Saját feladataim, Partnerek).

### 🏢 Magyar Adószám és Külföldi / EU Adóazonosító Szétválasztása (MAN-02)
- **Különválasztott Adatstruktúra:** `partner.kulfoldi_adoszam` új oszlop és index (`idx_partner_clean_kulfoldi_adoszam`) a migrációban (`20260930000001_add_partner_kulfoldi_adoszam.sql`).
- **Determinisztikus Szétválasztó Motor:** [`src/utils/tax-number.ts`](../../src/utils/tax-number.ts) a magyar 8/11 jegyű adószámok és az EU közösségi / külföldi azonosítók (PIB, TIN, stb.) pontos formázására és egybefűzött számlasorok szétválasztására.
- **AI Kinyerési Pontosítás:** Frissített Gemini 2.5 Flash prompt és fallback logika a belföldi kötőjeles formátum (`partner_adoszam`) és a közösségi EU VAT / külföldi azonosító (`partner_kulfoldi_adoszam`) elkülönített kinyerésére.
- **Megújult Iktatási Panel & Partner Dialógus:** A felhasználó az iktatásnál (`filing-panel-client.tsx`) és a partnertáblázatban (`partner-dialog.tsx`, `partners-table-client.tsx`) egymás mellett, külön beviteli mezőben látja és szerkesztheti mindkét azonosítót.
- **TDD Tesztkészlet:** 8/8 zöld teszt ([src/utils/__tests__/tax-number.test.ts](../../src/utils/__tests__/tax-number.test.ts)).
- **Döntési dokumentáció:** [ADR A-023](../architecture/decisions/A-023-tax-number-foreign-vat-separation.md).

### 🛡️ AI E-mail Spam és Relevancia Előszűrő (MAN-01)
- **Kétlépcsős (2-Tier) szűrőmotor:** Tier 1 mintaelemzés (számla/szerződés csatolmány prioritás, bounce/postmaster tiltás) + Tier 2 Gemini 2.5 Flash kétértelmű levelekre.
- **Fail-open biztonsági garancia:** Hiba vagy hiányzó API kulcs esetén egyetlen valós üzleti irat sem veszhet el.
- **IMAP Integráció:** Beépítve a háttér e-mail letöltőbe ([src/utils/imap-service.ts](../../src/utils/imap-service.ts)), a kiszűrt spam nem kap érkeztetőszámot, azonnal olvasottnak jelölve.
- **TDD Tesztkészlet:** 5/5 zöld teszt ([src/utils/__tests__/email-spam-filter.test.ts](../../src/utils/__tests__/email-spam-filter.test.ts)).
- **Döntési dokumentáció:** [ADR A-022](../architecture/decisions/A-022-email-spam-and-relevance-prefilter-architecture.md).

### 🔍 Teljes Kódbázis Mély-Audit és Dokumentáció-Szinkronizáció (Zero-Hallucination Revisions)
- **Központi Döntéstár Teljes Felülvizsgálata:**
  - 21 Építészeti Döntés ([ADR A-001 - A-021](../architecture/decisions/index.md)) ellenőrizve és szinkronizálva a valós forráskóddal (`A-020`: REST API v1, `A-021`: Időzített Cronok).
  - 23 Termék és UX Döntés ([PRD P-001 - P-023](../product/decisions/index.md)) auditálva valós komponensekkel (`P-019`: Tasks Kanban/Calendar, `P-020`: Beágyazható Widget, `P-021`: Elválasztólap Generátor, `P-022`: Dosszié Megosztás/Sablonok, `P-023`: Vezetői Jóváhagyási Műszerfal).
  - 7 Üzleti Szabályzat ([BRD 001 - 007](../business/decisions/index.md)) pontosítva a valós működési logika szerint (Mt. törvényi követelmények és jelenleg működő szoftverlogika szétválasztása, prefix-alapú gap-mentes iktatószámok).
- **Adatbázis Sémák Valós Kódhoz Igazítása (106 SQL migráció, 65 tábla):**
  - Fiktív táblák és oszlopok felszámolása: `fajl` → `irat_fajl` (`storage_path`, `pdfa_path`, `sha256`, `ocr_szoveg`).
  - Irattár: `fizikai_tarolas` → `irat_fizikai_hely` (`epulet`, `szoba`, `szekreny_polc`, `doboz`), `irat_kolcsonzes` → `irat_kolcsonzes_naplo`, `irattari_terv`.
  - Munkaügy (eaisyHR): `munkavallalo` → `hr_dolgozo_adatlap`, `munkavallalo_adatok` → `hr_dolgozo_titkos_adat` (BYTEA oszlopok és `get_decrypted_hr_data` RPC), `hr_allashirdetes`, `hr_toborzas`.
  - Integráció: `partner` (`nev`, `adoszam`, `cegjegyzekszam`), `irat_kapcsolat` (`entitas_tipus`, `entitas_id`, `entitas_forras`, `kapcsolat_tipusa`).
- **Útvonaltérkép és Információs Architektúra Frissítése:**
  - Az összes valós Next.js 15 App Router útvonal (köztük a korábban tévesen "tervezettnek" jelölt `/partners`, `/tasks`, `/hr/time`, `/hr/recruitment`, `/hr/onboarding`, `/hr/offboarding`, `/embed/partner-dossiers`, `/karrier/[id]`) felvétele éles/kész státusszal a [product/information-architecture.md](../product/information-architecture.md) nyilvántartásba.

### 📚 Dokumentációs Architektúra és Döntéstár (Teljes Visszamenőleges Rendszerezés)
- **Automatikus Szinkronizáció:** `scripts/doc-sync.ts` CLI és `.agents/skills/eaisydocs-doc-sync/` fejlesztési segédeszköz üzembe állítása.
- **Moduláris Függetlenségi Szerződés:** eaisyDocs és eaisyHR teljes adatbázis- és működésbeli szétválasztásának formális specifikálása ([A-005](../architecture/decisions/A-005-hr-modular-independence-architecture.md), [BRD-003](../business/decisions/003-hr-modular-independence-contract.md)).
- **Mester Tervezet Excel:** Folyamatosan frissített, asztali Excel tervfájl (`eaisyDocs_es_eaisyHR_Mester_Tervezet.xlsx`) 76 eaisyDocs és 53 eaisyHR tétellel, állapotkövetéssel és KPI összesítőkkel.

### 📊 Főoldal & Vezérlés
- **Új Vezetői és Operatív Dashboard:** Recharts forgalmi trenddel, csatorna-eloszlási donut diagrammal, lejáró határidők visszaszámlálójával és saját feladatok blokkjával ([P-001](../product/decisions/P-001-interactive-dashboard-analytics-ux.md)).
- **Időszak szűrés:** `Összes`, `Ma`, `7 nap`, `Hónap`, `Év` szerinti azonnali adatkalkuláció.

### 🔗 eaisyBill Integráció
- **Csatorna ENUM szétválasztás:** Az eaisyBill számlaimportok immár külön `'eaisybill'` érkezési móddal kerülnek rögzítésre ([A-003](../architecture/decisions/A-003-eaisybill-channel-enum-migration.md)).
- **Migráció:** Korábbi 'rendszer' típusú számlák visszamenőleges átírása.

---

## [Sprint 2026-09-29] – Commit `fb7e748`

### 🗄️ Irattár & Selejtezés
- **Szigorú 4-szem elv ellenőrzés:** A javaslattevő iratkezelő nem hagyhatja jóvá a saját selejtezését ([A-001](../architecture/decisions/A-001-four-eyes-disposal-validation.md), [BRD-002](../business/decisions/002-strict-four-eyes-disposal-governance.md)).
- **Dinamikus csomagkezelés:** Részleges selejtezéskor új lezárt csomag jön létre a jegyzőkönyvvel.
- **Hiteles PDF jegyzőkönyv:** A valós felterjesztő neve kerül az aláírási záradékba.
- **Jegyzőkönyv Popover:** Érintett ügyiratok és iratok tételes listája közvetlenül a táblázatból ([P-002](../product/decisions/P-002-archive-protocol-popover-ux.md)).

### 👁️ Előnézet & Iktatás
- **`DocumentPreviewFrame` bevezetése:** Memóriabeli Blob URL izoláció Next.js iframe hibák és HTML beágyazódás ellen ([A-002](../architecture/decisions/A-002-document-preview-blob-isolation.md)).
- **Iktatási ütközésvédelem javítása:** Saját mentés Realtime eseménye nem blokkolja a felületet, Toast sikerüzenet ([P-003](../product/decisions/P-003-filing-realtime-collision-guard-ux.md)).
- **Kötegelt szkenner:** PDF worker szerveroldali bundling és stream olvasás ([A-004](../architecture/decisions/A-004-batch-scanner-stream-fallback.md)).

---

## [Alaprendszer Mérföldkövek] – Visszamenőleges Implementációs Leltár (~100-100 óra)

### 📂 eaisyDocs – Teljes Digitális Iratkezelő Rendszer
1. **Érkeztetés & Bejövő Csatornák:**
   - Multi-channel érkeztető postaláda (manuális feltöltés, kötegelt szkenner OCR előkészítéssel, automatikus IMAP email figyelő háttérfolyamat).
   - Realtime érkeztetési számláló és azonnali PDF split-view.
2. **Iktatás & Ügyiratkezelés:**
   - Gap-mentes, biztonságos sorszámallokáció (`iktatoszam_allokacio`, prefixek: `NYILV`, `IKT`, `HR`, tranzakciós atomi léptetés).
   - Dinamikus ügyiratfa (ügyiratok összekapcsolása, szerelvényezés, alszámok és tételszámok).
   - Iktatókönyv és részletes kereső magyar ékezetmentes FTS indexeléssel és pgvector szemantikus kereséssel (`search_iratok_hybrid`).
3. **Fizikai Irattár & Kölcsönzés:**
   - Hierarchikus tárolóhely-nyilvántartás (`irat_fizikai_hely`: Épület / Szoba / Polc / Doboz).
   - Fizikai kölcsönzési modul (`irat_kolcsonzes_naplo`: kikérés, átadás-átvételi bizonylat, lejárati sürgetés, visszavétel).
4. **Megőrzés & Selejtezés:**
   - Megőrzési idők kalkulációja irattári terv (`irattari_terv`) alapján.
   - Selejtezési javaslatok generálása (`selejtezes_csomag`, `selejtezes_tetel`), szakértői bizottsági jóváhagyás, 4-szem elv RLS szinten, hiteles jegyzőkönyv generálás.
5. **Biztonság & Integritás:**
   - SHA-256 hash generálás minden feltöltött fájlra (`irat_fajl.sha256`).
   - Szigorúan append-only eseménynapló (`esemeny_naplo`).
   - 4 dimenziós ABAC/RBAC jogosultságkezelés RLS szinten (szerepkör, osztály, minősítés, hozzárendelés).

### 👥 eaisyHR – Komplex Vállalati Munkaügyi és HR Rendszer
1. **Dolgozói Törzs & Karton:**
   - 360 fokos digitális személyi karton 13 füllel (`hr_dolgozo_adatlap`).
   - Szenzitív adatok és béradatok oszlopszintű védelme (`hr_dolgozo_titkos_adat`, BYTEA mezők) a `get_decrypted_hr_data` Security Definer RPC rétegen keresztül.
2. **Munkaidő & Jelenlét (Timesheet):**
   - Napi munkaidő rögzítés (`hr_jelenlet`: Check-in/Check-out, ledolgozott órák).
   - Kicsekkoláskori automatikus túlóra delta kalkuláció (`calculate_tulora_on_checkout` trigger, `hr_tulora_egyenleg`).
   - Havi jelenléti ívek digitális lezárása (`hr_havi_jelenlet_zaras`).
   - Munkaszüneti napok nyilvántartása (`hr_munkaszuneti_nap`).
3. **Szabadságkezelés & Helyettesítés:**
   - Szabadságkeret számítás (`hr_szabadsag_egyenleg`, `hr_tavollet`).
   - Szabadságigénylési munkafolyamat és automatikus helyettesítési megbízás (`hr_helyettesites`).
4. **Onboarding & Offboarding:**
   - Automatizált beléptetési és kiléptetési feladatlisták (`hr_onboarding`, `hr_offboarding`).
   - Munkaszerződés és munkaköri leírás automatikus generálása (`hr_munkakor_leiras_verzio`).
   - Kilépési checklist, eszközelszámolás és strukturált exit interjú analitika (`hr_kilepes_interju`).
5. **Toborzás (ATS) & Publikus Karrieroldal:**
   - Nyitott pozíciók menedzsmentje (`hr_allashirdetes`), publikus álláshirdetés és CV feltöltő felület (`/karrier/[id]`).
   - Jelölt Kanban pipeline (`hr_toborzas`), automatikus Google GenAI CV elemzés (`/api/hr/parse-cv`), interjú Twilio SMS értesítések.
   - GDPR megfelelőség (önéletrajzok automatikus törlése / anonimizálása retenciós idő után).
6. **Teljesítményértékelés (KPI) & Egyéni Fejlesztési Terv (IDP):**
   - Vállalati és egyéni KPI célkitűzések (`hr_kpi_katalogus`), értékelési ciklusokkal (`hr_teljesitmeny_ciklus`, `hr_teljesitmeny`).
   - Egyéni fejlesztési terv (`hr_fejlesztesi_terv`, `hr_fejlesztesi_cel`, `hr_idp_megjegyzes`).
7. **Cafeteria & Dolgozói Önkiszolgálás (ESS):**
   - Éves cafeteria keretösszeg felosztása SZÉP Kártya és egyéb elemek között (`hr_cafeteria_nyilatkozat`).
   - Céges szabályzatok és munkaköri leírások elektronikus nyugtázása.
8. **Hatósági Riportok:**
   - NAV 'T1041 elektronikus bejelentő fájl generálása ÁNYK importra (`/hr/reports`).
   - KSH létszám és statisztikai adatszolgáltatás export.

## [2026-09-30] - Dashboard Letisztítás & Gombok Eltávolítása
- **Scope:** [Docs]
- **Komponens:** [`src/components/dashboard-overview.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/dashboard-overview.tsx)
- **Változások:**
  - Eltávolításra került az „Új Érkeztetés” és a „Szkenner” gyorsműveleti gomb az időszakszűrő sáv jobb oldaláról.
  - Az időszakszűrő fülek (`Összes`, `Ma`, `7 nap`, `Hónap`, `Év`) zavartalanul működnek tovább a bal oldalon.
  - Felesleges importok (`PlusCircle`, `ScanLine`, `buttonVariants`) törölve.

## [2026-09-30] - Partnertörzs Bővítés & Kapcsolattartói Rendszer (B7 - 5.1)
- **Scope:** [Docs] / [Közös]
- **Komponensek & Migráció:**
  - [`supabase/migrations/20260930000002_partner_expansion.sql`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/migrations/20260930000002_partner_expansion.sql)
  - [`src/app/partners/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/page.tsx)
  - [`src/app/partners/partners-table-client.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/partners-table-client.tsx)
  - [`src/app/partners/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/%5Bid%5D/page.tsx)
  - [`src/components/partner-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/partner-dialog.tsx)
  - [`src/components/partner-contact-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/partner-contact-dialog.tsx)
  - [`src/components/partner-status-toggle.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/partner-status-toggle.tsx)
  - [`src/app/partners/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/actions.ts)
  - [`src/utils/partner-matcher.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/partner-matcher.ts)
- **Változások:**
  - **Kettős besorolás:** Jogi forma (`ceg`, `maganszemely`, `egyeni_vallalkozo`, `intezmeny`) mellé bevezetve az Üzleti szerepkör (`vevo`, `szallito`, `mindketto`, `hatosag`, `bank`, `egyeb`).
  - **Új tábla:** `partner_kapcsolattarto` kapcsolattartó személyek nyilvántartására (név, beosztás, email, telefon, elsődleges jelölés) RLS védelemmel.
  - **Partner lista (`/partners`):** 4 KPI kártya, 6 gyors szűrőfül, iratszámláló pill badge, székhely és szerepkör megjelenítés, aktív/inaktív szűrés.
  - **Partner adatlap (`/partners/[id]`):** Kimenő iratok bekötése az iratforgalomba, Kapcsolattartók menedzselése fül, pénzügyi és bankszámla kártya, aktív/inaktív státusz toggle gomb, belső ügyintézői megjegyzés kártya, gyors érkeztetési link előkitöltéssel.
  - **Partner dialógus (`PartnerDialog`):** 3 füles űrlap, élő duplikáció-figyelmeztető sáv adószámra és névre, elsődleges kapcsolattartó gyorsfelvétel.
  - **Döntések:** [A-024](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/architecture/decisions/A-024-partner-dual-classification-and-contacts-architecture.md), [P-024](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/product/decisions/P-024-partner-directory-and-contact-management-ux.md).

