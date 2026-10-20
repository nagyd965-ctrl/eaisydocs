# A-077 [Docs] Kereshető Ügyirat-Kiválasztó és Intelligens Iktatási Csatolás Architektúra

## Státusz
Elfogadva (Accepted) - 2026-10-21

## Kontextus és Problémafelvetés
A beérkező iratok iktatásakor (`/inbox/[id]`), a „Meglévőhöz csatolás” (alszámos iktatás) műveletnél a korábbi felület egy sima, nem kereshető `<Select>` legördülő listát használt. Nagyobb iratforgalom vagy több száz ügyirat esetén a lista átláthatatlanná vált:
1. Az iktató ügyintézők nem tudtak célzottan számlaszámra, hivatkozási számra vagy partnerre keresni a meglévő ügyiratok között.
2. A pénzügyi számlák, szerződések és személyzeti (HR) dossziék vegyesen jelentek meg, ami lelassította az iktatást és téves csatolások kockázatát hordozta.
3. A többcég-kezelőben (`company-selector.tsx`) már létezett egy bevált, Linear-flat stílusú, beágyazott keresős és azonnali szűrős komponensminta, amelyet célszerű volt kiterjeszteni az ügyirat-kiválasztásra.

## Architektúrális Döntések

### 1. Új Kanonikus Komponens: `DossierSearchSelector` (`src/components/dossier-search-selector.tsx`)
- **UI Minta:** A `company-selector.tsx` popover felépítését veszi alapul, a rendszer Linear-flat design szabályzatának (ADR [A-029](./A-029-global-ui-consistency-and-unified-components.md)) megfelelően.
- **Trigger Gomb:**
  - Letisztult, egységes magasságú gomb (`h-auto min-h-[44px]`).
  - Kiválasztás hiányában diszkrét placeholder (`Válassz egy meglévő ügyiratot...`) és `ChevronsUpDown` ikon.
  - Kiválasztott elem esetén: kategória badge (színes HSL alapú `PENZUGY`, `SZERZ`, `HR`, `DOCS`), monospaced iktatószám (`font-mono font-medium text-xs`), ügy tárgya és egy azonnali törlő `X` gomb.
- **Beágyazott Instant Keresés (`Search` beviteli mező):**
  - A popover megnyitásakor automatikusan fókuszba kerülő keresősáv.
  - Ékezetfüggetlen normalizálás (`normalizeText`), amely kis- és nagybetűktől, valamint ékezetektől függetlenül szűr (pl. a „tanacs” és „szamla” kifejezések azonnal megtalálják a „Dr. Tanács Ügyvédi Iroda” és „Számla” tételeket).
- **Tematikus Kategória Szűrőchipek:**
  - `Mind`, `Számlák & Pénzügy`, `Szerződések`, `HR`, `Egyéb` szűrőgombok élő darabszám jelvénnyel.
  - Lehetővé teszi, hogy számla érkezésekor egyetlen kattintással kizárhatók legyenek a nem releváns HR vagy egyéb dossziék.
- **Intelligens Partner-ajánló Sáv (`✨ Javasolt ügyiratok a küldő partnerhez`):**
  - Ha az irat küldő partnere ismert (`kuldoPartnerNev`), a selector automatikusan a lista tetejére emeli a partnerhez tartozó nyitott ügyiratokat.
- **Űrlap és Validáció Integráció:**
  - Rejtett beviteli mező (`<input type="hidden" name="existing_ugyirat_id" value={value} />`), amely transzparensen továbbítja az azonosítót a meglévő FormData alapú szerverakcióknak (`filing-actions.ts`).

### 2. Adatbázis Adatgazdagítás és Többcéges Védelem (`src/app/inbox/[id]/page.tsx`)
- A lekérdezés kiegészült a kapcsolódó iratok és külső partnerek adataival:
  ```typescript
  .select(`
    id, iktatoszam, targy, statusz, letrehozva,
    ugy ( targy ),
    irat (
      id, targy, leiras, erkeztetoszam,
      partner:kuldo_partner_id ( id, nev, adoszam )
    )
  `)
  ```
- **Többcéges Elszigetelés:** A lekérdezés szigorúan figyelembe veszi az aktív céget (`getActiveCompanyIdServer()`), a lefedettséget kiterjesztve a korábbi nem migrált rekordokra is (`company_id.eq.${activeCompanyId},company_id.is.null`).

### 3. Kliensoldali Validáció és Dialog Harmonizáció
- A `filing-panel-client.tsx` űrlapellenőrzése explicit hibát ad (`"Kérlek válassz egy meglévő ügyiratot a listából!"`), ha az ügyintéző meglévőhöz csatolási módban választás nélkül próbálna iktatni.
- A korábbi felugró modál (`src/components/filing-dialog.tsx`) szintén megkapta a `DossierSearchSelector` komponenst a rendszer szintű UI egységesség jegyében.

## Következmények és Előnyök
- **Gyors és Pontos Iktatás:** Az ügyintézők azonnal rá tudnak keresni a számlaszámra vagy a partnerre, minimálisra csökkentve a melléiktatás és a duplikált ügyirat-nyitás kockázatát.
- **UI/UX Koherencia:** A cégválasztóval azonos vizuális felépítés ismerős, kényelmes felhasználói élményt nyújt.
- **Multi-tenant és Adatintegritás:** A háttérbeli relációs lekérdezés garantálja, hogy a felhasználó csak a jogosult cég ügyiratait látja, és a választás atomi módon kapcsolja az új iratot a meglévő dosszié alá.
