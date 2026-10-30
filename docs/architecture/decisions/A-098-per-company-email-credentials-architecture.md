# A-098: [eaisyDocs] Cég-Szintű E-mail Hitelesítő Adatok Architektúra — Titkosított, Postafiók-Alapú Multi-Tenant Érkeztetés

**Status:** Decided  
**Date:** 2026-10-30  
**Scope:** `eaisyDocs` (a HR modul érintetlen)  
**Author:** OpenCode  
**Kapcsolódó:** [eaisydocs-deep-analysis-20261030](../../eaisydocs-deep-analysis-20261030.md) (1.4-es gyökérok: company_id nélküli insertek; 2.5: IMAP cég-tudatlanság), [A-097](./A-097-use-server-exports-as-endpoints-deletion-and-guard-policy.md)  
**Kapcsolódó Kód:** `src/utils/imap-config.ts`, `src/utils/imap-service.ts`, `src/utils/credential-crypto.ts`, `src/app/settings/credential-actions.ts`, `src/app/settings/settings-client.tsx`, `src/utils/mailer.ts`

---

## 1. Context (Kontextus)

A deep-audit (2026-10-30) szerint az e-mail érkeztetési csatorna nem volt cég-tudatos: az IMAP worker **egyetlen, globális postafiókot** olvasott (`.env`: `EMAIL_HOST/USER/PASSWORD`), az irat `company_id` nélkül került az adatbázisba (így mindig a DB-default céghez — Think AI — került), a „Új irat érkezett" harang-értesítés pedig cég-szűrés nélkül **az összes cég** iktató/admin/ügyintézőjének ment, és a partner-feloldás is a többi cég partnerei között keresett. A megrendelő nem-definiáltan több cégnél váltotta volna használni a csatornát, ezért **cég-szintű** megoldást kért: a Beállításokban cégenként lehessen megadni az IMAP-kiszolgálót, portot, felhasználónevet, jelszót és a Brevo API kulcsot.

## 2. Decision (A Meghozott Döntés)

1. **Postafiók-alapú cég-hozzárendelés:** a worker minden ciklusban (20 mp) az **összes engedélyezett cég saját postafiókját** olvassa; az onnan beérkezett iratra **a postafiók tulajdonos cégének** `company_id`-ja kerül. Két cég nem osztozhat egy postafiókon (duplikáció-veszély). Egy cég beállítás nélkül = e-mail csatorna kikapcsolva.
2. **Tárolás migráció nélkül:** `rendszer_beallitas` tábla, cég-specifikus kulccsal: `hitelesito_adatok:{companyId}` (ugyanaz a minta, mint a feladat-/válaszlevél-sablonoknál — l. A-097 kör következményei).
3. **Titkok kötelező titkosítása:** a `rendszer_beallitas` RLS-szabálya szerint **minden autentikált felhasználó olvashatja a táblát**, ezért a jelszó és a Brevo kulcs **AES-256-GCM** titkosítással tárolódik (`src/utils/credential-crypto.ts`). A titkosító kulcs a `CREDENTIAL_ENCRYPTION_KEY` env-ből származik (hiánya esetén a `SUPABASE_SERVICE_ROLE_KEY`-ből származtatunk stabil kulcsot). A titok **soha nem kerül vissza a felületre** — a beállítókártyán csak mezőnkénti pipa jelzi, hogy be van-e állítva; a jelszómező kizárólag felülírásra szolgál.
4. **A-097 őrblokk a beállító akciókra:** `getCredentialStatus` / `saveCredentialConfig` / `testImapConnection` — mindhárom kötelezően ellenőrzi a bejelentkezett **cég-admin** tagságát (`company_members`) az aktív cég kontextusában.
5. **Self-heal átmeneti auto-import:** ha még egyetlen `hitelesito_adatok:%` sor sincs a DB-ben, de a `.env`-ben van IMAP-konfiguráció, akkor az `ensureCredentialSeed()` **idempotensen** az első céghez (created_at szerint — jelenleg Think AI) importálja az env-adatokat. Ez elég a worker indulásakor ÉS a Beállítások oldal megnyitásakor is (így nem múlik a worker újraindításán).
6. **Értesítés- és partner-szűrés:** a harang-értesítés **csak az adott cég** tagjai közül az iktató/admin/ügyintéző szerepkörűeknek megy (globális `szerepkor` VAGY cég-szintű `docs_szerepkor` alapján); a partner-feloldás (`findOrCreatePartner`) `company_id` paramétert kap.
7. **Brevo kulcs feloldása küldéskor:** a `sendNotificationEmail` az értesített cég saját Brevo kulcsát használja, ha van; különben a globális `BREVO_API_KEY` env a fallback.

## 3. Consequences (Következmények)

**Pozitív:** Az e-mail csatorna valóban multi-tenant lett: levél → postafiók → cég hozzárendelés automatikus; a kereszt-céges értesítési szivárgás és a kereszt-céges partner-feloldás megszűnt; a titkok adatbázisból kiolvasva sem kompromittálódnak (titkosítva vannak); új cég felvétele kizárólag UI-lépés, migráció nélkül.

**Kockázat / Kompromisszum:** (a) Ha a `CREDENTIAL_ENCRYPTION_KEY` nincs beállítva és a `SUPABASE_SERVICE_ROLE_KEY` rotálódik, a titkosított értékek **visszafejthetetlenné válnak** — ilyenkor a beállításokat újra kell menteni (a pipák jelzik a problémát). (b) Az auto-import „első cég" logikája a jelenlegi telepítésre (Think AI) helyes; jövőbeni telepítéseknél a beállításokat célszerű azonnal a UI-ban felülírni. (c) A worker portfólió-pollingja lineárisan skálázódik a cégek számával — jelentős cégpszámnál a 20 mp-es ciklus átfutása növekszik.

**Megrendelői teszt (2026-10-30):** a Hitelesítő adatok kártya Think AI-nál auto-importtal kitöltött (5 pipa), a „Kapcsolat tesztelése" sikeres; az élő érkeztetés ellenőrzése megtörtént — az `inboundteszt@thinkai.hu`-ra érkező levél csak a Think AI céghez kerül, Teszt Kft felhasználója nem látja és értesítést sem kap róla.
