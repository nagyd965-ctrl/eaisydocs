# EaisyDOCS – Fejlesztési Prioritás és Roadmap

> Utoljára frissítve: 2026-09-29  
> Alapja: `EaisyDOCS_funckiok_es_backlog.md` + kódbázis-elemzés + `hianylista.md`

---

## 🧭 Prioritizálási szempontok

1. **Komplexitás** – mennyire önálló, mennyire épül más hiányzó dologra
2. **Üzleti érték** – mennyire szükséges a napi működéshez
3. **Függőségek** – mit blokkol, vagy mitől függ
4. **Kockázat** – külső rendszer integráció? Adatbázis-migráció? Üzleti döntés kell?

---

## 🟢 1. FÁZIS – Gyorsan megvalósítható, önálló (1-3 nap/db)

Ezek nem függenek más hiányzó moduloktól, a kódbázis nagy részük számára már készen van.

### ~~🔧 B1. Kötegelt érkeztetés stabilizálása~~ ✅ KÉSZ (2026-09-29)
~~Az elválasztólap-alapú PDF-szétválasztás hibajavítása elvégezve.~~

---

### 🔧 B2. Selejtezési állapotgép véglegesítése
- **Mit kell tenni:** Az állapotátmenetek (irattárban → selejtezhető → javasolt → jóváhagyott → selejtezett → megsemmisített) nincsenek egyértelműen definiálva
- **Miért előre:** Blokkol más funkciót (pl. konfigurálható négyszem-elv). Az alap már kész (`disposal-actions.ts`)
- **Komplexitás:** 🟡 Közepes
- **Állapot:** ⚠️ Részben kész

---

### 🔧 B3. Feladatkatalógus és feladatállapotok
- **Mit kell tenni:** A `feladat` tábla és a `task-actions.ts` már létezik. Hiányzik: feladattípusok, állapotok kiegészítése, határidőszabályok, automatikus szignálási logika
- **Miért előre:** A feladatkezelés UI-ja kész, csak a mögöttes üzleti logika hiányzik
- **Komplexitás:** 🟢 Alacsony-Közepes
- **Állapot:** ⚠️ Részben kész

---

### ~~🔧 B4. Postgres Full-Text Search (FTS) & Globális Gyorskereső~~ ✅ KÉSZ (2026-09-30)
- **Elvégezve:** Dedikált `/search` oldal kivezetve és átirányítva, helyette globális `Ctrl + K` Command Palette / Power Search modál integrálva a fejlécbe és az egész rendszerbe.
- **Keresőmotor:** Postgres FTS (`hungarian` tsvector) + hibrid szemantikus keresés (`search_iratok_hybrid` RPC) kiemelt találatokkal.
- **Szűrés és Alertek:** Részletes szegmentált szűrők (irány, minősítés, időszak, partner, iktatószám), mentett keresések és in-app alert értesítések kezelése közvetlenül a modálból.
- **Design:** Teljes Linear-inspirált flat design a `docs/design/` alapján, felesleges láblécek és témakörök nélkül.

---

### ~~🔧 B5. Dashboard kibővítése statisztikákkal (5.8)~~ ✅ KÉSZ (2026-09-30)
- **Elvégezve:**
  - **Dinamikus Iratforgalom Trend:** Az AreaChart a felső időszakszűrőhöz (`Ma`, `7 nap`, `Hónap`, `Év`, `Összes`) igazítva dinamikusan váltja a felbontást (órás, napi, havi) és a fejlécet.
  - **Bizonylattípus-megoszlás (Recharts Vízszintes BarChart):** Kategóriák szerinti kimutatás (Pénzügy/Számla, Szerződések, HR/Munkaügy, Igazolások/Jegyzőkönyvek, Kereskedelmi és Általános iratok) darabszámmal, százalékkal és egyedi színkódokkal.
  - **Top Partnerek forgalma:** A legaktívabb küldők/címzettek rangsora forgalmi aránymutatókkal és bejövő/kimenő bontással.
  - **2 Soros Prémium Elrendezés:** A `docs/design/` alapelvek szerint 1. sorban a Forgalom trend és Csatornák fánkdiagram; 2. sorban a Bizonylattípus BarChart és Top Partnerek; 3. sorban a Lejáró határidők és Saját feladataim.
