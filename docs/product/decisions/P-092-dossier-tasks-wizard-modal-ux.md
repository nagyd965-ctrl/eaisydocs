# PRD P-092: [Docs] Ügyirati Feladatok 3-Lépcsős Varázsló (Wizard Modal) Termékkövetelmény és UX

## Státusz
Elfogadva (Decided) - 2026-10-18

## Cél és Felhasználói Érték
A feladatok rögzítése az ügyirat részletes adatlapján az adminisztrátorok és ügyintézők egyik leggyakrabban használt munkafolyamata. A korábbi beágyazott és lenyíló sablonos űrlap zsúfolt vizuális terhelést jelentett és elvonta a figyelmet a meglévő feladatok haladásáról. A cél egy olyan prémium, lépésről lépésre navigálható modális felület (Wizard) kialakítása, amely kényelmessé teszi mind a sablonos, mind az egyedi feladatkiosztást, anélkül hogy terhelné a fő nézetet.

## Felhasználói Élmény (UX) és Lépések
1. **Főoldal Letisztítása:**
   - Az „Ügyirati Feladatok” kártyán nincs folyamatosan jelen lévő űrlap.
   - Jobb felső sarokban a zöld `+ Új feladat kiadása` gomb azonnal a varázslót indítja.
   - Amennyiben még nincsenek feladatok rögzítve, a középső üres állapot szintén felkínálja az `Új feladat kiadása` gombot.
2. **Varázsló Fejléc és Lépésindikátor:**
   - Fejlécben az ügyirat iktatószáma és felirata.
   - Sorszámozott körjelvény (`1`, `2`, `3`) dinamikus címsorral és segítő leírással.
   - 3-részes haladási sáv zöld színnel az aktív lépéseknél.
3. **1. Lépés: Sablon választás vagy Egyedi feladat:**
   - Keresősáv és kategória szűrőgombok.
   - `+ Új sablon rögzítése` gomb, amely a modálon belül nyit egy kompakt inline űrlapot az új sablon mentéséhez a vállalati tárba.
   - Bal oldali első kártya: „Egyedi feladat (Sablon nélkül)”, amellyel azonnal tiszta lappal indulhat a kiosztás.
   - Minden sablonkártyán kiemelt cím, leírás, határidő indikátor (`+X nap`), törlés gomb egyedi sablonoknál, valamint „Kiválasztás és tovább” gomb, amellyel egy kattintással átléphető a 2. lépésre.
4. **2. Lépés: Feladat alapadatai és felelős:**
   - Cím és felelős kiválasztása.
   - Határidő naptár gyorsgombokkal (`+1 nap`, `+2 nap`, `+1 hét`, `+2 hét`).
   - Prioritás és kategória beállítása.
   - Visszajelző sáv a kiválasztott sablonról és „Sablon módosítása” gyorsvisszalépés.
5. **3. Lépés: Munkautasítás és Összegzés:**
   - Opcionális részletes munkautasítás vagy ellenőrzési pontok (`Textarea`).
   - Strukturált áttekintő kártya a véglegesítés előtt.
   - „Mentés új vállalati feladatsablonként” opció.
   - Zöld „Feladat kiadása” gomb, amely ment, naplóz és bezárja az ablakot.
