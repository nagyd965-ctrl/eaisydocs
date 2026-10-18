# ADR A-068: Beállítások Lapok Konszolidációja, Automata Munkamenet Mentés és Vizuális Egységesítés [Közös]

## Státusz
Elfogadva

## Kontextus
Az eaisyDocs és eaisyHR Beállítások felületeinek (`/settings` és `/hr/settings`) vizsgálatakor több UX és dizájn inkonzisztencia mutatkozott:
1. **Felesleges füllap-szétaprózódás:** A "Felhasználói profil" és a "Biztonság" fül különválasztása mindkét modulban indokolatlanul széttagolta a személyes beállításokat; a profil oldal szinte üres volt, miközben a biztonsági opciók (jelszó, 2FA, munkamenet időtúllépés) szorosan a felhasználói fiókhoz tartoznak.
2. **Kettős mentési és interakciós minta:** A munkamenet időtúllépés beállítása korábban külön manuális "Mentés" gombot és kártya láblécet igényelt, miközben a modern webalkalmazásokban az ilyen select/kapcsoló mezők azonnal perzisztálódnak a választás pillanatában.
3. **Felesleges Rendszer fül:** A "Rendszer" fül mindkét modulban mindössze a világos/sötét téma választására szolgált, miközben a bal alsó oldalsáv láblécében a téma kapcsoló globálisan, bármely oldalról elérhető.
4. **Vizuális inkonzisztencia és eltérő gomszínek:** Az eaisyDocs profil mentése és jelszó mentése korábban hardkódolt cián kékes színt (`bg-[#02b8cc]`) használt az eaisyHR-ben és a platform többi részén elvárt kanonikus témaszín (`bg-primary hover:bg-primary/90 text-primary-foreground`) helyett. Emellett felesleges emojik és technikai zárójeles jelölések (pl. `(2FA)`) szerepeltek az UI-ban.

## Döntés
1. **Fülek konszolidációja:**
   - A `Profil` és `Biztonság` fülek összevonásra kerültek egyetlen közös, áttekinthető `Profil & Biztonság` lapra mindkét rendszerben (`/settings` és `/hr/settings`).
   - A `Rendszer` fül mindkét oldalon megszüntetésre került; a témaváltás továbbra is a sidebar globális vezérlőjével történik.
2. **Azonnali mentési minták:**
   - A `munkamenet_idotullepes` választómező megváltoztatásakor azonnali automatikus mentés fut le a háttérben diszkrét betöltésjelző animációval (`Loader2`), a külön Mentés gomb és a kártya lábléc kivezetésre került.
   - A kétlépcsős azonosítás címéből a felesleges `(2FA)` zárójeles jelölés eltávolításra került.
3. **Kanonikus design tokenek és stílusharmónia:**
   - Az összes beállítási űrlapgomb (`Profil mentése`, `Jelszó mentése`) átállt a szabványos `bg-primary hover:bg-primary/90 text-primary-foreground` stílusra, megszüntetve a hardkódolt hexadecimális cián színeket.
   - Az összes dekoratív emoji és aszimmetrikus stíluselem kivezetésre került a címsorokból.

## Következmények
- Teljesen egységes, professzionális beállítási élmény mindkét platformon (eaisyDocs és eaisyHR).
- Kevesebb kattintás szükséges a fiókkezeléshez és a biztonsági beállításokhoz.
- 100%-os megfelelőség a globális UI szabályzatnak (ADR A-029).
