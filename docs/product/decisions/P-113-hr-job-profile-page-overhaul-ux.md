# PRD P-113: eaisyHR Munkakör Adatlap UI/UX Átdolgozás és Szervezeti Egység Nézettel Való Harmonizáció

- **Dátum:** 2026-10-23
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [PRD P-071](./P-071-hr-job-catalog-specification-and-omnipresent-integration.md), [PRD P-072](./P-072-hr-job-profile-and-catalog-ux-declutter-and-deduplication.md)

---

## 1. Felhasználói Igény és Probléma

1. **Vizuális Diszkrepancia a Szervezeti Egység és Munkakör Oldalak Között:**
   - A Szervezeti Egység részletes adatlapja (`/hr/orgunit/[id]`) modern, tágas, teljes szélességű elrendezést, Linear Flat KPI kártyákat (`KpiCard`), gazdag profilavataros dolgozói táblázatot és szerepkör jelvényeket használ.
   - Ezzel szemben a Munkakör adatlap (`/hr/job/[id]`) szűk, középre zárt konténerben (`max-w-5xl mx-auto`) jelent meg, nem tartalmazott sem morzsamenüt (breadcrumb), sem KPI kártyasort, és a második fülön minden alapadat, feladat és munkavédelmi leírás egyetlen strukturálatlan oszlopban torlódott össze.
2. **Hiányzó Kontextuális Adatok a Dolgozói Listában:**
   - A munkakörhöz hozzárendelt dolgozók táblázatából hiányoztak a dolgozói profil avatarok, a rendszerbeli szerepkörök (`hr_szerepkor`), valamint az eltávolító gomb eltérő stílusú ikont használt (`UserMinus` a standard piros `X` helyett).

---

## 2. Termék és UX Döntések

1. **Teljes Szélességű, Tágas Layout és Morzsamenü (Breadcrumbs):**
   - A korlátozó `max-w-5xl` osztály eltávolításra került; az oldal teljes szélességű `space-y-6 pb-10` elrendezést kapott.
   - Kanonikus navigációs morzsamenü beépítése: `Szervezeti felépítés > Munkakör-katalógus > [Munkakör neve]`.

2. **Egységes Fejléc és Műveleti Gombok:**
   - Kerekített vissza gomb (`ChevronLeft`), lekerekített ikonbox (`Briefcase`, `bg-primary/10 border-primary/20`), kiemelt munkakör név, besorolási szint badge, és kattintható közvetlen hivatkozás a felettes szervezeti egységre.
   - A fejléc jobb szélére kerültek a kontextuális műveletek: a munkakör adatok szerkesztése (`JobEditDialog`) és az új munkatárs hozzárendelése (`AssignEmployeeDialog`).

3. **Linear Flat KPI Grid (`KpiCard`):**
   - 4 oszlopos standard KPI sáv a fejléc alatt:
     - **Hozzárendelt dolgozó:** Aktív pozíciót betöltők darabszáma.
     - **Szervezeti egység:** Hozzárendelt egység neve vagy jelzése.
     - **FEOR-08 Foglalkozás:** Hivatalos 4 jegyű KSH besorolási kód.
     - **Besorolási szint:** Junior / Medior / Senior / Vezető szint.

4. **Négyfülös, Letisztult Tab Architektúra:**
   - **Dolgozók (X):** Avatar monogrammal, dolgozói profillinkkel, kanonikus `roleLabel` szerepkör jelvénnyel, formázott belépési dátummal és megerősítést kérő piros `X` eltávolítási művelettel.
   - **Munkaköri Profil & Feladatok:** Munkaköri Törzs- és Minősítési Adatok kártya, valamint 2 oszlopos kártyaelrendezés a feladatok és hatáskörök felsorolásával, és az elvárt kompetenciák jelvényeivel.
   - **Munkavédelem & Egészségügy:** 2 oszlopos kártyák a bejelentett munkavédelmi kockázatokkal, egyéni védőeszköz igénnyel és a kötelező foglalkozás-egészségügyi vizsgálat típusával / gyakoriságával.
   - **Hivatalos Munkaköri Leírás (Y):** Önálló fül a verzionált hivatalos munkaköri leírások megtekintéséhez, letöltéséhez és új verzió feltöltéséhez (`JobDescriptionUpload`).

5. **Közvetlen Kártyaszintű és Soron Belüli (Inline) Mezőkitöltés:**
   - **Dolgozó hozzárendelése helyben:** A Dolgozók kártyafejlécében közvetlenül megtalálható az `AssignEmployeeDialog`, valamint üres állomány esetén közvetlen hozzárendelési gomb jelenik meg a táblázatban.
   - **Kattintható KPI kártyák:** A felső KPI sáv kártyáira kattintva a hozzárendelt dolgozó dialógus, illetve az Alapadatok fül azonnal megnyílik.
   - **Azonnali inline feladat- és kompetenciarögzítés (`JobProfileTasksSection`):** Közvetlenül a kártyákon található beviteli mező Enter leütéssel vagy hozzáadás gombbal aszinkron szerver akcióval azonnal elmenti az új elemet, a törlés pedig tételenként azonnal végrehajtható.
   - **Dedikált kártyafejléc szerkesztőgombok:** A Munkavédelem, Foglalkozás-egészségügy és Alapadatok kártyák mind rendelkeznek önálló „Szerkesztés” gombbal, amelyek a `JobEditDialog` megfelelő fülét nyitják meg célzottan (`initialTab`).

6. **Zero-Emoji és No-Decorative-Icons Megfelelőség:**
   - Nincsenek emojik és dekoratív buborékok; az üres állapotok letisztult szöveges blokkokként jelennek meg.
