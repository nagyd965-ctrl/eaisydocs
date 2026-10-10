# P-066 [HR] eaisyHR Változáskövetés (Audit Napló) UX: Letisztult Eseménymegjelenítés, Keresés és Duplikációmentesítés

- **Dátum:** 2026-10-10
- **Státusz:** Elfogadva (Accepted)
- **Hatókör:** [HR]
- **Kapcsolódó döntések:** [P-065](P-065-canonical-audit-log-formatting-ux.md), [A-047](../../architecture/decisions/A-047-eaisyhr-audit-log-deduplication-and-semantic-event-resolution.md)

## 1. Felhasználói Igény és Probléma
A HR munkatársak és dolgozók a dolgozói adatlap „Előzmények” lapján azt tapasztalták, hogy:
1. Nyers technikai kulcsszavak jelentek meg: pl. `Érzékeny Adatok (TAJ, Adó) - irat_megtekintes`.
2. A felirat alapján a felhasználó azt hitte, hogy nem létező TAJ és adóigazolvány dokumentumokat (iratokat) nyitott meg, ami komoly zavart keltett.
3. Egyszeri adatmódosítás vagy betekintés során a napló többszörösen is ugyanazt a bejegyzést mutatta, túlzsúfolva a felületet.
4. Az előzményekből hiányoztak a dolgozóhoz kapcsolódó hivatalos iratok és szerződések (munkaszerződés, orvosi igazolások, fegyelmi iratok).

## 2. Termék és UX Megoldás
1. **Érthető, Emberi Megnevezések:**
   - A technikai kódok helyett azonnal értelmezhető magyar címek:
     - `Érzékeny adatok (TAJ, Adó, Bér) feloldása`
     - `Érzékeny adatok (TAJ, Adó, Bér) módosítása`
     - `Hivatalos dokumentum / Szerződés iktatása`
     - `Személyes Adatok - Módosítás`
   - A mezőváltozásoknál a technikai adatbázismezők helyett magyar címkék (pl. `szuletesi_datum` -> `Születési dátum`, `anyja_neve` -> `Anyja neve`).
2. **Szemantikus Eseményjelvények és Ikonok:**
   - Kék/info jelvény és szem ikon a megtekintéshez / feloldáshoz.
   - Borostyán/warning jelvény és szerkesztés ikon a módosításokhoz (előtte/utána értékekkel).
   - Zöld/success jelvény és pipa ikon az iktatásokhoz és létrehozásokhoz.
   - Piros/destructive jelvény a törlésekhez.
3. **Kategória Szűrők és Keresés:**
   - Kényelmes szűrőgombok az előzmények fejlécében darabszámmal:
     - `[ Összes ]`
     - `[ 🔒 Érzékeny adatok ]`
     - `[ ✏️ Módosítások ]`
     - `[ 📄 Iratok & Szerződések ]`
   - Gyorskereső mező, amely azonnal szűr a megjegyzésekre, eseménycímekre és felhasználónevekre.
4. **Intelligens Tömörítés:**
   - Ha korábbi technikai hiba vagy dupla kattintás miatt 1 percen belül többször is rögzítésre került ugyanazon adat feloldása, a rendszer egyetlen tiszta bejegyzésként jeleníti meg diszkrét jelzéssel (`2× feloldva 1 percen belül`).
