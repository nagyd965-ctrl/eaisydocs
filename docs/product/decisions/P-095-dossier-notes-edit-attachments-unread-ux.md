# PRD P-095: [Docs] Belső Megjegyzések Bővítése – Többsoros Író, Szerkesztés/Törlés, Csatolmányok, Olvasatlan Jelzés

## Státusz
Elfogadva (Decided) - 2026-10-18

## Probléma
A P-093-ban bevezetett „Belső megjegyzések” panel egysoros beviteli mezőt használt, a megjegyzések nem voltak módosíthatók vagy törölhetők, nem lehetett hozzájuk fájlt (pl. képernyőképet) csatolni, és a felhasználó nem látta, hogy az ügyirathoz érkezett-e új megjegyzés a legutóbbi megnyitása óta.

## Megoldás és UX
1. **Többsoros író mező:** önmagától növekvő (max. ~7 sor) `textarea`; `Enter` küld, `Shift+Enter` új sort szúr be; az `@` említés-lista (nyíl / Tab / Enter / Esc) változatlanul működik, a lista nyitott állapotában az Enter az említést választja ki.
2. **Szerkesztés és törlés (csak saját megjegyzés):** a kártya fejlécében `⋮` menü (Szerkesztés, Törlés). Szerkesztésnél helyben megjelenő író mező (`Enter` mentés, `Esc` mégse), a kártyán „· szerkesztve” jelzés. Törlés előtt megerősítő `AlertDialog`; a törlés fizikai, a csatolt fájlok a tárolóból is törlődnek.
3. **Csatolmányok:** gemkapocs gomb, fájl húzás az író területre és vágólapról beillesztés (képernyőkép). Engedélyezett típusok: kép (png, jpg, webp, gif), pdf, doc/docx, xls/xlsx, txt; legfeljebb 5 fájl / megjegyzés, fájlonként max. 10 MB (kliens és szerver oldalon is ellenőrizve). Képek bélyegképként, egyéb fájlok csatolmány-sorként jelennek meg; PDF és kép megnyitása új lapon, a többi letöltés.
4. **Olvasatlan jelzés:** a „Megjegyzések” gombon primary színű számjelvény mutatja a mások által írt, olvasatlan megjegyzések számát (ha nincs olvasatlan, halvány összesítő szám). A panel megnyitásakor „Olvasatlan üzenetek” elválasztó jelenik meg az első olvasatlan megjegyzés felett (oda görget a panel), majd az ügyirat olvasottnak jelölődik. Saját megjegyzés küldése is olvasottnak jelöli a beszélgetést.
5. **Tudatosan kihagyva (döntés):** keresés/szűrés a panelben (ügyiratonként kevés bejegyzés), `#` irat-hivatkozás, gyors szövegsablonok, „Feladat ebből” gomb, megjegyzés-típusok és kitűzés, emoji reakciók.

## Biztonság és megfelelőség
- **Fájlok sosem publikusak:** új privát tároló (`megjegyzes_csatolmanyok`); hozzáférés kizárólag 60 másodperces aláírt URL-lel, amelyet szerver action állít elő.
- **Naplózás (`esemeny_naplo`, append-only):** rögzítés (csatolmány-nevekkel), szerkesztés (előző és új szöveg), törlés (a törölt szöveg és fájlnevek megmaradnak), csatolmány megtekintése / letöltése, képelőnézetek betöltése (panelnyitásonként egy bejegyzés). A Napló külön címet kap: „Belső megjegyzés szerkesztve / törölve”.
- **RLS:** csatolmány-metaadat és tárolóobjektum csak annak látható, aki az ügyiratot látja (`ugyirat` tábla RLS-én keresztül); szerkesztés és törlés csak a szerzőé (UPDATE / DELETE policy + szerver oldali ellenőrzés); az olvasottsági tábla soronként csak a saját felhasználóé.
- Az @említés-értesítés szerkesztéskor csak az újonnan megemlítettnek megy ki.

## Adatmodell (migráció: `20261018000003_ugyirat_megjegyzes_extensions.sql`)
- `ugyirat_megjegyzes.szerkesztve_at` + saját sorra UPDATE policy,
- `ugyirat_megjegyzes_csatolmany` (megjegyzés, ügyirat, tárolási útvonal, fájlnév, MIME, méret, feltöltő),
- `ugyirat_megjegyzes_olvasas` (`ugyirat_id`, `user_id`, `last_read_at`),
- privát `megjegyzes_csatolmanyok` bucket (10 MB, típuslista) és objektum policyk.

## Moduláris függetlenség
Az eaisyDocs-specifikus táblákat használja; az eaisyHR meglététől vagy hiányától nem függ. A migráció előtti adatbázissal az oldal a megjegyzéseket változatlanul betölti (tartalék lekérdezés).

## Érintett fájlok
`src/components/dossier-notes-sheet.tsx`, `src/components/mention-input.tsx`, `src/app/dossiers/[id]/actions.ts`, `src/app/dossiers/[id]/page.tsx`, `src/utils/audit-log-formatter.ts`, `supabase/migrations/20261018000003_ugyirat_megjegyzes_extensions.sql`.
