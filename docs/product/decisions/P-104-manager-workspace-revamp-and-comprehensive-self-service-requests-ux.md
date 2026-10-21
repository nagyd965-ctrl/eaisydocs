# PRD P-104: eaisyHR Vezetői Csapatkezelő Lapok és Önkiszolgáló Kérelmi Előzmények UX Megújítása

- **Dátum:** 2026-10-21
- **Státusz:** `Decided`
- **Hatókör:** `[HR]`
- **Téma:** `HR / Manager Team Workspace & Self-Service Requests UX`
- **Kapcsolódó döntések:** [ADR A-080](../../architecture/decisions/A-080-manager-workspace-revamp-and-comprehensive-self-service-requests-architecture.md), [ADR A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md)

---

## 1. Felhasználói Igény és Célok

A felhasználók két kulcsfontosságú hiányosságot jeleztek az eaisyHR napi használata során:

1. **Vezetői Munkaterület Hatékonysága:**
   - A vezetők számára a korábbi osztott nézetben nehézkes volt a beosztottak keresése és áttekintése.
   - Hiányzott a közvetlen beosztottak gyors, táblázatos lista nézete, és nem volt egyértelmű, hogy az adott munkatárs ma ténylegesen belépett-e és az irodában tartózkodik-e.
   - A jóváhagyások és a csapatnaptár egymás mellett szűknek bizonyultak.

2. **Önkiszolgáló Kérelmi Nyomonkövetés:**
   - Amikor egy munkatárs vagy HR vezető időkorrekciós kérelmet nyújtott be egy adott napra (pl. elfelejtett becsekkolás miatt), a kérelem állapota csak a jelenléti íven látszódott, de az alsó „Saját kérelmeim” összefoglalóban nem jelent meg (ott csak a rendes szabadságok szerepeltek).
   - A felületen lévő kerek ikondobozok idegennek hatottak a Linear flat formanyelvtől.

## 2. Termék és UX Specifikáció

### 2.1 Vezetői Felület (`/hr/manager` és `ManagerTeamTabs`)
- **Felső sáv:** Tiszta cím és alcím, helypazarló felső statisztikai chipek nélkül. A jóváhagyásra váró kérelmek száma diszkrét számláló jelvényként jelenik meg a fül címében (`Jóváhagyások (3)`).
- **Három Teljes Szélességű Lap:**
  1. **`Jóváhagyások`:**
     - Egységes jóváhagyási felület dolgozói csoportosítással, gyorskeresővel és közvetlen elfogadás/elutasítás dialógussal.
     - Tiszta szöveges, dekoratív ikonoktól mentes üres állapot: „Nincs jóváhagyásra váró kérelem”.
  2. **`Csapatnaptár`:**
     - Teljes képernyőszélességű naptárnézet, tágas nap-cellákkal, szabadság és home office színes címkékkel.
  3. **`Közvetlen beosztottak`:**
     - Kétféle nézet: **Kártya nézet** és **Kompakt Lista nézet** (kapcsológomb a jobb felső sarokban).
     - **Gyorskereső és Jelenléti Szűrő:** Keresés név vagy munkakör szerint, szűrés jelenléti státuszra (Mind, Becsekkolva, Távol / Szabadságon, Még nem csekkolt be).
     - **Valós idejű jelenléti státusz:**
       - Ha a dolgozó ma becsekkolt: Zöld jelvény `Becsekkolva (ÓÓ:PP)` időbélyeggel.
       - Ha szabadságon van: Kék jelvény `Szabadságon`.
       - Egyébként: `Nem csekkolt be`.

### 2.2 Önkiszolgáló „Saját kérelmeim” Panel (`/hr/self-service/time`)
- **Minden kérelemtípus megjelenítése:**
  - **Távollét / Szabadság:** `SZABADSÁG` felirat, `TÁVOLLÉT` kategóriajelvény, munkanapok száma, jóváhagyott esetben PDF igazolás megtekintés és letöltés.
  - **Munkaidő korrekció:** `MUNKAIDŐ KORREKCIÓ` felirat, `IDŐKORREKCIÓ` kategóriajelvény, érintett dátum, kért idősáv (pl. `Kért idő: 08:00 – 15:30`), beadott indoklás és esetleges elutasítási magyarázat.
  - **Túlóra kérelem:** `TÚLÓRA KÉRELEM` felirat, `TÚLÓRA` kategóriajelvény, csúsztatás vagy kifizetés típusa, óra és perc időtartam.
- **Időrendi sorrend:** A legújabban benyújtott kérelmek mindig a lista elején szerepelnek.
- **Állapotjelvények:** Folyamatban (figyelmeztető sárga óra ikonnal), Jóváhagyva (zöld pipa), Elutasítva (piros X).
- **Formanyelv:** Felesleges dekoratív kerekített ikondobozok eltávolítva, tiszta szöveges és jelvényes Linear-flat megjelenítés.

## 3. Üzleti Hatás és Elfogadási Kritériumok

- ✅ A felhasználó a benyújtott időkorrekcióját azonnal látja a „Saját kérelmeim” dobozban.
- ✅ A vezetők egy helyen, szűrhetően és lista nézetben is kezelhetik a közvetlen beosztottaikat.
- ✅ A felület megfelel az összes UI/UX egységességi és Zero-Emoji előírásnak.
