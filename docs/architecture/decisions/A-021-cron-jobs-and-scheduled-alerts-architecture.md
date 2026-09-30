# [Közös] A-021: Időzített Cron Feladatok és Értesítési Háttérmotor

## Állapot
Elfogadva

## Kontextus és Problémafelvetés
Egy elektronikus iratkezelő és HR rendszerben számos folyamat nem közvetlen felhasználói kattintáshoz kötődik, hanem időzítetten kell lefutnia:
- Időszakos IMAP email letöltés a bejövő postaládába.
- Reggeli összefoglaló értesítők (napi teendők, lejáró feladatok, ma érkező kollégák).
- Éjszakai adatkarbantartás: megőrzési idők lejárata miatti selejtezhetővé válás ellenőrzése, GDPR 12 hónapos toborzási retenciók vizsgálata.

## Döntési Megfontolások
- Dedikált Next.js Route Handlerek az `/api/cron/*` útvonalon (`src/app/api/cron/imap/route.ts`, `morning/route.ts`, `nightly/route.ts`).
- Vercel Cron vagy külső időzítő (pl. Supabase `pg_cron` / GitHub Actions / Linux cron) hívja meg őket.
- Védett hívások: A kérések kötelezően tartalmazzák a `CRON_SECRET` környezeti változóval egyező Bearer tokent.
- Aszinkron futás: Timeout elkerülése érdekében a cron végpontok kötegekben (batch) dolgoznak és részletes eredményt adnak vissza JSON formátumban.

## Döntés
Három dedikált cron útvonal működik a rendszerben:
1. **`/api/cron/imap` (percenként vagy 5 percenként):** Lekérdezi az aktív IMAP fiókokat, lementi az új emaileket és mellékleteket érkeztetett iratként, triggereli az AI feldolgozást.
2. **`/api/cron/morning` (minden reggel 07:00-kor):** Összegyűjti az aznapi lejáró feladatokat, jóváhagyásra váró szabadságokat és email/in-app értesítést generál az érintetteknek.
3. **`/api/cron/nightly` (minden éjfélkor 02:00-kor):** Ellenőrzi a megőrzési időket (`megorzesi_ido_vege <= NOW()`), a selejtezhető iratokat megjelöli, és lefolytatja a GDPR anonimizálási vizsgálatokat.

## Következmények
- **Pozitív:** Teljesen automatizált, háttérben futó üzleti folyamatok és proaktív értesítési rendszer.
- **Negatív / Kockázat:** A cron secret kulcs szivárgása jogosulatlan erőforrás-terhelést okozhat, ezért a secretet Supabase Vaultban vagy környezeti változóban szigorúan védeni kell.
