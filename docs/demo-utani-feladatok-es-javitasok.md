# 📋 eaisyDocs & eaisyHR – Demó Utáni Javítások és Fejlesztési Terv (Post-Demo Action Plan)

Ez a dokumentum összefoglalja a 2026. októberi mély kód- és séma-audit során azonosított, a demó stabilitása érdekében elhalasztott, illetve a demó utánra ütemezett feladatokat, refaktorálásokat és funkcionális fejlesztéseket.

> **Stratégiai döntés:** A demó előtti felkészülés során a cél a 100%-os stabilitás és a közvetlen kockázatok (hibás PostgREST lekérdezések, render-hibák) elhárítása volt. A rendszerszintű mély átalakítások (séma-konszolidáció, szerveroldali lapozás, nagyméretű új modulok) tudatosan a demó utáni sprintre kerültek.

---

## 🏛️ 1. Adatbázis Séma és Adatmodell Konszolidáció (Backend & Database)

Ezek a feladatok a backend adatintegritását és a hosszú távú karbantarthatóságot szolgálják.

### 1.1. Dolgozói Személyes és Szenzitív Adatok Egységes Elérési Rétege (Unified Employee Data View / RPC)
- **Jelenlegi helyzet:**  
  A munkavállalók adatai jelenleg három külön szinten élnek:
  1. `public.hr_dolgozo_adatlap` (nem szenzitív törzsadatok: születési dátum, anyja neve, lakcím).
  2. `public.hr_munkaszerzodes` (szerződéskori adatok: születési hely, TAJ szám, adóazonosító jel, bruttó bér).
  3. `public.hr_dolgozo_titkos_adat` (titkosított `BYTEA` tároló: TAJ szám, adójel, bankszámla, alapbér, nettó bér).
- **Probléma:**  
  A PDF generátoroknak és a hatósági exportoknak (T1041, Kiléptetési lap, Eszközjegyzőkönyv, Munkavédelmi oktatás) fallback logikával kell összevadászniuk a mezőket, ami kódszinten redundanciához vezethet.
- **Teendő demó után:**  
  Készíteni egy dedikált, PostgreSQL `SECURITY DEFINER` függvényt vagy RLS-védett nézetet (pl. `get_employee_official_data(p_employee_id UUID)`), amely a jogosultsággal rendelkező HR-esnek/adminnak egyetlen egységes, típusbiztos struktúrában szolgáltatja a hivatalos azonosítókat.

### 1.2. Supabase Migrációs Lánc Időbélyeg- és Ütközéstisztítása
- **Jelenlegi helyzet:**  
  Két korábbi migrációnál azonos időbélyeg-előtag szerepelt (`20261010000004_add_overtime_compliance_fields.sql` és `20261010000004_hr_esemeny_naplo_company_trigger.sql`), ami miatt az önként vállalt túlmunka mezők felvitele manuális futtatást igényelt az élő adatbázison.
- **Teendő demó után:**  
  A `supabase/migrations/` könyvtár teljes leltározása, az időbélyegek szekvenciális ellenőrzése és rendezése a tiszta, nulláról felhúzható helyi tesztkörnyezet (`supabase db reset`) garantálására.

### 1.3. Eseménynapló Átjárhatóság és Keresztmodul Audit
- **Jelenlegi helyzet:**  
  Az iratkezelés az `esemeny_naplo`, a munkaügy pedig a `hr_esemeny_naplo` táblát használja (mindkettő szigorúan append-only, SQL triggerrel és RLS-sel védve).
- **Teendő demó után:**  
  Egységesíteni a cégváltási és jogosultság-módosítási események naplózását a közös felületeken, hogy a rendszergazdai audit naplóban egyetlen szűréssel látható legyen a teljes szervezeti tevékenység.

---

## 💻 2. Kódminőség, TypeScript és Szigorú Típusosság (Frontend & Actions)

