# eaisyDocs — Elektronikus iratkezelő rendszer

**Szoftverterv v1.0** Think AI Kft. | Készült: 2026\. július 14\.

---

## 1\. A termék egy mondatban

Az **eaisyDocs** egy magyar KKV-kra szabott elektronikus iratkezelő rendszer, amely a beérkező és kimenő iratok érkeztetésétől az iktatáson és ügyintézésen át a megőrzési idő lejártáig egységes, digitális, auditálható módon kezeli a dokumentumokat — és mindezt a meglévő ERP/CRM rendszerhez kapcsolva teszi.

**Kulcs tervezési kényszer:** a rendszernek nemcsak működnie kell, hanem **bizonyíthatóan bemutathatónak** is kell lennie. A követelménylista minden sorához tartozik egy „ellenőrzés módszere" oszlop — ezek gyakorlatilag előre megírt demó-forgatókönyvek. Minden funkciót úgy tervezünk, hogy egy ellenőrzésen 2-3 kattintással prezentálható legyen (lásd 12\. fejezet).

---

## 2\. Megfelelőségi mátrix (a 10 kötelező követelmény → modul)

| \# | Követelmény | Megvalósító modul | Bemutatás felülete |
| :---- | :---- | :---- | :---- |
| 1 | Érkeztetés, iktatás | Érkeztető modul \+ Iktatókönyv | Ügyirat adatlap → „Nyilvántartási adatok" fül |
| 2 | Minden irat azonos, digitális kezelése | Egységes Dokumentum entitás \+ PDF/A normalizálás | Bejövő/kimenő irat egymás mellett, azonos nézetben |
| 3 | Iratok életciklusának követése | Állapotgép \+ Audit napló (event sourcing) | Ügyirat → „Életciklus" idővonal |
| 4 | Iratok hozzárendelése partnerhez / tranzakcióhoz / folyamathoz | Kapcsolatkezelő (polimorf link tábla) | Partner adatlap → „Kapcsolódó ügyiratok" |
| 5 | Elérés a meglévő integrált üzleti rendszerből | REST API \+ ERP widget/iframe | ERP-ből megnyitott ügyirat életciklus lekérdezés |
| 6 | Szignálás, feladatkiosztás | Feladat/Szignálás modul (határidő, felelős, állapot, irat helye) | Ügyirat → „Feladatok" panel |
| 7 | Figyelmeztetések beállítása | Értesítési motor (e-mail \+ SMS) | Értesítési szabály \+ kiküldött üzenetek naplója |
| 8 | Strukturált jogosultságkezelés, tartalomvédelem | RBAC \+ ABAC, Postgres RLS | Két user, ugyanaz az ügyirat, eltérő láthatóság |
| 9 | Egyszerű felhasználó-azonosítás (SSO) | SSO (OIDC/SAML, AD/Entra ID), vagy ERP-alapú auth | Bejelentkezés AD-fiókkal, ERP-ből átlépés újraauth nélkül |
| 10 | Beépített keresés a leíró információkban | Full-text \+ metaadat keresés (Postgres tsvector \+ opcionális pgvector) | Globális kereső, szabadszavas találatlista |

---

## 3\. Fogalmi modell (ez a legfontosabb rész — ha ezt elrontjuk, minden más csúszik)

A magyar iratkezelési logika **háromszintű**, és ezt nem szabad összemosni:

```
ÜGY (case)                    – pl. "Bérleti szerződés – Kovács Kft. – 2026"
 └── ÜGYIRAT (dossier)        – az egy ügyhöz tartozó iratok rendezett halmaza
      └── IRAT (document)     – egyetlen konkrét dokumentum (bejövő levél, kimenő válasz)
           └── PÉLDÁNY/MELLÉKLET (file) – a fizikai fájl (PDF, docx, szkennelt kép)
```

**Érkeztetés ≠ iktatás.** Ez a leggyakoribb félreértés:

- **Érkeztetés:** a küldemény megérkezésének tényét rögzítjük (mikor, kitől, milyen csatornán, ki vette át). Még nem tudjuk, milyen ügyhöz tartozik. → **érkeztető szám** (pl. `E/2026/000123`)  
- **Iktatás:** a küldeményt ügyirathoz rendeljük és nyilvántartásba vesszük. → **iktatószám** (pl. `TA/2026/0042-3`, ahol 0042 az ügyirat, \-3 az azon belüli sorszám)

Egy irat érkeztethető iktatás nélkül (pl. reklámanyag → irattározás/selejtezés), és keletkezhet irat érkeztetés nélkül (kimenő irat, saját kezdeményezés).

### Iktatószám-formátum (konfigurálható)

```
{szervezeti egység}/{év}/{ügyirat sorszám}-{alszám}
Példa: PENZUGY/2026/00042-3
```

A számkiosztás **gap-mentes** és **soha nem újrahasznosítható** — Postgres sequence \+ tranzakcióban lezárt allokáció (nem `SERIAL`, mert rollback esetén lyuk keletkezne; dedikált `iktatoszam_allokacio` táblával, `SELECT ... FOR UPDATE`\-tel).

