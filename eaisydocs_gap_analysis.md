# eaisyDocs — Állapotfelmérés a Szoftverterv Alapján

> Készült: 2026.08.06. | Alap: `eaisyDocs_szoftverterv.md` 10 kötelező követelménye + funkcionális modulok

---

## Összefoglaló

| Kategória | Állapot |
|-----------|---------|
| **Kódminőség (frontend)** | ✅ Friss facelift, egységes design |
| **Adatmodell** | ✅ ~90% kész |
| **Alapfunkciók** (érkeztetés, iktatás, keresés) | ✅ Működik |
| **Integrációk** (SMS, e-mail, API) | ⚠️ Részleges |
| **Megfelelőség** (RLS, audit, SSO) | ⚠️ Hiányos |
| **Becsült összesített készültség** | **~65-70%** |

---

## Követelményenkénti állapot

### 1. Érkeztetés, Iktatás — 🟢 ~95%

**Megvan:**
- [Bejövő sor](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/inbox/page.tsx) — listanézet, szűrők
- [Iktatási folyamat](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/inbox/%5Bid%5D/page.tsx) — kétpaneles nézet (dokumentum + űrlap)
- [Iktatókönyv](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/page.tsx) — táblázat, szűrők, **XLSX/PDF export**
- Gap-mentes iktatószám allokáció (DB migration kész)
- Irattári terv kiválasztás iktatásnál
- E-mail csatorna: [IMAP service](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/imap-service.ts) + [cron/imap](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/cron/imap)

**Hiányzik:**
- ❌ **Kötegelt szkennelés** (barcode elválasztólap) — nice-to-have, nem kritikus
- ❌ **Cégkapu/hivatali kapu integráció** — ügyfélfüggő

---

### 2. Egységes digitális kezelés — 🟡 ~70%

**Megvan:**
- Egyetlen `irat` tábla, `irany` mezővel
- PDF viewer ([document-viewer.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/document-viewer.tsx))
- [PDF/A konverzió API](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/pdf/convert) — fire-and-forget trigger
- Fájl feltöltés + SHA-256 hash

**Hiányzik:**
- ❌ **PDF/A konverzió tényleges működése** — a route megvan, de LibreOffice/Ghostscript nincs telepítve/konfigurálva; a `pdfa_path` mező soha nem kerül kitöltésre
- ❌ **Kimenő irat sablonos generálás** (docx → PDF/A) — nincs implementálva
- ❌ **Fájl verziókezelés UI** — a `verzio` mező létezik, de nincs verziólista vagy összehasonlítás az UI-ban

---

### 3. Életciklus követése — 🟢 ~80%

**Megvan:**
- Audit napló (`esemeny_naplo`) — append-only, DB szintű INSERT-only jog
- [Napló tab](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/%5Bid%5D/page.tsx) az ügyirat adatlapon — idővonal nézet
- Állapotgép (érkeztetve → iktatva → szignálva → ügyintézés_alatt → elintézett → lezárt → irattárban → selejtezhető)
- Selejtezési javaslatok + jóváhagyás (négy szem elve)
- [Selejtezési jegyzőkönyv nyomtatás](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/archive)

**Hiányzik:**
- ❌ **Életciklus-riport exportálása PDF-be** — az ellenőrzésen ez kell: „3 lezárt ügyirat teljes életciklusának áttekintése" + letölthető riport
- ⚠️ **`ip_cim`, `user_agent`** mezők az `esemeny_naplo`-ban — a DB séma támogatja, de az alkalmazás nem tölti ki ezeket

---

### 4. Partnerhez/tranzakcióhoz rendelés — 🟢 ~90%

**Megvan:**
- [Partner adatlap](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/%5Bid%5D/page.tsx) — küldött iratok + csatolt ügyek
- Polimorf `irat_kapcsolat` tábla (partner, tranzakció, folyamat, projekt, szerződés, számla)
- [Külső kapcsolatok tab](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/%5Bid%5D/page.tsx) az ügyirat adatlapon
- [ERP embed widget](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/embed/partner-dossiers)

