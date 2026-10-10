# P-064: Beágyazott Feladatkezelő és AI Válaszlevél Varázsló UX [Docs]

> **Státusz:** Decided  
> **Dátum:** 2026-10-10  
> **Hatókör:** `[Docs]` (eaisyDocs felhasználói élmény)  
> **Kapcsolódó döntések:** [P-043](./P-043-global-ui-consistency-and-unified-components.md), [P-047](./P-047-dossier-lifecycle-and-settlement-architecture-ux.md), [P-048](./P-048-outgoing-document-and-dispatch-architecture-ux.md), [A-045](../../architecture/decisions/A-045-embedded-task-composer-and-ai-reply-wizard-architecture.md)  
> **Érintett útvonal:** `/dossiers/[id]`  
> **Érintett komponensek:** `src/components/tasks-tab.tsx`, `src/components/outgoing-documents-tab.tsx`

---

## 1. Felhasználói Élmény (UX) Áttekintés
A korábbi ügyirati adatlap `Feladatok` füle túlzsúfolt volt és 3 különböző szinten nyitott egymásra felugró modálokat. Az új felépítés teljes mértékben felszámolja a popup poklot, és professzionális, szellős munkaterületet nyújt:

### 1.1. Két Dedikált Fül az Ügyiratban
1. **`Feladatok & Megjegyzések`:**
   - **Bal oszlop (65%):** Ügyirati feladatok haladási sávval, közvetlen in-place feladatfelvételi sávval, gyors sablon szalaggal és kibontható sablonkatalógussal.
   - **Jobb oszlop (35%):** Belső csapatmegjegyzések teljes magasságú chat panelben `@` említésekkel.
2. **`Válaszlevelek & Expediálás`:**
   - Kimenő iratok listája kézbesítési státusz jelvényekkel (E-mail, Posta, Csak mentés, Sikeres/Sikertelen).
   - `+ Új válaszlevél készítése` gomb.

---

## 2. A Válaszlevél Varázsló (Wizard UX)
A felhasználó által megosztott bevált koncepció alapján a válaszlevél összeállítása egy 3-lépéses folyamatra épül:

1. **Lépés 1: Címzett & Csatorna**
   - Partner előnézet kártya (automatikusan felismert partner név és e-mail a bejövő irat alapján).
   - Csatornaválasztó 3 nagy interaktív kártyagombbal: `E-MAIL`, `POSTA`, `CSAK IKTATÁS`.
   - Címzett e-mail mező mentési lehetőséggel.
2. **Lépés 2: Levél összeállítása (Belső fülváltóval, 0 popuppal!)**
   - **`[ ✏️ Saját szöveg ]`**: Hagyományos formázható szerkesztő (tárgy + törzs).
   - **`[ ✨ AI Varázsló ]`**:
     - 4 kommunikációs stílus: *Hivatalos / Jogi*, *Partneri / Közvetlen*, *Tájékoztató / Tömör*, *Felszólító / Határidős*.
     - 1-mondatos utasítás mező az AI-nak.
     - `Szöveg generálása ✨` gomb, ami betölti a kész szöveget és automatikusan átvált a szerkesztőre.
   - **`[ 📄 Sablonok ]`**: Beépített kártyás válaszsablonok kategóriák szerint, 1-kattintásos alkalmazással.
3. **Lépés 3: Melléklet & Expediálás**
   - Csatolt külső PDF feltöltés drag & drop dobozzal.
   - Összegző kártya és végleges küldési gomb.

---

## 3. UI/UX Szabályok Megfelelése
* **Linear-flat formanyelv:** Nincsenek árnyékok, finom keretszín-átmenetek (`hover:border-primary/40`), Montserrat tipográfia, és egységes Lucide React ikonok.
* **0 Nested Modal:** A feladatoknál nincs több felugró ablak; a válaszlevélnél egyetlen tiszta varázsló ablak fut.
