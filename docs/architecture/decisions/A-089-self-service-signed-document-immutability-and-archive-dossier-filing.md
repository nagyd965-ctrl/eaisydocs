# A-089: [HR] [Közös] Dolgozói Aláírt Dokumentum Egyszeri Feltöltési Védelme és Irattári Személyi Dosszié Iktathatóság Architektúra

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]` `[Közös]`  
**Author:** Antigravity AI  
**Kapcsolódó PRD:** [P-122](../../product/decisions/P-122-self-service-signed-document-upload-org-navigation-and-archive-restore-ux.md)  
**Kapcsolódó Kód:** `src/app/hr/employee/[id]/actions.ts`, `src/utils/hr-filing-bridge.ts`, `src/app/dossiers/[id]/actions.ts`, `src/components/dossier-lifecycle-actions.tsx`  

---

## 1. Context (Kontextus)
1. **Dolgozói aláírt dokumentumok feltöltése és módosíthatatlansága (`/hr/self-service/documents`):**
   - A dolgozói önkiszolgáló Dokumentumaim felületen a rendszer által generált dokumentumok (`Tervezet` státusszal, aláírás nélkül) megtekinthetők és letölthetők voltak, de a munkavállaló nem tudta visszatölteni a saját maga által aláírt PDF példányt.
   - Munkajogi és bizonyító erejű megfontolásból azonban kritikus, hogy miután a dolgozó feltöltötte az aláírt példányt, azt önhatalmúlag **ne tudja utólag lecserélni vagy felülírni**, miközben az eredeti (aláírás nélküli) PDF példánynak is meg kell maradnia.
2. **Személyi dossziék irattári iktathatósága és selejtezési visszaállítás (`eaisyHR ↔ eaisyDocs`):**
   - A `getOrCreateEmployeeDossier` (`src/utils/hr-filing-bridge.ts`) korábban az `irattarban` státuszú ügyiratokat is lezártként (`CLOSED_STATUSES`) kezelte, és megtagadta az új HR dokumentumok iktatását. Mivel a munkavállalói személyi dossziék 50 éves megőrzési idővel az Irattárban (`irattarban`) élnek, a dolgozó aktív munkaviszonya alatt keletkező új dokumentumokat (pl. szerződésmódosítás, szabadságlap, orvosi alkalmassági) folyamatosan be kell tudni iktatni.
   - Emellett szükség volt egy biztonságos szerveroldali műveletre (`restoreDossierToArchive`), amellyel a véletlenül `selejtezheto` vagy `selejtezett` állapotba került dossziék visszaállíthatók az irattárba.

## 2. Decision (A Meghozott Döntés)
1. **Tulajdonosi egyszeri feltöltés és HR/Admin cserejogosultság (`uploadSignedHrDocumentAction`):**
   - A `src/app/hr/employee/[id]/actions.ts` fájlban az `uploadSignedHrDocumentAction` először lekérdezi a cél `hr_dokumentum` rekordot (`dolgozo_id`, `alairt_fajl_url`).
   - Ha a bejelentkezett felhasználó megegyezik a dokumentum tulajdonosával (`doc.dolgozo_id === user.id`), és a dokumentumhoz **még nincs** aláírt példány (`!doc.alairt_fajl_url`), a feltöltés engedélyezett.
   - Ha a dokumentumhoz már tartozik `alairt_fajl_url` (vagy a feltöltő nem a dokumentum tulajdonosa), a művelet szigorúan meghívja a `requireHrAuthServer("admin", ["admin", "hr_manager", "hr_specialist"])` ellenőrzést.
   - Az eredeti PDF érintetlen marad a `hr_dokumentum.url` oszlopban (és iktatott irat esetén az `irat_fajl` 1. verziójaként), míg az aláírt példány az `alairt_fajl_url` oszlopba és az `irat_fajl` új (`verzio + 1`, `Signed Copy`) rekordjába kerül, SHA-256 hash számítással és `hr_esemeny_naplo` + `esemeny_naplo` bejegyzéssel.
2. **Irattárban lévő személyi dossziék nyitva tartása iktatáshoz (`src/utils/hr-filing-bridge.ts`):**
   - A `getOrCreateEmployeeDossier` függvényben a `CLOSED_STATUSES` konstansból eltávolításra került az `"irattarban"` állapot (`const CLOSED_STATUSES = ["lezart", "selejtezheto", "selejtezett"]`), így az irattárban tárolt személyi dossziékba hiba nélkül iktathatók az új HR iratok.
3. **Dosszié visszaállítása selejtezésből az irattárba (`restoreDossierToArchive`):**
   - A `src/app/dossiers/[id]/actions.ts` fájlban létrejött a `restoreDossierToArchive(ugyiratId)` Server Action (`admin` / `irattaros` / `vezeto` jogosultsággal), amely törli az ügyiratot a még le nem zárt `selejtezes_tetel` sorokból, visszaállítja az ügyirat státuszát `irattarban` értékre, HR személyi dosszié (`HR/...`) esetén 50 évre (egyéb ügyiratnál az irattári tétel megőrzési idejére) állítja a `megorzesi_ido_vege` dátumot, és rögzíti a `statusz_valtozas` eseményt az `esemeny_naplo` táblában.

## 3. Consequences (Következmények)
**Pozitív:**
- Teljes körű elektronikus aláírási munkafolyamat a dolgozói önkiszolgálóban az eredeti példány megőrzésével és utólagos manipuláció elleni védelemmel.
- Az irattárban (`irattarban`) lévő személyi dossziékba megszakítás nélkül iktathatók az új munkaügyi iratok, a véletlenül selejtezésre jelölt ügyiratok pedig egyetlen kattintással, auditáltan visszaállíthatók.

**Kockázat / Kompromisszum:**
- Ha a dolgozó téves PDF fájlt tölt fel aláírt példányként, a cserét biztonsági okból a HR vagy Admin jogosultságú munkatársnak kell elvégeznie a dolgozó 360°-os kartonján.
