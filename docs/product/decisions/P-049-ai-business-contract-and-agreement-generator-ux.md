# PRD P-049: AI Alapú Üzleti Szerződés- és Megállapodáskészítő Rendszer UX

- **Dátum:** 2026-10-05
- **Státusz:** Elfogadva
- **Hatókör:** `[Docs]` (eaisyDocs Üzleti Szerződés- és Partnerkezelési Rendszer)
- **Kapcsolódó ADR / Szabályzat:** [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [P-043](./P-043-global-ui-consistency-and-unified-components.md), [P-048](./P-048-outgoing-document-and-dispatch-architecture-ux.md), `EaisyDOCS_funkciok_es_backlog_v2.md`
- **Kapcsolódó Kód:** `src/components/contracts/contract-generator-dialog.tsx`, `src/utils/contract-templates.ts`, `src/utils/contract-pdf-generator.ts`, `src/app/partners/[id]/page.tsx`, `src/app/partners/contract-actions.ts`

---

## 1. Felhasználói Probléma és Üzleti Kontextus

A vállalkozások mindennapi működésében a partnerekkel (megrendelőkkel, alvállalkozókkal, beszállítókkal) kötött szerződések és megállapodások – mint például **Megbízási szerződés**, **Titoktartási megállapodás (NDA)**, **Szolgáltatási keretszerződés** vagy **Teljesítésigazolás** – előkészítése rendkívül időigényes, manuális és hibalehetőségekkel teli folyamat.

A felhasználók jelenleg:
1. Régi Word sablonokból másolgatják át a cégadatokat (adószám, székhely, képviselő), ahol gyakran benne maradnak korábbi ügyfelek adatai.
2. A jogi záradékokat (díjazás, kötbér, határidők, felmondás) kézzel gépelik be, ami jogi bizonytalanságot vagy formátumi hibákat szül.
3. A kész dokumentumot külön kell PDF-be exportálni, kézzel beiktatni az eaisyDocs iktatókönyvbe, külön összekapcsolni a partnerrel, és külön e-mail kliensből elküldeni.

**A cél:** Egy olyan integrált, modern **eaisyDocs szerződéskészítő és generáló modul**, amely a partnertörzs adataira építve, természetes nyelvű AI prompt segítségével másodpercek alatt készít professzionális, strukturált magyar szerződéstervezetet, biztosítja az élő előnézetet és szerkesztést, majd egyetlen gombnyomással generálja a hivatalos A4-es PDF-et, automatikusan iktatja az ügyiratba és elküldi a partnernek.

---

## 2. Termék és UX Döntések

### 2.1. eaisyDocs Hatáskör és Moduláris Függetlenség
- Az általános üzleti szerződések és megállapodások **100%-ban az eaisyDocs rendszerhez tartoznak**, mivel külső partnerekkel (`partner`) köttetnek, és kimenő iratként (`irat`, `irany = 'kimeno'`) iktatódnak a hatósági iktatókönyvbe.
- Független marad az eaisyHR modultól: ha egy ügyfél kizárólag az eaisyDocs-ot használja, az üzleti szerződéskészítő teljes funkcionalitással rendelkezésére áll.

### 2.2. Indítási Pontok a Felületen (Accessibility)
1. **Partner 360° Adatlap (`src/app/partners/[id]/page.tsx`):**
   - A fejléc akciógombjai között és a kapcsolódó dokumentumok szekcióban kiemelt Linear-flat gomb: `[ ➕ Új szerződés generálása ]`.
   - Megnyitáskor a partner törzsadatai (név, adószám, székhely, képviselő) automatikusan beemelődnek.
2. **Központi Partnerek Lista (`src/app/partners/partners-table-client.tsx`):**
   - Gyors elérés a műveleti menüből közvetlenül a partner sorából.
3. **Ügyirat Munkalap (`src/app/dossiers/[id]/page.tsx`):**
   - Az ügyirathoz tartozó partner alapján közvetlen szerződés- és megállapodáskészítés meglévő ügyiratba iktatva.

### 2.3. Háromlépéses Elegáns Dialógus Munkafolyamat (`ContractGeneratorDialog`)

```text
┌────────────────────────────────────────────────────────┐
│ 1. Lépés: Sablon & Partner Kiválasztása                │
│    • Sablonválasztó kártyák lebegő előnézettel         │
│      (Megbízási, NDA, Keretszerződés, Egyedi)          │
│    • Partner és Megbízó adatok áttekintése             │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Lépés: AI Prompt & Paraméterezés                    │
│    • Természetes nyelvű instrukciók (összeg, határidő, │
│      kötbér, rendelkezésre állás)                      │
│    • Egykattintásos gyors sablonminták                 │
│    • [ ✨ Szerződéstervezet generálása AI-val ]        │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Lépés: Élő Előnézet, Finomhangolás & Iktatás        │
│    • Strukturált fejezetek (Preambulum, Díjazás, stb.) │
│    • Teljes körű közvetlen szerkeszthetőség            │
│    • Új ügyirat nyitása vagy meglévőhöz kapcsolás      │
│    • Opcionális közvetlen e-mail kiküldés a partnernek │
│    • [ 📄 Szerződés iktatása és PDF letöltése ]        │
└────────────────────────────────────────────────────────┘
```

### 2.4. Támogatott Szerződéstípusok és Sablonok
1. **Megbízási Szerződés (`megbizasi`):**
   - Szolgáltatás, fejlesztés, tanácsadás vagy alvállalkozói tevékenység.
   - Díjazás (fix összeg, havidíj, óradíj), teljesítési és fizetési határidők, rendelkezésre állás, felelősség.
2. **Titoktartási Megállapodás - NDA (`nda`):**
   - Egyoldalú vagy kétoldalú üzleti titoktartás.
   - Bizalmas információk köre, kivételek, időbeli hatály (pl. 3 vagy 5 év), szerződésszegési kötbér.
3. **Szolgáltatási Keretszerződés (`keretszerzodes`):**
   - Hosszú távú együttműködési feltételek, egyedi lehívások és megrendelők alapja.
4. **Teljesítésigazolás (`teljesites_igazolas`):**
   - Számla kibocsátásához és kifizetéséhez szükséges formális teljesítésigazolási jegyzőkönyv.
5. **Egyedi Üzleti Megállapodás (`egyedi`):**
   - Tetszőleges üzleti konstrukció szabad szöveges prompt alapján.

### 2.5. Egyedi Szerződéssablonok és Típusok Kezelése (Inline Subview Architecture)
- **Rendszerszintű tárolás:** A sablonok a `rendszer_beallitas` táblában tárolódnak `szerzodes_sablonok` kulcs alatt, így az ügyfelek nem csupán az 5 gyári sablonra korlátozódnak, hanem tetszőleges számú saját vállalati típust (pl. *Bérleti szerződés*, *Kivitelezési szerződés*, *Disztribúciós megállapodás*, *Munkaerő-kölcsönzés*) hozhatnak létre.
- **Inline Alnézet Váltás (Anti-Modal-in-Modal Minta):**
  - A korábbi egymásba nyíló (nested modal) dialógus helyett az új sablon felvétele közvetlenül a `ContractGeneratorDialog` felületén belül, elegáns in-place nézetváltással (`templateViewMode: "select" | "create"`) történik.
  - Előnyei:
    - Megszűnik a több rétegű sötét overlay (backdrop konfliktus) és a szűk belső popup.
    - Teljes szélességben (`max-w-4xl`) kihasználja a kényelmes kétoszlopos elrendezést (bal oldalon a sablon alapadatok, jobb oldalon az AI prompt minták és tájékoztató).
    - Visszalépési lehetőség: `[ ← Vissza a sablonokhoz ]` gombbal bármikor visszatérhetünk a sablonválasztóhoz.
    - Mentéskor automatikusan létrejön az adatbázisban a sablon, azonnal bekerül az aktív listába, kijelölésre kerül, és visszavisz a generálási fülre a friss adatokkal kitöltve.
- **Egyedi Sablonok Törlése & Jelölése:**
  - Az egyedi sablonkártyák diszkrét `Egyedi` jelvénnyel és törlés (`Trash2`) gombbal rendelkeznek, a gyári alapsablonok védettek.

### 2.6. AI Generálási Motor és Hibatűrő Tartalék (Fallback)
- **Elsődleges motor:** Google Gemini LLM (`gemini-2.5-flash`), amely a kiválasztott jogi sablon struktúráját a megadott prompt paramétereivel pontos, elegáns és hibátlan magyar jogi nyelvezettel tölti fel.
- **Determinisztikus tartalék (Heuristic Fallback):** Ha a Google API kulcs nem áll rendelkezésre vagy hálózati hiba lép fel, a rendszer azonnal átvált egy beépített intelligens sablonkitöltő motorra, amely a megadott promptból kinyert vagy alapértelmezett adatokat illeszti be a szerződésbe, így a funkció **soha nem akad el vagy dől össze**.

### 2.7. Professzionális Kétoszlopos Szerződés PDF
- Formátum: Hivatalos A4-es méret, margók, fejléc iktatószámmal és dátummal.
- Számozott, kiemelt fejezetcímek és rendezett bekezdések.
- Kétoszlopos, szimmetrikus aláírási blokk a végén:
  - Bal oldal: **Megbízó / Megrendelő** adatai és képviselői aláírási vonala.
  - Jobb oldal: **Megbízott / Szolgáltató** adatai és képviselői aláírási vonala.
- Lábléc minden oldalon a rendszerbeli egyedi azonosítóval és oldalszámozással.

### 2.8. Pénzügyi Összegek, Kötbér és Prompt Intelligens Szinkronizációja
- **Alapértelmezetten tiszta, üres beviteli mezők:** A megbízási díj és kötbér beviteli mezője megnyitáskor és sablonváltáskor üresen indul, diszkrét mintát mutató helyőrzővel (`placeholder="pl. 1 000 000"`), így a felhasználó tiszta lapról dönthet az érték megadásáról.
- **Kétirányú dinamikus szinkronizáció:**
  - Ha a felhasználó beír egy összeget a felső mezőbe, az a prompt szövegében lévő összeget is automatikusan frissíti a pontos formátummal.
  - Ha a felhasználó a promptban módosít egy összeget (pl. 1 millióról 500 ezerre), és a felső mező korábban kitöltésre került, a mező értéke automatikusan követi a promptot.
- **Promptból történő intelligens összegkinyerés (`extractAmountFromPrompt`):** Ha a felhasználó a felső mezőt üresen hagyja, de a promptban szerepel konkrét összeg (pl. *"500.000 Ft kötbérrel"*), a generáló motor (Gemini és Fallback egyaránt) automatikusan kinyeri és a szerződés megfelelő fejezetébe (pl. kötbér záradék) beépíti azt.
### 2.9. Valós Idejű A4-es PDF Előnézet és Betekintő
- **Diszkrét indítás:** A 2. lépésben (Tervezet áttekintése) a fejlécben, az *Újragenerálás* gomb mellett egy diszkrét **`[ 👁️ PDF Előnézet ]`** gomb kapott helyet.
- **On-the-fly generálás (`generateContractPdfPreviewAction`):** A gomb megnyomásakor a szerver a felhasználó által a szerkesztőben éppen aktuálisan látott szövegből (és nem csupán a kiinduló tervezetből) másodpercek alatt összeállítja a formázott A4-es PDF-et a memóriában.
- **Teljes méretű betekintő (`DocumentPreviewFrame`):** A megnyíló modálban a felhasználó lapozhatja, áttekintheti az oldalakat, ellenőrizheti a fejlécet, margókat és aláírási blokkokat.
- **Közvetlen letöltés:** A modál fejlécéből a tervezet azonnal le is tölthető (`[ ⬇ PDF Letöltése ]`), így iktatás előtt is megosztható vagy offline ellenőrizhető.

### 2.10. Kanonikus Megerősítő Párbeszédpanel Sablontörléshez
- A natív böngészős `window.confirm()` helyett a rendszerben egységesen használt, kanonikus `AlertDialog` modál védi a felhasználót a véletlen törlésektől.
- Vörös figyelmeztető fejléc, a törlendő sablon nevének kiemelése és egyértelmű tájékoztatás, hogy a korábban leiktatott ügyiratok és szerződések érintetlenek maradnak.

---

## 3. Érintett Komponensek és Fájlok

| Fájl | Szerep |
|---|---|
| `src/types/contract-templates.ts` | Szerződéstípusok, sablon interfészek és AI paraméter definíciók |
| `src/utils/contract-templates.ts` | Beépített hivatalos szerződéssablonok és prompt-segédletek |
| `src/utils/contract-pdf-generator.ts` | Kétoszlopos A4-es szerződés PDF generátor `pdf-lib` alapon |
| `src/app/partners/contract-actions.ts` | Szerveroldali AI generálás, memóriabeli PDF előnézet, sablon CRUD és véglegesítő iktatási action-ök |
| `src/components/contracts/contract-generator-dialog.tsx` | Fő modál interaktív lépésekkel, diszkrét PDF előnézettel, inline sablonkészítővel és AlertDialog megerősítéssel |
| `src/app/partners/[id]/page.tsx` | Partner adatlap integráció a fejlécben és a kapcsolódó iratok felett |
| `src/app/partners/partners-table-client.tsx` | Partnerek listája integráció |

---

## 4. Jövőbeli Bővítési Lehetőségek (Backlog)

1. **Lejárati és felülvizsgálati emlékeztető feladat:**
   - A szerződésben megadott hatálybalépés és időtartam (pl. 12 hónap) alapján a lejárati dátum előtt 30 nappal a rendszer automatikusan hozzon létre egy belső határidős feladatot a felelős munkatársnak (*„Szerződés felülvizsgálata és megújítása: [Partner neve]”*).
2. **Kétnyelvű szerződésgenerálás (Magyar – Angol):**
   - Nemzetközi partnereknél a sablon kiválasztásakor felajánlható kétnyelvű (szakaszonként egymás mellett vagy párhuzamosan megjelenő magyar-angol) változat, amit a Gemini egyetlen kattintással előállít.
3. **Digitális aláírási és jóváhagyási lánc indítása:**
   - Iktatás után a szerződés közvetlenül továbbítható legyen belső vezetői/jogi jóváhagyásra, vagy külső minősített e-aláírási szolgáltatóhoz (AVDH / e-Szignó / DocuSign).
4. **Partner adatlapon kiemelt „Aktív szerződések” widget:**
   - A Partner 360° adatlapon a kapcsolódó ügyiratok mellett jelenjen meg egy dedikált KPI és összefoglaló widget az érvényben lévő főbb keretszerződésekről, azok lejáratáról és keretösszegéről.


