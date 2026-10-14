# PRD P-082: Foglalkoztatottak Importálása eaisyBooks-ból UX és Adatlap Összerendelés

- **Státusz:** Elfogadva (Accepted)
- **Dátum:** 2026-10-15
- **Hatókör:** `[HR]` HR Munkaasztal & Állomány Áttekintés
- **Kategória:** `HR / Employees & eaisyBooks Payroll Import UX`
- **Kapcsolódó Kód / Útvonal:** `src/app/hr/admin/page.tsx`, `eaisybooks-employee-import-dialog.tsx`, `eaisybooks-employee-actions.ts`

---

## 1. Felhasználói Igény és Célkitűzés
A vállalatok HR adminisztrátorai számára a munkavállalói törzsadatok rögzítése kritikus és időigényes feladat. Az eaisyBooks könyvelői szoftver bérszámfejtési moduljában a dolgozók személyi, bér- és foglalkoztatási adatai már rendelkezésre állnak.
A cél egy letisztult, kanonikus felület biztosítása volt a HR Munkaasztalon (`/hr/admin`), ahol a felhasználó áttekintheti az eaisyBooks-ban nyilvántartott foglalkoztatottakat, és tetszőleges szelekcióval átemelheti őket az eaisyHR állományába.

---

## 2. Képernyő és UI Komponens Specifikáció

### 2.1 HR Munkaasztal Fejléc Akciógombok (`/hr/admin`)
* Az `Új Dolgozó Felvétele` gomb mellett megjelenik a letisztult másodlagos gomb:  
  **`[ Download ikon ] Importálás eaisyBooks-ból`** (outline stílus, teal kiemeléssel).
* Kattintásra megnyílik az `EaisyBooksEmployeeImportDialog` modális ablak.

### 2.2 Import Varázsló Dialógus (`EaisyBooksEmployeeImportDialog`)
1. **Fejléc:**
   * Cím: *"Foglalkoztatottak importálása eaisyBooks-ból"*
   * Kontextus: Aktív vállalat neve és adószáma (pl. *SANDBOX Kft.*).
   * Keresőmező: Instant gépelési szűrés név, munkakör, FEOR vagy e-mail cím alapján, gyors törlés (`X`) gombbal.
2. **Táblázat:**
   * **Kijelölő jelölőnégyzet:** Fejlécben „Összes kijelölése”, soronként egyedi kijelölés. A már állományban lévő dolgozók sora inaktív.
   * **Dolgozó és Státusz:** Teljes név + 🟢 `Importálható` vagy ⚪ `Már állományban van` jelvény + telefonszám.
   * **Munkakör & FEOR:** Megnevezés, FEOR kód és heti munkaóraszám (pl. *Könyvelő • FEOR 3611 • 40h/hét*).
   * **E-mail cím (Szerkeszthető):** Ha a bérszámfejtésben meg volt adva, kitöltve jelenik meg; ha hiányzik, helyben beírható egy `<Input placeholder="dolgozo@ceg.hu" />` mezőbe.
   * **Azonosítók (Maszkolva):** TAJ és Adóazonosító diszkrét maszkolt formában (pl. `123-456-*** / 8472******`).
   * **Belépés:** Belépési dátum (`tabular-nums text-xs`).
3. **Lábléc:**
   * **`[x] Meghívó e-mail küldése a munkatársaknak (jelszóbeállító linkkel)`** opciós jelölőnégyzet.
   * Kijelölési számláló (pl. *„5 / 5 dolgozó kijelölve”*).
   * **„Kijelöltek importálása (X fő)”** gomb zöld/teal stílusban, betöltési animációval (`Loader2`).

---

## 3. Felhasználói Élmény és Visszajelzés
* **Sikeres import:** Kanonikus Toast üzenet jelzi az importált dolgozók és az elküldött meghívók számát:  
  *„5 foglalkoztatott sikeresen importálva! (5 meghívó e-mail kiküldve)”*
* **Azonnali képernyőfrissülés:** A modál bezáródik, és a háttérben futó táblázat azonnal frissül az újonnan bekerült dolgozókkal.
* **Hibakezelés:** Hálózati vagy jogosultsági hiba esetén részletes magyar nyelvű figyelmeztetés jelenik meg.

---

## 4. Kapcsolódó ADR
- [ADR A-063](../../architecture/decisions/A-063-eaisybooks-payroll-employee-import-architecture.md): *eaisyBooks Bérszámfejtés és eaisyHR Munkavállalói Import Architektúra*
