import { createClient } from "@/utils/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2, User, Briefcase, Landmark } from "lucide-react"
import Link from "next/link"
import { PartnerDialog } from "@/components/partner-dialog"
import { getPermissions } from "@/utils/permissions"
import { DeletePartnerButton } from "@/components/delete-partner-button"
import { Badge } from "@/components/ui/badge"

function getPartnerTypeInfo(tipus?: string | null) {
  switch (tipus) {
    case "maganszemely":
      return { label: "Magánszemély", icon: User, variant: "secondary" as const }
    case "egyeni_vallalkozo":
      return { label: "Egyéni vállalkozó", icon: Briefcase, variant: "outline" as const }
    case "intezmeny":
      return { label: "Intézmény / Hivatal", icon: Landmark, variant: "outline" as const }
    case "ceg":
    default:
      return { label: "Cég", icon: Building2, variant: "default" as const }
  }
}

export default async function PartnersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let docs_szerepkor = ''
  if (user) {
    const { data: profile } = await supabase.from('felhasznalo_profil').select('docs_szerepkor').eq('id', user.id).single()
    docs_szerepkor = profile?.docs_szerepkor || ''
  }
  const permissions = getPermissions(docs_szerepkor)

  // Fetch partners
  const { data: realPartners } = await supabase.from("partner").select("*").order("nev")

  return (
    <div className="page-animate space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partnerek</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            A rendszerben rögzített partnerek és ügyfelek listája.
          </p>
        </div>
        <div>
          {permissions.canEdit && <PartnerDialog />}
        </div>
      </div>

      <div className="border border-border/50 rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Név</TableHead>
              <TableHead>Típus</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefonszám</TableHead>
              <TableHead>Adószám</TableHead>
              {permissions.canEdit && <TableHead className="w-[90px] text-right">Műveletek</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {realPartners && realPartners.length > 0 ? (
              realPartners.map((p) => {
                const typeInfo = getPartnerTypeInfo(p.tipus)
                const Icon = typeInfo.icon
                return (
                  <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/partners/${p.id}`} className="hover:underline text-primary">
                        {p.nev}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {typeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {p.telefonszam || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {p.adoszam || "—"}
                    </TableCell>
                    {permissions.canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <PartnerDialog partner={p} iconOnly />
                          <DeletePartnerButton partnerId={p.id} partnerNev={p.nev} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={permissions.canEdit ? 7 : 6} className="h-24 text-center text-muted-foreground">
                  Nincs rögzített partner.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
