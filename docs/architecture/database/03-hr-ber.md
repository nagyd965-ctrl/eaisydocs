# 03. HR és Munkaügyi Adatbázis Séma (eaisyHR)

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
| `szunet_perc` | integer | — | Napi összesített ebédszünet / megszakítás percekben (`DEFAULT 0`) |
| `szunet_ms` | bigint | — | Napi összesített ebédszünet ezredmásodpercben (`DEFAULT 0`) |
| `szunet_kezdete` | timestamptz | ✓ | Aktív szünet kezdetének időbélyege (`NULL`, ha nem tart szünetet) |
| `tervezett_kezdes`, `tervezett_veges` | time | ✓ | Műszakbeosztás tervezett ideje |
| `created_at` | timestamptz | — | Rögzítés ideje |

### `hr_tulora_egyenleg` & `hr_tulora_felhasznalás`
- `hr_tulora_egyenleg`: `dolgozo_id` (PK), `perc` (INTEGER, automatikusan frissíti a `calculate_tulora_on_checkout()` trigger a napi FTE * 480 perc feletti/alatti idővel), `updated_at`.
- `hr_tulora_felhasznalás`: `id`, `dolgozo_id`, `tipus` (`kiveszi_szabinak`, `kifizetteti`), `perc`, `statusz` (`jovahagyasra_var`, `jovahagyva`, `elutasitva`), `jovahagyo_id`, `jovahagyva_at`, `megjegyzes`, `elutasitas_oka`.

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
`id`, `datum` (DATE), `megnevezes` (TEXT), `tipus` (`unnepnap`, `pihenonap`, `athelyezett_munkanap`), `company_id` (`UUID REFERENCES public.companies(id) ON DELETE CASCADE`, nullable: `NULL` = országos alapértelmezett, `<uuid>` = céges egyedi pihenőnap vagy munkanap-áthelyezés). Parciális unique indexek: `hr_munkaszuneti_nap_global_datum_idx` (`WHERE company_id IS NULL`) és `hr_munkaszuneti_nap_company_datum_idx` (`WHERE company_id IS NOT NULL`). Pre-seedelve 2025, 2026, 2027 évekre (`20261101000004`, `20261101000005`).

---

## 3. Távollét és Helyettesítés

- `hr_tavollet`: `id`, `dolgozo_id` (FK → `hr_dolgozo_adatlap.id`), `kezdet_datuma`, `veg_datuma`, `munkanapok_szama` (integer, ünnepnapokkal és áthelyezett munkanapokkal korrigált munkanapok), `tipus` (`fizetett_szabadsag`, `betegszabadsag`, `fizetes_nelkuli`, `egyeb`), `statusz` (`tervezet`, `jovahagyasra_var`, `jovahagyva`, `elutasitva`, `visszavonva`), `jovahagyo_id`, `megjegyzes`, `elutasitas_oka`.
- `company_members.hr_modulok` & `felhasznalo_profil.hr_modulok`: `text[]` (`DEFAULT '{}'`), a felhasználó számára engedélyezett szakmai HR modulok kulcsai (`admin`, `organization`, `time`, `payroll`, `compliance`, `reports`, `recruitment`, `onboarding`, `offboarding`, `audit`).
- `public.has_hr_module_access(p_modules text[], p_company_id uuid DEFAULT NULL)`: `SECURITY DEFINER` PostgreSQL segédfüggvény (`20261028000005`, cégre szűkítve: `20261101000001`), amely az összes `company_id`-val rendelkező `hr_*` tábla RLS szabályában (`has_hr_module_access(ARRAY[...], company_id)`) és a titkosított PII RPC-kben (`get_decrypted_hr_data`, `update_decrypted_hr_data`) az adott cégbeli `company_members.hr_modulok` tömböt és céges szerepkört ellenőrzi (a `felhasznalo_profil` globális fallbacket kizárólag egycéges felhasználónál engedélyezve).
- `hr_kituntetes`, `hr_berpapir` (`UNIQUE (company_id, dolgozo_id, ev, honap)`), `hr_elozo_munkahely`, `hr_tulora_felhasznalás`, `hr_munkakor_nyugtazas`, `hr_beosztas`, `hr_onboarding_munkakor`, `hr_munkakor_leiras_verzio`, `hr_cafeteria_katalogus`: Mindegyik tábla rendelkezik `company_id UUID REFERENCES public.companies(id)` oszloppal, `RESTRICTIVE` (`public.user_has_company_access(company_id)`) szabályokkal és cégre szűkített 2 paraméteres `has_hr_module_access(..., company_id)` modul-alapú RLS védelemmel; a `hr_jelenlet` táblán pedig a `hr_jelenlet_hr_delete` (`FOR DELETE`) szabály engedélyezi a törlést a `time`/`admin` moduljogosultak számára (`20261101000001`–`20261101000006`). A `20261101000006_replace_remaining_global_profile_rls_policies.sql` migráció további 16 HR táblán (`hr_beosztas`, `hr_bevallas_archivum`, `hr_ceges_dokumentum`, `hr_ceges_dokumentum_nyugtazas`, `hr_fejlesztesi_cel`, `hr_fejlesztesi_terv`, `hr_idp_megjegyzes`, `hr_munkakor`, `hr_munkaszerzodes`, `hr_szervezeti_egyseg`, `hr_t1041_bejelentes`, `hr_tavollet`, `hr_teljesitmeny_ciklus`, `hr_helyettesites`, `hr_muszak_sablon`, `hr_munkavedelmi_oktatas`) váltotta le az összes maradék globális `felhasznalo_profil.hr_szerepkor` és literál `USING (true)` szabályt cég-scoped szabályokra.
- `hr_helyettesites`: `id`, `tavollet_id` (FK → `hr_tavollet.id`), `helyettesito_id` (FK → `felhasznalo_profil.id`), `statusz` (`aktiv`, `inaktiv`).

