# EaisyDOCS és EaisyHR – Továbbfejlesztési Feladatlista (Task Roadmap v1.2)

> **Forrásdokumentum:** `EaisyDOCS és EaisyHR továbbfejlesztés v 1.2.md`  
> **Létrehozva:** 2026. október 9.  
> **Állapot:** Tervezet / Végrehajtásra kész  
> **Technológiai alapok:** Next.js 15 (App Router), Supabase (PostgreSQL, RLS), Tailwind CSS, shadcn/ui, Gemini 2.5 Flash

---

## 📊 Vezetői Áttekintő és Task Mátrix

| Azonosító | Modul | Cím és Funkcionális Terület | Eredeti Hivatkozás | Prioritás | Becsült Komplexitás | Státusz |
|---|---|---|---|---|---|---|
| **TASK-01** | `[Docs]` | Feladatkatalógus és egymásba nyíló modálok megszüntetése | DOC-01 | 🔴 Magas | Közepes | ⏳ Tervezett |
| **TASK-02** | `[Közös]` | Személyes profil (`/profile`) és Rendszerbeállítások (`/settings`) szétválasztása | DOC-03 | 🔴 Magas | Kisebb | ⏳ Tervezett |
| **TASK-03** | `[HR]` | Munkavédelmi és tűzvédelmi oktatások központi lejárati mátrixa | HR-04 | 🟡 Közepes | Kisebb | ⏳ Tervezett |
| **TASK-04** | `[Közös]` | EaisyBILL felhasználói adatforrás és import szinkronizáció | DOC-04 | 🟡 Közepes | Közepes | ⏳ Tervezett |
| **TASK-05** | `[HR]` | eaisyHR többcég-kezelés és szervezeti izoláció véglegesítése | DOC-05 | 🔴 Magas | Nagy | ⏳ Tervezett |
| **TASK-06** | `[Docs]` | Speditőr fuvariratok (CMR, megbízás) automatikus gyűjtése munkaszámhoz | DOC-06 | 🔴 Magas | Nagy | ⏳ Tervezett |
| **TASK-07** | `[Docs]` | Többszintű fuvar-kategorizálás, AI címkéző motor és speciális kereső | DOC-07 | 🔴 Magas | Nagy | ⏳ Tervezett |
| **TASK-08** | `[HR]` | Előzetes Műszaktervező modul és naptár (`/hr/time/shifts`) | HR-01 | 🟡 Közepes | Nagy | ⏳ Tervezett |
| **TASK-09** | `[HR]` | Munkaidőkorlátok (48 óra) és éves rendkívüli munkaidő (túlóra) számláló | HR-02 | 🟡 Közepes | Közepes | ⏳ Tervezett |
| **TASK-10** | `[HR]` | Szabadságkiadási megfelelőség (14 nap egybefüggő + novemberi riasztás) | HR-03 | 🟡 Közepes | Közepes | ⏳ Tervezett |
| **TASK-11** | `[HR]` | Orvosi alkalmassági és beosztási blokkolás összehangolása | HR-05 | 🟢 Kisebb | Kisebb | ⏳ Tervezett |
| **TASK-12** | `[HR / Docs]` | Offboarding kötelező kilépőigazolások és eaisyDocs személyi dosszié iktatás | HR-06 | 🟡 Közepes | Közepes | ⏳ Tervezett |
| **TASK-13** | `[HR]` | Ütemezett bérpapír előállítás és dolgozói digitális átvételi nyugtázás | HR-07 | 🟡 Közepes | Közepes | ⏳ Tervezett |
| **TASK-14** | `[Docs]` | Elektronikus hitelesítés és távoli aláírás feltárása (Kutatási feladat) | DOC-08 | 🔵 Kutatás | Max. 2 óra | ⏳ Tervezett |

---

## 📌 1. FÁZIS: Gyors UI/UX Tisztítás és Strukturális Rendszerezés

