# [HR] P-027: Hivatalos Éves Szabadság-nyilvántartó Lap (Mt. 134. §) és Távolléti Igazolások Kezelése

**Státusz:** Elfogadva  
**Dátum:** 2026-10-01  
**Hatókör:** `[HR]`  
**Érintett modulok:** eaisyHR (Munkavállalói portál, HR Távollét fül, PDF generátorok, eaisyDocs személyi dosszié híd)  

---

## 1. Kontextus és Problémafelvetés

A munka törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 134. § (1) bekezdése előírja, hogy a munkáltató köteles a munkavállaló szabadságát úgy nyilvántartani, hogy abból naprakészen megállapítható legyen:
- Az esedékesség éve,
- A szabadság jogcíme (alapszabadság, életkori pótszabadság, gyermekek utáni pótszabadság, egyéb pótszabadság),
- Az igénybe vett napok száma és időpontjai,
- A még fennmaradó szabadságnapok száma.

Korábban a dolgozói önkiszolgáló portálon az egyes jóváhagyott kérelmeknél csak egyetlen „Igazolás” gomb volt, ami azonnal letöltötte a fájlt in-browser előnézet nélkül. Továbbá a HR munkatársak a dolgozó központi adatlapján (`/hr/employee/[id]/tabs/LeaveTab`) nem fértek hozzá a távolléti igazolásokhoz, és nem állt rendelkezésre hivatalos, összefoglaló A4-es éves szabadság-nyilvántartó lap sem.

---

## 2. Megoldás és Architektúra

### A) Dolgozói Önkiszolgáló Portál (`LeaveHistoryList`)
- A korábbi letöltő gomb helyett két dedikált művelet jelenik meg minden jóváhagyott távollétnél:
  - 👁️ **Megtekintés:** A `PdfViewerDialog` segítségével az A4-es távolléti igazolás közvetlenül a böngészőben nyílik meg (`/api/hr/leave-pdf?tavolletId=...&preview=true`).
  - 📥 **Letöltés:** Közvetlen PDF letöltést indít a felhasználó gépére (`download=true`).

### B) HR Központi Távollét Áttekintés (`LeaveTab`)
1. **Soronkénti igazolás műveletek:**
   - A „Távollétek és Kérelmek Története” táblázatban minden jóváhagyott sornál elérhető a **Megtekintés** és a **Letöltés**.
2. **Hivatalos Éves Szabadság-nyilvántartó Lap (Mt. 134. §):**
   - Fejléc akciógombok a tárgyévre (`currentYear`):
     - **Megtekintés:** A4-es hivatalos nyomtatvány előnézete böngészőben.
     - **Letöltés:** PDF letöltése munkaügyi ellenőrzéshez.
     - **Iktatás eaisyDocs-ba:** Egyetlen kattintással beiktatja a dokumentumot a dolgozó hivatalos személyi dossziéjába a `3.1 - HR és Munkaügyi dokumentumok` tétel alá (50 év megőrzési idővel), gap-mentes iktatószámmal és audit naplózással.
     - **Iktatva Badge:** Ha már be van iktatva, megjelenik az `Iktatva: HR/...` jelvény, ami közvetlenül a személyi dossziéra navigál (`/dossiers/[ugyirat_id]`).

### C) Törvényes Szabadságkeret Levezetése (`leave-calculator.ts`)
A `getAnnualLeaveBreakdown` függvény pontosan levezeti és a generált dokumentumban tételesen bemutatja:
- Alapszabadság (Mt. 116. §): 20 munkanap
- Életkor szerinti pótszabadság (Mt. 117. §): sávosan 1–10 nap
- Gyermekek után járó pótszabadság (Mt. 118. §): 1 gyerek = 2 nap, 2 gyerek = 4 nap, 3+ gyerek = 7 nap
- Megváltozott munkaképességű pótszabadság (Mt. 120. §): +5 nap
- Tárgyévi távollétek időrendi naplója (göngyölt egyenleggel).
- Munkáltatói és munkavállalói aláírási blokk.

---

## 3. Érintett Fájlok
- `src/utils/hr/leave-calculator.ts`: `AnnualLeaveBreakdown` és `getAnnualLeaveBreakdown`.
- `src/utils/hr/annual-leave-pdf-generator.ts`: Hivatalos A4 PDF és HTML generátor.
- `src/app/api/hr/annual-leave-pdf/route.ts`: Streaming végpont jogosultság-ellenőrzéssel.
- `src/app/api/hr/leave-pdf/route.ts`: `preview=true` inline és `download=true` attachment kezelés.
- `src/components/hr/leave-history-list.tsx`: Dolgozói portál nézet és gombok.
- `src/app/hr/employee/[id]/tabs/LeaveTab.tsx`: HR táblázat és éves nyilvántartó műveletek.
- `src/app/hr/employee/[id]/actions.ts`: `getAnnualLeaveDocument` és `fileAnnualLeaveSheet`.
- `src/utils/__tests__/annual-leave-calculator.test.ts`: Automatikus unit tesztek (5/5 sikeres).
