# [Docs] P-004: Iktatási Split-view és AI Javaslatkezelés UX

**Status:** Decided  
**Date:** 2026-07-14 (Rögzítve: 2026-09-30)  
**Scope:** [Docs]
**Category:** Inbox / Filing UX  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-002](../../architecture/decisions/A-002-document-preview-blob-isolation.md), [A-006](../../architecture/decisions/A-006-gapless-filing-sequence-allocation.md)  
**Kapcsolódó Kód:** `src/app/inbox/[id]/page.tsx`, `src/components/filing-panel-client.tsx`, `src/components/document-preview-frame.tsx`

---

## 1. Question / Felhasználói Igény
Az iktatónak a beérkező dokumentum elolvasása közben egyszerre kell rögzítenie a metaadatokat (tárgy, partner, határidő, ügyintéző, szervezeti egység). A hagyományos ablakváltogatás (külön PDF olvasó és külön űrlap) lassú és hibalehetőségeket rejt.

---

## 2. Decision (A Meghozott Döntés)
1. **Átméretezhető Kétpaneles Elrendezés (Split-view):**
   - A `react-resizable-panels` segítségével a képernyő bal oldalán a `DocumentPreviewFrame` jeleníti meg a dokumentumot (lapozható, nagyítható), míg a jobb oldalon a strukturált iktatási űrlap található.
2. **AI Adatkitöltési Javaslatok (Badge-ek):**
   - Ha a háttérben az AI sikeresen kinyerte a metaadatokat, a releváns mezők felett kék/teal javaslati címkék (badge-ek) jelennek meg.
   - Egyetlen kattintással elfogadható az AI által javasolt adószám, tárgy, határidő vagy partner.
3. **Előzmény-irat Figyelmeztetés:**
   - Ha a rendszer hasonló hivatkozási számú vagy korábbi partnertől származó aktát talál, felajánlja: *"Csatolás meglévő ügyirathoz"* vagy *"Új ügyirat nyitása"*.
4. **Gyorsbillentyűk és Elküldés:**
   - `Ctrl + Enter` gyorsbillentyűvel azonnal indítható az iktatás.

---

## 3. Rationale (Indoklás)
Az átlagos iktatási idő 3 percről 20 másodpercre csökken, minimalizálva az elgépelési hibákat.
