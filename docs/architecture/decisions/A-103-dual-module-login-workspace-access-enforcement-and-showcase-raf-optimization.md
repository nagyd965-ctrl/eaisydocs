# A-103: [Közös] Kétmodulos Bejelentkezési Munkaterület-ellenőrzés, eaisyBooks Import Modul-izoláció és Showcase `rAF` / Háttérkép Optimalizáció

**Status:** Decided  
**Date:** 2026-11-02  
**Scope:** `[Közös]`  
**Author:** Agent  
**Kapcsolódó PRD:** [P-132](../../product/decisions/P-132-dual-module-interactive-login-showcase-and-workspace-selector-ux.md)  
**Kapcsolódó Kód:** `src/app/login/actions.ts`, `src/app/login/login-form.tsx`, `src/app/login/showcase-tape.tsx`, `src/app/login/eaisy-login-showcase.css`, `src/app/hr/actions/eaisybooks-employee-actions.ts`, `public/wave_bright.webp`, `public/wave_dark.webp`

---

## 1. Context (Kontextus)
1. **Keresztmodulos belépési rés a `/login` oldalon:**
   - Az `eaisyDocs` és az `eaisyHR` két külön megvásárolható, önálló modul (`felhasznalo_profil.elerheto_modulok`).
   - Amikor a felhasználó a bejelentkező oldalon kifejezetten kiválaszt egy munkaterületet (`targetModule: "docs" | "hr"`), a szerveroldali `login()` akció nem engedheti be csendben a másik modulba, ha a kiválasztott munkaterülethez nincs jogosultsága.
   - Emellett az `eaisyBooks` bérszámfejtési dolgozó-import (`src/app/hr/actions/eaisybooks-employee-actions.ts`) új felhasználói fiók (`!isExistingUser`) létrehozásakor a Postgres trigger által alapértelmezetten beállított `['docs']` tömbhöz hozzáfűzte a `'hr'` értéket (`['docs', 'hr']`), így az újonnan importált HR-dolgozók akaratlanul `eaisyDocs` jogosultságot is kaptak.
2. **Teljesítmény- és hálózati terhelés a bejelentkező oldalon:**
   - Két `<img>` elemként betöltött `4096×2731` felbontású WebP hullám-háttérkép (`2 × 1,16 MB`) esetén a böngésző mindkét témát letöltötte (`~3,2 MB`).
   - A két oldalsó `ShowcaseTape` komponens (`eaisyDocs` bal oldalon, `eaisyHR` jobb oldalon) közül egyszerre csak az egyik látható, de a rejtett szalag `requestAnimationFrame` ciklusa — valamint a háttérbe tett böngészőfül (`document.hidden`) — is 60 FPS-sel futott.

## 2. Decision (A Meghozott Döntés)
1. **Szigorú Munkaterület-ellenőrzés a `login()` Server Action-ben (`src/app/login/actions.ts`):**
   - Sikeres `signInWithPassword` után a szerver lekérdezi a `felhasznalo_profil.elerheto_modulok` tömböt (`hasDocs`, `hasHr`).
   - Ha `targetModule === "docs" && !hasDocs` (vagy `targetModule === "hr" && !hasHr`), a szerver azonnal meghívja a `await supabase.auth.signOut()` függvényt, és visszairányítja a felhasználót a `/login` oldalra a `module`, `suggestedModule` (`"hr"` vagy `"docs"`) és `email` paraméterekkel.
2. **eaisyBooks Import Modul-izoláció (`src/app/hr/actions/eaisybooks-employee-actions.ts`):**
   - Újonnan létrehozott Auth-fiók (`!isExistingUser`) esetén az `elerheto_modulok` értéke explicit `["hr"]` lesz (`isExistingUser ? Array.from(new Set([...currentModules, "hr"])) : ["hr"]`), így az adatbázis-trigger `['docs']` alapértelmezése nem szivárog át a tisztán HR-es dolgozókra.
3. **Kettős (`active` + `document.hidden`) `requestAnimationFrame` Kapuzás (`src/app/login/showcase-tape.tsx`):**
   - A `ShowcaseTape` animációs `useEffect`-je a `[active]` függőségre épül, és `if (!active) return` feltétellel azonnal leállítja a rejtett szalag `rAF` ciklusát.
   - Emellett egy `visibilitychange` eseményfigyelő `document.hidden === true` esetén `cancelAnimationFrame`-mel `0%` CPU-ra állítja a látható szalagot is, amíg a böngészőfül háttérben van.
4. **CSS `background-image` alapú, `1920×1280` WebP hullám-háttér (`src/app/login/eaisy-login-showcase.css`):**
   - A vágatlan master grafikából generált `public/wave_bright.webp` (`168 KB`) és `public/wave_dark.webp` (`163 KB`) kizárólag CSS `background-image`-ként (`.eaisy-login-root::before` és `.dark .eaisy-login-root::before`) töltődik be, így a böngésző mindig csak az aktív témához tartozó egyetlen képet tölti le (`-90%` hálózati méret).

## 3. Consequences (Következmények)
- **Pozitív:** Teljes moduláris szeparáció a bejelentkezéskor; egykattintásos munkaterület-átváltás adatvesztés nélkül; a `/login` oldal teljes mérete `< 200 KB`, a rejtett szalag és a háttérben lévő böngészőfül CPU-terhelése `0%`.
- **Kockázat / Kompromisszum:** Nincs; a mélylinkek (`?next=`) továbbra is megmaradnak az engedélyezett modulon belül.

