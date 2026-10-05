# **EaisyDOCS & eaisyHR**

## **Elektronikus Iratkezelő, Ügyirat-életciklus és HR Dokumentumkezelő Platform**
### **Funkcionális Rendszerspecifikáció, Megvalósítási Audit és Jövőbeli Fejlesztési Backlog**

> **Dokumentum Verzió:** 2.0 (Kódbázis-auditált, megvalósításokkal és jövőbeli backloggal kiegészített kiadás)  
> **Dátum:** 2026. október 5.  
> **Állapot:** Érvényes rendszerállapot (106 PostgreSQL migráció, Next.js 15 alkalmazás, ADR A-001–A-030, PRD P-001–P-048 alapján)  
> **Előzmény dokumentum:** `EaisyDOCS_funckiok_es_backlog.md` (Verzió 1.0 – eredeti változatként változatlanul megőrizve)

---

## **Tartalomjegyzék**

1. [Vezetői összefoglaló és aktuális rendszerkép](#1-vezetői-összefoglaló-és-aktuális-rendszerkép)
2. [Éles, megvalósult EaisyDOCS működés (Részletes funkcionális audit)](#2-éles-megvalósult-eaisydocs-működés-részletes-funkcionális-audit)
3. [Szerepkörök, jogosultságok és a 4-dimenziós biztonsági modell](#3-szerepkörök-jogosultságok-és-a-4-dimenziós-biztonsági-modell)
4. [Az éles, kétfázisú iratkezelési életciklus](#4-az-éles-kétfázisú-iratkezelési-életciklus)
5. [Rendszerszintű UI/UX és design szabályok (Linear Flat)](#5-rendszerszintű-uiux-és-design-szabályok-linear-flat)
6. [Az eredeti eldöntendő kérdések felülvizsgálata és megvalósítási státusza](#6-az-eredeti-eldöntendő-kérdések-felülvizsgálata-és-megvalósítási-státusza)
7. [Stratégiai és törvényi (Mt. / Számviteli tv.) javaslatok felülvizsgálata](#7-stratégiai-és-törvényi-mt--számviteli-tv-javaslatok-felülvizsgálata)
8. [Integrációs ökoszisztéma és keresztmodulos kapcsolatok](#8-integrációs-ökoszisztéma-és-keresztmodulos-kapcsolatok)
9. [Új funkciók és részletes jövőbeli fejlesztési backlog](#9-új-funkciók-és-részletes-jövőbeli-fejlesztési-backlog)

---

## **1. Vezetői összefoglaló és aktuális rendszerkép**

Az **EaisyDOCS** egy felhőalapú, böngészőből futó, teljes körű elektronikus iratkezelő, iktató és irattári rendszer. Feladata, hogy a vállalkozáshoz érkező vagy a felhasználók által feltöltött dokumentumokat (számlákat, szerződéseket, hatósági leveleket, bizonylatokat, HR-iratokat) automatizáltan érkeztessen, AI támogatással elemezzen, szabályozottan és hézagmentesen iktasson, feladathoz és felelőshöz rendeljen, kimenő válaszleveleket és csatolmányokat kezeljen, majd az életciklus végén a jogszabályi megőrzési időknek megfelelően hitelesítve selejtezzen vagy digitális irattárban őrizzen.

Az **eaisyHR** a rendszer önálló munkaügyi, bérszámfejtési adatgyűjtő, jelenléti és teljesítményértékelő modulja, amely szorosan kapcsolódik az EaisyDOCS irattári magjához (személyi dosszié híd), de attól függetlenül is önálló termékként licencelhető és működőképes.

### **1.1. Moduláris és funkcionális helyzetkép (v1.0 vs v2.0)**

| Kategória | Eredeti állapot (v1.0) | Aktuális éles állapot (v2.0) | Jövőbeli tervezett bővítés |
| :--- | :--- | :--- | :--- |
| **Érkeztetés & Iktatás** | E-mail figyelés, kézi feltöltés, szkennerhiba, számlaimport. | Automata IMAP daemon, QR-kódos kötegelt szkenner darabolás (P-021), eaisyBill számlaimport, split-view AI mezőfelismeréssel (P-004), realtime ütközésvédelem (P-003). | Cégkapu / Hivatali Kapu közvetlen gép-gép kapcsolat. |
| **Iratkezelés & Életciklus** | Egyszerű lezárás, feladatok elszigetelve. | Kétfázisú életciklus (Elintézés vs Irattározás - P-047), szigorú feladat-validáció, gap-mentes iktatószám tranzakciós zárolással (A-006). | Automatikus ügyirat-összefűzés előzmény alapján. |
| **Kimenő iratok & Válaszok** | Csak manuális válasz feltöltés. | Egységesített kimenő irat modál: levélírás + sablonválasztó + külső PDF csatolmány feltöltése és egyidejű kiküldése egy e-mailben (P-048). | Közvetlen AVDH / e-Szignó digitális aláírás. |
| **Feladatkezelés** | Szabad szöveges feladatok, hiányzó katalógus. | Teljes feladatsablon katalógus (Pénzügy, Jogi, Logisztika, HR), feladat-elutasítás kötelező indoklással (P-046), Kanban, naptár és lista nézet (P-019). | Ismétlődő automatikus periodikus feladatok. |
| **Partnertörzs & CRM** | Csak iktatáskor létrejövő egyszerű partnerek. | Partnertörzs 360° adatlap, belföldi és külföldi adószám szétválasztás (A-023), kapcsolattartók kezelése, `/embed/partner-dossiers` külső iframe widget. | Kétirányú partner szinkronizáció (eaisyDocs ➔ eaisyBill). |
| **Irattár & Selejtezés** | Merev négyszem-elv, állapotmodell anomáliák. | Konfigurálható négyszem-elv (KKV mód vs Vállalati szigor - P-042, A-028), PDF/A-2b normalizálás SHA-256 hash-sel (A-010), nyomtatható selejtezési jegyzőkönyv, fizikai hely & kölcsönzés (P-007). | Minősített RFC 3161 elektronikus időbélyegzés. |
| **UI/UX & Design** | Harsány színek, dobozárnyékok, eltérő táblázatok. | 100% Linear-flat design, 0 box-shadow, szemantikus HSL tokenek, központi `TableToolbar`, kanonikus `KpiCard`, in-place `DocumentViewer` (P-043, A-029). | Felhasználó által átrendezhető egyedi dashboard widgetek. |
| **HR & Munkaügy** | Tervezett elképzelés. | 13 füles 360° dolgozói karton, titkosított BYTEA személyes adatok RPC-vel (A-012), jelenléti zárás & automata túlóra (A-013), ATS toborzás, onboarding/offboarding, munkaszerződés és T1041 generátor. | Mt. 250 órás éves túlóraplafon automatikus blokkolás. |
| **Többvállalatos működés** | Tervezett multitenancy. | Egycéges modell hierarchikus belső szervezeti egységekkel (`szervezeti_egyseg_id`). | 3-szintű valódi multitenancy (Platform ➔ Tenant ➔ Könyvelőirodai többcég-váltó). |

---

## **2. Éles, megvalósult EaisyDOCS működés (Részletes funkcionális audit)**

A rendszerben jelenleg **65 éles PostgreSQL tábla** működik a Supabase adatbázisban, és a Next.js 15 alkalmazás mind a 49 útvonala aktív és működőképes.

### **2.1. Bejövő iratok és érkeztetés (Éles funkció)**
* **Csatornák:** Automatikus háttér IMAP e-mail figyelés (`imap-worker.ts`), kézi drag-and-drop feltöltés, kötegelt szkennelés, cross-project eaisyBill számlaimport.
* **Érkeztetőszám képzés:** Minden bejövő küldemény egyedi érkeztetőszámot kap (`erkeztetoszam`), amely független az iktatószámtól (érkeztetés != iktatás).
* **Minősítési szintek:** `nyilt`, `belso`, `bizalmas`, `szigoruan_bizalmas`.
* **Érkeztetési nézet:** `/inbox` táblázat azonnali kereséssel, szűréssel és gyors előnézettel (`DocumentViewer`).

### **2.2. Kötegelt érkeztetés és automatikus szétválasztás (Javítva és működik – PRD P-021, ADR A-004)**
* A korábbi bemutatóban tapasztalt hiba javításra került.
* A rendszerből az `/api/scanner/separator-sheet` végponton generálható szabványos, vonalkóddal és QR-kóddal ellátott elválasztólap.
* A szkennerbe helyezett elválasztólapok mentén a háttérmotor (`batch-scanner.ts`) a PDF-et önálló dokumentumokra bontja, és minden tételt külön érkeztetett iratként rögzít.

### **2.3. AI-alapú feldolgozás és iktatási Split-View (PRD P-004)**
* Az `/inbox/[id]` iktatási képernyőn párhuzamos split-view nézet működik: bal oldalon a dokumentum memóriabeli Blob URL-en renderelt előnézete (`DocumentPreviewFrame`), jobb oldalon az iktatási űrlap.
* A Google Gemini LLM háttérsor (`ai_feladat_sor`, `ai-worker.ts`) kinyeri a partnernevet, adószámot, bizonylatszámot, összeget, és javaslatot tesz a szervezeti egységre és az irattári tételszámra.
* **Valós idejű ütközésvédelem (PRD P-003):** Supabase Realtime feliratkozással a rendszer azonnal blokkolja és figyelmezteti az ügyintézőt, ha egy másik iktató már megnyitotta vagy iktatta ugyanazt az iratot.

### **2.4. Hézagmentes iktatószám-allokáció (ADR A-006, BRD-001)**
* Az iktatás során az ügyirat végleges, jogszabályi előírásoknak megfelelő iktatószámot kap.
* A sorszámképzés Postgres tranzakciós szinten zárolt (`SELECT ... FOR UPDATE` az `iktatoszam_allokacio` táblán), ami garantálja, hogy soha nem keletkezhet számkihagyás (gap-mentes) és a sorszám nem hasznosítható újra.
* Formátum: `PREFIX/ÉV/SORSZÁM` (pl. `NYILV/2026/00001`, `HR/2026/00042`).

### **2.5. Kimenő iratok, válaszlevelek és egységesített PDF munkafolyamat (PRD P-048)**
* Az ügyirat részletes adatlapján (`/dossiers/[id]`) megvalósult a kimenő iratok és válaszlevelek komplett kezelése.
* **Egységesített kimenő irat modál:** Egyetlen ablakban kezelhető a közvetlen levélírás, a sablonválasztás és a külső PDF csatolmány feltöltése.
* **Többcsatolmányos kiküldés:** A rendszer egyetlen gombnyomásra legenerálja a formázott, A4-es fejlécű hivatalos kísérőlevelet PDF-ben, feltölti a csatolt külső PDF-et (pl. igazolás, szerződés), mindkettőt összekapcsolja az irattal, és e-mailes küldésnél mindkét mellékletet egyszerre továbbítja a partnernek.
* **Lebegő sablon előnézet (`HoverCard`):** A sablonválasztóban a sablonok fölé húzott egérnél azonnal felugró kártyán olvasható a sablon teljes szövegezése, tárgya és karakterszáma.
* **Teljes körű sablonkezelés:** Mind a válaszlevél-, mind a feladatsablonok (a beépítettek is) szerkeszthetők és törölhetők a felületről, a módosítások a `rendszer_beallitas` táblában tárolódnak.

### **2.6. Kétfázisú ügyirat-életciklus és szakmai elintézés (PRD P-047)**
* Szétválasztásra került a szakmai ügyintézés lezárása és a hatósági irattározás:
  1. **Szakmai elintézés (`elintezett`):** Az ügyintéző vagy vezető igazolja, hogy a számlaigazolás, feladatok és válaszlevelek elkészültek. Szigorú feltétel: **minden feladatnak késznek kell lennie (`completedTasks === totalTasks`), és EGYETLEN elutasított feladat sem lehet (`rejectedTasks === 0`)**.
  2. **Hivatalos lezárás és irattározás (`irattarban`):** Az irattáros vagy vezető véglegesíti az aktát, ami elindítja a megőrzési idő számítását és zárolja a dokumentumokat.
  3. **Visszahelyezés ügyintézésbe:** Szükség esetén az elintézett ügyirat visszanyitható.

### **2.7. Fizikai irattár és kölcsönzés (PRD P-007)**
* **Fizikai koordináták rögzítése (`irat_fizikai_hely`):** Épület, helyiség, polc és irattári doboz koordináták kezelése.
* **Kölcsönzési láncolat (`irat_kolcsonzes_naplo`):** Kiadás naplózása (kiadta, átvevő, tervezett visszahozatali határidő).
* Éjszakai cron figyelmeztetés lejárt kölcsönzés esetén.

### **2.8. Digitális irattár és selejtezés (PRD P-002, P-042, ADR A-001, A-028)**
* Az `/archive` felület kezeli a lezárt iratokat, a megőrzési idők figyelését és a selejtezési javaslatokat.
* **Konfigurálható négyszem-elv:** A beállításokban kiválasztható a szigorú négyszem-elv (a felterjesztő nem hagyhatja jóvá a saját csomagját) vagy a KKV egyszerűsített egyfelhasználós mód.
* Nyomtatható hivatalos selejtezési jegyzőkönyv (`/archive/print`).

### **2.9. eaisyHR modul integráció (Adatbázis híd és személyi dosszié – PRD P-025, ADR A-026)**
* Az eaisyDocs és eaisyHR közös adatbázison, de szeparált jogosultságokkal fut.
* Minden dolgozónak automatikusan személyi dossziéja (`ugyirat`) jön létre az eaisyDocs-ban.
* A HR dokumentumok (munkaszerződések, NAV T1041 bejelentők, orvosi vizsgálatok, szabadságengedélyek, kilépő igazolások) közvetlenül az eaisyDocs-ba iktatódnak.

---

## **3. Szerepkörök, jogosultságok és a 4-dimenziós biztonsági modell**

A rendszer a hozzáférés-szabályozást kizárólag **adatbázis szinten (Row Level Security - RLS)** érvényesíti. Egy felhasználó láthatósága négy dimenzió szigorú metszete:

```text
LÁTHATÓSÁG = Szervezeti Egység ∩ Minősítési Szint ∩ Szerepkör ∩ Explicit Hozzárendelés
```

### **3.1. eaisyDocs szerepkörök (`felhasznalo_profil.docs_szerepkor`)**
* **rendszergazda (admin):** Teljes rendszerkonfiguráció, felhasználók és jogosultságok kezelése, irattári terv szerkesztése.
* **iktato:** Érkeztetés, AI adategyeztetés, iktatás, iktatókönyv karbantartása.
* **vezeto:** Osztály iratainak felügyelete, szignálás, feladatkiosztás, selejtezési jóváhagyás.
* **ugyintezo:** Szignált ügyek intézése, feladatok végrehajtása, válaszlevelek írása, szakmai elintézés kezdeményezése.
* **betekinto:** Kizárólagos olvasási jogosultság; a bizalmas iratokat vízjelezve (`api/pdf/[id]`) tekintheti meg.
* **auditor:** Megtekintési jog a teljes iratállományra és kizárólagos olvasási jog a megváltoztathatatlan audit naplóhoz (`esemeny_naplo`).

### **3.2. eaisyHR szerepkörök (`felhasznalo_profil.hr_szerepkor`)**
* **admin:** Teljes HR konfiguráció, munkaköri és szervezeti törzsadatok.
* **hr_vezeto:** Munkaügyi folyamatok, jóváhagyások, toborzás, szerződéskötés, hatósági riportok.
* **hr_munkatars:** Operatív HR ügyintézés, jelenléti ívek ellenőrzése, orvosi alkalmasságok kezelése.
* **dolgozo:** Önkiszolgáló felület (`/hr/self-service`), saját jelenlét, szabadságigénylés, cafeteria és bérlapok.

### **3.3. Append-only audit napló integritás (ADR A-008)**
* Az `esemeny_naplo` és `hr_esemeny_naplo` táblákon adatbázis jogosultsági szinten tiltott az `UPDATE` és `DELETE`.
* Minden művelet (megtekintés, iktatás, státuszváltás, letöltés, kölcsönzés, expediálás) megmásíthatatlanul naplózódik.

---

## **4. Az éles, kétfázisú iratkezelési életciklus**

```text
┌────────────────────────────────────────────────────────┐
│ 1. Érkezés (IMAP, szkenner, feltöltés, eaisyBill)     │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Érkeztetés (Érkeztetőszám, minősítés, előszűrés)   │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Iktatás (AI adategyeztetés, gap-mentes iktatószám) │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. Szignálás & Kiosztás (Osztály / Felelős kijelölése) │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 5. Ügyintézés (Feladatok végrehajtása, válaszlevél     │
│    írása, külső PDF csatolás, expediálás)              │
└──────────────────────────┬─────────────────────────────┘
                           ▼  Feltétel: Minden feladat KÉSZ, 0 elutasított feladat!
┌────────────────────────────────────────────────────────┐
│ 6. Szakmai Elintézés (elintezett státusz)              │
│    (Bármikor visszahelyezhető ügyintézés alá)          │
└──────────────────────────┬─────────────────────────────┘
                           ▼  Vezető / Irattáros jóváhagyás
┌────────────────────────────────────────────────────────┐
│ 7. Lezárás & Irattározás (irattarban státusz)          │
│    (Megőrzési idő indítása, fizikai hely rögzítése)    │
└──────────────────────────┬─────────────────────────────┘
                           ▼  Megőrzési idő lejárta (pl. 8 év)
┌────────────────────────────────────────────────────────┐
│ 8. Selejtezési folyamat (Javaslat ➔ 4-szem jóváhagyás  │
│    ➔ Nyomtatott jegyzőkönyv ➔ Fizikai megsemmisítés)   │
└────────────────────────────────────────────────────────┘
```

---

## **5. Rendszerszintű UI/UX és design szabályok (Linear Flat)**

A rendszer felületei szigorúan a platformszintű **Linear-inspirált flat design** szabályokat követik (ADR [A-029](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), PRD [P-043](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/product/decisions/P-043-global-ui-consistency-and-unified-components.md)):

1. **Zéró dobozárnyék (`shadow-*` tilalom):** Minden kártya, modál és panel 1px-es finom kerettel rendelkezik. Hover esetén kizárólag a keret színe világosodik (`hover:border-primary/40`). A lebegő árnyékok használata tilos.
2. **Kizárólag Szemantikus HSL Színek:** Nyers Tailwind színek (`emerald`, `amber`, `blue`, stb.) és beégetett hex kódok használata tilos. Kizárólag a platformszintű tokenek érvényesek: `primary`, `success`, `warning`, `info`, `destructive`, `muted`.
3. **Központi `TableToolbar` Komponens:**
   * Minden táblázat felett egységes eszköztár található.
   * **Bal oldalon:** Keresőmező (`Search` ikon, valós idejű gépelés, `X` törlőgomb).
   * **Jobb oldalon:** Oszlopválasztó Popover és zöld/teal **`Szűrés` Popover Gomb** dátumtartománnyal, kategória-checkboxokkal és aktív szűrő jelvénnyel.
4. **Kanonikus `KpiCard`:** Letisztult statisztikai kártyák dekoratív ikonok, emojik és vastag bal oldali színes szegélyek nélkül.
5. **Kompakt Táblázatok (`.compact-table`):** Fix 45px sor- és fejlécmagasság, kötelező `<div className="overflow-x-auto">` vízszintes görgetésvédelemmel.
6. **In-Place Dokumentum Betekintő (`DocumentViewer`):** Az iratlistákból az előnézet azonnal felugró modálban nyílik meg, a felhasználó soha nem kényszerül az oldal elhagyására egy PDF megtekintése miatt.

---

## **6. Az eredeti eldöntendő kérdések felülvizsgálata és megvalósítási státusza**

Az `EaisyDOCS_funckiok_es_backlog.md` (v1.0) 8. fejezetében szereplő 19 eldöntendő kérdés tételes szakmai felülvizsgálata a mai kódbázis tükrében:

### **8.1. Feladatkatalógus**
* **Eredeti állapot:** 🟡 Részben kész.
* **Jelenlegi státusz:** ✅ **TELJESEN KÉSZ A KÓDBAN**
* **Megvalósítás:** Elkészült a `TaskTemplatePicker` komponens és a feladatsablonok katalógusa. Előre definiált sablonok működnek: Pénzügy / Számla (jóváhagyás, kifizetés engedélyezés), Szerződés (jogi felülvizsgálat), Logisztika (CMR egyeztetés) és HR kategóriákban. Bármelyik sablon szerkeszthető és törölhető a felületről, a testreszabások a `rendszer_beallitas` táblában tárolódnak.

### **8.2. Feladatállapotok és Elutasítás**
* **Eredeti állapot:** 🟡 Részben kész.
* **Jelenlegi státusz:** ✅ **TELJESEN KÉSZ A KÓDBAN (PRD P-046, P-047)**
* **Megvalósítás:** A feladatok állapota: `uj`, `folyamatban`, `kesz`, `elutasitva`. Feladat elutasításakor a `TaskRejectDialog` kötelező szöveges indoklást kér, amely diszkrét kurzív idézetként jelenik meg. Bevezetésre került a szigorú elintézési gát: ha akár 1 elutasított feladat is van az ügyiratban, az ügyirat nem intézhető el!

### **8.3. Automatikus szignálás**
* **Eredeti állapot:** ✅ Részben kész.
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN**
* **Megvalósítás:** Kétlépcsős modell: az AI javaslatot tesz a Szervezeti Egységre (`szervezeti_egyseg_id`), a vezető pedig kijelöli a felelős ügyintézőt, vagy az ügyintéző magához veszi az ügyet.

### **8.4. Minősítési szintek**
* **Eredeti állapot:** ✅ Kész az adatbázisban.
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN (ADR A-007)**
* **Megvalósítás:** 4 szint (`nyilt`, `belso`, `bizalmas`, `szigoruan_bizalmas`) érvényesül az RLS-ben és a felületen. A bizalmas iratok megnyitásakor az `/api/pdf/[id]` dinamikus vörös vízjelezést alkalmaz a jogosulatlan szivárogtatás megelőzésére.

### **8.5. Explicit megosztás**
* **Eredeti állapot:** 🟡 Részben kész.
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN (PRD P-022)**
* **Megvalósítás:** Az `ugyirat_hozzaferes` tábla és a `dossier-access-dialog.tsx` segítségével a felelős vagy vezető megoszthatja az ügyiratot más osztállyal vagy személlyel, olvasási vagy szerkesztési joggal, akár lejárati határidővel ellátva.

### **8.6. Kötegelt érkeztetés és elválasztólap**
* **Eredeti állapot:** Bemutatóban hibásan működött.
* **Jelenlegi státusz:** ✅ **JAVÍTVA ÉS KÉSZ (PRD P-021, ADR A-004)**
* **Megvalósítás:** Az `/api/scanner/separator-sheet` generálja a vonalkódos fedőlapot. A `batch-scanner.ts` és `scanner-hotfolder.ts` a háttérben hibatűrő streaming darabolást végez és tételenként érkezteti a köteget.

### **8.7. Selejtezési állapotgép**
* **Eredeti állapot:** ✅ Kész (ADR A-001, BRD-002).
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN**
* **Megvalósítás:** Szigorú életciklus: Irattárban ➔ Selejtezhető ➔ Selejtezésre javasolt ➔ Jóváhagyva ➔ Selejtezve. A selejtezett iratok fizikai és elektronikus példánya törlődik, de a metaadatok és a hivatalos PDF jegyzőkönyv örökre megmarad.

### **8.8. Megőrzési idők**
* **Eredeti állapot:** 🟡 Részben konfigurálható.
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN**
* **Megvalósítás:** Az `irattari_terv` tábla és az `irattari-terv-manager.tsx` tartalmazza a hatályos magyar jogszabályok szerinti megőrzési időket (számvitel 8 év, Ptk. 5 év, HR nem selejtezhető), amelyek a beállításokban admin által bővíthetők és módosíthatók.

### **8.9. Selejtezési jóváhagyás és négyszem-elv**
* **Eredeti állapot:** Szigorú négyszem-elv megvalósítva.
* **Jelenlegi státusz:** ✅ **KÉSZ ÉS KONFIGURÁLHATÓ (ADR A-028, PRD P-042, BRD-008)**
* **Megvalósítás:** A `/settings` felületen az admin beállíthatja, hogy a szervezet szigorú négyszem-elvet követeljen-e meg (nagyvállalat), vagy engedélyezze az egyfelhasználós egyszerűsített selejtezést (kis KKV).

### **8.10. Partneradat-forrás (eaisyBill vs. eaisyDocs kapcsolat)**
* **Eredeti állapot:** Egyirányú import kész.
* **Jelenlegi státusz:** ✅ **KÉSZ ÉS DOKUMENTÁLT (ADR A-023, A-024, PRD P-024)**
* **Megvalósítás:**
  * Az eaisyBill külön adatbázison fut. Számlaimportkor az eaisyDocs a partner adószáma vagy neve alapján azonosítja vagy létrehozza a helyi partnert (`findOrCreatePartner`).
  * Szétválasztásra került a belföldi 11 jegyű adószám (`adoszam`) és a külföldi / EU adóazonosító (`kulfoldi_adoszam`).
  * Partnertörzs 360° adatlap kapcsolattartókkal és beágyazható iframe nézettel (`/embed/partner-dossiers`).

### **8.11. Tenantmodell (Multi-tenancy és többcég-kezelés)**
* **Eredeti állapot:** Tervezett javaslat.
* **Jelenlegi státusz:** 📋 **JÖVŐBELI BACKLOG TÉTEL (Lásd 9. fejezet)**
* **Helyzet:** Az adatbázis jelenleg egycéges belső szervezeti egységekkel. A többvállalatos könyvelőirodai architektúra a 3. fázis kiemelt fejlesztése.

### **8.12. CMR- és fuvarmegbízás egyeztetés**
* **Eredeti állapot:** Tervezett javaslat.
* **Jelenlegi státusz:** 📋 **JÖVŐBELI BACKLOG TÉTEL (Lásd 9. fejezet)**
* **Helyzet:** A polimorf `irat_kapcsolat` tábla felkészült a kapcsolat tárolására, a dedikált diszkrepancia-vizsgáló modul a 2. fázis része.

### **8.13. HR-adatvédelem és érzékeny adatok**
* **Eredeti állapot:** ✅ Kész (ADR A-012).
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN**
* **Megvalósítás:** Titkosított BYTEA mezők (`hr_dolgozo_titkos_adat`: TAJ, adóazonosító, bankszámla, bruttó/nettó bér), kizárólag Security Definer RPC-n (`get_decrypted_hr_data`) keresztül hozzáférhető a jogosult HR szerepkörök számára.

### **8.14. Szerződésgenerálás és sablonkezelés**
* **Eredeti állapot:** Tervezett javaslat.
* **Jelenlegi státusz:** ✅ **RÉSZBEN KÉSZ ÉS KITERJESZTVE**
* **Megvalósítás:**
  * Az eaisyDocs-ban megvalósult a sablonos válaszlevél és PDF generálás (PRD P-048).
  * Az eaisyHR-ben elkészült a hivatalos munkaszerződés generátor (Mt. 42–45. §, PRD P-037), a tanulmányi szerződés (PRD P-030) és az Mt. 46. § tájékoztató (PRD P-039).
  * Nyitott / Backlog tétel: Általános kereskedelmi és megbízási szerződések prompt-alapú AI generálása az eaisyDocs-ban.

### **8.15. Elektronikus aláírás**
* **Eredeti állapot:** Kétlépcsős stratégiai javaslat.
* **Jelenlegi státusz:** ✅ **1. FÁZIS KÉSZ A KÓDBAN (PRD P-033)**
* **Megvalósítás:** Külsőleg aláírt (AVDH, e-Szignó vagy szkennelt) dokumentumpéldányok feltöltése, verziózása, SHA-256 hash ellenőrzése és PDF/A-2b archiválása működik.
* Nyitott / Backlog tétel: Közvetlen bizalmi szolgáltatói API integráció az alkalmazáson belüli aláíráshoz.

### **8.16. Értesítési szabályok és csatornák**
* **Eredeti állapot:** 🟡 Részben kész.
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN (ADR A-021)**
* **Megvalósítás:** Alkalmazáson belüli harang értesítések (`NotificationBell`), éles SMTP e-mail küldés csatolmányokkal (`mailer.ts`), éjszakai felügyeleti cron (`/api/cron/nightly`) határidő-figyeléssel és 3 napos vezetői eszkalációval.

### **8.17. CRM-kapcsolatok**
* **Eredeti állapot:** Részben kész.
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN (ADR A-011, PRD P-009, P-020)**
* **Megvalósítás:** Polimorf `irat_kapcsolat` link gráf, Partner 360° ügyiratlista, és az `/embed/partner-dossiers` beágyazható nézet, amellyel külső CRM rendszerek iframe-ben megjeleníthetik a partner iratait.

### **8.18. Dashboard és vezetői mutatók**
* **Eredeti állapot:** ✅ Kész (PRD P-001).
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN**
* **Megvalósítás:** A `/` főoldalon interaktív Recharts grafikonok (havi forgalmi volumen, érkezési csatornák megoszlása), sürgős határidők visszaszámlálója, kanonikus `KpiCard`-ok.

### **8.19. Betekintő vs. Auditor szerepkör**
* **Eredeti állapot:** ✅ Kész (ADR A-007).
* **Jelenlegi státusz:** ✅ **KÉSZ A KÓDBAN**
* **Megvalósítás:** A Betekintő kizárólag a számára engedélyezett dokumentumokat nézheti meg vízjelezve; az Auditor a nyers eseménynaplót (`esemeny_naplo`), a selejtezési jegyzőkönyveket és az integritási hasheket vizsgálhatja.

---

## **7. Stratégiai és törvényi (Mt. / Számviteli tv.) javaslatok felülvizsgálata**

Az eredeti dokumentum 9. fejezetében szereplő 10 stratégiai javaslat felülvizsgálata:

| Azonosító és Téma | Eredeti javaslat | Jelenlegi kódstátusz |
| :--- | :--- | :--- |
| **9.1. Hiteles digitális archiválás (1/2018 ITM rendelet)** | Zárt rendszerű megőrzés időbélyegzővel a papír ledarálásához. | 🟡 **Részben kész:** SHA-256 hash és PDF/A-2b generálás működik (A-010). Minősített időbélyegző API integrációja a jövőbeli backlog része. |
| **9.2. Cégkapu / Hivatali Kapu integráció** | Gép-gép kapcsolat a hivatalos hatósági küldeményekhez. | 📋 **Jövőbeli backlog tétel.** |
| **9.3. Fizikai irattári lokáció és polcrendszer** | Doboz és polc koordináták kezelése. | ✅ **KÉSZ A KÓDBAN:** `irat_fizikai_hely`, `physical-location-dialog.tsx`, `borrow-dialog.tsx` (P-007). |
| **9.4. Verziózási zárolás és ütközésvédelem** | Szerkesztési zárolás és ütközésmentesítés. | ✅ **KÉSZ A KÓDBAN:** Realtime ütközésvédelem az iktatásnál (P-003). |
| **9.5. Beépített GDPR adatkitakarás (Redaction)** | PDF nézőkében személyes adatok végleges kitakarása. | 📋 **Jövőbeli backlog tétel.** |
| **9.6. Mt. munkaidő-keret és pihenőidő motor** | 11 órás pihenőidő, 48 órás heti korlát és túlóra ellenőrzés. | 🟡 **Részben kész:** Jelenléti ív zárás és automatikus túlóraszámítás kész (A-013). 250 órás limit blokkolás: backlog. |
| **9.7. Foglalkozás-egészségügyi és munkavédelmi életciklus** | Lejáró orvosi alkalmasság és munkavédelmi jegyzőkönyvek. | ✅ **KÉSZ A KÓDBAN:** `hr_orvosi_vizsgalat`, lejárati figyelmeztetés, munkavédelmi oktatási jegyzőkönyv generálás (P-028, P-036). |
| **9.8. Offboarding és Mt. 80. § kilépő igazolások** | 5 munkanapos törvényi igazolás-kiadás garanciája. | ✅ **KÉSZ A KÓDBAN:** Törvényes kilépő igazolások generálása és iktatása az eaisyDocs-ba (P-040, P-041). |
| **9.9. Szabadságkiadási szabályok és 14 napos pihenés** | Mt. 122. § szerinti szabadság-nyilvántartás. | ✅ **KÉSZ A KÓDBAN:** Hivatalos éves szabadság-nyilvántartó lap (Mt. 134. §) PDF generátorral (P-027). |
| **9.10. Elektronikus bérjegyzék és átvételi nyugtázás** | Bérlapok digitális átadása és audit naplózása. | ✅ **KÉSZ A KÓDBAN:** Titkosított béradatok, dolgozói portál, másodperc-pontos audit naplózás (A-012). |

---

## **8. Integrációs ökoszisztéma és keresztmodulos kapcsolatok**

Az EaisyDOCS központi dokumentumkezelő rétegként kapcsolódik a vállalat egyéb rendszereihez:

```text
┌────────────────────────────────────────────────────────┐
│                        EaisyDOCS                       │
│  (Központi Iratkezelő, Iktató, Irattár és Keresőmotor) │
└───────▲─────────────────▲─────────────────▲────────────┘
        │                 │                 │
        │ Belső híd       │ Biztonságos API │ Polimorf link
        │ (Közös DB)      │ (Számlaimport)  │ (Iframe widget)
        ▼                 ▼                 ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│   eaisyHR    │   │  eaisyBill   │   │  Külső ERP / CRM │
│ (Munkaügy és │   │ (Pénzügyi és │   │ (Ügyfélkapcsolat │
│ Bérszámfejtés)   │ Számlázó Rsz)│   │ és Megrendelések)│
└──────────────┘   └──────────────┘   └──────────────────┘
```

* **eaisyHR Kapcsolat:** Azonos adatbázis, polimorf kapcsolatok, automatikus személyi dosszié (`ugyirat`) és dokumentum-iktatás.
* **eaisyBill Kapcsolat:** Független adatbázis és szerver, API alapú számlalekérés, partner-deduplikáció, közvetlen számla PDF hivatkozás duplikáció nélkül.
* **CRM / ERP Kapcsolat:** Az `/embed/partner-dossiers` widgettel bármely webes ügyfélkezelő rendszer egy iframe beágyazással megjelenítheti a partnerhez tartozó összes szerződést és számlát.

---

## **9. Új funkciók és részletes jövőbeli fejlesztési backlog**

Az alábbi fejezet összefoglalja a közvetlenül előttünk álló és stratégiai feladatokat, 4 logikus megvalósítási fázisra bontva:

```text
┌────────────────────────────────────────────────────────┐
│ Fázis 1: Közvetlen Következő Lépések (Next Milestones) │
│ • Kétirányú eaisyBill szinkron (Új szállító átadása)   │
│ • Általános szerződés- és megállapodásgenerátor (AI)   │
│ • Minősített RFC 3161 időbélyegzés (1/2018 ITM rendelet)│
│ • PDF Redaction (GDPR adatkitakarás a nézőkében)       │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Fázis 2: Bővített ERP & Szállítmányozási Modulok       │
│ • CMR és Fuvarmegbízás egyeztető modul (EasyWheel)     │
│ • EasyWare raktári szállítólevél párosítás             │
│ • Cégkapu / Hivatali Kapu gép-gép kapcsolat           │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Fázis 3: Vállalati & Könyvelőirodai Multitenancy       │
│ • Adatbázis tenant_id sémamigráció & RLS szigorítás    │
│ • Fejlécbeli Cégváltó (Tenant Switcher) könyvelőknek   │
│ • Tenant-szintű kvóták, tárhely és licencmenedzsment   │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ Fázis 4: Minősített Digitális Aláírási Rendszer        │
│ • Közvetlen e-Szignó / DocuSign / AVDH API integráció  │
│ • Kétfaktoros aláírási jóváhagyási lánc                │
└────────────────────────────────────────────────────────┘
```

---

### **9.1. Fázis 1: Közvetlen Következő Lépések (Next Milestones)**

#### **B1. Kétirányú eaisyBill szinkronizáció (Új partner átadása eaisyDocs ➔ eaisyBill)**
* **Üzleti cél:** Jelenleg az importálás egyirányú (eaisyBill ➔ eaisyDocs). Ha az eaisyDocs-ba érkezik egy új szállítói számla vagy szerződés egy még ismeretlen partnertől, az ügyintézőnek ne kelljen manuálisan újra felvinnie a partnert az eaisyBill-ben is.
* **Megvalósítás:**
  * Az eaisyDocs partner adatlapján és az iktatási felületen megjelenő gomb: `[ ↗ Átadás eaisyBillbe mint új partner ]`.
  * Hívás az eaisyBill REST API-jára a belföldi adószámmal, névvel, székhellyel és bankszámlaszámmal.
  * Visszakapott eaisyBill partner UUID rögzítése az `irat_kapcsolat` táblában.

#### **B2. Általános üzleti szerződés- és megállapodás-generátor (AI Prompt alapon) – ✅ Megvalósítva (PRD P-049)**
* **Üzleti cél:** Az eaisyDocs-ban kereskedelmi, titoktartási (NDA), megbízási, szolgáltatási keretszerződési és teljesítésigazolási szerződések készítése AI támogatással és automatikus iktatással.
* **Megvalósítás (Éles állapot):**
  * Sablonkezelő felület és motor 5 beépített szerződéstípussal (`megbizasi`, `nda`, `keretszerzodes`, `teljesites_igazolas`, `egyedi`).
  * Természetes nyelvű AI prompt mező és mintaprompt chipek Gemini 2.5 Flash generátorral és determinisztikus tartalék motorral.
  * Élő szöveges előnézet és közvetlen szerkesztési lehetőség.
  * Hivatalos, WinAnsi kódolásbiztos, kétoldalú cégszerű aláírási blokkal ellátott A4 formátumú PDF generálás (`generateContractPdfBuffer`).
  * Automatikus iktatási híd új ügyirat nyitásával vagy meglévőhöz csatolással, kimenő iratként (`irany = 'kimeno'`), SHA-256 hash ellenőrzéssel és append-only audit naplózással.
  * Opcionális azonnali e-mailes partner-expedíció csatolt PDF-fel.
  * Integrálva a Partner adatlapon (`/partners/[id]`) és a Partnertáblázatban (`/partners`).

#### **B3. Minősített elektronikus időbélyegzés (1/2018. ITM rendelet szerinti zárt archiválás)**
* **Üzleti cél:** Jogilag hiteles elektronikus archívum létrehozása, amely lehetővé teszi, hogy a vállalkozások a papíralapú számlákat és bizonylatokat az iktatás után törvényesen ledarálhassák / megsemmisíthessék.
* **Megvalósítás:**
  * Integráció minősített bizalmi szolgáltatóval (RFC 3161 Timestamping Authority, pl. Microsec vagy NetLock).
  * A háttérben futó PDF/A-2b konvertálás után a szolgáltató API-ján keresztül időbélyeg beágyazása a PDF állományba.
  * Időbélyeg-érvényesség és tanúsítvány metaadatok tárolása az `irat_fajl` táblában.

#### **B4. PDF Redaction (Beépített GDPR adatkitakarás a DocumentViewerben)**
* **Üzleti cél:** Ha egy bizalmas dokumentumot (pl. bankszámlakivonatot, orvosi igazolást vagy szerződést) külső partnernek vagy nem jogosult személynek kell kiadni, a személyes, banki és védett adatok végleges eltávolítása.
* **Megvalósítás:**
  * A `DocumentViewer` bővítése egy „Adatkitakarás” eszköztárral (kijelölhető területek).
  * Szerveroldali `pdf-lib` / `sharp` feldolgozás: nem csupán fekete téglalap rajzolása, hanem a szövegréteg és képpontok fizikai, visszaállíthatatlan törlése.
  * Új, anonimizált verzió mentése az irathoz (`_redacted.pdf`).

---

### **9.2. Fázis 2: Bővített ERP & Szállítmányozási Integrációk**

#### **B5. Szállítmányozási dokumentumkezelés és számla–CMR egyeztetés (EasyWheel)**
* **Üzleti cél:** Fuvarozó és logisztikai cégeknél a számla, a fuvarmegbízás és a leigazolt CMR automatikus párosítása, fuvardiszkrepanciák felderítése kifizetés előtt.
* **Megvalósítás:**
  * Számla és CMR dokumentumok intelligens összekapcsolása a fuvar referenciaszám, CMR szám, rendszám és dátumtartomány alapján.
  * Automatikus összehasonlító algoritmus: egyezés esetén zöld `Egyeztetve` jelvény; összeg- vagy paritáseltérés esetén sárga `Eltérés vizsgálatra vár` státusz.
  * Eltérés esetén automatikus feladat generálása a logisztikai felelősnek a partnerrel való egyeztetésre.

#### **B6. EasyWare raktári szállítólevél és beszerzési bizonylat integráció**
* **Üzleti cél:** A raktári bevételezéskor keletkező szállítólevelek és a pénzügyre érkező szállítói számlák automatikus összerendelése.
* **Megvalósítás:**
  * Az EasyWare rendszerből érkező raktári bevételezések és beszerzési megrendelések fogadása.
  * Beszállító, bizonylatszám és mennyiségi tételek egyeztetése.
  * A szállítólevél és számla kölcsönös elérhetősége egyetlen kattintással.

#### **B7. Cégkapu / Hivatali Kapu közvetlen gép-gép kapcsolat**
* **Üzleti cél:** A NAV-tól, bíróságoktól, kormányhivataloktól és önkormányzatoktól érkező hivatalos beadványok és határozatok automatikus letöltése és érkeztetése, kiküszöbölve az emberi mulasztást.
* **Megvalósítás:**
  * Hivatali Kapu gép-gép interfész (M2M) kliens.
  * Érkező küldemények automatikus letöltése és titkosítás-feloldása.
  * Iktatás az `/inbox`-ba, az AI által felismert jogvesztő határidő (pl. 8 vagy 15 nap) automatikus rögzítése, azonnali push/e-mail riasztás a cégvezetőnek és a jogásznak.

---

### **9.3. Fázis 3: Vállalati & Könyvelőirodai Multitenancy (Többcég-kezelés)**

#### **B8. Adatbázis szintű Multi-Tenancy sémamigráció**
* **Üzleti cél:** Egyetlen központi infrastruktúrán több független cég vagy egy könyvelőiroda több tucat ügyfélcégének biztonságos kiszolgálása, garantálva, hogy a cégek soha ne láthassanak át egymás irataiba.
* **Megvalósítás:**
  * `tenant` törzstábla létrehozása (cégnév, adószám, licenc, beállítások).
  * `tenant_id` kötelező idegen kulcs hozzáadása minden alaptáblához (`ugy`, `ugyirat`, `irat`, `partner`, `irattari_terv`, `felhasznalo_profil`).
  * Az RLS házirendek kiegészítése a `tenant_id` szigorú ellenőrzésével (`auth.jwt() -> tenant_id`).

#### **B9. Könyvelőirodai Cégváltó (Tenant Switcher)**
* **Üzleti cél:** Egy könyvelő vagy szolgáltató egyetlen fiókkal léphessen be, és a képernyő tetején lévő elegáns cégválasztóval válthasson az ügyfelei között anélkül, hogy ki-be kellene jelentkeznie.
* **Megvalósítás:**
  * Felhasználó-Tenant hozzárendelési tábla (`felhasznalo_tenant_kapcsolat`).
  * Fejléc cégválasztó komponens aktív cégnévvel és logóval.
  * Cégváltáskor a session kontextus frissül, és azonnal az adott ügyfél iratai és iktatókönyve jelenik meg.

#### **B10. Tenant-szintű kvóták és licencmenedzsment**
* **Megvalósítás:** Tárhelykvóta (GB), havi iktatott iratszám és aktív felhasználószám figyelése; figyelmeztető riasztások és adminisztrátori statisztikák.

---

### **9.4. Fázis 4: Minősített Digitális Aláírási Szolgáltatók**

#### **B11. Közvetlen e-Szignó / DocuSign / AVDH API integráció**
* **Üzleti cél:** Ahelyett, hogy a felhasználónak le kellene töltenie a szerződést, külön felületen aláírnia és visszatöltenie, az aláírási folyamat közvetlenül az eaisyDocs felületéről legyen indítható.
* **Megvalósítás:**
  * Szerződés vagy válaszlevél mellett `[ ✍ Digitális Aláírás Indítása ]` gomb.
  * Címzettek és aláírók sorrendjének megadása.
  * Kétfaktoros SMS vagy e-mail megerősítés.
  * Aláírás befejezésekor a hitelesített dokumentum automatikusan visszakerül az ügyiratba mint végleges, aláírt verzió.

#### **B12. AI Üzleti Szerződés- és Megállapodásgenerátor Kiegészítő Bővítmények (P-049)**
* **Üzleti cél:** Az elkészült és élesített szerződésgenerátor kényelmi, nemzetközi és kockázatkezelési továbbfejlesztése.
* **Tervezett funkciók:**
  1. **Lejárati és felülvizsgálati emlékeztető feladat:** A szerződés futamideje alapján automatikus belső feladat generálása 30 nappal a lejárat előtt.
  2. **Kétnyelvű (Magyar – Angol) generálás:** Nemzetközi partnerek esetén szakaszonkénti vagy párhuzamos angol-magyar szövegképzés.
  3. **Partner 360° Aktív Szerződések Widget:** A partner fejlécében kiemelt státusz a hatályos keretmegállapodásokról és azok keretösszegéről.

---

## **10. Összegzés és Megvalósítási Útiterv**

Az **EaisyDOCS és eaisyHR** az elvégzett fejlesztések révén az egyszerű irattári nyilvántartóból egy **teljes körű, modern, Linear-flat felépítésű vállalati iratkezelési és munkaügyi ökoszisztémává** fejlődött:

* Az alapvető iratkezelési életciklus (érkeztetés, AI split-view iktatás, gap-mentes sorszámozás, kétfázisú szakmai elintézés, kimenő válaszlevelek PDF generálása és e-mailes expediálása, fizikai irattár, konfigurálható 4-szem selejtezés) **100%-ban megvalósult és működik**.
* Az eaisyHR integráció a titkosított személyes adatokkal, jelenléti zárással, automatikus túlóraszámítással, munkaszerződés- és T1041-generálással stabilan üzemel a közös adatbázison.
* A termék következő evolúciós lépése a **kétirányú eaisyBill partner-szinkronizáció**, a **kereskedelmi szerződésgenerátor**, az **1/2018. ITM rendelet szerinti minősített időbélyegzés**, valamint a **könyvelőirodai multitenancy** megvalósítása.