### 2.1. `@typescript-eslint/no-explicit-any` Figyelmeztetések Kigyomlálása
- **Jelenlegi állapot:**  
  Az `npx eslint` 0 hibával, de 6 db `any` figyelmeztetéssel fut le az alábbi fájlokban:
  - `src/app/hr/admin/page.tsx` (sorok: 201, 212, 297, 316, 334, 335) – a dolgozói relációk és beágyazott táblák (`hr_dolgozo_adatlap`, `hr_jogviszony`, `felhasznalo_profil`) szűrésekor.
  - `src/app/hr/offboarding/actions.ts` – a szervezeti egység név feloldásakor.
  - `src/app/hr/actions/asset-actions.ts` és `safety-training-actions.ts`.
- **Teendő demó után:**  
  Központi TypeScript típusdefiníciók készítése (`src/types/hr-database.ts` vagy a Supabase generált típusok kiterjesztése `HrEmployeeWithRelations`), megszüntetve a manuális `any` kényszerítéseket.

### 2.2. React 19 Compiler Idempotencia Audit
- **Jelenlegi állapot:**  
  A render közbeni instabil `Date.now()` hívásokat kijavítottuk az `audit/page.tsx` és `rules-client.tsx` fájlokban, így a React Compiler nem dob hibát.
- **Teendő demó után:**  
  A teljes `src/` mappára kiterjedő statikus vizsgálat a komponensek render-tisztaságára, a `useMemo` és `useCallback` dependency array-ek minimalizálására.

---

## ⚡ 3. Skálázhatóság és Teljesítmény Nagy Adatbázisokhoz (Performance & Scale)

### 3.1. Szerveroldali Lapozás és Keresés (Tasklist A8)
- **Miért maradt demó utánra?**  
  Demó közben a tesztadatok száma (néhány tucat irat és dolgozó) mellett a kliensoldali szűrés (`TableToolbar`) azonnali, 0 ms-os gépelési élményt nyújt. Egy esetleges szerveroldali kurzor- vagy szűrőhiba a bemutató alatt kockázatos lett volna.
- **Teendő élesítés előtt:**  
  - Iktatókönyv (`/dossiers`), Bejövő sor (`/inbox`), Partnerek (`/partners`) és Irattár (`/archive`) átállítása `use-url-list-state` alapú szerveroldali lapozásra (25/50/100 elem).
  - PostgreSQL `Security Invoker` nézetek (`iktatokonyv_lista`, `partner_lista`) bevezetése FTS (Full Text Search) indexeléssel, hogy 100.000+ irat esetén is 50 ms alatt maradjon a válaszidő.

---

## 🎯 4. Felhasználói Élmény és UI/UX Finomhangolások (Quick Wins Backlog)

Ezek a funkciók nem érintenek mély architektúrát, de jelentősen növelik a professzionális szoftverérzetet:

### 4.1. Egységesített Üres Állapot Komponens (`EmptyState`, Tasklist A6)
- **Cél:** Ha egy szűrésnek nincs találata vagy egy lista üres (pl. nincsenek még kitüntetések, nincs találat a keresőben), mindenhol ugyanaz a letisztult, elegáns elrendezés fogadja a felhasználót (rövid cím, 1 mondatos magyarázat és egy „Szűrők törlése” vagy „+ Új hozzáadása” gomb).
- **Megvalósítás:** Újrahasznosítható `EmptyState` komponens (`src/components/ui/empty-state.tsx`) beillesztése az összes táblázat üres ágába.

### 4.2. Duplikátum-figyelmeztetés Bejövő Iktatáskor (Tasklist B1)
- **Cél:** Ha egy beérkező fájl SHA-256 hash-e vagy azonos partnertől érkező azonos bizonylatszám már szerepel a rendszerben, az iktatási panel tetején diszkrét sárga figyelmeztetés jelenik meg: *„Figyelem: Ezzel a tartalommal már létezik iktatott irat: [IKT-2026/00045]”*.

