# eaisyDocs Rendszerszintű Mélyelemzés — 2026. október 31. (2. kör, javítások UTÁN)

> **Típus:** Deep Analysis audit (csak olvasó kódelemzés — a 2026.10.30-i audit 20 javítása UTÁNI állapot felmérése + korábban ki nem talált hibák felkutatása + eaisyDocs↔eaisyHR integrációs pontok teljes vizsgálata)
> **Hatókör:** a teljes eaisyDocs modul + a Docs↔HR integrációs réteg (hr-filing-bridge, pdf-route HR ág, T1041, offboarding-iktatás, értesítések, közös profiltábla, helyettesítések)
> **Módszer:** 6 párhuzamos, fájl:sor-pontosságú kódbuktatás (inbox/iktatás/keresés/szabályok; ügyiratok/irattár/fizikai; partnerek/szerződés/API/audit; workerek/cronok/PDF; Docs↔HR integráció; settings/cégkezelés/RLS-migrációk). **Élő teszt nem történt** — a P0-jelölteket javítás előtt érdemes gyors manuális teszttel megerősíteni. A megrendelő által korábban elvetett találatok tiszteletben tartva (l. 9. fejezet).
> **Előzmény:** `eaisydocs-deep-analysis-20261030.md` — **20 javított + 18 elvetett találat** történt meg közte. Ez a dokumentum NEM helyettesíti, hanem kiegészíti azt.

---

## 0. Vezetői összefoglaló — hol állunk most?

A 2026.10.30-i audit óta **20 javítás landolt** — mind visszaigazolva a kódban (l. 1. fejezet). Ennek eredményeként:

- A **settings/cégkezelés action-réteg**, a **szabályok**, a **REST API**, az **IMAP-csatorna**, az **audit-napló** és a **multi-tenant adatbeszúrás** nagy része lényegesen érettebbé vált.
- A mért össz-érettség **~68%-ról ~75%-ra** emelkedett (funkcionális ~80% változatlan; biztonsági/üzemeltetési ~55% → ~65%).

Ugyanakkor a mélyebb 2. kör **új, korábban nem látott gyökérokokat** tárt fel, amelyek részben a javításoknál mélyebben (adatbázis- és profil-rétegben) ülnek:

1. **RLS gyerektábla-csomag hiányzik** — a fő entitások (irat, ügyirat, ügy, partner) cégesítve vannak, de a **kapcsoló-/gyerektáblák** (jegyzetek, irat-kapcsolatok, hozzáférés-grantok, kölcsönzési napló, selejtezési tételek, **partner-kapcsolattartók anonimul!**, számláló-táblák) **cégesítés nélkül, több helyen `USING (true)`-val** állnak. *(Migrációt igényel — a HR-mintára egy csomagban zárható.)*
2. **Globális profil-felülírási eszkalációs lánc** — a `company-actions.ts` szerepkör-kezelő action-jei a cég-specifikus `company_members` MELEEZÉBEN a **globális `felhasznalo_profil`-t is felülírják** érvényesítetlen szerepkörrel → cég-tulajból **globális rendszergazda gyártható**, ami a cég-törlő `isSysAdmin`-ágig visz.
3. **A Docs-modul szerveroldali enforcement-je szinte mindenhol a GLOBÁLIS `felhasznalo_profil.docs_szerepkor`-t olvassa** — a `company_members.docs_szerepkor` cég-felülírás a UI-n működik, de az action-ök többségénél nem érvényesül (a HR oldali `requireHrAuthServer`-mintát a Docs még nem kapta meg).
4. **A háttérfolyamatok maradványai** — az éjszakai cron címzett-feloldásai cég-szűrés nélkül (GDPR-nevekkel mennek át cégek közt), a `claim_ai_tasks` RPC **anonimul hívható** (AI-sor külső kéréssel bénítható), a PDF/A fallback jelölés nélkül az eredeti fájlt menteti.
5. **A Docs↔HR híd funkcionálisan működik, de a multi-company company_id-láncolása törik** — a `hr-filing-bridge` az ügy/ügyirat inserteket **céghozzárendelés nélkül** készíti (nem-default cégnél a HR-dossziék rossz céghez kerülnek), és több `hr_dokumentum` insert is cég nélküli.