- **Állapot:** ✅ Kész és élesítve.

---

### ~~🔧 B6. Értesítési motor backend bekötése~~ ✅ KÉSZ (2026-09-30)
- **Elvégezve:** A teljes értesítési háttérmotor üzemel:
  - **Ütemezett értesítések:** Az éjszakai cron motor (`src/app/api/cron/nightly/route.ts`) kezeli a közelgő határidőket, a lejárt határidőket (3 nap után vezetői eszkalációval), a megőrzési idők lejártát (selejtezési javaslat és irattáros értesítés), valamint a HR eseményeket (orvosi vizsgálat, próbaidő lejárta).
  - **Kiküldési csatornák:** Email kiküldés Brevo API-n és HTML sablonokon keresztül (`src/utils/mailer.ts`, `level_ertesites_naplo` naplózással), SMS kiküldés Twilio integrációval (`src/utils/sms/twilio.ts`), és In-App értesítések (`alkalmazas_ertesites`).
  - **Élő / Eseményvezérelt:** Mentett keresési riasztások új irat esetén (`src/utils/saved-search-alerts.ts`), IMAP hiba/új levél értesítések, fejléc csengettyű (`src/components/notification-bell.tsx`).
- **Állapot:** ✅ Teljesen működőképes és bekötve.

---

## 🟡 2. FÁZIS – Közepes komplexitású, de önálló (3-7 nap/db)

### 📦 B7. Partnertörzs kibővítése (5.1)
- **Mit kell tenni:** Bővítés: partner típusa (vevő/szállító/egyéb), kapcsolattartók, aktív/inaktív státusz, duplikációvédelem erősítése, adatforrás-jelölés
- **Miért fontos:** Alap az EasyBill-integráció és a keresztmodulos kapcsolatokhoz
- **Komplexitás:** 🟡 Közepes
- **Állapot:** ✅ Alap kész, bővítendő

---

### 📦 B8. Szerződéskezelési almodul – sablon alapú (5.9)
- **Mit kell tenni:** Szerződéssablonok feltöltése, változó mezők megjelölése, sablon alapú generálás (AI kitöltéssel), verziókezelés, EaisyDOCS-iktatás
- **Miért előre:** Üzletileg nagy érték, a technológia (pdf-lib, AI SDK) már adott a projektben
- **Komplexitás:** 🟠 Közepes-Magas
- **Állapot:** 🔴 Hiányzik

---

### 📦 B9. HR dokumentumtár – „EaisyDOCS-ba helyezés" gomb (5.6)
- **Mit kell tenni:** Az egyes HR-dokumentumoknál (jelenléti ív, orvosi, nyilatkozat) egy gomb, ami előkitöltött érkeztetési lapként megnyitja az iktatófelületet
- **Miért előre:** Minimális új kód, meglévő modulok összeragasztása
- **Komplexitás:** 🟢 Alacsony-Közepes
- **Állapot:** 🔴 Hiányzik

---

### 📦 B10. Konfigurálható négyszem-elv és selejtezési jóváhagyás (5.12)
- **Mit kell tenni:** Tenant/irattípus szintű konfiguráció, hogy kötelező-e a független jóváhagyó. Egy settings-beli toggle
- **Miért előre:** Rövid fejlesztés, nagy üzleti értékű
- **Komplexitás:** 🟡 Közepes
- **Állapot:** 🔴 Hiányzik

---

## 🔴 3. FÁZIS – Komplex, integrációs (1-3+ hét/db)

### 🔗 B11. EasyBill-integráció bővítése (5.3)
- **Függőség:** B7 (Partnertörzs bővítés) kész legyen
- **Komplexitás:** 🔴 Magas (külső API, szinkronizációs logika)

