# [HR] P-041: Törvényes Kilépő Igazolások Kiadása (Mt. 80. § / Flt. 36/A. §), Átvételi Nyugta és eaisyDocs Iktatás UX

**Dátum:** 2026-10-02  
**Státusz:** Elfogadva  
**Hatókör:** `[HR]`  
**Kategória:** `HR / Offboarding & Compliance`  
**Kapcsolódó Kód:** `src/components/hr/exit-certificate-panel.tsx`, `src/utils/hr/exit-certificate-pdf-generator.ts`, `src/app/hr/offboarding/actions.ts`, `src/components/hr/offboarding-profile-modal.tsx`  
**Kapcsolódó ADR / PRD:** [P-040](./P-040-hr-offboarding-analytics-and-filing-revamp.md), [A-026](../../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md)

---

## 1. Kontextus és Problémafelvetés
A kiléptetési folyamat során a feladatlistában szerepelt a *"Törvényes kilépő igazolások kiadása (Mt. 80. §)"* teendő, azonban erre kattintva a felhasználó korábban nem talált célfelületet, csupán manuálisan pipálhatta ki a teendőt. 

A magyar Munka Törvénykönyve (Mt. 80. § (2) bek.), a foglalkoztatás elősegítéséről szóló törvény (Flt. 36/A. §), valamint az adózási és társadalombiztosítási jogszabályok kötelezővé teszik, hogy a munkaviszony megszűnésekor a munkavállaló részére a munkáltató kiadja:
1. Az **igazolást a munkaviszony megszűnéséről** (munkaviszony időtartama, munkakör, FEOR-08, megszűnés jogcíme),
2. A **munkabérből történő levonásokról, letiltásokról vagy azok hiányáról szóló nyilatkozatot** (Mt. 80. § (2)),
3. Az **adott évben igénybe vett betegszabadság munkanapjainak számát** (Mt. 126. §),
4. A **kifizetett végkielégítés összegét** (Flt. 36/A. §),
5. Az **átadás-átvételi jegyzőkönyvet / postai tértivevényes feladási igazolást**, amely védi a munkáltatót az 5 munkanapos törvényi határidő betartásának vitatása esetén.

---

## 2. Felhasználói Élmény & UX Döntések

### 2.1. Dedikált `ExitCertificatePanel` és Navigáció
- A kiléptetési modál checklistjében a *"Törvényes kilépő igazolások kiadása (Mt. 80. §)"* sorban közvetlen gomb jelenik meg:
  - Ha még nincs kiállítva igazolás: **"Igazolások kiadása"** (elsődleges outline gomb).
  - Ha már legenerálásra került: **"Igazolások megtekintése"** (zöld pipa ikonnal).
- A gombra kattintva a modál zökkenőmentesen átvált a beépített `kilepo_igazolas` fülre, fejlécében vissza gombbal és állapotjelzővel.

### 2.2. Automatikus Előtöltés Dolgozói Kartonból és Béradatokból
A felület azonnal előtölti:
- Munkavállaló személyes adatai (név, születési hely/idő, anyja neve, lakcím, TAJ szám, adóazonosító jel).
- Munkaviszony adatok (FEOR-08 kód, munkakör, jogviszony kezdete és hivatalos kilépés napja, megszűnés jogcíme az előkészített megállapodásból).
- Végkielégítés összege és betegszabadság napok száma.
- Munkabérből történő levonások és bírósági letiltások választó (letiltásmentes vs. terhelt jogerős határozattal).
- Átvétel módja:
  - **Személyes átvétel:** Munkavállalói aláírási záradékkal.
  - **Postai feladás (tértivevény):** Ragszám és feladási dátum rögzítésével.

### 2.3. Hivatalos Törvényes PDF Generálás és Előnézet
- A *"Törvényes Kilépő Igazolás & Átvételi Nyugta Generálása"* gomb gombnyomásra hiteles, A4-es méretű, minőségi tipográfiájú PDF-et állít elő a beépített Puppeteer motorral.
- Az elkészült dokumentum azonnal megtekinthető a beépített `PdfViewerDialog`-ban (PDF.js alapú előnézet), illetve letölthető.
- A generálás sikeres befejezése automatikusan `done` státuszba állítja a kapcsolódó kiléptetési feladatot és bejegyzi a műveletet a HR eseménynaplóba.

### 2.4. Integráció az eaisyDocs Személyi Dossziéval
A kiléptetési folyamat lezárásakor (`closeOffboarding`) a rendszer kötegelten beiktatja a törvényes kilépő igazolást a munkavállaló digitális személyi dossziéjába a `1.2 Munkaviszony megszüntetése` irattári kategóriába, 50 éves törvényes megőrzési idővel.

---

## 3. Érintett Képernyők és Komponensek
- `src/components/hr/offboarding-profile-modal.tsx`: Feladatlista sor és tab routing integráció.
- `src/components/hr/exit-certificate-panel.tsx`: Adatfelülvizsgálati és PDF generáló panel.
- `src/utils/hr/exit-certificate-pdf-generator.ts`: Puppeteer A4 PDF generator.
- `src/app/hr/offboarding/actions.ts`: `generateExitCertificateAction`, `getOffboardingDetailData`, `closeOffboardingProcess`.
