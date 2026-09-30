# [Közös] A-015: TOTP Kétlépcsős Azonosítás (2FA) és Session Timeout Házirend

**Status:** Decided  
**Date:** 2026-07-14 (Rögzítve: 2026-09-30)  
**Scope:** [Közös]
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/app/login/mfa-verify/page.tsx`, `src/app/settings/mfa-actions.ts`, `supabase/migrations/20260714235813_add_session_timeout.sql`, `src/utils/supabase/middleware.ts`

---

## 1. Context (Kontextus)
Mivel az eaisyDocs üzleti titkokat és hivatalos dokumentumokat, az eaisyHR pedig személyes adatokat és bérinformációkat tárol, a sima jelszavas belépés nem nyújt elégséges védelmet.
Emellett a nyitva hagyott böngészőablakok (pl. ha a munkatárs elhagyja az íróasztalát) fizikai biztonsági rést képeznek.

---

## 2. Decision (A Meghozott Döntés)
1. **Időalapú Egyedi Jelszavas (TOTP) 2FA Rendszer:**
   - A felhasználók a Google Authenticator vagy egyéb standard TOTP alkalmazással QR-kódon keresztül kétlépcsős azonosítást aktiválhatnak.
   - Szuperadmin és bérszámfejtő szerepkörök esetén a 2FA beállítása kötelezővé tehető a rendszerbeállításokban.
   - Belépéskor a jelszó helyessége után a rendszer a `/login/mfa-verify` képernyőre irányít, és kizárólag érvényes 6 jegyű kód megadása után állítja ki a teljes jogú JWT tokent.
2. **Konfigurálható Session Timeout:**
   - A `rendszer_beallitasok` táblában adminisztrátor által beállítható az inaktivitási időkorlát (pl. 15, 30 vagy 60 perc).
   - A Next.js middleware és a kliensoldali aktivitásfigyelő automatikusan érvényteleníti a munkamenetet inaktivitás esetén, visszairányítva a bejelentkező felületre.

---

## 3. Consequences (Következmények)
* **Pozitív:** Magas szintű védelem jelszószivárgás és illetéktelen fizikai hozzáférés ellen.
