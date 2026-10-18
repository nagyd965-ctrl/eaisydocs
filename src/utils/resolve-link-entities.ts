import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Az ügyirat „Kapcsolódások” fülén megjelenő, emberi nyelvre fordított kapcsolt entitás.
 * A kulcs formátuma: `${entitas_tipus}:${entitas_id}`.
 */
export interface ResolvedLinkEntity {
  name: string
  subtitle?: string | null
  avatarUrl?: string | null
  href?: string | null
  /** A kapcsolt rekord ténylegesen feloldható volt-e (különben a fülön tartalék felirat jelenik meg). */
  available: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function linkEntityKey(type: string, id: string) {
  return `${type}:${id}`
}

/**
 * Feloldja az irat_kapcsolat sorok entitásait olvasható nevekre.
 *
 * Moduláris függetlenség: az eaisyHR-hez tartozó adatokat (hr_dokumentum, HR adatlap link) csak
 * akkor kérdezi le, ha a felhasználónak van HR modulja. Bármilyen lekérdezési hiba esetén
 * a felület tartalék felirattal működik tovább – az eaisyDocs nem függ az eaisyHR meglététől.
 */
export async function resolveLinkEntities(
  supabase: SupabaseClient,
  links: Array<{ entitas_tipus: string; entitas_id: string }>,
  opts: { hrEnabled: boolean }
): Promise<Record<string, ResolvedLinkEntity>> {
  const result: Record<string, ResolvedLinkEntity> = {}

  const idsOf = (type: string) =>
    Array.from(
      new Set(
        links
          .filter((l) => l.entitas_tipus === type && UUID_RE.test(l.entitas_id))
          .map((l) => l.entitas_id)
      )
    )

  // Munkavállalók (felhasználói profil) – profilképpel
  const employeeIds = idsOf("munkavallalo")
  if (employeeIds.length > 0) {
    const { data } = await supabase
      .from("felhasznalo_profil")
      .select("id, nev, avatar_url")
      .in("id", employeeIds)
    for (const row of (data || []) as any[]) {
      result[linkEntityKey("munkavallalo", row.id)] = {
        name: row.nev || "Névtelen munkavállaló",
        subtitle: "Munkavállaló",
        avatarUrl: row.avatar_url || null,
        href: opts.hrEnabled ? `/hr/employee/${row.id}` : null,
        available: true,
      }
    }
  }

  // Partnerek
  const partnerIds = idsOf("partner")
  if (partnerIds.length > 0) {
    const { data } = await supabase.from("partner").select("id, nev, adoszam").in("id", partnerIds)
    for (const row of (data || []) as any[]) {
      result[linkEntityKey("partner", row.id)] = {
        name: row.nev || "Névtelen partner",
        subtitle: row.adoszam ? `Adószám: ${row.adoszam}` : null,
        href: `/partners/${row.id}`,
        available: true,
      }
    }
  }

  // HR dokumentumok – csak HR modullal rendelkező felhasználónak
  const hrDocIds = idsOf("hr_dokumentum")
  if (hrDocIds.length > 0 && opts.hrEnabled) {
    const { data } = await supabase
      .from("hr_dokumentum")
      .select("id, nev, kategoria")
      .in("id", hrDocIds)
    for (const row of (data || []) as any[]) {
      result[linkEntityKey("hr_dokumentum", row.id)] = {
        name: row.nev || "HR dokumentum",
        subtitle: row.kategoria || null,
        available: true,
      }
    }
  }

  return result
}
