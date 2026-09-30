# 🤝 04. Partnertörzs, Felhasználók és Integrációs Kapcsolatok

Ez a modul rögzíti a partnereket, a felhasználói profilokat, szervezeti egységeket és a polimorf kapcsolatokat az eaisyDocs iratai és a külső entitások között.

---

### `partner` (Üzleti Partnertörzs)
A dokumentumok küldői és címzettjei.

> [!NOTE]
> **Adatbázis Határok és Architektúra:**
> - A `partner` táblán az **eaisyDocs és az eaisyHR** osztozik közvetlenül ugyanazon a Supabase adatbázison.
> - Az **eaisyBill viszont egy teljesen különálló adatbázison és szerveren fut**. A két rendszer között nincs közvetlen adatbázis kapcsolat; a számlák és partnerek importálása biztonságos API-n keresztül történik (`eaisybill-actions.ts`), a helyi partnerek deduplikációjával és rögzítésével (`findOrCreatePartner`).

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs (`gen_random_uuid()`) |
| `nev` | text | — | Partner teljes cégneve vagy személy neve |
| `adoszam` | text | ✓ | Magyar belföldi 11 jegyű adószám (pl. `12345678-1-42` vagy 8 jegyű törzsszám) |
| `kulfoldi_adoszam` | text | ✓ | Külföldi / EU adóazonosító (pl. `HU12345678`, `DE123456789`, PIB) [ADR A-023] |
| `cegjegyzekszam` | text | ✓ | Cégjegyzékszám |
| `created_at` | timestamptz | — | Létrehozás ideje (`NOW()`) |

---

### `irat_kapcsolat` (Polimorf Entitáskapcsolatok)
Keresztmodulos kapcsolatok az iratok/ügyiratok és külső entitások (partner, számla, tranzakció stb.) között.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `irat_id` | uuid | ✓ | FK → `irat.id` (ON DELETE CASCADE) |
| `ugyirat_id` | uuid | ✓ | FK → `ugyirat.id` (ON DELETE CASCADE) |
| `entitas_tipus` | entitas_tipus | — | `partner`, `szamla`, `tranzakcio`, `szerzodes`, `egyeb` |
| `entitas_id` | text | — | A kapcsolódó rekord azonosítója (szöveges/UUID) |
| `entitas_forras` | entitas_forras | — | `belso`, `eaisybill`, `erp`, `egyeb` (alap: `belso`) |
| `kapcsolat_tipusa` | kapcsolat_tipus | — | `hivatkozas`, `melleklet`, `alapbizonylat`, `valasz` |
| `created_at` | timestamptz | — | Kapcsolat rögzítésének ideje |

---

### `felhasznalo_profil` (Rendszer Felhasználói Profilok)
A hitelesített felhasználókhoz (`auth.users`) tartozó metaadatok és jogosultságok.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs → `auth.users.id` (ON DELETE CASCADE) |
| `nev` | text | — | Felhasználó teljes neve |
| `szerepkor` | user_szerepkor | — | Alapértelmezett szerepkör (`ugyintezo`) |
| `docs_szerepkor` | text | ✓ | Iratkezelési dedikált szerepkör (`rendszergazda`, `iktato`, `vezeto`, `ugyintezo`, `betekinto`, `auditor`) |
| `hr_szerepkor` | text | ✓ | HR dedikált szerepkör (`hr_munkatars`, `hr_vezeto`, `admin`, `dolgozo`) |
| `szervezeti_egyseg_id` | uuid | ✓ | FK → `szervezeti_egyseg.id` |
| `max_minosites` | irat_minosites | — | Legmagasabb megtekinthető minősítés (alap: `nyilt`) |
| `kozvetlen_vezeto_id` | uuid | ✓ | FK → `felhasznalo_profil.id` (szervezeti felettes) |
| `created_at` | timestamptz | — | Profil létrehozásának ideje |

---

### `szervezeti_egyseg` (Szervezeti Fa - eaisyDocs)
Hierarchikus vállalati osztályok az iratkezelési modulban.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `nev` | text | — | Szervezeti egység / osztály megnevezése |
| `szulo_id` | uuid | ✓ | FK → `szervezeti_egyseg.id` (önhivatkozó fa) |
| `created_at` | timestamptz | — | Létrehozás ideje |

---

### `mentett_kereses` (Felhasználói Mentett Szűrők)
Összetett keresési paraméterek mentése későbbi gyors eléréshez.

| Oszlop | Típus | Null | Leírás |
|---|---|---|---|
| `id` | uuid | — | Elsődleges kulcs |
| `user_id` | uuid | ✓ | FK → `auth.users.id` |
| `nev` | text | — | A mentett szűrő megnevezése |
| `kereso_parameterek` | jsonb | — | A keresési űrlap mezőinek és feltételeinek JSON reprezentációja |
| `created_at` | timestamptz | — | Mentés ideje |
| `updated_at` | timestamptz | — | Módosítás ideje |
