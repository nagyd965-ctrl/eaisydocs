# A-035: Céglogó Tárolás, Dinamikus Iktató Prefix és Tag Szerepkör Szinkronizáció

**Dátum:** 2026-10-08  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Státusz:** Elfogadva  

## 1. Technikai Megoldás és Architektúra

### Adatbázis Séma Bővítés
A `public.companies` tábla két új mezővel bővült:
```sql
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS filing_prefix TEXT DEFAULT 'DOCS';
```

### Céglogó Fájlkezelés
- A feltöltött képek a Supabase Storage `avatars` bucketjébe kerülnek `companies/${companyId}/logo_${Date.now()}.${ext}` útvonalra.
- A public URL mentésre kerül a `companies.logo_url` oszlopban.
- Eltávolításkor a mező értéke `NULL`-ra áll, és a layout cache revalidálódik.

### Iktatókönyv Előtag (Filing Prefix)
- A `fileIncomingDocument` akció lekéri az aktív vállalat rekordját (`getActiveCompanyServer()`).
- Ha nincs explicit prefix átadva az űrlapról, az aktív cég `filing_prefix`-ét használja (fallback: `'DOCS'`).
- A Postgres `generate_iktatoszam(p_ev, p_prefix)` és `generate_ugyszam(p_ev, p_prefix)` funkciók izolált számlálókon keresztül garantálják a gapless kiosztást.

### Tag Szerepkör Módosítás
- Az `updateCompanyMemberRoleAction` server action ellenőrzi a tulajdonosi jogosultságot.
- Frissíti a `company_members` rekordot (`role`, `docs_szerepkor`, `hr_szerepkor`).
- Szinkronban tartja a `felhasznalo_profil` táblát is a felhasználó jogosultsági integritásának megőrzésére.
