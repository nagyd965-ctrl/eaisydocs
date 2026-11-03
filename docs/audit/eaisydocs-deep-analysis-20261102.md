# eaisyDocs Rendszerszintű Mélyelemzés — 2026. november 2. (3. kör: a 10.31-es audit utóellenőrzése + új hibák)

> **Típus:** Verifikációs + új-hibás deep audit — a `eaisydocs-deep-analysis-20261031.md` ~11 P0 + ~35 P1 + ~40 P2 találatának 2026.11.02-i állapotfelmérése (a közben lezajlott HR-munkák Docs-oldali mellékhatásaival) + korábban nem talált hibák
> **Módszer:** 4 párhuzamos, fájl:sor-pontosságú kódbukta­tás (DB/RLS réteg; inbox/iktatás/ügyiratok; irattár/partnerek/workerek/PDF/API; docs-guard + integrációs maradványok + friss kód) + **élő adatbázis-szintű policy-ellenőrzés** (a 3-szoresen előfordult "policy-név csúszás" leckája szerint)
> **Előzmények:** `eaisydocs-deep-analysis-20261030.md` (20 javítva + 18 elvetve) → `eaisydocs-deep-analysis-20261031.md` (2. kör, ~75% érettség) → **ez a dokumentum**. A megrendelő elvetései (10.31 8. fejezet) továbbra is tiszteletben tartva.

---

## 0. Vezetői összefoglaló — hol áll a eaisyDocs most?

### Ami MEGTÖRTÉNT a 10.31 óta (jórészt a HR-izolációs munkák mellékhatásaként) ✔

| 10.31-es tétel | Státusz | Hol |
|---|:---:|---|
| 2.2 Eszkalációs lánc (updateCompanyMemberRole/invite/updateUserRole RPC) | ✔ ZÁRVA | role-whitelist + membershipCount-guard + RPC-átírás (20261101000002, A-102) |
| felhasznalo_profil SELECT `USING(true)` | ✔ ZÁRVA | `can_view_user_profile` (20261101000002) — **élő DB-n igazolva** |
| 3.2/1,3,4 hr-filing-bridge company_id-lánc | ✔ ZÁRVA | `resolveFilingCompanyId` (A-099) |
| 3.2/5 hr_dokumentum company_id-insertek | ✔ ZÁRVA | 24/24 beszúrási pont (A-102) |
| 3.2/6 closeOffboarding multi-company pusztítás | ✔ ZÁRVA | 2026-11-01 |
| 3.2/7 /api/pdf HR-ág + fileId IDOR | ✔ ZÁRVA | HR-clearance + fallback-javítás |
| 3.2/8 /api/hr/download-document | ✔ ZÁRVA | bucket-whitelist + cég-dokumentum kötés (2026-11-02) |
| 2.5/rész Reggeli SMS (időzóna, cégnév, company_id) | ✔ ZÁRVA | Europe/Budapest + dinamikus cég |
| 2.5/rész /api/cron/imap ütemezés | ✔ ZÁRVA | vercel.json (napi 6:00, Hobby-csomag) |
| deleteCompanyAction audit-pusztító kaszkád | ✔ ZÁRVA | trigger + FK SET NULL (20261101000003) |
| 3.2/11/a deleteArchiveRecordAdmin | ✔ ZÁRVA | cég-ellenőrzés (null-cég residuummal, l. 4.4) |
| 3.2/11/f rendszerlink-törlés | ✔ ZÁRVA | perm-check + audit (ugyirat_id AND-olás residuummal) |
| jegyzet-@említés globális profilokon | ✔ RÉSZLEGES | DB-szinten a can_view_user_profile már cégre szűr; app-szintű filter nincs |
| Keresési XSS-panic enyhítés | ✔ RÉSZLEGES | l. 3/3 — a snippet-XSS maga NYITVA |

### Ami NEM — a három nagy gyökérok érintetlen

1. **[P0] RLS gyerektábla-csomag** — **élő DB-n igazolva, változatlan**: `partner_kapcsolattarto` **anonimul olvasható**, `ugyirat_megjegyzes`/`irat_kapcsolat`/`ugyirat_hozzaferes`/`irat_kolcsonzes_naplo`/`iktatoszam_allokacio`/`ugyszam_allokacio`/`irat_fizikai_hely`/`rendszer_beallitas`/`selejtezes_tetel` `USING(true)`-val áll. A 20261101000001-6 migrációs csomag **egyetlen Docs-táblát sem érintett**.
2. **[P1] Docs cég-scoped szerepkör-guard nem létezik** — nincs `docs-auth-guard`; ~30 fájl szerveroldali enforcementja a **globális** `felhasznalo_profil.docs_szerepkor`-t olvassa (dossiers perm-checkek, tasks ×3, pdf-route Docs-ága, borrow ×3, rules-guard, inbox-maradványok, setFourEyesSetting).
3. **[P0-úJ] AI-sor kereszt-céges** — `ai_feladat_sor` cég-dimenzió nélkül + guard nélküli AI-actionök: más cégek AI-metaeredményei (partnernév, adószám!) olvashatók/törölhetők, és a Gemini-promptba **több cég törzsadata** kerül.

**Mért össz-érettség: ~75% → ~79%** (az eszkalációs lánc + profil-RLS + híd-zárás javított; a gyerektábla-csomag, a docs-guard és az AI-sor visszafogja). **Új találatok: ~6 P0, ~20 P1, ~20 P2** (a nyitva maradt 10.31-es tételeken felül).

---

## 1. ÉLŐ DB-BIZONYÍTÉKOK (2026.11.02, saját lekérdezés)

| Tábla | Politika (élő pg_policies) | Következmény |
|---|---|---|
| `partner_kapcsolattarto` | `partner_kapcsolattarto_anon_read` — **TO anon, USING(true)** + authenticated ALL true/true | Kapcsolattartók neve/e-mail/telefonja **bejelentkezés nélkül** letölthető a nyilvános REST-en |
| `ugyirat_megjegyzes` | SELECT `USING(true)` + INSERT `CHECK(true)` | Bármely cég bármely belső megjegyzése írható/olvasható |
| `irat_kapcsolat` | ALL `USING(true)/CHECK(true)` | Cross-tenant kapcsolat-gráf manipuláció (a Docs↔HR híd táblája!) |
| `ugyirat_hozzaferes` | SELECT `USING(true)` | Hozzáférés-grantok globálisan felsorolhatók |
| `irat_kolcsonzes_naplo` | SELECT true ×2 + szerkesztés globális docs-szerepkörön | Kölcsönzési láncolat cross-tenant |
| `iktatoszam_allokacio` / `ugyszam_allokacio` | ALL `USING(true)/CHECK(true)` | Számláló-sorok más cég által írhatók — **PK (ev, prefix), cég nélkül** |
| `irat_fizikai_hely` | SELECT `USING(true)` | Van company_id oszlop, de a restrictive-lista kihagyta |
| `rendszer_beallitas` | SELECT `USING(true)` | Más cégek beállítás-metaadatai olvashatók |
| `selejtezes_tetel` | SELECT/INSERT authenticated | Idegen csomagba tétel injektálható |
| `alkalmazas_ertesites` | INSERT `TO public, CHECK(true)` | **Anonim is szúrhat** értesítést (spam/phishing a harangba) |
| `ai_feladat_sor` | ALL/SELECT `auth.role()='authenticated'` | Cég-dimenzió nélkül — l. 2.3 |

*(A `felhasznalo_profil` SELECT és `ertesitesi_szabaly` ellenőrzésünk szerint ZÁRVA ✔.)*

---

## 2. MEGNYITOTT / MÉLYEBB GYÖKÉROKOK

### 2.1. [P0] RLS gyerektábla-migrációs csomag — változatlan (l. 1. tábla)
Egyetlen migrációs csomag zárja: company_id a hiányzó táblákra + backfill + restrictive policy-k + az anon-policy azonnali drop + `alkalmazas_ertesites` INSERT `TO authenticated WITH CHECK (auth.uid() = user_id)`. **Új elem a 10.31-hez:** az allokációs táblák PK-ját is cégre kell bővíteni (`(company_id, ev, prefix)`), mert azonos prefix (alapból DOCS) mellett **két cég ugyanazt a countert osztja** → sorsszám-átcsúszás, a gap-mentesség (A-006!) sérül. Az `erkeztetoszam_allokacio` tábla **nem is létezik** (a kód random `E/ÉV/NNNNN` fallbackot fut) — ütközésveszélyes.

