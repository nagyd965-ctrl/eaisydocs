# P-052 [HR]: Egységes Vezetői Jóváhagyási Központ és Jelenléti Korrekció UX

**Státusz:** Elfogadva  
**Dátum:** 2026-10-07  
**Döntéshozó:** Vezető Rendszertervező & HR Szakértő  
**Hatókör:** [HR] eaisyHR – Vezetői Jóváhagyások és Jelenléti Ív  
**Kapcsolódó ADR:** [A-033](../../architecture/decisions/A-033-unified-approvals-architecture-and-attendance-correction-security.md)  
**Kapcsolódó PRD-k:** [P-011](P-011-hr-timesheet-attendance-and-leave-calendar-ux.md), [P-023](P-023-hr-manager-approvals-and-team-dashboard-ux.md), [P-043](P-043-global-ui-consistency-and-unified-components.md), [P-051](P-051-overtime-comp-time-and-payout-workflow.md)

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR rendszerben a dolgozók által benyújtott kérelmek három független kategóriába tartoztak:
1. **Távolléti kérelmek:** Szabadság, betegszabadság, fizetett/fizetetlen távollétek (`hr_tavollet`).
2. **Munkaidő korrekciók:** Elfelejtett be-/kicsekkolás vagy hibás időpont utólagos korrekciója (`hr_jelenlet_korrekcio`).
3. **Túlóra felhasználás:** Időarányos csúsztatás (pihenőidő) vagy pénzbeli kifizetés (`hr_tulora_felhasznalás`).

### Korábbi UX Defektek:
- **Széttöredezett felület a Vezetői Nézetben (`/hr/manager`):** A rendes szabadságkérelmek a képernyő tetején jelentek meg, míg az újonnan bevezetett munkaidő korrekciók és a túlóra jóváhagyások a hatalmas havi csapatnaptár alá voltak szórva különálló kis dobozokban. Ez szétverte a frontend oldalszerkezetét, hosszú görgetést igényelt, és a vezetők gyakran figyelmen kívül hagyták a naptár alá rekedt kérelmeket.
- **Hamis fejléc statisztika:** A fejlécben lévő „függő kérelem” számláló kizárólag a távolléteket vette figyelembe, a munkaidő korrekciókat és a túlórát nem.
- **Láthatatlan kérelmi állapot a Jelenléti Íven:** A dolgozói profil *Jelenlét* fülén a korrekció alatt lévő munkanapok sima üres munkanapként jelentek meg, a dolgozó és a vezető sem kapott semmilyen vizuális visszajelzést arról, hogy az adott napra módosítási kérelem van folyamatban (pl. 08:00 – 15:30).

---

## 2. Termékdöntések és Felhasználói Élmény (UX)

### 2.1. Egységes Vezetői Jóváhagyási Központ (`UnifiedApprovalsPanel`)
A széttagolt panelek helyett egyetlen, kiemelt Linear-flat kártya került a csapatnaptár fölé a `/hr/manager` oldalon:
- **Kategória Szűrőfülek:**
  - `Összes (N)` – A csapat összes jóváhagyandó feladata egyben.
  - `Távollét (N)` – Csak a szabadságok és távollétek.
  - `Munkaidő (N)` – Csak az érkezési/távozási korrekciók.
  - `Túlóra (N)` – Csak a csúsztatási és kifizetési kérelmek.
- **Kompakt Kártya Információk:**
  - Dolgozó monogramos avatarja és teljes neve.
  - Beküldés dátuma és szemantikus típusjelvény (`Szabadság`, `Betegszabadság`, `Munkaidő korrekció`, `Túlóra • Kifizetés`, `Túlóra • Csúsztatás`).
  - Strukturált paraméterek:
    - Távollét: kezdet és vég dátuma + munkanapok száma.
    - Korrekció: dátum + *Eredeti: 09:00 – 17:00 (vagy Hiányzó jelenlét) ➔ Kért: 08:00 – 15:30*.
    - Túlóra: óraszám/percek + mód megnevezése.
  - Dolgozói indoklás idézet formájában (`„Utolsó munkanapom”`).
- **Egységes Akciógombok:**
  - `[ ✕ Elutasít ]`: Opcionális elutasítási indoklást kérő modált nyit meg, amit a rendszer elment és a dolgozó in-app értesítésben is kézhez kap.
  - `[ ✓ Jóváhagy ]`: Egyetlen kattintással érvényesíti az adatot, azonnal eltávolítja a listából és frissíti a naptárat.

### 2.2. Jelenléti Ív Vizuális Visszajelzés (`AttendanceTab`)
A havi jelenléti íven a dolgozó és a HR szakember pontosan látja a folyamatban lévő kérelmeket:
- **Típus mező:** Sárga `Korrekció bírálat alatt` jelvény, alatta kért idősáv kiemelés: `Kért idő: 08:00 – 15:30 („indoklás”)`.
- **Becsekkolás / Kicsekkolás mezők:** Meleg tónusú kért időpontok: `(08:00)` és `(15:30)` (módosítás esetén `09:00 ➔ 08:00`).
- **Sorkiemelés:** Enyhe meleg háttérszín (`bg-amber-500/[0.04]`), jelezve a lezáratlan adminisztratív állapotot.

---

## 3. Hatás és Megtérülés
- **100%-os átláthatóság:** A vezetők egyetlen felületen, rendezetten láthatnak minden elbírálandó tételt.
- **Nulla görgetési veszteség:** A csapatnaptár alá semmi sem szorul be, a layout stabil és kiegyensúlyozott marad.
- **Elégedett dolgozói élmény:** A munkavállaló azonnal látja a jelenléti ívén a benyújtott kérelem állapotát.
