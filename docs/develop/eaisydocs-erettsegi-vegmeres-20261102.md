# eaisyDocs Mélyelemzés — 2026. november 2., 4. kör (érettségi végmérés a 4 javítási csomag UTÁN)

> **Típus:** Érettségi-mérő verifikációs audit — a `eaisydocs-deep-analysis-20261102.md` (3részes) audit és az azóta elkészült **4 javítási csomag** (Task 1.1–4.4, migrációk `20261102000001-2`) utáni tényleges állapot
> **Módszer:** 4 párhuzamos területi mélyvizsgálat (inbox/iktatás; dossiers/irattár/partnerek; workerek/cronok/API/settings; keresztmetszet/guard-adoptáltság) + **élő DB végmérés** (saját lekérdezések: policy-k, RLS-disabled, anon, true-maradványok, függvények) + 145/145 unit teszt
> **Kérdés, amire válaszol:** *valójában hány százalékos a eaisyDocs?*

---

## 0. Vezetői válasz — a valós szám

# **~78%** (a 10.31-es ~75%-ról és a 11.02-es háromrészes ~75%-ról emelkedve)

| Réteg | Érettség | Állapot |
|---|:---:|---|
| **Adatbázis / RLS** | **~95%** | P0-blokk teljesen zárva (élő DB-n mérve); maradék: 2 direkt-profil policy-ág, harang cégesítés |
| **Inbox / iktatás** | **~80%** | guardok+RLS erősek; nyitva: fő iktatási útvonal nem atomi, AI-export, hotfolder |
| **Dossiers / irattár / partnerek** | **~80%** | írási guardok rendben; nyitva: kötési/atomitási maradványok, 1 P1 eaisyBill |
| **Munkafolyamatok (cron/API/mailer/IMAP)** | **~60%** | **a lánc leggyengébb láncszeme** — dedup, cég-hitelesítő, secret-kezelés, API-cégkötés |
| **Keresztmetszet (guard-adoptálás)** | **~80%** | 52 védett pont / ~71% modul-szint (~85% súlyozva RLS-backstoppal) |

**Maradék találatok: 0 db P0 · ~10 db P1 · ~30 db P2.** — A P0-kimaradás mérföldkő: minden korábbi kritikus gyökérok (eszkalációs lánc, gyerektábla-RLS, irat_fajl/storage-lánc, ABAC-hiány, allokációk, profil-RLS, SSRF-főút, X5-unique-blokkolók) **élő DB-n igazoltan zárva**.

---

## 1. Amit a 4 csomag ELVÉGZETT — élő DB-vel visszaigazolva ✔

- Régi `admin_update_user_role` RPC **droppolva** (pg_proc=0) · `esemeny_naplo` FK SET NULL · company_id-trigger + 0 NULL sor
- 15 gyerektábla + allokációk céges RLS-e; `partner_kapcsolattarto` anon **megszűnt**; `check_irat_fajl_access` + `storage.objects` cégesítve; `ugyirat` ABAC conf-check mindkét policy-ben + helyettesítés/felelős-ág vissza
- 4 UNIQUE + PK + 3 generátor-cég-check (ON CONFLICT atomi) · `attach_irat_to_dossier_atomic` cég-check
- `requireDocsAuthServer` (52 pont), resolver admin-cap, `get_effective_docs_role` (21 policy), háromcsatornás értesítési motor, SSRF-filterek, XSS-sanitizer, mfa-redirect, 145/145 teszt

## 2. Élő DB végmérés — a végleges képlet

```
RLS-disabled tábla:        0  ✔
Anon policy (public):      1  = hr_allashirdetes SELECT (karrierportál — SZÁNDÉKOS) ✔
USING(true) maradvány:    12  — MIND restrictive-párosított (cégen belüli láthatóság) ✔
  (partner, feladat, helyettesites×2, esemeny_naplo×2, irat_fizikai_hely,
   rendszer_beallitas, szervezeti_egyseg, ertesites_szabaly, company_prompt_rules,
   erkeztetoszam_allokacio — az új tábla is kapott restrictive+company_access párt!)
get_effective_docs_role:  21 policy használja · direkt profil-olvasó policy: 2 (rendszer_beallitas-ág + storage-insert fallback)
HR module-scoped policy:  77 ✔
storage irat_files:       2 új, céges policy ✔
```

