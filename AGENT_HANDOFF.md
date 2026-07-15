# eaisyDocs - Projekt Állapot és Kontextus (Agent Handoff)

Ez a dokumentum azt a célt szolgálja, hogy egy új AI agent azonnal kontextusba kerüljön a projekt folytatásakor. Tartalmazza az alapvető irányelveket, a meghozott döntéseket, a már elkészült funkciókat és a hátralévő feladatokat.

## 1. Projekt Kontextus és Architektúra (A Brief alapján)
Az **eaisyDocs** egy elektronikus iratkezelő és iktató rendszer. 
- **Technológiai Stack:** Next.js 16.2.10 (App Router, Turbopack), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend / Adatbázis:** Supabase (PostgreSQL, RLS, Auth, Storage, Edge Functions).

**Kritikus Design és Architektúra Szabályok:**
- A `design/` mappában található UI/UX irányelvek kötelezőek (HSL tokenek, Montserrat betűtípus, sötét mód, linear-stílusú flat design árnyékok nélkül). Ugyanakkor funkcionálisan az eaisyDocs egy **iratkezelő**, NEM pénzügyi rendszer (a design fájlokban említett fintech funkciókat hagyd figyelmen kívül).
- **Biztonság és RLS:** Minden hozzáférés-szabályozás (szervezeti egység, szerepkör) adatbázis szinten (RLS) történik. 
- **Audit Napló:** Az `esemeny_naplo` tábla szigorúan append-only (NINCS update/delete jog), minden műveletet rögzít.
- **Iktatás:** Az iktatószám kiosztása tranzakcionális és gap-mentes (`SELECT ... FOR UPDATE` logikával). Egy dedikált adatbázis funkció kezeli.
- **Next.js konvenciók:** A projekt már az új konvenciókat használja (pl. `middleware.ts` helyett `proxy.ts`, és a dinamikus route-oknál a `params` aszinkron `Promise`-ként van kezelve).

## 2. Meghozott Döntések
- **Inaktivitás kezelése:** Ha a felhasználó inaktív, egy 60 másodperces visszaszámláló overlay jelenik meg. Ezt a `session-timeout.tsx` kezeli, javítva lettek az időzítő és a React re-renderből adódó bugok.
- **Kétpaneles Iktatási Nézet:** A bejövő sorban az iktatás nem egy felugró ablakban (modal), hanem egy dedikált oldalon (`/inbox/[id]`) történik, ahol bal oldalon a dokumentum (PDF) nézete, jobb oldalon pedig az iktatási űrlap található.
- **Beállítások / Jogosultságok:** Nem duplikáljuk a jogosultságok kezelését külön aloldalakra, a felhasználói profil (`/settings`) alatt egy helyen kezeljük a csapatokat és a beállításokat.
- **Shadcn UI finomhangolások:** 
  - A `Select` (legördülő) komponensek testre lettek szabva, hogy a `value` (UUID) helyett stabilan a `label` szöveget jelenítsék meg.
  - A `ResizablePanelGroup` iránya `orientation="horizontal"` attribútummal lett rögzítve az újabb csomagverzió miatt.
  - A legördülő menük pozicionálása módosítva lett, hogy mindig lefelé nyíljanak, elkerülve az űrlap kitakarását (`alignItemWithTrigger = false`).

## 3. Megvalósított Funkciók (100% Kész)
- [x] **Adatbázis Schema & RLS:** Minden alapvető tábla (`irat`, `ugyirat`, `esemeny_naplo`, `irattari_terv`) és a hozzájuk tartozó sor-szintű biztonsági (RLS) szabályok elkészültek.
- [x] **Tranzakcionális Iktatás:** A `iktatas_logic.sql` tartalmazza a megbízható sorszámkiosztást.
- [x] **Bejövő Sor (Inbox) Lista:** A feldolgozatlan iratok listázása.
- [x] **Kétpaneles Iktatás UI:** A `FilingPanelClient` segítségével az `/inbox/[id]` oldalon.
- [x] **Kereső Panel:** A `search-client.tsx`-ben részletes szűréssel (Irány, Minősítés, Kifejezés).
- [x] **Fájlfeltöltés Alapjai:** A `NewIncomingDialog` űrlapon keresztül a fájlok Supabase Storage-ba (`irat_files` bucket) való feltöltése működik.
- [x] **Sötét Mód (Dark mode):** Next-themes integráció, a `design` mappa alapján.
- [x] **PDF Megjelenítés (Viewer):** A kétpaneles nézet bal oldalán a PDF fájlok sikeresen betöltődnek a Supabase Storage `signedUrl` iframe-es megjelenítésével.
- [x] **Dokumentum Integritás & Hash:** Fájl feltöltésekor a szerver kiszámítja az SHA-256 hash-t (`crypto` API-val), ezt elmenti az adatbázisba, és az automatikus trigger rögzíti az eseménynaplóba.

## 4. Megmaradt / Hátralévő Taskok (Fejlesztésre vár)
- [ ] **Vízjelezett Előnézet:** Bizalmas iratok esetén a dokumentum előnézetébe vízjel égetése (Supabase Edge Function segítségével).
- [ ] **Selejtezési Javaslatok:** Az irattári terv alapján a lejárt megőrzési idejű dokumentumok listázása egy új adminisztrációs felületen (nincs automatikus törlés, csak javaslat).
- [ ] **Polimorf Kapcsolatok UI:** Az `irat_kapcsolat` táblára épülő UI elkészítése, ahol a felhasználó külső entitásokhoz (pl. ERP ID, tranzakció) köthet egy iratot.
- [ ] **Postgres FTS Keresés optimalizálása:** Bár a kereső UI kész, az adatbázis oldali `tsvector` + GIN index + magyar szótár beállítása finomhangolásra szorulhat a nagy adatmennyiséghez.

---
**Agent Utasítás:**
Ha ezt olvasod, a projekt környezet stabil és hibamentes (az utolsó npm run build zöld volt). A munkát a fenti hátralévő taskok valamelyikével érdemes folytatnod a felhasználó kérése alapján. Mindig vedd figyelembe a `.agents/AGENTS.md`-ben rögzített extra architektúra szabályokat is!
