# [Közös] A-008: Szigorúan Append-Only Audit Eseménynapló Integritás

**Status:** Decided  
**Date:** 2026-07-14 (Rögzítve: 2026-09-30)  
**Scope:** `[Közös]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `supabase/migrations/20260714183741_enable_rls.sql`, `20260714222404_audit_triggers.sql`, `20260722000001_hr_audit_es_riport.sql`, `20260920000004_fix_audit_trigger_duplicates.sql`

---

## 1. Context (Kontextus)
A hiteles iratkezelés és a GDPR elszámoltathatósági alapelve (Accountability) megköveteli, hogy minden lényeges rendszeresemény (irat létrehozása, megtekintése, módosítása, letöltése, selejtezése, jogosultság változása, HR bér- és személyes adatok megtekintése) utólag visszakövethető legyen.
Ha az audit napló szerkeszthető vagy soraiból törölni lehet, a rendszer elveszíti jogi bizonyító erejét.

---

## 2. Decision (A Meghozott Döntés)
1. **Append-Only Adatbázis Táblák (`esemeny_naplo` és `hr_esemeny_naplo`):**
   - A táblákra kizárólag `INSERT` és `SELECT` jog van engedélyezve.
   - Adatbázis szinten (Postgres REVOKE és triggerek útján) **szigorúan tiltott az `UPDATE` és a `DELETE`**. Még a rendszergazda sem módosíthatja vagy törölheti a naplóbejegyzéseket.
   - Az eaisyDocs az `esemeny_naplo` táblát használja, míg az eaisyHR moduláris függetlenségének megőrzése érdekében a `hr_esemeny_naplo` táblába naplóz.
2. **Automatikus Adatbázis Triggerek (`log_audit_event()`):**
   - Az `irat`, `ugyirat`, `ugy` és `irat_fajl` táblákon Postgres triggerek futnak, amelyek automatikusan rögzítik az állapotváltozásokat, az előző és az új értékeket (JSON formátumban), a műveletet végző felhasználó ID-ját, emailjét és az időbélyeget.
   - Duplikációvédelem (`20260920000004_fix_audit_trigger_duplicates.sql`): a redundáns, üres indoklású vagy állapotváltozást nem tartalmazó triggerek kiszűrése.
3. **Alkalmazásszintű Olvasási Naplózás:**
   - Mivel a `SELECT` műveletre nem tehető SQL trigger, a fájlok megtekintését és az aláírt letöltési linkek generálását a szerver oldali handler (`src/app/api/pdf/[id]/route.ts`) és actions (`src/app/dossiers/[id]/viewer-actions.ts`) kényszerített naplóbejegyzéssel rögzíti.

---

## 3. Consequences (Következmények)
* **Pozitív:** Megmásíthatatlan bizonyító erő, audit-biztos megfelelőség.
* **Kapacitástervezés:** A napló mérete az iratok számával arányosan folyamatosan növekszik. Erre a célra particionálási és hosszú távú cold storage stratégiát kell fenntartani.
