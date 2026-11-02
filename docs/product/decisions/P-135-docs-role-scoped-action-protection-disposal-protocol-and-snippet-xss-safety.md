# P-135: [Docs] Cég-Scoped Szerepkör-Védelem (`Betekintő` / `Auditor` Csak Olvasható Mód), Selejtezési Jegyzőkönyv Auditált Letöltése, Kép-Előnézet Naplózása és Biztonságos Keresési Kiemelés UX

- **Dátum:** 2026-11-02
- **Hatókör:** `[Docs]`
- **Kategória:** `Docs / Role-Scoped Permissions, Disposal Protocol Audit & Security UX`
- **Kapcsolódó döntések és fájlok:**
  - [A-106](../../architecture/decisions/A-106-docs-company-scoped-auth-guard-clearance-and-action-hardening.md)
  - `src/utils/docs-auth-guard.ts`
  - `src/app/partners/actions.ts`
  - `src/app/partners/contract-actions.ts`
  - `src/app/dossiers/[id]/actions.ts`
  - `src/app/dossiers/[id]/version-actions.ts`
  - `src/app/dossiers/[id]/template-actions.ts`
  - `src/app/archive/disposal-actions.ts`
  - `src/app/api/pdf/[id]/route.ts`
  - `src/utils/mailer.ts`
  - `src/app/search/search-client.tsx`
  - `src/components/mfa-verify-form.tsx`

## 1. Felhasználói Élmény és Üzleti Követelmények

Az `eaisyDocs` 3. Csomagja (Task 3.1 – 3.5) garantálja, hogy a felhasználói jogosultságok minden képernyőn és műveletnél pontosan az aktív cégben (`company_members`) beállított szerepkört tükrözzék, valamint minden dokumentumművelet teljes körűen naplózott és védett legyen:

1. **Cégszintű szerepkör-izoláció és csak olvasható (`Betekintő` / `Auditor`) védelem:**
   - Ha egy felhasználó az A cégben `Admin`, de a B cégben egyszerű munkatárs vagy `Betekintő`, akkor a B cégre átváltva nem kap adminisztrátori jogokat.
   - `Betekintő` és `Auditor` szerepkörrel sem a Partnerek törzsadatai, sem az AI szerződésgenerátor/sablonok, sem az ügyiratok, feladatok és iratkölcsönzések nem módosíthatók.
2. **Irattár és Selejtezés szabályos munkafolyamata (`/archive`):**
   - Selejtezésre javasolni kizárólag olyan irattári ügyiratot lehet, amelynek a megőrzési ideje (`megorzesi_ido_vege`) már lejárt.
   - A véglegesen `selejtezett` ügyiratok nem állíthatók vissza aktív vagy irattári állapotba.
   - A jóváhagyott selejtezési jegyzőkönyv PDF letöltése jogosultság-ellenőrzött, rövid lejáratú aláírt URL-en keresztül történik, és a letöltés ténye bekerül az Eseménynaplóba (`letoltve`).
3. **Kép- és PDF-előnézet egységes naplózása és biztonságos e-mail kiküldés:**
   - A csatolt képfájlok (`JPG`, `PNG`, `WebP`) és egyéb mellékletek megtekintése a PDF-ekkel azonos módon rögzül az ügyirat Eseménynaplójában (`megtekintve`).
   - Ügyiratból történő e-mailes iratkiküldéskor a rendszer ellenőrzi, hogy a küldő felhasználó rendelkezik-e az irat és az ügyirat minősítési szintjének (`Nyilvános`, `Belső`, `Bizalmas`, `Szigorúan titkos`) megfelelő betekintési joggal.
4. **Biztonságos keresési találat-kiemelés (`/search`) és MFA visszairányítás:**
   - A keresési találatok szöveges kivonatai (`snippet`) kizárólag a keresőkifejezés félkövér (`<b>...</b>`) kiemelését jelenítik meg, minden egyéb HTML-kódot biztonságosan szövegként maszkolnak.
   - Kétfaktoros hitelesítés (`/login/mfa-verify`) után a rendszer kizárólag érvényes belső alkalmazás-útvonalra irányítja tovább a felhasználót.