### TASK-01: Feladatkatalógus és egymásba nyíló modálok megszüntetése
- **Eredeti hivatkozás:** DOC-01
- **Hatókör:** `[Docs]`
- **Cél:** A többszörösen egymásba nyíló felugró ablakok (modálok) megszüntetése a feladatok felvételekor, közvetlen sablonkatalógus integrációval.
- **Jelenlegi állapot:** Az iratkezelési vagy ügyirat oldalon az „Új feladat” gombra kattintva egy párbeszédpanel nyílik meg, amiből a sablonok kiválasztásakor egy újabb modál ugrott fel a meglévő tetejére, rontva a használhatóságot.
- **Megvalósítási lépések:**
  1. Az egymásba ágyazott modálok feloldása: a feladatfelvétel paneljében a sablonok közvetlenül elérhetővé válnak (pl. fülváltóként: *„Egyedi feladat”* vs. *„Sablonból választás”*, vagy egyetlen legördülő/kártyás katalógusként).
  2. A feladatsablonok közvetlenül kitöltik a cím, leírás, határidő és felelős mezőket.
  3. A meglévő feladat állapotgép megőrzése: `nyitott` → `folyamatban` → `teljesítve` → `lezárva`.
- **Érintett fájlok:**
  - `src/components/task-dialog.tsx`
  - `src/components/template-dialog.tsx`
  - `src/app/tasks/page.tsx`
  - `src/app/dossiers/[id]/tasks-tab.tsx`
- **Elfogadási feltétel (DoD):** Feladat létrehozása sablonból legfeljebb 1 modálon belül vagy közvetlen in-place felületen megtörténik, soha nem nyílik modálra újabb modál.

---

### TASK-02: Személyes profil és Rendszerbeállítások szétválasztása
- **Eredeti hivatkozás:** DOC-03
- **Hatókör:** `[Közös]`
- **Cél:** A jelenlegi túlzsúfolt Beállítások menü szétbontása saját fiókkezelésre és szervezeti adminisztrációra.
- **Jelenlegi állapot:** A fogaskerék ikon mögött minden beállítás egyetlen oldalon (`/settings`) szerepel, beleértve a felhasználó saját jelszavát, 2FA-ját, a cégbeállításokat, irattári tervet és szervezetfát.
- **Megvalósítási lépések:**
  1. **Új Személyes Profil oldal (`/profile`):**
     - Saját név, e-mail cím, profilkép / avatár.
     - Jelszócsere és biztonsági beállítások.
     - Kétlépcsős azonosítás (TOTP / 2FA QR-kód aktiválás).
     - Saját értesítési preferenciák.
  2. **Megújított Rendszeradminisztráció (`/settings`):**
     - Vállalati profil és logó (Multi-Tenancy).
     - Céges Iktatási és AI Szabályok (`/rules`).
     - Szervezeti Egységek (Osztályok) fája.
     - Csapattagok, szerepkörök és jogosultságok.
     - Irattári terv, megőrzési idők és selejtezési szabályzat (négyszem-elv).
  3. Felső jobb sarokban a felhasználói menüpontok frissítése: „Profilom” (`/profile`) és „Rendszerbeállítások” (`/settings`, adminoknak).
- **Érintett fájlok:**
  - `src/app/profile/page.tsx` (Új útvonal)
  - `src/app/settings/page.tsx`
  - `src/components/user-nav.tsx`
  - `src/components/app-sidebar.tsx`
- **Elfogadási feltétel (DoD):** Sima felhasználó csak a saját profilját szerkesztheti a `/profile` alatt; a rendszeradminisztráció tisztán a cég és iratkezelés beállításaira fókuszál.

---

