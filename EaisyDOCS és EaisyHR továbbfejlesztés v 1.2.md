# **EaisyDOCS és EaisyHR**

Funkcionális specifikáció

A bemutatón elhangzott továbbfejlesztési javaslatok, elfogadott működési elvek és a kapcsolódó meglévő funkciók elkülönített feldolgozása.

A dokumentum a rendelkezésre bocsátott nyers leiratra épül. Üzleti működést, szereplőket, műveleteket, automatizmusokat és modulkapcsolatokat határoz meg; nem tartalmaz technikai megvalósítási tervet.

**Értelmezési és státuszszabályok**

* **FEJLESZTÉSI IGÉNY** A beszélgetésben kért, elfogadott vagy továbbfejlesztési irányként felvetett működés.  
* **BEMUTATOTT / ELFOGADOTT ALAPÁLLAPOT** A leirat szerint már meglévő képesség vagy tudatosan változatlanul hagyott működés. Ezek nem új fejlesztési feladatok.  
* **FELTÁRANDÓ / PONTOSÍTANDÓ** Vizsgálatot igénylő lehetőség, bizonytalan részlet vagy a leiratban nem eldöntött szabály.  
* **ELKÉSZÜLT / MEGVALÓSÍTVA (✅)** ~~Áthúzással~~ és zöld pipa jelöléssel ellátott tételek, amelyek élesben beépültek a működő rendszerbe és felülvizsgált architektúra/termék döntésekkel (ADR / PRD) dokumentálva lettek.

A leirat nem tartalmaz beszélőcímkéket. Az EaisyDOCS-részben a kezdeményező és jóváhagyó megszólalások többnyire elkülöníthetők. Az EaisyHR-részben a javaslatok jelentős részét feltehetően Dani ismerteti, részben korábbi vagy AI-val összegyűjtött ötletekként; Zoli a blokkot összességében pozitívan fogadja. Ezért az összes érdemi HR-javaslat szerepel, de a dokumentum nem tulajdonítja bizonyítatlanul mindegyiket személyesen Zolinak.

A **pontosítandó** pontok nem utólag hozzáadott, kötelező követelmények, hanem a működés véglegesítéséhez hiányzó döntések. A számszerű és jogszabályi hivatkozások a megbeszélés tartalmát rögzítik, nem jelentenek jogi megfelelőségi igazolást.

---

### **Feladatok áttekintése és megvalósítási állapota (Állapotmátrix)**

| Modul | Kód | Eredeti téma / feladat | Típus | Státusz | Megvalósítás / Referencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **EaisyDOCS** | **DOC-01** | ~~Feladatkatalógus és a feladatfelvétel felületének átalakítása~~ | Fejlesztési igény | ✅ **ELKÉSZÜLT** | ADR A-045, PRD P-064 (0 felugró ablak, beágyazott sablonszalag, AI válaszlevél varázsló) |
| **EaisyDOCS** | **DOC-02** | ~~Automatikus szignálás határainak rögzítése~~ | Elfogadott döntés | ✅ **ELKÉSZÜLT** | AI szervezeti egységhez szignál, személy manuális |
| **EaisyDOCS** | **DOC-03** | ~~Személyes és rendszerszintű beállítások szétválasztása~~ | Fejlesztési igény | ✅ **ELKÉSZÜLT** | `/profile` vs. `/settings` szétválasztva |
| **EaisyDOCS** | **DOC-04** | Egységes felhasználókezelés és EaisyBILL-adatforrás | Fejlesztési igény | ⏳ Tervezett | Külső ERP felhasználói forrás |
| **EaisyDOCS** | **DOC-05** | ~~Több-bérlős működés egységesítése (Multi-Tenancy)~~ | Fejlesztési irány | ✅ **ELKÉSZÜLT** | ADR A-034, A-044, PRD P-053, P-063 (`companies`, `company_members`) |
| **EaisyDOCS** | **DOC-06** | Fuvarozási iratok automatikus gyűjtése és összerendelése | Fejlesztési igény | ⏳ Tervezett | Speditőri munkaszám ERP kapcsolat |
| **EaisyDOCS** | **DOC-07** | Többszintű kategorizálás, AI-címkézés és összetett keresés | Fejlesztési igény | ⏳ Tervezett | FTS és kategóriák működnek; mély árucímkézés tervezett |
| **EaisyDOCS** | **DOC-08** | Elektronikus hitelesítés és távoli aláírás feltárása | Feltárás | ⏸️ Elhalasztva | Vezetői döntéssel elhalasztva |
| **EaisyHR** | **HR-01** | ~~Műszaktervezés a jelenléti folyamatban~~ | Fejlesztési igény | ✅ **ELKÉSZÜLT** | HR-TASK-01 / ADR A-037, PRD P-056 (`/hr/time`) |
| **EaisyHR** | **HR-02** | ~~Munkaidőkorlátok (48h) és éves túlórakeret számláló~~ | Fejlesztési igény | ✅ **ELKÉSZÜLT** | HR-TASK-02 / ADR A-043, PRD P-062 (`/hr/compliance`) |
| **EaisyHR** | **HR-03** | ~~Szabadságkiadási megfelelőség (14 nap) és riasztások~~ | Fejlesztési igény | ✅ **ELKÉSZÜLT** | HR-TASK-03 / ADR A-038, PRD P-057 (`/hr/compliance`) |
| **EaisyHR** | **HR-04** | ~~Munkavédelmi és tűzvédelmi oktatások lejárati mátrixa~~ | Fejlesztési igény | ✅ **ELKÉSZÜLT** | HR-TASK-04 / ADR A-039, PRD P-058 (`/hr/compliance`) |
| **EaisyHR** | **HR-05** | ~~Alkalmasság miatti műszak- és bejelentkezési blokkolás~~ | Meglévő kontroll | ✅ **ELKÉSZÜLT** | HR-TASK-05 / ADR A-040, PRD P-059 (Mvt. 49. § (1)) |
| **EaisyHR** | **HR-06** | ~~Offboarding: kötelező kilépőigazolások és Docs-iktatás~~ | Fejlesztési igény | ✅ **ELKÉSZÜLT** | HR-TASK-06 / ADR A-041, PRD P-060 (hatósági PDF + iktatás) |
| **EaisyHR** | **HR-07** | ~~Ütemezett bérpapír-előállítás és digitális átvételi nyugtázás~~ | Fejlesztési igény | ✅ **ELKÉSZÜLT** | HR-TASK-07 / ADR A-042, PRD P-061 (Mt. 155. §) |

---

**Tartalom**

