# [HR] ADR A-084: eaisyHR Helyettesítési Útvonalválasztás, Kérelem Átszignálás és Automatikus Lejárati Reconciliáció

## Státusz
Elfogadva

## Dátum
2026-10-24

## Döntéshozók
eaisyHR Fejlesztő Csapat, Rendszerarchitekt

## Kontextus és Problémafelvetés
A vezetői helyettesítés (`hr_helyettesites`) mechanizmusának alapos vizsgálata során több kritikus folyamatbeli és adatintegritási hiányosság került feltárásra:
1. **Felesleges kézi szignáló gomb:** A HR Teendők és Figyelmeztetések felületén korábban elhelyezett sárga tesztgomb („Függő kérelmek átszignálása”) kézi beavatkozást igényelt, miközben a helyettesítés beállításakor a folyamatnak automatikusan kell lefutnia.
2. **Kérelem útvonalválasztási hiba új igényléseknél:** A `submitLeaveRequest` és `submitTimeCorrection` akciókban a rendszer csak akkor ellenőrizte a helyettest, ha a vezetőnek a mai napra már létezett jóváhagyott (`statusz = 'jovahagyva'`) szabadsága a `hr_tavollet` táblában. Ha a vezető még nem rögzítette a saját távollétét, vagy az jóváhagyásra várt, a beállított helyettesítés figyelmen kívül maradt és a kérelmek a távol lévő vezetőhöz futottak be.
3. **Munkaidő korrekciók kimaradása:** Helyettesítés mentésekor és törlésekor kizárólag a `hr_tavollet` rekordok lettek átszignálva, a függő munkaidő korrekciók (`hr_jelenlet_korrekcio`) nem kerültek át a helyetteshez.
4. **Lejárat utáni beragadás kockázata:** Amikor egy helyettesítés végdátuma (`veg_datuma`) lejárt, ha a helyettesnél maradt még el nem bírált kérelem, az adatbázisban a kérelem felelőseként továbbra is a helyettes szerepelt automatikus visszaállítás nélkül.

## Döntések

### 1. Felesleges Teszt Gomb Kivezetése és Automatikus Átszignálás
- A `ReassignLeavesButton` komponens és a felületi gomb véglegesen törlésre került a kódbázisból.
- A `saveSubstitute` akció mostantól automatikusan átszignálja az adott vezetőnél lévő összes függőben lévő távolléti kérelmet (`hr_tavollet.aktualis_jovahagyo_id = helyettesId`) és munkaidő korrekciót (`hr_jelenlet_korrekcio.jovahagyo_id = helyettesId`).
- A `deleteSubstitute` akció azonnal visszaszállítja a függő kérelmeket az eredeti vezetőre (`user.id`).

### 2. Közvetlen, Időtartam-alapú Helyettesítési Útvonalválasztás
- A `submitLeaveRequest` és `submitTimeCorrection` kódjában az elsődleges szűrés közvetlenül a `hr_helyettesites` táblára épül: ha `kezdet_datuma <= ma <= veg_datuma` és `aktiv = true`, az új kérelem azonnal a helyetteshez kerül.
- Nem előfeltétel többé, hogy a vezetőnek jóváhagyott saját szabadsága legyen rögzítve a távolléti táblában.
- Ha nincs aktív helyettes beállítva, másodlagos lépésként ellenőrizzük a vezető elérhetőségét, és ha távol van helyettes nélkül, eszkalálunk a HR/Admin szerepkörre.

### 3. Automatikus Lejárati Reconciliáció (`syncExpiredSubstitutions`)
- Létrejött az `src/utils/hr/substitute-sync.ts` központi szerviz modul.
- A vezetői felület (`/hr/manager`) és a dolgozói idősáv (`/hr/self-service/time`) szerveroldali betöltésekor automatikusan lefut a `syncExpiredSubstitutions()`:
  1. Megkeresi az összes olyan helyettesítést, ahol `veg_datuma < ma` és `aktiv = true`.
  2. A rekordokat lezárja (`aktiv = false`).
  3. A helyettesnél el nem bírált, még függő kérelmeket (`statusz = 'jovahagyasra_var'`) automatikusan visszaszignálja az eredeti vezetőre.
- Ezzel garantált, hogy a helyettesítés szigorúan csak a megadott végdátumig tart, utána a helyettes jóváhagyási joga megszűnik és a feladatok visszakerülnek a munkába állt vezetőhöz.

## Moduláris Függetlenség és eaisyDocs Határok
A logika kizárólag az eaisyHR modul tábláit (`hr_helyettesites`, `hr_tavollet`, `hr_jelenlet_korrekcio`) és nézeteit érinti. Az eaisyDocs iratkezelő rendszertől teljesen elszigetelt, annak működését nem befolyásolja.

## Eredmények és Következmények
- Zéró manuális adminisztrációs teher: a helyettesítés beállításakor és lejárásakor a kérelmek automatikusan a megfelelő vezetőnél landolnak.
- Nincs beragadt kérelem a helyettesítési időszak lejárta után.
- Tiszta, determinisztikus útvonalválasztás új kérelmek benyújtásakor.