### TASK-03: Munkavédelmi és tűzvédelmi oktatások központi lejárati mátrixa
- **Eredeti hivatkozás:** HR-04
- **Hatókör:** `[HR]`
- **Cél:** Az oktatások és jegyzőkönyvek érvényességének egyetlen összesített, áttekinthető táblázatban való megjelenítése.
- **Jelenlegi állapot:** Az oktatási adatok és jegyzőkönyvek rögzítésre kerülnek az adatbázisban, de csak dolgozónként külön-külön megnyitva ellenőrizhetők.
- **Megvalósítási lépések:**
  1. A Munkaügyi Megfelelőség (`/hr/compliance`) felület kiegészítése egy új **„Oktatási Nyilvántartás”** füllel / táblázattal.
  2. KPI kártyák a felület tetején:
     - *Érvényes oktatások száma*
     - *30 napon belül lejáró oktatások (sárga figyelmeztetés)*
     - *Lejárt oktatású dolgozók (piros riasztás)*
  3. Standard `TableToolbar` használata (kereső + lejárati dátum szerinti szűrés + CSV export).
  4. Közvetlen hivatkozás az oktatási jegyzőkönyv iktatott iratára az eaisyDocs-ban.
- **Érintett fájlok:**
  - `src/app/hr/compliance/page.tsx`
  - `src/components/hr/safety-training-table.tsx`
  - `src/app/hr/compliance/actions.ts`
- **Elfogadási feltétel (DoD):** A HR-es 1 másodperc alatt látja a teljes cégre kiterjedően, hogy kinek járt le vagy jár le hamarosan a munka- vagy tűzvédelmi oktatása.

---

## 📌 2. FÁZIS: EaisyBILL Ökoszisztéma & Multi-Tenancy Integráció

### TASK-04: EaisyBILL felhasználói adatforrás és szinkronizáció
- **Eredeti hivatkozás:** DOC-04
- **Hatókör:** `[Közös]`
- **Cél:** Felhasználók importálása az EaisyBILL központi adatbázisából kézi újra-rögzítés nélkül.
- **Megvalósítási lépések:**
  1. Új művelet a Csapatkezelésnél: **„Felhasználók importálása EaisyBILL-ből”**.
  2. Dialog a forrásrendszerből elérhető munkatársak listájával, jelölőnégyzettel és szerepkör-választóval.
  3. Szelektív átvétel: a felhasználó eldöntheti, hogy kit hoz be (pl. belső dolgozókat igen, külső könyvelőt nem).
  4. Létező fiókok egyezésének ellenőrzése e-mail cím alapján (duplikációvédelem).
- **Érintett fájlok:**
  - `src/app/settings/team-tab.tsx`
  - `src/app/settings/eaisybill-user-actions.ts`
- **Elfogadási feltétel (DoD):** Az adminisztrátor egy kattintással átveheti az EaisyBILL-ben már létező felhasználókat anélkül, hogy manuálisan kellene beírnia az adataikat.

---

### TASK-05: eaisyHR többcég-kezelés és szervezeti izoláció véglegesítése
- **Eredeti hivatkozás:** DOC-05 & HR Koncepció
- **Hatókör:** `[HR]`
- **Cél:** Az eaisyHR teljes elválasztása cégek szerint (`company_id`), biztosítva a szigorú GDPR és munkajogi béradat-védelmet.
- **Megvalósítási lépések:**
  1. A dolgozói rekordok kötelező cég-hozzárendelése: `hr_alkalmazott.company_id`.
  2. Szerverkomponensek és szerverakciók szűrése az aktív cégre (`getActiveCompanyIdServer()`):
     - Munkatársak névsora (`/hr/admin`)
     - Jelenléti ívek és jóváhagyások (`/hr/time`, `/hr/manager`)
     - Toborzási álláshirdetések és jelöltek (`/hr/recruitment`)
  3. Cégváltás reaktivitásának biztosítása (`key={companyScope}`).
- **Érintett fájlok:**
  - `src/app/hr/admin/page.tsx`
  - `src/app/hr/time/page.tsx`
  - `src/app/hr/manager/page.tsx`
  - `src/app/hr/recruitment/page.tsx`
  - `src/app/hr/employee/[id]/page.tsx`
