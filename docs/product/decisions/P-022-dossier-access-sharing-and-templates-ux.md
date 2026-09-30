# [Docs] P-022: Ügyiraton Belüli Egyedi Hozzáférés-megosztás és Sablonok UX

## 1. Kontextus és Célkitűzés
Az ügyirat szintű együttműködés megköveteli, hogy az ügyintézők és vezetők:
1. Konkrét személyekkel vagy külső auditorokkal explicit módon megoszthassák az ügyiratot időszakos vagy korlátozott betekintéssel (`access-actions.ts`).
2. Új iratokat hozzhassanak létre előre elkészített sablonokból (pl. felszólítás, megállapodás, határozat) kitöltéssel (`template-actions.ts`).
3. Nyomon követhessék a csatolt fájlok verzióit, és szükség esetén korábbi verziót állíthassanak vissza (`version-actions.ts`).

## 2. Érintett Képernyők és Komponensek
- **Ügyirat részletező:** `/dossiers/[id]` (`src/app/dossiers/[id]/page.tsx`)
- **Főbb akciók:**
  - `access-actions.ts`: `shareDossierAccess(ugyiratId, targetUserId, permissions, expiresAt)` és `revokeDossierAccess(accessId)`.
  - `template-actions.ts`: `generateDocumentFromTemplate(ugyiratId, templateId, fieldValues)`.
  - `version-actions.ts`: `restoreDocumentVersion(iratId, versionId)`.

## 3. Felhasználói Interakciók és Biztonság
- **Granuláris Megosztás:** Az ügyintéző a "Megosztás" párbeszédablakban kiválasztja a kollégát, a jogosultsági szintet (`csak_olvasas`, `szerkesztes`) és opcionálisan a lejárat dátumát. A művelet azonnal bekerül az `esemeny_naplo`-ba.
- **Sablon alapú iratkészítés:** A sablonban lévő változókat (pl. ügyfélnév, iktatószám, összeg) a rendszer automatikusan kitölti az ügyirat adataiból, csökkentve a manuális hibákat.
