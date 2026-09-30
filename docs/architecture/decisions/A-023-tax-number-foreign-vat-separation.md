# [Docs] A-023: Magyar Belföldi Adószám és Külföldi / EU Adóazonosító Szétválasztása

## Állapot
Elfogadva (Decided)

## Kontextus és Problémafelvetés
A számlák és hivatalos dokumentumok iktatási folyamatában (`MAN-02` / `SYS-10`) a partnerek adószámainak rögzítése kritikus azonosítási és jogi feladat.
Korábban az adatbázisban és az AI metaadat-kinyerésben kizárólag egyetlen, általános `partner_adoszam` mező létezett.
Ez a valós dokumentumoknál súlyos anomáliákat eredményezett:
1. **Belföldi számlák kettős adószáma:** A magyar számlák fejlécében szinte mindig szerepel a magyar 11 jegyű belföldi adószám (pl. `32478520-2-41`) és a `HU` előtagos közösségi adószám (pl. `HU32478520`) is. Az AI gyakran a kettőt egybefűzve adta vissza, vagy levágta 8 jegyre a belföldi adószámot.
2. **Külföldi partnerek (EU és harmadik országbeli):** Külföldi beszállítók vagy vevők esetén (pl. német `DE123456789`, osztrák `ATU12345678`, vagy szerb PIB `101092577`) az azonosító nem felelt meg a magyar adószám integritási szabályainak (`idx_partner_clean_adoszam`), és nem volt külön dedikált mezője.
3. **UI és Partner Matcher korlát:** A felhasználó az iktatási panelen nem tudta külön ellenőrizni és rögzíteni a belföldi és az EU/külföldi adószámot, az automatikus kitöltés egy mezőbe kényszerítette az adatot.

## Döntési Megfontolások
1. **Adatbázis integritás és séma-bővítés:**
   - A `public.partner` tábla kiegészült a `kulfoldi_adoszam TEXT` oszloppal.
   - Dedikált funkcionális index készült (`idx_partner_clean_kulfoldi_adoszam`) a gyors egyeztetéshez.
   - A full-text keresővektor generátor trigger (`generate_irat_kereso_vektor`) frissült, így az iratok és partnerek EU/külföldi adószám alapján is kereshetővé váltak.
2. **Determinisztikus Szétválasztó Motor (`tax-number.ts`):**
   - Létrejött a [`src/utils/tax-number.ts`](../../src/utils/tax-number.ts) segédmodul, amely pontosan felismeri és formázza a magyar belföldi adószámokat (`XXXXXXXX-Y-ZZ` vagy 8 jegyű törzsszám), az EU közösségi adószámokat (országkód prefix), valamint az egyéb külföldi cégazonosítókat (PIB, TIN, stb.).
   - A `separateTaxNumbers` függvény automatikusan szétválasztja az egyben érkező stringeket (pl. `"32478520-2-41, HU32478520"` -> `magyarAdoszam` és `kulfoldiAdoszam`).
3. **AI Kinyerési Prompt Szabályozása:**
   - A Gemini 2.5 Flash prompt explicit szabályozást kapott az adószámok szétválasztására: a belföldi kötőjeles formátum mindig a `partner_adoszam`, a `HU` előtagos EU adószám vagy külföldi azonosító a `partner_kulfoldi_adoszam` mezőbe kerül.
   - A JSON válasz mindkét mezőt strukturáltan tartalmazza.
4. **Felhasználói Felület (Filing Panel & Partner Dialog):**
   - Az iktatási panelen az egyetlen adószám mező helyett két dedikált, ergonómikus mező kapott helyet:
     - `Magyar adószám` (placeholder: "Pl. 32478520-2-41")
     - `Külföldi / EU adóazonosító` (placeholder: "Pl. HU32478520, DE123456789")
   - A Partner felugró ablakban és a partnertáblázatban mindkét azonosító megtekinthető, szerkeszthető és kereshető.

## Döntés
1. Migráció: [`supabase/migrations/20260930000001_add_partner_kulfoldi_adoszam.sql`](../../supabase/migrations/20260930000001_add_partner_kulfoldi_adoszam.sql) hozzáadja az oszlopot és a keresővektor támogatást.
2. Logika: [`src/utils/tax-number.ts`](../../src/utils/tax-number.ts) és [`src/utils/partner-matcher.ts`](../../src/utils/partner-matcher.ts) kezeli a szétválasztást és deduplikációt.
3. UI: [`src/components/filing-panel-client.tsx`](../../src/components/filing-panel-client.tsx) és [`src/components/partner-dialog.tsx`](../../src/components/partner-dialog.tsx) megjeleníti mindkét mezőt.
4. Tesztelés: [`src/utils/__tests__/tax-number.test.ts`](../../src/utils/__tests__/tax-number.test.ts) 8/8 tesztesettel igazolja a működést.

## Következmények
- **Pozitív:** Megszűnt a magyar és külföldi adószámok keveredése; pontos, 11 jegyű belföldi adószám-megőrzés; zökkenőmentes külföldi partnerkezelés; hibátlan AI kitöltés.
- **Visszafelé kompatibilitás:** A meglévő rekordok `adoszam` mezője változatlan maradt, a korábbi hivatkozások működőképesek.