- **Elfogadási feltétel (DoD):** A felső cégválasztó átváltásakor a HR felület azonnal az adott cég dolgozóira, jelenléti íveire és adataira szűr, más cég bér- vagy személyi adatai soha nem látszódnak.

---

## 📌 3. FÁZIS: Speditőr és Fuvarirat Modul (Kiemelt Üzleti Érték)

### TASK-06: Speditőr fuvariratok automatikus gyűjtése munkaszámhoz
- **Eredeti hivatkozás:** DOC-06
- **Hatókör:** `[Docs]`
- **Cél:** Egy szállításhoz tartozó iratanyag (CMR, fuvarlevél, fuvarmegbízás, számla) automatikus összegyűjtése egyetlen közös ügyiratba munkaszám / projektszám alapján.
- **Megvalósítási lépések:**
  1. **Azonosító felismerés:** E-mailből (EaisyBILL) vagy közvetlen feltöltésből beérkező fuvariratok esetén az AI és a regex felismeri a munkaszámot (pl. `MSZ-2026/0412`, projektazonosítót vagy megrendelésszámot).
  2. **Automatikus összerendelés:**
     - Ha a munkaszámhoz már létezik nyitott ügyirat / dosszié, az új irat automatikusan alszámként beiktatódik mellé.
     - Ha még nem létezik, automatikusan létrejön az adott fuvar gyűjtőügyirata.
  3. **Egyesített irategyüttes nézet:** Az ügyirat adatlapján egy kattintással elérhető az adott fuvar valamennyi dokumentuma (kb. 5–10 irat).
- **Érintett fájlok:**
  - `src/app/inbox/filing-actions.ts`
  - `src/utils/freight-matcher.ts` (Új motor)
  - `src/app/dossiers/[id]/page.tsx`
- **Elfogadási feltétel (DoD):** A speditőrnek nem kell kézzel iratonként iktatnia és mappákba húzogatnia a fuvarleveleket; az azonos munkaszámú iratok automatikusan egy közös dossziéba kerülnek.

---

### TASK-07: Többszintű fuvar-kategorizálás, AI címkéző motor és összetett kereső
- **Eredeti hivatkozás:** DOC-07
- **Hatókör:** `[Docs]`
- **Cél:** A fuvariratok üzleti tartalom szerinti intelligens visszakereshetősége árbecsléshez és korábbi szállítások összehasonlításához.
- **Megvalósítási lépések:**
  1. **AI Címkézés érkeztetéskor:** A Gemini modell felismeri és metaadatként eltárolja:
     - *Dokumentumtípus:* CMR, Fuvarlevél, Megbízás, Szállítólevél, Súlybizonylat.
     - *Szállított árufajta:* pl. acélcső, acélszerkezet, vegyianyag, raklapos áru.
     - *Viszonylat:* Feladási hely (Honnan) és Célállomás (Hová), pl. Győr → Berlin.
     - *Tömeg / Mennyiség:* pl. súlyérték tonnában (pl. 24 t).
     - *Gépjármű rendszám.*
  2. **Fuvarozási Archív Keresőfelület (`/freight` vagy `/search` kibővítés):**
     - Szűrési lehetőség: *„Mutasd az összes Berlinbe szállított acélszerkezetet, ami > 5 tonna volt az elmúlt 1 évben!”*
     - Hierarchikus böngészés: `Év → Megrendelő Partner → Munkaszám → Iratok`.
- **Érintett fájlok:**
  - `src/app/search/page.tsx`
  - `src/components/search/freight-search-filters.tsx` (Új komponens)
  - `src/app/inbox/filing-actions.ts`
- **Elfogadási feltétel (DoD):** Az ügyintéző a konkrét PDF-ek kézi megnyitása nélkül, üzleti paraméterek (viszonylat, árufajta, súlyküszöb) alapján 2 másodperc alatt megtalálja a korábbi hasonló fuvarok iratait.

