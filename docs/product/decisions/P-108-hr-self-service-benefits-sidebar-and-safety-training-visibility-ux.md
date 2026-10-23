# PRD P-108: Munkavédelmi Oktatás Kiemelése a Dolgozói Profilban és Főoldali Cafeteria Integráció UX

- **Dátum:** 2026-10-23
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [PRD P-098](./P-098-employee-self-service-documents-page-and-profile-declutter-ux.md), [PRD P-107](./P-107-hr-tasks-and-alerts-grouped-employee-view-and-unified-toolbar-ux.md)

---

## 1. Felhasználói Igény és Probléma

1. **Munkavédelmi Oktatás Láthatóságának Hiánya:**
   - A munkavállaló a saját profilján (`/hr/self-service/profile`) korábban kizárólag az orvosi vizsgálatának érvényességét látta kiemelve, miközben az Mvt. 55. § szerinti kötelező munkavédelmi és tűzvédelmi oktatás érvényessége (ami a céges megfelelőség és a dolgozó számára is kritikus) nem kapott vizuális figyelmeztetést a dolgozói oldalon.
2. **Dolgozói Főoldali Cafeteria Életciklus:**
   - A cafeteria nyilatkozat és éves keret közvetlenül a dolgozói irányítópulton (`/hr`) érhető el, így a munkavállalóknak nem kell külön aloldalakra navigálniuk az éves juttatási nyilatkozattételhez vagy az iktatott nyilatkozat megtekintéséhez.
3. **Oldalsáv Letisztultság és Túltengés Megelőzése:**
   - Mivel a juttatások jelenleg kizárólag a cafeteria rendszert tartalmazzák, egy külön dedikált menüpont és egy 85%-ban üres aloldal fenntartása helyett a Dolgozói Portál oldalsávja kompakt, 8 elemes struktúrában marad.

---

## 2. Termék és UX Döntések

1. **Munkavédelmi Oktatás Kiemelése a Profilban (`src/app/hr/self-service/profile/page.tsx`):**
   - **Hero Info Chip:** A munkavállaló neve és beosztása mellett, az Orvosi vizsgálat közvetlen szomszédságában kiemelt információs chipként jelenik meg a **`Munkavédelem`** érvényessége:
     - Zöld jelzés: Érvényes oktatás a hátralévő idővel.
     - Sárga jelzés: 30 napon belül lejáró oktatás figyelmeztetéssel.
     - Piros jelzés: Lejárt oktatás vagy hiányzó oktatás riasztással.
   - **Alapadatok Részletezés:** Az Alapadatok kártya kiegészült a Munkavédelmi Oktatás sorral, feltüntetve az oktatás típusát (*Munkavédelmi* vagy *Tűzvédelmi*), érvényességi idejét, az oktató nevét és a megtartás napját.
   - A számítás a központi [`@/utils/hr/safety-compliance-calculator`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/safety-compliance-calculator.ts) logikáján alapul, garantálva a teljes összhangot a Compliance Hub (`/hr/compliance`) nézeteivel.

2. **Dolgozói Főoldali Cafeteria Integráció (`src/app/hr/page.tsx`):**
   - A cafeteria nyilatkozati modul közvetlenül a `/hr` irányítópulton helyezkedik el a Célkitűzések kártya szomszédságában.
   - A szerveroldali lekérdezések (`hr_cafeteria_keret`, `hr_cafeteria_katalogus`, `hr_cafeteria_valasztas`) párhuzamosítva (`Promise.all`) futnak, optimalizálva a válaszidőt, és átadják a generált `iktatoszam` azonosítót is.
   - Letisztított címek: a korábbi dekoratív `Coffee` ikon eltávolításra került a Zero-Emoji & No-Decorative-Icons elv szerint.

3. **Oldalsáv Letisztítása (`src/components/hr-sidebar.tsx`):**
   - A Dolgozói Portál alatt nem szerepel különálló Juttatások menüpont, elkerülve a menütúltengést és a redundáns üres nézeteket.

---

## 3. Érintett Képernyők és Komponensek

| Fájl | Típus | Módosítás |
|---|---|---|
| `src/app/hr/self-service/profile/page.tsx` | Next.js Page | Munkavédelmi oktatás érvényesség kiemelése a hero chipben és az Alapadatokban |
| `src/app/hr/page.tsx` | Next.js Page | Cafeteria doboz közvetlen renderelése párhuzamosított lekérdezésekkel |
| `src/components/hr/cafeteria-declaration.tsx` | Kliens Komponens | Dekoratív kávéscsésze ikon eltávolítása, iktatószám megjelenítése |
| `src/components/hr-sidebar.tsx` | Kliens Komponens | Letisztult menüszerkezet megtartása felesleges almenü nélkül |

---

## 4. Elfogadási Kritériumok (Acceptance Criteria)

- [x] A dolgozó profilján látható az orvosi vizsgálat mellett a munkavédelmi oktatás érvényességi ideje és állapota.
- [x] A `/hr` dolgozói főoldalon közvetlenül elérhető a Cafeteria nyilatkozat és az éves keret.
- [x] Az oldalsáv menüje tiszta, nem szerepel benne felesleges menüpont.
- [x] A felületeken érvényesül a Zero-Emoji és No-Decorative-Icons irányelv.
- [x] A TypeScript fordítás (`npx tsc --noEmit`) hibátlanul (0 hiba) fut le.
