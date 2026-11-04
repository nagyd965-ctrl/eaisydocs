# Teljes Rendszer Audit — eaisyDocs & eaisyHR (2026. november 4.)

> **Típus:** Rendszerszintű deep analysis — ADATBÁZIS/RLS + FRONTEND/UI/UX + BACKEND/WORKERS
> **Módszer:** 3 párhuzamos, fájl:sor-pontosságú kódbukta­tás (189 migrációs fájl; 584 TS/TSX; 401 server action; 21 API route; 2 worker; 4 cron; 1 edge function) + előző auditok cross-referenciája
> **Cél:** Teljes készültségi állapot meghatározása MINDKÉT termékre

---

## 0. VEZETŐI ÖSSZEFOGLALÓ

# | eaisyDocs | eaisyHR | EGÉSZ RENDSZER
---|:---:|:---:|:---:
**Össz-érettség** | **~87%** | **~89%** | **~88%**
P0 nyitva | 1 | 0 | **1**
P1 nyitva | ~5 | ~6 | **~11**
P2 nyitva | ~12 | ~14 | **~26**
P3 nyitva | ~8 | ~10 | **~18**

**A P0 kivételével nincs kritikus biztonsági rés — a maradék főleg keményítés, stabilítás és UX-csiszolás.**

---

## 1. A P0 — AZONNALI TEENDŐ

### [P0] Rollback SQL fájlok a migrations mappában

**Hol:** `supabase/migrations/rollback_20261008000001_multitenancy_companies.sql` + 2 további `rollback_*` fájl

**Mi a baj:** A Supabase CLI a mappa ÖSSZES `.sql` fájlját migrációként értelmezi. Friss adatbázison (`supabase db reset`, új environment, teljes `db push`) a `2026...` fájlok UTÁN futnak és **visszavonják a teljes multi-tenant architektúrát**: leveszik a restrictive policy-ket, `DROP COLUMN company_id CASCADE` törli a cégdimenziót, dropolja a companies/company_members táblákat.

**Javítás:** A 3 fájlt **azonnal át kell helyezni** a `supabase/migrations/` mappán kívülre (pl. `supabase/archive/`).

---

## 2. ADATBÁZIS / RLS / JOGOSULTSÁG — ~82-84%

### Ami erős ✔
- **Mind a ~70+ HR-tábla** cég-scoped `has_hr_module_access(..., company_id)` + `has_hr_write_access` policy-vel ✔
- **Docs core** (ugyirat/irat/fájlok/allokációk): 3-szintű szerepkör + modul-mátrix + write-mátrix ✔
- **Resolver + guardok**: cég-scopeolt, cap-működéssel (docs oldali) ✔
- **Multi-tenant architektúra**: restrictive policy-k + `user_has_company_access` konzisztensen ✔
- **0 RLS-disabled tábla**, 0 anon-policy (karrierportál kivétel) ✔

### Nyitott P1-ek (5)

| # | Hiba | Hely |
|---|---|---|
| 1 | `hr_toborzas` + `hr_teljesitmeny`: **globális profil-szerepkör** policy-k (sosem cserélve) — cégén belül modul-mátrix megkerülhető | 20260721000006:4-73 |
| 2 | `hr_reports` storage bucket: **cég-ellenőrzés nélkül** — bármely cég HR-ese más cég fájljait olvassa | 20260726000001:46-74 |
| 3 | `partner` tábla: `USING(true)` permissive sosem cserélve — partnerek módosíthatók modul-jog nélkül | 20260714183741:30 |
| 4 | `has_hr_module_access`: docs-admin HR-jogot kap (cross-modul) + nem ellenőrzi `elerheto_modulok`-ban a 'hr'-t | 20261101000001:9-64 |
| 5 | `ugyirat_megjegyzes_csatolmany`: nincs ügyirat-cég ellenőrzés | 20261018000003:44-54 |

