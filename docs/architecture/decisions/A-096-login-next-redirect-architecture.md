# A-096: [Közös] Belépés Utáni Célkövetés (`?next=`) Architektúra — Proxy-Emlékezet, MFA-Átvitel és Open-Redirect Védelem

**Status:** Decided  
**Date:** 2026-10-30  
**Scope:** `[Közös]`  
**Author:** OpenCode  
**Kapcsolódó PRD:** [P-130](../../product/decisions/P-130-login-ux-polish-and-gradient-background.md)  
**Kapcsolódó Kód:** `src/utils/supabase/middleware.ts`, `src/utils/url.ts`, `src/app/login/actions.ts`, `src/app/login/page.tsx`, `src/app/login/login-form.tsx`

---

## 1. Context (Kontextus)

A `/login` korábban a belépés után mindig a profil-alapú alapértelmezett célra irányított (HR-only → `/hr`, egyéb → dashboard). Ha egy felhasználó **értesítő e-mailben kapott linkre** kattintott (pl. „jóváhagyták a szabadságodat" → `/hr/self-service/time`), de lejárt a munkamenete, a rendszer a loginra dobta — és belépés után **elfelejtette, hová indult a felhasználó**, aki így kézzel keresgélt vissza (vagy újra az e-mailből kattintott). Ugyanez a helyzet minden megosztott linknél és könyvjelzőnél.

## 2. Decision (A Meghozott Döntés)

### 2.1. Proxy-szintű emlékezet
A `updateSession` proxy (middleware) védett útvonalon be nem lépett felhasználónál a `/login?next=<eredeti útvonal+kereső>` címre irányít (az eredeti query-k törlésével, a célt `next` paraméterben megőrizve). Bejelentkezett felhasználó a `/login?next=…`-ről **egyenesen a céljára** kerül (validált `next` esetén).

### 2.2. Központi validátor: `getSafeRedirectPath` (`src/utils/url.ts`)
Csak relatív, `/`-rel kezdődő belső útvonalat enged át: külső URL és protokoll-relatív (`//…`) tiltott (open-redirect védelem), a `/login*` körzet kizárt (végtelen átirányítási kör ellen). A proxy, a login oldal és a login action egyaráten ezt használja.

### 2.3. Átvitel a bejelentkezés láncán
- A login oldal a `next`-et rejtett mezőben adja át; a `login` action validálva belépés után rögtön a célra irányít (a profil-alapú routing elé).
- **MFA esetén** a cél `redirectTo` query-ként átkerül az MFA-verify oldalra, amely a kód beadása után is a célt tiszteletben tartja.
- Jogosultsági eltérésnél nem duplikáljuk a védelmet: a cél oldal saját modul-jogosultság őre továbbirányít.

## 3. Consequences (Következmények)

**Pozitív:** Minden értesítő e-mail-link, megosztott link és könyvjelző belépés után a helyes oldalra visz; az MFA nem töri meg a láncot.

**Kockázat / Kompromisszum:** A `next` kliensről érkezik (hidden mező), ezért a validátor korlátozása kritikus — külső cím átirányításra nem használható fel. Éles domain-váltásnál (www/nem-www) a `next` relatív volta biztosítja a működést.
