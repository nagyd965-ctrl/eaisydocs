# PRD P-081: eaisyBill Partnertörzs Importálása és Szelektív Partnerkezelés UX

- **Státusz:** Elfogadva (Accepted)
- **Dátum:** 2026-10-14
- **Hatókör:** `[Közös]` eaisyDocs & eaisyBill Integráció (Partnerek)
- **Kapcsolódó ADR:** [A-062](../../architecture/decisions/A-062-eaisybill-partner-master-import-architecture.md)

---

## 1. Felhasználói Igény és Célkitűzés
Az eaisyDocs rendszerben a partnerek kezelése a mindennapi iratkezelési és iktatási munka alapköve. Amikor a felhasználó egy olyan vállalkozást választ ki (pl. `SANDBOX`), amelynek az eaisyBill-ben már rendelkezésre áll egy feltöltött partnertörzse, alapvető elvárás, hogy a partnereket ne kelljen manuálisan újra begépelni.

A felhasználói felület célja:
1. Közvetlenül az **`+ Új Partner`** gomb mellett helyezkedjen el a finom szaggatott szegélyű **`Importálás eaisyBill-ből`** gomb (`CloudDownload` ikonnal).
2. A gombra kattintva egy áttekinthető, modern, Linear-flat stílusú modális ablak jelenjen meg.
3. A dialógus mutassa meg a cég eaisyBill partnereit, az importálható és a már korábban importált partnerek darabszámát.
4. Biztosítson azonnali keresést (név, adószám, székhely, e-mail szerint) és szűrőket (`Mind`, `Csak új`, `Vevők`, `Szállítók`).
5. Biztosítson mind egyedi, mind tömeges kijelölést ("Összes új partner kijelölése"), a már meglévő partnerek duplikációjának megakadályozásával.

---

## 2. Képernyők és Komponensek Felépítése

### 2.1 Elhelyezés a Partnerek Táblázat Eszköztárában (`TableToolbar`)
A partnerek nézetében a szabványos `TableToolbar` `actions` zónájában:
```tsx
<div className="flex items-center gap-2">
  <EaisyBillPartnerImportDialog />
  <PartnerDialog />
</div>
```
A gomb megjelenése:
- Szaggatott, visszafogott türkiz keret (`border-dashed border-primary/40`).
- Hover állapotban enyhe háttérkiemelés (`hover:bg-primary/5 hover:border-primary`).
- Ikon: `CloudDownload` (h-4 w-4).

### 2.2 Az Import Modál Felépítése (`EaisyBillPartnerImportDialog`)
1. **Fejléc:**
   - Cím és leírás a forrás cég nevével.
   - Összesítő statisztikai sáv: összes partner, új importálható, már importálva, kijelölve (pl. `36 db`).
2. **Kereső & Szűrősáv:**
   - Keresőmező azonnali gépelésre szűréssel és gyors törlő `X` gombbal.
   - Szűrőgombok: `Mind (36)`, `Csak új (36)`, `Vevők (18)`, `Szállítók (18)`.
3. **Táblázat Nézet:**
   - Fejléc szintű checkbox az összes látható, új partner egyidejű kijelöléséhez / törléséhez.
   - Oszlopok: Kijelölés, Név & Székhely / E-mail, Adószám / EU adószám, Típus (Vevő / Szállító badge), Állapot (`Már importálva` zöld ikonnal vagy `Importálható`).
   - A már importált partnerek sorai áttetszőbbek (`opacity-60`), a checkboxuk letiltott, kizárva a véletlen újraimportálást.
4. **Lábléc:**
   - Kijelölési számláló: `X partner kijelölve az importálásra`.
   - `Mégse` és `Importálás (X)` gombok loader animációval a művelet közben.

### 2.3 Partner Adatlap és Iratforgalom Szinkronizáció (`PartnerInvoiceSyncButton`)
A Partner részletes adatlapján (`/partners/[id]`):
1. **Dedikált Manuális Szinkronizáló Gomb (`PartnerInvoiceSyncButton`):**
   - Az adatlap fejlécében helyezkedik el a `Számlák szinkronizálása` gomb (`RefreshCw` ikonnal).
   - Kattintáskor forog az ikon, elvégzi az eaisyBill lekérdezést, majd Sonner toast visszajelzést ad (`X db eaisyBill számla sikeresen szinkronizálva!`), és frissíti a nézetet (`router.refresh()`).
2. **Különválasztott Irány és Azonosító Jelölés:**
   - **Bejövő számla:** Zöld lefelé nyíl, generált érkeztetőszám (`E/2026/000123`), eladó neve a tárgyban.
   - **Kimenő számla:** Kék felfelé nyíl, a bizonylatsorszám (pl. `NAV-2026-OUT01`), vevő neve a tárgyban.
3. **Fejléc Akciógombok Elrendezése és Tisztítása:**
   - Az akciógombok (`Számlák szinkronizálása`, `Új szerződés generálása`, `+ Új Kapcsolattartó`, `Szerkesztés`) egységesen jobbra zártak (`justify-end sm:ml-auto shrink-0`).
   - A redundáns „Új Irat érkeztetése” gomb eltávolításra került a fejlécből, tisztán tartva a partner adatlapot.
4. **Fülek Tipográfiája és Minimalizmusa:**
   - A fülek (`Iratforgalom`, `Kapcsolattartók`, `Csatolt Ügyek`) letisztult, ikonok és zárójeles darabszámok nélküli szöveges címkékkel jelennek meg, illeszkedve a flat designhoz.
5. **Azonnali Előnézet és Fájlmegnyitás:**
   - A táblázat soraiban a megtekintés (szem) gombra kattintva a kánonikus `DocumentViewer` közvetlenül az eaisyBill biztonságos storage URL-jéről tölti be a PDF-et, vízjellel és eseménynaplózással támogatva.

---

## 3. Vizuális és Üzleti Eredmény
- A felhasználó másodpercek alatt át tudja hozni akár egyenként a kívánt partnereit, akár a komplett partnertörzsét.
- A partnerekhez tartozó PDF számlák azonnal, duplikációmentesen megjelennek a partner adatlapján az Iratforgalomban.
- A rendszer megerősítő Sonner toast üzenetet jelenít meg a sikeres műveletekről.
- A felület letisztult, stabil és gyors, minimalista fülekkel és precízen jobbra zárt akciógombokkal.
