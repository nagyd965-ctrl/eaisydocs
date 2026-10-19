# PRD P-096: Munkavállalói Hivatalos Dokumentumok Dedikált Fülre Helyezése és Munkaviszony Tisztítás UX [HR]

## Státusz
Elfogadva

## Kontextus és Célok
A munkavállalói 360° adatlapon (`/hr/employee/[id]`) a korábbi felépítésben a `Munkaviszony & Szerződések` fül alá egyetlen blokkba volt zsúfolva a *Jogviszony és Munkarend*, a *Munkaköri Profil és Törzslap*, a *Munkavédelmi és Tűzvédelmi Oktatások*, valamint az ezek alatt elhelyezkedő teljes *Hivatalos Dokumentumok* szekció (munkaszerződések, NAV T1041 hatósági bejelentők, munkavédelmi jegyzőkönyvek, cafeteria nyilatkozatok, kitüntetések, határozatok idővonala és a kapcsolódó generáló/iktató akciók).

Ez a dokumentum-idővonal önmagában óriási vertikális teret foglalt el, így a dolgozó beosztásához és munkarendjéhez tartozó alapvető munkaügyi adatok nehezen voltak áttekinthetők.
A cél a felület ergonómiai letisztítása: a dokumentumkezelés kiemelése egy dedikált, fókuszált fülre, valamint a munkaviszony fül kompaktá és átláthatóvá tétele.

## Termékkövetelmények és UX Módosítások
1. **Új „Hivatalos dokumentumok” fül bevezetése:**
   - A fülsoron a `Bizalmas HR adatok` után, az `Előzmények` előtt új fül jött létre letisztult `Hivatalos dokumentumok` címkével (zavaró zárójeles számlálók nélkül, a többi füllel teljesen harmonizálva; a `Bérpapírok` fülről szintén lekerült a zárójeles számkijelzés).
   - A fülre átkerült a teljes dokumentumkezelési munkafolyamat:
     - Fejléc akciók: *Összes iktatása eaisyDocs-ba*, *Fájl feltöltése* (`ManualUploadDialog`), *Szerződés / Irat Generálása* (`ContractGeneratorDialog`).
     - Munkaköri leírás verziójelző / átvételi akciókártya (`JobDescriptionBadgeAction`).
     - A dokumentumok idővonala (`hrDocuments`) státuszjelvényekkel (Iktatva / Belső HR vázlat, Aláírt példány / Tervezet), aláírt példány kezeléssel, in-browser PDF megtekintéssel, közvetlen letöltéssel és eaisyDocs iktatási kapcsolóval.
2. **„Munkaviszony” fül letisztítása és fókuszálása:**
   - A korábbi `Munkaviszony & Szerződések` fül neve tiszta `Munkaviszony`-ra rövidült (`value="munkaviszony"`).
   - A fül tartalma fókuszált maradt: *Jogviszony és Munkarend* (`EmploymentTab`), *Munkavédelmi és Tűzvédelmi Oktatások* (`SafetyTrainingEmployeeCard`), valamint a *Tanulmányi Szerződések* (`StudyContractTab`).
   - Megszűnt a végtelen vertikális görgetés, a beosztás és jogviszony adatok azonnal láthatóvá váltak.
3. **„Fejlesztési tervek” megnevezés egységesítése:**
   - A korábbi `Fejlődés (IDP)` fül és az `Egyéni Fejlesztési Tervek (IDP)` kártyafőcím egységesen és magyarosan a letisztult **`Fejlesztési tervek`** nevet kapta mind a felső fülsorban, mind a belső főcímben.

## Érintett Komponensek
- `src/app/hr/employee/[id]/page.tsx`
- `src/app/hr/employee/[id]/tabs/IDPTab.tsx`