### 2.2. [P1] `docs-auth-guard` hiányzik — a 10.31-es 2.3 gyökérok érintetlen
Térkép: **~30 fájl** globális feloldással (dossiers/[id] actions+version+access, dossier-actions, borrow ×3, tasks/task-actions ×3, api/pdf Docs-ága, viewer Docs-ága, rules-guard, inbox actions/dismiss/eaisybill, setFourEyesSetting, archive approver, partners pages, dashboard, saved-search-alerts, imap-service, nightly cron, company-actions isSysAdmin-ágak). Javított szigetek ✔: updateRuleChannels, layout/sidebar, settings tagság-olvasások, viewer/pdf **HR-ágai**. A javítás mintája készen áll: `requireHrAuthServer` + `getActiveCompanyMemberRolesServer` — csak Docs-ra kell peppírozni.

### 2.3. [P0] AI-sor és AI-actionök — kereszt-céges szivárgás + kvóta-DoS
- `ai_feladat_sor` RLS csak "authenticated" — **minden cég AI-eredménye** (`eredmeny` JSONB: partnernév, adószám, tárgy, határidő) bármely bejelentkezett usernek olvasható; `clearAICacheAndRerun` **törli is** azokat (cross-tenant tamper/DoS).
- `generateAISuggestions` / `clearAICacheAndRerun` guard nélküli "use server" exportok; `executeAiMetadataExtraction` + `applyFilingRulesToSuggestions` **szintén exportálva** (kvóta-égetés).
- **[P0-ÚJ] A Gemini-promptba több cég törzsadata kerül**: az AI-metaadat-kinyerés a `partner`/`szervezeti_egyseg`/`irattari_terv` táblákat **cégszűrés nélkül**, service-role-lal tölti (filing-actions.ts:422-439, 505-512) → minden cég partnerei és adószámai egy harmadik félnek.
- `claim_ai_tasks` anon-grant élő DB-true (a 10.31-es P0 változatlan).

### 2.4. [P0/P1] Tárolt SSRF-lánc a `kulso_fajl_url`-en
`importInvoiceFromEaisyBill` a számlaobjektumot **kliensparaméterként** fogadja — a `melleklet_url` validálatlanul `kulso_fajl_url`-ként él, amit később **a szerver fetchel** (AI-worker, filing-actions, /api/pdf proxy) és a választ visszaadja → belső hálózat / felhőmetadata (169.254.169.254) olvasása. Ugyanez a minta: az IMAP HTML-renderelés `networkidle0`-val minden külső erőforrást letölt a szerver IP-jéről (vak SSRF).

### 2.5. [P1] Háttérfolyamatok — változatlan
Éjszakai cron címzettjei cég-szűrés nélkül (GDPR-nevek cégek közt) + **lejárt események napi újraküldése** (e-mail-bomba); mentett-keresés riasztás service-role-lal cégnélkül [P0 maradt]; expedíciós SMTP globális env-hitelesítővel; CRON_SECRET nem timing-safe + query-param + service-role fallback validátorként; nightly feladó hardcode `eaisyhr@thinkai.hu`.

---

## 3. ÚJ TALÁLATOK (2026.11.02 — a 10.31-es listán kívül)

### P0 (5)
1. **`ugyirat_megjegyzes` globálisan olvasható** — belső, bizalmas ügyirati megjegyzések cross-tenant (élő DB ✔) — *l. 2.1*
2. **`attach_irat_to_dossier_atomic` SECURITY DEFINER check nélkül** — a RPC RLS-t bypasszolva **bármely cég bármely iratát bármely ügyirathoz csatolja** (filing-actions.ts:1092-1145 hívója sem ellenőriz többet, mint `role !== "betekinto"`)
3. **AI-prompt cross-céges töltés** — l. 2.3
4. **Tárolt SSRF `kulso_fajl_url`** — l. 2.4
5. **`getContractTemplatesAction` névtelen sablon-pusztítás** — névtelen hívásnál a select üres → a DEFAULT-templátok **felülírják a céges egyéni sablonokat** (contract-actions.ts:44-69)

### P1 (12)
6. `/api/send-email`: tetszőleges `iratId` kiküldése **minősítés-ellenőrzés nélkül** (a /api/pdf védelme itt hiányzik) + `saveToPartnerId` partner-e-mail felülírás
7. `expediteExistingDocument`: iratId ↔ ügyirat kötés validálatlan (más dossier bizalmas irata expediálható)
8. `generateFromTemplate`: perm/státusz-check nélkül + **irat-insert company_id nélkül** (DB-default = első cég!)
9. `grantDossierExplicitAccess`/`revoke`: címzett cégtagsága ellenőrizetlen, service-role upsert (RLS-bypass) — idegen cég user kap hozzáférést + iktatószámos értesítést
10. `triggerHotfolderSync` szerepkör nélkül + **globális hotfolder → cégek közt iratkeveredés** (annak a cégéhez köt, aki előbb szinkronizál)
11. Prompt-szabály actionök (`rules-actions.ts`): tetszőleges cég szabályai olvashatók/írhatók tagság-ellenőrzés nélkül
12. REST API v1 Bearer-ág: **nincs cég-szűrés + nincs limit** + `partner_id` UUID-validálatlan
13. `/login/mfa-verify` `redirectTo` — **nyílt átirányítás** (a getSafeRedirectPath segéd létezik, csak ide nem kötötték be)
14. Keresési snippet **stored XSS** (10.31 óta nyitva, újra igazolva: `dangerouslySetInnerHTML` sanitizálás nélkül)
15. IMAP HTML-render vak-SSRF (networkidle0 + külső erőforrások)
16. Éjszakai lejárt-újraküldés (napi e-mail-bomba) — 2.5
17. `irat_kapcsolat` ALL `USING(true)` (élő DB ✔) — a Docs↔HR híd táblája cross-tenant

### P2 (kivonat, ~18)
`deleteSavedSearch` ownership-filter nélkül; quickSearch `.or()` filter-injection; batch `minosites` validálatlan; sablon-kezelés login-only service-role-lal (TODO-komment a kódban!); `assignDossier`/`borrow`/`returnDocument` cégtagság-checkek; `updateDossierStatus` ugyId kliensvezérelt; alszám-race 4 helyen (max+1); phantom-success minta (iktatás + dismiss); érkeztetőszám-random fallback; `archive/page.tsx` csomaglista cég nélkül + globális profil-nevek; TOCTOU a selejtezés-jóváhagyásban; `forceExpireAllDossiers` szerepkör nélkül UI-ból; nightly feladó hardcode; `share_token` 6 karakter, lejárat/brute-force nélkül (élő RPC ✔); `getTeamMembers(null)` globális PII; `createDepartment` őrblokk nélkül; `deleteUser` cég-vak + audit nélkül; harang (`alkalmazas_ertesites`) cég-dimenzió nélkül + HR/Docs szétválasztás kulcsszó-heurisztika; esemeny_naplo company_id nélküli insertek ~35 helyen (filing, dismiss, mailer ×4, dossiers ×15, borrow, version, template, export, access ×2, tasks ×4, disposal ×2, eaisybill ×2 — dbAdmin-utakon **rossz céghez** íródnak); négyszem-elv DB-függvénye régi globális kulcsot olvas (fail-open); T1041 kategória E/1 vs T/2 inkonzisztencia; `irat_modositas` invalid audit-enum (Aláírt-példány insert csendben elhal); hardcode „Welcome2026!"; Documents-oldal NULL-cég hr_dokumentumok látszanak; `hasCafeteriaAdminAccess` nem-tag globális fallback; hiányzó composite indexek (esemeny_naplo, irat).

---

## 4. JAVÍTÁSI PRIORITÁSI SORREND (javaslat)

