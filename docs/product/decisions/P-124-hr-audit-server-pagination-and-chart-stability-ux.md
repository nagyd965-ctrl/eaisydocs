# P-124: [HR] Központi Eseménynapló (`/hr/audit`) Szerveroldali Lapozás, Teljes CSV Export és Diagram-stabilitás UX

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** [HR]  
**Category:** HR  
**Author:** Antigravity Agent  
**Kapcsolódó ADR:** [A-091](../../architecture/decisions/A-091-hr-audit-server-pagination-company-isolation-and-recharts-fix.md)  
**Kapcsolódó Kód:**
- `src/app/hr/audit/page.tsx`
- `src/app/hr/audit/hr-notification-audit-tab.tsx`
- `src/app/hr/audit/actions.ts`
- `src/components/hr/recruitment-analytics.tsx`
- `src/app/hr/performance/dashboard/components/performance-calibration-dashboard.tsx`

---

## 1. Question / Problémafelvetés

1. **500-as vágás és cégek közötti átlátszás az Eseménynaplóban (`/hr/audit`):**
   - Az Eseménynapló és a Kiküldési Napló korábban csak a legutolsó 500 sort töltötte le, így a régebbi eseményekre nem lehetett rákeresni, a Kiküldési Naplóban pedig a `NULL` cégazonosítójú értesítések minden cégnél megjelentek.
2. **Toborzási Analitika (`/hr/recruitment`) diagram összeomlás:**
   - A Recharts 3.10.0 animációs ciklusa React 19 alatt `Maximum update depth exceeded` hibát dobott a Toborzási Analitika nézet megnyitásakor.

---

## 2. Decision (A Meghozott Döntés)

1. **Szerveroldali lapozás, valós idejű KPI kártyák és teljes CSV export (`/hr/audit`):**
   - Az **Eseménynapló** és a **Kiküldési Napló** fülek felső 4–4 kanonikus `KpiCard` kártyája a kiválasztott vállalat teljes naplótörténetének valós számait mutatja.
   - A keresés, a dátumtartomány-szűrés és a szűrőcsoportok szerveroldalon futnak le, a táblázat pedig oldalanként (`10 / 15 / 25 / 50 / 100 sor`) tölti be a találatokat.
   - A **CSV Export** gomb a szerverről a szűrésnek megfelelő teljes adathalmazt (`exportAll: true`) tölti le, nem csak az aktuális oldalt.
   - Az Eseménynapló táblázatban és a részletező modálban a végrehajtó felhasználó mellett a tényleges aktív munkaköre (`ervenyes_ig IS NULL`) és céges szerepköre jelenik meg.
2. **Azonnali, animációmentes diagram-renderelés (`isAnimationActive={false}`):**
   - A Toborzási Analitika, a Teljesítmény Kalibrációs Dashboard és a Főoldali Irányítópult diagramjai késleltetés és `Maximum update depth exceeded` hiba nélkül, azonnal kirajzolódnak.
