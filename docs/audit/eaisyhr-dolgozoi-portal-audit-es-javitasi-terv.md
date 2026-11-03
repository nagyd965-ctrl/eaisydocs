# 📋 eaisyHR Dolgozói Portál (Self-Service) – Részletes Audit és Javítási Terv

> **Dokumentum státusz:** Végrehajtás alatt (I. fázis kiemelt fejlesztései megvalósítva: 1., 3., 9. pontok kész és élesítve)  
> **Dátum:** 2026. október 19.  
> **Auditált modul:** eaisyHR – Dolgozói Portál (Önkiszolgáló Munkavállalói Felület)  
> **Környezet:** Helyi Next.js 15 fejlesztői szerver, hitelesített éles munkamenet, Supabase PostgreSQL backend  

---

## 📌 1. Vezetői Összefoglaló és Általános Rendszerállapot

Az audit célja a **Dolgozói Portál** mind a 6 aloldalának mélyreható átvizsgálása valós, bejelentkezett felhasználói munkamenet mellett (`Nagy Dániel` dolgozói fiók), párhuzamosan a böngészőben történő működési ellenőrzéssel és a mögöttes React/TypeScript forráskódok vizsgálatával.

### Főbb megállapítások:
* **Általános stabilitás:** Mind a 6 aloldal sikeresen, hibamentesen renderelődik. Nincsenek futásidejű Next.js hibák vagy böngésző konzol összeomlások.
* **Dizájn rendszer illeszkedés:** Az oldalak zömmel követik az **ADR A-029** és a Linear-inspirált flat dizájnt (nincsenek lebegő árnyékok, Tailwind HSL szemantikus tokenek működnek, a tipográfia egységes).
* **Megvalósított javítások:** A kritikus cafeteria KPI évszám-bug elhárítva és leváltva Munkaidő Egyenlegre, a jogviszony `.maybeSingle()` lekérdezése stabilizálva, a saját profil tehermentesítve, és megvalósult a dedikált **Dokumentumaim** (`/hr/self-service/documents`) oldal kanonikus `TableToolbar` Popover szűréssel és univerzális `DocumentViewer` in-place betekintéssel.

---

## 🔍 2. Részletes Oldalankénti Audit

---

### 2.1. Áttekintés (`/hr`)
* **Oldal útvonal:** `/hr`  
* **Fő forrásfájl:** [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx)  
* **Főbb komponensek:** `TimeTrackingCard`, `KpiCard`, `StatusBadge`

#### Jelenlegi működés és pozitívumok:
* Személyre szabott üdvözlő banner a munkavállaló nevével és mai dátummal.
* 4 db Linear-flat KPI kártya: Szabadság egyenleg (alap + pótszabadság), Függő jóváhagyások száma, **Munkaidő egyenleg (óra:perc formátumban)**, Aktív célkitűzések.
* In-place jelenlét-rögzítő widget (`TimeTrackingCard`), amellyel a dolgozó egyetlen kattintással becsekkolhat, ebédszünetet rögzíthet vagy kicsekkolhat.
* Legutóbbi kérelmek és teljesítménycélok előnézete közvetlen hivatkozásokkal.

#### Feltárt hibák és anomáliák:
1. **Cafeteria KPI értékhiba (Kritikus UI hiba) – [✅ MEGOLDVA - ADR A-074]:**  
   * *Helye:* `src/app/hr/page.tsx`, 216. sor  
   * *Korábbi probléma:* A kártya a tényleges keretösszeg helyett az évszámot (**„2026”**) jelenítette meg kiemelt számként, ráadásul a cafeteria adatok alatta a kártyákon és az oldalsávban is elérhetők.  
   * *Megbeszélt döntés & Megvalósítás:* A cafeteria kártyát leváltottuk a napi operatív működés szempontjából kulcsfontosságú **Munkaidő Egyenleg** (`hr_tulora_egyenleg.perc`) KPI kártyára. A kártya formázott óra:perc értéket (`formatOvertime`) és dinamikus feliratot mutat, rákattintva közvetlen hivatkozással a jelenléti ívre (`/hr/self-service/time`).
