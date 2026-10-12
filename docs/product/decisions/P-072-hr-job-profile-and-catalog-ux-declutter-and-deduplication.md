# P-072: [HR] Munkaköri Profil és Adatlap UX Tisztítás, Redundanciamentesítés és Linear-Flat Design Harmónia

- **Dátum:** 2026. október 12.
- **Státusz:** Elfogadva
- **Hatókör:** [HR] eaisyHR Felhasználói Élmény (UX), Munkaköri Profil, Munkakör Törzslap, Dolgozói Önkiszolgáló
- **Kapcsolódó döntések:** [P-043](P-043-global-ui-consistency-and-unified-components.md), [P-071](P-071-hr-job-catalog-specification-and-omnipresent-integration.md), [A-052](../../architecture/decisions/A-052-hr-job-catalog-specification-and-omnipresent-integration.md), [A-053](../../architecture/decisions/A-053-hr-job-profile-and-catalog-action-deduplication.md)

---

## 1. Felhasználói Visszajelzés és Problémafelvetés

A munkakör-kezelés és a munkaköri profil integrációja után a felhasználói tesztelés során három ergonómiai és vizuális probléma merült fel:

1. **Gomb-duplikáció a Munkaköri Profil kártyán (`EmploymentTab` és `self-service/profile`):**
   - A kártya fejlécében szerepelt egy külön *„Munkaköri Leírás Megtekintése”* és egy letöltés gomb, miközben a kártya alján lévő hivatalos dokumentumsávban már eleve ott volt a *„Betekintés”* gomb.
   - A felhasználó kérése: A fejlécből töröljük a redundáns megtekintő gombot, és az alsó sorban lévő *„Betekintés”* mellé helyezzük el közvetlenül a *„Letöltés”* gombot.

2. **Többszörös modál-trigger gomb a táblázat soraiban (`/hr/organization?tab=jobs`):**
   - A Munkakör-katalógus műveleti oszlopában az `Adatlap`, szerkesztés ceruza és törlés kuka ikonok alatt megjelent egy nagy, különálló *„Munkakör szerkesztése”* szöveges gomb is, mivel a `JobEditDialog` alapértelmezett fallback triggert renderelt ha nem kapott `trigger` propot.
   - A felhasználó kérése: Töröljük a lenti felesleges gombot, hiszen a kis ceruza gomb tökéletesen és egységesen ellátja ezt a feladatot.

3. **Duplikált szerkesztőgombok és vizuális zaj (ikon-halmozás) a Munkaköri Adatlapon (`/hr/job/[id]`):**
   - Az adatlapon 4 különböző helyen (fejléc, Törzsadatok kártya, Feladatok kártya, Kompetenciák kártya) volt külön szerkesztési gomb, holott mindegyik pontosan ugyanazt a háromfüles modált nyitotta meg.
   - Az adatlapon minden egyes kártyacím, mezőérték, fül és jelvény előtt színes dekoratív Lucide ikonok szerepeltek (táska, épület, sztetoszkóp, vágólap, sapka, pajzs, sisak, dokumentum), ami sértette a Linear-flat irányelveket és felesleges vizuális zajt keltett.

---

## 2. Megvalósított UX Megoldások

### 2.1. Munkaköri Profil Kártya Tisztítása és Egységesítése
- **Fejléc megtisztítása:** A kártya fejlécéből eltávolításra került a redundáns betekintő és letöltő gomb. A dolgozói adatlapon kizárólag a közvetlen és hasznos *„Munkakör törzslap”* hivatkozás maradt meg.
- **Alsó dokumentumsáv akció-pár:** A hivatalos munkaköri leírás sor végén a `Betekintés` (`PdfViewerDialog`) és a `Letöltés` (közvetlen PDF letöltés ikonnal és felirattal) gombok egymás mellett, logikus akciópárként jelennek meg mind az adminisztrátori, mind az önkiszolgáló nézetben.

### 2.2. Munkakör-katalógus Műveletek Letisztítása
- A `JobActionMenu` felületén megszűnt a duplikált alsó gomb.
- A sorvégi műveleti sáv egységes, kompakt elrendezést kapott:
  - `Adatlap` gomb (ugrás a törzslapra),
  - Szerkesztés ceruza ikon gomb (modál nyitása),
  - Törlés kuka ikon gomb (megerősítő törlés dialógus).

### 2.3. Munkaköri Adatlap Akció-Konszolidáció és Linear-Flat Ikonmentesítés
- **Egyetlen kanonikus szerkesztési pont:** A kártyák fejléceiből eltávolításra került az *„Adatok módosítása”* és a kétszeri *„Szerkesztés”* gomb. A munkakör minden adata kizárólag a lap tetején lévő, kiemelt **`Munkakör szerkesztése`** gombbal módosítható.
- **Teljes dekoratív ikon-tisztítás:**
  - Eltávolítva a szervezeti egység jelvényéből az épület ikon.
  - Eltávolítva az alcímből a táska ikon.
  - Eltávolítva a navigációs fülekből a `Users` és `FileText` ikonok.
  - Eltávolítva a kártyák fejléceiből a `ClipboardList`, `GraduationCap`, `ShieldAlert`, `Stethoscope` és `FileText` ikonok.
  - Eltávolítva a mezők értékei elől a mikro-ikonok és az alert dobozokból a színes piktogramok.
  - A dokumentum feltöltésnél eltávolítva a nagyméretű üres állapot ikont és a kerekített színes dobozokat.

---

## 3. Eredmény és Haszon

- **Tiszta és fegyelmezett felhasználói élmény:** A felhasználó nem találkozik egymást ismétlő gombokkal; minden funkciónak egyértelmű, kiszámítható helye van.
- **Linear-flat design fegyelem:** A felület megszabadult a „színes emoji-szerű” ikonkavalkádtól, prémium, nyugodt és szakmai megjelenést biztosítva az eaisyHR rendszerben.
