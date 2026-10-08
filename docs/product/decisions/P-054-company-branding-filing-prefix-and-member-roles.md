# P-054: Céglogó Megjelenítés, Iktató Előtag és Tag Szerepkör Módosítás UX

**Dátum:** 2026-10-08  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Státusz:** Elfogadva  

## 1. Felhasználói Élmény és Célok
A felhasználók (különösen a cégvezetők és adminisztrátorok) számára gyors, intuitív és esztétikus Linear Flat felületet biztosítunk a vállalat arculatának, iktatási rendjének és munkatársi szerepköreinek menedzselésére.

## 2. Képernyők és Interakciók
1. **CompanySelector (Oldalsáv & Fejléc):**
   - Ha a kiválasztott céghez tartozik logó, a korábbi generikus épületikon helyett egy 28x28px lekerekített miniatűr képet jelenít meg.
   - A lenyíló cégválasztó listában minden sor mellett megjelenik a cég mini logója, segítve a gyors vizuális felismerést.
   - A ceruza (Szerkesztés) ikonnal megnyitható gyors szerkesztő modálban közvetlenül módosítható az iktató előtag is.
2. **CompanySettingsTab (Cégbeállítások):**
   - **Logó kártya:** Dedikált arculati doboz képi előnézettel, rejtett fájlfeltöltővel, és opcionális logóeltávolítás gombbal.
   - **Iktató előtag mező:** Automatikusan nagybetűssé formázott mező élő magyarázó felirattal (`pl. THINK/2026/00001`).
   - **Tagok kártya:** A sorok végén elhelyezett ceruza ikonnal megnyitható az `EditMemberRoleDialog`.
3. **EditMemberRoleDialog (Tag Szerkesztő Modál):**
   - Megjeleníti a tag nevét, email címét és azonosítóját.
   - Legördülő mezők a cég szintű jogosultsághoz (Tag vs Adminisztrátor), az eaisyDocs szerepkörhöz és az eaisyHR szerepkörhöz.
   - Kanonikus gombokkal, töltésindikátorral és azonnali toast visszajelzéssel.
