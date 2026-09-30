# [Docs] A-010: PDF/A-2b Normalizálás és SHA-256 Integritásvédelem

**Status:** Decided  
**Date:** 2026-07-14 (Rögzítve: 2026-09-30)  
**Scope:** `[Docs]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/utils/pdfa-converter.ts`, `src/utils/pdf-extractor.ts`, `src/app/api/pdf/convert/route.ts`, `src/app/dossiers/[id]/version-actions.ts`, `irat_fajl` tábla

---

## 1. Context (Kontextus)
Hosszú távú digitális megőrzés (Archiválás) esetén a feltöltött dokumentumok (Word, sima PDF, beágyazott scripteket tartalmazó fájlok) évek múlva megváltozhatnak, vagy formátumuk elavulhat.
Emellett jogi eljárásban igazolni kell, hogy az archivált fájl a feltöltés óta egyetlen bitnyit sem módosult (Integritás igazolása).

---

## 2. Decision (A Meghozott Döntés)
1. **SHA-256 Kriptográfiai Hash Lenyomat:**
   - Minden feltöltött állomány bináris tartalmából a szerveroldalon azonnal generálódik egy SHA-256 hash érték a Node.js `crypto` modullal.
   - Ez a hash rögzítésre kerül az `irat_fajl.sha256` oszlopban és az `esemeny_naplo`-ban.
   - Letöltéskor és audit ellenőrzéskor a rendszer újrahash-eli a fájlt, és összeveti az eredeti értékkel; eltérés esetén integritási riasztást küld.
2. **Kettős Fájltárolás & PDF/A-2b Szabványosítás:**
   - A rendszer mindig megőrzi az **eredeti fájlt** (`irat_fajl.storage_path`).
   - Ezzel párhuzamosan a háttérben létrehoz egy normalizált, beágyazott betűtípusokat és színprofilokat tartalmazó **PDF/A-2b archiválási példányt** (`irat_fajl.pdfa_path`).
   - A konvertálást a `src/utils/pdfa-converter.ts` végzi Ghostscript motorral, graceful fallback támogatással (ha nincs Ghostscript telepítve, az eredeti puffert adja vissza hibamentesen), aszinkron módon hívva a `/api/pdf/convert` végponton keresztül.
   - Selejtezésig a PDF/A-2b példány szolgál az archivális megőrzés hivatalos alapjául.

---

## 3. Consequences (Következmények)
* **Pozitív:** Megfelel a hazai és uniós hosszú távú elektronikus megőrzési szabványoknak (eIDAS konformitás előkészítése).
* **Tárhely:** Dupla tárolási kapacitást igényel az eredeti és a normalizált PDF/A fájlok miatt a Supabase Storage-ben.
