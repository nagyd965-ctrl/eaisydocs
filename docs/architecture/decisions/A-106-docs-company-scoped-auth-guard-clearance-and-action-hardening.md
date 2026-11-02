# A-106: [Docs] eaisyDocs 3. Csomag — Cég-Scoped Jogosultsági Őrblokk (`requireDocsAuthServer`), Globális Admin-Szivárgás Megszüntetése, Partner/Szerződés/Sablon/Selejtezés Akcióvédelem, PDF/Kép Audit-Naplózás és XSS/Redirect Védelem

- **Dátum:** 2026-11-02
- **Hatókör:** `[Docs]`
- **Státusz:** `Decided`
- **Kapcsolódó döntések és fájlok:**
  - [P-135](../../product/decisions/P-135-docs-role-scoped-action-protection-disposal-protocol-and-snippet-xss-safety.md)
  - `src/utils/hr/company-role-resolver.ts`
  - `src/utils/docs-auth-guard.ts`
  - `src/app/dossiers/[id]/actions.ts`
  - `src/app/dossiers/[id]/access-actions.ts`
  - `src/app/dossiers/[id]/version-actions.ts`
  - `src/app/dossiers/[id]/template-actions.ts`
  - `src/app/dossiers/dossier-actions.ts`
  - `src/app/dossiers/borrow-actions.ts`
  - `src/app/tasks/task-actions.ts`
  - `src/app/rules/rules-guard.ts`
  - `src/app/rules/rules-actions.ts`
  - `src/app/partners/actions.ts`
  - `src/app/partners/contract-actions.ts`
  - `src/app/archive/disposal-actions.ts`
  - `src/app/api/pdf/[id]/route.ts`
  - `src/utils/mailer.ts`
  - `src/app/api/send-email/route.ts`
  - `src/app/search/actions.ts`
  - `src/app/search/search-client.tsx`
  - `src/app/login/mfa-verify/page.tsx`
  - `src/components/mfa-verify-form.tsx`

## 1. Kontextus és Problémafelvetés

Az `eaisyDocs` 2026. november 2-i rendszerszintű mélyelemzése (`docs/eaisydocs-deep-analysis-20261102.md`) a 3. Csomagban (Task 3.1 – 3.5) a frontendről is közvetlenül tesztelhető jogosultsági, szerepkör-izolációs és biztonsági réseket azonosította:

1. **Globális `felhasznalo_profil.docs_szerepkor` átszivárgása és csak globális profilt olvasó Server Action-ök (Task 3.1):**
   - Ha egy felhasználó az A cégben admin volt (`felhasznalo_profil.docs_szerepkor = "admin"`), de a B cégben egyszerű tag (`company_members.role = "member"`, `docs_szerepkor = NULL`), a `resolveUserCompanyRoles` fallbackként visszaadta a globális `"admin"` szerepkört a B cégre is.
   - Több `eaisyDocs` Server Action (`checkDossierWritePermission`, `access-actions.ts`, `version-actions.ts`, `dossier-actions.ts`, `borrow-actions.ts`, `task-actions.ts`, `rules-guard.ts`) közvetlenül a globális `felhasznalo_profil` táblát kérdezte le a cég-specifikus jogosultság helyett.
2. **Partner CRUD, AI szerződésgenerátor, sablonkezelő és ügyirat-verzió/kiküldés jogosultsági rései (Task 3.2):**
   - A `partners/actions.ts` és `partners/contract-actions.ts` (`getAdminClient()` használatával) nem védett a csak olvasható (`betekinto`, `auditor`) szerepkörök írási kísérletei és a cégközi (`company_id`) hozzáférések ellen, a `getContractTemplatesAction` pedig minden olvasáskor felülírta a `rendszer_beallitas` táblát.
   - Az `uploadDocumentNewVersion` és `expediteExistingDocument` nem ellenőrizte, hogy a módosított `irat` valóban a megadott `ugyiratId`-hoz tartozik-e (`irat.ugyirat_id === ugyiratId`).
   - A `restoreDossierToArchive` nem tiltotta a véglegesen `selejtezett` ügyiratok visszaállítását.
3. **Selejtezési jegyzőkönyv letöltés és megőrzési idő ellenőrzés (Task 3.3):**
   - A `proposeDisposal` nem ellenőrizte szerveroldalon, hogy a `megorzesi_ido_vege` valóban lejárt-e (`<= todayIso`), a `getDisposalProtocolDownloadUrl` pedig nem ellenőrizte a `selejtezes_csomag.jegyzokonyv_path` és `company_id` egyezést, és nem írt `letoltve` bejegyzést az `esemeny_naplo` táblába.
