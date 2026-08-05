import { headers } from "next/headers"

/**
 * Kinyeri az IP-címet és user-agent-et a request fejlécekből
 * Használat: server action-ökben az esemenynapló INSERT-ekhez
 */
export async function getClientInfo() {
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headersList.get("x-real-ip")
    || "unknown"
  const userAgent = headersList.get("user-agent") || "unknown"
  return { ip, userAgent }
}
