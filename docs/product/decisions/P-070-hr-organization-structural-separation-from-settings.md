# [P-070] eaisyHR Szervezeti Felépítés és Beállítások UX Letisztítás

- **Dátum:** 2026-10-12
- **Hatókör:** `[HR]`
- **Státusz:** `Decided`
- **Kapcsolódó döntések:** [A-051](../../architecture/decisions/A-051-hr-organization-structural-separation-from-settings.md), [P-043](./P-043-global-ui-consistency-and-unified-components.md)

---

## 1. Felhasználói Élmény Problémák
1. A felhasználónak a dolgozók felvételéhez és szerkesztéséhez a "Beállítások" menübe kellett navigálnia, holott a napi operatív munkát az "Állomány Áttekintés" képernyőn végezte.
2. A szervezeti ábra, egységek és munkakörök el voltak rejtve a technikai beállítások (téma, jelszó, cégadatok) közé.
3. Az Állomány Áttekintés táblázatban a felhasználó nem tudta azonnal szerkeszteni vagy törölni a dolgozót, hanem külön köröket kellett tennie.

## 2. Megvalósított UX Megoldás
1. **Állomány Áttekintés (`/hr/admin`):**
   - A törzsadatbázis táblázat műveleti oszlopában megjelent a Szerkesztés (`EmployeeEditDialog`) és Törlés (`EmployeeDeleteDialog`) gomb adminisztrátori jogosultság esetén.
   - A szervezeti egység oszlopban a valós egység neve jelenik meg kanonikus outline badge formátumban.
   - A szűrősávban a szervezeti egységek szerint is lehet instant szűrni.
2. **Új Szervezeti Felépítés Képernyő (`/hr/organization`):**
   - Közvetlenül elérhető a bal oldali menüből (`HR Munkaasztal` -> `Szervezeti Felépítés`).
   - Letisztult elrendezés felső KPI kártyák nélkül, közvetlenül a címsor alatt induló fülekkel:
     - **Szervezeti Ábra:** Interaktív fanézet a hierarchiáról és beosztottakról.
     - **Szervezeti Egységek:** Kereshető lista, hozzárendelt létszám számlálóval, közvetlen linkekkel a részletes nézetre.
     - **Munkakör-katalógus:** Kereshető FEOR és munkakör táblázat, betöltöttség jelzővel és műveleti menüvel.
3. **Közvetlen Műveleti Gombok a Táblázatokban:**
   - A korábbi 3 pontos legördülő menü helyett mind a Szervezeti egységek, mind a Munkakörök táblázatban közvetlen gombok (Adatlap, Szerkesztés és Törlés) találhatók a Műveletek oszlopban.
4. **Beállítások (`/hr/settings`):**
   - Letisztult, gyors betöltődésű beállítási panel kizárólag konfigurációs feladatokra: Profil, Cég, Rendszer, Biztonság, Értesítések.
5. **Központi Áttekintés (`/hr/admin/overview`) Kivezetése:**
   - A feladatok és teendők Állomány áttekintésbe integrálásával a különálló overview menüpont törlésre került, elavult könyvjelzők esetén automatikus átirányítással a `/hr/admin`-ra.

## 3. Érintett Képernyők és Útvonalak
- `/hr/organization` (Új önálló útvonal)
- `/hr/admin` (Kiegészített műveleti lehetőségek és beágyazott teendőtáblázat)
- `/hr/admin/overview` (Kivezetve, átirányítva)
- `/hr/settings` (Megtisztított felület)
- `/hr/orgunit/[id]` és `/hr/job/[id]` (Frissített breadcrumb és visszanavigálás)
