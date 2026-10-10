# [HR] A-042: Ütemezett Bérpapír Előállítás és Dolgozói Digitális Átvételi Nyugtázás Architektúra

- **Státusz:** Elfogadva (Accepted)
- **Dátum:** 2026-10-10
- **Döntéshozó:** eaisyHR és eaisyDocs Core Team
- **Kapcsolódó PRD:** [P-061](../../product/decisions/P-061-hr-scheduled-payroll-generation-and-digital-receipt-ux.md)
- **Törvényi hivatkozás:** Munka Törvénykönyve (2012. évi I. tv. – Mt.) 155. § (1)–(3) bek., Mt. 22. § (2) bek., 1997. évi LXXX. tv. (Tbj.), 1995. évi LXVI. tv. (Lvt.)

---

## 1. Kontextus és Problémafelvetés

Az Mt. 155. § (1) bekezdése előírja, hogy a munkáltató a tárgyhónapot követő hónap 10. napjáig köteles írásbeli tájékoztatást (bérjegyzéket / bérpapírt) adni a munkavállalónak a munkabér elszámolásáról, a levonások jogcíméről és összegéről.
Korábban az eaisyHR rendszerben csupán a bruttó alapbér (`hr_dolgozo_titkos_adat` és `hr_munkaszerzodes`) és a jelenléti ívek voltak rögzítve, de hiányzott a bérjegyzékek entitás-szintű nyilvántartása, a törvényes adó- és járuléklevonások (SZJA 15%, TB 18,5%, SZOCHO 13%), valamint a dolgozói digitális átvétel joghatásos rögzítése.

A cél egy olyan robusztus, RLS-védett architektúra megteremtése, amely:
1. Havi bázison képes előállítani az összes aktív munkavállaló tételes elszámolását a jelenléti adatok és adókedvezmények alapján.
2. Formázott, hiteles A4-es Bérjegyzék PDF dokumentumot generál.
3. Kétoldalú auditált digitális átvételt (időbélyeg, IP cím, SHA-256 lenyomat) biztosít a dolgozói önkiszolgáló felületen (ESS).

---

## 2. Döntés

### 2.1 Adatbázis Modell (`public.hr_berpapir`)
Egy új táblát vezettünk be a PostgreSQL rétegben:
- **Kulcsok és Scoping:** `id` (UUID PK), `dolgozo_id` (FK -> `felhasznalo_profil`), `company_id` (FK -> `companies`), `ev` (INT), `honap` (INT 1–12), `UNIQUE (dolgozo_id, ev, honap)`.
- **Jövedelmi komponensek:** `brutto_alapber`, `tervezett_munkanap`, `ledolgozott_munkanap`, `ledolgozott_munkaora`, `alapber_reszlet`, `szabadsag_nap`, `szabadsag_dij`, `betegszabadsag_nap`, `betegszabadsag_dij` (Mt. 146. § 70%), `tulora_ora`, `tulora_potlek`, `bonusz_jutalom`, `cafeteria_brutto`, `brutto_osszesen`.
- **Adókedvezmények (Opcionális mezők):**
  - `kedvezmeny_25_ev_alatti` (BOOLEAN): A havi törvényes keretig (576.601 Ft) 0% SZJA.
  - `csaladi_kedvezmeny_osszeg` (NUMERIC): Családi adó- és járulékkedvezmény összege.
  - `egyeb_adokedvezmeny_osszeg` (NUMERIC): Személyi kedvezmények.
  - `adokedvezmenyek_osszesen` (NUMERIC).
- **Törvényes Levonások:** `szja_levonas` (15%), `tb_jarulek_levonas` (18,5%), `letiltas_egyeb_levonas`, `levonasok_osszesen`.
- **Nettó Kifizetés és Munkáltatói Teher:** `netto_kifizetendo`, `szocho_munkaltatoi` (13%), `bankszamlaszam`, `kifizetes_hatarido`.
- **Nyugtázás:** `statusz` (`tervezet` | `kikuldve` | `atveve`), `kikuldes_datuma`, `atvetel_datuma`, `atvetel_ip`, `pdf_url`, `pdf_sha256`.

### 2.2 Szigorú RLS Jogosultsági Modell
- **Dolgozó:** Kizárólag a saját bérpapírjait olvashatja (`dolgozo_id = auth.uid()`), és kizárólag az átvételt igazolhatja (`atvetel_datuma`, `statusz='atveve'`).
- **HR és Adminisztrátorok:** Kezelhetik a teljes állomány bérpapírjait (`hr_szerepkor IN ('admin', 'hr_vezeto', 'hr_munkatars')`).

### 2.3 Számítási és PDF Generáló Motor
- `src/utils/hr/payslip-calculator.ts`: Determinisztikus kalkulátor, kezeli az arányos ledolgozott napokat, 70%-os betegszabadság díjat, 150%-os túlórapótlékot, valamint a kedvezmények szétosztását SZJA és TB között.
- `src/utils/hr/payslip-pdf-generator.ts`: A meglévő Puppeteer háttérrendszerre (`launchPdfBrowser`) épülő A4-es hivatalos bérjegyzék sablon, digitális átvételi záradékkal és 50 éves irattári hivatkozással.

---

## 3. Következmények

### Pozitívumok:
- **Törvényi megfelelőség:** A cég maradéktalanul eleget tesz az Mt. 155. § előírásainak.
- **Auditálhatóság:** A bérpapír átvétele vitathatatlanul bizonyítható a bíróság és a munkaügyi felügyelet előtt az `esemeny_naplo` bejegyzéssel.
- **Transzparencia:** A munkavállaló a mobilján vagy böngészőjében azonnal látja a bruttó-nettó levezetést és letöltheti a PDF-et.

### Figyelembe vett kompromisszumok:
- A komplex bérszámfejtési szoftverek (pl. Nexon, Kulcs-Bér) speciális egyedi pótlékai nem mind kódoltak manuálisan, de a `bonusz_jutalom`, `csaladi_kedvezmeny`, `egyeb_adokedvezmeny` és `letiltas_egyeb_levonas` mezőkön keresztül a HR bármilyen korrekciót el tud végezni.
