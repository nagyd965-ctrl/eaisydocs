# P-026: [HR & Docs] Munkavállalói Életciklus Dokumentumsablonok és Iratkezelési Terv (Roadmap)

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]` & `[Docs]`  
**Státusz:** `ELFOGADVA / MEGVALÓSÍTÁS ELŐTT`  
**Kapcsolódó döntések:** [A-026: Employee Personal Dossier and HR Filing Bridge](../../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md), [P-025: Employee Document Filing and Dossier UX](./P-025-employee-document-filing-and-dossier-ux.md)  
**Kapcsolódó forráskód:** `src/components/hr/contract-generator-dialog.tsx`, `src/app/hr/employee/[id]/*`, `src/utils/hr-filing-bridge.ts`

---

## 1. Háttér és Célkitűzés

Az eaisyDocs és eaisyHR közötti integráció során sikeresen megvalósult a kétirányú iktató híd (`A-026`, `P-025`), amely lehetővé teszi a dolgozói dokumentumok egyedi vagy kötegelt iktatását a munkavállaló személyi dossziéjába (`HR/ÉÉÉÉ/SORSZÁM`).

Jelenleg azonban az eaisyHR belső dokumentumgenerátora (`ContractGeneratorDialog`) csak a munkaszerződést (valamint a bérmódosítást és titoktartásit) állítja elő dinamikusan. Ahhoz, hogy a munkavállalói személyi dosszié a valóságban is teljes körű, jogszabályilag feddhetetlen digitális irattárrá váljon, a **teljes munkavállalói életciklust (Belépés $\rightarrow$ Foglalkoztatás $\rightarrow$ Kilépés)** lefedő hivatalos dokumentumsablonokat kell biztosítanunk.

Jelen leirat célja a hiányzó és megvalósítandó dokumentumsablonok pontos katalógusának, adatforrásainak, jogi hátterének és a megvalósítás lépéseinek rögzítése a következő fejlesztési szakaszhoz.

---

## 2. A Dokumentumtípusok Részletes Katalógusa

```
Munkavállalói Életciklus
├── 1. Belépés & Onboarding
│   ├── Munkaszerződés (Kész)
│   ├── Titoktartási Nyilatkozat - NDA (Kész)
│   ├── Munkaköri Leírás [ÚJ]
│   ├── Mt. 46. § Munkáltatói Tájékoztató [ÚJ]
│   ├── Eszköz Átadás-Átvételi Jegyzőkönyv [ÚJ]
│   ├── Munkavédelmi és Tűzvédelmi Oktatási Lap [ÚJ]
│   └── GDPR Munkavállalói Adatkezelési Tájékoztató [ÚJ]
│
├── 2. Foglalkoztatás alatti Életciklus
│   ├── Havi Lezárt Jelenléti Ív & Munkaidő Összesítő [ÚJ]
│   ├── Szabadság Engedélyező / Éves Szabadság Lap [ÚJ]
│   ├── Cafeteria / Juttatási Nyilatkozat [ÚJ]
│   ├── Tanulmányi Szerződés [ÚJ]
│   ├── Írásbeli Figyelmeztetés / Fegyelmi Határozat [ÚJ]
│   └── Bérmódosítás (Kész)
│
└── 3. Kilépés & Offboarding
    ├── Munkaviszony Megszüntetési Megállapodás [ÚJ]
    ├── Eszköz Visszavételi & Leszámoló Lap [ÚJ]
    └── Törvényes Kilépő Munkaügyi Igazoláscsomag [ÚJ]
```

---

### A) 1. Fázis: Belépés & Onboarding Iratok

#### 1. Munkaköri Leírás
- **Jogi háttér:** Az Mt. alapján a munkaszerződés kötelező melléklete. Részletesen rögzíti az elvárt feladatokat és felelősségi szinteket.
- **Adatforrás a rendszerben:** `hr_munkakor` tábla (`megnevezes`, `szint`, `leiras`, `felelossegek`, `kovetelmenyek`), valamint a dolgozó közvetlen felettese.
- **Megjelenés:** Hivatalos A4-es formátum, felettes jóváhagyási záradékával és munkavállalói aláírási blokkal.
- **Irattári tétel:** *3.1 - Munkaviszony alapdokumentumai* (Megőrzés: 50 év / 2076).

#### 2. Mt. 46. § szerinti Munkáltatói Írásbeli Tájékoztató
- **Jogi háttér:** Az Mt. 46. § értelmében a munkáltató legkésőbb a munkaviszony kezdetétől számított 7 napon belül köteles írásban tájékoztatni a munkavállalót az alapvető munkavégzési feltételekről.
- **Adatforrás a rendszerben:**
  - Napi munkaidő mértéke, beosztás szabályai, próbaidő tartama.
  - Alapbér feletti egyéb juttatások, bérfizetés napja és módja.
  - Rendes felmondás szabályai, felmondási idő számítása.
  - Szabadság kiadásának rendje.
  - Kollektív szerződés hatálya, üzemi tanács / munkavédelmi képviselet.
- **Irattári tétel:** *3.1 - Munkaviszony alapdokumentumai* (Megőrzés: 50 év).

#### 3. Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv (Leltárfelelősség)
- **Jogi háttér:** Ptk. és Mt. szerinti vagyoni felelősségvállalás a kizárólagos használatra átadott eszközökért.
- **Adatforrás a rendszerben:** A dolgozó adatlapján található `WorkplaceTab` és a munkahelyi eszközök nyilvántartása.
- **Tartalom:**
  - Átadott IT eszközök (laptop modell, gyári szám/szériaszám, töltő, egér).
  - Távközlési eszközök (céges mobiltelefon IMEI szám, telefonszám, SIM).
  - Céges belépőkártya, kapunyitó kulcsok.
  - Gépkocsi (rendszám, forgalmi engedély, üzemanyagkártya).
- **Záradék:** Visszaszolgáltatási kötelezettség és anyagi felelősség nyilatkozat.
- **Irattári tétel:** *3.3 - Eszközfelelősségi iratok* (Megőrzés: 5 év az eszköz visszavételéig).

#### 4. Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv
- **Jogi háttér:** 1993. évi XCIII. törvény a munkavédelemről. Munkába állás előtt kötelező igazolni az oktatás megtörténtét.
- **Adatforrás:** Dolgozó neve, munkakör, oktató neve, tematika, oktatás dátuma.
- **Irattári tétel:** *3.4 - Munkavédelmi iratok* (Megőrzés: 10 év).

#### 5. Munkavállalói GDPR Adatkezelési Tájékoztató & Hozzájárulás
- **Jogi háttér:** GDPR és Infotv. A munkavállaló személyes adatainak (biometrikus beléptetés, GPS nyomkövetés, céges profilkép) jogszerű kezelése.
- **Adatforrás:** Személyes adatok kategóriái, kamerás megfigyelés (ha van), hozzájáruló nyilatkozat.
- **Irattári tétel:** *3.5 - Adatvédelmi nyilatkozatok* (Megőrzés: munkaviszony megszűnéséig + 5 év).

---

### B) 2. Fázis: Foglalkoztatás alatti Rendszeres Iratok

#### 1. Havi Lezárt Jelenléti Ív & Munkaidő Összesítő
- **Működési elv:**
  1. A munkavállaló és a felettes a hónap végén a `src/app/hr/time` vagy `AttendanceTab` felületen áttekinti a havi ledolgozott órákat, túlórákat, szabadságokat és táppénzeket.
  2. A HR felelős megnyomja a **„Hónap lezárása és Jelenléti ív iktatása”** gombot.
  3. A rendszer legenerálja az adott havi A4 fekvő formátumú jelenléti ívet (naponkénti bontás, összesített rendes és rendkívüli munkaórák).
  4. Az ív automatikusan beiktatásra kerül a dolgozó személyi dossziéjába: pl. `HR/2026/00038/4` (*„Havi jelenléti ív - 2026. Október - Nagy Dániel”*).
- **Irattári tétel:** *3.2 - Munkaidő nyilvántartások* (Megőrzés: 5 év).

#### 2. Szabadság Engedélyező / Éves Szabadság Lap
- **Adatforrás:** `LeaveTab` és `hrSubmitLeaveRequest`.
- **Tartalom:** Törvényes alapszabadság, életkor szerinti pótszabadság, gyermekek utáni pótszabadság, igénybe vett napok, felettesi jóváhagyás.

#### 3. Cafeteria / Béren kívüli Juttatási Nyilatkozat
- **Adatforrás:** `CafeteriaTab` és `cafeteria-actions.ts`.
- **Tartalom:** A dolgozó éves cafeteria keretének megosztása (SZÉP-kártya szállás/vendéglátás/szabadidő zsebek, egyéb adómentes juttatások).
- **Megjelenés:** Éves aláírt nyilatkozat a bérszámfejtés és adóhatóság felé.

#### 4. Tanulmányi Szerződés
- **Adatforrás:** `StudyContractTab` tábla.
- **Tartalom:** Képzés megnevezése, intézmény, támogatás összege, fizetett tanulmányi munkaidő-kedvezmény, felmondási korlátozások / megtérítési kötelezettség.

#### 5. Írásbeli Figyelmeztetés / Fegyelmi Határozat
- **Adatforrás:** `DisciplinaryTab` modul.
- **Tartalom:** Kötelezettségszegés pontos leírása, határidő, jogorvoslati tájékoztató (Mt. 285. § szerinti 30 napos keresetindítási határidő).

---

### C) 3. Fázis: Kilépés & Offboarding Iratok

#### 1. Munkaviszony Megszüntetési Megállapodás
- **Típusok:**
  - *Közös megegyezés* (végkielégítés, szabadságmegváltás, titoktartási kötelezettség megerősítése).
  - *Munkáltatói felmondás* (indoklás, felmentési idő, végkielégítés).
  - *Munkavállalói felmondás*.
- **Adatforrás:** `src/app/hr/offboarding` felület.

#### 2. Eszköz Visszavételi & Leszámoló Lap
- **Működés:** A kilépési checklist (`toggleOffboardingTaskStatus`) lezárásakor generálódik.
- **Tartalom:** Az átvett eszközök (laptop, telefon, belépőkártya) hiánytalan visszavétele, fizikai állapot igazolása, vagyoni elszámolás (nincs levonandó tartozás).

#### 3. Törvényes Munkaügyi Kilépő Igazolások Csomagja
- Az Mt. szerinti kötelező záró igazolások:
  - *Igazolás a munkaviszony megszűnéséről.*
  - *Adatlap a bírósági végrehajtói letiltásokról.*
  - *Jövedelemigazolás egészségbiztosítási ellátásokhoz.*

---

## 3. Megvalósítási Terv és Ütemezés

### 1. Mérföldkő: A Generátor Bővítése (`HrDocumentGeneratorDialog`)
- **Teendő:** A meglévő `ContractGeneratorDialog` átalakítása több-sablonos általános HR dokumentumgenerátorrá.
- **Kezdő új sablonok:**
  1. *Munkaköri leírás* (a `hr_munkakor` adataiból azonnal előállítható).
  2. *Eszköz átadás-átvételi jegyzőkönyv* (a `WorkplaceTab` adataiból azonnal előállítható).
  3. *Mt. 46. § Munkáltatói tájékoztató* (szabályzat-alapú előtöltés).

### 2. Mérföldkő: Jelenléti Ív Havi Zárás & Automatikus Iktatás
- **Teendő:** Az `AttendanceTab`-ra felhelyezni a „Hónap lezárása és jelenléti ív iktatása” gombot.
- **Kimenet:** A havi jelenléti ív táblázatos PDF azonnal bekerül az `irat_files` tárhelyre és a személyi dossziéba iktatódik.

### 3. Mérföldkő: Offboarding Leszámoló Lap
- **Teendő:** Az offboarding folyamat végén egykattintásos elszámoló lap előállítása és a dosszié végleges lezárási előkészítése.

---

## 4. Irattári és Életciklus Mátrix (eaisyDocs Besorolás)

| Dokumentumtípus | Kategória | Megőrzési idő | Selejtezhető? | Védelmi szint | Cél Ügyirat |
|---|---|---|---|---|---|
| Munkaszerződés | Munkaviszony alap | 50 év | Nem | Bizalmas | Dolgozói személyi dosszié |
| Munkaköri Leírás | Munkaviszony alap | 50 év | Nem | Bizalmas | Dolgozói személyi dosszié |
| Mt. 46. § Tájékoztató | Munkaviszony alap | 50 év | Nem | Bizalmas | Dolgozói személyi dosszié |
| Eszköz Átadás-Átvétel | Eszközfelelősség | 5 év (leadás után) | Igen | Bizalmas | Dolgozói személyi dosszié |
| Munkavédelmi Oktatás | Munkavédelem | 10 év | Igen | Belső | Dolgozói személyi dosszié |
| Havi Jelenléti Ív | Munkaidő | 5 év | Igen | Belső | Dolgozói személyi dosszié |
| Cafeteria Nyilatkozat | Pénzügy / Juttatás | 5 év (adóév + 5) | Igen | Bizalmas | Dolgozói személyi dosszié |
| Tanulmányi Szerződés | Képzés / Szerződés | 10 év | Igen | Bizalmas | Dolgozói személyi dosszié |
| Fegyelmi Határozat | Munkaügy | 5 év | Igen | Szigorúan bizalmas | Dolgozói személyi dosszié |
| Kilépő Leszámoló Lap | Megszüntetés | 50 év | Nem | Bizalmas | Dolgozói személyi dosszié |
