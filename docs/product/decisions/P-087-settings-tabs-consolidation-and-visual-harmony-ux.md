# PRD P-087: Beállítások Lapok Konszolidációja, Automata Munkamenet Mentés és Vizuális Egységesítés [Közös]

## Státusz
Elfogadva

## Kontextus és Célok
A felhasználói visszajelzések és a rendszeres felület-audit alapján a Beállítások képernyő (`/settings` és `/hr/settings`) funkciói szétaprózottak és helyenként feleslegesen bonyolultak voltak. A felhasználói profil önmagában kevés adatot tartalmazott, a biztonsági beállítások (jelszó, munkamenet, 2FA) külön fülre kerültek, míg a témaállításra feleslegesen létezett egy harmadik fül, holott a bal alsó oldalsávban már biztosított a gyors váltás.
A cél a felület egyszerűsítése, a manuális mentési lépések automatizálása és a színharmónia megteremtése a teljes platformon.

## Termékkövetelmények és UX Módosítások
1. **Egységesített Profil & Biztonság fül:**
   - A korábbi különálló `Profil` és `Biztonság` tab egyetlen integrált fülbe olvadt mind az eaisyDocs, mind az eaisyHR Beállítások oldalán.
   - Fent a személyes alapadatok (név, pozíció, telefonszám, cég neve, profilkép feltöltés), alatta közvetlenül a biztonsági kártyák (jelszómódosítás, munkamenet időtúllépés, kétlépcsős hitelesítés).
2. **Reakcióképes, azonnali perzisztencia:**
   - A munkamenet inaktivitási időkorlát (15 perc / 30 perc / 1 óra / 4 óra / 8 óra) kiválasztásakor az érték azonnal mentésre kerül az adatbázisban, finom forgó ikonnal visszajelezve.
   - Megszűnt a zavaró, különálló Mentés gomb és a kártya lábléce a munkamenet kártyán.
   - A kétlépcsős azonosítás címéből törlésre került a felesleges `(2FA)` rövidítés.
3. **Felesleges Rendszer fül eltávolítása:**
   - A sötét/világos témaváltást a bal alsó oldalsáv lábléc biztosítja; a redundáns külön fül kivezetésre került.
4. **Vizuális és gombszín-egységesség:**
   - A profil mentése és a jelszó mentése gombok az eaisyHR-ben használt kanonikus `bg-primary hover:bg-primary/90 text-primary-foreground` témaszínt kapják, megszüntetve a nem illeszkedő ciánkék gombokat.
   - A fejléc-emojik törlésre kerültek, garantálva a letisztult, professzionális megjelenést.

## Érintett Komponensek
- `src/app/settings/page.tsx`
- `src/app/settings/settings-client.tsx`
- `src/app/hr/settings/page.tsx`
- `src/app/hr/settings/security-tab.tsx`
- `src/components/mfa-settings-card.tsx`
- `src/components/settings/company-settings-tab.tsx`
