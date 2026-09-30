# [Docs] A-020: Külső REST API v1 és Webhook Architektúra

## Állapot
Elfogadva

## Kontextus és Problémafelvetés
Az eaisyDocs rendszernek képesnek kell lennie külső vállalatirányítási rendszerekkel (ERP, CRM, könyvelőprogramok, egyedi iparági szoftverek) való automatizált kommunikációra anélkül, hogy a felhasználónak kézzel kellene iratokat feltöltenie vagy státuszokat ellenőriznie. Szükség van egy verziózott, biztonságos, programozható interfészre (`/api/v1/ugyiratok`), amelyen keresztül új ügyiratok indíthatók, meglévők lekérdezhetők, és életciklus-váltások triggerelhetők.

## Döntési Megfontolások
- Next.js Route Handler architektúra (`src/app/api/v1/ugyiratok/route.ts`).
- Bearer API Token hitelesítés a kérések fejlécében (`Authorization: Bearer <API_KEY>`).
- Hozzáférés szigorú izolációja az adott API kulcshoz rendelt szervezeti egységre és minősítési szintre.
- Részletes bejövő kérés validáció és strukturált hibaválasz (JSON schema).
- Szigorúan naplózott műveletek az `esemeny_naplo` táblában `kulso_api` felhasználói azonosítóval.

## Döntés
Bevezetésre került a `/api/v1/ugyiratok` és a `/api/v1/ugyiratok/[id]/eletciklus` REST végpont:
1. **GET `/api/v1/ugyiratok`**: Szűrés státusz, partner vagy dátum szerint, lapozható JSON válasz.
2. **POST `/api/v1/ugyiratok`**: Új ügyirat és kezdőirat létrehozása metaadatokkal és base64/URL csatolmánnyal, azonnali gap-mentes iktatószám generálással.
3. **POST `/api/v1/ugyiratok/[id]/eletciklus`**: Életciklus események (lezárás, újranyitás, selejtezési javaslat) külső indítása.

## Következmények
- **Pozitív:** Szabványos, megbízható gép-gép kapcsolat. Harmadik féltől származó szoftverek (pl. számlázók, logisztikai ERP) közvetlenül integrálódhatnak.
- **Negatív / Kockázat:** Megfelelő Rate Limiting és API kulcs rotációs mechanizmust kell fenntartani.
