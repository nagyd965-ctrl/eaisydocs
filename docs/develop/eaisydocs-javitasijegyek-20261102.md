# eaisyDocs — 4. körös audit javításijegyei (2026.11.02) — 5-ÖS CSOMAGOKBA RENDEZETT VÉGREHAJTÁSI TERV (Legkönnyebbtől a Legsúlyosabbig)

> **Forrás:** `docs/develop/eaisydocs-erettsegi-vegmeres-20261102.md` + élő kód-verifikáció (2026.11.02)
> **Cél:** a maradék P1/P2 tételek szisztematikus lezárása **7 db 5-ös csomagban (35 pont)**, a legkönnyebb, 1–5 soros javításoktól a legkomplexebb, adatbázis-migrációt is igénylő feladatokig.
> **Módszertani szabályok (KÖTELEZŐ):**
> 1. Policy-neveket mindig az **élő `pg_policies`-ből** másold, sose emlékezetből; minden RLS-migráció végén **önellenőrző DO-blokk** (`RAISE EXCEPTION`, ha váratlan policy marad).
> 2. **Már lefutott migrációs fájlt NE szerkeszd utólag** — minden DB-változás új `20261103…` fájlba kerül.
> 3. A [`vercel.json`](../../vercel.json) `"0 6 * * *"` ütemezéséhez **TILOS hozzányúlni** (Vercel Free csomag korlát miatt szándékosan napi 1x fut).
> 4. Minden 5-ös csomag végén kötelező a teljes teszt-suite (`npx tsx --test src/utils/__tests__/*.test.ts`) és a `npx tsc --noEmit` ellenőrzés.

---

## Már elvégzett és élőben aktivált javítások (2026.11.02)

- **J-27a [KÉSZ]:** A `public.log_audit_event()` triggerfüggvényben (`20261102000003_separate_hr_and_docs_audit_logs.sql`) a `TG_TABLE_NAME LIKE 'hr_%'` események a `public.hr_esemeny_naplo` táblába (`regi_adat`/`uj_adat`) kerülnek átirányításra; az append-only `esemeny_naplo` táblában lévő 796 db historikus `hr_%` sor az adatbázisban marad, és az `/audit` lekérdezésben (`audit/actions.ts`) alkalmazásszintű `.not("entitas_tipus", "ilike", "hr_%")` szűrés rejti el őket + `elerheto_modulok` `'docs'` szűrés a felhasználói listákban (`dossiers/page.tsx`, `company-server.ts`, `docs-auth-guard.ts`, `company-actions.ts`).
- **J-28 [KÉSZ]:** A `public.log_audit_event()` triggerfüggvény az új `UPDATE` eseményeknél kiszűri az `embedding` és `kereso_vektor` technikai háttér-frissítéseket (az append-only `esemeny_naplo` táblában lévő 579 db historikus technikai sor az adatbázisban marad, az `audit/actions.ts` `isPureTechnicalNoopUpdate` szűrője alkalmazásszinten rejti el őket) + a nyers JSON pop-up lecserélése 3 oszlopos magyar nyelvű változástáblázatra (`audit/page.tsx`, `audit-log-formatter.ts`).

---

## 1. CSOMAG (1–5. pont) — Legkönnyebb, 1–5 soros védelmi javítások (0 adatbázis-kockázat) [KÉSZ — 2026.11.02]

### 1. pont (eredeti: J-14) [KÉSZ] — GDPR cron végpont védelme hiányzó környezeti változó esetén
- **Fájl:** `src/app/api/cron/gdpr-anonymize/route.ts:20-23`
- **Mi a jelenlegi probléma?** A kód jelenleg csak azt nézi, hogy `if (secret !== process.env.CRON_SECRET)`. Ha egy környezetben véletlenül nincs beállítva a `CRON_SECRET` változó (`undefined`), akkor a paraméter nélkül meghívott URL-ben a `secret` is `undefined`/`null` lehet, így az összehasonlítás átengedheti a kérést.
- **Javítás:** Ugyanúgy, ahogy a többi cron végpontban már szerepel, kötelezővé tesszük a változó meglétét: `if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return 401`.

### 2. pont (eredeti: J-12) [KÉSZ] — Felhasználók osztályhoz rendelésekor (`addUsersToDepartment`) cégtagság-szűrés
- **Fájl:** `src/app/settings/settings-actions.ts:823-867`
- **Mi a jelenlegi probléma?** Az osztály-adminisztrátor kijelölhet felhasználókat, akiket hozzáad egy szervezeti egységhez. A kód `supabaseAdmin` (service_role) klienssel frissíti a kapott `userIds` listát, de nem szűri le, hogy ezek a felhasználók valóban tagjai-e az aktív cégnek (`company_members`).
- **Javítás:** A frissítés előtt lekérdezzük az aktív cég `company_members` tagjait, és csak azokat a `userIds` elemeket engedjük frissíteni, akik tényleg a céghez tartoznak.

*(Megjegyzés: a korábbi `J-3` [`getEaisyBillCompaniesAction` céglista szűkítése] törölve a hibalistáról — üzleti döntés alapján a „Cég hozzáadása -> eaisyBill import” ablakban az adminisztrátoroknak továbbra is látniuk kell az összes [121] eaisyBill vállalatot, ehhez a működéshez tilos hozzányúlni.)*

### 3. pont (eredeti: J-8) [KÉSZ] — Irattári teszt-lejárató gomb (`forceExpireAllDossiers`) szerepkör- és cégvédelme
- **Fájl:** `src/app/archive/actions.ts:7-35`
- **Mi a jelenlegi probléma?** Ez a funkció tesztelési célból minden ügyirat megőrzési idejét tegnapra állítja. Jelenleg csak azt ellenőrzi, hogy be van-e jelentkezve valaki (`auth.getUser()`), de azt nem, hogy adminisztrátor-e, és ha az `activeCompanyId` valamiért üres, akkor cég-szűrés nélkül futna le.
- **Javítás:** Bekötjük a `requireDocsAuthServer(["admin", "rendszergazda"], activeCompanyId)` ellenőrzést, és ha nincs `activeCompanyId`, azonnal hibával térünk vissza.

