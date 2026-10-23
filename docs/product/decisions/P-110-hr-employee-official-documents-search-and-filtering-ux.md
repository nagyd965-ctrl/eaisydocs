# PRD P-110: 360° Dolgozói Profil Hivatalos Dokumentumok Kereső és Szűrősáv UX

- **Dátum:** 2026-10-23
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [PRD P-096](./P-096-employee-official-documents-dedicated-tab-ux.md), [PRD P-109](./P-109-employee-profile-tab-reorganization-and-safety-training-relocation-ux.md)

---

## 1. Felhasználói Igény és Probléma

1. **Hiányzó Keresési Lehetőség a Hivatalos Dokumentumok Fülön:**
   - A 360°-os dolgozói adatlapon (`/hr/employee/[id]`) a *Hivatalos dokumentumok* fülön egy dolgozóhoz számos irat (munkaszerződés, tájékoztatók, munkavédelmi jegyzőkönyv, NAV T1041 bejelentések, elismerő oklevelek, kártérítési határozatok, stb.) tartozhat.
   - Eddig a lista időrendi sorrendben, ömlesztve jelent meg keresési és szűrési lehetőség nélkül.
   - A HR ügyintézőknek manuálisan kellett végiggörgetniük a teljes idővonalat egy-egy konkrét irat (pl. adott iktatószámú vagy kategóriájú dokumentum) megtalálásához.
2. **Kanonikus UI/UX Hiányosság:**
   - A rendszerben létező szabványos `TableToolbar` (keresőmező, instant gépelés, Szűrés Popover, szűrődarabszám) nem volt beépítve erre a fülre, és a fül tartalma közvetlenül a szerveroldali `page.tsx`-ben volt inline renderelve egy önálló kliens tabkomponens helyett.

---

## 2. Termék és UX Döntések

1. **Önálló `OfficialDocumentsTab` Kliens Komponens Létrehozása:**
   - A többi tabhoz (pl. `LeaveTab`, `PayslipsTab`, `EmploymentTab`) hasonlóan a hivatalos iratok logikája egy dedikált komponensbe került: `src/app/hr/employee/[id]/tabs/OfficialDocumentsTab.tsx`.
   - A `src/app/hr/employee/[id]/page.tsx` letisztult, csak átadja az adatokat a komponensnek.
2. **Kanonikus `TableToolbar` Integrálása:**
   - **Keresőmező:** Instant élő keresés a dokumentum megnevezése (`nev`), iktatószáma (`iktatoszam`) és kategóriája (`kategoria`) alapján. Gyors törlés `X` gombbal.
   - **Szűrés Popover (Tematikus szűrőcsoportok):**
     - *Iktatási státusz:* Iktatva (eaisyDocs) / Belső HR vázlat.
     - *Aláírási állapot:* Aláírt példány / Tervezet (nem aláírt).
     - *Dokumentum kategória:* Dinamikusan képzett kategóriák a meglévő iratok alapján (pl. Munkavédelem, Hatósági bejelentés, Kitüntetések és elismerések, Fegyelmi és kártérítési ügyek, Tanulmányi szerződés, Munkaköri leírás, stb.).
   - **Találati információ:** Élő számláló a toolbar jobb szélén (`Találatok: X / Y` aktív szűrésnél, egyébként `Összesen: Y dokumentum`).
   - **Szűrők törlése:** Egykattintásos azonnali visszaállítás az eredeti teljes listára.
3. **Munkaköri Leírás Felső Sáv Redundanciájának Megszüntetése (`JobDescriptionBadgeAction`):**
   - Ha a dolgozónak már át van adva / le van iktatva a munkaköri leírása, a felső fix banner teljesen elrejtésre kerül (`return null`).
   - Az irat a többi hivatalos dokumentumhoz (pl. munkaszerződés, NAV adatlap) hasonlóan a fül központi idővonalas dokumentumlistájában jelenik meg, megszüntetve a redundanciát és a vizuális törést.
   - A felső sáv kizárólag akkor jelenik meg HR/Adminisztrátorok számára, ha a központi sablontárban még át nem vett, vagy újabb verziójú munkaköri leírás érhető el hozzárendelésre.
   - Eltávolításra került a dekoratív kerekített ikondoboz (`bg-primary/10`) a Zero-Decorative-Icons irányelvnek megfelelően.
4. **Szövegközpontú Üres Állapotok (Zero-Emoji és No-Decorative-Icons Irányelv):**
   - Ha a keresési feltételeknek egyetlen dokumentum sem felel meg, professzionális, tiszta üres állapot jelenik meg indokolatlan dekoratív ikonok nélkül, közvetlen "Szűrők és keresés törlése" akciógombbal.

---

## 3. Érintett Képernyők és Komponensek

| Fájl | Típus | Módosítás |
|---|---|---|
| `src/app/hr/employee/[id]/tabs/OfficialDocumentsTab.tsx` | Új Kliens Komponens | Hivatalos dokumentumok tab `TableToolbar` keresővel, dinamikus szűréssel és idővonallal |
| `src/components/hr/job-description-badge-action.tsx` | Kliens Komponens | Felső sáv elrejtése ha a munkaköri leírás már át van véve, dekoratív ikonbox eltávolítása |
| `src/app/hr/employee/[id]/page.tsx` | Next.js Page | Inline dokumentumlista leváltása az új `OfficialDocumentsTab` komponensre |

---

## 4. Elfogadási Kritériumok (Acceptance Criteria)

- [x] A Hivatalos dokumentumok fülön elérhető a keresőmező az iratnév, iktatószám és kategória szűrésére.
- [x] A keresés instant, gépelés közben azonnal szűri a listát.
- [x] A Szűrés gombra kattintva iktatási és aláírási státusz, valamint kategória szerint is szűrhető a lista.
- [x] A találati számláló pontosan mutatja a szűrt elemek számát.
- [x] Nincs találat esetén tiszta, szöveges üres állapot jelenik meg visszaállítási gombbal.
- [x] A Zero-Emoji és No-Decorative-Icons szabályzat maradéktalanul érvényesül.
- [x] A TypeScript fordítás (`npx tsc --noEmit`) hibátlanul lefut.
