# [Docs] A-004: Kötegelt Szkenner Elválasztólapos Feldolgozás és Worker Streaming Fallback

**Status:** Decided  
**Date:** 2026-09-29  
**Scope:** [Docs]
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/app/inbox/scanner-actions.ts`, `src/utils/pdf-extractor.ts`, `imap-worker.ts`, `ai-worker.ts`

---

## 1. Context (Kontextus)
A postai küldemények és tömeges iratok feldolgozásánál a fizikai iratokat kötegben szkennelik be egyetlen nagy méretű (akár több száz oldalas) PDF fájlba. Az iratok közé vonalkódos vagy QR-kódos elválasztólapok kerülnek.
A korábbi implementációban a Vercel Serverless és háttér worker környezetben a `pdfjs-dist` worker feloldási hibák miatt elszállt, a stream olvasás pedig memóriatúllépést okozott nagy fájlok esetén.

---

## 2. Decision (A Meghozott Döntés)
1. **Szerveroldali Bundling:**
   - A `pdfjs-dist/legacy/build/pdf.mjs` könyvtárat közvetlenül szerveroldali chunkba csomagoljuk az externalizálás helyett (`next.config.ts`), megkerülve a Node.js worker-thread hiányosságait szerverless környezetben.
2. **Stream Fallback Mechanizmus:**
   - Nagy méretű PDF fájlok esetén nem a teljes fájlt olvassuk egyszerre pufferbe, hanem oldalankénti streaming folyamattal és memóriakímélő PDF-darabolással (`pdf-lib`) hajtjuk végre az elválasztást.
3. **Elválasztólap Detekció:**
   - Ha a szkenner elválasztólapot talál, leválasztja az előző dokumentumot, automatikusan önálló érkeztetési számot generál, és elindítja a háttér AI adatkinyerést.

---

## 3. Consequences (Következmények)
* **Pozitív:** Megbízható, crash-mentes működés Vercelen és helyi worker környezetben is; korlátlan oldalszámú kötegek feldolgozhatósága.
