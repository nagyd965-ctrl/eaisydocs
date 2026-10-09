# P-055: Céges Iktatási Szabályok és Prompt Könyvtár Kezelőfelület (Rules UX)

**Dátum:** 2026-10-09  
**Hatókör:** `[Docs]` (eaisyDocs)  
**Státusz:** Elfogadva  

## 1. Felhasználói Élmény és Célok
A felhasználók számára a Visibill bevált elrendezése alapján egy kétfülös vezérlőközpontot adunk a `/rules` útvonalon:
1. **Iktatási Szabályok (Determinisztikus számla- és iratszabályok):** Tételszintű szövegminta- és partnerillesztés az iktatási célmezők automatikus, tévedhetetlen kitöltésére.
2. **AI Prompt Könyvtár:** Természetes nyelvű instrukciók a mesterséges intelligencia (Gemini) vezérlésére.

## 2. Képernyők és Interakciók

### 1. Felső Fülválasztó
- **Iktatási Szabályok** (darabszám jelvénnyel)
- **AI Prompt Könyvtár** (darabszám jelvénnyel)

### 2. Iktatási Szabályok Munkafelület
- **Keresősáv:** Szabálynév, minta, célosztály vagy partner alapján történő azonnali szűrés.
- **Szabálykártyák:** Megjeleníti az illeszkedési feltételeket (szövegminta, partner, adószám), a cél hozzárendeléseket (Osztály, Irattár, Típus, Előtag), a hatókört (Csak ez a cég vs Minden cég) és az azonnali ki/bekapcsoló kapcsolót.
- **Új Iktatási Szabály Dialog (Visibill 2. képernyője alapján):**
  - Szabály megnevezése
  - Keresendő szövegminta az iratban / leírásban
  - Cél Szervezeti Egység (Osztály) legördülő
  - Cél Irattári tételszám legördülő
  - Cél Dokumentumtípus legördülő (Számla, Szerződés, Határozat, Szállítólevél, Egyéb)
  - Tárgy előtag / Minta (pl. `[Távközlés]`, `[SaaS]`)
  - Illesztési típus (Tartalmazza / Pontos egyezés / Kezdődik)
  - Partner szűrés (Partner neve / Partner adószáma)
  - Hatókör (Csak ez a cég vs Minden cég)

### 3. AI Prompt Könyvtár Munkafelület
- Kétoszlopos nézet aktív prompt szabályokkal és jobb oldalon egykattintásos KKV sablonokkal.
- Új AI Prompt szabály Dialog a természetes nyelvű promptok rögzítésére.

### 4. Cégbeállítások és Többcég Reaktivitás
- A `/settings?tab=company` lapról közvetlen hivatkozás érhető el.
- A `key={companyScope}` biztosítja, hogy cégváltáskor mindkét fül azonnal a kiválasztott cég adataival jelenik meg.