4. **Kép/nem-PDF előnézet audit-naplózásának elmaradása és e-mail melléklet minősítés-ellenőrzés (Task 3.4):**
   - A `/api/pdf/[id]` végpontban a kép (`image/*`) és egyéb nem-PDF mellékletek kiszolgálása (`return new NextResponse(...)`) az `esemeny_naplo` (`megtekintve`) beszúrása előtt futott le, így a képek megtekintése nem került be az auditnaplóba.
   - A `sendEmailWithAttachment` (`/api/send-email`) nem ellenőrizte a felhasználó minősítési szintjét (`max_minosites` vs. `irat.minosites` / `ugyirat.minosites`) és az `irat.ugyirat_id === params.ugyiratId` összetartozást.
5. **Keresési találati kivonat (`snippet`) XSS és `/login/mfa-verify` Open Redirect (Task 3.5):**
   - A `/search` oldalon a `dangerouslySetInnerHTML`-lel megjelenített `snippet` nem szűrte ki az esetlegesen dokumentumszövegbe került HTML/script elemeket a `<b>...</b>` kiemeléseken kívül, a `/login/mfa-verify` pedig nem validálta a `redirectTo` query paramétert.

## 2. Architektúra Döntés

### 2.1. Cég-scoped szerepkör-feloldás és `requireDocsAuthServer` (`src/utils/hr/company-role-resolver.ts`, `src/utils/docs-auth-guard.ts`)
- A `resolveUserCompanyRoles` függvényben, ha a felhasználónak van `company_members` tagsága az adott cégben, de nem cég-admin (`!isCompanyAdmin`) és nincs explicit `membership.docs_szerepkor` megadva, a globális `profile.docs_szerepkor` `"admin"` vagy `"rendszergazda"` értékét `"ugyintezo"` szintre korlátozzuk. Így az A cégbeli admin jog nem szivárog át a B cégbe.
- Létrehoztuk a központi `requireDocsAuthServer(allowedRoles?, targetCompanyId?)` segédfüggvényt (`src/utils/docs-auth-guard.ts`), amely:
  1. Ellenőrzi a bejelentkezett munkamenetet, az aktív fiókot és az `"eaisydocs"` modulhozzáférést.
  2. Feloldja a célcég (`targetCompanyId` vagy `activeCompanyId`) szerinti tényleges `docsRole`, `maxMinosites` és `szervezetiEgysegId` értékeket.
  3. Ellenőrzi a `userHasCompanyAccess` tagságot és az `allowedRoles` szerepkörlistát.
- Bekötöttük a `requireDocsAuthServer`-t az ügyirat, hozzáférés-kezelő, verziókezelő, sablon, kölcsönzés, feladat és szabálymotor Server Action-ökbe.

### 2.2. Partner, Szerződésgenerátor, Sablon és Ügyirat műveletek védelme (`partners/actions.ts`, `contract-actions.ts`, `dossiers/[id]/*`)
- Minden partner- és szerződésmódosító művelet (`savePartner`, `togglePartnerStatus`, `savePartnerContact`, `deletePartnerContact`, `createCustomContractTemplateAction`, `deleteContractTemplateAction`, `generateContractDraftAction`, `finalizeAndFileContractAction`) megköveteli az írási szerepkört (`["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"]`) és a `.eq("company_id", auth.activeCompanyId)` szűrést.
- A `getContractTemplatesAction` csak akkor végez kezdeti seedelést a `rendszer_beallitas` táblába, ha az adott cég kulcsa még nem létezik.
- Az `uploadDocumentNewVersion` és `expediteExistingDocument` ellenőrzi az `irat.ugyirat_id === ugyiratId` egyezést; a `restoreDossierToArchive` pedig visszautasítja a `selejtezett` státuszú ügyiratok visszaállítását.

### 2.3. Selejtezési szabályok, PDF/Kép megtekintés naplózása, E-mail biztonsági ellenőrzés és XSS/Redirect védelem
- A `proposeDisposal` szerveroldalon ellenőrzi a lejárt megőrzési időt (`megorzesi_ido_vege <= todayIso`), a `getDisposalProtocolDownloadUrl` pedig ellenőrzi a `selejtezes/` prefixet, a `selejtezes_csomag.jegyzokonyv_path` és `company_id` egyezést, majd `letoltve` eseményt naplóz az `esemeny_naplo` táblába.
- A `/api/pdf/[id]/route.ts` végpontban az `esemeny_naplo` (`megtekintve`) bejegyzés minden fájltípusnál (PDF, kép és egyéb melléklet) a válasz visszaküldése előtt rögzül, a dokumentum cégében feloldott szerepkörrel.
- A `sendEmailWithAttachment` (`src/utils/mailer.ts`) ellenőrzi az írási jogosultságot, a cég-hozzáférést, az `irat.ugyirat_id` egyezést és a minősítési szintet (`CLEARANCE_LEVELS`).
- A keresési `snippet` (`search/actions.ts` és `search/search-client.tsx`) HTML-escape-eli az összes karaktert, kizárólag a `<b>` és `</b>` kiemelő tageket meghagyva; a `/login/mfa-verify` pedig a `getSafeRedirectPath(redirectTo) ?? "/"` függvénnyel szűri a visszairányítási útvonalat.
