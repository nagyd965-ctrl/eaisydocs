# [Közös] A-026: Munkavállalói Személyi Dosszié és eaisyHR ↔ eaisyDocs Iratkezelési Híd Architektúra

> **Dátum:** 2026-09-30  
> **Státusz:** Decided  
> **Hatókör:** `[Közös]` (`[Docs]` & `[HR]`)  
> **Kapcsolódó ADR-ek:** [A-005](./A-005-hr-modular-independence-architecture.md), [A-006](./A-006-gapless-filing-sequence-allocation.md), [A-011](./A-011-polymorphic-entity-relations-graph.md)  
> **Kapcsolódó PRD:** [P-025](../../product/decisions/P-025-employee-document-filing-and-dossier-ux.md)  
> **Érintett fájlok:** `supabase/migrations/20260930000003_hr_filing_bridge.sql`, `src/app/hr/employee/[id]/actions.ts`, `src/components/hr/file-hr-document-dialog.tsx`

---

## 1. Kontextus és Problémafelvetés
Az eaisyHR modulban keletkező munkaügyi dokumentumok (munkaszerződések, orvosi alkalmassági igazolások, jelenléti ívek, fegyelmi határozatok) jelenleg csupán egy lokális táblában (`hr_dokumentum`) tárolódnak. Nem rendelkeznek hivatalos, hézagmentes iktatószámmal, irattári megőrzési határidővel és auditált életciklussal.

Ugyanakkor az iratok automatikus, vak „tömeges átöntése” az eaisyDocs-ba súlyos iratkezelési káoszt és GDPR jogsértést okozna, mert:
1. Az iktatás jogi felelősség: vázlatok és munkaközi jegyzetek nem kaphatnak iktatószámot.
2. A munkaügyi iratok megőrzési ideje eltérő (Mt. szerint a nyugdíjhoz kötődő iratok megőrzési ideje 50+ év, míg a jelenléti íveké 5 év).
3. A munkavállalói személyes és egészségügyi adatok szigorúan korlátozott betekintést igényelnek (`bizalmas` minősítés).

## 2. Megfontolt Alternatívák
1. **Minden HR dokumentumnak külön új ügyiratot nyitni:**  
   *Elvetve:* Egyetlen dolgozónál 10-20 külön ügyirat jönne létre az iktatókönyvben, ami szétaprózná a nyilvántartást.
2. **Közös céges gyűjtőügyirat (pl. „2026. évi szerződések”):**  
   *Elvetve:* Egy munkavállaló kilépésekor vagy hatósági ellenőrzésnél nem lehetne egyben kezelni a dolgozó aktáját.
3. **Munkavállalói Személyi Dosszié Modell (Kiválasztott):**  
   Minden dolgozóhoz egy dedikált központi személyi gyűjtőügyirat tartozik az eaisyDocs-ban (`[Dolgozó Neve] személyi dossziéja`), `HR` prefixszel (pl. `HR/2026/000012`). A dolgozó minden iktatott irata ezen ügyirat alszáma lesz (`.../1`, `.../2`, stb.).

## 3. Döntés
1. **Adatbázis sémabővítés (`20260930000003_hr_filing_bridge.sql`):**
   - A `hr_dokumentum` tábla kibővül az iratkezelési hivatkozásokkal:
     - `irat_id UUID REFERENCES public.irat(id) ON DELETE SET NULL`
     - `ugyirat_id UUID REFERENCES public.ugyirat(id) ON DELETE SET NULL`
     - `iktatoszam TEXT`
     - `iktatva_ekor TIMESTAMPTZ`
2. **Automatikus Személyi Dosszié Menedzsment:**
   - Az első irat iktatásakor a rendszer ellenőrzi, hogy létezik-e már a dolgozóhoz kapcsolt személyi dosszié (`irat_kapcsolat` alapján).
   - Ha nem létezik, automatikusan létrehozza:
     - Ügy: `[Dolgozó Neve] személyi dossziéja`
     - Ügyirat: `HR/{év}/XXXXX` iktatószámmal, `3.1 - HR és Munkaügyi dokumentumok` irattári tétellel (50 év megőrzés, nem selejtezhető).
     - Rögzíti az `irat_kapcsolat` bejegyzést (`entitas_tipus = 'munkavallalo'`, `entitas_id = dolgozo_id`, `entitas_forras = 'eaisyhr'`).
   - Ha már létezik, a meglévő ügyirathoz rendeli az új iratot a következő növekvő `alszam`-mal.
3. **Szigorú GDPR és Biztonsági Védelem:**
   - Minden HR eredetű irat kötelezően `minosites = 'bizalmas'` besorolást kap.
   - Az iratkezelőben az általános ügyintézők nem láthatják a bér- és orvosi adatokat, kizárólag a HR és az adminisztrátori jogosultsággal rendelkezők.

## 4. Következmények
- **Pozitívum:** Tiszta, jogilag szabványos iratkezelési struktúra. Egy munkavállaló teljes céges életútja egyben kezelhető és ellenőrizhető.
- **Pozitívum:** Laza csatolás (loose coupling): az eaisyDocs önállóan is működik, a kapcsolat polimorf linken (`irat_kapcsolat`) alapul.
- **Pozitívum:** Egyértelmű vizuális visszajelzés a HR felületen: zöld *Iktatva (HR/2026/000012/1)* badge vs szürke *Belső HR vázlat*.
