# A-061: Vercel Serverless Felkészítés, Dinamikus Host-kezelés és eaisyHR Különleges Adatszinkronizáció

**Dátum:** 2026-10-14  
**Státusz:** `Decided`  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Kapcsolódó PRD:** [P-080](../../product/decisions/P-080-modular-hr-branding-and-profile-tabs-ux.md)  
**Érintett komponensek / fájlok:**
- `src/utils/pdf-browser.ts`
- `src/utils/scanner-hotfolder.ts`
- `src/utils/mailer.ts`
- `src/app/hr/onboarding/actions.ts`
- `src/app/hr/actions/employment-contract-actions.ts`
- `src/app/hr/recruitment/actions.ts`
- `src/app/inbox/actions.ts`

---

## 1. Kontextus és Problémafelvetés
A holnapi éles bemutató (demo) előtt a rendszer Vercel Serverless környezetbe lett publikálva. A tesztelés során több kritikus architektúrális inkompatibilitás és adatszinkronizációs hiányosság derült ki:
1. **Puppeteer / Chromium a Vercel Serverless környezetben:** A PDF renderelésért felelős `@sparticuz/chromium-min` lokálisan működött, de Vercel Serverless környezetben argumentum nélküli `executablePath()` híváskor összeomlott (`The input directory does not exist`), mivel a bináris nem állt rendelkezésre lokálisan a containerben.
2. **Hardkódolt belső hálózati URL-ek:** Számos server action és háttérfolyamat (`inbox`, `batch-scanner`, admin meghívók) fixen `http://localhost:3000`-re vagy teszt vercel aldomainekre hivatkozott.
3. **Vercel Read-Only fájlrendszer:** A hotfolder szkenner lokális mappa elérési utat kísérelt meg létrehozni, ami Vercelen szerverhibát eredményezett.
4. **E-mail sablon branding modularitás:** A központi `buildHtmlEmail` segédfüggvényben hardkódolva volt a zöld fejlécben az `eaisyDocs` és az alsó rendszerüzenet, így a toborzásból, interjúztatásokból és éjszakai HR értesítőkből is eaisyDocs fejléccel mentek ki az e-mailek.
5. **Különleges adatok elvesztése Onboarding fiókaktiváláskor:** Az onboarding során a munkaszerződés tervezetébe beírt különleges adatok (TAJ, adójel, bankszámlaszám, bruttó/nettó bér) a fiók aktiválásakor nem szinkronizálódtak át a titkosított `hr_dolgozo_titkos_adat` tárolóba, és az adatlapi mentés egy nem létező `belepes_datuma` oszlop miatt hibára futott.

---

## 2. Megfontolt Alternatívák
- **Alternatíva A:** Különálló e-mail küldő és generáló függvények írása az eaisyHR modul számára.
  - *Értékelés:* Felesleges redundanciát és karbantartási többletet jelentett volna.
- **Alternatíva B:** A különleges adatok egyszerű szöveges tárolása a `hr_dolgozo_adatlap` táblában.
  - *Értékelés:* Súlyos biztonsági és GDPR audit kockázat; az eaisyHR szigorúan BYTEA titkosítást és auditált RPC-t használ a szenzitív adatokra.

---

## 3. Döntés
1. **Chromium Pack Letöltés Vercelhez:** A `src/utils/pdf-browser.ts`-ben a Vercel környezet detektálásakor beállítottuk a hivatalos v149.0.0 Chromium pack tar URL-t, így a Vercel Serverless futtatókörnyezet automatikusan kicsomagolja a binárist.
2. **Kánonikus `getBaseUrl()` Alkalmazása:** Minden belső API hívás és e-mail link a központi `getBaseUrl()` segédfüggvényre támaszkodik, ami prioritásként a `VERCEL_PROJECT_PRODUCTION_URL`-t és `NEXT_PUBLIC_SITE_URL`-t használja.
3. **Moduláris E-mail Rendszernév:** A `buildHtmlEmail` függvény opcionális `systemName: "eaisyDocs" | "eaisyHR" = "eaisyDocs"` paramétert kapott. A toborzási, interjú és HR értesítők mostantól expliciten `systemName: "eaisyHR"` és `senderName: "eaisyHR Toborzás"` / `"eaisyHR Rendszer"` paraméterekkel futnak.
4. **Onboarding Adatszinkronizáció és BYTEA Hex Mentés:**
   - Az onboarding fiókaktiválásakor (`activateEmployeeAccount`) a `latestContract` adataiból a `lakcim`, `szuletesi_datum`, `anyja_neve` közvetlenül a `hr_dolgozo_adatlap`-ba, a `belepes_datuma` pedig a `hr_jogviszony`-ba frissül.
   - A TAJ, adójel, bankszámla, bruttó bér és kalkulált nettó bér automatikusan `\x...` formátumú BYTEA hex kódolással upsert-elődik a `hr_dolgozo_titkos_adat` táblába.

---

## 4. Következmények és Előnyök
- **Vercel stabilitás:** A PDF generálás és szkennelés éles Vercel környezetben is hibátlanul fut.
- **Tiszta moduláris identitás:** Az eaisyHR toborzási folyamatából kiküldött levelek hitelesen eaisyHR brandinggel mennek ki.
- **Garantált adatmegőrzés:** Az onboarding során rögzített munkavállalói adatok azonnal és hiánytalanul megjelennek a munkavállaló 360°-os profiljában.
