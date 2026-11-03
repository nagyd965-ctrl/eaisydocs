import { getManagementSessionAction } from "./actions"
import { ManagementClient } from "./management-client"

export const dynamic = "force-dynamic"

export default async function ManagementPage() {
  const session = await getManagementSessionAction()

  return (
    <ManagementClient
      initialAuthenticated={session.authenticated}
      initialUser={session.user}
    />
  )
}
