# [HR] A-041: Offboarding Hatósági Kilépőigazolások és eaisyDocs Iktatási Védőháló Architektúra

**Dátum:** 2026-10-10  
**Státusz:** Decided  
**Hatókör:** `[HR]`  
**Kategória:** `HR / Offboarding & Compliance`  
**Kapcsolódó Kód:** `src/app/hr/offboarding/actions.ts`, `src/components/hr/exit-certificate-panel.tsx`, `src/utils/hr/exit-certificate-pdf-generator.ts`, `src/utils/hr-filing-bridge.ts`, `src/components/hr/offboarding-profile-modal.tsx`  
**Kapcsolódó Döntések:** [P-060](../../product/decisions/P-060-hr-offboarding-statutory-exit-certificates-and-filing-ux.md), [P-041](../../product/decisions/P-041-statutory-exit-certificate-and-handover-ux.md), [A-026](./A-026-employee-personal-dossier-and-hr-filing-bridge.md)

---

## 1. Kontextus és Törvényi Követelmények

A Munka Törvénykönyve (2012. évi I. tv. – Mt.) 80. § (2) bekezdése, a foglalkoztatás elősegítéséről szóló 1991. évi IV. tv. (Flt.) 36/A. §-a, valamint a vonatkozó társadalombiztosítási és adójogi szabályok alapján a munkaviszony megszűnésekor a munkáltató köteles kiadni az alábbi hatósági okiratokat és elszámolásokat:
1. **Munkáltatói igazolás a munkaviszony megszűnésekor** (jogviszony időtartama, FEOR-08 kód, munkakör, megszűnés jogcíme).
2. **Igazolólap az álláskeresési járadék és segély megállapításához** (Flt. 36/A. §).
3. **Munkabérből történő tartozások és bírósági végrehajtói letiltások nyilatkozata** (tartozásmentesség igazolása vagy letiltási adatok).
4. **Tárgyévi betegszabadság munkanapjainak elszámolása** (Mt. 126. § szerinti 15 napos évi keretből).
5. **Egészségbiztosítási ellátások és TB kiskönyv bejegyzés / átadás-átvételi jegyzőkönyv**.
6. **NAV adóadatlap a tárgyévi jövedelmekről és levont adókról/járulékokról**.

A korábbi rendszerben (P-041) a manuális generálás és a lezáráskori kötegelt iktatás már megjelent, azonban ha az ügyintéző a panelt nem nyitotta meg, a folyamat lezárásakor **nem keletkezett kilépő igazolás**, és a dolgozó személyi dossziéja hiányos maradt.

---

## 2. Építészeti Döntések

### 2.1. Lezáráskori Garantált Generálási Védőháló (Fail-Safe Generator)
A `closeOffboarding(offboardingId)` akció a lezárási tranzakció legelején ellenőrzi, hogy a rekord rendelkezik-e generált `kilepo_igazolas_pdf_url`-lel:
- Amennyiben nem, a motor automatikusan meghívja a `generateExitCertificateAction(offboardingId, {})` függvényt.
- A generátor a dolgozó személyi kartonjából (`hr_dolgozo_adatlap`), a kiléptetési folyamatból (`hr_offboarding`) és a jóváhagyott távollétekből (`hr_tavollet`) fallback mechanizmussal hiánytalanul kitölti a törvényes PDF-et, és perzisztálja a storage-ban.
- Ezzel szavatolt a DoD: **egyetlen munkavállaló kiléptetése sem zárulhat le úgy, hogy a törvényes kilépő igazoláscsomag ne jöjjön létre és ne iktatódjon be.**

### 2.2. Tárgyévi Betegszabadság Determinisztikus Aggregációja
Ahelyett, hogy a HR-esnek manuálisan kellene kiszámolnia a betegszabadságos munkanapokat:
- A `getOffboardingDetailData` és a `generateExitCertificateAction` automatikusan lekérdezi a `hr_tavollet` tábla adott dolgozóhoz tartozó, tárgyévi (`kezdet >= YYYY-01-01`), `tipus = 'betegszabadsag'`, `statusz = 'jovahagyva'` rekordjait.
- Összegzi a `napok_szama` értékeket, és átadja az űrlapnak, illetve a PDF generátornak.

### 2.3. Azonnali Egyedi Beiktatás Lehetősége (Single Document Filing Bridge)
Az `ExitCertificatePanel` közvetlen hozzáférést kap a `fileSingleOffboardingDocument` hídhoz:
- Ha a PDF már elkészült, de a teljes offboarding még nyitott (pl. IT eszközök visszavételére várva), a HR-es azonnal beiktathatja a már aláírt kilépő igazolást a személyi dossziéba (`3.1` irattári tétel, 50 év megőrzési idővel).
- A híd gap-mentes iktatószámot oszt ki (`HR-YYYY/XXXXX/1.Y`), bejegyzi a `hr_dokumentum.iktatoszam` mezőt, és PDF/A-2b archiválási példányt képez SHA-256 lenyomattal.

---

## 3. Adatmodell és Kapcsolatok

```
[hr_offboarding]
  ├── kilepo_igazolas_pdf_url (Storage elérési út)
  ├── kilepo_igazolas_adatok (JSONB: feor, letiltások, postai ragszám)
  └── utolso_munkaban_toltott_nap / kilepes_datuma
        │
        ▼ (closeOffboarding / fileSingleOffboardingDocument)
[executeHrDocumentFiling]
  ├── [ugyirat] (Személyi dosszié, 3.1 tétel, 50 év megőrzés, statusz: irattarban)
  ├── [irat] (Alszám: /1.Y, Belso/Elektronikus eredeti, Bizalmas minősítés)
  ├── [irat_fajl] (SHA-256 lenyomat, PDF/A-2b konvertált példány)
  └── [hr_esemeny_naplo] (Audit napló bejegyzés)
```

---

## 4. Minőségbiztosítás és Tesztelés

- Unit tesztek:
  - `src/utils/__tests__/exit-certificate-pdf.test.ts`: PDF HTML struktúra, Puppeteer buffer, levonások és végkielégítés, 5 kötelező igazolás jelenléte (6/6 sikeres).
  - `src/utils/__tests__/offboarding-compliance.test.ts`: Betegszabadság aggregáció, fail-safe listaépítés, adatlap fallback (5/5 sikeres).
- Statikus típusellenőrzés: `npx tsc --noEmit` 0 hiba.
