# P-130: Bejelentkezési Űrlap UX-CSomag — Gomb-Betöltésállapot, Jelszó-Megjelenítés, Caps Lock Figyelmeztetés és V16 Gradiens-Mosás Háttér

**Status:** Decided  
**Date:** 2026-10-30  
**Scope:** `[Közös]`  
**Category:** Auth / Login & Password Recovery UX  
**Author:** OpenCode  
**Kapcsolódó ADR:** [A-095](../../architecture/decisions/A-095-password-recovery-hungarian-email-and-login-shell-architecture.md), [A-096](../../architecture/decisions/A-096-login-next-redirect-architecture.md)  
**Kapcsolódó Kód:** `src/app/login/login-form.tsx`, `src/app/login/login-shell.tsx`, `src/app/globals.css`  
**Design referenciák:** `docs/design/login-redesign-v2/` (V5–V16 háttér- és márka-variánsok, eaisyDesk-elemekkel)

---

## 1. Question / Problémafelvetés

A P-129-es login-újratervezés után négy napi használati hiány maradt: ① a Bejelentkezés gombra kattintás után nem volt visszajelzés (a felhasználók újrakattintgattak); ② a begépelt jelszó nem volt ellenőrizhető elírásnál; ③ bekapcsolt Caps Locknál vakon próbálkozott az ember; ④ a sima fehér háttér „zord" hatást keltett.

## 2. Decision (A Meghozott Döntés)

### 2.1. Gomb-betöltésállapot (`login-form.tsx`)
Az űrlap kliensoldali komponensbe került (`LoginForm`); a submit gomb `useFormStatus` alapú állapotot kap: kattintás után pörgettyű + „Bejelentkezés…" felirat + `disabled` (dupla beküldés kizárva).

### 2.2. Jelszó-megjelenítés
A jelszómező végén szem ikon váltja a `password`/`text` típust (`aria-label`-lel); az `/auth/set-password` oldalon már meglévő minta logini átvétele.

### 2.3. Caps Lock figyelmeztetés
Gépelés közben `getModifierState("CapsLock")` figyelése a mezőn; bekapcsolt állapotban borostyán „A Caps Lock bekapcsolva" tipp a mező alatt (`role="status"`), fókuszelhagyásra eltűnik.

### 2.4. V16 „gradiens-mosás" háttér (`globals.css`, `.login-shell-bg`)
A `LoginShell` dekorációs rétegei (ragyogás + vonalminta) kiváltásra kerültek egy 4 rétegű, halvány teal/türkiz/kék fénymosásra + alapszín-átmenetre (`background-attachment: fixed`), `.dark` változattal (mély navy-zöld). A kiválasztás 11+ élő HTML-mockup (`docs/design/login-redesign-v2/`) közül történt, a megrendelői teszteléssel; a mockup-folyamat során az eaisyDesk hivatalos elemei (wave-képek, logó, design-tokenek) is be lettek töltve és kiértékelésre kerültek.

## 3. Rationale (Indoklás)

- A belépés a termék napi első érintése — a loading-állapot, a jelszó-ellenőrzés és a Caps Lock-útmutatás a leggyakoribb „hibaérzet" forrásait szünteti meg.
- A V16 gradiens képfüggőség nélkül ad mélységet (nincs letöltés, dark mode azonnal harmonizál), a termékvonal teal identitását megtartva.