### 4. pont (eredeti: J-10) [KÉSZ] — Új szervezeti egység létrehozásának (`createDepartment`) admin-ellenőrzése
- **Fájl:** `src/app/settings/settings-actions.ts:489-555`
- **Mi a jelenlegi probléma?** A fájlban már létezik a `requireDepartmentAdminAccess()` segédfüggvény (amely ellenőrzi, hogy a hívó a cég adminja-e), és a módosítás/törlés használja is, de magából a `createDepartment` (új osztály létrehozása) függvényből kimaradt a meghívása.
- **Javítás:** A `createDepartment` elejére bekötjük a `requireDepartmentAdminAccess()` ellenőrzést, valamint ellenőrizzük, hogy a megadott szülő-osztály (`szulo_id`) és vezető (`vezeto_id`) is az aktív céghez tartozik-e.

### 5. pont (eredeti: J-11) [KÉSZ] — Csapattagok lekérdezése (`getTeamMembers`) bejelentkezés és aktív cég nélkül ne adjon vissza adatot
- **Fájl:** `src/app/settings/settings-actions.ts:123-172`
- **Mi a jelenlegi probléma?** A `getTeamMembers` függvénynek nincs az elején `auth.getUser()` ellenőrzése, és ha `activeCompanyId` értéke `null`, akkor kihagyja a cégre szűrést, és visszaadja az adatbázis összes felhasználói profilját.
- **Javítás:** Kötelező `auth.getUser()` ellenőrzés a függvény elején, és ha nincs `activeCompanyId`, azonnal üres listával (`{ profiles: [] }`) térünk vissza.

---

## 2. CSOMAG (6–10. pont) — Gyors cég- és jogosultság-ellenőrzések a meglévő akciókban [KÉSZ — 2026.11.03]

### 6. pont (eredeti: J-192) [KÉSZ] — `getImportableEaisyBillInvoices` szerepkör-ellenőrzés (`requireDocsAuthServer`)
- **Fájl:** `src/app/inbox/eaisybill-actions.ts:40-49`
- **Mi a jelenlegi probléma?** Az eaisyBill számlák listázása a Bejövő sorban jelenleg csak azt ellenőrzi, hogy be van-e jelentkezve a felhasználó (`auth.getUser()`), de azt nem, hogy van-e érkeztetési jogosultsága (`admin`, `rendszergazda`, `iktato`) az aktív cégben.
- **Javítás:** Bekötjük a `requireDocsAuthServer(["admin", "rendszergazda", "iktato"], activeCompanyId)` ellenőrzést (ugyanúgy, mint a számla-importáló `importInvoiceFromEaisyBill` függvényben).

### 7. pont (eredeti: J-29) [KÉSZ] — Explicit ügyirat-hozzáférés, kölcsönzés és selejtezési értesítés célfelhasználóinak cég- és modul-szűrése
- **Fájlok:** `src/app/dossiers/[id]/access-actions.ts:116-142`, `src/app/dossiers/borrow-actions.ts:9-68`, `src/app/archive/disposal-actions.ts:115-140`
- **Mi a jelenlegi probléma?**
  1. Egy ügyirathoz explicit hozzáférést adó (`grantDossierExplicitAccess`) és iratot kölcsönző (`borrowDocument`) függvény nem ellenőrzi, hogy a kiválasztott személy tagja-e a cégnek és van-e `'docs'` modul-hozzáférése (így akár egy csak HR-es dolgozónak vagy más cég tagjának is adható lenne jog).
  2. A selejtezési javaslat beküldésekor (`proposeDisposal`) az értesítendő vezetők listáját globálisan kéri le a `felhasznalo_profil`-ból, cég-szűrés nélkül.
- **Javítás:** Mindhárom helyen kötelezővé tesszük az aktív cég `company_members` tagságának és a `'docs'` modul meglétének ellenőrzését (ugyanúgy, ahogy a helyettesítéseknél a `substitution-actions.ts:25-47`-ben már működik).

### 8. pont (eredeti: J-32) [KÉSZ] — Irattár, Ügyirat-adatlap és Dashboard lekérdezések pontosítása
- **Fájlok:** `src/app/archive/page.tsx:67-79`, `src/app/dossiers/[id]/page.tsx:136-152`, `src/app/(dashboard)/page.tsx:50-86`
- **Mi a jelenlegi probléma?**
  1. Az Irattár oldalon (`archive/page.tsx`) a selejtezési csomagokhoz a felhasználóneveket a teljes `felhasznalo_profil` táblából tölti be cég-szűrés nélkül.
  2. Az Ügyirat-adatlapon (`dossiers/[id]/page.tsx`) a „Hozzáférés megtagadva” képernyő admin klienssel kiolvassa és kiírja az ügyirat iktatószámát akkor is, ha az egy másik cég ügyirata.
  3. A Dashboardon (`(dashboard)/page.tsx`) a `rawIratok`, `rawUgyiratok` és `rawTasks` lekérdezéseken nincs `.limit()`, ami sok irat esetén lassulást okozhat.
- **Javítás:** Az Irattárban csak a csomagokban ténylegesen szereplő user ID-k neveit kérjük le; az Ügyirat-adatlapon a „Hozzáférés megtagadva” ágon ellenőrizzük, hogy az ügyirat az aktív céghez tartozik-e; a Dashboard lekérdezésekre ésszerű `.limit(2000)` korlátot teszünk.

