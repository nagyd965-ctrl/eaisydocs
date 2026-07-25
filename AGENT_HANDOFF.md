# eaisyDocs & eaisyHR - Projekt Állapot és Kontextus (Agent Handoff)

Ez a dokumentum azt a célt szolgálja, hogy egy új AI agent azonnal és zökkenőmentesen kontextusba kerüljön, és a meglévő logika ismeretében folytathassa a munkát.

---

## 1. Alapvető Projekt Kontextus
Ez egy kettős funkciójú rendszer, ami egy közös alapon nyugszik:
1. **eaisyDocs**: Elektronikus iratkezelő és iktató rendszer.
2. **eaisyHR**: Vállalati HR, toborzási (ATS), időgazdálkodási és értékelési rendszer. Nem bérszámfejtő szoftver, de előállítja az adatokat a bérszámfejtésnek!

**Technológiai Stack:**
- **Frontend:** Next.js 16.2.10 (App Router, Turbopack), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend / Adatbázis:** Supabase (PostgreSQL, RLS, Auth, Storage, Edge Functions).

---

## 2. Architektúra és Design Szabályok (Kritikus!)

### 2.1. Frontend és Design (A `design/` mappa és a `.agents/AGENTS.md` alapján)
- **Vizuális stílus (Kötelező):** Linear-inspirált flat design. Nincsenek árnyékok (box-shadow). A hover shadow globálisan TILTOTT. Dark módban 1px inset border használatos.
- **Színrendszer:** HSL alapú CSS változók (pl. `bg-primary`, `text-muted-foreground`). A "Fintech Teal" az elsődleges (brand) szín.
- **Tipográfia:** Montserrat font. Címeknél `font-semibold` (NEM `font-bold`), pénzügyi/statisztikai adatoknál `tabular-nums`.
- **Ikonok:** Lucide React, egységes `h-4 w-4` méretezéssel.
- **Sötét mód (Dark mode):** Kötelező. A Tailwind `darkMode: ["class"]` stratégiát használjuk.

### 2.2. Backend és Biztonság
- **Modul szintű elszigetelés:** A `felhasznalo_profil` tábla `elerheto_modulok` text[] tömbje dönti el a láthatóságot (`"docs"` vagy `"hr"`).
- **Kétféle Szerepkör:** 
  - `szerepkor`: (ugyintezo, vezeto, admin, ellenor) -> **eaisyDocs**
  - `hr_szerepkor`: (munkavallalo, hr_munkatars, hr_vezeto, admin) -> **eaisyHR**
- **RLS (Row Level Security):** Szigorúan adatbázis szinten.
- **Titkos adatok (TAJ, Adószám, Bankszámla, Orvosi vizsgálat, Fegyelmi ügy):** A HR adat jelentős része GDPR különleges kategóriájú adat. Ezek tárolása titkosított (pgcrypto), lekérdezésük biztonságos RPC híváson keresztül történik, ami **azonnal kötelező Audit Napló bejegyzést ír!**
- **Audit Napló (`esemeny_naplo`):** Szigorúan **append-only**. 

---

## 3. Megvalósított Funkciók (Amik már működnek)

### 📄 EAISYDOCS (Iratkezelés: \~90% Kész)
- [x] Adatbázis Schema, RLS, Irattári terv alapok.
- [x] Tranzakcionális gap-mentes iktatószám generálás (`iktatas_logic.sql`).
- [x] Bejövő Sor (Inbox) Lista.
- [x] Kétpaneles Iktatási Nézet UI (`/inbox/[id]`) beépített PDF viewerrel.
- [x] Kereső Panel (Irány, Minősítés, Kifejezés).
- [x] Fájlfeltöltés Supabase Storage-ba, automatikus SHA-256 hash generálással (integritás-védelem).

