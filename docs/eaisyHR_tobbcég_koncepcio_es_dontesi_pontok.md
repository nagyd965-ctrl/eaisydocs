# eaisyHR – Többcég-kezelés (Multi-Tenancy) Koncepció és Döntési Pontok

> **Cél:** Megbeszélési segédlet és döntéselőkészítő dokumentum az eaisyHR modul többcéges működésének megtervezéséhez.  
> **Dátum:** 2026. október 8.  
> **Státusz:** Javaslat / Tervezet (Meeting Draft)

---

## 1. Vezetői Összefoglaló (Miért van szükség erre a döntésre?)

Az **eaisyDocs** iratkezelő rendszerben a többcég-kezelés sikeresen kiépült:
- A felső cégválasztóban (Company Selector) egyetlen kattintással válthatunk a vállalatok között (pl. *Think AI Kft.* ↔ *Teszt Kft.*).
- Az iktatókönyv, az irattár, a bejövő sor és a partnertörzs szigorúan a kiválasztott cég adataira szűrve, elszeparáltan jelenik meg.

Az **eaisyHR (humánerőforrás-kezelő)** modulban azonban a többcég-kezelés jóval összetettebb, mert **itt nem tárgyak vagy fájlok mozognak, hanem maguk az emberek (munkavállalók), a munkajogi kötelezettségek és a szigorúan védett személyes/béradatok.**

Mielőtt a fejlesztést megkezdjük, tisztáznunk kell:
1. **Ki a HR-es?** Egyetlen cég belső HR-ese, vagy több céget átfogó csoportszintű (holding) HR-es?
2. **Hol dől el a szerepkör?** Globálisan a felhasználói fiókon, vagy vállalatonként külön-külön?
3. **Hogyan garantáljuk a GDPR és az Mt. szerinti szigorú adatelkülönítést?**

---

## 2. A Két Alapvető Üzleti Forgatókönyv

A vállalati gyakorlatban és a modern HR rendszerekben (pl. Workday, BambooHR, Visibill) két tipikus modell létezik:

| Szempont | 1. Dedikált Belső HR-es (In-house HR) | 2. Csoportszintű / Kiszervezett HR (Holding / Shared Service) |
| :--- | :--- | :--- |
| **Kik ők?** | Egy adott cég (pl. KKV vagy leányvállalat) saját alkalmazottja. | Cégcsoport központi HR csapata vagy külsős bérszámfejtő/HR iroda. |
| **Hatáskör** | Kizárólag a **saját vállalata** dolgozóit és adatait láthatja és kezelheti. | Párhuzamosan 2, 3 vagy több cég teljes személyügyi adminisztrációjáért felel. |
| **Cégválasztó viselkedése** | A cégválasztóban a többi cég vagy meg sem jelenik, vagy csak sima alkalmazotti joggal. | A cégválasztóban szerepel az összes cég, ahová HR megbízása van. |
| **Kockázat** | Törvényt sért (GDPR, üzleti titok), ha más cég dolgozóinak béréhez hozzáfér. | Könnyen összekeverheti a cégeket, ha a felület nem egyértelmű. |

---

## 3. A Leggyakoribb Hiba és Anomália: A „Kettős Szerepkör”

> [!WARNING]
> **A valós életből vett probléma:**  
> Mi történik, ha **Kovács Péter** a *Think AI Kft.*-ben **HR vezető**, de a *Teszt Kft.*-ben csupán **részmunkaidős szoftverfejlesztő (egyszerű alkalmazott)**?

- **Ha a HR szerepkör globális** (a `felhasznalo_profil.hr_szerepkor` táblában):  
  Amikor Péter átvált a *Teszt Kft.*-re, ott is HR vezetőként lépne fel. Ezzel látná a *Teszt Kft.* összes dolgozójának a fizetését, orvosi adatait és a tulajdonosok bérét, ami súlyos **jogosultsági és adatvédelmi incidens**.
- **A helyes működés:**  
  Péternek a *Think AI Kft.*-ben `hr_vezeto` jogosultsága van, míg a *Teszt Kft.*-ben csak `alkalmazott` (így ott csak a saját jelenlétét és szabadságait láthatja).

---

## 4. Javasolt Architektúra és Működési Modell

A fentiek alapján a legtisztább, skálázható megoldás a következő három pillérre épül:

```
┌─────────────────────────────────────────────────────────────┐
│                 Felhasználó (User Account)                  │
│                   kovacs.peter@thinkai.hu                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 ┌──────────────────────┐              ┌──────────────────────┐
 │   Think AI Kft.      │              │      Teszt Kft.      │
 │   Tagság: ADMIN      │              │   Tagság: MEMBER     │
 │   HR: hr_vezeto      │              │   HR: alkalmazott    │
 └──────────────────────┘              └──────────────────────┘
            │                                     │
   Látja az összes dolgozót,             Csak a saját önkiszolgáló
   béreket, jelenléteket.                adatait (szabadság, jelenlét) látja.
```

