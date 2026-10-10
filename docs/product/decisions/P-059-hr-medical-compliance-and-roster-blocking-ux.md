# [HR] PRD P-059: Orvosi alkalmassági és beosztási blokkolás UX (HR-TASK-05)

## Státusz
Elfogadva

## Dátum
2026-10-10

## Felhasználói Élmény és Célkitűzés
A cél, hogy a munkavállalók és a műszakbeosztást végző vezetők egyértelmű, azonnali és törvényileg védett felülettel találkozzanak:
1. **Dolgozói oldal (Self-Service / Check-In):** Ha a munkavállaló orvosi alkalmassága lejárt vagy nincs rögzítve, a rendszer a becsekkolás megkísérlésekor nem indítja el a timert, hanem kiemelt, segítőkész hibaüzenetben tájékoztatja, hogy forduljon a HR-hez az időszakos vizsgálat elvégzéséhez. A műszakból való távozást (kicsekkolás) a rendszer nem korlátozza.
2. **Vezetői oldal (Műszaktervező / Beosztás):** A vezető a heti tervező naptárban (`/hr/time`) már a kattintás előtt látja, ha egy dolgozónak az adott napon lejárt az alkalmassága. A cellára kattintva a felugró ablakban magyarázatot és közvetlen linket kap a dolgozó adatlapjára, a sablongombok pedig inaktívak (`disabled`), megelőzve a jogellenes beosztást.

## Részletes Képernyő és Komponens Tervek

### 1. Dolgozói Időkövető Kártya (`TimeTrackingCard`)
- Ha a dolgozó a `Becsekkolás` vagy `Munka folytatása` gombra kattint:
  - Ha az orvosi érvényesség lejárt vagy hiányzik:
    - Piros toast hibaüzenet (`toast.error`): *"A becsekkolás sikertelen: Az orvosi alkalmasságod lejárt (YYYY.MM.DD) vagy hiányzik! Az Mvt. 49. § (1) bekezdése alapján érvényes vizsgálat nélkül a munkavégzés nem engedélyezett. Kérjük, fordulj a HR-hez!"*
    - A gomb töltési állapota véget ér, az időmérő nem indul el.

### 2. Heti Műszaktervező Rács (`ShiftPlannerWeeklyGrid`)
- **Dolgozó oszlop:**
  - A dolgozó neve mellett továbbra is látható a lejárati indikátor (`AlertTriangle` / piros orvosi ikon).
- **Napi cellák letiltása:**
  - Ha a dolgozónak az adott napon már nem érvényes az orvosi alkalmassága:
    - **Üres cella esetén:** A cella finom piros hátteret (`bg-destructive/[0.02]`) és egy `Stethoscope` ikont kap a szaggatott plusz ikon helyett. Tooltip: *"Lejárt/hiányzó orvosi alkalmasság ({datum}) – Munkára nem osztható be!"*
    - **Felugró Popover ablak:**
      - A fejléc alatt egy piros figyelmeztető doboz jelenik meg: *"Beosztás letiltva! A dolgozó orvosi vizsgálata lejárt: {datum}. Az Mvt. 49. § alapján érvényes alkalmassági vizsgálat nélkül nem osztható be."*
      - Közvetlen link: *„Dolgozói profil megnyitása →”* a vizsgálat azonnali pótlásához.
      - A sablongombok letiltottak (`disabled`, `opacity-40`, `cursor-not-allowed`).
    - **Meglévő beosztás esetén:**
      - A beosztás kártyáján piros figyelmeztető pulzáló pont jelenik meg.
      - A Popover megnyitásakor az új műszakra váltás tiltott, de a **„Műszak törlése”** gomb aktív marad a jogellenes beosztás megszüntetéséhez.

### 3. Előző Hét Másolása Értesítés
- Az „Előző hét másolása” gomb megnyomásakor a rendszer az orvosi alkalmasság miatt kihagyott napok számát borostyánsárga figyelmeztetésben (`toast.warning`) jelzi:
  *„12 műszak sikeresen átmásolva. (3 műszak kihagyva lejárt/hiányzó orvosi alkalmasság miatt!)”*

## Jogszabályi Hivatkozás
- 1993. évi XCIII. törvény a munkavédelemről (Mvt. 49. § (1))
- 33/1998. (VI. 24.) NM rendelet a munkaköri, szakmai, illetve személyi higiénés alkalmasság orvosi vizsgálatáról és véleményezéséről
