# A-056 [Közös] Base UI Dialog és Sheet Bezáró Gomb (X) Kompozíciós Szabály és Render Prop Gyermek-megőrzés

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Közös]
- **Kapcsolódó döntések:** [A-029](A-029-global-ui-consistency-and-unified-components.md), [P-043](../../product/decisions/P-043-global-ui-consistency-and-unified-components.md), [P-075](../../product/decisions/P-075-archive-and-dossier-ux-simplification-and-dialog-header-harmony.md)

## 1. Kontextus és Problémafelvetés
Az eaisyDocs és eaisyHR felületein használt `@base-ui/react` (vagy `@base-ui/react/dialog`, `@base-ui/react/sheet`) alapú dialógus és oldalpanel komponensekben rejtett, de a teljes platformot érintő renderelési hiba mutatkozott:
- A `DialogPrimitive.Close` és `SheetPrimitive.Close` komponensek deklarációja a következő volt:
  ```tsx
  <DialogPrimitive.Close
    data-slot="dialog-close"
    render={
      <Button
        variant="ghost"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        size="icon-sm"
      />
    }
  >
    <XIcon />
    <span className="sr-only">Close</span>
  </DialogPrimitive.Close>
  ```
- **A belső működési hiba ok-okozati lánca:**
  1. A Base UI `useRenderElement` függvénye a `render` propban átadott React elemet klónozza a `mergeProps(props, render.props)` segédfüggvénnyel.
  2. Amikor a `render={<Button ... />}` JSX elemben nincsenek gyermekelemek megadva, a `render.props.children` értéke expliciten `undefined`.
  3. A `mergeProps` implementációja a második paraméterből felülírja a `props.children`-t az `undefined` értékkel, ami **teljesen megsemmisíti** a `DialogPrimitive.Close` törzsébe ágyazott `<XIcon />` és `<span className="sr-only">Close</span>` elemeket.
  4. Ennek következtében a dialógus bezáró gombja egy üres, átlátszó `button` tagként került a DOM-ba, amelyen nem volt látható az `X` ikon, kizárólag az egérrel való fölémozgatáskor (`hover:bg-muted`) villant fel egy üres szürke négyzet.

## 2. Architektúra Döntés

### 2.1 Kötelező Gyermek-enkapszuláció a `render` Prop Belsejében
Rendszerszinten kötelezővé tesszük a Base UI `render` propot használó bezáró komponensek (`Dialog`, `Sheet`) definíciójában, hogy a vizuális tartalmat (ikon, akadálymentes felirat) **közvetlenül a `render` JSX elem belsejében** adjuk meg:

```tsx
// HELYES KANONIKUS MINTA (src/components/ui/dialog.tsx & sheet.tsx):
{showCloseButton && (
  <DialogPrimitive.Close
    data-slot="dialog-close"
    render={
      <Button
        variant="ghost"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        size="icon-sm"
      >
        <XIcon className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    }
  />
)}
```

### 2.2 DialogFooter Gomb Szöveg Harmonizáció
Hasonló elv érvényesül a `DialogFooter` beépített bezáró gombjánál is:
```tsx
{showCloseButton && (
  <DialogPrimitive.Close render={<Button variant="outline">Bezárás</Button>} />
)}
```

### 2.3 Fejléc Margó és Ütközésvédelem
Minden egyedi vagy többlépéses modál fejlécében (pl. `OutgoingDocumentsTab` varázsló) kötelező biztosítani legalább `pr-8` (2rem / 32px) jobboldali térközt a felső sorban, hogy a dinamikus adatok (pl. `Ügyirat: SZERZ/2026/00005`) soha ne fedjék el vagy csússzanak rá az `absolute top-4 right-4` pozíciójú bezáró ikonra.

## 3. Érintett Fájlok
- [src/components/ui/dialog.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/ui/dialog.tsx)
- [src/components/ui/sheet.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/ui/sheet.tsx)
- [src/components/outgoing-documents-tab.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/outgoing-documents-tab.tsx)

## 4. Hatások és Konzekvenciák
- **Pozitív:** A platform összes modál és sheet felületén azonnal, egérhover nélkül is tökéletesen és élesen látható a bezáró `X` ikon.
- **Megelőzés:** Megakadályozzuk, hogy a jövőben egy shadcn vagy Base UI komponens frissítéskor valaki tévesen visszarefaktorálja a hibás külső gyermekmintára a bezáró gombokat.
