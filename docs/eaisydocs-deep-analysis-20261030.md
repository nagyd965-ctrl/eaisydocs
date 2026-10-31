# eaisyDocs Rendszerszintű Mélyelemzés — 2026. október 30.

> **Típus:** Deep Analysis audit (csak olvasó kódelemzés — kód, adatbázis-migrációk/RLS-policyk és dokumentáció kereszthivatkozása alapján)
> **Hatókör:** a teljes eaisyDocs modul (inbox/iktatás, ügyiratok, irattár/selejtezés, fizikai irattár, partnerek, szerződésgenerátor, szabályok, keresés, embed widget, REST API, workerek/cronok/PDF-csővezeték, dashboard, tasks, cégkezelés, beállítások, audit)
> **Módszer:** a „helyes működést" a `docs/` döntéstár (ADR-ek, PRD-k, BRD-k) alapján definiáltuk, majd a tényleges kódot és RLS-policyket ehhez mértük. **Élő, bejelentkezett teszt nem történt** — a találatok statikus elemzésből származnak, javítás előtt érdemes gyors manuális teszttel megerősíteni.
> **Párja:** `eaisyhr-deep-analysis-20261029.md` (a HR audit; több ott talált minta itt is visszaköszön)

---

## ⭐ JAVÍTOTT P0 TALÁLATOK (2026.10.30. — a megrendelő által tesztelve)

Az alábbi P0 találatok a **settings modul guard-sweep** csomagból **lezárásra kerültek**. Minden javítást a megrendelő admin fiókkal végigtesztelt — a viselkedés változatlan (saját cégen belül minden működik), csak a jogosulatlan hívások záródtak.

