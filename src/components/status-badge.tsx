import { Badge } from "@/components/ui/badge"

const statusMap: Record<string, string> = {
  iktatva: "Iktatva",
  szignalt: "Szignált",
  ugyintezes_alatt: "Ügyintézés alatt",
  elintezett: "Elintézett",
  lezart: "Lezárt",
  irattarban: "Irattárban",
  selejtezheto: "Selejtezhető",
  selejtezett: "Selejtezett"
}

export function StatusBadge({ status }: { status: string }) {
  const displayStatus = statusMap[status] || status.replace('_', ' ')

  if (status === "lezart" || status === "elintezett" || status === "irattarban") {
    return <Badge variant="outline" className="bg-success-subtle text-success border-success-subtle">{displayStatus}</Badge>
  }
  if (status === "ugyintezes_alatt" || status === "iktatva") {
    return <Badge variant="outline" className="bg-info-subtle text-info border-info-subtle">{displayStatus}</Badge>
  }
  if (status === "szignalt") {
    return <Badge variant="outline" className="bg-warning-subtle text-warning border-warning-subtle">{displayStatus}</Badge>
  }
  if (status === "selejtezheto" || status === "selejtezett") {
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{displayStatus}</Badge>
  }
  return <Badge variant="outline">{displayStatus}</Badge>
}
