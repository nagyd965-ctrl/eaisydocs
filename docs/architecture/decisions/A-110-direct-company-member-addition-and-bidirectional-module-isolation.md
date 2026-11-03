# A-110: Közvetlen Cégtag-Felvétel Meghívó Nélkül, Céges Csapat-Szinkronizáció és Kétirányú Modul-Izoláció (`eaisyDocs` <-> `eaisyHR`)

**Status:** Decided  
**Date:** 2026-11-03  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Author:** Antigravity Agent  
**Kapcsolódó PRD:** [P-139](../../product/decisions/P-139-direct-company-member-addition-and-admin-role-selector-ux.md)  
**Kapcsolódó Kód:** `src/app/actions/company-actions.ts`, `src/app/settings/settings-actions.ts`, `src/components/settings/invite-user-dialog.tsx`, `src/components/settings/edit-member-role-dialog.tsx`, `src/components/settings/company-settings-tab.tsx`, `src/components/settings/team-tab.tsx`, `src/components/layout-wrapper.tsx`, `supabase/migrations/20261103000003_fix_erkeztetoszam_allokacio_pkey_and_sync_counters.sql`  

---

## 1. Context (Kontextus)

Az `eaisyDocs -> Beállítások -> Cég` (`CompanySettingsTab`) nézeten egy beimportált vagy kiválasztott vállalatnál (pl. `MAURONI MARCO ROMANO`) a tagok hozzáadásakor négy összefüggő architekturális és jogosultsági hiányosság jelentkezett:
1. **Meghívó-kényszer és meglévő felhasználók kezelése:** Az `inviteCompanyMemberAction` kizárólag új Supabase Auth felhasználó létrehozására volt felkészítve (`auth.admin.createUser`), így ha egy adminisztrátor egy már regisztrált felhasználót akart jelszó nélkül hozzárendelni a céghez, vagy már létező e-mail címet adott meg, a művelet elakadt. Emellett csak a `companies.user_id` tulajdonos tudott tagokat kezelni, a céges `admin` és `rendszergazda` szerepkörű felhasználók nem.
2. **Céghez tartozó eaisyDocs Csapat (`getTeamMembers`) szinkronizáció:** A `Beállítások -> Szervezeti Egységek -> Csapat` (`TeamTab`) listáját előállító `getTeamMembers` és `createNewUser` (`src/app/settings/settings-actions.ts`) nem volt összekötve a `company_members` alapú közvetlen tagfelvétellel, és szerepkör-módosításkor (`updateUserRole`) nem frissítette az aktív cég `company_members.docs_szerepkor` és `company_members.role` mezőit.
3. **Modul-keresztszennyeződés szerepkör-módosításkor:** Az `EditMemberRoleDialog` (`src/components/settings/edit-member-role-dialog.tsx`) `eaisyDocs`-on belül is alapértelmezett `hr_szerepkor: "munkavallalo"` értéket küldött be mentéskor, ami egy tisztán `eaisyDocs`-os tagnál nem kívánt `hr_szerepkor` bejegyzést hozott létre.
4. **Egyirányú kliensoldali útvonal-védelem (`LayoutWrapper`):** A `LayoutWrapper` (`src/components/layout-wrapper.tsx`) átirányította a csak `hr` modullal rendelkező felhasználókat a `/hr` felületre, de a csak `docs` modullal (`elerheto_modulok: ["docs"]`) rendelkező felhasználókat nem irányította vissza az `eaisyDocs` (`"/"`) felületre, ha közvetlenül `/hr` URL-t nyitottak meg.

## 2. Decision (A Meghozott Döntés)

1. **Közvetlen tagfelvétel meghívó nélkül (új vagy meglévő felhasználó) és céges admin jogosultság (`src/app/actions/company-actions.ts`):**
   - A `getCompanyAccessAction`, `getCompanyMembersAction`, `removeCompanyMemberAction` és `updateCompanyMemberRoleAction` a cég tulajdonosa (`owner`) mellett a céges `admin` és `rendszergazda` szerepkörű tagok számára is engedélyezi a tagkezelést.
   - Létrejött a `getAvailableUsersForCompanyAction(companyId)` Server Action, amely kilistázza a rendszerben már regisztrált felhasználókat (`felhasznalo_profil` + `auth.users` e-mail) és jelzi, hogy tagjai-e már az adott cégnek (`alreadyMember`).
   - Az `inviteCompanyMemberAction` támogatja mind az új felhasználó közvetlen létrehozását (`email_confirm: true`, min. 6 karakteres kezdő jelszóval, meghívó e-mail kényszer nélkül), mind a meglévő felhasználó kiválasztását (`existingUserId` vagy e-mail egyezés alapján, jelszó bekérése nélkül).
