# P-077 [Docs] Cégválasztó eaisyBill Import Fül és Vállalati Számlanézet

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-058](../../architecture/decisions/A-058-eaisybill-company-import-and-sync.md), [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [P-043](P-043-global-ui-consistency-and-unified-components.md), [P-053](P-053-multi-tenancy-company-selector-ux.md)

## 1. Probléma
A felhasználók több vállalatot kezelnek az eaisyBill számlázó/pénzügyi rendszerben (pl. Mandala Fogadó Kft.), azonban az eaisyDocs bejövő sorában korábban kizárólag egyetlen rögzített cég számláit lehetett elérni. Nem volt közvetlen, vizuális felület arra, hogy egy létező eaisyBill vállalatot átvegyenek az eaisyDocs-ba, és arra váltva az ő bizonylataikat iktassák.

## 2. Döntés

### 2.1 Cégválasztó Modál Kibővítése (`CompanySelector`)
- A meglévő cégkezelő modál háromfülűre bővült:
  1. **eaisyBill import** (alapértelmezett, `Download` ikon): Közvetlen hozzáférés az eaisyBill vállalatokhoz.
  2. **Új cég** (`Plus` ikon): Manuális cégregisztráció.
  3. **Csatlakozás** (`KeyRound` ikon): Meghívókóddal történő csatlakozás.
- A bal felső cégválasztó lenyíló menüjében közvetlen **„Importálás eaisyBill-ből”** menüpont is megjelent.

### 2.2 eaisyBill Import Lista és Keresés
- **Azonnali kereső:** Cégnév, adószám vagy cím alapján valós időben szűrhető a lista.
- **Kártyás megjelenítés:**
  - Cégnév kiemelten, mellette országkód jelvény (`HU`, `HR`).
  - Adószám és székhely cím formázva.
  - **Állapotjelzés:**
    - Ha a cég még nincs importálva: Zöld/teal **„Cég importálása”** gomb.
    - Ha a cég már importálva van: Diszkrét **„Már importálva – Váltás”** gomb (Check ikonnal), amellyel közvetlenül az adott cégre válthat a felhasználó.
- **Folyamatjelzés:** Töltés közben `Loader2` animáció, sikeres import esetén toast értesítés és azonnali aktív cégváltás.

### 2.3 Bejövő Sor Integráció (`/inbox`)
- Az „Importálás eaisyBillből” gombra kattintva mindig az aktuálisan aktív cég számlái jelennek meg a felugró ablakban.
- Amennyiben a felhasználó olyan céget választott ki, amely nincs összekapcsolva eaisyBill-lel, a rendszer tájékoztatja a felhasználót és felkéri a megfelelő eaisyBill cég importálására vagy kiválasztására.

## 3. Érintett Képernyők
- Fejléc / Globális Cégválasztó Popover és Modál (`src/components/company-selector.tsx`)
- Bejövő iratok sora (`/inbox` – `src/app/inbox/eaisybill-import-dialog.tsx`)
