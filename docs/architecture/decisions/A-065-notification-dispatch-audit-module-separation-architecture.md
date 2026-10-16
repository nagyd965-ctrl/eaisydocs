# ADR A-065: Értesítési Kiküldési Napló Moduláris Szétválasztása és eaisyHR Integráció

- **Státusz:** Decided
- **Dátum:** 2026-10-16
- **Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)
- **Döntéshozók:** Rendszertervező Csapat & Termékfejlesztés
- **Kapcsolódó döntések:** [ADR A-005](./A-005-hr-modular-independence-architecture.md), [ADR A-008](./A-008-append-only-audit-event-log-integrity.md), [ADR A-029](./A-029-global-ui-consistency-and-unified-components.md), [ADR A-064](./A-064-notification-dispatch-audit-centralization-architecture.md), [PRD P-083](../../product/decisions/P-083-notification-dispatch-audit-centralization-ux.md), [PRD P-084](../../product/decisions/P-084-notification-dispatch-audit-module-separation-ux.md)

---

## 1. Kontextus és Problémafelvetés

Az [ADR A-064](./A-064-notification-dispatch-audit-centralization-architecture.md) döntés alapján az értesítési kiküldési naplót áthelyeztük az eaisyDocs beállításokból a Központi Eseménynapló (`/audit`) oldalra egy dedikált fül alá.

Azonban a rendszerben az eaisyDocs és az eaisyHR közös adatbázison, de szigorú moduláris függetlenség (`.agents/AGENTS.md` 5. szabály) mellett fut. Az `ertesites_naplo` táblában nem volt explicite megkülönböztetve, hogy egy kiküldött e-mail vagy SMS melyik modulhoz tartozik (pl. iktatási értesítő vs. állásinterjú meghívó, szabadság jóváhagyás). Ennek következtében:
1. **Adatszivárgás és jogosultsági kockázat:** HR-specifikus bizalmas információk (pl. toborzás, interjúmeghívók, Kelemen Roberta felvételi értesítői, szabadságkérelmek) megjelentek az eaisyDocs iratkezelési audit naplójában, ahol iratkezelők és iktatók is láthatták azokat.
2. **Hiányzó eaisyHR Kiküldési Napló:** Az eaisyHR felhasználók (HR vezetők, HR munkatársak) nem rendelkeztek saját audit felülettel a kiküldött HR e-mailek és SMS-ek ellenőrzésére.
3. **Moduláris függetlenség hiánya:** Nem volt adatbázis-szintű garancia arra, hogy a két modul kiküldési forgalma szeparáltan és függetlenül monitorozható legyen.

## 2. Döntés

Úgy döntöttünk, hogy az értesítési naplózást **adatbázis-, backend- és frontend-szinten szétválasztjuk az eaisyDocs és eaisyHR között**:

### 1. Adatbázis Séma Bővítés & Multi-Tenancy (`public.ertesites_naplo`)
- **Új oszlopok:**
  - `modul TEXT NOT NULL DEFAULT 'docs' CHECK (modul IN ('docs', 'hr'))`
  - `company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL`
- **Indexelés:**
  - `idx_ertesites_naplo_modul` a gyors modul szerinti szűréshez.
  - `idx_ertesites_naplo_company_id` a bérlői izolációhoz.
  - Összetett index `(modul, company_id, mikor DESC)` az audit lekérdezésekhez.
- **Meglévő adatok migrálása (Backfill):**
  - A korábbi 66 naplóbejegyzésből pontosan 11 db HR értesítést (pl. Kelemen Roberta toborzási, interjú és beléptetési e-mailjeit) `hr` kategóriára migráltunk.
  - A maradék 55 db iratkezelési értesítőt `docs` kategóriában hagytuk.
  - Minden rekordhoz hozzárendeltük az aktív bérlő cégazonosítót (`company_id`).

### 2. Kiküldő Motorok Kiterjesztése (`mailer.ts` és `twilio.ts`)
- A `sendNotificationEmail` és `sendSmsNotification` függvények mostantól opcionálisan fogadnak `modul?: 'docs' | 'hr'` és `companyId?: string` paramétereket.
- Ha nincs megadva modul, intelligens tárgy- és tartalomalapú felismerés sorolja be automatikusan HR-es kulcsszavak alapján (pl. *interjú, jelentkezés, szabadság, toborzás, onboarding, cafeteria, orvosi vizsgálat, munkaszerződés*).
- A kiküldési kísérlet eredménye a megfelelő `modul` és `company_id` értékekkel íródik az `ertesites_naplo` táblába.

### 3. eaisyDocs Központi Audit Napló Hardening (`/audit`)
- Az `src/app/audit/actions.ts` `getNotificationAuditLogs` akciója szigorúan `.eq("modul", "docs")` feltétellel kérdezi le az adatokat.
- Így az eaisyDocs felületén **kizárólag az 55 iratkezelési értesítés látható**, a HR-es értesítések teljesen el vannak zárva.

### 4. Önálló eaisyHR Központi Kiküldési Napló (`/hr/audit?tab=kikuldesi_naplo`)
- **Kétfülös eaisyHR Audit felület:** A `/hr/audit` oldalt két fülre bontottuk:
  1. `HR Eseménynapló` (`value="esemenynaplo"`)
  2. `HR Kiküldési Napló` (`value="kikuldesi_naplo"`)
- **Dedikált Szerver Akció (`getHrNotificationAuditLogs`):**
  - Szerepkör alapú hozzáférés: csak admin, rendszergazda, hr_vezeto, hr_munkatars, vezeto érheti el.
  - Szigorúan `.eq("modul", "hr")` és cégazonosító szűrés.
  - Feloldja a HR kategóriákat (`recruitment`, `leave`, `health`, `contract`, `system`).
- **Kanonikus Linear Flat UI:**
  - 4 db `KpiCard` (Összes HR Értesítés, Sikeres Kézbesítés, Meghiúsult/Hibás, Érintett Címzettek).
  - Szabványos `TableToolbar` keresővel, szűrőkkel, dátumtartománnyal és oszlopválasztóval.
  - Részletes előnézeti és hibaelemző modális dialógus.
  - CSV exportálás UTF-8 BOM-mal.
- **eaisyHR Beállítások Kapcsolat:** Az `src/app/hr/settings/notification-settings.tsx` oldalon közvetlen átvezető gomb visz a `/hr/audit?tab=kikuldesi_naplo` felületre.

## 3. Következmények és Eredmények

- **Teljes GDPR és Adatbiztonság:** HR jelöltek és munkavállalók adatai (pl. interjúidőpontok, állásjelentkezések) többé nem keverednek iratkezelési naplókkal.
- **Moduláris Autonómia:** Az eaisyDocs és az eaisyHR egymástól függetlenül működik; a kiküldési naplók modul-specifikusan, saját jogosultsági logikával érhetők el.
- **Tökéletes UI Konzisztencia:** Mindkét rendszerben azonos szerkezetű és kanonikus komponensekből épül fel a kiküldési audit napló (ADR A-029).
