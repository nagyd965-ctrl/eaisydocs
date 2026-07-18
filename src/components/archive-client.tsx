"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, ShieldAlert, FileText } from "lucide-react"
import { forceExpireAllDossiers } from "@/app/archive/actions"
import { proposeDisposal, approveDisposal } from "@/app/archive/disposal-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export function ArchiveClient({
  archivedDossiers,
  scrappingSuggestions,
  pendingApprovals,
  scrappedDossiers
}: {
  archivedDossiers: any[]
  scrappingSuggestions: any[]
  pendingApprovals: any[]
  scrappedDossiers: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([])
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([])
  
  // Protocol Dialog State
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [protocolData, setProtocolData] = useState<any>(null)
  
  // Prompt Dialog State
  const [approvePromptOpen, setApprovePromptOpen] = useState(false)
  const [approverName, setApproverName] = useState("")

  const handlePropose = async () => {
    if (selectedSuggestions.length === 0) return
    setLoading(true)
    const result = await proposeDisposal(selectedSuggestions)
    if (result.error) {
      toast.error("Hiba", { description: result.error })
    } else {
      toast.success("Sikeres", { description: "Selejtezés javasolva." })
      setSelectedSuggestions([])
    }
    setLoading(false)
    router.refresh()
  }

  const handleApprove = async () => {
    if (selectedApprovals.length === 0) return
    if (!approverName) {
      toast.error("Hiba", { description: "Meg kell adni a jóváhagyó nevét!" })
      return
    }

    setApprovePromptOpen(false)
    setLoading(true)
    const result = await approveDisposal(selectedApprovals, approverName)
    if (result.error) {
      toast.error("Hiba", { description: result.error })
    } else {
      // Siker!
      toast.success("Sikeres", { description: "Selejtezés jóváhagyva." })
      setSelectedApprovals([])
      // Generate Protocol
      setProtocolData({
        date: new Date().toLocaleDateString('hu-HU'),
        approver: approverName,
        proposer: result.proposer && result.proposer.trim() !== "" ? result.proposer : "Iratkezelő",
        items: result.disposedItems
      })
      setProtocolOpen(true)
    }
    setLoading(false)
    router.refresh()
  }

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleApproval = (id: string) => {
    setSelectedApprovals(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="suggestions" className="relative">
            Javaslatok
            {scrappingSuggestions.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                {scrappingSuggestions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="relative">
            Jóváhagyandó
            {pendingApprovals.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] text-primary-foreground">
                {pendingApprovals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">Irattárban</TabsTrigger>
          <TabsTrigger value="scrapped">Selejtezett</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-6">
          <div className="border rounded-md bg-card mb-4">
            <div className="p-4 bg-muted/30 border-b flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Selejtezési Javaslatok (Iratkezelő)</p>
                  <p className="text-muted-foreground">Ezek az ügyiratok elérték a megőrzési idejük végét. Válaszd ki azokat, amiket felterjesztesz selejtezésre a vezető felé (Négy szem elve).</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => { await forceExpireAllDossiers(); router.refresh(); }}
                >
                  🛠 Lejárt generálás
                </Button>
                <Button 
                  disabled={selectedSuggestions.length === 0 || loading}
                  onClick={handlePropose}
                >
                  Felterjesztés Selejtezésre ({selectedSuggestions.length})
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Iktatószám</TableHead>
                  <TableHead>Ügy Tárgya</TableHead>
                  <TableHead>Iratok száma</TableHead>
                  <TableHead>Megőrzés Vége</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scrappingSuggestions.length > 0 ? (
                  scrappingSuggestions.map((item) => (
                    <TableRow key={item.id} className={selectedSuggestions.includes(item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedSuggestions.includes(item.id)}
                          onCheckedChange={() => toggleSuggestion(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-primary">{item.iktatoszam}</TableCell>
                      <TableCell>{item.ugy?.targy}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.irat[0]?.count || 0} db irat</Badge>
                      </TableCell>
                      <TableCell className="text-destructive font-medium tabular-nums">
                        {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "Ismeretlen"}
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

        <TabsContent value="approvals" className="mt-6">
          <div className="border rounded-md bg-card mb-4 border-warning/50">
            <div className="p-4 bg-warning/5 border-b border-warning/20 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1 text-warning-foreground">Jóváhagyásra Váró Csomagok (Vezető)</p>
                  <p className="text-muted-foreground">Az iratkezelő által felterjesztett ügyiratok. A jóváhagyás után a fájlok fizikailag is véglegesen törlésre kerülnek és létrejön a hivatalos Selejtezési Jegyzőkönyv. Nem hagyhatod jóvá a saját felterjesztésedet!</p>
                </div>
              </div>
              <Button 
                variant="destructive"
                disabled={selectedApprovals.length === 0 || loading}
                onClick={() => setApprovePromptOpen(true)}
              >
                Jóváhagyás és Jegyzőkönyv ({selectedApprovals.length})
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Iktatószám</TableHead>
                  <TableHead>Ügy Tárgya</TableHead>
                  <TableHead>Iratok száma</TableHead>
                  <TableHead>Állapot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((item) => (
                    <TableRow key={item.id} className={selectedApprovals.includes(item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedApprovals.includes(item.id)}
                          onCheckedChange={() => toggleApproval(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.iktatoszam}</TableCell>
                      <TableCell>{item.ugy?.targy}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.irat[0]?.count || 0} db irat</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Jóváhagyásra vár</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>Nincsenek jóváhagyásra váró selejtezések.</p>
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
                      Nincsenek lezárt ügyiratok.
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
                  <TableHead>Iratok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scrappedDossiers.length > 0 ? (
                  scrappedDossiers.map((item) => (
                    <TableRow key={item.id} className="opacity-70">
                      <TableCell className="font-medium line-through">{item.iktatoszam}</TableCell>
                      <TableCell>{item.ugy?.targy}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Véglegesen törölve</Badge>
                      </TableCell>
                      <TableCell>Fájlok megsemmisítve</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Még nem selejteztek le ügyiratokat a rendszerből.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={protocolOpen} onOpenChange={setProtocolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-5 h-5" />
              Sikeres Selejtezés
            </DialogTitle>
            <DialogDescription>
              Az ügyiratok sikeresen megsemmisítésre kerültek a rendszerből.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
             <p className="text-sm text-muted-foreground mb-4">
               A fájlok véglegesen törlődtek. A hivatalos selejtezési jegyzőkönyvet most kinyomtathatod vagy lementheted PDF formátumban. 
               Később a "Selejtezett" fülön már csak a tényt láthatod, a jegyzőkönyv generálására ez az egyetlen lehetőség.
             </p>
          </div>

          <DialogFooter className="pt-2 border-t flex sm:justify-between">
            <Button variant="outline" onClick={() => setProtocolOpen(false)}>Bezárás</Button>
            <Button 
              onClick={() => {
                localStorage.setItem("printProtocolData", JSON.stringify(protocolData))
                window.open("/archive/print", "_blank")
              }} 
              className="gap-2 bg-primary"
            >
              <FileText className="w-4 h-4" />
              Jegyzőkönyv Nyomtatása
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approvePromptOpen} onOpenChange={setApprovePromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Jóváhagyó neve</DialogTitle>
            <DialogDescription>
              Kérem adja meg a nevét a jegyzőkönyv aláírásához.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approver-name">Teljes Név</Label>
              <Input 
                id="approver-name"
                placeholder="pl. Kovács János"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovePromptOpen(false)}>Mégsem</Button>
            <Button onClick={handleApprove} disabled={loading || !approverName}>
              {loading ? "Folyamatban..." : "Jóváhagyás és Jegyzőkönyv"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
