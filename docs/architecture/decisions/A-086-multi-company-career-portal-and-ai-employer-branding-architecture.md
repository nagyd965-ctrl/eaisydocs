# A-086: [HR] Többcéges Karrierportál, Strukturált Álláshirdetés-metadatok, Pályázatkövetés és AI Vállalati Prezentáció Architektúra

**Status:** Decided  
**Date:** 2026-10-27  
**Scope:** [HR]  
**Author:** Antigravity  
**Kapcsolódó PRD:** [P-118](../../product/decisions/P-118-multi-company-career-portal-and-ai-company-presentation-wizard-ux.md)  
**Kapcsolódó Kód:** `supabase/migrations/20261027000001_career_portal_pro_upgrade.sql`, `supabase/migrations/20261027000002_add_career_presentation_to_companies.sql`, `src/utils/hr/career-constants.ts`, `src/utils/hr/career-presentation-types.ts`, `src/app/hr/recruitment/company-presentation-actions.ts`, `src/app/hr/recruitment/actions.ts`, `src/app/karrier/page.tsx`, `src/app/karrier/[id]/page.tsx`, `src/app/karrier/[id]/actions.ts`

---

## 1. Context (Kontextus)

Az eaisyHR publikus karrieroldala (`/karrier` és `/karrier/[id]`) korábban csak alapvető cím + rövid szöveg mezőket jelenített meg, nem támogatta a vállalatonként elkülönített (multi-tenant) karrierportál-működést, nem rendelkezett strukturált álláshirdetés-metaadatokkal (munkavégzés módja, foglalkoztatás típusa, szenioritás, EU bértranszparencia szerinti bérsáv), nem biztosított pályázatkövető azonosítót a jelöltek számára, és nem tette lehetővé, hogy a vállalatok vizuális „Cégünkről” (Employer Branding) prezentációval mutatkozzanak be a pályázóknak.

## 2. Decision (A Meghozott Döntés)

### 2.1. Adatbázis Séma Bővítések (`20261027000001` és `20261027000002`)
1. **`public.hr_allashirdetes` strukturált mezők:**
   - `munkavegzes_modja text DEFAULT 'hibrid'` (`irodai`, `hibrid`, `remote`)
   - `helyszin text DEFAULT 'Budapest'`
   - `foglalkoztatas_tipusa text DEFAULT 'teljes_munkaido'` (`teljes_munkaido`, `reszmunkaido`, `megbizasi`, `gyakornok`)
   - `tapasztalati_szint text DEFAULT 'medior'` (`junior`, `medior`, `senior`, `lead`)
   - `reszleg_nev text`
   - `bersav_min integer`, `bersav_max integer`, `bersav_publikus boolean DEFAULT false` (EU Pay Transparency megfelelőség).
2. **`public.hr_toborzas` jelölt- és pályázatkövetési mezők:**
   - `palyazati_kod text` (egyedi `KAR-YYYY-XXXXXX` formátumú követőkód indexeléssel)
   - `linkedin_url text`, `berigeny text`, `kezdesi_ido text`, `forras text DEFAULT 'karrieroldal'`, `megpalyazott_terulet text`.
3. **`public.companies` többcéges AI karrier-prezentáció tárolás:**
   - `career_presentation jsonb` oszlop a `companies` táblán, amely cégre szabottan tárolja a `CompanyCareerPresentation` struktúrát (`briefing`, `heroSlide`, `cultureSlide`, `environmentSlide`, `perksSlide`, `closingSlide`).

### 2.2. Többcéges AI Prezentáció Generálás és Képfeltöltés (`company-presentation-actions.ts`)
- **`generateCompanyPresentationWithAiAction(briefing)`:** Az aktív vállalat (`getActiveCompanyIdServer`) nevéből, székhelyéből és a HR által megadott briefing adatokból a `Google Gemini 2.5 Flash` (`@google/genai`) segítségével 5 fejezetes JSON struktúrájú magyar nyelvű vállalati prezentációt generál, determinisztikus fallback motorral (`buildPresentationFromBriefing`).
- **`uploadCompanyPresentationImageAction(formData)`:** Saját nagy felbontású irodai vagy csapatfotók (max. 8 MB) feltöltése a `companies/{companyId}/career_*` tárolási útvonalra.
- **`saveCompanyPresentationAction(presentation)`:** Az elkészült prezentáció mentése a `companies.career_presentation` JSONB mezőbe, `hr_esemeny_naplo` audit bejegyzéssel és `/karrier` gyorsítótár-érvénytelenítéssel (`revalidatePath`).

### 2.3. Pályázatkövetés és Publikus Jelentkezési Pipeline (`karrier/[id]/actions.ts`)
- **`submitApplication`:** Minden konkrét pozícióra vagy spontán Talent Poolba érkező jelentkezéshez egyedi `KAR-2026-XXXXXX` azonosítót generál, rögzíti a célvállalat `company_id`-ját, és visszaadja a kódot a pályázónak.
- **`checkApplicationStatusAction(email, code?)`:** Publikus, biztonságos szerveroldali lekérdezés, amely e-mail cím és opcionális pályázati azonosító alapján visszaadja a jelölt pályázatainak aktuális kiválasztási szakaszát (`uj`, `szures`, `interju`, `ajanlat`, `felvetel`, `elutasitva`).

## 3. Consequences (Következmények)

- **Pozitív:** Minden vállalat (`Think AI Kft.`, `SANDBOX`, `Teszt Kft.`) teljesen önálló, saját arculatú karrieroldallal, AI-alapú 5 fejezetes bemutatkozó prezentációval és strukturált álláshirdetésekkel rendelkezik egyetlen közös adatbázison.
- **Kompromisszum:** A `companies.career_presentation` JSONB oszlop rugalmas sémát biztosít az 5 fejezet számára, amelyet a `CompanyCareerPresentation` TypeScript interfész és a `buildDefaultCompanyPresentation` segédfüggvény véd a hiányzó mezők ellen.
