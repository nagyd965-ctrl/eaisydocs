# ADR A-076: AI-Vezérelt Álláshirdetés Generálás és Biztonságos Rich Text Renderelési Architektúra

- **Státusz:** Decided
- **Dátum:** 2026-10-20
- **Döntéshozók:** Vezető Fejlesztő, HR Termékfejlesztő
- **Hatókör:** `[HR]`
- **Kapcsolódó PRD:** [P-100](../../product/decisions/P-100-ai-job-posting-wizard-and-career-rich-text-ux.md)
- **Érintett komponensek:** `src/app/hr/recruitment/ai-posting-actions.ts`, `src/components/hr/manage-posting-dialog.tsx`, `src/components/rich-text-content.tsx`, `src/lib/sanitize-html.ts`, `src/app/karrier/[id]/page.tsx`

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR toborzási moduljában az álláshirdetések (`allashirdetes`) rögzítésekor a HR vezetőknek és recruitereknek manuálisan kellett megfogalmazniuk a teljes álláshirdetési szöveget, vagy külső forrásból kellett HTML/Markdown kódot másolniuk.

Ez két súlyos problémát eredményezett:
1. **Időigényes és sablonos tartalom:** A toborzók jelentős időt töltöttek az elvárások, juttatások és cégbemutatás megfogalmazásával, gyakran generikus vagy hiányos hirdetéseket létrehozva.
2. **Nyers kód renderelési hiba és XSS kockázat:** A publikus karrieroldalon (`/karrier/[id]`) a React natív sztring interpolációja miatt a megadott HTML címkék (`<h3>`, `<ul>`, `<li>`) nyers szövegként jelentek meg, rombolva a munkáltatói márkát. Emellett a nem ellenőrzött HTML megjelenítése XSS (Cross-Site Scripting) sebezhetőséget hordozott volna.

## 2. Megfontolt Alternatívák

1. **A alternatíva (Csak kliensoldali WYSIWYG szerkesztő):** Egy nehéz editor (pl. TipTap vagy Quill) beépítése.  
   *Hátrány:* Jelentősen növeli a kliensoldali bundle méretet, nem segít a szöveg megfogalmazásában, és önmagában nem oldja meg a biztonságos renderelést.
2. **B alternatíva (Külső AI API közvetlen kliensoldali hívása):**  
   *Hátrány:* Kiszivárogtatja az API kulcsot, megkerüli a multi-tenant jogosultságellenőrzést.
3. **C alternatíva (Választott megoldás):** Szerveroldali Server Action (`generateJobPostingWithAiAction`) Google Gemini 2.5 Flash modellel, multi-tenant cég- és székhelykontextussal, dedikált modál UI-val és kliensoldali tisztított (`marked` + `sanitizeHtml`) rendereléssel.

## 3. A Döntés

Elfogadtuk a **C alternatívát**:
1. **Szerveroldali Gemini Integráció (`ai-posting-actions.ts`):**
   - `@google/genai` SDK használata a `gemini-2.5-flash` modellel.
   - Szigorúan strukturált JSON kimenet kényszerítése (`responseMimeType: "application/json"`).
   - Intelligens offline sablon fallback arra az esetre, ha a külső AI szolgáltatás vagy az API kulcs nem elérhető.
2. **Cég- és Helyszíntudatos Kontextusátadás:**
   - A szerver akció megkapja az aktívan kiválasztott cég nevét (`selectedCompany.name`) és székhelyét (`selectedCompany.address`).
   - A modell automatikusan név szerint bemutatja a szervezetet a „Rólunk” szekcióban, és létrehoz egy dedikált „Munkavégzés helye” blokkot a pontos székhellyel és hibrid lehetőséggel.
3. **Fókuszált UI Architektúra (`manage-posting-dialog.tsx`):**
   - Az AI varázsló nem növeli meg a fő űrlap méretét, hanem egy dedikált, fókuszált másodlagos modálban nyílik meg (`isAiModalOpen`).
   - Előnézeti kártyán megjelenik a pozíció, belső munkakör és a hirdető szervezet neve/városa.
4. **Biztonságos Rich Text Renderelés (`RichTextContent` & `sanitizeHtml`):**
   - A `marked` könyvtár feldolgozza mind a Markdown, mind a HTML formátumokat.
   - A saját fejlesztésű regex alapú `sanitizeHtml` megtisztítja a tartalmat a veszélyes elemtől (`<script>`, `<iframe>`, `object`, inline event handlers pl. `onload`, `onerror`).
   - A Tailwind `@tailwindcss/typography` (`prose prose-sm`) osztályai biztosítják a platformszintű, egységes tipográfiát.

## 4. Következmények

### Pozitív:
- A toborzók 3 másodperc alatt piacképes, professzionális, cégre szabott hirdetéseket állíthatnak elő.
- Teljes XSS védelem a publikus karrieroldalon.
- A vezetés számára meggyőző, modern generatív AI képesség a platformban.

### Negatív / Kockázatok:
- A Google API kulcs (`GOOGLE_API_KEY`) konfigurációt igényel az éles környezetben (offline sablon fallback védi).
