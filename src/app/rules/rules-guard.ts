import { requireDocsAuthServer } from "@/utils/docs-auth-guard"

/**
 * A-097 / A-106 őrblokk a Szabályok modul ÍRÁSI műveleteihez.
 *
 * A Szabályok rész kizárólag az adott cégben érvényes adminisztrátori /
 * rendszergazdai szerepkörrel érhető el (`company_members.docs_szerepkor` / `role`).
 */
export async function requireRulesAdminAccess(targetCompanyId?: string | null): Promise<string | null> {
  const auth = await requireDocsAuthServer(["admin", "rendszergazda"], targetCompanyId)
  if (!auth.authorized) {
    return auth.error || "A Szabályok kezelése csak rendszergazdai vagy adminisztrátori szerepkörrel érhető el."
  }
  return null
}
