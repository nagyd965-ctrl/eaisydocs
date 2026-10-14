# A-057 [Docs] Route-szintű Hibakezelés (error / not-found / global-error) és Betöltési Skeleton Konvenciók

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-029](A-029-global-ui-consistency-and-unified-components.md), [P-076](../../product/decisions/P-076-error-not-found-and-loading-states-ux.md)

## 1. Kontextus és Problémafelvetés
Az alkalmazásból hiányzott az `error.tsx`, a `not-found.tsx` és a `global-error.tsx`, így egy futásidejű hiba vagy ismeretlen URL a Next.js alapértelmezett, magyar nyelvű és arculatidegen oldalát mutatta. A `loading.tsx` fájlok csak a lista-oldalaknál léteztek; az adatlapok (`dossiers/[id]`, `partners/[id]`, `inbox/[id]`), a Vezérlőpult, a Szabályok és a Beállítások üres képernyővel vártak a szerveroldali lekérdezésekre.

## 2. Architektúra Döntések

### 2.1 Hibahatárok a Next.js 16.2 API szerint
- A hibakomponensek **`unstable_retry`** propot kapnak (nem `reset`), ezt hívja az „Újrapróbálás” gomb.
- A `global-error.tsx` saját `<html lang="hu"><body>` elemet renderel, mert a gyökér layoutot cseréli; ezért natív elemeket és sima `<a>` linket használ, a `./globals.css`-t pedig maga importálja.
- A megjelenítést a megosztott `RouteError` és `RouteNotFound` komponensek adják (ikon nélkül, a hibakód – `error.digest` – megjelenítésével).
- A „vissza” cél a tiszta, tesztelt `getErrorBackTarget(pathname)` függvényből jön (`src/utils/error-navigation.ts`): `/hr` és `/hr/*` esetén az eaisyHR főoldal, egyébként az eaisyDocs áttekintés. Így a két modul hibaoldala sosem a másikba irányít.

### 2.2 Betöltési skeleton-ek
- A `ContentSkeleton` kapott egy `padded` propot: a saját `p-8 pt-6` belső térközt használó oldalaknál (Szabályok, Beállítások) a skeleton ugyanazt a térközt veszi fel, így nincs layout-ugrás.
- Új skeleton-ek: `DashboardSkeleton`, `DetailSkeleton`, `SplitViewSkeleton` (bejövő sor iktatási kétpaneles nézet).
- **Route group:** a `src/app/page.tsx` a `src/app/(dashboard)/page.tsx` helyre került (az URL `/` változatlan), hogy a Vezérlőpult `loading.tsx`-e **csak a `/` útvonalra** vonatkozzon. Egy gyökér `app/loading.tsx` felvillanna a `/login`, `/karrier`, `/embed` és `/hr/*` útvonalakon is.
- A `/audit` oldal kliens komponens saját betöltési állapottal, ezért ahhoz tudatosan nem készült `loading.tsx`.

## 3. Mérlegelt Alternatívák
- **Gyökér `app/loading.tsx`:** elvetve, mert minden alútvonalra (login, HR, publikus oldalak) ráhúzná a Vezérlőpult skeleton-jét.
- **Hibaoldal ikonokkal / illusztrációval:** elvetve, mert ellentmond a platform ikonmentes, lapos arculatának ([A-029](A-029-global-ui-consistency-and-unified-components.md)).

## 4. Érintett Fájlok
- `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/global-error.tsx`
- `src/components/route-error.tsx`, `src/components/route-not-found.tsx`
- `src/utils/error-navigation.ts` (+ `src/utils/__tests__/error-navigation.test.ts`)
- `src/components/ui/content-skeleton.tsx`, `dashboard-skeleton.tsx`, `detail-skeleton.tsx`, `split-view-skeleton.tsx`
- `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/loading.tsx`, valamint a `dossiers/[id]`, `partners/[id]`, `inbox/[id]`, `rules`, `settings` útvonalak `loading.tsx` fájljai

## 5. Hatások és Konzekvenciák
- **Pozitív:** egységes, magyar nyelvű hiba- és „nem található” oldal; a hibakód támogatási célra megadható; az adatlapok és a Vezérlőpult navigációja nem üres képernyővel indul.
- **Figyelendő:** az `unstable_retry` instabil API – Next.js frissítésnél ellenőrizendő. Az új gyökér-szintű oldalakat a `(dashboard)` csoportba **csak** akkor szabad tenni, ha ugyanazt a skeleton-t kell kapniuk.
