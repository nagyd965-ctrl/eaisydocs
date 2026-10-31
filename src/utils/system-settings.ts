import { createClient } from "@/utils/supabase/server"

/**
 * Lekéri a rendszerbeállítás értékét a rendszer_beallitas táblából.
 * Ha nem található vagy hiba van, a megadott defaultValue-t adja vissza.
 */
export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", key)
      .maybeSingle()

    if (error || !data) {
      return defaultValue
    }

    return (data.ertek as T) ?? defaultValue
  } catch (err) {
    console.error(`Hiba a '${key}' rendszerbeállítás lekérésekor:`, err)
    return defaultValue
  }
}

/**
 * Lekéri, hogy a selejtezésnél kötelező-e a szigorú négyszem-elv.
 * Alapértelmezett: true
 *
 * Cég-specifikus kulccsal működik (negy_szem_elve_selejtezesnel:{companyId}) —
 * a beállítás cégfüggő, B cég nem írhatja felül A cég selejtezési szigorát.
 * Ha még nincs cégspecifikus sor, a régi globális kulcsra esik vissza
 * (átmeneti kompatibilitás az első mentésig).
 */
export async function isFourEyesDisposalRequired(): Promise<boolean> {
  let companyId: string | null = null
  try {
    const { getActiveCompanyIdServer } = await import("@/utils/company-server")
    companyId = await getActiveCompanyIdServer()
  } catch {
    companyId = null
  }

  const key = companyId
    ? `negy_szem_elve_selejtezesnel:${companyId}`
    : "negy_szem_elve_selejtezesnel"

  const setting = await getSystemSetting<{ kotelezo?: boolean } | null>(key, null)

  // Nincs cégspecifikus érték → a régi globális kulcs (vagy az alapértelmezés)
  if (setting === null && companyId) {
    const legacy = await getSystemSetting<{ kotelezo?: boolean } | null>(
      "negy_szem_elve_selejtezesnel",
      null
    )
    return legacy?.kotelezo !== false
  }

  return setting?.kotelezo !== false
}
