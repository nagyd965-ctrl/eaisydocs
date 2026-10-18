# ADR A-073: [Docs] Ügyirati Feladatok 3-Lépcsős Varázsló (Wizard Modal) Architektúra

## Státusz
Elfogadva (Decided) - 2026-10-18

## Kontextus és Problémafelvetés
Az ügyirat részletes adatlapján (`/dossiers/[id]`) a korábbi feladatkiosztó modul közvetlenül az oldalon, egy beágyazott űrlapként és lenyitható katalógusként foglalt helyet:
1. **Túlzsúfoltság és DOM kitakarás:** A sablonkatalógus megnyitásakor az űrlap a fél képernyőt elfoglalta, lefelé tolta a meglévő feladatok táblázatát, és nehezen volt átlátható.
2. **Inkonzisztens UX a rendszerben:** Az eaisyDocs más kiemelt folyamataiban (mint például a Válaszlevelek expediálása az `OutgoingDocumentsTab`-ban) bevált a 3 lépcsős, dedikált modális varázsló (Wizard), amely lépésről lépésre vezeti végig a felhasználót.
3. **Sablonkezelés hiánya vagy szétaprózódása:** A felhasználó igényelte, hogy a sablonok böngészése, kiválasztása, valamint új sablonok rögzítése közvetlenül a varázslóban történjen, anélkül, hogy a feladatok főoldala szétcsúszna.

## Döntés
1. **Beágyazott űrlap megszüntetése és a főoldal letisztítása:**
   - Az „Ügyirati Feladatok” kártyáról a terjedelmes beágyazott composer teljesen kivezetésre került.
   - A fejlécbe egyetlen prémium zöld/primary akciógomb került: `+ Új feladat kiadása`.
   - A kártyatest így közvetlenül a folyamatjelzőre, a figyelmeztető bannerekre és az ügyirat feladatainak listájára összpontosít.
2. **Kanonikus 3-lépcsős feladatvarázsló bevezetése (`tasks-tab.tsx`):**
   - **1. Lépés – Sablon kiválasztása vagy egyedi feladat:**
     - Azonnali szöveges kereső a sablonok között.
     - Tematikus kategóriaszűrő chipek (Összes, Pénzügy, Jogi/Szerződés, Szállítmányozás, HR, Egyedi).
     - Inline sablonrögzítő űrlap a vállalati tár bővítéséhez (`saveTaskTemplate`).
     - Rácsos nézet a sablonokból és a dedikált „Egyedi feladat (Sablon nélkül)” kártyából, egykattintásos „Kiválasztás és tovább” gombokkal.
   - **2. Lépés – Feladat alapadatai és felelős:**
     - Feladat megnevezése, felelős munkatárs választó, határidő gyorsgombokkal (`+1 nap`, `+2 nap`, `+1 hét`, `+2 hét`), prioritás és kategória.
   - **3. Lépés – Részletes instrukciók és összegzés:**
     - Részletes munkautasítás vagy megjegyzés (`Textarea`).
     - Összegző kártya az összes kiválasztott paraméterrel és az ügyirat iktatószámával.
     - Opcionális „Mentés új feladatsablonként” jelölőnégyzet.
     - Véglegesítés audit naplózással és azonnali optimista frissítéssel.

## Érintett Fájlok
- `src/components/tasks-tab.tsx`

## Következmények
- A feladatok fül visszanyerte letisztult, modern Linear-stílusú megjelenését.
- A feladatkiosztás folyamata egységessé vált a rendszer többi varázslójával (pl. Válaszlevelek).
- A sablonok kezelése és az új sablonok mentése zökkenőmentessé vált a feladatkiosztás megszakítása nélkül.
