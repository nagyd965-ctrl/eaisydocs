# A-085: [HR] eaisyHR Többcéges Adatperzisztencia, Adatbázis-séma Szinkron és Keresztmodulos Dosszié-feloldás Megerősítés

**Status:** Decided  
**Date:** 2026-10-27  
**Scope:** [HR] [Közös]  
**Author:** Antigravity AI  
**Kapcsolódó PRD:** [P-116](../../product/decisions/P-116-eaisyhr-deep-analysis-ux-and-workflow-hardening.md)  
**Kapcsolódó Kód:** `src/app/hr/compliance/compliance-actions.ts`, `src/app/hr/onboarding/actions.ts`, `src/app/hr/offboarding/actions.ts`, `src/app/hr/payroll/actions.ts`, `src/app/hr/reports/actions.ts`, `src/app/hr/actions/t1041-actions.ts`, `src/app/hr/actions/idp-actions.ts`, `src/app/hr/attendance-actions.ts`, `src/app/hr/self-service/actions.ts`, `src/app/karrier/[id]/actions.ts`  

---

## 1. Context (Kontextus)

Az eaisyHR modul élő bemutatója (demó) előtti teljes körű kód- és adatbázis-mélyelemzés ([docs/eaisyhr-deep-analysis-javitasi-terv.md](../../eaisyhr-deep-analysis-javitasi-terv.md)) több olyan adatbázis-séma eltérést, többcéges (`company_id`) mentési hiányosságot és lekérdezési pontatlanságot tárt fel, amelyek csak több vállalat használata vagy teljes életciklus-tesztelés során jelentkeztek:

1. **PostgREST oszlop- és reláció-eltérések:**
   - A `getCompanyLeaveComplianceData` a `hr_tavollet` táblából egy nem létező `indoklas` mezőt kért le, ami PostgREST hibát okozott.
   - A `t1041-actions.ts` és `onboarding-job-actions.ts` a `felhasznalo_profil` táblából nem létező `munkakor` és `reszleg` oszlopokat próbált lekérdezni.
   - Az IDP tanúsítvány jóváhagyás (`approveDevelopmentGoal`) a `hr_dokumentum` táblába nem létező `cim, tipus, fajl_utvonal, feltolto_id` mezőnevekkel próbált beszúrni a valós `dolgozo_id, nev, kategoria, url, company_id` helyett.
   - A születési dátum egyes helyeken `szuletesi_datum`, másutt `szuletesi_ido` oszlopnéven szerepelt a `hr_dolgozo_adatlap` táblában.
2. **Többcéges (`company_id`) perzisztencia hiányosságok:**
   - A manuális beléptetés (`createManualOnboarding`), publikus karrieroldali jelentkezés (`submitApplication`), álláshirdetés-létrehozás (`ManagePostingDialog`), napi első becsekkolás (`toggleCheckIn`), jelenlét-korrekció jóváhagyás (`handleAttendanceCorrectionApproval`), HR általi szabadságrögzítés (`hrSubmitLeaveRequest`), T1041 mentés (`saveT1041Record`), Cafeteria nyilatkozat (`submitCafeteriaDeclaration`) és több `hr_esemeny_naplo` bejegyzés nem mentette el az aktív `company_id`-t.
3. **Jogviszony deduplikáció és szervezeti egység feloldás:**
   - A bérszámfejtés (`/hr/payroll`) és a riportok (`/hr/reports`) csak a Docs-os `szervezeti_egyseg` táblát töltötték be a `hr_szervezeti_egyseg` helyett, és több `hr_jogviszony` rekord esetén nem deduplikáltak `dolgozo_id` szerint.
4. **Offboarding ön-kitiltás (Self-Ban) és személyi dosszié archiválás:**
   - A `closeOffboarding` nem létező `ugyirat.dolgozo_id` oszlopon próbálta archiválni a személyi dossziét az `irat_kapcsolat` (`findEmployeeDossier`) polimorf híd helyett, továbbá saját felhasználón tesztelve 100 évre letiltotta volna a bejelentkezett tesztelőt a Supabase Auth-ból.

