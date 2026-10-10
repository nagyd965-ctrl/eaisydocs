# P-068 [HR] eaisyHR Központi Áttekintő Felület Cégfüggő Adatizoláció és Metrika UX

- **Dátum:** 2026-10-10
- **Státusz:** Decided
- **Hatókör:** [HR]
- **Kategória:** `HR / Central Overview & Multi-Tenancy`
- **Kapcsolódó döntések:** [A-049](../../architecture/decisions/A-049-hr-central-overview-multi-tenant-scoping-and-kpi-accuracy.md), [P-053](./P-053-multi-tenancy-company-selector-ux.md), [P-063](./P-063-hr-multi-tenancy-and-strict-gdpr-isolation-ux.md)

## 1. Felhasználói Igény és Célkitűzés
Több céget felölelő cégcsoportos vagy könyvelőirodai használat során a HR vezetők és ügyvezetők számára elengedhetetlen, hogy a Központi Áttekintés (`/hr/admin/overview`) mindig hajszálpontosan a fejlécben kiválasztott cég valós adatait és mutatóit tükrözze:
- Ha a felhasználó a `Teszt Kft.`-t választja ki, ne lásson idegen cégekhez tartozó nyitott álláshirdetéseket, onboarding folyamatokat vagy más szervezet dolgozói létszámát.
- A felületen azonnal egyértelmű legyen, hogy az adatok mely vállalkozásra vonatkoznak.

## 2. Felhasználói Élmény és UX Kialakítás

### 2.1 Fejléc Cégjelvény (Company Badge)
- A "Központi Áttekintés" cím mellett egy elegáns, finom `Badge` jelenik meg:
  - Bal oldalon `Building2` ikon a brand elsődleges színével (`text-primary`).
  - A kiválasztott aktív cég teljes hivatalos neve (pl. `Teszt Kft.` vagy `Think AI Kft.`).
  - Visszafogott, szürke-fekete Linear flat stílus (`bg-muted/40 border-border text-foreground font-medium`).

### 2.2 Reagáló KPI Kártyák (`KpiCard`)
A 4 felső kanonikus KPI kártya a cégváltás pillanatában a cégre vonatkozó értékeket mutatja:
1. **Aktív Dolgozók:** Csak a céghez rendelt aktív, nem kilépett munkatársak száma (`X fő`).
2. **Mai Hiányzók:** Csak a céghez tartozó dolgozók mai jóváhagyott távollétei.
3. **Nyitott Pozíciók:** Kizárólag a kiválasztott cég aktív álláshirdetései és új toborzásai (`X db`).
4. **Aktív Onboarding:** Csak a céghez kapcsolódó folyamatban lévő beillesztési folyamatok (`X fő`).

### 2.3 Teendők és Toborzási Megoszlás Sáv
- **HR Teendők & Figyelmeztetések:** Kizárólag az aktív cég dolgozóinak lejáró orvosi alkalmasságai, próbaidői, határozott idejű szerződései és függő szabadságkérelmei láthatóak. Ha nincsenek teendők, a kanonikus szaggatott keretes üres állapot jelenik meg.
- **Toborzási Áttekintő:** A státuszcsíkok (Új jelentkezők, Interjú fázisban, Ajánlat kiküldve) százalékos aránya és darabszáma csak a kiválasztott cég pályázóit tükrözi.

## 3. Üzleti és UX Előnyök
- **Zéró Zavarodottság:** A HR vezető nem végez felesleges teendőket másik szervezet dolgozóira vonatkozóan.
- **Biztonságérzet:** A képernyőn látható cégjelvény folyamatos vizuális megerősítést ad a munkakörnyezetről.