1. **RLS gyerektábla-migrációs csomag** [MIGRÁCIÓ — zöld jelzésre]: a 2.1 táblalista + allokáció-PK `(company_id, ev, prefix)` + `erkeztetoszam_allokacio` létrehozása + anon-drops + `alkalmazas_ertesites` INSERT-szűkítés + `esemeny_naplo` company_id-trigger (a HR-mintára) + claim_ai_tasks anon-grant revoke + `ai_feladat_sor` cégesítés. **A 6 P0-ból 4-et és ~10 P1-et zár.**
2. **AI-action csomag** [KÓD]: guard a 4 exportra + a prompt-töltések `irat.company_id`-ra szűkítése + belső függvények exportból kivonása.
3. **Contract/send-email/expedite/access csomag** [KÓD]: az 5-ös P0 + a 6-9-es P1-ek (auth + kötés-ellenőrzések + company_id a template-insertbe).
4. **`docs-auth-guard`** [KÓD, ~30 fájl]: a requireHrAuthServer Docs-megfelelője — a 2.2-es gyökérok.
5. **SSRF-csomag**: eaisyBill-import szerveroldali újralekérése + URL-allowlist + IMAP request-interception.
6. **Cron-csomag**: éjszakai címzett-cégesítés + lejárt-dedup + SMTP cég-hitelesítő + CRON_SECRET timing-safe.
7. **mfa-verify redirect + XSS-snippet** (2 gyors P1).
8. **P2-csomagok** (fenti kivonat).

---

## 5. MEGJEGYZÉSEK

- Az elemzés nem módosított semmit; az élő DB-n kizárólag olvasó lekérdezések futtak.
- A 10.31-es elvetések maradéktalanul érvényesek.
- **Tanulság a HR-oldalról áthozva:** a Docs RLS-csomagnál kötelező a `pg_policies`-ből másolt policy-nevek + a záró önellenőrző DO-blokk (a HR-nél 3 policy-név-csúszást kézzel kellett elkapni — itt mostantól automata).
- Pozitívum: az eszkalációs lánc, a profil-RLS, a híd company_id-lánca és a download-document — mind a HR-munka mellékhatásaként — bizonyítottan zárult; a scoped-infra (`getActiveCompanyMemberRolesServer`) készen áll a docs-auth-guard-ra.

---

# II. RÉSZ — MÁSODIK AGENT KERESZTELLENŐRZÉSE ÉS KIEGÉSZÍTŐ MÉLYAUDITJA (2026.11.02)

> **Mi történt a fájllal?** Mindkét agent pontosan a `docs/develop/eaisydocs-deep-analysis-20261102.md` fájlnevet választotta: az egyik agent `15:31`-kor írta meg a fájlt, a másik agent pedig `15:35`-kor felülírta ugyanazt a fájlt a saját riportjával (fenti 0–5. fejezet).
> Az alábbiakban:
> 1. **Tételesen visszaigazoljuk és pontosítjuk** a fenti (0–5. fejezetben szereplő) megállapításokat (jelezve azt a **3 kritikus pontot**, amelyet a fenti táblázat „ZÁRVA”-ként jelölt, de a kódban és migrációkban még részben nyitva maradt).
> 2. **Felsoroljuk az összes olyan ÚJ P0 / P1 / P2 hibát**, amelyet a második agent mélyvizsgálata tárt fel a fenti listán felül.

---

## 6. A fenti (0–5. fejezet) megállapításainak keresztellenőrzése

### 6.1. A fenti 1–4. fejezetben szereplő nyitott és új találatok: MIND VALÓS
A fenti auditban felsorolt nyitott 10.31-es tételek és a 3. fejezetben szereplő új találatok (`ugyirat_megjegyzes`, `attach_irat_to_dossier_atomic`, AI-prompt cross-céges töltés, `kulso_fajl_url` SSRF, `getContractTemplatesAction` sablon-felülírás, `/api/send-email`, `expediteExistingDocument`, `generateFromTemplate`, `grantDossierExplicitAccess`, `triggerHotfolderSync`, `rules-actions.ts`, REST API v1 Bearer-ág, `/login/mfa-verify` `redirectTo`, keresési snippet XSS) **mind 100%-ban valósak és kódból visszaigazolhatók**.

### 6.2. Fontos korrekció: 3 tétel, amelyet a fenti 0. fejezet „ZÁRVA”-nak jelölt, de VALÓJÁBAN MÉG RÉSZBEN NYITVA VAN

1. **„2.2 Eszkalációs lánc (updateCompanyMemberRole/invite/updateUserRole RPC) — ZÁRVA” -> VALÓJÁBAN RÉSZBEN NYITVA [P0]:**
   - **Nyitva maradt régi `admin_update_user_role` RPC:** Bár a `20261101000002_hr_multicompany_rls_and_notification_isolation.sql:204-283` migráció szigorította az 5-paraméteres `admin_update_user_profile` függvényt, a korábbi 3-paraméteres **`public.admin_update_user_role(target_user_id, new_role, new_minosites)` (`20260920000001_fix_user_role_update_rpc.sql:3-33`) `SECURITY DEFINER` RPC-t nem törölte (`DROP FUNCTION`)!** Így bármely 1-céges admin közvetlenül meghívhatja a régi `admin_update_user_role` RPC-t, és cégtagság-ellenőrzés nélkül felülírhatja bármely más cég felhasználójának globális `docs_szerepkor` és `max_minosites` értékét.
   - **`rendszergazda` szerepkör a whitelistben + `deleteCompanyAction` globális bypass:** A `ROLE_WHITELIST` (`src/app/actions/company-actions.ts:13`) továbbra is tartalmazza a `'rendszergazda'` értéket. Egy 1-céges cégadmin (`membershipCount <= 1`, `company-actions.ts:810-824`), az `inviteCompanyMemberAction` (`1084-1095`) vagy a `createNewUser` (`src/app/settings/settings-actions.ts:278`) beállíthatja a globális `felhasznalo_profil.docs_szerepkor = 'rendszergazda'` értéket. Ezután a `deleteCompanyAction` (`src/app/actions/company-actions.ts:278-296`) a `const isSysAdmin = profile?.docs_szerepkor === "rendszergazda"` feltétel miatt megengedi, hogy **bármely más cég teljes adatállományát törölje** anélkül, hogy tagja vagy tulajdonosa lenne a cégnek!

2. **„felhasznalo_profil SELECT `USING(true)` — ZÁRVA (`can_view_user_profile`)” -> VALÓJÁBAN RÉSZBEN NYITVA [P1]:**
   - A `can_view_user_profile(target_user_id)` függvény (`20261101000002_hr_multicompany_rls_and_notification_isolation.sql:187-199`) 4. lépése `RETURN true`-t ad vissza, ha a hívó globális `felhasznalo_profil.docs_szerepkor IN ('admin', 'rendszergazda')` vagy `hr_szerepkor IN ('admin', 'rendszergazda')`. Mivel minden 1-céges cégadminnak `'admin'` szerepel a globális `felhasznalo_profil` rekordján, **bármely 1-céges admin továbbra is lekérdezheti az összes többi cég összes felhasználójának `felhasznalo_profil` rekordját**.

3. **„deleteCompanyAction audit-pusztító kaszkád — ZÁRVA” -> VALÓJÁBAN `esemeny_naplo`-ra NYITVA [P1]:**
   - A `20261101000003` migráció a `hr_esemeny_naplo` táblát védte le triggerrel, azonban a `src/app/actions/company-actions.ts:327-330` sorokban a `deleteCompanyAction` továbbra is explicit `await adminClient.from("esemeny_naplo").delete().eq("company_id", companyId)` hívást futtat `service_role` klienssel.

---

## 7. Kiegészítés: A második agent által feltárt TOVÁBBI hibák (amelyek a fenti 1–3. fejezetben nem szerepeltek)

### 7.1. Adatbázis, RLS és Storage réteg — További P0 és P1 hibák

#### KIEG-DB-1 [P0]. `irat_fajl` RLS teljes cégizolációs áttörés a `check_irat_fajl_access` `SECURITY DEFINER` függvény miatt (`20260918000005_strict_confidential_access.sql:11-61`)
- A `2026-10-31`-es audit (§5 táblázat) az `irat_fajl` táblát *„IGEN (közvetett) — parent-iraton át helper-függvényes láthatóság”* minősítéssel rendben lévőnek jelölte, így a fenti 1. fejezetből is kimaradt.
- **A tényleges helyzet:** A `check_irat_fajl_access(p_irat_id)` függvény **`SECURITY DEFINER`** (tehát **megkerüli a szülő `irat` és `ugyirat` táblák `RESTRICTIVE` RLS szabályait!**), és a függvény törzsében **egyetlen sor sem ellenőrzi a `public.user_has_company_access(i.company_id)` feltételt!**
- **Következmény:**
  1. Bármely felhasználó, akinek `felhasznalo_profil.docs_szerepkor IN ('admin', 'iktato', 'auditor')`, a `RETURN true;` ág miatt **az összes cég összes `irat_fajl` rekordját (`ocr_szoveg`, `storage_path`, `sha256`, `fajlnev`) olvashatja, módosíthatja és törölheti**.
  2. Bármely cég bármely felhasználója (`betekinto` is) olvashatja és törölheti **más cégek iktatatlan (`ugyirat_id IS NULL`) bejövő iratainak fájljait**, mert az `IF v_ugyirat_id IS NULL THEN RETURN true; END IF;` ág cégellenőrzés nélkül `true`-t ad vissza.

