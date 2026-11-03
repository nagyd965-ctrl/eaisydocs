/**
 * Alszám-allokációs segédfüggvények párhuzamos iktatás / válaszlevél-mentés
 * versenyhelyzetek (23505 unique collision) újrapróbálkozásos kezeléséhez.
 */

function isAlszamUniqueCollision(error: any): boolean {
  if (!error) return false
  const code = String(error.code || "")
  const message = String(error.message || "").toLowerCase()
  const details = String(error.details || "").toLowerCase()
  return (
    code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("alszam") ||
    details.includes("alszam")
  )
}

export async function computeNextAlszam(
  supabase: any,
  ugyiratId: string
): Promise<{ alszam: number; error: any }> {
  const { data: iratok, error } = await supabase
    .from("irat")
    .select("alszam")
    .eq("ugyirat_id", ugyiratId)

  if (error) {
    return { alszam: 1, error }
  }

  const maxAlszam =
    iratok?.reduce((max: number, i: any) => Math.max(max, Number(i?.alszam) || 0), 0) || 0

  return { alszam: maxAlszam + 1, error: null }
}

/**
 * Új kimenő irat beszúrása a következő szabad alszámmal,
 * 23505 (unique) ütközés esetén automatikus újraszámolással és újrapróbálkozással.
 */
export async function insertIratWithNextAlszam(
  supabase: any,
  ugyiratId: string,
  buildPayload: (alszam: number) => Record<string, any>,
  maxRetries = 3
): Promise<{ data: { id: string; alszam: number } | null; error: any }> {
  let lastError: any = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { alszam, error: calcError } = await computeNextAlszam(supabase, ugyiratId)
    if (calcError) {
      return { data: null, error: calcError }
    }

    const payload = buildPayload(alszam)
    const { data, error } = await supabase
      .from("irat")
      .insert(payload)
      .select("id")
      .single()

    if (!error && data?.id) {
      return { data: { id: data.id, alszam }, error: null }
    }

    lastError = error
    if (isAlszamUniqueCollision(error) && attempt < maxRetries - 1) {
      continue
    }
    break
  }

  return { data: null, error: lastError }
}

/**
 * Meglévő (érkeztetett) irat ügyiratba iktatása atomi `.is("ugyirat_id", null)`
 * ellenőrzéssel és alszám-ütközés (`23505`) elleni újrapróbálkozással.
 */
export async function updateIratWithNextAlszam(
  supabase: any,
  iratId: string,
  ugyiratId: string,
  initialAlszam: number | null,
  buildPayload: (alszam: number) => Record<string, any>,
  maxRetries = 3
): Promise<{
  updatedRows: Array<{ id: string }> | null
  alszam: number
  error: any
}> {
  let lastError: any = null
  let currentAlszam = initialAlszam ?? 1

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (initialAlszam !== null && attempt === 0) {
      currentAlszam = initialAlszam
    } else {
      const { alszam, error: calcError } = await computeNextAlszam(supabase, ugyiratId)
      if (calcError) {
        return { updatedRows: null, alszam: currentAlszam, error: calcError }
      }
      currentAlszam = alszam
    }

    const payload = buildPayload(currentAlszam)
    const { data: updatedRows, error } = await supabase
      .from("irat")
      .update(payload)
      .eq("id", iratId)
      .is("ugyirat_id", null)
      .select("id")

    if (!error) {
      return { updatedRows: updatedRows || [], alszam: currentAlszam, error: null }
    }

    lastError = error
    if (isAlszamUniqueCollision(error) && attempt < maxRetries - 1) {
      continue
    }
    break
  }

  return { updatedRows: null, alszam: currentAlszam, error: lastError }
}
