# A-059 [Docs] Cég Végleges Törlése, Kaszkádolt Életciklus és Jogosultságkezelés

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-034](A-034-multi-tenancy-architecture.md), [A-058](A-058-eaisybill-company-import-and-sync.md), [A-029](A-029-global-ui-consistency-and-unified-components.md), [P-078](../../product/decisions/P-078-company-deletion-and-management-ux.md)

## 1. Kontextus és Problémafelvetés
A többvállalatos (multi-tenant) struktúrában a felhasználók tesztcégeket hozhattak létre, vagy az eaisyBill-ből importáltak olyan vállalatokat, amelyekre a továbbiakban már nincs szükségük. Korábban a rendszerben nem létezett felület vagy backend akció vállalatok törlésére, így a felesleges cégek benne maradtak a cégválasztóban és a beállításokban.
Szükségessé vált a cégek biztonságos, végleges törlésének megvalósítása a megfelelő jogosultsági és integritás-védelmi korlátokkal.

## 2. Architektúra Döntések

### 2.1 Adatbázis Integritás és RLS Szabályzat
- A `public.companies` táblára hivatkozó összes idegen kulcs (50+ reláció: `company_members`, `user_company_access_cache`, `ugy`, `ugyirat`, `irat`, `partner`, `irattari_terv`, `esemeny_naplo`, `hr_*` entitások, prompt szabályok) `ON DELETE CASCADE` záradékkal rendelkezik, így a cég törlése automatikusan és tranzakció-biztosan kitisztítja a kapcsolódó rekordokat anélkül, hogy inkonzisztens vagy árva adatok maradnának.
- Létrehoztuk a `supabase/migrations/20261014000002_add_companies_delete_policy.sql` migrációt, amely explicit adatbázis-szintű DELETE RLS szabályt ad a cég tulajdonosainak (`owner_id = auth.uid()` vagy `role = 'owner'`).

### 2.2 Szerver Akció (`deleteCompanyAction`)
- **Autentikáció és Jogosultság-ellenőrzés:**
  - Csak a cég tulajdonosa (`companies.owner_id === user.id` vagy `company_members.role === 'owner'`) vagy globális rendszergazda (`felhasznalo_profil.docs_szerepkor === 'rendszergazda'`) törölhet vállalatot.
- **Aktív Cég Kezelése és Visszaesés (Fallback):**
  - Ha a felhasználó azt a céget törli, amely éppen aktív kontextusként van kiválasztva a böngésző cookie-jában (`SELECTED_COMPANY_COOKIE`), a szerverakció automatikusan megkeresi a felhasználó következő elérhető cégét, és arra állítja át a munkamenetet (`SELECTED_COMPANY_COOKIE`).
  - Ha nem maradt több cége, a cookie törlődik.
- **Cache Érvénytelenítés:** A `revalidatePath("/", "layout")` azonnal újragenerálja a navigációs és oldalsávos kontextust.

### 2.3 Frontend Megjelenítés (`CompanySettingsTab`)
- A Beállítások Cég fülén az „Összes elérhető cégem” listában minden olyan vállalat mellett, ahol a felhasználó tulajdonos vagy admin, megjelenik a diszkrét törlés gomb (`Trash2` ikon).
- Az aktív cég szerkesztési kártyáján a tulajdonos számára a mentés gomb mellett egy külön „Cég törlése” akciógomb is elérhető.
- Minden törlési kísérletet a kanonikus `AlertDialog` modál erősít meg, figyelmeztetve a visszafordíthatatlan adatvesztésre.

## 3. Érintett Fájlok
- `supabase/migrations/20261014000002_add_companies_delete_policy.sql`
- `scripts/apply-companies-delete-policy.ts`
- `src/app/actions/company-actions.ts`
- `src/components/settings/company-settings-tab.tsx`

## 4. Hatások és Konzekvenciák
- **Pozitív:** A felesleges cégek tisztán, maradéktalanul eltávolíthatók; az aktív munkamenet azonnal átvált egy megmaradt vállalatra.
- **Biztonság:** Idegen felhasználók nem törölhetnek olyan céget, amelynek nem tulajdonosai; a törlés nem hagy maga után árva rekordokat az adatbázisban.
