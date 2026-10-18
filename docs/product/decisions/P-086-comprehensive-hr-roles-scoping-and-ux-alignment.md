# PRD P-086: Átfogó HR Szerepkör Scoping és UX Összehangolás [HR]

## Státusz
Elfogadva

## Felhasználói Igény és Probléma
A rendszerben dolgozó munkatársak jogosultságai és felületei több helyen eltértek a valós munkaköri elvárásoktól:
- A bérszámfejtő nem látta a bérszámfejtési menüt az oldalsávban, és nem tudta megnyitni a dolgozói adatlapokat vagy a bérriportokat.
- A munkavédelmi felelős kizárólag a saját dolgozói profilját látta, a munkavédelmi és orvosi vizsgálati modult nem.
- A közvetlen vezető a menüből elérhető teljesítményértékelésre kattintva "Hozzáférés Megtagadva" hibaüzenetet kapott.
- A toborzó olyan menüpontokat látott (onboarding, kiléptetés), amelyekre rákattintva jogosultsági hibát kapott.

## Termék és UX Megoldás
1. **Intelligens, szerepkör-specifikus oldalsáv (`HrSidebar`):**
   - **Bérügyi munkatárs (`berugyi`):** A Dolgozói Portál mellett a HR Munkaasztal dedikált bérügyi elemei jelennek meg: *Állomány áttekintés, Bérszámfejtés & Bérpapírok, Naptár & Távollét, Riportok, Szervezeti Felépítés*.
   - **Munkavédelmi felelős (`munkavedelmi`):** A Dolgozói Portál mellett az *Állomány áttekintés* és a *Munkaügyi Megfelelőség* modul jelenik meg.
   - **Közvetlen vezető (`vezeto`):** A Dolgozói Portál mellett a *Vezetői nézet* (Csapat áttekintés és Teljesítményértékelés) érhető el.
   - **Toborzó (`toborzo`):** A Dolgozói Portál mellett a *Dolgozói Életút* csoportban kizárólag a *Toborzás* almenü jelenik meg, elkerülve a kizárásos hibaoldalakat.
2. **Dolgozói Adatlap (`/hr/employee/[id]`):**
   - A bérügyi munkatárs mostantól hozzáfér a dolgozói törzsadatlaphoz, feloldhatja és frissítheti a titkosított TAJ, adóazonosító, bankszámla és béradatokat, valamint kezelheti a bérpapírokat.
   - A munkavédelmi felelős rögzítheti és kezelheti az orvosi alkalmassági vizsgálatokat a dolgozó adatlapján, miközben a bizalmas fegyelmi és béradatok szigorúan rejtve maradnak előle.
3. **Közvetlen Vezetői Teljesítményértékelés (`/hr/performance`):**
   - A vezetők hiba nélkül elérhetik a teljesítményértékelési felületet.

## Elfogadási Kritériumok
- Bérügyi bejelentkezés esetén a bal oldalsávban látható a Bérszámfejtés, a Naptár és a Riportok menü.
- Bérügyi munkatárs sikeresen meg tudja nyitni a dolgozó adatlapján a bérpapírokat és a béradatokat.
- Munkavédelmi felelős bejelentkezés esetén elérhető a Munkaügyi Megfelelőség menüpont.
- Vezető bejelentkezés esetén a Teljesítményértékelés kattintásra zökkenőmentesen megnyílik.
