import { TaskTemplate, TaskCategory, TaskPriority, TaskStatus, Task } from "@/types/tasks"

export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  // --- PÉNZÜGY / SZÁMLA ---
  {
    id: "penzugy-jovahagyas",
    cim: "Jóváhagyás és kifizetés engedélyezése",
    kategoria: "penzugy",
    leiras: "Számla alaki és tartalmi jóváhagyása, utalási csomagba helyezése és banki indítás engedélyezése.",
    alapertelmezett_hatarido_nap: 3,
    prioritas: "magas",
    isCustom: false,
  },
  {
    id: "penzugy-konyveles",
    cim: "Könyvelésre továbbítás",
    kategoria: "penzugy",
    leiras: "Számlamásolat és kísérő bizonylatok átadása a könyvelés felé kontírozásra és adóbevalláshoz.",
    alapertelmezett_hatarido_nap: 5,
    prioritas: "normal",
    isCustom: false,
  },
  {
    id: "penzugy-elteres",
    cim: "Eltérés egyeztetése partnerrel",
    kategoria: "penzugy",
    leiras: "Mennyiségi, összegbeli vagy teljesítési eltérés tisztázása a kiállító partnerrel vagy reklamáció benyújtása.",
    alapertelmezett_hatarido_nap: 2,
    prioritas: "surgos",
    isCustom: false,
  },

  // --- SZERZŐDÉS / JOGI ---
  {
    id: "szerzodes-jogi-felulvizsgalat",
    cim: "Jogi felülvizsgálat",
    kategoria: "szerzodes",
    leiras: "Szerződéstervezet jogi kockázatainak, kötbér- és felmondási feltételeinek véleményezése.",
    alapertelmezett_hatarido_nap: 5,
    prioritas: "normal",
    isCustom: false,
  },
  {
    id: "szerzodes-vezetoi-ellenjegyzes",
    cim: "Vezetői ellenjegyzés",
    kategoria: "szerzodes",
    leiras: "Cégjegyzésre jogosult vezető / igazgató jóváhagyása és parafálása az aláírás előtt.",
    alapertelmezett_hatarido_nap: 2,
    prioritas: "magas",
    isCustom: false,
  },
  {
    id: "szerzodes-alairas-kikuldes",
    cim: "Aláírásra kiküldés és partneri példány",
    kategoria: "szerzodes",
    leiras: "Cégszerűen aláírt szerződéspéldányok postázása vagy elektronikus továbbítása (AVDH/e-szignó) a partnerhez.",
    alapertelmezett_hatarido_nap: 3,
    prioritas: "normal",
    isCustom: false,
  },

  // --- SZÁLLÍTMÁNYOZÁS (CMR) ---
  {
    id: "szallitmanyozas-fuvardij",
    cim: "Fuvardíj egyeztetés és elszámolás",
    kategoria: "szallitmanyozas",
    leiras: "Fuvarmegbízás díjtételének, feláraknak és paritásának egyeztetése a fuvarszámlával.",
    alapertelmezett_hatarido_nap: 3,
    prioritas: "normal",
    isCustom: false,
  },
  {
    id: "szallitmanyozas-hianyzo-igazolas",
    cim: "Hiányzó igazolás pótlása (CMR / Szállítólevél)",
    kategoria: "szallitmanyozas",
    leiras: "Átvételi elismervény, záradékolt CMR példány vagy szállítólevél sürgős bekérése a fuvarozótól.",
    alapertelmezett_hatarido_nap: 2,
    prioritas: "surgos",
    isCustom: false,
  },

  // --- HR / MUNKAÜGY ---
  {
    id: "hr-munkaszerzodes",
    cim: "Munkaszerződés és belépési csomag aláíratása",
    kategoria: "hr",
    leiras: "Munkaszerződés, munkaköri leírás, Mt. 46. § tájékoztató és nyilatkozatok átadása és visszavétele.",
    alapertelmezett_hatarido_nap: 2,
    prioritas: "surgos",
    isCustom: false,
  },
  {
    id: "hr-orvosi-vizsgalat",
    cim: "Orvosi alkalmasság ellenőrzése",
    kategoria: "hr",
    leiras: "Foglalkozás-egészségügyi vizsgálat beütemezése és érvényes alkalmassági igazolás bekérése.",
    alapertelmezett_hatarido_nap: 7,
    prioritas: "normal",
    isCustom: false,
  },
  {
    id: "hr-kilepo-papírok",
    cim: "Kilépő papírok átadása és eszközök visszavétele",
    kategoria: "hr",
    leiras: "Kilépő igazolások átadása, munkaköri átadás-átvételi jegyzőkönyv és eszközök leltár szerinti visszavétele.",
    alapertelmezett_hatarido_nap: 1,
    prioritas: "surgos",
    isCustom: false,
  },
]