**Hiányzik:**
- ⚠️ Keresőben partner-szűrő — létezik de nem tesztelve

---

### 5. ERP-integráció — 🟡 ~60%

**Megvan:**
- [REST API v1](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/v1/ugyiratok) — `GET /api/v1/ugyiratok`, `GET .../[id]/eletciklus`
- [Embed widget](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/embed/partner-dossiers) az ERP-hez

**Hiányzik:**
- ❌ **`POST /api/v1/iratok`** — irat feltöltés az ERP-ből (a brief expliciten kéri)
- ❌ **Webhook-események kifelé** (`irat.erkeztetve`, `ugyirat.iktatva`, `ugyirat.lezarva`, `hatarido.lejart`) — nincs webhook rendszer
- ❌ **ERP JWT auth** (service account) — az API most a Supabase session auth-ot használja, nincs API-kulcsos / service account hozzáférés
- ❌ **Kétirányú szinkron** (n8n / webhook) — nincs implementálva

---

### 6. Szignálás, feladatkiosztás — 🟢 ~85%

**Megvan:**
- [Feladat modul](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/tasks/page.tsx) — Kanban + lista nézet
- Szignálás felelős + határidő
- Feladatok: felelős, határidő, állapot
- [Helyettesítés](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/page.tsx) — szabadság esetén átirányítás
- [Kölcsönzési napló](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/borrow-actions.ts) — irat fizikai helyének követése

**Hiányzik:**
- ❌ **Naptár nézet** a feladatokra — a brief kéri (Kanban + lista + naptár), de nincs
- ⚠️ Feladat `elutasított` állapot — nem egyértelmű, hogy implementálva van-e a UI-ban

---

### 7. Értesítések (e-mail + SMS) — 🟢 ~80%

**Megvan:**
- [Értesítési szabálymotor](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/notification-settings.tsx) — DB-ben tárolt szabályok
- [E-mail küldés](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/mailer.ts) (SMTP)
- [SMS küldés](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/sms/twilio.ts) (Twilio)
- [Nightly cron](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/cron/nightly/route.ts) — határidő figyelés + küldés
- [Morning cron](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/cron/morning/route.ts) — napi emlékeztető
- `ertesites_naplo` tábla — **működő** napló UI (sikeres/sikertelen küldések)
- In-app értesítések (harangikon)

**Hiányzik:**
- ⚠️ **Eszkaláció** — lejárt határidőnél automatikus eszkaláció a vezetőhöz (a cron triggerel, de nem egyértelmű)

---

### 8. Jogosultságkezelés (RBAC + RLS) — 🟡 ~65%

**Megvan:**
- Postgres RLS minden fő táblán
- Szerepkörök: rendszergazda, iratkezelő, vezető, ügyintéző, betekintő (a [permissions.ts](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/permissions.ts)-ben)
- `docs_szerepkor` szeparáció (eaisyDocs vs eaisyHR)
- Szervezeti egység kezelés (DB + UI a beállításoknál)
- Fájl hozzáférés: aláírt URL + naplózás

**Hiányzik:**
- ❌ **ABAC 4 dimenzió teljes megvalósítása** — a `max_minosites` szint nem érvényesül az RLS-ben (minősítés szűrés)
- ❌ **Auditor szerepkör** — hiányzik, a brief expliciten kéri
- ❌ **Betekintő korlátozott mód** — „csak olvasás, letöltés nélkül, vízjelezett előnézet" — a watermark a PDF API-ban részlegesen van, de a letöltés-tiltás nincs
- ⚠️ **Két user demo** — az ellenőrzésen be kell mutatni: „ugyanaz az ügyirat, egyik látja, másik nem" — ezt az RLS policy-knek kell kezelniük

---

### 9. SSO (Egyszeri belépés) — 🔴 ~30%

**Megvan:**
- Supabase Auth (email/password)
- [Login oldal](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/login/page.tsx)
- [IT Biztonsági Szabályzat oldal](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/security-policy/page.tsx)

