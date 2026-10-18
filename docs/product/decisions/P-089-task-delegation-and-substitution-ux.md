# PRD P-089: Távolléti Feladat-Delegálás és Helyettesítés UX Megújítása [Docs]

## Státusz
Elfogadva

## Kontextus és Cél
Az iratkezelési folyamatokban a határidők szigorúak és törvényileg kötöttek. Ha egy ügyintéző vagy vezető távol van (betegség, szabadság, kiküldetés), a feladatok nem állhatnak meg. Korábban a helyettesítés beállítása egy eldugott, szinte üres Beállítások fülön volt elhelyezve megtévesztő leírással. A cél a felhasználói élmény optimalizálása volt: a feladat-delegálás eljuttatása a napi munkavégzés helyszínére (`/tasks`) és a felesleges beállítási fül kivezetése.

## Megvalósított UX Megoldások
1. **Beállítások Lapok Tisztítása:**
   - A `/settings` felső fülsorából kivezetésre került a „Helyettesítés” fül.
   - A személyes beállításoknál (`Profil & Biztonság` lap) egy letisztult, informatív kártya (`DelegationSettingsCard`) mutatja a megbízásokat és engedi az új delegálások felvételét.
2. **Saját Feladataim (`/tasks`) Integráció:**
   - **„Távolléti delegálás” gomb és modál:** A feladatlista fejlécében egy diszkrét gombbal azonnal elérhető a delegáláskezelő ablak, ahol a munkatárs kijelölhető a dátumtartománnyal együtt.
   - **Aktív helyettesítési jelvény / banner:**
     - Ha a felhasználó egy távollévő kolléga feladatait intézi, a feladatok felett kék információs banner tájékoztatja: *„Jelenleg [Kolléga] feladatait is kezeled ([Dátum]-ig).”*
     - Ha a felhasználó adta át a feladatait másnak, a banner jelzi: *„Feladataidat [Dátum]-ig [Kolléga] látja el helyetted.”*
3. **Kétirányú Átláthatóság:**
   - A felhasználó nemcsak azt látja, hogy ő kit jelölt ki, hanem azt is egyértelműen listázza a rendszer, ha egy kolléga őt bízta meg a feladatai ellátásával.
4. **Szigorú Cégszintű és eaisyDocs Moduláris Szűrés:**
   - A helyettesítő munkatárs legördülő listában kizárólag azok a kollégák jelennek meg, akik tagjai a jelenleg aktív cégnek (`company_members`), és rendelkeznek `eaisyDocs` hozzáféréssel (`elerheto_modulok`).
   - A kizárólag eaisyHR jogosultságú dolgozók nem keveredhetnek be a dokumentumkezelési helyettesítésekbe.
   - Ha az adott cégben nincs más eaisyDocs felhasználó, a felület nem üres/hibás menüt mutat, hanem egyértelmű tájékoztató dobozzal jelzi az állapotot és a teendőt (Csapat menü).

## Eredmény
A beállítási oldal letisztult, a feladat-delegálás pedig oda került, ahol a felhasználónak valóban szüksége van rá: a Saját Feladataim munkaasztalra.
