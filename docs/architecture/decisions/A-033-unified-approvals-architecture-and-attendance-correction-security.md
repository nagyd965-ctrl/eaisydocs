# A-033 [HR]: Egységes Jóváhagyási Architektúra és Jelenléti Korrekció Biztonsági Modell

**Státusz:** Elfogadva  
**Dátum:** 2026-10-07  
**Döntéshozó:** Vezető Rendszerarchitekt & Backend Csapat  
**Hatókör:** [HR] eaisyHR – Szerverakciók, Adatbázis RLS és Tranzakcióbiztonság  
**Kapcsolódó PRD:** [P-052](../../product/decisions/P-052-unified-manager-approvals-hub-and-attendance-correction-ux.md)  
**Kapcsolódó ADR-ek:** [A-007](A-007-four-dimensional-rbac-rls-security.md), [A-008](A-008-append-only-audit-event-log-integrity.md), [A-013](A-013-hr-timesheet-overtime-holiday-calculation-engine.md), [A-029](A-029-global-ui-consistency-and-unified-components.md)

---

## 1. Kontextus és Technikai Probléma

A korábbi implementációban a jóváhagyási logika több izolált komponens és szerverakció között oszlott meg:
- `hr_tavollet` jóváhagyása: `approveLeaveRequest` a `manager/actions.ts`-ben.
- `hr_tulora_felhasznalás` jóváhagyása: `handleOvertimeApproval` az `attendance-actions.ts`-ben.
- `hr_jelenlet_korrekcio` jóváhagyása: `handleAttendanceCorrectionApproval`.

### Felfedezett RLS és Adatintegritási Hiba:
Amikor a vezető a felületen jóváhagyta a beosztott munkaidő korrekcióját, a következő kritikus hiba lépett fel:
1. A `handleAttendanceCorrectionApproval` az authenticated user context (`createClient()`) segítségével hívódott meg.
2. A kérelem státusza sikeresen `jovahagyva`-ra frissült a `hr_jelenlet_korrekcio` táblában.
3. Ezt követően a rendszer megkísérelte beszúrni a jóváhagyott munkaidőt a `hr_jelenlet` táblába a dolgozó nevében.
4. A PostgreSQL RLS szabály (`hr_jelenlet` FOR INSERT/UPDATE) kizárólag a `dolgozo_id = auth.uid()` feltételt engedélyezte. Mivel a vezető azonosítója (`auth.uid()`) nem egyezett meg a beosztott azonosítójával (`dolgozo_id`), a tranzakció azonnal elbukott:
   ```
   code: 42501, message: 'new row violates row-level security policy for table "hr_jelenlet"'
   ```
5. **Következmény:** A kérelem eltűnt a függő listából, de a jelenléti ívre nem került fel a munkaidő, így adatvesztés és inkonzisztens rendszerállapot alakult ki.

---

## 2. Architektúrális Döntések és Megoldás

### 2.1. Normalizált Jóváhagyási Adatmodell (`UnifiedApprovalItem`)
A frontend oldalon a különböző forrástáblákból érkező adatok egyetlen típusbiztos interfészre lettek leképezve:
```ts
export interface UnifiedApprovalItem {
  id: string
  category: "tavollet" | "korrekcio" | "tulora"
  dolgozoId: string
  dolgozoNev: string
  createdAt: string
  // Távollét
  tavolletTipus?: string
  kezdetDatuma?: string
  vegDatuma?: string
  munkanapokSzama?: number
  // Korrekció
  korrekcioDatum?: string
  eredetiBecsekkolas?: string | null
  eredetiKicsekkolas?: string | null
  ujBecsekkolas?: string
  ujKicsekkolas?: string
  // Túlóra
  tuloraTipus?: "kiveszi_szabinak" | "kifizetteti"
  tuloraPerc?: number
  // Közös
  indoklas?: string | null
}
```

### 2.2. PostgreSQL RLS Házirend Kibővítése (`20261007000003_fix_hr_jelenlet_rls.sql`)
A `hr_jelenlet` táblán a korábbi szigorú önkiszolgáló szabály kiegészült a szervezeti jogosultsági lánccal:
```sql
CREATE POLICY "HR és Vezető rögzíthet jelenlétet" ON hr_jelenlet
FOR INSERT TO authenticated
WITH CHECK (
  dolgozo_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil p
    WHERE p.id = auth.uid() AND (p.hr_szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin') OR p.szerepkor IN ('hr_munkatars', 'hr_vezeto', 'admin'))
  ) OR
  EXISTS (
    SELECT 1 FROM felhasznalo_profil beosztott
    WHERE beosztott.id = hr_jelenlet.dolgozo_id AND beosztott.kozvetlen_vezeto_id = auth.uid()
  )
);
```

### 2.3. Privilegizált Admin Kliens és Hibabiztos Sorrendiség
A jóváhagyási szerverakciókban a háttérbeli adatmódosításokat a `createAdminClient` (service role) végzi:
1. **Elsődleges érvényesítés:** Elsőként a `hr_jelenlet` rekord módosítása/beszúrása fut le.
2. **Kérelem lezárása:** Csak sikeres jelenléti írás esetén kapja meg a kérelem a `jovahagyva` státuszt. Ha a jelenlét írása elbukik, a kérelem érintetlenül `jovahagyasra_var` állapotban marad.
3. **Audit és Értesítés:** Append-only naplózás a `hr_esemeny_naplo` táblába és automatikus értesítés az `alkalmazas_ertesites` táblán keresztül.
4. **Globális Útvonal Revalidáció:**
   ```ts
   revalidatePath("/hr", "layout")
   revalidatePath("/hr/manager")
   revalidatePath(`/hr/employee/${request.dolgozo_id}`)
   revalidatePath("/hr/self-service/time")
   ```

---

## 3. Következmények és Előnyök
- **Garantált adatintegritás:** Nincs olyan állapot, amikor egy kérelem jóváhagyottá válik anélkül, hogy a tényleges jelenléti adat bekerülne a táblába.
- **Konzisztens jogosultságkezelés:** A vezetők saját beosztottjaik jelenlétét mind adatbázis RLS szinten, mind a jóváhagyási workflow-ban hibátlanul tudják menedzselni.
- **Valós idejű szinkron:** Azonnali cache-invalidation után a vezetői nézet, a dolgozói jelenléti ív és a naptár azonnal az új adatot tükrözi.
