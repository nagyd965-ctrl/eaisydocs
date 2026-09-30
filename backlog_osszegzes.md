# EaisyDOCS – Backlog & Feladat Összegzés

> [!NOTE]
> Az [EaisyDOCS_funckiok_es_backlog.md](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/EaisyDOCS_funckiok_es_backlog.md) alapján összeállított összefoglaló.

---

## 📦 Jelenlegi Funkciók (már meglévő, de esetleg javítandó)

Ezek az alaprendszerben **elvileg működnek**, de egy részük hibásan vagy részben kész.

| # | Funkció | Státusz |
|---|---------|---------|
| 1 | E-mail-figyelés és érkeztetés | ✅ Kész |
| 2 | Iktatás / „nem iktatandó" kezelés | ✅ Kész |
| 3 | AI-alapú PDF-feldolgozás és adatkinyerés | ✅ Kész |
| 4 | Határidő és ügyirat-továbbítás | ✅ Kész |
| 5 | Érkeztetési szám, előzmények, eseménynapló | ✅ Kész |
| 6 | EasyBill-számlák importálása | ✅ Kész |
| 7 | Iktatókönyv és ügyiratáttekintés | ✅ Kész |
| 8 | PDF/A megőrzési másolat (háttérfolyamat) | ✅ Kész |
| 9 | Felelős, szervezeti egység, explicit megosztás | ✅ Kész |
| 10 | Fizikai hely és iratkölcsönzés | ✅ Kész |
| 11 | Ügyirat lezárása és irattárba helyezése | ✅ Kész |
| 12 | Megőrzési idő és irattár | ✅ Kész |
| 13 | Selejtezés és négyszem-elv | ✅ Kész |
| 14 | Partnerkezelés | ✅ Kész |
| 15 | Keresés, mentett keresések, alert | ✅ Kész |
| 16 | Beállítások, értesítések, 2FA, audit | ✅ Kész |
| 17 | Feladatok és belső együttműködés | ⚠️ **Részben kész** – feladatkatalógus, állapotok, szabályok hiányoznak |
| 18 | Kötegelt érkeztetés és automatikus szétválasztás | 🔴 **Hibásan működött** – tesztelni és stabilizálni kell |
| 19 | Külső kapcsolatok felület | 🟡 Felület létezik, integráció nélkül nem aktív |

---

## 🚀 Fejlesztendő Új Funkciók (Backlog)

### 5.1 – Partnertörzs és központi partneradat-kezelés
- EasyBill vagy más modul partnertörzsének importja / szinkronizálása
- Duplikációvédelem azonosítók alapján
- Partneradatlap: összes kapcsolódó irat, számla, szerződés, CMR stb.
- Adatforrás jelölése (melyik rendszer elsődleges)
- Partneradat-változások naplózása

---

### 5.2 – Multitenancia és többcég-kezelés
- Önálló tenant/vállalkozási környezetek
- Minden objektum (dokumentum, partner, feladat) tenanthoz tartozzon
- Felhasználóhoz több tenant rendelhető
- Belépés után tenant-választó felület
- Adatok teljes elkülönítése tenantok között
- Szerepkörök: Szolgáltatói admin, könyvelőirodai user, ügyfélcég admin, ügyfélcég munkatárs

---

### 5.3 – EasyBill-integráció bővítése
- Automatikus EaisyDOCS-iktatás EasyBill-számla esetén
- Partnertörzs szinkron EasyBill ↔ EaisyDOCS
- EasyBill partnerlapról EaisyDOCS iratok elérése (és visszafelé)
- Duplikáció-védelem ismételt importnál

---

### 5.4 – Szállítmányozási dokumentumkezelés és számla–CMR egyeztetés
- CMR-ek, fuvarlevelek, szállítmányozási bizonylatok külön dokumentumtípusként
- AI-alapú adatkinyerés: partner, CMR-szám, összeg, útvonal, dátum stb.
- Automatikus egyeztetés számla ↔ CMR (egyeztetett / eltérés / vizsgálatra vár állapotok)
- Manuális felülbírálás indoklással
- Egyeztetési eredmény eseménynaplóba kerül

---

### 5.5 – EasyWare-integráció és beszerzési dokumentumok
- Szállítólevelek EasyWare-ből vagy szkenneléssel importálhatók
- Szállítólevél ↔ számla összekapcsolása
- Bevételezési dokumentumok csoportosítása
- AI: szállítólevélből szállító, dátum, bizonylatszám, mennyiség kinyerése

---

### 5.6 – HR és EasyBooks dokumentumtár
- HR-modulban: „EaisyDOCS-ba helyezés" gomb
- Archiválandó dokumentumtípusok: orvosi vizsgálat, bérszámfejtési nyilatkozat, jelenléti ív, munkavállalói nyilatkozat stb.
- Automatikus tenant, munkavállaló, dokumentumtípus és megőrzési szabály meghatározása
- Szigorított jogosultság és naplózás személyes/egészségügyi adatoknál
- Duplikációvédelem
- Visszanavigálás HR-objektumhoz

---

### 5.7 – További ERP-extensionök (HRT Sped, AGL, Ultralog)
- Saját dokumentumtípusok modullal
- Dokumentum átküldése EaisyDOCS-ba forrásazonosítóval
- Mindkét irányban navigálható kapcsolat
- Tenant- és jogosultságörökléssel

---