---

## 📌 4. FÁZIS: eaisyHR Munkaügyi Megfelelőség és Műszaktervezés

### TASK-08: Előzetes Műszaktervező modul (`/hr/time/shifts`)
- **Eredeti hivatkozás:** HR-01
- **Hatókör:** `[HR]`
- **Cél:** Az utólagos jelenlétrögzítés kiegészítése előzetes beosztástervezéssel.
- **Megvalósítási lépések:**
  1. Új aloldal és naptár: `/hr/time/shifts` (Heti / havi műszakbeosztás nézet).
  2. Műszaksablonok (pl. 8 órás délelőttös 06:00–14:00, délutános 14:00–22:00, éjszakás, egyedi).
  3. Munkavállalók hozzárendelése a műszakokhoz drag-and-drop vagy kattintásos beosztással.
  4. Összehasonlítás a tény jelenléttel (Terv vs. Tény eltérések kimutatása a jelenléti íven).
- **Érintett fájlok:**
  - `src/app/hr/time/shifts/page.tsx` (Új útvonal)
  - `src/components/hr/shift-planner-calendar.tsx` (Új komponens)
  - `src/app/hr/time/shift-actions.ts`
- **Elfogadási feltétel (DoD):** A részlegvezető előre elkészítheti a csapata heti beosztását, és látja a tervezett létszámot.

---

### TASK-09: Munkaidőkorlátok (48 óra) és éves rendkívüli munkaidő számláló
- **Eredeti hivatkozás:** HR-02
- **Hatókör:** `[HR]`
- **Cél:** Mt. szerinti munkaidő-korlátok és túlórakeretek automatikus felügyelete.
- **Megvalósítási lépések:**
  1. **Heti 48 órás korlát figyelése:** Ha a tervezett műszakok vagy a leadott jelenlétek meghaladják a heti 48 órát, a rendszer sárga/piros figyelmeztetést ad a vezetőnek.
  2. **Éves rendkívüli munkaidő (túlóra) számláló:**
     - Minden dolgozó kartonján és a jelenléti íven megjelenik az éves kumulált túlóra (pl. 250 órás alapeset vagy 400 órás megállapodásos keret).
     - Küszöbérték-riasztás: 80%-os keretkimerülésnél (200 óránál) automatikus figyelmeztetés a HR felé.
- **Érintett fájlok:**
  - `src/utils/hr-overtime-engine.ts`
  - `src/components/hr/overtime-balance-card.tsx`
  - `src/app/hr/time/page.tsx`
- **Elfogadási feltétel (DoD):** A rendszer automatikusan jelzi, ha egy dolgozó túllépné a heti maximumot vagy közeledik az éves túlórakerete végéhez.

---

### TASK-10: Szabadságkiadási megfelelőség (14 nap egybefüggő + novemberi riasztás)
- **Eredeti hivatkozás:** HR-03
- **Hatókör:** `[HR]`
- **Cél:** A törvényes szabadságkiadási szabályok automatikus ellenőrzése, elkerülve a munkaügyi bírságokat.
- **Megvalósítási lépések:**
  1. **Mt. 122. § szerinti 14 napos egybefüggő pihenőidő vizsgálat:**
     - Algoritmus vizsgálja a naptári évben jóváhagyott szabadságokat és a heti pihenőnapokat.
     - Ha egy dolgozónak nincs legalább egybefüggő 14 naptári napos távolléte az évben, a HR megfelelőségi listán megjelenik a hiányjelzés.
  2. **Novemberi maradványszabadság-riasztás:**
     - November 1-jén automatikus felmérés a még kiadatlan szabadságokról.
     - Vezetői és HR figyelmeztető sáv: a bent maradt napok listája a szabadságok időben történő betervezéséhez.