| # | P0 találat | Commit | Javítás | Megrendelői teszt |
|---|---|---|---|---|
| 1 | `getGlobalisAuditNaplo` — hitelesítés nélkül, SERVICE ROLE, minden cég audit-adata | `2cee3f9` | **Törölve** (halott kód: 3 dimenziós ellenőrzéssel bizonyítva, hogy sehol nincs behívva) | ✔ |
| 2 | `createNewUser` — nincs admin-check, árva fiók (nem kerül céghez) | `7cc1523` | Őrblokk + whitelist + **automatikus `company_members` bejegyzés** az aktív cégbe | ✔ (Csapat fülon azonnal látszott) |
| 3 | `setDepartmentLeader` — hitelesítés nélkül + **globális `ugyintezo→vezeto` előléptetés** | `41b5a4e` | Őrblokk + **az előléptetés törölve**; előzetes kockázatelemzés (0 NULL-céges egység, az egyetlen éles vezető nem függ tőle) | ✔ (adatbázis-szinten igazolva, javítás után visszaállítva) |
| 4 | `updateDepartment` — hitelesítés nélkül, cross-tenant | `0ba0930` | Őrblokk (közös `requireDepartmentAdminAccess()`) | ✔ |
| 5 | `deleteDepartment` — hitelesítés nélkül, cross-tenant, globális tag-nullázás | `0ba0930` | Őrblokk | ✔ |
| 6 | `addUsersToDepartment` — hitelesítés nélkül, cross-tenant | `0ba0930` | Őrblokk | ✔ |
| 7 | `removeUserFromDepartment` — hitelesítés nélkül, cross-tenant | `0ba0930` | Őrblokk | ✔ |
| 8 | Irattári terv CRUD — guard nélkül + `company_id` nélküli insert (nem-default cégnél láthatatlan/téves céghez kerül) | `2738773` | Őrblokk (`requireIrattariTervAccess`) + `company_id: aktív cég` + cég-szűrt lekérdezés | ✔ (DB-ben igazolva) |
| 9 | Válaszlevél-sablonok GLOBÁLISAK — minden cég ugyanazt a listát látja/törölheti | `2738773` | Cég-specifikus kulcs: `valaszlevel_sablonok:{companyId}` + hitelesítés | ✔ (2 céggel tesztelve) |
| 10 | Iktatási panel — az irattári tétel legördüló az összes cég tételét listázta | `a3c7e87` | `.eq("company_id", activeCompanyId)` szűrés a lekérdezésben | ✔ |
| 11 | Feladatsablonok GLOBÁLISAK — minden cég ugyanazt a sablonlistát látja | `3d12af1` | Cég-specifikus kulcs: `feladat_sablonok:{companyId}` a `rendszer_beallitas`-ban | ✔ |
| 12 | Szerződés-generátor megbízó adatai GLOBÁLISAK — minden cég a „eaisyDocs Zrt." nevében generált | `5f4e345` + `08d54af` | `resolveCompanyDetailsServer()` az aktív cég valódi adatait használja mind a 4 ponton (context, AI-prompt, PDF, iktatás) | ✔ |
| 13 | REST API v1 nyitott — nincs hitelesítés, bejelentkezés nélkül JSON adat | `677d256` | Supabase session VAGY Bearer API kulcs hitelesítés + cég-szűrés + UUID-validáció | ✔ |
| 14 | Selejtezési jegyzőkönyv PDF fejléce hardkódolt — a cég neve nem szerepel | `b45a8f6` | `resolveCompanyDetailsServer()` — a cég neve a rendszer-név ALATT jelenik meg (a megrendelő kérése: a rendszer-név maradjon) | ✔ |
| 15 | IMAP/e-mail csatorna nem cég-tudatos — minden levél a DB-default cégnél landolt, a harang-értesítés minden cégnek ment | `c345216` + `dce8953` + `ea97abc` | Új „Hitelesítő adatok" beállítás (ADR A-098): cégenkénti, AES-256-GCM titkosított IMAP + Brevo adatok; a worker postafiók-alapú cég-hozzárendeléssel dolgozik; értesítés és partner-feloldás cég-szűrt | ✔ |
| 16 | Audit napló: `.limit(500)` — 500 fölötti események soha nem látszottak; a cég-szűrőt a kliens diktálta; a kiküldési naplóban `company_id IS NULL` kiskapu (A-091 Docs-port hiánya) | `54855c6` + `f26508e` + `b253f4b` | Szerveroldali cég-tagság ellenőrzés, NULL-kiskapu zárva, explicit 1000-es limit (a megrendelő tudatos döntése: a legfrissebb 1000 esemény) | ✔ |
| 17 | Négyszem-elv beállítás GLOBÁLIS — B cég adminja átírhatta A cég selejtezési szigorát | `bf3a860` | Cég-specifikus kulcs (`negy_szem_elve_selejtezesnel:{companyId}`) a get/set párosban és a selejtezési motor olvasási pontján; régi globális kulcs átmeneti fallback | ✔ |
| 18 | AI-szerződés iktatása company_id nélkül — Teszt Kft-nél iktatott szerződés a Think AI iktatókönyvében landolt (ügy + ügyirat insert, irattári tétel keresés cross-tenant) | `bf3a860` | Aktív cég `company_id`-ja az ügy és ügyirat insertekbe + az irattári tétel keresés cég-szűrése | ✔ |
| 19 | Felelős-választó cég-tagság nélkül — a cégben NEM tagsággal rendelkező profilok is látszottak (pl. árva „Flotta kezelő Józsi") | `bf3a860` | A felhasználó-lista (ügyirat-adatlap + iktatókönyv) a `company_members` tagsági listájára szűkül | ✔ |

**Szabály:** ADR [A-097](architecture/decisions/A-097-use-server-exports-as-endpoints-deletion-and-guard-policy.md) — a `"use server"` exportok nyilvános végpontok: a halott action törlendő, az élő action kötelező szerveroldali őrblokkot kap.

---

## ✖ A MEGRENDELŐ ÁLTAL ELVETETT TALÁLATOK (2026.10.30. — tesztelve, nem hiba)

A statikus elemzés **false positive** találatjai — a megrendelő a futó rendszeren tesztelte és **nem reprodukálható**/szándékos viselkedés:

| # | Eredeti találat | Elvetés oka |
|---|---|---|
| 1 | `forceExpireAllDossiers` („Lejárt generálás") őrség nélkül éles UI-n | **Szándékos funkció** — a megrendelő megtartja, célja van |
| 2 | `selejtezett` ügyirat feltámasztható (Visszaállítás gomb) | **Nem reprodukálható** — a gomb nem jelenik meg selejtezett státusznál a felületen |
| 3 | Felelős mező mindig „Kiosztatlan" (adatlapon) | **Nem reprodukálható** — HR/2026/00044-nél rendesen kiírja a felelős nevét („Nagy Dániel") |
| 4 | Kimenő irat vázlat-törlése soha nem működik | **Nem reprodukálható** — a UI-ban nincs külön vázlat-törlési flow (a popup egyben küld és iktat) |
| 5 | Ő/ű betűk törlődnek a sablon-PDF-ekben | **Nem reprodukálható** — a megrendelő tesztelte, a PDF-ek rendesen generálódnak |
| 6 | Kölcsönzés határidő-figyelmeztetés hiányzik (BRD-005) | **Nem reprodukálható** — az értesítési rendszer működik, 6 típusú értesítés tesztelve |
| 7 | Partner adatlapon bizalmas iratok metaadatai a kliensnek | **Tudatos működés** — a dosszié (ügyirat) látszik a listában, de az iratok és PDF-ek minősítés szerint szűrve; a megrendelő szerint kárt nem okoz |
| 8 | A `/archive/print` oldal halott — soha nem tölt be | **Nem reprodukálható** — a megrendelő szerint megjelenik a nyomtatható jegyzőkönyv |
| 9 | Felelős-választó más cég felhasználóit listázza (cross-tenant) | **Nem reprodukálható eredeti formájában** — a megrendelő szerint csak a saját cég kollégái látszanak; UGYANAKKOR a cég-tagság hiánya miatt a cégben nem tagsággal rendelkező profilok (árva/legacy fiókok, pl. „Flotta kezelő Józsi") még látszottak — ez valós hibaként javítva (#19) |

---

## 0. Vezetői összefoglaló — mit tapasztaltunk nagyban

Az eaisyDocs **felületi és funkcionális rétege érett** (iktatási split-view, ügyirat-munkalap, négyszem-elvű selejtezés, AI szerződésgenerátor, keresés, kanban taskok — a dokumentált UX nagyrészt hűen implementálva, a Docs-UX akár jobban is áll, mint a HR-é). Ugyanakkor a mélyebb rétegekben **három rendszerszintű gyökérok** miatt a modul tényleges biztonsági és üzemeltetési érettsége jelentősen a funkcionális alatt van:

1. **A több-bérlős (multi-tenant) védelem az adatbázis rétegben soha nem érkezett meg a Docshoz.** A cég-oszlopokat 2026.10.08-án hozzáadták ugyan a táblákhoz, de a **RLS policy-ket nem frissítették** — így az iratok, ügyiratok, jegyzetek, kölcsönzések és a partnerek kapcsolattartói a mai napig cég-dimenzió nélkül állnak. A HR oldalán ez a réteg 2026.10.28-án megkapta a javítását; a Docs kimaradt belőle.
2. **A beállítások/cégkezelés mögötti action-ök jelentős résle guard nélkül, SERVICE ROLE kulccsal fut** — ugyanaz a minta, ami a HR `settings/actions.ts`-ében P0 volt. Itt audit-napló, osztályvezető-kinevezés, osztály- és felhasználókezelés érhető el ellenőrzés nélkül.
3. **Az éles üzemeltetési lánc Vercen szakadt:** az IMAP-érkeztetést és az AI-feldolgozást végző daemonok a felhőben nem futnak, az IMAP-cron nincs ütemezve, és az AI-sor claim-függvénye anonim kéréssel tartósan lebénítható. Vagyis **élesben az e-mail-érkeztetés és az AI/PDF-A feldolgozás jelenleg nem működik** — lokálisan minden működik, ami miatt ez fel sem tűnt.

**Mért átfogó érettség: ~68%** — a funkcionális ~80% mellett a biztonsági/üzemeltetési réteg ~55%-on áll. **Találatok: ~14 P0, ~58 P1, ~60 P2.**

---

## 1. A RENDSZERSZINTŰ GYÖKÉROKOK — emberi nyelven

### 1.1. [P0] A Docs RLS-ben nincs cég-dimenzió — a multi-tenant védelem félkész

**Hol:** `20260918000005_strict_confidential_rls.sql`, `20261008000001` (csak oszlop, policy nélkül), `20260718000000_add_comments_table.sql`, `20260714183741_enable_rls.sql`, `20260719065027`, `20260930000002_partner_expansion.sql`

**Mi lenne a jó működés:** Egy cég felhasználója kizárólag a saját cégének iratait, ügyiratait, jegyzeteit, kölcsönzéseit láthatja — az adatbázis szintjén garantáltan (RLS), ne csak a felületen.

**Mit tapasztaltunk:** A cég-oszlopokat bevezető migráció a **policy-ket nem frissítette**, a későbbi javítókörök (pl. `20261008000003`) pedig több táblát kihagytak. Így ma:
- az `irat`/`irat_fajl`/`ugyirat` fő policy-k csak szerepkör+minősítés+osztály alapján szűrnek — **B cég felhasználója látja és (megfelelő szerepkörrel) szerkeszti A cég iktatlan bejövő iratait**;
- az `ugyirat_megjegyzes` (belső jegyzetek!) táblán `USING (true)`/`WITH CHECK (true)` áll — **minden cég minden jegyzete mindenki számára olvasható és írható**;
- ugyanígy nyitott: `irat_kapcsolat`, `ugyirat_hozzaferes`, `irat_kolcsonzes_naplo` (személyes kölcsönzési adatok!), `selejtezés_tetel`;
- a `partner_kapcsolattarto` táblán ráadásul **anonim olvasási policy** van — a partnerek kapcsolattartóinak neve, e-mail címe és telefonszáma **publikusan, bejelentkezés nélkül letölthető**.

### 1.2. [P0] Guard nélküli SERVICE ROLE actionök a vezérlő rétegben

**Hol:** `src/app/settings/settings-actions.ts`, `src/app/settings/admin-actions.ts`

**Mi lenne a jó működés:** Osztályvezető kinevezése, osztály létrehozása/törlése, felhasználók kezelése, audit-napló olvasása — kizárólag adminisztrátorok által, a saját cégük kontextusában.

**Mit tapasztaltunk:** (a HR `settings/actions.ts` P0-mintájának pontos másai)
- `getGlobalisAuditNaplo`: **egyetlen hitelesítés nélkül** visszaad 200 audit-eseményt az ÖSSZES cégtől (IP-cím, User-Agent, indoklás);
- `setDepartmentLeader`: hitelesítés nélkül bárkit osztályvezetővé léptet — globálisan, a `felhasznalo_profil` felülírásával;
- `updateDepartment`/`deleteDepartment`, `addUsersToDepartment`/`removeUserFromDepartment`: **más cégek osztályai** módosíthatók/törölhetők;
- `createNewUser`: admin-ellenőrzés az action szintjén nincs, és az új felhasználó egyetlen céghez sem kerül hozzá.

### 1.3. [P0/P1] Az éles üzemeltetési lánc Vercen szakadt

**Hol:** `imap-worker.ts`, `ai-worker.ts`, `vercel.json`, `20260918000002` (claim_ai_tasks grant), `pdfa-converter.ts`

**Mi lenne a jó működés (A-009/A-021/A-061):** Az e-mailek 5 percenként érkeznek be, az AI-sor (OCR, metaadat, embedding, PDF/A) háttérben feldolgozódik, a megőrzési másolatok valódi PDF/A-2b formátumban készülnek.

**Mit tapasztaltunk:**
- A TSX daemonok (`imap-worker`, `ai-worker`) **csak lokálisan futnak** — Vercel serverless környezetben nem indulnak; a `vercel.json` csak a morning/nightly cronokat ütemezi, **az IMAP-cron nincs benne**, AI-feldolgozó végpont pedig nem létezik → **élesben az e-mail-érkeztetés és az AI/PDF-A sor nem dolgozik fel semmit**;
- a `claim_ai_tasks` SECURITY DEFINER függvény **anonim szereplőnek is futtatható** — egyetlen publikus kéréssel bárki minden függő feladatot „folyamatban"-ba zárolhat: **az AI-sor külső kéréssel tartósan lebénítható**;
- a PDF/A konvertálás Ghostscript nélkül csendben az **eredeti fájlt menti el `pdfa_path`-ként** — Vercelen `gs` nincs is telepítve, vagyis **élesben minden "PDF/A" valójában fallback**, jelölés nélkül (az A-010-es integritási garancia fikció).

### 1.4. [P1] A `company_id` sok helyen egyszerűen nem íródik be az új rekordokba

**Mi lenne a jó működés:** Minden új rekord a létrehozó felhasználó aktív cégéhez kerül.

**Mit tapasztaltunk:** Az adatbázis DEFAULTJA a migrációban rögzített „Think AI Kft." — és a következő útvonalak nem adják meg explicitán a céget: **IMAP-érkeztetett iratok** (soha nem jelennek meg a beérkező listában!), **AI-szerződés iktatása** (más tenant rekordjába kerül, a létrehozó nem is látja), **mentett keresések**, **jóváhagyott selejtezési csomagok** (a cég saját jegyzőkönyv-archívuma „eltűnik"), **irattári terv tételek**, **hotfolderes szkennelt iratok**.

### 1.5. [P1] Az A-091 audit-javítások nem lettek a Docs oldalra portolva

A HR `hr_esemeny_naplo`-jánál 2026.10.28-án javították: szerveroldali lapozás, szigorú cég-izoláció, NULL-kiskapu zárása. **A Docs `/audit` oldal mindhárom hibával ma is él**: `.limit(500)` + kliensoldali lapozás; `company_id IS NULL` kiskapu a Kiküldési Naplóban; cég-tagság ellenőrzése nélkül egy globálisan admin felhasználó az összes bérlő naplóját lekérheti. Ráadásul a Docs `esemeny_naplo`-ba sok insert **company_id nélkül** íródik, és **nincs BEFORE INSERT trigger** — ezek a bejegyzések soha nem jelennek meg a cég audit nézetében (audit-rés).

### 1.6. [P1] Globális `rendszer_beallítás` tábla multi-tenant rendszerben

A válaszlevél-sablonok, a szerződés-megbízó adatok, az egyedi szerződéssablonok, a feladatsablonok, a **négyszem-elv beállítása** és az értesítési szabályok mind egy közös, cég nélküli táblában/kulcson élnek: **B cég kikapcsolhatja A cég szigorú selejtezési módját**, elolvashatja/törölheti a másik cég sablonjait (jogi know-how), és a szerződések más cég fejlécadataival generálódnak.

### 1.7. [P1] A „service-role, ha az RLS elutasít" fallback-minta

A szerződés-actionökben és a PDF-végpontban: ha a hívó a RLS miatt nem látná a rekordot (mert pl. más cégé), a kód **admin-klienssel újrapróbálja** — azaz pont a tiltott hozzáférést biztosítja. Két contract-action ráadásul hitelesítés nélkül is futtatható (nem azonosított Gemini-hívások).

---

## 2. MODULONKÉNTI ELEMZÉS

### 2.1. Beérkeztés, érkeztetés, iktatás — mért: ~72–75%

**Mi működik jól:** A split-view iktatóképernyő, a többcsatolmány-kezelés, a kereshető ügyirat-kiválasztó (P-101), az elválasztólapos szkenner és a spam-előszűrés a dokumentációhoz híven kiépítve; a `/inbox/view/[id]` redirect hibátlan.

**Legkritikusabb találatok:**
- **[P0]** `/api/pdf/[id]`: iktatlan (inbox) elemeknél a szervezeti ellenőrzés kimarad, és letöltési hibánál service-role fallback → más cég bejövő számlája URL-találgatással letölthető;
- **[P0]** A fő iktatási művelet (`fileIncomingDocument`): szerepkör- és cég-ellenőrzés nélkül, versenyhelyzettel (két párhuzamos mentés → duplikált alszám); az erre készült atomi RPC-t a fő útvonal nem is használja; RPC-hibánál az iktatószám „elveszik" (lyuk a sorozatban — az A-006 gap-mentes elv sérül a fő folyamatban);
- **[P1]** A „Levelek szinkronizálása" gomb action-je: guard nélküli service role (betekintő is kényszeríthet érkeztetést);
- **[P1]** Az e-mail csatorna multi-tenant módban **funkciózóképtelen** (company_id nélküli insert) — lokálisan, egy cégnél látszólag működik, ezért nem tűnt fel;
- **[P1]** A Realtime inbox-csatorna cég-szűrés nélkül más cég iktatlan iratainak metaadatait szúrja be a listába;
- **[P1]** A dokumentum-előnézet iframe-je **sandbox nélkül** futtatja a beérkezett HTML-csatolmányokat (tárolt XSS);
- **[P1]** eaisyBill import: a számla adatait a kliens küldi (szerver nem validálja), a külső fájl-URL-t a szerver feltölti (SSRF felület);
- **[P1]** Random érkeztetőszám-fallbackok (pl. `E/2026/48213`) szennyezik a hivatalos sorozatot.

### 2.2. Iktatókönyv és Ügyirat-adatlap — mért: ~80%

**Mi működik jól:** A feladatfül (P-092/093/094) kiemelkedően teljes (varázsló, KPI, kanonikus táblázat, auto-archívum, szerveroldali elutasítás-ellenőrzés); a jegyzetek és a polimorf kapcsolatok is a dokumentációhoz közeli állapotban.

**Legkritikusabb találatok:**
- **[P0]** Belső jegyzetek (`ugyirat_megjegyzes`) cégizoláció nélkül — l. 1.1;
- **[P0]** Válaszlevél-sablonok: cég nélküli globális kulcs + guard nélküli service-role írás — betekintő is törölheti más cég hivatalos sablonjait;
- **[P1]** **Az életciklus-állapotgép szerveroldalon nincs kikényszerítve** (a backlog B2 pontjának pontosítása): irattárból/lezártból/már selejtezettből is kényszeríthető „ügyintézés alatt"; a lezárás átugorható (elintézetlen ügyirat is irattárba zárható);
- **[P1]** Expediálás: más ügyirat (akár szigorúan bizalmas) iratának csatolása ellenőrizetlenül — a fájl e-mailben kikerül;
- **[P1]** A vázlat-törlés **soha nem működik** (halott feltétel miatt minden kimenő irat „törölhetetlen");
- **[P1]** Sablonból generált PDF-ekben **az ő és ű betűk néma törlése** („előírás" → „elrs") — hivatalos levelek tartalmi károsodása;
- **[P1]** Az adatlap Felelős mezője mindig „Kiosztatlan" (reláció nincs betöltve — a listán jó);
- **[P1]** Felelős-kiosztás és explicit hozzáférés-megosztás: a címzett nincs cégtagság-ellenőrizve (más cég userjének adható jog/értesítés); a P-022 ígérte jogosultsági szintek és lejárat nincs implementálva;
- **[P2]** Felhasználói listák (felelős-választó, @említés) cég-szűrés nélkül; „nem található ügyirat" ág elárulja más cég iktatószámát; filter-injekció az URL-id-ből.

### 2.3. Digitális Irattár, Selejtezés, Fizikai irattár — mért: ~71% (fizikai: 68%, irattári terv: 62%)

**Mi működik jól:** A négyszem-elv logikája kétféle forrásból, konfigurálhatóan, RLS-kapcsolóval; a jegyzőkönyv-PDF tartalmas és tesztelt; a fizikai hely combobox és a megjegyzés-perzisztencia (A-055) rendben.

**Legkritikusabb találatok:**
- **[P1]** Jóváhagyott selejtezési csomagok **company_id nélkül** keletkeznek → nem-default cégnél a cég saját jegyzőkönyv-archívuma láthatatlan;
- **[P1]** Jegyzőkönyv-letöltés: **hitelesítés- és cég-ellenőrzés nélküli** aláírt URL bármihez;
- **[P1]** **Már megsemmisített ügyirat feltámasztható** (a „Visszaállítás" gomb `selejtezett` státusznál is él, és közben törli a selejtezési tétel audit-sorait) — jogi véglegesség sérül;
- **[P1]** „Lejárt generálás" gomb: *„Teszt célból"* kommenttel, de **éles UI-n, szerepkör-ellenőrzés nélkül** — egy kattintással a cég ÖSSZES ügyirata irattárba zárható tegnapi megőrzési határidővel;
- **[P1]** A négyszem-elv beállítása és az értesítési szabályok **globálisak** (B cég kikapcsolhatja A cég szigorát);
- **[P1]** Kölcsönzési napló cégizoláció nélkül; a BRD-005 által ígért **kölcsönzés-figyelő cron nem létezik** (lejárt kölcsönzést csak akkor jelez egy piros badge, ha valaki épp nézi az adatlapot);
- **[P2]** A megőrzési idő lejárta szerveroldalon nincs kikényszerítve (nem lejárt ügyirat is selejtezhető); a jegyzőkönyv fejléce hardkódolt „eaisyDocs Elektronikus Iratkezelő Rendszer" (a `resolveCompanyDetailsServer` nincs bekötve); a `/archive/print` oldal halott (senki nem írja az olvasott localStorage kulcsot).

### 2.4. Partnerek, Szerződésgenerátor, Szabályok, Keresés, Embed, REST API — mért: partner 85%, szerződés 80%, szabályok 80%, keresés 75%, embed 30%, API 25%

**Mi működik jól:** A partnerlista/adatlap funkcionálisan gazdag; a hibrid (unaccent+pgvector) keresés kiemelkedő és RLS-t tisztelő (`SECURITY INVOKER`); a szabálymotor ékezetfüggetlen; az eaisyBill partner-import deduplikációja az ADR-nek megfelelő.

**Legkritikusabb találatok:**
- **[P0]** Partner-kapcsolattartók **anonimul olvashatók** (l. 1.1) — név+e-mail+telefon publikusan dumpolható;
- **[P0]** Szerződés-actionök: „RLS-elutasítás → service-role fallback" + két action hitelesítés nélkül → idegen cég partnerének teljes törzsadata, nem azonosított Gemini-hívás;
- **[P0]** Mentett-keresés riasztások: a motor az **összes cég** kereséseit és iratait vizsgálja cég-egyezés nélkül → B cég új iratáról megy az értesítés A cég userének, idegen iktatószámmal és tárggyal;
- **[P1]** Az embed widget **se biztonságos (nincs token), se működő** (a globális X-Frame-Options letiltja) — a dokumentált funkció kettős értelemben sem teljesül;
- **[P1]** A szerződés-iktatás company_id nélkül iktat (l. 1.4); a megbízó-adatok és egyedi sablonok **globálisak** (más cég fejlécével generálódik a szerződés);
- **[P1]** `scope=all` iktatási szabályt **bármely cég bármely tagja** létrehozhat — más cégek irataira ható szabályokkal;
- **[P1]** A partner-adatlap a bizalmas iratok metaadatait is elküldi a kliensnek (minősítés-szűrés csak kliensoldali); a kereső nem szűr minősítésre;
- **[P2]** Az A-023 ígérte adószám-validáció szerveroldalon nincs meg; a REST API v1 Bearer-hitelesítése papíron létezik csak (nyílt demó); a `sha256` az eaisyBill-importoknál a számla **ID-jének** hasha, nem a fájlé.

### 2.5. Háttérfolyamatok, Workerek, Cronok, PDF — mért: ~63%

L. az 1.3-as gyökérokot (éles üzemeltetési lánc). Továbbiak:
- **[P1]** Az éjszakai cron **cégizoláció nélkül** küld minden cégnek minden cég lejárt ügyiratait (GDPR-érzékeny nevekkel a HR-blokkokban); a reggeli SMS aláírása hardkódott „Think AI Kft.";
- **[P1]** IMAP: nincs duplikáció-védelem (hiba után újra-érkeztetés új sorszámokkal), nincs csatolmány-méretlimit, a partner-feloldás a **többi cég partnerei között** is keres;
- **[P2]** CRON_SECRET nem timing-safe és query-paramként is átadható; a PDF-végpont Gemnini-tájolásérzékelése gyorsítótár nélkül minden megtekintésnél fut (költségi visszaélés); a vízjelezett ág elveszíti az elforgatott PDF-eket.

### 2.6. Vezérlő réteg (Dashboard, Tasks, Cégkezelés, Settings, Audit) — mért: dashboard 80%, tasks 75%, cégkezelés 65%, settings 45%, audit 55%

**Mi működik jól:** A dashboard a cég-szűrést és a React 19-es diagram-stabilizációt megkapta; a tasks modul UX-e (3 nézet, delegálás, elutasítási indok) a PRD-khez hű.

**Legkritikusabb találatok:**
- **[P0]** Az 1.2-es gyökérok öt action-je;
- **[P1]** **Jogosultság-eszkalációs lánc:** a cég-owner kioszthat „Rendszergazda" docs-szerepkört → az a cég-törlésnél **globális** rendszergazdaként él → bármely cég törölhető; a szerepkör-változtatás a **globális profilt** is felülírja (a user minden más cégbeli joga átíródik);
- **[P1]** Az 1.5-ös audit-rések (A-091 Docs-port hiánya);
- **[P1]** Cég-törlés: kaszkádosan törli az eseménynaplót is, jogi-megőrzési ellenőrzés és a törlésről szóló audit-bejegyzés nélkül;
- **[P2]** Kanban 24h-os ablak nem időzóna-biztos, és az ígért „régebben elvégzett" lábléc hiányzik; a feladatlisták címzettjei cégszűrés nélkül; natív `confirm()` a delegálásnál; a dashboard limit nélkül tölti le a teljes táblákat.

---

## 3. ÖSSZESÍTŐ ÉRETTSÉGI MÁTRIX

| Modul | Funkcionális | **Mért összesen** | Kulcsindok |
|---|:---:|:---:|---|
| Inbox lista + realtime | ~90% | **75%** | RLS cég-dimenzió hiánya, realtime szivárgás |
| Iktatás (split-view) | ~88% | **70%** | fő útvonal nem atomi, guard nélkül, XSS-iframe |
| Szkenner/hotfolder | ~85% | **75%** | cég-hozzárendelés, validáció hiánya |
| IMAP/e-mail csatorna | ~75% | **60%** | multi-tenant módban használhatatlan; élesben nem is ütemezett |
| eaisyBill csatorna | ~80% | **65%** | kliens-diktálta adatok, fuzzy párosítás |
| Iktatókönyv lista | ~90% | **85%** | felhasználói listák cég-szűrése |
| Ügyirat-adatlap | ~88% | **80%** | jegyzet-RLS, állapotgép, felelős-név |
| Kimenő iratok | ~78% | **70%** | halott vázlat-törlés, ő/ű-törlés, IDOR |
| Irattár + selejtezés | ~85% | **80%** | csomag-company_id, feltámasztás, globális négyszem |
| Jegyzőkönyv/PDF | ~80% | **72%** | hardkódolt cégnév, halott print oldal |
| Irattári terv | ~75% | **62%** | guard nélküli CRUD, propagáció hiánya |
| Fizikai + kölcsönzés | ~80% | **68%** | figyelő-cron hiánya, napló-izoláció |
| Partnerek | ~92% | **85%** | anon-kapcsolattartók, validációk |
| AI szerződésgenerátor | ~88% | **80%** | fallback-minta, globális sablonok |
| Szabályok (rules) | ~88% | **80%** | scope=all kereszt-tenant |
| Keresés + alertek | ~88% | **75%** | minősítés-szűrés, alert cégizoláció |
| Embed widget | ~50% | **30%** | nincs token + frame-tiltás |
| REST API v1 | ~40% | **25%** | Bearer auth nincs implementálva |
| Workerek/cronok/PDF | ~80% | **63%** | éles futtatás nulla, anon-DoS, PDF/A-fikció |
| Dashboard | ~90% | **80%** | limit nélküli betöltés |
| Tasks | ~85% | **75%** | P-091 részletek, cég-scope-ok |
| Cégkezelés | ~85% | **65%** | eszkalációs lánc |
| Settings (docs) | ~70% | **45%** | 5 db guard nélküli service-role action |
| Audit (docs) | ~90% | **55%** | A-091 mindhárom javítása hiányzik |

**Átfogó: ~68%** — **Találatok: ~14 P0, ~58 P1, ~60 P2.**

---

## 4. JAVÍTÁSI PRIORITÁSI SORREND (javaslat)

1. **Docs RLS multi-tenant csomag** — company_id dimenzió a fő policy-kbe + a nyitott táblák (`ugyirat_megjegyzes`, `irat_kapcsolat`, `ugyirat_hozzaferes`, `irat_kolcsonzes_naplo`, `selejtezés_tetel`, `partner_kapcsolattarto` — az anon policy azonnali drop) + `esemeny_naplo` BEFORE INSERT cég-trigger (a HR-migráció mintájára). *Egyetlen migrációs csomag a P0-k jelentős részét zárja.*
2. **Settings/cégkezelés SERVICE-ROLE guard-sweep** — az öt P0 action azonnali védése/törlése + az eszkalációs lánc (rendszergazda-kiosztás, globális profil-felülírás) elvágása.
3. **Éles üzemeltetési döntés és végrehajtás** — `/api/cron/imap` ütemezése + AI-worker cron-végpont (vagy külső always-on worker host); `claim_ai_tasks` anon-grant visszavonása; PDF/A fallback jelölése.
4. **company_id explicit minden insertnél** — IMAP, szerződés-iktatás, mentett keresés, selejtezési csomag, irattári terv, hotfolder (+ cím→cég mapping az IMAP-hoz).
5. **A-091 Docs-port** — audit szerveroldali lapozás, NULL-kiskapu zárása, cég-tagság alapú jogosultság.
6. **Globális rendszer_beallítás cégesítése** — sablonok, megbízó-adatok, négyszem-kapcsoló, értesítési szabályok cégfüggővé tétele.
7. **Állapotgép + selejtezés hardening** — átmenet-tábla, `selejtezett` terminálissá tétele, „Lejárt generálás" eltávolítása éles UI-ról, megőrzési idő szerveroldali ellenőrzése.
8. **Fallback-minták és külső importok** — „RLS-fail → service-role" eltávolítása (contract-actions, PDF route), eaisyBill szerveroldali visszavalidálása, embed-token megvalósítása.

---

## 5. MEGJEGYZÉSEK

- Az elemzés **nem módosított semmit** a kódban.
- A találatok statikus elemzésből származnak — a P0-jelölteket javítás előtt érdemes gyors manuális teszttel is megerősíteni (pl. második cég fiókjával, vagy a Supabase anon kulccsal a `partner_kapcsolattarto` policy esetén).
- Pozitív ellenpéldák (működnek és a dokumentációnak megfelelnek): a hibrid kereső RPC (RLS-t tisztelő), az eaisyBill partner-dedup, a spam-szűrés, a DossierSearchSelector, az ügyirat-feladatfül, a React 19-es diagram-stabilizáció a dashboardon.
- A Docs-oldal `felhasznalo_profil` táblán `USING (true)` SELECT-policy áll — ennek cég-alapú szűkítése több cross-tenant értesítési/lista problémát (1.4-gyel együtt) gyökerében áll; a javításkor a `company_members`-alapú policy minta ajánlott.
