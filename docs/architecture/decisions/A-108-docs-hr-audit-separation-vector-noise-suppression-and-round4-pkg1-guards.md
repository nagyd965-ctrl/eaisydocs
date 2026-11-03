# A-108: [Közös] / [Docs]: HR és Docs Eseménynapló (`hr_esemeny_naplo` vs. `esemeny_naplo`) Trigger-szintű Szétválasztása, Technikai Vektor/FTS Zaj-szűrés, `elerheto_modulok` Modul-izoláció és 4. Körös Audit 1. Csomag (1–5. pont) Védelmek

**Status:** Decided  
**Date:** 2026-11-02  
**Scope:** `[Közös]` `[Docs]`  
**Author:** Antigravity  
**Kapcsolódó PRD:** [P-137](../../product/decisions/P-137-docs-central-audit-structured-diff-modal-and-module-isolation-ux.md)  
**Kapcsolódó Kód:** `supabase/migrations/20261102000003_separate_hr_and_docs_audit_logs.sql`, `src/app/audit/actions.ts`, `src/app/audit/page.tsx`, `src/utils/audit-log-formatter.ts`, `src/app/dossiers/page.tsx`, `src/utils/company-server.ts`, `src/utils/docs-auth-guard.ts`, `src/app/actions/company-actions.ts`, `src/app/api/cron/gdpr-anonymize/route.ts`, `src/app/archive/actions.ts`, `src/app/settings/settings-actions.ts`, `src/utils/__tests__/audit-round4-pkg1.test.ts`

---

## 1. Context (Kontextus)

Az élő tesztelés és a 4. körös biztonsági/architektúrális audit (`docs/develop/eaisydocs-javitasijegyek-20261102.md`) három összefüggő problémakört tárt fel:

1. **Moduláris audit- és szerepkör-szivárgás (`J-27a`):**
   - Korábbi HR migrációk 12 `hr_*` táblára (`hr_jelenlet`, `hr_toborzas`, `hr_munkakor_leiras_verzio`, `hr_munkakor_nyugtazas`, `hr_dokumentum`, `hr_dolgozo_adatlap`, `hr_tavollet`, stb.) az eaisyDocs `public.log_audit_event()` triggerét kötötték rá, amely a `public.hr_esemeny_naplo` helyett az eaisyDocs `public.esemeny_naplo` táblájába írt. Amint a `20261102000001` migráció visszamenőlegesen kitöltötte a `company_id` oszlopot, a HR-es események (pl. munkaidő-becsekkolás: `Hr jelenlet`) megjelentek az eaisyDocs Központi Eseménynaplóban (`/audit`).
   - Emellett a `felhasznalo_profil.docs_szerepkor` oszlop `NOT NULL DEFAULT 'ugyintezo'` kényszere és a `src/app/hr/admin/actions.ts:197` (`updateData.docs_szerepkor = "betekinto"`) miatt a kizárólag `eaisyHR` modullal rendelkező (`elerheto_modulok = ['hr']`, nincs `'docs'`) dolgozók technikai `'betekinto'` vagy `'ugyintezo'` szerepkört kaptak az eaisyDocs-ban.
2. **Technikai háttér-frissítések (`embedding` és `kereso_vektor`) audit-zaja (`J-28`):**
   - Az `irat.embedding` (1536 elemű AI vektor) és `irat.kereso_vektor` (FTS `tsvector`) háttér-frissítései minden alkalommal `AFTER UPDATE` audit sort generáltak `auth.uid() = NULL` (`Rendszer / Automatizmus`) és érdemi üzleti mezőváltozás nélkül (~990 db technikai no-op sor az élő adatbázisban).