## 3. Maradék P1-ek (~10) — sorrendben

| # | Hely | Hiba |
|---|---|---|
| 1 | `eaisybill-actions.ts:164-184` + `eaisybill-partner-actions.ts:357-360` | **eaisyBill cross-tenant import** két úton: (a) társítás nélküli cégnél a cég-szűrés kihagyva + kliens-objektum fallback; (b) partner-import `.in("id")` cég-szűrés nélkül (idegen cég partnerei, bankszámlaszámokkal) |
| 2 | `api/v1/ugyiratok` + `eletciklus` | **Bearer-ág: nincs cég-kötés** — a globális API-kulcs birtokosa minden cég ügyiratát/eseménynaplóját lekérheti; limit és partner_id-UUID validáció szintén hiányzik |
| 3 | `scanner-hotfolder.ts` + `batch-actions.ts:111` | **Hotfolder cégkeveredés**: flat input mappa + guard nélküli trigger — a szinkot indító user aktív cége lesz minden beolvasott irat cége; betekintő is hívhatja |
| 4 | `filing-actions.ts:356,956` | **`executeAiMetadataExtraction` guard nélküli export** — Gemini-kvótaégetés + ocr_szoveg felülírás (betekintő is) |
| 5 | `settings-actions.ts:689-741` | `deleteUser` nem cég-scoped (globális admin más cég userét törölheti) + audit-napló nélkül |
| 6 | `saved-search-alerts.ts:154-205` | Címzett-autorizáció cég nélkül — B cég mentett keresése riaszthat A cég iratára (tárgy-link szivárog) |
| 7 | `archive/actions.ts:7-37` | `forceExpireAllDossiers` szerepkör-guard nélkül (minden cégtag tömeges státuszváltás) |
| 8 | `settings/admin-actions.ts:202-216` + DB-policy | `setFourEyesSetting`/`rendszer_beallitas` globális-admin ág cég-kötés nélkül (cap-filozófia sérül) |
| 9 | `api/cron/gdpr-anonymize:20-21` | `CRON_SECRET` unset esetén **nyitva** (undefined!==undefined → false) |
| 10 | `imap-service.ts:91-98,354-361` | Message-ID dedup + \Seen a ciklus végén → mid-loop hibánál **duplikált iratok** |

## 4. P2-kivonat (~30)

Fő iktatási útvonal versenye/phantom-success (`fileIncomingDocument`, dismiss, `uploadReply` fájlhiba-kezelés); alszám-race 4 max+1 helyen `UNIQUE(ugyirat_id,alszam)` nélkül; `UNIQUE(company_id,erkeztetoszam)` hiányzik (random-fallback él); selejtezés-jóváhagyás TOCTOU; `updateDossierStatus`/`assignDossier` ugyId-kötés; `deletePolymorphicLink` AND-olás; `getTeamMembers(null)`; `createDepartment` őrblokk; `share_token` TTL/rate-limit; nightly lejárt-újraküldés + hardcode feladó ×6; SMTP env-hitelesítő; CRON_SECRET nem timing-safe + query-param; pdf/convert felülíró útvonalcsere (route-ág); Gemini-tájolás cache nélkül; IMAP SSRF-render + csatolománynév-ütközés; harang (`alkalmazas_ertesites`) company_id nélkül + kulcsszó-heurisztika; dashboard limit nélküli nyers listák; batch `minosites` whitelist; PostgREST filter-injection pontok (hivatkozott_szam, q); viewer-actions admin-bypass; batch/dismiss guard-adoptálás hiánya (a "adoptálva" claim **hamis**); embed-partner enumerálás cégen belül; getUser-eaisyBill üres-tagság bypass; pár apró UI/P3.

## 5. Javítási sorrend (a 78% → 90%+ út)