2. **Globális eseménynapló lekérés (Adatbiztonság):**  
   * *Helye:* `src/app/hr/page.tsx`, 140. sor  
   * *Hatás:* A `hr_esemeny_naplo` lekérdezése `supabaseAdmin` klienssel történik, és nincs `dolgozo_id` szűrő az eseményekre. Emiatt a dolgozói előzmények közé más munkavállalók KPI eseményei is bekerülhetnek.

#### Fejlesztési javaslatok:
* **Interaktív KPI kártyák:** A kártyákra kattintva közvetlen gyorsművelet nyílhatna (pl. a Szabadság kártyára kattintva azonnal felugró *Szabadságigénylés* modál).
* **Műszak vége kalkuláció:** A becsekkolás után a widget valós időben jelezze a várható napi munkaidő végét (pl. 8 óra munka + 30 perc ebédszünet alapján a becsült távozási időt).

---

### 2.2. Profilom (`/hr/self-service/profile`)
* **Oldal útvonal:** `/hr/self-service/profile`  
* **Fő forrásfájl:** [`src/app/hr/self-service/profile/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/profile/page.tsx)  
* **Főbb komponensek:** `PersonalDataCard`, `JobDescriptionAcknowledgment`, `ChangePasswordCard`

#### Jelenlegi működés és pozitívumok:
* Teljes körű személyes adatlap, lakcím, elérhetőségek.
* Munkaköri leírás blokk (FEOR kód, munkaköri cél, felelősségi körök, elvárt kompetenciák, közvetlen felettes).
* Munkavédelmi oktatási érvényesség és foglalkozás-egészségügyi orvosi alkalmasság lejárati figyelmeztetéssel.
* **Bizalmas adatok védelme:** A TAJ szám, adóazonosító, bankszámlaszám és alapbér alapértelmezésben maszkolt (`••••••••`). Felfedésük kattintásra történik, amit a rendszer a `hr_esemeny_naplo` táblában GDPR auditként rögzít.
* **Letisztult felület:** A profiloldalról kivezetésre került a korábbi korlátozott 5 tételes dokumentumkártya, így az oldal 100%-ban a dolgozói törzsadatokra és érvényességekre koncentrál.

#### Feltárt hibák és anomáliák:
1. **PGRST116 hiba kockázat hiányzó jogviszonynál – [✅ MEGOLDVA]:**  
   * *Helye:* `src/app/hr/self-service/profile/page.tsx`, 38–42. sor  
   * *Korábbi probléma:* A `supabase.from("hr_jogviszony").select(...).eq("dolgozo_id", ...).single()` hívás 406-os hibával elszállt, ha egy frissen rögzített munkavállalónak még nem volt aktív munkaviszony sora.  
   * *Megvalósítás:* Átírva `.maybeSingle()`-re hibatűrő fallbackkel.
2. **Tiltott dizájnelem a személyes kártyán (ADR A-029 megsértése):**  
   * *Helye:* `src/components/hr/personal-data-card.tsx`, 79. sor  
   * *Kód:* `absolute top-0 left-0 w-1 h-full bg-destructive/50`  
   * *Hatás:* Aszimmetrikus bal oldali piros csík, ami kifejezetten tiltott a projekt globális flat dizájnszabályzatában.
3. **Kritikus törzsadatok közvetlen módosíthatósága:**  
   * A dolgozó a felületen közvetlenül átírhatja az adóazonosító jelét és a TAJ számát. Ha a dolgozó elgépeli, az a havi NAV T1041-es és 08-as bevallás elutasítását eredményezi.  
   * *Javítás:* Ezeket a mezőket csak olvashatóvá (read-only) kell tenni, és egy „Adatváltozás bejelentése” kérelem gombot kell biztosítani a HR felé.

#### Megbeszélt és Megvalósított Fejlesztések (ADR A-074 & PRD P-098):
* **Személyes iratok kiváltása önálló oldalra („B” opció) – [✅ MEGOLDVA]:**  
  * *Probléma:* A korábbi `Legutóbbi Dokumentumaim` doboz mindössze 5 elemet jelenített meg (`.limit(5)`), így a friss havi jelenlétek és szabadságok miatt az alapvető iratok (munkaszerződés, orvosi alkalmassági vélemény) kiszorultak a listából.  
  * *Megbeszélt döntés:* A csonka 5 tételes dobozt kivezettük a profiloldalról, megszüntetve a redundanciát, és helyette létrehoztuk az önálló, teljes körű **`Dokumentumaim`** (`/hr/self-service/documents`) oldalt a bal oldalsávban.
* **Beépített dokumentum előnézet (`DocumentViewer`) in-place megtekintés – [✅ MEGOLDVA]:**  
  * A felhasználói kérésnek megfelelően a közvetlen letöltés mellett (`Letöltés` gomb) beépítettük a `Megtekintés` gombot, amely az egységes `DocumentViewer` modálban helyben nyitja meg a PDF/kép fájlokat.  
  * A `DocumentViewer` univerzálissá vált: az eaisyDocs-ban iktatott iratoknál vízjelezett `/api/pdf/[id]` auditált megjelenítés, a nem iktatott HR fájloknál rövid élettartamú (60s) aláírt URL fallback (`getSignedFileUrl`).  
  * A letöltési végpont jogosultsága (`/api/hr/download-document/route.ts`) javítva lett a pontos tárolási útvonalak (`url`, `alairt_fajl_url`) ellenőrzésére.
* **Vészhelyzeti hozzátartozó:** Külön blokk rögzítése baleset vagy vészhelyzet esetén értesítendő személyre (név, rokonsági fok, telefonszám).

---

### 2.3. Jelenlét & Szabadság (`/hr/self-service/time`)
* **Oldal útvonal:** `/hr/self-service/time`  
* **Fő forrásfájl:** [`src/app/hr/self-service/time/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/time/page.tsx)  
* **Főbb komponensek:** `EmployeeTimesheet`, `LeaveHistoryList`, `LeaveRequestDialog`, `MissingTimeRequestDialog`

