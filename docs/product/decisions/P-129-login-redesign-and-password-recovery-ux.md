# P-129: Bejelentkezési Oldal Újratervezése, Elfelejtett-jelszó Folyamat és Platform Branding UX

**Status:** Decided  
**Date:** 2026-10-29  
**Scope:** `[Közös]`  
**Category:** Auth / Login & Password Recovery UX  
**Author:** OpenCode  
**Kapcsolódó ADR:** [A-095](../../architecture/decisions/A-095-password-recovery-hungarian-email-and-login-shell-architecture.md)  
**Kapcsolódó Kód:** `src/app/login/page.tsx`, `src/app/login/login-shell.tsx`, `src/app/login/forgot-password/page.tsx`, `src/app/login/actions.ts`, `src/app/auth/set-password/page.tsx`, `src/app/auth/callback/route.ts`, `src/components/layout-wrapper.tsx`  
**Design referenciák:** `docs/design/login-redesign/` (index + 4 variáns: platform-split, minimal-dark, product-showcase, centered-platform, és a kiválasztott V2b minimal-light irány)

---

## 1. Question / Problémafelvetés

A `/login` oldalaldalkalmazás vizuálisan és tartalmilag elavult volt: egyszerű kártya, kizárólag „eaisyDocs" brandinggel, miközben a platform **két terméket** (eaisyDocs + eaisyHR) közös adatbázison, külön vagy együtt vásárolható modulként forgalmaz. Emellett az SSO-gombok eltávolítása után a „Bejelentkezés" gomb alatti rész üresen maradt, és **jelszó-visszaállítási folyamat egyáltalán nem létezett**.

## 2. Decision (A Meghozott Döntés)

### 2.1. Bejelentkezés: középre zárt, minimál platform-design (V2b irány)
- **Stratégiai döntés**: EGY egységes belépési pont a platformnak — a bejelentkezés után a rendszer már ma is automatikusan a jogosultságnak megfelelő modulba irányít (HR-only user → `/hr`, egyéb → Docs dashboard). Productszelektor NEM került a loginra.
- **Elrendezés**: minden középen, egyetlen oszlopban (max-w-[400px]): platform-logó → tagline → űrlapkártya → lábléc.
- **Márka**: az `eai(sy)` logó a design-rendszer konvenciója szerint (e halvány + **ai** teal bold + sy halvány); tagline: „Iratkezelő és munkaügyi platform".
- **Dekoratív háttér** (dekorációs CSS-rétegek, ikonok/emojik nélkül): teal radials ragyogás + vízszintes vonalminta, **Tailwind design-tokenekkel** → sötét módban automatikusan erősebb teal árnyalat.
- **Mezők**: E-mail (`autocomplete="username"`) + Jelszó (`current-password`), a jelszó címkéje mellett „Elfelejtett jelszó?" link, teljes szélességű teal Bejelentkezés gomb; hibaüzenet `role="alert"` jelöléssel.
- **Lábléc**: egysoros, szöveges („© 2026 eaisy · Adatvédelmi tájékoztató · ÁSZF · Kapcsolat") — halott linkek nélkül.

### 2.2. Elfelejtett-jelszó folyamat (új)
- `/login/forgot-password`: e-mail bekérő űrlap; beküldés után **siker-állapot** („Elküldtük az e-mailt") a levélszemét-mappa tippel és az egyszer-használatosság korlátozásának említésével; „Vissza a bejelentkezéshez" visszaút mindkét állapotból.
- Az e-mail: magyar nyelvű, a rendszer egységes sablonjával (teal fejléc, CTA gomb), feladó „eaisy Rendszer" — lásd [A-095] a link-generálási és küldési architektúráért.
- A link a meglévő `/auth/set-password` oldalra vezet (újrahasznosítva), amelyik sikeres jelszómódosítás után beléptet.

### 2.3. `/auth/set-password` harmonizáció
- Platform-logó (e-ai-sy, „eaisyDocs" terméklogó helyett), dekoratív kulcs-ikon-buborék eltávolítása (Zero-Emoji / No-Decorative-Icons irányelv), semleges szöveg („Add meg az új jelszavadat a folytatáshoz.") — így az oldal onboarding-aktiváció és jelszó-visszaállítás szerepben is egyformán működik.

### 2.4. Layout-hiba javítás (login-aloldalak)
- A `LayoutWrapper` publikus útvonal-felismerése `startsWith("/login")` lett: az új forgot-password oldal ÉS a korábban latensen hibás `/login/mfa-verify` (MFA-kód beadásánál sidebarral jelent volna meg) mostantól tiszta, sidebar nélküli elrendezést kap sima átmenettel.

## 3. Rationale (Indoklás)

- A középre zárt minimál irány a design-mockupok (4 élő HTML variáns a `docs/design/login-redesign/` mappában) közül a felhasználói visszajelzés alapján került kiválasztásra — a „Egy platform. Két világ." márkaüzenetet a tagline és a modul-routing mellett a belső oldalak kommunikálják, a login tiszta marad.
- A jelszó-visszaállítás az egyetlen hiányzó „muszáj" funkció volt a fiók-életciklusban; a meglévő `set-password` oldal és callback-ág újrahasznosításával a teljes flow minimális új kóddal, a házdesignjával épült meg.
- A design-token-alapú megvalósítás (nincs hardcoded szín az űrlap-komponensekben) biztosítja, hogy a világos/sötét mód és a jövőbeli téma-váltások automatikusan működjenek.