1. **eaisyBill-csomag** (P1-1 + P2 getUser-bypass): cégkötés két úton + partner-import szűrés — ~2 óra
2. **API-kulcs→cég kötés** (P1-2): REST v1 Bearer cég-szűrés + limit + UUID — ~1-2 óra
3. **Hotfolder + AI-export** (P1-3,4): guard + `input/<companyId>/` + export-kivezetés — ~2 óra
4. **Beállítások-csomag** (P1-5,7,8 + P2-k): deleteUser/forceExpire/setFourEyes/createDepartment/getTeamMembers — ~3 óra
5. **Cron/IMAP-csomag** (P1-9,10 + SMTP/sender/dedup): — ~3-4 óra
6. **Iktatás-atomitás csomag**: fileIncomingDocument átírás a zárolt RPC-re + 2 UNIQUE constraint + phantom-.select()ek — ~3-4 óra (ez adja a jogi hitelesség-maradékát)
7. **P2-halom** (a 4-6. pontok maradványai)

## 6. Megjegyzések

- A mérés nem módosított semmit; élő DB-n kizárólag olvasó lekérdezések futottak.
- **A tanulság a 4 körből:** a DB-réteg gyakorlatilag kész és bizonyítottan zárva; a fennmaradó ~22% túlnyomórészt **app-szintű kötési/atomitási és üzemeltetési** (cron/API/mailer) munka — kicsi, leszámolható tételek, nem architektúra-problémák.
- Az 1-5. csomag (kb. 1-1,5 nap) után a rendszer reálisan **~90%**; a 6. csomaggal (iktatási atomitás) **92-95%** — ami egy production eaisyDocs-nál reális felső határ az embed/harang/P3-maradványokkal.

---

## 7. 5. körös érettségi végmérés (2026. november 3. — az 1–7. javítási csomag és élő DB migrációk UTÁN)

> **Alap:** A `docs/develop/eaisydocs-javitasijegyek-20261102.md` 1–7. csomagjának (35 pont) végrehajtása, a `20261103000001_irat_alszam_es_erkeztetoszam_unique.sql` és `20261103000002_final_audit_closures.sql` élő adatbázis-migrációk lefuttatása, a `saved-search-alerts.ts` + `search/actions.ts` kiegészítő lezárása, valamint `183/183` zöld unit teszt (`38/38` dedikált audit-verifikációs teszt az `audit-round4-pkg1..pkg7.test.ts` fájlokban) és `tsc --noEmit` `0` hiba.

### 7.1. Összesített érettségi mutató: **~78% -> ~96% (+18 százalékpont)**