### 🔗 B12. Teljesítésigazolás-kezelés (5.10)
- **Függőség:** B8 (Szerződéskezelés) alapjai megvannak
- **Komplexitás:** 🟠 Közepes (B8 után könnyebb)

### 🔗 B13. Multitenancia (5.2)
- **Függőség:** Üzleti döntés a tenantmodellről (nyitott kérdés #11)
- **Komplexitás:** 🔴 Nagyon magas (adatbázis-szintű változás mindenhol)
- **⚠️ Figyelem:** Az egész rendszert újra kell gondolni körülötte

### 🔗 B14. Szállítmányozási CMR-egyeztetés (5.4)
- **Függőség:** B7, B11
- **Komplexitás:** 🔴 Magas

### 🔗 B15. EasyWare-integráció (5.5)
- **Függőség:** EasyWare API elérhetősége
- **Komplexitás:** 🔴 Magas (külső rendszer)

### 🔗 B16. HRT Sped, AGL, Ultralog extensionök (5.7)
- **Függőség:** Partnerek, integráció-keretrendszer
- **Komplexitás:** 🔴 Magas

### 🔗 B17. Keresztmodulos dokumentumkapcsolatok (5.11)
- **Függőség:** Minden integráció (B11-B16)
- **Megjegyzés:** Az alap (`irat_kapcsolat` tábla + polimorf kapcsolati UI) már kész!
- **Komplexitás:** 🟠 Közepes (az alap megvan)

---

## 📋 Összesítő táblázat

| # | Feladat | Fázis | Komplexitás | Állapot | Prioritás |
|---|---------|-------|-------------|---------|-----------|
| ~~B1~~ | ~~Kötegelt érkeztetés stabilizálása~~ | 1 | ~~🟡~~ | ✅ **KÉSZ** | – |
| B6 | Értesítési motor backend | 1 | 🟡 | 🔴 Kritikus | ⭐⭐⭐⭐⭐ |
| B4 | Postgres FTS keresés | 1 | 🟢 | 🔴 Hiányzik | ⭐⭐⭐⭐ |
| B2 | Selejtezési állapotgép | 1 | 🟡 | ⚠️ Részben | ⭐⭐⭐⭐ |
| B3 | Feladatkatalógus + állapotok | 1 | 🟢 | ⚠️ Részben | ⭐⭐⭐⭐ |
| B9 | HR → EaisyDOCS gomb | 2 | 🟢 | 🔴 Hiányzik | ⭐⭐⭐⭐ |
| B5 | Dashboard statisztikák | 1 | 🟢 | 🟡 Alap kész | ⭐⭐⭐ |
| B7 | Partnertörzs bővítés | 2 | 🟡 | ✅ Alap kész | ⭐⭐⭐ |
| B10 | Konfigurálható négyszem-elv | 2 | 🟡 | 🔴 Hiányzik | ⭐⭐⭐ |
| B8 | Szerződéskezelés (sablon+AI) | 2 | 🟠 | 🔴 Hiányzik | ⭐⭐⭐ |
| B12 | Teljesítésigazolás | 3 | 🟠 | 🔴 Hiányzik | ⭐⭐ |
| B17 | Keresztmodulos kapcsolatok | 3 | 🟠 | ✅ Alap kész | ⭐⭐ |
| B11 | EasyBill-integráció bővítés | 3 | 🔴 | 🟡 Alap kész | ⭐⭐ |
| B13 | Multitenancia | 3 | 🔴 | 🔴 Hiányzik | ⭐ (döntés kell) |
| B14 | CMR-egyeztetés | 3 | 🔴 | 🔴 Hiányzik | ⭐⭐ |
| B15 | EasyWare-integráció | 3 | 🔴 | 🔴 Hiányzik | ⭐ |
| B16 | HRT Sped / AGL / Ultralog | 3 | 🔴 | 🔴 Hiányzik | ⭐ |