#### Jelenlegi működés és pozitívumok:
* Túlóra és hiányzó munkaidő egyenleg kijelzése másodperc/perc pontossággal (pl. `-28 ó 32 p`).
* Távolléti napok (fizetett szabadság, betegszabadság, táppénz) megoszlása.
* Havi jelenléti ív lapozható havi bontásban, munkanaponkénti érkezési, távozási és szünet adatokkal.
* Korrekciós kérelem elfelejtett csekkolás esetén.
* Szabadságigénylés dialógus helyettesítő kolléga kiválasztásával.

#### Feltárt hibák és anomáliák:
1. **Alapértelmezetten összecsukott jelenléti ív:**  
   * *Helye:* `src/components/hr/employee-timesheet.tsx`  
   * *Hatás:* A havi táblázat `isExpanded = false` állapottal indul, így az oldal megnyitásakor a dolgozó nem látja a napjait, külön a fejléc sávra kell kattintania.  
   * *Javítás:* Az aktuális hónap automatikusan nyitva induljon (`true`).
2. **Munkanap vs. naptári nap téves számítás a történetben – [✅ MEGOLDVA]:**  
   * *Helye:* `src/components/hr/leave-history-list.tsx`, `src/utils/hr/leave-calculator.ts`  
   * *Megoldás:* A korábbi naiv naptári nap (`durationDays`) helyett a rendszer bevezette a valós munkanap (`calculateWorkingDays`) kalkulációt, amely figyelembe veszi a hétvégéket és a `hr_munkaszuneti_nap` táblából lekérdezett hivatalos nemzeti ünnepeket, illetve támaszkodik a mentett `munkanapok_szama` mezőre. A kártyákon a felirat `(X munkanap)` formátumban jelenik meg. A dátumléptetési időzóna-eltolódási hiba szintén javítva lett, egységtesztekkel lefedve.