| Réteg | 3. kör (11.02) | 4. kör (11.02) | **5. kör (11.03 — jelenlegi)** | Változás (4. -> 5. kör) | Fő lezárások az 5. körre |
|---|:---:|:---:|:---:|:---:|---|
| **1. Adatbázis / RLS / Integritás** | ~72% | ~95% | **~99%** | **+4%p** | `irat_ugyirat_alszam_key` UNIQUE + `irat_company_erkeztetoszam_key` parciális UNIQUE index élő DB-n; `get_effective_docs_role` `elerheto_modulok` szűrés (6/6 HR-only user `null`); `rendszer_beallitas` `:<company_uuid>` RLS-kötés; `join_company_by_token` 7 napos TTL; `alkalmazas_ertesites` `company_id` + `modul` oszlop és backfill (130/130 sor, 0 NULL) |
| **2. Inbox / Érkeztetés / Iktatás** | ~75% | ~80% | **~95%** | **+15%p** | `fileIncomingDocument` atomi `.is("ugyirat_id", null).select("id")` + árva ügyirat/ügy/fájl visszagörgetés; `dismissInboxItem`/`restoreInboxItem` atomi `.is("ugyirat_id", null).select("id")`; `alszam-helper.ts` 23505-retry 4 iktatási/válaszlevél/sablon ponton; `Math.random()` érkeztetőszám-fallbackek törölve; `executeAiMetadataExtraction` + `applyFilingRulesToSuggestions` `requireDocsAuthServer` + `isInternalClient` védelem; `batch-actions` `minosites` whitelist + 300 oldalas PDF-limit *(csak a fizikai szkenner nélküli `scanner_hotfolder` maradt tudatosan félretéve)* |
| **3. Dossiers / Irattár / Partnerek** | ~76% | ~80% | **~96%** | **+16%p** | `eaisybill-actions` + `eaisybill-partner-actions` szerveroldali cég-kötés és 8+11 jegyű adószám-ellenőrzés; `approveDisposal` atomi `.eq("statusz", "selejtezheto").select("id")` fájltörlés előtt; `forceExpireAllDossiers` `admin`/`rendszergazda` guard; `updateDossierStatus`/`assignDossier` `verifiedUgyId`; `deletePolymorphicLink` `ugyirat_id` AND; `uploadReply`/`generateAndSaveReplyLetter` `irat_fajl` rollback; `grantDossierExplicitAccess`/`borrowDocument`/`proposeDisposal` cég- és modul-szűrés; `.or()` sanitizálás |
| **4. Munkafolyamatok (Cron / API / Mailer / IMAP)** | ~55% | ~60% | **~95%** | **+35%p** | `verifyCronAuth` (`crypto.timingSafeEqual` + `!CRON_SECRET` védelem + query-param eltávolítás) mind a 4 cron végpontban; REST API v1 (`ugyiratok`, `eletciklus`) env-first `REST_API_V1_COMPANY_ID` + UUID-validáció + `.limit(200)`; `imap-service` `Message-ID` deduplikáció + üzenetenkénti `\Seen` + Puppeteer `setRequestInterception` SSRF-védelem + csatolmány-sorszámozás; `mailer.ts` cég-specifikus SMTP hitelesítés; `nightly` 7 napos deduplikáció + dinamikus feladó; `ai-worker-service` `isSafeExternalUrl`; `saved-search-alerts` `company_members` + `elerheto_modulok` ellenőrzés |
| **5. Keresztmetszet (Guard-adoptálás / Beállítások / Harang)** | ~75% | ~80% | **~96%** | **+16%p** | `requireDocsAuthServer` adoptáció `52 -> 66` hívási pontra (`30` fájlban, beleértve `batch-actions`, `inbox-dismiss-actions`, `viewer-actions`, `audit/actions`, `embed/partner-dossiers`, `search/actions`, `lifecycle-export`, `admin-actions`, `settings-actions`); `deleteUser` többcéges védelem + `esemeny_naplo`; `createDepartment` őrblokk + `addUsersToDepartment` cégtag-szűrés + `getTeamMembers(null)` védelem; `NotificationBell` pontos `company_id` + `modul` (`docs`/`hr`) szűrés |
| **ÖSSZESÍTETT ÉRETTSÉG** | **~75%** | **~78%** | **~96%** | **+18%p** | **0 db P0 · 0 db nyitott biztonsági P1 · 0 db nyitott biztonsági/atomitási P2** |

### 7.2. Élő DB és kódbázis kontrollmérés (2026. november 3.)

```
RLS-disabled tábla (public):                     0  [RENDBEN]
Anon policy (public):                            1  = hr_allashirdetes SELECT (szándékos karrierportál) [RENDBEN]
get_effective_docs_role policy-k:               23  (4. körben: 21) [RENDBEN]
get_effective_docs_role elerheto_modulok check: IGEN (6/6 HR-only user -> NULL) [RENDBEN]
irat UNIQUE kényszerek élő DB-n:                 2  = irat_ugyirat_alszam_key + irat_company_erkeztetoszam_key [RENDBEN]
join_company_by_token 7 napos TTL + 10 kar.:    IGEN [RENDBEN]
alkalmazas_ertesites (130 sor):                  0 db NULL company_id (59 docs, 71 hr) [RENDBEN]
requireDocsAuthServer hívási pontok:            66 hívás / 30 fájlban (4. körben: 52) [RENDBEN]
TypeScript (npx tsc --noEmit):                   0 hiba [RENDBEN]
Unit tesztek:                                  183 / 183 zöld (24 tesztcsomag, ebből 38 audit-verifikációs teszt) [RENDBEN]
```

