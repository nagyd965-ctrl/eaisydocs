# [HR] P-014: Dolgozói Self-Service Portál és Cafeteria Nyilatkozat UX

## 1. Kontextus és Célkitűzés
A munkavállalói önkiszolgáló (Employee Self-Service - ESS) felület célja, hogy a dolgozók közvetlenül elérhessék saját munkaügyi adataikat, kezelhessék szabadságigényeiket, benyújthassák éves cafeteria választásaikat, és igazolhassák a munkaköri leírások vagy szabályzatok átvételét.

## 2. Érintett Képernyők és Komponensek
- **Saját profil nézet:** `/hr/profil`
- **Főbb komponensek:**
  - `src/components/hr/personal-data-card.tsx`: Munkavállaló személyes adatai (lakcím, bankszámla, adóazonosító, elérhetőség) szerkesztési kérelem indításával.
  - `src/components/hr/cafeteria-declaration.tsx`: Interaktív cafeteria csomagválasztó keretösszeg számlálóval és adózási kalkulációval.
  - `src/components/hr/time-tracking-card.tsx`: Napi munkaidő rögzítő (check-in / check-out), aktuális havi ledolgozott órák és túlórák.
  - `src/components/hr/job-description-acknowledgment.tsx`: Munkaköri leírás elektronikus elfogadása és tudomásulvétele időbélyegzővel.
  - `src/components/hr/document-acknowledgment-admin.tsx`: HR vezetői nézet a munkavállalói dokumentum-átvételek státuszáról.

## 3. Felhasználói Interakciók és Folyamatok
1. **Cafeteria Választás:**
   - A rendszer megjeleníti a munkavállaló éves keretösszegét (pl. 450.000 Ft).
   - A munkavállaló csúszkákkal vagy számszerűen szétosztja a keretet SZÉP kártya alszámlákra, készpénzcafeteriára vagy egyéb elemekre.
   - Valós idejű validáció ellenőrzi, hogy a felhasznált összeg pontosan egyezik-e a kerettel.
   - Nyilatkozat beküldésekor elektronikus nyilatkozati naplóbejegyzés keletkezik.
2. **Dokumentum Átvétel és Megismerés:**
   - Céges szabályzat vagy munkaköri leírás feltöltésekor a dolgozó dashboardján figyelmeztetés jelenik meg.
   - A PDF megtekintését követően az "Elolvastam és tudomásul vettem" gomb aktiválódik, mely rögzíti az elfogadás pontos idejét és IP címét.

## 4. UI Állapotok és Korlátozások
- **Érzékeny adatok védelme:** Az adóazonosító és bankszámlaszám alapértelmezetten maszkolva jelenik meg (`***-***-1234`), csak a szerkesztési mód feloldásakor látható.
- **Keret túllépés / maradék vizualizáció:** A progress bar pirossá válik túllépés esetén, zöldre, ha pontosan kimerítésre került a keret.
