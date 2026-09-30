# [Közös] Információs Architektúra és Útvonal Térkép

Ez a dokumentum rögzíti az **eaisyDocs** és **eaisyHR** alkalmazás éles, elérési útvonalait (Next.js 15 App Router a `src/app/` alatt), képernyőit, valamint a hozzájuk tartozó jogosultsági szinteket.

---

## 🗺️ Fő Menüstruktúra és Valós Útvonalak

### 1. Közös Vezérlés és Belépés
| Útvonal | Képernyő / Komponens | Hatókör | Jogosultság | Állapot |
|---|---|---|---|---|
| `/` | **Vezetői & Operatív Dashboard** (`DashboardOverview`, Recharts statisztikák, lejáró határidők, gyorsműveletek) | `[Közös]` | Minden bejelentkezett felhasználó | **Éles / Kész** |
| `/login` | **Bejelentkezés** (Email + jelszó alapú Supabase Auth) | `[Közös]` | Nyilvános | **Éles / Kész** |
| `/login/mfa-verify` | **Kétlépcsős Azonosítás (MFA)** (`MfaVerifyForm`, TOTP kód ellenőrzés) | `[Közös]` | Belépés alatt álló felhasználó | **Éles / Kész** |
| `/search` | **Összetett Kereső** (Magyar ékezetfüggetlen FTS + pgvector szemantikus hibrid keresés, mentett szűrők, riasztások) | `[Docs]` | Minden felhasználó (RLS szűréssel) | **Éles / Kész** |
| `/tasks` | **Feladatkezelő Munkaterület** (`KanbanBoard`, `TaskCalendar`, `TaskList`, felelősök, határidők) | `[Közös]` | Minden felhasználó | **Éles / Kész** |
| `/settings` | **Rendszerbeállítások Hub** (Szervezeti fa, felhasználók és szerepkörök, helyettesítés, TOTP 2FA, session timeout, audit napló) | `[Közös]` | Admin, Rendszergazda, Vezető | **Éles / Kész** |
| `/security-policy` | **Biztonsági Házirend és Compliance Export** (Rendszerbiztonsági audit jelentés letöltése) | `[Közös]` | Admin, Auditor | **Éles / Kész** |
| `/admin` | **Rendszeradminisztrátori Eszközök** (Adatbázis karbantartás, szerepkör-kezelés) | `[Közös]` | Csak Rendszergazda | **Éles / Kész** |

---

### 2. eaisyDocs – Iratkezelési és Irattári Modul
| Útvonal | Képernyő / Komponens | Hatókör | Jogosultság | Állapot |
|---|---|---|---|---|
| `/inbox` | **Bejövő Postafiók & Érkeztetés** (`InboxTableClient`, e-mail szinkron, kézi feltöltés, kötegelt szkenner elválasztólap, eaisyBill import) | `[Docs]` | Iktató, Admin, Vezető | **Éles / Kész** |
| `/inbox/[id]` | **Iktatási Képernyő (Split-view)** (`FilingPanelClient`, `DocumentPreviewFrame`, AI metaadat-javaslatok, előzmény-kapcsolás) | `[Docs]` | Iktató, Admin | **Éles / Kész** |
| `/inbox/view/[id]` | **Érkeztetett Irat Gyorselőnézet** (Dokumentum megtekintése döntéshez iktatás előtt) | `[Docs]` | Iktató, Admin, Vezető | **Éles / Kész** |
| `/dossiers` | **Iktatókönyv & Ügyiratlista** (`DossiersTableClient`, gap-mentes iktatószámok, határidős állapotok, szűrés) | `[Docs]` | Minden felhasználó (RLS szűréssel) | **Éles / Kész** |
| `/dossiers/[id]` | **Ügyirat Adatlap & Dosszié Munkalap** (Iratok, verziók, feladatok, belső megjegyzések, fizikai tárolás és kölcsönzés, explicit hozzáférés-megosztás, sablonok, audit idővonal) | `[Docs]` | Minden jogosult felhasználó | **Éles / Kész** |
| `/archive` | **Digitális Irattár & Selejtezés** (`ArchiveClient`, megőrzési idők, selejtezési javaslatok, szigorú 4-szem jóváhagyás) | `[Docs]` | Irattáros, Vezető, Admin | **Éles / Kész** |
| `/archive/print` | **Selejtezési és Átadási Jegyzőkönyv Nyomtatás** (Hivatalos szabványos nyomtatási nézet) | `[Docs]` | Irattáros, Vezető, Admin | **Éles / Kész** |
| `/partners` | **Központi Partnertörzs** (Partnerek listája, vevő/szállító típusok, adószám, duplikációvédelem) | `[Docs]` | Iktató, Ügyintéző, Vezető, Admin | **Éles / Kész** |
| `/partners/[id]` | **Partner 360° Adatlap** (Alapadatok, kapcsolódó ügyiratok és szerződések listája) | `[Docs]` | Iktató, Ügyintéző, Vezető, Admin | **Éles / Kész** |
| `/embed/partner-dossiers` | **Beágyazható Partner Dosszié Widget** (Fejléc nélküli iframe nézet külső CRM/ERP/eaisyBill rendszerek számára) | `[Docs]` | Beágyazó partner token alapján | **Éles / Kész** |

