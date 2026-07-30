# eaisyDocs - Fejlesztési és Architektúra Szabályok (Agent Guidelines)

Ezek a szabályok a `design/` mappa és az `eaisyDocs_szoftverterv.md` alapján készültek. **Minden jövőbeli fejlesztésnél (AI ügynökök számára is) kötelezően követendő alapelvek.**

> [!WARNING]
> **KONFLIKTUSFELOLDÁS ÉS SCOPE TISZTÁZÁS (Kritikus az AI számára)**
> 1. **Funkcionális Scope:** Bár a `design/` mappában lévő áttekintés (pl. `00-overview.md`) egy *eaisybill* nevű pénzügyi és bérszámfejtő platformról beszél, a mi projektünk az **eaisyDocs**. Funkcionálisan KIZÁRÓLAG az `eaisyDocs_szoftverterv.md` az irányadó (vagyis ez egy elektronikus iratkezelő rendszer). A design dokumentációban említett üzleti funkciókat (pl. számlakezelés, tranzakció párosítás) hagyd figyelmen kívül!
> 2. **Design Scope:** A `design/` mappa kizárólag a **vizuális stílus** (Tailwind konfiguráció, színek, HSL tokenek, shadcn komponensek, tipográfia) miatt van jelen. Az eaisyDocs ezt a platformszintű UI-t használja. A tokeneknél lévő "Tranzakció Típus Színek" (pl. hitel, bankdíj) irrelevánsak az iratkezelő számára. Ne alkalmazd őket! Használd a standard szemantikus színeket (`success`, `warning`, `info`, `destructive`, `primary`).
## 1. Technológiai Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui. PDF-megjelenítéshez PDF.js alapú viewer.
- **Backend / Adatbázis:** Supabase (PostgreSQL, RLS, Auth, Storage, Edge Functions).
- **Keresés:** Postgres FTS (tsvector, GIN index, `hungarian` szótár) + opcionális pgvector.


## 2. Frontend & Design Rendszer (A `design/` mappa alapján)
- **Vizuális stílus:** Linear-inspirált flat design. Nincsenek árnyékok, dark módban 1px inset border (`--shadow`, `--shadow-sm` tokenek az `index.css`-ből). A hover shadow globálisan tiltott.
- **Színrendszer:** HSL alapú CSS változók (pl. `bg-[hsl(var(--primary))]` vagy Tailwind konfigon keresztül `bg-primary`). Fintech Teal a brand szín.
- **Tipográfia:** Montserrat font. Címeknél `font-semibold` (NE `font-bold`), pénzügyi adatoknál `tabular-nums`.
- **Ikonok:** Lucide React, egységes `h-4 w-4` méretezéssel.
- **Sötét mód (Dark mode):** Kötelező. A TailwindCSS `darkMode: ["class"]` stratégiát használja. Témaváltáskor a CSS animációkat szüneteltetni kell (`.theme-switching` class).
- **Nyelv:** A UI alapértelmezett nyelve a magyar.

## 3. Backend, Adatbázis & Biztonság
- **RLS (Row Level Security):** A hozzáférés-szabályozás (ABAC/RBAC) **adatbázis szinten (RLS)** történik. Egy felhasználó láthatósága négy dimenzió metszete: *Szerepkör, Szervezeti egység, Minősítés, Explicit hozzárendelés*. API vagy frontend szinten nem bízhatunk meg a szűrésben.
- **Audit Napló (`esemeny_naplo`):** Szigorúan **append-only**. Adatbázis szinten megvont UPDATE és DELETE jogokkal. Minden esemény (érkeztetés, iktatás, letöltés, megtekintés) naplózandó.
- **Iktatószám allokáció:** Gap-mentes és sosem újrahasznosítható. Postgres tranzakción és dedikált táblán (`SELECT ... FOR UPDATE`) alapul, nem használható szimpla `SERIAL`.
- **Fájl hozzáférés és védelem:** A Supabase Storage fájlok sosem publikusak. Letöltés csak aláírt, rövid élettartamú (pl. 60s) URL-lel, Edge Function-ön keresztül történhet, amit naplózni kell. Bizalmas iratoknál alapértelmezett a vízjelezett előnézet.

## 4. Üzleti Logika & Entitások (eaisyDocs)
- **Modell hierarchia:** ÜGY (case) -> ÜGYIRAT (dossier) -> IRAT (document) -> FÁJL (példány/melléklet).
- **Érkeztetés != Iktatás:** Külön folyamatok. Egy érkeztetett iratnak nem biztos, hogy van ügyirata (és iktatószáma).
- **Egységes iratkezelés:** Nincs külön bejövő és kimenő irat adatbázistábla. Egyetlen `irat` tábla van, `irany` mezővel megkülönböztetve.
- **Verziókövetés és Integritás:** Egy irat módosítása új verziót hoz létre, a korábbi nem törlődik. Minden fájl kap egy SHA-256 hash-t, ami a naplóba is bekerül az integritás igazolására. Eredeti fájl mellé készül egy PDF/A-2b normalizált verzió.
- **Kapcsolatok:** Polimorf link tábla (`irat_kapcsolat`) az iratok és külső entitások (partner, tranzakció, számla, ERP id) összekötésére.
- **Megőrzés és Selejtezés:** Nincs automatikus törlés a lejárati idő végén! Csak selejtezési javaslat készül.

## 5. Moduláris Függetlenség (eaisyDocs vs eaisyHR)
- **Kritikus Szabály:** Az eaisyDocs és az eaisyHR két külön megvásárolható, önálló program. Közös adatbázison nyugszanak, de a fejlesztés során garantálni kell, hogy egymástól teljesen függetlenül is működőképesek maradjanak.
- **Kompatibilitás:** Egyik modul funkciója vagy adatbázis lekérdezése sem omolhat össze amiatt, ha a másik modul nincs aktiválva (vagy az ahhoz tartozó specifikus adatok hiányoznak). A jogosultságokat (`szerepkor` vs `docs_szerepkor`) is szeparáltan, de logikusan kell kezelni.
