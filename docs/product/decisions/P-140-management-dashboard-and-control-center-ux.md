# P-140: [Közös] Management Dashboard és Control Center UX (Céges/Felhasználói Modulok, eaisyBill Cégimport, Jogosultságok Mátrix és AI Hiba-Analízis)

- **Dátum:** 2026-11-03
- **Státusz:** Elfogadva
- **Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)
- **Kapcsolódó döntések:** [A-111](../../architecture/decisions/A-111-management-dashboard-architecture-and-erkeztetoszam-pkey-fix.md), [P-139](./P-139-direct-company-member-addition-and-admin-role-selector-ux.md)

## Kontextus

A platform üzemeltetéséhez szükség volt egy egységes, Linear-stílusú világos/sötét témát támogató **Management Dashboard (`/management`)** felületre, amely a korábbi `agent-main` / `visibill` vezérlőpult vizuális felépítését követi, kiegészítve az `eaisyDocs` és `eaisyHR` modulok szeparált kezelésével, az `eaisyBill` tömeges cégimporttal, a kétirányú jogosultságkezelővel és az AI hiba-analízissel.

## UX és Felületi Döntések

1. **Dedikált Management Login képernyő (`/management`) és Munkaterület-váltó Bejelentkezés (`/login`):**
   - A `/management` megnyitásakor közvetlenül egy letisztult **Management Dashboard** bejelentkező kártya jelenik meg (Adminisztrátori e-mail cím + Jelszó + világos/sötét téma váltó).
   - Ha a szuperadmin (`management@thinkai.hu`) a normál `/login` oldalon lép be, automatikusan a `/management` felületre érkezik; normál felhasználó belépésekor pedig a rendszer automatikusan törli az esetleges korábbi `eaisydocs_mgmt_session` sütit, és figyelmen kívül hagyja a `next=/management` paramétert.
   - Ha egy felhasználó olyan munkaterületet választ a `/login` oldalon, amelyhez nincs jogosultsága (pl. csak `eaisyHR` fiókkal az `eaisyDocs` fülön), az űrlap oldal-újratöltés és jelszóvesztés nélkül azonnal megjeleníti a **„Másik munkaterülethez tartozó fiók”** kártyát, és az **„Átváltás az eaisyHR munkaterületre és belépés →”** gombra kattintva egyetlen kattintással beléptet a megfelelő modulba.
2. **4 Fő Navigációs Fül:**
   - **Áttekintés:** 4 KPI kártya (Regisztrált felhasználók Docs/HR bontással, Regisztrált cégek Docs/HR bontással, Havi összköltség, Legaktívabb cég) + 3 oszlopos Bento Grid (AI & LLM pénzügyi áttekintés, Worker státusz + 7 napos költség trend, Alkalmazás hibák + Legutóbbi Docs/HR rendszerinterakciók).
   - **Control Center (4 al-navigációs pill-lel):**
     - *Hibaközpont:* 4 KPI kártya (*Aktív Hibák*, *Elmúlt 24 óra*, *Leggyakoribb Kategória*, *Érintett Cégek*), szűrősáv, valamint `Aktív hibák` / `Megoldott / Törölt hibák` / `Összes` nézetváltó. Minden hibasoron és tömeges kijelölésnél is elérhető az **`AI Analízis`** gomb (élő kódbázis-ellenőrzéssel és Gemini 2.5 diagnosztikával: *Mi a hiba?*, *Gyökérok*, *Megoldottuk-e már?*, *Megoldási lépések*), a **`Megoldva / Törlés`**, a **`Visszaállítás`** és a **`Végleges törlés`** művelet.
     - *Regisztrált cégek:* Látható, hogy az adott cég `eaisyDocs`, `eaisyHR` vagy mindkét modulban regisztrált-e (`mgmt-module-badge`), szűrhető modul és státusz szerint, a sorra kattintva lenyílnak a cég részletes mutatói, közvetlen `Belépés (Docs)` és `Belépés (HR)` gombokkal, `+ Új Cég Hozzáadása`, `Szerkesztés`, valamint többszörös kijelölést támogató **`Cég Importálása eaisyBillből`** modállal.
     - *Regisztrált felhasználók:* Minden felhasználónál megjelennek az `Elérhető Modulok` (`eaisyDocs` / `eaisyHR`), a `Hozzárendelt Cégek` oszlopban pedig alapállapotban egy kattintható darabszám-jelvény (`1`, `3`, `0`) látható (az `eaisyBill` mintájára), amelyre kattintva lenyílik a felhasználó összes cége és cégenkénti `Docs` / `HR` szerepköre. A `+ Új Felhasználó Felvétele` és `Szerkesztés` modálban két egyszerű modul-jelölőnégyzettel választható ki az `eaisyDocs` / `eaisyHR` hozzáférés, több cég rendelhető hozzá (akár közvetlenül a modálból indított `eaisyBill` cégimporttal), és cégenként külön beállítható a céges jogállás, az `eaisyDocs szerepkör` és az `eaisyHR szerepkör`.
     - *Jogosultságok:* Kétpaneles jogosultságkezelő mátrix (bal oldalon felhasználólista, jobb oldalon céges `eaisyHR` szerepkör + 10 HR modul kártya + `eaisyDocs` szerepkör + fejlécbeli másodlagos modul-hozzáférés kapcsoló), amely kétirányú szinkronban működik az `eaisyHR` Jogosultságkezelő Mátrixszal.
   - **Pénzügyi áttekintés:** Cégek szerinti használat és költségbontás táblázat + `THINKAI API RATE CARD`.
   - **Rendszer & Workerek:** Rendszer uptime/környezet sáv + 6 háttérfolyamat/worker állapotkártya.
3. **Bal oldali `CompanySelector` lenyíló menü görgetés és Stealth Superadmin UX (`src/components/company-selector.tsx`, `src/components/ui/scroll-area.tsx`, `src/utils/stealth-superadmin.ts`):**
   - A `CompanySelector` lenyíló céglistája 6+ cég esetén `max-h-[260px] overflow-y-auto` konténerben görgethető, így nem csúszik rá az alsó `Importálás eaisyBill-ből` / `Új cég hozzáadása` / `Csatlakozás kóddal` gombokra.
   - A `ThinkAI Management` (`management@thinkai.hu`) szuperadmin fiók minden ügyféloldali tag- és csapatlistából (`Beállítások -> Cég -> Tagok`, `Beállítások -> Szervezeti Egységek -> Csapat`, `eaisyHR` nézetek) el van rejtve, hogy ne zavarja össze a végfelhasználókat.
