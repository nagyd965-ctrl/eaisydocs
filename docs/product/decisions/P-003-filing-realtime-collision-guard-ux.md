# [Docs] P-003: Iktatási Realtime Párhuzamossági Ütközésvédelem és Toast

**Status:** Decided  
**Date:** 2026-09-29  
**Scope:** [Docs]
**Category:** Inbox / Filing  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/components/filing-panel-client.tsx`, `src/app/inbox/filing-actions.ts`

---

## 1. Question / Problémafelvetés
Ha két iratkezelő egyszerre nyitja meg ugyanazt a beérkezett küldeményt az iktatási panelen, el kell kerülni, hogy mindketten eliktassák és duplikált iktatószám jöjjön létre.
A Supabase Realtime feliratkozás értesíti a klienst, ha az irat `ugyirat_id` mezője kitöltésre került.
**A hiba:** Amikor az aktív felhasználó rákattintott a mentés gombra, az adatbázis azonnal triggerelte a Realtime eseményt, amit a saját kliense úgy értelmezett, mintha *egy másik kolléga* iktatta volna el az iratot az orra elől, és hibaablakkal leblokkolta a felületet.

---

## 2. Decision (A Meghozott Döntés)
1. **`isSubmittingRef` Állapotjelző:**
   - A beküldési folyamat kezdetekor (`handleSubmit`) egy szinkron `isSubmittingRef.current = true` jelzőt állítunk be.
   - A Realtime eseményfigyelő megvizsgálja: ha `isSubmittingRef.current` igaz, akkor az esemény a saját beküldésünkből származik, ezért figyelmen kívül hagyja és nem dob ütközési figyelmeztetést.
   - Hiba esetén a jelző visszaáll `false`-ra.
2. **Sikeres Iktatás Visszajelzés:**
   - A mentés sikere után azonnali `toast.success("Dokumentum sikeresen iktatva!")` jelenik meg, majd a rendszer automatikusan visszairányítja a felhasználót a bejövő postafiókhoz (`/inbox`).

---

## 3. Rationale (Indoklás)
Megszünteti a hamis pozitív ütközési hibákat, miközben fenntartja a valódi párhuzamossági védelmet más felhasználókkal szemben.