- **Érintett fájlok:**
  - `src/utils/hr-leave-compliance.ts` (Új motor)
  - `src/app/hr/time/page.tsx`
  - `src/app/hr/compliance/page.tsx`
- **Elfogadási feltétel (DoD):** A HR-es és a vezető novemberben automatikusan megkapja az év végéig még kiadandó szabadságok listáját, és nyomon követhető a 14 napos egybefüggő szabadság teljesülése.

---

### TASK-11: Orvosi alkalmassági és beosztási blokkolás összehangolása
- **Eredeti hivatkozás:** HR-05
- **Hatókör:** `[HR]`
- **Cél:** A meglévő alkalmassági blokkolás kiterjesztése az előzetes műszaktervezésre is.
- **Megvalósítási lépések:**
  1. Jelenleg: Lejárt orvosi alkalmasság esetén a dolgozó nem nyithat műszakot és nem csekkolhat be.
  2. Bővítés: A TASK-08 műszaktervező felületén se lehessen olyan dolgozót műszakra beosztani, akinek az adott napon már nem érvényes az orvosi vizsgálata (figyelmeztető ikon és letiltott gomb).
- **Érintett fájlok:**
  - `src/components/hr/shift-planner-calendar.tsx`
  - `src/app/hr/time/attendance-actions.ts`
- **Elfogadási feltétel (DoD):** Lejárt orvosival rendelkező dolgozó sem előre nem tervezhető be műszakra, sem utólag nem tud bejelentkezni.

---

## 📌 5. FÁZIS: Dolgozói Életciklus és Bérpapír Automatizmusok

### TASK-12: Offboarding kötelező igazolások és eaisyDocs személyi dosszié iktatás
- **Eredeti hivatkozás:** HR-06
- **Hatókör:** `[HR / Docs]`
- **Cél:** A munkaviszony megszüntetésekor kiadandó kötelező jogi dokumentumok kezelése és iktatása.
- **Megvalósítási lépések:**
  1. A kiléptetési folyamat (`/hr/offboarding`) ellenőrzőlistájának kiegészítése:
     - Igazolólap a munkanélküli járadék (álláskeresési ellátás) megállapításához.
     - Adóadatlap és jövedelemigazolás.
     - TB kiskönyv (OEP igazolvány) átadás-átvételi elismervény.
     - Munkáltatói igazolás a munkaviszony megszűnéséről (Mt. 80. §).
  2. Az elkészült és aláírt kilépő igazolások automatikus beiktatása a dolgozó eaisyDocs-beli személyi dossziéjába (`irattari_tetel: 3.1 - HR és Munkaügyi dokumentumok`).
- **Érintett fájlok:**
  - `src/app/hr/offboarding/page.tsx`
  - `src/components/hr/exit-certificate-panel.tsx`
  - `src/utils/hr-filing-bridge.ts`
- **Elfogadási feltétel (DoD):** Az offboarding zárásakor az összes törvényes igazolás előállítható, és dokumentáltan megtalálható az eaisyDocs iratkezelőben.

---

### TASK-13: Ütemezett bérpapír előállítás és dolgozói digitális átvételi nyugtázás
- **Eredeti hivatkozás:** HR-07
- **Hatókör:** `[HR]`
- **Cél:** Havi bérpapírok digitális kiosztása és az átvétel igazolható visszaigazolása (Mt. 155. §).
- **Megvalósítási lépések:**
  1. **Bérpapír generálás / feltöltés:**
     - Havi ütemezett előállítás (pl. minden hónap 10-ig).
     - Dolgozónként elszeparált PDF tárolás biztonságos Supabase Storage vödörben.
  2. **Dolgozói digitális átvétel (Self-Service):**
     - A dolgozó belép a Self-Service felületre (`/hr/self-service/payroll`), megtekinti a bérpapírját.
     - Egyértelmű **„Átvételt igazolom”** gomb.
     - Kattintásra a rendszer rögzíti az átvétel pontos időbélyegét és IP/munkamenet adatát (`hr_berpapir_nyugta`).
  3. **HR kimutatás:** A HR-es látja, hogy mely dolgozók nem vették még át / nem nyugtázták az adott havi elszámolást.
