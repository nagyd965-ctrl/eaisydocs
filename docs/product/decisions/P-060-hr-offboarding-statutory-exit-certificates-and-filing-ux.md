# [HR] P-060: Offboarding Hatósági Kilépőigazolások és eaisyDocs Iktatás UX

**Dátum:** 2026-10-10  
**Státusz:** Elfogadva  
**Hatókör:** `[HR]`  
**Kategória:** `HR / Offboarding & Compliance`  
**Kapcsolódó Kód:** `src/components/hr/exit-certificate-panel.tsx`, `src/components/hr/offboarding-profile-modal.tsx`, `src/components/hr/offboarding-list.tsx`, `src/app/hr/offboarding/actions.ts`  
**Kapcsolódó ADR / PRD:** [A-041](../../architecture/decisions/A-041-hr-offboarding-statutory-exit-certificates-and-filing-safety-net.md), [P-041](./P-041-statutory-exit-certificate-and-handover-ux.md), [A-026](../../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md)

---

## 1. Kontextus és Felhasználói Cél

A kiléptetési folyamat záróakkordja a törvényes kilépő igazolások kiadása az Mt. 80. § (2) bekezdése alapján. A cél, hogy a HR ügyintéző:
1. Egyetlen gombnyomással előállíthassa a jogszabályoknak maradéktalanul megfelelő hatósági igazoláscsomagot.
2. A betegszabadság napok száma és a dolgozó személyes adatai automatikusan előtöltődjenek.
3. Lehetősége legyen a dokumentum azonnali beiktatására a személyi dossziéba, még a folyamat lezárása előtt.
4. Ha a lezárásig nem történt manuális generálás, a rendszer automatikus védőhálóként (fail-safe) hozza létre és iktassa be a kötelező okiratot.

---

## 2. Felhasználói Élmény & UX Döntések

### 2.1. Automatikus Adatfeltöltés és Intelligens Betegszabadság
- A panel megnyitásakor az `ExitCertificatePanel` közvetlenül megjeleníti a dolgozó tárgyévi, jóváhagyott betegszabadság napjainak összegét (Mt. 126. §).
- A FEOR kód, munkakör, kezdő dátum és kilépési nap a dolgozói adatlapból automatikusan betöltődik.

### 2.2. Azonnali Egyedi Beiktatás Akciógomb
- A generált PDF állapotjelző kártyáján megjelenik a **„Beiktatás a személyi dossziéba most”** zöld szegélyű gomb (`ShieldCheck` ikonnal).
- Kattintásra a rendszer a háttérben azonnal kiosztja az iktatószámot (`HR-YYYY/XXXXX/1.Y`), befejezi az eaisyDocs személyi dossziéba történő iktatást, és a badge átvált zöld *"Beiktatva"* állapotra.

### 2.3. Átlátható és Biztonságos Lezárási Párbeszédablak
- A kiléptetés lezárásakor megjelenő megerősítő modál (`AlertDialog`) pontos és megnyugtató tájékoztatást nyújt a felhasználónak:
  - Világosan jelzi, hogy a folyamat során keletkezett összes hivatalos okirat (törvényes kilépő igazolások Mt. 80. §, megszüntetési megállapodás, eszközleszámolás, NAV igazolások) automatikusan beiktatásra kerül az eaisyDocs személyi dossziéba 50 év törvényes megőrzési idővel.
  - A rendszer a lezárás során automatikusan pótolja az esetlegesen még nem generált hatósági igazolást.

---

## 3. Érintett Képernyők és Komponensek

- `src/components/hr/exit-certificate-panel.tsx`: Adatelőtöltés, betegszabadság integráció, egyedi beiktatási gomb.
- `src/components/hr/offboarding-profile-modal.tsx`: Lezárási megerősítő modál szövegezés, `targyeviBetegszabadsagNapok` prop átadás.
- `src/components/hr/offboarding-list.tsx`: `OffboardingListItem` típusbővítés.
- `src/app/hr/offboarding/actions.ts`: Fail-safe generálás `closeOffboarding`-ban, betegszabadság lekérdezés `getOffboardingDetailData`-ban.
