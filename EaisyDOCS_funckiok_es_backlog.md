# **EaisyDOCS**

**Elektronikus iratkezelő és iratmegőrző webes alkalmazás**

Jelenlegi működés összefoglalója és a bemutató második részében elhangzott továbbfejlesztési javaslatok funkcionális specifikációja.

A dokumentum kizárólag működési elveket, szerepköröket, folyamatokat, adatkapcsolatokat és funkcionális elvárásokat rögzít. Technológiai megvalósítási részleteket nem határoz meg.

## **Tartalom**

> 1. ---

>    [Vezetői összefoglaló](#bookmark=id.jrkzdmeranvw)  
> 2. [A jelenlegi EaisyDOCS működése](#bookmark=id.mtnawjzy8ve)  
> 3. [Jelenlegi szerepkörök és jogosultságok](#bookmark=id.ubiyel211vr3)  
> 4. [Jelenlegi iratkezelési életciklus](#bookmark=id.jz64q18q0gn2)  
> 5. [Funkcionális specifikáció – továbbfejlesztési javaslatok](#bookmark=id.3z55yo85txu5)  
> 6. [Integrációs alapelvek](#bookmark=id.dw99x45n7zf6)  
> 7. [Keresztfunkcionális és megfelelőségi elvek](#bookmark=id.855ll4x2k79i)  
> 8. [Nyitott kérdések és pontosítandó üzleti szabályok](#bookmark=id.j5k9qk9vz6rw)

## **1\. Vezetői összefoglaló**

---

Az EaisyDOCS egy böngészőből elérhető, elektronikus iratkezelő és iratmegőrző rendszer. Feladata, hogy a vállalkozáshoz érkező vagy a felhasználók által feltöltött iratokat – például számlákat, szerződéseket, szállítóleveleket, CMR-eket, nyilatkozatokat vagy más bizonylatokat – érkeztessen, iktasson, rendszerezzen, feladathoz és felelőshöz rendeljen, majd a lezárt ügyiratokat szabályozott módon irattárban őrizze.

A rendszer jelenlegi fő értéke az elektronikus dokumentumok központi, kereshető, jogosultságvezérelt kezelése. A megoldás képes e-mailből, kézi feltöltésből, szkennelt kötegelt állományból, valamint az EasyBill rendszerből érkező számlákból iratot létrehozni.

A bemutató alapján a rendszer jelenlegi állapotában már tartalmazza az iratkezelés alapfolyamatát, az AI-alapú adatkinyerést, a szervezeti és személyi jogosultságkezelést, a fizikai iratmozgás nyilvántartását, az irattározást, a selejtezést, a partnernyilvántartást, a keresést, az értesítéseket és az auditálási funkciókat.

A termékfejlesztési javaslatok célja, hogy az EaisyDOCS ne önálló, elszigetelt irattár legyen, hanem az ERP-ökoszisztéma közös dokumentumkezelési rétege. Ennek fő elemei a partner­törzs és a multitenancia bevezetése, az EasyBill, EasyWare, HR-, EasyBooks-, EasyWork modulokkal kialakított kapcsolat, továbbá az AI-alapú szerződés- és teljesítésigazolás-generálás.

### **1.1. Funkciók kategóriák szerint**

| Kategória | Jelenlegi funkciók | Tervezett bővítések   |
| :---- | :---- | :---- |
| Érkeztetés és iktatás | E-mail-figyelés, kézi feltöltés, partner kiválasztása, érkezési csatorna, biztonsági minősítés, iktatás vagy „nem iktatandó” jelölés. | Egységes bizonylattípusok, partner- és modulalapú automatikus hozzárendelés, tömeges és integrált iktatás. |
| AI és automatizáció | PDF-adatok felismerése, mezőkitöltési javaslat, partner- és előzményirat-felismerés. | Szerződés- és teljesítésigazolás-generálás sablonból, intelligens egyeztetés, automatikus dokumentumkapcsolatok. |
| Iratkezelés | Ügyiratok, előzmények, csatolások, határidő, felelős, feladatok, belső megjegyzések, válaszlevelek, státuszok. | Modulok közötti, partnerhez és bizonylathoz kötött dokumentumkapcsolati háló. |
| Jogosultságok | Szervezeti egység, biztonsági minősítés, explicit megosztás, szerepkörök, kétlépcsős azonosítás. | Tenant- és ügyfélalapú elszigetelés, könyvelőirodai többcég-kezelés. |
| Archiválás | PDF/A-másolat készítése háttérfolyamatban, fizikai hely, kölcsönzés, irattár, megőrzési idő, selejtezési javaslat és jóváhagyás. | Integrált dokumentum-életciklus valamennyi kapcsolódó ERP-modulban. |
| Keresés és riportok | Összetett keresés, mentett keresések, találati értesítés. | Dashboard, bizonylattípus-, partner-, szállító- és vevőalapú statisztikák. |

## **2\. A jelenlegi EaisyDOCS működése**

### ---

2.1. Bejövő iratok figyelése és érkeztetése **jelenlegi funkció**

* A rendszer egy dedikált e-mail-címet folyamatosan figyel.  
* Az erre a címre érkező levélhez csatolt dokumentum vagy ügyirat feldolgozható és érkeztethető.  
* Felhasználó által is indítható új érkeztetés.  
* Az új irat érkeztetése során megadható:  
  * az irat tárgya vagy megnevezése;  
  * a partner;  
  * a feltöltendő fájl;  
  * az érkezés csatornája, például személyes vagy e-mailes érkezés;  
  * a biztonsági minősítés;  
  * későbbi feldolgozási határidő.  
* A partner mezőben a már ismert partnerek kereshetők és kiválaszthatók.  
* Az irat érkeztetése után az ügyirat kezdetben érkeztetett állapotban jelenik meg.

### 

2.2. Iktatás vagy „nem iktatandó” kezelés **jelenlegi funkció**

Az érkeztetett dokumentum két fő irányba kezelhető:

* **Nem iktatandó:** reklám, spam, kéretlen üzenet, tévesen feltöltött vagy iratkezelést nem igénylő dokumentum esetén.  
* **Iktatás:** ha a dokumentum hivatalos ügyiratként, számlaként, szerződésként vagy egyéb megőrzendő iratként kezelendő.

A folyamat később kiegészíthető automatikus e-mail-szűréssel, amely a vélhetően nem iktatandó üzeneteket előzetesen kiszűri.

### 

2.3. AI-alapú PDF-feldolgozás és adatkinyerés **jelenlegi funkció**

Az iktatás során a rendszer betölti a feltöltött PDF-et, majd az **AI kitöltés** funkció a dokumentum tartalma alapján megkísérli az adatmezők kitöltését.

A felismerés által érintett adatok lehetnek többek között:

* iktatási vagy bizonylattípus;  
* szervezeti egység;  
* küldő vagy partner;  
* partner adószáma;  
* hivatkozott szám, bizonylatszám vagy sorszám;  
* előzményügyirat;  
* egyéb, a PDF-ből felismerhető metaadatok.

Az AI eredménye **javaslat**, nem automatikusan véglegesített adat. Az ügyintézőnek vagy az iktatónak ellenőriznie és szükség esetén módosítania kell a kitöltést.

A rendszer hasonló vagy kapcsolódó korábbi iratot is javasolhat. A felhasználó dönthet úgy, hogy:

* a dokumentumot meglévő ügyirathoz csatolja;  
* új ügyiratot nyit;  
* az előzménykapcsolatot elutasítja vagy módosítja.

**Adóazonosító-kezelési pontosítás:** a bemutató alapján az AI-nak meg kell különböztetnie a magyarországi, normál formátumú adószámot és a külföldi adóazonosítókat. A magyar partner esetén a magyar adószámot kell elsődlegesen használni; a külföldi adóazonosító külön mezőben kezelendő.

### 

2.4. Határidő és ügyirat-továbbítás **jelenlegi funkció**

* Az iktatáskor határidő adható meg.  
* A határidőhöz kapcsolódóan az ügyirat további feldolgozásra továbbítható.  
* A továbbított ügyirat eltűnik az aktuális érkeztetési nézetből, és az iktatókönyvben, illetve a felelős feladatai között válik kezelhetővé.

### 

2.5. Kötegelt érkeztetés és automatikus szétválasztás **elvárt funkció** **bemutatóban hibásan működött**

A kötegelt érkeztetés célja, hogy több iratot – például tíz számlát – ne kelljen egyenként szkennelni és feltölteni.

1. A szkennelés során egy számla után elválasztólap kerül.  
2. Ezután következik a következő számla, majd ismét elválasztólap.  
3. A teljes köteg egyetlen PDF-fájlként kerül feltöltésre.  
4. A rendszer felismeri az elválasztólapokat.  
5. A köteget az elválasztók mentén különálló dokumentumokra bontja.  
6. Az egyes dokumentumok külön érkeztetési számot és önálló feldolgozási folyamatot kapnak.

A felvétel során a funkció demókörnyezetben nem működött, miközben elhangzott, hogy lokális tesztben működőképes volt. Ezért a fejlesztés során a kötegfeldolgozást külön tesztelni és stabilizálni szükséges.

### 

2.6. Érkeztetési szám, előzmények, csatolmányok és eseménynapló **jelenlegi funkció**

* Az érkeztetési számra kattintva megnyitható az ügyirat adatlapja.  
* A rendszer előzményügyiratot jelenít meg, ha talál kapcsolódó dokumentumot.  
* Megtekinthetők a kapcsolatok és az ügyirat eseménynaplója.  
* A napló rögzíti többek között a PDF megtekintését, az érkeztetést, a fizikai hely módosítását, a kölcsönzést és az állapotváltozásokat.

### 

2.7. EasyBill-számlák importálása **jelenlegi funkció**

* Az EasyBillben elérhető számlák megjeleníthetők az EaisyDOCS importfelületén.  
* Az importálás előtt a felhasználó megtekintheti a számla adatait és dokumentumát.  
* A felhasználó kiválaszthatja az importálandó számlát.  
* Az importálás után a számla az EaisyDOCS-ban ugyanúgy kezelhető, mint a kézzel feltöltött irat.  
* Az importált számlán is használható az AI-kitöltés.  
* A rendszernek fel kell ismernie többek között a partner adószámát, a számlasorszámot vagy hivatkozott számot, valamint az egyéb elérhető számlaadatokat.

### 

2.8. Iktatókönyv és ügyiratáttekintés **jelenlegi funkció**

Az iktatókönyvben az iratok áttekinthetők és tovább kezelhetők. Az áttekintésen megjelenhet:

* felelős;  
* határidő;  
* szervezeti egység;  
* biztonsági minősítés;  
* iktatási vagy érkeztetési adatok;  
* aktuális állapot;  
* maga a dokumentum, jellemzően PDF formátumban;  
* kapcsolódó ügyiratok és csatolmányok;  
* eseménynapló.

### 

2.9. PDF/A-megőrzési másolat **háttérfolyamat**

A rendszer háttérben futó worker-folyamat segítségével a feltöltött ügyiratból PDF/A-formátumú megőrzési másolatot készít.

* A PDF/A előállítása nem feltétlenül azonnali, háttérben történik.  
* A folyamat állapota „folyamatban” jellegű státusszal megjeleníthető.  
* A felhasználó megtekintheti az eredeti PDF-et és a megőrzési változatot.

### 

2.10. Felelős, szervezeti egység és explicit megosztás **jelenlegi funkció**

* Az ügyirathoz felelős munkatárs rendelhető.  
* A felelős kiválasztása a szervezeti és jogosultsági szabályok szerint korlátozható.  
* Például pénzügyi dokumentumhoz alapértelmezés szerint pénzügyi szervezeti egységhez tartozó felhasználó rendelhető.  
* Más szervezeti egységhez tartozó személy explicit megosztással rendelhető hozzá, amennyiben erre jogosultság van.  
* Az explicit megosztás nem változtatja meg automatikusan a dokumentum eredeti szervezeti besorolását, hanem célzott hozzáférést biztosít.

### 

2.11. Fizikai hely és iratkölcsönzés **jelenlegi funkció**

* Az irathoz fizikai tárolási hely rögzíthető, például iroda, polc, doboz, év vagy bejövő irattári egység.  
* Rögzíthető, ha az iratot valaki elvitte vagy kikölcsönözte.  
* Megadható a kölcsönző személye.  
* Megadható a várható visszahozatali dátum.  
* A módosítás bekerül az eseménynaplóba.  
* A rendszer jelölheti, hogy az irat aktuálisan helyben van, kölcsönözve van vagy késedelmesen nincs visszahozva.

### 

2.12. Feladatok és belső együttműködés **részben kész**

* Az ügyirathoz manuálisan feladat rendelhető.  
* A feladathoz felelős munkatárs választható.  
* A feladat állapota és elvégzése az ügyirat folyamatának része.  
* Belső megjegyzés rögzíthető.  
* Munkatársak „@” megjelöléssel bevonhatók az ügyirat belső kommunikációjába.  
* A megjelölt munkatárs értesítést kaphat.  
* Az ügyirathoz belső üzenőfal tartozik.  
* Válaszlevél vagy válaszdokumentum feltölthető, ha az ügyirat feldolgozása választ igényel.

A felvétel alapján a feladatkezelés üzleti tartalma még nincs teljesen meghatározva. A fejlesztéshez feladatkatalógus, feladatállapotok, határidőszabályok és felelősségi szabályok rögzítése szükséges.

### 

2.13. Külső kapcsolatok **felület létezik** **integráció nélkül nem aktív**

A külső kapcsolatok felületén az ügyirathoz kapcsolódó más rendszerbeli vagy másik ügyiratbeli dokumentumok jeleníthetők meg. A bemutató időpontjában az ERP- és CRM-kapcsolat még nem állt rendelkezésre, ezért a funkció tényleges adatot nem szolgáltatott.

### 

2.14. Ügyirat lezárása és irattárba helyezése **jelenlegi funkció**

1. Az ügyirat feldolgozása során a feladatokat el kell végezni.  
2. Ha nincs további teendő, az ügyirat lezárható.  
3. A lezárt ügyirat irattárba kerül.  
4. Az irattári állapot megjelenik az ügyirat adatlapján.

### 

2.15. Megőrzési idő és irattár **jelenlegi funkció**

* Az egyes irattípusokhoz megőrzési idő tartozik.  
* A bemutatóban példaként többek között 5, 6 és 8 éves megőrzési idők szerepeltek.  
* A megőrzési idő a beállításokban módosítható.  
* A megőrzési idő lejárta alapján az irat selejtezhetővé válhat.  
* Tesztelési célból elérhető egy lejárat-generáló funkció, amely a lejárati dátumot a jelenlegi dátumra állítja.

### 

2.16. Selejtezés és négyszem-elv **jelenlegi funkció**

A selejtezés nem egyszerű törlésként működik, hanem jóváhagyási folyamatként:

1. Az arra jogosult munkatárs selejtezési javaslatot készít.  
2. A javaslatot nem hagyhatja jóvá ugyanaz a személy, aki azt létrehozta.  
3. Egy másik, jellemzően vezetői jogosultságú felhasználó felülvizsgálja a javaslatot.  
4. Jóváhagyás után az irat selejtezett állapotba kerül.  
5. A rendszer selejtezési jegyzőkönyvet készít.  
6. A jegyzőkönyv alapján az irat megsemmisíthető.

A bemutató során a selejtezhető állapot és az irattári állapot közötti átmenetben technikai vagy állapotmodellbeli eltérés jelentkezett. A végleges állapotgépet egyértelműen meg kell határozni.

### 

2.17. Partnerkezelés **jelenlegi funkció**

* Partner automatikusan létrejöhet az első hozzá kapcsolt irat iktatásakor.  
* A rendszernek nem szabad ugyanazon partnerből indokolatlan duplikátumot létrehoznia.  
* A partnerhez kezelhető adatok:  
  * név;  
  * adószám;  
  * e-mail-cím;  
  * telefonszám;  
  * cégjegyzékszám;  
  * székhely;  
  * kapcsolódó iratok.  
* A partner adatlapján megtekinthetők az adott partnerhez tartozó ügyiratok.

### 

2.18. Keresés, mentett keresések és alert **jelenlegi funkció**

* A rendszerben keresés indítható az iratok és metaadatok között.  
* A keresési feltételek elmenthetők.  
* A mentett kereséshez alert kapcsolható.  
* Új, a keresési feltételeknek megfelelő találat esetén a rendszer értesítést jeleníthet meg a felületen.  
* A keresőfelület jelenleg sok szűrőt egyetlen oldalon kezel; a felhasználói felület későbbi átszervezése indokolt.

### 

2.19. Beállítások, értesítések és biztonság **jelenlegi funkció**

* Csapat- és felhasználókezelés.  
* Szervezeti egységek létrehozása és kezelése.  
* Megőrzési idők karbantartása.  
* Auditálási tevékenységek megtekintése jogosultság szerint.  
* Értesítési csatornák: e-mail és SMS, valamint rendszerbeli értesítés.  
* Értesítés kérhető például:  
  * lejáró határidőről;  
  * lejárt érkeztetési vagy feldolgozási időről;  
  * közelgő határidőről;  
  * új szignálásról;  
  * állapotváltozásról.  
* Az értesítési kiküldési napló rögzíti, hogy mikor, milyen címzetthez és milyen csatornán történt küldés.  
* Kétlépcsős azonosítás.  
* IT-biztonsági szabályzat és tájékoztató felület.

## **3\. Szerepkörök és jogosultságok**

---

| Szerepkör | Fő jogosultságok és feladatok | Korlátozások   |
| :---- | :---- | :---- |
| **Superadmin** | Teljes rendszerhozzáférés, felhasználók, szerepkörök, szervezeti egységek, beállítások és adatok kezelése. | Üzleti folyamatokban is teljes hozzáférés; használata korlátozott és auditált legyen. |
| **Rendszergazda** | Rendszer- és konfigurációs feladatok, megőrzési idők, auditálási tevékenységek megtekintése. | Nem feltétlenül lát minden üzleti iratot és minden rendszerfunkciót. |
| **Iratkezelő / iktató** | Bejövő iratok kezelése, érkeztetés, AI-javaslat ellenőrzése, iktatás, iktatókönyvi adatok karbantartása, iratok továbbítása. | Az iratkezelési és iktatási feladatokra fókuszál. |
| **Ügyintéző** | Az iktatott iratokhoz kapcsolódó feladatok végrehajtása, megjegyzések, belső kommunikáció, válaszlevelek és dokumentumok kezelése. | Nem indíthat új iktatást, illetve a jogosultságán kívüli iratokat nem láthatja. |
| **Betekintő** | Iratok és adatok megtekintése. | Nem iktathat, nem módosíthat, nem szignálhat és nem hajthat végre üzleti műveletet. |
| **Auditor** | A bemutató alapján a betekintőhöz hasonlóan megtekintési jogosultság. | Nem módosíthat és nem végezhet iratkezelési műveletet. A betekintő és auditor közötti tényleges különbséget véglegesíteni kell. |
| **Vezető** | Szervezeti egységhez kapcsolódó felhasználói és üzleti feladatok, többek között selejtezési javaslatok jóváhagyása. | Csak saját szervezeti egységére vagy kijelölt hatáskörére terjed ki. |

### 

3.1. Jogosultsági alapelvek

* A hozzáférés szerepkör, szervezeti egység, biztonsági minősítés és tenant alapján korlátozandó.  
* A „nyílt” iratot a jogosult rendszerfelhasználók láthatják.  
* A „bizalmas” irat csak megfelelő minősítéssel rendelkező felhasználónak jelenik meg.  
* A jogosulatlan felhasználó az irat puszta létezését se lássa.  
* Az explicit megosztás célzott kivételt biztosíthat, de minden ilyen műveletet naplózni kell.  
* A selejtezésnél a javaslattevő és a jóváhagyó személye kötelezően különböző.

## **4\. Jelenlegi iratkezelési életciklus**

---

1. **Érkezés:** e-mail, kézi feltöltés, szkennelés vagy EasyBill-import.  
2. **Érkeztetés:** tárgy, partner, csatorna, minősítés és dokumentum rögzítése.  
3. **Előszűrés:** iktatandó vagy nem iktatandó minősítés.  
4. **AI-feldolgozás:** PDF-adatok és lehetséges előzményirat felismerése.  
5. **Ellenőrzés:** a javasolt adatok felhasználói felülvizsgálata.  
6. **Iktatás:** iktatókönyvi bejegyzés, szervezeti egység, felelős és határidő megadása.  
7. **Feldolgozás:** feladatok végrehajtása, megjegyzések, belső együttműködés és válaszlevelek.  
8. **Megőrzési példány:** PDF/A-másolat előállítása háttérfolyamatban.  
9. **Fizikai nyilvántartás:** tárolási hely és kölcsönzés rögzítése, ha releváns.  
10. **Lezárás:** valamennyi feladat teljesítése után.  
11. **Irattározás:** megőrzési idő és irattári státusz alkalmazása.  
12. **Selejtezés:** lejárat után javaslat, független jóváhagyás, jegyzőkönyv, majd megsemmisítés.

## **5\. Funkcionális specifikáció – továbbfejlesztési javaslatok**

---

A következő almodulok a prezentáció második részében elhangzott javaslatokat tartalmazzák. Ahol a javaslat üzleti irányként, nem pedig végleges részletszabályként hangzott el, ezt külön jelöljük.

### 

5.1. Partner­törzs és központi partneradat-kezelés

**Cél:** az EaisyDOCS saját, integrált partner­törzzsel rendelkezzen, amely nem kizárólag az első iktatáskor automatikusan létrehozott partnerrekordokra épül.

#### **Funkcionális követelmények**

* A partner­törzs az EasyBillből vagy más alapmodulból átvehető legyen.  
* Az átvétel legyen kezdetben tömeges importtal, később szinkronizált adatkapcsolattal is megoldható.  
* A rendszer azonosító adatok alapján akadályozza meg a duplikált partnerrekordok létrejöttét.  
* A partnerhez valamennyi kapcsolódó irat, számla, szerződés, szállítólevél, CMR, nyilatkozat és egyéb dokumentum kapcsolható legyen.  
* A partner adatlapjáról közvetlenül megnyithatók legyenek a kapcsolódó dokumentumok.  
* A partner törzsadatainak forrása jelölhető legyen: EaisyDOCS, EasyBill vagy más modul.  
* Meghatározható legyen, hogy egy adat melyik rendszerben az elsődleges és melyik rendszerben csak olvasható.  
* Partneradat-változás naplózandó legyen.

#### **Javasolt partneradatok**

* partnerazonosító;  
* név és rövid név;  
* magyar vagy külföldi adószám;  
* cégjegyzékszám;  
* székhely és levelezési cím;  
* e-mail-cím és telefonszám;  
* partner típusa: vevő, szállító, egyéb;  
* kapcsolattartók;  
* kapcsolódó tenant vagy vállalkozás;  
* aktív/inaktív státusz.

### 

5.2. Multitenancia és többcég-kezelés

**Cél:** több vállalkozás vagy ügyfél dokumentumainak kezelése egy közös rendszerben úgy, hogy az adatok és jogosultságok egymástól elkülönüljenek.

#### **Üzleti példa**

Egy könyvelőiroda több céget kezel. A könyvelőiroda felhasználója több ügyfélhez férhet hozzá, míg az egyes ügyfélcégek felhasználói kizárólag a saját cégük adatait és dokumentumait láthatják.

#### **Funkcionális követelmények**

* A rendszerben legyen önálló tenant vagy vállalkozási környezet.  
* Minden dokumentum, partner, feladat, szervezet és felhasználói kapcsolat egyértelműen tenanthez tartozzon.  
* A felhasználóhoz több tenant-hozzáférés rendelhető legyen.  
* Belépés után a felhasználó választhasson a számára engedélyezett vállalkozások között.  
* Az aktuális tenant minden képernyőn és műveletben egyértelműen látható legyen.  
* Az egyik tenant adatai ne jelenjenek meg a másik tenant keresési, listázási, jelentési vagy értesítési eredményeiben.  
* A tenant-admin csak saját tenantjának felhasználóit, szerepköreit és adatait kezelhesse.  
* Központi vagy szolgáltatói adminisztrátor több tenantot kezelhessen, de minden művelete auditálva legyen.  
* A jogosultságok legalább tenant-, szervezeti egység-, szerepkör- és dokumentumminősítés-szinten működjenek.  
* Az ügyfélcég felhasználója kizárólag saját dokumentumait és a számára explicit módon megosztott iratokat lássa.

#### **Szerepkörök**

* **Szolgáltatói adminisztrátor:** több tenant kezelése.  
* **Könyvelőirodai vagy szolgáltatói felhasználó:** több ügyfél-tenanthez rendelt jogosultság.  
* **Ügyfélcég adminisztrátora:** saját tenant felhasználóinak és adatainak kezelése.  
* **Ügyfélcég munkatársa:** korlátozott hozzáférés saját cég dokumentumaihoz.  
* **Tenanthez kötött iratkezelő:** csak kijelölt tenantok iratainak iktatása.

### 

5.3. EasyBill-integráció bővítése

**Cél:** az EasyBill ne csak számlaforrás legyen, hanem az EaisyDOCS partner- és dokumentumkapcsolati ökoszisztémájának egyik alapja.

* EasyBill partner­törzs átvétele vagy szinkronizálása.  
* EasyBillből érkező számla automatikus EaisyDOCS-iktatása vagy iktatási feladatként történő átadása.  
* A számlához tartozó partner, szerződés, teljesítésigazolás és egyéb dokumentumok megjelenítése.  
* Az EasyBill partneradatlapjáról az adott partner EaisyDOCS-ban található szerződései és iratai megnyithatók legyenek.  
* Az EasyBill számlaadatlapjáról a kapcsolódó EaisyDOCS-dokumentumok közvetlenül elérhetők legyenek.  
* Az importált dokumentumon az EaisyDOCS AI-adatkinyerése és kapcsolati javaslata működjön.  
* Az ismételt importálás ne hozzon létre duplikált iratot, vagy a rendszer jelezze az ütközést.

### 

5.4. Szállítmányozási dokumentumkezelés és számla–CMR egyeztetés

**Cél:** a szállítmányozó vállalkozásoknál a számlák mellett a fuvarlevelek és CMR-dokumentumok strukturált kezelése, valamint az ezek közötti egyezőség ellenőrzése.

#### **Kezelendő dokumentumtípusok**

* szállítói és vevői számlák;  
* CMR-ek;  
* fuvarlevelek;  
* egyéb szállítmányozási bizonylatok;  
* kapcsolódó szerződések és teljesítésigazolások.

#### **Funkcionális működés**

1. A számla és a hozzá tartozó CMR/fuvarlevél külön vagy együtt bekerül az EaisyDOCS-ba.  
2. A rendszer a dokumentumokat partner, fuvar, bizonylatszám, dátum, összeg, útvonal vagy más azonosító alapján kapcsolatba hozza.  
3. Az AI kiolvassa az egyeztetéshez szükséges adatokat.  
4. A rendszer összehasonlítja a számlán és a CMR-en szereplő releváns adatokat.  
5. Az egyező dokumentumok „egyeztetett” állapotot kaphatnak.  
6. Eltérés esetén a rendszer „eltérés”, „vizsgálatra vár” vagy hasonló állapotot ad.  
7. A felhasználó manuálisan felülbírálhatja az AI vagy szabályalapú egyeztetés eredményét, indoklással.  
8. Az egyeztetési eredmény és az eltérések eseménynaplóba kerülnek.

#### **Lehetséges egyeztetési szempontok**

* partner vagy szállító;  
* fuvar- vagy bizonylatazonosító;  
* CMR-szám;  
* számlaszám;  
* fuvarlevélen szereplő mennyiség;  
* összeg és pénznem;  
* teljesítési vagy fuvarozási dátum;  
* feladó és címzett;  
* útvonal vagy rakományazonosító.

### 

5.5. EasyWare-integráció és beszerzési dokumentumok

**Cél:** a készletnyilvántartási, bevételezési és beszerzési folyamatok dokumentumainak automatikus átemelése az EaisyDOCS-ba.

* A megrendelések kapcsolódó adatként vagy opcionális dokumentumként kezelhetők.  
* A szállítólevelek külön dokumentumtípusként bekerülhetnek az EaisyDOCS-ba.  
* A szállítólevél EasyWeartból vagy szkenneléssel importálható.  
* A rendszer a szállítólevelet a kapcsolódó számlához rögzíti.  
* A számla és a szállítólevél egymásból megnyitható legyen.  
* A bevételezéshez tartozó dokumentumok ugyanazon beszerzési vagy bizonylati csoporthoz kapcsolhatók.  
* Az AI a szállítólevélről kiolvashatja a szállítót, dátumot, bizonylatszámot és mennyiségi adatokat.

### 

5.6. HR- és EasyBooks-dokumentumtár

**Cél:** a HR- és bérszámfejtési modulokban keletkező, jelenleg gyakran papíralapú dokumentumok archiválása az EaisyDOCS-ban.

#### **Lehetséges dokumentumok**

* orvosi és egészségügyi vizsgálati eredmények;  
* bérszámfejtési nyilatkozatok;  
* jelenléti ívek;  
* egyéb munkavállalói nyilatkozatok;  
* HR-hez és munkaviszonyhoz kapcsolódó dokumentumok;  
* modulban generált vagy feltöltött egyéb bizonylatok.

#### **Funkcionális működés**

* A HR- vagy EasyBooks-modulban létrehozott dokumentum mellett jelenjen meg egy „EaisyDOCS-ba helyezés” vagy „Iratárba helyezés” művelet.  
* A felhasználó döntse el, hogy az adott dokumentumot archiválja-e.  
* Az archiválás során a rendszer automatikusan meghatározza a tenantet, vállalkozást, munkavállalót, dokumentumtípust és megőrzési szabályt.  
* A dokumentum EaisyDOCS-iktatást vagy előre konfigurált archiválási bejegyzést kapjon.  
* A személyes és egészségügyi adatokhoz fokozott jogosultság és szigorúbb naplózás szükséges.  
* A HR-modulból az archivált dokumentum közvetlenül megnyitható legyen, az EaisyDOCS-ból pedig vissza lehessen navigálni a kapcsolódó HR-objektumhoz.  
* Az ismételt archiválás duplikációvédetten működjön.

### 

5.7. További ERP-extensionök: HRT SPed, AGL és Ultralog

A bemutató alapján a HR-modul mellett további iparági vagy szakmoduli kiegészítések készülhetnek, például HRT Sped-, AGL- és Ultralog-integrációk.

* Az egyes modulok saját dokumentumtípusokat határozhatnak meg.  
* Az adott modulból dokumentum küldhető az EaisyDOCS-ba.  
* A dokumentum automatikusan megkapja a forrásmodulbeli objektum azonosítóját.  
* Az EaisyDOCS dokumentumkapcsolatként tárolja a forrásmodult és az eredeti üzleti objektumot.  
* A kapcsolat mindkét irányban megnyitható legyen.  
* Az integrációk tenant- és jogosultságörökléssel működjenek.

### 

5.8. Dashboard és iratforgalmi statisztikák

**Cél:** az iratkezelési rendszer vezetői és operatív áttekintő felületet biztosítson.

#### **Javasolt mutatók**

* új bejövő küldemények száma;  
* érkezési csatornák megoszlása;  
* bizonylattípusok megoszlása;  
* számlák száma és értéke;  
* szállítólevelek, CMR-ek és fuvarlevelek száma;  
* szerződések száma;  
* feldolgozás alatt álló iratok;  
* lejárt vagy közelgő határidejű iratok;  
* iratok szervezeti egységenként;  
* iratok tenantonként;  
* partnerek, vevők és szállítók szerinti bontás;  
* egyeztetett és eltérést mutató számla–CMR párok;  
* archivált, selejtezésre javasolt és selejtezett iratok.

#### **Szűrési dimenziók**

* időszak;  
* vállalkozás vagy tenant;  
* partner;  
* vevő vagy szállító;  
* bizonylattípus;  
* szervezeti egység;  
* forrásmodul;  
* iratállapot.

A dashboard kizárólag olyan aggregált adatokat jeleníthet meg, amelyekhez az adott felhasználónak az alapul szolgáló iratok alapján hozzáférése van.

### 

5.9. Szerződéskezelési almodul

**Cél:** szerződések létrehozása, verziózása, kapcsolása, iktatása, megőrzése és visszakeresése egyetlen folyamatban.

#### **Szerződéssablonok**

* A felhasználó szerződéssablonokat tölthet fel és kezelhet.  
* A sablonok például keretszerződés, audit-szerződés, licenc- vagy adásvételi szerződés típusúak lehetnek.  
* A sablonban változó mezők jelölhetők.  
* A változó mezők lehetnek partneradatok, kapcsolattartók, dátumok, árak, szolgáltatási paraméterek, időtartamok és egyéb szerződéses értékek.  
* A sablonhoz hozzáférési és használati jogosultság rendelhető.

#### **AI-alapú szerződésgenerálás**

1. A felhasználó kiválaszt egy szerződéssablont.  
2. A partner kiválasztható a partner­törzsből.  
3. A felhasználó természetes nyelvű promptban megadhatja a kívánt tartalmi paramétereket.  
4. Az AI kitölti a sablon változó mezőit.  
5. Hiányzó vagy bizonytalan adat esetén a rendszer visszakérdez.  
6. A felhasználó felülvizsgálja és jóváhagyja a generált tartalmat.  
7. A rendszer PDF-et vagy a támogatott szerződésformátumot generál.  
8. A létrehozott szerződés automatikusan EaisyDOCS-iratként iktatható.  
9. A dokumentum a partnerhez és az érintett modulbeli objektumokhoz kapcsolódik.

#### **Verziókezelés és aláírt változat**

* Minden módosítás új verziót hozhat létre, például v2, v3 vagy v4.  
* A korábbi verziók nem törlődnek, hanem megőrzött verzióként maradnak elérhetők.  
* A verziók között látható legyen a létrehozó, létrehozási idő, módosítás oka és státusz.  
* Az aláírásra vagy elfogadásra visszaküldött végleges példány külön dokumentumként, de ugyanazon szerződéscsalád részeként kezelendő.  
* Az e-mailben visszaérkező, aláírt szerződés az e-mail-feldolgozási folyamatból a szerződéshez kapcsolható.  
* A végleges, aláírt példány megkülönböztetendő a tervezett és belső változatoktól.  
* A dokumentumhoz időbélyeges, többrétegű archiválási elvárás kapcsolódik.

### 

5.10. Teljesítésigazolás-kezelés

**Cél:** teljesítésigazolások előállítása, a számlához és partnerhez kapcsolása, valamint megőrzése.

* Teljesítésigazolási sablonok feltölthetők és kezelhetők.  
* A teljesítésigazolás adatai származhatnak a számlából, a partnerrel folytatott kommunikációból, szerződésből vagy manuális adatbevitelből.  
* A felhasználó prompttal kérheti teljesítésigazolás létrehozását.  
* Az AI a sablon változó mezőit kitölti.  
* Hiányzó adat esetén visszakérdezés szükséges.  
* A generált dokumentum felülvizsgálható és jóváhagyható.  
* A jóváhagyott teljesítésigazolás EaisyDOCS-ba iktatható.  
* A dokumentum kapcsolható a számlához, szerződéshez, partnerhez és forrásmodulbeli tranzakcióhoz.

### 

5.11. Keresztmodulos dokumentumkapcsolatok

**Cél:** a felhasználó egy üzleti objektumból közvetlenül elérhesse az összes kapcsolódó dokumentumot, függetlenül attól, melyik modulban keletkezett.

#### **Kapcsolati példák**

* EasyBill-partner → partner szerződései és számlái.  
* EasyBill-számla → kapcsolódó szerződés, teljesítésigazolás, szállítólevél vagy CMR.  
* EasyWeart-beszerzés → megrendelés, szállítólevél, számla és kapcsolódó iratok.  
* HR-munkavállaló → jelenléti ív, nyilatkozat, vizsgálati eredmény.  
* Szállítmányozási fuvar → számla, CMR, fuvarlevél, szerződés és egyeztetési eredmény.

#### **Kapcsolati szabályok**

* A kapcsolat iránya mindkét oldalról navigálható legyen.  
* A kapcsolat típusa legyen megnevezve, például „számlához tartozó szerződés” vagy „számlát igazoló CMR”.  
* A kapcsolat létrejöhet automatikusan, AI-javaslatként vagy manuálisan.  
* Automatikus kapcsolatot a felhasználó hagyhasson jóvá vagy utasíthasson el.  
* A kapcsolat létrehozása, módosítása és törlése naplózandó.

### 

5.12. Értesítési stratégia és speciális megfelelőségi használat

A bemutatóban elhangzott, hogy az általános üzleti működésben nem feltétlenül indokolt minden selejtezési vagy jóváhagyási lépéshez többszintű vezetői jóváhagyást és értesítést előírni. Ugyanakkor a négyszem-elv és a selejtezési jegyzőkönyv bizonyos pályázati, intézményi vagy szabályozott területeken szükséges lehet.

* A négyszem-elv konfigurálható üzleti szabályként maradjon elérhető.  
* A tenant vagy irattípus szintjén meghatározható legyen, hogy kötelező-e független jóváhagyó.  
* Egyszerű üzleti környezetben a felesleges többszintű jóváhagyás ne legyen kötelező.  
* Szabályozott területen a megőrzés, visszakereshetőség és jogszerű selejtezés bizonyítható legyen.  
* A rendszer őrizze meg annak nyomát, hogy egy dokumentum mikor vált selejtezhetővé, mikor javasolták selejtezésre, ki hagyta jóvá és mikor készült jegyzőkönyv.  
* A selejtezés után is maradjon meg a selejtezési metaadat és a jegyzőkönyv.  
* Az értesítések csatornája, címzettje és eseménye konfigurálható legyen.

Ez különösen hasznos lehet olyan szabályozott területeken, ahol egy korábbi eszköz-, szerződés- vagy bizonylatkapcsolat később hatósági vagy nyomozati célból visszakövetendő.

## **6\. Integrációs alapelvek**

---

| Rendszer/modul | Átadott vagy átvett objektumok | Elvárt kapcsolat   |
| :---- | :---- | :---- |
| EasyBill | Partnerek, számlák, számlaadatok | Partner­törzs-szinkronizáció, számlák importja, számláról dokumentumok elérése. |
| EasyWeart | Beszerzések, megrendelések, szállítólevelek, készletmozgások | Szállítólevelek és számlák közös dokumentumcsoportja. |
| HR-modul | Munkavállalói dokumentumok, vizsgálati eredmények, nyilatkozatok, jelenléti ívek | Dokumentum archiválása EaisyDOCS-ba, szigorított jogosultság. |
| EasyBooks | Bérszámfejtési és adminisztratív dokumentumok | Generált vagy feltöltött dokumentumok archiválása. |
| EasyWheel / szállítmányozási kiegészítés | CMR-ek, fuvarlevelek, fuvaradatok | Számlákkal való összekapcsolás és egyeztetés. |
| AGL | Az adott szakmodul bizonylatai | Dokumentumátadás és visszanavigálás. |
| Ultralog | Logisztikai vagy szakmai dokumentumok | Dokumentumátadás, partner- és tranzakciókapcsolat. |
| CRM | Ügyfél- és kapcsolattartási adatok | Kapcsolódó iratok megjelenítése; a bemutató idején még nem működő kapcsolat. |

### **6.1. Integrációs működési elvek**

> * Minden integrált objektumhoz stabil külső azonosító tartozzon.  
> * Az EaisyDOCS tárolja a forrásrendszer, modul és objektum típusát.  
> * Az átadott dokumentumhoz kerüljön forrásrendszerbeli hivatkozás.  
> * Az integrációk legyenek idempotensek: ugyanazon objektum ismételt átadása ne hozzon létre duplikátumot.  
> * Hiba esetén az átadás állapota és hibaoka legyen látható.  
> * A kapcsolat megszűnése vagy módosítása ne törölje automatikusan a már archivált iratot.  
> * A forrásrendszerből érkező jogosultsági és tenant-információkat az EaisyDOCS vegye figyelembe.  
> * A felhasználó a dokumentum megnyitásakor lássa, hogy az melyik modulból érkezett.

## **7\. Keresztfunkcionális és megfelelőségi elvek**

### ---

**7.1. Audit és nyomon követhetőség**

> * Minden lényeges művelet naplózandó: létrehozás, megtekintés, módosítás, megosztás, letöltés, iktatás, lezárás, archiválás, kölcsönzés, selejtezési javaslat és jóváhagyás.  
> * A napló tartalmazza a felhasználót, időpontot, műveletet, érintett objektumot és lehetőség szerint a korábbi és új értéket.  
> * A naplót jogosultság szerint lehessen megtekinteni.  
> * Az auditadatok ne legyenek normál üzleti felhasználó által törölhetők vagy módosíthatók.

### **7.2. Dokumentum-integritás és megőrzés**

> * Az eredeti dokumentum és az archiválási példány különböztetendő meg.  
> * A PDF/A-átalakítás állapota legyen követhető.  
> * A dokumentumverziók megőrzendők.  
> * A lezárt és irattárba helyezett irat módosítása korlátozott legyen.  
> * A selejtezett dokumentum tartalma a jogosultak számára többé ne legyen elérhető, de a selejtezési bizonyíték és jegyzőkönyv megmaradjon.  
> * A rendszer kezelje az időbélyegzéshez és archiváláshoz szükséges metaadatokat.

### **7.3. AI használati elvek**

> * Az AI-adatkinyerés eredménye alapértelmezés szerint javaslat.  
> * A felhasználó lássa, mely mezőket töltötte ki automatikusan a rendszer.  
> * A bizonytalan vagy hiányos felismerés jelezhető legyen.  
> * A végleges iktatási adatot a jogosult felhasználó hagyja jóvá.  
> * Az AI által létrehozott szerződést vagy teljesítésigazolást embernek kell felülvizsgálnia, mielőtt végleges dokumentummá válik.  
> * A prompt, az AI-válasz, a felhasználói módosítás és a véglegesítés naplózható legyen.

### **7.4. Adatvédelmi elvek**

> * A személyes, HR- és egészségügyi dokumentumokat fokozott jogosultsággal kell védeni.  
> * A multitenáns adatokat logikailag és jogosultságilag el kell különíteni.  
> * A kereső, dashboard és értesítési funkció nem kerülheti meg a dokumentumszintű hozzáférést.  
> * Az adatokhoz való hozzáférés célhoz és szerepkörhöz kötött legyen.  
> * A megőrzési és törlési szabályok dokumentumtípusonként, tenantonként vagy szabályozási környezetenként konfigurálhatók legyenek.

## **8\. Nyitott kérdések és pontosítandó üzleti szabályok**

---

A bemutató alapján az alábbi témák üzleti döntést és folyamatszabályozást igényelnek. Kiemelendő, hogy a kérdések jelentős része (7 kulcsfontosságú tétel, pl. négyszem-elvű selejtezés, QR-kódos elválasztólapos szkennelés, titkosított HR adatvédelem, 4 minősítési szint, interaktív dashboard) **MÁR MEGVALÓSÍTÁSRA KERÜLT** a jelenlegi kódbázisban.

### **8.1. Feladatkatalógus**
* **Kérdés:** Milyen általános feladatok rendelhetők egy számlához, szerződéshez, HR-irathoz vagy szállítmányozási dokumentumhoz?
* **Fejlesztési státusz:** 🟡 Részben kész (A `/tasks` felületen szabad szöveges feladatok már rögzíthetők).
* **Döntési javaslat:** 4 standard, előre definiált sablon-feladattípus bevezetése a gyors munkavégzéshez:
  * **Pénzügy / Számla:** „Jóváhagyás és kifizetés engedélyezése”, „Könyvelésre továbbítás”, „Eltérés egyeztetése partnerrel”.
  * **Szerződés:** „Jogi és szakmai felülvizsgálat”, „Vezetői ellenjegyzés”, „Aláírásra kiküldés”.
  * **Szállítmányozás (CMR):** „Fuvardíj és paritás egyeztetés”, „Hiányzó átvételi igazolás pótlása”.
  * **HR dokumentum:** „Munkaszerződés aláíratása”, „Orvosi alkalmasság ellenőrzése”, „Kilépő papírok átadása”.
  * **Egyedi feladat:** Tetszőleges szabad szöveges teendő megadásának lehetősége felelőssel és határidővel.

### **8.2. Feladatállapotok**
* **Kérdés:** Milyen státuszok legyenek, például új, folyamatban, várakozik, teljesítve, elutasítva, lezárva?
* **Fejlesztési státusz:** 🟡 Részben kész (A Kanban tábla státuszoszlopai működnek).
* **Döntési javaslat:** 4 tiszta állapot és egy indoklásos lezárási logika bevezetése:
  * **Új (Open):** A feladat kiosztva a felelősnek, feldolgozásra vár.
  * **Folyamatban (In Progress):** A felelős aktívan dolgozik a dokumentum feldolgozásán.
  * **Várakozik (Pending):** Külső partner válaszára, hiánypótlásra vagy vezetői döntésre vár.
  * **Befejezve (Completed):** A feladat sikeresen elvégezve / jóváhagyva.
  * *Elutasítás kezelése:* Az „Elutasítva” állapot nem önálló státusz, hanem a feladat Befejezett lezárása kötelező szöveges indoklással (pl. vitatott számla).

### **8.3. Automatikus szignálás**
* **Kérdés:** Milyen irattípus melyik szervezeti egységhez és melyik felelőshöz kerüljön?
* **Fejlesztési státusz:** ✅ Részben kész (AI szervezeti egység ajánlás aktív).
* **Döntési javaslat:** Kétlépcsős szignálási modell az automatizáció és az emberi kontroll egyensúlyára:
  * **1. lépcső (Automatikus osztály-szintű):** Az AI és a szabályrendszer a dokumentumtípus és partner alapján automatikusan a megfelelő Szervezeti Egységhez rendeli az iratot (pl. Számla -> Pénzügy, Szerződés -> Jogi osztály, Önéletrajz -> HR).
  * **2. lépcső (Személyi felelős kijelölése):** A szervezeti egység vezetője vagy kijelölt szignálója osztja ki a konkrét ügyintézőnek, vagy az osztály tagja magához veszi. Ne az AI ossza ki közvetlenül személyeknek, elkerülve a szabadságon lévők túlterhelését.

### **8.4. Minősítési szintek**
* **Kérdés:** Pontosan milyen biztonsági fokozatok legyenek, és ki módosíthatja azokat?
* **Fejlesztési státusz:** ✅ **KÉSZ A KÓDBAN (ADR A-007)**
* **Működés:** A rendszerben pontosan definiált 4 biztonsági szint van érvényben (Postgres RLS és felület):
  * **Nyilvános:** A szervezeten belül minden bejelentkezett felhasználó számára megtekinthető.
  * **Belső (Alapértelmezett):** Az adott szervezeti egység tagjai és a vezetői láthatják.
  * **Bizalmas:** Kizárólag a kijelölt vezetők és a dokumentumhoz expliciten hozzárendelt ügyintézők férhetnek hozzá.
  * **Szigorúan bizalmas:** Kizárólag az irat felelőse és a legfelsőbb cégvezető tekintheti meg.
  * *Módosítási jog:* A szintet kizárólag a dokumentum Felelőse és az Adminisztrátor módosíthatja; minden változás automatikusan és törölhetetlenül naplózódik az audit naplóban.

### **8.5. Explicit megosztás**
* **Kérdés:** Ki engedélyezheti, milyen időtartamra és milyen műveleti körrel?
* **Fejlesztési státusz:** 🟡 Részben kész (Adatbázis szinten az explicit hozzárendelés táblája létezik).
* **Döntési javaslat:** Szabályozott megosztási jogosultságok:
  * **Engedélyező:** Az ügyirat Felelőse vagy a Szervezeti Egység Vezetője oszthatja meg más osztályon dolgozó munkatárssal.
  * **Műveleti körök:** Két különválasztott szint: 1. „Csak betekintés” (olvasási jog, vízjelezett megtekintéssel), 2. „Ügyintézés” (szerkesztési, feladat-hozzáadási és megjegyzés-írási jog).
  * **Időtartam:** Megadható határozatlan időre, vagy konkrét lejárati dátummal (pl. 14 napos szakértői véleményezés). A lejárati határidő elérésekor a rendszer automatikusan és auditáltan visszavonja a hozzáférést.

### **8.6. Kötegelt érkeztetés és elválasztólap**
* **Kérdés:** Milyen elválasztólapot és milyen szkennelési formátumot kell támogatni?
* **Fejlesztési státusz:** ✅ **KÉSZ A KÓDBAN (PRD P-021)**
* **Működés:**
  * **Elválasztólap:** A rendszerből egy kattintással nyomtatható egyedi QR-kóddal és vonalkóddal ellátott elválasztó fedőlap (`/batch/separator-page`).
  * **Feldolgozás:** A fizikai iratcsomók közé helyezett elválasztólapokkal a teljes köteg egyetlen nagy PDF-ként beszkennelhető (Hotfolder vagy feltöltés).
  * **Automatikus darabolás:** A rendszer a háttérben a QR-kódok mentén automatikusan szétvágja a fájlt külön iratokra, és önálló érkeztetőszámmal rögzíti őket.
  * **Támogatott formátum:** Standard PDF (200-300 DPI, fekete-fehér vagy színes).

### **8.7. Selejtezési állapotgép**
* **Kérdés:** Irattárban, selejtezhető, selejtezésre javasolt, jóváhagyott, selejtezett és megsemmisített állapotok pontos átmenete.
* **Fejlesztési státusz:** ✅ **KÉSZ A KÓDBAN (ADR A-001 és BRD-002)**
* **Működés:** Az életciklus szabályozott lépései:
  * **1. Irattárban:** Az irat lezárva, fizikai/elektronikus irattárban őrizve, megőrzési ideje ketyeg.
  * **2. Selejtezhető:** A megőrzési idő (pl. 8 év) lejárt, a rendszer automatikusan megjelöli, de NEM törli.
  * **3. Selejtezésre javasolt:** Az irattáros szelektálja az iratokat, és selejtezési jegyzéket/csomagot hoz létre.
  * **4. Jóváhagyva:** Független vezető jóváhagyja a selejtezési jegyzőkönyvet (szigorú négyszem-elv).
  * **5. Megsemmisítve / Selejtezve:** A csatolt elektronikus fájlok és fizikai példányok megsemmisítésre kerülnek, de a metaadatok és a hitelesített PDF selejtezési jegyzőkönyv örökre megmarad az archívumban jogi bizonyítékként.

### **8.8. Megőrzési idők**
* **Kérdés:** Dokumentumtípusonként, tenantonként és szabályozási környezetenként milyen időtartamok érvényesek?
* **Fejlesztési státusz:** 🟡 Rendszerben konfigurálható (Irattári Terv táblázat).
* **Döntési javaslat:** A magyar jogszabályoknak megfelelő alapértelmezett irattári terv, amelyet a cégek testreszabhatnak:
  * **Számviteli bizonylatok, számlák, könyvelési iratok:** 8 év (2000. évi C. törvény a számvitelről 169. §).
  * **Munkaviszonnyal, nyugdíjjal kapcsolatos iratok (munkaszerződés, bérlap, kilépő adatlap):** Nyugdíjkorhatárig / Nem selejtezhető (Tny. tv. 99/A. §).
  * **Általános szerződések és megállapodások:** 5 év az elévüléstől / lejárattól számítva (Ptk. elévülési idő).
  * **Pályázati és EU támogatási iratok:** 10 év a záró kifizetéstől számítva (vagy Támogatási Szerződés szerint).
  * **Általános üzleti levelezés, ajánlatok:** 3-5 év.

### **8.9. Selejtezési jóváhagyás és négyszem-elv**
* **Kérdés:** Minden esetben kötelező-e a négyszem-elv, vagy konfigurálható?
* **Fejlesztési státusz:** ✅ **KÉSZ A KÓDBAN (ADR A-001 & BRD-002)**
* **Működés:** A rendszer adatbázis-szinten tiltja, hogy a javaslattevő saját maga hagyja jóvá a selejtezést.
* **Döntési javaslat:** Differenciált, konfigurálható működés vállalati méret szerint:
  * **Nagyvállalati és szabályozott környezetben:** A szigorú négyszem-elv kötelező alapértelmezés (az irattáros felterjeszt, a gazdasági/jogi vezető hagy jóvá).
  * **Kis KKV környezetben:** A tenant beállításaiban bekapcsolható az „Egyszerűsített selejtezés” opció kis létszámú cégek számára, ahol nincs külön irattáros és vezetői réteg.

### **8.10. Partneradat-forrás (eaisyBill vs. eaisyDocs kapcsolat)**
* **Kérdés:** Az EasyBill vagy az EaisyDOCS legyen-e az elsődleges partneradat-gazda?
* **Valós architekturális alaphelyzet:** 
  * Az **eaisyDocs és az eaisyHR** fut egyazon közös adatbázison és sémán (közös `partner`, `felhasznalo_profil`, `szervezeti_egyseg` táblák).
  * Az **eaisyBill viszont egy teljesen különálló adatbázison és szolgáltatáson fut**! Nincs közvetlen adatbázis-szintű összekötés, a kommunikáció kizárólag biztonságos API-n keresztül zajlik.
* **Fejlesztési státusz:** 🟡 **Részben kész (Egyirányú számla- és partnerimport már működik API-n keresztül – `eaisybill-actions.ts`).**
  * Az eaisyDocs API-n keresztül lekéri a számlákat az eaisyBill-ből.
  * Számla importálásakor az eaisyDocs a partner adószáma (`adoszam`, `adoszam_eu`) vagy neve alapján megkeresi a partnert a helyi `partner` táblájában, és ha még nem létezik, automatikusan rögzíti azt (`findOrCreatePartner`), az iratot pedig megjelöli (`kulso_forras = 'eaisybill'`).
* **Döntési javaslat a megbeszélésre (Felelősségi szintek és integrációs irány):**
  * **1. Számlázási és Vevői Master Data ➔ eaisyBill:** A számlázáshoz szükséges hivatalos vevőtörzs (számlázási név, cím, bankszámlaszám, fizetési feltételek) elsődleges és felelős gazdája az **eaisyBill**.
  * **2. Iratkezelési és Szállítói Partnerkezelés ➔ eaisyDocs:** A bejövő egyéb dokumentumokból (levelek, szerződések, szkenner, alvállalkozók, hivatalok) érkező partnereket az **eaisyDocs** önállóan kezeli a helyi partnertárban (ami azonnal elérhető az eaisyHR számára is).
  * **3. Szinkronizációs irány és fejlesztési javaslat (Kétirányúsítás):**
    * *Jelenlegi állapot:* Egyirányú adatátvétel (eaisyBill ➔ eaisyDocs). A számlákkal a partnerek átjönnek az eaisyDocs-ba.
    * *Javasolt döntés a megbeszélésre:* Készüljön el az ellenirányú API integráció is: ha az eaisyDocs-ban az ügyintéző vagy az AI egy új bejövő szállítói számlát/szerződést rögzít, egyetlen gombnyomással („Átadás eaisyBillbe mint új szállító/partner”) lehessen átküldeni az eaisyBill API-ján keresztül.
    * *Eredmény:* Megszűnik a kettős manuális adatrögzítés, miközben a rendszerek adatbázisai szeparáltak és stabilak maradnak.

### **8.11. Tenantmodell (Multi-tenancy és többcég-kezelés)**
* **Kérdés:** Milyen szervezeti hierarchiában működjön a szolgáltató, a könyvelőiroda és az ügyfélcég?
* **Valós fejlesztési státusz:** 📋 **Üzleti döntésre váró architektúrális tervezés (A kódban még NINCS tenant_id mező; a rendszer jelenleg egycéges / single-tenant belső szervezeti egységekkel).**
* **Jelenlegi működés a kódban:**
  * A rendszer jelenleg egyetlen cég adatait kezeli, amelyen belül belső osztályokat és részlegeket lehet kialakítani (`szervezeti_egyseg_id`).
  * A multitenancia (több független cég vagy könyvelőirodai ügyfelek kezelése) a backlogban a **3. Fázisú fejlesztések (B13 modul)** közé tartozik, mivel a teljes adatbázisra kiterjedő migrációt igényel.
* **Döntési javaslat a megbeszélésre (A bevezetendő háromszintű modell):**
  * **1. Szint: Platform Üzemeltető (Think AI):** Globális adminisztráció, licenckezelés és rendszerfelügyelet.
  * **2. Szint: Szervezet / Cég (Tenant):** Egyedi adószámmal rendelkező önálló jogi entitás. Jövőbeli megvalósítás: minden alaptábla (`irat`, `ugyirat`, `partner`) kap egy `tenant_id` mezőt, és az RLS szabályok szigorúan megakadályozzák a cégek közötti adatátlátást.
  * **3. Szint: Könyvelőirodai többcég-kezelés:** Egy könyvelő felhasználó több önálló ügyfélcéghez (tenanthez) is kaphat hozzáférést. A felület fejlécében egy gyors cégválasztóval válthat az ügyfelei között, így nem kell külön fiókokkal ki-be jelentkeznie.

### **8.12. CMR- és fuvarmegbízás egyeztetés**
* **Kérdés:** Mely mezők egyezése tekintendő kötelezőnek, és milyen eltérés engedhető meg?
* **Fejlesztési státusz:** 📋 Szakmai döntési javaslat (Keresztmodulos dokumentumkapcsolatok sémája kész).
* **Döntési javaslat:** Automatikus párosítási szabályok fuvarozási dokumentumokhoz:
  * **Kötelező egyezési mezők:** 1. Fuvarozási referenciaszám / Bizonylatszám / CMR szám, 2. Partner (fuvarozó vagy megbízó neve/adószáma).
  * **Megerősítő opcionális mezők:** Rendszám (vontató/pótkocsi) és Dátumtartomány (±3 napos teljesítési eltérés megengedett).
  * **Eredmény:** Egyezés esetén a rendszer a számlát, a fuvarmegbízást és a leigazolt CMR-t automatikusan egyetlen közös ügyiratba fűzi, és zöld pipával jelzi a pénzügynek, hogy a számla kifizethető.

### **8.13. HR-adatvédelem és érzékeny adatok**
* **Kérdés:** Mely szerepkörök láthatnak egészségügyi, bér- vagy jelenléti adatokat?
* **Fejlesztési státusz:** ✅ **KÉSZ A KÓDBAN (ADR A-012 és ADR A-007)**
* **Működés:**
  * Az érzékeny HR adatok titkosított BYTEA oszlopokban vannak tárolva, dekriptáló RPC védelemmel.
  * **Kizárólagos hozzáférés:** Csak a dedikált 'hr_manager' és 'hr_admin' szerepkör láthat béradatokat, orvosi alkalmassági igazolást és letiltásokat.
  * **Ügyintézők és Betekintők:** SOHA nem férhetnek hozzá az érzékeny adatokhoz, még akkor sem, ha a munkavállaló általános iratához (pl. munkaköri leírás) hozzáférésük van.
  * **Munkavállalói önkiszolgáló:** A dolgozó kizárólag a saját dokumentumait és bérlapját tekintheti meg.

### **8.14. Szerződésgenerálás és sablonkezelés**
* **Kérdés:** Milyen sablonformátumokat, változómezőket és jóváhagyási lépéseket kell támogatni?
* **Fejlesztési státusz:** 📋 Szakmai döntési javaslat.
* **Döntési javaslat:** Strukturált sablon- és AI munkafolyamat:
  * **Sablonformátum:** Markdown / HTML sablonok szabványos változókkal (pl. `{{partner_nev}}`, `{{szolgaltatas_targya}}`, `{{osszeg}}`, `{{fizetesi_hatarido}}`).
  * **AI generálás:** A felhasználó rövid promptban megadja az egyedi paramétereket, az AI pedig beilleszti a változókat és megfogalmazza az egyedi záradékokat.
  * **Jóváhagyási lánc:** Piszkozat (Draft) -> Jogi ellenőrzés -> Jóváhagyva -> PDF generálás és automatikus iktatás az eaisyDocs-ban.

### **8.15. Elektronikus aláírás**
* **Kérdés:** Szükséges-e elektronikus aláírási szolgáltatás, vagy csak az aláírt fájl archiválása a cél?
* **Fejlesztési státusz:** 📋 Szakmai döntési javaslat (Kétlépcsős stratégia).
* **Döntési javaslat:** Költséghatékony, fázisolt bevezetés:
  * **1. Fázis (Azonnali, minimális költség):** Külsőleg aláírt dokumentumok (pl. AVDH-val hitelesített, e-Szignóval ellátott vagy kinyomtatva aláírt és beszkennelt PDF-ek) feltöltése, iktatása és PDF/A-2b archiválása SHA-256 hash ellenőrzéssel.
  * **2. Fázis (Későbbi prémium modul):** Közvetlen integráció minősített bizalmi szolgáltatóval (pl. Microsec e-Szigno API vagy DocuSign) az alkalmazáson belüli digitális aláíráshoz.

### **8.16. Értesítési szabályok és csatornák**
* **Kérdés:** Milyen eseményhez milyen címzett, határidő és csatorna tartozik?
* **Fejlesztési státusz:** 🟡 Részben kész (Alkalmazáson belüli értesítések és beállítások felülete működik).
* **Döntési javaslat:** Zajmentes, prioritás-alapú értesítési mátrix:
  * **Alkalmazáson belüli értesítés (harang ikon):** Minden státuszváltozás, új megjegyzés és @említés esetén azonnal megjelenik.
  * **E-mail értesítés kizárólag kritikus eseményekről:** 1. Új feladat kiosztása a felelősnek, 2. Közelgő feldolgozási vagy válaszadási határidő (3 nappal és 1 nappal a lejárat előtt), 3. Selejtezési jegyzék jóváhagyásra vár (vezetőnek).
  * **SMS értesítés:** Opcionális, kizárólag kritikus határidő-túllépésnél vagy kétlépcsős azonosításnál (2FA).

### **8.17. CRM-kapcsolatok**
* **Kérdés:** Milyen CRM-objektumokhoz és milyen üzleti eseményekhez kapcsolódjanak az iratok?
* **Fejlesztési státusz:** ✅ Részben kész (Polimorf link tábla létezik).
* **Döntési javaslat:** Három fő CRM üzleti objektumhoz való kapcsolás (`irat_kapcsolat` tábla segítségével):
  * **1. Ügyfél / Partner adatlap:** Az adott céghez tartozó összes szerződés, megállapodás, számla és hivatalos levél időrendi listája.
  * **2. Értékesítési lehetőség (Deal / Lead):** Az ajánlatadáshoz, tenderhez vagy tárgyaláshoz kapcsolódó beadványok és kalkulációk.
  * **3. Szerződés entitás:** Az aláírt keretszerződések, titoktartási nyilatkozatok (NDA) és azok mellékletei.

### **8.18. Dashboard és vezetői mutatók**
* **Kérdés:** Mely mutatók legyenek kötelezőek, és mely szerepkörök láthassák azokat?
* **Fejlesztési státusz:** ✅ **KÉSZ A KÓDBAN (PRD P-001)**
* **Működés:**
  * A főoldalon (`/`) már működő interaktív mutatók: 1. Forgalmi trend (Bejövő vs. Kimenő iratvolumen), 2. Érkezési csatornák megoszlása (E-mail, Kézi, EasyBill, Szkenner), 3. Sürgős határidők visszaszámlálója, 4. Saját nyitott feladatok.
  * **Szerepkör-alapú láthatóság:** Vezetői / Admin szerepkörben a teljes cég vagy osztály összesített forgalmi statisztikái láthatók; ügyintézői szerepkörben a saját felelősségi körbe tartozó iratok és teendők jelennek meg.

### **8.19. Betekintő vs. Auditor szerepkör**
* **Kérdés:** Valóban azonos jogosultságúak-e, vagy az auditor kizárólag naplókat és megfelelőségi adatokat láthat?
* **Fejlesztési státusz:** ✅ **KÉSZ A KÓDBAN (ADR A-007)**
* **Működés:** Egyértelmű szakmai szétválasztás a jogosultsági mátrixban:
  * **Betekintő (Viewer):** Hétköznapi üzleti felhasználó, aki kizárólag a számára engedélyezett iratokat nézheti meg vízjelezve. Nem iktathat, nem módosíthat és nem selejtezhet.
  * **Auditor (Ellenőr):** Hatósági vagy belső megfelelőségi szerepkör. Az iratok tartalmán felül kizárólagos hozzáférése van a megváltoztathatatlan eseménynaplóhoz (audit trail), a selejtezési jegyzőkönyvekhez és a kriptográfiai SHA-256 integritás-ellenőrzésekhez.

---

## **9. Kiegészítő Stratégiai és Jogszabályi Döntési Javaslatok (eaisyDocs & eaisyHR)**

Az alábbi 10 javaslat a meglévő 19 alapkérdésen felül olyan jogszabályi (Számviteli tv., Mt., GDPR, 1/2018. ITM rendelet) és hatékonyságnövelő garanciákat nyújt, amelyek kiemelt versenyelőnyt jelentenek a piacon:

### **📁 eaisyDocs Stratégiai Javaslatok**

#### **9.1. Hiteles Digitális Archiválás (1/2018. ITM rendelet szerinti zárt rendszerű megőrzés)**
* **Kérdés a megbeszélésre:** Az eaisyDocs sima belső dokumentumtár legyen, vagy jogilag hiteles elektronikus archívum, amely lehetővé teszi a papíralapú bizonylatok teljes megsemmisítését?
* **Fejlesztési státusz:** 🟡 **Részben kész a kódban (ADR A-010):**
  * *Kész a kódban:* Minden irat kap egy SHA-256 kriptográfiai hash-t feltöltéskor, és elkészül a szabványos PDF/A-2b normalizált archiválási másolat (`convertToPdfA`), amely a felületről letölthető.
  * *Hiányzó döntési pont:* Külső minősített időbélyegző (RFC 3161 Timestamp Provider, pl. Microsec vagy NetLock) API integrációja. Ezzel a digitális példány teljes bizonyító erejű magánokirattá válik, és a papíralapú számlák az iktatást követően törvényesen ledarálhatók.

#### **9.2. Cégkapu / Hivatali Kapu közvetlen integráció**
* **Kérdés a megbeszélésre:** A hivatalos állami küldeményeket (NAV, bíróság, kormányhivatal) kézzel töltsék-e le és iktassák, vagy legyen automatikus gép-gép kapcsolat?
* **Fejlesztési státusz:** 📋 **Új fejlesztési javaslat (Üzleti döntés szükséges).**
* **Döntési javaslat:** Cégkapu gép-gép API integráció (vagy dedikált felügyelt bejövő mappa). A hivatalos beadványok és határozatok automatikusan beérkeznek az `/inbox`-ba, az AI felismeri a jogvesztő válaszadási határidőt (pl. 8 vagy 15 nap), és azonnali PUSH/E-mail riasztást küld a jogásznak és a cégvezetőnek.

#### **9.3. Fizikai Irattári Lokáció és Vonalkódos Polcrendszer**
* **Kérdés a megbeszélésre:** Hogyan találják meg a munkatársak a törvényileg papíron is megőrzendő iratokat a fizikai szekrényekben?
* **Fejlesztési státusz:** 🟡 **Részben kész (Fizikai fellelhetőség mező létezik az `ugyirat` táblában).**
* **Döntési javaslat:** 4 szintű fizikai lokáció-hierarchia (*Épület ➔ Irattár ➔ Polc ➔ Doboz*). A rendszer nyomtatható vonalkódos dobozcímkét generál, így a selejtezéskor egyetlen dobozkód beolvasásával lehessen a lejárt papírokat zúzdába küldeni.

#### **9.4. Verziózási Zárolás és Ütközésvédelem (Check-out / Check-in)**
* **Kérdés a megbeszélésre:** Mi történik, ha két ügyintéző vagy jogász párhuzamosan próbál módosítani egy szerződéstervezetet?
* **Fejlesztési státusz:** 🟡 **Részben kész (Verziótörténet és verziómentés működik az `ugyirat_verzio` táblában).**
* **Döntési javaslat:** Szerkesztési zárolás (Check-out). Amíg az egyik felhasználó szerkeszti a piszkozatot, a többiek számára a dokumentum "Zárolva" státuszú, elkerülve a párhuzamos munkából eredő felülírásokat.

#### **9.5. Beépített GDPR Adatkitakarás (Redaction) a PDF Viewerben**
* **Kérdés a megbeszélésre:** Hogyan távolíthatók el véglegesen a személyes, banki és védett adatok, ha az iratot külső félnek vagy nem jogosult felhasználónak kell továbbítani?
* **Fejlesztési státusz:** 📋 **Új fejlesztési javaslat.**
* **Döntési javaslat:** Beépített PDF Redaction eszköz. A PDF nézegetőben a felhasználó kijelölheti az érzékeny területeket, és a rendszer a szövegrétegből és a képből is fizikailag eltávolítja a pixeleket és karaktereket (nem csupán fekete téglalapot rajzol fölé).

---

### **👥 eaisyHR Stratégiai és Mt. Megfelelőségi Javaslatok**

#### **9.6. Munka Törvénykönyve (Mt.) Munkaidő-keret és Pihenőidő Figyelmeztető Motor**
* **Kérdés a megbeszélésre:** A jelenléti ív és műszakbeosztás csak rögzítő felület legyen, vagy aktívan védje a céget a munkaügyi bírságoktól?
* **Fejlesztési státusz:** 🟡 **Részben kész (Túlóra nyilvántartás és munkaidő-naplózás működik a `/hr/time` oldalon).**
* **Döntési javaslat:** Beépített Mt. megfelelőségi validátor a beosztástervezőhöz:
  * Napi 11 órás egybefüggő pihenőidő ellenőrzése (figyelmeztetés, ha a dolgozó későn végzett és korán kezd).
  * Heti 48 órás maximális munkaidő és kötelező heti pihenőnap ellenőrzése.
  * Éves rendkívüli munkaidő (250 / 400 órás limit) számláló és automatikus riasztás.

#### **9.7. Foglalkozás-egészségügyi és Munkavédelmi Életciklus**
* **Kérdés a megbeszélésre:** Hogyan biztosítjuk, hogy a lejáró orvosi alkalmassági és munkavédelmi oktatások ne vezessenek hatósági eltiltáshoz?
* **Fejlesztési státusz:** 🟡 **Részben kész a kódban (Orvosi modul és lejárati értesítések működnek!):**
  * *Kész a kódban:* `hr_orvosi_vizsgalat` tábla, munkakörönkénti vizsgálati típus és gyakoriság (`orvosi_vizsgalat_gyakorisag_ho`), a dolgozói profilban orvosi lejárati figyelmeztetés, 30 és 7 nappal korábbi automatikus értesítés a háttérben.
  * *Kiegészítendő döntési pont:* 1. Munkavédelmi és tűzvédelmi oktatási jegyzőkönyvek lejárati nyilvántartása. 2. Műszakbeosztáskor blokkoló figyelmeztetés, ha a munkavállaló orvosi alkalmassága lejárt.

#### **9.8. Munkaviszony Megszűnés (Offboarding) és Mt. 80. § Garancia (5 munkanapos szabály)**
* **Kérdés a megbeszélésre:** Hogyan garantáljuk a kilépő dolgozó kötelező munkaügyi igazolásainak törvényi kiadását az 5 munkanapos jogvesztő határidőn belül?
* **Fejlesztési státusz:** 🟡 **Részben kész a kódban (Offboarding Kanban modul működik – `/hr/offboarding`):**
  * *Kész a kódban:* Kilépési folyamatkövetés, feladatlista (`hr_offboarding_feladat`), kilépési interjú (`hr_kilepes_interju`).
  * *Kiegészítendő döntési pont:* 1. Az Mt. 80. § szerinti 5 munkanapos visszaszámláló és vezetői riasztó. 2. Kötelező kilépő igazolások (bírósági letiltási adatlap, munkanélküli ellátási igazolás) automatikus sablon-alapú generálása és iktatása az eaisyDocs-ba.

#### **9.9. Szabadságkiadási Mt. Szabályok és a 14 Napos Egybefüggő Pihenés**
* **Kérdés a megbeszélésre:** Hogyan garantálja a szabadságkezelő, hogy a cég eleget tegyen az Mt. 122. § szerinti szabadságkiadási kötelezettségének?
* **Fejlesztési státusz:** 🟡 **Részben kész (Szabadságkérelmek és jóváhagyási workflow működik).**
* **Döntési javaslat:** Intelligens szabadság-tervező: figyelmeztetés, ha a dolgozó az adott naptári évben még nem vett ki legalább 14 egybefüggő napot (hétvégékkel együtt), valamint év végi (novemberi) automatikus riasztás a bent maradt szabadnapok kiadására.

#### **9.10. Elektronikus Bérjegyzék és Hivatalos Átvételi Nyugtázás (Mt. 22. §)**
* **Kérdés a megbeszélésre:** Elegendő-e, hogy a dolgozó látja a bérlapját a portálon, vagy jogi viták esetére szükség van igazolt átvételi naplózásra?
* **Fejlesztési státusz:** 🟡 **Részben kész (Titkosított béradatok és dolgozói önkiszolgáló portál kész – ADR A-012).**
* **Döntési javaslat:** Digitális átvételi nyugtázás (Mt. 22. § szerinti közlési fikció). A bérlap és a hivatalos munkaügyi nyilatkozatok megnyitásakor a rendszer másodperc-pontossággal és IP-címmel rögzíti az átvételt az audit naplóba (`hr_esemeny_naplo`), kizárva a vitákat a bérlapok átadásáról.

---

## **10. Összegzés**

---

Az EaisyDOCS jelenlegi állapotában a teljes elektronikus iratkezelési alapfolyamatot lefedi: a dokumentum érkeztetésétől az iktatáson, AI-alapú felismerésen, feladatkezelésen, jogosultságkezelésen és irattározáson át a selejtezésig. A rendszer alkalmas arra, hogy a papíralapú vállalati dokumentumkezelés jelentős részét kiváltsa.

A továbbfejlesztési irányok az alkalmazást központi dokumentum- és iratkezelési szolgáltatássá alakítják az ERP-ökoszisztémán belül. A legfontosabb fejlesztési pillérek:

> * közös partner­törzs;  
> * multitenáns, többcég-kezelő működés;  
> * EasyBill-, EasyWare-, HR-, EasyBooks-, EasyWork-;  
> * számlák, szerződések, szállítólevelek, CMR-ek és HR-dokumentumok egységes kezelése;  
> * keresztmodulos dokumentumkapcsolatok;  
> * dashboard és iratforgalmi kimutatások;  
> * AI-alapú szerződés- és teljesítésigazolás-generálás;  
> * verziózott, időbélyeges és auditálható dokumentummegőrzés;  
> * konfigurálható, üzleti környezethez igazítható selejtezési és jóváhagyási folyamatok.

EaisyDOCS – elektronikus iratkezelő és iratmegőrző rendszer

A dokumentum a rendelkezésre bocsátott nyers leirat alapján készült. A funkcionális specifikáció a bemutatóban elhangzott jelenlegi működést és fejlesztési javaslatokat rendszerezi.