2. **Szigorú modul-izoláció tagfelvételkor és szerepkör-szerkesztéskor:**
   - Ha a tagfelvétel az `eaisyDocs`-on belül történik (`module === "docs"`), az új felhasználó `felhasznalo_profil.elerheto_modulok` értéke kizárólag `["docs"]` lesz (`hr_szerepkor: null`, `hr_modulok: []`), a `company_members` táblában pedig `docs_szerepkor: data.role`, `hr_szerepkor: null`, `hr_modulok: []` kerül rögzítésre (és ha a választott szerepkör `admin` vagy `rendszergazda`, a `company_members.role` automatikusan `"admin"` lesz, megtartva az `"owner"` értéket a tulajdonosnál).
   - Az `EditMemberRoleDialog` `module === "docs"` esetén kizárólag a céges szintet és az `eaisyDocs` szerepkört szerkeszti, érintetlenül hagyva a `member.hr_szerepkor ?? null` értéket.
3. **Egységesített `getTeamMembers`, `createNewUser` és `updateUserRole` (`src/app/settings/settings-actions.ts`):**
   - A `getTeamMembers(targetCompanyId)` az aktív cég `company_members` rekordjaiból és a `felhasznalo_profil` táblából olvassa ki a cég `eaisyDocs` csapatát (azokat a tagokat, akiknek az `elerheto_modulok` tartalmazza a `"docs"` modult vagy explicit `company_members.docs_szerepkor` értékük van), és a cég-specifikus `docs_szerepkor`-t adja vissza.
   - A `createNewUser` az `inviteCompanyMemberAction`-nek delegál (`module: "docs"`), az `updateUserRole` pedig a `felhasznalo_profil` mellett az aktív cég `company_members.docs_szerepkor` és `company_members.role` mezőit is szinkronban frissíti.
4. **Kétirányú útvonal-védelem (`src/components/layout-wrapper.tsx`):**
   - Ha egy felhasználó `elerheto_modulok` tömbje csak a `"docs"` modult tartalmazza (`!elerhetoModulok.includes("hr") && elerhetoModulok.includes("docs")`), és `/hr` útvonalra navigálna, a `LayoutWrapper` azonnal visszairányítja a `"/"` (`eaisyDocs`) felületre.
5. **`erkeztetoszam_allokacio` összetett elsődleges kulcs és számláló-szinkron (`supabase/migrations/20261103000003_fix_erkeztetoszam_allokacio_pkey_and_sync_counters.sql`):**
   - A `public.erkeztetoszam_allokacio` tábla elsődleges kulcsa `PRIMARY KEY (ev)`-ről `PRIMARY KEY (company_id, ev)`-re módosult, így a `generate_erkeztetoszam(p_ev, p_company_id)` `ON CONFLICT (company_id, ev)` utasítása minden meglévő és újonnan importált cégnél hibamentesen működik; a migráció egyúttal szinkronizálta az `erkeztetoszam_allokacio`, `iktatoszam_allokacio` és `ugyszam_allokacio` számlálókat a meglévő rekordokkal.

## 3. Consequences (Következmények)

**Pozitív:**
- Az adminisztrátorok meghívó e-mail és bonyolult jelszószabály-blokkolás nélkül azonnal felvehetnek új vagy meglévő felhasználókat a kiválasztott cégbe, beleértve az `Admin` szerepkört is.
- Az `eaisyDocs`-ban felvett felhasználók azonnal megjelennek a cég `Csapat` listájában, és garantáltan csak az `eaisyDocs` modult látják (`eaisyHR` hozzáférés nélkül).

**Kockázat / Kompromisszum:**
- Ha egy korábban csak `eaisyDocs`-ra felvett felhasználónak később `eaisyHR` hozzáférést is adni kívánnak, azt az `eaisyHR` tagfelvételi felületén vagy a központi `Management Dashboard` (`/management`) felületen lehet engedélyezni az `elerheto_modulok` bővítésével.
