# [Docs] A-009: IMAP E-mail Figyelő és Aszinkron AI Sorfeldolgozó Daemon Architektúra

**Status:** Decided  
**Date:** 2026-07-14 (Rögzítve: 2026-09-30)  
**Scope:** `[Docs]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `imap-worker.ts`, `ai-worker.ts`, `src/utils/imap-service.ts`, `src/utils/ai-worker-service.ts`, `src/app/api/cron/imap/route.ts`, `supabase/migrations/20260918000001_concurrency_and_ai_queue.sql`

---

## 1. Context (Kontextus)
Az iratkezelési folyamat két leginkább erőforrás-igényes és blokkoló feladata:
1. A beérkező e-mailek és mellékleteik valós idejű letöltése és érkeztetése.
2. A csatolt dokumentumok szövegének kinyerése (OCR) és az AI metaadat-elemzés (Google GenAI / Anthropic hívások, pgvector vektoros beágyazás).
Ha ezek a műveletek a Next.js kérések szinkron szálán futnának, a felhasználói felület megfagyna, a kérések időtúllépést (HTTP 504 Timeout) kapnának.

---

## 2. Decision (A Meghozott Döntés)
A feladatok elvégzésére kétféle végrehajtási modellt valósítottunk meg:

1. **IMAP E-mail Figyelés (`imap-worker.ts` & `/api/cron/imap`):**
   - Az `imapflow` és `mailparser` könyvtárak segítségével kapcsolatot tart fenn a dedikált érkeztető postafiókkal (`src/utils/imap-service.ts`).
   - Képes folyamatos daemonként futni (`imap-worker.ts`) vagy időzített felhő cron végpontként hívódni (`src/app/api/cron/imap/route.ts`).
   - Letölti az új leveleket, kimenti a csatolt PDF-eket a Supabase Storage-be, létrehozza az `irat` és `irat_fajl` rekordot érkeztetőszámmal, majd az iratot behelyezi az `ai_feladat_sor` feldolgozási sorba.
2. **AI Sorfeldolgozó Worker (`ai-worker.ts` & `src/utils/ai-worker-service.ts`):**
   - Időzített ciklusban ellenőrzi az adatbázisban lévő feldolgozandó feladatokat.
   - Sorbarendezett, idempotens zárolással (`claim_ai_tasks(p_limit)` tárolt eljárás) veszi ki az iratokat az `ai_feladat_sor` táblából.
   - Meghívja a nyelvi modellt a PDF szövegével, és elmenti a mezőjavaslatokat az `irat.ai_javaslat` mezőbe.
   - Párhuzamosan előállítja a 1536 dimenziós szemantikus vektort (`updateIratEmbedding`), és ellenőrzi a mentett keresési riasztásokat (`checkSavedSearchesForNewIrat`).
   - Hiba esetén újrapróbálkozási számlálót (retry count) kezel és hibastátuszt rögzít.

---

## 3. Consequences (Következmények)
* **Pozitív:** A webes felület teljesen reszponzív marad; a felhasználónak nem kell másodperceket várnia az oldalbetöltéskor az AI elemzésre.
* **Üzemeltetés:** A háttér daemonokat szerver környezetben (PM2 vagy systemd szolgáltatásként) vagy felhő cron időzítéssel (Vercel Cron / GitHub Actions) kell futtatni.