3. **Multi-tenant elszigetelés hiánya a helyettesítőknél – [✅ MEGOLDVA]:**  
   * *Helye:* `src/app/hr/self-service/time/page.tsx`, `src/app/hr/self-service/actions.ts`  
   * *Megoldás:* Az `availableUsers` lekérdezés szigorúan az aktív cégre (`company_id`, `company_members`) szűrve fut le, kizárva az idegen cégek dolgozóit. A `saveSubstitute` és `deleteSubstitute` szerver akciók szintén rögzítik a `company_id`-t, beépített szerveroldali jogosultsági ellenőrzéssel és `/hr/self-service/time` útvonal újragenerálással (revalidation). Az aktív helyettes lekérdezés szintén céges elszigetelést kapott.

#### Fejlesztési javaslatok:
* **Munkaszüneti nap integráció:** A szabadságigénylő űrlap a dátumtartomány kiválasztásakor automatikusan vegye figyelembe a hivatalos magyar munkaszüneti napokat és az áthelyezett munkanapokat (`hr_munkaszuneti_nap` tábla).
* **Naptár nézet:** A táblázat mellett egy diszkrét havi naptárnézet sokat segítene a heti lefedettség és túlórák gyors áttekintésében.

---

### 2.4. Fejlődési Tervem (`/hr/self-service/idp`)
* **Oldal útvonal:** `/hr/self-service/idp`  
* **Fő forrásfájl:** [`src/app/hr/self-service/idp/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/idp/page.tsx)  
* **Főbb komponensek:** `EmployeeIdpView`, `ProgressBar`, `StatusBadge`

#### Jelenlegi működés és pozitívumok:
* Karrier- és kompetenciafejlesztési célok (IDP) átlátható kártyás megjelenítése.
* Célkitűzés leírása, kapcsolódó kompetenciák, elvárt határidő, prioritás és mentor neve.
* 0–100% közötti vizuális haladási sáv és státusz jelvények (Tervezett, Jóváhagyva, Folyamatban, Teljesítve).

#### Feltárt hibák és anomáliák:
* Kódszintű vagy renderelési hiba nincs. A felület gyors és reszponzív.

#### Fejlesztési javaslatok:
* **Bizonyítvány / Tanúsítvány feltöltés:** A teljesített célokhoz (pl. tanfolyam elvégzése) a dolgozó közvetlenül csatolhasson elvégzést igazoló dokumentumot (PDF, oklevél másolat), amely automatikusan bekerül a HR dokumentumtárába és a jóváhagyó vezető elé.
* **Szűrési lehetőség:** Státusz szerinti szűrés (Aktív / Befejezett), hogy a régebbi célok ne nyújtsák el az oldalt.

---

### 2.5. Bérpapírjaim (`/hr/self-service/payroll`)
* **Oldal útvonal:** `/hr/self-service/payroll`  
* **Fő forrásfájl:** [`src/app/hr/self-service/payroll/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/payroll/page.tsx)  
* **Főbb komponensek:** `MyPayslipsView`

#### Jelenlegi működés és pozitívumok:
* Mt. 155. § szerinti hivatalos havi elszámolások listája.
* Részletes bérbontás: alapbér, túlóra pótlék, adómentes juttatások, adókedvezmények (pl. 25 év alattiak SZJA-mentessége), levont járulékok (SZJA, TB), nettó kifizetés.
* **Hiteles elektronikus átvétel:** Digitális nyugtázási funkció (időbélyeg és SHA-256 hash tárolásával), ami jogilag igazolja a bérjegyzék munkavállaló általi átvételét.
* Közvetlen PDF bérlap letöltés.

#### Feltárt hibák és anomáliák:
* Nincs aktív hiba, a számítások és az átvételi állapot mentése megbízható.

#### Fejlesztési javaslatok:
* **Éves összesítő sáv (KPI):** Év elejétől göngyölített kimutatás (összes kifizetett nettó bér, befizetett SZJA és TB), ami a munkavállaló számára hasznos tájékoztatás pl. hiteligénylés vagy adóbevallás esetén.
* **Reklamáció / Kérdés a bérszámfejtőhöz:** Közvetlen gomb az adott havi bérlap mellett, amellyel a dolgozó belső üzenetet vagy észrevételt küldhet a bérszámfejtésnek (pl. elszámolt túlóra vagy szabadság eltérés esetén).

