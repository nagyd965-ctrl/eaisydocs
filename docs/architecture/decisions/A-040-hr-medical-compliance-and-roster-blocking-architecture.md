# [HR] ADR A-040: Orvosi alkalmassági és beosztási blokkolás architektúra (HR-TASK-05)

## Státusz
Elfogadva

## Dátum
2026-10-10

## Kontextus és Problémafelvetés
A magyar munkavédelmi törvény (1993. évi XCIII. tv. - Mvt. 49. § (1)) és a 33/1998. (VI. 24.) NM rendelet szigorúan előírja, hogy a munkavállaló csak olyan munkára és akkor alkalmazható, ha a foglalkozás-egészségügyi vizsgálat alapján a munkára alkalmasnak minősült. Ha a munkavállaló orvosi alkalmassága lejárt (vagy soha nem volt felvéve), az önálló munkavégzés tilos. A munkáltatót az Mvt. alapján súlyos közigazgatási bírság terheli, ha lejárt orvosival rendelkező munkavállalót foglalkoztat vagy oszt be műszakra.

A rendszer korábbi állapotának feltárása kimutatta, hogy:
1. A dolgozói becsekkolásnál (`toggleCheckIn`) egyáltalán nem volt orvosi alkalmassági ellenőrzés.
2. A műszaktervezésnél (`saveShiftAssignmentAction`) csak puha figyelmeztetés keletkezett, de a szerver nem blokkolta a műszak mentését, és hiányzó vizsgálat esetén még figyelmeztetés sem volt.
3. Az előző hét műszakjainak másolásakor (`copyPreviousWeekRosterAction`) a rendszer nem vizsgálta a cél hét orvosi érvényességét, így tömegesen kerülhettek beosztásra lejárt alkalmasságú dolgozók.

## Döntés
1. **Központi orvosi megfelelőségi motor (`src/utils/hr/medical-compliance-checker.ts`):**
   - Létrehoztunk egy tiszta, determinisztikus függvényt: `checkMedicalValidityForDate(expiryDateStr, targetDateInput)`.
   - Normalizált UTC dátum-összehasonlítást végez az időzóna-eltérések kivédésére.
   - Visszaadja a státuszt (`ervenyes`, `lejar_hamarosan`, `lejart`, `hianyzik`), a hátralévő napok számát és a pontos jogszabályi blokkoló hibaüzenetet (`errorMessage`).
2. **Becsekkolás szigorú blokkolása (Hard Block):**
   - A `toggleCheckIn` (`src/app/hr/self-service/actions.ts`) szerver action a munkaidő megkezdésekor vagy folytatásakor lekérdezi a dolgozó `orvosi_alkalmassag_ervenyesseg` dátumát a `hr_dolgozo_adatlap` táblából.
   - Ha a mai napon a vizsgálat lejárt vagy hiányzik, azonnal blokkolja a becsekkolást és hibaüzenetet ad vissza.
   - **Kivételkezelés:** A munkából való távozást (kicsekkolás) sosem blokkolja a rendszer, biztosítva a munkaidő lezárhatóságát.
3. **Műszaktervezési blokkolás a szerveren (`saveShiftAssignmentAction`):**
   - A műszak hozzárendelésekor a szerver megvizsgálja a beosztás konkrét napját (`datum`).
   - Ha a dolgozó orvosi alkalmassága ezen a napon nem érvényes, a művelet visszautasításra kerül (`success: false, error: ...`).
   - Műszak törlése (`sablon_id === null`) továbbra is engedélyezett, így a korábban tévesen beosztott műszakok eltávolíthatók.
4. **Másolási védelem (`copyPreviousWeekRosterAction`):**
   - A forrás műszakok cél hétre történő másolásakor az algoritmus a jóváhagyott távollétekhez hasonlóan kiszűri és kihagyja azokat a műszakokat, ahol az érintett munkavállaló alkalmassága a cél napon már lejárt.
   - A kimaradt műszakokról összefoglaló figyelmeztetést küld (`skippedMedicalCount`).
5. **UI szintű proaktív tiltás (`ShiftPlannerWeeklyGrid`):**
   - A tervező naptárban a lejárt napokon a cellák figyelmeztető stílust kapnak, a Popover megnyitásakor magyarázó hibaüzenet látható közvetlen dolgozói karton linkkel, és a sablon hozzárendelő gombok le vannak tiltva (`disabled`).

## Következmények
- **Pozitívum:** 100%-os törvényi megfelelőség, a munkavédelmi bírságok kockázata zéróra csökken.
- **Pozitívum:** Mind az előzetes műszaktervezés, mind a tény jelenlét/becsekkolás védett.
- **Költség:** Ha egy dolgozó orvosi vizsgálata lejárt, nem tud becsekkolni; a HR-nek időben rögzítenie kell a megújított alkalmassági vizsgálatot (`MedicalTab`).
