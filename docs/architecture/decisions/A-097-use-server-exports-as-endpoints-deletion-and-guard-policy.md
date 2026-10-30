# A-097: [Közös] `"use server"` Exportok Mint Nyilvános Végpontok — Halott Action Törlési és Élő Action Guard-Kötelezettség Szabály

**Status:** Decided  
**Date:** 2026-10-30  
**Scope:** `[Közös]`  
**Author:** OpenCode  
**Kapcsolódó:** [eaisydocs-deep-analysis-20261030](../../eaisydocs-deep-analysis-20261030.md) (1.2-es gyökérok), [A-030](./A-030-code-level-security-hardening.md)  
**Kapcsolódó Kód:** `src/app/settings/admin-actions.ts`

---

## 1. Context (Kontextus)

Az eaisyDocs deep-audit (2026-10-30) öt, a felületből nem védett szerver-actiont talált a settings rétegben. Ezek közül a `getGlobalisAuditNaplo` külön eset: a központi audit-átépítés (A-050) óta **egyetlen oldal vagy komponens sem hívja** (háromdimenziós ellenőrzéssel bizonyított: pontos név, részleges név-változatok, valamint a teljes HR-modul és dinamikus importok is nullák), mégis `"use server"` exportként **technikailag hívható végpont** maradt — az alkalmazás JS-csomagjából kinyerhető action-azonosítóval, **hitelesítés nélkül**, SERVICE ROLE kulccsal (RLS megkerülése) az **összes cég** audit-eseményét visszaadva (IP-cím, User-Agent, felhasználónevek, indoklások).

## 2. Decision (A Meghozott Döntés)

1. **Eseti döntés:** a `getGlobalisAuditNaplo` és a hozzá tartozó `AuditFilters` típus **törölve** (commit: `2cee3f9`, külön commitban, hogy `git revert`-tel önállóan visszaállítható legyen). Helyén magyarázó komment maradt.
2. **Általános szabály (a további audit-javítások irányelve):**
   - Minden `"use server"` fájlban exportált függvény **nyilvános végpontnak számít** — a UI-ból való eltávolítás (gomb törlése) NEM vonja vissza a hozzáférést;
   - **Használaton kívüli (dead) action: törlendő**, nem guardolandó;
   - **Élő action: kötelező szerveroldali őrblokk** (hitelesítés → szerepkör → aktív cég-kontextus/`company_id` egyezés), függetlenül attól, hogy a UI elrejti-e a gombját.

## 3. Consequences (Következmények)

**Pozitív:** A támadási felület ténylegesen csökken (nem csak „eltűnik a szem elől"); a szabály a deep-audit fennmaradó guard nélküli action-jeire (settings osztály-/user-kezelés, irattári terv CRUD) egyértelmű eljárást ad.

**Kockázat / Kompromisszum:** A törlés visszafordítható (`git revert 2cee3f9`); a szabály bevezetése azt igényli, hogy a jövőben refaktoráláskor a kivezetett action-exportokat is töröljék, ne csak a hívásaikat.
