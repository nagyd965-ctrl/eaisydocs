# A-091: [HR] Központi Eseménynapló (`/hr/audit`) Szerveroldali Lapozás, Szigorú `company_id` Izoláció és Recharts 3.10.0 + React 19 Animációs Stabilizálás

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** [HR]  
**Author:** Antigravity Agent  
**Kapcsolódó PRD:** [P-124](../../product/decisions/P-124-hr-audit-server-pagination-and-chart-stability-ux.md)  
**Kapcsolódó Kód:**
- `supabase/migrations/20261028000006_hr_audit_company_isolation_and_indexes.sql`
- `src/app/hr/audit/actions.ts`
- `src/app/hr/audit/page.tsx`
- `src/app/hr/audit/hr-notification-audit-tab.tsx`
- `src/utils/mailer.ts`
- `src/utils/sms/twilio.ts`
- `src/app/hr/admin/actions.ts`
- `src/app/hr/recruitment/actions.ts`
- `src/app/hr/self-service/actions.ts`
- `src/app/karrier/[id]/actions.ts`
- `src/components/hr/recruitment-analytics.tsx`
- `src/app/hr/performance/dashboard/components/performance-calibration-dashboard.tsx`
- `src/app/hr/performance/dashboard/components/dashboard-charts.tsx`
- `src/components/dashboard-overview.tsx`

---

## 1. Context (Kontextus)

1. **Kliensoldali `.limit(500)` korlát az Eseménynaplóban (`/hr/audit` — `30. P2`):**
   - Mind az Eseménynapló (`hr_esemeny_naplo`), mind a Kiküldési Napló (`ertesites_naplo` — `modul = 'hr'`) egyetlen lekérdezéssel maximum 500 sort töltött le a kliensre, és a dátumtartomány-szűrést, a keresést, a KPI kártyákat és a lapozást kliensoldali memóriában végezte.
   - Emiatt 500-nál több esemény után a régebbi naplóbejegyzések elérhetetlenné váltak a dátumszűrővel, a KPI kártyák értéke pedig megállt 500-nál.
2. **Adatszivárgási rés (`company_id.is.null`) a Kiküldési Naplóban:**
   - A `getHrNotificationAuditLogs` lekérdezése `.or("company_id.eq.${companyId},company_id.is.null")` feltételt használt, így a `company_id` nélkül rögzített e-mail/SMS értesítések minden vállalat naplójában megjelentek.
   - A `sendSmsNotification` (`twilio.ts`) és több HR értesítés-hívó (`admin/actions.ts`, `recruitment/actions.ts`, `self-service/actions.ts`, `karrier/[id]/actions.ts`) nem adta át minden ágon a `modul: "hr"` és `companyId` paramétereket.
3. **Recharts 3.10.0 + React 19 `Maximum update depth exceeded` hiba:**
   - A Recharts 3.10.0 `JavascriptAnimate` (`AnimationControllerImpl.js` -> `nextUpdate` / `timeoutController.js` -> `executeCallback`) képkockánkénti koordináta-interpolációja miatt a `<Bar>` belső `Rectangle.js` komponense minden képkockánál újragenerálta a `key={animationId}` értéket és szinkron `setState` hívások végtelen ciklusát indította el React 19 alatt.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Adatbázis Backfill, `BEFORE INSERT` Triggerek és Összetett Indexek (`20261028000006`)
- A `hr_esemeny_naplo` és `ertesites_naplo` táblákban minden `company_id IS NULL` rekordot visszamenőlegesen felcímkéztünk (`0` darab `NULL` rekord maradt).
- Megerősítettük a `trg_hr_esemeny_naplo_company_id` triggert és létrehoztuk a `trg_ertesites_naplo_company_id` `BEFORE INSERT` triggert az `ertesites_naplo` táblán, amely ügyiratból, kiváltó felhasználóból, címzett jelöltből vagy alapértelmezett cégből garantálja a `company_id` kitöltését.
- Létrehoztuk az `idx_hr_esemeny_naplo_company_created_at`, `idx_hr_esemeny_naplo_company_entitas` és `idx_ertesites_naplo_modul_company_mikor` indexeket.

### 2.2. Szerveroldali Audit Lekérdezés, Lapozás és Szigorú `company_id` Izoláció (`src/app/hr/audit/actions.ts`)
- Bevezettük a központi `authorizeAuditRequest` cég- és modul-alapú jogosultság-ellenőrzést (`admin`, `audit`, `compliance`).
- A `getHrEventAuditLogs` és `getHrNotificationAuditLogs` Server Action-ök szigorúan `.eq("company_id", auth.companyId)` feltétellel dolgoznak (a `company_id.is.null` kiskapu eltávolítva), szerveroldalon számítják a teljes cégre vonatkozó KPI statisztikákat, szerveroldalon szűrnek, és csak az aktuális oldalt (`page`, `pageSize`) küldik le a kliensnek (`exportAll: true` esetén a teljes szűrt adathalmazt CSV exporthoz).
- A `sendNotificationEmail` (`mailer.ts`) és `sendSmsNotification` (`twilio.ts`) automatikusan feloldja az aktív `companyId`-t, ha a hívó nem adta meg explicit módon.

### 2.3. Recharts JS Animáció Kikapcsolása (`isAnimationActive={false}`)
- Minden Recharts `<Pie>`, `<Bar>` és `<Area>` komponensen (`recruitment-analytics.tsx`, `performance-calibration-dashboard.tsx`, `dashboard-charts.tsx`, `dashboard-overview.tsx`) beállítottuk az `isAnimationActive={false}` attribútumot, így a diagramok azonnal, végtelen `setState` ciklus nélkül renderelődnek.

---

## 3. Consequences (Következmények)

- **Pozitív:**
  - Teljes többcéges (multi-tenant) izoláció mind az Eseménynaplóban, mind a Kiküldési Naplóban.
  - A történeti audit események és a KPI statisztikák 500 bejegyzés felett is pontosak és visszakereshetők.
  - A Toborzási Analitika és a Teljesítmény Kalibrációs Dashboard diagramjai React 19 alatt is stabilan, futásidejű hiba nélkül működnek.
