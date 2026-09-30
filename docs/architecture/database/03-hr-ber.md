# 👥 03. HR és Munkaügyi Adatbázis Séma (eaisyHR)

Ez a dokumentum rögzíti az eaisyHR modul adatbázis tábláit, pontos oszlopait és típusait a tényleges PostgreSQL migrációk alapján.

---

## 1. Dolgozói Törzs, Titkos Adatok és Szervezet

### `hr_dolgozo_adatlap`
Munkavállalói operatív személyi törzsadatok. A személy neve és fiókja a `felhasznalo_profil` táblához kapcsolódik.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs → `felhasznalo_profil.id` (1:1 reláció) |
| `munkakor_id` | uuid | ✓ | FK → `hr_munkakor.id` |
| `lakcim` | text | ✓ | Lakcím |
| `szuletesi_ido` | date | ✓ | Születési idő |
| `anyja_neve` | text | ✓ | Anyja leánykori neve |
| `belepes_datuma` | date | ✓ | Első belépés dátuma |
| `orvosi_alkalmassag_ervenyesseg` | date | ✓ | Foglalkozás-egészségügyi érvényesség |
| `created_at` | timestamptz | — | Rekord létrehozása (`NOW()`) |

### `hr_dolgozo_titkos_adat` (Titkosított Személyes és Béradatok)
Fokozott biztonságú, Security Definer RPC rétegen keresztül kezelt (`get_decrypted_hr_data`, `update_decrypted_hr_data`) adatok.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `dolgozo_id` | uuid | — | Elsődleges kulcs → `hr_dolgozo_adatlap.id` |
| `taj_szam_titkositott` | bytea | ✓ | Titkosított TAJ szám |
| `adoazonosito_titkositott` | bytea | ✓ | Titkosított magyar adóazonosító jel |
| `bankszamla_titkositott` | bytea | ✓ | Titkosított GIRO bankszámlaszám |
| `brutto_ber_titkositott` | bytea | ✓ | Titkosított havi bruttó alapbér (csak HR/Admin írhatja) |
| `netto_ber_titkositott` | bytea | ✓ | Titkosított havi nettó bér |
| `created_at` | timestamptz | — | Létrehozás ideje |

### `hr_munkakor`
| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `megnevezes` | text | — | Munkakör megnevezése (pl. "Senior Fejlesztő") |
| `feor_kod` | text | ✓ | Hivatalos 4 jegyű FEOR kód |
| `szervezeti_egyseg_id` | uuid | ✓ | FK → `szervezeti_egyseg.id` |
| `besorolasi_szint` | text | ✓ | Szenioritási szint |
| `kockazat_tipusa` | text | ✓ | Munkavédelmi kockázati besorolás |
| `created_at` | timestamptz | — | Létrehozás ideje |

### `hr_jogviszony` & `hr_beosztas`
| Oszlop (`hr_jogviszony`) | Típus | Leírás |
|---|---|---|
| `id`, `dolgozo_id` | uuid | FK → `hr_dolgozo_adatlap.id` |
| `tipus` | hr_jogviszony_tipus | `teljes_munkaido`, `reszmunkaido`, `megbizasi`, `egyeni_vallalkozo` |
| `belepes_datuma`, `probaido_vege`, `kilepes_datuma` | date | Jogviszony időintervallumai |

| Oszlop (`hr_beosztas`) | Típus | Leírás |
|---|---|---|
| `id`, `jogviszony_id`, `munkakor_id`, `szervezeti_egyseg_id` | uuid | Beosztás relációk |
| `munkaido_fte` | numeric | Napi munkaidő szorzó (pl. `1.0` = 8 óra/nap, `0.5` = 4 óra/nap) |
| `ervenyes_tol`, `ervenyes_ig` | date | Hatályossági időszak |

---

## 2. Munkaidő, Jelenlét és Túlóra

### `hr_jelenlet`
| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `dolgozo_id` | uuid | — | FK → `felhasznalo_profil.id` (UNIQUE per nap) |
| `datum` | date | — | Munkanap dátuma (alap: `CURRENT_DATE`) |
| `becsekkolas_ideje` | timestamptz | ✓ | Munkaidő kezdete |
| `kicsekkolas_ideje` | timestamptz | ✓ | Munkaidő vége |
| `tervezett_kezdes`, `tervezett_veges` | time | ✓ | Műszakbeosztás tervezett ideje |
| `created_at` | timestamptz | — | Rögzítés ideje |

### `hr_tulora_egyenleg` & `hr_tulora_felhasznalás`
- `hr_tulora_egyenleg`: `dolgozo_id` (PK), `perc` (INTEGER, automatikusan frissíti a `calculate_tulora_on_checkout()` trigger a napi FTE * 480 perc feletti/alatti idővel), `updated_at`.
- `hr_tulora_felhasznalás`: `id`, `dolgozo_id`, `tipus` (`kiveszi_szabinak`, `kifizetteti`), `perc`, `statusz` (`jovahagyasra_var`, `jovahagyva`, `elutasitva`), `jovahagyo_id`, `jovahagyva_at`, `megjegyzes`.

### `hr_havi_jelenlet_zaras`
| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `dolgozo_id` | uuid | — | FK → `felhasznalo_profil.id` (UNIQUE: dolgozó + év + hónap) |
| `ev`, `honap` | integer | — | Tárgyév és tárgyhó (pl. 2026, 9) |
| `statusz` | text | — | `nyitott`, `jovahagyasra_var`, `jovahagyva` |
| `bekuldve_at`, `jovahagyva_at` | timestamptz | ✓ | Időbélyegek |
| `jovahagyo_vezeto_id` | uuid | ✓ | FK → `felhasznalo_profil.id` |

