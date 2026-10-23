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
   - A fejlécből eltávolításra került a dekoratív `Briefcase` ikondoboz, a cím tiszta és rendezett elrendezést kapott.
   - A „Dolgozó hozzárendelése” gombok elől eltávolításra került a dekoratív `UserPlus` ikon, tiszta szöveges műveleti gombként működnek.

7. **Automatizált Munkaköri Leírás Generátor és Verziószám-növelés (v1 -> v2 -> v3):**
   - **Dinamikus A4 PDF generálás:** A `generateJobDescriptionVersionAction` szerver akció Puppeteer segítségével az adatbázis aktuális munkakör adataiból (megnevezés, FEOR-08, szervezeti egység, feladatok, elvárt kompetenciák, orvosi vizsgálatok, egyéni védőeszközök) és a bejelentkezett felhasználó aktív cégadataiból (`getActiveCompanyServer`) azonnal legenerálja a Munka Törvénykönyve szerinti hivatalos munkaköri leírást.
   - **Automatikus verziószám-léptetés:** A meglévő verziók alapján kiszámítja a következő sorszámot (`v{nextVersion}`). Bármilyen munkaköri adat módosítása (pl. feladat hozzáadása, FEOR változtatás) után indított újragenerálás automatikusan inkrementálja a verziót (pl. `v1` helyett `v2`, majd `v3`).
   - **Szabványosított fájlnévadás:** A fájlnév ékezetmentesített és tisztított módon automatikusan felveszi a formátumot: `Munkakori_Leiras_{cleanName}_v{nextVersion}.pdf` (pl. `Munkakori_Leiras_Junior_Fejleszto_v2.pdf`).
   - **Tárhely és Adatbázis Integráció:** A PDF felkerül az `irat_files` Supabase tárolóba (`munkakor-leirasok/{jobId}/v{nextVersion}_{timestamp}.pdf`), és bejegyzésre kerül a `hr_munkakor_leiras_verzio` táblába, ahonnan a dolgozói 360 profil (`OfficialDocumentsTab`, `EmploymentTab`) azonnal érzékeli az új hatályos verziót.
   - **Előnézet és Megjegyzés Dialog:** A felületen a „Munkaköri leírás generálása (v{nextVersion})” gombra kattintva dialógus jeleníti meg az összefoglalót a dokumentumba kerülő adatokról, a javasolt fájlnévről és opcionális megjegyzés megadását teszi lehetővé.

8. **Kanonikus Keresés és Szűrés a Hozzárendelt Dolgozóknál & Valós Avatar Megjelenítés (`JobAssignedEmployeesTable`):**
   - **TableToolbar integráció:** A hozzárendelt dolgozók táblázata felett helyet kapott a kanonikus `TableToolbar`, instant név/szerepkör keresővel, dinamikus szerepkör szűrőcsoporttal (`filterGroups`), aktív szűrő darabszám jelvénnyel és szűrőtörlési lehetőséggel.
   - **Valós Dolgozói Avatar Betöltés:** A `beosztasok` lekérdezés mostantól beemeli a `felhasznalo_profil.avatar_url` mezőt, a komponens pedig `<AvatarImage src={emp.avatarUrl} alt={emp.nev} className="object-cover" />` segítségével közvetlenül megjeleníti a dolgozó valódi feltöltött profilképét, monogramos fallback-kel támogatva.
