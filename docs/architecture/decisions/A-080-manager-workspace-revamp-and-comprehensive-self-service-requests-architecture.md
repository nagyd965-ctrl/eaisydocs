# ADR A-080: eaisyHR Vezetői Munkaterület Újraszervezése és Teljes Körű Önkiszolgáló Kérelemkezelési Architektúra

- **Dátum:** 2026-10-21
- **Státusz:** `Decided`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](./A-029-global-ui-consistency-and-unified-components.md), [ADR A-067](./A-067-comprehensive-hr-roles-scoping-rpc-and-route-guard-alignment.md), [PRD P-104](../product/decisions/P-104-manager-workspace-revamp-and-comprehensive-self-service-requests-ux.md)

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR vezetői és dolgozói önkiszolgáló felületein két strukturális adathiány és elrendezési probléma mutatkozott:

1. **Vezetői Felület Fragmentáltsága (`/hr/manager`):**
   - A korábbi elrendezés egy aszimmetrikus 2-hasábos nézetet alkalmazott (2/3 szélességű bal hasáb a jóváhagyásokkal és naptárral, 1/3 szélességű jobb hasáb a beosztotti névsorral és kiterjedt üres fehér terekkel).
   - A közvetlen beosztottak listájában nem volt gyorskereső, hiányzott a lista/kártya nézetváltási lehetőség, és a státuszok statikusak maradtak („Irodában”), függetlenül attól, hogy az adott munkavállaló valóban rögzített-e belépést aznap.
   - A jóváhagyási lista és a csapatnaptár összezsúfolódott, korlátozva az áttekinthetőséget.

2. **Önkiszolgáló Kérelmi Előzmények Hiányossága (`/hr/self-service/time`):**
   - A dolgozói önkiszolgáló jelenlét és szabadság oldalon a „Saját kérelmeim” kártya kizárólag a `hr_tavollet` táblát kérdezte le.
   - Amikor egy dolgozó vagy vezető munkaidő korrekciót (`hr_jelenlet_korrekcio`) vagy túlóra elszámolási/felhasználási kérelmet (`hr_tulora_felhasznalás`) nyújtott be, az a felső jelenléti íven megjelent bírálat alatti állapotban, de az alsó kérelmi előzmények listában egyáltalán nem listázódott.
   - A meglévő távolléti komponens kerekített dekoratív ikondobozt (`rounded-full bg-primary/10`) használt, ami megsértette az eaisyDocs Zero-Emoji és No-Decorative-Icons irányelvét.

## 2. Döntés

1. **Vezetői Munkaterület Újraszervezése és Kanonikus `ManagerTeamTabs`:**
   - Megszüntettük az aszimmetrikus 2-hasábos felépítést.
   - Bevezettük a kanonikus `ManagerTeamTabs` komponenst, amely 3 fókuszált, teljes képernyőszélességű lapra tagolja a vezetői teendőket:
     - **`Jóváhagyások`:** Teljes szélességű egységes kérelmi panel (távollét, munkaidő korrekció, túlóra), tiszta szöveges műveletekkel és kontextus-érzékeny üres állapottal.
     - **`Csapatnaptár`:** Tágas, jól áttekinthető havi naptár a csapat távolléteinek és jelenlétének követésére.
     - **`Közvetlen beosztottak`:** Letisztult csapatnézet kanonikus `TableToolbar` keresővel, jelenléti státusz szűrővel, valamint lista és kártyás nézetváltóval.

2. **Dinamikus Jelenlét-Státusz Integráció (`hr_jelenlet`):**
   - A beosztottak mai státuszának meghatározása a `hr_jelenlet` tábla alapján történik a mai naptári napra (`datum = todayStr`).
   - Amennyiben a munkavállalónak van rögzített `becsekkolas_ideje` és a `kicsekkolas_ideje` még üres, a felület dinamikusan zöld színű **`Becsekkolva (ÓÓ:PP)`** státuszjelvényt jelenít meg.

3. **Önkiszolgáló Kérelem-Konszolidáció (`hr_jelenlet_korrekcio` & `hr_tulora_felhasznalás`):**
   - A `/hr/self-service/time` szerveroldali adatlekérése kiegészült a felhasználó saját munkaidő korrekcióival és túlóra kérelmeivel.
   - A `LeaveHistoryList` komponenst átalakítottuk egy egységesített, időrendi önkiszolgáló kérelmi előzménylistává, amely kategóriajelvénnyel, érintett idősávokkal, megadott indoklással és elutasítási okokkal reprezentálja mindhárom kérelmi típust.
   - Eltávolítottuk a dekoratív kör alakú ikondobozt, a komponens tipográfia-központú Linear-flat vizuális hierarchiát kapott.

4. **Valós Idejű Kliensoldali Szinkronizáció:**
   - Az `AttendanceCorrectionDialog` a sikeres kérelembeküldés után meghívja a Next.js `router.refresh()` metódusát, azonnal érvénytelenítve a szerveroldali gyorsítótárat és megjelenítve az új kérelmet a „Saját kérelmeim” listában újratöltés nélkül.

## 3. Érintett Komponensek és Fájlok

- `src/app/hr/manager/page.tsx` (Vezetői oldal adatlekérés és ManagerTeamTabs beágyazás)
- `src/components/hr/manager-team-tabs.tsx` (Új 3-lapos vezetői munkaterület komponens)
- `src/app/hr/self-service/time/page.tsx` (Önkiszolgáló oldal korrekciók és túlórák párhuzamos lekérésével)
- `src/components/hr/leave-history-list.tsx` (Egységesített, Zero-Emoji konform kérelmi előzménylista)
- `src/components/hr/attendance-correction-dialog.tsx` (Kliensoldali router.refresh() azonnali frissítéshez)

## 4. Következmények

- A munkavállalók és vezetők a beadott munkaidő korrekcióikat és egyéb igényeiket azonnal nyomon tudják követni saját felületükön.
- A vezetők a beosztottaik valós napi munkavégzését (becsekkolva vs távol) egy fókuszált, szűrhető és kereshető listában látják.
- A felület 100%-ban megfelel az ADR A-029 egységességi elvnek és a Zero-Emoji / No-Decorative-Icons szabályzatnak.