---

## 2. Decision (A Meghozott Döntés)

1. **Szigorú PostgREST Séma- és Reláció-igazítás:**
   - Eltávolítottuk a nem létező oszlopokat (`hr_tavollet.indoklas`, `felhasznalo_profil.munkakor/reszleg`), és minden munkakör/FEOR/részleg feloldást az aktív `hr_jogviszony -> hr_beosztas -> hr_munkakor` láncolatra, valamint a `hr_szervezeti_egyseg` relációra állítottunk át.
   - A születési dátumot minden PDF generátorban (`medical-sheet-pdf-generator.ts`, `disciplinary-pdf-generator.ts`, `study-contract-pdf-generator.ts`) és akcióban `adatlap.szuletesi_datum || adatlap.szuletesi_ido` fallbackkel olvassuk, mentéskor pedig mindkét oszlopot szinkronban frissítjük.
2. **Teljes Körű `company_id` Perzisztencia:**
   - Minden HR tranzakciós és naplózó beszúrás (`hr_onboarding`, `hr_toborzas`, `hr_allashirdetes`, `hr_jelenlet`, `hr_tavollet`, `hr_t1041_bejelentes`, `hr_cafeteria_valasztas`, `hr_dokumentum`, `hr_esemeny_naplo`) kötelezően megkapja az aktív vagy a cél-entitásból feloldott `company_id` értéket.
   - Manuális beléptetésnél (`createManualOnboarding`), ha megadtak e-mail címet, a rendszer létrehoz egy háttér `hr_toborzas` (`statusz: "elfogadva"`) rekordot és összeköti a `hr_onboarding.toborzas_id` mezővel, így a későbbi `activateOnboardingAccount` zökkenőmentesen felépíti a felhasználói fiókot.
3. **Aktív Jogviszony Prioritás és Deduplikáció:**
   - A `hr_jogviszony` lekérdezések `.order("kilepes_datuma", { ascending: false, nullsFirst: true }).order("belepes_datuma", { ascending: false })` rendezést kaptak, a feldolgozó ciklusok pedig `seenDolgozoIds` (`Set<string>`) segítségével garantálják, hogy minden dolgozó pontosan egyszer, a legfrissebb aktív jogviszonyával szerepeljen a bérszámfejtésben és a KSH/T1041 riportokban.
4. **Offboarding Self-Ban Védelem és Polimorf Dosszié-archiválás:**
   - A `closeOffboarding` ellenőrzi az `offboarding.dolgozo_id === user.id` feltételt, és saját fiók esetén kihagyja a `hr_szerepkor: "inaktiv"` és a Supabase Auth `ban_duration: '876000h'` műveletet.
   - A személyi dosszié archiválása (`statusz: "irattarban"`) és újranyitása (`statusz: "iktatva"`) a `findEmployeeDossier` (`irat_kapcsolat`) segédfüggvényen keresztül történik.

---

## 3. Consequences (Következmények)

**Pozitív:**
- Bármely vállalat (`Think AI Kft.`, `Teszt Kft.`, vagy újonnan létrehozott cég) alatt indított HR folyamat, jelentkezés, jelenlét, szabadság, riport és audit napló maradéktalanul megjelenik a cégre szűrt nézetekben.
- Megszűntek a rejtett PostgREST oszlophiányok miatti üres táblázatok és sikertelen dokumentum-rögzítések.
- A kiléptetés végleges lezárása biztonságosan tesztelhető saját adminisztrátori fiókon is.

**Kockázat / Kompromisszum:**
- A `szuletesi_datum` és `szuletesi_ido` oszlopok párhuzamos karbantartása a `hr_dolgozo_adatlap` táblában minimális redundanciát jelent, de garantálja a visszamenőleges kompatibilitást minden meglévő lekérdezéssel és PDF sablonnal.