### `hr_munkaszuneti_nap`
`id`, `datum` (DATE UNIQUE), `megnevezes` (TEXT), `athelye_munkanap` (BOOLEAN: true ha ledolgozandó szombat). Pre-seedelve 2025, 2026, 2027 évekre.

---

## 3. Távollét és Helyettesítés

- `hr_tavollet`: `id`, `dolgozo_id` (FK → `hr_dolgozo_adatlap.id`), `kezdet_datuma`, `veg_datuma`, `tipus` (`fizetett_szabadsag`, `betegszabadsag`, `fizetes_nelkuli`, `egyeb`), `statusz` (`tervezet`, `jovahagyva`, `elutasitva`), `jovahagyo_id`.
- `hr_helyettesites`: `id`, `tavollet_id` (FK → `hr_tavollet.id`), `helyettesito_id` (FK → `felhasznalo_profil.id`), `statusz` (`aktiv`, `inaktiv`).

---

## 4. Cafeteria Rendszer

- `hr_cafeteria_katalogus`: `id`, `nev`, `leiras`, `eves_maximum`, `ado_szazalek`, `aktiv`.
- `hr_cafeteria_keret`: `id`, `dolgozo_id`, `ev`, `eves_keret`.
- `hr_cafeteria_valasztas`: `id`, `keret_id`, `katalogus_elem_id`, `osszeg`, `statusz` (`tervezet`, `leadva`, `elfogadva`).

---

## 5. Onboarding, Offboarding és Kilépő Interjú

- `hr_onboarding`: `id`, `toborzas_id`, `nev`, `munkakor`, `belepes_datuma`, `statusz` (`folyamatban`, `lezart`).
- `hr_onboarding_feladat`: `id`, `onboarding_id`, `cim`, `felelos_reszleg` (`HR`, `IT`, `Bérszámfejtés`, `EHS`), `statusz` (`pending`, `done`).
- `hr_offboarding`: `id`, `dolgozo_id`, `kilepes_datuma`, `statusz` (`folyamatban`, `lezart`).
- `hr_offboarding_feladat`: `id`, `offboarding_id`, `cim`, `felelos_reszleg`, `statusz` (`pending`, `done`).
- `hr_kilepes_interju`: `id`, `offboarding_id`, `kilepes_kategoria`, `kilepes_oka`, `altalanos_elegedettseg` (1-5), `vezeto_kapcsolat` (1-5), `munkakornyezet_ertekeles` (1-5), `csapat_ertekeles` (1-5), `mi_tetszett`, `mit_valtoztatna`, `ajanlana`, `kovetkezo_allomashely`, `rogzito_id`.

---

## 6. Toborzás (ATS) és Karrierportál

- `hr_allashirdetes`: `id`, `pozicio`, `osztaly`, `leiras`, `kovetelmenyek`, `bersav`, `statusz`, `felelos_toborzo_id`.
- `hr_toborzas`: `id`, `nev`, `email`, `megpalyazott_munkakor_id`, `statusz` (`uj`, `szures`, `interju`, `ajanlat`, `felvetel`, `elutasitva`), `cv_storage_path`.

---

## 7. Teljesítményértékelés (KPI) és Egyéni Fejlesztési Terv (IDP)

- `hr_teljesitmeny_ciklus`: `id`, `megnevezes`, `kezdo_datum`, `befejezo_datum`, `statusz` (`tervezes`, `aktiv`, `lezart`).
- `hr_kpi_katalogus`: `id`, `megnevezes`, `leiras`, `meroszam_tipusa` (`szazalek`, `darab`, `osszeg`), `aktiv`.
- `hr_teljesitmeny`: `id`, `dolgozo_id`, `ertekeles_datuma`, `ertekelt_idoszak`, `pontszam`, `kpi_statusz`, `ertekeles_szovege`, `ertekeles_keszito_id`.
- `hr_fejlesztesi_terv`: `id`, `dolgozo_id`, `idoszak`, `statusz`.
- `hr_fejlesztesi_cel`: `id`, `terv_id`, `megnevezes`, `leiras`, `statusz`, `hatarido`.
- `hr_idp_megjegyzes`: `id`, `cel_id`, `szerzo_id`, `szoveg`.

---

## 8. Megfelelőség, Szabályzatok és Hatósági Riportok

- `hr_orvosi_vizsgalat`: `id`, `dolgozo_id`, `tipus` (`elozetes`, `idoszakos`, `soron_kivuli`, `zaro`), `vizsgalat_datuma`, `ervenyesseg_datuma`, `eredmeny` (`alkalmas`, `fetelekkel_alkalmas`, `nem_alkalmas`), `megjegyzes`.
- `hr_ceges_dokumentum`: `id`, `cim`, `kategoria`, `verzio`, `fajl_url`, `hatalybalepes_datuma`.
- `hr_ceges_dokumentum_nyugtazas`: `id`, `dokumentum_id`, `dolgozo_id`, `nyugtazva_at`, `ip_cim`.
- `hr_bevallas_archivum`: `id`, `tipus` (pl. `NAV_T1041`, `KSH`), `idoszak`, `fajlnev`, `tarolasi_ut`, `sha256`.
- `hr_esemeny_naplo`: Szigorúan append-only személyügyi eseménynapló.
