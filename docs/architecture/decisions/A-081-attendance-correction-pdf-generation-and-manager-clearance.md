# ADR A-081: Munkaidő Korrekciós PDF Generálás és Vezetői Jogosultság Kiterjesztés az Igazolásokhoz

- **Dátum:** 2026-10-21
- **Státusz:** `Decided`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](./A-029-global-ui-consistency-and-unified-components.md), [ADR A-067](./A-067-comprehensive-hr-roles-scoping-rpc-and-route-guard-alignment.md), [ADR A-080](./A-080-manager-workspace-revamp-and-comprehensive-self-service-requests-architecture.md), [PRD P-105](../product/decisions/P-105-unified-approval-status-tabs-and-in-place-pdf-actions.md)

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR rendszerben a jóváhagyott szabadságkérelmekhez (`hr_tavollet`) már rendelkezésre állt egy dedikált, automatikus PDF igazolás-generáló végpont (`/api/hr/leave-pdf`), amely hitelesített, nyomtatható A4 dokumentumot állított ki. 

Ezzel szemben két kritikus hiányosság állt fenn:
1. **Munkaidő korrekciók igazolhatóságának hiánya:** A jóváhagyott és érvényesített jelenléti korrekciókhoz (`hr_jelenlet_korrekcio`) nem készült formális dokumentum, sem a dolgozó, sem a vezető nem tudta letölteni vagy megtekinteni a jóváhagyott módosítás hivatalos igazolását.
2. **Vezetői hozzáférési korlátozás (403 Forbidden):** A meglévő távolléti PDF végpont jogosultsági vizsgálata kizárólag a saját irat megtekintését (`dolgozo_id = user.id`) vagy a globális HR/Admin szerepkört (`hr_munkatars`, `hr_vezeto`, `admin`) engedélyezte. Így amikor egy közvetlen csapatvezető a saját beosztottja jóváhagyott szabadságát próbálta megtekinteni vagy letölteni, a rendszer jogosulatlansági hibát dobott.

## 2. Döntés

1. **Önálló Munkaidő Korrekciós PDF Generáló Végpont (`/api/hr/attendance-correction-pdf`):**
   - Létrehoztunk egy új API route-ot (`src/app/api/hr/attendance-correction-pdf/route.ts`), amely a `launchPdfBrowser()` (Puppeteer / Chromium) motor segítségével professzionális, A4 formátumú PDF dokumentumot állít elő.
   - A PDF tartalmazza a dolgozó adatait, az aktív jogviszonyból feloldott munkakört, az érintett munkanap dátumát, az eredeti rögzített időt, a jóváhagyott érvényes idősávot és időtartamot, a dolgozói indoklást, a jóváhagyó vezető nevét és döntési időbélyegzőjét, valamint a digitális aláírási és azonosító blokkot.
   - Támogatja mind az inline böngészős megjelenítést (`preview=true`), mind a közvetlen fájlletöltést (`download=true`).

2. **Közvetlen Vezetői Jogosultság Kiterjesztése (ABAC/RBAC Integráció):**
   - Mind a távolléti (`leave-pdf`), mind a korrekciós (`attendance-correction-pdf`) végponton kibővítettük a jogosultsági ellenőrzést:
   - A dokumentumhoz hozzáférhet:
     1. A kérelmet benyújtó dolgozó (`dolgozo_id === user.id`).
     2. Globális HR munkatárs vagy Adminisztrátor (`hr_munkatars`, `hr_vezeto`, `admin`).
     3. A jóváhagyó vezető (`jovahagyo_id === user.id`) VAGY a dolgozó szervezeti közvetlen felettese (`subordinate.kozvetlen_vezeto_id === user.id`).

3. **In-Place Integráció a Dolgozói és Vezetői Felületeken:**
   - A dolgozói „Saját kérelmeim” listában (`LeaveHistoryList`) a jóváhagyott korrekciók mellett is megjelent a `PdfViewerDialog` alapú `Megtekintés` és `Letöltés` gomb.
   - A vezetői felületen (`UnifiedApprovalsPanel`) a „Jóváhagyott” fülön minden beosztotti szabadsághoz és korrekcióhoz közvetlenül elérhetővé vált az előnézet és a letöltés.

## 3. Érintett Komponensek és Fájlok

- `src/app/api/hr/attendance-correction-pdf/route.ts` (Új munkaidő korrekció PDF generáló végpont)
- `src/app/api/hr/leave-pdf/route.ts` (Jogosultsági vizsgálat kiterjesztése közvetlen vezetőkre)
- `src/components/hr/leave-history-list.tsx` (Dolgozói előnézeti és letöltési akciógombok)
- `src/components/hr/unified-approvals-panel.tsx` (Vezetői előnézeti és letöltési akciógombok)

## 4. Következmények

- A munkaügyi auditok és elszámolások során minden módosított munkaidő-bejegyzés hitelesen igazolható digitálisan generált PDF formátumban.
- A közvetlen vezetők zökkenőmentesen ellenőrizhetik beosztottaik hivatalos dokumentumait a vezetői munkaterület elhagyása nélkül.
- Megszűntek a téves 403-as jogosultsági hibák a vezetői előnézetek során.
