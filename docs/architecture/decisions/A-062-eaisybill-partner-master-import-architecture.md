# ADR A-062: eaisyBill Partnertörzs Importálási Architektúra és Duplikáció-védett Szinkronizáció

- **Státusz:** Elfogadva (Accepted)
- **Dátum:** 2026-10-14
- **Hatókör:** `[Közös]` eaisyDocs & eaisyBill Integráció (Partnerek)
- **Döntéshozók:** Termék- és Rendszerfejlesztési Csapat

---

## 1. Kontextus és Problémafelvetés
Az eaisyBill platformon a vállalkozások számlázási, vevői és szállítói kapcsolattartása egy dedikált partnertörzsben (`partners` tábla) zajlik.
Az eaisyDocs rendszerben az iratkezelés és szerződéskezelés szintén elválaszthatatlan a partnerektől (`partner` tábla: bejövő és kimenő iratok címzettje/feladója, szerződések alanyai).

A felhasználók számára kiemelt nehézséget jelentett, hogy az eaisyBill-ben már gondosan felvitt cégadatokat (név, székhely, adószám, EU adószám, bankszámlaszám, e-mail cím) manuálisan újra be kellett volna gépelniük az eaisyDocs-ban.
A cél az volt, hogy:
1. Az aktív céghez (pl. `SANDBOX`) tartozó teljes eaisyBill partnertörzs egyetlen kattintással elérhető legyen a Partnerek nézetben.
2. A felhasználó szabadon választhasson: importálhat egyetlen kijelölt partnert, több partnert szűrve, vagy akár a komplett partnertörzset egyszerre.
3. Kettős és többszörös duplikáció-védelem biztosítsa, hogy egy már korábban rögzített partner ne jöjjön létre duplán (összevetés `eaisybill_partner_id`, adószám első 8 karaktere, EU adószám, valamint pontos név alapján).
4. Automatikus jogi forma és üzleti szerepkör felderítés működjön az importálás során.

---

## 2. Architektúra és Adatmodell

```mermaid
flowchart TD
    subgraph eaisyBILL["eaisyBill Adatbázis"]
        BC["companies (eaisybill_company_id)"]
        BP["partners (id, name, tax_number, eu_tax_number, partner_type, address, email, bank_account_number)"]
        BC --> BP
    end

    subgraph Service["eaisybill-partner-actions.ts"]
        GP["getEaisyBillPartnersAction(targetCompanyId?)"]
        IP["importEaisyBillPartnersAction({ partnerIds, targetCompanyId })"]
    end

    subgraph eaisyDOCS["eaisyDocs Adatbázis"]
        DC["companies (id, eaisybill_company_id)"]
        DP["partner (id, nev, adoszam, kulfoldi_adoszam, cim, email, bankszamlaszam, szerepkor, tipus, company_id, eaisybill_partner_id)"]
        AUD["esemeny_naplo (entitas_tipus: partner, esemeny_tipus: letrehozas)"]
        DC --> DP
        DP --> AUD
    end

    BP -->|Párhuzamos lekérés & Indexelés| GP
    GP -->|Duplikáció- és létezés-vizsgálat| DP
    IP -->|Validált batch insert| DP
    IP -->|Append-only naplózás| AUD
```

### 2.1 eaisyDocs Adatbázis Mezők
Az eaisyDocs `partner` táblája már tartalmazta a `eaisybill_partner_id UUID REFERENCES eaisybill.partners(id)` mezőt, amely közvetlen idegen kulcsként szolgál az eredeti rekordhoz.

### 2.2 Szerepkör és Jogi Forma Megfeleltetés
- **Szerepkör:**
  - `customer` -> `vevo`
  - `supplier` -> `szallito`
  - `both` -> `mindketto`
- **Jogi forma detektálás (`detectPartnerType`):**
  - Cégformák (`KFT`, `ZRT`, `NYRT`, `BT`, `GMBH`, `LTD`, stb.) -> `ceg`
  - Egyéni vállalkozói jelölések (`E.V.`, `EGYÉNI VÁLLALKOZÓ`) -> `egyeni_vallalkozo`
  - Állami / közigazgatási szervezetek (`MINISZTÉRIUM`, `HIVATAL`, `ÖNKORMÁNYZAT`, `NAV`) -> `intezmeny`
  - Alapértelmezés: `ceg`

### 2.3 Intelligens Adószámosztás
- Belföldi formátumú magyar adószámok (`12345678-x-yy`) az `adoszam` mezőbe kerülnek.
- Külföldi / EU formátumú vagy `FOREIGN:` prefixű azonosítók a `kulfoldi_adoszam` mezőbe kerülnek.