---

### 2.6. Belső Állások (`/hr/self-service/career`)
* **Oldal útvonal:** `/hr/self-service/career`  
* **Fő forrásfájl:** [`src/app/hr/self-service/career/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/career/page.tsx)  

#### Jelenlegi működés és pozitívumok:
* Cégen belüli nyitott pozíciók (`is_internal = true`) kártyás listázása.
* Munkavégzés helye, foglalkoztatási forma, pozíció leírása és közvetlen ugrás a jelentkezési űrlapra.

#### Feltárt hibák és anomáliák:
* **Tesztadatok:** Az adatbázisban a *„Flotta kezelő”* állás leírása mindössze `"asd"`. Célszerű a demó adatokat valósághű pozícióleírással frissíteni.

#### Fejlesztési javaslatok:
* **Kereső és szűrősáv – [✅ MEGOLDVA]:**  
  * A platformszintű kanonikus `TableToolbar` és 4 db Linear Flat `KpiCard` beépítésre került a pozíciók felett.
  * Instant szöveges keresés pozíció nevére, leírására, munkakörre és részlegre.
  * Szűrés Popover: dinamikus részlegválasztó az aktív állások darabszámaival (pl. `Fejlesztés (2)`), valamint jelleg szerinti szűrés (`Csak belső`, `Publikus`).
  * Aktív szűrőszámláló jelvény és szűrők azonnali visszaállítása.
* **Munkavállalói ajánlás (Referral):** Lehetőség külsős ismerős vagy szakember ajánlására egy egyszerű űrlapon keresztül.

---

### 2.7. Dokumentumaim (`/hr/self-service/documents`) – [✅ ÚJ DEDIKÁLT ALOLDAL]
* **Oldal útvonal:** `/hr/self-service/documents`  
* **Fő forrásfájlok:** [`src/app/hr/self-service/documents/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/documents/page.tsx), [`src/components/hr/employee-documents-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-documents-view.tsx)  
* **Főbb komponensek:** `EmployeeDocumentsView`, `TableToolbar`, `KpiCard`, `DocumentViewer`, `StatusBadge`
* **Kapcsolódó döntések:** [ADR A-074](../architecture/decisions/A-074-universal-document-viewer-and-employee-documents-architecture.md), [PRD P-098](../product/decisions/P-098-employee-self-service-documents-page-and-profile-declutter-ux.md)

#### Megvalósított működés és pozitívumok:
* **Önálló menüpont az oldalsávban:** A Dolgozói Portálban a Profilom alatt közvetlenül elérhető a `Dokumentumaim` navigáció (`FileText` ikon).
* **Teljes körű iratállomány:** Megszűnt az 5 tételes korlátozás; a nézet a munkavállalóhoz tartozó összes iratot lekérdezi a `hr_dokumentum` táblából (munkaszerződések, havi jelenléti ívek, szabadság-nyilvántartás, orvosi alkalmassági, cafeteria nyilatkozat, tanulmányi szerződés, NAV T1041 hatósági bejelentők, kitüntetések).
* **4 db Linear Flat KPI kártya (ADR A-029):** *Összes Irat*, *Hivatalosan Iktatva*, *Aláírt Példányok*, *Legutóbbi Irat* letisztult stílusban, ikonok és aszimmetrikus szegélyek nélkül.
* **Kanonikus `TableToolbar` és Szűrés Popover (ADR A-029):**
  * Vízszintes pill-gombok helyett a szabványos keresősáv és zöld `Szűrés` Popover.
  * Popover szűrőcsoportok: dinamikus naptári időszak, kategória-jelölőnégyzetek valós darabszámlálóval, valamint iktatott/aláírt állapotkapcsolók.
* **Kettős iratművelet:** Minden kártya mellett helyben elérhető a **`Megtekintés`** (univerzális in-place `DocumentViewer` vízjelezett PDF vagy aláírt URL előnézettel) és a **`Letöltés`** (közvetlen fájlmentés a `/api/hr/download-document` végponton).
* **Visszamenőleges kompatibilitás:** A korábbi `/hr/self-service/dokumentumok` útvonal automatikusan a `/hr/self-service/documents`-re irányít át.

---

## 📋 3. Strukturált Teendők és Javítási Terv

Az alábbi táblázat prioritás és kategória szerint foglalja össze az elvégzendő feladatokat:

| # | Pont Címe | Érintett Fájl | Prioritás | Kategória | Megvalósítás Részletei / Megjegyzés |
|---|---|---|---|---|---|
| **1.** | **Cafeteria KPI kártya leváltása Munkaidő Egyenlegre** | [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx) | ✅ **Kész** | Bugfix / UX | Megvalósítva: formázott óra:perc (`hr_tulora_egyenleg.perc`), közvetlen navigáció a munkaidőre ([ADR A-074](../architecture/decisions/A-074-universal-document-viewer-and-employee-documents-architecture.md)) |
| **2.** | **PersonalDataCard tiltott bal szegély kivezetése** | [`src/components/hr/personal-data-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/personal-data-card.tsx) | P1 (Magas) | Dizájn / ADR A-029 | Következő lépés: `w-1 bg-destructive/50` eltávolítása |
| **3.** | **Jogviszony lekérdezés `.maybeSingle()` javítása** | [`src/app/hr/self-service/profile/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/profile/page.tsx) | ✅ **Kész** | Stabilitás / DB | Megvalósítva: `.maybeSingle()` beépítve, 406 PostgREST hiba elhárítva |
| **4.** | **Szabadságtörténet munkanap-kalkuláció pontosítása** | [`src/components/hr/leave-history-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-history-list.tsx) | ✅ **Kész** | Üzleti logika / Mt. | Megvalósítva: Mt. szerinti valós munkanapok kalkulációja (`calculateWorkingDays` + nemzeti ünnepek a `hr_munkaszuneti_nap`-ból), időzóna-javítás, 11 db egységteszt |
| **5.** | **Havi jelenléti ív alapértelmezett kinyitása** | [`src/components/hr/employee-timesheet.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-timesheet.tsx) | P1 (Magas) | UX / Kényelem | Következő lépés: aktuális hónap `isExpanded = true` |
| **6.** | **Áttekintés eseménynapló dolgozói szűrése** | [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx) | P1 (Magas) | Adatbiztonság | Következő lépés: `dolgozo_id` szűrő az eseménynaplóhoz |
| **7.** | **Helyettesítő választó cég-elszigetelése** | [`src/app/hr/self-service/time/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/time/page.tsx) | ✅ **Kész** | Multi-tenant | Megvalósítva: `availableUsers` és aktív helyettes lekérdezés szigorúan `company_id` és `company_members` szerint szűrve; szerveroldali védelem a `saveSubstitute`-ban |
| **8.** | **Szenzitív törzsadatok védelme (Read-only + kérelem)** | [`src/components/hr/personal-data-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/personal-data-card.tsx) | P2 (Közepes) | Biztonság / NAV | Következő lépés: TAJ és adóazonosító védelme elgépelés ellen |
| **9.** | **Önálló „Dokumentumaim” oldal (`/hr/self-service/documents`) + DocumentViewer** | [`src/app/hr/self-service/documents/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/documents/page.tsx) | ✅ **Kész** | Új Modul / UX | Megvalósítva: önálló oldal, 4 KPI kártya, TableToolbar Popover, DocumentViewer előnézet + letöltés ([ADR A-074](../architecture/decisions/A-074-universal-document-viewer-and-employee-documents-architecture.md), [PRD P-098](../product/decisions/P-098-employee-self-service-documents-page-and-profile-declutter-ux.md)) |
| **10.** | **Belső állások kereső és szűrősáv (TableToolbar + KPI)** | [`src/app/hr/self-service/career/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/career/page.tsx) | ✅ **Kész** | Funkció / UX | Megvalósítva: `InternalCareerView`, 4 KPI kártya, `TableToolbar` instant keresővel, dinamikus részlegszűrővel és jelleg-választóval, belső állások 404 hiba elhárítása a részletező oldalon |
| **11.** | **Dolgozói ajánlás (Referral) és fix bónusz beállítás („A” opció)** | [`src/app/hr/self-service/career/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/career/page.tsx) | ✅ **Kész** | Új Rendszer / HR | Megvalósítva: „A” opció (Álláshirdetések és Saját ajánlásaim fülek), `ReferralDialog` modál, `MyReferralsView`, fix cég-szintű bónuszbeállítás (`CompanySettingsTab`), `hr_dolgozoi_ajanlas` tábla és RLS elszigetelés, ATS híd ([ADR A-075](../architecture/decisions/A-075-employee-referral-system-and-configurable-bonus-architecture.md), [PRD P-099](../product/decisions/P-099-employee-referral-system-and-configurable-bonus-ux.md), [BRD-011](../business/decisions/011-employee-referral-system-and-bonus-governance.md)) |
| **12.** | **Fejlődési Terv (IDP) státusz szűrés** | [`src/components/hr/employee-idp-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-idp-view.tsx) | P3 (Kényelmi) | UX | Nyitott |
| **13.** | **Munkaszüneti napok integrációja a szabadságkérőbe** | [`src/components/hr/leave-request-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-request-dialog.tsx) | P2 (Közepes) | Üzleti logika | Nyitott |
| **14.** | **Éves göngyölített bérösszesítő sáv a Bérpapírjaim oldalon** | [`src/components/hr/my-payslips-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/my-payslips-view.tsx) | P3 (Kényelmi) | Funkció | Nyitott |
| **15.** | **Bérlap észrevétel / kérdés küldése a bérszámfejtőnek** | [`src/components/hr/my-payslips-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/my-payslips-view.tsx) | P3 (Kényelmi) | Funkció | Nyitott |