**Mért össz-érettség: ~75%. Új találatok: ~11 P0, ~35 P1, ~40 P2.**

---

## 1. A 2026.10.30 ÓTA JAVÍTOTT 20 TALÁLAT VISSZAIGAZOLÁSA (mind ✔ a kódban)

| # | Javítás | Visszaigazolás (fájl) |
|---|---|---|
| 1-7 | Settings guard-sweep (audit-napló törlés, createNewUser őrblokk+tagság, setDepartmentLeader, osztály-CRUD 4x) | settings-actions.ts / admin-actions.ts ✔ |
| 8 | Irattári terv CRUD (requireIrattariTervAccess + company_id) | admin-actions.ts ✔ |
| 9 | Válaszlevél-sablonok cég-specifikus kulcsa | template-actions.ts:24-29 ✔ |
| 10 | Iktatási panel irattári tétel cég-szűrés + üres-lista figyelmeztetés | inbox/[id]/page.tsx:79-86, filing-panel-client.tsx ✔ |
| 11 | Feladatsablonok cég-specifikus kulcsa | task-actions.ts ✔ |
| 12 | Szerződés-generátor megbízó cég-adatok (4 pont) | contract-actions.ts:283-292, 447-455, 845-856, 1107-1118 ✔ |
| 13 | REST API v1 auth (session/Bearer) | api/v1/ugyiratok/route.ts:8-28, eletciklus ✔ |
| 14 | Selejtezési jegyzőkönyv PDF cégnév | disposal-actions.ts:400-408 ✔ |
| 15 | IMAP cégenkénti postafiók (AES-256-GCM, self-heal, cég-szűrt harang + partner-feloldás) | imap-config.ts, credential-crypto.ts, imap-service.ts:139-166, 376-417 ✔ |
| 16 | Audit napló A-091 port (tagság-ellenőrzés, NULL-kiskapu zárva, tudatos 1000 limit) | audit/actions.ts:61-96, 216-252 ✔ |
| 17 | Négyszem-elv cég-specifikus kulcs | system-settings.ts:36-60, admin-actions.ts ✔ |
| 18 | Szerződés-iktatás company_id + irattári tétel cég-szűrés | contract-actions.ts:692-763 ✔ |
| 19 | Felelős-választó company_members szűrése | dossiers/page.tsx:58-74, [id]/page.tsx:78-98 ✔ |
| 20 | Szabályok admin-only (page guard + 8 action őrblokk + sidebar) | rules-guard.ts, rules/**, app-sidebar.tsx ✔ |

---

## 2. ÚJ RENDSZERSZINTŰ GYÖKÉROKOK — emberi nyelven

### 2.1. [P0] RLS gyerektábla-csomag — a cég-dimenzió a fő tábláknál megáll

A `20261008000003_multitenancy_restrictive` a fő entitásokat (irat, ügyirat, ügy, partner, irattári_terv, feladat, esemeny_naplo, mind a hr_*) lezárta — de a következő táblák **kimaradtak**:

| Tábla | Állapot | Következmény |
|---|---|---|
| `partner_kapcsolattarto` | `USING(true)` + **ANON SELECT** | Kapcsolattartók neve/e-mailje/telefonszáma **bejelentkezés nélkül**, publikusan letölthető |
| `ugyirat_megjegyzes` | `USING(true)/WITH CHECK(true)`, nincs company_id | Bármely cég bármely felhasználója írhat/olvashat jegyzetet bármely cég ügyiratára |
| `irat_kapcsolat` | `USING(true)`, nincs company_id | Cross-tenant kapcsolat-írás/olvasás (dolgozói és ügyirat-UUID-k szivárognak) |
| `ugyirat_hozzaferes` | SELECT `USING(true)` | Hozzáférés-grantok (kinek van joga melyik ügyirathoz) globálisan felsorolhatók |
| `irat_kolcsonzes_naplo` | csak globális docs-szerepkör policy | Kölcsönzési láncolat cross-tenant |
| `selejtezes_tetel` | authenticated SELECT/INSERT | Idegen cég csomagjába tétel injektálható |
| `iktatoszam_allokációk` (3 tábla) | nincs restrictive | Iktatószám-sorozatok más cégnél manipulálhatók |
| `felhasznalo_profil` | SELECT `USING(true)` | Összes cég összes profilja (e-mail, telefon, szerepkörök) globálisan olvasható — a teljes jogosultsági modell kifürkészhető |
| `rendszer_beallitas` | SELECT `USING(true)` | Más cégek beállítás-metaadatai olvashatók (a hitelesítő titkok szerencsére AES-titkosítva) |

**Javítás (a HR 20261028000006 mintájára, EGY migrációs csomag):** company_id a hiányzó táblákra + restrictive policyk + `partner_kapcsolattarto` anon-policy azonnali drop + `felhasznalo_profil` érzékeny mezőinek cég-társra szűkítése. **Ez zárja egyszerre a legtöbb P0/P1-et.**

### 2.2. [P0] Globális profil-felülírási eszkalációs lánc (company-actions.ts)

- `updateCompanyMemberRoleAction` (626-654) és `inviteCompanyMemberAction` (919-943): a cég-tulaj guard UTÁN **érvényesítetlen** szerepkör-string, és SERVICE ROLE-lal a **globális `felhasznalo_profil`-t is felülírja** (`docs_szerepkor='rendszergazda'` → globális `szerepkor='admin'`). Cég-tulajdonosból **globálisan rendszergazda gyártható**, ami a `deleteCompanyAction:266` `isSysAdmin`-ágáig és a `deleteUser` guardjáig él.
- `updateUserRole` (settings-actions.ts:321) action-szintű guard nélkül; a mögötte álló RPC a `hr_szerepkor='admin'`-ra is enged (**HR-admin kiadhatja magának a globális DOCS rendszergazdát**) és cég-blind.
- **Megjegyzés a korábbi elvetéshez:** a megrendelő 10.31-én azt tesztelte, hogy a Rendszergazda szerepkörrel rendelkező user **más céget LÁT-e** (nem látta — az rendben). Az itt jelentett lánc ettől eltérő: a **globális profil-írás** maga, ami a lánc kiindulópontja. Javítás: role-whitelist + a globális profil-írás törlése (csak `company_members` módosítása), a `rendszer­gazda` globális kiadása cég-tulaj műveletből tiltandó.

### 2.3. [P1] A Docs-modul cég-scoped szerepkör-feloldása hiányzik (globális vs. company_members)

A HR oldalon `requireHrAuthServer` + `company-role-resolver` következetes. A Docs oldalon viszont a dossiers/tasks/pdf-route/settings-maradványok **a globális `felhasznalo_profil.docs_szerepkor`-t olvassák** — a `company_members.docs_szerepkor` cég-felülírás (pl. valakinél cégben `betekinto`) **nem érvényesül a szerver oldalon**. Érintett: `dossiers/**` perm-checkek, `tasks/task-actions.ts:43-50`, `api/pdf/[id]:27-33`, `setFourEyesSetting`, `updateRuleChannels`, borrow-actions. **Javítás:** közös `docs-auth-guard` (a HR mintájára), cég-scoped feloldással.

### 2.4. [P1] Guard nélküli író action-maradványok a Docs adatrétegben

- `expediteExistingDocument` (dossiers actions 1260): az `iratId` nincs bekötve az ügyirathoz — **más (akár szigorúan bizalmas) ügyirat irata expediálható** e-mailben.
- `/api/send-email` route: guard nélküli expediáló végpont + **tetszőleges partner e-mail felülírása**.
- `generateFromTemplate`: perm- és státusz-ellenőrzés nélkül (lezárt ügyiratba is generálható irat).
- `uploadDocumentNewVersion`: iratId nincs validálva az ügyirathoz.
- `grantDossierExplicitAccess`: a címzett **cégtagsága nincs ellenőrizve** (idegen cég userének adható jog).
- `getDisposalProtocolDownloadUrl` **[P0]**: csak login-check + kliens által adott tetszőleges `storagePath` → **bármely fájl 1 órás aláírt URL-je** service-role-lal (a viewer minősítés-ellenőrzését megkerüli).
- borrow-actions (fizikai irattár): azonosítók/dátumok validálatlanok, cégek nélkül.
- `savePartnerCentralEmail`, `getContractTemplatesAction` (névtelen sablon-törlés admin-upserttel!), `generateContractDraftAction`/`getContractGeneratorContextAction`/`generateContractPdfPreviewAction` **[P0]**: **hitelesítés nélkül** futnak és service-role fallbackkal **idegen cég partner-törzsadatait olvassák — majd Gemini-nek küldik**.

### 2.5. [P1] Háttérfolyamatok maradványai

- **Éjszakai cron [P0]:** a címzett-lekérdezések cég-szűrés nélkül — **minden cég adminja minden cég lejárt ügyiratát, orvosi alkalmasságát, próbaidő-lejáratát kapja, nevekkel (GDPR)**; a lejárt események ráadásul naponta újraküldődnek.
- **`claim_ai_tasks` [P0]:** anon-grant áll fenn — publikus anon kulccsal ciklikusan hívva az AI-sor **végleg beragadtható**; az `ai_feladat_sor` RLS-e csak "authenticated" (más cég AI-eredményei olvashatók/törölhetők).
- **Mentett keresés riasztások [P0]:** a worker-úton service-role-lal, cég-szűrés nélkül fut — *a korábban halasztott találat most fájl:sor-pontossággal igazolva.*
- **PDF csővezeték:** vízjelezett ág az elforgatás ELŐTTI bufferrel dolgozik (ferde oldalak); Gemini-tájolásérzékelés cache nélkül minden megtekintésnél (költség); `pdf/convert` `.replace()`-alapú útvonalcsere **felülírhatja az eredeti iratfájlt**; PDF/A fallback jelölés nélkül eredetit ment.
- **IMAP:** nincs üzenet-deduplikáció (összeomlás közepén duplikált iratok), azonos nevű csatolmányok csendben elvesznek, `\Seen` csak a ciklus végén.
- **Expedíciós SMTP:** a kimenő iratok a **globális env-hitelesítővel** mennek — B cég irata A cég postafiókjából távozik (a céges hitelesítő-adatokat nem használja).
- **Reggeli SMS:** hardkódott „Think AI Kft." aláírás + cég-szűrés nélküli jelöltlista + UTC-időzóna.

### 2.6. [P1] company_id-beszúrási maradványok

`saveSearch` (mentett_kereses), `esemeny_naplo`-insertek az iktatás/elutasítás útján (nem-default cégnél az auditnyom csendben elbukik), `alkalmazas_ertesites` táblán **nincs is company_id oszlop** (HR/Docs harang-értesítések cégek közt keverednek), HR-filing-bridge (l. 3. fejezet).

---

## 3. eaisyDocs ↔ eaisyHR INTEGRÁCIÓS AUDIT (új fejezet)

### 3.1. A híd állapása nagyban

**A funkcionális híd működik**: iktatás, dosszié-életciklus, aláírt-példány verziózás, pre-onboarding lánc (jelentkezés → toborzás → onboarding → aktiválás), duplikáció-védelem, modul-elkülönítés (partner 360 nem nyúl HR-hez; HR-entitások csak HR-modulosnak oldódnak fel), HR-oldali `requireHrAuthServer` egységes. ✔

### 3.2. Találatok

| # | Súly | Hiba | Hely |
|---|---|---|---|
| 1 | **[P0]** | `getOrCreateEmployeeDossier` az `ugy`/`ugyirat` insertet **company_id nélkül** készíti → nem-default cégnél a dolgozó személyi dossziéja **rossz céghez kerül**, a cég felhasználói nem is látják | hr-filing-bridge.ts:146-186 |
| 2 | [P1] | Multi-company dolgozó **egyetlen közös** személyi dossziét kap — a két cég iratai összekeverednek (GDPR/béradat-izoláció) | hr-filing-bridge.ts:68-72 |
| 3 | [P1] | `findEmployeeDossier` cég-ellenőrzés nélkül (az `irat_kapcsolat` USING(true) miatt idegen dosszié-ID feloldható) | hr-filing-bridge.ts:57-72 |
| 4 | [P1] | Bridge HR-szervezet-keresés (`%HR%` ilike) és `irattari_terv` 3.1-keresés cégszűrés nélkül (utóbbi multi-cégnél PGRST-hiba) ; iktatószám-prefix hardcode „HR" | hr-filing-bridge.ts:116-138 |
| 5 | [P1] | `hr_dokumentum` insertek nagy része company_id nélkül (T1041, cafeteria, szerződés-generátor, safety, onboarding-job — a self-service lista így nem találja őket) | t1041-actions, cafeteria-actions, contract-actions stb. |
| 6 | [P1] | `closeOffboarding`: az offboarding cég-ellenőrzése nélkül + a dolgozó **globális** `hr_szerepkor`-ját inaktiválja és az Auth-fiókot 100 évre bannolja — **multi-company dolgozónál a másik cégbeli jogviszonyát is megsemmisíti** | offboarding/actions.ts:343-379, 499-513 |
| 7 | [P1] | `/api/pdf/[id]` HR-ág: **HR-szerepkör soha nem vesz részt a döntésben** — a hr-es kolléga iktatott HR-iratokra 403-at kap (ismert nyitott javítási terv-tétel), plusz a `fileId`-fallback **IDOR** (más hr_dokumentum fájlja kérhető le) | api/pdf/[id]/route.ts:27-106, 144-163 |
| 8 | [P1] | `/api/hr/download-document`: bucket-paraméter ellenőrizetlen + service-role fallback → globális HR-admin **bármely cég bármely fájlját** letöltheti | api/hr/download-document/route.ts |
| 9 | [P1] | `alkalmazas_ertesites`-nek nincs company_id oszlope — a harang HR/Docs-értesítései cégek közt keverednek, a HR/Docs szétválasztás kliensoldali kulcsszó-heurisztika | 20260720214100 + notification-bell.tsx |
| 10 | [P1] | Docs-oldali helyettesítés-lekérzés (tasks) cég-szűrés nélkül — két cégnél dolgozó párnál A cég helyettesítése B cég ügyeire is jogot ad | task-actions.ts:53-66 |
| 11 | [P2] | `deleteArchiveRecordAdmin` cég-ellenőrzés nélkül; `hr_bevallas_archívum` nincs áthidazva a Docs-iktatásba; T1041 kategória-inkonzisztencia („Hatósági bejelentés(ek)"); aláírt-példány audit-insertje érvénytelen mezőkkel csendben elhal; hardcode „Welcome2026!" jelszó; rendszerlink-törlés szerveroldalon nem védett | l. részletes lista |

### 3.3. Működő, hibamentes integrációs pontok ✔

Duplikáció-védelem az iktatásnál; aláírt példány verziózott feltöltése; dosszié-lezárás/újranyitás státuszlogika; bevallás-archívum cégkezelése (listázás/feltöltés); karrieroldali jelentkezés teljes cég-lánca; pre-onboarding állapotgép + idempotens aktiválás; HR-helyettesítés cég-tudatos szinkronja; a két helyettesítési tábla külön útvonalai; Docs-UI iktatás cég-láncolata (filing-actions company_id ✔); modul-elkülönítés a felületeken.

---

## 4. MODULONKÉNTI ÚJ TALÁLATOK (kivonat — a teljes fájl:sor listák a worklogban)

**Inbox/iktatás:** `fileIncomingDocument` — guard + check-then-act verseny + „phantom success" (RLS 0-soros update is success); AI-actionök (`generateAISuggestions`, `clearAICacheAndRerun`) auth nélkül — más cég AI-eredményei (partnernevek, adószámok!) olvashatók, utóbbi korlátlan Gemini-újrafuttatás; keresési snippet **stored XSS** (`ts_headline` + `dangerouslySetInnerHTML` — külső e-mail-tartalommal); iktatópanel osztály-/partnerlistái és AI-extrakció irattári-terv-lekérése cégszűrés nélkül; `dismissInboxItem` verseny.

**Ügyiratok:** `updateDossierStatus` ugyId-kapcsolat validálatlan; `closeDossier` jelenlegi státusz nem kényszerítve; `deletePolymorphicLink` ugyirat_id nélküli delete; jegyzet-@említés értesítés globális profilokon; `savePartnerCentralEmail` guard nélkül; alszám-kiosztási race; `getDossierExplicitAccess` enumerálás.

**Irattár/selejtezés:** `proposeDisposal`/`approveDisposal` — **megőrzési idő lejáratát szerver soha nem ellenőrzi** (nem lejárt is beadható/jóváhagyható = végleges törlés!), szerepkör-ellenőrzés nélkül, jóváhagyás race; részleges jóváhagyásnál az új csomag company_id nélkül; selejtezési értesítés minden cég vezetőjének; `forceExpireAllDossiers` (tudatos gomb — de cég nélküli hívásnál **minden cégre** fut, és folyamatban lévőket is érint).

**Partnerek/szerződés:** `getContractTemplatesAction` névtelen sablon-törlés (admin-upsert); `createCustomContractTemplateAction` globális sablon-írás bármely szerepkörtől; eaisyBill-partner-import cross-eaisyBill-cég (`.in("id")` cég-szűrés nélkül); `getEaisyBillCompaniesAction` cross-termék lista; REST API Bearer-ágon nincs cég-szűrás + nincs limit; `partner_id` UUID-validáció nélkül; A-023 adószám-validáció továbbra hiányzik; sha256 a számla ID-ját hasheli; `kulso_fajl_url` SSRF-felület (séma/host-allowlist nélkül).

**Workerek/cronok/PDF:** l. 2.5 — плюс `pdf/convert` útvonalcsere-felülírás, CRON_SECRET nem timing-safe + query-param + service-role fallback validátorként, `/api/cron/imap` nincs a vercel.json-ben (élesben IMAP nem fut), cron-Brevo sosem cég-specifikus (a cég-feloldás cookie-ra épül, cronban nincs).

**Settings/cégkezelés:** l. 2.2 — плюс `getTeamMembers(null)` globális PII-lista; `deleteUser` globális/cég-blind + audit nélkül; `deleteCompanyAction` **audit-pusztító kaszkád** (a céggel az esemeny_napló is törlődik — nyomtalan törlés, jogi-megőrzés ellenőrzés nélkül); meghívó-token lejárat RPC-ben nincs + brute-force védelem nélkül; `createDepartment` őrblokk nélkül; érzékeny műveletekről (szerepkör-váltás, törlés) sehol audit-napló.

---

## 5. RLS / TÁBLASZINTŰ ÖSSZEFOGLALÓ (a migrációs csomag alapja)

| Tábla | Cég-szinten védett? | Megjegyzés |
|---|---|---|
| ugy, ugyirat, irat, partner, irattari_terv, szervezeti_egyseg, selejtezés_csomag, esemeny_naplo, feladat, mentett_kereses, helyettesites, companies, company_members | **IGEN** | restrictive policy AND-olódik (a permissive `USING(true)` maradványok miatt belül cegen belül minden tag ír — tisztítandó, de cég-közti szivárgást nem ad) |
| irat_fajl | IGEN (közvetett) | parent-iraton át helper-függvényes láthatóság |
| **partner_kapcsolattarto** | **NEM-VÉDETT + ANON** | P0 — azonnali drop |
| **ugyirat_megjegyzes, irat_kapcsolat** | **NEM-VÉDETT (USING true)** | P0/P1 |
| ugyirat_hozzaferes (SELECT) | NEM-VÉDETT | P1 |
| irat_kolcsonzes_naplo, irat_fizikai_hely, selejtezés_tetel, allokációs táblák (3), ertesitesi_szabaly | NEM | P1 |
| felhasznalo_profil (SELECT), rendszer_beallitas (SELECT) | NEM-VÉDETT (USING true) | P1/P2 |
| ai_feladat_sor | NEM (authenticated FOR ALL) | P0 a claim anon-granttal együtt |
| minden hr_* tábla | IGEN | a HR-migráció lezárta ✔ |

---

## 6. ÖSSZESÍTŐ ÉRETTSÉGI MÁTRIX (2026.10.30 → 2026.10.31)

| Modul | 10.30 | **10.31** | Változás oka |
|---|:---:|:---:|---|
| Inbox lista + realtime | 75% | **78%** | tétel-szűrés ✔; alert-XSS nyitva |
| Iktatás (split-view) | 70% | **72%** | fileIncomingDocument race/guard nyitva |
| Szkenner/hotfolder | 75% | **75%** | változatlan |
| IMAP/e-mail csatorna | 60% | **80%** | **cégenkénti postafiók + titkosítás + szűrt értesítés** (dedup/quarantine nyitva) |
| eaisyBill csatorna | 65% | **66%** | hash/SSRF nyitva |
| Iktatókönyv lista | 85% | **88%** | user-listák cégesítve |
| Ügyirat-adatlap | 80% | **82%** | expediálás/sablon/version-kötések nyitva |
| Kimenő iratok | 70% | **68%** | send-email végpont + expedite-IDOR felfedezve |
| Irattár + selejtezés | 80% | **80%** | négyszem ✔; propose/approve guardok nyitva |
| Jegyzőkönyv/PDF | 72% | **78%** | cégnév ✔; letöltés-URL P0 nyitva |
| Irattári terv | 62% | **80%** | **guard + company_id ✔** |
| Fizikai + kölcsönzés | 68% | **68%** | borrow-validációk hiánya felfedezve |
| Partnerek | 85% | **82%** | kapcsolattartó-anon P0 + AI-import rés nyitva |
| AI szerződésgenerátor | 80% | **78%** | megbízó ✔; auth nélküli ágak + fallback nyitva |
| Szabályok (rules) | 80% | **88%** | **admin-only ✔** (scope-all maradványok P2) |
| Keresés + alertek | 75% | **72%** | XSS + alert cross-tenant igazolva |
| Embed widget | 30% | **30%** | változatlan (auth ✔ a megrendelő tesztje szerint) |
| REST API v1 | 25% | **75%** | **auth ✔** (Bearer-cég gap nyitva) |
| Workerek/cronok/PDF | 63% | **66%** | IMAP ✔; nightly/claim/PDF-A nyitva |
| Dashboard | 80% | **80%** | változatlan (limit P2) |
| Tasks | 75% | **76%** | helyettesítés-cég P2 |
| Cégkezelés | 65% | **62%** | **profil-írás eszkalációs lánc mélyebben igazolva** |
| Settings (docs) | 45% | **80%** | **guard-sweep + hitelesítő adatok + négyszem ✔** |
| Audit (docs) | 55% | **80%** | **A-091 port ✔** (insert-company_id maradvány nyitva) |
| **Docs↔HR integráció (új sor)** | — | **72%** | híd működik; bridge company_id-lánc törik |

**Átfogó: ~75%** (10.30: ~68%). **Új találatok: ~11 P0, ~35 P1, ~40 P2.**

---

## 7. JAVÍTÁSI PRIORITÁSI SORREND (javaslat)

1. **Eszkalációs lánc elvágása (kód, azonnal, migráció nélkül):** `updateCompanyMemberRoleAction` + `inviteCompanyMemberAction` role-whitelist + globális profil-írás törlése; `updateUserRole` RPC HR-ág kivétele + cég-tagság. — *A 2.2-es gyökérok.*
2. **Auth nélküli action-páros + fallback minta (kód):** a 3 szerződés-action login-guardja + a service-role partner-fallbackok eltávolítása (idegen cég adatai Gemini-nek!). — *2.4.*
3. **`getDisposalProtocolDownloadUrl` P0 (kód):** csomag-ID alapú letöltés + prefix-ellenőrzés + cég-szerepkör + rövid érvényesség.
4. **RLS gyerektábla-migrációs csomag (MIGRÁCIÓ — zöld jelzésre):** 2.1 táblalista + `claim_ai_tasks` anon-grant revoke + `felhasznalo_profil` szűkítés. *Egy csomag a P0-k jelentős részét zárja.*
5. **Éjszakai/reggeli cron cégizoláció + lejárt-újraküldés dedup (kód/RPC).**
6. **Mentett keresés riasztás cég-szűrés** (a halasztott P0 — fájl:sor-pontossággal most igazolva) + `saveSearch` company_id.
7. **Docs cég-scoped szerepkör-guard (`docs-auth-guard`)** a globális profil-feloldások helyett. — *2.3.*
8. **HR-filing-bridge company_id-lánc** (+ hr_dokumentum insertek) — a Docs↔HR híd multi-company zárolása. — *3.2/1.*
9. **Selejtezés szerveroldali megőrzési-idő kényszerítés + propose/approve guardok.**
10. **PDF csővezeték csomag:** vízjel-buffer, Gemini-cache, convert-útvonal, PDF/A jelölés, betekintő non-PDFág.
11. **Kimenő irat csomag:** send-email végpont guard, expedite irat-kötés, SMTP cég-hitelesítő.
12. **P2-csomag** (a korábban tárgyalt 13 tétel frissítve az újakkal).

---

## 8. MEGJEGYZÉSEK

- Az elemzés **nem módosított semmit** a kódban.
- A megrendelő korábbi elvetéseit tiszteletben tartottuk és NEM szerepelnek hibalistában: Lejárt generálás gomb (tudatos — de a null-cég ág javítása javasolt), sync gomb minden szerepkörnek (tudatos), realtime UPDATE (nem reprodukálható), PDF-IDOR inbox (403 ✔), embed auth (✔), selejtezett feltámasztás, vázlat-törlés, ő/ű, kölcsönzés-figyelmeztetés, partner-adatlap metaadatok, selejtezési csomag company_id (telles jóváhagyásnál ✔), eszkalációs-lánc **láthatósági** tesztje (a jelen dokumentum a profil-írási láncot külön, új bizonyítékkal tárgyalja), életciklus-visszahelyezés (tudatos), @említés/feladat-listák (✔).
- Az 1-es prioritású eszkalációs lánc és a 2.4-es auth nélküli action-ök **élő teszt nélkül is egyértelműek** (kód-szinten bizonyítottak); a többi P0-jelöltet javítás előtt érdemes rövid manuális teszttel megerősíteni.
- Pozitívumok: a beépített 20 javítás mind a helyén van; az IMAP-átépítés (A-098) a várt módon működik; a HR-oldali guard-minta (requireHrAuthServer) bevált mintája lehet a Docs `docs-auth-guard`-jának.
