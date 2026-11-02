# P-133: Egységes Háromcsatornás (`Rendszeren belül` / `E-mail` / `SMS`) Értesítési Szabályok és Fix Szélességű Státusz-kapcsoló UX (`eaisyDocs` & `eaisyHR`)

**Status:** Decided  
**Date:** 2026-11-02  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Category:** `Settings / Notifications UX`  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-104](../../architecture/decisions/A-104-unified-multi-channel-notification-dispatchers-and-package1-docs-fixes.md)  
**Kapcsolódó Kód:** `src/app/settings/notification-settings.tsx`, `src/app/settings/page.tsx`, `src/app/hr/settings/notification-settings.tsx`, `src/app/hr/settings/page.tsx`

---

## 1. Question / Problémafelvetés

1. Az `eaisyDocs` `Beállítások -> Értesítések` felületén korábban csak 6 értesítési szabály jelent meg (miközben a rendszerben további 5 értesítési esemény működött bedrótozva), és csak az `E-mail` és `SMS` csatorna volt kiválasztható — a `Rendszeren belül` (`in_app`) kapcsoló hiányzott.
2. Az `eaisyHR` `Beállítások -> Értesítések` felületén 7 szabály jelent meg, miközben 3 gyakori munkafolyamat-értesítés (szabadság/túlóra elbírálás, jelenlét-korrekció benyújtás és elbírálás) nem volt konfigurálható a listában.
3. Amikor egy szabály `Aktív` és `Kikapcsolva` állapotban volt a listában, a `Kikapcsolva` felirat hosszabb szélessége miatt a tőle balra elhelyezkedő csatorna-gombok (`Rendszeren belül`, `E-mail`, `SMS`) vízszintesen elcsúsztak az `Aktív` sorokhoz képest.

---

## 2. Decision (A Meghozott Döntés)

1. **Háromcsatornás Pill-kapcsolók Minden Szabályon (`eaisyDocs` és `eaisyHR`):**
   - Mindkét modul értesítési beállításainál egységesen három kerekített pill-gomb (`Rendszeren belül` `Monitor` ikonnal, `E-mail` `Mail` ikonnal, `SMS` `MessageSquare` ikonnal) jelenik meg minden szabály sorában.
2. **Teljes Értesítési Katalógus Megjelenítése:**
   - **`eaisyDocs` (`/settings -> Értesítések` — 11 szabály):**
     - *Határidő közeledik* (Felelős ügyintéző)
     - *Határidő lejárt* (Felelős ügyintéző)
     - *Határidő lejárt* (Vezető / Admin)
     - *Új ügyirat szignálva* (Felelős ügyintéző)
     - *Állapotváltozás (pl. Selejtezés)* (Vezető / Admin)
     - *Megőrzési idő lejárt* (Iratkezelő)
     - *Új bejövő irat érkezett (E-mail / IMAP)* (Iratkezelő)
     - *Új részfeladat szignálva* (Felelős ügyintéző)
     - *Megemlítés (@név) megjegyzésben* (Érintett munkatárs)
     - *Explicit ügyirat-hozzáférés megadása* (Érintett munkatárs)
     - *Mentett keresés találat-riasztás* (Érintett munkatárs)
   - **`eaisyHR` (`/hr/settings -> Értesítések` — 10 szabály):**
     - *Határozott idejű szerződés lejárata* (HR, Vezető)
     - *Orvosi vizsgálat lejárata* (HR, Érintett)
     - *Próbaidő lejárata* (HR, Vezető)
     - *T1041 Bejelentési figyelmeztetés* (HR, Admin)
     - *Tanulmányi szerződés lejárata* (HR, Érintett)
     - *Teljesítményértékelés határidők* (Érintett, Vezető)
     - *Távollét / Szabadság / Túlóra kérelem benyújtása* (Közvetlen Vezető)
     - *Távollét / Túlóra kérelem elbírálása (Jóváhagyás / Elutasítás)* (Érintett)
     - *Új munkaidő / jelenlét korrekciós kérelem* (Közvetlen Vezető)
     - *Munkaidő / jelenlét korrekció elbírálása (Jóváhagyás / Elutasítás)* (Érintett)
3. **Fix Szélességű `Aktív` / `Inaktív` Státusz-oszlop:**
   - A `Kikapcsolva` feliratot `Inaktív`-ra cseréltük, a szöveges címkét fix `w-12 text-right`, a kapcsoló-konténert pedig `w-[96px] shrink-0 justify-end` osztályokkal láttuk el. Így az `Aktív` és `Inaktív` sorokban a csatorna-gombok pixelre pontosan egy függőleges oszlopban maradnak.

---

## 3. Rationale (Indoklás)

A felhasználók és vállalati adminisztrátorok egyetlen központi táblázatban, vizuális ugrálás nélkül láthatják és szabályozhatják a rendszer összes értesítését mindhárom kézbesítési csatornán (`Rendszeren belül`, `E-mail`, `SMS`), miközben az `eaisyDocs` és `eaisyHR` beállítási felületei teljesen egységes UX mintát követnek.
