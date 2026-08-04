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
| Feladatok, felelősségek, hatáskörök **strukturált lista** | ❌ Hiányzik | Jelenleg szabadszöveges mező. A szoftverterv szerint "strukturált listaként, nem egyetlen szabadszöveges mezőben" kell tárolni |
| Elvárt kompetenciák, végzettség, tapasztalat a munkakörön | ⚠️ Részben | Mezők léteznek, de nincs strukturált lista (pl. több kompetencia hozzárendelése) |
| Munkaköri leírás dokumentum (verziózva, kiadás dátummal) | ⚠️ Részben | Fájl csatolható, de nincs verziókövetés a leírásra |
| Kötelező orvosi vizsgálat típusa és gyakorisága | ❌ Hiányzik | Nincs munkakör ↔ orvosi vizsgálat kötés |
| Kockázatbesorolás, védőeszköz-igény | ❌ Hiányzik | Nincs ilyen mező a munkakörön |
| Munkaköri leírás **elektronikus visszaigazolása** (dolgozó nyugtázza) | ⚠️ Részben | `job-description-acknowledgment.tsx` létezik, de a PDF tegnap naplózást, időbélyeget és munkajogi bizonyítékot említ |
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
| **TAJ, adóazonosító titkosítva** (maszkolás) | ❌ Hiányzik | A szoftverterv szerint maszkolva kell megjeleníteni ("**** 4821"), felfedéshez külön kattintás + naplóbejegyzés kell |
| **Hatályosság** (`ervenyes_tol`/`ervenyes_ig`) | ⚠️ Részben | A `beosztas_history` migráció létezik, de a frontend nem kezeli a "mi volt az állapot X napon" lekérdezést |
| Változáskövetés (mi volt, mi lett, ki, mikor) | ⚠️ Részben | Audit napló van, de nincs dedikált "változási előzmények" felület a dolgozó adatlapján |

---

## 3. Munkaszerződés-kezelés (3. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Szerződés létrehozás, verziózás | ✅ Kész | `contract-actions.ts` + `contract-generator-dialog.tsx` |
| Sablonalapú generálás (merge-tag) | ✅ Kész | Sablon + dolgozó adatok összefésülése |
| Idővonalas nézet (belépés → próbaidő vége → ...) | ⚠️ Részben | Szerződések listázva vannak, de nincs vizuális idővonal |
| Lejáró határozott idejű szerződés → automatikus figyelmeztetés | ⚠️ Részben | Értesítés UI kész, háttér e-mail küldés **nem fut** |
| Elektronikus aláírás támogatás | ❌ Hiányzik | A szoftverterv opcionálisnak jelöli, de említi |

---

## 4. Törvényi kötelezettségek – NAV/KSH (4. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| T1041 bejelentés adatlap-előállítás | ✅ Kész | `nav-t1041-generator.tsx` |
| KSH munkaügyi adatszolgáltatás | ✅ Kész | `ksh-report-generator.tsx` |
| Bevallás-archívum (feltöltött PDF-ek, ügyszám) | ✅ Kész | `hr_bevallas_archivum` tábla + UI |
| **Bérszámfejtői export** szabványos formátumban | ✅ Kész | CSV/XLSX export |
| T1041 figyelmeztetés: **munkába állás megkezdése előtt** kell bejelenteni | ❌ Hiányzik | Nincs automatikus figyelmeztetés, hogy a belépés előtt kelljen bejelenteni |

---

## 5. Cafeteria (5. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Juttatási elem katalógus (SZÉP-kártya, stb.) | ✅ Kész | `CafeteriaTab.tsx` + `cafeteria-declaration.tsx` |
| Keret (dolgozónként/besorolási kategóriánként) | ✅ Kész | Éves összeg kezelés |
| Választási ciklus (nyitás → választás → zárás → jóváhagyás) | ✅ Kész | |
| Év közbeni módosítás kezelése | ❌ Hiányzik | Nincs dedikált "év közbeni korrekció" logika |
| **Export a bérszámfejtő felé** | ⚠️ Részben | Általános export van, de cafeteria-specifikus bérszámfejtő export nem biztos |
| **Nyilatkozatok automatikus PDF generálása** | ❌ Hiányzik | A `hianylista.md`-ben is említve |

