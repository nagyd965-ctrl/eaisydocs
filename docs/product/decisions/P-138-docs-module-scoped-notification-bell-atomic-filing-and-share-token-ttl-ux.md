# P-138: [Közös] / [Docs]: Modul- és Cég-Izolált Értesítési Harang (`NotificationBell`), 10 Karakteres 7 Napos Cégmeghívó Kód és Atomi Iktatási/Selejtezési Visszajelzések UX

**Status:** Decided  
**Date:** 2026-11-03  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Category:** `Header Notification Bell, Inbox Filing, Archive Disposal & Company Invitation UX`  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-109](../../architecture/decisions/A-109-docs-round4-packages-2-to-7-filing-atomicity-unique-constraints-and-notification-isolation.md)  
**Kapcsolódó BRD:** [BRD-012](../../business/decisions/012-audit-round4-business-and-operational-governance-rules.md)  
**Kapcsolódó Kód:** `src/components/notification-bell.tsx`, `src/utils/docs-notification-dispatcher.ts`, `src/utils/hr-notification-dispatcher.ts`, `src/app/actions/company-actions.ts`, `src/app/inbox/filing-actions.ts`, `src/app/inbox/inbox-dismiss-actions.ts`, `src/app/archive/disposal-actions.ts`, `src/app/dossiers/[id]/lifecycle-export.ts`

---

## 1. Question / Problémafelvetés

1. **Értesítési harang (`NotificationBell`) keveredése cégek és modulok között (`35. pont / J-37`):**
   - Ha egy felhasználó több cégnek is tagja volt, vagy mind az `eaisyDocs`, mind az `eaisyHR` modult használta, a felső fejlécben lévő értesítési harang korábban kizárólag `user_id` alapján kérdezte le az `alkalmazas_ertesites` táblát, és kulcsszavas szövegkereséssel próbálta megtippelni, hogy egy értesítés HR-es vagy iratkezelési-e.
2. **Céges meghívókód (`share_token`) hossza és érvényessége (`34. pont / J-13`):**
   - A 6 karakteres céges csatlakozási kód túl rövid volt és nem rendelkezett lejárati idővel, így egy korábban megosztott kód hónapokkal később is felhasználható maradt.
3. **Párhuzamos iktatás, mellőzés és selejtezés visszajelzései (`26–30. pont`):**
   - Ha két iktató egyszerre kattintott ugyanarra a beérkezett iratra vagy selejtezési csomagra, a rendszer néma felülírást vagy árva ügyiratot hozhatott létre egyértelmű felhasználói visszajelzés nélkül.
4. **Életciklus-igazolás PDF magyar ékezetes megjelenítése (`19. pont / J-30`):**
   - Az ügyirat-adatlapról letölthető hivatalos *Iratkezelési Életciklus Igazolás* PDF-ben a hosszú magyar ékezetes betűk (`ő, ű, Ő, Ű`) helyettesítő karakterré alakultak.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Pontos `company_id` és `modul` (`'docs'` | `'hr'`) szűrés az Értesítési Harangban
- A [`NotificationBell`](../../../src/components/notification-bell.tsx) komponens:
  - Az aktuális útvonalból (`pathname.startsWith("/hr")` -> `'hr'`, egyébként `'docs'`) meghatározza az aktív modult, és adatbázis-szinten `.eq("modul", currentModule)` szűrést alkalmaz.
  - Az aktív vállalat (`activeCompany.id`) alapján `.or(\`company_id.eq.${activeCompany.id},company_id.is.null\`)` szűrést alkalmaz, és az *„Összes olvasottnak jelölése”* (`markAllAsRead`) gombot is kizárólag az aktuális cég és modul értesítéseire hajtja végre.
  - Cégváltáskor vagy modulváltáskor a harang számlálója és listája azonnal újratöltődik.

### 2.2. 10 karakteres, 7 napig érvényes céges meghívókód (`share_token`)
- A Cégbeállításokban generált meghívókód (`generateCompanyShareTokenAction`) **10 karakteres** nagybetűs/számjegyű kód (`A-Z`, `2-9`, összetéveszthető karakterek nélkül), amely a generálástól számított **7 napig** érvényes.
- Lejárt kód beírásakor a csatlakozási ablak egyértelmű magyar hibaüzenetet jelenít meg: *„A meghívókód lejárt (7 nap után új kódot kell kérni a cég adminisztrátorától).”*

### 2.3. Atomi iktatási, mellőzési és selejtezési visszajelzések
- Ha egy beérkező iratot egy másik munkatárs közben már beiktatott vagy mellőzött, a felület nem végez felülírást, hanem tiszta visszajelzést ad (*„Ezt az iratot közben már beiktatták!”* / *„A dokumentum nem található, vagy már iktatva lett, ezért nem mellőzhető.”*).
- Az *Iratkezelési Életciklus Igazolás* PDF (`lifecycle-export.ts`) beágyazott `LiberationSans` UTF-8 betűtípussal készül, így minden magyar ékezetes karakter (`ő, ű, Ő, Ű`) nyomdakészen jelenik meg.

---

## 3. Rationale (Indoklás)

- A valódi adatbázis-oszlopokra (`company_id` és `modul`) épülő harang-szűrés megszünteti a téves kulcsszó-találatokat és garantálja az `AGENTS.md` 5. pontja szerinti moduláris függetlenséget (`eaisyDocs` vs. `eaisyHR`).
- Az atomi állapotellenőrzések és a 10 karakteres, 7 napos meghívókód egyszerre növelik a rendszer jogi hitelességét és a napi ügyintézés biztonságát.