### 4.3. Jogi Visszatartás (Legal Hold) Kapcsoló (Tasklist B2)
- **Cél:** Egykattintásos kapcsoló az ügyirat adatlapon: ha egy ügyirat per vagy vizsgálat tárgya, zárolható a selejtezés alól, így a megőrzési idő lejárta után sem kerülhet be a selejtezési javaslatba.

### 4.4. Ügyirat Életciklus-léptető (Stepper, Tasklist A11)
- **Cél:** Vizuális folyamatsáv az ügyirat fejlécében:  
  `Érkeztetve` ➔ `Iktatva` ➔ `Ügyintézés alatt` ➔ `Lezárva` ➔ `Irattárban`.

### 4.5. Tömeges Műveletek a Táblázatokban (Bulk Actions, Tasklist A9)
- **Cél:** Több sor kijelölése jelölőnégyzettel, és lebegő alsó akciósáv:
  - Tömeges felelős-váltás
  - Tömeges címkézés / kategóriaváltás
  - Tömeges irattárba helyezés
  - Kijelöltek exportálása Excel / CSV formátumban

### 4.6. Mentett Szűrők / Nézetek a `TableToolbar`-ban (Tasklist A10)
- **Cél:** Gyakran használt szűrőkombinációk névvel történő elmentése (pl. *„Saját nyitott szerződéseim”*, *„Múlt heti bejövők”*) és egykattintásos előhívása.

### 4.7. Késedelmes Fizikai Iratkölcsönzés Emlékeztető (Tasklist B5)
- **Cél:** Ha a kikölcsönzött fizikai irat határideje lejárt, automatikus feladat és e-mail értesítés generálódik a kölcsönvevőnek és az irattárosnak.

---

## 🚀 5. Stratégiai Nagy Modulok (Középtávú Roadmap)

A demó után induló fejlesztési sprint stratégiai elemei:

| Kód | Modul Neve | Fő Funkcionalitás |
|---|---|---|
| **C1** | **Szerződéskezelési Modul (CLM)** | Szerződésnyilvántartás, automatikus lejárati/felmondási értesítők, verziókövetés, kötelezettségek menedzsmentje. |
| **C2** | **Jóváhagyási és Aláírási Munkafolyamat Lánc** | Párhuzamos és szekvenciális jóváhagyási lánc kimenő levelekre, szerződésekre és selejtezésekre. |
| **C3** | **GDPR és Megfelelőségi Központ** | Érintetti joggyakorlási kérelmek (törlés/betekintés), határidő-számítás, PDF anonimizálás (redaction). |
| **C4** | **Cégkapu / Hivatali Kapu Integráció** | Hivatalos állami küldemények automatikus fogadása és feladása hiteles tértivevénnyel. |
| **C5** | **Minősített Időbélyegzés (RFC 3161)** | PDF/A iratok minősített időbélyegző szolgáltatóhoz kötése a törvényi hitelességhez. |
| **C6** | **Kimenő Webhook és REST API Központ** | Külső rendszerek (ERP, CRM) valós idejű értesítése iratkezelési eseményekről. |

---

## 📊 Prioritási Mátrix a Demó Utáni Első Hétre

```mermaid
graph TD
    subgraph 1. Sprint (Demó utáni 1-2. nap)
        A[1.1 Dolgozói Szenzitív Adat Layer View/RPC]
        B[2.1 'any' típusok kigyomlálása]
        C[1.2 Migrációs lánc tisztítás]
    end

    subgraph 2. Sprint (Demó utáni 3-5. nap)
        D[4.1 Egységes EmptyState komponens]
        E[4.2 Duplikátum figyelmeztetés iktatáskor]
        F[4.3 Legal Hold kapcsoló]
    end

    subgraph 3. Sprint (Élesítés előtt)
        G[3.1 Szerveroldali lapozás & FTS nézetek]
        H[4.5 Tömeges műveletek - Bulk Actions]
    end

    A --> D
    B --> D
    C --> G
    D --> G
    E --> H
```
