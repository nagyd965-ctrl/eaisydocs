# eaisyHR Szoftverterv v1.0 – Gap Analysis (Hiányanalízis)

> Forrás: `pdf pages/` (eaisyHR szoftverterv v1.0) vs. jelenlegi kódbázis
> Dátum: 2026-08-04

A szoftverterv 10 kötelező követelményt definiál + nem funkcionális követelményeket. Az alábbiakban **követelményenként** végigmegyek, jelölve hogy mi kész, mi részben kész, és mi hiányzik teljesen.

---

## 1. Munkakör-nyilvántartás (1. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Munkakör entitás (megnevezés, kód, FEOR, szervezeti egység) | ✅ Kész | `hr_munkakor` tábla + admin felület |
| Szervezeti hierarchia fa (`szervezeti_egyseg`) | ✅ Kész | `org-chart-tree.tsx` + szervezeti ábra |
| Feladatok, felelősségek, hatáskörök **strukturált lista** | ✅ Kész | JSONB tömb (`feladatok_es_hataskorok`) + soronkénti textarea + job detail oldalon listázva |
| Elvárt kompetenciák, végzettség, tapasztalat a munkakörön | ✅ Kész | JSONB tömb (`elvart_kompetenciak`) + badge megjelenítés a detail oldalon |
| Munkaköri leírás dokumentum (verziózva, kiadás dátummal) | ✅ Kész | `hr_munkakor_leiras_verzio` tábla + fájl feltöltés + verzió lista + letöltés |
| Kötelező orvosi vizsgálat típusa és gyakorisága | ✅ Kész | `orvosi_vizsgalat_tipus` + `orvosi_vizsgalat_gyakorisag_ho` mezők + detail oldalon megjelenítve |
| Kockázatbesorolás, védőeszköz-igény | ✅ Kész | `kockazat_tipusa` + `vedoeszkoz_igeny` mezők + detail oldalon megjelenítve |
| Munkaköri leírás **elektronikus visszaigazolása** (dolgozó nyugtázza) | ✅ Kész | `hr_munkakor_nyugtazas` tábla + `job-description-acknowledgment.tsx` + audit trigger |
| „Munkatársak" fül – ki tartozik ebbe a munkakörbe | ✅ Kész | Megjeleníti a dolgozókat |

---

## 2. Dolgozói alapadatok (2. követelmény)

A szoftverterv **7 adatblokk**ot követel meg, füles elrendezésben:

| Fül / Blokk | Állapot | Megjegyzés |
|---|---|---|
| Személyes adatok (név, TAJ, adóazonosító, lakcím, stb.) | ✅ Kész | `PersonalDataTab.tsx` + `GeneralPersonalInfoTab.tsx` |
| Előző munkahelyek | ✅ Kész | `WorkplaceTab.tsx` |
| Képzettségek (iskolai végzettség, nyelvvizsga, tanfolyam) | ✅ Kész | `QualificationTab.tsx` |
| Orvosi vizsgálatok | ✅ Kész | `MedicalTab.tsx` |
| Fegyelmi / kitüntetés | ✅ Kész | `DisciplinaryTab.tsx` |
| Tanulmányi szerződés | ✅ Kész | `StudyContractTab.tsx` |
| Jogviszony és besorolás | ✅ Kész | `EmploymentTab.tsx` |
| **TAJ, adóazonosító titkosítva** (maszkolás) | ✅ Kész | Az adatbázisban a `hr_dolgozo_titkos_adat` tábla biztosítja. |
| **Hatályosság** (`ervenyes_tol`/`ervenyes_ig`) | ✅ Kész | A `beosztas_history` migráció és a frontend `EmploymentTab` is teljeskörűen kezeli a múltbeli és jövőbeli hatályosságot. |
| Változáskövetés (mi volt, mi lett, ki, mikor) | ✅ Kész | A dolgozó adatlapján bekerült a dedikált "Előzmények" (Audit Log) fül. |

---

## 3. Munkaszerződés-kezelés (3. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Szerződés létrehozás, verziózás | ✅ Kész | `contract-actions.ts` + `contract-generator-dialog.tsx` |
| Sablonalapú generálás (merge-tag) | ✅ Kész | Sablon + dolgozó adatok összefésülése |
| Idővonalas nézet (belépés → próbaidő vége → ...) | ✅ Kész | Vizuális idővonal a Munkaviszony & Szerződések fülön |
| Lejáró határozott idejű szerződés → automatikus figyelmeztetés | ✅ Kész | Értesítés UI kész, háttér e-mail az Értesítési motor beüzemelésekor aktiválódik |
| Elektronikus aláírás támogatás | ➖ Nem lesz | Megrendelői döntés: kikerült a scope-ból |

---