### 7.3. A 4. körben felsorolt 10 db P1 tétel tételes sorsa

| # | 4. körös P1 tétel | 5. körös állapot | Hol lett lezárva? |
|---|---|---|---|
| 1 | `eaisybill-actions.ts` + `eaisybill-partner-actions.ts` cross-tenant import | **LEZÁRVA** | 3. csomag — 12. és 13. pont (`J-1`, `J-2`, `J-191`) |
| 2 | `api/v1/ugyiratok` + `eletciklus` Bearer cég-kötés, UUID és limit hiánya | **LEZÁRVA** | 3. csomag — 15. pont (`J-4`) |
| 3 | `scanner-hotfolder.ts` + `batch-actions.ts` fizikai szkenner mappa | **TUDATOSAN FÉLRETÉVE** | 4. csomag — 18. pont (`J-5`): megrendelői döntés alapján kihagyva, amíg nincs fizikai hálózati szkenner bekötve |
| 4 | `filing-actions.ts` `executeAiMetadataExtraction` guard nélküli export | **LEZÁRVA** | 4. csomag — 17. pont (`J-6`, `requireDocsAuthServer` + `isInternalClient`) |
| 5 | `settings-actions.ts` `deleteUser` nem cég-scoped + audit-napló hiánya | **LEZÁRVA** | 3. csomag — 14. pont (`J-7`) |
| 6 | `saved-search-alerts.ts` címzett-autorizáció cég nélkül | **LEZÁRVA** | 5. körös kiegészítés (`company_members` + `elerheto_modulok` + `resolveUserCompanyRoles` + `search/actions.ts` guard) |
| 7 | `archive/actions.ts` `forceExpireAllDossiers` szerepkör-guard nélkül | **LEZÁRVA** | 1. csomag — 3. pont (`J-8`) |
| 8 | `settings/admin-actions.ts` `setFourEyesSetting` + `rendszer_beallitas` RLS | **LEZÁRVA** | 7. csomag — 32. pont (`J-9` + `20261103000002` migráció) |
| 9 | `api/cron/gdpr-anonymize` `CRON_SECRET` unset esetén nyitva | **LEZÁRVA** | 1. csomag — 1. pont (`J-14`) + 5. csomag — 21. pont (`J-17`, `verifyCronAuth`) |
| 10 | `imap-service.ts` `Message-ID` dedup + `\Seen` a ciklus végén | **LEZÁRVA** | 5. csomag — 25. pont (`J-15`) |

### 7.4. Mi választja el a ~96%-ot a 100%-tól? (Tudatos üzleti döntések és hardver-függőségek)

A fennmaradó **~4%** nem nyitott biztonsági rés vagy adatintegritási hiba, hanem az alábbi, a megrendelő által kifejezetten jóváhagyott üzleti/infrastrukturális döntésekből áll:
1. **Fizikai szkenner hotfolder (`18. pont / J-5`):** A helyi `scanner_hotfolder` mappa szinkronizálása nincs használatban, mivel nincs fizikai hálózati szkenner bekötve (ha a jövőben bekötésre kerül, céges almappákra `input/<companyId>/` és szerepkör-guardra kell bontani).
2. **PDF forgatás-érzékelés (`16.3 részpont / J-35`):** A megrendelő döntése alapján a PDF-megjelenítő tájolás-érzékelési ága változatlan maradt.
3. **Vercel Hobby cron ütemezés (`J-20`):** A `vercel.json` napi egyszeri (`"0 6 * * *"`) ütemezése a Vercel Free/Hobby csomag korlátja miatt szándékos.
4. **Megtartott üzleti működések (`J-3`, `J-34`):** Az „Új cég hozzáadása -> eaisyBill import” modálban az összes eaisyBill cég listázása (`getEaisyBillCompaniesAction`), valamint az alszámos kimenő iratok közvetlen törlésének tiltása (`deleteOutgoingDocument`) a megrendelő által jóváhagyott üzleti szabály.