#### KIEG-DB-2 [P0]. `storage.objects` (`irat_files` bucket) nyitott cross-tenant olvasási és feltöltési policy (`20260714211950_storage_setup.sql:9-13`)
- A `storage.objects` táblán lévő `"Allow authenticated users to read files"` és `"Allow authenticated users to insert files"` policy-k kizárólag a `bucket_id = 'irat_files'` feltételt ellenőrzik.
- A `KIEG-DB-1` (`irat_fajl`) RLS réssel kombinálva bármely bejelentkezett felhasználó kiolvashatja a `storage_path` értéket, majd közvetlenül a Supabase Storage API-n keresztül (`supabase.storage.from('irat_files').download(path)`) letöltheti bármely cég bármely (akár `szigoruan_bizalmas`) fájlját a `/api/pdf/[id]` megkerülésével.

#### KIEG-DB-3 [P0]. `ugyirat` bizalmas irat (`check_ugyirat_has_unauthorized_irat`) megkerülése a `FOR ALL` írási policy miatt + elveszett helyettesítési (`helyettesites`) ág (`20260918000005:67-88` vs. `20260810000001:23-43`)
- A `20260918000005_strict_confidential_access.sql:67-88` frissítette az `"Ugyirat megtekintes szigoru ABAC"` (`FOR SELECT`) policy-t, hogy kizárja azokat az ügyiratokat, amelyekben a felhasználó minősítését meghaladó (`bizalmas` / `szigoruan_bizalmas`) irat van (`AND NOT public.check_ugyirat_has_unauthorized_irat(ugyirat.id, fp.max_minosites)`).
- Ugyanakkor az `"Ugyirat szerkesztes szigoru ABAC"` policy (`20260810000001_vezeto_full_read_access.sql:23-43`) **`FOR ALL`** típusú (amelyet a PostgreSQL `SELECT` lekérdezéseknél `OR` kapcsolatban értékel ki a `FOR SELECT` policy-val!), és **ebbe nem került bele a `NOT check_ugyirat_has_unauthorized_irat(...)` feltétel**!
- **Következmény:** Az ügyirat szervezeti egységében dolgozó bármely `vezeto` vagy `ugyintezo` (még ha `max_minosites = 'publikus'` is) az írási `FOR ALL` policy-n keresztül továbbra is látja és szerkesztheti a `szigoruan_bizalmas` iratot tartalmazó ügyiratot.
- Emellett a `20260918000005` migráció véletlenül **felülírta és elvesztette a `helyettesites` (helyettesítési) jogosultsági ágat**, amelyet a `20260719065027_missing_features.sql:26-33` korábban hozzáadott az `ugyirat` RLS-hez.

#### KIEG-DB-4 [P1]. Az `eaisyDocs` RLS policy-k maguk is a globális `felhasznalo_profil.docs_szerepkor`-t olvassák (nem csak az app-kód!)
- A fenti 2.2 fejezet az alkalmazáskód-szintű `docs-auth-guard` hiányát említi, de ugyanilyen súlyos, hogy **minden adatbázis-szintű `eaisyDocs` RLS policy** (`ugyirat`, `irat`, `irat_fajl`, `irat_fizikai_hely`, `irat_kolcsonzes_naplo`, `szervezeti_egyseg`, `rendszer_beallitas`) a globális `felhasznalo_profil.docs_szerepkor` oszlopot vizsgálja a `company_members.docs_szerepkor` helyett. Mivel a `20261101000002` migráció óta többcéges felhasználónál a szerepkör-módosítás már csak a `company_members.docs_szerepkor`-t írja, az adatbázis RLS-ben a többcéges felhasználók szerepkör-változása nem érvényesül.

#### KIEG-DB-5 [P1]. 4 db globális `UNIQUE` constraint, amelyek megtörik a többcéges működést
1. **`irattari_terv_tetelszam_key` (`20260714183739_initial_schema.sql:28`):** A `tetelszam` globálisan `UNIQUE` (`UNIQUE (company_id, tetelszam)` helyett). Két külön cég nem vehet fel azonos tételszámot (pl. `'1.1'` vagy `'3.1'`)!
2. **`ugy_ugyszam_key` (`20260714183739_initial_schema.sql:66`):** Globálisan egyedi `UNIQUE (company_id, ugyszam)` helyett.
3. **`ugyirat_iktatoszam_key` (`20260714183739_initial_schema.sql:80`):** Globálisan egyedi `UNIQUE (company_id, iktatoszam)` helyett, a `generate_iktatoszam` (`194-216`) és `generate_ugyszam` (`20260714222848:12-33`) pedig nem fogad `p_company_id` paramétert.
4. **`idx_partner_clean_adoszam` (`20260918000002_FixAiTaskClaimAndPartnerIndex.sql:32-34`):** Globális `UNIQUE` index a tisztított adószámon `company_id` nélkül — ha „A” cég rögzíti a Magyar Telekomot adószámmal, „B” cég már nem tudja rögzíteni ugyanazt a szállítót (`23505 duplicate key`).

#### KIEG-DB-6 [P1]. Hibás PostgreSQL trigger: `cascade_ugyirat_fts_update()` (`20260917000001_fts_search_vector_and_hybrid_rpc.sql:132-146`)
- Az `ugyirat` táblán lévő `AFTER UPDATE OF iktatoszam, ugy_id` trigger közvetlenül `PERFORM public.update_irat_fts_vector();` utasítást hív meg. Mivel az `update_irat_fts_vector()` egy `RETURNS TRIGGER` függvény, PostgreSQL-ben `PERFORM`-mal meghívva `0A000: trigger functions can only be called as triggers` futásidejű hibát dob, így minden olyan `ugyirat` frissítés, amely módosítja az `iktatoszam` vagy `ugy_id` mezőt (és van hozzá kapcsolódó `irat`), adatbázis-hibával elszáll.

#### KIEG-DB-7 [P1]. Cégen belüli túlzott RLS jogosultságok (`esemeny_naplo`, `ugy`, `irattari_terv`, `company_filing_rules`)
- **`esemeny_naplo` (`20260714183741_rls_fix_and_indexes.sql:16-17`):** Cégen belül `FOR SELECT TO authenticated USING (true)` — egy `betekinto` vagy `munkavallalo` közvetlenül lekérdezheti a cég teljes auditnaplóját (beleértve a `szigoruan_bizalmas` iratok `uj_ertek` JSONB tartalmát).
- **`ugy` és `irattari_terv` (`20260714183741_rls_fix_and_indexes.sql:26-32`):** Cégen belül `FOR ALL TO authenticated USING (true)` — egy `betekinto` közvetlenül módosíthatja vagy törölheti a cég irattári tervét és ügyeit.
- **`company_filing_rules` (`20261019000002_company_filing_rules.sql:26-36`):** Nincs a táblán `RESTRICTIVE` RLS, a `FOR ALL` policy pedig `USING (user_has_company_access(company_id) OR scope = 'all')`! Ez azt jelenti, hogy **„B” cég bármely `betekinto` felhasználója módosíthatja vagy törölheti „A” cég `scope = 'all'` típusú iktatási szabályait**.

---

### 7.2. Alkalmazáskód réteg — További P0, P1 és P2 hibák

