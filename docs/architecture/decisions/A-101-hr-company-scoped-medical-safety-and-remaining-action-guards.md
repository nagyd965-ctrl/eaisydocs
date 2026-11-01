# A-101: [HR] Orvosi Alkalmasság és Munkavédelmi Oktatás Cégszintű (Munkáltatónkénti) Elkülönítése, Pre-Company Táblák `company_id` Bővítése és Hátralévő Server Action Őrblokkok

**Status:** Decided  
**Date:** 2026-11-01  
**Scope:** `[HR]`  
**Author:** Agent  
**Kapcsolódó ADR:** [A-066](./A-066-multi-tenant-company-members-colleague-visibility-and-hr-workforce-isolation.md), [A-087](./A-087-hr-simplified-roles-module-permission-matrix-and-p0-calculation-hardening.md), [A-097](./A-097-use-server-exports-as-endpoints-deletion-and-guard-policy.md), [A-100](./A-100-hr-rls-company-scoped-module-access-and-service-role-guards.md)  
**Kapcsolódó Kód:** `src/app/hr/self-service/profile/page.tsx`, `src/app/hr/employee/[id]/page.tsx`, `src/app/hr/employee/[id]/actions.ts`, `src/app/hr/compliance/compliance-actions.ts`, `src/app/hr/actions/safety-training-actions.ts`, `src/app/hr/actions/idp-actions.ts`, `src/app/hr/offboarding/actions.ts`, `src/app/hr/orgunit/[id]/actions.ts`, `src/app/hr/settings/actions.ts`, `src/app/hr/cafeteria-actions.ts`, `src/app/hr/payroll/actions.ts`, `src/app/hr/time/shift-actions.ts`, `src/app/hr/attendance-actions.ts`, `src/app/hr/self-service/career/referral-actions.ts`, `src/app/hr/self-service/actions.ts`, `src/app/hr/page.tsx`, `supabase/migrations/20261101000001_hr_rls_hardening_and_company_scoped_module_access.sql`

---

## 1. Context (Kontextus)

1. **Orvosi alkalmasság és munkavédelmi oktatás többcéges működése:**
   - A magyar munkavédelmi szabályozás (1993. évi XCIII. törvény — Mvt. 49. § és 55. §, valamint a 33/1998. NM rendelet) alapján mind a **munkaköri orvosi alkalmassági vizsgálat**, mind a **munkavédelmi oktatás** szigorúan **munkáltatóhoz (céghez) és az adott munkáltatónál betöltött munkakörhöz kötött**, mivel minden cég saját foglalkozás-egészségügyi szolgáltatóval, kockázatértékeléssel és munkahelyi oktatási tematikával rendelkezik.
   - Bár az adatbázisban a `hr_orvosi_vizsgalat` és `hr_munkavedelmi_oktatas` táblák rendelkeztek `company_id` oszloppal, a Dolgozói Portál (`Profilom`), a 360° Dolgozói Karton, a Compliance Dashboard, a Műszaktervező és a Becsekkolás (`toggleCheckIn`) nem szűrt `.eq("company_id", activeCompanyId)` feltétellel, illetve cég-ellenőrzés nélkül visszaesett a `hr_dolgozo_adatlap.orvosi_alkalmassag_ervenyesseg` mezőre — ezért többcéges dolgozónál az egyik cégben rögzített orvosi és munkavédelmi érvényesség a másik cég nézetében is megjelent.
2. **Hátralévő P1/P2 Server Action őrblokkok és pre-company táblák (`eaisyhr-deep-analysis-20261101.md` 3. kategória):**
   - A 360° karton CRUD műveletei (`hr/employee/[id]/actions.ts`), az IDP terv/cél CRUD (`idp-actions.ts`), az offboarding feladat/interjú/PDF műveletek (`offboarding/actions.ts`), a szervezeti egység hozzárendelés (`orgunit/[id]/actions.ts`), a HR beállítások munkakör/céges dokumentum műveletei (`settings/actions.ts`), a cafeteria admin műveletek (`cafeteria-actions.ts`), a műszakbeosztás mentés (`shift-actions.ts`), a jelenlét-törlés és havi zárás jóváhagyás (`attendance-actions.ts`), valamint az ajánlási CV letöltés (`referral-actions.ts`) egységes modul- és cég-ellenőrzést igényeltek.
   - A `hr_tulora_felhasznalás`, `hr_munkakor_nyugtazas` és `hr_beosztas` táblákról hiányzott a `company_id` oszlop és a `RESTRICTIVE` cég-izolációs RLS szabály.

---

## 2. Decision (A Meghozott Döntés)

1. **Cégszintű (munkáltatónkénti) Orvosi és Munkavédelmi Oktatás szűrés minden felületen és ellenőrzőponton:**
   - A `hr/self-service/profile/page.tsx`, `hr/employee/[id]/page.tsx`, `hr/compliance/compliance-actions.ts`, `hr/time/shift-actions.ts` (`getWeeklyShiftRoster`, `saveShiftAssignmentAction`, `copyPreviousWeekRosterAction`), `hr/self-service/actions.ts` (`toggleCheckIn`) és `hr/actions/safety-training-actions.ts` minden `hr_orvosi_vizsgalat` és `hr_munkavedelmi_oktatas` lekérdezést és beszúrást az `activeCompanyId`-ra szűr.
   - A `hr_dolgozo_adatlap.orvosi_alkalmassag_ervenyesseg` mezőre történő fallback kizárólag akkor engedélyezett, ha `adatlap.company_id === activeCompanyId`.
2. **Teljes körű Server Action modul- és cég-őrblokkok (3. kategória lezárása):**
   - A `hr/employee/[id]/actions.ts`, `idp-actions.ts`, `safety-training-actions.ts`, `offboarding/actions.ts`, `orgunit/[id]/actions.ts`, `settings/actions.ts`, `compliance-actions.ts`, `cafeteria-actions.ts`, `payroll/actions.ts`, `shift-actions.ts`, `attendance-actions.ts` és `referral-actions.ts` összes érintett függvénye `requireHrAuthServer` / `isUserAuthorizedForHrView` és `company_id` tulajdonjog-ellenőrzést kapott.
   - A `self-service/actions.ts` és `hr/page.tsx` Budapest időzónás (`Europe/Budapest`) napi dátumszámítást (`getBudapestDateStr`) és cégszintű (`company_members`) fallback HR jóváhagyó-feloldást (`resolveFallbackHrApproverId`) használ.
3. **Pre-company táblák (`hr_tulora_felhasznalás`, `hr_munkakor_nyugtazas`, `hr_beosztas`) `company_id` migrációja (`20261101000001` 7. szekció):**
   - Mindhárom tábla megkapta a `company_id UUID REFERENCES public.companies(id)` oszlopot, az automatikus backfillt és a `RESTRICTIVE` cég-izolációs RLS szabályt; a `hr_jelenlet` tábla pedig `DELETE` policy-t (`hr_jelenlet_hr_delete`) kapott a `time`/`admin` moduljogosultak számára.

---

## 3. Consequences (Következmények)

- Cégváltáskor a Dolgozói Portálon (`Profilom`), a 360° Dolgozói Kartonon, a Compliance Dashboardon, a Műszaktervezőben és a Becsekkolásnál minden cég kizárólag a saját munkáltatói orvosi alkalmassági vizsgálatait és munkavédelmi oktatásait látja és érvényesíti.
- A 2026-11-01-es mélyelemzés 1., 2. és 3. kategóriájának összes jogosultsági, cég-izolációs és üzleti logikai pontja lezárult.

