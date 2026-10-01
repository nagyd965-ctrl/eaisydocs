# P-028: [HR] Foglalkozás-egészségügyi Alkalmassági Vizsgálatok Dokumentumkezelése és Érvényesség UX

**Státusz:** Elfogadva  
**Dátum:** 2026-10-01  
**Hatókör:** [HR] / [Docs]  
**Kapcsolódó döntések:** P-016, P-025, P-026, ADR-021  

---

## 1. Kontextus és Problémafelvetés
A munkavállalói portálon (`/hr/self-service/profile`) az orvosi alkalmassági vizsgálat érvényességi idejének megjelenítése hibás volt: a múltbeli, már lejárt dátumok (pl. `2025. október 10.`) esetén is „Hamarosan lejár” figyelmeztetés jelent meg a helyes „Lejárt!” státusz helyett, mivel a negatív időkülönbség (`diff < 30 nap`) figyelmeztetésként lett értelmezve.

Emellett a HR adminisztrációs felületen (`/hr/employee/[id]` -> `Bizalmas HR adatok` -> `Orvosi Alkalmassági Vizsgálatok`) az orvosi vizsgálatok rögzítésekor hiányzott a hivatalos lelet / igazolás csatolásának (feltöltésének), valamint a 33/1998. (VI. 24.) NM rendelet szerinti hivatalos A4-es Alkalmassági Vélemény generálásának és eaisyDocs személyi dossziéba történő iktatásának lehetősége.

---

## 2. Megoldási Döntések

### 2.1. Érvényességi Állapotok Pontosítása (Self-Service Profil)
Az orvosi érvényességi idő három egyértelmű állapotra lett bontva:
1. **Lejárt (`diff < 0`):**
   - Piros (`text-destructive`, `bg-destructive/10`, `border-destructive/30`) kiemelés mind az info chipben, mind az adatkártyán.
   - Címke: „Lejárt!” (megegyezően a felső értesítési központ szövegezésével).
2. **Hamarosan lejár (`0 <= diff < 30 nap`):**
   - Borostyán sárga (`text-warning`, `bg-warning-subtle`, `border-warning/30`) kiemelés.
   - Címke: „Hamarosan lejár”.
3. **Érvényes (`diff >= 30 nap`):**
   - Zöld / neutrális diszkrét megjelenés: „Érvényes”.

### 2.2. Hivatalos Lelet Csatolása és Automatikus PDF Generálás
Az „Új orvosi vizsgálat rögzítése” űrlap kiegészült:
- **Opcionális fájlfeltöltés:** PDF vagy kép formátumú szkennelt lelet csatolható, amely az `irat_files` Supabase storage vödörbe kerül (`medical/${employeeId}/...`).
- **Automatikus jogszabályi generálás:** Ha nincs feltöltött fájl, a rendszer a 33/1998. (VI. 24.) NM rendelet szerinti, A4-es, nyomtatható és hivatalos „Elsőfokú Munkaköri Alkalmassági Vélemény” PDF-et generálja a munkavállaló adataival, munkakörével, orvosi minősítésével és jogorvoslati záradékával.
- **Orvos és szakrendelő adatai:** Megadható a vizsgáló szakorvos neve és a foglalkozás-egészségügyi szolgálat megnevezése.

### 2.3. Táblázat Műveletek és eaisyDocs Személyi Dosszié Iktatás
A vizsgálatok táblázatában minden sor az alábbi műveletekkel bővült:
1. 👁️ **Megtekintés:** In-browser PDF előnézet `PdfViewerDialog` modálban.
2. 📥 **Letöltés:** Közvetlen PDF letöltés.
3. 📁 **Iktatás eaisyDocs-ba:**
   - Hivatalos eaisyDocs iktatás a dolgozó személyi dossziéjába (`HR/...` iktatószám).
   - `3.1 - HR és Munkaügyi iratok` megőrzési tételszám, 50 év megőrzési idő (Mt. 134. §), `bizalmas` minősítés (GDPR 9. cikk).
   - Iktatás után a sorban megjelenik az `Iktatva: HR/...` jelvény, amely közvetlenül az eaisyDocs dossziéba navigál.
4. 🗑️ **Törlésvédelem:**
   - Iktatott orvosi irat az audit integritás és a levéltári törvény értelmében **nem törölhető** (gomb inaktív magyarázó tooltip-pel).
   - Csak a még nem iktatott vázlatok törölhetők megerősítő modál után.
