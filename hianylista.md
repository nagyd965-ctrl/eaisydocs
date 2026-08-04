# eaisyHR + eaisyDocs – Összesített Hiánylista

> Forrás: `eaisyhr_gap_analysis.md` + `AGENT_HANDOFF.md`  
> A ~~áthúzott~~ elemek már elkészültek vagy elvetve lettek.

---

## 🔴 KRITIKUS / HIÁNYZÓ

### 1. Értesítések és Automatizmusok
- [ ] **Háttérben futó riasztási logika** – A Szerződés- és T1041-lejárat értesítések UI-ja kész, de a tényleges e-mail-küldő háttérfolyamatok (Edge Function / CRON) **nem futnak**. Az értesítések UI kapcsolói jelenleg nem csinálnak semmit backend oldalon.

### 2. Szervezet és Munkakörök
- [ ] **`EmployeeEditDialog` közvetlen vezető + szervezeti egység választó** – Szerkesztőben nem lehet kiválasztani a közvetlen vezetőt és a szervezeti egységet a szervezeti ábrához.
- [ ] **Munkaköri leírások struktúrája** – A feladatok és hatáskörök jelenleg nincsenek strukturált listában tárolva.
- [ ] **Dolgozói nyugtázás (elektronikus „elolvastam")** – Amikor a dolgozó a portálon lekattintja, hogy megismerte munkaköri leírását → naplózódjon.

### 3. GDPR / Időbeliség
- [ ] **Fegyelmi ügyek dedikált felülete** – Nincs szigorúan naplózott, titkosított és elzárt felület fegyelmi és kitüntetési adatoknak.
- [ ] **Orvosi vizsgálatok ↔ munkakör kötés** – Hiányzik az alkalmassági vizsgálatok munkakörökhöz rendelése és az automatikus lejárat-figyelés.
- ~~**Időbeliség (Változáskövetés)** – A HR adatoknál (bér, beosztás) elkészült a múltbeli és jövőbeli hatályosság kezelése és a History Timeline megjelenítés.~~ ✅ **KÉSZ**

---

## 🟡 FONTOS / RÉSZBEN KÉSZ

### 4. Időgazdálkodás
- ~~**Időgazdálkodás: Tervezett vs Tény és Hóvégi zárás** – Elkészült az FTE alapú elvárt munkaidő számítás, az egyenleg és a beküldés/jóváhagyás (Read-Only) munkafolyamat.~~ ✅ **KÉSZ**
- [ ] **Speciális pótlékszámítási logikák** – Opcionális kiegészítés (éjszakai, hétvégi pótlékok automatikus kalkulációja).
- ~~**Beléptető rendszer import**~~ → **ELVETVE** (nem lesz kártyás rendszer)

### 5. Hatósági adatszolgáltatás (NAV, KSH)
- [ ] **T1041 / KSH generátorok finomhangolása** – Esetleges apróbb mezők/validációk (az alap kész, de szükség lehet pontosításra).

### 6. eaisyDocs – Keresés
- [ ] **Postgres Full-Text Search (FTS)** – Keresés optimalizálása `tsvector` + `GIN` index + `hungarian` szótár beállításával.

---

## 🟢 NICE TO HAVE / JÖVŐBELI

### 7. Cafeteria
- [ ] **Cafeteria nyilatkozatok (PDF) automatikus generálása** – A ciklus lezárásakor automatikus PDF-előállítás és eltárolás.

### 8. Offboarding
- ~~**Kiléptetési motor** – Az onboarding motor megvan, de hiányzik a „Kiléptetés" (eszközvisszavétel, jogosultság-visszavonás checklist).~~ ✅ **KÉSZ**

### 9. Karriertervezés
- [ ] **Egyéni fejlesztési terv** – A teljesítményértékelés alatt egyéni fejlesztési terv rögzítése (IDP modul).

---

## ✅ MÁR KÉSZ (referenciaként)

| Modul | Állapot |
|---|---|
| Dolgozói alapadatok, adatlap | ✅ Kész |
| Munkaszerződés-kezelés + generátor | ✅ Kész |
| Cafeteria (egyenleg, nyilatkozat feltöltés) | ✅ Kész |
| Távollétek / Szabadság + eszkaláció | ✅ Kész |
| Toborzás (ATS) + AI CV parsing | ✅ Kész |
| Onboarding (beléptetési motor) | ✅ Kész |
| Teljesítményértékelés + KPI + bónusz | ✅ Kész |
| T1041 + KSH összesítő + archívum | ✅ Kész |
| Önkiszolgáló munkaidő-rögzítés (timesheet) | ✅ Kész |
| Bérszámfejtési export (CSV/XLSX) | ✅ Kész |
| Értesítések UI (kapcsolók, csatornák) | ✅ Kész (backend hiányzik!) |
| PDF viewer (HR + Docs dokumentumok) | ✅ Kész |
| eaisyDocs: Iktatás, inbox, PDF viewer | ✅ ~90% kész |
| eaisyDocs: Vízjelezett előnézet | ✅ Kész |
| eaisyDocs: Selejtezési javaslatok | ✅ Kész |
| eaisyDocs: Polimorf kapcsolatok UI | ✅ Kész |
