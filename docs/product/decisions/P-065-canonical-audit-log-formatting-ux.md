# P-065: Érthető és Kifejező Eseménynapló UX Tervezés [Docs]

> **Státusz:** Decided  
> **Dátum:** 2026-10-10  
> **Hatókör:** `[Docs]` (eaisyDocs felhasználói felület & iratkezelési audit napló)  
> **Kapcsolódó döntések:** [P-043](./P-043-global-ui-consistency-and-unified-components.md), [P-064](./P-064-embedded-task-composer-and-ai-reply-wizard-ux.md), [A-046](../../architecture/decisions/A-046-canonical-audit-log-formatting-engine.md)  
> **Érintett komponensek:** `src/app/dossiers/[id]/page.tsx`, `src/app/inbox/view/[id]/page.tsx`, `src/components/timeline.tsx`, `src/utils/audit-log-formatter.ts`

---

## 1. Felhasználói Igény és Problémafelvetés
A felhasználói visszajelzés rámutatott az eaisyDocs egyik legzavaróbb hiányosságára:
> *„Egész eaisydocsban javítani kellene a napló működését, mert kb. mindenre azt írja csak, hogy ügyirat módosítva. Ki kellene írni normálisan mindig, hogy pontosan mi történt röviden tömören érthetően, hasonlóan mint az elején pl. hogy »Ügyirat iktatva«.”*

Korábban a felhasználó az eseménynapló megnyitásakor 8-10 egymás alatti sorban ugyanazt az „Ügyirat módosítva” szöveget látta, ceruza ikonnal. Ahhoz, hogy kiderítse, valójában egy válaszlevél ment ki, feladatot írtak ki vagy belső megjegyzés született, a másodlagos apróbetűs indoklásokat kellett böngésznie.

---

## 2. Termék és UX Megoldás

### 2.1. Pontos, Szemantikus Eseménycímek (Action-First Titles)
Az idővonalon minden tétel kiemelt, félkövér címmel jelzi a konkrét eseményt:
* **Ügyirat iktatva** (zöld/primary, `FolderPlus` ikon)
* **Új feladat kiírva** (borostyán sárga, `ListTodo` ikon)
* **Feladat elvégezve** (zöld, `CheckCircle` ikon)
* **Feladat törölve** (diszkrét szürke, `Trash2` ikon)
* **Kimenő válaszlevél előállítva** (primary/teal, `FileText` ikon)
* **Válaszlevél kiküldve (E-mail)** (primary, `Mail` ikon)
* **Válaszlevél feladva (Posta)** (primary, `Send` ikon)
* **Kimenő piszkozat törölve** (szürke, `Trash2` ikon)
* **Belső megjegyzés rögzítve** (kék, `MessageSquare` ikon)
* **Ügyirat lezárva** (zöld, `Lock` ikon)
* **Ügyirat elintézve** (zöld, `CheckCircle` ikon)
* **Hozzáférés engedélyezve** (zöld, `Shield` ikon)
* **Hozzáférés visszavonva** (borostyán, `Shield` ikon)
* **Dokumentum megtekintve** (szürke, `Eye` ikon)

### 2.2. Duplikációmentes, Értelmes Alcímek
* Megszűnt a „Megjegyzés hozzáadva / Megjegyzés hozzáadva” redundancia: a rendszer magát a megjegyzés valós szövegét (idézőjelben) jeleníti meg.
* A feladatoknál a cím a feladat nevét, prioritását és kategóriáját jeleníti meg letisztult formátumban.
* Az e-mailes kiküldéseknél a címzett e-mail címe és a mellékelt fájlok nevei jelennek meg közvetlenül.

### 2.3. Vizuális Rendszerintegritás
* Megmarad a Linear-flat minimalizmus: nincsenek harsány hátterek, nincsenek hover shadow-k.
* A finom kör alakú ikonok az esemény típusának megfelelő szemantikus színt kapnak (`text-primary`, `text-success`, `text-warning`, `text-info`, `text-muted-foreground`).

---

## 3. Értékelés és Hatás
A javítás nyomán az eseménynapló nem egy technikai adatbázis-naplónak tűnik a felhasználó számára, hanem egy átlátható, beszédes és professzionális ügyirat-történetnek.
