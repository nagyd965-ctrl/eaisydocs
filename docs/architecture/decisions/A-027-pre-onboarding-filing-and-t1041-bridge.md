# [Közös] A-027: Pre-Onboarding Munkaköri Leírás, NAV T1041 Hatósági Bejelentés és eaisyDocs Iratkezelési Híd

> **Dátum:** 2026-10-01  
> **Státusz:** Decided  
> **Hatókör:** `[Közös]` (`[Docs]` & `[HR]`)  
> **Kapcsolódó ADR-ek:** [A-005](./A-005-hr-modular-independence-architecture.md), [A-006](./A-006-gapless-filing-sequence-allocation.md), [A-010](./A-010-pdfa-normalization-and-sha256-verification.md), [A-026](./A-026-employee-personal-dossier-and-hr-filing-bridge.md)  
> **Kapcsolódó PRD:** [P-037](../../product/decisions/P-037-onboarding-employment-contract-generator-and-filing-ux.md), [P-039](../../product/decisions/P-039-onboarding-t1041-job-description-and-mt46-ux.md)  
> **Érintett fájlok:** `supabase/migrations/20261001000012_hr_t1041_bejelentes.sql`, `supabase/migrations/20261001000013_hr_onboarding_munkakor.sql`, `src/app/hr/actions/t1041-actions.ts`, `src/app/hr/actions/onboarding-job-actions.ts`, `src/app/hr/onboarding/actions.ts`

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR onboarding folyamata a jogszabályi és vállalati elvárásoknak megfelelően a munkavállaló tényleges belépése előtt (pre-onboarding szakaszban) kezeli az összes előkészítő dokumentumot:
1. **NAV T1041 Hatósági Bejelentés (Art. 22. § / Tbj. 40. §):** A munkaviszony kezdetét legkésőbb a biztosítási jogviszony első napján, a munkavégzés megkezdése előtt be kell jelenteni a NAV felé elektronikus úton (ÁNYK / ONYA 13-as pótlap). A bejelentésről hivatalos adatlap és visszaigazoló hatósági nyugta keletkezik.
2. **Hivatalos Munkaköri Leírás (Mt. 45. § (4)):** A munkáltató köteles a munkakörbe tartozó feladatokat és kompetenciákat írásban rögzíteni és a munkavállaló részére átadni.
3. **Mt. 46. § Munkáltatói Írásbeli Tájékoztató:** A munkaszerződés mellett kötelező tájékoztatási pontok (munkaidő-beosztás, pihenőnapok, felmondási idő, NAV bejelentés helye).

**Architekturális Kihívás:**  
A pre-onboarding fázisban a jelölt még **nem rendelkezik** aktív `auth.users` fiókkal és `felhasznalo_profil` rekorddal (`fiók_státusz = 'varakozik'`), hogy elkerüljük az inaktív, jogtalan belépéseket és az árván maradó felhasználói azonosítókat.  
Ugyanakkor a munkaköri leírást, a T1041 bejelentési adatlapot és a NAV igazolást már a belépés előtt generálni, szerkeszteni és csatolni kell.

---

## 2. Megfontolt Alternatívák

1. **Korai `felhasznalo_profil` generálás az Onboarding indításakor:**  
   *Elvetve:* Ha a jelölt visszalép vagy meghiúsul a jogviszony, inaktív fiókok és személyes adatok maradnának a termelési adatbázisban, ami felesleges GDPR kockázat és az Auth rendszer terhelése.
2. **Különálló szöveges sablonok külső Word/Excel kezeléssel:**  
   *Elvetve:* Törné a hézagmentes eaisyDocs iktatási láncot és elveszítené az ÁNYK 13-as pótlap mezőinek egykattintásos vágólapra másolási képességét.
3. **Pre-Onboarding Relációs Horgonyzás és Aktiváláskori eaisyDocs Híd (Kiválasztott):**  
   A `hr_t1041_bejelentes` és a munkaköri leírás hozzárendelések közvetlenül az `onboarding_id` (UUID) kulcshoz kapcsolódnak. Amikor a HR aktiválja a belépőt (`activateOnboardingAccount`):
   - Létrejön a `felhasznalo_profil`.
   - Létrejön vagy feloldódik a dolgozó személyi dossziéja (`HR/{év}/{dosszie_szam}`).
   - Az összes elkészült pre-onboarding dokumentum (Munkaszerződés -> `1.2`, Munkaköri leírás -> `1.1`, NAV T1041 -> `1.3`, Munkavédelem -> `2.1`) automatikusan, gapless iktatószámmal iktatásra kerül a dossziéban és átkötésre kerül az új `dolgozo_id`-ra.

---

## 3. Döntés és Adatbázis Architektúra

1. **NAV T1041 Táblaszerkezet (`hr_t1041_bejelentes`):**
   - Hivatkozik `onboarding_id UUID REFERENCES hr_onboarding(id)` és opcionálisan `dolgozo_id UUID REFERENCES felhasznalo_profil(id)`.
   - Tárolja a bejelentés típusát (`U`, `V`, `T`), az ÁNYK mezőket, a generált adatlap PDF-et és a feltöltött NAV nyugta URL-jét.
   - Tartalmazza az eaisyDocs iratkezelési horgonyokat (`irat_id`, `ugyirat_id`, `iktatoszam`, `iktatva_ekor`).

2. **Pre-Onboarding Munkaköri Leírás Integráció:**
   - A `hr_munkakori_leiras_dokumentum` és a `hr_munkakor_leiras_verzio` táblák `onboarding_id` mezővel bővültek.
   - Támogatja mind a központi katalógusból való verzió-hozzárendelést (`hr_munkakor_leiras_verzio`), mind a közvetlen dinamikus A4 PDF generálást (Puppeteer), mind a beszkennelt, aláírt PDF feltöltését.

3. **eaisyDocs Irattári Tétel Besorolás Aktiváláskor:**
   - Munkaköri leírás: `1.1 - Munkaköri leírások` irattári tétel (50 év megőrzés, bizalmas minősítés).
   - NAV T1041 bejelentés és nyugta: `1.3 - Hatósági bejelentések` irattári tétel (50 év megőrzés, bizalmas minősítés).

---

## 4. Következmények és Előnyök

- **Adatintegritás:** A belépés pillanatában a dolgozó személyi dossziéja hiánytalanul tartalmazza az összes törvényi dokumentumot hivatalos iktatószámmal és SHA-256 lenyomattal.
- **Kényelem és Hatékonyság:** A bérszámfejtő/HR egyetlen kattintással másolhatja a T1041 ÁNYK kódokat a NAV felületére, megelőzve az adminisztratív elgépeléseket.
- **Auditbiztosság:** A NAV nyugta csatolásával a munkaügyi ellenőrzések során másodpercek alatt igazolható a bejelentés megtörténte.