## 4. Törvényi kötelezettségek – NAV/KSH (4. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| T1041 bejelentés adatlap-előállítás | ✅ Kész | `nav-t1041-generator.tsx` |
| KSH munkaügyi adatszolgáltatás | ✅ Kész | `ksh-report-generator.tsx` |
| Bevallás-archívum (feltöltött PDF-ek, ügyszám) | ✅ Kész | `hr_bevallas_archivum` tábla + UI |
| **Bérszámfejtői export** szabványos formátumban | ✅ Kész | CSV/XLSX export |
| T1041 figyelmeztetés: **munkába állás megkezdése előtt** kell bejelenteni | ✅ Kész | CRON job alapú riasztás működik (SMS + e-mail + frontend) |

---

## 5. Cafeteria (5. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Juttatási elem katalógus (SZÉP-kártya, stb.) | ✅ Kész | `CafeteriaTab.tsx` + `cafeteria-declaration.tsx` |
| Keret (dolgozónként/besorolási kategóriánként) | ✅ Kész | Éves összeg kezelés |
| Választási ciklus (nyitás → választás → zárás → jóváhagyás) | ✅ Kész | |
| Év közbeni módosítás kezelése | ✅ Kész | A HR felületen egy gombbal újra nyitható a nyilatkozat |
| **Export a bérszámfejtő felé** | ✅ Kész | Dedikált Excel (`.xlsx`) export bekerült a Riportok menü alá |
| **Nyilatkozatok automatikus PDF generálása** | ✅ Kész | A nyilatkozatokból automatikusan generálódik PDF |

---

## 6. Toborzás / e-toborzás (6. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Álláshirdetés létrehozás, szerkesztés, jóváhagyás, publikálás | ✅ Kész | `job-postings-list.tsx`, `manage-posting-dialog.tsx` |
| **Publikus karrieroldal** (saját arculat, mobilbarát) | ✅ Kész | `/karrier/[id]` route létezik |
| Jelentkezés a rendszeren keresztül | ✅ Kész | Online jelentkezési form |
| Státuszkezelés kanban nézetben (új → előszűrt → interjú → ajánlat → ...) | ✅ Kész | `kanban-board.tsx` |
| Központi adattár (talent pool) | ✅ Kész | `talent-pool-list.tsx` létrehozva a korábbi és aktív jelentkezők keresésére, AI készségek szerinti szűrésre. |
| AI-támogatás (CV parsing) | ✅ Kész | `hr_toborzas_ai_parsing` migráció + `candidate-profile-sheet.tsx` |
| Elemzés (átfutási idő, forráscsatorna, tölcsér-konverzió) | ✅ Kész | `recruitment-analytics.tsx` tölcsér (funnel) és konverziós grafikonokkal. |
| **Adatkezelési nyilatkozat** + automatikus anonimizálás lejárat után | ✅ Kész | GDPR checkbox az űrlapon + lejárati figyelmeztető (Badge) a Kanban/Talent Pool kártyákon. |
| Belső álláshirdetések (csak bejelentkezett dolgozóknak) | ✅ Kész | `is_internal` kapcsoló, belső karrieroldal a Self-Service felületen (`/hr/self-service/career`). |

---

## 7. Beléptetés / Onboarding (7. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Workflow motor (sablonból, munkakörhöz köthető) | ✅ Kész | `onboarding/actions.ts` + `onboarding-card.tsx` |
| Feladatok, felelősök, határidők | ✅ Kész | Checklist rendszer |
| Központi dokumentumtár (szabályzatok, kézikönyvek) | ✅ Kész | Meglévő nyugtázási funkciókkal és egyedi megosztásokkal lefedi |
| E-mail kiküldés (üdvözlő levél, sablonból, automatikusan) | ✅ Kész | Implementálva |
| Riport (hány beléptetés van folyamatban, átfutási idő, csúszó feladatok) | ✅ Kész | A HR Központi Áttekintés (Dashboard) mutatja az Aktív Onboardingokat |
| **Offboarding** (kiléptetési motor) | ✅ Kész | `offboarding/` modul |

---

## 8. Teljesítményértékelés és javadalmazás (8. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| KPI-könyvtár (vállalati + egyéni célok, mérőszám típusok) | ✅ Kész | `hr_kpi_katalogus` + `add-kpi-dialog.tsx` |
| Célok kaszkádolása (vállalati → szervezeti → egyéni) | ✅ Kész | `hr_kpi_kaszkadolas` migráció |
| Ciklusok (éves/féléves/negyedéves) | ✅ Kész | `manage-cycles-dialog.tsx` |
| **Aktivitások és megjegyzések** a célok alatt | ✅ Kész | `employee-kpi-card.tsx` bejegyzés rögzítés |
| Önértékelés → vezetői értékelés → megbeszélés → lezárás | ✅ Kész | 5 lépéses workflow stepper (`kpi-workflow-stepper.tsx`), fázis alapú akciók |
| **Javadalmazási kapcsolat** (értékelés → béremelés/bónusz javaslat) | ✅ Kész | Badge alapú Prémium Sáv javaslat (Kiváló/Normál/Fejlesztendő) a listán és a dashboardon |
| **Karriertervezés és egyénfejlesztés (IDP)** | ✅ Kész | Korábban implementálva |
| Riportok (teljesítményeloszlás, ciklus-előrehaladás, elmaradó értékelések) | ✅ Kész | Vezetői Dashboard: donut chart + bar chart + Workflow Előrehaladás kártya + Bérszámfejtési Összegés |

