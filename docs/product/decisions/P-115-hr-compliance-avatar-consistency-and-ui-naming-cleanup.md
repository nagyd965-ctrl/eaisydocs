# [HR] PRD P-115: Compliance Hub Dolgozói Avatar Egységesítés és eaisyHR Menü / Cím Letisztítás UX

## Státusz
Elfogadva

## Dátum
2026-10-25

## Döntéshozók
eaisyHR Termékfejlesztési Csapat, UI/UX Lead

## Kontextus és Felhasználói Igény
1. **Compliance Hub Avatar Inkonzisztencia (`/hr/compliance`):**
   - A Munkaügyi és Munkavédelmi Megfelelőség modul három lapfüle között eltérően jelentek meg a dolgozói profilok.
   - A *Szabadságkiadás* fülön egy adatlekérdezési hiba miatt senkinél sem töltődtek be a beállított profilképek: az akció a nem létező `profil.avatarUrl` tulajdonságot olvasta ki ahelyett, hogy a PostgreSQL-ből érkező `avatar_url` mezőt használná.
   - A monogramos fallback jelvények a *Szabadságkiadás* és *Munkavédelem & Tűzvédelem* táblázatokban tompa szürke (`bg-muted`) színben jelentek meg, miközben a *Munkaidő és túlórakeret* fülön a kanonikus türkiz / brand stílus (`bg-primary/10 text-primary text-xs font-semibold`) élt.
2. **Nehézkes, „&” Jellel Terhelt Címek és Menüpontok Megszüntetése:**
   - A felhasználói visszajelzés alapján a felületen szigorúan el kell kerülni az „&” jeles és kettős szavakból álló mesterkélt címeket (pl. *Jelenlét & Szabadság*, *Munkaidő & Műszakbeosztás*, *Naptár & Távollét*).
   - Ehelyett a modern, prémium HR szoftverekhez méltó, tiszta, egyszavas vagy letisztult megnevezések bevezetése volt a cél (pl. *Bérpapírjaim*, *Célkitűzések*, *Jelenlét*, *Bérszámfejtés*, *Műszakbeosztás*).
3. **Félrevezető „Csapatnaptár” Megnevezés Tisztázása:**
   - A műszakbeosztás modul középső füle korábban a *Távollétek & Csapatnaptár* nevet viselte. A HR Munkaasztal kontextusában azonban ez nem egyetlen 4-5 fős közvetlen csapat naptára, hanem a teljes vállalat összes szervezeti egységének és részlegének távolléteit (szabadság, betegállomány) összesíti, így a pontos megnevezése: **Szervezeti naptár**.
4. **Felesleges Navigációs Gombok Kivezetése:**
   - A Dolgozói Portál Célkitűzések (`/hr/self-service/goals`) oldalának jobb felső sarkából eltávolításra került a redundáns „Vissza az áttekintéshez” gomb.

---

## Termék- és UX Döntések

### 1. Compliance Hub Avatar és Monogram Teljeskörű Egységesítése
- **Szerveroldali Adatillesztés (`src/app/hr/compliance/compliance-actions.ts`):**
  - Javításra került a `getCompanyLeaveComplianceData` akcióban az `avatarUrl` feloldása: `profil.avatar_url || profil.avatarUrl || null`.
  - Egységes, biztonságos tömb/objektum kibontás került bevezetésre mindhárom adatkérő metódusban (`getCompanyLeaveComplianceData`, `getCompanySafetyComplianceData`, `getCompanyOvertimeComplianceData`).
- **Kliensoldali Avatar Stílusok Kanonizálása (`leave-compliance-table.tsx`, `safety-training-table.tsx`):**
  - Avatar konténer: `className="h-8 w-8 border border-border"`.
  - Fallback monogram jelvény: `className="bg-primary/10 text-primary text-xs font-semibold"`.
  - Monogram generálás: 2 betűs, kötelezően nagybetűs formátum (`.slice(0, 2).join("").toUpperCase()`).
  - Ezzel mindhárom fülön teljesen egyforma képmegjelenítés és monogram-színvilág érvényesül.

### 2. Képernyő Címek és Menüpontok Letisztítása (Zero-„&” Szabály)
| Útvonal / Komponens | Korábbi elnevezés | **Új, letisztult elnevezés** |
| :--- | :--- | :--- |
| `src/app/hr/self-service/payroll/page.tsx` | Bérpapírok & Juttatások | **Bérpapírjaim** |
| `src/app/hr/self-service/goals/page.tsx` | Teljesítmény & Célkitűzések | **Célkitűzések** |
| `src/app/hr/self-service/time/page.tsx` | Jelenlét & Szabadság | **Jelenlét** |
| `src/app/hr/payroll/page.tsx` | Bérszámfejtés & Juttatások | **Bérszámfejtés** |
| `src/components/hr-sidebar.tsx` | Naptár & Távollét | **Műszakbeosztás** |
| `src/components/hr/time-tabs-view.tsx` (H1) | Munkaidő & Műszakbeosztás | **Műszakbeosztás** |
| `src/components/hr/time-tabs-view.tsx` (Fül 2) | Távollétek & Csapatnaptár | **Szervezeti naptár** |
| `src/components/hr/team-calendar.tsx` (CardTitle) | Csapatnaptár | **Szervezeti naptár** *(konfigurálható `title` prop-pal)* |

### 3. Kontextus-alapú Naptár Cím Megőrzése
- A `TeamCalendar` megkapta a `title = "Szervezeti naptár"` alapértelmezett prop-ot.
- A közvetlen vezetői csapatnézetben (`manager-team-tabs.tsx`) explicit módon átadásra kerül a `title="Csapatnaptár"`, így a vezetőknél továbbra is a közvetlen beosztottakhoz illeszkedő elnevezés látható, míg a cég szintű műszakbeosztásnál a `Szervezeti naptár` jelenik meg.

---

## Kapcsolódó Dokumentumok
- [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md): Rendszerszintű UI/UX Egységesség
- [P-043](./P-043-global-ui-consistency-and-unified-components.md): Kanonikus UI Minták és KpiCard
- [P-011](./P-011-hr-timesheet-attendance-and-leave-calendar-ux.md): Munkaidő nyilvántartás és naptár UX
- [P-016](./P-016-hr-occupational-health-and-compliance-ux.md): Munkaügyi megfelelőség UX
