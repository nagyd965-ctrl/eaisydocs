# P-080: eaisyHR & eaisyDocs Kommunikációs Identitás és Dolgozói Profil UX Harmonizáció

**Dátum:** 2026-10-14  
**Státusz:** `Decided`  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Kategória:** `HR / Onboarding, Recruitment & Employee 360° UX`  
**Kapcsolódó ADR:** [A-061](../../architecture/decisions/A-061-vercel-serverless-readiness-and-modular-hr-data-sync.md)  
**Érintett képernyők / komponensek:**
- `src/app/hr/employee/[id]/page.tsx`
- `src/app/hr/recruitment/actions.ts`
- `src/app/inbox/page.tsx`
- `src/components/inbox-sync-button.tsx`

---

## 1. Felhasználói Igény és Problémafelvetés
1. **Toborzási és interjúztatási e-mailek elvárt brandingje:** Amikor egy HR munkatárs interjúmeghívót vagy időpont-egyeztetést küld a toborzási kanban tábláról, a pályázó nem kaphat "eaisyDocs" rendszerértesítést, mert a jelentkezési felület és a HR portál az eaisyHR márkanév alatt fut.
2. **Dolgozói profil fül-sáv (TabsList) törése:** A dolgozói 360°-os profilban (`/hr/employee/[id]`) a 9 fül túl nagy paddinggal (`px-6`) és engedélyezett sortöréssel (`flex-wrap`) rendelkezett, ami miatt a legutolsó fül (*"Előzmények"*) egy magányos gombként lecsúszott a második sorba, megtörve a fejlécet.
3. **Natív böngésző görgetőnyilak:** Vízszintes görgetés engedélyezésekor a Windows Chromium natív fel-le léptetőnyilai jelentek meg a fülsor végén.
4. **Élő demó e-mail szinkronizálás:** Az érkeztetési postafiókban (`/inbox`) hiányzott egy közvetlen manuális gomb, amellyel a bemutató során azonnal le lehet kérni a beérkezett leveleket a háttér cron megvárása nélkül.

---

## 2. Megoldás és UX Döntések
1. **Önálló eaisyHR E-mail Arculat:**
   - Az interjú meghívókban a levél fejléce expliciten a zöld sávos **eaisyHR** logót jeleníti meg.
   - A levél feladója: **eaisyHR Toborzás** (`eaisyhr@thinkai.hu`).
   - A láblécben: *"Ezt az üzenetet az eaisyHR rendszer automatikusan generálta."*
2. **Dolgozói Fülek Egysoros, Törésmentes Elrendezése:**
   - A `TabsList` megkapta a `flex-nowrap overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden` stílusokat.
   - A fülek gombjainak paddingja finomhangolva lett (`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap`).
   - Az **"Előzmények"** fül pontosan a sor legvégén, a **"Bizalmas HR adatok"** mögött helyezkedik el egyetlen szabályos sorban.
   - A natív böngészős scroll nyilak teljesen el lettek rejtve.
3. **Azonnali E-mail Szinkron Gomb:**
   - Az `/inbox` fejlécébe bekerült az `InboxSyncButton` zöld szinkronizáló ikonnal és instant toast visszajelzéssel, amely egy kattintással meghívja a `syncEmailsAction`-t.

---

## 3. Verifikáció
- A képernyőképen jelzett lebegő "Előzmények" fül és a fel-le nyilak eltűntek.
- A jelölteknek kiküldött meghívók tisztán eaisyHR néven és e-mail címmel mennek ki.
- Az `/inbox` felületen a szinkronizáció valós időben aktiválható.
