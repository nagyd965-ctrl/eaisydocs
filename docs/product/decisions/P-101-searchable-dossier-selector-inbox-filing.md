# P-101 [Docs] Kereshető Ügyirat-Kiválasztó és Intelligens Csatolás Felhasználói Élmény (UX)

## Státusz
Elfogadva (Accepted) - 2026-10-21

## Kontextus és Felhasználói Probléma
Az érkeztetett bejövő iratok iktatásakor a „Meglévőhöz csatolás” funkció elengedhetetlen a számlák, szerződésmódosítások és teljesítésigazolások megfelelő gyűjtőügyirathoz rendeléséhez.
A korábbi egyszerű lenyíló lista (`<Select>`) a következő problémákat okozta:
- **Átláthatatlanság:** Több tucat vagy száz ügyirat esetén a lista görgetése időrabló volt, mivel nem volt lehetőség gépeléssel szűrni.
- **Keresési hiányosságok:** Ha az irat egy számla volt (pl. Dr. Tanács Ügyvédi Iroda számlája), a felhasználó nem tudott azonnal rákeresni a partner nevére, a számlaszámra vagy az előzmény iktatószámára.
- **Zavaros kategorizálás:** A HR dossziék (pl. személyi anyagok) és pénzügyi dossziék ömlesztve jelentek meg.

A felhasználói elvárás egy olyan elegáns keresőfelület volt, mint amilyen a fejlécben lévő többcég-választóban (`company-selector.tsx`) már működik.

## Termékkövetelmények és UX Tervezés

### 1. Letisztult Kiválasztó Gomb (Trigger)
- Ha nincs kiválasztva semmi: diszkrét szürke placeholder és fel-le nyíl ikon.
- Ha van kiválasztott ügyirat:
  - Színes kategória jelvény (`Pénzügy` / `Szerződés` / `HR` / `Általános`).
  - Monospaced, jól olvasható iktatószám (`font-mono text-xs`).
  - Ügyirat tárgya (hosszú szöveg esetén elegáns három ponttal vágva).
  - Közvetlen `X` (törlés) gomb az azonnali visszavonáshoz.

### 2. Beágyazott Popover Kereső és Kategória Szűrők
- **Felső keresősáv:** Nagy, tiszta keresőmező (`Keresés ügyirat, számlaszám, partner szerint...`) nagyító ikonnal és automatikus fókusszal.
- **Magyar ékezetfüggetlen keresés:** A „szamla” gépelésre a rendszer megtalálja a „Számla” és „számlák” tartalmú ügyiratokat is.
- **Kategória pill-ek darabszámmal:**
  - `Mind (X)`
  - `Számlák & Pénzügy (X)`
  - `Szerződések (X)`
  - `HR (X)`
  - `Egyéb (X)`
  Egy kattintással elrejthetők a nem releváns ügyiratok.

### 3. Intelligens Partner-Ajánló Kiemelés
- Ha az űrlapon meg van adva vagy az AI által felismert a küldő partner, a lista legtetején egy arany/sárga kiemelt szekció jelenik meg:
  `✨ Javasolt ügyiratok a küldő partnerhez`
  Így egyetlen kattintással kiválasztható a partnerhez tartozó aktív szerződés vagy megbízás.

### 4. Részletes Ügyirat Kártyák a Listában
Minden tétel a listában tartalmazza:
- Iktatószám és státusz badge (`Nyitott`, `Folyamatban`, `Lezárt`).
- Csatolt iratok darabszáma (pl. `3 irat`).
- Ügy tárgya.
- Partner neve és kapcsolódó számla/hivatkozási számok.
- Létrehozás dátuma.
- Jobb oldali zöld pipa a kiválasztott elemnél (a cégválasztóhoz hasonlóan).

### 5. Kiválasztási Megerősítő Kártya
A kiválasztást követően a lenyíló alatt egy diszkrét információs kártya erősíti meg az ügyintézőt:
- Tájékoztatás arról, hogy az irat a kiválasztott ügyirat következő alszámát (pl. `PENZUGY/2026/00053/2`) kapja meg.

## Kapcsolódó Kód és Hivatkozások
- **Kanonikus Komponens:** `src/components/dossier-search-selector.tsx`
- **Integrációs Felületek:** `src/components/filing-panel-client.tsx`, `src/components/filing-dialog.tsx`, `src/app/inbox/[id]/page.tsx`
- **Építészeti Döntés:** [A-077](../../architecture/decisions/A-077-searchable-dossier-selector-inbox-filing.md)
