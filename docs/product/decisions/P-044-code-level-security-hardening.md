# [Közös] P-044: Rendszerszintű Alkalmazásbiztonság és Adatvédelmi Kapuk

**Státusz:** Decided  
**Dátum:** 2026-10-02  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Kategória:** `Application Security / Data Protection / Access Control`  
**Kapcsolódó ADR:** [A-030](../../architecture/decisions/A-030-code-level-security-hardening.md)  
**Kapcsolódó Kód:** `src/app/api/send-email/route.ts`, `src/app/api/hr/download-document/route.ts`, `src/app/karrier/[id]/*`, `src/utils/supabase/middleware.ts`

---

## 1. Felhasználói és Üzleti Cél

Az eaisyDocs és eaisyHR vállalati iratkezelő és HR platformként érzékeny személyes adatokat (munkaszerződések, orvosi igazolások, kilépő adatlapok, önéletrajzok), valamint üzleti iratokat kezel.

A felhasználók (ügyfelek, munkavállalók és belső operáció) joggal várják el, hogy:
1. Senki ne tudjon illetéktelenül más dolgozó munkajogi irataiba betekinteni vagy letölteni azokat.
2. A rendszer ne legyen felhasználható kéretlen levélküldésre (spam) vagy phishing támadásokra.
3. A karrier oldalon jelentkezők ne tudjanak kártékony programokat vagy manipulált fájlokat elhelyezni a vállalat tárhelyén.
4. A privát vállalati felületek (partnerek, feladatok, beállítások, biztonsági irányelvek) még közvetlen URL beírással se legyenek elérhetők hitelesítetlen látogatók számára.

---

## 2. Termékszintű Szabályok és Felhasználói Viselkedés

### 2.1. Személyi Iratok Hozzáférési Szabályzata (Privacy by Design)
- **Önkiszolgáló dolgozói hozzáférés:** A dolgozó a saját munkaszerződését, tájékoztatóit és igazolásait bármikor letöltheti.
- **HR & Vezetői jogosultság:** Más dolgozók személyi dokumentumaihoz kizárólag az arra jogosult `hr_admin` vagy `admin` felhasználók férhetnek hozzá.
- **Munkaköri leírások transzparenciája:** A belső munkaköri leírások a szervezet minden belső munkatársa számára megtekinthetők a betanulás és felelősségi körök tisztázása érdekében.

### 2.2. Karrierportál és Önéletrajz Biztonság
- **Támogatott formátumok:** A jelentkezők kizárólag PDF és Word dokumentumokat tölthetnek fel (max. 10 MB).
- **Valós formátumellenőrzés:** Átnevezett futtatható állományokat (`.exe` PDF-nek álcázva) a rendszer azonnal, már a feltöltés során visszautasít felhasználóbarát hibaüzenettel.
- **XSS-mentes álláshirdetések:** A karrierportál hirdetései garantáltan nem tartalmazhatnak ártó szándékú szkripteket.

### 2.3. Hozzáférés és Munkamenet Kezelés
- Hitelesítetlen felhasználó bármilyen védett aloldalra kattintva azonnal a Bejelentkezési oldalra kerül átirányításra, megőrizve az eredeti célt a sikeres belépés utáni visszatéréshez.
- Az OAuth / közösségi bejelentkezés védett az Open Redirect csalásokkal szemben: a felhasználó csak a belső alkalmazásfelületre navigálhat a sikeres belépést követően.
