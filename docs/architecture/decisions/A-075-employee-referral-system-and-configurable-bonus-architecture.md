# A-075 [HR] Dolgozói Ajánlási Rendszer és Konfigurálható Bónusz Architektúra

## Státusz
Elfogadva (Accepted) - 2026-10-19

## Kontextus és Problémafelvetés
Az eaisyHR dolgozói portálján hiányzott a dolgozói ajánlások (Referrals) strukturált, biztonságos és többcéges (multi-tenant) adatbázis-szintű támogatása.
Szükséges volt biztosítani:
1. Egy dedikált adatbázistáblát az ajánlások és bónuszok követésére (`hr_dolgozoi_ajanlas`), szigorú multi-tenant RLS elszigeteléssel.
2. Automatikus integrációt a meglévő toborzási folyamattal (`hr_toborzas`), hogy a beajánlott jelölt azonnal megjelenjen a HR toborzási felületén.
3. Cég-specifikus bónusz összeget (`referral_bonus_amount`), amely adminisztrátori jogosultsággal módosítható.
4. Biztonságos önéletrajz tárolást és kizárólag aláírt, rövid lejáratú URL-eken keresztüli elérést.

## Architektúrális Döntések

### 1. Adatbázis Séma és Tábla Struktúra
- `public.companies`:
  - `referral_bonus_amount INTEGER DEFAULT 150000`: cég szinten testreszabható fix ajánlási bónusz.
- `public.hr_dolgozoi_ajanlas`:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `company_id UUID REFERENCES companies(id) ON DELETE CASCADE`: többcég elszigetelés.
  - `ajanlo_dolgozo_id UUID REFERENCES felhasznalo_profil(id) ON DELETE CASCADE`: az ajánlást benyújtó dolgozó.
  - `allashirdetes_id UUID REFERENCES hr_allashirdetes(id) ON DELETE SET NULL`: opcionálisan megpályázott állás.
  - `toborzas_id UUID REFERENCES hr_toborzas(id) ON DELETE SET NULL`: összekapcsolás a toborzási pipeline jelölttel.
  - `jelolt_nev TEXT NOT NULL`, `jelolt_email TEXT NOT NULL`, `jelolt_telefon TEXT`, `linkedin_url TEXT`
  - `cv_storage_path TEXT`: a Supabase storage-ban tárolt önéletrajz útvonala.
  - `ajanlas_indoklas TEXT`: személyes indoklás.
  - `bonusz_osszeg INTEGER NOT NULL DEFAULT 150000`: az ajánlás pillanatában érvényes bónusz összeg (snapshot).
  - `bonusz_statusz TEXT NOT NULL DEFAULT 'fuggoben'`: `'fuggoben'`, `'feltetelhez_kotve'`, `'kifizetheto'`, `'kifizetve'`, `'elutasitva'`.
  - `kifizetes_datuma DATE`, `megjegyzes TEXT`.

### 2. Multi-Tenant és RLS Házirendek (ABAC/RBAC)
- **RESTRICTIVE házirend:**
  - `tenant_isolation_restrictive`: `public.user_has_company_access(company_id)` ellenőrzése minden műveletnél.
- **PERMISSIVE házirendek:**
  - `hr_dolgozoi_ajanlas_select`: Dolgozó látja a saját ajánlásait (`ajanlo_dolgozo_id = auth.uid()`), míg a HR és cégtulajdonos/admin látja a céghez tartozó összes ajánlást.
  - `hr_dolgozoi_ajanlas_insert`: Bármely hitelesített dolgozó beküldhet ajánlást saját azonosítójával.
  - `hr_dolgozoi_ajanlas_update`: Csak HR és adminisztrátorok frissíthetik az ajánlások státuszát és a bónusz jóváhagyását.

### 3. Toborzási Pipeline Híd (`hr_toborzas`) és Fájlvédelem
- A `submitReferralAction` szerverakció tranzakciós jelleggel:
  - Fájl vizsgálat: méret (max 10 MB), kiterjesztés (PDF/DOC/DOCX) és PDF magic-bytes ellenőrzés.
  - Feltöltés `hr_dokumentumok` storage bucketbe `referral/{uuid}.{ext}` névvel.
  - Rekord létrehozása a `hr_toborzas` táblában az aktív cég azonosítójával és az ajánló megjelölésével.
  - Rekord létrehozása a `hr_dolgozoi_ajanlas` táblában a lezárt bónusz összeggel és hivatkozással a toborzási rekordra.
  - Eseménynapló audit bejegyzés a `hr_esemeny_naplo` táblába.

### 4. Ajánlás Visszavonása és Életciklus Lezárása (`deleteReferralAction`)
- A munkatárs jogosult visszavonni a tévesen rögzített ajánlását, amíg az feldolgozás alatt (`fuggoben`) áll:
  - Jogosultság ellenőrzése: Csak a saját ajánlás (`ajanlo_dolgozo_id = auth.uid()`) vagy cégadminisztrátor vonhatja vissza.
  - Elbírált (`feltetelhez_kotve`, `kifizetheto`, `kifizetve`) rekordok védettek a törlés ellen a pénzügyi és audit integritás érdekében.
  - Tranzakciós takarítás: Törli a csatolt CV fájlt a `hr-documents` tárolóból, a generált `hr_toborzas` rekordot és a `hr_dolgozoi_ajanlas` sort.

## Következmények és Előnyök
- **Biztonság és Elszigetelés:** Nincs átszivárgás más cégek között; a dolgozók nem látják egymás ajánlásait vagy a jelöltek bizalmas HR interjú jegyzeteit.
- **Pénzügyi integritás:** A bónusz összege az ajánlás pillanatában rögzül (`bonusz_osszeg`), így a későbbi cégbeállítás módosítások nem torzítják a már folyamatban lévő ajánlások értékét.
- **Auditálhatóság és Tisztaság:** Minden ajánlás bekerül az append-only eseménynaplóba, a visszavonás pedig nyomtalanul és tisztán eltávolítja a storage fájlokat és a pipeline rekordokat.
