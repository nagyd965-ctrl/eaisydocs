# [HR] P-045: Egységesített Munkatársi Beléptetés és eaisyDocs Integrációs Modál UX

**Státusz:** `Elfogadva` (Decided)  
**Dátum:** 2026-10-02  
**Hatókör:** `[HR]` / `[Közös]`  
**Kapcsolódó ADR:** [A-005](../../architecture/decisions/A-005-hr-modular-independence-architecture.md), [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md)  
**Érintett Komponensek:** `src/components/hr/add-employee-dialog.tsx`, `src/app/hr/admin/page.tsx`, `src/app/hr/settings/page.tsx`

---

## 1. Kontextus és Problémafelvetés
Az eaisyHR rendszerben új munkatárs felvételére két kiemelt felületen van lehetőség:
1. A **HR Munkaasztalon** (`/hr/admin`), a teljes állomány napi operatív kezelésénél.
2. A **HR Beállításokban** (`/hr/settings`), a felhasználói és szervezeti jogosultságok adminisztrációjánál.

Korábban a két felület eltérő elrendezést és szövegezést alkalmazott: míg a beállításoknál elérhető volt az eaisyDocs meglévő felhasználók listája és szerepköre, addig a munkaasztalon egy korábbi, leegyszerűsített dialógus működött. Ezen kívül a modulok közötti közös hozzáférés magyarázata túl hosszú és vizuálisan zsúfolt volt.

A cél a **teljes képernyőszintű UI konzisztencia** megteremtése (ADR [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md)), valamint az eaisyDocs és eaisyHR moduláris függetlenségének (ADR [A-005](../../architecture/decisions/A-005-hr-modular-independence-architecture.md)) tiszta, egyértelmű kommunikációja a HR adminisztrátorok felé.

---

## 2. Felhasználói Élmény (UX) és Képernyőfelépítés

### 2.1. Kanonikus `AddEmployeeDialog` Felépítés
A párbeszédablak mindkét felületen azonos szerkezettel (`sm:max-w-[540px]`), címmel és leírással jelenik meg:
- **Cím:** *Új Dolgozó Felvétele*
- **Alcím:** *Rendelj hozzá eaisyHR jogosultságot egy meglévő eaisyDocs felhasználóhoz, vagy hozz létre egy dedikált új munkatársi fiókot.*

### 2.2. Kétfülös Beléptetési Mód (`Tabs`)

#### 1. Fül: `Meglévő eaisyDocs fiók`
- **Finom Teal Háttérsáv:** Egy diszkrét, márkaszínű keret és háttér (`border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10`) tájékoztatja az adminisztrátort a közös hozzáférésről:
  > *"Ha a meglévő eaisyDocs fiókok közül választasz munkatársat, a felhasználó hozzáférést kap az eaisyHR modulhoz is."*
- **Dinamikus Fiókszámláló Címke:** `eaisyDocs Felhasználó Kiválasztása ({count} fiók)`.
- **Részletes Felhasználó Választó:**
  - Felhasználó teljes neve (`font-medium text-foreground`).
  - Hozzá tartozó e-mail cím diszkrét szürke színnel.
  - eaisyDocs szerepkör jelvény (`[Adminisztrátor]`, `[Vezető]`, `[Ügyintéző]`, `[Betekintő]`).
  - Amennyiben a felhasználó már szerepel az állományban, kiemelt zöld címke jelzi: *"Már HR dolgozó"*.

#### 2. Fül: `Új fiók (Csak eaisyHR)`
- **Moduláris Függetlenségi Figyelmeztetés:** Diszkrét szürke kártya (`border-border bg-muted/40`):
  > *"Ez a fiók kizárólag az eaisyHR rendszerhez kap hozzáférést, az eaisyDocs iratkezelőt nem éri el."*
- **Adatmezők:** Teljes név, e-mail cím, jelszó.

### 2.3. Közös Törzsadatok és Munkajogi Érvényesítés
A választott fültől függetlenül az ablak alsó részén azonos beállítások érvényesülnek:
- **HR Rendszer Szerepkör:** HR Munkatárs, HR Vezető, Munkavállaló, stb.
- **Betöltött Munkakör:** Választható a dinamikus munkaköri katalógusból (`hr_munkakor`).
- **Telefonszám és Belépés Dátuma.**
- **Munkajogi Figyelmeztető Sáv (NAV T1041):**
  > *„Figyelem: A T1041 biztosítotti bejelentés határideje a munkába állás megkezdése előtt van!”*

---

## 3. Megvalósítás és Hatás
- **Konzisztencia:** Nincs eltérés a HR Munkaasztal és a HR Beállítások között; mindkét helyen azonos adatok és dialógus-élmény fogadja a felhasználót.
- **Átláthatóság:** A végfelhasználó azonnal érti a két különálló termék (Docs és HR) közötti felhasználói azonosságot, anélkül hogy zavaró technikai részletekbe ütközne.
