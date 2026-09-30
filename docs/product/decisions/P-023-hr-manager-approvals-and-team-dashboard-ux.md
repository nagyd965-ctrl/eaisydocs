# [HR] P-023: Vezetői Csapat-Jóváhagyási Műszerfal UX

## 1. Kontextus és Célkitűzés
A közép- és felsővezetők számára kritikus, hogy ne kelljen a különböző menüpontok (szabadságok, túlórák, jelenléti ívek, KPI értékelések, képzési kérelmek) között ugrálniuk. A vezetői jóváhagyási központ (`/hr/manager`) egyetlen dedikált műszerfalra gyűjti össze a vezető beosztottjai által benyújtott, döntésre váró kérelmeket.

## 2. Érintett Képernyők és Komponensek
- **Fő nézet:** `/hr/manager` (`src/app/hr/manager/page.tsx`)
- **Főbb kártyák és blokkok:**
  - **Függőben lévő szabadságkérelmek:** Munkavállaló neve, távollét típusa, időszaka, napok száma, egykattintásos "Jóváhagyás" / "Elutasítás indoklással".
  - **Túlóra jóváhagyási lista:** Rendkívüli munkaidő óraszáma, indoklása és az Mt. szerinti éves keret terheltsége.
  - **Havi jelenléti ív lezárások:** Osztályszintű jelenléti ívek áttekintése és jóváhagyása a tárgyhót követően.
  - **KPI és IDP mérföldkövek:** Célkitűzések és képzési költségkeret engedélyezések.
  - **Csapat Jelenléti Összesítő:** Kép a csapat aznapi elérhetőségéről (ki van irodában, ki home office-ban, ki távol).

## 3. UI Állapotok és Értesítések
- A fejlécben számláló jelzi a vezetői beavatkozást igénylő feladatok számát (badge).
- Jóváhagyáskor vagy elutasításkor a rendszer valós idejű push és email értesítést küld a beosztottnak, és frissíti a havi bérszámfejtési elszámolásokat.