export interface TaskCategoryDefinition {
  id: TaskCategory
  nev: string
  shortLabel: string
  badgeClass: string
  icon: string
}

export interface TaskPriorityDefinition {
  id: TaskPriority
  nev: string
  badgeClass: string
  dotClass: string
}

export const TASK_CATEGORIES: TaskCategoryDefinition[] = [
  {
    id: "penzugy",
    nev: "Pénzügy / Számla",
    shortLabel: "Pénzügy",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: "CreditCard",
  },
  {
    id: "szerzodes",
    nev: "Szerződés / Jogi",
    shortLabel: "Szerződés",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    icon: "FileText",
  },
  {
    id: "szallitmanyozas",
    nev: "Szállítmányozás (CMR)",
    shortLabel: "Szállítmányozás",
    badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
    icon: "Truck",
  },
  {
    id: "hr",
    nev: "HR / Munkaügy",
    shortLabel: "HR",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: "Users",
  },
  {
    id: "egyeb",
    nev: "Egyedi feladat",
    shortLabel: "Egyedi",
    badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    icon: "CheckSquare",
  },
]

export const TASK_PRIORITIES: TaskPriorityDefinition[] = [
  {
    id: "alacsony",
    nev: "Alacsony",
    badgeClass: "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400",
    dotClass: "bg-slate-400",
  },
  {
    id: "normal",
    nev: "Normál",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
  {
    id: "magas",
    nev: "Magas",
    badgeClass: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  {
    id: "surgos",
    nev: "Sürgős",
    badgeClass: "border-destructive/40 bg-destructive/15 text-destructive font-semibold",
    dotClass: "bg-destructive animate-pulse",
  },
]

export const CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; shortLabel: string; badgeClass: string; icon: string }
> = {
  penzugy: {
    label: "Pénzügy / Számla",
    shortLabel: "Pénzügy",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: "CreditCard",
  },
  szerzodes: {
    label: "Szerződés / Jogi",
    shortLabel: "Szerződés",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    icon: "FileText",
  },
  szallitmanyozas: {
    label: "Szállítmányozás (CMR)",
    shortLabel: "Szállítmányozás",
    badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
    icon: "Truck",
  },
  hr: {
    label: "HR / Munkaügy",
    shortLabel: "HR",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: "Users",
  },
  egyeb: {
    label: "Egyedi feladat",
    shortLabel: "Egyedi",
    badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    icon: "CheckSquare",
  },
}

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  alacsony: {
    label: "Alacsony",
    badgeClass: "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400",
    dotClass: "bg-slate-400",
  },
  normal: {
    label: "Normál",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
  magas: {
    label: "Magas",
    badgeClass: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  surgos: {
    label: "Sürgős",
    badgeClass: "border-destructive/40 bg-destructive/15 text-destructive font-semibold",
    dotClass: "bg-destructive animate-pulse",
  },
}

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badgeClass: string }
> = {
  nyitott: {
    label: "Nyitott",
    badgeClass: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
  },
  folyamatban: {
    label: "Folyamatban",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  varakozik: {
    label: "Várakozik",
    badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  kesz: {
    label: "Befejezve",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  elutasitott: {
    label: "Elutasítva",
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
  },
}

/**
 * Gracefully parses a task to ensure kategoria, prioritas, and indoklas are extracted
 * even if stored as fallback tags or plain text.
 */
export function parseTaskMetadata(task: Partial<Task> & { leiras: string }): {
  displayTitle: string
  kategoria: TaskCategory
  prioritas: TaskPriority
  indoklas: string | null
  reszletek: string | null
} {
  let rawText = (task.leiras || "").trim()
  let kategoria: TaskCategory = (task.kategoria as TaskCategory) || "egyeb"
  let prioritas: TaskPriority = (task.prioritas as TaskPriority) || "normal"
  let indoklas: string | null = task.indoklas || null
  let reszletek: string | null = task.reszletek || null

  // 1. Structured metadata tag [kategoria | prioritas] leválasztása az elejéről (többsoros támogatással)
  const metaMatch = rawText.match(/^\[(.*?)\]\s*([\s\S]*)$/)
  if (metaMatch) {
    const metaHeader = metaMatch[1]
    rawText = metaMatch[2].trim()

    const metaParts = metaHeader.split("|").map((p) => p.trim().toLowerCase())
    for (const part of metaParts) {
      if (
        part.includes("pénz") ||
        part.includes("penzugy") ||
        part.includes("számla") ||
        part.includes("szamla")
      ) {
        kategoria = "penzugy"
      } else if (
        part.includes("szerz") ||
        part.includes("szerzodes") ||
        part.includes("jogi")
      ) {
        kategoria = "szerzodes"
      } else if (
        part.includes("szállít") ||
        part.includes("szallitmanyozas") ||
        part.includes("cmr")
      ) {
        kategoria = "szallitmanyozas"
      } else if (
        part.includes("hr") ||
        part.includes("munka") ||
        part.includes("ugyintezes")
      ) {
        kategoria = "hr"
      }

      if (part.includes("sürg") || part.includes("surgos")) {
        prioritas = "surgos"
      } else if (part.includes("magas")) {
        prioritas = "magas"
      } else if (part.includes("alacsony")) {
        prioritas = "alacsony"
      } else if (part.includes("normál") || part.includes("normal")) {
        prioritas = "normal"
      }
    }
  }

  // 2. Ha a szövegben sortörés van: az 1. sor a tiszta cím, a többi a részletes instrukció
  let title = rawText
  if (rawText.includes("\n")) {
    const lines = rawText.split("\n")
    title = lines[0].trim()
    const body = lines.slice(1).join("\n").trim()
    if (body && !reszletek) {
      reszletek = body
    }
  } else {
    // Ha nem volt newline, de van olyan ismert sablon, aminek a címe a szöveg elején szerepel:
    for (const tpl of DEFAULT_TASK_TEMPLATES) {
      if (rawText.startsWith(tpl.cim) && rawText.length > tpl.cim.length) {
        const potentialDesc = rawText.substring(tpl.cim.length).trim()
        if (potentialDesc.length > 5) {
          title = tpl.cim
          if (!reszletek) {
            reszletek = potentialDesc
          }
          if (kategoria === "egyeb") kategoria = tpl.kategoria
          if (prioritas === "normal" && tpl.prioritas) prioritas = tpl.prioritas
          break
        }
      }
    }
  }

  // 3. Embedded JSON <!--meta:{...}--> kezelése ha létezik
  const jsonMatch = title.match(/<!--meta:(.*?)-->/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (parsed.kategoria) kategoria = parsed.kategoria
      if (parsed.prioritas) prioritas = parsed.prioritas
      if (parsed.indoklas) indoklas = parsed.indoklas
      if (parsed.reszletek) reszletek = parsed.reszletek
      title = title.replace(jsonMatch[0], "").trim()
    } catch {
      // ignore
    }
  }

  return {
    displayTitle: title,
    kategoria,
    prioritas,
    indoklas,
    reszletek,
  }
}
