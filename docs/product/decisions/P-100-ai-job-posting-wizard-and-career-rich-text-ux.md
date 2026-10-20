# PRD P-100: AI Álláshirdetés Varázsló és Karrieroldali Rich Text Renderelés Termékkövetelmény és UX

- **Státusz:** Decided
- **Dátum:** 2026-10-20
- **Döntéshozók:** Vezető Fejlesztő, HR Termékfejlesztő
- **Hatókör:** `[HR]`
- **Kapcsolódó ADR:** [A-076](../../architecture/decisions/A-076-ai-job-posting-generator-and-secure-rich-text-rendering.md)
- **Érintett képernyők:** `/hr/recruitment` (`manage-posting-dialog.tsx`), `/karrier/[id]` (`src/app/karrier/[id]/page.tsx`), `/hr/self-service/profile` (`src/app/hr/self-service/profile/page.tsx`)

---

## 1. Felhasználói Igény és Célkitűzés

A toborzók számára a nyitott pozíciók közzététele az egyik leggyakoribb, de időigényes feladat. Az álláshirdetések minősége közvetlenül befolyásolja a jelentkezők számát és minőségét.

**Cél:**
1. A HR adminisztrátor egyetlen gombnyomással tudjon professzionális, piacképes hirdetést összeállítani a pozíció címe és a munkakör alapján.
2. A hirdetés automatikusan vegye figyelembe az aktívan kiválasztott céget és székhelyet.
3. A publikus karrieroldalon a hirdetés gazdagon formázott szövegként (headingek, felsorolások, bekezdések) jelenjen meg.
4. Az űrlapon a „Csak belső hirdetés” opció harmonikusan, aszimmetrikus törések nélkül illeszkedjen a felületbe.
5. A munkavállalói profilon a felesleges dekoratív ikonok eltávolításával megvalósuljon a tiszta flat tipográfia.

---

## 2. Képernyő és UX Tervezés

### 2.1. Hirdetéskezelő Űrlap (`ManagePostingDialog`)
- **[✨ Generálás AI-val] gomb:** A részletes leírás címkéje mellett helyezkedik el a fejlécben.
- **Dedikált AI Modál (`isAiModalOpen`):**
  - Összefoglaló kártya:
    - *Pozíció megnevezése*
    - *Belső munkakör*
    - *Hirdető szervezet:* Cég neve és városa (pl. *Think AI Kft. • Budapest*)
  - *Egyedi szempontok vagy elvárások (opcionális)* szövegdoboz: Kiegészítő utasítások (pl. home office, bónusz, technológiák).
  - Töltési állapot animált ikonnal és egyértelmű folyamatjelzéssel.
  - Generálás után automatikusan kitölti a rövid kedvcsinálót és a részletes leírást, majd tisztán bezáródik.

### 2.2. Publikus Karrieroldal (`/karrier/[id]`)
- A részletes leírás a `RichTextContent` komponensen keresztül jelenik meg.
- `@tailwindcss/typography` osztályok (`prose prose-sm max-w-none text-muted-foreground`):
  - `h3` címsorok kiemelt szövegszínnel (`text-foreground font-semibold`).
  - `ul` felsorolások rendezett behúzással és diszkrét pontozással.
  - `strong` szövegek félkövér hangsúlyozással.

### 2.3. Munkaköri Profil Tisztítás (`/hr/self-service/profile`)
- Eltávolítva a munkaköri leírás alsó szekciójának alfejléc ikonjai (Feladatok, Kompetenciák, Munkavédelem, Orvosi, Munkaköri leírás).
- Tiszta, zavartalan, flat felületi hierarchia az ADR A-029 szabvány szerint.
