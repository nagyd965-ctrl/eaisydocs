# [Docs] A-001: Szigorú 4-Szem Elv és Tranzakciós Selejtezési Csomagkezelés

**Status:** Decided  
**Date:** 2026-09-29  
**Scope:** [Docs]
**Author:** Dani & ThinkAI  
**Kapcsolódó PRD:** [P-002](../../product/decisions/P-002-archive-protocol-popover-ux.md)  
**Kapcsolódó Kód:** `src/app/archive/disposal-actions.ts`, `src/components/archive-client.tsx`

---

## 1. Context (Kontextus)
Az elektronikus iratkezelési jogszabályok és a belső audit-követelmények előírják a **négyszem-elv (Four-Eyes Principle)** kötelező érvényesítését selejtezéskor: a selejtezési javaslatot felterjesztő iratkezelő munkatárs **szigorúan nem hagyhatja jóvá a saját javaslatát**, a jóváhagyást kizárólag egy független vezető vagy rendszergazda végezheti el.

Korábban a rendszerben az alábbi sebezhetőségek és inkonzisztenciák álltak fenn:
1. A felterjesztő azonosítása nem volt kötegelt lekérdezéssel lefedve, így tömeges jóváhagyáskor kijátszható volt az ellenőrzés.
2. Ha egy meglévő selejtezési csomagból csak bizonyos iratokat jelöltek ki jóváhagyásra (részleges jóváhagyás), a rendszer vagy a teljes csomagot jóváhagyta tévesen, vagy nem keletkezett tiszta jegyzőkönyvi kapcsolat.
3. A PDF selejtezési jegyzőkönyv generálásakor a felterjesztő neve helyett statikus szöveg ("Iratkezelő") került az aláírási záradékba.

---

## 2. Decision (A Meghozott Döntés)
A `src/app/archive/disposal-actions.ts` modulban a `approveDisposal` szerver-akciót az alábbi építészeti szabályok szerint refaktoráltuk:

1. **Kettős forrású, kötegelt felterjesztő-ellenőrzés:**
   - A rendszer kigyűjti mind a `selejtezes_tetel` kapcsolódó csomagjainak `javaslattevo_user_id` értékeit, mind az `esemeny_naplo` audit bejegyzéseit (`esemeny_tipus = 'modositva'`, `indoklas ILIKE '%Selejtezésre felterjesztve%'`).
   - Ha a jóváhagyást megkísérlő aktív felhasználó (`user.id`) benne van a felterjesztők halmazában (`proposerUserIds.has(user.id)`), a tranzakció azonnal megszakad és hibaüzenetet ad.

2. **Dinamikus Csomagbontás Részleges Jóváhagyáskor:**
   - Ha a jóváhagyott ügyiratok pontosan lefedik az eredeti csomagot, az eredeti csomag státusza frissül `jovahagyva`-ra.
   - Ha részleges kiválasztás történik (vagy vegyes csomagokból származnak az ügyiratok), a rendszer automatikusan létrehoz egy új `selejtezes_csomag` rekordot `statusz = 'jovahagyva'` értékkel, és a jóváhagyott tételeket átmozgatja ebbe a lezárt csomagba. Így a fel nem használt tételek nem kapnak téves jegyzőkönyvet.

3. **Hiteles Felterjesztői Név a Jegyzőkönyvben:**
   - A generált PDF jegyzőkönyv fejlécébe a `felhasznalo_profil` táblából kinyert tényleges felterjesztői név kerül beillesztésre.

---

## 3. Consequences (Következmények)

### Pozitív:
* **Megfelelőség:** Teljes jogi és belső audit konformitás a selejtezési folyamatban.
* **Adatintegritás:** Nincs adatbázis-anomália részleges jóváhagyások esetén sem.
* **Auditálhatóság:** Az eseménynaplóban és a tárolt PDF jegyzőkönyvben pontosan követhető, ki terjesztette fel és ki hagyta jóvá a megsemmisítést.

### Negatív / Kockázat:
* Egyfős tesztkörnyezetben a fejlesztőnek két külön felhasználói fiókkal kell belépnie a selejtezés teszteléséhez (a rendszer nem engedi meg a saját javaslat jóváhagyását még adminisztrátori jogkörrel sem).