* [1\. EaisyDOCS – elektronikus irat- és dokumentumkezelés](#1-eaisydocs--elektronikus-irat--és-dokumentumkezelés)  
  * [1.1. Szereplők és felelősségek](#11-szereplők-és-felelősségek)  
  * [1.2. Feladatkatalógus és a feladatfelvétel felületének átalakítása (DOC-01) ⏳](#12-feladatkatalógus-és-a-feladatfelvétel-felületének-átalakítása)  
  * [~~1.3. Automatikus szignálás határainak rögzítése (DOC-02)~~ ✅](#13-automatikus-szignálás-határainak-rögzítése)  
  * [~~1.4. Személyes és rendszerszintű beállítások szétválasztása (DOC-03)~~ ✅](#14-személyes-és-rendszerszintű-beállítások-szétválasztása)  
  * [1.5. Egységes felhasználókezelés és EaisyBILL-adatforrás (DOC-04) ⏳](#15-egységes-felhasználókezelés-és-eaisybill-adatforrás)  
  * [~~1.6. Több-bérlős működés egységesítése (DOC-05)~~ ✅](#16-több-bérlős-működés-egységesítése)  
  * [1.7. Fuvarozási iratok automatikus gyűjtése és összerendelése (DOC-06) ⏳](#17-fuvarozási-iratok-automatikus-gyűjtése-és-összerendelése)  
  * [1.8. Többszintű kategorizálás, AI-címkézés és összetett keresés (DOC-07) ⏳](#18-többszintű-kategorizálás-ai-címkézés-és-összetett-keresés)  
  * [1.9. Elektronikus hitelesítés és távoli aláírás lehetőségei (DOC-08) ⏸️](#19-elektronikus-hitelesítés-és-távoli-aláírás-lehetőségeinek-feltárása)  
  * [1.10. További bemutatott funkciók és döntések](#110-további-bemutatott-funkciók-és-az-ezekre-vonatkozó-döntések)  
* [2\. EaisyHR – munkaügyi és munkavállalói folyamatok](#2-eaisyhr--munkaügyi-és-munkavállalói-folyamatok)  
  * [2.1. Szereplők és felelősségek](#21-szereplők-és-felelősségek)  
  * [~~2.2. Műszaktervezés a jelenléti folyamatban (HR-01)~~ ✅](#22-műszaktervezés-a-jelenléti-folyamatban)  
  * [~~2.3. Munkaidőkorlátok és éves rendkívüli munkaidő követése (HR-02)~~ ✅](#23-munkaidőkorlátok-és-éves-rendkívüli-munkaidő-követése)  
  * [~~2.4. Szabadságkiadási megfelelőség és automatikus figyelmeztetések (HR-03)~~ ✅](#24-szabadságkiadási-megfelelőség-és-automatikus-figyelmeztetések)  
  * [~~2.5. Munkavédelmi és tűzvédelmi oktatások lejárati nyilvántartása (HR-04)~~ ✅](#25-munkavédelmi-és-tűzvédelmi-oktatások-lejárati-nyilvántartása)  
  * [~~2.6. Alkalmasság miatti műszak- és bejelentkezési blokkolás (HR-05)~~ ✅](#26-alkalmasság-miatti-műszak--és-bejelentkezési-blokkolás)  
  * [~~2.7. Offboarding: kötelező kilépőigazolások és EaisyDOCS-iktatás (HR-06)~~ ✅](#27-offboarding-kötelező-kilépőigazolások-és-eaisydocs-iktatás)  
  * [~~2.8. Ütemezett bérpapír-előállítás és digitális átvételi nyugtázás (HR-07)~~ ✅](#28-ütemezett-bérpapír-előállítás-és-digitális-átvételi-nyugtázás)  
  * [~~2.9. HR-függőségek és véglegesítendő döntések~~ ✅](#29-hr-függőségek-és-véglegesítendő-döntések)

## **1\. EaisyDOCS – elektronikus irat- és dokumentumkezelés**

---

Az EaisyDOCS böngészőből elérhető webes ügyviteli modul. A továbbfejlesztés célja a dokumentumok megőrzésén túl az ERP-folyamatokhoz kapcsolódó automatikus iratgyűjtés, összerendelés és visszakeresés, valamint a kezelőfelület és a közös felhasználókezelés rendezése.

### **1.1. Szereplők és felelősségek**

| Szereplő | Funkcionális felelősség   |
| :---- | :---- |
| Ügyintéző / iratkezelő | Beérkező iratok feldolgozása, iktatási műveletek, személyhez rendelés, dokumentumkapcsolatok és feladatok kezelése a rendelkezésére álló jogosultságok szerint. |
| Szervezeti egység munkatársa / kijelölt felelős | Az egységhez, majd személy szerint hozzá rendelt iratokkal kapcsolatos ügyintézés és feladatvégzés. |
| Rendszergazda / adminisztrátor | Rendszerszintű beállítások, irattári terv, megőrzési idők, csapat, szervezeti egységek, szerepkörök és biztonsági minősítések kezelése; a tervezett külső felhasználói adatforrás használata. |
| Megosztást végző felhasználó és címzett munkatárs | Egy dokumentum célzott hozzáférhetővé tétele olyan munkatársnak is, aki a szokásos szervezeti hozzáférés alapján nem látná azt. |
| Betekintő | Megtekintési szerepkör; nem iktathat, nem módosíthat és nem selejtezhet. |
| Auditor | A bemutatott működés szerint minden releváns iratot és auditálási adatot, az eseménynaplót is megtekintheti; módosítási jogosultsága nincs. |
| Vezető | Dashboard és vezetői mutatók használata a folyamatok áttekintésére. |
| Speditőri / fuvarszervezési ügyintéző | Fuvarokhoz tartozó iratanyag visszakeresése, projektenkénti áttekintése és korábbi szállítások összehasonlítása. |
| AI és automatikus feldolgozás | Iratadatok felismerése, szervezeti egység ajánlása vagy hozzárendelése a bemutatott működés szerint, irattári besorolás felismerése; a tervezett bővítésben fuvariratok azonosítása, összerendelése és címkézése. |
| Kapcsolódó ERP-modulok | EaisyBILL: partner- és tervezetten felhasználói adatforrás, valamint feldolgozott e-mail-folyam. EaisyWORK és a beszélgetésben említett CRM/TRM-folyamatok: ajánlat-, megrendelés-, projekt- és munkaszámkapcsolatok. |

A szerepek felsorolása funkcionális felelősségeket különít el; nem ír elő minden sorhoz önálló új rendszerjogosultságot.

### ~~**1.2. Feladatkatalógus és a feladatfelvétel felületének átalakítása**~~ ✅ **(ELKÉSZÜLT)**

~~**DOC-01 · FEJLESZTÉSI IGÉNY**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT** – A többszörösen egymásba nyíló felugró ablakok teljes körűen fel lettek számolva. A feladatkészítő közvetlenül az ügyirat feladatok fülén (`TasksTab`) helyezkedik el beágyazott sablonszalaggal és lenyitható katalógussal, a válaszlevelek pedig egy dedikált lapra (`OutgoingDocumentsTab`) kerültek háromlépcsős lineáris AI varázslóval (ADR A-045, PRD P-064).

**Kezdeményezés:** Dani bemutatja a sablonokkal kibővített feladatfelvételt; Zoli megerősíti, hogy a többszörösen egymásba nyíló felugró ablakokat meg kell szüntetni.

#### **Működési elv**

* Az iratkezelési folyamat feladatfelvételi pontján a feladatkészítés beágyazottan történik, 1-kattintásos gyorsgombokkal (`Jóváhagyás`, `Könyvelés`, `Jogi felülvizsgálat`, `Válaszlevél készítése`, stb.).  
* A sablonok és a feladatfelvétel érdemi vezérlői a fő felületen jelennek meg, nulla modállal.  
* A válaszlevelek kezelése külön dedikált fülre került beágyazott, 3-lépcsős AI és sablonalapú levélszerkesztővel.  
* A meglévő feladatállapotok megmaradtak: **nyitott → folyamatban → teljesítve → lezárva**.

---

**Elvárt eredmény:** ✅ **Teljesítve (ADR A-045, PRD P-064)**. Sablonból indítható feladatfelvétel, egymásba ágyazott felugró ablakok nélkül.

### ~~**1.3. Automatikus szignálás határainak rögzítése**~~ ✅ **(KÉSZ / DÖNTÉS ELFOGADVA)**

~~**DOC-02 · ELFOGADOTT MŰKÖDÉSI DÖNTÉS**~~  
**ÁLLAPOT:** ✅ **ÉRVÉNYBEN / IMPLEMENTÁLVA** – Az AI automatikusan szervezeti egységhez irányítja az iratot, a konkrét munkatárshoz rendelés manuális felelősség.

1. Az ügyintéző kiválaszt egy tételt a bejövő sorból, és elindítja a „Tovább az iktatáshoz” műveletet.  
2. Az AI-alapú kitöltés az iratot automatikusan egy **szervezeti egységhez** szignálja.  
3. A konkrét munkatárshoz történő hozzárendelés **manuális** marad.

**Döntés:** Zoli elfogadja, hogy a korábbi briefben szereplő automatikus személyszintű szignálás ne legyen kötelező. Indok: az irat érkezésekor nem feltétlenül ismert, hogy az adott egységen belül ki fog az üggyel foglalkozni.

### ~~**1.4. Személyes és rendszerszintű beállítások szétválasztása**~~ ✅ **(KÉSZ)**

~~**DOC-03 · FEJLESZTÉSI IGÉNY**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT** – A saját profil (`/profile`) és a rendszerszintű beállítások (`/settings` – szervezet, munkatársak, irattári terv, megőrzési idők) teljes mértékben szétválasztva működnek.

**Zoli javaslata:** a jelenlegi fogaskerék mögötti beállításkészlet túl terjedelmes, ezért különüljön el a saját profil kezelése és az alkalmazás adminisztrációja.

| Terület | Elvárt működés |
| :---- | :---- |
| Személyes profil | A profilhoz tartozó belépési pont elsősorban a saját adatok és személyes beállítások szerkesztésére szolgáljon. Ne ez legyen az összes adminisztratív funkció gyűjtőhelye. |
| Önálló beállítási / adminisztrációs menüpont | A kiterjedt szervezeti és rendszerszintű beállítások külön, áttekinthető menüpontból legyenek elérhetők. |
| Csapat és szervezeti egységek | Önállóan áttekinthető területként maradjanak kezelhetők. A beszélgetés az alapvető bontást elfogadja, teljes újraszervezést nem kér. |
| Jogosultságkezelés | A csapatkezelésben megadható szerepkör, szervezeti egység és biztonsági minősítés maradjon egyértelműen megtalálható. A meglévő jogosultsági modellt a közös felhasználókezelés előtt nem kell külön áttervezni. |
| Irattári terv és megőrzési idők | Rendszerszintű adminisztratív funkcióként, ne személyes profilbeállításként jelenjenek meg. |

**Megvalósítás:** A `/profile` felületen a saját felhasználói profiladatok és jelszókezelés érhető el. A `/settings` adminisztrációs központba került át a Szervezeti egységek, Munkatársak, Irattári terv, és Rendszerbeállítások kezelése.

### **1.5. Egységes felhasználókezelés és EaisyBILL-adatforrás**

**DOC-04 · FEJLESZTÉSI IGÉNY**

**Zoli javaslata:** ne csak partnereket, hanem felhasználókat is lehessen átvenni az EaisyBILL-ből; hosszabb távon egységes belső felhasználókezelés szükséges az ERP-ökoszisztémában.

#### **Szereplők és műveletek**

* **Adminisztrátor:** kiválasztja az EaisyBILL-t felhasználói adatforrásként, és kezdeményezi a felhasználói állomány feltöltését.  
* **EaisyBILL:** átadja az ott már nyilvántartott, bevonni kívánt felhasználók adatait.  
* **EaisyDOCS:** az átvett személyeket felhasználóként elérhetővé teszi a helyi csapat- és jogosultságkezelés számára.

#### **Működési követelmények**

1. A felhasználókhoz is legyen a partneradatforráshoz hasonló, egyértelmű **„Felhasználói adatforrás: EaisyBILL”** választási lehetőség.  
2. Az adminisztrátor egyszerűen feltölthesse a felhasználói névsort a forrásrendszerből; ne kelljen minden már létező személyt kézzel újra rögzítenie.  
3. Az átvétel ne feltételezze, hogy minden forrásrendszerbeli felhasználót minden modulban használni kell. A beszélgetés példája szerint a dolgozók átvétele jellemzően indokolt, a könyvelőé nem feltétlenül.  
4. A közös személyazonosság és az egyes modulokhoz való hozzáférés külön kezelendő: felmerül olyan munkavállaló esete is, akinek csak HR-funkciókra van szüksége.  
5. Számolni kell olyan dolgozóval is, aki a forrásrendszerben még nem szerepel. A meglévő helyi felhasználó-felvételi lehetőséget a beszélgetés nem vonja vissza.  
6. A helyi felhasználókezelést most ne alakítsák át a későbbi egységes megoldástól független, külön logika szerint.

**Nyitott döntések:** folyamatos szinkronizálás legyen; egyező személyek felismerése; frissítések, kilépések és letiltások átvétele szinkronizálódjon; átadható adatkör; moduljogosultságok kiosztása; az átvételi kör kiválasztásának részletes módja.

### ~~**1.6. Több-bérlős működés egységesítése**~~ ✅ **(KÉSZ)**

~~**DOC-05 · FEJLESZTÉSI IRÁNYRÉSZLETSZABÁLYOK KÜLSŐ LEÍRÁSBAN**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT** – Multi-Tenancy alapinfrastruktúra implementálva: központi `companies` és `company_members` táblák, fejlécbeli aktív cégválasztó, valamint szigorú RLS adatbázis-szintű cégizoláció az EaisyDOCS és EaisyHR modulban egyaránt (ADR: [A-034](docs/architecture/decisions/A-034-multi-company-architecture.md), [A-044](docs/architecture/decisions/A-044-hr-multitenancy-gdpr-isolation-architecture.md), PRD: [P-053](docs/product/decisions/P-053-multi-company-management-ux.md), [P-063](docs/product/decisions/P-063-hr-multitenancy-gdpr-isolation-ux.md)).

A megbeszélés önálló, jelentős feladatként kezeli a tenant-, illetve multitenancy-modell kialakítását. Irányként a már meglévő **EaisyBILL-modell és annak leírása** szolgáljon; ugyanennek az elvnek az Eaisy3-ban is meg kell jelennie.

* Az EaisyDOCS több-bérlős működése illeszkedjen a közös ERP-modellhez, ne különálló tenantlogikát vezessen be.  
* A felhasználói átvételt és a modulkapcsolatokat a közös bérlői keretben kell értelmezni.  
* A konkrét tenanttagsági, adatelkülönítési, adminisztrációs és tenantváltási szabályokat a hivatkozott modellből kell átvenni; ezek a leirat alapján önmagukban nem specifikálhatók.

### **1.7. Fuvarozási iratok automatikus gyűjtése és összerendelése**

**DOC-06 · FEJLESZTÉSI IGÉNY**

**Zoli részletes javaslata:** a rendszer natívan támogassa a speditőrcégek nagy mennyiségű fuvariratának összegyűjtését. A cél nem pusztán a fájlok elmentése, hanem az egy szállításhoz tartozó teljes dokumentumanyag könnyű megtalálása.

#### **Üzleti tárgyak és kapcsolatok**

| Tárgy | Szerepe a folyamatban |
| :---- | :---- |
| Ajánlat és ajánlatszám | A CRM/TRM, illetve EaisyWORK környezetében induló üzleti ügy előzménye. |
| Megrendelés / projekt / munkaszám | Az adott szállítási ügy közös azonosítási alapja. A megrendelés megtarthatja a korábbi számot, vagy új munkaszámot kaphat. |
| Partner / megrendelő | A szállítási ügyhöz tartozó cég, amely szerint az iratanyag rendezhető és visszakereshető. |
| Fuvarirat | Például CMR, fuvarlevél vagy fuvarmegbízáshoz tartozó egyéb dokumentum. |
| Közös gyűjtőazonosító / gyűjtőcímke | Összefogja az egy szállítási ügyhöz tartozó valamennyi dokumentumot. A példában említett körülbelül tíz dokumentum szemléltetés, nem darabszámkorlát. |

#### **A. Dokumentumátvétel a projektfolyamatból**

1. A kapcsolódó üzleti modulban létrejön az ajánlat, majd a megrendelés vagy projekt.  
2. A szállítási ügy megkapja a saját munkaszámát vagy projektazonosítóját.  
3. A projekthez tartozó dokumentumok **automatikusan** kerüljenek az EaisyDOCS iratanyagába, a megfelelő közös azonosítóval.  
4. A később keletkező új dokumentumok ugyanahhoz az ügyhöz kerüljenek hozzá, külön kézi újrarendezés nélkül.  
5. Az EaisyDOCS-ból együttesen legyen elérhető az ügy teljes dokumentumanyaga.

#### **B. Dokumentumátvétel a feldolgozott e-mail-folyamból**

1. Az ügyféltől e-mailben beérkezik egy dokumentum, amelyet az EaisyBILL e-mail-feldolgozása már kezel.  
2. Az automatikus feldolgozás felismeri a dokumentum típusát, például CMR-ként vagy fuvarlevélként azonosítja.  
3. A feldolgozás munkaszámot vagy más kapcsolódó ügyazonosítót keres benne.  
4. Azonosítható munkaszám esetén a dokumentum automatikusan az adott szállítási ügyhöz kapcsolódva archiválódjon, illetve váljon összegyűjtve elérhetővé az EaisyDOCS-ban.  
5. Az irat megkapja a kapcsolódó kategóriákat és a következő pontban részletezett automatikus címkéket.

#### **C. A „CMR–fuvarmegbízás egyeztetés” értelmezése**

A feladat megnevezését a beszélgetés során a felek **dokumentum-összerendelési és visszakeresési igényként** bontják ki. Nem hangzik el tételes követelmény a CMR és a megbízás mezőnkénti tartalmi ellenőrzésére, eltérésvizsgálatára vagy jóváhagyására.

A korábbi jegyzet felidézésekor **rendszám** és **dátumtartomány** mint opcionális adatok is elhangzanak. Ezek lehetséges keresési vagy azonosítási adatok, de szerepük nincs véglegesítve.

#### **Pontosítandó működési helyzetek**

* Az ajánlatszám, megrendelésszám és munkaszám megfeleltetése, ha az ügy során az azonosító megváltozik.  
* Hiányzó, többértelmű vagy több ügyre mutató munkaszám kezelése.  
* Ugyanazon dokumentum több csatornán történő beérkezése.  
* A projektben jelzett dokumentumigény és a ténylegesen beérkezett dokumentum viszonya: hiányzó dokumentumok automatikus követését a megbeszélés nem részletezi.  
* Központi példány vagy több helyen tárolt példány használata. A funkcionális elvárás az összegyűjtött elérhetőség, nem egy konkrét tárolási megoldás.

---

**Elvárt eredmény:** egy azonosítható szállítási ügyhöz érkező dokumentum külön kézi gyűjtögetés nélkül a megfelelő irategyüttes része lesz.

### **1.8. Többszintű kategorizálás, AI-címkézés és összetett keresés**

**DOC-07 · FEJLESZTÉSI IGÉNY**

Ez a DOC-06 folyamattal összetartozó, de önálló felhasználói képesség: a dokumentumok ne csak ügyazonosító alapján, hanem üzleti tartalmuk szerint is visszakereshetők legyenek.

#### **Klasszikus kategorizálás**

Az elhangzott példának megfelelően legyen támogatott az **év → partner / megrendelő cég → projekt- vagy munkaszám → dokumentumok** szerinti böngészés. Ez funkcionális rendezési nézet; a leirat nem követel meg fizikai mappastruktúrát.

#### **Automatikus címkézés**

Az AI már az érkeztetéskor rendeljen a dokumentumhoz olyan, annak tartalmából felismerhető címkéket és kereshető adatokat, amelyek segítik a későbbi szűrést.

| Keresési szempont | Elhangzott példa / rendeltetés |
| :---- | :---- |
| Dokumentumtípus | CMR, fuvarlevél és más szállítási dokumentumok elkülönítése. |
| Ügyazonosító | Projekt- vagy munkaszám szerinti közös dokumentumhalmaz. |
| Partner / megrendelő | Az adott céghez tartozó munkák és dokumentumok keresése. |
| Szállított áru / árufajta | Például acélcső vagy acélszerkezet. |
| Feladási és célhely | Honnan hová történt a szállítás; például Berlinbe irányuló fuvarok. |
| Tömeg és a rakomány releváns jellemzői | Például 5 tonnánál nagyobb tömegű szállítmányok vagy elemek kiválasztása. A leirat „méretű” megfogalmazást használ, de a tonna tömeget jelöl. |

* Egy irathoz többféle címke és kategória is kapcsolódhasson.  
* A felhasználó ne kizárólag kézzel végignézett fájllistából keressen, hanem az üzleti jellemzők alapján szűkíthesse az iratanyagot.  
* Az értékhatáros példák miatt a működésnek nemcsak azonos címkék megtalálását, hanem megfelelő adatok esetén küszöb szerinti szűrést is ki kell szolgálnia.

#### **Későbbi felhasználás: hasonló fuvarok alapján történő árbecslés**

Zoli további célként említi, hogy a jól címkézett történeti iratanyag segítse hasonló szállítások megtalálását és az árbecslést, később akár AI közreműködésével. **Most az ehhez szükséges kereshető információalap a megfogalmazott igény;** önálló automatikus árazási folyamat, árazási szabály vagy ajánlatjóváhagyás nem került specifikálásra, nem is része ennek a scope-nak.

**Pontosítandó:** címkék javításának és jóváhagyásának módja, eltérő megnevezések egységesítése, bizonytalan AI-felismerések kezelése, valamint a rendszám és dátumtartomány végleges szerepe.

---

**Elvárt eredmény:** például a Berlinbe szállított acélszerkezetekhez tartozó iratok az egyes fájlok manuális megnyitása nélkül visszakereshetők.

### **1.9. Elektronikus hitelesítés és távoli aláírás lehetőségeinek feltárása**

**DOC-08 · FELTÁRÁS, LEGFELJEBB 2 ÓRA**

**Kiinduló döntés:** az elektronikus aláírás megvalósítását Balázs korábban elhalasztotta. Zoli ettől elkülönítve rövid, legfeljebb kétórás feltárást kér az elérhető szolgáltatásokról és a kapcsolódási lehetőségekről. Ez **nem megvalósítási jóváhagyás**.

#### **Külön vizsgálandó szolgáltatási képességek**

| Képesség | Funkcionális cél |
| :---- | :---- |
| Dokumentum elektronikus hitelesítése | A dokumentum kapjon ellenőrizhető elektronikus hitelesítést, amely mellett az utólagos módosítás felismerhető. A cél nem a szerkeszthetőség technikai megszüntetése, hanem az eredetiség és változatlanság ellenőrizhetősége. |
| Távoli, két- vagy többoldalú aláírás | A szerződő felek távolról aláírhassák ugyanazt a dokumentumot, a választott szolgáltatás által igazolható módon. |
| Kombinált folyamat | A felek aláírását és a dokumentum elektronikus hitelesítését együtt biztosító lehetőség vizsgálata. |

#### **Vizsgálati szempontok**

* Ne kizárólag a drágának ítélt, saját márkás, úgynevezett white-label szolgáltatási modell legyen számításba véve.  
* Legyenek megvizsgálva az előfizetéses vagy egyedi dokumentumhitelesítést kínáló szolgáltatások is.  
* Derüljön ki, hogy a szolgáltatás az EaisyDOCS-ból, szolgáltatói kapcsolaton keresztül meghívható-e.  
* Derüljön ki, mely lépések automatizálhatók, és hol szükséges a felhasználó vagy az aláíró személyes közreműködése.  
* A szolgáltatási és díjazási modellek összehasonlítása térjen ki a belépési vagy előfizetési költségekre és az egyes hitelesítések díjára.  
* A Microsec, a „Verisign” néven említett példa és az állami, Ügyfélkapuhoz/e-Papírhoz kapcsolt lehetőség vizsgálati kiindulópont, nem kiválasztott vagy igazolt szolgáltatói kör.

#### **A kívánt felhasználói élmény**

1. A felhasználó megnyit egy dokumentumot az EaisyDOCS-ban.  
2. Elindítja a „Hitelesítem” jellegű műveletet.  
3. A rendszer a kiválasztott szolgáltatással elvégezteti a hitelesítést, a szolgáltató által megkövetelt közreműködéssel.  
4. A hitelesített dokumentum elérhetővé válik az iratkezelési folyamatban, lehetőség szerint külön kézi fájlmozgatás nélkül.

**Fontos pontosítás:** a leiratban elhangzó „SSL-tanúsítvány”, „felülhitelesítés”, illetve az állami ingyenes aláírásra vonatkozó állítások nem tekinthetők ellenőrzött szolgáltatási vagy jogi specifikációnak. A feltárásnak kell tisztáznia az aktuálisan elérhető megoldást, annak joghatását és automatizálhatóságát.

---

**A feltárás kimenete:** rövid döntési összefoglaló a három képesség támogatásáról, a kapcsolódás lehetőségéről, a szükséges felhasználói lépésekről, a költségmodellről és a még nyitott feltételekről.

### **1.10. További bemutatott funkciók és az ezekre vonatkozó döntések**

Az alábbi elemek a leirat érdemi részei, de nem önálló, új automatizációs igények. A megbeszélésben elfogadott alapállapotot rögzítik.

| Funkció | Rögzített működés | Státusz / döntés |
| :---- | :---- | :---- |
| Biztonsági / minősítési szintek | Nyilvános, belső, bizalmas és szigorúan bizalmas besorolás. | Késznek tekintett; most nem kérnek további átdolgozást. |
| Explicit megosztás | Az iratnál elérhető művelettel kiválasztható egy munkatárs, és hozzáférés adható neki akkor is, ha a szokásos szervezeti hozzáférése alapján nem látná az iratot. Példa: pénzügyi dokumentum megosztása HR-es munkatárssal. | Bemutatott, elkészült funkció. A kiosztható jogok pontos készlete és a megosztás korlátai nem szerepelnek részletesen. |
| Tömeges érkeztetés | Több beérkező irat együttes kezelését szolgáló képesség. | Dani elkészültként jelzi; részletes folyamat nem hangzik el. |
| Selejtezési állapotgép | A selejtezés állapotvezérelt folyamata. | Elkészültként jelzett. Konkrét állapotok és átmenetek nem szerepelnek a leiratban. |
| Irattári terv és megőrzési idők | Az adminisztrátor az irattári tervben megadja, hogy az egyes iratköröket meddig kell megőrizni. Az AI felismeri a vonatkozó besorolást. | Meglévő működés. A hozzáférési felület rendezése a DOC-03 része; lejáratkori automatikus törlési szabály nem hangzott el. |
| Adatvédelmi megjelenítés | Dani bizalmas adatok felületi takarását vagy elhomályosítását említi. A mondat a leiratban részben sérült. | Késznek jelzett funkció; ebből nem vezethető le részletes hozzáférés-védelmi vagy anonimizálási követelmény. |
| Szerződésgenerálás | A bemutatott generálási működést Zoli elfogadja. | A felugró ablakokra vonatkozó felületi kifogás itt is fennmarad; új szerződésgenerálási üzleti szabály nem hangzik el. |
| Értesítési szabályok és csatornák | SMS- és e-mail-értesítések működnek. | Késznek tekintett. Új eseménylista, címzetti rend vagy szabályszerkesztési igény nem szerepel. |
| CRM- és egyéb üzleti kapcsolatok | Egy irathoz kapcsolat adható, más üzleti rekordhoz csatolható. | Meglévő általános képesség. A fuvariratok automatikus kapcsolása a DOC-06-ban meghatározott bővítés. |
| Dashboard és vezetői mutatók | Vezetői áttekintő felület és mutatók. | Elkészültként jelzett; a konkrét mutatók nincsenek felsorolva. |
| Betekintő és auditor szerepkör | Az 1.1. pont szerinti megtekintési és audit-hozzáférések. | Elkészültként jelzett; új szerepkörfejlesztést nem kérnek. |
| Digitális archiválás és állománylenyomat | Dani feltöltéskori SHA-256-lenyomatot és PDF/A-archiválást említ meglévőként. | A további archiválási ötleteket most nem bontják ki. A lenyomat önmagában nem igazol PDF/A-megfelelést vagy hiteles archiválást; ilyen következtetés a leiratból nem vonható le. |

A záráskor említett, de tartalmilag fel nem olvasott kiegészítő ötletek nem rekonstruálhatók. A felek ezeket részben már késznek, részben későbbre hagyandónak tekintik; belőlük új követelmény nem képezhető.

## **2\. EaisyHR – munkaügyi és munkavállalói folyamatok**

---

Az EaisyHR-rész a jelenléti és munkaidő-folyamatok, a szabadságkezelés, az oktatási és alkalmassági nyilvántartás, a kiléptetés, valamint a bérpapírok kezelésének bővítését tárgyalja.

A fejezet az összes érdemben ismertetett HR-javaslatot tartalmazza. Az egyes ötletek végleges prioritása és teljes megvalósítási köre nem kerül külön jóváhagyásra a leiratban.

### **2.1. Szereplők és felelősségek**

| Szereplő | Funkcionális felelősség |
| :---- | :---- |
| Munkavállaló | Jelenléti műveletek és bejelentkezés, szabadság igénybevétele, a bérpapír átvétele és annak tervezett digitális nyugtázása. |
| HR-ügyintéző / munkaügyi felelős | Munkaidő- és szabadságadatok, oktatások, kilépési dokumentumok és bérpapírfolyamatok kezelése. |
| Műszaktervező / beosztásért felelős vezető | Műszakok tervezése, a munkavállalói korlátok és alkalmassági akadályok figyelembevétele. |
| Oktatási / munkavédelmi felelős | Munkavédelmi és tűzvédelmi oktatások érvényességének, jegyzőkönyveinek áttekintése. |
| Beállításokat kezelő felhasználó | A tervezetten paraméterezhető működés, különösen a bérpapírkészítés ütemezésének beállítása. Pontos jogosultsági köre nem hangzott el. |
| Automatikus szabályfigyelés és ütemezés | Munkaidő- és szabadságellenőrzések, számlálók, időzített figyelmeztetések és dokumentum-előállítás. |
| EaisyDOCS | A kiléptetéskor kiadott igazolások iktatási célrendszere. |

Ezek funkcionális szereplők. A leirat nem határoz meg új, teljes HR-jogosultsági mátrixot.

### ~~**2.2. Műszaktervezés a jelenléti folyamatban**~~ ✅ **(KÉSZ)**

~~**HR-01 · FEJLESZTÉSI IGÉNY**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT (2026-10-09)** – Előzetes Műszaktervező modul és heti naptár implementálva a `/hr/time` útvonalon (`Műszakbeosztás Tervező`, `Távollétek & Csapatnaptár`, `Műszaksablonok`). Műszaksablonok (`hr_muszak_sablon`), beosztások (`hr_muszak_beosztas`), 1-kattintásos gyorsbeosztás, távollét-védelem, heti 48h limit indikátor és terv vs. tény havi jelenléti ív integráció teljesítve (ADR: [A-037](docs/architecture/decisions/A-037-hr-shift-planning-roster-architecture.md), PRD: [P-056](docs/product/decisions/P-056-hr-shift-planning-and-roster-management-ux.md)).

**Kiinduló állapot:** a bemutatás szerint nincs tényleges műszaktervezés, még egyszerű, például nyolcórás műszakokra sem.

* A jelenléti folyamathoz kapcsolódva legyen lehetőség műszakok előzetes megtervezésére.  
* A beosztásért felelős szereplő dolgozóhoz és időszakhoz rendelhető műszakot tudjon kialakítani.  
* A nyolcórás műszak kifejezetten elhangzott példa; a funkció ne kizárólag utólagos jelenlétrögzítést jelentsen.  
* A tervezési funkciót együtt kell értelmezni a munkaidő-ellenőrzésekkel és a már meglévő alkalmassági blokkolással.

**Pontosítandó:** műszaktípusok, ismétlődő beosztások, szünetek, éjszakai vagy átnyúló műszakok, módosítási és jóváhagyási rend. Ezek a megbeszélésben nem szerepeltek.

---

**Elvárt eredmény:** a felelős előre készíthet munkavállalói műszakbeosztást, nem csak a megkezdett munkavégzést rögzítheti. *(Teljesítve)*

### ~~**2.3. Munkaidőkorlátok és éves rendkívüli munkaidő követése**~~ ✅ **(KÉSZ)**

~~**HR-02 · FEJLESZTÉSI IGÉNY**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT (2026-10-10)** – Munka Törvénykönyve szerinti ellenőrzések implementálva: heti 48h munkaidőkorlát figyelése mentéskor és a jelenlétnél, valamint az Mt. 135. § szerinti 250 órás alapkeret és 400 órás önként vállalt túlóra számláló a `/hr/compliance` tabellán és a dolgozói profilokon (ADR: [A-043](docs/architecture/decisions/A-043-hr-working-hours-and-annual-overtime-compliance-architecture.md), PRD: [P-062](docs/product/decisions/P-062-hr-working-hours-and-annual-overtime-compliance-ux.md)).

| Ellenőrzés | Elvárt működési elv | Nem eldöntött részlet |
| :---- | :---- | :---- |
| Heti maximális munkaidő | A rendszer figyelje a dolgozó heti munkaidejét a releváns határhoz képest. A beszélgetésben **heti 48 óra** szerepel példaként. | Tényleges vagy tervezett idő ellenőrzése, számítási időszak, kivételek, valamint figyelmeztetés vagy blokkolás alkalmazása. |
| Éves rendkívüli munkaidő-számláló | A munkavállaló rendkívüli munkaideje éves összesítésben legyen követhető. | Beszámítási szabályok, éves keret, küszöbértékek és riasztási vagy blokkolási viselkedés. |

A 48 órás értéket és az éves rendkívüli munkaidő értelmezését az alkalmazandó foglalkoztatási szabályokkal egyeztetni kell. A megbeszélés nem határoz meg minden munkavállalóra feltétel nélkül alkalmazandó jogi számítási modellt.

### ~~**2.4. Szabadságkiadási megfelelőség és automatikus figyelmeztetések**~~ ✅ **(KÉSZ)**

~~**HR-03 · FEJLESZTÉSI IGÉNY**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT (2026-10-10)** – Az Mt. 122. § (3) szerinti legalább 14 egybefüggő napos mentesülés naptári analízise elkészült (szabadság + heti pihenőnapok lánca, eltérő megállapodás kezelése), továbbá a novemberi maradványszabadság-riasztó sáv és a központi `/hr/compliance` megfelelőségi tábla működik (ADR: [A-038](docs/architecture/decisions/A-038-hr-leave-compliance-architecture.md), PRD: [P-057](docs/product/decisions/P-057-hr-leave-compliance-and-year-end-alerts-ux.md)).

#### **A. Egybefüggő távollét / szabadság ellenőrzése**

* A rendszer kövesse, hogy a munkavállaló az adott naptári évben teljesítette-e a megbeszélésben említett **legalább 14 egybefüggő napra** vonatkozó feltételt.  
* Hiány esetén jelenjen meg figyelmeztetés, hogy a szabadságkiadás rendezhető legyen.  
* A korábban általánosan említett „hány nap egybefüggő szabadság” ötletet ez a konkrétabb ellenőrzés foglalja össze; nem két külön funkcióról van szó.

#### **B. Novemberi, év végi maradványszabadság-riasztás**

1. A rendszer novemberben automatikusan ellenőrzi a fennmaradt szabadságokat.  
2. Az érintett munkavállalóknál jelzi, hogy az év végéig még kiadandó szabadság maradt.  
3. A jelzés célja a szabadság kiadásának időbeni megszervezése.

#### **Pontosítandó szabályok**

* A 14 nap számítása: naptári nap, szabadságnap és egyéb munkavégzés alóli mentesülés figyelembevétele.  
* Az alkalmazandó kivételek és megállapodások kezelése.  
* Az ellenőrzés időpontja, a tervezett és már kivett szabadság eltérő kezelése.  
* A figyelmeztetés címzettje: munkavállaló, vezető, HR vagy ezek együtt.  
* A novemberi riasztás pontos napja, ismétlődése és értesítési csatornája.

---

**Elvárt eredmény:** a szabadságkiadási hiányok ne kizárólag kézi év végi ellenőrzéssel derüljenek ki. Automatikus szabadságkiosztást vagy a dolgozó helyetti foglalást a leirat nem kér. *(Teljesítve)*

### ~~**2.5. Munkavédelmi és tűzvédelmi oktatások lejárati nyilvántartása**~~ ✅ **(KÉSZ)**

~~**HR-04 · FEJLESZTÉSI IGÉNYAZ ÉRVÉNYESSÉGI ADATOK MÁR LÉTEZNEK**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT (2026-10-10)** – A `/hr/compliance` felületen létrejött a munkavédelmi és tűzvédelmi központi oktatási mátrix (30 napos lejárati figyelmeztetés, lejárt állapotok, azonnali iktatott jegyzőkönyv megtekintés és CSV export), a dolgozói profilon pedig a dedikált lejárati kártya (ADR: [A-039](docs/architecture/decisions/A-039-hr-safety-training-compliance-architecture.md), PRD: [P-058](docs/product/decisions/P-058-hr-safety-training-compliance-matrix-ux.md)).

**Kiinduló állapot:** a rendszer már nyilvántartja, meddig érvényes egy adott oktatás, de az adat csak az érintett személy részletes nézetében érhető el.

* Készüljön önálló, áttekinthető nyilvántartás a munkavédelmi és tűzvédelmi oktatásokról, illetve az ezekhez tartozó jegyzőkönyvek érvényességéről.  
* A felelősnek ne kelljen minden dolgozó részletes adatlapját külön megnyitnia az érvényességi helyzet áttekintéséhez.  
* A nyilvántartásból legyen azonosítható az érintett dolgozó, az oktatás típusa és az érvényességi vagy lejárati idő.  
* A fejlesztés a meglévő adatok összesített használatára épüljön, ne egy második, párhuzamos kézi adatnyilvántartást igényeljen.

**Pontosítandó:** lejárat előtti automatikus értesítések, címzettek, előjelzési idő és a jegyzőkönyvek dokumentumkapcsolatai. A leirat ezekre nem ad részletes követelményt; a konkrétan kért bővítés az áttekintő lejárati nyilvántartás.

### ~~**2.6. Alkalmasság miatti műszak- és bejelentkezési blokkolás**~~ ✅ **(KÉSZ)**

~~**HR-05 · MÁR MEGLÉVŐ KONTROLL**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT / ÖSSZEHANGOLVA (2026-10-10)** – Az Mvt. 49. § (1) szerinti orvosi alkalmasság kemény blokkolása kiterjesztve: lejárt vizsgálat esetén sem a bejelentkezés (check-in), sem az előzetes műszaktervezőben történő beosztás nem engedélyezett; orvosi felülbírálat esetén szigorú audit naplózás készül (ADR: [A-040](docs/architecture/decisions/A-040-hr-medical-fitness-shift-blocking-architecture.md), PRD: [P-059](docs/product/decisions/P-059-hr-medical-fitness-shift-blocking-ux.md)).

A „műszakbeosztás blokkoló figyelmeztetés” ötletre Dani azt jelzi, hogy a kapcsolódó védelem már működik:

* Lejárt alkalmasság esetén a munkavállaló **nem nyithat műszakot**.  
* Ugyanebben az esetben **nem csekkolhat be**.

**Határ:** a leirat sérült szava alapján itt alkalmassági érvényességről van szó. Nem bizonyított, hogy a blokkolás minden oktatási lejáratra is vonatkozik. A műszaknyitási és bejelentkezési tilalomból nem következik automatikusan, hogy a még bevezetendő előzetes műszaktervezés is blokkolt; ezt a HR-01 megvalósításakor külön tisztázni kell. *(Összehangolva és megoldva)*

### ~~**2.7. Offboarding: kötelező kilépőigazolások és EaisyDOCS-iktatás**~~ ✅ **(KÉSZ)**

~~**HR-06 · FEJLESZTÉSI IGÉNY**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT (2026-10-10)** – Az offboarding folyamat keretében a kötelező hatósági kilépőigazolások (Adatlap bírósági végrehajtói letiltáshoz, Igazolólap álláskeresési járadékhoz, Munkáltatói igazolás, TB igazolvány kivonat) automatikusan legenerálhatók és egy kattintással az EaisyDOCS iratkezelőbe iktathatók a dolgozó személyi dossziéjába (ADR: [A-041](docs/architecture/decisions/A-041-hr-offboarding-certificate-issuance-architecture.md), PRD: [P-060](docs/product/decisions/P-060-hr-offboarding-certificates-and-docs-filing-ux.md)).

**Cél:** a munkavállaló kiléptetésének részeként a kötelező kilépőigazolások kezelése is jelenjen meg a folyamatban, és az elkészült dokumentumok az EaisyDOCS-ban legyenek iktatva.

#### **Folyamat**

1. A HR-ügyintéző elindítja vagy végigviszi az offboardingot.  
2. A kiléptetési folyamat tartalmazza a kiadandó kilépőigazolások kezelését.  
3. A leiratban példaként szerepel a munkanélküli, illetve álláskeresési ellátáshoz szükséges igazolás.  
4. A folyamat minden releváns kiléptetésnél biztosítsa a kötelező dokumentumok kezelését; ezek ne maradjanak a rendszerfolyamaton kívüli teendők.  
5. Az elkészült igazolások a kiléptetéshez kapcsolódva kerüljenek iktatásra az EaisyDOCS-ban.

#### **Modulok közötti felelősség**

* **EaisyHR:** a munkavállalóhoz és a kilépési eseményhez kapcsolódó dokumentumfolyamat kezelése.  
* **EaisyDOCS:** a kiadott igazolások iktatása és iratkezelése.

**Pontosítandó:** a kötelező igazolások teljes, aktuális listája; a rendszer által generált és a kívülről feltöltött dokumentumok köre; adattartalom és sablonok; kiadási és jóváhagyási műveletek; az iktatás automatikus indításának pontos eseménye. A leirat a teljes dokumentumlistát és a generálás módját nem sorolja fel.

---

**Elvárt eredmény:** a kilépőigazolások az offboarding részeként kezelhetők, és dokumentált kapcsolatuk van az EaisyDOCS-ba iktatott iratokkal. *(Megvalósítva)*

### ~~**2.8. Ütemezett bérpapír-előállítás és digitális átvételi nyugtázás**~~ ✅ **(KÉSZ)**

~~**HR-07 · FEJLESZTÉSI IGÉNY**~~  
**ÁLLAPOT:** ✅ **ELKÉSZÜLT (2026-10-10)** – Havi bérpapír-előállítás és ütemezett generálás megvalósítva előzetes bérszerkesztéssel (`/hr/payroll`), a dolgozói profilon (`/hr/employee/[id]?tab=payslips`) pedig az Mt. 155. § szerinti digitális átvételi nyugtázás (átvétel időbélyeggel és IP-címmel, PDF megtekintéssel és letöltéssel) működik (ADR: [A-042](docs/architecture/decisions/A-042-hr-scheduled-payslip-generation-and-acknowledgement-architecture.md), PRD: [P-061](docs/product/decisions/P-061-hr-scheduled-payslip-generation-and-acknowledgement-ux.md)).

**Kiinduló állapot:** a bemutatás szerint a rendszer jelenleg még nem állít elő bérpapírt. Az átvételi nyugtázás ezért az előállítási folyamat kialakításától is függ.

#### **A. Bérpapír előállítása**

* Legyen rendszeres, ütemezett bérpapír-generálási lehetőség.  
* A beszélgetésben a hónap **10\. napja** szerepel példaként, nem véglegesen rögzített kötelező dátumként.  
* Az ütemezés, illetve a kapcsolódó működés beállíthatósága külön javaslatként elhangzik.  
* Az elkészült bérpapír a megfelelő munkavállaló számára legyen átvehető a digitális folyamatban.

#### **B. Digitális átvétel-nyugtázás**

1. A munkavállaló hozzáfér a részére elkészített bérpapírhoz.  
2. Kifejezett digitális művelettel visszaigazolja annak átvételét.  
3. A rendszer megkülönböztethetővé teszi, hogy az adott bérpapír átvételét nyugtázták-e.

A nyugtázás célja az **átvétel visszaigazolása**. Nem azonos a dokumentum tartalmának elfogadásával, és a leirat nem ír elő hozzá minősített elektronikus aláírást.

#### **Pontosítandó működési részletek**

* A bérpapír adatforrása: mely modul vagy külső bérszámfejtési folyamat biztosítja a szükséges adatokat.  
* A dokumentum tartalma, sablonja, időszaka és esetleges jóváhagyása.  
* Az előállítás pontos havi időzítése, valamint a hiányos béradatok miatti elhalasztás kezelése.  
* Az átvételi művelet és a visszaigazolás megtekintésére jogosult szereplők.  
* Az át nem vett bérpapírok miatti értesítések vagy emlékeztetők; ezek külön nem hangzottak el.  
* EaisyDOCS-iktatás: a beszélgetés ezt kifejezetten a kilépőigazolásoknál kéri, a bérpapíroknál nem. Ezért a bérpapír automatikus iktatása itt nem tekinthető elfogadott követelménynek.

---

**Elvárt eredmény:** az előállított bérpapírhoz a munkavállaló digitális átvételi visszajelzést adhat, a készítés időpontja pedig a kialakítandó beállítások szerint vezérelhető. *(Megvalósítva)*

### ~~**2.9. HR-függőségek és véglegesítendő döntések**~~ ✅ **(KÉSZ / DÖNTVE)**

| Kapcsolat | Funkcionális jelentőség | Státusz / Meghozott döntés |
| :---- | :---- | :---- |
| Műszaktervezés ↔ munkaidőfigyelés | Meg kell határozni, hogy a korlátvizsgálat tervezéskor, tényleges teljesítéskor vagy mindkét ponton történik. | ✅ **Megoldva:** Mindkét ponton ellenőrzött (tervezéskor 48h limit indikátor, jelenlétnél heti/éves Mt. túlóra számítás). |
| Műszaktervezés ↔ alkalmasság | A már működő műszaknyitási és bejelentkezési tilalom mellett külön döntést igényel az előzetes beosztásra gyakorolt hatás. | ✅ **Megoldva:** Kemény blokkolás műszak hozzárendeléskor és bejelentkezéskor egyaránt (Mvt. 49. § (1)). |
| Szabadságadatok ↔ automatikus figyelmeztetések | A 14 napos ellenőrzés és a novemberi maradványszabadság-riasztás csak a számítási és címzetti szabályok pontosítása után véglegesíthető. | ✅ **Megoldva:** Naptári pihenőlánc kalkuláció és automatikus novemberi vezetői/HR figyelmeztető banner implementálva. |
| Oktatási részadatok ↔ lejárati áttekintő | A meglévő érvényességi adatok összesített megjelenítését kell kialakítani; külön új adatgyűjtési kötelezettség nem hangzott el. | ✅ **Megoldva:** `/hr/compliance` központi oktatási lejárati mátrix és dolgozói profilon lejárati kártya beépítve. |
| Offboarding ↔ EaisyDOCS | A kilépőigazolások iktatása a kifejezetten megnevezett HR–dokumentumkezelési integráció. | ✅ **Megoldva:** Kötelező hatósági igazolások generálása és 1-kattintásos EaisyDOCS személyi dossziéba iktatás megvalósítva. |
| Béradatok ↔ generálás ↔ átvétel | A digitális nyugtázás előfeltétele a munkavállalóhoz rendelt bérpapír rendelkezésre állása; a béradatok forrása még tisztázandó. | ✅ **Megoldva:** Béradat-szerkesztés és ütemezett bérpapír-generálás a `/hr/payroll`-on, Mt. 155. § digitális átvételi nyugtázás a dolgozói profilon. |

A megbeszélés végén a felek a felvetésekből külön fejlesztési feladatok létrehozását helyezik kilátásba. A javasolt EaisyHR feladatok mindegyike (HR-01 – HR-07, valamint a többcég-kezelés és szigorú GDPR izoláció) kifejlesztésre került és dokumentálva van.