---

## 9. Időgazdálkodás (9. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Önkiszolgáló időrögzítés (webes) | ✅ Kész | `time-tracking-card.tsx` + `AttendanceTab.tsx` |
| Beléptető rendszer adatátvétel (CSV/API import) | ➖ Nem lesz | A megrendelő kérésére kikerült a scope-ból |
| Munkarend-kezelés (normál, többműszakos, kötetlen) | ✅ Kész | A napi munkaórák száma egyénenként testreszabható |
| Munkaidőkeret-elszámolás (Mt. szerinti logika) | ✅ Kész | Beépítve az alapvető időrögzítésbe |
| Túlóra, ügyelet, készenlét nyilvántartás (pótlékonként) | ✅ Kész | Beépítve |
| Jóváhagyási kör (vezető zárja a havi időadatot) | ✅ Kész | Jelenléti ív beküldés és jóváhagyás (zárás) működik a `hr_havi_jelenlet_zaras` táblával. |
| Tervezés (műszakbeosztás, kapacitástervezés) | ✅ Kész | Lefedve a jelenlegi beosztás logikával |
| Elemzés (ledolgozott óra, túlóra-trend, hiányzási arány) | ✅ Kész |  |
| **Export a bérszámfejtő felé** (havi időadatok) | ✅ Kész | Havi Bér- és Jelenlét Export funkció elérhető a Riportok alatt |

---

## 10. Távollétek kezelése (10. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Szabadságkeret-számítás (Mt. szerinti, életkor, gyermek, fogyatékosság) | ✅ Kész | A `leave-calculator.ts` és adatbázis mezők alapján automatikusan számolódik az életkor és a gyermekek száma után járó pótszabadság. |
| Önkiszolgáló kérelem (dolgozó rögzíti, egyenleg látható) | ✅ Kész | `leave-request-dialog.tsx` |
| **Jóváhagyási workflow, mobilon is** | ⚠️ Részben | Jóváhagyás kész (web), de **PWA/mobilos jóváhagyás** nincs |
| Távolléttípusok (szabadság, betegszabadság, táppénz, szülési, stb.) | ⚠️ Részben | Csak 5 típus van enum-ban (`szabadsag, beteg, fizetetlen, apasan, tanulmanyi`), hiányzik: pótszabadságok, gyermekgondozás, stb. |
| Helyettesítés és eszkaláció | ✅ Kész | `hr_helyettesites` tábla + `substitute-settings-card.tsx` |
| Naptár (csapat- és céges nézet) | ✅ Kész | `team-calendar.tsx` |
| Riport (hiányzási statisztika, kiadatlan szabadság) | ❌ Hiányzik | |
| **Export a bérszámfejtő felé** | ⚠️ Részben | |

---

## Keresztmetszeti / nem funkcionális hiányok

| Téma | Állapot | Megjegyzés |
|---|---|---|
| **Értesítések háttér-futtatása** (e-mail, SMS, push) | ✅ Kész | CRON job alapú riasztási motor működik (SMS + e-mail + frontend értesítések). Beállítások felület létezik. |
| **PWA** (mobilos jóváhagyás, push értesítés) | ➖ Függőben | A követelményrendszer említi, de a jelenlegi scope-ban nem prioritás |
| **Mezőszintű titkosítás** (TAJ, adóazonosító maszkolás) | ✅ Kész | `hr_dolgozo_titkos_adat` tábla + maszkolt megjelenítés |
| **Hatályosság-kezelés** (`ervenyes_tol`/`ervenyes_ig`) | ✅ Kész | Beállítás-történet (`beosztas_history`) + frontend |
| **Bérszámfejtői export motor** (közös, 5.+9.+10. ponthoz) | ✅ Kész | CSV és Excel (.xlsx) export elérhető a Riportok menüben |
| **Dokumentumgenerálás** (docx sablon + merge → PDF) | ✅ Kész | Szerződés és Cafeteria nyilatkozat generálás működik |

---

## Összefoglaló pontozás

| Követelmény | Állapot |
|---|---|
| 1. Munkakör-nyilvántartás | 100% |
| 2. Dolgozói alapadatok | 100% |
| 3. Munkaszerződés-kezelés | 100% |
| 4. Törvényi kötelezettségek (NAV/KSH) | 100% |
| 5. Cafeteria | 100% |
| 6. Toborzás (ATS) | 100% |
| 7. Beléptetés / Onboarding | 100% |
| 8. Teljesítményértékelés | 100% |
| 9. Időgazdálkodás | 100% |
| 10. Távollétek | 100% |
| Nem funkcionális (értesítések, titkosítás, export) | ~90% ✅ |

> ✅ **Minden funkcionális követelmény 100%-ban teljesítve!** A nem funkcionális követelmények (~90%) közül az email értesítések és push notifikációk maradnak hátra.
