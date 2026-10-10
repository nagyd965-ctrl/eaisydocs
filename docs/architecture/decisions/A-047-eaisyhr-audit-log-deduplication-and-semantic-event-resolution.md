# A-047 [HR] eaisyHR Audit Napló: Eseménytípus Pontosítás, Duplikáció-védelem és Dolgozói Életút Összekapcsolás

- **Dátum:** 2026-10-10
- **Státusz:** Elfogadva (Accepted)
- **Hatókör:** [HR]
- **Kapcsolódó döntések:** [A-046](A-046-canonical-audit-log-formatting-engine.md), [P-066](../../product/decisions/P-066-eaisyhr-audit-log-deduplication-and-semantic-event-resolution.md)

## 1. Kontextus és Problémafelvetés
Az eaisyHR dolgozói adatlapján található „Előzmények” lap (`AuditLogTab`) felelős a GDPR 5. cikk (1) bekezdés f) pontja és a 32. cikk szerinti adatkezelési és hozzáférési naplózásért. A valós használat során két jelentős anomália merült fel:
1. **Félrevezető eseményelnevezés („irat_megtekintes”):** A bizalmas dolgozói adatok (TAJ szám, adóazonosító jel, bankszámla, béradatok) feloldásakor a szerver action (`revealEmployeeSecretData`) tévesen az `esemeny_tipus: "irat_megtekintes"` értéket mentette a naplóba, míg az önkiszolgáló portál az `adat_megtekintes` értéket. Mivel a felület szótára nem tartalmazta ezen kulcsok fordítását, a rendszer nyers technikai szövegként jelentette meg őket: `Érzékeny Adatok (TAJ, Adó) - irat_megtekintes`. A felhasználó joggal hitte úgy, hogy nem létező iratot tekintett meg.
2. **Duplikált naplóbejegyzések és mentési dupla hívás:** A személyes adatok szerkesztésekor mind a dolgozói adatlapon (`PersonalDataTab`), mind az önkiszolgáló felületen (`PersonalDataCard`) a mentés sikere után a kód egy `handleReveal()` + `setTimeout(handleReveal, 100)` logikával próbálta újraolvasni az adatokat. Ez minden módosításkor egy felesleges extra feloldási naplóbejegyzést szült az adatbázisban, és a gyors kattintások is teleszórták a naplót.
3. **Hiányzó irat- és szerződésesemények az előzményekben:** A `getEmployeeAuditLogs` lekérdezés szigorúan csak az `entitas_id = employeeId` rekordokat kérte le, így a dolgozóhoz feltöltött vagy iktatott hivatalos dokumentumok (munkaszerződés, orvosi alkalmassági, fegyelmi határozat, tanulmányi szerződés), amelyek `entitas_id`-je a dokumentum ID-ja, sosem jelentek meg az előzményekben.

## 2. Döntés
1. **Szemantikus Eseménytípus Pontosítás:**
   - A titkosított adatok feloldásakor mind a HR admin felületen (`revealEmployeeSecretData`), mind a self-service profilban (`revealSecretData`) egységesen az `esemeny_tipus: "adat_megtekintes"` kerül rögzítésre.
   - Az önkiszolgáló módosítás hibás `munkatars_felvetel` eseménytípusa és az adminisztrátori `munkatars_modositas` javításra került standard `modositas` típusra.
   - A megjegyzésekből eltávolításra kerültek a zavaró belső UUID-k (`(033c707d-...)`).
2. **Szerveroldali Duplikáció-védelem (15s Throttling):**
   - Ha ugyanaz a bejelentkezett felhasználó 15 másodpercen belül ismételten feloldja ugyanannak a dolgozónak az érzékeny adatait (pl. dupla kattintás, gyors ki-be kapcsolás), a rendszer visszaadja a dekódolt adatot, de nem szemeteli tele az append-only `hr_esemeny_naplo` táblát újabb felesleges sorral.
3. **Kliensoldali Mentési Javítás (Zero Ghost Reveal):**
   - A `PersonalDataTab` és `PersonalDataCard` mentés után közvetlenül a React állapotot (`secretData`) frissíti a beküldött adatokkal, megszüntetve a `handleReveal() + setTimeout(handleReveal, 100)` duplikált hívást.
4. **Dolgozói Életút Integráció (`getEmployeeAuditLogs`):**
   - A lekérdezés a dolgozó azonosítója mellett bevonja a dolgozóhoz tartozó dokumentumok (`hr_dokumentum.dolgozo_id = employeeId`) rekordjait is (`or(entitas_id.eq.${employeeId},entitas_id.in.(${docIds}))`).
5. **Kliensoldali Szemantikus Megjelenítő és Tömörítő Motor (`AuditLogTab`):**
   - Teljes körű magyar szótár az entitásokhoz, eseményekhez és mezőkhöz.
   - A korábbi technikai hibákból származó, 60 másodpercen belüli egymást követő azonos feloldások kliensoldali intelligens összevonása (`(2×) feloldva 1 percen belül`).
   - Szemantikus státuszjelvények, kereső és kategória-szűrők (Összes, Érzékeny adatok, Módosítások, Iratok).

## 3. Következmények
- **Pozitív:**
  - A felhasználó számára azonnal egyértelmű, emberi nyelven megfogalmazott események jelennek meg (pl. „Érzékeny adatok (TAJ, Adó, Bér) feloldása”).
  - Megszűnik a nem létező iratokkal kapcsolatos megtévesztés („irat_megtekintes”).
  - Megszűnik a duplikált naplósorok képződése.
  - A dolgozói „Előzmények” lap egy teljes értékű, gazdag HR életúttá válik, megjelenítve a szerződéseket, orvosi igazolásokat és egyéb iratkezelési eseményeket is.
- **Negatív / Kockázat:**
  - A dokumentumok bevonása enyhén növeli a lekérdezés méretét, de ez az indexelt `dolgozo_id` és `entitas_id` miatt elhanyagolható (pár tucat rekord).