---

## 4. Cafeteria Rendszer

- `hr_cafeteria_katalogus`: `id`, `company_id` (FK → `companies.id`), `nev`, `leiras`, `eves_maximum`, `ado_szazalek`, `aktiv`.
- `hr_cafeteria_keret`: `id`, `company_id` (FK → `companies.id`), `dolgozo_id`, `ev`, `eves_keret` (`UNIQUE (company_id, dolgozo_id, ev)`).
- `hr_cafeteria_valasztas`: `id`, `company_id` (FK → `companies.id`), `keret_id`, `katalogus_elem_id`, `osszeg`, `statusz` (`tervezet`, `leadva`, `elfogadva`).

---

## 5. Onboarding, Offboarding és Kilépő Interjú

- `hr_onboarding`: `id`, `toborzas_id`, `nev`, `munkakor`, `belepes_datuma`, `statusz` (`folyamatban`, `lezart`).
- `hr_onboarding_feladat`: `id`, `onboarding_id`, `cim`, `felelos_reszleg` (`HR`, `IT`, `Bérszámfejtés`, `EHS`), `statusz` (`pending`, `done`).
- `hr_offboarding`: `id`, `dolgozo_id`, `kilepes_datuma`, `statusz` (`folyamatban`, `lezart`).
- `hr_offboarding_feladat`: `id`, `offboarding_id`, `cim`, `felelos_reszleg`, `statusz` (`pending`, `done`).
- `hr_kilepes_interju`: `id`, `offboarding_id`, `kilepes_kategoria`, `kilepes_oka`, `altalanos_elegedettseg` (1-5), `vezeto_kapcsolat` (1-5), `munkakornyezet_ertekeles` (1-5), `csapat_ertekeles` (1-5), `mi_tetszett`, `mit_valtoztatna`, `ajanlana`, `kovetkezo_allomashely`, `rogzito_id`.

---

## 6. Toborzás (ATS) és Karrierportál

- `hr_allashirdetes`: `id`, `company_id`, `munkakor_id`, `cim`, `rovid_leiras`, `reszletes_leiras`, `munkavegzes_modja` (`irodai`, `hibrid`, `remote`), `helyszin`, `foglalkoztatas_tipusa` (`teljes_munkaido`, `reszmunkaido`, `megbizasi`, `gyakornok`), `tapasztalati_szint` (`junior`, `medior`, `senior`, `lead`), `reszleg_nev`, `bersav_min`, `bersav_max`, `bersav_publikus`, `nyitva_tol`, `jelentkezesi_hatarido`, `aktiv`, `publikus`, `is_internal`.
- `hr_toborzas`: `id`, `company_id`, `nev`, `email`, `telefonszam`, `megpalyazott_munkakor_id`, `allashirdetes_id`, `palyazati_kod` (`KAR-YYYY-XXXXXX`), `linkedin_url`, `berigeny`, `kezdesi_ido`, `forras`, `megpalyazott_terulet`, `statusz` (`uj`, `szures`, `interju`, `ajanlat`, `elfogadva`, `elutasitva`, `talent_pool`), `cv_url`.
- `companies.career_presentation`: `jsonb` oszlop a `public.companies` táblán a többcéges, 5 fejezetes AI „Cégünkről” (Employer Branding) prezentáció tárolására (`briefing`, `heroSlide`, `cultureSlide`, `environmentSlide`, `perksSlide`, `closingSlide`).

