import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FolderOpen, ExternalLink, ShieldAlert } from "lucide-react"

export default async function PartnerDossiersEmbed(props: { searchParams: Promise<{ partner_id?: string }> }) {
  const searchParams = await props.searchParams
  const partner_id = searchParams.partner_id

  if (!partner_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-destructive/50" />
        <div>
          <h3 className="font-semibold text-lg text-foreground">Hiányzó paraméter</h3>
          <p className="text-sm">A partner_id URL paraméter megadása kötelező az iframe beágyazáshoz.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Lekérdezzük a partnert
  const { data: partner } = await supabase
    .from("partner")
    .select("nev, adoszam")
    .eq("id", partner_id)
    .single()

  if (!partner) {
    return notFound()
  }

  // Lekérdezzük az iratkapcsolatokat, onnan az ügyiratokat
  const { data: kapcsok } = await supabase
    .from("irat_kapcsolat")
    .select("ugyirat_id")
    .eq("entitas_tipus", "partner")
    .eq("entitas_id", partner_id)

  let ugyiratok: any[] = []

  if (kapcsok && kapcsok.length > 0) {
    const ugyiratIds = kapcsok.map(k => k.ugyirat_id).filter(id => id != null)
    
    if (ugyiratIds.length > 0) {
      const { data: fetchedUgyiratok } = await supabase
        .from("ugyirat")
        .select(`
          id,
          iktatoszam,
          iktatas_datuma,
          statusz,
          ugy:ugy_id (targy)
        `)
        .in("id", ugyiratIds)
        .order("iktatas_datuma", { ascending: false })
        
      ugyiratok = fetchedUgyiratok || []
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'iktatva': return 'bg-info/10 text-info dark:bg-info/20 dark:text-info'
      case 'szignalt': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
      case 'ugyintezes_alatt': return 'bg-warning/10 text-warning-foreground dark:bg-warning/20 dark:text-warning'
      case 'lezart': return 'bg-success/10 text-success dark:bg-success/20 dark:text-success'
      case 'irattarban': return 'bg-muted text-muted-foreground dark:bg-muted/50 dark:text-muted-foreground'
      case 'selejtezheto': return 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ')
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 text-primary font-medium">
          <FolderOpen className="h-5 w-5" />
          <span>eaisyDocs Iratkezelő — Kapcsolódó Ügyiratok</span>
        </div>
        <div className="text-sm text-muted-foreground font-semibold">
          {partner.nev}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {ugyiratok.length > 0 ? (
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Iktatószám</TableHead>
                  <TableHead>Tárgy</TableHead>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead className="text-right">Művelet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ugyiratok.map((ugyirat) => (
                  <TableRow key={ugyirat.id}>
                    <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                      {ugyirat.iktatoszam}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={ugyirat.ugy?.targy}>
                      {ugyirat.ugy?.targy}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(ugyirat.iktatas_datuma).toLocaleDateString('hu-HU')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`uppercase text-[10px] tracking-wider ${getStatusColor(ugyirat.statusz)}`}>
                        {formatStatus(ugyirat.statusz)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <a 
                        href={`/dossiers/${ugyirat.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                      >
                        Megnyitás <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mb-2 opacity-20" />
            <p>Nincs kapcsolódó ügyirat a rendszerben.</p>
          </div>
        )}
      </div>
    </div>
  )
}
