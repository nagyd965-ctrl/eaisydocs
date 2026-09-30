# [Közös] Adatbázis Architektúra és Sémák (PostgreSQL / Supabase)

Az **eaisyDocs** és **eaisyHR** a Supabase által menedzselt PostgreSQL adatbázisra épül. A jogosultságkezelés szigorúan **adatbázis szinten (Row Level Security - RLS)** történik.

---

## 🗄️ Adatbázis Modulok Áttekintése (65 Valós PostgreSQL Tábla)

Az alábbi táblák a `supabase/migrations/` könyvtárban található 106 SQL migráció alapján validált, éles adatbázis struktúrát tükrözik:

### 1. [01. Iratkezelési Mag (Core Records Management)](./database/01-iratkezeles.md)
* `ugy` (Ügy / Dosszié csoport)
* `ugyirat` (Iktatott akta, gap-mentes iktatószámmal)
* `irat` (Bejövő, kimenő, belső irat; érkeztetőszám, minősítés, FTS keresővektor, pgvector embedding)
* `irat_fajl` (Csatolt fizikai fájlok: `storage_path`, `pdfa_path`, `sha256`, `ocr_szoveg`)
* `esemeny_naplo` (Szigorúan append-only audit napló, tiltott UPDATE/DELETE jogokkal)
* `feladat` (Ügyintézői határidős teendők)
* `ugyirat_hozzaferes` (Ügyiratszintű explicit felhasználói hozzáférés-megosztás)
* `ugyirat_sablon` (Gyakori ügyirattípusok metaadat sablonjai)
* `iktatoszam_allokacio` (Évenkénti és prefixenkénti tranzakciós számláló)
* `ugyszam_allokacio` (Ügyszám allokációs számláló)
* `ai_feladat_sor` (Aszinkron háttér OCR és Gemini LLM feldolgozási sor)
* `mentett_kereses` (Mentett keresési szűrők és értesítési feltételek)
* `ertesitesi_szabaly` és `ertesites_naplo` (Belső riasztások és kiértékelt értesítések)

### 2. [02. Irattár és Selejtezés (Archive & Disposal)](./database/02-archivalas-selejtezes.md)
* `irattari_terv` (Irattári tételszámok, megőrzési idők, selejtezhetőség és levéltári átadás szabályai)
* `selejtezes_csomag` (Selejtezési javaslat és jegyzőkönyv, 4-szem jóváhagyási RLS védelemmel)
* `selejtezes_tetel` (A selejtezési csomagba felterjesztett ügyiratok tételei)
* `irat_fizikai_hely` (Papíralapú példányok pontos koordinátái: épület, helyiség, polc, doboz)
* `irat_kolcsonzes_naplo` (Fizikai dossziék kikérésének, határidejének és visszavételének láncolata)
* `helyettesites` (eaisyDocs iratkezelési helyettesítési megbízások dátumintervallummal)

