# [HR] P-016: Munkaügyi Megfelelőség, Hatósági Riportok és Egészségügy UX

## 1. Kontextus és Célkitűzés
A magyar munkaügyi szabályozás szigorú adatszolgáltatási (KSH, NAV) és munkavédelmi / foglalkozás-egészségügyi követelményeket támaszt. A felület célja a hatósági adatszolgáltatások (NAV 'T1041, KSH létszámjelentések) egykattintásos előállítása és a kötelező orvosi vizsgálatok lejárati figyelése.

## 2. Érintett Képernyők és Komponensek
- **Riportok és Megfelelőség nézet:** `/hr/riportok`
- **Főbb komponensek:**
  - `src/components/hr/nav-t1041-generator.tsx`: NAV 'T1041-es bejelentő fájl (XML/struktúrált formátum) generálása új belépők vagy kilépők esetén ÁNYK importra előkészítve.
  - `src/components/hr/ksh-report-generator.tsx`: Havi és negyedéves KSH statisztikai jelentések (átlagos statisztikai állományi létszám, ledolgozott órák) kalkulációja és exportja.
  - `src/components/hr/reports-tabs.tsx`: Tabos felület különböző jogszabályi és vezetői riportok kiválasztására (Létszám, Fluktuáció, Szabadság, Túlóra egyenleg).
  - Egészségügyi és munkavédelmi nyilvántartó kártyák és riasztások.

## 3. Felhasználói Interakciók és Folyamatok
1. **NAV 'T1041 Generálás:**
   - A HR ügyintéző kiválasztja az érintett munkavállalót és a jogviszony típusát (belépés, szüneteltetés, kilépés).
   - A rendszer ellenőrzi a kötelező mezők meglétét (adóazonosító, TAJ, FEOR kód, heti munkaórák száma).
   - Generálás gombra kattintva letölthető az ÁNYK-ba közvetlenül betölthető adatfájl.
2. **KSH Létszám Adatszolgáltatás:**
   - Adott hónap kiválasztásakor a rendszer az időnyilvántartás és jogviszonyok alapján kiszámítja a teljes munkaidős egyenértékes (FTE) létszámot.
   - Excel / CSV formátumban exportálható a KSH kérdőív soraival egyező bontásban.
3. **Orvosi Alkalmassági Lejáratok:**
   - Szűrés a következő 30/60 napban lejáró periodikus orvosi vizsgálatokra.
   - Automatikus értesítő küldése a munkavállalónak és a közvetlen vezetőnek.

## 4. UI Állapotok és Validációk
- **Hiányzó adatok validációja:** Ha a dolgozó profiljából hiányzik pl. a FEOR kód vagy a TAJ szám, a generátor nem engedi a fájl letöltését, és közvetlen linket ad a hiánypótlásra.
