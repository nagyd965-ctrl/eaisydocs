# P-143: [Közös] / [Docs] / [HR] 5-Szintű Audit Javítások Felhasználói Élménye — Cégváltás Állapot-Szinkronizáció, Read-Only Előnézeti Útvonalak és Szerepkör-Váltási Modul-Reset UX

**Status:** Decided  
**Date:** 2026-11-04  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Category:** `Multi-Tenancy, Read-Only UX & Permission Matrix Synchronization`  
**Kapcsolódó ADR:** [A-114](../../architecture/decisions/A-114-unified-5-level-security-rls-and-cross-module-hardening.md)  
**Kapcsolódó BRD:** [BRD-013](../../business/decisions/013-unified-5-level-audit-payroll-holiday-and-policy-rules.md)  
**Kapcsolódó Audit Terv:** [`docs/egyesitett-audit-es-javitasi-terv-20261104.md`](../../egyesitett-audit-es-javitasi-terv-20261104.md)  
**Kapcsolódó Kód:** `src/components/hr/permissions-matrix-view.tsx`, `src/app/settings/page.tsx`, `src/app/settings/notification-settings.tsx`, `src/app/hr/employee/[id]/page.tsx`, `src/app/hr/employee/[id]/tabs/PersonalDataTab.tsx`, `src/app/hr/organization/page.tsx`, `src/app/hr/admin/page.tsx`, `src/components/inbox-table-client.tsx`, `src/app/inbox/[id]/page.tsx`, `src/app/rules/page.tsx`, `src/app/rules/rules-client.tsx`, `src/app/audit/notification-audit-tab.tsx`, `src/app/management/actions.ts`

---

## 1. Kontextus és Felhasználói Probléma

Az 5-szintű rendszeraudit ([`docs/egyesitett-audit-es-javitasi-terv-20261104.md`](../../egyesitett-audit-es-javitasi-terv-20261104.md)) során azonosított UX és jogosultsági hiányosságok:
1. **Cégváltás utáni beragadt kliensállapot (Stale State):** A `PermissionsMatrixView` (`useState(initialEmployees)`) cégváltáskor nem frissült az új cég dolgozói listájára.
2. **Read-Only előnézeti csapda a Bejövő sorban (`/inbox`):** A tisztán olvasási jogú (`canEdit = false`) felhasználóknál a gyorsnézet (`Eye`) gomb rejtve maradt, a sorra kattintás pedig a szerkesztő (`/inbox/[id]`) útvonalra irányított, amely visszadobta a felhasználót ahelyett, hogy az olvasási előnézetre (`/inbox/view/[id]`) vitte volna.
3. **Read-Only vs. Admin jogosultsági különbségtétel (`/hr/employee/[id]`, `/hr/organization`, `/hr/admin`, `/rules`, `/settings`):** A 3-szintű modellben az olvasási és írási jogosultságokat (`hasHrWriteAccess` / `hasDocsWriteAccess`) külön kell kezelni a képernyőkön (`PersonalDataTab`, `RulesClient`, `NotificationSettings`).
4. **Management szerepkör-módosítás:** Ha a `/management` felületen egy felhasználót a 3 kanonikus szerepkör (`munkavallalo`, `vezeto`, `admin`) között átállítanak (pl. `admin` -> `munkavallalo`), a korábbi szerepkörből származó modul-jogosultságoknak automatikusan az új szerepkör alapértelmezett készletére kell visszaállniuk.

## 2. Megvalósított UX és Képernyő-Viselkedés

1. **Azonnali állapot-szinkronizáció cégváltáskor:** A `PermissionsMatrixView` `useEffect`-tel szinkronizálja az `initialEmployees` propot, így a bal oldali cégválasztóban történő váltás után azonnal az új vállalat állománya és jogosultsági mátrixa jelenik meg.
2. **Zökkenőmentes Read-Only előnézet az `/inbox`, `/rules` és `/settings` oldalakon:**
   - Az `InboxTableClient` táblázatban a gyorsnézet (`Eye`) gomb olvasási joggal is elérhető, a `/inbox/[id]/page.tsx` pedig `!canEdit` esetén automatikusan a `/inbox/view/${id}` előnézeti nézetre irányít át.
   - A `/rules` oldal olvasási joggal is megnyitható, és a `RulesClient` a `canEdit` prop alapján jeleníti meg vagy rejti el a szabály-módosító vezérlőket.
   - A `/settings` oldalon az értesítési csatorna-kapcsolók (`NotificationSettings`) nem-admin felhasználónál `disabled={!isAdmin}` védelmet kapnak.
3. **Dolgozói Adatlap (`PersonalDataTab`) és Vállalati Szabályzatok letöltése:**
   - A `PersonalDataTab` külön kezeli a megtekintési (`isHrOrAdmin`) és a szerkesztési (`canEdit`) jogosultságot, a saját profilját szerkesztő dolgozónál pedig védi a HR-érzékeny törzsadatokat (`szuletesi_datum`, `gyermekek_szama`, `megvaltozott_munkakepessegu`).
   - A dolgozók saját önkiszolgáló felületükről (`403` hiba nélkül) letölthetik a vállalati szabályzatokat (`hr_ceges_dokumentum`), és minden letöltés bekerül a `hr_esemeny_naplo` auditnaplóba.
4. **Egységes Next.js betöltési vázak (`loading.tsx`) az összes `eaisyHR` útvonalon (`src/app/hr/**/loading.tsx` — 32 fájl):**
   - Az `eaisyDocs` mintájára mind a 32 `src/app/hr/**` útvonalhoz elkészült a kanonikus `loading.tsx` betöltési váz (`<DashboardSkeleton />` a 4 áttekintő/dashboard oldalhoz, `<DetailSkeleton />` a 6 részletező `[id]` és profil oldalhoz, valamint `<ContentSkeleton />` a 22 táblázatos és modul oldalhoz), azonnali vizuális visszajelzést nyújtva a navigáció során.
