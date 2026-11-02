# P-136 [Docs]: Magyar UTF-8 (`ő, ű, Ő, Ű`) Hivatalos PDF Levélgenerálás, Cégenkénti Iktató-/Érkeztetőszám Tartományok és Biztonságos eaisyBill Számlaérkeztetés

- **Státusz:** Elfogadva és Implementálva
- **Dátum:** 2026-11-02
- **Hatókör:** `[Docs]`
- **Kapcsolódó döntések:** [A-107](../../architecture/decisions/A-107-docs-rls-child-tables-storage-company-allocation-and-package4-hardening.md), [P-134](./P-134-docs-multicompany-search-inbox-filing-and-contract-template-isolation-ux.md), [P-135](./P-135-docs-role-scoped-action-protection-disposal-protocol-and-snippet-xss-safety.md)

## 1. Felhasználói és Üzleti Cél

Az `eaisyDocs` 4. csomagjának célja, hogy:
1. A kimenő hivatalos válaszlevelek PDF dokumentumaiban a magyar hosszú umlautos karakterek (`ő, ű, Ő, Ű`) tökéletesen, karaktervesztés nélkül jelenjenek meg.
2. Több-céges használat során minden vállalat saját, 1-től induló, hézagmentes (`gap-free`) érkeztetőszám (`E/ÉV/00001`), ügyszám és iktatószám tartománnyal rendelkezzen.
3. Az `eaisyBill` rendszerből egykattintással érkeztetett számlák azonnal megjelenjenek az `Érkeztetés` (`/inbox`) munkalistában (`statusz: "erkeztetve"`), hitelesített melléklettel.
4. A helyettesítéssel (`helyettesites`) megbízott munkatársak és az ügyek felelősei (`ugy.felelos_user_id`) zökkenőmentesen hozzáférjenek a rájuk bízott ügyiratokhoz, miközben a magasabb minősítésű iratot tartalmazó dossziék szigorúan védettek maradnak.

## 2. Megvalósított Funkcionális és UX Változások

### 2.1. Hivatalos PDF Levélgenerátor (`LiberationSans` UTF-8 beágyazás)
- Az Ügyirat részletező (`/dossiers/[id]`) oldalon az AI Válaszlevél Varázslóval vagy sablonból generált kimenő PDF levelek (`src/utils/pdf-letter-generator.ts`) mostantól beágyazott `LiberationSans-Regular` és `LiberationSans-Bold` TTF betűtípussal készülnek.
- A tárgyban, címzettben, keltezésben és levéltörzsben szereplő `ő, ű, Ő, Ű` karakterek teljes értékűen megjelennek a generált és kiküldött PDF-ben.

### 2.2. Cégenkénti Független Érkeztető-, Ügy- és Iktatószám Számlálók
- Minden vállalat (`company_id`) önálló sorszámtartományt kap az `erkeztetoszam_allokacio`, `ugyszam_allokacio` és `iktatoszam_allokacio` táblákban.
- Egy új vállalat felvételekor vagy váltásakor az érkeztetőszámok, ügyszámok és iktatószámok nem keverednek más cégek sorszámaival.

### 2.3. `eaisyBill` Számlaérkeztetés és Meglévő Tagok Cégimportja
- Az `eaisyBill` számla-szinkronizációs modálból érkeztetett számlák `statusz: "erkeztetve"` állapottal jönnek létre, így azonnal láthatók és iktathatók az `/inbox` felületen.
- Ha az `eaisyBill` tagimport során egy munkatárs már rendelkezik aktív `eaisyDocs` fiókkal, a rendszer jelszó-visszaállító link helyett közvetlen belépési értesítőt küld számára az új vállalathoz való hozzáférésről.
