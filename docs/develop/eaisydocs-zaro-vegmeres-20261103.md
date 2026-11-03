# eaisyDocs Záró Végmérés — 2026. november 3. (a 7 javítási csomag UTÁN)

> **Típus:** Rendszerszintű érettségi végmérés — a 4. körös audit (~78%) után elkészült 7 javítási csomag (35 tétel + 2 migráció + kiegészítő AI/kereső guardok) tényleges hatásának mérése
> **Módszer:** Élő adatbázis-szintű 15 pontú állapot-mérés (RLS-policyk, constraintek, függvények, adat-higiénia) + párhuzamos területi guard-adoptáltság- és funkcionális audit + 183/183 teszt + tsc 0
> **Kérdés, amire válaszol:** *hol áll most a eaisyDocs valójában?*

---

## 0. Vezetői válasz

# **~92–95%** (konzervatív karbantarthatósági mércével **~92%**, tisztán biztonsági/funkcionális mércével **~95–96%** — a 4. körös ~78%-ról **+14–18 százalékpontos javulás**)

---

## 1. Élő DB-mérés — 15 pont (saját lekérdezésekkel)

| # | Mutató | Eredmény | Értékelés |
|---|---|:---:|:---:|
| A | RLS-disabled táblák | **0** | [RENDBEN] tökéletes |
| B | `USING(true)` maradványok | 12 | [RENDBEN] mind restrictive-páros (cégen belüli) |
| C | Anon policy-k (karrierportál nélkül) | **0** | [RENDBEN] |
| D | Direkt `felhasznalo_profil.docs_szerepkor`-t olvasó policyk | **2** | [ISMERT] ismert residuum (rendszer_beallitas globális kulcs fallback + storage insert) |
| E | `get_effective_docs_role`-t használó policyk | **23** | [RENDBEN] |
| F | Régi `admin_update_user_role` RPC | **0** | [RENDBEN] droppolva |
| G | `UNIQUE(ugyirat_id, alszam)` constraint | **1** | [RENDBEN] él |
| H | `UNIQUE(company_id, erkeztetoszam)` index | **1** | [RENDBEN] él |
| I | `esemeny_naplo` NULL-company sorok | **0** | [RENDBEN] |
| J | `hr_%` sorok a Docs auditban | 796 | [DOKUMENTÁLT] historikus, app-szűrt (dokumentálva) |
| K | Technikai zaj-sorok | 579 | [DOKUMENTÁLT] historikus, app-szűrt (dokumentálva) |
| L | Harang NULL-company sorok | **0** | [RENDBEN] backfill teljes (130/130 sor) |
| M | Token TTL | **van** (7 nap, 10 kar.) | [RENDBEN] |
| N | Harang `modul` oszlop | **1** (`docs`/`hr`) | [RENDBEN] |
| O | REST API v1 cég-szűrt policy | **1** | [RENDBEN] |

**DB-réteg minősítés: ~96%** — minden P0 zárva, az iktatás-atomitás constraint-párral él, a profil-RLS, az `elerheto_modulok` szűrés és a harang-cégesítés teljes.

---

## 2. Területi audit — guard-adoptáltság + funkcionális állapot

| Terület | 4. kör (11.02) | **5. kör (11.03 — jelenlegi)** | Kulcsmutató |
|---|:---:|:---:|---|
| **Adatbázis / RLS / Integritás** | ~95% | **~96–99%** | 0 RLS-disabled, 2 UNIQUE constraint él, `get_effective_docs_role` `elerheto_modulok`-ot ellenőriz (6/6 HR-only user `null`), harang `company_id` + `modul` 0 NULL sorral |
| **Guard-adoptáltság (Keresztmetszet)** | ~80% | **~93%** | **67 hívási hely + 2 indirekt = ~69 védett belépési pont** 31 fájlban (beleértve `ai-reply-actions`, `search/actions`, `batch-actions`, `inbox-dismiss-actions`, `viewer-actions`, `audit/actions`, `embed/partner-dossiers`, `lifecycle-export`); a `docs` modul-ellenőrzés centralizáltan a guardban él |
| **Inbox + iktatás** | ~80% | **~93–95%** | atomi csatolás (`.is("ugyirat_id", null).select("id")`) + alszám-helper (`23505` retry) + UNIQUE + eaisyBill cég-kötés + AI-guard + SSRF-filter — mind kész; maradék: `filing-actions` monolitja és a tudatosan félretett fizikai szkenner (`scanner_hotfolder`) |
| **Dossiers + irattár + partnerek** | ~80% | **~93–96%** | `verifiedUgyId` + atomi disposal-claim + polimorf-link AND + access/borrow/template cégesítés + `ai-reply-actions` guard + cég-ellenőrzés |
| **Workerek / cron / API / mailer / IMAP** | ~60% | **~92–95%** | timing-safe auth (`verifyCronAuth`) + 7 napos nightly dedup + cég-SMTP + IMAP `Message-ID` dedup + üzenetenkénti `\Seen` + Puppeteer `setRequestInterception` SSRF-blokkolás + REST API v1 env-first cég-kötés + `saved-search-alerts` cégtagság-ellenőrzés |
| **Keresés / XSS / embed / dashboard** | ~80% | **~92%** | snippet-sanitizer + `.or()` sanitizálás + `search/actions` guard + SSRF-guard + embed guard + dashboard `limit(2000)` |

