# P-067 [HR] eaisyHR Központi Eseménynapló Újragondolása, Kanonikus Toolbar és Többdimenziós Szűrés UX

- **Dátum:** 2026-10-10
- **Státusz:** Elfogadva (Accepted)
- **Hatókör:** [HR]
- **Kapcsolódó döntések:** [P-043](P-043-global-ui-consistency-and-unified-components.md), [P-066](P-066-eaisyhr-audit-log-deduplication-and-semantic-event-resolution.md), [A-048](../../architecture/decisions/A-048-eaisyhr-central-audit-log-overhaul-and-query-hardening.md)

## 1. Felhasználói Igény és Problémafelvetés
Az eaisyHR Központi Eseménynapló felülete (`/hr/audit`) a rendszer egyik legfontosabb munkaügyi és GDPR megfelelőségi képernyője. Korábban azonban:
1. **Pervazív „Ismeretlen” címkék:** A bejegyzések 95%-a ismeretlen jelvénnyel jelent meg, mert csak 4 fix eseménytípust kezelt a felület.
2. **Nyers SQL táblanevek:** A felhasználók olyan kódokat láttak a képernyőn, mint `hr_dolgozo_titkos_adat`, `hr_munkavedelmi_oktatas`, `hr_offboarding`, amelyek nem felhasználóbarátak.
3. **Hiányzó szűrés:** Nem lehetett szűrni konkrét végrehajtó HR munkatársra, műveletre (ki mit módosított vagy tekintett meg), modulra vagy időszakra.
4. **Hiányzó lapozás és részletesség:** Nem volt strukturált betekintő modal, és nagy elemszámnál a lap átláthatatlanná vált.

## 2. Termék és UX Megoldás

### 2.1 Linear Flat KPI Statisztikai Sáv
A felület tetején 4 kanonikus `KpiCard` kártya foglalja össze az audit állapotot (Linear-inspirált flat design, 0 hover shadow):
- **Összes Audit Esemény:** A visszavonhatatlan bejegyzések összlétszáma.
- **Érzékeny Adat Betekintés:** Kiemelt számláló a TAJ, adóazonosító, bankszámla és béradatok feloldásairól.
- **Módosítások & Törlések:** Mezőszintű változtatások darabszáma.
- **Közreműködő Felhasználók:** Az eseményeket generáló egyedi HR munkatársak száma.

### 2.2 Kanonikus TableToolbar és Szűrőrendszer
A táblázat felett a rendszer szabványos eszköztára kapott helyet:
1. **Instant Keresőmező:** `Search` ikonnal, azonnali gépelési szűréssel, `X` törlőgombbal.
2. **Szűrés Popover (`Filter` gomb aktív szűrő darabszám jelvénnyel):**
   - **Közreműködő Felhasználók:** Dinamikusan generált választólista a naplóban szereplő felhasználókból.
   - **Művelet Típusa:** Megtekintés / Olvasás, Létrehozás / Iktatás, Módosítás, Jóváhagyás / Nyugtázás, Törlés, Rendszeresemény.
   - **Modul / Szakterület:** Bizalmas adatok, Személyes adatok, Iratok & Szerződések, Munkavédelem & Egészségügy, Munkaidő & Jelenlét, Beléptetés & Kiléptetés, Cafeteria, Bérszámfejtés stb.
   - **Dátumtartomány:** `Kezdő dátum` - `Záró dátum` választó és kényelmes gyorsgombok: *Mind*, *Ma*, *Elmúlt 7 nap*, *Elmúlt 30 nap*.
3. **Oszlopválasztó (`Columns3`):** Szabadon ki-be kapcsolható oszlopok (Dátum, Felhasználó, Művelet, Modul, Részletek, Műveletek).
4. **CSV Export:** Teljes szűrt lista exportálása Excel-barát UTF-8 BOM karakterkódolással.

### 2.3 Részletes Esemény Betekintő Modal (`Dialog`)
Sor-kattintásra vagy a *Megnyitás* gombra felugró adatlap:
- **Végrehajtó munkatárs:** Név, munkaköri pozíció, HR szerepkör.
- **Modul és entitás:** Emberi és technikai megnevezés, rekord UUID.
- **Részletes megjegyzés:** Belső UUID-któl megtisztított érthető indoklás.
- **Mezőszintű Diff Tábla:** Módosítás esetén a korábbi (áthúzott piros) és új (zöld félkövér) értékek összehasonlítása magyar mezőnevekkel.
- **Technikai Metaadatok:** IP cím és böngésző azonosító (User Agent).

### 2.4 Reszponzív Lapozás
- 15, 25, 50, 100 elem / oldal választási lehetőség tiszta oldalnavigációval.

### 2.5 Többcég-kezelés (Multi-Tenancy) és GDPR Hatókör UX
- **Aktív Céghez Kötöttség:** A fejlécben a cím mellett diszkrét, prémium HSL badge jeleníti meg az éppen aktív cég nevét (`Building2` ikonnal).
- **Azonnali Szinkronizáció:** Amikor a felhasználó a felső menüben lévő cégválasztóval átvált egy másik vállalatra (pl. *Think AI Kft.* -> *Teszt Kft.*), az Eseménynapló azonnal újratöltődik, a KPI számlálók és a szűrők kizárólag a kiválasztott cég eseményeit mutatják.
- **Cég szerinti CSV Export:** A letöltött CSV fájl sorai tartalmazzák a cég nevét, és a fájlnév is az adott vállalkozás nevével (`eaisyhr_audit_<cegnev>_<datum>.csv`) készül el.

