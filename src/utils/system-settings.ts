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
 */
export async function isFourEyesDisposalRequired(): Promise<boolean> {
  const setting = await getSystemSetting<{ kotelezo?: boolean }>(
    "negy_szem_elve_selejtezesnel",
    { kotelezo: true }
  )
  return setting?.kotelezo !== false
}
