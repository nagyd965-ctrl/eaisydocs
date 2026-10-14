# PRD P-079: eaisyBill Céges Tagok Importálása és Szelektív Meghívó Rendszer UX

- **Státusz:** Elfogadva (Accepted)
- **Dátum:** 2026-10-14
- **Hatókör:** `[Közös]` Settings / Multi-Tenancy & User Management (DOC-TASK-04)
- **Kapcsolódó ADR:** [A-060](../../architecture/decisions/A-060-eaisybill-company-member-sync-and-invite.md)

---

## 1. Felhasználói Igény és Problémafelvetés
Amikor egy cégcsoport több gazdasági társaságot kezel, az eaisyBill-ben minden vállalkozáshoz más-más munkatársak tartoznak (pl. Think AI-ban 11 fő, Sandboxban 3 fő). Az eaisyDocs-ban korábban egyenként, manuálisan kellett felvenni a tagokat minden cégnél.
A cél egy olyan felhasználóbarát, szelektív importáló felület létrehozása volt, amely:
1. Megmutatja az eaisyBill-ből az adott céghez tartozó összes felhasználót.
2. Egyértelmű vizuális jelzést ad arra, hogy ki az, aki már most is tagja a cégnek az eaisyDocs-ban, ki az, akinek már van regisztrációja, és ki teljesen új.
3. Lehetővé teszi, hogy az adminisztrátor **kizárólag azokat jelölje ki, akiket valóban át szeretne hozni**.
4. A még nem regisztrált munkatársak számára egykattintásos meghívó és jelszóbeállító e-mailt küldjön.

---

## 2. Felhasználói Élmény (UX) és Képernyő Tervek

### 2.1 Indítás a Beállítások felületéről (`/settings`)
A Beállítások oldal **Cég fülén** a „Tagok” kártya fejlécében elhelyeztük az új műveleti gombot:
- **`[📥 Importálás eaisyBill-ből]`** (diszkrét szürke-teal keretes másodlagos akciógomb, közvetlenül a zöld *„+ Tag hozzáadása”* gomb mellett).
- A gomb automatikusan felismeri az éppen aktív céget.

### 2.2 Szelektív Import Varázsló Modál (`EaisyBillMemberImportDialog`)
A modál a kanonikus Linear flat stílust követi, árnyékok nélkül, 1px-es finom keretekkel:

1. **Fejléc & Keresősáv:**
   - Cím: *Tagok importálása eaisyBill-ből*
   - Alcím: Megjeleníti az aktív cég nevét, és világos leírást ad: *„Kizárólag a bepipált személyek kapnak hozzáférést és meghívót.”*
   - Keresőmező: Azonnali valós idejű gépelési szűrés névre, e-mailre vagy eaisyBill szerepkörre.
   - *„Összes új kijelölése”* gyorsgomb.
2. **Tagok listája:**
   Minden munkatárs egy külön kártyasorban jelenik meg:
   - **Bal oldalon:** Checkbox + Név + eaisyBill szerepkör jelvény (`owner`, `admin`, `member`, `assistant`, `viewer`) + E-mail cím.
   - **Jobb oldalon:**
     - **Állapotjelvény:**
       - 🟢 *Már tag*: Szürke, inaktív checkbox-szal (nem jelölhető be duplán).
       - 🟡 *Létező fiók*: Narancssárga jelvény (új cégtagság hozzárendelése).
       - ⚪ *Új meghívandó*: Teal jelvény (új fiók létrehozása és meghívó küldése).
     - **Iratkezelési Szerepkör Dropdown (`Select`):**
       - Admin (`admin`), Vezető (`vezeto`), Iktató (`iktato`), Ügyintéző (`ugyintezo`), Betekintő (`betekinto`).
       - Az intelligens ajánlás alapján előre ki van töltve, de a sorban közvetlenül átállítható.
3. **Lábléc:**
   - Figyelmeztető szöveg a biztonságról: *„Kizárólag a bepipált személyek kapnak meghívót és jelszóbeállító linket.”*
   - *Mégse* gomb.
   - **Elsődleges gomb:** *„Kijelöltek importálása (X fő)”*, amely mutatja a bejelölt felhasználók számát, és kattintásra animált töltést jelenít meg.

---

## 3. Érintett Fájlok
- `src/components/settings/eaisybill-member-import-dialog.tsx`
- `src/components/settings/company-settings-tab.tsx`
- `src/app/actions/eaisybill-user-actions.ts`

---

## 4. Eredmények és Felhasználói Előnyök
- **Időmegtakarítás:** 10-15 másodperc alatt átvehető egy komplett vállalati csapat az eaisyBill-ből.
- **Nulla felesleges levél:** A cégvezető vagy adminisztrátor kezében van a döntés, senki sem kap kéretlen meghívót.
- **Automatikus jelszó-iniciálás:** Az új tagok egyetlen kattintással a Brevo e-mailből beállíthatják jelszavukat és beléphetnek az eaisyDocs-ba.
