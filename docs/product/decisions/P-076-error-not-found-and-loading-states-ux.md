# P-076 [Docs] Hiba-, „Nem található” és Betöltési Állapotok (Error, Not-found & Loading States UX)

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-057](../../architecture/decisions/A-057-route-error-boundaries-and-loading-skeleton-conventions.md), [P-043](P-043-global-ui-consistency-and-unified-components.md)

## 1. Probléma
Hiba vagy ismeretlen URL esetén a felhasználó a Next.js alapértelmezett, arculatidegen oldalát látta. Több nézet (adatlapok, Vezérlőpult, Szabályok, Beállítások) betöltés közben üresen állt.

## 2. Döntés

### 2.1 Hibaoldal (`error.tsx`, `global-error.tsx`)
- Cím és rövid magyarázat, alatta a **Hibakód** (ha van) az ügyfélszolgálati hivatkozáshoz.
- Két művelet: **Újrapróbálás** (elsődleges) és **Vissza az áttekintéshez** (másodlagos link; eaisyHR alatt „Vissza az eaisyHR főoldalra”).
- Ikon, emoji és illusztráció nélkül (lapos arculat).

### 2.2 „Nem található” oldal (`not-found.tsx`)
- Rövid szöveg, amely jelzi, hogy az oldal nem létezik, vagy nincs hozzá jogosultság (a szűkített láthatóság miatt az iratok/ügyiratok így is „nem találhatóként” jelennek meg).
- Egy visszanavigációs művelet, a hibaoldallal azonos felépítésben.

### 2.3 Betöltési skeleton-ek
| Útvonal | Skeleton |
| --- | --- |
| `/` | `DashboardSkeleton` (KPI sáv + tartalmi blokkok) |
| `/dossiers/[id]`, `/partners/[id]` | `DetailSkeleton` (fejléc + fülek + tartalom) |
| `/inbox/[id]` | `SplitViewSkeleton` (kétpaneles iktatás) |
| `/rules`, `/settings` | `ContentSkeleton padded` |
| meglévő lista-oldalak | `ContentSkeleton` (változatlan) |

A skeleton mérete és térköze az éles oldaléval egyezik, hogy a tartalom beérkezésekor ne ugorjon az elrendezés.

## 3. Nem része
- Az `/audit` oldal (kliens oldali saját betöltési állapot) és az `/hr/*` útvonalak betöltési képernyője (külön döntésre vár).
- Szerveroldali lapozás / szűrés (A8) – külön jóváhagyás után.

## 4. Érintett képernyők
`/` (Vezérlőpult), `/dossiers/[id]`, `/partners/[id]`, `/inbox/[id]`, `/rules`, `/settings`, valamint minden hibás vagy ismeretlen útvonal. Új útvonal nem született, az URL-ek változatlanok.