**Hiányzik:**
- ❌ **OIDC / SAML SSO integráció** (Microsoft Entra ID / Google Workspace) — a brief 9. pontja szó szerint ezt kéri
- ❌ **ERP-integrált auth** (JWT elfogadás külső rendszerből)
- ❌ **MFA** (kötelező, ha nincs SSO)
- ❌ **IT Biztonsági Szabályzat mint dokumentum** — az oldal megvan, de nem tudom, hogy tartalmazza-e a pályázati elvárásokat (jelszópolitika, mentés, incidenskezelés, adatfeldolgozói kötelezettségek)

---

### 10. Beépített keresés — 🟢 ~80%

**Megvan:**
- [Globális kereső oldal](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/search) — szabadszavas + metaadat szűrők
- Postgres tsvector + GIN index (magyar szótár)
- [Mentett keresések](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/migrations/20260719075925_mentett_kereses.sql)
- OCR szöveg kereshetősége (mezőben tárolt)

**Hiányzik:**
- ⚠️ **OCR ténylegesen fut-e?** — az IMAP service OCR-t kér, de Tesseract telepítés/konfiguráció nem egyértelmű
- ❌ **Szemantikus keresés** (pgvector) — opcionális a briefben, de differenciáló
- ⚠️ A keresés RLS-en keresztül szűrődik-e? — elvileg igen, de validálni kell

---

## Admin modul — 🔴 ~20%

A [/admin oldal](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/admin/page.tsx) gyakorlatilag **placeholder** — két szürke doboz `opacity-50`-nel.

**Hiányzik:**
- ❌ Felhasználók kezelése (jelenleg a beállításoknál van egy csapat tab, de nincs dedikált admin)
- ❌ Irattári terv kezelése UI — nincs UI az irattári tételek CRUD-jához
- ❌ Iktatószám-formátum konfiguráció UI
- ❌ Globális audit napló nézet (szűrhető, exportálható)
- ❌ Értesítési szabályok admin nézete (részlegesen a beállításoknál)

> **Megjegyzés:** A beállítások (`/settings`) oldal sok admin funkciót lefed (csapat, szervezeti egységek, értesítések), de ezek nincsenek az `/admin` route alá szervezve. Ez UX szempontból zavaró lehet, de funkcionálisan léteznek.

---

## Top 7 Kritikus Hiánypont (ami nélkül NEM mutatható be az ellenőrzésen)

| # | Hiány | Brief pont | Prioritás |
|---|-------|-----------|-----------|
| 1 | **Életciklus-riport PDF export** | 6.4 | 🔴 Kritikus |
| 2 | **SSO (OIDC/SAML)** vagy legalább MFA | 9. köv. | 🔴 Kritikus |
| 3 | **ABAC minősítés szűrés az RLS-ben** | 8. köv. | 🔴 Kritikus |
| 4 | **PDF/A konverzió** (LibreOffice/Ghostscript) | 2. köv. | 🔴 Kritikus |
| 5 | **Webhook rendszer** (ERP felé) | 5. köv. | 🟡 Közepes |
| 6 | **POST irat API** (ERP-ből feltöltés) | 5. köv. | 🟡 Közepes |
| 7 | **Admin oldal** (irattári terv CRUD, audit napló nézet) | 9. UI pont | 🟡 Közepes |

---

## Ami jól áll (nem kell hozzányúlni)

- ✅ Érkeztetés + Iktatás flow
- ✅ Bejövő sor (Inbox) + kétpaneles nézet
- ✅ Ügyirat adatlap (merged tabs, kompakt metadata)
- ✅ Feladat modul (Kanban + lista)
- ✅ Selejtezés (4 tab, négy szem elve, jegyzőkönyv)
- ✅ Partner adatlap + polimorf kapcsolatok
- ✅ SMS + e-mail értesítések (Twilio + SMTP)
- ✅ Kölcsönzési napló
- ✅ Frontend design (egységes facelift kész)
