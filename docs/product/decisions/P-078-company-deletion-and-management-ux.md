# P-078 [Docs] Cég Végleges Törlése és Többvállalatos Adminisztrációs UX

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-059](../../architecture/decisions/A-059-company-deletion-and-cascade-lifecycle.md), [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [P-043](P-043-global-ui-consistency-and-unified-components.md), [P-053](P-053-multi-tenancy-company-selector-ux.md)

## 1. Probléma
A felhasználók tesztelési céllal vagy tévesen importált vállalatokat kívántak eltávolítani a fiókjukból. Korábban az adminisztrációs felületen nem volt elérhető cég törlése funkció, így a felesleges cégek terhelték a cégválasztót és a beállításokat.

## 2. Döntés

### 2.1 Törlési Akciógombok Elhelyezése (`CompanySettingsTab`)
1. **„Összes elérhető cégem” lista:**
   - Minden vállalati sor jobb oldalán a „Váltás erre” / „Aktív cég” gomb mellett egy diszkrét, piros hover-effektussal ellátott törlés gomb (`Trash2` ikon) jelenik meg azon cégeknél, ahol a felhasználó tulajdonosi vagy adminisztrátori jogosultsággal rendelkezik.
2. **Aktív cég szerkesztési kártyája:**
   - A tulajdonos számára a „Cég adatainak mentése” gomb mellett egy közvetlen „Cég törlése” akciógomb is elérhető.

### 2.2 Kanonikus Megerősítő Modál (`AlertDialog`)
- A véletlen törlések kizárására a rendszer megerősítő modált jelenít meg:
  - Cím: Figyelmeztető ikon (`AlertTriangle`) és „Cég végleges törlése”.
  - Tartalom: A törlendő vállalat neve kiemelve, és egyértelmű tájékoztatás arról, hogy a művelet végleges és nem visszavonható (minden kapcsolódó irat, ügyirat, partner és beállítás azonnal törlődik).
  - Akciógombok: „Mégse” (szürke) és „Cég végleges törlése” (destruktív piros gomb betöltési spinnerrel).

### 2.3 Folyamat és Automatikus Kontextusváltás
- A törlés lefutása után a helyi állapot azonnal frissül (`CompanyContext`), eltávolítva a céget a listákból.
- Amennyiben az éppen aktív céget törölte a felhasználó, a rendszer automatikusan és zökkenőmentesen átvált a következő elérhető vállalkozásra, elkerülve az üres vagy hibás képernyőt.
- Ha nincs több elérhető vállalat, a munkamenet tisztán alaphelyzetbe áll.

## 3. Érintett Képernyők
- Rendszerbeállítások / Cég fül (`/settings` -> `CompanySettingsTab`)
- Globális cégválasztó (`CompanySelector`) és környezeti állapot
