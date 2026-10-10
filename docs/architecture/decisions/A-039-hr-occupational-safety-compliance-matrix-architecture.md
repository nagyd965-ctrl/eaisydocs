# ADR: A-039 - eaisyHR Munkavédelmi és Tűzvédelmi Oktatások Központi Lejárati Mátrixa Architektúra

## Státusz
**Decided** (2026-10-10)

## Hatókör
`[HR]`

## Kontextus
A munkavédelemről szóló 1993. évi XCIII. törvény (Mvt. 55. §) és a tűz elleni védekezésről szóló 1996. évi XXXI. törvény (Ttv. 22. §) szigorú munkáltatói kötelezettségként írja elő a munkavállalók előzetes (munkába állási) és időszakos (rendszerint éves ismétlő) munkavédelmi és tűzvédelmi oktatását.
Bár a rendszerben korábban létrejött a munkavédelmi oktatási jegyzőkönyv generálásának és eaisyDocs személyi dossziéba iktatásának mechanizmusa (`hr_munkavedelmi_oktatas`, `generateAndFileSafetyTrainingAction`), az adatok csak egyenként, az Onboardingban vagy az egyéni munkavállalói adatlapon voltak elérhetők. Hiányzott egy cégszintű, aggregált, határidőket és lejárati kockázatokat felügyelő architektúra.

## Döntés

1. **Adatbázis séma kiterjesztés:**
   - A `public.hr_munkavedelmi_oktatas` táblát kiegészítettük az `ervenyesseg_vege DATE` oszloppal és B-tree indexszel (`20261010000002_add_safety_training_validity.sql`).
   - Minden új oktatás generálásakor a lejárati dátum alapértelmezetten az oktatási dátumhoz viszonyított 1 év (`oktatasDatuma + 1 év`).
   - A meglévő rekordokat a migráció automatikusan feltöltötte.

2. **Determinisztikus Számítási Motor (`safety-compliance-calculator.ts`):**
   - Létrehoztunk egy tiszta logikai motort az érvényesség és kockázat kalkulációjára:
     - `hianyzik`: Nincs rögzített oktatási jegyzőkönyv az aktív munkavállalóhoz.
     - `lejart`: A lejárati dátum a bázisdátumnál korábbi (`diffDays < 0`).
     - `hamarosan_lejar`: A lejárati dátum a következő 30 napon belül van (`0 <= diffDays <= 30`), jelezve az éves ismétlő oktatás azonnali megszervezésének szükségességét.
     - `ervenyess`: A lejárati idő több mint 30 napra van a jövőben.
   - Cégszintű összesítések: `totalEmployees`, `validCount`, `expiringSoonCount`, `expiredOrMissingCount`, `compliancePercent`.

3. **Multi-Tenant Szerver Művelet (`getCompanySafetyComplianceData`):**
   - Szigorúan az aktív cég kontextusában (`getActiveCompanyIdServer()`) lekéri a munkaviszonyban álló aktív dolgozókat és a legfrissebb munkavédelmi oktatásaikat a csatolt `hr_dokumentum` adatokkal együtt.
   - Rendezési algoritmus: a hiányzó és lejárt oktatások automatikusan a táblázat elejére sorolódnak, garantálva a bírságveszély azonnali észlelését.

4. **Képernyő Integráció és Kanonikus Komponensek (`/hr/compliance`):**
   - A Munkaügyi Megfelelőség oldalt kétfüles Tabs felületté alakítottuk:
     1. Tab: *Szabadságkiadás (Mt. 122. §)*
     2. Tab: *Munkavédelem & Tűzvédelem (Mvt. / Ttv.)*
   - A munkavédelmi fül 4 db kanonikus `KpiCard`-ot és a `SafetyTrainingTable`-t tartalmazza.
   - Kanonikus `TableToolbar`: azonnali szöveges kereső, oszlopválasztó, többdimenziós szűrő popover (státusz, típus, részleg), és audit-kompatibilis CSV exportálás.
   - In-place betekintés: `PdfViewerDialog` a csatolt eaisyDocs jegyzőkönyvekhez.
   - In-place oktatásrögzítés: `SafetyTrainingDialog` közvetlen indítása az adott dolgozó adataival előtöltve.

## Következmények

### Pozitív
- **1 másodperces hatósági átláthatóság:** A HR vezetők és auditorok egyetlen kattintással látják a teljes céges lefedettséget és azonnal exportálhatják a hatósági tabellát.
- **Proaktív lejárati menedzsment:** A 30 napos sárga figyelmeztetés megelőzi az oktatások elévülését és a munkavédelmi bírságokat.
- **Zárt iratkezelési integráció:** Az oktatás rögzítése automatikusan PDF-et generál és beiktatja a személyi dossziéba, biztosítva a szigorú audit nyomvonalat.
