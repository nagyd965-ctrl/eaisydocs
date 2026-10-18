# PRD P-088: eaisyDocs Szervezeti Egységek Felhasználói Élmény (UX) és Fanézet Megújítása [Docs]

## Státusz
Elfogadva

## Kontextus és Cél
Az eaisyDocs rendszerben a szervezeti egységek átláthatósága kulcsfontosságú az iratkezelési folyamatokban:
- Az iktatási számok előtagja (`iktato_prefix`) osztályhoz kapcsolódik.
- A szignálási és eszkalációs láncok az osztályvezetőkhöz futnak be.
- A felhasználók hozzáférési jogosultságai (minősítés, szerepkörök) a szervezeti egységek metszetében érvényesülnek.

A korábbi beállítási felület harmonika nézete nem tükrözte a hierarchikus struktúrát és nehezen kezelhető volt nagyobb munkatársi létszám esetén. A cél a felhasználói élmény megújítása volt a „B” koncepció mentén (a `/settings` fülön belül tartva a funkciót).

## Megvalósított UX Komponensek
1. **Kétfülös Navigáció:**
   - **Szervezeti Egységek:** Adminisztratív táblázat azonnali keresővel, áttekinthető adatokkal (megnevezés, iktató prefix címke, felettes egység, vezető arckép és név, tagok száma, gyorsgombok).
   - **Szervezeti Ábra:** Interaktív fa diagram, amely rekurzívan ábrázolja a vállalati struktúrát, a vezetők koronás kártyáit, valamint az egyes munkatársak iratkezelési szerepköreit és minősítési szintjeit.
2. **Interaktív Modális Dialógusok:**
   - Új szervezeti egység létrehozása szülő egység, iktató prefix és vezető választóval.
   - Szervezeti egység szerkesztése és megerősítéshez kötött törlés.
   - Munkatársak lista- és eltávolítási dialógus közvetlen hozzáadási lehetőséggel.
   - Munkatársak hozzárendelési dialógus többes kijelöléssel (`Checkbox`) és jelenlegi beosztási információval.
3. **Iratkezelési Fókusz (Nem HR Munkakörök):**
   - A rendszer tudatosan nem vezet be felesleges FEOR/munkaköri katalógust eaisyDocs-ban, megőrizve az iratkezelési szerepkörökre (`docs_szerepkor`) és biztonsági minősítésekre (`max_minosites`) optimalizált tiszta felületet.

## Eredmény
Az eaisyDocs adminisztrátorai egy átlátható, modern, az eaisyHR dizájnjával harmonizáló szervezeti egység kezelőt és fanézetet kaptak, amely közvetlenül támogatja az iratkezelési adminisztrációt.
