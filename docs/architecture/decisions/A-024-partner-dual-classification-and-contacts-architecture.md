# A-024: [Docs] Partnertörzs Kettős Besorolási Modell és Kapcsolattartói Architektúra

> **Dátum:** 2026-09-30  
> **Státusz:** Decided  
> **Hatókör:** `[Docs]` / `[Közös]`  
> **Kapcsolódó PRD:** [P-024](../../product/decisions/P-024-partner-directory-and-contact-management-ux.md)  
> **Érintett fájlok:** `supabase/migrations/20260930000002_partner_expansion.sql`, `src/app/partners/actions.ts`, `src/utils/partner-matcher.ts`

---

## 1. Kontextus és Problémafelvetés
Az eaisyDocs partnertörzse korábban kizárólag a partner szervezeti/jogi formáját (`ceg`, `maganszemely`, `egyeni_vallalkozo`, `intezmeny`) tartotta nyilván egyetlen oszlopban. Ez nem tette lehetővé a partnerek üzleti reláció szerinti szétválasztását (hogy az adott partner Vevő, Szállító, Hatóság vagy Pénzintézet), ami elengedhetetlen a számlapárosításhoz (eaisyBill), az iratforgalom megkülönböztetéséhez, valamint a szerződések kezeléséhez.

Emellett egy vállalati vagy hatósági partnerhez több természetes személy (kapcsolattartó, képviselő, pénzügyes) is tartozhat, akiknek közvetlen elérhetőségei nem voltak strukturáltan tárolva.

## 2. Megfontolt Alternatívák
1. **Egyetlen kombinált enum:** A meglévő `tipus` mezőbe vegyíteni a formát és a szerepkört (pl. `ceg_vevo`, `ceg_szallito`, `ev_vevo`).  
   *Elvetve:* Kombinatorikus robbanáshoz vezet és sérti a normalizálási alapelveket.
2. **Külön vevő és szállító tábla:** Két külön adatbázistábla fenntartása.  
   *Elvetve:* Számos partner egyszerre vevő és szállító is lehet (`mindketto`), ráadásul duplikálná az iktatási kapcsolatokat.
3. **Kettős besorolás (Jogi forma + Üzleti szerepkör) + Dedikált `partner_kapcsolattarto` tábla (Kiválasztott):**  
   A `partner` tábla megtartja a jogi formát (`tipus`), kiegészül az üzleti szerepkörrel (`szerepkor`), pénzügyi alapadatokkal (`bankszamlaszam`, `fizetesi_hatarido_nap`), és egy 1:N kapcsolatú `partner_kapcsolattarto` altáblával.

## 3. Döntés
1. **Adatbázis sémabővítés:**
   - `partner.szerepkor`: CHECK (`vevo`, `szallito`, `mindketto`, `hatosag`, `bank`, `egyeb`).
   - `partner.statusz`: CHECK (`aktiv`, `inaktiv`).
   - `partner.bankszamlaszam`, `partner.fizetesi_hatarido_nap`, `partner.fizetesi_mod`, `partner.weboldal`, `partner.megjegyzes`.
2. **`partner_kapcsolattarto` relációs tábla:**
   - `id`, `partner_id` (FK CASCADE), `nev`, `beosztas`, `email`, `telefonszam`, `elsodleges`, `megjegyzes`, időbélyegek.
   - Row Level Security aktiválva.
3. **Valós idejű duplikáció-ellenőrzés:**
   - A `checkPartnerDuplicate` server action adószám, EU adóazonosító és kis/nagybetű független cégnév alapján gépelés közben figyelmezteti a felhasználót.

## 4. Következmények
- **Pozitívum:** Tiszta, normalizált relációs modell. Az eaisyBill számlaimport és a szerződéskezelés közvetlenül tud a partner bankszámlájára és fizetési feltételeire támaszkodni.
- **Pozitívum:** A kimenő és bejövő iratoknál konkrét kapcsolattartók is megjelölhetők.
- **Kompromisszum:** Új partner felvitelekor a felhasználónak célszerű a szerepkört is kiválasztania (bár alapértelmezett értéke a leggyakoribb `vevo`).
