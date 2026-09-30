# 📦 02. Irattár és Selejtezés (Archive & Disposal)

Ez a modul kezeli az irattári tervet, a lezárt iratok fizikai tárolását, a fizikai iratkölcsönzést, valamint a négyszem-elven alapuló selejtezési munkafolyamatot.

---

### `irattari_terv` (Irattári Terv és Megőrzési Idők)
A hivatalos irattári tételszámok, megőrzési idők és selejtezhetőségi szabályok törzstáblája.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs (`gen_random_uuid()`) |
| `tetelszam` | text | — | Hivatalos tételszám (pl. `101`, `204`, UNIQUE) |
| `megnevezes` | text | — | Irattári tétel megnevezése (pl. "Pénzügyi bizonylatok") |
| `megorzesi_ido_ev` | integer | — | Megőrzési idő években (pl. `5`, `8`, `10`, `50`) |
| `selejtezheto` | boolean | — | Selejtezhető-e a megőrzési idő lejárta után (alap: `true`) |
| `created_at` | timestamptz | — | Létrehozás ideje |

---

### `irat_fizikai_hely` (Fizikai Tárolási Hely)
Papíralapú iratok fizikai fellelhetősége (doboz és polc koordináták).

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `irat_id` | uuid | — | FK → `irat.id` (ON DELETE CASCADE, UNIQUE) |
| `doboz` | varchar(100) | ✓ | Irattári doboz / mappa száma (pl. `D-2026/04`) |
| `polc` | varchar(100) | ✓ | Polc / állvány azonosítója (pl. `P-12/B`) |
| `megjegyzes` | text | ✓ | Raktározási megjegyzés vagy fizikai állapot |
| `created_at` | timestamptz | — | Rögzítés ideje |
| `updated_at` | timestamptz | — | Módosítás ideje |

---

### `irat_kolcsonzes_naplo` (Fizikai Iratkölcsönzés)
Fizikai iratok kiadásának, kölcsönzésének és visszavételének naplója.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `irat_id` | uuid | — | FK → `irat.id` (ON DELETE CASCADE) |
| `kinek_user_id` | uuid | — | FK → `auth.users.id` (a kölcsönvevő munkatárs) |
| `kiadta_user_id` | uuid | — | FK → `auth.users.id` (az irattáros kiadó) |
| `mikor_kiadva` | timestamptz | — | Kiadás pontos időpontja (`NOW()`) |
| `varhato_visszahozatal` | timestamptz | — | Tervezett visszahozatali határidő |
| `tenyleges_visszahozatal` | timestamptz | ✓ | Visszavétel ideje (NULL, amíg kint van) |
| `statusz` | kolcsonzes_statusz | — | `kikolcsonozve`, `visszahozva`, `kesesben` |
| `megjegyzes` | text | ✓ | Állapot vagy megjegyzés átadáskor/átvételkor |

---

### `selejtezes_csomag` (Selejtezési Csomag)
Selejtezési javaslat és jóváhagyott jegyzőkönyv csomag.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `javaslattevo_user_id` | uuid | — | A selejtezést felterjesztő iratkezelő |
| `jovahagyo_user_id` | uuid | ✓ | A jóváhagyó vezető (szigorú négyszem-elv: `javaslattevo != jovahagyo`) |
| `statusz` | csomag_statusz | — | `jovahagyasra_var`, `jovahagyva`, `elutasitva` |
| `jegyzokonyv_path` | text | ✓ | Generált PDF selejtezési jegyzőkönyv tárolási útvonala |
| `created_at` | timestamptz | — | Felterjesztés ideje |
| `jovahagyva_at` | timestamptz | ✓ | Döntés időpontja |

---

### `selejtezes_tetel` (Selejtezési Tételek)
A selejtezési csomagban szereplő konkrét ügyiratok listája.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `csomag_id` | uuid | — | FK → `selejtezes_csomag.id` (ON DELETE CASCADE) |
| `ugyirat_id` | uuid | — | FK → `ugyirat.id` (ON DELETE CASCADE) |
| `created_at` | timestamptz | — | Hozzáadás ideje (UNIQUE: `csomag_id`, `ugyirat_id`) |