### 9. pont (eredeti: J-34) [KÉSZ] — Ügyirat-műveletek 4 üzleti logikai javítása (`markNotesRead`, `savePartnerCentralEmail`, `assignDossier`, `dismissInboxItem`)
- **Fájlok:** `src/app/dossiers/[id]/actions.ts:662-689, 1394-1415`, `src/app/dossiers/dossier-actions.ts:52-84`, `src/app/inbox/inbox-dismiss-actions.ts:11-88`
- **Mi a jelenlegi probléma?**
  1. *(Megtartva üzleti döntés alapján: a `deleteOutgoingDocument` (`actions.ts:1556`) továbbra is védi az `alszam`-mal rendelkező kimenő iratokat a sorszámfolytonosság megőrzése érdekében.)*
  2. `markNotesRead` (`actions.ts:662`): ellenőrzi a bejelentkezést, de azt nem, hogy a felhasználó láthatja-e az ügyiratot.
  3. `savePartnerCentralEmail` (`actions.ts:1394`): ha nincs `activeCompanyId`, cég-szűrés nélkül frissítene.
  4. `assignDossier` (`dossier-actions.ts:54`): szignáláskor nem ellenőrzi, hogy a kijelölt felelős (`felelos_user_id`) tagja-e az ügyirat cégének és van-e `'docs'` modul-hozzáférése.
  5. `dismissInboxItem` (`inbox-dismiss-actions.ts:51`): a „Nem iktatandó” indoklással felülírja az irat eredeti `leiras` mezőjét ahelyett, hogy hozzáfűzné, és az `esemeny_naplo` beszúrásból hiányzik a `company_id`.
- **Javítás:** A `markNotesRead`, `savePartnerCentralEmail`, `assignDossier` és `dismissInboxItem` pontokon pótoljuk a cég- és jogosultság-ellenőrzést, a `leiras` megőrzését, valamint a `company_id` naplózását.

### 10. pont (eredeti: J-31) [KÉSZ] — Egységes cég-szintű szerepkör-kapu (`requireDocsAuthServer`) pótlása 6 helyen
- **Fájlok:** `src/app/inbox/batch-actions.ts:10-20, 97-105`, `src/app/inbox/inbox-dismiss-actions.ts:28-36, 98-106`, `src/app/audit/actions.ts:107-122, 381-396`, `src/app/inbox/eaisybill-actions.ts:43-49`, `src/app/embed/partner-dossiers/page.tsx:30-45`, `src/app/dossiers/[id]/viewer-actions.ts:20-38`
- **Mi a jelenlegi probléma?** Ezeken a pontokon a kód még a régi módszerrel, közvetlenül a `felhasznalo_profil.docs_szerepkor` globális mezőt olvassa ki a cég-specifikus `requireDocsAuthServer` / `getActiveCompanyMemberRolesServer` helyett, a `viewer-actions.ts` pedig sikertelen jogosultság esetén is továbbengedheti a folyamatot a naplózásig.
- **Javítás:** Mind a 6 helyen átállunk a kanonikus `requireDocsAuthServer` / `getActiveCompanyMemberRolesServer` ellenőrzésre.

---

## 3. CSOMAG (11–15. pont) [KÉSZ — 2026.11.03] — Bemeneti validációk, eaisyBill határzár és felhasználó-törlés

### 11. pont (eredeti: J-33) [KÉSZ] — Bemeneti validációk: minősítés-whitelist, keresőkifejezés-tisztítás és köteg-PDF korlát
- **Fájlok:** `src/app/inbox/batch-actions.ts:32-48`, `src/app/inbox/actions.ts:27`, `src/utils/batch-scanner.ts:129-142, 477`, `src/app/inbox/filing-actions.ts:819, 874`, `src/app/inbox/page.tsx:82-83`
- **Mi a jelenlegi probléma?**
  1. A kötegelt és egyedi érkeztetésnél a `minosites` mezőt ellenőrzés nélkül fogadja el az űrlapból (whitelist hiányzik).
  2. A `filing-actions.ts` és `inbox/page.tsx` `.or()` kereséseiben a zárójel/vessző karakterek (`[,().%\\]`) nincsenek kiszűrve, ami hibás PostgREST lekérdezést okozhat, ha a tárgyban vagy számlaszámban zárójel van.
  3. A kötegelt PDF feltöltésnél (`batch-actions.ts`) nincs bekötve a `validateUploadedDocument` (50 MB méret- és 300 oldalas korlát).
- **Javítás:** Whitelist (`["nyilt", "belso", "bizalmas", "szigoruan_bizalmas"]`) a minősítésre, speciális karakterek tisztítása az `.or()` keresések előtt (`%` karakter szóközre cserélésének funkcionális tesztelésével), és `validateUploadedDocument` + `MAX_BATCH_PAGES = 300` oldalszám-korlát a kötegelt PDF-re.

### 12. pont (eredeti: J-1) [KÉSZ] — eaisyBill partner-import: szerveroldali forrás-cég ellenőrzés
- **Fájl:** `src/app/partners/eaisybill-partner-actions.ts:354-364`
- **Mi a jelenlegi probléma?** Amikor a felhasználó partnereket importál az eaisyBill-ből, a felület csak a saját cég partnereit mutatja, de maga a szerveroldali `importEaisyBillPartnersAction` függvény csak `.in("id", partnerIds)` szűrést végez a `service_role` klienssel. Ha valaki közvetlenül meghívja a végpontot idegen ID-kkal, más eaisyBill-cég partnereit is beemelhetné.
- **Javítás:** Lekérdezéskor kötelezően hozzátesszük a `.eq("company_id", eaisybillCompanyId)` feltételt és a `requireDocsAuthServer(["admin", "rendszergazda", "iktato"], activeCompanyId)` ellenőrzést (ha a cég nincs eaisyBill fiókhoz kötve, hibaüzenettel megállítjuk).

