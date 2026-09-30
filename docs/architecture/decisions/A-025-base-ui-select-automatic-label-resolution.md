# A-025: [Közös] Base UI Select Automatikus Címkefeloldási Architektúra

> **Dátum:** 2026-09-30  
> **Státusz:** Decided  
> **Hatókör:** `[Közös]`  
> **Érintett fájlok:** `src/components/ui/select.tsx`, `src/components/partner-dialog.tsx`

---

## 1. Kontextus és Problémafelvetés
A projekt Next.js 15 és React 19 alapokra épül, amihez a shadcn/ui komponenskönyvtár a modern `@base-ui/react` (Base UI) motorját használja a korábbi Radix UI helyett. 

A Base UI `<SelectPrimitive.Value>` komponense zárt állapotban (amikor a lenyíló popup nincs a DOM-ban) **nem vizsgálja a gyermekelemek tartalmát**. Ha a `<Select.Root>` nem kapott explicit `items` szótárat, a kiválasztott elem felirata helyett az adatbázis-értéket / kulcsot jelenítette meg a triggerben (pl. `ceg`, `vevo`, `atutalas`, `aktiv`, vagy nyers UUID-k).

Ez a jelenség a rendszer több mint 37 különböző pontján (partnertörzs, iktatási ablak, HR modulok, keresők, sablonok) felhasználói zavart okozott.

## 2. Megfontolt Alternatívák
1. **Manuális `items` prop átadása minden egyes hívóhelyen:**  
   Minden képernyőn (37+ fájlban) manuálisan létrehozni és átadni egy `items={{ ceg: "Cég...", ... }}` objektumot a `<Select>`-nek.  
   *Elvetve:* Rendkívül redundáns, karbantartásigényes, könnyen hibázhat egy fejlesztő, és duplikálja a JSX-ben már megírt feliratokat.
2. **Visszatérés Radix UI-ra (`@radix-ui/react-select`):**  
   *Elvetve:* A Radix UI react-select csomagja React 19 alatt peer dependency konfliktusokat és hidrálási figyelmeztetéseket okoz.
3. **Központi, transzparens címkefeloldó motor a `select.tsx`-ben (Kiválasztott):**  
   A központi `Select` UI burkolókomponens rendereléskor automatikusan és rekurzívan végigolvassa a gyermekeket (`collectSelectItems`, `extractText`), előállítja az `items` szótárat az összes `SelectItem`-ből (szöveg vagy explicit `label`), és transzparensen átadja azt a Base UI belső állapotának.

## 3. Döntés
1. **`extractText` segédfüggvény:** Rekurzívan kinyeri a tiszta szöveges feliratot tetszőlegesen mély JSX struktúrákból (pl. ikonokat és stílusozó spant tartalmazó elemekből), prioritást adva az explicit `label` attribútumnak.
2. **`collectSelectItems` aggregátor:** Bejárja a `Select` gyermekeit (beleértve a listákat, csoportokat és tömböket), és létrehoz egy `{ [value]: string | ReactNode }` szótárat.
3. **`Select` komponens bővítése:**
   ```tsx
   function Select<Value = any, Multiple extends boolean = false>({
     items: explicitItems,
     children,
     ...props
   }: SelectPrimitive.Root.Props<Value, Multiple>) {
     const items = React.useMemo(() => {
       if (explicitItems) return explicitItems
       const map = collectSelectItems(children)
       return Object.keys(map).length > 0 ? map : undefined
     }, [explicitItems, children])

     return (
       <SelectPrimitive.Root items={items} {...props}>
         {children}
       </SelectPrimitive.Root>
     )
   }
   ```
4. **`SelectItem` typeahead támogatás:** A `SelectItem` a `label={textLabel}` értéket is továbbadja a Base UI-nak a billentyűzetes gyorskereséshez.

## 4. Következmények
- **Pozitívum:** Zéró hívóoldali kódmódosítással az alkalmazás **összes meglévő és jövőbeli** legördülő menüje automatikusan a megfelelő emberi feliratot jeleníti meg.
- **Pozitívum:** Megmarad a lehetőség explicit `items` vagy `label` megadására, amennyiben speciális formázás szükséges.
- **Kompromisszum:** Minimális rendereléskori fa-bejárás történik a gyerekelemeken (néhány tucat elem esetén < 0.1 ms overhead).