### 👥 EAISYHR (HR és Toborzás: Jelenlegi Állapot)
- [x] **Dolgozói alapadatok:** KÉSZ (Adatlap, időbeliség kezelése megvan).
- [x] **Munkaszerződés-kezelés:** KÉSZ.
- [x] **Cafeteria Modul:** KÉSZ (Nyilatkozatok, egyenlegek).
- [x] **Távollétek (Szabadság) kezelése:** KÉSZ.
- [x] **Automatikus Brevo E-mail:** Új dolgozó felvételekor ideiglenes jelszó kiküldése e-mailben.
- [/] **Szervezet és Munkakörök:** A katalógus és a szervezeti ábra listázása javítva, de a "Közvetlen vezető" és szervezeti egység bekötése az `EmployeeEditDialog`-ba még hátravan.
- [x] **Toborzás (ATS):** KÉSZ.
- [x] **Onboarding (Beléptetés):** KÉSZ. (Feladatlista kezelés dinamikusan, elektronikus dokumentum nyugtázás és egykattintásos átemelés a toborzásból kész).
- [x] **Teljesítményértékelés:** KÉSZ (Ciklusok, KPI-könyvtár, kaszkádolás, önértékelés, Dashboard és Bónusz-kalkulátor megvalósítva).

---

## 4. Megmaradt / Hátralévő Taskok (MIVEL KELL FOLYTATNI?)

### 📄 EAISYDOCS (Hátralévő apróságok)
- [x] **Vízjelezett Előnézet:** Bizalmas iratok előnézetébe vízjel égetése (Supabase Edge Function).
- [x] **Selejtezési Javaslatok:** Irattári terv alapján a lejárt iratok listázása egy adminisztrációs felületen (nincs automatikus törlés, csak javaslat \+ jegyzőkönyv).
- [x] **Polimorf Kapcsolatok UI:** Az `irat_kapcsolat` táblára épülő UI elkészítése (iratok összekötése tranzakciókkal, partnerekkel).
- [ ] **Postgres FTS:** Keresés optimalizálása `tsvector` és magyar szótár beállításával.

### 👥 EAISYHR (A Tényleges Fejlesztési Feladatok)
A projekt eaisyHR része már jelentősen előrehaladt! Amikkel folytatni kell:

**1. Szervezet és Munkakörök (Befejezés)**
- [ ] `EmployeeEditDialog` kibővítése, hogy lehessen közvetlen vezetőt és szervezeti egységet választani a szervezeti ábrához.
- [ ] Munkaköri leírások, feladatok, hatáskörök részletes nyilvántartása.

**2. Toborzás (ATS) befejezése (KÉSZ)**
- [x] Külső (megosztható link) és belső álláshirdetések létrehozása, publikálása. Ügyfél arculatára szabható jelentkezési űrlap, CV feltöltéssel, teljes idővonallal, Brevo email értesítéssel, felújított UI-jal.

**3. Onboarding / Beléptetés befejezése (KÉSZ)**
- [x] Beléptetési feladatlista (Munkavédelem, IT eszköz igénylés, Mentor kijelölése).
- [x] Dolgozói dokumentumtár, ahol a szabályzatokat kötelezően, időbélyeggel "megismerésre" kell nyugtázni.

**4. Teljesítményértékelés (KÉSZ)**
- [x] KPI-könyvtár, egyéni/vállalati célok kaszkádolása.
- [x] Értékelési ciklusok (kitűzés -> felülvizsgálat -> vezetői értékelés). Bónusz javaslatok jóváhagyási workflowja.

**5. Időgazdálkodás (Jelenlét)**
- [ ] Önkiszolgáló munkaidő-rögzítés (timesheet).
- [ ] Túlóra, pótlékok nyilvántartása. Vezetői jóváhagyás, lezárás.
- [ ] Export motor a bérszámfejtő felé (konfigurálható CSV/XLSX).

**6. Hatósági adatszolgáltatás (NAV, KSH)**
- [ ] T1041 adatlap-előállítás: Be- és kilépés adataiból export generálás.
- [ ] KSH munkaügyi jelentés összesítő.
- [ ] Bevallás-archívum (a beküldött PDF-ek feltöltése és tárolása).

---

**Agent Utasítás:**
Ha ezt olvasod, fókuszálj az **eaisyHR hátralévő funkcióira** a felhasználó kérése alapján. A rendszer alapjai stabilak, az Auth, az RLS és a UI komponens-könyvtár rendelkezésre áll. Építsd fel a hiányzó modulokat a fenti listának és a `eaisyhr.pdf` követelményeinek megfelelően! Kérlek, dolgozz alaposan, mert a rendszernek ellenőrzés-állónak (auditálhatónak) kell lennie.
