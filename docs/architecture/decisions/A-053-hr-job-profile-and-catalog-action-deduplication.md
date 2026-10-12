# A-053: [HR] Munkaköri Profil és Törzslap Szerkesztési Architektúra, Akció-Deduplikáció és Ikon-Minimalizálás

- **Dátum:** 2026. október 12.
- **Státusz:** Elfogadva
- **Hatókör:** [HR] eaisyHR Munkaköri Rendszer, Komponens Architektúra, Dolgozói Adatlap, Linear-Flat Design Rendszer
- **Kapcsolódó döntések:** [A-029](A-029-global-ui-consistency-and-unified-components.md), [A-052](A-052-hr-job-catalog-specification-and-omnipresent-integration.md), [P-072](../product/decisions/P-072-hr-job-profile-and-catalog-ux-declutter-and-deduplication.md)

---

## 1. Kontextus és Problémafelvetés

Az A-052 / P-071 szerinti munkaköri specifikáció és integráció bevezetését követően a gyakorlati felhasználás és felületvizsgálat során három építészeti/komponens-szintű probléma mutatkozott:

1. **Komponens belső fallback gomb ellenőrizetlen renderelése:**
   - A `JobEditDialog` (`src/components/hr/job-edit-dialog.tsx`) komponens a `trigger` prop hiányában egy alapértelmezett `<Button variant="outline"><Edit /> Munkakör szerkesztése</Button>` gombot renderelt a DOM-ba.
   - Amikor a `JobActionMenu` (`src/components/hr/job-action-menu.tsx`) vezérelten (`open={editOpen} onOpenChange={setEditOpen}`) hívta meg a dialógust a táblázat soraiban, a dialógus automatikusan létrehozott egy nem kívánt második, szöveges gombot a meglévő műveleti sor (`Adatlap`, szerkesztés ceruza, törlés kuka) alá.

2. **Redundáns akció-triggerek halmozódása:**
   - A Munkaköri Részletes Adatlapon (`/hr/job/[id]/page.tsx`) a lap tetején lévő központi szerkesztő gombon kívül minden egyes információs kártya (`Munkaköri Törzs`, `Feladatok és Hatáskörök`, `Elvárt Kompetenciák`) fejlécébe bekerült egy-egy külön módosító gomb.
   - Mivel mindegyik gomb ugyanazt a háromfüles, teljeskörű modált nyitotta meg, ez felesleges kódismétlést, felesleges renderelést és zavaró felhasználói élményt okozott.

3. **Munkaköri Profil kártya akció-eloszlásának aránytalansága:**
   - Az `EmploymentTab` és a `self-service/profile` felületen a "Munkaköri Profil" kártya fejlécében duplikálva volt a hivatalos leírás megtekintése és letöltése, miközben a kártya alján lévő "Hivatalos Munkaköri Leírás" sorban már létezett a betekintő gomb, de hiányzott mellőle a letöltés.

4. **Linear-Flat Design előírások megsértése dekoratív Lucide ikonokkal:**
   - Az adatlap kártyáinak címében és mezőiben dekoratív ikonok (`ClipboardList`, `GraduationCap`, `ShieldAlert`, `Stethoscope`, `FileText`, `Building2`, `Briefcase`) jelentek meg, megsértve az `AGENTS.md` azon szabályát, mely szerint:
     > *"Dekoratív ikonok, emojik és kerekített ikondobozok használata a kártyákon szigorúan tilos. A kártyák kizárólag a tiszta adatokra és feliratokra fókuszálnak."*

---

## 2. Döntés és Megvalósítás

### 2.1. `JobEditDialog` Trigger Kezelésének Refaktorálása
- A `JobEditDialog` komponens mostantól kizárólag akkor renderel trigger elemet, ha az explicite átadásra került (`trigger ? ... : null`).
- Ha a modált egy külső komponens vezérelten (`open` és `onOpenChange`) használja — mint a `JobActionMenu` —, a dialógus láthatatlan rétegként funkcionál és nem generál semmilyen felesleges DOM elemet vagy másodlagos gombot a táblázat celláiban.

### 2.2. Entitásszintű Szerkesztési Akció-Konszolidáció
- A `/hr/job/[id]` oldalon megszüntettük a kártyánkénti szerkesztőgombokat.
- Az entitás módosítása egyetlen, kanonikus ponton történik: a jobb felső oldalfejlécben elhelyezett **`Munkakör szerkesztése`** gomb segítségével. Ez követi az eaisyHR egységes felépítését (pl. Dolgozói Adatlap fejléc, Szervezeti Egység fejléc).

### 2.3. Hivatalos Dokumentum Akció-Pár Szabványosítása
- A Munkaköri Profil kártya fejlécéből kivezetésre kerültek a redundáns gombok; ott kizárólag a `Munkakör törzslap` navigációs gomb maradt meg (munkatárs adatlap esetén).
- Az alsó hivatalos dokumentum sávban a `PdfViewerDialog` (`Betekintés`) és a közvetlen `<a download>` hivatkozás (`Letöltés`) standard és kompakt akciógomb-párt alkot (`flex items-center gap-1.5 shrink-0`).

### 2.4. Linear-Flat Ikon-Minimalizálás és Vizuális Fegyelem
- Eltávolításra került az összes nem funkcionális, pusztán dekoratív Lucide ikon az adatlapról:
  - Címkék, kártyafejlécek, fülek és jelvények: Tiszta szöveges és numerikus tipográfia (Montserrat).
  - Mezőértékek: Nincsenek felesleges mikro-ikonok a szövegek előtt.
  - Dokumentum feltöltő komponens: Törlésre került a túlméretezett üres állapot ikon és a kerekített színes ikondoboz.

---

## 3. Következmények és Eredmények

- **Karcsúbb DOM és komponensfa:** Megszűntek a felesleges dialógus példányosítások és tartalék gombok.
- **Tiszta UI architektúra:** Az akciók helye és célja kristálytiszta, nincs funkció-duplikáció.
- **Szabványosítás:** A munkaköri profil és adatlap 100%-ban illeszkedik a globális design és konzisztencia szabályzatokhoz (ADR A-029).
- **Típus- és fordítási stabilitás:** A rendszer Next.js 15 és TypeScript alatt 0 hibával fordul (`npx tsc --noEmit`).
