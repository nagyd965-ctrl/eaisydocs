# P-132: [Közös] Interaktív Kétmodulos (`eaisyDocs` | `eaisyHR`) Bejelentkezési Oldal, Pörgő Showcase Kártyaszalag és Munkaterület-választó UX

**Status:** Decided  
**Date:** 2026-11-02  
**Scope:** `[Közös]`  
**Category:** `Auth / Dual-Module Login & Interactive Showcase UX`  
**Author:** Agent  
**Kapcsolódó ADR:** [A-103](../../architecture/decisions/A-103-dual-module-login-workspace-access-enforcement-and-showcase-raf-optimization.md)  
**Kapcsolódó Kód:** `src/app/login/page.tsx`, `src/app/login/login-form.tsx`, `src/app/login/login-shell.tsx`, `src/app/login/showcase-tape.tsx`, `src/app/login/eaisy-login-showcase.css`, `src/app/login/actions.ts`, `src/app/hr/layout.tsx`, `src/components/layout-wrapper.tsx`, `public/wave_bright.webp`, `public/wave_dark.webp`, `public/avatars/avatar-1.webp`..`avatar-4.webp`

---

## 1. Question / Problémafelvetés
Az `eaisyDocs` és az `eaisyHR` közös autentikációs belépési pontot (`/login`) használ, azonban a korábbi statikus bejelentkező képernyőn:
- Nem volt vizuálisan és funkcionálisan szétválasztva, hogy a felhasználó az **eaisyDocs** (Iratkezelés és iktatás) vagy az **eaisyHR** (Munkaügy és jelenlét) munkaterületre kíván belépni.
- Hiányzott az eaisy termékcsalád 2026-os vizuális megjelenése (folyamatosan gördülő, interaktív funkció-bemutató kártyaszalagok és teljes szélességű hullám-háttér).
- Ha egy kizárólag `eaisyHR` jogosultsággal rendelkező munkavállaló az `eaisyDocs` fülön próbált belépni (vagy fordítva), a felület nem adott strukturált visszajelzést és egykattintásos átváltási lehetőséget.
- A láblécben szereplő jogi hivatkozások (*Adatvédelmi tájékoztató*, *ÁSZF*, *Kapcsolat*) nem voltak kattinthatók, és a böngészőfül címe (`document.title`) az `eaisyHR` felületen is `eaisyDocs - Iratkezelő` maradt.

## 2. Decision (A Meghozott Döntés)
1. **Háromoszlopos (Bal Showcase – Középső Login Kártya – Jobb Showcase) Elrendezés (`LoginForm`, `eaisy-login-showcase.css`):**
   - **Középső bejelentkező kártya (`eaisy-login-card`):**
     - A kártya tetején egy **Csúszó Kapszulás („Sliding Pill”) Munkaterület-választó** (`eaisyDocs — Iratkezelés és iktatás` | `eaisyHR — Munkaügy és jelenlét`) található, amelyben az aktív zöld háttér-kapszula (`bg-primary`) `cubic-bezier(0.16, 1, 0.3, 1)` animációval csúszik át a két opció között.
     - A felső logó (`EaisyLogo`) és a böngészőfül címe (`document.title`) dinamikusan követi a kiválasztott munkaterületet (`eaisyDocs` vs `eaisyHR`).
   - **Bal oldali `eaisyDocs` Showcase Szalag (`side-left`):**
     - Alapértelmezetten az `eaisyDocs` aktív; ilyenkor a bal oldalon folyamatosan lefelé gördül az `Iratkezelés, újragondolva.` kártyaszalag (`docsShowcaseSlides`: *Érkeztetés és iktatás*, *Ügyiratok és dossziék*, *Hiteles másolat és záradék*, *Eseménynapló és megőrzés*).
   - **Jobb oldali `eaisyHR` Showcase Szalag (`side-right`):**
     - Amikor a felhasználó átkattint az `eaisyHR` munkaterületre, a bal oldali szalag elhalványul, és a jobb oldalon megjelenik a lefelé gördülő `Humánügyek, újragondolva.` kártyaszalag (`hrShowcaseSlides`: *Dolgozói Portál és jelenlét*, *Szabadság és munkaidő*, *Munkaszerződés és NAV T1041*, *Teljesítmény és karrier*).
   - **Interaktív kártyakijelölés és fotórealisztikus vállalati portrék (`ShowcaseTape`):**
     - Bármely kártyára kattintva a szalag középre igazítja a kártyát, megállítja a görgetést, és neon-teal SVG keret-animációval (`strokeDashoffset` sweep) emeli ki a kártyát.
     - A kártyák fejlécében 4 generált és optimalizált (`1.2–1.7 KB` WebP) LinkedIn-stílusú vállalati portré (`public/avatars/avatar-1.webp`..`avatar-4.webp`) jelenik meg.
2. **Strukturált „Másik munkaterülethez tartozó fiók” kártya és Egykattintásos Átváltás + Belépés:**
   - Ha egy kizárólag `eaisyHR` jogosultsággal rendelkező felhasználó az `eaisyDocs` fülön próbál belépni (vagy fordítva), a rendszer nem engedi be a másik modulba, hanem egy strukturált, `border-primary/25 bg-primary/[0.06]` információs panelt jelenít meg:
     - **Cím:** `Másik munkaterülethez tartozó fiók`
     - **Szöveg:** `Ehhez a fiókhoz kizárólag az eaisyHR munkaterület érhető el.` (illetve `eaisyDocs`)
     - **Egykattintásos akció (`handleQuickSwitchModule`):** Az `Átváltás az eaisyHR munkaterületre és belépés →` gombra kattintva a felső csúszka átvált a megfelelő modulra, és ha a jelszómező ki van töltve, `180 ms` után automatikusan be is küldi a belépést.
3. **Hibás jelszó visszajelzés, mikro-rezgés (`is-shaking`) és e-mail megőrzés:**
   - Hibás e-mail vagy jelszó esetén a kártya egy `280 ms`-os vízszintes mikro-rezgést (`eaisy-login-shake`) végez, a beírt e-mail cím megmarad a mezőben (`initialEmail`), a kurzor pedig automatikusan a **Jelszó** mezőbe fókuszál.
4. **Kattintható jogi és kapcsolati lábléc + Dinamikus böngészőfül címek:**
   - A bejelentkező kártya alatt tiszta fehér szöveggel (`text-white drop-shadow`), külön buborék nélkül érhetők el a közvetlen linkek:
     - `Adatvédelmi tájékoztató` → `https://eaisy.hu/adatkezelesi-tajekoztato`
     - `ÁSZF` → `https://eaisy.hu/aszf`
     - `Kapcsolat` → `https://eaisy.hu/#kapcsolat`
   - A `src/app/hr/layout.tsx` (`metadata.title`) és a `src/components/layout-wrapper.tsx` biztosítja, hogy minden `/hr` és `/karrier` útvonalon `eaisyHR - Humánügyviteli rendszer` szerepeljen a böngészőfülön.

## 3. Rationale (Indoklás)
A kétmodulos (`eaisyDocs` | `eaisyHR`) csúszó munkaterület-választó és az oldalsó interaktív kártyaszalagok már a belépés pillanatában egyértelművé teszik a két termék önálló identitását, miközben a strukturált munkaterület-ellenőrzés és az egykattintásos gyorsváltó megelőzi a téves modulba történő belépést anélkül, hogy a felhasználónak újra be kellene gépelnie az adatait.

