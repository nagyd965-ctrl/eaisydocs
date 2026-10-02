# [Docs] BRD-008: Konfigurálható Négyszem-Elv és Egyfelhasználós KKV Mód Selejtezésnél

**Status:** Decided  
**Date:** 2026-10-02  
**Scope:** `[Docs]`  
**Category:** Governance & Compliance / System Settings  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-028](../../architecture/decisions/A-028-configurable-four-eyes-disposal.md), [A-001](../../architecture/decisions/A-001-four-eyes-disposal-validation.md)  
**Kapcsolódó PRD:** [P-042](../../product/decisions/P-042-configurable-four-eyes-disposal-ux.md)  
**Kapcsolódó Kód:** `src/app/archive/disposal-actions.ts`, `src/utils/system-settings.ts`, `src/utils/disposal-protocol-pdf.ts`

---

## 1. Üzleti Háttér és Szabályzat

A [BRD-002](002-strict-four-eyes-disposal-governance.md) szabályozás szerint alapesetben a selejtezési javaslatot felterjesztő irattáros munkatárs nem hagyhatja jóvá a saját javaslatát.

A piaci visszajelzések alapján KKV és mikrovállalkozási szegmensben nem minden esetben áll rendelkezésre legalább két különböző jogosultságú személy a selejtezési folyamathoz. Ezért az alábbi üzleti szabályzat lép életbe:

1. **Rendszerszintű Működési Mód:**
   - A rendszergazda a `rendszer_beallitas` táblán keresztül meghatározhatja a szervezet selejtezési szabályzatát (`negy_szem_elve_selejtezesnel`).

2. **Bekapcsolva (Szigorú Audit Mód - Alapértelmezett):**
   - A felterjesztő semmilyen szerepkörben (még adminisztrátorként sem) hagyhatja jóvá a saját javaslatát.
   - Adatbázis RLS és szerveroldali logika is megtagadja a jóváhagyást.

3. **Kikapcsolva (Egyfelhasználós / KKV Mód):**
   - Vezető vagy rendszergazda a saját felterjesztését is jóváhagyhatja.
   - **Audit Elszámoltathatóság:** Nem történhet csendes vagy titkos jóváhagyás:
     - Az `esemeny_naplo` bejegyzés záradékában expliciten rögzíteni kell: `(Egyfelhasználós jóváhagyás - a négyszem-elv feloldva a rendszerbeállítások alapján)`.
     - A kiállított hivatalos Selejtezési Jegyzőkönyv PDF záradéka tanúsítja, hogy az eljárás az egyfelhasználós rend szerint futott le, és az aláírási sávban a jóváhagyói titulus ezt tükrözi.