### 5.8 – Dashboard és iratforgalmi statisztikák
- Mutatók: bejövő küldemények, csatorna-megoszlás, bizonylattípusok, számlák, CMR-ek, szerződések, lejárt határidők, szervezeti egységenkénti bontás, egyeztetett párok, selejtezési adatok
- Szűrési dimenziók: időszak, tenant, partner, bizonylattípus, szervezeti egység, forrásmodul, státusz
- Csak az aktuális felhasználó hozzáférési szintjének megfelelő adatok jelenhetnek meg

---

### 5.9 – Szerződéskezelési almodul
- Szerződéssablonok kezelése (keretszerződés, licenc, adásvétel stb.)
- Változó mezők jelölése sablonban
- **AI-alapú szerződésgenerálás:** sablon + partner + természetes nyelvű prompt → PDF generálás
- Automatikus EaisyDOCS-iktatás
- Verziókövetés (v2, v3...) – régi verziók megőrzve
- Aláírt példány kezelése külön, de azonos szerződéscsaládon belül
- Időbélyeges archiválás

---

### 5.10 – Teljesítésigazolás-kezelés
- Teljesítésigazolási sablonok kezelése
- AI-alapú generálás (számla, partner, szerződés adatai alapján)
- Visszakérdezés hiányzó adat esetén
- Felülvizsgálat, jóváhagyás, EaisyDOCS-ba iktatás
- Kapcsolható: számla, szerződés, partner, forrásmodulbeli tranzakció

---

### 5.11 – Keresztmodulos dokumentumkapcsolatok
- Bármely üzleti objektumból (számla, partner, HR-munkavállaló, fuvar) elérhető az összes kapcsolódó dokumentum
- Mindkét irányban navigálható
- Kapcsolat típusa megnevezett (pl. „számlát igazoló CMR")
- Automatikus, AI-javasolt vagy manuális kapcsolat – jóváhagyással
- Kapcsolatlétrehozás/módosítás/törlés naplózva

---

### 5.12 – Értesítési stratégia és selejtezési konfigurálhatóság
- Négyszem-elv legyen **konfigurálható** (nem mindig kötelező)
- Tenant/irattípus szintjén meghatározható, kell-e független jóváhagyó
- Selejtezési metaadat és jegyzőkönyv a selejtezés után is megmarad
- Értesítési csatorna, esemény, határidő, címzett konfigurálható legyen

---

## 🔴 Ismert Hibák / Stabilizálandó Területek

| Hiba | Leírás |
|------|--------|
| **Kötegelt érkeztetés** | Demókörnyezetben nem működött (lokálisan igen) – újratesztelés és stabilizálás szükséges |
| **Selejtezési állapotgép** | Irattárban → selejtezhető → selejtezésre javasolt → jóváhagyott → selejtezett → megsemmisített átmenetek nincsenek egyértelműen definiálva |
| **Feladatkezelés üzleti tartalma** | Feladatkatalógus, feladatállapotok, határidőszabályok és felelősségi szabályok még nincsenek meghatározva |

---

## ❓ Nyitott Kérdések (döntés szükséges)

Ezek üzleti döntést igényelnek, fejlesztés előtt tisztázandók:

1. **Feladatkatalógus** – milyen feladatok rendelhetők számlához, szerződéshez, HR-irathoz, CMR-hez?
2. **Feladatállapotok** – pl. új, folyamatban, várakozik, teljesítve, elutasítva, lezárva
3. **Automatikus szignálás** – melyik irattípus melyik szervhez/felelőshöz kerüljön?
4. **Minősítési szintek** – milyen fokozatok legyenek, ki módosíthatja?
5. **Explicit megosztás** – ki engedélyezheti, mennyi időre, milyen körrel?
6. **Kötegelt érkeztetés** – milyen elválasztólap és szkennelési formátum kell?
7. **Selejtezési állapotgép** – pontos átmenetek meghatározása
8. **Megőrzési idők** – dokumentumtípusonként, tenantonként
9. **Négyszem-elv** – mindig kötelező, vagy konfigurálható?
10. **Partneradat-forrás** – EasyBill vagy EaisyDOCS legyen az elsődleges?
11. **Tenantmodell** – szervezeti hierarchia: szolgáltató → könyvelőiroda → ügyfélcég
12. **CMR-egyeztetés** – mely mezők egyezése kötelező, mi az elfogadható eltérés?
13. **HR-adatvédelem** – ki láthat egészségügyi, bér- vagy jelenléti adatokat?
14. **Szerződésgenerálás** – sablonformátumok, változómezők, jóváhagyási lépések
15. **Elektronikus aláírás** – szükséges-e aláírási szolgáltatás, vagy csak archiválás?
16. **Értesítési szabályok** – esemény → címzett → csatorna → határidő mapping
17. **CRM-kapcsolat** – milyen objektumokhoz és eseményekhez kapcsolódjanak az iratok?
18. **Dashboard jogosultság** – mely mutatók, mely szerepköröknek?
19. **Betekintő vs. Auditor** – azonos jogosultságúak, vagy az auditor csak naplókat lát?

---

## 📊 Összesítés

| Kategória | Darab |
|-----------|-------|
| Kész / működő alapfunkció | 16 |
| Részben kész / javítandó | 3 |
| Fejlesztendő új modul | 12 |
| Ismert hiba / stabilizálandó | 3 |
| Nyitott üzleti kérdés (döntés kell) | 19 |