---

## 6. Toborzás / e-toborzás (6. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Álláshirdetés létrehozás, szerkesztés, jóváhagyás, publikálás | ✅ Kész | `job-postings-list.tsx`, `manage-posting-dialog.tsx` |
| **Publikus karrieroldal** (saját arculat, mobilbarát) | ✅ Kész | `/karrier/[id]` route létezik |
| Jelentkezés a rendszeren keresztül | ✅ Kész | Online jelentkezési form |
| Státuszkezelés kanban nézetben (új → előszűrt → interjú → ajánlat → ...) | ✅ Kész | `kanban-board.tsx` |
| Központi adattár (talent pool) | ⚠️ Részben | Jelentkezők megmaradnak, de nincs dedikált "talent pool" nézet/szűrés korábbi jelentkezőkre |
| AI-támogatás (CV parsing) | ✅ Kész | `hr_toborzas_ai_parsing` migráció + `candidate-profile-sheet.tsx` |
| Elemzés (átfutási idő, forráscsatorna, tölcsér-konverzió) | ❌ Hiányzik | Nincs toborzási analitika/riport |
| **Adatkezelési nyilatkozat** + automatikus anonimizálás lejárat után | ⚠️ Részben | `anonymize_cron.sql` migráció létezik, de a GDPR hozzájárulás UX nem világos |
| Belső álláshirdetések (csak bejelentkezett dolgozóknak) | ❌ Hiányzik | A szoftverterv külső + belső hirdetést is kér |

---

## 7. Beléptetés / Onboarding (7. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Workflow motor (sablonból, munkakörhöz köthető) | ✅ Kész | `onboarding/actions.ts` + `onboarding-card.tsx` |
| Feladatok, felelősök, határidők | ✅ Kész | Checklist rendszer |
| Központi dokumentumtár (szabályzatok, kézikönyvek) | ⚠️ Részben | Dokumentum nyugtázás kész (`dokumentum_nyugtazas`), de nincs dedikált "központi dokumentumtár" UI |
| E-mail kiküldés (üdvözlő levél, sablonból, automatikusan) | ❌ Hiányzik | Az e-mail küldés backend része nem fut |
| Riport (hány beléptetés van folyamatban, átfutási idő, csúszó feladatok) | ❌ Hiányzik | |
| **Offboarding** (kiléptetési motor) | ✅ Kész | `offboarding/` modul |

---

## 8. Teljesítményértékelés és javadalmazás (8. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| KPI-könyvtár (vállalati + egyéni célok, mérőszám típusok) | ✅ Kész | `hr_kpi_katalogus` + `add-kpi-dialog.tsx` |
| Célok kaszkádolása (vállalati → szervezeti → egyéni) | ✅ Kész | `hr_kpi_kaszkadolas` migráció |
| Ciklusok (éves/féléves/negyedéves) | ✅ Kész | `manage-cycles-dialog.tsx` |
| **Aktivitások és megjegyzések** a célok alatt | ✅ Kész | `employee-kpi-card.tsx` bejegyzés rögzítés |
| Önértékelés → vezetői értékelés → megbeszélés → lezárás | ⚠️ Részben | Értékelés létezik, de a "megbeszélés" lépés formalizálása nem egyértelmű |
| **Javadalmazási kapcsolat** (értékelés → béremelés/bónusz javaslat) | ❌ Hiányzik | Nincs automatikus bónusz/béremelési javaslat generálás az értékelésből |
| **Karriertervezés és egyénfejlesztés (IDP)** | ✅ Kész | Tegnap implementálva! |
| Riportok (teljesítményeloszlás, ciklus-előrehaladás, elmaradó értékelések) | ❌ Hiányzik | Nincs dedikált teljesítmény riport |

---

