---
trigger: model_decision
description: Apply when creating new UI components, modifying screens, making architectural changes, or completing development sessions in eaisyDocs and eaisyHR.
---

# Dokumentációs Fegyelem és Architektúra Irányelvek (eaisyDocs & eaisyHR)

A projektben a technológiai, termék- és üzleti döntéshozatal szigorúan dokumentált a `docs/` könyvtárban.
Minden fejlesztő és AI asszisztens számára kötelező ezen irányelvek betartása.

---

## 🏛️ 1. Építészeti Döntések (ADR Fegyelem)
A technikai döntések a `docs/architecture/decisions/` mappában élnek.

### Mikor kötelező új ADR-t írni?
Csak akkor hozz létre új ADR-t, ha az alábbi 3 szűrőfeltétel mindegyike teljesül:
1. **Hard to reverse (Nehezen visszafordítható):** Ha valaki később megváltoztatja, az fájdalmas vagy kockázatos?
2. **Surprising without context (Kontextus nélkül meglepő):** Egy jövőbeli fejlesztő vagy AI megkérdezné: *"miért csinálták így?"*
3. **Real trade-off (Valódi kompromisszum):** Volt értelmes alternatíva, és tudatos okból választottuk ezt.

*Példák:*
- ✅ ADR kell: Miért a `DocumentPreviewFrame` Blob URL-t használja natív iframe helyett? (A-002)
- ✅ ADR kell: Miért szigorítottuk a selejtezési 4-szem elvet kötegelt DB vizsgálattal? (A-001)
- ❌ ADR felesleges: "A gomb háttérszíne kék lett" (Ez nem technikai architektúra).

### Lépések új ADR rögzítésekor:
1. Nyisd meg a [docs/architecture/decisions/index.md](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/architecture/decisions/index.md) fájlt.
2. Nézd meg az utolsó sorszámot (pl. `A-005` után a következő az `A-006`).
3. Hozd létre a fájlt: `docs/architecture/decisions/A-XXX-<kebab-case-cim>.md`.
4. Határozd meg a hatókört: `[Docs]`, `[HR]` vagy `[Közös]`.
5. Vezesd be az új rekordot az `index.md` táblázatába!

---

## 🎨 2. Termék és Felhasználói Felület Döntések (PRD Fegyelem)
A UI felületek, képernyők és workflow-k döntései a `docs/product/decisions/` mappában élnek.

### Mikor kell új PRD?
- Új képernyő, oldal (`page.tsx`) vagy új route jön létre.
- Alapvetően megváltozik egy meglévő képernyő működése (pl. Új interaktív Dashboard).
- Új komplex modál, split-view vagy munkafolyamat kerül kialakításra.

### Lépések új PRD rögzítésekor:
1. Nyisd meg a [docs/product/decisions/index.md](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/product/decisions/index.md) fájlt.
2. Keresd meg a következő sorszámot (pl. `P-004`).
3. Hozd létre a `docs/product/decisions/P-XXX-<kebab-case-cim>.md` fájlt a hatókör jelölésével (`[Docs]`, `[HR]`, `[Közös]`).
4. Ha új útvonal született, egészítsd ki a [docs/product/information-architecture.md](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/product/information-architecture.md) térképet!
5. Jegyezd be a PRD-t az `index.md`-be!

---

## ⚖️ 3. Üzleti Szabályok Döntései (BRD Fegyelem)
Az üzleti és jogi megfelelőségi logikák a `docs/business/decisions/` mappában élnek (`001`, `002`... formátumban).
- Minden olyan szabály ide tartozik, amely jogszabályból (pl. iktatási szabályzat, selejtezési törvény, GDPR) vagy üzleti modellből (Docs vs HR önálló értékesíthetőség) fakad.

---

## 🔄 4. Session Végi Dokumentáció Szinkronizáció
Minden fejlesztési feladat vagy session befejezésekor a fejlesztő kérésére (`"docs sync"` vagy `"dokumentáld le a sessiont"`) az AI kötelezően aktiválja az `eaisydocs-doc-sync` skillt, megvizsgálja a `git diff`-et, és azonnal legenerálja az érintett döntési dokumentumokat és frissíti a `changelog.md`-t!