- **Érintett fájlok:**
  - `src/app/hr/self-service/payroll/page.tsx` (Új útvonal)
  - `src/components/hr/payroll-acknowledgement-button.tsx`
  - `src/app/hr/reports/page.tsx`
- **Elfogadási feltétel (DoD):** A munkavállaló egyetlen kattintással digitálisan igazolja a bérpapír átvételét, a munkáltató pedig auditálható listával rendelkezik az átvételekről.

---

## 🔬 Különálló Feltárási Feladat (Research Spike)

### TASK-14: Elektronikus hitelesítés és távoli aláírás feltárása
- **Eredeti hivatkozás:** DOC-08
- **Hatókör:** `[Docs]`
- **Időkeret:** Szigorúan legfeljebb **2 óra**
- **Cél:** Nem kódolás, hanem döntéselőkészítő elemzés Zoli kérésére az elérhető szolgáltatókról és API-kapcsolatokról.
- **Vizsgálati pontok:**
  1. *Dokumentum elektronikus hitelesítése:* Időbélyegző és szervezeti tanúsítvány (pl. Microsec e-Szignó API, Netlock).
  2. *Távoli kétoldalú aláírás:* Munkavállaló / Partner általi aláírás (pl. DÁP / állami AVDH, Evrotrust, DocuSign, Adobe Sign).
  3. *Költség- és díjazási modellek:* Havidíjas előfizetés vs. dokumentumonkénti tranzakciós díjak összehasonlítása.
  4. *eaisyDocs integrálhatóság:* Milyen REST API-n keresztül hívható meg közvetlenül az irat adatlapjáról.
- **Kimenet:** 1-2 oldalas döntési összefoglaló dokumentum (`docs/architecture/research/R-001-electronic-signature-and-timestamp-survey.md`).

---

## 🚀 Javasolt Végrehajtási Sorrend (Sprint Terv)

```mermaid
graph TD
    subgraph SPRINT 1: Gyors UI/UX és Alapok
        T1["TASK-01: Feladat modálok tisztítása"]
        T2["TASK-02: Profil & Settings szétválasztás"]
        T3["TASK-03: Oktatási lejárati mátrix"]
    end

    subgraph SPRINT 2: Speditőr & Fuvar Modul
        T6["TASK-06: Fuvarirat gyűjtés munkaszámhoz"]
        T7["TASK-07: Fuvar AI címkézés & kereső"]
    end

    subgraph SPRINT 3: Multi-Tenancy & Integráció
        T4["TASK-04: EaisyBILL felhasználó import"]
        T5["TASK-05: eaisyHR cégizoláció"]
    end

    subgraph SPRINT 4: Munkaügyi Szabályok
        T8["TASK-08: Műszaktervező naptár"]
        T9["TASK-09: 48h és túlórakeret számláló"]
        T10["TASK-10: 14 napos szabadság figyelő"]
        T11["TASK-11: Műszak alkalmassági blokkolás"]
    end

    subgraph SPRINT 5: Életciklus & Bérpapír
        T12["TASK-12: Offboarding kilépő igazolások"]
        T13["TASK-13: Bérpapír digitális átvétel"]
    end

    subgraph PÁRHUZAMOS KUTATÁS
        T14["TASK-14: E-aláírás és hitelesítés (max 2h)"]
    end

    SPRINT 1 --> SPRINT 2
    SPRINT 2 --> SPRINT 3
    SPRINT 3 --> SPRINT 4
    SPRINT 4 --> SPRINT 5
```

---

*Dokumentum készítve az eaisyDocs & eaisyHR csapata számára a 2026-10-09-i megbeszélés alapján.*
