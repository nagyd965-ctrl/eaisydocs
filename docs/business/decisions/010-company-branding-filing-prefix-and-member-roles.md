# BRD-010: Céglogó, Testreszabható Iktató Prefix és Tag Szerepkör Menedzsment

**Dátum:** 2026-10-08  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Státusz:** Elfogadva  

## 1. Üzleti Háttér és Kontextus
A többcéges (multi-tenant) működés bevezetését követően a vállalatcsoportok és könyvelőirodák számára szükségessé vált:
1. Az egyes cégek vizuális megkülönböztetése céglogó segítségével a fejlécben és a cégválasztóban.
2. Cég-specifikus iktatási előtag (pl. `THINK`, `TESZT`, `HOLDING`) konfigurálása a standard `DOCS` helyett.
3. A vállalathoz tartozó tagok jogosultságainak helyben történő, rugalmas módosítása (Admin vs Tag, Docs szerepkör, HR szerepkör) anélkül, hogy a tagot el kellene távolítani és újból meg kellene hívni.

## 2. Üzleti Szabályok
1. **Tulajdonosi Exkluzivitás (Owner Only):**
   - Kizárólag a cég bejegyzett tulajdonosa (`owner`) tölthet fel vagy törölhet céglogót.
   - Kizárólag a cég tulajdonosa módosíthatja a cég iktatókönyv előtagját (`filing_prefix`).
   - Kizárólag a cég tulajdonosa módosíthatja a többi tag cég-, docs- és hr-szerepköreit.
   - A tulajdonos szerepköre és tagsága nem módosítható és nem törölhető.
2. **Iktatókönyv Előtag Szabályzat:**
   - Maximálisan 10 karakter hosszúságú, angol nagybetűket, számokat, kötőjelet vagy aláhúzást tartalmazhat (`[A-Z0-9_-]`).
   - Alapértelmezett értéke `DOCS`.
   - Az új ügyiratok és iktatószámok automatikusan ezt az előtagot alkalmazzák (`${prefix}/${ev}/${sorszam}`).
3. **Céglogó Kezelés:**
   - Támogatott formátumok: PNG, JPG, WebP, SVG (max. 2 MB).
   - A logó azonnal szinkronizálódik a fejléc és a cégválasztó komponensekkel.
