# A-058 [Docs] eaisyBill Vállalat-import és Dinamikus Cégalapú Számlaszinkronizáció

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-003](A-003-eaisybill-channel-enum-migration.md), [A-034](A-034-multi-tenancy-architecture.md), [A-029](A-029-global-ui-consistency-and-unified-components.md), [P-077](../../product/decisions/P-077-company-selector-eaisybill-import-tab.md)

## 1. Kontextus és Problémafelvetés
Korábban az eaisyDocs bejövő sorában (`/inbox`) az „Importálás eaisyBillből” funkció kizárólag a `EAISYBILL_COMPANY_ID` környezeti változó által definiált Think AI Kft. számláit jelenítette meg minden felhasználó és vállalat számára.
Többvállalatos környezetben (ahol a partner eaisyBill fiókjában több tucat cég található, pl. Mandala Fogadó Kft.) ez lehetetlenné tette a nem-Think AI cégek számláinak átemelését. Szükségessé vált a vállalatok teljes körű importálása az eaisyBill-ből az eaisyDocs-ba, valamint az eaisyBill számlák lekérésének cég-specifikus dinamikus összekapcsolása.

## 2. Architektúra Döntések

### 2.1 Adatbázis Modell Kiegészítés (`public.companies.eaisybill_company_id`)
- A `public.companies` tábla kiegészült egy `eaisybill_company_id UUID NULL` oszloppal.
- Egyedi parciális index került kialakításra (`CREATE UNIQUE INDEX idx_companies_eaisybill_company_id ON public.companies(eaisybill_company_id) WHERE eaisybill_company_id IS NOT NULL`), garantálva, hogy ugyanaz az eaisyBill vállalat ne kerülhessen duplikáltan importálásra ugyanabban a rendszerben.
- A meglévő Think AI Kft. rekord automatikusan össze lett kapcsolva az eaisyBill megfelelő azonosítójával (`ecf31039-b539-4e04-bbea-70ea48c701bb`).

### 2.2 Szerver Műveletek és Jogosultságkezelés
- **`getEaisyBillCompaniesAction`**: Lekéri az eaisyBill adatbázisból (`createEaisyBillClient`) az elérhető vállalatokat (`id`, `name`, `tax_number`, `address`, `country`), valamint összeveti őket az eaisyDocs `companies` táblájával (`alreadyImported`, `docsCompanyId`).
- **`importEaisyBillCompanyAction(eaisybillCompanyId)`**:
  - Ellenőrzi a bejelentkezett felhasználót.
  - Ha a cég már létezik az eaisyDocs-ban (adott `eaisybill_company_id` alapján), automatikusan biztosítja a tagságot a hívó fél számára és visszatér a meglévő céggel.
  - Új vállalat esetén rögzíti a `public.companies` táblában az adatokat (név, adószám, székhely, ország), amely a meglévő adatbázis triggereken (`trg_on_company_created`, `trg_sync_company_member_cache`) keresztül automatikusan tulajdonosi (`owner`) tagságot és RLS hozzáférést ad a kezdeményezőnek.
  - Az importálás után automatikusan beállítja a vállalatot aktív kontextusként cookie-ban (`setActiveCompanyServer`).

### 2.3 Számlaszinkronizáció Dinamizálása (`getImportableEaisyBillInvoices`)
- A hardkódolt környezeti változó fallback-je megszűnt.
- A funkció az aktuálisan kiválasztott vállalat (`getActiveCompanyServer`) `eaisybill_company_id` mezőjét használja.
- Védelmi logika: ha a kiválasztott vállalat még nincs eaisyBill azonosítóhoz rendelve, adószám-töredék (első 8 jegy) vagy pontos cégnév alapján megkísérli az automatikus összerendelést és perzisztálást; ha nem összerendelhető, egyértelmű, cselekvésre ösztönző hibaüzenetet küld az importálás szükségességéről.

## 3. Mérlegelt Alternatívák
- **Felhasználói e-mail alapú automatikus lekérés:** Az e-mail címek eltérhetnek a két rendszer között, ráadásul egy felhasználó több eaisyBill céghez is hozzáférhet. A cégalapú explicit import sokkal egyértelműbb és kiszámíthatóbb multi-tenant modellt nyújt.
- **Közös cégtábla használata:** Megsértené az eaisyDocs és eaisyBill moduláris függetlenségét és a külön adatbázis-architektúrát.

## 4. Érintett Fájlok
- `supabase/migrations/20261014000001_add_eaisybill_company_id.sql`
- `scripts/apply-eaisybill-company-id-migration.ts`
- `src/types/company.ts`
- `src/utils/company-server.ts`
- `src/app/actions/company-actions.ts`
- `src/app/inbox/eaisybill-actions.ts`
- `src/components/company-selector.tsx`

## 5. Hatások és Konzekvenciák
- **Pozitív:** Bármely eaisyBill cég (pl. Mandala Fogadó Kft.) egyetlen kattintással átemelhető az eaisyDocs rendszerbe, és a bejövő sorban azonnal az adott céghez tartozó számlák jelennek meg.
- **Figyelendő:** Ha egy vállalat még nem kapcsolódik eaisyBill céghez, az inbox figyelmeztetést jelenít meg és felkínálja a cégválasztóból történő összerendelést/váltást.
