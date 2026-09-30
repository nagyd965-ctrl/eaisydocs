# [HR] P-013: Toborzási ATS és Publikus Karrieroldal UX

## 1. Kontextus és Célkitűzés
Az eaisyHR toborzási modulja (Applicant Tracking System - ATS) végponttól végpontig támogatja a toborzási folyamatot: a nyitott pozíciók létrehozásától a publikus karrieroldalon történő jelentkezésen át a jelöltek státuszának követéséig, interjúztatásáig és ajánlattételig.

## 2. Érintett Képernyők és Komponensek
- **Adminisztrátori felület:** `/hr/toborzas` (Pozíciók, Jelölt Kanban és Talent Pool)
- **Publikus jelentkezői felület:** `/karrier/[id]` (Reszponzív, publikusan elérhető álláshirdetés és CV feltöltő űrlap)
- **Főbb komponensek:**
  - `src/components/hr/job-postings-list.tsx`: Álláshirdetések kezelése, aktív/inaktív kapcsoló, jelentkezők száma státuszonként.
  - `src/components/hr/job-create-dialog.tsx` & `job-action-menu.tsx`: Új pozíció kiírása leírással, követelményekkel, bérsávval és felelős toborzóval.
  - `src/components/hr/candidate-profile-sheet.tsx`: Részletes jelölt adatlap (Side-sheet) CV megtekintéssel, feljegyzésekkel, interjú időpontokkal és értékelésekkel.
  - `src/components/hr/add-candidate-dialog.tsx`: Manuális jelöltrögzítés CV feltöltéssel.
  - `src/components/hr/recruitment-analytics.tsx`: Toborzási statisztikák (Time-to-hire, csatorna konverziók, pipeline tölcsér).
  - `src/components/hr/talent-pool-list.tsx`: Tehetségbank archív jelöltekkel későbbi megkeresésekhez.

## 3. Felhasználói Interakciók és Folyamatok
1. **Pozíció Létrehozás és Publikálás:** A HR szakember létrehozza az állást, amely azonnal megjelenik a publikus `/karrier/[id]` URL-en.
2. **Jelentkezői Élmény:** A pályázó kitölti az adatlapot, feltölti PDF önéletrajzát. Az AI háttérfolyamat automatikusan kinyeri a releváns kulcsszavakat és tapasztalatokat.
3. **Pipeline Fázisok (Kanban):**
   - Új jelentkező -> Előszűrés -> Interjú -> Próbafeladat -> Ajánlattétel -> Felvéve / Elutasítva.
   - Áthúzáskor vagy státuszváltáskor az érintett felvételi bizottság értesítést kap.
4. **Felvétel -> Onboarding Konverzió:** Amikor egy jelölt állapota "Felvéve"-re vált, egyetlen kattintással átemelhető az Onboarding munkafolyamatba munkavállalóként.

## 4. UI Állapotok és Biztonság
- **Publikus izoláció:** A `/karrier/[id]` útvonal nem igényel autentikációt, de szigorú Rate Limiting és CAPTCHA / botvédelem alatt áll.
- **Side-Sheet előnézet:** A jelentkező CV-je közvetlenül a profil sheet-en belül beágyazva megtekinthető letöltés nélkül.
