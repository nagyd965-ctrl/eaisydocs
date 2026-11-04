# Ellenőrző Agent Észrevételei — Teljes Rendszer Audit (2026.11.04)

> **Szerző:** Ellenőrző agent (reviewer)
> **Forrás:** 3 párhuzamos területi mélyvizsgálat (DB/RLS + Frontend/UI/UX + Backend/Workers) → `docs/develop/teljes-rendszer-audit-20261104.md`
> **A másik agent elemzése:** `docs/full-system-deep-audit-20261104.md` (kereszt-ellenőrzés alább)

---

## 1. A saját mérés összefoglalója

| | eaisyDocs | eaisyHR | Összes |
|---|:---:|:---:|:---:|
| **Érettség** | **~87%** | **~89%** | **~88%** |
| P0 | 1 | 0 | 1 |
| P1 | ~5 | ~6 | ~11 |
| P2 | ~12 | ~14 | ~26 |

---

## 2. AZONNALI teendők (launch ELŐTT kötelező)

### P0 — Rollback SQL fájlok
A `supabase/migrations/rollback_*.sql` (3 db) fájlok a migrations mappában vannak. A Supabase CLI minden `.sql`-t migrációként értelmez — friss DB-n (reset, push, új env) a lánc végén **visszavonják a teljes multi-tenant architektúrát** (DROP COLUMN company_id CASCADE, restrictive policy-k törlése, companies/company_members drop). **5 perc javítani: mappán kívülre helyezni.**

### P1-határ — Edge function
A `supabase/functions/anonymize-candidates/index.ts` **nincs autentikálva** — a publikus anon kulccsal hívva minden cég 6 hónapnál régebbi jelentkezőit anonimizálja/törli. Ráadásul elavult duplikátum (más státuszérték, más bucket, mint az élő `/api/cron/gdpr-anonymize`). **Deaktiválni vagy verify_jwt-t bekapcsolni.**

---

## 3. A legfontosabb P1-ek (1. hullám — ~1 nap)

### DB/RLS réteg (5 tétel)

| # | Tábla/Függvény | Probléma |
|---|---|---|
| 1 | `hr_toborzas` + `hr_teljesitmeny` | Globális `felhasznalo_profil.szerepkor` policy-k (20260721000006) — SOSEM cserélve cég-scoped `has_hr_module_access`-re. Cégén belül a modul-mátrix megkerülhető. |
| 2 | `hr_reports` storage bucket | SELECT/INSERT/UPDATE globális `hr_szerepkor`-on — **nincs cég-ellenőrzés** → bármely cég HR-ese más cég bérraport-fájlját olvassa |
| 3 | `partner` tábla | `USING(true)` permissive policy sosem cserélve (20260714183741:30) → partnerek módosíthatók modul-jog nélkül |
| 4 | `has_hr_module_access` SQL | (a) Nem ellenőrzi `elerheto_modulok`-ban a 'hr'-t (docs-oldali aszimmetria), (b) NULL-céges fallback-ben `fp.docs_szerepkor='admin'` is enged → **cross-modul eszkaláció** |
| 5 | `ugyirat_megjegyzes_csatolmany` | INSERT/DELETE csak `feltoltotte_user_id` — nincs ügyirat-láthatóság/cég-ellenőrzés |

### Frontend réteg (4 tétel)

| # | Oldal | Probléma |
|---|---|---|
| 6 | `/settings` page.tsx:75-82 | `isAdmin`-t a **globális profil** szerepkör is feloldja (nem csak a cég-admin) → nem-cég-admin látja az admin paneleket és credential-státuszt |
| 7 | `permissions-matrix-view.tsx:54` | `useState(initialEmployees)` prop-sync NÉLKÜL + a szülő oldalon nincs key-remount → **cégváltás után a jogosultsági mátrix az előző cég dolgozóit mutatja** |
| 8 | `settings-client.tsx:61-69` | IMAP host/port/user/enabled + fourEyes mezők előző cég adataival ragadnak be (nincs key-remount, nincs prop-sync) |
| 9 | `src/app/hr/**` | **25+ HR-útvonalon NINCS loading.tsx** — navigáció közben a régi nézet fagyaszott marad (A-029/A-057 csak a Docs-hoz készült el) |

