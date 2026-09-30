# [Közös] A-019: Helyettesítési és Jogosultság-Delegálási Szabálymotor

**Status:** Decided  
**Date:** 2026-07-28 (Rögzítve: 2026-09-30)  
**Scope:** `[Közös]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `supabase/migrations/20260719065027_szignalas_kolcsonzes.sql`, `20260728000002_tavollet_helyettesites.sql`, `src/app/settings/substitution-actions.ts`, `src/components/hr/substitute-settings-card.tsx`

---

## 1. Context (Kontextus)
Szabadság, betegség vagy tartós távollét esetén az iratkezelési és jóváhagyási folyamatok (pl. beérkezett számlák iktatása, sürgős határidők felügyelete, havi jelenléti ívek és szabadságok jóváhagyása) nem állhatnak meg.
Ugyanakkor szigorúan tilos, hogy a távollévő kolléga átadja a jelszavát másnak, mert az sértené a hiteles audit naplózás integritását.

---

## 2. Decision (A Meghozott Döntés)
A két modul önállóságának biztosítására két különálló helyettesítési struktúrát valósítottunk meg:

1. **eaisyDocs Iratkezelési Helyettesítés (`helyettesites` tábla):**
   - Mezők: `kilepo_user_id`, `helyettesito_user_id`, `mettol`, `meddig`, `aktiv`.
   - Időintervallum ellenőrzése (`meddig > mettol` CHECK constraint).
   - Az aktív időszakban a kijelölt helyettes hozzáfér a helyettesített munkatársra szignált ügyiratokhoz és feladatokhoz.
2. **eaisyHR Vezetői Helyettesítés (`hr_helyettesites` tábla):**
   - Mezők: `vezeto_id`, `helyettes_id`, `kezdet_datuma`, `veg_datuma`, `aktiv`.
   - Vezetői távollét esetén a kijelölt helyettes megkapja a jóváhagyási jogkört a beosztottak jelenléti íveire, szabadságaira és túlórakérelmeire.
   - Figyelmeztető sáv jelenik meg a felületen (`SubstituteAlertBanner`), ha egy vezető helyettesként jár el.
3. **Audit Naplózás:**
   - Minden elvégzett műveletnél a napló rögzíti, hogy a műveletet a helyettesítő végezte el.

---

## 3. Consequences (Következmények)
* **Pozitív:** Folyamatos üzletmenet; zéró folyamat-elakadás szabadságok alatt is, a jelszómegosztás teljes kiküszöbölésével.
