# [Közös] BRD-003: eaisyDocs és eaisyHR Üzleti Szeparációja és Licencelhetősége

**Status:** Decided  
**Date:** 2026-09-29 (Auditálva: 2026-09-30)  
**Scope:** `[Közös]`  
**Category:** Business Model & Product Strategy  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-005](../../architecture/decisions/A-005-hr-modular-independence-architecture.md)

---

## 1. Üzleti Modell és Termékstratégia
Az eaisyDocs és az eaisyHR két különálló szellemi termék és piaci szolgáltatás:
1. **eaisyDocs:** Professzionális elektronikus iratkezelő, iktató és irattári rendszer KKV-knak és könyvelőirodáknak.
2. **eaisyHR:** Munkaügyi, bérszámfejtési adatgyűjtő, jelenléti ív, teljesítményértékelő és munkavállalói önkiszolgáló modul.

### Értékesítési Forgatókönyvek:
* **Csak Docs ügyfél:** Nem láthatja a HR menüpontokat, a rendszerének működnie kell anélkül, hogy a HR adatbázistáblákban bármilyen adat létezne.
* **Csak HR ügyfél:** Kizárólag a munkaügyi funkciókat és a dolgozói dokumentumokat éri el.
* **Kombinált ügyfél:** Teljes integráció: a HR modulban keletkező dokumentumok (jelenléti ívek, orvosi alkalmasságiak) egyetlen kattintással az eaisyDocs szabályozott irattárába kerülnek az `irat_kapcsolat` táblán keresztül.

---

## 2. Üzleti Szabályok
1. A felhasználói jogosultságok szét vannak választva: `felhasznalo_profil.docs_szerepkor` vs `felhasznalo_profil.hr_szerepkor`.
2. Egyik modul hibája vagy frissítése sem okozhat leállást a másik modulban.
3. Különálló audit napló: az iratkezelés az `esemeny_naplo`, míg a HR a `hr_esemeny_naplo` táblába rögzít.
4. A személyes és egészségügyi adatok (GDPR különleges kategória) szigorúan elhatárolt jogosultságot követelnek: az iratkezelő alapértelmezetten nem láthat bele a munkavállaló egészségügyi vizsgálati lapjába vagy titkosított béradataiba.