---

## 🎯 4. Végrehajtási Státusz és Következő Lépések

### ✅ Már Megvalósított és Élesített Fejlesztések:
1. **Munkaidő Egyenleg KPI kártya (`/hr`):**  
   A redundáns és hibás ("2026") cafeteria kártya helyett beépítésre került a valós **Munkaidő Egyenleg** (`hr_tulora_egyenleg.perc`) óra:perc formátummal (`formatOvertime`) és közvetlen ugrással a jelenléti ívre.
2. **Profiloldal Stabilitás és Tehermentesítés (`/hr/self-service/profile`):**  
   - A `.maybeSingle()` lekérdezéssel megszűnt az új belépőknél fellépő 406-os hiba.
   - A korlátozott 5 tételes `RecentDocumentsCard` eltávolításra került a profiloldalról („B” opció), így a felület tiszta, áttekinthető munkavállalói adatlappá vált.
3. **Új Dedikált „Dokumentumaim” Oldal (`/hr/self-service/documents`):**  
   - Beépítve a Dolgozói Portál oldalsávjába (`FileText` ikon).
   - Mind a 12 db munkavállalói irat teljes körűen listázva (szerződések, orvosi alkalmassági, jelenléti ívek, cafeteria nyilatkozat, hatósági T1041-esek).
   - 4 db Linear Flat `KpiCard` a fejlécben.