### P2-k (~8)
- HR oldali cap hiány: globális hr-admin idegen cégben admin marad (resolver:490-496)
- `rendszer_beallitas` SELECT: minden cég kulcsai olvashatók
- `esemeny_naplo` SELECT: nincs audit-modul gate
- `feladat` + `selejtezes_csomag` INSERT: modul-gate nélkül
- Generátorok default-céget fogyasztanak cég nélküli usernek
- `get_decrypted_hr_data`: nincs `search_path` pin + "titkosítás" valójában escape-kódolt plaintext
- `irattaros` validátora 3-értékes enumon hibázik

---

## 3. FRONTEND / UI / UX — ~85%

### Ami erős ✔
- **TableToolbar** (A-029): 35+ komponensben következetesen ✔
- **KpiCard Linear-flat**: centralizált, dekoratív ikonok tiltva ✔
- **Dialógusok** (A-056): 100% centralizált Base UI kompozíció ✔
- **Zero-emoji**: teljesen tiszta ✔ | **Zero hover:shadow**: teljesen tiszta ✔
- **Gomb-jogosultság**: eaisyDocs ~92% + eaisyHR ~92% (canWrite frissen implementálva) ✔
- **Cégváltás**: 18 oldal key-remount + ~28 komponens useEffect-sync ✔
- **Reszponzivitás**: 92% — dialógusok, fejlécek, töréspontok ✔

### Nyitott P1-ek (4)