### 13. pont (eredeti: J-2 + J-191) [KÉSZ] — eaisyBill számla-import: szigorú cég-kötés és pontos (teljes 10+ jegyű / 8 jegyű) adószám alapú cégpárosítás
- **Fájl:** `src/app/inbox/eaisybill-actions.ts:55-90, 164-185` (valamint `src/app/partners/eaisybill-partner-actions.ts:84-112`)
- **Mi a jelenlegi probléma?**
  1. Számla importálásakor (`importInvoiceFromEaisyBill`), ha a cégnek még nincs `eaisybill_company_id`-ja, a kód kihagyja a `company_id` ellenőrzést, és ha nem találja a számlát, a `verifiedInvoice || invoice` sorral visszaesik a böngészőből küldött adatra.
  2. A `getImportableEaisyBillInvoices` automatikus cégpárosítása (`:69-86`) laza név-hasonlóság (`ilike %név%`) alapján is összekötheti és elmentheti a két céget.
- **Javítás:** Kötelező `eaisybill_company_id` ellenőrzés, a `|| invoice` fallback törlése (`if (!verifiedInvoice) return { success: false, ... }`), és az automatikus cégpárosítás korlátozása kizárólag adószám-egyezésre: ahol mindkét oldalon megvan a teljes (`>= 10` számjegyű) magyar adószám, ott **teljes egyezést** (`billCleanTax === cleanTax`) követelünk meg, és csak 8 jegyű törzsszám esetén használjuk a 8 jegyű egyezést (név alapján soha nem mentünk automatikus cég-összekötést).

### 14. pont (eredeti: J-7) [KÉSZ] — Felhasználó törlése (`deleteUser`): cégtagság-ellenőrzés és eseménynaplózás
- **Fájl:** `src/app/settings/settings-actions.ts:689-741`
- **Mi a jelenlegi probléma?** A `deleteUser` függvény jelenleg globális profil alapján engedélyezi a törlést, nem ellenőrzi, hogy a törlendő felhasználó egyáltalán az aktív cég tagja-e (és nem tagja-e egy másik cégnek is), valamint nem készít bejegyzést az `esemeny_naplo` táblába.
- **Javítás:** Ellenőrizzük a `requireDocsAuthServer(["admin", "rendszergazda"], activeCompanyId)` kapuval, hogy a hívó az aktív cég adminisztrátora-e, a célfelhasználó tagja-e az aktív cégnek (`company_members`), ha más cégnek is tagja (`otherMemberships.length > 0`), csak az aktív cégből távolítjuk el a teljes fióktörlés helyett, és minden esetben rögzítjük a műveletet az `esemeny_naplo`-ban (`company_id: activeCompanyId`).

### 15. pont (eredeti: J-4) [KÉSZ] — REST API v1 (`/api/v1/ugyiratok`) Bearer-kulcs env-first cég-kötése és lekérdezési korlátja
- **Fájlok:** `src/app/api/v1/ugyiratok/route.ts:16-70`, `src/app/api/v1/ugyiratok/[id]/eletciklus/route.ts:18-55`
- **Mi a jelenlegi probléma?** Ha egy külső rendszer `Bearer` API-kulccsal hívja meg a REST API-t (böngészős session nélkül), az `activeCompanyId` értéke `null` lesz, így a `if (activeCompanyId)` szűrés kimarad, és az API minden cég ügyiratát visszaadhatja. Emellett nincs `.limit()`, és a `partner_id` paraméteren nincs UUID-formátum ellenőrzés.
- **Javítás:** Bearer-kulcsos híváskor **env-first** sorrendben kötelezővé tesszük a cég-kötést (`process.env.REST_API_V1_COMPANY_ID?.trim() || request.headers.get("x-company-id")?.trim() || searchParams.get("company_id")?.trim()`, így ha a `REST_API_V1_COMPANY_ID` be van állítva, a kliens nem tudja felülírni), UUID-regexszel ellenőrizzük a `partner_id`-t és a `company_id`-t, `.eq("company_id", effectiveCompanyId)` szűrést teszünk mindkét végpontra, `.limit(200)` korlátot állítunk be, és dokumentáljuk a minimum 256 bites (`>= 32` bájt) API-kulcs erősséget.

---

## 4. CSOMAG (16–20. pont) [KÉSZ — 2026.11.03] — PDF/A konverter, AI metaadat-kinyerő, árva fájlok visszagörgetése és érkeztetőszám-folytonosság

### 16. pont (eredeti: J-35) [KÉSZ — forgatás nélkül, felhasználói döntés alapján] — PDF/A konvertáló útvonal-javítása és külső URL védelem
- **Fájlok:** `src/app/api/pdf/convert/route.ts:74-78`, `src/utils/ai-worker-service.ts:158-176` *(az `api/pdf/[id]/route.ts` PDF-tájolás/forgatás részhez felhasználói döntés alapján NEM nyúlunk)*
- **Mi a jelenlegi probléma?**
  1. A `pdf/convert/route.ts` a `.replace('.ext', '_pdfa.pdf')` hívással az első találatot cseréli le az utolsó pont (`lastIndexOf('.')`) helyett, és kiterjesztés nélküli fájlnál felülírhatja az eredetit.
  2. Az `ai-worker-service.ts` külső fájl letöltésekor (`kulso_fajl_url`) nem futtatja le az `isSafeExternalUrl` (belső hálózati címek elleni) ellenőrzést.
- **Javítás:** Átemeltük a `lastIndexOf('.')` logikát a `pdf/convert` végpontba, és bekötöttük az `isSafeExternalUrl` ellenőrzést a workerbe. *(A 3. részpont — PDF-forgatás gyorsítótárazás az `api/pdf/[id]/route.ts`-ben — felhasználói döntés alapján kihagyva.)*

