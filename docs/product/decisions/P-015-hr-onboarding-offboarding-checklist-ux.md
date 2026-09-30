# [HR] P-015: Onboarding és Offboarding Checklist Folyamatok UX

## 1. Kontextus és Célkitűzés
Az új munkavállalók beléptetése (Onboarding) és a távozók kiléptetése (Offboarding) összetett, több osztályt (HR, IT, Pénzügy, Üzemeltetés) érintő feladat. A modul célja a feladatok automatizált kiosztása, határidejük nyomon követése, eszközátadások regisztrálása és az exit interjúk dokumentálása.

## 2. Érintett Képernyők és Komponensek
- **Beléptetési felület:** `/hr/onboarding`
- **Kiléptetési felület:** `/hr/offboarding`
- **Főbb komponensek:**
  - `src/components/hr/onboarding-list.tsx` & `onboarding-card.tsx`: Aktív belépési folyamatok kártyás/táblázatos megjelenítése feladat előrehaladási százalékkal.
  - `src/components/hr/onboarding-profile-modal.tsx`: Belépő dolgozó részletes checklistje (szerződéskötés, NAV bejelentés, orvosi alkalmassági, IT fiókok, eszköz átadás).
  - `src/components/hr/offboarding-list.tsx` & `offboarding-card.tsx`: Távozó kollégák státusza (felmondási idő, utolsó munkanap).
  - `src/components/hr/offboarding-profile-modal.tsx`: Kilépési checklist (eszköz visszavétel, jogosultság megvonás, elszámolás, igazolások kiadása).
  - `src/components/hr/exit-interview-summary.tsx`: Kilépő interjú strukturált kérdőívének rögzítése és analitikai összegzése.
  - `src/components/hr/contract-generator-dialog.tsx`: Munkaszerződés és tájékoztató automatikus generálása sablon alapján.

## 3. Felhasználói Interakciók és Folyamatok
1. **Onboarding Indítása:** Felvételt követően a HR szakember elindítja a folyamatot. A rendszer a beállított sablon alapján automatikusan legenerálja a feladatokat és felelősöket (pl. IT: "Laptop előkészítés").
2. **Checklist Tételek Teljesítése:** A felelősök a saját felületükön vagy az Onboarding modálban pipálhatják a feladatokat. Csatolhatnak átadás-átvételi jegyzőkönyvet is.
3. **Offboarding & Eszközelszámolás:** Távozáskor a checklist kötelezővé teszi a kiadott eszközök leltári visszavételét. A kilépő dokumentumok (T1041 kijelentés, kilépő adatlap) csak a kötelező tételek teljesítése után generálhatók le.
4. **Exit Interjú Elemzés:** Az anonim vagy névvel vállalt exit interjúk segítik a fluktuációs okok feltárását a vezetőség számára.

## 4. UI Állapotok és Visszajelzések
- **Határidő-túllépés riasztás:** Piros badge jelzi a kritikus határidős feladatokat (pl. NAV T1041 bejelentés az első munkanapot megelőzően).
- **Auditálhatóság:** Minden tétel pipálása rögzíti a pipáló felhasználó azonosítóját és a pontos időbélyeget.