---

## 4\. Adatmodell (Supabase / PostgreSQL)

### Törzsentitások

**`ugy`** (ügy) | mező | típus | megjegyzés | |---|---|---| | id | uuid PK | | | ugyszam | text UNIQUE | generált | | targy | text | | | ugytipus\_id | fk | irattári tervhez kapcsol | | statusz | enum | `folyamatban`, `felfuggesztve`, `lezart`, `irattarozott`, `selejtezett` | | felelos\_user\_id | fk | | | hatarido | date | | | letrehozva / lezarva | timestamptz | |

**`ugyirat`** (dossier) | mező | típus | megjegyzés | |---|---|---| | id | uuid PK | | | ugy\_id | fk → ugy | | | iktatoszam | text UNIQUE | | | iktatas\_datuma | timestamptz | | | iktato\_user\_id | fk | | | irattari\_tetel\_id | fk | megőrzési idő innen jön | | megorzesi\_ido\_vege | date | **számított**: lezárás éve \+ tétel szerinti év | | statusz | enum | `iktatva`, `szignalt`, `ugyintezes_alatt`, `elintezett`, `lezart`, `irattarban`, `selejtezheto` | | helye | text/enum | `elektronikus`, `kikolcsonozve:{user}`, `irattar:{polc}` — a 6\. követelmény „irat helyének nyomon követése" miatt kell |

**`irat`** (document) | mező | típus | megjegyzés | |---|---|---| | id | uuid PK | | | ugyirat\_id | fk (nullable) | érkeztetett, még nem iktatott iratnál NULL | | erkeztetoszam | text (nullable) | csak bejövőnél | | irany | enum | `bejovo`, `kimeno`, `belso` | | erkezes\_modja | enum | `posta`, `email`, `szemelyes`, `cegkapu`, `fax`, `rendszer` | | erkezes\_datuma | timestamptz | | | kuldo\_partner\_id | fk (nullable) | | | targy | text | | | leiras | text | | | adathordozo\_tipus | enum | `papir_digitalizalt`, `elektronikus_eredeti` | | minosites | enum | `nyilt`, `belso`, `bizalmas`, `szigoruan_bizalmas` | | kereso\_vektor | tsvector | GIN index, 10\. követelmény |

**`irat_fajl`** (fizikai fájl) | mező | típus | megjegyzés | |---|---|---| | id, irat\_id | | | | storage\_path | text | Supabase Storage / S3 | | eredeti\_fajlnev | text | | | mime\_type | text | | | meret\_byte | bigint | | | sha256 | text | **integritás-ellenőrzés, ez adja az „archiválás" bizonyíthatóságát** | | pdfa\_path | text | normalizált PDF/A-2b változat | | ocr\_szoveg | text | szkennelt iratok kereshetősége | | verzio | int | |

**`partner`** — cégnév, adószám, cégjegyzékszám, kapcsolattartók. *Ha van ERP, ez csak tükrözött nézet (read-only sync), nem másodlagos igazságforrás.*

**`irattari_terv`** / **`irattari_tetel`** — tételszám, megnevezés, megőrzési idő (év), selejtezhető-e (`nem selejtezhető` \= levéltári átadás).

### Kapcsolatok (4. követelmény)

**`irat_kapcsolat`** — polimorf link tábla, ez adja a „partnerhez VAGY tranzakcióhoz VAGY folyamathoz rendelés" rugalmasságát:

| mező | típus |
| :---- | :---- |
| irat\_id / ugyirat\_id | fk |
| entitas\_tipus | enum: `partner`, `tranzakcio`, `folyamat`, `projekt`, `szerzodes`, `szamla` |
| entitas\_id | text (külső ERP azonosító is lehet) |
| entitas\_forras | enum: `belso`, `erp`, `crm` |
| kapcsolat\_tipusa | enum: `targya`, `melleklete`, `hivatkozas`, `elozmeny` |

Így az ERP-ből jövő tranzakcióazonosító (pl. számla ID) is köthető anélkül, hogy az ERP adatmodelljét beemelnénk.

### Audit (3. követelmény — kritikus)

**`esemeny_naplo`** — **append-only**, csak INSERT jog, sem UPDATE, sem DELETE senkinek (adatbázis szinten megvont jog, nem csak alkalmazás-logikában):

| mező | típus |
| :---- | :---- |
| id, tortent | timestamptz |
| entitas\_tipus / entitas\_id |  |
| esemeny\_tipus | enum: `erkeztetve`, `iktatva`, `szignalva`, `megtekintve`, `modositva`, `letoltve`, `nyomtatva`, `tovabbitva`, `elintezve`, `lezarva`, `irattarozva`, `selejtezve`, `jogosultsag_valtozott` |
| user\_id, ip\_cim, user\_agent |  |
| elozo\_ertek / uj\_ertek | jsonb |
| indoklas | text (kötelező bizonyos eseményeknél) |