### 17. pont (eredeti: J-6) [KÉSZ] — AI metaadat-kinyerő (`executeAiMetadataExtraction`) védelme jogosulatlan közvetlen hívás ellen
- **Fájl:** `src/app/inbox/filing-actions.ts:360-395, 979-1010, 1072`
- **Mi a jelenlegi probléma?** Mivel a `filing-actions.ts` tetején `"use server"` áll, minden benne lévő `export async function` közvetlenül meghívható a böngészőből. A `generateAISuggestions` ugyan ellenőrzi a jogosultságot, de a belső munkát végző `executeAiMetadataExtraction` és `applyFilingRulesToSuggestions` is exportálva van saját jogosultság-ellenőrzés nélkül, így egy „betekintő” is meghívhatná őket (Gemini-kvótát fogyasztva és az `ocr_szoveg` mezőt frissítve).
- **Javítás:** Mindkét függvény elejére – ha nincs belső `customSupabase` / `supabaseClient` (worker) kliens átadva – bekötöttük a `requireDocsAuthServer(["admin", "rendszergazda", "iktato", "ugyintezo"])` és a cég-azonosság ellenőrzést, valamint a `generateAISuggestions` is explicit megköveteli ezt a szerepkör-listát.

### 18. pont (eredeti: J-5) [KIHAGYVA — Felhasználói döntés: még nincs szkenner bekötve] — Szkenner Hotfolder (`scanner_hotfolder`) cég-szeparációja és jogosultság-védelme
- **Fájlok:** `src/utils/scanner-hotfolder.ts:92-154`, `src/app/inbox/batch-actions.ts:109-124`, `src/utils/batch-scanner.ts:408-416`
- **Döntés:** Felhasználói döntés alapján kihagyva, mivel fizikai/hálózati szkenner hotfolder még nincs bekötve a rendszerbe.

### 19. pont (eredeti: J-36 / J-30) [KÉSZ] — Hiba esetén árva Storage-fájlok és árva ügyek visszagörgetése + Életciklus PDF UTF-8 font
- **Fájlok:** `src/app/dossiers/[id]/version-actions.ts:137-166`, `src/app/dossiers/[id]/lifecycle-export.ts:13-35, 75-120, 281-289`, `src/app/inbox/filing-actions.ts:130-164`, `src/app/dossiers/[id]/template-actions.ts:617-644`, `src/utils/batch-scanner.ts:512-538`, `src/app/inbox/actions.ts:90-147`
- **Mi a jelenlegi probléma?**
  1. Új verzió feltöltésekor (`version-actions.ts`), sablon-generáláskor (`template-actions.ts`), egyedi érkeztetéskor (`inbox/actions.ts`) és kötegelt szkenneléskor (`batch-scanner.ts`), ha a fájl már felkerült a Supabase Storage-ba, de a következő adatbázis-beszúrás (`irat` vagy `irat_fajl`) hibát dob, a Storage-ban ott marad az árva fájl. Ugyanígy új ügyirat iktatásakor (`filing-actions.ts:130-164`), ha az `ugy` létrejött, de az `iktatoszam` vagy `ugyirat` beszúrása elbukik, árva `ugy` rekord marad hátra.
  2. Az életciklus-jelentés PDF exportja (`lifecycle-export.ts`) jelenleg `Helvetica` fontot használ, és egy `clean()` függvénnyel az `ő/ű` betűket `ö/ü`-re cseréli, valamint hiányzik belőle a `requireDocsAuthServer` ellenőrzés és az `esemeny_naplo.company_id`.
- **Javítás:** Hiba-ágakon (`if (insertError)` / `if (iratError)` / `if (fajlError)`) töröljük a már feltöltött Storage-fájlt (`.from("irat_files").remove([fileName])`) és az árva `ugy` / `irat` rekordot; az életciklus PDF exportba pedig bekötöttük a `requireDocsAuthServer`-t, az `esemeny_naplo.company_id` mezőt és a projektben már meglévő `LiberationSans` UTF-8 betűtípust (`@pdf-lib/fontkit`), így az `ő/ű/Ő/Ű` betűk ékezettel jelennek meg.

### 20. pont (eredeti: J-23 rész) [KÉSZ] — Véletlenszámos érkeztetőszám (`E/2026/random` és `E/ERR-`) tartalék-ágak megszüntetése
- **Fájlok:** `src/app/inbox/actions.ts:90-100`, `src/app/inbox/filing-actions.ts:1327-1336`, `src/app/inbox/eaisybill-actions.ts:247-259`, `src/utils/batch-scanner.ts:427-438`, `src/utils/imap-service.ts:128-139`
- **Mi a jelenlegi probléma?** Ha a `generate_erkeztetoszam` adatbázis-függvény (RPC) valamilyen okból hibát dobna, a kód jelenleg nem áll meg, hanem generál egy véletlenszámos érkeztetőszámot (`E/2026/48291` vagy `E/ERR-...`), ami sérti a jogszabályi sorszámfolytonosságot (gap-mentes szekvenciát).
- **Javítás:** Ha a `generate_erkeztetoszam` RPC hibát ad vagy nem ad vissza sorszámot (`if (erkezErr || !erkezId)`), a véletlenszámos fallback helyett egyértelmű hibával megszakítjuk az érkeztetést (és ha már történt Storage-feltöltés, azt is visszagörgetjük).

---

## 5. CSOMAG (21–25. pont) [KÉSZ — 2026.11.03] — Cron, IMAP e-mail érkeztető és levelezés üzembiztonsága

### 21. pont (eredeti: J-17) [KÉSZ] — Cron végpontok biztonságos (`timingSafeEqual`) fejléc-hitelesítése
- **Fájlok:** `src/utils/cron-auth.ts`, `src/app/api/cron/nightly/route.ts:11-15`, `src/app/api/cron/morning/route.ts:42-46`, `src/app/api/cron/imap/route.ts:6-9`, `src/app/api/cron/gdpr-anonymize/route.ts:18-22`
- **Mi a jelenlegi probléma?** Mind a négy cron végpont elfogadja a titkos kulcsot az URL-ben is (`?secret=...`), ami szerver- és proxy-naplókba kerülhet, valamint egyszerű szöveges `!==` összehasonlítást használ.
- **Javítás:** Létrejött a közös `verifyCronAuth(request)` segédfüggvény (`src/utils/cron-auth.ts`), amely kizárólag az `Authorization: Bearer <CRON_SECRET>` fejlécet fogadja el, és `crypto.timingSafeEqual`-lel ellenőrzi a kulcsot. (A `vercel.json`-hoz nem nyúltunk!)