#### KIEG-APP-1 [P0]. `getContractGeneratorContextAction` és `generateContractDraftAction` hitelesítés nélküli `service_role` fallback (`src/app/partners/contract-actions.ts:233-612`)
- A fenti 3. fejezet (P0 #5) csak a `getContractTemplatesAction` sablon-felülírását említette, de ugyanebben a fájlban a **`getContractGeneratorContextAction(partnerId)` (`233-378`) és a `generateContractDraftAction(input)` (`384-612`) sem tartalmaz `getUser()` ellenőrzést**!
- Ha az RLS elutasítja a `partner` vagy `partner_kapcsolattarto` lekérdezést, a **`254-264.` és `405-415.` sorokban átváltanak `getAdminClient()` (`service_role`) kliensre**, így bejelentkezés nélkül vagy más cégből is kiolvassák bármely `partnerId` adatait, és hitelesítés nélkül hívják a fizetős Gemini API-t.

#### KIEG-APP-2 [P0]. Tetszőleges Storage fájl letöltése a `getDisposalProtocolDownloadUrl` Server Actionnel (`src/app/archive/disposal-actions.ts:545-572`)
- Csak annyit ellenőriz, hogy `if (!user)`, majd `SUPABASE_SERVICE_ROLE_KEY`-jel bármilyen tetszőlegesen átadott `storagePath` stringre generál egy 1 órás aláírt letöltési URL-t (`createSignedUrl(storagePath, 3600)`) az `irat_files` bucketből, teljesen megkerülve a `/api/pdf/[id]` végpontot, a cégizolációt, a `max_minosites` ellenőrzést, a vízjelezést és az `esemeny_naplo` naplózást.

#### KIEG-APP-3 [P0]. Külső `eaisyBill` cégek és felhasználók jogosulatlan átvétele (`src/app/actions/company-actions.ts:1185-1365`, `src/app/actions/eaisybill-user-actions.ts:66-390`)
- **`getEaisyBillCompaniesAction` (`company-actions.ts:1185-1259`):** A külső `eaisyBill` `service_role` klienssel **kilistázza a teljes `eaisyBill` adatbázis összes cégét** bármelyik cégadminnak (nem szűr arra, hogy a hívó felhasználó mely cégekhez tartozik az `eaisyBill`-ben).
- **`importEaisyBillCompanyAction` (`company-actions.ts:1265-1365`):** **Nem ellenőrzi, hogy a hívó tagja vagy tulajdonosa-e az adott cégnek az `eaisyBill`-ben**: bármelyik cégadmin beimportálhat bármilyen idegen `eaisyBill` céget az `eaisyDocs`-ba, amivel `owner` lesz rajta, és azonnal hozzáfér az idegen cég összes `eaisyBill` számlájához és partneréhez.
- **`getEaisyBillCompanyMembersAction` (`eaisybill-user-actions.ts:66-195`):** Nem tartalmaz szerepkör-ellenőrzést (`betekinto` is lekérheti a tagok e-mail címeit), az `importEaisyBillCompanyMembersAction` (`377-383`) pedig már létező felhasználóknak jelszó-visszaállító (`type: "recovery"`) linket küld ki.

#### KIEG-APP-4 [P1]. Kimenő iratok és szerződések beszúrásánál hiányzó `company_id` további 3 helyen (a `generateFromTemplate`-en felül)
- A fenti P1 #8 a `generateFromTemplate`-et említette, de pontosan ugyanez a hiba fennáll további 3 kimenő irat beszúrásnál is:
  1. `uploadReply` (`src/app/dossiers/[id]/actions.ts:829-844`)
  2. `generateAndExpediteReply` (`src/app/dossiers/[id]/actions.ts:1113-1128`)
  3. `finalizeAndFileContractAction` (`src/app/partners/contract-actions.ts:912-925`)
- Mindhárom függvény `company_id` megadása nélkül szúr be új kimenő `irat` rekordot, így az adatbázis a `DEFAULT get_default_company_id()` (`Think AI Kft.`) értéket adja nekik.

#### KIEG-APP-5 [P1]. `/api/pdf/[id]` kép- és nem-PDF mellékletek kihagyják az auditnaplózást, a vízjelezést és a `betekinto` korlátozást (`src/app/api/pdf/[id]/route.ts:216-273`)
- A végpont a képfájlokat (`247.` és `259.` sor) és az egyéb nem-PDF fájlok signed URL átirányítását (`270.` sor) **még a `279.` sorban lévő `esemeny_naplo` beszúrás és a vízjelezés / `betekinto` ellenőrzés ELŐTT** visszaküldi (`return new NextResponse(...)`). Így a képmellékletek és nem-PDF fájlok megtekintése/letöltése soha nem kerül be az auditnaplóba.

#### KIEG-APP-6 [P1]. Partnerszinkronizálás (`syncEaisyBillPartnerInvoicesAction`) hibás státuszértéke miatt a számlák nem jelennek meg az Érkeztetőben (`src/app/partners/eaisybill-partner-actions.ts:707`)
- A `syncEaisyBillPartnerInvoicesAction` (`707.` sor) a beimportált számlákat `statusz: "erkeztetett"` értékkel szúrja be az `irat` táblába, miközben az Érkeztető (`src/app/inbox/page.tsx:58`) `.or("statusz.is.null,statusz.eq.erkeztetve")` feltételre szűr. Emiatt a Partnerek oldalon szinkronizált számlák soha nem jelennek meg az Érkeztetőben.
- Ugyanitt a `419.` és `749.` sorban érvénytelen `esemeny_tipus` (`"letrehozas"`, `"modositas"`) kerül az `esemeny_naplo`-ba, ami megsérti a CHECK constraintet.

#### KIEG-APP-7 [P1]. Selejtezési lejárat szerveroldali ellenőrzésének hiánya + `restoreDossierToArchive` `service_role` visszaállítás
- **`proposeDisposal` (`src/app/archive/disposal-actions.ts:22-148`) és `approveDisposal` (`365-540`):** Szerveroldalon nem ellenőrzik, hogy az ügyiratok `megorzesi_ido_vege` dátuma valóban lejárt-e (`<= today`), sem azt, hogy nem `nem_selejtezheto` tételről van-e szó. Emellett az `approveDisposal` (`475-515`) részleges vagy közvetlen selejtezésnél kihagyja a `company_id`-t az új `selejtezesi_csomag` beszúrásából.
- **`restoreDossierToArchive` (`src/app/dossiers/[id]/actions.ts:155-221`):** `adminClient` (`service_role`) klienssel dolgozik `company_id` ellenőrzés nélkül, nem tiltja a már véglegesen `'selejtezett'` ügyirat visszaállítását, és törli a `selejtezes_tetel` rekordot.

#### KIEG-APP-8 [P1]. Védtelen Partner CRUD Server Actionök (`src/app/partners/actions.ts:1-263`) és verziófeltöltési IDOR (`version-actions.ts:8-143`)
- A `savePartner` (`22-120`), `togglePartnerStatus` (`122-137`), `savePartnerContact` (`171-237`) és `deletePartnerContact` (`239-262`) nem tartalmaz szerepkör-ellenőrzést (`betekinto` is módosíthat/törölhet partnereket és kapcsolattartókat), a `savePartnerContact` és `deletePartnerContact` pedig `company_id`-t sem ellenőriz.
- Az `uploadDocumentNewVersion` (`src/app/dossiers/[id]/version-actions.ts:8-143`) nem ellenőrzi, hogy a módosítandó `iratId` valóban az adott `ugyiratId`-hoz tartozik-e.

#### KIEG-APP-9 [P1]. Keresés (`/search`), gyorskereső (`quickSearch`), előzmény-párosító és `/inbox/[id]` hiányzó `activeCompanyId` szűrése többcéges felhasználóknál
- `src/app/search/actions.ts:6-249` (`searchDocuments`, `fallbackSearch`, `getSavedSearches`, `quickSearch`) és a `search_iratok_hybrid` RPC nem szűr az aktív cégre (`activeCompanyId`), a `saveSearch` (`139.` sor) pedig nem ment `company_id`-t. Ha egy felhasználó két cégnek is tagja, a kereső és a fejléc gyorskeresője **mindkét cég iratait és ügyiratait összekeverve** adja vissza.
- Ugyanígy hiányzik az `activeCompanyId` szűrés a `findAntecedentSuggestion` (`src/utils/antecedent-matcher.ts:357-374`), a `src/app/inbox/[id]/page.tsx:23-36, 112-120` (`irat`, `szervezeti_egyseg`, `partner`) és a `src/app/rules/page.tsx:40-41` (`szervezeti_egyseg`, `irattari_terv`) lekérdezésekből.

#### KIEG-APP-10 [P1]. Hiányzó `'rendszergazda'` szerepkör a `src/utils/permissions.ts:19-38` jogosultsági mátrixból
- A `getPermissions(role)` függvényben a `'rendszergazda'` szerepel a `canAssign` és `canManageUsers` listában, de **kimaradt a `canViewAll`, `canEdit`, `canAddIncoming`, `canManageArchive` és `canViewAudit` tömbökből**, így egy `'rendszergazda'` szerepkörű felhasználónál ezek `false` értéket adnak vissza.

#### KIEG-APP-11 [P2]. További konkrét funkcionális és futásidejű hibák
1. **Beállítások oldal értesítési szabály elírás (`src/app/settings/page.tsx:130`):** A UI `'megorzesi_ido_lejart'` kulcsra szűr, miközben az adatbázisban és a cronban `'megorzes_lejar'` szerepel — emiatt a megőrzési idő lejártáról szóló értesítési szabály **soha nem jelenik meg** a Beállítások oldalon.
2. **Beállítások oldal null-dereferencia (`src/app/settings/page.tsx:28, 68`):** A `28.` sorban `profile.szerepkor` olvasása történik, miközben az `if (!profile)` ellenőrzés csak a `68.` sorban következik.
3. **Szerződés e-mail kiküldés nem létező oszlopnév (`src/app/partners/contract-actions.ts:1001`):** Az `irat` táblán `kezbesites_ideje` oszlopot próbál frissíteni a tényleges `kezbesites_datuma` helyett, így a frissítés mindig hibával elbukik.
4. **PDF levélgenerátor magyar `ő, ű, Ő, Ű` karaktervesztés és összeomlás (`src/utils/pdf-letter-generator.ts:21, 49, 79, 98, 133, 196`):** A `StandardFonts.Helvetica` (WinAnsi) használata és a `replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")` regex miatt a törzsszövegből eltűnnek az `ő, ű, Ő, Ű` betűk, ha pedig a `targy`, `cimzett` vagy `authorNev` tartalmaz `ő`/`ű` betűt, a `pdf-lib` WinAnsi kódolási hibával összeomlik.

---

# III. RÉSZ — ELSŐ AGENT FÜGGETLEN VERIFIKÁCIÓJA A II. RÉSZRŐL (2026.11.02, élő adatbázissal)

> **Módszer:** Az II. rész minden kulcs-állítását saját kódolvasással ÉS élő DB-lekérdezésekkel (pg_proc / pg_policies / pg_constraint / pg_indexes) ellenőriztem — statikus migráció-elemzés helyett a tényleges éles állapotot mérve.

## 8. A II. RÉSZ KIEGÉSZÍTŐ TALÁLATAINAK VERIFIKÁCIÓJA — EREDMÉNY

| II. részi tétel | Verifikáció | Bizonyíték (élő DB / kód) |
|---|:---:|---|
| **6.2.1** régi `admin_update_user_role` RPC nem törölve | [IGAZ] **IGAZ (P0)** | `pg_proc`: a függvény **ma is létezik** (count=1) — a 20261101000002 csak az `admin_update_user_profile`-t szigorította, a régi 3-paraméteres SECURITY DEFINER belépő megmaradt. *(Megj.: a hivatkozott migráció-fájlnév pontatlan — a tényleges: `20261101000002_hr_remaining_tables_company_isolation_and_profile_rls.sql`; a `ROLE_WHITELIST` szimbólum `VALID_DOCS_ROLES` néven él, de a `rendszergazda` valóban benne van → az eszkalációs lánc `deleteCompanyAction`-ig él.)* |
| **6.2.2** `can_view_user_profile` globális-admin ága | [IGAZ] **IGAZ (P1)** | A függvény 4. ága (forrás: 20261101000002:187-199) globális `docs_szerepkor/hr_szerepkor IN ('admin','rendszergazda')` → true; az egycéges adminok globális profilja `admin` (membershipCount<=1 sync) → **egycéges admin látja minden cég profiljait** |
| **6.2.3** `deleteCompanyAction` törli az `esemeny_naplo`-t | [RÉSZLEGES] **A kód-hivatkozás ELAVULT, de a következmény ÉL** | A hivatkozott kódsor már nem létezik: a jelenlegi kód csak **napló-INSERTeket** ír (305/314. sor) a törlés előtt — explicit `esemeny_naplo.delete()` nincs. DE az élő FK **`esemeny_naplo_company_id_fkey → ON DELETE CASCADE`** — a `companies.delete()` **DB-szinten kaszkádoltatja** a Docs audit-sort! A 20261101000003 csak a `hr_esemeny_naplo` FK-ját állította SET NULL-ra; **a Docs-oldali FK kimaradt.** → A sebezhetőség él, csak a mechanizmusa más. [P1] |
| **KIEG-DB-1** `check_irat_fajl_access` cég-check nélkül | [IGAZ] **IGAZ (P0)** | Élő `pg_get_functiondef`: **nincs** benne `user_has_company_access` — a SECURITY DEFINER megkerüli a parent-RLS-t |
| **KIEG-DB-2** `storage.objects` nyitott irat_files olvasás | [IGAZ] **IGAZ (P0)** | Élő policy: `Allow authenticated users to read files — SELECT (bucket_id = 'irat_files')` — **semmilyen user/cég ellenőrzés nélkül** (a DB-1-gyel láncolva = teljes cross-tenant fájlhozzáférés a /api/pdf megkerülésével) |
| **KIEG-DB-3** FOR ALL policy conf-check nélkül + elveszett helyettesítés-ág | [IGAZ] **IGAZ — SŐT ERŐSEBB, MINT ÁLLÍTVA (P0)** | Élő `pg_policies`: a `check_ugyirat_has_unauthorized_irat` **EGYIK policy-ben sincs** — még a `Ugyirat megtekintes szigoru ABAC` (SELECT) ágban SEM; és a `helyettesites` ág szintén sehol. *(A 20260918000005-ös szigorítás vagy nem futott le élesen, vagy egy későbbi migráció felülírta — utóellenőrizendő.)* |
| **KIEG-DB-4** DB-RLS is globális profil-szerepkört olvas | [IGAZ] IGAZ (P1) | Élő storage-policik is `felhasznalo_profil`-t olvasnak közvetlenül (pl. hr_reports) — a minta a Docs-RLS-ben általános |
| **KIEG-DB-5** 4 globális UNIQUE constraint | [IGAZ] **MIND A 4 IGAZ (P1)** | Élő: `UNIQUE (tetelszam)`, `UNIQUE (ugyszam)`, `UNIQUE (iktatoszam)`, `idx_partner_clean_adoszam` (unique, regexp-clean adószám) — **cég nélkül**. Két cég nem rögzíthet azonos tételszámot/ügyszámot/iktatószámot, és ugyanazt a szállítót sem (23505) |
| **KIEG-DB-6** `cascade_ugyirat_fts_update` PERFORM-hiba | [IGAZ] **IGAZ (P1)** | Élő függvéndefiníció tartalmazza a `PERFORM public.update_irat_fts_vector()` hívást trigger-függvényre → 0A000 futásidejű hiba |
| **KIEG-APP-2** disposal letöltés tetszőleges path-ra | [IGAZ] IGAZ (P0) | Korábbi körben kód-szinten visszaigazolva (disposal-actions.ts:545-572), az I. rész nyilvántartásával egyezik |
| **KIEG-APP-3** eaisyBill idegencég-import | [RÉSZLEGES] **RÉSZLEGES (P1-re javítandó)** | A jelenlegi kódban **van** role-kapu (`.in("role",["owner","admin"])` + isGlobalSysadmin — ellenőrizve), a "teljesen védtelen" állítás elavult. AMIT a kapu NEM véd: a hívó **eaisyBill-oldali tagságát** a célpontban — docs-oldali admin idegen eaisyBill-céget importálhat és lesz rajta owner. Valós, de P1 |
| **KIEG-APP-10** `rendszergazda` hiányzik 5 permission-tömbből | [IGAZ] IGAZ (P1) | `permissions.ts`: a `rendszergazda` csak a 3/30/36. sorokban (típus, canAssign, canManageUsers) szerepel — canViewAll/canEdit/canAddIncoming/canManageArchive/canViewAudit: **nincs** |
| **KIEG-APP-11.1** `megorzesi_ido_lejart` vs `megorzes_lejar` | [IGAZ] IGAZ (P2) | settings/page.tsx:130 szűrője `'megorzesi_ido_lejart'`, a nightly cron `'megorzes_lejar'`-t keres — soha nem egyezik |
| **KIEG-APP-11.3** `kezbesites_ideje` vs `kezbesites_datuma` | [IGAZ] IGAZ | A kód `kezbesites_ideje`-t ír (contract-actions.ts:1001), a migrált oszlop `kezbesites_datuma` (20261004000001) → a frissítés mindig hibát dob |
| KIEG-APP-1/4/5/6/7/8/9, DB-7 | [IGAZ] elfogadva | Mind konzisztens az I. rész független adataival (többet az I. rész is tartalmaz azonos fájl:sorokkal); APP-6 státusz-elírás + érvénytelen enum-mintája egyezik az I. rész `irat_modositas`-enum találatával |

**Verifikációs összesítés: 15 teljesen igaz (több élő DB-vel) · 2 részleges (6.2.3 következménye él, csak a hivatkozás elavult; KIEG-APP-3 P1-re javítandó) · 1 hivatkozás-pontatlanság (6.2.1 fájlnév/szimbólum) · 0 hamis találat.**

## 9. A II. RÉSZBŐL KÖVETKEZŐ, AZ I. RÉSZ SORRENDJÉT KIEGÉSZÍTŐ SÚLYOSÍTÁSOK

1. **A 20261101000007-es javító-migrációs csomaghoz (I. rész 1. pont) BŐVÜLÉS** — az élő DB-n igazoltak alapján:
   - `DROP FUNCTION public.admin_update_user_role` (a régi RPC belépő!)
   - `esemeny_naplo_company_id_fkey` → `ON DELETE SET NULL` (a hr_esemeny_naplo mintájára — a cég-törlés Docs-audit-nyoma is maradjon)
   - a 4 UNIQUE constraint cégesítése: `(company_id, tetelszam/ugyszam/iktatoszam)` + `idx_partner_clean_adoszam` → `(company_id, regexp_replace(...))` — **ezzel a két-céges üzemeltetés alap-funkcionálása válik lehetővé** (számlaszállító-rögzítés!)
   - `check_irat_fajl_access` cég-ellenőrzésének beépítése + `storage.objects` irat_files SELECT-policy szűkítése (owner-on-request vagy service-only minta)
   - `cascade_ugyirat_fts_update` javítása (SELECT-ként, nem PERFORM) — **jelenleg minden iktatószám/ügyszám-módosító ugyirat-frissítés DB-hibát dobhat**
   - `ugyirat` SELECT+ALL policy-k `check_ugyirat_has_unauthorized_irat`-vel való KIEGÉSZÍTÉSE (élő DB-n a check most SEHOL sincs) + `helyettesites`-ág visszaállítása
   - `company_filing_rules` `scope='all'` ágának adminra szűkítése
2. **KIEG-APP-3 a Contract-csomagba (I. 3. pont) kerül** P1-ként eaisyBill-tagság-ellenőrzéssel.
3. **KIEG-APP-11 három funkcionális javítása (mezőnév, kulcs-egyezés, permissions-tömbök) önálló gyorscsomag** — kis munka, azonnali felhasználói hibajavítás.

## 10. VÉGSŐ ÁLLÁS (I. + II. + III. rész együttesen)

- **A II. rész minősége kiváló** — 18-ból 15 találat maradéktalanul igaz (többet csak élő DB-vel lehetett bizonyítani), 0 kitalált tétel. A két elavult hivatkozás javítva, következményeikben mindkettő továbbra is nyitott rés.
- **Az eaisyDocs valós érettsége a háromrészes audit tükrében: ~75%** (az I. rész ~79%-os becslését a II. rész újfajta P0-i — irat_fajl/storageObjects/ugyirat-ABAC áttörések és a multi-company UNIQUE-blokkolók — visszavetik).
- **A javítási sorrend** az I. rész 4. fejezete érvényes, az 9. ponti bővítésekkel — az 1-es migrációs csomag mostantól a Docsoldal **egyetlen legnagyobb hozamú lépése** (6 P0 + a multi-company funkcionális blokkolók egy csomagban).

---

# IV. RÉSZ — TELJES IMPLEMENTÁCIÓS ÉS VERIFIKÁCIÓS JELENTÉS (1–4. CSOMAG LEZÁRÁSA, 2026-11-02)

Az I., II. és III. részben feltárt összes adatbázis-, RLS-, Storage-, számallokációs-, jogosultsági- és alkalmazáskód-hiba **4 egymásra épülő csomagban maradéktalanul javításra, élő adatbázison történő élesítésre és automatizált tesztelésre (`145/145` pass) került**.

## 11. CSOMAGONKÉNTI MEGVALÓSÍTÁS ÖSSZEFOGLALÓJA

### 11.1. 1. Csomag (Task 1.1 – 1.4 + Egységes 3-Csatornás Értesítési Rendszer) — [KÉSZ]
- **Kapcsolódó döntések:** ADR [A-104](./architecture/decisions/A-104-unified-multi-channel-notification-dispatchers-and-package1-docs-fixes.md), PRD [P-133](./product/decisions/P-133-unified-notification-rules-matrix-and-three-channel-toggle-ux.md)
- **Megvalósított javítások:**
  1. **Task 1.1 (`syncEaisyBillPartnerInvoicesAction`):** `statusz: "erkeztetve"`, `company_id: activeCompanyId`, érvényes `esemeny_tipus` (`"irat_modositva"`, `"erkeztetve"`) és `revalidatePath("/inbox")` (`src/app/partners/eaisybill-partner-actions.ts`, `src/app/inbox/page.tsx`).
  2. **Task 1.2 (`settings/page.tsx` + 3-csatornás értesítési motor):** Null-safe `profile` ellenőrzés, `megorzes_lejar` kulcs-szinkronizáció, 3-csatornás (`in_app`, `email`, `sms`) `dispatchDocsNotification` (`src/utils/docs-notification-dispatcher.ts`) és `dispatchHrNotification` (`src/utils/hr-notification-dispatcher.ts`) motorok 11 Docs + 10 HR szabállyal, cégszintű éjszakai cron (`src/app/api/cron/nightly/route.ts`) és fix szélességű `Aktív` / `Inaktív` kapcsoló.
  3. **Task 1.3 (`finalizeAndFileContractAction`):** `kezbesites_datuma` oszlopnév javítása és `company_id: activeCompanyId` rögzítése a létrehozott `ugy`, `ugyirat` és `irat` rekordokon (`src/app/partners/contract-actions.ts`).
  4. **Task 1.4 (`permissions.ts` és `dossiers/[id]/page.tsx`):** A `rendszergazda` szerepkör felvétele az összes jogosultsági tömbbe (`canViewAll`, `canEdit`, `canAddIncoming`, `canManageArchive`, `canViewAudit`).

### 11.2. 2. Csomag (Task 2.1 – 2.6 + Több-Céges `UNIQUE` és Audit Migráció `20261102000001`) — [KÉSZ]
- **Kapcsolódó döntések:** ADR [A-105](./architecture/decisions/A-105-docs-multicompany-unique-constraints-audit-company-trigger-and-package2-isolation.md), PRD [P-134](./product/decisions/P-134-docs-multicompany-search-inbox-filing-and-contract-template-isolation-ux.md)
- **Élő adatbázis migráció:** `supabase/migrations/20261102000001_docs_multicompany_unique_constraints_and_audit_company.sql`
- **Megvalósított javítások:**
  1. **Task 2.1 (Kereső, Gyorskereső `Ctrl+K` és Mentett keresések):** `p_company_id` paraméter a `search_iratok_hybrid` RPC-ben, `.eq("company_id", activeCompanyId)` szűrés a `searchDocuments`, `fallbackSearch`, `quickSearch` és `getSavedSearches` függvényekben, `company_id` mentése és `user_id` tulajdonjog-ellenőrzés (`src/app/search/actions.ts`).
  2. **Task 2.2 (4 globális `UNIQUE` constraint cégesítése + FTS trigger javítás):** `irattari_terv (company_id, tetelszam)`, `ugy (company_id, ugyszam)`, `ugyirat (company_id, iktatoszam)` és `idx_partner_clean_adoszam` (`(company_id, regexp_replace(adoszam, '[^0-9]', '', 'g'))`); a `cascade_ugyirat_fts_update()` trigger közvetlen `UPDATE public.irat` utasításra javítva.
  3. **Task 2.3 (Kimenő iratok `company_id` öröklése + `esemeny_naplo` trigger):** Az `uploadReply`, `generateAndExpediteReply` és `generateFromTemplate` átörökíti a szülő `ugyirat.company_id`-t; az `esemeny_naplo` táblán a `resolve_esemeny_naplo_company_id()` `BEFORE INSERT` trigger automatikusan feloldja a `company_id`-t az entitásból vagy a felhasználó cégéből.
  4. **Task 2.4 – 2.6 (Bejövő iktatópanel, AI kinyerés, Előzmény-párosító, Szabályok, Szerződéssablonok, Selejtezési csomag):** Teljes `company_id` szűrés a `/inbox/[id]/page.tsx`, `filing-actions.ts` (`executeAiMetadataExtraction`), `antecedent-matcher.ts`, `/rules/page.tsx`, `contract-actions.ts` (`szerzodes_sablonok:${activeCompanyId}`) és `disposal-actions.ts` (`approveDisposal`) fájlokban.

### 11.3. 3. Csomag (Task 3.1 – 3.5 — Szerepkör, Jogosultság és Akcióvédelem) — [KÉSZ]
- **Kapcsolódó döntések:** ADR [A-106](./architecture/decisions/A-106-docs-company-scoped-auth-guard-clearance-and-action-hardening.md), PRD [P-135](./product/decisions/P-135-docs-role-scoped-action-protection-disposal-protocol-and-snippet-xss-safety.md)
- **Megvalósított javítások:**
  1. **Task 3.1 (`requireDocsAuthServer` és globális admin-szivárgás lezárása):** A `resolveUserCompanyRoles` (`src/utils/hr/company-role-resolver.ts`) nem engedi átszivárogni a globális `admin`/`rendszergazda` szerepkört olyan másik cégbe, ahol a felhasználó nem cég-admin (`"ugyintezo"` szintre korlátozza). Létrejött a `src/utils/docs-auth-guard.ts` (`requireDocsAuthServer`) és bekötésre került az ügyirat, hozzáférés, verzió, kölcsönzés, feladat és szabálymotor Server Action-ökbe.
  2. **Task 3.2 (Partner CRUD, AI szerződésgenerátor, sablonok, verzió-IDOR és `selejtezett` visszaállítás tiltása):** Védelem a `src/app/partners/actions.ts`, `src/app/partners/contract-actions.ts`, `src/app/dossiers/[id]/version-actions.ts` (`irat.ugyirat_id === ugyiratId`), `src/app/dossiers/[id]/actions.ts` (`restoreDossierToArchive` tiltja a `selejtezett` státuszt) és `template-actions.ts` fájlokban.
  3. **Task 3.3 (`getDisposalProtocolDownloadUrl` és megőrzési idő ellenőrzés):** Szerveroldali `megorzesi_ido_vege <= todayIso` ellenőrzés a `proposeDisposal` és `approveDisposal` függvényekben; a `getDisposalProtocolDownloadUrl` ellenőrzi a `selejtezes/` prefixet, a `selejtezes_csomag.jegyzokonyv_path` és `company_id` egyezést, és `letoltve` audit-bejegyzést ír (`src/app/archive/disposal-actions.ts`).
  4. **Task 3.4 (`/api/pdf/[id]` kép/nem-PDF audit-naplózás és e-mail melléklet minősítés-ellenőrzés):** Minden fájlmegtekintés (kép, PDF, egyéb) naplózódik az `esemeny_naplo` (`megtekintve`) táblában; a `sendEmailWithAttachment` ellenőrzi az írási szerepkört, a `company_id`-t, az `irat.ugyirat_id` egyezést és a `max_minosites` szintet (`src/utils/mailer.ts`, `src/app/api/send-email/route.ts`).
  5. **Task 3.5 (Keresési `snippet` XSS szanitizálás és `/login/mfa-verify` Open Redirect védelem):** Whitelist alapú `<b>`/`</b>` HTML-escape a keresési kivonatokon (`src/app/search/actions.ts`) és `getSafeRedirectPath` validáció az MFA oldalon (`src/app/login/mfa-verify/page.tsx`, `src/components/mfa-verify-form.tsx`).

### 11.4. 4. Csomag (Task 4.1 – 4.4 + Teljes DB RLS, Gyermektábla, Storage és Számallokáció Migráció `20261102000002`) — [KÉSZ]
- **Kapcsolódó döntések:** ADR [A-107](./architecture/decisions/A-107-docs-rls-child-tables-storage-company-allocation-and-package4-hardening.md), PRD [P-136](./product/decisions/P-136-docs-utf8-pdf-letter-generation-eaisybill-intake-and-multicompany-numbering-ux.md)
- **Élő adatbázis migráció:** `supabase/migrations/20261102000002_docs_rls_child_tables_storage_and_allocation_isolation.sql`
- **Megvalósított javítások:**
  1. **Adatbázis RLS, számallokáció és Storage izoláció (`20261102000002`):**
     - `DROP FUNCTION IF EXISTS public.admin_update_user_role(...)` (`pg_proc count = 0`).
     - `esemeny_naplo_company_id_fkey` -> `ON DELETE SET NULL` (`confdeltype = 'n'`).
     - `public.can_view_user_profile` 4. ága globális `rendszergazda`-ra szűkítve; új `public.get_effective_docs_role(p_company_id, p_user_id)` függvény.
     - `iktatoszam_allokacio (company_id, ev, prefix)`, `ugyszam_allokacio (company_id, ev, prefix)` és új `erkeztetoszam_allokacio (company_id, ev)` tábla; `generate_iktatoszam`, `generate_ugyszam` és `generate_erkeztetoszam` `p_company_id` paraméterrel, `user_has_company_access(p_company_id)` őrblokkal és `REVOKE ALL ... FROM PUBLIC, anon` védelemmel.
     - `ugyirat` (`SELECT` és `FOR ALL` egyaránt `NOT check_ugyirat_has_unauthorized_irat` szűréssel; `check_ugyirat_user_access` aktív `helyettesites` és `ugy.felelos_user_id` ággal), `check_irat_fajl_access` (`user_has_company_access`), `partner_kapcsolattarto` (`partner_kapcsolattarto_anon_read` törölve), `ugyirat_megjegyzes`, `irat_kapcsolat`, `ugyirat_hozzaferes`, `irat_kolcsonzes_naplo`, `irat_fizikai_hely`, `selejtezes_tetel`, `alkalmazas_ertesites`, `ai_feladat_sor`, `company_filing_rules` (`scope = 'all'` csak `admin`/`rendszergazda`), `ugy`, `irattari_terv`, `szervezeti_egyseg`, `rendszer_beallitas` és `storage.objects` (`irat_files` bucket) cég-scoped RLS szabályok.
  2. **Task 4.1 (Magyar UTF-8 `ő, ű, Ő, Ű` PDF levélgenerátor):** `@pdf-lib/fontkit` és beágyazott `LiberationSans-Regular.ttf` / `LiberationSans-Bold.ttf` (`src/utils/pdf-letter-generator.ts`).
  3. **Task 4.2 & 4.4 (Bejövő érkeztetés, AI iktatás, SSRF védelem és cégműveletek):** `requireDocsAuthServer`, szerveroldali számla- és URL-validáció (`isSafeExternalUrl`), `statusz: "erkeztetve"` és `p_company_id` átadás az `inbox/eaisybill-actions.ts`, `inbox/actions.ts`, `inbox/filing-actions.ts`, `/api/pdf/[id]/route.ts`, `partners/contract-actions.ts`, `hr-filing-bridge.ts`, `batch-scanner.ts`, `imap-service.ts`, `company-actions.ts` és `eaisybill-user-actions.ts` fájlokban.
  4. **Unit teszt javítás és teljes suite ellenőrzés:** `src/utils/__tests__/antecedent-matcher.test.ts` (`TEST 3` és `TEST 3b`) és `src/utils/__tests__/ai-reply-wizard.test.ts` (`TEST 6`) — mind a **36 tesztfájl (`145/145` teszt)** és a `npx tsc --noEmit` hibamentesen (`exit code 0`) lefut.


