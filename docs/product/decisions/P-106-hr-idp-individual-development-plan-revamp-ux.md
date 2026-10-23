# PRD P-106: Egyéni Fejlesztési Terv (IDP) Átdolgozás és Tanúsítvány-leadási Felhasználói Élmény

- **Dátum:** 2026-10-23
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [ADR A-082](../architecture/decisions/A-082-hr-idp-individual-development-plan-revamp.md), [PRD P-017](./P-017-hr-individual-development-plan-idp-ux.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md)

---

## 1. Felhasználói Igény és Probléma

1. **Hiányos és Nehezen Használható Célkitűző Dialógus:**
   - A korábbi felületen a mentor/felelős mező egyszerű szövegmező volt (pl. "Kovács Péter"), semmilyen kiválasztási lehetőséget nem adott a cég valódi munkatársai közül.
   - Nem lehetett rögzíteni a képzést nyújtó intézményt, a finanszírozás típusát, költségét vagy a meglévő tanulmányi szerződéshez való kapcsolódást.
2. **Kihasználatlan és Törékeny Terv Konténer:**
   - Az IDP lista korábban üres konténereket és statikus 0%-os sávokat jelenített meg, anélkül hogy a munkavállaló valódi haladást tudott volna igazolni.
3. **Munkavállalói Önkiszolgálás Korlátai:**
   - A munkavállalói nézetben (`/hr/self-service/idp`) csak passzív kártyák látszódtak, nem volt lehetőség a megszerzett bizonyítvány vagy oklevél feltöltésére, a vezetői jóváhagyás kérelmezésére vagy a vezető visszajelzésének megtekintésére.
4. **Dekoratív Buborékok és UI Eltérések:**
   - Az üres állapotban kör alakú dekoratív ikondoboz szerepelt, ami megsértette a projekt Zero-Emoji és No-Decorative-Icons irányelvét.

## 2. Termék és UX Döntések

1. **Kanonikus Linear-Flat Statisztikai Sáv (`KpiCard`):**
   - Mind a vezetői dolgozói adatlapon (`/hr/employee/[id]` -> Fejlesztési tervek fül), mind a munkavállalói önkiszolgáló felületen (`/hr/self-service/idp`) 4 Linear-flat statisztikai kártya fogadja a felhasználót:
     - **Összes fejlesztési cél:** aggregált darabszám az aktív tervekben.
     - **Folyamatban:** aktív felkészülés alatt álló képzések és célok.
     - **Jóváhagyásra vár:** vezetői ellenőrzésre és tanúsítvány-igazolásra váró tételek (kiemelt figyelmeztető színnel, ha van függő tétel).
     - **Sikeresen teljesítve:** lezárt és igazolt képzések aránya százalékban és darabszámban.

2. **Dinamikus és Teljeskörű Célkitűző Modál (`IdpDialog`):**
   - **Kijelölt Mentor:** Valódi, céghez tartozó munkatársak legördülő listája, névvel és munkakörrel.
   - **Képzés Részletei:** Képző intézmény/platform megnevezése, finanszírozási konstrukció (céges finanszírozás, dolgozói önrész, ingyenes belső képzés, vegyes), képzési díj forintban.
   - **Tanulmányi Szerződés Kapcsolat:** A munkavállaló meglévő, nyilvántartott tanulmányi szerződéseinek listájából közvetlen hozzárendelés lehetséges.

3. **Munkavállalói Életciklus és Tanúsítvány-leadási Folyamat:**
   - **Nyitott:** "Elkezdtem a felkészülést" gomb, amely folyamatban lévő státuszba lépteti a célt.
   - **Folyamatban:** "Tanúsítvány feltöltése és leadás" gomb, amely megnyitja a dedikált tanúsítvány feltöltő modált (`IdpCertificateUploadDialog`) PDF/PNG/JPG feltöltéssel és opcionális kísérőszöveggel. Alternatívaként tanúsítvány nélküli jóváhagyáskérés is elérhető.
   - **Jóváhagyásra vár:** Sárga tájékoztató sáv a dolgozónak, "Feltöltött igazolás" megtekintő gombbal.
   - **Teljesítve:** Zöld megerősítő doboz, hogy a képesítés bekerült a hivatalos képzettségek és dokumentumok közé.
   - **Javításkérés / Elutasítás:** Kiemelt figyelmeztető doboz a vezető által megadott indoklással és közvetlen "Javított tanúsítvány feltöltése" gombbal.

4. **In-Place Vezetői Elbírálás (`IdpListCard`):**
   - Ha egy cél tanúsítványra vár vagy jóváhagyásra lett küldve, a vezetői kártyán megjelenik a jóváhagyási akciósáv:
     - **Tanúsítvány megtekintése:** Beágyazott PDF/kép betekintő (`IdpCertificateViewerDialog`) letöltési és külön lapon megnyitási funkcióval.
     - **Jóváhagyás:** Egykattintásos igazolás, ami lezárja a célt és beemeli a dolgozótörzsbe.
     - **Javítás kérése:** Modál (`IdpRejectionDialog`) kötelező szöveges indoklással, ami visszaküldi a dolgozónak a célt.

5. **Zero-Emoji és No-Decorative-Icons Megfelelőség:**
   - Nincsenek emojik a felületen és a kódban.
   - Töröltük a kör alakú dekoratív ikondobozokat az üres állapotokból, tiszta, professzionális, szövegközpontú tájékoztató kártyákat használunk.

6. **Aktív és Lezárt Tervek Szétválasztása (Szegmentált Állapotválasztó):**
   - Annak érdekében, hogy a korábban lezárt és a jelenleg futó fejlesztési tervek ne mosódjanak össze, a felületen egy dedikált szegmentált szűrőfül kapott helyet (`Aktív tervek` [darabszám jelvénnyel], `Lezárt tervek` [darabszám jelvénnyel], `Összes`).
   - A lezárt tervek a `lezart` enum státusszal kerülnek archiválásra, külön nézetben tekinthetők át.
   - Lezárt terv esetén biztosított a "Terv Újranyitása" lehetőség is, amennyiben a célkitűzések folytatódnak.


## 3. Érintett Képernyők és Komponensek

- `src/app/hr/employee/[id]/tabs/IDPTab.tsx` (Vezetői/HR nézet az IDP fülön)
- `src/components/hr/idp/idp-list-card.tsx` (Vezetői kártyák és jóváhagyási műveletek)
- `src/components/hr/idp/idp-dialog.tsx` (Célkitűzés modál mentorválasztóval és szerződésekkel)
- `src/app/hr/self-service/idp/page.tsx` (Munkavállalói önkiszolgáló oldal)
- `src/components/hr/idp/employee-idp-view.tsx` (Munkavállalói interaktív célkezelő)
- `src/components/hr/idp/idp-certificate-upload-dialog.tsx` (Feltöltő felület)
- `src/components/hr/idp/idp-certificate-viewer-dialog.tsx` (Betekintő felület)
- `src/components/hr/idp/idp-rejection-dialog.tsx` (Indokló felület)

## 4. Eredmények és Felhasználói Előnyök

- A dolgozók önállóan tudják menedzselni a képzéseiket és bizonyítványaikat közvetlenül a böngészőből.
- A vezetők nem kapnak papíron vagy e-mailben elvesző igazolásokat; a rendszer strukturáltan, automatikusan rögzíti az eredményeket a munkavállaló profiljában.