### 22. pont (eredeti: J-16) [KÉSZ] — Éjszakai cron (`nightly`) lejárt értesítéseinek 7 napos deduplikációja
- **Fájl:** `src/app/api/cron/nightly/route.ts:37-65, 557-565, 661-669, 931-939`
- **Mi a jelenlegi probléma?** A pontosan 30 vagy 7 nap múlva lejáró tételekről csak egyszer megy ki értesítés (mert másnap már 29 vagy 6 nap van hátra). Viszont a **már lejárt** (`megorzesVege <= today` vagy `diffDays <= 0`) ügyiratokról, orvosi vizsgálatokról és tanulmányi szerződésekről minden egyes éjjel újra és újra kimegy ugyanaz az e-mail és SMS, amíg valaki le nem zárja őket.
- **Javítás:** Küldés előtt a `wasRecentlyNotified` segédfüggvénnyel ellenőrizzük az `alkalmazas_ertesites` és `ertesites_naplo` táblában (`sevenDaysAgoIso`), hogy a már lejárt tételről küldtünk-e már „lejárt” értesítést az elmúlt 7 napban, így elkerüljük a napi szintű dupla/ismételt kiküldést.

### 23. pont (eredeti: J-18) [KÉSZ] — Kimenő expedíciós e-mailek cég-specifikus SMTP/Brevo hitelesítése és feladója
- **Fájlok:** `src/utils/mailer.ts:348-385, 420-472`, `src/app/api/cron/nightly/route.ts:17-20, 691, 788, 869, 963, 1063, 1164`
- **Mi a jelenlegi probléma?**
  1. Amikor egy ügyiratból válaszlevelet küldenek ki csatolmánnyal (`sendEmailWithAttachment`), a kód mindig a központi `.env.local` SMTP adatait használja ahelyett, hogy először az adott cég saját beállított levelezőjét (`loadCompanyCredentialRow`) venné igénybe.
  2. A `nightly` cron 6 helyen beégetve az `eaisyhr@thinkai.hu` címet adja át feladóként.
- **Javítás:** A `sendEmailWithAttachment` először betölti a cég saját e-mail beállításait (`loadCompanyCredentialRow(resolvedDocCompanyId)`), és csak annak hiányában használja a környezeti SMTP beállításokat (valamint az `esemeny_naplo` beszúrásokban rögzíti a `company_id: resolvedDocCompanyId` értéket); a `nightly` cronban pedig a `defaultHrSenderEmail` (`process.env.HR_EMAIL_FROM || process.env.EMAIL_FROM || 'ertesites@thinkai.hu'`) változót használjuk a beégetett cím helyett.

### 24. pont (eredeti: J-19) [KÉSZ] — IMAP e-mail PDF-renderelés külső képek elleni védelme és csatolmánynév-ütközés elkerülése
- **Fájl:** `src/utils/imap-service.ts:201-216, 303-320`
- **Mi a jelenlegi probléma?**
  1. Amikor az érkező e-mail szövegéből a Puppeteer PDF-et készít (`page.setContent`), az e-mail HTML-jében lévő külső képek/követőpixelek (`<img src="http://...">`) automatikusan letöltődnek a szerverről (vak SSRF és adatvédelmi kockázat).
  2. Ha egy e-mailben két azonos nevű csatolmány érkezik (pl. két `szamla.pdf`), a második feltöltése (`${iratId}/${sanitizedFileName}`) hibára fut, mert ugyanoda próbálja menteni.
- **Javítás:** Bekapcsoltuk a `page.setRequestInterception(true)` védelmet a Puppeteer oldalon, és minden külső (`http:`/`https:`) kérést blokkolunk (`req.abort()`); a csatolmányok tárolási útvonalába pedig sorszámot (`${iratId}/${attIndex}_${sanitizedFileName}`) teszünk.

### 25. pont (eredeti: J-15) [KÉSZ] — IMAP e-mail érkeztetés duplikáció-védelme (`Message-ID` ellenőrzés és üzenetenkénti `\Seen` jelölés)
- **Fájl:** `src/utils/imap-service.ts:97-146, 175-194, 391-395`
- **Mi a jelenlegi probléma?** Jelenleg az IMAP szinkronizáló végigmegy az összes olvasatlan e-mailen, beszúrja őket az `irat` táblába, és csak a legvégén (a ciklus után) állítja át őket olvasottra (`\Seen`). Ha a 10. e-mailnél megszakad a kapcsolat vagy időtúllépés történik, a következő futáskor az első 9 e-mailt újra beérkezteti (dupla iratok keletkeznek).
- **Javítás:** Minden egyes sikeresen beérkeztetett (vagy kiszűrt) e-mail után azonnal beállítjuk a `\Seen` jelzőt az adott üzenetre (`await client.messageFlagsAdd(String(message.seq), ['\\Seen'])`), és az e-mail egyedi `parsed.messageId` azonosítóját eltároljuk a `kulso_hivatkozas_id` mezőben (`kulso_forras: 'imap'`), beszúrás előtt pedig ellenőrizzük, hogy az adott e-mailt érkeztettük-e már.

---

## 6. CSOMAG (26–30. pont) [KÉSZ] — Iktatási versenyhelyzetek (atomitás) és párhuzamos műveletek védelme