### 1. Céghez kötött (Scoped) HR szerepkör a `company_members` táblában
- A `company_members` táblát kiegészítjük egy `hr_szerepkor` mezővel (`alkalmazott`, `hr_munkatars`, `hr_vezeto`, `admin`, `auditor`).
- A felhasználó belépéskor megkapja az **aktív cégre vonatkozó** HR szerepkörét.

### 2. Szigorú Cégválasztó kontextus (Company Selector)
- A HR modul fejlécében lévő cégválasztó határozza meg, hogy a HR-es melyik cég asztalánál ül.
- Amikor a HR-es átkattint a *Teszt Kft.*-re:
  - Az alkalmazotti névsor (`/hr/admin`) azonnal a Teszt Kft. dolgozóira vált.
  - A jelenléti ívek és jóváhagyások csak a Teszt Kft. munkavállalóit tartalmazzák.
  - A toborzási álláshirdetések (ATS) és onboarding folyamatok a Teszt Kft.-hez kapcsolódnak.

### 3. Dolgozó ↔ Cég elválasztás (`hr_alkalmazott.company_id`)
- Minden dolgozói törzskarton egyértelműen egy céghez tartozik.
- Ha egy személy két cégben is dolgozik (pl. napi 4 óra mindkét helyen), az két külön munkaviszony, két külön törzskartonnal és külön adószámokkal.

---

## 5. Konkrét Döntési Kérdések a Megbeszélésre

A megbeszélés során az alábbi 5 pontban érdemes közös álláspontot kialakítani:

### 1. Kérdés: Hol kezeljük a HR szerepkört?
- [ ] **A) Cégenként a tagságnál (Javasolt):** A `company_members` táblában. Így valaki lehet az egyik cégben HR-es, a másikban alkalmazott.
- [ ] **B) Globálisan a felhasználói profilon:** Aki HR-es, az minden olyan cégben HR-es, ahol tag. (Egyszerűbb, de nem kezeli a kettős szerepköröket).

### 2. Kérdés: Szükség van-e „Összes Cég” (Holding) nézetre a HR-ben?
- [ ] **A) Nem, elegendő a cégválasztóval váltani (Javasolt 1. fázis):** A HR-es a bal felső cégválasztóban vált a cégei között. Egyszerre mindig egy cég adatait látja, így kizárt a véletlen összekeverés.
- [ ] **B) Igen, kell egy közös aggregált műszerfal (2. fázis):** A holding HR vezető egyetlen listában akarja látni a cégcsoport összes dolgozóját egy "Cég" oszloppal kiegészítve.

### 3. Kérdés: Szervezeti egységek és Munkakörök
- [ ] **A) Cégenként teljesen függetlenek (Javasolt):** Minden cégnek saját részlegei (pl. *Teszt Kft. – Fejlesztés*, *Think AI – Fejlesztés*) és saját munkakörei vannak.
- [ ] **B) Cégcsoport szinten közösek:** A szervezeti egységek globálisak, és több cég is használhatja ugyanazt a struktúrát.

### 4. Kérdés: Vezetői jóváhagyások (Manager Hierarchy)
- [ ] A jóváhagyó vezető (felettes) csak az adott cégen belüli kolléga lehet.
- [ ] Megengedett, hogy a holding anyacég vezetője hagyja jóvá a leányvállalat munkavállalójának távollétét.

### 5. Kérdés: Jogszabályi exportok (NAV T1041, KSH, Bérszámfejtés)
- [ ] Minden havi zárás és hatósági jelentés kizárólag cégenként külön-külön generálódik le az adott cég adószámával és cégadataival.

---

## 6. Javasolt Fejlesztési Lépések (Roadmap)

1. **Adatbázis szintezés:** `company_id` és RLS izoláció a még hiányzó HR táblákra (`hr_allashirdetes`, `hr_toborzas`, `hr_kpi_katalogus`).
2. **Szerepkör finomhangolás:** `hr_szerepkor` bevezetése a `company_members` táblába.
3. **HR Oldalak frissítése:** A HR oldalak szerverkomponenseinek szűrése az aktív cégre (`getActiveCompanyIdServer()`).
4. **Kliens oldali dinamikus frissülés:** A már bevált `key={companyScope}` minta alkalmazása a HR táblázatokon és műszerfalakon.

---
*Készült az eaisyDocs & eaisyHR architektúra csapat által.*
