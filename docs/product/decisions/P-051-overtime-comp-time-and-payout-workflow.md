# P-051: [HR] Túlóra-egyenleg Felhasználás, Csúsztatás és Kifizetés Munkafolyamat UX

## Státusz
Elfogadva (2026-10-07)

## Kontextus és Problémafelvetés
A dolgozói portál áttekintő felületén (`/hr`) elérhető volt egy „Túlóra egyenleg” információs kártya, azonban a dolgozónak nem volt semmilyen életszerű lehetősége a felgyülemlett plusz órái felhasznására.
- A „Jelenlét és Szabadság” fülön (`/hr/self-service/time`) kizárólag általános távolléti kérelmeket (rendes szabadság, betegszabadság, fizetés nélküli) lehetett leadni, a túlóra egyenleg meg sem jelent az oldalon.
- Amennyiben egy munkavállaló pl. 8 óra vagy 16 óra túlóra után ki akart venni egy pihenőnapot / csúsztatást („csúsztatás túlóra terhére”), ezt nem tudta igényelni.
- A korábbi kártyán lévő kezdetleges gombok nem kértek dátumot a szabadnaphoz, és azonnal a teljes egyenleget küldték volna el kifizetésre vagy szabira, anélkül hogy a munkavállaló megadhatta volna a kért óraszámot.
- A vezetői oldalon (`/hr/manager` és `OvertimeRequestsPanel`) a jóváhagyáskor nem történt meg az egyenleg automatikus levonása, és a csúsztatott nap nem került be a jelenléti ívre és szabadság naptárba.

## Termékdöntések és Felhasználói Élmény (UX)

### 1. Kétcsatornás Csúsztatási Igénylés
A munkavállaló két természetes ponton is igényelhet csúsztatást:
1. **A Távollét Kérelem Űrlapon (`LeaveRequestDialog`):**
   - Új opció a legördülő menüben: `Csúsztatás (Túlóra terhére)`.
   - Kiválasztásakor azonnal megjelenik egy dedikált tájékoztató sáv: mutatja az aktuális túlóra egyenleget (`+X óra Y perc`) és az igényelt munkanapokhoz szükséges levonást (`N munkanap = M óra`).
   - Amennyiben a dolgozónak nincs elegendő túlórája, a rendszer piros figyelmeztetéssel blokkolja a beküldést és világosan elmagyarázza a hiányzó óraszámot.
2. **A Jelenlét és Szabadság Oldalon a Felső Túlóra Kártyán (`OvertimeActionDialog`):**
   - A túlóra egyenleg és annak kezelése (csúsztatás és kifizetés) integrálva lett a `/hr/self-service/time` felső 4. KPI kártyájába.
   - A korábbi különálló, redundáns kártya a fő áttekintő oldalról (`/hr`) eltávolításra került, így az egyenleg fókuszáltan a munkaidő- és távollét-kezelés kontextusában érhető el.
   - A kártyára kattintva megnyíló modálban:
     - Naptáras dátumválasztó a csúsztatni kívánt naphoz.
     - Gyors választógombok: `Egész nap (8h)`, `Fél nap (4h)`, vagy `Egyedi óra` (pl. 2 óra).
     - Élő egyenlegszámítás: mutatja az aktuális, a levonandó és a jóváhagyás után várható fennmaradó egyenleget.
     - Opcionális indoklás/megjegyzés a vezetőnek.

### 2. Túlóra Pénzbeli Kifizetés Igénylése
- A kártyán a **„Kifizetés”** gombra kattintva dedikált modál nyílik:
  - Dolgozó megadhatja a kifizetni kért órák számát (pl. 8 óra, 12 óra) vagy egy kattintással választhatja a `Teljes egyenleg kifizetése` opciót.
  - Védelmi logika: 0 vagy negatív érték, illetve a valós egyenleget meghaladó igény nem küldhető be.
  - A kérelem jóváhagyásra bekerül a vezető elé, majd jóváhagyáskor a bérszámfejtési exportba (`/hr/reports`).

### 3. Jelenlét és Szabadság Oldali Integráció (`/hr/self-service/time`)
- A felső statisztikai sávban 3 helyett egy egységes, 4 kártyás Linear-flat rács (`grid-cols-2 lg:grid-cols-4`) kapott helyet:
  1. *Ledolgozott Órák*
  2. *Munkanapok*
  3. *Távollét*
  4. *Túlóra Egyenleg* (`KpiCard` standard megjelenítés, finom hover szegély-kiemeléssel).
- A 4. kártyára kattintva azonnal felugrik az `OvertimeActionDialog` modál, ahol a dolgozó közvetlenül indíthatja a csúsztatási vagy kifizetési kérelmet, illetve áttekintheti korábbi kérelmei állapotát.
- Ezáltal a `Saját kérelmeim` táblázat (`LeaveHistoryList`) teljes szélességében, tisztán és kényelmesen terül el a jelenléti ív alatt, megszüntetve a korábbi oldalpaneles összenyomottságot.

### 4. Vezetői Jóváhagyás és Kölcsönös Értesítések
- A vezető a vezetői irányítópulton (`/hr/manager`) a `OvertimeRequestsPanel` komponensben látja a beosztottak csúsztatási és kifizetési kérelmeit, a pontos dátummal, óraszámmal és a dolgozó megjegyzésével.
- Egykattintásos jóváhagyás vagy elutasítás.
- Jóváhagyáskor a rendszer azonnali in-app értesítést küld a kérelmező munkavállalónak.

### 5. Jelenléti Ív és Távolléti Nyilvántartás Megjelenítés
- A jóváhagyott csúsztatás hivatalos távolléti tételként megjelenik:
  - A havi jelenléti íven (`EmployeeTimesheet` és `AttendanceTab`) megkülönböztetett `Csúsztatás (Túlóra)` címkével és borostyán/warning színezéssel.
  - A távolléti előzményekben (`LeaveHistoryList`), ahol PDF igazolás is generálható róla.
  - A havi jelenléti ív kalkulációban és PDF generálásban fizetett napként szerepel (nem okoz mínusz munkaidőt).
