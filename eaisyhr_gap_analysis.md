# eaisyHR - Hiányzó Funkciók és Teendők Listája

Az alábbi lista azokat a kritikus funkciókat és feladatokat tartalmazza, amelyeket a szoftverterv megkövetel, de még fejlesztésre várnak. A már elkészült funkciók áthúzva szerepelnek.

## 1. Időgazdálkodás
- ~~**Beléptető rendszer import:** A követelmény kifejezetten kéri, hogy legyen CSV/API import egy fizikai (kártyás) beléptetőből, és a rendszer tudjon eltéréslistát generálni (rögzített munkaidő vs. kapunál mért adat). Ez most még teljesen hiányzik.~~ **[ELVETVE - Nem lesz kártyás rendszer]**
- **Műszakbeosztás:** Időgazdálkodáson belül egy egyszerű tervező/beosztó felület. ("Nice to have")

## 2. Szervezet és Munkakörök
- **Strukturált munkaköri leírások és nyugtázás:** A munkaköröknél a feladatok, hatáskörök jelenleg nincsenek strukturált listára bontva. Fontosabb: hiányzik a dolgozói nyugtázás (amikor a dolgozó a portálon elektronikusan lekattintja, hogy megismerte a munkaköri leírását, és ez naplózódik).

## 3. Dolgozói alapadatok (GDPR és Időbeliség)
- **GDPR különleges adatok:**
  - *Orvosi vizsgálat:* Hiányzik az alkalmassági vizsgálatok kötése a munkakörökhöz és az automatikus lejárat-figyelés.
  - *Fegyelmi ügyek:* Nincs dedikált, szigorúan naplózott és elzárt felület a fegyelmi és kitüntetési adatoknak.
- **Időbeliség (Változáskövetés):** A HR adatoknál (pl. bér, beosztás) hiányzik a jövőbeli/múltbeli hatályosság (`ervenyes_tol` / `ervenyes_ig`) kezelése. A rendszernek tudnia kellene, hogy "mi volt a dolgozó bére 3 hónappal ezelőtt".

## 4. Toborzás (ATS)
- ~~**AI CV Parsing (Differenciáló elem):** Az önéletrajzokból (strukturálatlan PDF-ből) való automatikus adatkinyerés és relevancia-értékelés.~~ **[KÉSZ]**
- ~~**Automatikus anonimizálás:** A GDPR megőrzési idő lejárta után a rendszernek automatikusan anonimizálnia kell a jelentkezői adatokat.~~ **[KÉSZ]**

## 5. Értesítések és Automatizmusok
- **Szerződés és T1041 Riasztások logikája:** Bár az Értesítések UI-ját (a kapcsolókat) megcsináltuk és az RLS-t is javítottuk hozzá, maguk a háttérben futó ellenőrző és e-mail küldő folyamatok (amik ténylegesen kiküldik az e-mailt a lejárat előtt) még nem teljesek.

## 6. További modulok ("Nice to have" pótlások)
- **Cafeteria:** Nyilatkozatok (PDF) automatikus legenerálása és eltárolása a ciklus lezárásakor.
- **Offboarding:** A beléptető (onboarding) motor megvan, de érdemes lenne felmásolni "Kiléptetés" néven az eszközvisszavételekre.
- **Karriertervezés:** A teljesítményértékelés alatt egyéni fejlesztési terv rögzítése.