### 26. pont (eredeti: J-24) [KÉSZ] — „Nem iktatandó” státuszváltás és válaszlevél-feltöltés (`uploadReply`, `generateAndSaveReplyLetter`) sikertelen fájlműveletének kezelése
- **Fájlok:** `src/app/inbox/inbox-dismiss-actions.ts:49-65, 114-129`, `src/app/dossiers/[id]/actions.ts:888-913, 1175-1240`
- **Mi a jelenlegi probléma?**
  1. Az `uploadReply` és a `generateAndSaveReplyLetter` függvényben az `irat_fajl` beszúrás hibáját (`fajlError` / `genFajlError` / `attFajlError`) a kód nem vizsgálta meg: ha az adatbázis-beszúrás elbukott, létrejött egy fájl nélküli kimenő irat és árva Storage-fájl.
  2. A `dismissInboxItem` és `restoreInboxItem` `UPDATE` parancsa nem ellenőrizte `.is("ugyirat_id", null).select("id")`-vel, hogy közben nem iktatták-e már be az iratot.
- **Javítás:** Ha `fajlError` / `genFajlError` / `attFajlError` lép fel, töröljük a félkész `irat` rekordot és a Storage-fájlokat, majd hibaüzenettel térünk vissza; a `dismissInboxItem` és `restoreInboxItem` frissítéseket pedig feltételesre (`.is("ugyirat_id", null).select("id")`) alakítottuk.

### 27. pont (eredeti: J-25) [KÉSZ] — Ügyirat-státuszváltás (`updateDossierStatus`), szignálás (`assignDossier`) és kapcsolat-törlés (`deletePolymorphicLink`) összekötése
- **Fájlok:** `src/app/dossiers/[id]/actions.ts:11-62, 736-761, 1528-1535`, `src/app/dossiers/dossier-actions.ts:15-28, 96-99`
- **Mi a jelenlegi probléma?**
  1. Az `updateDossierStatus` és az `assignDossier` külön paraméterként kapta a böngészőtől az `ugyiratId`-t és a szülő `ugyId`-t, de nem ellenőrizte, hogy a megadott `ugyId` valóban az adott `ugyiratId` szülő-ügye-e.
  2. A `deletePolymorphicLink(id, ugyirat_id)` ellenőrizte a jogosultságot az `ugyirat_id`-ra, de a `.delete()` parancsban már csak `.eq("id", id)` szerepelt `.eq("ugyirat_id", ugyirat_id)` nélkül.
- **Javítás:** Az `ugy_id`-t (`verifiedUgyId`) mindig közvetlenül az ellenőrzött `ugyirat` rekordból olvassuk ki a kliensparaméter helyett; a `deletePolymorphicLink`-ben pedig hozzátettük a `.eq("ugyirat_id", ugyirat_id)` feltételt.

### 28. pont (eredeti: J-26) [KÉSZ] — Selejtezés jóváhagyásakor (`approveDisposal`) párhuzamos kattintás elleni atomi védelem
- **Fájl:** `src/app/archive/disposal-actions.ts:328-344, 418-420`
- **Mi a jelenlegi probléma?** Ha két vezető egyszerre hagyta jóvá ugyanazt a selejtezési csomagot, mindkettő átjuthatott az előzetes ellenőrzésen, mielőtt a ciklus végén átállította volna a státuszt `"selejtezett"`-re, így kétszer futhatott le a fájltörlés és a naplózás.
- **Javítás:** Magát a státusz-frissítő `UPDATE` parancsot láttuk el `.eq("statusz", "selejtezheto").select("id")` feltétellel még a fájltörlés előtt, és csak azokra az ügyiratokra hajtjuk végre a megsemmisítést és naplózást, amelyeknél az atomi státuszváltás ténylegesen sort módosított.

### 29. pont (eredeti: J-21) [KÉSZ] — Bejövő irat iktatása (`fileIncomingDocument`): atomi iktatás dupla kattintás ellen
- **Fájl:** `src/app/inbox/filing-actions.ts:24-29, 169-172, 236-263`, `src/utils/alszam-helper.ts:95-103`
- **Mi a jelenlegi probléma?** A `fileIncomingDocument` a függvény elején megnézte, hogy az iratnak nincs-e még `ugyirat_id`-ja, majd később beállította az `ugyirat_id`-t `.is("ugyirat_id", null)` feltétel nélkül. Ha két iktató egyszerre kattintott ugyanarra a bejövő iratra, a második felülírhatta az első iktatását, és egy üres ügyirat maradt utána.
- **Javítás:** Az `irat` frissítését `.is("ugyirat_id", null).select("id")` feltétellel végezzük (`updateIratWithNextAlszam`), és ha `0` sor frissült, visszagörgetjük a létrehozott `ugyirat` és `ugy` rekordot, majd `"Ezt az iratot közben már beiktatták!"` üzenettel térünk vissza.

### 30. pont (eredeti: J-22 kód-rész) [KÉSZ] — Alszám-kiosztás (`alszam`) ütközéskezelése és újrapróbálkozása (retry) 4 helyen
- **Fájlok:** `src/utils/alszam-helper.ts`, `src/app/inbox/filing-actions.ts:236-250`, `src/app/dossiers/[id]/actions.ts:867-886, 1154-1173`, `src/app/dossiers/[id]/template-actions.ts:591-607`
- **Mi a jelenlegi probléma?** Amikor egy meglévő ügyiratba új iratot vagy válaszlevelet csatoltak, a kód lekérdezte az eddigi iratokat, kiszámolta a `maxAlszam + 1` értéket, majd beszúrta az iratot. Párhuzamos mentésnél két irat ugyanazt az alszámot kaphatta.
- **Javítás:** Létrehoztuk a közös `src/utils/alszam-helper.ts` segédfüggvényeket (`insertIratWithNextAlszam` és `updateIratWithNextAlszam`), amelyek `23505` unique ütközés esetén újraszámolják a következő alszámot és legfeljebb 3-szor újrapróbálkoznak mind a 4 helyen.

---

## 7. CSOMAG (31–35. pont) [KÉSZ] — Legsúlyosabb, adatbázis-migrációt (`20261103…`) igénylő lezáró csomag

*(Mindkét migráció — `20261103000001_irat_alszam_es_erkeztetoszam_unique.sql` és `20261103000002_final_audit_closures.sql` — jóváhagyás után lefutott az élő adatbázison, önellenőrző `DO $$` blokkal verifikálva.)*

