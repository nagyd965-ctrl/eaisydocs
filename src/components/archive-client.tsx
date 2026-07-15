"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { scrapDossier } from "@/app/archive/actions"
import { useRouter } from "next/navigation"

export function ArchiveClient({
  archivedDossiers,
  scrappingSuggestions,
  scrappedDossiers
}: {
  archivedDossiers: any[]
  scrappingSuggestions: any[]
  scrappedDossiers: any[]
}) {
  const router = useRouter()
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

  const handleScrap = async (id: string) => {
    setLoadingIds(prev => ({ ...prev, [id]: true }))
    const result = await scrapDossier(id)
    if (result.error) {
      alert(result.error)
    }
    setLoadingIds(prev => ({ ...prev, [id]: false }))
    router.refresh()
  }

  return (
    <Tabs defaultValue="suggestions" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="suggestions" className="relative">
          Javaslatok
          {scrappingSuggestions.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
              {scrappingSuggestions.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="archived">Irattárban</TabsTrigger>
        <TabsTrigger value="scrapped">Selejtezett</TabsTrigger>
      </TabsList>

      <TabsContent value="suggestions" className="mt-6">
        <div className="border rounded-md bg-card">
          <div className="p-4 bg-muted/30 border-b flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Selejtezési Javaslatok</p>
              <p className="text-muted-foreground">Ezeknek az ügyiratoknak lejárt a törvényi megőrzési ideje. Az ügyiratok metaadatait és fájljait nem töröljük automatikusan. A "Selejtezés" gomb megnyomásával a státuszuk véglegesen selejtezhetőre változik.</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Iktatószám</TableHead>
                <TableHead>Ügy Tárgya</TableHead>
                <TableHead>Iratok száma</TableHead>
                <TableHead>Megőrzés Vége</TableHead>
                <TableHead className="text-right">Művelet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scrappingSuggestions.length > 0 ? (
                scrappingSuggestions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-primary">{item.iktatoszam}</TableCell>
                    <TableCell>{item.ugy?.targy}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.irat[0]?.count || 0} db irat</Badge>
                    </TableCell>
                    <TableCell className="text-destructive font-medium tabular-nums">
                      {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "Ismeretlen"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={loadingIds[item.id]}
                        onClick={() => handleScrap(item.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {loadingIds[item.id] ? "Folyamatban..." : "Selejtezés"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>Nincsenek selejtezésre váró ügyiratok.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="archived" className="mt-6">
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Iktatószám</TableHead>
                <TableHead>Ügy Tárgya</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead>Iratok száma</TableHead>
                <TableHead>Megőrzés Vége</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedDossiers.length > 0 ? (
                archivedDossiers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.iktatoszam}</TableCell>
                    <TableCell>{item.ugy?.targy}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{item.statusz}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.irat[0]?.count || 0} db irat</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Még nincsenek irattárban lévő ügyiratok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="scrapped" className="mt-6">
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Iktatószám</TableHead>
                <TableHead>Ügy Tárgya</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead>Iratok száma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scrappedDossiers.length > 0 ? (
                scrappedDossiers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-muted-foreground line-through">{item.iktatoszam}</TableCell>
                    <TableCell className="text-muted-foreground">{item.ugy?.targy}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted text-muted-foreground capitalize">{item.statusz}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="opacity-50">{item.irat[0]?.count || 0} db irat</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Még nincsenek selejtezett ügyiratok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
