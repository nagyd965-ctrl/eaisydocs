# eaisyHR - Hiányzó Funkciók Listája (Gap Analysis)

A szoftverterv (`eaisyhr.pdf`) alapos átvizsgálása után teljesen igazad van: bár a fő modulok működnek, a pályázati megfelelőséghez (az auditálhatósághoz) rengeteg "apró", de kritikus funkció és részlet hiányzik még. 

Az alábbi lista azokat a funkciókat tartalmazza, amiket a PDF **kifejezetten megkövetel (vagy az ellenőrzési forgatókönyvben szerepelnek)**, de jelenleg még nincsenek vagy csak részlegesen vannak implementálva a kódunkban:

### 1. Szervezet és Munkakörök
*Ami hiányzik a Munkakör adatlapról:*
- **Strukturált feladatok:** Feladatok, felelősségek, hatáskörök *strukturált listaként* (nem csak egy szövegmező).
- **Kompetenciák:** Elvárt kompetenciák, végzettség rögzítése.
- **Orvosi vizsgálatok:** Kötelező orvosi vizsgálat típusának és gyakoriságának kötése a munkakörhöz.
- **Munkaköri leírás nyugtázása:** A dolgozónak a portálon elektronikusan nyugtáznia kell, hogy megismerte a leírást (naplózva, időbélyeggel).
- **Szervezeti hierarchia (Org Chart):** Közvetlen vezető kiválasztása, ami alapján a jóváhagyási útvonalak is működnek.

### 2. Dolgozói alapadatok (7 blokk)
*Ami hiányzik az adatlap füleiről:*
- **~~Bizonyítványok feltöltése:~~ [KÉSZ]** A "Képzettségek" fülön a végzettségekhez/nyelvvizsgákhoz a PDF/kép feltöltésének lehetősége és beépített előnézeti (PDF Viewer) ablak.
- **Orvosi vizsgálat riasztás:** Automatikus figyelmeztetés a lejárat előtt.
- **Tanulmányi szerződés:** Lejárat és visszafizetési kötelezettség figyelése.
- **Fegyelmi/Kitüntetés:** Külön fül a fegyelmi ügyeknek, szigorú naplózással (GDPR különleges adat).
- **Változáskövetés (Időbeliség):** A HR adatoknál `ervenyes_tol` / `ervenyes_ig` kezelése, hogy lekérdezhető legyen a "múltbéli állapot".

### 3. Munkaszerződés-kezelés
*Ami hiányzik:*
- **Határozott idejű szerződések:** Automatikus figyelmeztetés a vezetőnek és a HR-nek, ha egy határozott idejű szerződés hamarosan lejár.

### 4. Törvényi kötelezettségek (NAV, KSH)
*Ami hiányzik:*
- **T1041 Riasztás:** A rendszernek emlékeztetnie kell a bejelentési határidőre a *munkába állás megkezdése előtt*.

### 5. Cafeteria
*Ami hiányzik:*
- **Nyilatkozatok tárolása:** A választás lezárásakor generálódnia kellene egy PDF nyilatkozatnak (pénztári belépés, adóelőleg-nyilatkozat), amit a rendszer tárol.

### 6. Toborzás (ATS)
*Ami hiányzik:*
- **Automatikus anonimizálás:** A GDPR megőrzési idő lejárta után a rendszernek automatikusan anonimizálnia kell a jelentkezői adatokat.
- **AI Támogatás (Differenciáló elem):** CV parsing (önéletrajz kinyerése strukturált adatra) és relevancia-összefoglaló.

### 7. Beléptetés (Onboarding)
*Ami hiányzik:*
- **Offboarding (Kiléptetés):** Bár a követelmény nem kéri kifejezetten, a PDF "önmagában eladható értékként" hivatkozik rá. A workflow motort fel kellene készíteni a kilépési feladatokra is (eszközvisszavétel, hozzáférés-megvonás).

### 8. Teljesítményértékelés
*Ami hiányzik:*
- **~~Aktivitások a célok alatt (Kritikus!):~~ [KÉSZ]** Az ellenőr kifejezetten a "célok teljesülése kapcsán felmerült aktivitásokat" fogja kérni. Minden cél alá fel lehet vinni bejegyzéseket, státuszváltásokat (idővonalszerűen), és a dolgozó is frissítheti a saját állását.
- **Karriertervezés:** Fejlesztési terv és képzési igény rögzítése.

### 9. Időgazdálkodás
*Ami hiányzik:*
- **Beléptető import (Kritikus!):** CSV/API import egy kártyás beléptetőből, és a rögzített vs. mért adatok *eltéréslistájának* generálása.
- **Tervezés:** Műszakbeosztás, kapacitástervezés (a távollétekkel összevetve, hogy ki lesz elérhető jövő héten).

### 10. Távollétek kezelése
*Ami hiányzik:*
- **~~Eszkaláció / Helyettesítés:~~ [KÉSZ]** Ha a jóváhagyó vezető maga is távol van, a rendszer automatikusan a helyetteshez irányítja a kérelmet a távollét idején. A helyettesítési lánc konfigurálható.