### 31. pont (eredeti: J-27b) [KÉSZ] — Adatbázis RLS szerepkör-függvény (`get_effective_docs_role`) kiegészítése `elerheto_modulok` ellenőrzéssel
- **Fájl:** `supabase/migrations/20261103000002_final_audit_closures.sql` + `src/utils/__tests__/audit-round4-pkg7.test.ts`
- **Mi a jelenlegi probléma?** A tisztán `eaisyHR` felhasználók (`elerheto_modulok = ['hr']`, nincs `'docs'`) a `felhasznalo_profil.docs_szerepkor` mezőben technikai okból (`NOT NULL` kényszer miatt) `'betekinto'` vagy `'ugyintezo'` értéket kaptak. Alkalmazás-szinten ezt már kiszűrtük, de az adatbázis `public.get_effective_docs_role` függvényében is ki kellett mondani, hogy ha a felhasználónak nincs `'docs'` a moduljai között, akkor a Docs szerepköre `NULL`.
- **Javítás:** A `public.get_effective_docs_role` SQL függvény kiegészült a `'docs' = ANY(COALESCE(fp.elerheto_modulok, ARRAY['docs']))` ellenőrzéssel (`NULL` visszatéréssel), a `check_ugyirat_user_access` és `check_irat_fajl_access` pedig megköveteli a `get_effective_docs_role(...) IS NOT NULL` feltételt (élő DB mérés: mind a 6 HR-only felhasználónál `effective_docs_role = null`).

### 32. pont (eredeti: J-9) [KÉSZ] — `rendszer_beallitas` („Négy szem elve”) cég-kötött jogosultsága alkalmazás és adatbázis szinten
- **Fájlok:** `src/app/settings/admin-actions.ts:196-225` + `supabase/migrations/20261103000002_final_audit_closures.sql`
- **Mi a jelenlegi probléma?** A `setFourEyesSetting` akció és a `rendszer_beallitas` tábla adatbázis policy-je megengedte, hogy valaki egy másik cégben szerzett vagy globális `admin` profiljával módosítsa az aktív cég `negy_szem_elve_selejtezesnel:<companyId>` beállítását.
- **Javítás:** A `setFourEyesSetting`-ben átálltunk a `requireDocsAuthServer(["admin", "rendszergazda"], activeCompanyId)` ellenőrzésre, az adatbázis `"Csak admin szerkesztheti a rendszerbeallitasokat"` policy-ben pedig a `:<company_uuid>` végződésű kulcsokra (`substring(kulcs from ':([0-9a-fA-F-]{36})$')`) megköveteljük az adott cégbeli `admin`/`rendszergazda` jogosultságot.

### 33. pont (eredeti: J-22 DB + J-23 DB) [KÉSZ] — Adatbázis szintű egyediségi kényszerek (`UNIQUE` constraint és index) az érkeztetőszámra és az alszámra
- **Fájl:** `supabase/migrations/20261103000001_irat_alszam_es_erkeztetoszam_unique.sql`
- **Mi a jelenlegi probléma?** A `public.irat` táblán még nem volt adatbázis-szintű `UNIQUE` megszorítás az `(ugyirat_id, alszam)` párra és parciális `UNIQUE` index a `(company_id, erkeztetoszam)` párra.
- **Javítás:** Élő adatbázis előteszt (`58` sor, `0` duplikátum) után létrehoztuk az `irat_ugyirat_alszam_key` `UNIQUE (ugyirat_id, alszam)` megszorítást és az `irat_company_erkeztetoszam_key` parciális egyedi indexet (`WHERE erkeztetoszam IS NOT NULL`), önellenőrző `DO $$` blokkal.

### 34. pont (eredeti: J-13) [KÉSZ] — Céges meghívókód (`share_token`) 10 karakterre növelése és 7 napos lejárat (TTL)
- **Fájlok:** `src/app/actions/company-actions.ts:392-425` + `supabase/migrations/20261103000002_final_audit_closures.sql`
- **Mi a jelenlegi probléma?** A céges csatlakozási kód (`share_token`) 6 karakteres volt, és a `join_company_by_token` RPC függvény nem ellenőrizte a `share_token_created_at` lejáratát.
- **Javítás:** A generált kódot 10 karakteresre (`TOKEN_LENGTH = 10`) növeltük, a `public.join_company_by_token` RPC-ben pedig beállítottuk a 7 napos lejárati ellenőrzést (`COALESCE(v_token_created_at, v_company_created_at) <= (now() - interval '7 days')`) és az explicit `docs_szerepkor = 'ugyintezo', hr_szerepkor = 'munkavallalo'` alapértelmezést.

### 35. pont (eredeti: J-37 / 7. csomag harang) [KÉSZ] — Alkalmazás-értesítések (`alkalmazas_ertesites` harang) cégesítése és HR/Docs modul-szétválasztása
- **Fájlok:** `supabase/migrations/20261103000002_final_audit_closures.sql`, `src/components/notification-bell.tsx`, `src/utils/docs-notification-dispatcher.ts`, `src/utils/hr-notification-dispatcher.ts`, `src/app/dossiers/dossier-actions.ts`, `src/app/api/cron/nightly/route.ts`
- **Mi a jelenlegi probléma?** A felső sávban lévő értesítési harang (`alkalmazas_ertesites` tábla) csak `user_id` alapján szűrt, nem volt rajta `company_id` és `modul` (`'docs'` / `'hr'`) oszlop.
- **Javítás:** Hozzáadtuk a `company_id` és `modul` (`DEFAULT 'docs'`, `CHECK (modul IN ('docs', 'hr'))`) oszlopokat az `alkalmazas_ertesites` táblához (meglévő 130 sor feltöltésével: `71` db `'hr'`, `59` db `'docs'`, `0` db `NULL company_id`), és a `NotificationBell` komponensben pontosan az aktív cégre és az aktuális modulra (`docs` vs `hr`) szűrünk.