4. **Kanonikus `TableToolbar` Popover Szűrés (ADR A-029):**  
   Az ad-hoc pill-gombok helyett a platform szabványos eszköztára került beépítésre: keresőmező, oszlopválasztó, naptári intervallum szűrő, kategória-jelölőnégyzetek dinamikus darabszámlálóval és státuszkapcsolók.
5. **Univerzális `DocumentViewer` és Letöltés:**  
   In-place PDF előnézet vízjelezéssel és auditálással az iktatott iratoknál, aláírt URL fallbackkel a még nem iktatott fájloknál, közvetlen letöltési lehetőséggel és jogosultság-ellenőrzéssel.
6. **Szabadságtörténet Mt. szerinti Munkanap Kalkuláció (`/hr/self-service/time`):**  
   A korábbi naptári különbség helyett valós munkanapok levonása és kijelzése `(X munkanap)` formátumban. A `calculateWorkingDays` algoritmus kezeli a hétvégéket és a `hr_munkaszuneti_nap` táblából érkező hivatalos nemzeti ünnepeket. A napváltási időzóna eltolódás javítva, 11 db egységteszttel igazolva.
7. **Helyettesítő Választó Multi-Tenant Elszigetelés (`/hr/self-service/time`):**  
   Az `availableUsers` kizárólag az aktív szervezet/cég (`company_id`, `company_members`) munkatársait jeleníti meg. A szerveroldali `saveSubstitute` és `deleteSubstitute` akciók ellenőrzik a cégtagságot és rögzítik a `company_id`-t, kizárva az adatszivárgást és a téves cégközi helyettesítést.