3. **4. körös audit 1. Csomag (1–5. pont) alkalmazásszintű őrblokkok (`J-14`, `J-12`, `J-8`, `J-10`, `J-11`):**
   - A `/api/cron/gdpr-anonymize` végpont nem ellenőrizte a `!process.env.CRON_SECRET` hiányát (`J-14`).
   - A `settings-actions.ts` `addUsersToDepartment` függvénye nem szűrte a `userIds` tömböt az aktív cég `company_members` tagjaira (`J-12`).
   - A `forceExpireAllDossiers` (`archive/actions.ts`) nem követelt meg `admin`/`rendszergazda` szerepkört és nem tiltotta a `null` `activeCompanyId` esetet (`J-8`).
   - A `createDepartment` (`settings-actions.ts`) nem hívta meg a `requireDepartmentAdminAccess()` őrblokkot és nem validálta a `szulo_id`/`vezeto_id` cég-azonosságát (`J-10`).
   - A `getTeamMembers` (`settings-actions.ts`) nem ellenőrizte a `supabase.auth.getUser()`-t, és `activeCompanyId === null` esetén globális listát adott vissza (`J-11`).

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Trigger-szintű HR/Docs napló-szétválasztás és technikai no-op szűrés (`20261102000003_separate_hr_and_docs_audit_logs.sql`)
- A `public.log_audit_event()` triggerfüggvény:
  1. Mindig eltávolítja az `embedding` és `kereso_vektor` kulcsokat a `v_old_data` és `v_new_data` JSONB objektumokból (`- 'embedding' - 'kereso_vektor'`), így az 1536 elemű lebegőpontos vektorok soha nem terhelik a naplótáblákat.
  2. `TG_OP = 'UPDATE'` esetén, ha a `v_old_data - 'updated_at' - 'company_id'` és `v_new_data - 'updated_at' - 'company_id'` megegyezik, a tisztán technikai háttér-frissítést kihagyja (`RETURN NEW`).
  3. Ha `TG_TABLE_NAME LIKE 'hr_%'`, a naplóbejegyzést kizárólag a `public.hr_esemeny_naplo` táblába szúrja be (`modul = 'hr'`), és soha nem az eaisyDocs `public.esemeny_naplo` táblájába.
  4. Ha `auth.uid()` értéke `NULL` (pl. háttérfolyamat vagy `service_role` beszúrás), visszaesik a rekord `rogzito_user_id` vagy `felelos_user_id` mezőjére.

### 2.2. `elerheto_modulok` `'docs'` modul-izoláció és `/audit` UUID/csatorna feloldás
- A [`src/app/audit/actions.ts`](../../../src/app/audit/actions.ts) `.not("entitas_tipus", "ilike", "hr_%")` szűrést és `isPureTechnicalNoopUpdate` szűrőt alkalmaz a korábbi ~990 technikai sor kizárására, valamint feloldja a felhasználói, partner (`partnerMap`), ügyirat (`dossierMap`) és szervezeti egység (`deptMap`) UUID-kat és a külső érkeztetési csatornákat (`eaisyBill Szinkron`, `E-mail Érkeztető`, `Batch Szkenner`).
- A [`src/app/dossiers/page.tsx`](../../../src/app/dossiers/page.tsx), [`src/utils/company-server.ts`](../../../src/utils/company-server.ts), [`src/utils/docs-auth-guard.ts`](../../../src/utils/docs-auth-guard.ts) és [`src/app/actions/company-actions.ts`](../../../src/app/actions/company-actions.ts) ellenőrzi, hogy a felhasználó `elerheto_modulok` tömbje tartalmazza-e a `'docs'` modult; ha nem, a technikai `felhasznalo_profil.docs_szerepkor` default értékét figyelmen kívül hagyja.

### 2.3. 4. körös audit 1. Csomag (1–5. pont) védelmi javítások
1. **`gdpr-anonymize/route.ts` (`J-14`):** `if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)` ellenőrzés.
2. **`addUsersToDepartment` (`J-12`):** A `userIds` tömböt a `company_members` táblán keresztül leszűri az `activeCompanyId` tagjaira (`validUserIds`).
3. **`forceExpireAllDossiers` (`J-8`):** Kötelező `activeCompanyId` + `requireDocsAuthServer(["admin", "rendszergazda"], activeCompanyId)` őrblokk.
4. **`createDepartment` (`J-10`):** `requireDepartmentAdminAccess()` hívás + `szulo_id` és `vezeto_id` cég-azonosság ellenőrzése.
5. **`getTeamMembers` (`J-11`):** Kötelező `supabase.auth.getUser()` + `if (!activeCompanyId) return { profiles: [] }`.

---

## 3. Consequences (Következmények)

- **Pozitív:** Az eaisyDocs `/audit` felületén megszűnt a HR-es események és a 990 db technikai vektor-frissítés megjelenése; a tisztán `eaisyHR` jogosultságú munkatársak nem jelennek meg az eaisyDocs-ban; az 1. csomag 5 végpontja pedig cég- és szerepkör-szinten védett (a `src/utils/__tests__/audit-round4-pkg1.test.ts` tesztekkel igazolva).
- **Kockázat / Kompromisszum:** Az `esemeny_naplo` adatbázisszintű `append-only` védelme miatt a korábbi technikai sorokat nem töröltük fizikailag az `esemeny_naplo` táblából, hanem a lekérdezésben (`isPureTechnicalNoopUpdate` és `.not("entitas_tipus", "ilike", "hr_%")`) szűrjük ki őket, miközben az új trigger már nem állít elő ilyen sorokat.
