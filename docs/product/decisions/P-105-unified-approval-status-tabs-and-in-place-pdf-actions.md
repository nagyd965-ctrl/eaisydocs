# PRD P-105: Egységes Kérelemkezelési Státusz Fülválasztó és In-Place PDF Műveletek

- **Dátum:** 2026-10-21
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [ADR A-080](../architecture/decisions/A-080-manager-workspace-revamp-and-comprehensive-self-service-requests-architecture.md), [ADR A-081](../architecture/decisions/A-081-attendance-correction-pdf-generation-and-manager-clearance.md), [PRD P-104](./P-104-manager-workspace-revamp-and-comprehensive-self-service-requests-ux.md)

---

## 1. Felhasználói Igény és Probléma

1. **Jóváhagyási Előzmények Hiánya a Vezetőnél:**
   - A vezetői felületen (`/hr/manager`) a kérelmek elbírálása után a jóváhagyott és elutasított tételek azonnal eltűntek a listából, így a vezető nem tudta visszakövetni, milyen döntéseket hozott korábban.
2. **Aszimmetrikus UI Elrendezés a Kérelmi Lapokon:**
   - A dolgozói önkiszolgáló nézetben (`LeaveHistoryList`) a státusz fülválasztó a kártya fejlécének jobb oldalán kapott helyet, míg a vezetői jóváhagyási panelen (`UnifiedApprovalsPanel`) kezdetben a kártyatest bal oldalára került. A felhasználó kifejezett elvárása volt az egységes, következetes jobb oldali fejléc-elrendezés.
3. **Hiányzó Dokumentum Műveletek:**
   - A jóváhagyott kérelmeknél nem volt közvetlen lehetőség a dokumentumok megtekintésére és letöltésére a vezetői nézetben, valamint a dolgozói nézetben sem a munkaidő korrekciók esetében.

## 2. Termék és UX Döntések

1. **Egységesített Kártyafejléc és Jobb Oldali Fülválasztó:**
   - Mind a vezetői munkaterületen (`UnifiedApprovalsPanel`), mind a dolgozói önkiszolgáló felületen (`LeaveHistoryList`) a kártyafejléc jobb oldalára pozicionáltuk a szegmentált állapotválasztót:
     - **Vezetői Nézet:** `Elbírálásra váró (X)` | `Jóváhagyott (Y)` | `Elutasított (Z)`
     - **Dolgozói Nézet:** `Összes (X)` | `Folyamatban (Y)` | `Jóváhagyott (Z)` | `Elutasított (W)`
   - Dinamikus szemantikus számláló jelvények (`warning`, `success`, `destructive`), finom háttér- és szegélyátmenettel aktív fül esetén.
2. **Keresősáv és Dolgozói Statisztika Elrendezése:**
   - A vezetői panelen a fejlécből kikerülő vezérlők helyett a kártyatest felső sorában a bal oldalon a valós idejű dolgozói keresőmező (`Search`), a jobb oldalon a `X dolgozó • Y kérelem` aggregált statisztikai felirat jelenik meg.
3. **In-Place PDF Előnézet és Közvetlen Letöltés:**
   - A jóváhagyott kérelmek sorában közvetlen funkciógombok találhatók:
     - **`Megtekintés` (`Eye`):** Azonnali előnézet a beépített `PdfViewerDialog` modálban oldalváltás nélkül.
     - **`Letöltés` (`Download`):** Hivatalos A4 formátumú PDF fájl letöltése.
   - A műveletek a szabadságok és a munkaidő korrekciók mellett egyaránt elérhetők mindkét felületen.
4. **Zero-Emoji és No-Decorative-Icons Megfelelőség:**
   - Nincsenek emojik vagy indokolatlan kör alakú dekoratív ikondobozok az üres állapotokban; tiszta, informatív szöveges magyarázatok jelennek meg állapotonként.

## 3. Érintett Képernyők és Komponensek

- `src/components/hr/unified-approvals-panel.tsx` (Vezetői jóváhagyások panel jobb oldali fülválasztóval és PDF műveletekkel)
- `src/components/hr/leave-history-list.tsx` (Saját kérelmek lista jobb oldali fülválasztóval és korrekciós PDF műveletekkel)
- `src/app/hr/manager/page.tsx` (Vezetői oldal kibővített státusz-lekérdezésekkel)
- `src/app/hr/self-service/time/page.tsx` (Önkiszolgáló oldal)

## 4. Eredmények és Felhasználói Előnyök

- A felület teljesen egységessé vált mind a vezetői, mind a munkavállalói nézetben (ugyanaz a vizuális hierarchia és elhelyezés).
- A vezetők és munkavállalók egyaránt egyetlen kattintással hozzáférnek a hivatalos igazolásokhoz.