---

### 3. eaisyHR – Munkaügyi, Bér és Humánerőforrás Modul
| Útvonal | Képernyő / Komponens | Hatókör | Jogosultság | Állapot |
|---|---|---|---|---|
| `/hr` | **HR Kezdőlap & Dolgozói Műszerfal** (Létszám, státuszok, gyorsstatisztikák, dolgozók táblázata) | `[HR]` | HR Munkatárs, HR Vezető, Admin | **Éles / Kész** |
| `/hr/employee/[id]` | **Munkavállalói 360° Adatlap** (13 füles felület: Alapadatok, Titkosított személyi adatok, Beosztás-történet, Jelenlét, Szabadság, Orvosi alkalmassági, Képzés/IDP, Cafeteria, Fegyelmi, Munkahelyi eszközök, Tanulmányi szerződés, Audit napló) | `[HR]` | HR Munkatárs, HR Vezető, Bérszámfejtő | **Éles / Kész** |
| `/hr/time` | **Munkaidő & Jelenléti Mátrix** (`EmployeeTimesheet`, havi összesítés, túlórák, szabadságok, munkaszüneti napok, havi zárás) | `[HR]` | HR, Bérszámfejtő, Vezetők | **Éles / Kész** |
| `/hr/manager` | **Vezetői Jóváhagyási Műszerfal** (Beosztottak lezáratlan jelenléti ívei, szabadságkérelmek, túlóra-felhasználás jóváhagyása) | `[HR]` | Részlegvezető, HR Vezető, Admin | **Éles / Kész** |
| `/hr/recruitment` | **Toborzási ATS Központ** (Kanban csővezeték, jelentkezők állapota, automatikus CV parsing, interjú szervezés) | `[HR]` | HR Toborzó, HR Vezető | **Éles / Kész** |
| `/hr/onboarding` | **Beléptetési Folyamatok (Onboarding)** (Új belépők ellenőrzőlistái, IT/munkavédelmi eszközök átadása) | `[HR]` | HR, IT, Részlegvezető | **Éles / Kész** |
| `/hr/offboarding` | **Kiléptetési Folyamatok (Offboarding)** (Kilépő listák, eszközök visszavétele, kilépő interjú rögzítése) | `[HR]` | HR, IT, Részlegvezető | **Éles / Kész** |
| `/hr/performance` | **Teljesítményértékelés & KPI** (Értékelési ciklusok, célkitűzések, dolgozói értékelések felülvizsgálata) | `[HR]` | Részlegvezető, HR Vezető | **Éles / Kész** |
| `/hr/performance/dashboard` | **Teljesítmény Analitika Műszerfal** (KPI teljesülési grafikonok és részleg-összehasonlítások) | `[HR]` | Vezetőség, HR Vezető | **Éles / Kész** |
| `/hr/compliance` | **Munkaügyi Megfelelőség Hub** (Kötelező szabályzatok, munkaköri leírás elfogadások, oktatások nyomon követése) | `[HR]` | HR Compliance, Vezetők | **Éles / Kész** |
| `/hr/reports` | **Hatósági Riportok & Exportok** (NAV T1041 bejelentő generátor, KSH havi munkaügyi jelentés készítő) | `[HR]` | Bérszámfejtő, HR Vezető | **Éles / Kész** |
| `/hr/audit` | **HR Eseménynapló** (Különálló `hr_esemeny_naplo` audit trail, érzékeny adatmegtekintések) | `[HR]` | HR Vezető, Auditor, Admin | **Éles / Kész** |
| `/hr/settings` | **HR Rendszerbeállítások** (Értesítési szabályok, avatar feltöltés, munkaszüneti naptár) | `[HR]` | HR Vezető, Admin | **Éles / Kész** |
| `/hr/orgunit/[id]` | **Szervezeti Egység Adatlap** (Részleg dolgozói, felelős vezető, beosztások) | `[HR]` | HR Vezető, Részlegvezető | **Éles / Kész** |
| `/hr/job/[id]` | **Munkakör Adatlap** (Munkaköri leírás verziók, szükséges képesítések, védőeszközök) | `[HR]` | HR Vezető, Admin | **Éles / Kész** |

