# [HR] P-056: Műszakbeosztás Tervező és Műszaksablon Kezelés Felhasználói Élmény (UX)

## Státusz
Elfogadva

## Kontextus és Felhasználói Igény
A HR munkatársak és csoportvezetők számára kritikus feladat a heti és havi műszakok előzetes megtervezése, a napi létszám-lefedettség (fejkvóta) biztosítása, valamint a szabadságon lévő munkatársak figyelembevétele. A felhasználói visszajelzések alapján a meglévő Távolléti Naptár mellé egy közvetlenül elérhető, modern, interaktív heti műszaktervező felületet igényeltek.

## Termék és UX Döntések

### 1. Tab-alapú Egyesített Munkaidő Felület (`/hr/time`)
A felhasználók a fejléc alatti fülekkel könnyedén válthatnak a különböző nézetek között:
- **`[ 📅 Műszakbeosztás Tervező ]`**: Alapértelmezett nézet, heti bontású interaktív rács.
- **`[ 🌴 Távollétek & Csapatnaptár ]`**: Meglévő havi és éves szabadság- és táppénznaptár.
- **`[ ⚙️ Műszaksablonok ]`**: A cég saját műszakjainak beállítása (kezdet, vég, munkaóra, szín).

### 2. Heti Rács (Weekly Grid) Funkciói
- **Navigáció:** Hét lapozás (`<`, `>`), gyors `Ma` gomb, heti sorszám és dátumtartomány kijelzés.
- **Szűrés és Keresés:** Valós idejű keresőmező dolgozó névre és munkakörre, valamint szervezeti egység szűrő.
- **1-kattintásos Beosztás:** Üres napra kattintva gyorsválasztó popover nyílik a cég aktív sablonjaival (`D`, `DU`, `É`, `N`).
- **Távollét-indikátor:** Ha a dolgozó szabadságon vagy táppénzen van, a cellában egy kiemelt távolléti jelvény (`🌴 Szabadság` / `🏥 Táppénz`) jelenik meg, megakadályozva a véletlen dupla beosztást.
- **Előző Hét Másolása:** Egyetlen gombnyomással átmásolható az előző heti teljes beosztás az aktuális hétre. A másoló motor automatikusan kihagyja azokat a napokat, ahol a munkatársnak már jóváhagyott távolléte van a cél héten!
- **Heti Munkaóra és 48h Mt. Korlát:** Az utolsó oszlopban látható a heti tervezett óraszám; 40 óra felett túlóra jelzés, 48 óra felett törvényi túllépési riasztás (`>48h Mt.!`) jelenik meg.
- **Napi Létszám és Műszak Lefedettség:** A táblázat láblécében naponként látható a dolgozók összlétszáma és a műszakonkénti bontás (pl. `D: 5 | DU: 3 | É: 2 | N: 4`).

### 3. Műszaksablon Kezelő Kártyák és Modál
- A sablonok kártyás megjelenítésben láthatók a kezdési/befejezési idővel, tervezett munkaórával és szünettel.
- Új sablon rögzítésekor 8 előre definiált prémium HSL/Tailwind szín közül választhat a felhasználó, élő vizuális előnézettel.

## Ellenőrzés és Metrikák
- Gyors tervezési ciklusidő (1 kattintás / cella).
- Zéró téves beosztás jóváhagyott szabadságos napokra.
- Azonnali visszajelzés a 48 órás heti korlát túllépéséről.
