# [Közös] A-030: Alkalmazásszintű Biztonsági Keményítés és Védelmi Kapuk

**Státusz:** Decided  
**Dátum:** 2026-10-02  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Kapcsolódó PRD:** [P-044](../../product/decisions/P-044-code-level-security-hardening.md)  
**Kapcsolódó Kód:** `src/app/api/send-email/route.ts`, `src/app/api/hr/download-document/route.ts`, `src/app/api/cron/*`, `src/app/api/pdf/convert/route.ts`, `src/app/api/hr/parse-cv/route.ts`, `src/app/karrier/[id]/*`, `src/utils/supabase/middleware.ts`, `next.config.ts`, `src/app/auth/callback/route.ts`

---

## 1. Kontextus és Biztonsági Audit Eredmények

A ThinkAI Security Audit keretében az alkalmazás forráskódjának és API végpontjainak teljes körű felülvizsgálata történt. Az audit számos kritikus és magas prioritású sebezhetőséget tárt fel az alkalmazás rétegben (Next.js App Router):

1. **Nyílt e-mail relé sebezhetőség (`/api/send-email`):** Autentikáció nélküli végpont tetszőleges címzettre való küldési lehetőséggel (SPAM / Phishing kockázat).
2. **Közvetlen objektumhivatkozási jogosulatlan hozzáférés (IDOR) és Service Role megkerülés (`/api/hr/download-document`):** Bármely bejelentkezett felhasználó tetszőleges dolgozói személyi dokumentumhoz vagy munkaköri leíráshoz hozzáférhetett a Supabase Storage `hr-documents` privát bucketből.
3. **Beégetett és gyenge Cron kulcsok (`/api/cron/*`):** Hardcoded teszt fallback kulcsok (`'teszt-cron-kulcs-123'`) jelenléte a nightly és morning cron végpontokon, valamint feltételes ellenőrzés hiánya üres környezeti változó esetén az IMAP cronban.
4. **Védtelen PDF konverziós végpont (`/api/pdf/convert`):** Bárki tetszőleges URL-t vagy dokumentumot küldhetett konvertálásra, DoS és erőforrás-kimerítési kockázatot teremtve.
5. **AI Végpont visszaélési lehetőség (`/api/hr/parse-cv`):** Autentikáció és szerepkör-ellenőrzés nélküli Gemini LLM hívások, amelyek API kvóta kimerítéséhez és illetéktelen adatfeldolgozáshoz vezettek volna.
6. **Nem validált fájlfeltöltés karrier oldalon (`/karrier/[id]/actions.ts`):** MIME típus és magic bytes ellenőrzés nélküli fájlfeltöltés a `karrier-jelentkezesek` vödörbe.
7. **XSS kockázat az álláshirdetés megjelenítésénél (`/karrier/[id]/page.tsx`):** `dangerouslySetInnerHTML` használata sanitization nélkül az álláshirdetés szövegére.
8. **Path Traversal kockázat IMAP csatolmányoknál (`src/utils/imap-service.ts`):** Fájlnév-tisztítás hiánya a tárolási kulcsok generálásakor (`../` és vezérlőkarakterek).
9. **Hiányzó útvonalvédelem a middleware-ben:** Érzékeny útvonalak (`/partners`, `/tasks`, `/settings`, `/security-policy`, `/documents`, `/hr`) nem szerepeltek a `middleware.ts` védett útvonal regexében.
10. **Hiányzó OAuth callback handler és HTTP biztonsági fejlécek:** Nem létező `/auth/callback` végpont PKCE/OAuth exchange-hez, valamint hiányzó `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` fejlécek.

---

## 2. Építészeti Döntés: Kódszintű Keményítés (Supabase Migráció Nélkül)

A rendszer integritásának és azonnali visszafordíthatóságának (Git reversibility) megőrzése érdekében az alkalmazás szinten bevezetésre kerültek a szigorú védelmi rétegek:

