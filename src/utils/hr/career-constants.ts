/**
 * eaisyHR Karrierportál & Nemzetközi ATS Konstansok és Segédfüggvények
 */

export const WORK_MODE_LABELS: Record<string, string> = {
  remote: "Távmunka (Remote)",
  hibrid: "Hibrid munkavégzés",
  irodai: "Helyszíni (On-site)",
}

export const WORK_MODE_SHORT_LABELS: Record<string, string> = {
  remote: "Remote",
  hibrid: "Hibrid",
  irodai: "Helyszíni",
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  teljes_munkaido: "Teljes munkaidő",
  reszmunkaido: "Részmunkaidő",
  vallalkozoi: "Contractor (B2B)",
  gyakornok: "Gyakornoki program",
}

export const SENIORITY_LABELS: Record<string, string> = {
  junior: "Junior",
  medior: "Medior",
  senior: "Senior",
  lead: "Lead / Principal",
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  azonnal: "Azonnal (nincs felmondási idő)",
  "2_het": "2 héten belül",
  "1_honap": "1 hónap felmondási idő",
  "2_honap": "2 hónap felmondási idő",
  "3_honap": "3 hónap vagy több",
}

export const SOURCE_LABELS: Record<string, string> = {
  karrieroldal: "Közvetlen karrieroldal",
  linkedin: "LinkedIn",
  profession: "Profession.hu",
  ajanlas: "Munkavállalói ajánlás",
  egyeb: "Egyéb forrás",
}

export const CANDIDATE_STAGE_PUBLIC_LABELS: Record<
  string,
  { label: string; description: string; stepIndex: number }
> = {
  uj: {
    label: "Pályázat beérkezett (Előszűrés alatt)",
    description:
      "Önéletrajzod és pályázati anyagod beérkezett a rendszerünkbe, HR csapatunk hamarosan áttekinti.",
    stepIndex: 1,
  },
  interju: {
    label: "Szakmai és HR interjú szakaszban",
    description:
      "Pályázatod sikeresen továbbjutott az előszűrésen, jelenleg az interjúztatási szakaszban tartunk.",
    stepIndex: 2,
  },
  ajanlat: {
    label: "Ajánlattételi szakaszban",
    description:
      "Gratulálunk! A kiválasztási folyamat utolsó, ajánlattételi szakaszában vagyunk.",
    stepIndex: 3,
  },
  elfogadva: {
    label: "Sikeres felvétel — Onboarding előkészítés",
    description:
      "Sikeresen lezárult a kiválasztási folyamat, hamarosan megkezdődik a beléptetésed (Onboarding).",
    stepIndex: 4,
  },
  elutasitva: {
    label: "Kiválasztási folyamat lezárult",
    description:
      "Köszönjük a pályázatodat és az idődet. Ebben a körben más jelölt mellett döntöttünk, adataidat a hozzájárulásodnak megfelelően kezeljük.",
    stepIndex: 0,
  },
}

/**
 * Bruttó havi bérsáv formázása magyar valutanemmel (Ft/hó)
 */
export function formatSalaryBand(
  min?: number | null,
  max?: number | null
): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => new Intl.NumberFormat("hu-HU").format(n)
  if (min && max) {
    return `Bruttó ${fmt(min)} – ${fmt(max)} Ft / hó`
  }
  if (min) {
    return `Bruttó ${fmt(min)} Ft / hó-tól`
  }
  return `Bruttó ${fmt(max!)} Ft / hó-ig`
}
