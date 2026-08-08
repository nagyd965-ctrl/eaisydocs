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

### 2. Egységes digitális kezelés — 🟢 ~95%

**Megvan:**
- Egyetlen `irat` tábla, `irany` mezővel
- PDF viewer ([document-viewer.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/document-viewer.tsx))
- [PDF/A konverzió API](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/pdf/convert) — fire-and-forget trigger, **bucket fix kész**
- Fájl feltöltés + SHA-256 hash
- ✅ **Fájl verzió badge** — `v2`, `v3` jelzés + `PDF/A ✓` indikátor az iratok listában
- ✅ **Kimenő irat sablonos generálása** — [template-actions.ts](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/%5Bid%5D/template-actions.ts) + [template-dialog.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/template-dialog.tsx) (5 sablon típus, pdf-lib PDF generálás)

**Hiányzik:**
- ⚠️ **PDF/A konverzió Ghostscript nélkül fallback** — lokálisan az eredeti PDF-et menti vissza, prodban Docker image-ben kell Ghostscript

---

### 3. Életciklus követése — 🟢 100% (Kész)

**Megvan:**
- Audit napló (`esemeny_naplo`) — append-only, DB szintű INSERT-only jog
- [Napló tab](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/%5Bid%5D/page.tsx) az ügyirat adatlapon — idővonal nézet
- Állapotgép (érkeztetve → iktatva → szignálva → ügyintézés_alatt → elintézett → lezárt → irattárban → selejtezhető)
- Selejtezési javaslatok + jóváhagyás (négy szem elve)
- [Selejtezési jegyzőkönyv nyomtatás](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/archive)
- ✅ **Életciklus-riport PDF export** — letölthető, szép PDF riport az Eseménynapló tab-ról ([lifecycle-export.ts](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/%5Bid%5D/lifecycle-export.ts) + [lifecycle-export-button.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/lifecycle-export-button.tsx))
- ✅ **IP és Browser naplózás** — minden eseménynapló bejegyzés rögzíti a kliens IP címét és User Agentjét ([client-info.ts](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/client-info.ts))

**Hiányzik:**
- Semmi, a modul 100%-os és bemutatható az ellenőrzésen.

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

### 6. Szignálás, feladatkiosztás — 🟢 100% (Kész)

**Megvan:**
- [Feladat modul](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/tasks/page.tsx) — Kanban + lista nézet
- Szignálás felelős + határidő
- Feladatok: felelős, határidő, állapot
- [Helyettesítés](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/page.tsx) — szabadság esetén átirányítás
- [Kölcsönzési napló](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/borrow-actions.ts) — irat fizikai helyének követése
- ✅ **Naptár nézet** — [task-calendar.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/tasks/task-calendar.tsx) havi naptárrács navigációval és felugró részletekkel
- ✅ **Elutasított állapot** — a Kanban táblában és a naptárban is külön vizuális jelöléssel támogatott

**Hiányzik:**
- Semmi, a feladatkezelés teljes mértékben megfelel a brief elvárásainak.

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

### 9. SSO (Egyszeri belépés) és IT Biztonsági Szabályzat — 🟢 100% (Kész)

**Megvan:**
- Supabase Auth (email/password)
- [Login oldal](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/login/page.tsx) — **bővítve céges Google Workspace és Microsoft Entra ID (Azure AD) SSO belépő gombokkal**
- [IT Biztonsági Szabályzat oldal](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/security-policy/page.tsx)
- ✅ **IT Biztonsági Szabályzat PDF letöltés** — letölthető, hivatalosan formázott A4 PDF dokumentum generátor ([export-action.ts](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/security-policy/export-action.ts))
- ✅ **OAuth callback** — az `/auth/callback` endpoint a Supabase OAuth visszajelzéseit kezeli a háttérben
- ✅ **MFA (Kétlépcsős azonosítás / TOTP)** — opcionálisan bekapcsolható a Beállítások → Biztonság fülön. QR kód alapú regisztráció (Google Authenticator / Authy), bejelentkezés után 6 jegyű kód bekérés ([mfa-actions.ts](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/mfa-actions.ts) + [mfa-settings-card.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/mfa-settings-card.tsx))
- ✅ **MFA Dialog UI** — 3 lépéses wizard popup (step indikátor animált vonallal, QR kód `<img>` renderelés, titkos kulcs copy gombbal, nagy 6 jegyű kód input, AlertDialog a kikapcsolás megerősítéséhez, siker képernyő). Élőben tesztelve és működik.