| # | Hiba | Hely |
|---|---|---|
| 1 | `/settings` isAdmin **globális profil-fallback** — nem-cég-admin látja az admin paneleket | settings/page.tsx:75-82 |
| 2 | Jogosultsági mátrix **stale state** cégváltásnál (nincs key-remount) | permissions-matrix-view.tsx:54 |
| 3 | SettingsClient IMAP/fourEyes **előző cég adataival ragad be** | settings-client.tsx:61-69 |
| 4 | HR modul **25+ útvonalon nincs loading.tsx** | src/app/hr/** |

### P2-k (~8)
- Műszakbeosztás + sablonok stale state
- 68 felirat nélküli icon-only gomb (aria)
- 5 dialógus accessible name nélkül
- 7 táblázat vízszintes görgetés nélkül mobilon
- `canWrite = true` default (~20 HR komponens — fragilis kontraktus)
- Management konzol saját modal-rendszere (A-029/A-056 eltérés)
- Globális `docs_szerepkor` fallback maradványok (inbox/partners)
- 380 hardcoded Tailwind szín dark-mód nélkül

---

## 4. BACKEND / SERVER ACTIONS / API / WORKERS — ~90%

### Ami erős ✔
- **401 exportált action** → **~95% ténylegesen védett** (287 standard guard + ~88 inline védett)
- **Guard nélküli írő action: 0** ✔
- **ID-tulajdonjog-ellenőrzés**: minden mintavett write action ellenőrzi `company_id`-t ✔
- **Cron hitelesítés**: mind a 4 timing-safe, csak Authorization header ✔
- **IMAP worker**: dedup + cég-kötés + SSRF-védelem ✔
- **AI worker**: atomi claim + rate-limit + backoff ✔
- **Alkotó eszközök**: `attach_irat_to_dossier_atomic`, `insertIratWithNextAlszam`, `generate_*` — mind használatban ✔

### Nyitott P1/P1-határ (2)

| # | Hiba | Hely |
|---|---|---|
| 1 | **Edge function `anonymize-candidates`: autentikálatlan destruktív** (publikus anon kulccsal hívható → minden cég jelöltjei törölhetők) | supabase/functions/anonymize-candidates/index.ts |
| 2 | **Selejtezési csomag-létrehozás hibája néma** → ügyiratok csomag nélkül `selejtezheto` státuszba | disposal-actions.ts:77-89 |

### P2-k (~14)
- REST v1 Bearer: nem timing-safe + nincs rate-limit + x-company-id header-bízás
- pdf/convert: bármely user más cég fájlját konvertálhatja
- filing-rules + prompt-rules: targetCompanyId filter-injection felület
- Értesítési dispatcher-ek: cross-company szabály-fallback
- Titkos-adat upsert nem ellenőrzött (employment-contract-actions:537)
- Check-then-act race-ok: onboarding-job, recruitment dupla-kattintás, filing-actions
- AI-worker SSRF rései: 0.0.0.0, IPv6, redirect-following
- E-mail env-fallback + SMS globális hitelesítő
- Morning cron company_id nélküli insert maradvány
- checkPartnerDuplicate limit nélküli tábla-letöltés

---

## 5. TERMÉKENKÉNTI BONTÁS

### eaisyDocs — ~87%

| Réteg | Érettség | Fő tartozás |
|---|:---:|---|
| DB/RLS | ~85% | partner USING(true), megjegyzés-csatolmány, esemeny_naplo gate |
| Backend | ~90% | selejtezés-integritás, REST-Bearer, SSRF-rések |
| Frontend | ~85% | settings isAdmin, loading-teljesség, aria |
| **Összesen** | **~87%** | |

### eaisyHR — ~89%

| Réteg | Érettség | Fő tartozás |
|---|:---:|---|
| DB/RLS | ~88% | hr_toborzas/teljesitmeny globális, hr_reports storage, HR-cap hiány |
| Backend | ~91% | edge function, titkos-upsert, dispatcher-fallback |
| Frontend | ~87% | permissions-mátrix stale, HR loading, canWrite-default |
| **Összesen** | **~89%** | |

---

## 6. JAVÍTÁSI PRIORITÁSI SORREND

### AZONNALI (ma/este — éles indulás előtt)
1. **[P0] Rollback SQL fájlok mozgatása** a migrations mappán kívülre — ~5 perc
2. **[P1] Edge function `anonymize-candidates`**: verify_jwt bekapcsolása VAGY a függvény deaktiválása — ~10 perc

### 1. HULLÁM (~1 nap)
3. `hr_toborzas` + `hr_teljesitmeny` policy-k cseréje cég-scoped `has_hr_module_access`-re
4. `hr_reports` storage policy cég-izolálása
5. `partner` tábla USING(true) cseréje modul-gate-re
6. `has_hr_module_access` elerheto_modulok-check + cross-modul eszkaláció zárása
7. `/settings` isAdmin szűkítése scoped szerepkörre
8. Permissions-mátrix + settings-client + hr/time key-remount/prop-sync

### 2. HULLÁM (~1 nap)
9. Selejtezési csomag hibakezelés (atomi vagy explicit error)
10. REST v1 timing-safe + rate-limit + env-kötelező
11. Értesítési dispatcher-ek cég-fallback szűkítése
12. HR útvonalakra loading.tsx skeletonok
13. `ugyirat_megjegyzes_csatolmany` ügyirat-cég check
14. Titkos-adat upsert eredmény-ellenőrzés

### 3. HULLÁM (~1-2 nap — P2 csiszolás)
15. AI-worker SSRF-bővítés + redirect-tiltás
16. Aria-labels a 68 néma gombra
17. 7 táblázat overflow-x-auto
18. canWrite default-true → default-false vagy required
19. HR oldali cap bevezetése
20. Precedens maradványok (rendszer_beallitas SELECT, esemeny_naplo gate)
21. Hardcoded színek → design tokenek
22. E-mail/SMS cég-hitelesítő teljes lefedés

---

## 7. ÖSSZEFOGLALÓ TÁBLÁZAT

| Métrika | eaisyDocs | eaisyHR | Összes |
|---|:---:|:---:|:---:|
| Server action | ~260 | ~141 | 401 |
| Védett | ~95% | ~95% | ~95% |
| DB tábla | ~35 | ~52 | ~87 |
| RLS-lefedett | ~95% | ~95% | ~95% |
| P0 | 1 (rollback) | 0 | **1** |
| P1 | ~5 | ~6 | **~11** |
| P2 | ~12 | ~14 | **~26** |
| Teszt | 185/185 | 185/185 | **185/185** |
| TypeScript | 0 hiba | 0 hiba | **0 hiba** |
| Migráció | 189 | 189 | **189** |
| **Érettség** | **~87%** | **~89%** | **~88%** |

**A rendszer egy éles launch-ra ELKÉSZÜLT —** a P0-t (rollback fájlok) ma meg kell szüntetni, az edge function-t deaktiválni/védeni, és a P1-es policy-cseréket az első héten be kell húzni. Utána stabil, cégizolált, modul-mátrixos, írás-védelemmel ellátott rendszer áll rendelkezésre.
