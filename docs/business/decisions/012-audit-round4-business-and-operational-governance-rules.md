# BRD-012: [Közös] / [Docs]: 4–5. Körös Audit Üzleti, Jogi Hitelességi és Üzemeltetési Szabályok (Iktatási Egyediség, eaisyBill Adószám-Párosítás, Többcéges Felhasználó-Eltávolítás és Megtartott Üzleti Szabályok)

**Status:** Decided  
**Date:** 2026-11-03  
**Scope:** `[Közös]` `[Docs]`  
**Category:** `Compliance, Multi-Tenancy & Operational Governance`  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-108](../../architecture/decisions/A-108-docs-hr-audit-separation-vector-noise-suppression-and-round4-pkg1-guards.md), [A-109](../../architecture/decisions/A-109-docs-round4-packages-2-to-7-filing-atomicity-unique-constraints-and-notification-isolation.md)  
**Kapcsolódó PRD:** [P-137](../../product/decisions/P-137-docs-central-audit-structured-diff-modal-and-module-isolation-ux.md), [P-138](../../product/decisions/P-138-docs-module-scoped-notification-bell-atomic-filing-and-share-token-ttl-ux.md)

---

## 1. Üzleti és Jogi Háttér

A 2026. november 2–3-i 4. és 5. körös rendszerszintű audit ([eaisydocs-javitasijegyek-20261102.md](../../develop/eaisydocs-javitasijegyek-20261102.md)) során az iratkezelési jogszabályi megfelelőség (335/2005. (XII. 29.) Korm. rendelet, 27/2015. (V. 27.) KIM rendelet), a többcéges (multi-tenant) adatvédelem és az üzleti folyamatok kapcsán véglegesítettük az alábbi kötelező üzleti szabályokat.

---

## 2. Meghozott Üzleti Szabályok

### 2.1. Érkeztetőszám és Alszám jogi egyedisége, kamu sorszámok tilalma (`J-21`, `J-22`, `J-23`)
- **Szabály:** Egy vállalaton (`company_id`) belül két irat soha nem kaphat azonos érkeztetőszámot (`irat_company_erkeztetoszam_key`), és egy ügyiraton (`ugyirat_id`) belül két irat soha nem kaphat azonos alszámot (`irat_ugyirat_alszam_key`).
- **Kamu sorszámok tilalma:** Ha az adatbázis sorszámkiosztó (`generate_erkeztetoszam`) bármilyen okból hibát jelez, a rendszernek tilos véletlenszám-alapú (`Math.random()`, `E/ERR-`) ideiglenes érkeztetőszámot generálnia; a műveletet szabályos hibaüzenettel vissza kell utasítani.

### 2.2. eaisyBill számla- és partner-import szigorú adószám-kötése (`J-1`, `J-2`, `J-191`)
- **Szabály:** Külső `eaisyBill` számlák és partnerek importálása csak akkor engedélyezett, ha az aktív `eaisyDocs` vállalat rendelkezik igazolt `eaisybill_company_id` összekötéssel.
- Automatikus cég-összerendelésnél tilos a cégnév alapú (`ilike`) párosítás; kizárólag az adószám 8 jegyű törzsszámának és — teljes (10–11 jegyű) magyar adószám esetén — a teljes adószámnak az egyezése fogadható el.

### 2.3. Többcéges felhasználó eltávolítása vs. végleges fióktörlés (`J-7`)
- **Szabály:** Ha egy vállalati adminisztrátor töröl egy felhasználót az aktív cégből (`deleteUser`), és a felhasználó egy másik vállalatnak is tagja a platformon (`otherMemberships.length > 0`), a rendszer **kizárólag az aktív cégből választja le** (`company_members` rekord törlése), de nem semmisíti meg a felhasználó globális Auth-fiókját és profilját. A műveletet minden esetben rögzíteni kell az `esemeny_naplo` táblában.

### 2.4. Cég-specifikus „Négy szem elve” selejtezésnél (`J-9`)
- **Szabály:** A `negy_szem_elve_selejtezesnel:<company_id>` beállítást kizárólag az adott vállalatban `admin` vagy `rendszergazda` szerepkörrel rendelkező felhasználó módosíthatja (másik cégben szerzett admin-jogosultsággal nem).

### 2.5. Megrendelő által kifejezetten jóváhagyott és lezárt üzleti döntések (`J-3`, `J-20`, `J-34`, `16.3`, `18. pont`)
1. **eaisyBill céglista új cég felvételekor (`J-3`):** Az *„Új cég hozzáadása -> eaisyBill import”* ablakban a `getEaisyBillCompaniesAction` szándékosan listázza az összes elérhető eaisyBill céget a gyors kiválasztáshoz.
2. **Alszámos vagy expediált kimenő irat törlésének tilalma (`J-34 / 9.1`):** Ha egy kimenő irat már kapott alszámot (`irat.alszam`) vagy expediálásra került (`kezbesites_statusz === "expedialva"`), a közvetlen törlés (`deleteOutgoingDocument`) jogi okból tilos; helyette sztornózást/mellőzést kell alkalmazni.
3. **Napi egyszeri cron ütemezés (`J-20`):** A `vercel.json` napi egyszeri (`"0 6 * * *"`) ütemezése a Vercel Free/Hobby csomag korlátja miatt tudatos üzemeltetési döntés.
4. **PDF forgatás-érzékelés (`16.3 részpont`) és Fizikai szkenner hotfolder (`18. pont / J-5`):** A PDF-megjelenítő tájolás-érzékelése változatlan marad; a fizikai szkenner mappa (`scanner_hotfolder`) pedig fizikai hálózati szkenner bekötéséig kikapcsolva/félretéve marad.
