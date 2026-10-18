# PRD P-094: [Docs] Ügyirati „Kapcsolódások” Fül – Emberi Nyelvű Megjelenítés és Háromlépéses Kapcsolat Varázsló

## Státusz
Elfogadva (Decided) - 2026-10-18

## Probléma
A korábbi „Külső kapcsolatok” fül egy adatbázis-tábla nyers képét mutatta: UUID azonosítók név nélkül, belső kódok (`Hr_dokumentum`, `Munkavallalo`, `BELSO`, `Tárgya`), minden iktatott HR dokumentum két ismétlődő sort hozott létre, az „Új kapcsolat” űrlap pedig „Entitás típusa” és „Azonosító kód” mezőket kért a felhasználótól. A kártya és a belső blokk kettős fejlécet viselt, és a „külső rendszer” elnevezés félrevezető volt az eaisyHR-ből jövő kapcsolatoknál.

## Megoldás és UX
1. **Átnevezés és egységes kártya:** a fül neve **Kapcsolódások**, egyetlen fejléccel (a Feladatok / Válaszlevelek fülek mintájára): cím, darabszám jelvény, `+ Új kapcsolat` gomb, szaggatott keretes üres állapot.
2. **Olvasható entitások:** a kapcsolt elemek neve szerver oldalon kerül feloldásra (`resolveLinkEntities`):
   - munkavállaló: profilkép + név (az eaisyHR adatlapra mutató link csak HR modullal rendelkező felhasználónak),
   - partner: név + adószám, link a partner adatlapra,
   - HR dokumentum: név + kategória (HR modullal), tartalék névként a hozzá tartozó irat tárgya,
   - külső rendszerbeli elem (szerződés, számla, tranzakció, projekt, folyamat): a felhasználó által megadott emberi azonosító.
3. **Egy elem = egy sor:** az azonos entitásra mutató kapcsolatok összevonva jelennek meg, lenyitható részletekkel (jelleg + érintett irat soronként).
4. **Magyar feliratok:** forrás (`eaisyHR` / `eaisyDocs` / `ERP` / `CRM`), típus, kapcsolat jellege („Az ügyirat tárgya”, „Csatolt dokumentum”, „Hivatkozás”, „Előzmény”), érintett irat teljes iktatószámmal.
5. **Kanonikus `TableToolbar`:** kereső, oszlopválasztó, típus- és forrásszűrő.
6. **Sorműveletek:** Megnyitás, Dokumentum megtekintése (`DocumentViewer`), Azonosító másolása, Kapcsolat törlése. A műszaki azonosító csak a menüből másolható.
7. **Védett rendszerkapcsolatok:** az eaisyHR iktatás által létrehozott munkavállalói és HR dokumentum kapcsolatok kézzel nem törölhetők (a személyi dosszié megtalálása ezekre épül).
8. **Háromlépéses „Új kapcsolat” varázsló** (a Válaszlevél / Feladat varázsló mintájára):
   - 1. lépés: típus kártyák (Partner, Szerződés, Számla, Tranzakció, Projekt, Folyamat),
   - 2. lépés: partnernél élő keresés a partnertörzsben; külső elemnél forrás rendszer (ERP / CRM / Belső) és azonosító,
   - 3. lépés: kapcsolat jellege kártyákból, érintett irat kiválasztása, összegző kártya.
9. **Duplikáció-védelem:** az azonos kapcsolat ismételt felvétele hibaüzenetet ad.

## Moduláris függetlenség
Az eaisyDocs nem függ az eaisyHR meglététől: HR táblákat csak HR modullal rendelkező felhasználó esetén kérdez le, és bármilyen hiba esetén tartalék felirat jelenik meg.

## Érintett fájlok
`src/components/polymorphic-links-tab.tsx`, `src/utils/resolve-link-entities.ts`, `src/app/dossiers/[id]/page.tsx`, `src/app/dossiers/[id]/actions.ts`.
