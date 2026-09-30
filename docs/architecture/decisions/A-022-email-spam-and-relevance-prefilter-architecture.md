# [Docs] A-022: AI Email Spam és Relevancia Előszűrő Architektúra

## Állapot
Elfogadva (Decided)

## Kontextus és Problémafelvetés
Az automatikus IMAP e-mail érkeztető démon (`imap-service.ts`) minden új, olvasatlan levelet azonnal hivatalos érkeztetési számmal (`generate_erkeztetoszam`) látott el és bejegyzett az `irat` táblába.
Ez a működés a valós vállalati működés során súlyos adathigiéniai és erőforrás-problémát okozott:
- Kéretlen reklámok, kaszinó/kripto spamek, marketing hírlevelek és kézbesítési hibaértesítők (bounce) is bekerültek a hivatalos iktatókönyvbe.
- Feleslegesen foglaltak sorszámokat és tárhelyet a Supabase Storage-ban.
- Feleslegesen égették az AI embedding és OCR tokeneket.

## Döntési Megfontolások
1. **Kétlépcsős (2-Tier) architektúra:**
   - **Tier 1 (Determinisztikus Heurisztika - 0ms):** Bizonylat-kulcsszavas csatolmányok (számla, szerződés, invoice, rechnung) azonnal átmennek; egyértelmű bounce (`mailer-daemon`, `postmaster@`) és leiratkozási linkes reklámok azonnal kiesnek LLM költség nélkül.
   - **Tier 2 (Gemini 2.5 Flash LLM - ~300ms):** A kétértelmű levelek vizsgálata természetes nyelvű prompttal.
2. **Kritikus Biztonsági Elv (Fail-Open):**
   - Hivatalos jogi és üzleti iratkezelőben **egyetlen valós üzleti dokumentum sem veszhet el**.
   - Ha a hálózat, az API kulcs vagy a Gemini modell hibára fut, a rendszer automatikusan megengedi a levél érkeztetését (`isRelevant: true`).

## Döntés
Létrehoztuk a [`src/utils/email-spam-filter.ts`](../../src/utils/email-spam-filter.ts) szervizt:
1. Az IMAP letöltési ciklusban a levél feldolgozása előtt lefut a `classifyIncomingEmail` ellenőrzés.
2. Ha a levél nem releváns (spam, marketing hírlevél, kézbesítési hiba), a rendszer:
   - Kiír egy diagnosztikai naplóüzenetet a szűrés okával.
   - Olvasottnak jelöli a levelet a levélszerveren (`\Seen`), megelőzve az ismételt letöltést.
   - **Nem generál érkeztetőszámot és nem hoz létre rekordot az `irat` táblában.**
3. A működést dedikált TDD egységteszt csomag védi: [`src/utils/__tests__/email-spam-filter.test.ts`](../../src/utils/__tests__/email-spam-filter.test.ts).

## Következmények
- **Pozitív:** Tiszta, spam-mentes iktatókönyv; drasztikusan alacsonyabb Storage és AI token fogyasztás; védett érkeztetőszám-folytonosság.
- **Kockázat:** Téves szűrés (False Positive) kockázatát a szigorú fail-open mechanizmus és a számla/szerződés melléklet prioritás minimalizálja.