Az **életciklus idővonal** nézet ebből épül fel — ez az, amit az ellenőrzésen egy lezárt ügyiratnál kattintva megmutatunk.

---

## 5\. Felhasználók és jogosultságok (8. és 9\. követelmény)

### Szerepkörök (RBAC alapréteg)

| Szerepkör | Jogosultság |
| :---- | :---- |
| **Rendszergazda** | Teljes konfiguráció, irattári terv, felhasználók, jogosultságok. Iratok tartalmát **nem** látja automatikusan (ez fontos: a „mindent látó admin" pályázati és GDPR szempontból is rossz minta). |
| **Iratkezelő / iktató** | Érkeztet, iktat, szignálásra előkészít, irattároz, selejtezési javaslatot készít. |
| **Vezető / szignáló** | Ügyiratot szignál, felelőst és határidőt rendel, feladatot oszt ki, saját szervezeti egységének minden ügyiratát látja. |
| **Ügyintéző** | A rá szignált ügyiratokat kezeli, kimenő iratot készít, elintézetté nyilvánít. |
| **Betekintő** | Csak olvasás, letöltés nélkül (opcionálisan vízjelezett előnézet). |
| **Auditor** | Mindent olvas \+ teljes eseménynaplót lát, de nem módosít semmit. |
| **Rendszer (szolgáltatásfiók)** | ERP/n8n integrációk, API-kulccsal, scope-olt jogokkal. |

### Hozzáférési dimenziók (ABAC réteg — a szerepkör önmagában nem elég)

A tényleges láthatóságot **négy dimenzió metszete** adja:

1. **Szerepkör** (mit tehet elvileg)  
2. **Szervezeti egység** (melyik osztály ügyiratai) — hierarchikus: a vezető látja a beosztott egységeket  
3. **Minősítés** (`nyilt` / `belso` / `bizalmas` / `szigoruan_bizalmas`) — a felhasználónak van egy `max_minosites` szintje  
4. **Explicit hozzárendelés** (a rá szignált / hozzá kapcsolt ügyiratok, akkor is, ha egyébként nem látná)

Példa: egy pénzügyi ügyintéző látja a pénzügyi osztály `belso` minősítésű iratait, de a HR osztály `bizalmas` iratát nem — kivéve, ha egy konkrét ügyiratra név szerint jogosultságot kap.

### Technikai megvalósítás

- **Postgres Row Level Security (RLS)** — a jogosultság az **adatbázisban** dől el, nem az alkalmazásban. Ez azért fontos, mert így egy API-hiba vagy egy közvetlen lekérdezés sem tud kiszivárogtatni adatot. Ha az adat kiszivárog, az nem „bug", hanem incidens.  
- **Fájl-hozzáférés:** a Storage-ban lévő fájl **soha nem publikus URL**. Minden letöltés rövid élettartamú (60 s) aláírt URL-lel megy, amit egy Edge Function ad ki — miután ellenőrizte a jogosultságot **és naplózta a letöltést**.  
- **Tartalomvédelem:** `bizalmas` felett a letöltés helyett vízjelezett, felhasználónévvel és időbélyeggel ellátott előnézet a default; a letöltés külön jog.

### Egyszerű felhasználó-azonosítás (9. követelmény)

Három támogatott mód, ügyfelenként választható:

1. **OIDC / SAML SSO** — Microsoft Entra ID (Azure AD), Google Workspace. Ez a preferált: a 9\. pont szó szerint „active directory, single-sign-on" megoldást vár.  
2. **ERP-integrált auth** — ha az ügyfélnek van saját ERP-je, az eaisyDocs elfogadja az ERP által kiállított JWT-t (megosztott titok / JWKS), és onnan veszi át a felhasználót és a szervezeti egységét.  
3. **Helyi fiók \+ kötelező MFA** — csak akkor, ha nincs sem AD, sem ERP.

**A 9\. pont csendben tartalmaz egy dokumentációs követelményt is:** „Szállítói szerződés IT biztonságra vonatkozó részének vagy az IT biztonsági szabályzatnak az áttekintése." → Tehát a szállítási csomag részeként **IT Biztonsági Szabályzatot is át kell adni** (hozzáférés-kezelés, jelszópolitika, mentés, incidenskezelés, adatfeldolgozói kötelezettségek). Ezt ne felejtsük el a scope-ból, mert az ellenőr ezt is kérni fogja.

---

## 6\. Funkcionális modulok

### 6.1 Érkeztetés (1. követelmény)

**Csatornák — mind ugyanabba a bejövő sorba fut:**

| Csatorna | Megvalósítás |
| :---- | :---- |
| **E-mail** | Dedikált postafiók (`iktatas@ugyfel.hu`), IMAP/Graph API figyelés → a levéltest PDF-fé konvertálva lesz maga az irat, a csatolmányok mellékletek |
| **Papír / szkennelés** | Drag\&drop feltöltés vagy hálózati szkenner „scan to folder" → figyelt könyvtár. Kötegelt szkennelés esetén **elválasztólap (barcode) alapú automatikus szétvágás** |
| **Cégkapu / hivatali kapu** | Letöltő integráció (ha az ügyfélnél releváns) — az elektronikus eredeti (ES3/dosszié) érintetlen megőrzésével |
| **ERP-ből keletkező** | API hívás |
| **Manuális** | Webes űrlap |

**Érkeztetéskor rögzített minimum-adatok:** érkezés dátuma+időpontja, csatorna, küldő (partner-találat vagy szabad szöveg), tárgy, adathordozó, átvevő. Az érkeztető szám azonnal generálódik.

**AI-asszisztált előfeldolgozás (a mi differenciálónk):** OCR (magyar nyelvű), majd egy vision/LLM lépés kitölti a javasolt mezőket — küldő partner, tárgy, dokumentumtípus, ügyszám-hivatkozás, határidő. **A javaslat mindig javaslat marad:** az iratkezelő egy képernyőn látja a dokumentumot és a kitöltött űrlapot, és egy kattintással jóváhagyja vagy javítja. Automatikus, ember nélküli iktatás nincs — iratkezelésnél a hallucináció ára túl nagy, és az ellenőrzésen sem védhető.

### 6.2 Iktatás (1. követelmény)

- Új ügyirat nyitása **vagy** meglévőhöz csatolás (előzménykeresés: a rendszer a küldő \+ tárgy alapján javasol előzményt)  
- Irattári tétel kiválasztása → ebből számítódik a megőrzési idő  
- Iktatószám allokáció (gap-mentes, tranzakcionális)  
- **Iktatókönyv** nézet: időrendi, szűrhető, exportálható (XLSX/PDF) — ez az a lista, amit az ellenőr látni akar

### 6.3 Egységes digitális kezelés (2. követelmény)

Ez a pont arról szól, hogy **bejövő és kimenő irat ugyanabban a formában, ugyanabban a nézetben** legyen kezelhető. Ezért:

- Egyetlen `irat` entitás, az `irany` mező különbözteti meg — **nincs külön „bejövő" és „kimenő" adatmodell**  
- Minden feltöltött fájlból készül egy **normalizált PDF/A-2b** archív példány (LibreOffice headless \+ Ghostscript). Az eredeti fájl változatlanul megmarad mellette (bizonyító erő).  
- Egységes megjelenítő: ugyanaz a viewer, ugyanaz az adatlap-elrendezés, ugyanazok a műveletek irányfüggetlenül  
- Kimenő iratnál sablonos generálás (docx → PDF/A), majd az elküldés ténye (e-mail message-id, tértivevény) visszaíródik az iratra

### 6.4 Életciklus (3. követelmény)

Állapotgép, minden átmenet naplózva, indoklással:

```
[érkeztetve] → [iktatva] → [szignálva] → [ügyintézés alatt] → [elintézett]
                                              ↓
                                        [felfüggesztve]
[elintézett] → [lezárt] → [irattárban] → (megőrzési idő lejár) → [selejtezhető]
                                                                   ↓
                                                    [selejtezve] vagy [levéltárba adva]
```

Az **Életciklus idővonal** UI: függőleges timeline, minden eseménnyel (ki, mikor, mit, mi változott), letölthető **életciklus-riportként PDF-be** — ez pontosan a 3\. pont ellenőrzési módszere („három lezárt ügyirat teljes életciklusának áttekintése on-line módon").

A megőrzési idő lejártakor a rendszer **nem töröl automatikusan**: selejtezési javaslati listát generál, amit jóvá kell hagyni (négy szem elve), és a selejtezésről jegyzőkönyv készül.

### 6.5 Szignálás és feladatkiosztás (6. követelmény)

- Ügyirat szignálása: felelős \+ határidő \+ utasítás szövege  
- Al-feladatok (`feladat` tábla): felelős, határidő, állapot (`nyitott`/`folyamatban`/`kész`/`elutasított`), leírás  
- **Az irat helyének követése** — kifejezetten szerepel a követelményben: elektronikus / kikölcsönözve (kinek, mikor, mikorra ígérte vissza) / irattárban (melyik doboz-polc). Papíralapú eredetiknél ez kölcsönzési napló.  
- Kanban \+ lista \+ naptár nézet a saját feladatokra  
- Helyettesítés: szabadság esetén a feladatok átirányíthatók (a naplóban nyoma marad)

### 6.6 Értesítések (7. követelmény)

**Szabálymotor** — a szabályok adatbázisban, konfigurálhatóan, nem kódban:

| Trigger | Példa |
| :---- | :---- |
| Határidő közeledik | X nappal a határidő előtt (X szabályonként állítható) |
| Határidő lejárt | naponta ismételve, eszkalációval a vezetőhöz |
| Új szignálás | azonnal a felelősnek |
| Új érkeztetés adott partnertől / típusból | az illetékes csoportnak |
| Állapotváltozás | pl. felfüggesztés a vezetőnek |
| Megőrzési idő lejárt | az iratkezelőnek, selejtezési javaslattal |

**Csatornák:** e-mail (tranzakciós SMTP), **SMS** (a követelmény explicit kéri — magyar SMS gateway, pl. Seven/Twilio/hazai szolgáltató), in-app értesítés, opcionálisan Slack/Teams.

**Kiküldési napló** (`ertesites_naplo`): mikor, kinek, milyen csatornán, milyen szöveggel, sikeres volt-e. Ez azért kell, mert a 7\. pont ellenőrzése az „üzenetküldés lépéseinek áttekintése" — vagyis meg kell tudni mutatni, hogy a rendszer ténylegesen küldött SMS-t/e-mailt, nem csak elméletileg tudna.

### 6.7 Keresés (10. követelmény)

Három réteg, egy keresőmezőben:

1. **Metaadat-keresés** — iktatószám, érkeztetőszám, partner, dátumtartomány, ügyintéző, állapot, minősítés, irattári tétel, létrehozó/módosító személye és időpontja (a követelmény ezeket tételesen felsorolja\!)  
2. **Full-text** — Postgres `tsvector` magyar szótárral (`hungarian` konfiguráció \+ saját stopword-lista), a tárgyra, leírásra, feljegyzésekre **és az OCR-szövegre**  
3. **Szemantikus keresés (opcionális, felár)** — pgvector embedding, „mit is kerestem, csak nem tudom a pontos szót" esetre

**A jogosultság a keresésre is érvényes:** a találati lista RLS-en keresztül szűrődik, tehát nincs olyan, hogy „látom a találat címét, csak nem nyithatom meg". Ami nem járható, az nem is jelenik meg.

Mentett keresések és értesítés új találatra.

### 6.8 ERP-integráció (5. követelmény)

A követelmény: „iratok és ügyek követése, keresése, elérése a **meglévő integrált üzleti rendszerből**". Tehát nem elég, hogy az eaisyDocs-ban meg lehet nézni — az ERP-ből is el kell tudni érni.

**Három integrációs szint (ügyféltől függően):**

1. **REST API** (mindig) — `GET /api/v1/ugyiratok?partner_id=...`, `GET /api/v1/ugyiratok/{id}/eletciklus`, `POST /api/v1/iratok` (feltöltés az ERP-ből)  
2. **Beágyazott widget** — iframe/webkomponens, amit az ERP partner- vagy tranzakció-képernyőjére tesznek: „Kapcsolódó iratok" panel, listával és megnyitási linkkel. SSO-token-átadással, újbóli belépés nélkül (ez köti össze a 9\. ponttal).  
3. **Kétirányú szinkron** (n8n / webhook) — ERP-ben létrejövő tranzakció → automatikus ügyirat-nyitás; eaisyDocs-ban lezárt ügyirat → státusz visszaírás.

**Webhook-események kifelé:** `irat.erkeztetve`, `ugyirat.iktatva`, `ugyirat.lezarva`, `hatarido.lejart`.

---

## 7\. Architektúra és tech stack

| Réteg | Technológia | Indoklás |
| :---- | :---- | :---- |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui | gyors, ismerős, jó DX |
| PDF-megjelenítés | PDF.js alapú viewer, annotációkkal | böngészőben, letöltés nélkül |
| Backend / adat | **Supabase** — Postgres \+ RLS \+ Auth \+ Storage \+ Edge Functions | az RLS adja a 8\. követelmény technikai gerincét |
| Keresés | Postgres FTS (tsvector, GIN), opcionálisan pgvector | nem kell külön Elasticsearch a KKV-méretnél |
| Aszinkron feldolgozás | n8n (OCR, PDF/A-konverzió, e-mail poll, értesítések) | meglévő házon belüli kompetencia |
| OCR | Tesseract (magyar) vagy felhő-OCR; szkennelt PDF-hez |  |
| PDF/A konverzió | LibreOffice headless \+ Ghostscript |  |
| SSO | Entra ID / Google Workspace OIDC, SAML |  |
| SMS | magyar SMS gateway API | 7\. követelmény |
| Hosting | **EU-s régió kötelező** (Frankfurt/Hetzner/DO), vagy on-prem | GDPR \+ pályázati elvárás |

**Telepítési módok:** SaaS (multi-tenant, RLS-sel izolálva) / dedikált felhő / on-prem (Docker Compose). Pályázati ügyfeleknél gyakran on-prem vagy dedikált az elvárás — ezt a scope-nál tisztázni kell, mert lényegesen más az üzemeltetési modell.

---

## 8\. Nem funkcionális követelmények

- **Integritás:** minden fájlra SHA-256; a hash az eseménynaplóba is bekerül. Későbbi módosítás kimutatható.  
- **Verziókezelés:** irat módosítása nem felülír, hanem új verziót hoz létre; a régi verzió megmarad és megtekinthető.  
- **Mentés:** napi teljes \+ folyamatos WAL/PITR, min. 30 nap visszaállíthatóság. **Havonta tesztelt visszaállítás** — a nem tesztelt mentés nem mentés.  
- **Rendelkezésre állás:** 99,5% (SaaS), munkaidőben 99,9% cél.  
- **Teljesítmény:** keresés \< 1 s 100 000 iratig; feltöltés+OCR \< 30 s / 10 oldal.  
- **GDPR:** adatfeldolgozói szerződés (28. cikk), adatkezelési nyilvántartás, törlési/korlátozási kérelmek kezelése (ütközik a jogszabályi megőrzési kötelezettséggel → ezt dokumentáltan kell feloldani: a megőrzési kötelezettség alatt álló irat nem törölhető, ezt a felhasználónak jelezni kell).  
- **Naplómegőrzés:** az eseménynapló legalább az irat megőrzési idejéig megmarad.  
- **Akadálymentesség:** WCAG 2.1 AA (közszférás ügyfélnél kötelező lehet).

---

## 9\. Fő képernyők (UI scope)

1. **Dashboard** — saját feladataim, lejáró határidők, érkeztetésre váró küldemények, iktatásra váró iratok  
2. **Bejövő sor (Inbox)** — érkeztetett, még nem iktatott küldemények; kétpaneles nézet: bal oldalt a dokumentum, jobb oldalt az AI által előkitöltött iktatási űrlap  
3. **Iktatókönyv** — táblázat, szűrők, export  
4. **Ügyirat adatlap** — fülek: `Alapadatok` / `Iratok` / `Feladatok` / `Kapcsolatok` / `Életciklus` / `Jogosultságok`  
5. **Irat nézet** — viewer \+ metaadatok \+ verziók \+ napló  
6. **Partner adatlap** — kapcsolódó ügyiratok és iratok (4. követelmény bemutatásának a helye)  
7. **Kereső** — globális, szabadszavas \+ facettás szűrés  
8. **Irattár** — megőrzési idők, selejtezési javaslatok, kölcsönzési napló  
9. **Admin** — felhasználók, szerepkörök, szervezeti egységek, irattári terv, értesítési szabályok, iktatószám-formátum  
10. **Audit** — teljes eseménynapló, szűrhető, exportálható

---

## 10\. Ütemterv (javasolt fázisok)

| Fázis | Tartalom | Becsült idő |
| :---- | :---- | :---- |
| **0\. Felmérés** | Ügyfél iratkezelési szabályzata, irattári terv, szervezeti struktúra, ERP-interfész felmérése | 1–2 hét |
| **1\. Alaprendszer** | Adatmodell, auth+SSO, RBAC/RLS, érkeztetés, iktatás, iktatókönyv, fájlkezelés | 4–5 hét |
| **2\. Ügyintézés** | Szignálás, feladatok, állapotgép, életciklus-idővonal, eseménynapló | 3 hét |
| **3\. Keresés \+ kapcsolatok** | FTS, OCR, metaadat-keresés, partner/tranzakció/folyamat kapcsolatok | 2–3 hét |
| **4\. Értesítések \+ integráció** | E-mail/SMS motor, szabálykezelő, REST API, ERP-widget | 2–3 hét |
| **5\. Irattár \+ megfelelőség** | Megőrzési idők, selejtezés, PDF/A archiválás, IT biztonsági szabályzat, felhasználói kézikönyv | 2 hét |
| **6\. Átadás** | Migráció (ha van meglévő iratanyag), oktatás, audit-próba | 1–2 hét |

**Összesen: \~15–20 hét** (párhuzamosítással rövidíthető).

**Megjegyzés a becsléshez:** a 0\. fázis nem formalitás. Az iratkezelési szabályzat és az irattári terv hiánya a leggyakoribb csúszásforrás — ha az ügyfélnek nincs, azt nekünk kell vele közösen kialakítani, ami önmagában 2-3 hét plusz.

---

## 11\. Amit MOST el kell dönteni (nyitott kérdések)

1. **Ki a konkrét első ügyfél / pályázati kedvezményezett?** Ez határozza meg, hogy SaaS-t vagy on-prem telepítést tervezünk.  
2. **Van-e meglévő ERP, és melyik?** (Az 5\. és 9\. követelmény teljesítési módja ezen múlik.)  
3. **Van-e az ügyfélnek irattári terve és iratkezelési szabályzata?** Ha nincs, ez külön tétel.  
4. **Kell-e Cégkapu / hivatali kapu integráció?** Ez jelentős plusz komplexitás (elektronikus aláírás, ES3 dosszié).  
5. **Kell-e minősített elektronikus aláírás / időbélyeg?** Ha igen, minősített szolgáltató (pl. Netlock/Microsec) kell — ez licencköltség és külön fejlesztés.  
6. **Migrálandó-e meglévő iratanyag?** Ha igen, mennyi és milyen formában.  
7. **Melyik pontosan a pályázati konstrukció?** A követelménylista formátuma DIMOP-szerű, de a hivatalos felhívás szövegét érdemes leellenőrizni, mert a fenti 10 pont mellett lehetnek további (pl. üzemeltetési, támogatási) elvárások.

---

## 12\. Audit / ellenőrzési forgatókönyv

Ezt a demót élőben, a rendszerben kell tudni végigkattintani. Célszerű **előre feltölteni egy demó-adatbázist** legalább 3 lezárt és több folyamatban lévő ügyirattal, hogy ne éles adaton kelljen kapkodni.

| \# | Amit az ellenőr kér | Hol mutatjuk meg | Előfeltétel |
| :---- | :---- | :---- | :---- |
| 1 | 3 ügyirat érkeztetési és iktatási adata | Iktatókönyv → ügyirat → „Nyilvántartási adatok" | 3 teljes adatú ügyirat |
| 2 | Bejövő és kimenő irat egységes digitális formátuma | Két irat egymás mellett, azonos nézet, mindkettő PDF/A | 1 bejövő \+ 1 kimenő ugyanabban az ügyben |
| 3 | 3 lezárt ügyirat teljes életciklusa on-line | Ügyirat → „Életciklus" idővonal | 3 db `lezart` állapotú, végigvitt ügyirat |
| 4 | Partnerhez/tranzakcióhoz/folyamathoz kapcsolódó ügyiratok lekérdezése | Partner adatlap → „Kapcsolódó ügyiratok", ill. kereső partner-szűrővel | Legalább 1 partner több ügyirattal |
| 5 | Ügyirat életciklus-adatainak lekérdezése az ERP-ből | ERP-képernyő → beágyazott panel vagy API-hívás bemutatása | Működő ERP-widget vagy legalább API-demó |
| 6 | Egy dokumentum határidejének, állapotának lekérdezése | Ügyirat adatlap fejléce \+ „Feladatok" panel | Aktív, határidős feladat |
| 7 | Lejáró határidejű ügyirat SMS/e-mail figyelmeztetés lépései | Admin → Értesítési szabályok \+ Értesítési napló (tényleges kiküldések) | **Legalább egy valóban kiküldött SMS** a naplóban |
| 8 | Eltérő jogosultságú tartalom hozzáférhetősége | Két böngészőablak, két user, ugyanaz az ügyirat: egyik látja, másik nem | 2 demó-felhasználó eltérő jogokkal |
| 9 | SSO megoldás \+ IT biztonsági szabályzat | AD-fiókkal belépés bemutatása **\+ átadott IT biztonsági szabályzat dokumentum** | **A dokumentumot meg kell írni\!** |
| 10 | Szabadszavas keresés a leíró információkban | Globális kereső, egy címszó beírása, találatlista | Feltöltött, OCR-ezett iratanyag |

**A legkockázatosabb pontok:** a **7\.** (kell egy valóban működő SMS-küldés, nem elég a szabály megléte), a **9\.** (a dokumentáció, nem a szoftver a szűk keresztmetszet), és az **5\.** (ERP-integráció — ha az ügyfél ERP-je zárt, ezt korán fel kell deríteni).

---

*Think AI Kft. — eaisyDocs szoftverterv v1.0*

### **A probléma, amit megold**

Egy átlagos magyar KKV-nál az iratok öt helyen élnek egyszerre: valakinek a postafiókjában, egy közös meghajtón „vegyes" nevű mappában, egy iratszekrényben, egy Excelben és egy kolléga fejében. Amíg minden rendben megy, ez működik. A baj akkor kezdődik, amikor valaki kilép, jön egy ellenőrzés, vagy egy fél éve lezártnak hitt ügy hirtelen visszatér — és senki nem tudja megmondani, hogy mikor mi történt, ki döntött, és hol van az eredeti papír.

Az eaisyDocs ezt a káoszt cseréli le egy rendezett, kereshető, visszakövethető rendszerre.

### **Kinek jó**

**Elsősorban** annak a 20–200 fős cégnek, ahol napi szinten érkezik és megy irat — szerződések, megrendelések, hatósági levelek, ügyfélbeadványok —, és ahol ez ma e-mailben meg mappákban „valahogy" működik. Tipikusan: gyártó cégek, szolgáltatók, tanácsadók, egészségügyi szolgáltatók, önkormányzati beszállítók.

**Külön célcsoport**, ahol ez nem kényelmi kérdés, hanem kötelező: aki **digitalizációs pályázatot** nyer vagy pályázni készül. A támogatás egyik feltétele egy konkrét, tételes iratkezelési funkciólista teljesítése — és ezt a helyszíni ellenőrzésen élőben be is kell mutatni. Az eaisyDocs pontosan erre a listára lett tervezve: minden egyes követelményhez tartozik egy képernyő, amit két kattintással meg lehet mutatni.

### **Miért éri meg (a szoftveren túl)**

* **Megtalálod, amit keresel.** Nem a mappaszerkezetre kell emlékezned, hanem beírsz egy szót — a rendszer a beszkennelt papírok szövegében is keres.  
* **Nincs „elfelejtettem" határidő.** A rendszer szól e-mailben vagy SMS-ben, mielőtt lejár valami, és eszkalál a főnök felé, ha mégis lecsúszott.  
* **Minden lépés nyoma megmarad.** Ki nyitotta meg, ki módosította, ki döntött, mikor. Nem azért, hogy figyeljük az embereket, hanem mert egy vitánál vagy egy ellenőrzésnél ez az egyetlen dolog, ami megvéd.  
* **Aki kilép, nem viszi magával a tudást.** Az ügy állapota a rendszerben van, nem valakinek a fejében.  
* **Nem kell kidobni a meglévő rendszereket.** Az ERP-ből is elérhető, oda visszakapcsolódik.

### **A funkciók, magyarul**

**Érkeztetés — „minden bejövő irat egy helyre fut be"**  
Legyen az e-mail, beszkennelt papír, vagy Cégkapun érkező hivatalos levél, mind ugyanabba a sorba kerül, és rögtön kap egy sorszámot. *Miért jó:* nem tud eltűnni semmi, és mindig megmondható, mikor és kitől érkezett.

**Iktatás — „az irat megkapja a saját helyét"**  
Az érkezett irat egy ügyhöz kerül, kap egy iktatószámot, és onnantól nyilvántartott. Egy AI-réteg előre kitölti az adatokat (kitől jött, mi a tárgya, van-e előzménye) — de mindig ember hagyja jóvá. *Miért jó:* a napi 30 perces adminisztráció 5 perc kattintgatássá zsugorodik, viszont nem adjuk ki a kezünkből az irányítást.

**Egységes digitális tárolás**  
A bejövő és a kimenő irat ugyanabban a nézetben, ugyanabban a formátumban látszik. Mindenből készül egy hosszú távú, szabványos archív példány. *Miért jó:* nem kell tudnod, hogy egy dokumentum honnan jött — ugyanúgy kezeled.

**Életciklus-követés — „mi történt ezzel az üggyel?"**  
Egy idővonalon látszik minden lépés a megérkezéstől a lezárásig, sőt a selejtezésig. Letölthető riportként. *Miért jó:* egy ellenőrzésnél vagy jogvitánál ez a bizonyíték. Egy új kolléga pedig 2 perc alatt megérti, hol tart egy ügy.

**Szignálás és feladatkiosztás**  
A vezető ránéz az iratra, kijelöli, ki intézi és mikorra. Az ügyintéző látja a saját listáját. Követhető az is, hogy a papír eredeti példánya épp kinél van. *Miért jó:* megszűnik a „azt hittem, te csinálod" műfaj.

**Figyelmeztetések**  
A rendszer szól, ha közeleg egy határidő, ha új feladatot kaptál, vagy ha valami lejárt. E-mailben és SMS-ben. *Miért jó:* a határidő-mulasztás a legdrágább adminisztratív hiba — ez pont az, amit egy szoftver tökéletesen meg tud oldani.

**Jogosultságok — „mindenki csak azt látja, amit szabad"**  
A hozzáférés négy dolog metszete: mi a szereped, melyik osztályon vagy, milyen bizalmassági szintre van jogod, és mit szignáltak rád személyesen. Amit nem szabad látnod, az meg sem jelenik — még a keresési találatok között sem. *Miért jó:* a bérszámfejtési anyag nem szivárog át az értékesítéshez, és GDPR-szempontból is védhető.

**Egyszeri belépés**  
A meglévő céges fiókoddal lépsz be, nincs új jelszó. *Miért jó:* kevesebb jelszó \= kevesebb post-it a monitoron \= biztonságosabb.

**Keresés**  
Egy mezőbe írsz, és keres az iratszámokban, a partnernevekben, a tárgyakban — és a beszkennelt papírok szövegében is. *Miért jó:* ez az a funkció, amit naponta ötvenszer fogsz használni.

**Kapcsolatok**  
Minden irat hozzáköthető egy partnerhez, egy számlához, egy projekthez. Utána a partner adatlapján ott van vele kapcsolatban minden, ami valaha történt. *Miért jó:* ügyfélhívás előtt 10 másodperc alatt képben vagy.

**ERP-kapcsolat**  
Az iratok az ERP-ből is elérhetők — nem kell átlépni másik rendszerbe. *Miért jó:* amit két rendszerben kell csinálni, azt előbb-utóbb egyikben sem csinálják.

**Irattár és selejtezés**  
A rendszer tudja, melyik iratot meddig kell megőrizni, és szól, ha lejárt. De **nem töröl magától** — javaslatot tesz, amit jóvá kell hagyni. *Miért jó:* nem halmozol fel 20 év szemetet, de véletlenül sem tűnik el olyasmi, amire még szükség van.

