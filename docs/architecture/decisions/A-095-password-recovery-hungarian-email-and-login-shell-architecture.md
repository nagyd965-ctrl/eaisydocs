# A-095: [Közös] Jelszó-visszaállítási Architektúra: Supabase Admin Link-generálás, Saját Magyar Brevo E-mail, Éles-domain Linkelés és a Login Héj

**Status:** Decided  
**Date:** 2026-10-29  
**Scope:** `[Közös]`  
**Author:** OpenCode  
**Kapcsolódó PRD:** [P-129](../../product/decisions/P-129-login-redesign-and-password-recovery-ux.md)  
**Kapcsolódó Kód:** `src/app/login/actions.ts`, `src/app/login/forgot-password/page.tsx`, `src/app/login/login-shell.tsx`, `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/auth/set-password/page.tsx`, `src/components/layout-wrapper.tsx`

---

## 1. Context (Kontextus)

A `/login` oldalaldalkalmazás jelszó-visszaállítási folyamata hiányzott, és a Supabase beépített megoldásának (`resetPasswordForEmail`) több gyakorlati akadánya van:

1. **Angol nyelvű sablon**: a beépített visszaállító e-mail a Supabase dashboardon szerkeszthető csak, és nem része a kódbázisnak.
2. **Supabase SMTP limit**: a beépített e-mail szolgáltatás élesben ~4 levél/órára korlátozott — a projekt minden más rendszerlevelét már a **Brevo** API-n (`src/utils/mailer.ts`) keresztül küldi `ertesites_naplo` audit naplózással.
3. **PKCE-ütközés az `action_link`-nél**: az `admin.generateLink` által visszaadott `action_link` a Supabase `/auth/v1/verify` végpontjára mutat. PKCE-flow-t használó projektben (mint ez) az admin-generálta linkhez nem tartozik `code_challenge`, ezért a verify **`otp_expired` / „Email link is invalid or has expired"` hibával** elutasítja a tokent, és `#error=...` fragmenttel (szerveroldalul láthatatlanul) irányít vissza.
4. **localhost linkek e-mailben**: fejlesztői környezetből küldött visszaállító linkek `http://localhost:3000`-re mutattak, ami a címzettnél soha nem nyílik meg. A toborzásnál ugyanez a probléma korábban a `getBaseUrl()` bevezetésével oldódott meg (interjú-e-mailek).
5. **Layout-törés a `/login/*` alútvonalakon**: a `LayoutWrapper` publikus (sidebar nélküli) elrendezése pontos egyezéssel (`pathname === "/login"`) döntött, ezért a `/login/mfa-verify` és az új `/login/forgot-password` oldal sidebaros alkalmazás-layoutba került volna (felvillanás + téves kontextus).

## 2. Decision (A Meghozott Döntés)

### 2.1. Link-generálás e-mail küldése nélkül + saját callback átadás
- A `requestPasswordReset` server action a **service role kulccsal** hívja az `admin.generateLink({ type: "recovery" })` hívást — ez KIZÁRÓLAG a tokent generálja, e-mailt NEM küld.
- Az e-mailben nem a visszaadott `action_link` kerül elküldésre (PKCE-ütközés!), hanem a **`properties.hashed_token` a SAJÁT `/auth/callback` végpontnak adódik át query paraméterben**:
  `{baseUrl}/auth/callback?next=/auth/set-password&token_hash=...&type=recovery`
- A callback meglévő `verifyOtp({ type, token_hash })` ága szerveroldalon létesíti a sessiont, majd a `next` paraméternek megfelelően a `/auth/set-password` oldalra irányít — ez a Supabase SSR dokumentált e-mail-link mintája, PKCE-től függetlenül működik.

### 2.2. Magyar e-mail a meglévő Brevo-csatornán
- A levelet a `buildHtmlEmail` (a rendszer összes értesítő levelének egységes, teal fejléces + gombos sablonja) és a `sendNotificationEmail` küldi: feladó „eaisy Rendszer", tárgy „Jelszó visszaállítása — eaisy", címzett-sor + CTA gomb.
- Ezzel a kiküldés bekerül az **`ertesites_naplo` audit naplóba** (Kiküldési Napló), és nem terheli a Supabase SMTP-limitet.

### 2.3. Linkek mindig éles domainre
- A visszaállító link originje a `getBaseUrl()` (`src/utils/url.ts`) — localhoston/127.0.0.1-en a **production Vercel domainre** esik vissza, élesben a saját domainjét adja. Így a fejlesztői környezetből küldött levelek is működnek a címzettnél (a lokális dev ugyanazt a Supabase adatbázist használja, ezért az éles oldalon beállított jelszó lokálisan is érvényes).

### 2.4. Biztonsági szabályok
- **Enumeration-védelem**: nem létező e-mail cím esetén is ugyanaz az általános sikerüzenet jelenik meg; a hiba csak szerveroldali logba kerül.
- Az egyszer használatos, időkorlátos token miatti kudarcot a callback a `type=recovery` ágon **érthető magyar üzenettel** az `/login/forgot-password` oldalra irányítja (a korábbi generikus „Nem sikerült az egyszeri bejelentkezés" helyett).
- A `next` paraméter validálása (open-redirect védelem) változatlanul a callbackben marad.

### 2.5. Login héj komponens és layout-javítás
- Új `LoginShell` + `EaisyLogo` komponensek (`src/app/login/login-shell.tsx`): a bejelentkezés-család oldalainak (login, forgot-password) közös, középre zárt elrendezése dekoratív teal ragyogással és vonalmintával — Tailwind design-tokenekkel, így sötét módban automatikusan alkalmazkodik.
- A `LayoutWrapper` publikus útvonal-mintázata **`startsWith("/login")`** lett (három helyen), ezzel a `/login/forgot-password` ÉS a régóta latens `/login/mfa-verify` hiba is javítva (sidebar és session-timeout lekérés most már helyesen kezel minden login-aloldalt).
- A meglévő `/auth/set-password` oldal (eredetileg onboarding-aktivációhoz készült) **újrahasznosítva** a jelszó-visszaállításhoz: platform-logóra és semleges szövegre hangolva — a két flow (belépés-aktiváció / jelszó-visszaállítás) ugyanazt az oldalt használja.

## 3. Consequences (Következmények)

**Pozitív:**
- A jelszó-visszaállítás teljes láncja (link, e-mail, oldalak) kódszinten, magyarul, a cég designjával működik — dashboard-beállítás nélkül.
- Nincs Supabase SMTP-függőség; minden kiküldés audited és a meglévő Brevo kvótán megy.
- Fejlesztői teszt is éles linkkel történik, tehát azt mutatja, amit a felhasználó lát.

**Kockázat / Kompromisszum:**
- Az egyszer-használatos linket **levélező-kliens előre-letöltése (prefetch)** elhasználhatja a tényleges kattintás előtt („otp_expired"). Ha ez élesben rendszeressé válna, a következő lépcső egy „Folytatás" köztes oldal (POST-alapú verify), ami ellenáll a prefetchnek.
- A `generateLink` service role kulcsot használ — az action a meglévő szerveroldali védelmi konvenciók szerint fut ( csak bejelentkezés nélküli, nyilvános endpoint; a kulcs nem exposure-ölődik).
- Az e-mail gombjában a `hashed_token` látható (a link kényelmi tokent hordoz) — ez a standard Supabase e-mail-link modell, a HTTPS-en belül biztonságos.