### Backend réteg (2 tétel)

| # | Action | Probléma |
|---|---|---|
| 10 | `supabase/functions/anonymize-candidates` | Lásd P0-fenti |
| 11 | `disposal-actions.ts:77-89` | Selejtezési csomag-létrehozási hiba csak `console.error` → a ciklus **csomag nélkül** állítja be az ügyiratokat `selejtezheto`-re → nyomtalanul selejtezhető iratok |

---

## 4. HR oldali cap-hiány (fontos aszimmetria!)

A **Docs** oldalon a resolver (company-role-resolver.ts:459-463) a globális admin-t `munkavallalo`-ra degradálja idegen cégben. A **HR** oldalon (490-496) ez a cap **NINCS** — a globális `hr_szerepkor='admin'` user idegen cégben is admin marad és `isCompanyAdmin=true` lesz.

Ez **P2 szintű**, mert a `has_hr_module_access` SQL-ben a cég-scoped ág a tagságot és a `cm.hr_szerepkor`-t ellenőrzi — tehát az RLS védi. De a TS resolver és az SQL közötti **aszimmetria** logikai tisztázást igényel: vagy a HR is kap cap-et, vagy a Docs-ból vesszük ki.

---

## 5. Titkosítás-valóság (GDPR-szempont)

A `get_decrypted_hr_data` / `update_decrypted_hr_data` RPC-k `encode/decode('escape')`-et használnak — ez **NEM titkosítás**, csak byte-escape. A TAJ-szám, adóazonosító, bankszámlaszám és bruttóbér tehát **plaintext-ben** áll az adatbázisban (bár RLS mögött). A `SECURITY DEFINER` függvényeken nincs `SET search_path` pin.

**P2 besorolás** — működésileg nem tör, de GDPR-auditnál kellemetlen kérdés lehet.

---

## 6. Ami KIVÁLÓ (meg kell jegyezni)

- **401 exportált server action → ~95% ténylegesen védett, 0 guard nélküli író** ✔
- **0 RLS-disabled tábla**, 0 anon-policy (karrierportál kivétel — indokolt) ✔
- **Guard-infrastruktúra**: `requireDocsAuthServer` + `requireHrAuthServer` + `requireHrWriteServer` + ~15 verify-helper — **több mint 250 hívási pont** ✔
- **Multi-tenant**: restrictive policy-k + `user_has_company_access` minden fő táblán ✔
- **3-szintű szerepkör + modul-mátrix + write-mátrix** — end-to-end (Dashboard → sidebar → gomb → server → RLS) ✔
- **Cron**: mind a 4 timing-safe, header-only, company-scoped ✔
- **IMAP**: dedup + cég-kötés + SSRF-védelem ✔
- **AI-worker**: atomi claim + rate-limit + backoff ✔
- **TableToolbar** 35+ komponensben ✔ | **Zero-emoji** 100% ✔ | **Zero hover:shadow** 100% ✔
- **Cégváltás**: 18 oldal key-remount + ~28 useEffect-sync ✔
- **185/185 teszt + tsc: 0** ✔

---

## 7. Javítási prioritás (idő-becsléssel)

| Hullám | Tételek | Munka |
|---|:---:|:---:|
| **AZONNALI** | P0 rollback + edge function | 15 perc |
| **1. hullám** | 5 DB-policy + 4 frontend P1 + disposal-integritás | ~1 nap |
| **2. hullám** | ~14 P2 (backend keményítés, loading, aria) | ~1 nap |
| **3. hullám** | ~18 P3 (csiszolás, kozmetika) | ~1-2 nap |
| **Összesen** | ~55 tétel | **~3-4 nap** |

**A P0 + P1 zárása után (~1,5 nap): ~92-93%.** A P2 zárásával: **~95%** — ami éles üzemelésre reális felső határ.
