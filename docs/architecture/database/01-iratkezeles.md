# 🗃️ 01. Iratkezelési Mag (Core Records Management)

Ez a modul kezeli a bejövő és kimenő iratokat, az iktatott ügyiratokat, a csatolt fizikai fájlokat és a hozzájuk rendelt feladatokat.

---

### `ugy` (Ügy)
Az összefüggő iratok és ügyiratok logikai gyűjtője.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs (`gen_random_uuid()`) |
| `ugyszam` | text | — | Egyedi ügyazonosító szám (UNIQUE) |
| `targy` | text | — | Az ügy hivatalos tárgya |
| `ugytipus_id` | uuid | ✓ | FK → `irattari_terv.id` |
| `statusz` | ugy_statusz | — | `folyamatban`, `lezart`, `felfuggesztve` |
| `felelos_user_id` | uuid | ✓ | FK → `felhasznalo_profil.id` (ügygazda) |
| `hatarido` | date | ✓ | Ügyintézési határidő |
| `letrehozva` | timestamptz | — | Létrehozás ideje (`NOW()`) |
| `lezarva` | timestamptz | ✓ | Lezárás pontos időpontja |

---

### `ugyirat` (Ügyirat / Iktatott Akta)
Hivatalos, hézagmentes iktatószámmal rendelkező akta.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `ugy_id` | uuid | ✓ | FK → `ugy.id` |
| `iktatoszam` | text | — | Egyedi, gap-mentes iktatószám (pl. `2026/000142`, UNIQUE) |
| `iktatas_datuma` | timestamptz | — | Iktatás időpontja (`NOW()`) |
| `iktato_user_id` | uuid | ✓ | FK → `felhasznalo_profil.id` (az iktató személy) |
| `irattari_tetel_id` | uuid | ✓ | FK → `irattari_terv.id` |
| `megorzesi_ido_vege` | date | ✓ | Selejtezhetőség naptári dátuma az irattári terv alapján |
| `statusz` | ugyirat_statusz | — | `iktatva`, `szignalt`, `ugyintezes_alatt`, `elintezett`, `lezart`, `irattarban`, `selejtezheto`, `selejtezett` |
| `helye` | text | ✓ | Fizikai fellelhetőség szöveges leírása |
| `created_at` | timestamptz | — | Rekord létrehozási ideje |

---

### `irat` (Irat / Küldemény)
Egyedi küldemény (bejövő levél, számla, kimenő válasz).

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `ugyirat_id` | uuid | ✓ | FK → `ugyirat.id` (ha már iktatva van) |
| `erkeztetoszam` | text | ✓ | Érkeztetési azonosító (érkeztetett, még nem iktatott állapotban) |
| `targy` | text | — | Irat megnevezése/tárgya |
| `leiras` | text | ✓ | Részletes leírás vagy kivonat |
| `irany` | irat_irany | — | `bejovo` vagy `kimeno` |
| `erkezes_modja` | erkezes_modja | — | `email`, `posta`, `szemelyes`, `szkenner`, `cegkapu`, `rendszer`, `eaisybill`, `egyeb` |
| `erkezes_datuma` | timestamptz | — | Beérkezés időpontja |
| `kuldo_partner_id` | uuid | ✓ | FK → `partner.id` |
| `adathordozo_tipus` | adathordozo_tipus | — | `elektronikus`, `papir` |
| `minosites` | irat_minosites | — | `nyilt`, `belso`, `bizalmas`, `szigoruan_bizalmas` |
| `kulso_forras` | text | ✓ | Külső forrásrendszer megnevezése (pl. `eaisybill`, `erp`) |
| `kulso_hivatkozas_id` | text | ✓ | Külső entitás rekordazonosítója (pl. eaisyBill számla UUID) |
| `kereso_vektor` | tsvector | ✓ | Magyar unaccent FTS keresővektor |
| `created_at` | timestamptz | — | Létrehozás ideje |

---

### `irat_fajl` (Melléklet / Fizikai Állomány)
Csatolt dokumentumok, PDF-ek, képek.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `irat_id` | uuid | — | FK → `irat.id` (ON DELETE CASCADE) |
| `storage_path` | text | — | Supabase Storage privát vödör útvonal (külső forrásnál pl. `eaisybill:UUID`) |
| `kulso_fajl_url` | text | ✓ | Külső tárolt fájl közvetlen URL-je (pl. eaisyBill storage melléklet, elkerülve a másolást) |
| `eredeti_fajlnev` | text | — | Eredeti feltöltött fájlnév |
| `mime_type` | text | — | Pl. `application/pdf`, `image/jpeg` |
| `meret_byte` | bigint | — | Fájlméret bájtban |
| `sha256` | text | — | Fájlintegritást igazoló SHA-256 lenyomat |
| `pdfa_path` | text | ✓ | Normalizált PDF/A-2b archiválási másolat útvonala |
| `ocr_szoveg` | text | ✓ | Kinyert OCR szövegtartalom |
| `verzio` | integer | — | Verziószám (alapértelmezett: 1) |
| `created_at` | timestamptz | — | Feltöltés ideje |

---

### `feladat` (Ügyirat Feladatok / Szignálás)
Ügyirathoz kiírt feladatok felelőssel és határidővel.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `ugyirat_id` | uuid | — | FK → `ugyirat.id` (ON DELETE CASCADE) |
| `felelos_user_id` | uuid | — | FK → `felhasznalo_profil.id` (felelős munkatárs) |
| `leiras` | text | — | Feladat leírása és instrukció |
| `hatarido` | timestamptz | — | Teljesítési határidő |
| `allapot` | feladat_allapot | — | `nyitott`, `folyamatban`, `kesz`, `elutasitott` |
| `created_at` | timestamptz | — | Kiírás ideje |
| `updated_at` | timestamptz | — | Utolsó módosítás ideje |

---

### `esemeny_naplo` (Audit Napló)
Szigorúan **append-only** audit eseménynapló (UPDATE és DELETE megvonva).

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `tortent` | timestamptz | — | Esemény pontos időpontja (`NOW()`) |
| `entitas_tipus` | text | — | `irat`, `ugyirat`, `irat_fajl`, `partner`, `selejtezes_csomag`, `feladat` |
| `entitas_id` | uuid | — | Az érintett rekord azonosítója |
| `esemeny_tipus` | esemeny_tipus | — | `letrehozva`, `erkeztetve`, `iktatva`, `modositva`, `megtekintve`, `letoltve`, `selejtezve` |
| `user_id` | uuid | ✓ | A műveletet végző felhasználó azonosítója |
| `ip_cim` | text | ✓ | Kliens IP címe |
| `user_agent` | text | ✓ | Kliens böngésző / eszköz azonosítója |
| `elozo_ertek` | jsonb | ✓ | Módosítás előtti állapot |
| `uj_ertek` | jsonb | ✓ | Módosítás utáni állapot |
| `indoklas` | text | ✓ | Módosítás szöveges indoklása |
