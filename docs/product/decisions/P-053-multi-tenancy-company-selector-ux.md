# [Közös] P-053: Többcég-kezelő Választó és Cégkezelési UX

## Státusz
Elfogadva (Implemented & Verified)

## Dátum
2026-10-08

## Termék és Felhasználói Kontextus
Az eaisyDocs és eaisyHR rendszerekben a felhasználók vállalatcsoportokat, holdingokat és több vállalkozást irányító szervezeteket kezelnek. A Visibill mintájára a felhasználói élménynek zökkenőmentesnek, intuitívnak és prémiumnak kell lennie: a cégváltás, az új cég alapítása és a meghívókóddal való csatlakozás nem igényelhet felesleges oldal-újratöltéseket vagy bonyolult beállítási oldalakat.

## UX Döntések és Képernyő Felépítés

### 1. Oldalsáv Cégválasztó (`CompanySelector`) - Visibill Layout
- **Elhelyezkedés**: Közvetlenül az eaisyDocs / eaisyHR modulválasztó (`ModuleSwitcher`) alatt helyezkedik el a bal felső sarokban mindkét oldalsávban (`AppSidebar` és `HrSidebar`).
- **Megjelenés (Visibill inline sor)**:
  - Bal szélen épület ikon (`Building2`).
  - Középen a kompakt cégválasztó trigger: országkód (`HU` / `HR`) és az aktív cég neve (`font-medium`) lenyíló nyíllal (`ChevronDown`).
  - **Cég szerkesztése gyorsgomb (`Pencil` ✎)**: közvetlenül a választó mellett, mindig a meglévő, aktívan kiválasztott cég adatait nyitja meg szerkesztésre.
  - **Cég hozzáadása gyorsgomb (`Plus` +)**: azonnal megnyitja a cég hozzáadása modált (új cég alapítása vagy csatlakozás kóddal fülekkel).
- **Popover Menü**:
  - **Keresőmező**: Élő gépelési szűrés a cég neve és adószáma alapján.
  - **Céglista**: Magyar ABC sorrendbe rendezve. Az aktív cég mellett zöld/teal pipa (`Check`) ikon jelzi a kiválasztást.
  - **Gyorsműveletek**: Új cég hozzáadása és Csatlakozás kóddal gombok.

### 2. Beállítások -> Cég Fül (`CompanySettingsTab`)
A Visibill mintájára a Beállítások menüben a Profil fül mellett egy önálló **„Cég”** fül kapott helyet négy fő szekcióval:
1. **Kiválasztott cég adatai (`CompanyDetailsCard`)**:
   - Cégnév, adószám (élő formátum-ellenőrzéssel), székhely, ország (`HU` / `HR`), képviselő neve, telefonszám.
   - Mentéskor az adatok azonnal frissülnek a cégen és a globális kontextusban is.
2. **Cég hozzáférés (`CompanyAccessCard`)**:
   - Kizárólag a cég tulajdonosa (`isOwner`) számára érhető el; munkatársak számára a kártya rejtve van.
   - 6 karakteres kriptográfiailag biztonságos, könnyen olvasható meghívókód generálása (pl. `62YG9F`).
   - 10 perces lejárati időzítő élő másodperces visszaszámlálóval.
   - Egykattintásos vágólapra másolás (`Copy`) és újragenerálás (`RefreshCw`) funkció.
3. **Tagok (`CompanyMembersCard`)**:
   - **Kizárólag a cég tulajdonosa (`isOwner`) számára látható.** Munkavállaló/tag számára a kártya teljes egészében rejtve van, elkerülve a tagok listázását vagy illetéktelen manipulációját.
   - A céghez tartozó összes felhasználó listája névvel, emaillel, szerepkör jelvénnyel (`Tulajdonos`, `Admin`, `Tag`, illetve modulspecifikus szerepkörök) és csatlakozási dátummal.
   - **Tag hozzáadása**: Visibill mintájú modál új felhasználó regisztrációjával, modulválasztással (`docs` / `hr`) és szerepkör kiosztással (szerveroldali tulajdonosi ellenőrzéssel).
   - **Kanonikus megerősítő törlő modál (`AlertDialog`)**: Natív böngészős confirm helyett egységes figyelmeztető dialógus a tag nevével, cégével és figyelmeztető szöveggel. A cég tulajdonosa nem távolítható el.
4. **Profilhoz tartozó összes cég áttekintése (`AllCompaniesCard`)**:
   - Minden munkatárs számára látható: a fiókhoz tartozó összes vállalkozás és kiosztott szerepkör áttekintése, közvetlen cégváltási lehetőséggel.
5. **Cégadatok Módosításának Korlátozása (Csak megtekintés munkatársaknak)**:
   - Nem-tulajdonos esetén az űrlapmezők zároltak (`disabled`), a mentés gomb rejtett, helyette diszkrét jelzés olvasható: *„Csak megtekintés • A cég adatait kizárólag a tulajdonos szerkesztheti.”*
   - A fejlécben dinamikus badge jelzi az aktuális státuszt (*Tulajdonos* / *Munkavállaló / Tag*).

## Vizuális Verifikáció és Tesztelés
- Böngészőben és típusellenőrzéssel (`npx tsc --noEmit`) megerősítve a Beállítások -> Cég fül és az oldalsáv inline gyorsgombok hibátlan működése.
- Szerveroldali akciók tesztelve: illetéktelen taglekérdezés, tagtörlés és adatmódosítás azonnal elutasításra kerül.

