# [Docs] P-021: Kötegelt Szkenner Elválasztólap Generátor UX

## 1. Kontextus és Célkitűzés
A papíralapú iratok kötegelt digitalizálásakor elengedhetetlen, hogy az egymás után beolvasott többoldalas dokumentumokat a szkenner és a feldolgozó motor automatikusan szét tudja választani különálló iratokra. Erre a célra szabványos, géppel felismerhető QR kóddal és vonalkóddal ellátott elválasztólapok szolgálnak.

## 2. Érintett Képernyők és Végpontok
- **PDF generáló végpont:** `/api/scanner/separator-sheet` (`src/app/api/scanner/separator-sheet/route.ts`)
- **UI hivatkozás:** Érkeztetési felület (`/inbox`, `scanner-actions.ts`)
- **Funkció:**
  - Egyetlen kattintással letölthető és kinyomtatható A4-es méretű PDF elválasztólap.
  - A lap közepén magas kontrasztú, a szkenner worker által felismerhető jelzés található.
  - A szkennerbe helyezett kötegben a dokumentumok közé illesztve a háttérmotor a lap érzékelésekor automatikusan elvágja a PDF-et és új iratot hoz létre.
