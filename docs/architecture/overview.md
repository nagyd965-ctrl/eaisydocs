# [Közös] eaisyDocs & eaisyHR – Rendszerarchitektúra Áttekintés

Ez a dokumentum rögzíti az **eaisyDocs** és **eaisyHR** technológiai alapjait, a szerveroldali és kliensoldali struktúrát, a háttérfolyamatokat és az adatbiztonsági rétegeket a valós forráskód alapján.

---

## 🛠️ Technológiai Stack

| Réteg | Technológia | Szerep |
|---|---|---|
| **Frontend Framework** | Next.js 15 (App Router) | SSR, React Server Components, Server Actions (`src/app/`) |
| **Nyelv** | TypeScript 5 (Strict mode) | Szigorú típusbiztonság az adatbázistól a UI komponensekig |
| **Stílus & UI** | Tailwind CSS v4, shadcn/ui, Radix UI | Linear-inspirált flat design, HSL szemantikus tokenek, sötét mód |
| **Ikonok** | Lucide React | Egységes `h-4 w-4` méretezés |
| **Diagramok & Analitika** | Recharts | Műszerfali adatvizualizáció (`AreaChart`, `PieChart`, `BarChart`) |
| **Backend & Adatbázis** | Supabase (PostgreSQL 15+, PostgREST, RLS) | Tranzakciók, RLS jogosultságok, Tárolás, Security Definer RPC-k |
| **PDF és Dokumentum Kezelés**| `pdf-lib`, `sharp`, `DocumentPreviewFrame` | PDF vízjelezés (`/api/pdf/[id]`), elválasztólapos darabolás, Blob izoláció, Ghostscript PDF/A-2b |
| **AI Feldolgozás** | Google GenAI SDK (`@google/genai`), pgvector | OCR szövegértelmezés, önéletrajz parsing, metaadat-javaslat, 1536 dimenziós embeddings |
| **Háttér Workers & Cron** | Next.js Route Handlerek (`/api/cron/*`) & Node.js TSX daemonok (`imap-worker.ts`, `ai-worker.ts`) | E-mail figyelés, aszinkron AI sorfeldolgozás, éjszakai felügyelet, Twilio SMS |

---

## 🏗️ Főbb Rendszerkomponensek

```text
┌────────────────────────────────────────────────────────┐
│               Kliens (Next.js 15 Frontend)              │
│   • App Router (/inbox, /dossiers, /archive, /hr, etc) │
│   • DocumentPreviewFrame (Memóriabeli Blob URL)        │
│   • DashboardOverview (Recharts trendek & KPI-k)       │
└──────────────────────────┬─────────────────────────────┘
                           │ Server Actions & Auth
┌──────────────────────────▼─────────────────────────────┐
│                 Next.js Szerveroldal                    │
│   • Server Actions (filing-actions, disposal-actions)  │
│   • Route Handlerek (/api/v1/*, /api/cron/*, /api/pdf) │
│   • PDF szétválasztás & OCR feldolgozás                │
│   • Supabase SSR Client & Middleware Session Guard     │
└──────────────────────────┬─────────────────────────────┘
                           │ PostgreSQL / RLS / Storage
┌──────────────────────────▼─────────────────────────────┐
│                   Supabase Platform                     │
│   • PostgreSQL Adatbázis (RLS 4 dimenziós ABAC/RBAC)   │
│   • Storage (Szigorúan privát buckets, 60s signed URL) │
│   • Realtime (Iktatási ütközésfigyelés, REPLICA FULL)  │
│   • RPC Függvények (get_decrypted_hr_data, generate_*) │
└──────────────────────────▲─────────────────────────────┘
                           │ Worker kapcsolat
┌──────────────────────────┴─────────────────────────────┐
│               Háttérfeldolgozó Daemonok                │
│   • imap-worker.ts / api/cron/imap: IMAP érkeztetés    │
│   • ai-worker.ts: Aszinkron AI OCR és metaadat sor     │
│   • api/cron/nightly: Éjszakai felügyelet & eszkaláció │
│   • api/cron/morning: Reggeli interjú SMS küldés       │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 Moduláris Architektúra (Docs vs HR)
- Az **eaisyDocs** és az **eaisyHR** közös adatbázison, de szigorúan lazán csatolt (loosely coupled) módon működik.
- A jogosultsági szintek szeparáltak (`docs_szerepkor` vs `hr_szerepkor`).
- Az összeköttetést a polimorf `irat_kapcsolat` tábla valósítja meg, így az egyik modul hiánya soha nem okozhat hibát a másikban.
- Különálló eseménynaplók: `esemeny_naplo` az iratkezeléshez és `hr_esemeny_naplo` a munkaügyi auditokhoz.

---

## 🌐 Külső Rendszerek Integrációja (eaisyBill, ERP, CRM)
- Az **eaisyBill** egy **teljesen különálló rendszer és adatbázis** (`EAISYBILL_SUPABASE_URL`), amely NEM osztozik az eaisyDocs/eaisyHR központi adatbázisán.
- A kapcsolat biztonságos API-n / Supabase kliensen keresztül valósul meg (`src/utils/supabase/eaisybill.ts`, `createEaisyBillClient`).
- **Számlaimport működése:** Az eaisyDocs az `irat` táblában rögzíti a beérkező számlát (`kulso_forras = 'eaisybill'`, `erkezes_modja = 'eaisybill'`), a partnert pedig a helyi `partner` táblában azonosítja vagy hozza létre adószám alapján (`findOrCreatePartner`). A melléklet fájlokat közvetlen URL-ként (`kulso_fajl_url`) hivatkozza meg, elkerülve a felesleges fájlduplikációt.
- **Keresztmodulos kapcsolatok:** Az iratok és külső ERP/CRM bizonylatok összekapcsolását a polimorf `irat_kapcsolat` tábla (`entitas_forras = 'eaisybill'`) és a beágyazható partner-dosszié widget (`/embed/partner-dossiers`) biztosítja.
