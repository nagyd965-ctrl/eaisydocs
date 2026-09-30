# [Közös] Munkanapló & Rendszerállapot: Teljes Visszamenőleges Leltár és Dokumentáció Backfill

**Dátum:** 2026-09-30  
**Típus:** Mély Analízis, Architektúra és Teljes Rendszerdokumentáció  
**Érintett Rendszerek:** eaisyDocs (Iratkezelés) & eaisyHR (Munkaügy és HR)  
**Fejlesztési Ráfordítás Alapja:** ~100-100 munkaóra  

---

## 1. Vezetői Összefoglaló (Executive Summary)

A korábbi fejlesztési szakaszban megvalósult mintegy 100-100 munkaórányi kódállomány (106 SQL migráció, 45 Next.js útvonal, 43 server action, 147 React komponens) teljes visszamenőleges rendszerezésre került a VisiBill mintájára kialakított dokumentációs döntéstárban (`docs/`).

A fejlesztés során rögzítésre került a két szoftvertermék szigorú **moduláris függetlensége** ([A-005](../architecture/decisions/A-005-hr-modular-independence-architecture.md), [BRD-003](../business/decisions/003-hr-modular-independence-contract.md)): az eaisyDocs és az eaisyHR közös PostgreSQL adatbázison nyugszik, de funkcionálisan és lekérdezési szinten garantáltan önállóan is működőképes.

---

## 2. Elkészült Dokumentációs Tárgyak és Nyilvántartások

### A. Technológiai Döntések (ADR - 19 db) – [Index](../architecture/decisions/index.md)
1. `A-001`: Szigorú négyszem-elv a selejtezési javaslatok jóváhagyásánál `[Docs]`
2. `A-002`: DocumentPreviewFrame memóriabeli Blob URL izoláció `[Közös]`
3. `A-003`: 'eaisybill' számlaérkezési csatorna ENUM szétválasztás `[Docs]`
4. `A-004`: Kötegelt szkenner szerveroldali PDF worker és stream olvasás `[Docs]`
5. `A-005`: eaisyDocs és eaisyHR moduláris függetlenségi architektúra `[HR / Közös]`
6. `A-006`: Gap-mentes és újrahasznosíthatatlan iktatószám allokáció `[Docs]`
7. `A-007`: Négydimenziós RBAC / ABAC jogosultsági modell Supabase RLS szinten `[Közös]`
8. `A-008`: Szigorúan append-only eseménynapló (audit log) integritás `[Közös]`
9. `A-009`: Automatikus IMAP email érkeztető daemon és aszinkron AI queue `[Docs]`
10. `A-010`: PDF/A normalizáció és SHA-256 kriptográfiai hash integritás `[Docs]`
11. `A-011`: Polimorf külső entitáskapcsolatok (irat_kapcsolat) `[Közös]`
12. `A-012`: HR szenzitív adatok és béradatok Security Definer RPC rétege `[HR]`
13. `A-013`: HR digitális jelenléti ív, munkaidőkeret és túlóra motor `[HR]`
14. `A-014`: HR GDPR elfeledtetési jog és toborzási anonymization cron `[HR]`
15. `A-015`: TOTP 2FA kétlépcsős azonosítás és inaktivitási időkorlát `[Közös]`
16. `A-016`: Magyar ékezetmentes (unaccent) Postgres FTS keresőmotor `[Docs]`
17. `A-017`: HR lépcsőzetes (cascading) KPI célkitűzések és értékelési ciklusok `[HR]`
18. `A-018`: HR toborzási ATS architektúra, CV parser és publikus karrieroldal `[HR]`
19. `A-019`: Távollét alatti helyettesítési és delegálási motor `[Közös]`

