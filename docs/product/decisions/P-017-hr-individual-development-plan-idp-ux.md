# [HR] P-017: Egyéni Fejlesztési Terv (IDP) és Képzési UX

## 1. Kontextus és Célkitűzés
Az Egyéni Fejlesztési Terv (Individual Development Plan - IDP) a munkavállalók karrierfejlődésének, képzési programjainak, kompetenciafejlesztésének és készségcéljainak nyomon követésére szolgál. A cél egy modern, motiváló felület biztosítása, ahol a munkavállaló és a vezető közösen határozhatja meg a fejlődési célokat és tanulási mérföldköveket.

## 2. Érintett Képernyők és Komponensek
- **Fő nézet:** `/hr/idp` (Képzések és Fejlesztési tervek)
- **Főbb komponensek:**
  - `src/components/hr/idp/employee-idp-view.tsx`: Munkavállaló egyéni képzési útja, megszerzett kompetenciák, aktív kurzusok és célok.
  - `src/components/hr/idp/idp-list-card.tsx`: Vezetői nézet a csapatfejlesztési tervekről, teljesítettségi állapotokról.
  - `src/components/hr/idp/idp-dialog.tsx`: Új fejlesztési cél, képzési kérelem (pl. külső tréning, konferencia, e-learning) rögzítése költség- és időbecsléssel.
  - `src/components/hr/idp/idp-plan-dialog.tsx`: Hosszú távú (1-3 éves) karrierterv és előléptetési mérföldkövek szerkesztése.

## 3. Felhasználói Interakciók és Folyamatok
1. **Fejlesztési Terv Készítése:**
   - A teljesítményértékelést követően a vezető és a beosztott rögzíti a hiányzó vagy fejlesztendő kompetenciákat (pl. "Vezetői kommunikáció", "TypeScript haladó").
   - Akciótervet rendelnek hozzá: tréning elvégzése, mentorálás, gyakorlati projekt.
2. **Képzés Jóváhagyási Folyamat:**
   - Költségvonzattal járó képzések esetén a kérelem jóváhagyási láncon fut végig (Közvetlen vezető -> HR -> Gazdasági vezető).
3. **Mérföldkő Teljesítés és Tanúsítvány:**
   - A dolgozó feltölti a képzési igazolást / tanúsítványt, amely bekerül a digitális személyi iratgyűjtőjébe.
   - A kompetenciamátrix automatikusan frissül a megszerzett szinttel.

## 4. UI Állapotok és Visszajelzések
- **Státuszok:** `Tervezett`, `Jóváhagyásra vár`, `Folyamatban`, `Sikeresen elvégezve`, `Meghiúsult`.
- **Költségvetés figyelés:** Figyelmeztetés jelenik meg, ha a képzési kérelem meghaladja az éves egyéni/osztály szintű keretet.
