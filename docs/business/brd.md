# [Közös] eaisyDocs & eaisyHR – Üzleti Követelmény Specifikáció (BRD)

> **Verzió:** 2.0 (Kódbázis-auditált kiadás)  
> **Dátum:** 2026-09-30  
> **Alapja:** A megvalósult forráskód (106 SQL migráció, Next.js 15 alkalmazás) és az `eaisyDocs_szoftverterv.md`.

---

## 1. Vezetői Összefoglaló és Célkitűzés
Az **eaisyDocs** egy modern, böngészőből elérhető, felhőalapú elektronikus iratkezelő, iktató és irattári rendszer. Célja, hogy a vállalkozásokhoz és könyvelőirodákhoz érkező küldeményeket (számlákat, szerződéseket, hatósági leveleket, bizonylatokat) automatizáltan érkeztessen, AI támogatással elemezzen, szabályozottan és hézagmentesen iktasson, felelőshöz rendeljen, majd az életciklus végén a megőrzési időnek megfelelően hitelesítve selejtezzen vagy irattárban őrizzen.

Az **eaisyHR** önálló munkaügyi, bérszámfejtési adatgyűjtő, jelenléti és teljesítményértékelő modul, amely zökkenőmentesen kapcsolódik az eaisyDocs dokumentumtárához, de attól függetlenül is önálló termékként működőképes.

---

## 2. Kulcs Entitások és Hierarchia
A rendszer az alábbi szigorú 4-szintű iratkezelési hierarchiára épül:

```text
ÜGY (ugy)
 └── ÜGYIRAT (ugyirat / Iktatószám: pl. NYILV/2026/00001)
      └── IRAT (irat / Bejövő, Kimenő, Belső)
           └── FÁJL (irat_fajl / Eredeti tárolt fájl + PDF/A-2b másolat)
```

1. **ÜGY (`ugy`):** A legfelső összefogó üzleti dosszié (pl. "2026. évi Irodabérlet", "Partnerkeresési projekt").
2. **ÜGYIRAT (`ugyirat`):** Az egyedi, gap-mentes **iktatószámmal** rendelkező hivatalos akta. Formátuma prefix alapú és évenként újraszámlált: `PREFIX/ÉV/SORSZÁM` (pl. `NYILV/2026/00001`, `HR/2026/00042`).
3. **IRAT (`irat`):** Az adott konkrét küldemény (levél, számla, szerződés), amely rendelkezhet saját érkeztetőszámmal, minősítési szinttel (`nyilt`, `belso`, `bizalmas`, `szigoruan_bizalmas`) és FTS keresővektorral.
4. **FÁJL (`irat_fajl`):** A Supabase Storage-ben őrzött bináris állomány (`storage_path` + háttérben generált `pdfa_path` normalizált másolat, kriptográfiai `sha256` ellenőrző hash-sel és `ocr_szoveg` mezővel).

---

## 3. Megvalósult Iratkezelési és HR Életciklus

1. **Érkezés & Érkeztetés:**
   - Csatornák: Automatikus IMAP e-mail szinkronizáció (`/api/cron/imap`), kézi drag-and-drop feltöltés, kötegelt szkenner elválasztólapos feldolgozás (`/api/scanner/separator-sheet`), és cross-project eaisyBill számlaimport.
   - Automatikus érkeztetőszám generálás és minősítés hozzárendelés.
2. **AI Elemzés & Javaslattétel:**
   - Aszinkron háttérsor (`ai_feladat_sor`, `ai-worker-service.ts`) Google Gemini LLM hívásokkal.
   - Adószámok, összegek, partnerek, bizonylatszámok és előzmény-ügyiratok felismerése és badge-ként való felajánlása az iktatási split-view képernyőn.
3. **Iktatás & Ügyirat-képzés:**
   - Tranzakciós zárolású (`iktatoszam_allokacio`) gap-mentes sorszám-allokáció.
   - Szervezeti egységhez rendelés, felelős kijelölése, határidő megadása.
4. **Ügyintézés, Feladatok & Megosztás:**
   - Belső feladatok (`feladat`) kezelése Kanban táblán, naptárban és listában (`/tasks`).
   - Ügyiraton belüli explicit megosztások (`ugyirat_hozzaferes`) és minták sablonozása (`ugyirat_sablon`).
   - Külső REST API v1 (`/api/v1/ugyiratok`) ERP integrációkhoz.
5. **Fizikai Irattár és Kölcsönzés:**
   - Fizikai koordináták rögzítése (`irat_fizikai_hely`: épület, helyiség, polc, doboz).
   - Kölcsönzési láncolat (`irat_kolcsonzes_naplo`), lejárati határidők figyelése éjszakai cronnal.
6. **Selejtezés & Megsemmisítés:**
   - Irattári terv (`irattari_terv`) szerinti megőrzési idők automatikus vizsgálata.
   - Selejtezési csomag összeállítása (`selejtezes_csomag`, `selejtezes_tetel`).
   - Szigorú négyszem-elv adatbázis RLS szinten (a felterjesztő nem hagyhatja jóvá a saját csomagját).
   - Hivatalos PDF selejtezési és átadási jegyzőkönyv generálás (`/archive/print`).
7. **Munkaügyi és Jelenléti Folyamatok (eaisyHR):**
   - 13 füles dolgozói 360° profil (`/hr/employee/[id]`) és titkosított személyi adatok (`hr_dolgozo_titkos_adat`).
   - Havi jelenléti ívek digitális lezárása (`hr_havi_jelenlet_zaras`), automatikus túlóra delta számítás kicsekkoláskor (`hr_tulora_egyenleg`), lecsúsztatási és kifizetési kérelmek jóváhagyása.
   - Munkaszüneti napok nyilvántartása (`hr_munkaszuneti_nap`).
   - ATS toborzási csővezeték (`/hr/recruitment`), publikus karrieroldal (`/karrier`), automatikus CV elemzés.
   - Onboarding és Offboarding ellenőrzőlisták és kilépő interjúk.
   - Teljesítményértékelési ciklusok (`hr_teljesitmeny_ciklus`, `hr_kpi_katalogus`) és egyéni fejlesztési tervek (IDP).
   - Cafeteria keretnyilatkozatok leadása és PDF generálása.
   - NAV T1041 és KSH havi munkaügyi jelentések exportja.

---

## 4. Jövőbeli Bővítési Irányok (Termék Backlog)
* **Szállítmányozási CMR Modul:** Számla–CMR diszkrepancia-vizsgálat és fuvarlevelek automatikus egyeztetése.
* **EasyWare Raktári Integráció:** Szállítólevelek és raktári bevételezések egyeztetése.
* **Könyvelőirodai Multitenancy:** Egyetlen felületről több független ügyfélcég irattárának váltása.
* **Generatív AI Szerződéskészítő:** Természetes nyelvű sablonokból generált munkaszerződések és teljesítésigazolások.
* **Mt. Haladó Szabálymotor:** 11 órás pihenőidő törvényi ellenőrzése, 250 órás éves túlóraplafont figyelő blokkolás és többhavi munkaidőkeret elszámolása.