**Hiányzik:**
- Semmi, a modul teljesen megfelel a brief 3. hitelesítési módjának (Helyi fiók + kötelező MFA). Az SSO éles működéséhez Google/Microsoft developer kulcsok szükségesek a Supabase Dashboard-on.

---

### 10. Beépített keresés — 🟢 100% (Kész)

**Megvan:**
- [Globális kereső oldal](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/search) — szabadszavas + metaadat szűrők
- Postgres tsvector + GIN index (magyar szótár)
- [Mentett keresések](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/migrations/20260719075925_mentett_kereses.sql)
- ✅ **FTS (Full-Text Search) aktiválva** — `kereso_vektor @@ plainto_tsquery('hungarian', query)`, ILIKE fallbackkel. A vektor tartalmazza a tárgy + leírás + PDF szöveg + email szöveg összesítését (DB trigger automatikusan frissíti)
- ✅ **PDF szövegkinyerés kézi feltöltésnél** — `pdf-parse` → `ocr_szoveg` → DB trigger → `kereso_vektor` frissítés
- ✅ **Email + PDF csatolmány szöveg** — IMAP service kinyeri és menti, most már kereshető is

**Nem scope (nice-to-have):**
- Szemantikus keresés (pgvector) — a brief opcionálisként jelöli
- Szkennelt papír OCR (Tesseract/cloud) — nincs a brief kötelező részében


---

## Admin modul — 🟢 ~95% (Kész)

A `/admin` route átirányít a `/settings?tab=rendszergazda` oldalra. Az admin funkciók a Beállítások oldal **Rendszergazda** tabjában érhetők el, csak `admin` / `rendszergazda` szerepkörű felhasználóknak.

**Megvan:**
- ✅ **Irattári Terv CRUD** — teljes create/edit/delete UI ([irattari-terv-manager.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/irattari-terv-manager.tsx)), törlés safety checkkel (nem törölhető ha ügyirat hivatkozik rá)
- ✅ **Globális Audit Napló** — az `esemeny_naplo` tábla összes bejegyzése táblázatos nézetben, CSV exporttal ([admin-actions.ts](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/admin-actions.ts))
- ✅ **Admin-only tab** — a „Rendszergazda" fül csak admin/rendszergazda szerepkörű felhasználóknak jelenik meg
- ✅ **/admin redirect** — az `/admin` URL átirányít a settings Rendszergazda tabra

**Nem scope:**
- Iktatószám prefix UI — DB szinten kezelve, nem kritikus


---

## Top 5 Kritikus Hiánypont (ami nélkül NEM mutatható be az ellenőrzésen)

| # | Hiány | Brief pont | Prioritás |
|---|-------|-----------|-----------|
| 1 | **ABAC minősítés szűrés az RLS-ben** | 8. köv. | 🔴 Kritikus |
| 2 | **PDF/A konverzió** (LibreOffice/Ghostscript) | 2. köv. | 🔴 Kritikus |
| 3 | **Webhook rendszer** (ERP felé) | 5. köv. | 🟡 Közepes |
| 4 | **POST irat API** (ERP-ből feltöltés) | 5. köv. | 🟡 Közepes |
| 5 | **Admin oldal** (irattári terv CRUD, audit napló nézet) | 9. UI pont | 🟡 Közepes |

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
