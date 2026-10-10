# [HR] P-061: Ütemezett Bérpapír Előállítás és Dolgozói Digitális Átvételi Nyugtázás UX

- **Státusz:** Elfogadva (Accepted)
- **Dátum:** 2026-10-10
- **Döntéshozó:** eaisyHR és eaisyDocs Core Team
- **Kapcsolódó ADR:** [A-042](../../architecture/decisions/A-042-hr-scheduled-payroll-generation-and-digital-receipt-architecture.md)

---

## 1. Felhasználói Élménystratégia (UX/UI)

### 1.1 HR Munkaasztal: `/hr/payroll` (Bérszámfejtés & Bérpapírok)
- **Elrendezés:**
  - Havi periódusválasztó navigációs fejléc léptetőgombokkal (`Elszámolt időszak: 2026. Október`).
  - **Kiemelt akciógomb:** *„Havi Bérpapírok Előállítása & Közzététele (Mt. 155. §)”* (Sparkles ikon, megerősítő modállal).
  - **Linear Flat KPI Kártyák (`KpiCard`):**
    - Összes Munkavállaló
    - Előállított Bérpapír (sárga figyelmeztetés, ha van előkészítetlen)
    - Átvéve és Nyugtázva (zöld)
    - Átvételre Vár (sárga)
    - Havi Nettó Kifizetés (Ft)
  - **Központi `TableToolbar`:**
    - Keresés név, adójel, TAJ, beosztás szerint.
    - Szűrés: Státusz (Összes, Átveve, Átvételre vár, Generálásra vár), Részleg.
  - **Interaktív Táblázat:**
    - Tételes oszlopok: Alapbér, Munka/Távollét napok, Bruttó összesen, Kedvezmények badge-ek (25 év alatti, Családi kedvezmény), Levonások, Kiemelt Nettó bér.
    - Státusz jelvények: Zöld pipa dátummal, Sárga homokóra, Szürke tervezet.
    - Soronkénti műveletek: PDF Előnézet (`PdfViewerDialog`), Közvetlen Letöltés, Paraméter korrekció (`Settings2` modal).

### 1.2 Dolgozói Önkiszolgáló Portál: `/hr/self-service/payroll` (Bérpapírjaim)
- **Elérhetőség:** Az oldalsáv Önkiszolgáló pultjában új dedikált menüpont (`Bérpapírjaim`).
- **Nézet felépítése:**
  - **Bal oldal:** Havi bérjegyzékek időrendi listája (kártyás elrendezés nettó összeggel és átvételi státusz jelvénnyel).
  - **Jobb oldal:** Kiválasztott bérjegyzék részletező lapja:
    - Kiemelt nettó kifizetési doboz bankszámlaszámmal.
    - **„Átvételt igazolom (Mt. 155. §)”** cselekvésre ösztönző gomb figyelmeztető sávval.
    - Megerősítő dialógus: Joghatásos elektronikus aláírás tájékoztatóval.
    - Nyugtázás után azonnal zöld hitelesített bélyegzővé alakul át: *„Elektronikusan átvéve és nyugtázva: YYYY. MM. DD. HH:mm:ss”*.
    - In-browser PDF előnézet és letöltés gombok.