### B. Termék és UX Döntések (PRD - 18 db) – [Index](../product/decisions/index.md)
1. `P-001`: Vezetői és Operatív Dashboard Recharts statisztikákkal `[Közös]`
2. `P-002`: Selejtezési jegyzőkönyv iktatószám badge és popover részletező `[Docs]`
3. `P-003`: Iktatási Realtime párhuzamossági ütközésvédelem és Toast `[Docs]`
4. `P-004`: Érkeztetett postaláda split-view és AI javaslatok UX `[Docs]`
5. `P-005`: Ügyirat életciklus, lezárás és iktatókönyv UX `[Docs]`
6. `P-006`: Részletes kereső, mentett szűrők és értesítések UX `[Docs]`
7. `P-007`: Fizikai irattár, kölcsönzés és dobozkezelés UX `[Docs]`
8. `P-008`: Rendszerbeállítások, szervezeti egységek és audit napló UX `[Közös]`
9. `P-009`: Partner nyilvántartás és beágyazott ügyirat betekintő UX `[Docs]`
10. `P-010`: Munkavállalói digitális karton és munkaviszony-történet UX `[HR]`
11. `P-011`: Munkaidő nyilvántartás, jelenléti ív és szabadságtervező naptár UX `[HR]`
12. `P-012`: Teljesítményértékelés, KPI és értékelési ciklusok UX `[HR]`
13. `P-013`: Toborzási ATS és publikus karrieroldal UX `[HR]`
14. `P-014`: Dolgozói Self-Service portál és cafeteria nyilatkozat UX `[HR]`
15. `P-015`: Onboarding és offboarding checklist folyamatok UX `[HR]`
16. `P-016`: Munkaügyi megfelelőség, hatósági riportok és egészségügy UX `[HR]`
17. `P-017`: Egyéni Fejlesztési Terv (IDP) és képzési UX `[HR]`
18. `P-018`: Szervezeti fa és vezetői HR dashboard UX `[HR]`

### C. Üzleti Szabályok (BRD - 7 db) – [Index](../business/decisions/index.md)
1. `BRD-001`: Gap-mentes és újrahasznosíthatatlan iktatószám allokáció `[Docs]`
2. `BRD-002`: Selejtezési folyamat és négyszem-elv szabályozása `[Docs]`
3. `BRD-003`: eaisyDocs és eaisyHR üzleti szeparációja és licencelhetősége `[HR / Közös]`
4. `BRD-004`: Bizalmas és nyílt minősítésű iratok kezelése `[Docs]`
5. `BRD-005`: Fizikai irattári kölcsönzés és leltári felelősség `[Docs]`
6. `BRD-006`: Munka Törvénykönyve szerinti munkaidő, túlóra és pihenőidő szabályok `[HR]`
7. `BRD-007`: Toborzási adatkezelés, GDPR retenció és jelölt életciklus `[HR]`

### D. Adatbázis Séma Dokumentáció – [`docs/architecture/database/`](../architecture/database/database-schema.md)
- `01-iratkezeles.md`: Iratkezelési és érkeztetési táblák
- `02-archivalas-selejtezes.md`: Selejtezési csomagok, jegyzőkönyvek, fizikai tárolók
- `03-hr-ber.md`: Teljes eaisyHR adatbázisséma (27 tábla a migrációk alapján)
- `04-partnerek-integracio.md`: Partnerek, audit napló, polimorf kapcsolatok
- `database-schema.md`: Fő adatbázis áttekintő ER modellel

---

## 3. Asztali Fejlesztési Tervezet (Excel) Frissítése

Az Asztalon lévő Excel munkafüzet (`eaisyDocs_es_eaisyHR_Teljes_Fejlesztesi_Tervezet.xlsx`) kibővítésre került:
- **Fül 1: 📂 eaisyDocs Fejlesztések:** 23 már működő alaprendszeri funkció zölddel és áthúzással (`✅ KÉSZ`), a brief alapján tervezett új funkciók (`PT`, `EB`, `MT`, `CMR`, `EW`, `CTR`, `TIG`, `NET`), és 25 üres manuális sor (`MAN-01` .. `MAN-25`).
- **Fül 2: 👥 eaisyHR Fejlesztések:** 27 már működő HR modul zölddel és áthúzással (`✅ KÉSZ`), tervezett bérintegrációs tételek, és 15 üres manuális sor (`HR-MAN-01` .. `HR-MAN-15`).
- **Fül 3: 📊 Összesítő és KPI Műszerfal:** Dinamikus képletekkel felépített vezetői műszerfal, amely automatikusan számolja az elkészült, folyamatban lévő és nyitott funkciókat modulonként.
- **Fül 4: 💡 Útmutató és Tippek:** Lépésről lépésre útmutató Dani számára a manuális bővítéshez és áthúzáshoz.

---

## 4. Automatizációs Eszközök és Szabályok
- **CI / CLI Szinkronizáló:** [`scripts/doc-sync.ts`](../../scripts/doc-sync.ts) futtatható `npx tsx scripts/doc-sync.ts` paranccsal.
- **Agent Szabályzat:** [`.agents/rules/documentation.md`](../../.agents/rules/documentation.md).
- **Agent Skill:** [`.agents/skills/eaisydocs-doc-sync/SKILL.md`](../../.agents/skills/eaisydocs-doc-sync/SKILL.md).
