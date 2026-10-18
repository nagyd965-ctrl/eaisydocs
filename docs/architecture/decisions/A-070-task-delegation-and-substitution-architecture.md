# ADR A-070: Távolléti Feladat-Delegálás és Helyettesítés Architektúra Újraszervezése [Docs]

## Státusz
Elfogadva

## Kontextus
Az eaisyDocs rendszerben a Beállítások menüben korábban létezett egy különálló „Helyettesítés” fül (`/settings`), amely mindössze egy 3 mezős űrlapot tartalmazott. Ez a megvalósítás több architekturális és funkcionális problémát hordozott:
1. **Koncepciózavar és félrevezető szövegezés:** A kártya azt állította, hogy „szabadságod vagy távolléted alatt ki lássa el a feladataidat”, ami a szabadságkezelés látszatát keltette. Az `eaisyDocs_szoftverterv.md` alapján az iratkezelő rendszerben nem létezik szabadságigénylés vagy HR távollét-adminisztráció (ez az eaisyHR kizárólagos feladata).
2. **Rossz funkcionális elhelyezés:** A helyettesítés nem rendszerbeállítási elem, hanem a napi ügyintézési és feladatkezelési munkafolyamat része (szoftverterv 6.5 fejezet: *„Szignálás és feladatkiosztás: szabadság esetén a feladatok átirányíthatók (a naplóban nyoma marad)”*).
3. **Hiányzó jogosultsági és multi-tenant scoping:** A korábbi `createSubstitution` nem rögzített `company_id`-t, miközben a feladatlekérdezések vállalati hatókör szerint szűrnek. Továbbá a feladatok állapotmódosításánál (`task-actions.ts`) a helyettesítő nem kapott módosítási jogosultságot, így hiába látta a feladatot, nem tudta elintézni azt.

## Döntés
Az „A” Opció mentén újraszerveztük a helyettesítési és delegálási architektúrát:

1. **Beállítások fül megtisztítása:**
   - A Beállítások (`/settings`) felső menüsorából a különálló „Helyettesítés” fül kivezetésre került.
   - A személyes profil beállításoknál (`Profil & Biztonság` lap) a `DelegationSettingsCard` kártya kapott helyet, amely tiszta, professzionális módon tájékoztat és engedi a delegálás kezelését a jelszó és 2FA mellett.
2. **Integráció a Saját Feladataim (`/tasks`) munkaasztalra:**
   - **Fejléc dialógus gomb (`TaskDelegationDialog`):** A feladatkezelő fejlécében közvetlenül elérhető a „Távolléti delegálás” gomb és modál, így a felhasználóknak nem kell elhagyniuk a felületet megbízás rögzítéséhez vagy megtekintéséhez.
   - **Aktív helyettesítési banner (`ActiveDelegationBanner`):** Ha a felhasználónak aktív helyettesítése van (vagy ő helyettesít kollégát, vagy őt helyettesítik), a feladatlista tetején diszkrét, informatív státuszjelzés jelenik meg.
3. **Jogosultsági, multi-tenant és moduláris szűrés (`task-actions.ts`, `substitution-actions.ts`, `tasks/page.tsx`):**
   - **Kizárólag aktív cégtagok:** A helyettesítő kollégák kiválasztó listájában kizárólag a jelenleg kiválasztott céghez hozzáadott felhasználók (`company_members.company_id = activeCompanyId`) jelenhetnek meg.
   - **Kizárólag eaisyDocs felhasználók:** Szigorú moduláris szűrés érvényesül: csak azok a munkatársak választhatók ki, akik rendelkeznek eaisyDocs hozzáféréssel (`elerheto_modulok @> ['docs']`). A tisztán eaisyHR felhasználók nem keveredhetnek be az iratkezelési delegálásba.
   - **Szerveroldali védelem:** A `createSubstitution` szerver akció szinten ellenőrzi a cégtagságot, az eaisyDocs jogosultságot, tiltja az ön-helyettesítést, és érvényesíti az időszakot (`meddig > mettol`).
   - **Feladat elintézési jog:** Az `updateTaskStatus` mostantól explicit ellenőrzi az aktív helyettesítési relációt (`helyettesites`), így a helyettesítő kolléga nemcsak megtekintheti, hanem állapotában módosíthatja és elintézheti a távollévő kollégára szignált feladatokat.

## Következmények
- A Beállítások menü felesleges fültől mentesült, a navigáció tiszta és áttekinthető.
- Az ügyintézők közvetlenül a napi munkafelületükön (`/tasks`) látják és kezelik a távolléti feladat-átruházásokat.
- A jogosultság-ellenőrzés szigorú, megbízható és auditálható maradt.
