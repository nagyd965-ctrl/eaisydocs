# [Docs] A-002: DocumentPreviewFrame Memóriabeli Blob URL Izoláció Next.js Iframe Hibák Ellen

**Status:** Decided  
**Date:** 2026-09-29  
**Scope:** [Docs]
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/components/document-preview-frame.tsx`, `src/components/document-viewer.tsx`, `src/components/filing-panel-client.tsx`, `src/components/attachment-viewer-client.tsx`

---

## 1. Context (Kontextus)
Az eaisyDocs és eaisyHR rendszerekben elengedhetetlen a dokumentumok (PDF-ek, szkennelt képek, számlák) azonnali, megbízható előnézete a felhasználói felületen (pl. iktatási split-view, dokumentum nézőke, melléklet betekintő).

Korábban közvetlenül az aláírt Supabase Storage URL-t vagy API végpontot adtuk át a natív `<iframe src={url}>` elemnek. Ez két súlyos működési hibát idézett elő:
1. **HTML Beágyazódás:** Ha a végpont hibát dobott (pl. lecsengett az aláírt URL, vagy Next.js redirect történt), az `iframe` belsejében a Next.js teljes HTML layoutja (sidebar, header, 404/500 oldal) renderelődött le rekurzívan az előnézeti mezőben.
2. **Képformátum inkompatibilitás:** Bizonyos böngészőkben az `iframe`-be ágyazott képfájlok (JPG, PNG) méretezése és görgetése torzult, hiányzott a reszponzív illeszkedés.
3. **Memóriaszivárgás és elavult tokenek:** Hosszabb session alatt az aláírt URL-ek lejártak, ami fehér képernyőt vagy hibát eredményezett újrapróbálkozási lehetőség nélkül.

---

## 2. Decision (A Meghozott Döntés)
Létrehoztunk egy központi, robusztus kliensterméket: **`DocumentPreviewFrame`** (`src/components/document-preview-frame.tsx`).

### Építészeti működés:
1. **Memóriabeli Blob Letöltés & MIME Ellenőrzés:**
   - A komponens `fetch(src)` hívással közvetlenül lekéri a nyers bináris streamet.
   - Ellenőrzi a HTTP státuszt és a válasz típusát. Ha a szerver HTML hibát ad vissza (`<!DOCTYPE` vagy `<html`), azonnal megszakítja a folyamatot és barátságos hibaüzenetet jelenít meg ahelyett, hogy betöltené az iframe-be.
2. **Blob URL Generálás és Erőforrás-kezelés:**
   - Sikeres letöltés esetén `URL.createObjectURL(blob)` segítségével izolált, memóriabeli URL jön létre.
   - Komponens unmount vagy új fájl kiválasztása esetén az `activeBlobRef` és `cleanupBlob()` automatikusan meghívja a `URL.revokeObjectURL(url)` metódust, megelőzve a memóriaszivárgást.
3. **Dinamikus Renderelés:**
   - Ha a MIME-típus `image/*`: reszponzív, `object-contain` méretezésű `<img>` elemet renderel.
   - Ha `application/pdf`: tiszta, homokozóba zárt `<iframe>`-t renderel a memóriabeli Blob címről.
4. **Beépített Hibakezelés és Újrapróbálkozás:**
   - Hiba esetén nem fehér képernyő látszik, hanem vizuális hibaablak **"Újrapróbálkozás"** és **"Megnyitás új lapon"** gombokkal.

---

## 3. Consequences (Következmények)

### Pozitív:
* Megszűnt a rekurzív Next.js HTML iframe-be ágyazódás.
* Egységes felhasználói élmény PDF és képfájlok esetén is.
* Zero memóriaszivárgás a szigorú `URL.revokeObjectURL` életciklus-kezelés miatt.
* Minden jövőbeli dokumentumnéző felületen kötelezően ezt a standard komponenst kell használni.