---

### 4. Dolgozói Önkiszolgáló Felületek (Self-Service) és Karrierportál
| Útvonal | Képernyő / Komponens | Hatókör | Jogosultság | Állapot |
|---|---|---|---|---|
| `/hr/self-service` | **Dolgozói Portál Kezdőlap** (Személyes egyenlegek, mai csekkolás, gyorshivatkozások) | `[HR]` | Bármely bejelentkezett munkavállaló | **Éles / Kész** |
| `/hr/self-service/time` | **Saját Munkaidő & Szabadság** (Napi be- és kicsekkolás, szabadságigénylés indítása) | `[HR]` | Saját munkavállaló | **Éles / Kész** |
| `/hr/self-service/profile` | **Saját Profil & Adatlap** (Személyes elérhetőségek megtekintése, jelszócsere) | `[HR]` | Saját munkavállaló | **Éles / Kész** |
| `/hr/self-service/benefits` | **Saját Cafeteria** (Éves keret felosztása, cafeteria nyilatkozat leadása és PDF letöltése) | `[HR]` | Saját munkavállaló | **Éles / Kész** |
| `/hr/self-service/career` | **Belső Karrier & Képzések** (Nyitott belső pozíciók, képzési előzmények) | `[HR]` | Saját munkavállaló | **Éles / Kész** |
| `/hr/self-service/goals` | **Saját Célok & KPI** (Kitűzött személyes célok állapota, önértékelés leadása) | `[HR]` | Saját munkavállaló | **Éles / Kész** |
| `/hr/self-service/idp` | **Egyéni Fejlesztési Terv (IDP)** (Fejlődési mérföldkövek, mentor visszajelzések) | `[HR]` | Saját munkavállaló | **Éles / Kész** |
| `/hr/self-service/dokumentumok`| **Saját HR Dokumentumok** (Munkaszerződés, aláírt nyilatkozatok letöltése) | `[HR]` | Saját munkavállaló | **Éles / Kész** |
| `/karrier` | **Publikus Karrierportál** (Aktív nyitott álláshirdetések SEO-optimalizált listája) | `[HR]` | Nyilvános (regisztráció nélkül) | **Éles / Kész** |
| `/karrier/[id]` | **Álláshirdetés & Jelentkezési Űrlap** (Pozíció részletei, PDF önéletrajz feltöltés, automatikus ATS beküldés) | `[HR]` | Nyilvános | **Éles / Kész** |

---

