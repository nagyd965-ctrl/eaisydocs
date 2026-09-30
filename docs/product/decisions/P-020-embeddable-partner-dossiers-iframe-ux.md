# [Docs] P-020: Beágyazható Partner Ügyirat Betekintő Iframe UX

## 1. Kontextus és Célkitűzés
Az eaisyDocs és az eaisyBill (vagy külső CRM/ERP rendszerek) közötti együttműködés megkönnyítésére szükség van egy letisztult, beágyazható felületre. A külső felületen a partner adatlapon egy iframe-ben közvetlenül megjeleníthetők az eaisyDocs-ban iktatott ügyiratok és szerződések anélkül, hogy az egész eaisyDocs felületet vagy menürendszert be kellene tölteni.

## 2. Érintett Képernyők és Komponensek
- **Beágyazott útvonal:** `/embed/partner-dossiers?partner_id=<UUID>` (`src/app/embed/partner-dossiers/page.tsx`)
- **Tulajdonságok:**
  - Letisztult keret nélküli nézet (nincs bal oldali menü vagy fejléc navigáció).
  - Fejlécben kizárólag a partner neve és az eaisyDocs márkalogó jelenik meg.
  - Tételes táblázat: Iktatószám, Tárgy, Dátum, Állapotjelző badge (`iktatva`, `szignalt`, `lezart`, `irattarban`), és közvetlen "Megnyitás" külső link gomb.

## 3. Biztonság és Jogosultságok
- Ha a `partner_id` hiányzik vagy érvénytelen, a nézet barátságos hibaüzenetet jelenít meg (`ShieldAlert`).
- A lekérdezés szigorúan a megadott partnerhez az `irat_kapcsolat` táblán keresztül kötött ügyiratokat listázza ki.
- A "Megnyitás" link új lapon nyitja meg a teljes ügyirat adatlapot a hitelesített felhasználónak.
