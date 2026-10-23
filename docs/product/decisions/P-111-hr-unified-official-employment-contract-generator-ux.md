# PRD P-111: Egységes Hivatalos Munkaszerződés Generálás (Mt. 42–45. §) a 360° Dolgozói Profilban UX

- **Dátum:** 2026-10-23
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [PRD P-096](./P-096-employee-official-documents-dedicated-tab-ux.md), [PRD P-110](./P-110-hr-employee-official-documents-search-and-filtering-ux.md)

---

## 1. Felhasználói Igény és Probléma

1. **Kettős és Eltérő Minőségű Munkaszerződés Generálás:**
   - Az Onboarding folyamatban már elkészült a jogilag érvényes, prémium A4-es, 8 szakaszos, kétoszlopos fejlécű Mt. 42–45. § munkaszerződés-generátor (`EmploymentContractPanel` és `employment-contract-pdf-generator.ts`), amely közvetlen eaisyDocs iktatási kapcsolattal (`1.2 irattári tétel, 50 év megőrzés`) rendelkezik.
   - Ezzel szemben a 360°-os dolgozói adatlapon (`/hr/employee/[id]`) a *„Szerződés / Irat Generálása”* gomb alatt egy korábbi, elavult „Alap Munkaszerződés” sablon működött, amely hiányos, pontozott vonalakkal (`................`) teli, mindössze 5 pontos vázlatos szöveget generált formázás és jogi záradékok nélkül.
2. **Kanonikus UI/UX Hiányosság:**
   - A két felület eltérő eredményt adott ugyanarra az alapvető munkaügyi műveletre, ami zavarta a felhasználót és rontotta a rendszer professzionális megítélését.

---

## 2. Termék és UX Döntések

1. **Onboarding Szerződésgenerátor Rendszerszintű Integrálása (`ContractGeneratorDialog`):**
   - A `src/components/hr/contract-generator-dialog.tsx` komponensben az elavult pontozott mockup sablon helyét átvette a hivatalos, onboardingban már bizonyított `EmploymentContractPanel`.
   - A sablonválasztóban a tétel megnevezése: **`Hivatalos Munkaszerződés (Mt. 42–45. §)`**, amely alapértelmezettként nyílik meg.
2. **Teljes Munkaügyi Életciklus a Dolgozói Profilból:**
   - A dolgozó meglévő adatai (születési adatok, anyja neve, lakcím, TAJ, adóazonosító, bankszámlaszám, munkakör, bér) automatikusan betöltődnek.
   - A felhasználó egy felületen tudja:
     - Paraméterezni és ellenőrizni a szerződési feltételeket (próbaidő, munkaidő, munkavégzés helye, távmunka).
     - Legenerálni a jogilag hiteles A4-es PDF munkaszerződést (ugyanaz a prémium megjelenés, mint az onboardingban).
     - Megtekinteni a beágyazott PDF olvasóban (`PdfViewerDialog`).
     - Egy kattintással beiktatni az eaisyDocs-ba és letölteni.
     - Egy kattintással legenerálni a kötelező **Mt. 46. § Írásbeli Munkáltatói Tájékoztatót**.
     - Csatolni az aláírt munkavállalói példányt.
3. **Egyéb Dokumentumsablonok Megőrzése:**
   - A további speciális sablonok (Hivatalos Munkaköri Leírás, Bérmódosítási Tájékoztató, Titoktartási Nyilatkozat) továbbra is elérhetők a választóból.

---

## 3. Érintett Képernyők és Komponensek

| Fájl | Típus | Módosítás |
|---|---|---|
| `src/components/hr/contract-generator-dialog.tsx` | Kliens Komponens | Elavult mock munkaszerződés leváltása a kanonikus `EmploymentContractPanel` modulra |

---

## 4. Elfogadási Kritériumok (Acceptance Criteria)

- [x] A 360° profilban a Szerződés / Irat Generálása modálban pontosan ugyanaz a hivatalos Mt. 42–45. § munkaszerződés generálódik, mint az onboardingban.
- [x] Az adatok (személyes adatok, munkakör, bér) automatikusan előtöltődnek a dolgozó adatlapjából.
- [x] Az elkészült szerződés PDF formátumban in-place megtekinthető, letölthető és beiktatható.
- [x] A Zero-Emoji és No-Decorative-Icons szabályzat teljesül.
- [x] A TypeScript fordítás (`npx tsc --noEmit`) hibátlanul lefut.
