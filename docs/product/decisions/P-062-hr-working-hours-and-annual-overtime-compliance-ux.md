# PRD [P-062] [HR] Munkaidőkorlátok (48h) és Éves Túlórakeret Megfelelőségi UX

## Státusz
Elfogadva

## Kontextus és Felhasználói Szükséglet
A munkáltatóknak törvényi kötelezettségük biztosítani, hogy egyetlen munkavállaló se dolgozzon heti 48 óránál többet (Mt. 99. §), és a naptári évben elrendelt túlórák száma ne lépje át a 250 órát (vagy kétoldalú megállapodás esetén a 400 órát az Mt. 135. § szerint). 

A vezetőknek és a HR menedzsereknek szükségük van:
1. Központi felügyeleti képernyőre, ahol azonnal látják a bírságveszélyes eseteket.
2. Vizuális folyamatjelzőre (progress bar) a dolgozó profilján és a jóváhagyási felületeken.
3. Figyelmeztető jelzésekre a műszaktervezőben, mielőtt egy jogsértő beosztás véglegessé válna.
4. Egyszerű, in-place kapcsolóra a 400 órás önként vállalt megállapodás adminisztrálására.

## Termék- és UX Döntések

### 1. Központi Compliance Hub – 3. Fül (`/hr/compliance`)
- **Navigáció:** A Compliance Hubban elérhető a `Munkaidő & Túlórakeret (Mt. 99. §, 135. §)` fül.
- **Kanonikus KPI Kártyák:**
  - *Heti 48h limit túllépés:* Kiemelt piros highlighttal, ha van érintett dolgozó.
  - *Éves keret 80% felett (Küszöb):* Sárga figyelmeztetés a kimerülőben lévő keretekről.
  - *Éves keret kimerült (100%+):* Piros vészjelzés a jogszabályellenes túlóráztatás megelőzésére.
  - *Önként vállalt megállapodás (400h):* Aktív megállapodással rendelkező munkatársak aránya.
- **Megfelelőségi Táblázat (`OvertimeComplianceTable`):**
  - Szabványos `TableToolbar`: bal oldalon instant gépelési kereső, jobb oldalon oszlopválasztó és zöld/teal Szűrés popover.
  - Oszlopok: Munkatárs (avatar + link), Részleg / Munkakör, Heti munkaidő badge-ekkel (tervezett vs. tény), Éves túlórakeret progress bar (0-79% zöld, 80-99% sárga, 100%+ piros), Hátralévő órák száma, 400h megállapodás checkbox, Műveleti gyorsugró ikonok.

### 2. Dolgozói Profil & Túlóra Egyenleg Kártya (`OvertimeBalanceCard`)
- A meglévő csúsztatási és kifizetési egyenleg mellett megjelenik a törvényi éves túlórakeret kártyarészlet:
  - Felső sávban az alkalmazandó keret (250h alapkeret vs. 400h megállapodás).
  - Kiemelt óraszám: pl. *42 óra / 250 óra (16.8%)*.
  - Színes folyamatjelző csík (Linear Flat, árnyékok nélkül).
  - Hátralévő keret pontos kijelzése.

### 3. Műszaktervező Támogatás (`ShiftPlannerWeeklyGrid`)
- Heti összesítő oszlop: a 40h feletti hetek sárga badge-et kapnak, a 48h felettiek piros kiemelt `>48h Mt.!` jelvényt.
- Beosztási popover: ha a munkatárs elérte vagy meghaladta a 48 órát, a műszak hozzárendelő popover tetején jól látható figyelmeztető banner jelenik meg: *"Mt. 99. §: Heti munkaidő már Xh (≥48h korlát)!"*

### 4. Megállapodás Kezelés (In-Place Toggle)
- A HR szakember a táblázatban közvetlenül bepipálhatja az önként vállalt túlmunka megállapodást.
- A rendszer azonnal frissíti a keretet 400 órára, újraszámolja a progress bart és a riasztási státuszt, valamint sikeres mentésről értesíti a felhasználót toast üzenettel.
