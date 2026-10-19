# PRD P-098: Dolgozói Önkiszolgáló Dokumentumaim Oldal és Profil Tisztítás UX [HR]

## Státusz
Elfogadva

## Kapcsolódó ADR
[A-074: Univerzális In-Place Dokumentum Megtekintés (DocumentViewer) és Önkiszolgáló Iratkezelési Architektúra](../../architecture/decisions/A-074-universal-document-viewer-and-employee-documents-architecture.md)

## Kontextus és Célok
A Dolgozói Portál korábbi felépítésében a munkavállalóhoz tartozó hivatalos iratok kizárólag a `Profilom` (`/hr/self-service/profile`) oldal alján elhelyezkedő `Legutóbbi Dokumentumaim` kártyán jelentek meg, szigorú 5 elemes korláttal (`.limit(5)`).
A rendszer valós használata és a részletes munkavállalói adatlap (`/hr/employee/[id]`) összevetése során világossá vált, hogy egy munkavállalónak (pl. Nagy Dánielnek már jelenleg is 12 db) több tucat hivatalos dokumentuma van (munkaszerződés, munkaköri leírás, havi jelenléti ívek, szabadság-nyilvántartás, orvosi alkalmassági vélemény, cafeteria nyilatkozat, tanulmányi szerződés, kitüntetések, NAV T1041 hatósági bejelentők).

A korábbi korlát miatt a friss bejelentések kitolták a listából az alapvető iratokat (pl. az eredeti munkaszerződést vagy orvosi papírt), így a dolgozó nem érte el a saját dokumentumait, továbbá hiányzott a keresési és kategória szerinti szűrési lehetőség.

## Termékkövetelmények és UX Módosítások

1. **Önálló „Dokumentumaim” oldal bevezetése a Dolgozói Portálban:**
   - **Útvonal:** `/hr/self-service/documents`
   - **Sidebar integráció:** A `Dolgozói Portál` csoportban a `Profilom` alá közvetlenül bekerült az új `Dokumentumaim` navigációs pont, amely minden dolgozói szerepkör számára elérhető.
   - **Kanonikus KPI sáv (ADR A-029):**
     - *Összes Irat* (pl. 12 db)
     - *Hivatalosan Iktatva* (eaisyDocs iktatószámmal ellátott iratok száma)
     - *Aláírt Példányok* (digitálisan/hitelesen aláírt példányok)
     - *Legutóbbi Irat* (legutóbbi keletkezési dátum és kategória)
   - **Kanonikus `TableToolbar` és Szűrés Popover (ADR A-029):**
     - Vízszintes pill-gombok helyett a platform egységes `TableToolbar` komponense (`src/components/table-toolbar/table-toolbar.tsx`).
     - **Bal oldalon:** Szöveges élő kereső (`Search` ikon, azonnali szűrés iratnévre, kategóriára vagy iktatószámra, törlő `X` gomb).
     - **Jobb oldalon:** Oszlopválasztó Popover (`Columns3`) és kiemelt zöld/teal **`Szűrés` Popover Gomb** aktív szűrőszámláló jelvénnyel.
     - **Szűrés Popover tartalma:** Naptári dátumintervallum szűrő, tematikus kategória jelölőnégyzetek élő darabszámokkal (Munkaszerződés, Jelenléti ív, Orvosi alkalmassági, Cafeteria, Munkavédelmi oktatás, Hatósági, Kitüntetések), valamint státuszkapcsolók (*Csak iktatott*, *Csak aláírt*).

2. **Idővonalas Kártyalista és Biztonságos Előnézet:**
   - A dokumentumok a vezetői nézethez illeszkedő, elegáns kártyás elrendezésben jelennek meg.
   - Zöld iktatószám jelvény (`Iktatva: HR/2026/00038/1`) és aláírási státuszjelvény (`Aláírt példány` vs `Tervezet`).
   - Létrehozás, iktatás és aláírás időbélyegei, valamint közvetlen hivatkozás az eaisyDocs személyi dossziéra (`/dossiers/[id]`).
   - Kettős műveleti gomb minden irat mellett:
     - **`Megtekintés`**: Megnyitja az egységes `DocumentViewer` modált vízjelezett, in-place PDF megjelenítővel és audit-naplózással.
     - **`Letöltés`**: Biztonságos helyi letöltés a `/api/hr/download-document` végponton keresztül.

3. **Profilom oldal letisztítása (B opció):**
   - A `/hr/self-service/profile` oldalról kivezetésre került a redundáns, limitált 5 elemes dokumentumdoboz.
   - A profiloldal 100%-ban tiszta, fókuszált munkavállalói adatlappá vált (személyes adatok, munkaköri leírás, munkavédelmi és orvosi érvényességek, titkosított azonosítók).
   - Javításra került a munkaviszony lekérdezés `.maybeSingle()` hibavédelme is.

## Érintett Komponensek
- `src/app/hr/self-service/documents/page.tsx`
- `src/components/hr/employee-documents-view.tsx`
- `src/components/hr-sidebar.tsx`
- `src/app/hr/self-service/profile/page.tsx`
- `src/components/document-viewer.tsx`
- `src/app/api/hr/download-document/route.ts`
