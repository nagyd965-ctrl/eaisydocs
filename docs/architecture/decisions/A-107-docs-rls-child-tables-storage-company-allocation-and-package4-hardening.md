# A-107 [Docs] / [Közös]: Gyermek- és Melléktáblák Cég-Scoped RLS Izolációja, Cégenkénti Számallokáció (`iktatoszam` / `ugyszam` / `erkeztetoszam`), `storage.objects` Védelem és 4. Csomag Biztonsági Szigorítások

- **Státusz:** Elfogadva és Implementálva
- **Dátum:** 2026-11-02
- **Hatókör:** `[Docs]` / `[Közös]`
- **Kapcsolódó döntések:** [A-104](./A-104-unified-multi-channel-notification-dispatchers-and-package1-docs-fixes.md), [A-105](./A-105-docs-multicompany-unique-constraints-audit-company-trigger-and-package2-isolation.md), [A-106](./A-106-docs-company-scoped-auth-guard-clearance-and-action-hardening.md), [P-136](../../product/decisions/P-136-docs-utf8-pdf-letter-generation-eaisybill-intake-and-multicompany-numbering-ux.md)
- **Migráció:** `supabase/migrations/20261102000002_docs_rls_child_tables_storage_and_allocation_isolation.sql`

## 1. Kontextus és Problémafelvetés

Az `eaisyDocs` mélyelemzés (`docs/eaisydocs-deep-analysis-20261102.md`) 4. csomagja (és a verifikációs nyitott tételek listája) az alábbi adatbázis- és szerveroldali réseket azonosította:
1. **Élő legacy jogosultság-eszkalációs RPC (`admin_update_user_role`):** A `public.admin_update_user_role(uuid, text, text, text)` függvény továbbra is létezett az élő adatbázisban, és pusztán a hívó globális `felhasznalo_profil.szerepkor` értékét ellenőrizte közös cégtagság vizsgálata nélkül.
2. **Audit napló (`esemeny_naplo`) törlődése cégtörléskor:** Az `esemeny_naplo_company_id_fkey` külső kulcs `ON DELETE CASCADE` beállítással rendelkezett (`confdeltype = 'c'`), ami sértette az `esemeny_naplo` szigorúan append-only jellegét (AGENTS.md 3. szabály).
3. **Globális sorszám-allokáció (`iktatoszam_allokacio`, `ugyszam_allokacio`, `generate_erkeztetoszam`):** Az iktatószám-, ügyszám- és érkeztetőszám-számlálók globálisak voltak (nem tartalmaztak `company_id` kulcsot), a `generate_erkeztetoszam` pedig `COUNT(*) + 1` (nem zárolt) lekérdezést használt.
4. **Gyermek- és melléktáblák, `ugyirat` ABAC és `storage.objects` RLS rések:**
   - A `partner_kapcsolattarto` táblán élt a `partner_kapcsolattarto_anon_read` (`TO anon USING (true)`) szabály.
   - Az `ugyirat_megjegyzes`, `irat_kapcsolat`, `ugyirat_hozzaferes`, `irat_kolcsonzes_naplo`, `irat_fizikai_hely`, `selejtezes_tetel`, `alkalmazas_ertesites` és `ai_feladat_sor` táblák nem rendelkeztek szülő-cég alapú RLS védelemmel, vagy `USING (true)` szabályokat használtak.
   - Az `ugyirat` `SELECT` szabályából hiányzott a `NOT public.check_ugyirat_has_unauthorized_irat(id, auth.uid())` ellenőrzés, a `check_ugyirat_user_access` függvényből pedig a `helyettesites` (aktív helyettesítési időszak) és az `ugy.felelos_user_id` ág.
   - A `check_irat_fajl_access` nem ellenőrizte a `public.user_has_company_access(i.company_id)` feltételt, a `storage.objects` `irat_files` bucket szabályai pedig bármely autentikált felhasználónak engedték a letöltést és törlést.
5. **Alkalmazásoldali SSRF, `eaisyBill` érkeztetés és céges meghívó jogosultságok:** A `kulso_fajl_url` / `melleklet_url` szerveroldali letöltései nem szűrték a privát/loopback/metadata IP-tartományokat; az `importInvoiceFromEaisyBill` `statusz: "piszkozat"` értékkel szúrt be és kliensoldali paraméterekre támaszkodott; az `eaisyBill` cégimport pedig nem ellenőrizte a hívó `eaisyBill`-beli cégtagságát.

## 2. Architektúra Döntések

