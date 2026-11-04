# BRD-013: [Közös] / [Docs] / [HR] 5-Szintű Audit Üzleti, Munkajogi és Megfelelőségi Szabályok (Áthelyezett Munkanapok, Munkanap-Alapú Bérszámfejtési Szabadság, Vállalati Szabályzat Letöltés és Moduláris Szeparáció)

**Status:** Decided  
**Date:** 2026-11-04  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Category:** `Labor Law Compliance, Payroll Calculation & Modular Governance`  
**Kapcsolódó ADR:** [A-114](../../architecture/decisions/A-114-unified-5-level-security-rls-and-cross-module-hardening.md)  
**Kapcsolódó PRD:** [P-143](../../product/decisions/P-143-unified-5-level-audit-remediation-and-permission-ux-sync.md)  
**Kapcsolódó Audit Terv:** [`docs/egyesitett-audit-es-javitasi-terv-20261104.md`](../../egyesitett-audit-es-javitasi-terv-20261104.md)

---

## 1. Üzleti Kontextus

Az 5-szintű rendszeraudit ([`docs/egyesitett-audit-es-javitasi-terv-20261104.md`](../../egyesitett-audit-es-javitasi-terv-20261104.md)) során azonosított munkajogi, bérszámfejtési és adatvédelmi szabályok pontosítása.

## 2. Véglegesített Üzleti Szabályok

1. **Áthelyezett munkanapok (`athelye_munkanap`) megkülönböztetése a munkaszüneti napoktól (`src/app/hr/compliance/compliance-actions.ts`):**
   - A magyar munkajogi szabályozás szerint a miniszteri rendeletben kijelölt ledolgozós szombatok (`athelye_munkanap = true`) rendes munkanapnak minősülnek, ezért a munkaidő-megfelelőségi ellenőrzés (`runWorkTimeComplianceCheck`) kizárólag a tényleges munkaszüneti napokon (`athelye_munkanap = false`) végzett munkát jelölheti ünnepnapi munkavégzésként.
2. **Munkanap-alapú szabadság-elszámolás a bérszámfejtési riportban (`src/app/hr/reports/actions.ts`):**
   - A bérszámfejtési riportban (`getPayrollReportData`) a tárgyhavi szabadságnapok számát a `munkanapok_szama` (vagy több hónapon átnyúló távollét esetén az adott hónapra eső munkanapok, nem pedig a hétvégéket is tartalmazó naptári napok) alapján kell elszámolni.
3. **Lezárt KPI-értékelések módosíthatatlansága (`src/app/hr/performance/actions.ts`):**
   - A már `"lezart"` státuszú vagy `ertekeles_lezarva_datum` értékkel rendelkező teljesítményértékelési célok (`hr_teljesitmeny`) előrehaladása és önértékelése utólag nem írható felül.
4. **Vállalati szabályzatok (`hr_ceges_dokumentum`) dolgozói hozzáférése és auditálása (`src/app/api/hr/download-document/route.ts`):**
   - A vállalat saját munkavállalói jogosultak a cégükhöz tartozó kötelező vállalati szabályzatok letöltésére, és minden dokumentumletöltés kötelezően naplózásra kerül a `hr_esemeny_naplo` táblában.
5. **Szigorú termék- és modulszeparáció (`elerheto_modulok` — `docs` vs `hr`):**
   - Egy kizárólag `eaisyDocs` előfizetéssel/jogosultsággal (`elerheto_modulok = ['docs']`) rendelkező felhasználó (még céges `owner`/`admin` szerepkörben sem) férhet hozzá az `eaisyHR` adatokhoz, és fordítva: egy kizárólag `eaisyHR` jogosultsággal (`elerheto_modulok = ['hr']`) rendelkező felhasználó sem kaphat `eaisyDocs` jogosultságot.
