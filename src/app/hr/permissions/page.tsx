import { redirect } from "next/navigation"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export default async function HrPermissionsPage() {
  const auth = await requireHrAuthServer(["admin"], "/hr")
  if (!auth.authorized || auth.hrRole !== "admin") {
    redirect("/hr")
  }
  redirect("/hr/organization?tab=permissions")
}