---

## 3. Amit a 7 csomag ELVÉGZETT (a ~78%-ról a ~92–95%-ig)

| Blokk | Tételszám | Státusz |
|---|:---:|:---:|
| eaisyBill határzár + API cégkötés + settings-guards | 1-10 | [KÉSZ] |
| Validációk + eaisyBill-pontok + deleteUser + REST API | 11-15 | [KÉSZ] |
| PDF/A útvonal + AI-guard + orphan-rollback + fonts + fallback-mentesítés | 16-20 | [KÉSZ] |
| Cron timing-safe + dedup + cég-SMTP + IMAP-védelem | 21-25 | [KÉSZ] |
| Iktatás-atomitás (atomi update-k + rollback + alszám-helper) | 26-30 | [KÉSZ] |
| `get_effective_docs_role` modul-check + `rendszer_beallitas` cég-policy + token-TTL + harang-cégesítés + **UNIQUE-migráció** + `saved-search-alerts` / `search/actions` / `ai-reply-actions` guardok | 31-35 + kiegészítés | [KÉSZ] |

---

## 4. A 100%-ot tartó maradékok (~5–8% — kizárólag karbantarthatósági/teljesítmény/hardver tételek)

| # | Mi | Súly | Munka |
|---|---|:---:|:---:|
| 1 | 2 direkt-profil policy-maradvány (`rendszer_beallitas` globális kulcs fallback + `storage` insert) | P2 | ~1 óra |
| 2 | Dashboard kliensoldali aggregáció (2000 sor memóriában) -> SQL/RPC aggregáció nagy cégeknél | P2 perf | ~2 óra |
| 3 | Fizikai szkenner `scanner-hotfolder.ts` (megrendelői döntéssel félretéve, amíg nincs szkenner bekötve) | Félretéve | ~1 óra |
| 4 | ~4 fájl saját-ellenőrzéssel a központi guard helyett (funkcionálisan védett, konzisztencia-kockázat) | P3 | ~1 óra |
| 5 | `filing-actions.ts` (1300+ sor) + `dossiers/[id]/actions.ts` monolitok refaktorálása | P3 | nagy |
| 6 | Historikus 796+579 audit-sor DB-ben (app-szűrve, csak kozmetikai) | P3 | ~30 perc |
| 7 | `CRON_SECRET` rotációs mechanizmus | P3 | ~1 óra |

---

## 5. Végső minősítés

| Szempont | Érték |
|---|---|
| **Össz-érettség** | **~92–95%** (4. körben: ~78%) |
| P0 nyitva | **0** |
| P1 nyitva | **0** (1 db hardveres szkenner tudatosan félretéve) |
| P2 nyitva | **~2** (2 policy-maradvány, dashboard SQL-aggregáció) |
| P3 nyitva | ~4 (konzisztencia, monolitok, kozmetika, secret-rotáció) |
| Tesztek | **183/183** (24 suite, ebből 38 dedikált audit-verifikációs teszt) |
| TypeScript | **0 hiba** |
| Migrációk (nov. 1-3) | 11 db, mind élő DB-n verifikálva |

**Minőségi küszöb:** a "production-ready biztonsági alapok megvannak, maradék finomítás" szint — **az eaisyDocs biztonsági és adatintegritási szempontból BEVETHETŐ** éles üzemeltetésre; a maradék ~5–8% nem biztonsági rés, hanem karbantarthatósági/performance/hardver jellegű.

---

## 6. Javasolt következő lépések

1. **Commit + push** — a teljes 7 csomag (~50 fájl + 2 migráció) még mindig commitolatlan
2. **Gyors-P2 csomag** (ai-reply guard + 2 policy-maradvány + dashboard SQL-aggregáció): ~4 óra → **92-93%**
3. Opcionális: refaktorálási sprint (monolitok) → 95%+
4. Éles üzembe állás előtt: **1 teljes füstteszt** (a HR-hez hasonló checklistkel)