## 9. Időgazdálkodás (9. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Önkiszolgáló időrögzítés (webes) | ✅ Kész | `time-tracking-card.tsx` + `AttendanceTab.tsx` |
| Beléptető rendszer adatátvétel (CSV/API import) | ❌ Hiányzik | Nincs import funkció |
| Munkarend-kezelés (normál, többműszakos, kötetlen) | ⚠️ Részben | `muszak` mező létezik az `EmploymentTab`-ban, de nincs dedikált műszakbeosztó |
| Munkaidőkeret-elszámolás (Mt. szerinti logika) | ❌ Hiányzik | |
| Túlóra, ügyelet, készenlét nyilvántartás (pótlékonként) | ❌ Hiányzik | |
| Jóváhagyási kör (vezető zárja a havi időadatot) | ❌ Hiányzik | Nincs havi munkaidő lezárás/jóváhagyás |
| Tervezés (műszakbeosztás, kapacitástervezés) | ❌ Hiányzik | |
| Elemzés (ledolgozott óra, túlóra-trend, hiányzási arány) | ❌ Hiányzik | |
| **Export a bérszámfejtő felé** (havi időadatok) | ⚠️ Részben | Általános export van, de specifikus munkaidő export nem egyértelmű |

---

## 10. Távollétek kezelése (10. követelmény)

| Funkció | Állapot | Megjegyzés |
|---|---|---|
| Szabadságkeret-számítás (Mt. szerinti, életkor, gyermek, fogyatékosság) | ❌ Hiányzik | Jelenleg hardcoded `totalLeave = 25` a `self-service/page.tsx`-ben |
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
| **Értesítések háttér-futtatása** (e-mail, push) | ❌ Hiányzik | UI kész, de az Edge Function / CRON háttérfolyamatok nem futnak |
| **PWA** (mobilos jóváhagyás, push értesítés) | ❌ Hiányzik | A 10. követelmény kötelezővé teszi |
| **Mezőszintű titkosítás** (TAJ, adóazonosító maszkolás) | ❌ Hiányzik | `pgcrypto` kellene + felületen maszkolt megjelenítés |
| **Hatályosság-kezelés** (`ervenyes_tol`/`ervenyes_ig`) | ⚠️ Részben | DB séma részben kész, frontend nem kezeli |
| **Bérszámfejtői export motor** (közös, 5.+9.+10. ponthoz) | ⚠️ Részben | Általános export van, de nincs egységes, konfigurálható export-motor |
| **Dokumentumgenerálás** (docx sablon + merge → PDF) | ⚠️ Részben | Szerződés generálás kész, de nincs általános sablon-motor |

---

## Összefoglaló pontozás

| Követelmény | Készültség |
|---|---|
| 1. Munkakör-nyilvántartás | ~70% |
| 2. Dolgozói alapadatok | ~80% |
| 3. Munkaszerződés-kezelés | ~75% |
| 4. Törvényi kötelezettségek (NAV/KSH) | ~85% |
| 5. Cafeteria | ~70% |
| 6. Toborzás (ATS) | ~75% |
| 7. Beléptetés / Onboarding | ~70% |
| 8. Teljesítményértékelés | ~75% |
| 9. Időgazdálkodás | ~30% ⚠️ |
| 10. Távollétek | ~55% |
| Nem funkcionális (értesítések, PWA, titkosítás) | ~25% ⚠️ |

> **Legkritikusabb hiányok:**
> 1. **Időgazdálkodás (9.)** – csak az alapvető időrögzítés van kész, a többi (műszak, túlóra, munkaidőkeret, import, jóváhagyási kör) mind hiányzik
> 2. **Szabadságkeret-számítás (10.)** – hardcoded 25 nap, Mt. szerinti automatikus kalkuláció nincs
> 3. **Értesítési háttérfolyamatok** – az egész rendszerben nincs egyetlen e-mail sem, ami tényleg kimegy
> 4. **PWA / mobilos jóváhagyás** – kötelező követelmény, teljesen hiányzik
> 5. **Mezőszintű titkosítás** – TAJ/adóazonosító nincs maszkolva