### 2.1. Adatbázis RLS, Számallokáció és Tároló Izoláció (`20261102000002`)
- **`admin_update_user_role` végleges eltávolítása és `esemeny_naplo` FK védelem:** A `DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, text, text, text)` eltávolította a régi RPC-t; az `esemeny_naplo_company_id_fkey` külső kulcs `ON DELETE SET NULL`-ra módosult; a `can_view_user_profile` 4. ága kizárólag globális `rendszergazda` szerepkörre szűkült.
- **Cégszintű effektív szerepkör-feloldó (`public.get_effective_docs_role`):** Létrejött a `public.get_effective_docs_role(p_company_id uuid, p_user_id uuid DEFAULT auth.uid())` függvény, amely a `company_members` táblából oldja fel a felhasználó adott cégbeli `docs_szerepkor` értékét (globális `rendszergazda` kivétellel), és nem engedi a globális `felhasznalo_profil.docs_szerepkor` más cégbe történő átszivárgását.
- **Cég-scoped, zárolt (`FOR UPDATE`) számallokáció:**
  - Az `iktatoszam_allokacio` és `ugyszam_allokacio` táblák elsődleges kulcsa `(company_id, ev, prefix)` lett.
  - Létrejött az `erkeztetoszam_allokacio (company_id, ev, utolso_sorszam)` tábla a korábbi `irat` sorokból visszatöltött csúcsértékekkel.
  - A `generate_iktatoszam(p_ev, p_prefix, p_company_id)`, `generate_ugyszam(p_ev, p_prefix, p_company_id)` és `generate_erkeztetoszam(p_ev, p_company_id)` atomi `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` zárolással és cég-hozzáférés ellenőrzéssel működik.
- **Teljes ABAC és gyermek-tábla RLS védelem:**
  - Az `ugyirat` `SELECT` és `FOR ALL` szabályai egyaránt megkövetelik a `user_has_company_access(company_id)`, `check_ugyirat_user_access(id, auth.uid())` (benne az aktív `helyettesites` és `ugy.felelos_user_id` ággal) és `NOT check_ugyirat_has_unauthorized_irat(id, auth.uid())` feltételeket.
  - A `partner_kapcsolattarto_anon_read` törlésre került; a `partner_kapcsolattarto`, `ugyirat_megjegyzes`, `irat_kapcsolat`, `ugyirat_hozzaferes`, `irat_kolcsonzes_naplo`, `irat_fizikai_hely`, `selejtezes_tetel`, `alkalmazas_ertesites`, `ai_feladat_sor` és `company_filing_rules` (`scope = 'all'` írás csak `admin`/`rendszergazda` számára) táblák cég- és jogosultság-ellenőrzött RLS szabályokat kaptak.
  - A `storage.objects` `irat_files` bucket `SELECT` szabálya a `check_irat_fajl_access(id)` vagy a `selejtezes_csomag.jegyzokonyv_path` cég-hozzáférésére épül, `DELETE` szabály pedig nem ad közvetlen kliensoldali törlési jogot.

### 2.2. UTF-8 PDF Levélgenerátor, Bejövő / AI / SSRF Védelem és Cégműveletek
- **Magyar UTF-8 (`ő, ű, Ő, Ű`) PDF levélgenerálás (`src/utils/pdf-letter-generator.ts`):** A `generateLetterPdfBuffer` regisztrálja a `@pdf-lib/fontkit` modult és beágyazza a `src/assets/fonts/LiberationSans-Regular.ttf` és `LiberationSans-Bold.ttf` betűtípusokat, eltávolítva a korábbi `.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")` csonkolást.
- **Bejövő érkeztetés, AI iktatás és SSRF védelem (`src/app/inbox/eaisybill-actions.ts`, `src/app/inbox/actions.ts`, `src/app/inbox/filing-actions.ts`, `src/app/api/pdf/[id]/route.ts`):**
  - Az `importInvoiceFromEaisyBill` szerveroldalon újra lekéri és ellenőrzi a számlát az `eaisyBill` adatbázisból (beleértve a `melleklet_url` egyezést), `statusz: "erkeztetve"` értékkel hozza létre az `irat` rekordot, és átadja a `p_company_id`-t a `generate_erkeztetoszam` RPC-nek.
  - Minden külső URL-letöltés (`isSafeExternalUrl`) tiltja a `localhost`, `127.0.0.1`, `169.254.169.254`, `10.*`, `192.168.*` és `172.16-31.*` címeket.
  - Az összes bejövő és AI iktató Server Action (`uploadIncomingDocument`, `syncIncomingEmailsAction`, `fileIncomingDocument`, `generateAISuggestions`, `clearAICacheAndRerun`, `getAntecedentSuggestionAction`, `quickAttachToDossier`, `splitAttachmentToNewIncoming`) `requireDocsAuthServer` őrblokkot és `company_id` tulajdonjog-ellenőrzést kapott.
- **Cég- és `eaisyBill` tagimport szigorítások (`src/app/actions/company-actions.ts`, `src/app/actions/eaisybill-user-actions.ts`):** A `deleteCompanyAction` cégtagságot követel meg `rendszergazda` esetén is; az `inviteCompanyMemberAction` nem enged `rendszergazda` globális profil-eszkalációt; a `getEaisyBillCompaniesAction` és `importEaisyBillCompanyAction` ellenőrzi a hívó `eaisyBill`-beli tagságát; az `importEaisyBillCompanyMembersAction` pedig meglévő felhasználónak tájékoztató e-mailt küld jelszó-visszaállító (`recovery`) link helyett.
