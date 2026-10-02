# [Docs] A-028: Konfigurálható Négyszem-Elv és Rendszerbeállítás Tábla

**Status:** Decided  
**Date:** 2026-10-02  
**Scope:** [Docs]  
**Author:** Dani & ThinkAI  
**Kapcsolódó BRD:** [BRD-008](../../business/decisions/008-configurable-four-eyes-disposal-and-sme-mode.md), [BRD-002](../../business/decisions/002-strict-four-eyes-disposal-governance.md)  
**Kapcsolódó PRD:** [P-042](../../product/decisions/P-042-configurable-four-eyes-disposal-ux.md)  
**Kapcsolódó Kód:** `src/utils/system-settings.ts`, `src/app/settings/admin-actions.ts`, `src/app/archive/disposal-actions.ts`, `src/utils/disposal-protocol-pdf.ts`, `supabase/migrations/20261002000001_configurable_four_eyes.sql`

---

## 1. Context (Kontextus)
Az eaisyDocs rendszerben az [A-001](A-001-four-eyes-disposal-validation.md) döntés alapján a selejtezési javaslat felterjesztője szigorúan nem hagyhatta jóvá a saját javaslatát. Ez a nagyvállalati és államigazgatási megfelelőségi auditokon elvárás, azonban:
1. **KKV és egyszemélyes szervezetek:** Kisebb cégeknél az irattáros és a cégvezető vagy adminisztrátor ugyanaz a személy lehet.
2. **Fejlesztési és tesztelési sebesség:** Tesztelés során ellehetetlenítette az egyfelhasználós munkafolyamat-tesztelést második fiók nélkül.
3. Hiányzott egy általános, skálázható konfigurációs tábla a rendszerszintű üzleti kapcsolókhoz.

---

## 2. Decision (A Meghozott Döntés)

1. **Új `public.rendszer_beallitas` tábla létrehozása:**
   - Kulcs-érték tábla JSONB struktúrával (`kulcs TEXT PRIMARY KEY`, `ertek JSONB NOT NULL`, `leiras TEXT`, `updated_at`, `updated_by`).
   - RLS házirendek: Minden hitelesített felhasználó olvashatja (`SELECT`), de kizárólag `admin` vagy `rendszergazda` szerepkörű felhasználó módosíthatja (`UPDATE`).
   - Kezdő kulcs: `'negy_szem_elve_selejtezesnel'` `{"kotelezo": true}` értékkel (alapértelmezetten szigorú audit mód).

2. **Adatbázis RLS és Segédfüggvény:**
   - Létrehoztuk a `public.is_negy_szem_elve_kotelezo()` PostgreSQL függvényt `SECURITY DEFINER` jogosultsággal.
   - Frissítettük a `selejtezes_csomag` tábla UPDATE RLS szabályát:
     `NOT public.is_negy_szem_elve_kotelezo() OR auth.uid() != javaslattevo_user_id`

3. **Alkalmazásszintű Rendszerbeállítás Segédmodul (`src/utils/system-settings.ts`):**
   - `getSystemSetting<T>(key, defaultValue)` és `isFourEyesDisposalRequired()` függvények biztosítják a típusos lekérést szerver komponensekben és Server Action-ökben.

4. **Szerveroldali Döntési Logika (`disposal-actions.ts`):**
   - Lekéri a beállítást.
   - Ha `isSelfApproval && fourEyesRequired`: szigorú hibaüzenettel elutasítja a kérést.
   - Ha `isSelfApproval && !fourEyesRequired`: engedélyezi a jóváhagyást, de az audit integritás érdekében az `esemeny_naplo`-ba bekerül a záradék: `(Egyfelhasználós jóváhagyás - a négyszem-elv feloldva a rendszerbeállítások alapján)`.
   - A generált PDF jegyzőkönyvben átállítja a záradékot és a jóváhagyói titulus mezőt `(Egyfelhasználós jóváhagyás)` jelölésre.

---

## 3. Consequences (Következmények)

### Pozitív:
* **Rugalmasság:** A KKV-k és tesztelők egyetlen kapcsolóval átválthatnak egyfelhasználós jóváhagyási módra.
* **Audit Integritás:** Nincs csendes szabálykerülés: minden egyfelhasználós jóváhagyás expliciten megjelölve kerül mind az eseménynaplóba, mind a PDF jegyzőkönyvbe.
* **Skálázhatóság:** A `rendszer_beallitas` tábla alapul szolgál a jövőbeli rendszerszintű konfigurációkhoz (pl. automatikus iktatószám minták, határidő értesítések).

### Negatív / Kockázat:
* Rendszergazdának felelőssége van az audit mód felügyeletében; auditált nagyvállalati környezetben a kapcsolónak bekapcsolva kell maradnia.
