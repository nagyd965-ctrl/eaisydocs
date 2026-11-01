import type { SupabaseClient, User } from "@supabase/supabase-js"

/**
 * Lapozva lekéri az összes Supabase Auth felhasználót (elkerülve az alapértelmezett 50-es limitet).
 */
export async function listAllAuthUsers(
  adminClient: Pick<SupabaseClient, "auth">,
  perPage = 1000
): Promise<User[]> {
  const allUsers: User[] = []
  let page = 1

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error || !data?.users || data.users.length === 0) {
      break
    }

    allUsers.push(...data.users)

    if (data.users.length < perPage) {
      break
    }

    page += 1
    if (page > 50) {
      break
    }
  }

  return allUsers
}