---

## 7. Teljesítményértékelés (KPI) és Egyéni Fejlesztési Terv (IDP)

- `hr_teljesitmeny_ciklus`: `id`, `megnevezes`, `kezdo_datum`, `befejezo_datum`, `statusz` (`tervezes`, `aktiv`, `lezart`).
- `hr_kpi_katalogus`: `id`, `company_id` (`UUID REFERENCES public.companies(id) ON DELETE CASCADE`, nullable: `NULL` = központi sablon, `<uuid>` = vállalati saját KPI), `megnevezes`, `leiras`, `meroszam_tipusa` (`szazalek`, `darab`, `osszeg`), `aktiv` (`20261101000004`, `20261101000005`).
- `hr_teljesitmeny`: `id`, `company_id`, `dolgozo_id`, `ertekeles_datuma`, `ertekelt_idoszak`, `pontszam`, `kpi_statusz`, `ertekeles_szovege`, `ertekeles_keszito_id`.
- `hr_fejlesztesi_terv`: `id`, `company_id`, `dolgozo_id`, `idoszak`, `statusz`.
- `hr_fejlesztesi_cel`: `id`, `company_id`, `terv_id`, `megnevezes`, `leiras`, `statusz`, `hatarido`.
- `hr_idp_megjegyzes`: `id`, `company_id`, `cel_id`, `szerzo_id`, `szoveg`.

---

## 8. Megfelelőség, Szabályzatok és Hatósági Riportok

- `hr_orvosi_vizsgalat`: `id`, `company_id`, `dolgozo_id`, `tipus` (`elozetes`, `idoszakos`, `soron_kivuli`, `zaro`), `vizsgalat_datuma`, `ervenyesseg_datuma`, `eredmeny` (`alkalmas`, `fetelekkel_alkalmas`, `nem_alkalmas`), `megjegyzes`.
- `hr_ceges_dokumentum`: `id`, `company_id`, `cim`, `kategoria`, `verzio`, `fajl_url`, `hatalybalepes_datuma`.
- `hr_ceges_dokumentum_nyugtazas`: `id`, `company_id`, `dokumentum_id`, `dolgozo_id`, `nyugtazva_at`, `ip_cim`.
- `hr_bevallas_archivum`: `id`, `company_id`, `tipus` (pl. `NAV_T1041`, `KSH`), `idoszak`, `fajlnev`, `tarolasi_ut`, `sha256`.
- `ertesitesi_szabaly`: `id`, `company_id` (`UUID REFERENCES public.companies(id) ON DELETE CASCADE`), `esemeny_tipus`, `kinek`, `aktiv`, `csatorna` (`UNIQUE (company_id, esemeny_tipus, kinek)`). Új vállalat létrehozásakor a `trg_seed_company_notification_rules` (`AFTER INSERT ON public.companies`) trigger automatikusan klónozza az alapértelmezett szabályokat (`20261101000004`, `20261101000005`).
- `hr_esemeny_naplo`: Szigorúan append-only személyügyi eseménynapló (`company_id` kötelezően töltve a `trg_hr_esemeny_naplo_company_id` `BEFORE INSERT` triggerrel, `ON DELETE SET NULL` külső kulccsal a cégtörlési audit-sorok megőrzéséhez, és szigorított `"Eseménynapló rögzítés"` `INSERT` RLS szabállyal — `20261028000006`, `20261101000003`, `20261101000004`).
- `ertesites_naplo` (`modul = 'hr'`): Kiküldött HR e-mail és SMS értesítések naplója, `trg_ertesites_naplo_company_id` `BEFORE INSERT` triggerrel, `RESTRICTIVE` cég-izolációval és `(modul, company_id, mikor DESC)` összetett indexszel (`20261101000002`).