### 5. API és Háttér Végpontok (`src/app/api/`)
| Végpont | Funkció | Hatókör | Hitelesítés | Állapot |
|---|---|---|---|---|
| `/api/v1/ugyiratok` | **REST API v1** (Ügyiratok lekérdezése, új ügyirat és kezdőirat létrehozása) | `[Docs]` | Bearer Token / Supabase Session | **Éles / Kész** |
| `/api/v1/ugyiratok/[id]/eletciklus` | **REST API Életciklus** (Ügyirat lezárása, újranyitása, selejtezése) | `[Docs]` | Bearer Token | **Éles / Kész** |
| `/api/cron/imap` | **IMAP Szinkron Cron** (Bejövő e-mailek letöltése és érkeztetése) | `[Docs]` | `CRON_SECRET` Bearer Token | **Éles / Kész** |
| `/api/cron/morning` | **Reggeli Értesítő Cron** (Napi interjú SMS-ek kiküldése Twilio-n) | `[HR]` | `CRON_SECRET` Bearer Token | **Éles / Kész** |
| `/api/cron/nightly` | **Éjszakai Felügyeleti Cron** (Lejáró határidők, 3 napos vezetői eszkaláció, selejtezési figyelmeztetés, orvosi/próbaidő/szerződés lejárati értesítők) | `[Közös]` | `CRON_SECRET` Bearer Token | **Éles / Kész** |
| `/api/pdf/[id]` | **Biztonsági PDF Előnézet** (Minősítési szint ellenőrzés, vörös vízjelezés betekintőknek és bizalmas iratoknak) | `[Docs]` | Bejelentkezett felhasználói session | **Éles / Kész** |
| `/api/pdf/convert` | **PDF/A-2b Konvertálás** (Ghostscript aszinkron normalizáló végpont) | `[Docs]` | Szolgáltatás szintű hívás | **Éles / Kész** |
| `/api/scanner/separator-sheet` | **Elválasztólap PDF Generátor** (DOC-SPLIT vonalkódos elválasztólap letöltése) | `[Docs]` | Nyilvános / Bejelentkezett | **Éles / Kész** |
| `/api/hr/parse-cv` | **AI Önéletrajz Elemző** (Google GenAI strukturált adatkinyerés feltöltött PDF-ből) | `[HR]` | HR Munkatárs / Admin | **Éles / Kész** |
| `/api/hr/leave-pdf` | **Szabadságengedély PDF** (Nyomtatható engedély generálása Headless Chrome-mal) | `[HR]` | HR / Dolgozó | **Éles / Kész** |
| `/api/hr/cafeteria-pdf` | **Cafeteria Nyilatkozat PDF** (Nyilatkozat letöltése Headless Chrome-mal) | `[HR]` | HR / Dolgozó | **Éles / Kész** |
| `/api/send-email` | **Rendszer E-mail Küldés** (Nodemailer SMTP értesítő interfész) | `[Közös]` | Bejelentkezett felhasználó | **Éles / Kész** |

---

## 🔒 Szerepkör Mátrix és Hozzáférési Szintek

### eaisyDocs Jogosultságok (`felhasznalo_profil.docs_szerepkor`):
* **admin:** Teljes konfigurációs hozzáférés, felhasználókezelés, globális láthatóság minősítési korlát nélkül.
* **iktato:** Érkeztetés, AI adategyeztetés, iktatás, ügyiratszerkesztés, iktatókönyv karbantartása.
* **vezeto:** Szervezeti egység iratainak kezelése, szignálás, 4-szem selejtezési jóváhagyás.
* **ugyintezo:** Szignált vagy saját osztályához tartozó ügyek intézése, feladatok lezárása.
* **betekinto:** Kizárólag olvasási jog a szervezeti egységhez tartozó nyílt iratokra, vízjelezett PDF előnézettel.
* **auditor:** Globális olvasási jog és teljes hozzáférés az `esemeny_naplo` audit táblához.

### eaisyHR Jogosultságok (`felhasznalo_profil.hr_szerepkor`):
* **admin:** Teljes körű HR rendszerbeállítás, jogosultságok kiosztása.
* **hr_vezeto:** Teljes hozzáférés az összes munkavállalóhoz, béradatokhoz, jóváhagyásokhoz és riportokhoz.
* **hr_munkatars:** Dolgozók kezelése, toborzás, onboarding, jelenléti ívek kezelése.
* **reszlegvezeto:** Csak a közvetlen beosztottak adatainak, szabadságainak és jelenléti íveinek kezelése/jóváhagyása.
* **dolgozo:** Kizárólag saját önkiszolgáló portál (`/hr/self-service/*`) elérése.
