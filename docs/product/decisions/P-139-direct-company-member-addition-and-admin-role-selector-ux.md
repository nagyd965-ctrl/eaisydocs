# P-139: Közvetlen Cégtag-Hozzáadás Meghívó Nélkül, „Admin” Szerepkör-Kiválasztó és Céges Csapat Szinkronizáció UX

**Status:** Decided  
**Date:** 2026-11-03  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Category:** `Settings / Multi-Tenancy, Company Members & Team Management UX`  
**Author:** Antigravity Agent  
**Kapcsolódó ADR:** [A-110](../../architecture/decisions/A-110-direct-company-member-addition-and-bidirectional-module-isolation.md)  
**Kapcsolódó Kód:** `src/components/settings/invite-user-dialog.tsx`, `src/components/settings/edit-member-role-dialog.tsx`, `src/components/settings/company-settings-tab.tsx`, `src/components/settings/team-tab.tsx`, `src/components/layout-wrapper.tsx`  

---

## 1. Question / Problémafelvetés

Az `eaisyDocs -> Beállítások -> Cég` (`CompanySettingsTab`) felületen a `Tag hozzáadása` gombra kattintva megnyíló dialógusban (`InviteUserDialog`):
1. A modál címe és gombja „Felhasználó meghívása” / „Meghívás” volt, és a küldés gomb inaktív (`disabled`) maradt, amíg 5 szigorú jelszófeltétel és egy megerősítő jelszómező nem teljesült. Meglévő felhasználót nem lehetett jelszó nélkül kiválasztani.
2. A szerepkör-választó legördülőben az `Admin` szerepkör nem „Admin” néven és nem a lista élén szerepelt, a `@base-ui/react/select` `<SelectValue>` pedig nem jelenítette meg a magyar szerepkör-címkét.
3. A céghez felvett tag nem jelent meg azonnal a `Beállítások -> Szervezeti Egységek -> Csapat` (`TeamTab`) nézetben, és biztosítani kellett, hogy az `eaisyDocs`-ban hozzáadott tag kizárólag az `eaisyDocs` felületet lássa.

## 2. Decision (A Meghozott Döntés)

1. **„Tag hozzáadása” kétmódusú dialógus (`src/components/settings/invite-user-dialog.tsx`):**
   - A modál címe és elsődleges műveleti gombja **„Tag hozzáadása”**, amely soha nincs némán letiltva jelszószabályok miatt.
   - A modál tetején kétmódusú választókapcsoló található:
     - **Új felhasználó:** *Teljes név*, *Email cím* és *Kezdő jelszó* (min. 6 karakter, szem ikonnal megjeleníthető, megerősítő mező nélkül). A fiók azonnal aktív lesz meghívó nélkül.
     - **Meglévő felhasználó:** Kereshető lista a rendszerben már regisztrált felhasználókról (`Név`, `Email`, `Már tag` jelzés), ahol egy kattintással, jelszó megadása nélkül kiválasztható a munkatárs.
2. **„Admin” szerepkör kiemelése és pontos címkézése (`InviteUserDialog`, `EditMemberRoleDialog`, `TeamTab`):**
   - Az `eaisyDocs` szerepkör-választó (`Select`) sorrendje: **`Admin`**, `Rendszergazda`, `Vezető / Szignáló`, `Iratkezelő / Iktató`, `Ügyintéző`, `Betekintő`, `Auditor`.
   - Minden `@base-ui/react/select` `<SelectValue>` komponens explicit magyar feliratot (`DOCS_ROLE_LABELS[role]` / `HR_ROLE_LABELS[role]`) kap gyermekként.
3. **Azonnali szinkronizáció a Cég Tagok és a Szervezeti Egységek -> Csapat között (`CompanySettingsTab`, `TeamTab`):**
   - Tag hozzáadása, importálása, szerepkör-módosítása vagy törlése után a `router.refresh()` azonnal frissíti a szerveroldali `teamMembers` propot is, így a tag külön oldalfrissítés nélkül megjelenik a `Csapat` fülön.

## 3. Rationale (Indoklás)

A vállalati adminisztrátorok számára a közvetlen (meghívó nélküli) fióklétrehozás és a már regisztrált felhasználók egykattintásos céghez rendelése megszünteti a regisztrációs súrlódást, miközben a szigorú modul-izoláció (`elerheto_modulok: ["docs"]`) garantálja, hogy az iratkezelőbe felvett munkatársak csak a számukra előfizetett modult érjék el.