### 2.1. API Végpont Védelmi Rétegek
- **E-mail küldő (`/api/send-email`):** Kizárólag érvényes Supabase felhasználói munkamenettel rendelkező kérések engedélyezettek. Szigorú e-mail cím regex validáció a címzettre (`/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`). Belső hibaüzenetek maszkolása.
- **HR Dokumentum Letöltés (`/api/hr/download-document`):** Szigorú ABAC/RBAC kapu:
  - Munkaköri leírások (`munkakori_leiras`) belső munkatársak számára olvashatók.
  - Személyi és munkajogi iratok (`munkaszerzodes`, `kilepo_adatlap`, `atadas_atvetel`, stb.) kizárólag a dokumentum tulajdonosa (érintett dolgozó a munkamenet alapján) VAGY `hr_admin` / `admin` szerepkörű felhasználók számára érhetők el.
- **Cron Feladatok (`/api/cron/*`):** Minden hardcoded teszt fallback kulcs eltávolításra került. A cron kérések kizárólag érvényes, nem üres `CRON_SECRET` Bearer tokennel vagy query paraméterrel futhatnak le.
- **PDF Konverzió (`/api/pdf/convert`):** Bejelentkezett felhasználói session VAGY belső `x-internal-secret` (`CRON_SECRET`) fejléc megléte kötelező. A belső hívók (`inbox/actions.ts`, `batch-scanner.ts`) átadják ezt a belső secretet.
- **AI CV Feldolgozás (`/api/hr/parse-cv`):** Munkamenet hitelesítés és `hr_admin` / `admin` szerepkör ellenőrzés a Gemini modell meghívása előtt.

### 2.2. Fájlkezelés és Kliens Oldali Védelem
- **Karrier Fájlfeltöltés (`/karrier/[id]/actions.ts`):** 
  - Kiterjesztés és MIME típus fehérlista (`.pdf` -> `application/pdf`, `.docx`, `.doc`).
  - Magic bytes ellenőrzés (PDF esetén az első 4 bájt `%PDF-` kell legyen).
  - Maximális fájlméret limit: 10 MB.
- **XSS Kivezetés (`/karrier/[id]/page.tsx`):** A `dangerouslySetInnerHTML` kivezetve; az álláshirdetés szövege és követelményei biztonságos, formázott szövegblokkként (`whitespace-pre-wrap leading-relaxed`) kerülnek megjelenítésre.
- **IMAP Csatolmány Path Traversal Védelem (`src/utils/imap-service.ts`):** A csatolt fájlok nevei sanitization eljáráson esnek át: `replace(/[^a-zA-Z0-9._-]/g, '_')` és a `..` szekvenciák eliminálása.

### 2.3. Infrastruktúra és Session Biztonság
- **Middleware védelem (`src/utils/supabase/middleware.ts`):** Bővített útvonal-ellenőrzés: `/iratok`, `/ugyiratok`, `/inbox`, `/partners`, `/tasks`, `/settings`, `/security-policy`, `/documents`, `/hr`. Jogosulatlan kérés esetén azonnali 307 átirányítás a `/login` oldalra.
- **OAuth Callback (`src/app/auth/callback/route.ts`):** Szabványos PKCE code exchange (`exchangeCodeForSession`), nyílt átirányítás (Open Redirect) elleni védelemmel (csak belső, relatív elérési utak engedélyezettek).
- **HTTP Biztonsági Fejlécek (`next.config.ts`):**
  - `X-Frame-Options: SAMEORIGIN` (Clickjacking elleni védelem)
  - `X-Content-Type-Options: nosniff` (MIME-sniffing támadások blokkolása)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 3. Következmények és Függetlenség

- **Biztonsági Szint:** A kód szintjén minden kritikus támadási felület lezárult.
- **Adatbázis Érintetlenség:** A Supabase adatbázis séma, az RLS táblák és az éles adatok semmilyen módosítást nem szenvedtek. Bármilyen probléma esetén egyetlen Git visszalépéssel visszaállítható a korábbi állapot.
- **Következő Fázis (Opcionális Adatbázis RLS):** Az adatbázis szintű RLS házirendek és a `SECURITY DEFINER` függvények `search_path` keményítése külön fázisban, ellenőrzött migráció formájában valósulhat meg.