### 2.4 Partner Számlák és Iratforgalom Szinkronizációja (`syncEaisyBillPartnerInvoicesAction`)
A partnerekhez tartozó eaisyBill számlák (`invoices` tábla) automatikusan átemelésre kerülnek az eaisyDocs `irat` és `irat_fajl` tábláiba a következő szigorú szabályok szerint:
1. **Kizárólag PDF melléklettel rendelkező számlák:** Szigorú szűrés `melleklet_url IS NOT NULL` feltételre, megelőzve az üres, megtekinthetetlen tételek létrejöttét.
2. **Irány és Azonosító Különválasztása:**
   - **Bejövő számla (`INBOUND`):** `irany = 'bejovo'`. Hivatalos eaisyDocs érkeztetőszámot kap (`generate_erkeztetoszam` RPC alapján, pl. `E/2026/000142`), a partner a szállító (`kuldo_partner_id`).
   - **Kimenő számla (`OUTBOUND`):** `irany = 'kimeno'`. Az azonosító közvetlenül maga a saját bizonylatsorszám (pl. `NAV-2026-OUT01`), a partner a vevő (`kuldo_partner_id`), kék kimenő jelvénnyel.
3. **Zéró-tárhely Fájlkapcsolat:** Az `irat_fajl` rekord nem duplikálja a fájlt a Supabase Storage-ban, hanem `storage_path = 'eaisybill:' + id` és `kulso_fajl_url = melleklet_url` értékekkel közvetlenül a forrásfájlra hivatkozik, amelyet az eaisyDocs belső biztonsági PDF végpontja (`/api/pdf/[id]`) és a `DocumentViewer` azonnal, vízjellel és eseménynaplózással támogat.
4. **Szerver Komponens Render-Fázis Biztonság:**
   - A Server Component (`page.tsx`) tisztán olvasó (`SELECT`) felelősségű. Tilos benne render közben mutáló háttérszinkront és `revalidatePath`-t hívni (Next.js 15 render invariánsok és versenyhelyzetek elkerülése).
   - A számlák szinkronja a partnerek eaisyBill-ből történő legelső importálásakor automatikusan lefut, illetve az adatlapon a dedikált `PartnerInvoiceSyncButton` gombbal kezdeményezhető.

---

## 3. Duplikáció-védelem Algoritmusa és Adatbázis Integritás
A rendszer többszintű védelemmel garantálja, hogy egyetlen partner és egyetlen külső számla se kerülhessen be többszörösen:
1. **Partner Duplikáció-védelem:**
   - **Explicit ID egyezés:** `partner.eaisybill_partner_id === bp.id`
   - **Adószám törzsszám egyezés:** Az adószám első 8 számjegye pontosan egyezik.
   - **Külföldi / EU adószám egyezés:** Kis- és nagybetű független pontos egyezés.
   - **Partnernév egyezés:** Kis- és nagybetű független, trimmelt névegyezés.
2. **Számla Duplikáció-védelem és RLS Függetlenség:**
   - A meglévő számlák azonosítását a `syncEaisyBillPartnerInvoicesAction` service-role admin klienssel (`adminClient`) végzi, így a szigorú RLS házirendek nem rejthetik el a már létező rekordokat.
   - Beszúrás előtt egyedi atomi ellenőrzés (`doubleCheck`) fut a konkrét `kulso_hivatkozas_id` és `company_id` alapján.
3. **Fizikai PostgreSQL Egyedi Index (`20261014000004_unique_external_invoice_sync.sql`):**
   - Létrehoztunk egy parciális egyedi indexet:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS idx_irat_company_kulso_hivatkozas 
     ON public.irat (company_id, kulso_forras, kulso_hivatkozas_id) 
     WHERE (kulso_hivatkozas_id IS NOT NULL);
     ```
   - Ez adatbázis motor szinten, hardverszintű atomicitással akadályozza meg, hogy párhuzamos lekérések vagy hálózati újrapróbálkozások esetén duplikátum szülessen.

---

## 4. Audit Naplózás és Tranzakciós Integritás
Az importálás és a számlaszinkronizáció lefutásakor az eaisyDocs szabályoknak megfelelően szigorúan **append-only** audit bejegyzés készül az `esemeny_naplo` táblába:
- `entitas_tipus`: `'partner'`
- `esemeny_tipus`: `'letrehozas'` / `'modositas'`
- `indoklas`: `X partner importálva eaisyBill partnertörzsből`, illetve `Y db eaisyBill számla automatikusan szinkronizálva az iratforgalomba`
- `user_id`: A műveletet végző bejelentkezett felhasználó ID-ja.

---

## 5. Kapcsolódó Döntések
- ADR [A-024](./A-024-partner-dual-classification-and-contacts-architecture.md): Partner kettős besorolás és kapcsolattartók
- ADR [A-029](./A-029-global-ui-consistency-and-unified-components.md): Rendszerszintű UI/UX egységesség és kanonikus komponensek
- ADR [A-058](./A-058-eaisybill-company-import-and-sync.md): eaisyBill cégimport és több-bérlős szinkronizáció
- ADR [A-060](./A-060-eaisybill-company-member-sync-and-invite.md): eaisyBill cégalapú tagságszinkronizáció
