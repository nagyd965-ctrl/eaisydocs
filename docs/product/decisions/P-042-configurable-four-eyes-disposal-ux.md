# [Docs] P-042: Konfigurálható Négyszem-Elv Kezelőfelület és Dinamikus UX

**Status:** Decided  
**Date:** 2026-10-02  
**Scope:** [Docs]  
**Category:** UX / Settings & Archive  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-028](../../architecture/decisions/A-028-configurable-four-eyes-disposal.md)  
**Kapcsolódó BRD:** [BRD-008](../../business/decisions/008-configurable-four-eyes-disposal-and-sme-mode.md)  
**Kapcsolódó Kód:** `src/app/settings/settings-client.tsx`, `src/components/archive-client.tsx`, `src/app/settings/admin-actions.ts`

---

## 1. Context & Felhasználói Igény
A korábbi irattári selejtezési felületen a felhasználók az alábbi problémákkal szembesültek:
- Ha valaki iratkezelőként/vezetőként felterjesztett egy ügyiratot selejtezésre, a jóváhagyandó fülön a jelölőnégyzet szürkén le volt tiltva.
- Kisebb szervezetekben nem volt világos, miért nem engedi a rendszer a selejtezést, és nem volt lehetőség ennek a szabálynak a kikapcsolására.
- Szükségessé vált egy adminisztrátori felület, ahol ez a szabály egyértelmű magyarázattal kapcsolható, és az Irattár nézet vizuálisan visszajelzi az érvényben lévő működési módot.

---

## 2. Product & UX Döntések

### A) Beállítások -> Rendszergazda Fül
- **Kártya elhelyezése:** "Selejtezési Szabályzat & Négyszem-elv (B10)" dedikált Card a Rendszergazda fülön.
- **Interakció:** `Switch` komponens optimista állapotkezeléssel és Sonner toast visszajelzéssel.
- **Vizuális visszajelzés:**
  - Bekapcsolva: "Szigorú audit mód aktív" borostyánsárga badge.
  - Kikapcsolva: "Egyfelhasználós / KKV mód aktív" smaragdzöld badge.
  - Részletes magyarázó szöveg mutatja be mindkét működési mód jogi és technikai hatását.

### B) Irattár -> Jóváhagyandó Fül Kliensoldali Dinamikus Viselkedés
- **Fejléc banner:**
  - Ha a négyszem-elv szigorú: Amber figyelmeztető banner `Szigorú audit mód aktív` címkével.
  - Ha fel van oldva: Emerald információs banner `Négyszem-elv feloldva (Egyfelhasználós mód)` címkével, egyértelművé téve, hogy a vezető a saját felterjesztését is jóváhagyhatja.
- **Jelölőnégyzet viselkedése saját felterjesztésnél:**
  - *Szigorú módban:* A checkbox `disabled`, hover tooltip figyelmeztet a korlátozásra, a státusz badge: `Saját felterjesztés (Zárolva)`.
  - *Egyfelhasználós módban:* A checkbox **aktív és bepipálható**, nincs tiltás! A státusz badge: `Saját felterjesztés (Jóváhagyható)`.
- **Összes kijelölése gomb:**
  - Egyfelhasználós módban a fejléc checkbox a saját felterjesztéseket is bejelöli.
- **Megerősítő dialógus:**
  - A modal címe és leírása dinamikusan alkalmazkodik a kiválasztott működési módhoz, jelölve a jegyzőkönyvi következményeket.

---

## 3. Hatás és Eredmény
A kezelőfelület teljesen transzparens módon kommunikálja a rendszer beállításait, megszünteti a felhasználói frusztrációt, és KKV környezetben zökkenőmentes, egyablakos selejtezési folyamatot biztosít.