8. **Belső Álláshirdetések Kereső és Részleg Szűrő Sáv (`/hr/self-service/career`):**  
   Megvalósítva az `InternalCareerView` kliens komponens a szabványos `TableToolbar`-ral: instant keresőmező, dinamikus részleg/szervezeti egység szűrő valós darabszámokkal (`hr_szervezeti_egyseg`), állás jellege szűrő (`is_internal`, `publikus`), valamint 4 db Linear Flat `KpiCard` (Nyitott pozíciók, Belső pályázatok, Érintett területek, Legfrissebb kiírás). A belső állások 404-es hibája a részletező oldalon (`/karrier/[id]`) szintén javítva lett.
9. **Dolgozói Ajánlási Rendszer és Fix Beállítható Bónusz („A” Opció):**  
   - Kétfülös elrendezés a `/hr/self-service/career` oldalon: **Álláshirdetések** és **Saját ajánlásaim** fül valós darabszám jelvénnyel.
   - Minden álláskártyán külön `[Ajánlás]` gomb pozíció előválasztással + globális `[+ Ismerős ajánlása]` gomb a fejlécben.
   - `ReferralDialog` modál: jelölt adatok, CV feltöltés és validáció (max 10MB PDF/DOCX), indoklás, GDPR nyilatkozat és fix bónusz kiemelő sáv.
   - `MyReferralsView`: 4 Linear Flat KPI kártya, TableToolbar szűrés és keresés, toborzási pipeline és bónusz státusz életciklus, önéletrajz letöltés aláírt URL-lel.
   - Fix bónusz cégbeállítás: A cégtulajdonos/admin a `/hr/settings` oldalon a "Cég" fülön testreszabhatja a sikerdíj összegét (`companies.referral_bonus_amount`), alapértelmezetten 150 000 Ft.
   - Adatbázis és RLS védelem: `hr_dolgozoi_ajanlas` tábla multi-tenant elszigeteléssel és automatikus összekapcsolással a toborzási folyamattal (`hr_toborzas`).
10. **Rendszerdokumentáció Szinkronizáció:**  
    Rögzítésre került az **ADR A-075**, a **PRD P-099**, a **BRD-011**, frissült az audit terv és a központi változásnapló (`changelog.md`).

### 📌 Hátralévő Nyitott Feladatok (Javasolt Végrehajtási Sorrend):
1. **2. pont (P1):** `PersonalDataCard` tiltott aszimmetrikus bal piros szegélyének (`w-1 bg-destructive/50`) eltávolítása az ADR A-029 flat dizájn szabvány szerint.
2. **5. pont (P1):** `EmployeeTimesheet` havi jelenléti ív alapértelmezett kinyitása (`isExpanded = true`).
3. **6. pont (P1):** Áttekintés eseménynapló szűrése dolgozói azonosítóra (`dolgozo_id`).
4. **8. pont (P2):** Érzékeny azonosítók (TAJ, adójel) védelme: dolgozói read-only megjelenítés és hivatalos adatváltozás-bejelentési kérelem indítása.
