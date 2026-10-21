# PRD P-103: 5-Lépéses Teljesítményértékelési Munkaterület és Dolgozói Célkezelő UX

- **Dátum:** 2026-10-21
- **Státusz:** `Decided`
- **Hatókör:** `[HR]`
- **Téma:** `HR / Performance Workflow & Employee Goals Self-Service UX`
- **Kapcsolódó döntések:** [ADR A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [ADR A-079](../../architecture/decisions/A-079-human-centric-performance-workflow-and-simplification.md), [PRD P-102](./P-102-performance-management-module-overhaul-and-kpi-catalogue-ux.md)

---

## 1. Felhasználói Igény és Célkitűzés

A teljesítményértékelésben a tört százalékos értékek (`0%`, `75%`), bináris Igen/Nem kapcsolók és az egymásba ágyazott alsó kártyadobozok nehezen használhatóvá és mesterkéltté tették a rendszert. A valós szervezeti működésben a célok nem képletek alapján értékelődnek, hanem egy **5 lépéses emberi munkafolyamat** szerint:
1. Cél kitűzése a vezető által.
2. Munkatársi önértékelés leadása a saját felületén.
3. Vezetői szakmai visszajelzés rögzítése.
4. Személyes 1-on-1 megbeszélés lefolytatása és jegyzete.
5. Végleges hitelesítés és lezárás a bérszámfejtéshez/kartonhoz.

A cél a felület radikális egyszerűsítése:
- Százalékok, csúszkák és bináris Igen/Nem kapcsolók teljes megszüntetése.
- A **fenti 5-pontos folyamatsáv** ([KpiWorkflowStepper](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/kpi-workflow-stepper.tsx)) középpontba állítása.
- Egyetlen, tiszta, teljes szélességű munkaterület biztosítása mind a vezetői, mind a dolgozói oldalon.
- A dolgozói célkezelés és önértékelés átköltöztetése egy dedikált oldalra (`/hr/self-service/goals`).

---

## 2. Részletes UX Specifikáció

### 2.1. Vezetői Oldal (`/hr/performance`)
- **Dolgozói Fejléc:**
  - Nincs `%` és nincs progress bar.
  - Bal oldalon: `X/Y cél lezárva • Összesen Y kitűzött KPI`.
  - Jobb oldalon: Folyamat állapotjelvény (`1. Célkitűzés aktív`, `2. Önértékelésre vár`, `3. Vezetői értékelésre vár`, `4. 1-on-1 Megbeszélésre vár`, `5. Minden cél lezárva`).
- **Accordion Lenyíló Munkaterület (`divide-y` elrendezés):**
  - **Felső sáv:** 5-pontos folyamatsáv (`1. Célkitűzés` → `2. Önértékelés` → `3. Vezetői értékelés` → `4. 1-on-1 Megbeszélés` → `5. Lezárva`).
  - **Középső munkaterület (csak az aktív lépés teendője):**
    - *1. fázis:* „Várakozás a dolgozói önértékelésre” állapot és közvetlen „Értékelés azonnal” lehetőség.
    - *2. fázis:* Dolgozói önértékelés idézete és vezetői értékelés szövegdoboz.
    - *3. fázis:* Kétoldalú összevetés és 1-on-1 megbeszélés jóváhagyó űrlap.
    - *4. fázis:* Megbeszélés lezajlott kártya és végső lezárási gomb.
    - *5. fázis:* Archivált összefoglaló mindkét fél megjegyzéseivel.
  - **Alsó előzmény sáv:** Rögzítési dátum, illetve kényelmes, széles (`sm:w-80`) megjegyzésmező (`placeholder="Megjegyzés hozzáfűzése..."`).

### 2.2. Dolgozói Önkiszolgáló Oldal (`/hr/self-service/goals`)
- **Fejléc & Mérőszámok:**
  - Visszanavigálás a dolgozói főoldalra.
  - Linear-flat `KpiCard` mérőszámok: *Aktív Ciklus*, *Kitűzött Céljaim*, *Folyamat Állapota* és *Önértékelés Teendő*.
- **Egyedi Célkártya (`SingleGoalWorkspace`):**
  - Cél címe, ciklusa és súlyozása (`1x / 1.5x / 2x`).
  - Felső 5-pontos folyamatsáv.
  - Önértékelés kitöltő blokk inspiráló kérdésekkel és beküldés utáni szerkesztési lehetőséggel.
  - Vezetői visszajelzés azonnali megjelenítése a 3. lépéstől.

### 2.3. Célkitűzés Létrehozásának Egyszerűsítése (`add-kpi-dialog.tsx`)
- Töröltük az összes mértékegység-típus mezőt, célértéket és kezdőértéket.
- Csak a lényeg maradt:
  - Munkatárs választó.
  - Célkitűzés címe és leírása.
  - Értékelési ciklus.
  - Prioritás súlyozás (3 gombos választó: `Normál 1x`, `Kiemelt 1.5x`, `Stratégiai 2x`).

---

## 3. Eredmény és Hatás

- A felület teljesen letisztult, megszűnt a zavaró százalékszámítás.
- Egyértelművé vált, hogy az 5 mérföldkő közül épp kinél pattog a labda.