### 3. [03. HR és Munkaügy (eaisyHR)](./database/03-hr-ber.md)
* `felhasznalo_profil` (Központi felhasználói adatok, `docs_szerepkor`, `hr_szerepkor`, `max_minosites`, `szervezeti_egyseg_id`)
* `hr_dolgozo_adatlap` (Munkavállaló személyi törzsadatok, lakcím, munkakör, jogviszony, felettes)
* `hr_dolgozo_titkos_adat` (Titkosított BYTEA mezők: TAJ, adóazonosító, bankszámla, bruttó/nettó bér; kizárólag `get_decrypted_hr_data` RPC-n keresztül elérhető)
* `hr_munkakor` és `hr_munkakor_leiras_verzio` (Munkaköri leírások, védőeszköz-igények, verziók)
* `hr_jogviszony` és `hr_beosztas` (Munkaviszony típusok, FTE munkaidő, munkaidőkeret)
* `hr_jelenlet` (Napi csekkolások, tervezett és tényleges munkaidő)
* `hr_havi_jelenlet_zaras` (Havi jelenléti ív lezárási és vezetői jóváhagyási munkafolyamat)
* `hr_tulora_egyenleg` és `hr_tulora_felhasznalás` (Perc alapú túlóra egyenleg és lecsúsztatási/kifizetési kérelmek)
* `hr_munkaszuneti_nap` (Ünnepnapok, áthelyezett munkanapok és pihenőnapok)
* `hr_tavollet` és `hr_szabadsag_egyenleg` (Szabadságkérelmek, betegszabadság, éves keretek)
* `hr_helyettesites` (eaisyHR vezetői és jóváhagyási helyettesítések)
* `hr_orvosi_vizsgalat` (Foglalkozás-egészségügyi alkalmasságik lejárati figyeléssel)
* `hr_onboarding`, `hr_onboarding_feladat` (Beléptetési ellenőrzőlisták és eszközök)
* `hr_offboarding`, `hr_offboarding_feladat` (Kiléptetési folyamatok, elszámolás, letiltások)
* `hr_kilepes_interju` (Kilépő interjúk strukturált kérdőíve)
* `hr_allashirdetes` (Publikus és belső állásajánlatok, karrierportál)
* `hr_toborzas` (ATS jelöltek követése, AI önéletrajz-elemzés, SMS értesítés kérés)
* `hr_kpi_katalogus`, `hr_teljesitmeny_ciklus`, `hr_teljesitmeny` (Teljesítményértékelési célok és ciklusok)
* `hr_fejlesztesi_terv`, `hr_fejlesztesi_cel`, `hr_idp_megjegyzes` (Egyéni fejlesztési tervek - IDP)
* `hr_cafeteria_elem`, `hr_cafeteria_nyilatkozat` (Cafeteria keretek és éves dolgozói nyilatkozatok)
* `hr_munkaugyi_ertesito` és `hr_esemeny_naplo` (Munkaügyi audit napló és lejárati figyelmeztetések)
* `hr_bevallas_archivum` (NAV T1041 és KSH havi munkaügyi jelentés exportok)

### 4. [04. Partnertörzs és Integrációk](./database/04-partnerek-integracio.md)
* `partner` (Ügyfelek, beszállítók, hatóságok: `nev`, `adoszam`, `cegjegyzekszam`)
* `irat_kapcsolat` (Polimorf link tábla iratok és külső objektumok között: `entitas_tipus`, `entitas_id`, `entitas_forras`, `kapcsolat_tipusa`)
* `szervezeti_egyseg` (Vállalati osztályok hierarchiája: `nev`, `kod`, `szulo_id`, `vezeto_id`)

---

## 🛡️ Adatbázis Szintű Biztonsági Alapelvek

1. **Négy-Dimenziós Láthatóság (ABAC/RBAC RLS):**
   Egy felhasználó kizárólag akkor láthat egy iratot vagy ügyiratot az adatbázisból, ha megfelel a négy dimenzió metszetének:
   * **Szervezeti egység (Department):** A felhasználó saját osztályának iratai (`ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id`).
   * **Biztonsági minősítés (Clearance):** Az irat szintje nem haladhatja meg a felhasználó szintjét (`irat.minosites <= fp.max_minosites`), kivéve `admin`.
   * **Szerepkör (Role):** `docs_szerepkor` (`admin`, `iktato`, `vezeto`, `ugyintezo`, `betekinto`, `auditor`).
   * **Explicit hozzáférés:** `ugyirat_hozzaferes` tábla szerinti megosztás vagy felelősi kijelölés.

2. **Audit Integritás (`esemeny_naplo` és `hr_esemeny_naplo`):**
   - Az audit táblákból adatbázis szinten meg van vonva az `UPDATE` és `DELETE` jogosultság (szigorú append-only naplózás).
   - Triggerek automatikusan naplózzák a státuszváltásokat és törléseket.

3. **Titkosított Érzékeny Adatok:**
   - A személyes azonosítók és béradatok titkosított BYTEA mezőkben tárolódnak (`hr_dolgozo_titkos_adat`).
   - A desifrírozás kizárólag Postgres Security Definer függvényen (`get_decrypted_hr_data`) keresztül történik, amely szigorúan ellenőrzi a hívó HR szerepkörét vagy az önkiszolgáló hozzáférést.
