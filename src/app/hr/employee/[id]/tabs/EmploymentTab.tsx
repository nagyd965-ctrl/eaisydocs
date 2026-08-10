"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Clock, Info } from "lucide-react"
import { toast } from "sonner"
import { updateJogviszonyData } from "../actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

export function EmploymentTab({ 
  employeeId,
  isHrOrAdmin,
  loggedInUserId,
  currentUserRole,
  adatlap,
  jogviszonyok,
  munkakorok,
  vezetoNev
}: { 
  employeeId: string,
  isHrOrAdmin: boolean,
  loggedInUserId: string,
  currentUserRole: string,
  adatlap: any,
  jogviszonyok: any[],
  munkakorok: any[],
  vezetoNev?: string
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const canViewSalary = ["hr_vezeto", "admin"].includes(currentUserRole) || employeeId === loggedInUserId;

  // A jelenlegi jogviszony és beosztás kiválasztása
  const currentJogviszony = jogviszonyok?.find(j => !j.kilepes_datuma) || jogviszonyok?.[0]
  const beosztasok = currentJogviszony?.hr_beosztas || []
  
  // Rendezzük a beosztásokat időben csökkenő sorrendben (legújabb legelöl)
  const sortedBeosztasok = [...beosztasok].sort((a, b) => new Date(b.ervenyes_tol).getTime() - new Date(a.ervenyes_tol).getTime())
  
  // A jelenlegi beosztás az, ami érvényes (nincs lezárva vagy a lezárás a jövőben van)
  const currentBeosztas = sortedBeosztasok.find(b => !b.ervenyes_ig || new Date(b.ervenyes_ig) >= new Date()) || sortedBeosztasok[0]

  // Kontrollált állapotok a selectekhez (alapértelmezett érték a jelenlegi beosztásból, 
  // vagy fallback a régi adatlaphoz amíg nincs minden migrálva)
  const [munkaviszonyTipusa, setMunkaviszonyTipusa] = useState(currentBeosztas?.munkaviszony_tipusa || adatlap?.munkaviszony_tipusa || "")
  const [munkarend, setMunkarend] = useState(currentBeosztas?.munkarend || adatlap?.munkarend || "")
  const [munkakorId, setMunkakorId] = useState(currentBeosztas?.munkakor_id || "")
  const [szerzodesTipusa, setSzerzodesTipusa] = useState(adatlap?.szerzodes_tipusa || "határozatlan")
  
  // Jövőbeli dátum inicializálása (alapértelmezés holnap)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split("T")[0]

  const munkaviszonyLabels: Record<string, string> = {
    teljes: "Teljes munkaidő",
    resz: "Részmunkaidő",
    megbizasi: "Megbízási jogviszony",
    diak: "Diákmunka"
  }

  const munkarendLabels: Record<string, string> = {
    kotetlen: "Kötetlen munkarend",
    torzsudo: "Törzsidős",
    muszakos: "Műszakos",
    rugalmas: "Rugalmas"
  }

  const handleUpdate = async (formData: FormData) => {
    // Kézzel hozzáfűzzük a select értékeket a formData-hoz
    formData.set("munkaviszony_tipusa", munkaviszonyTipusa)
    formData.set("munkarend", munkarend)
    formData.set("szerzodes_tipusa", szerzodesTipusa)
    if (munkakorId) formData.set("munkakor_id", munkakorId)
    
    // Ha a régi belepes_datuma van az adatlapon, biztosítjuk, hogy átmegy
    if (!formData.get("belepes_datuma") && currentJogviszony?.belepes_datuma) {
      formData.set("belepes_datuma", currentJogviszony.belepes_datuma)
    }
    
    setLoading(true)
    const result = await updateJogviszonyData(employeeId, formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Beosztás / Jogviszony sikeresen frissítve!")
      setIsEditOpen(false)
    }
  }

  // Format date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Jelenleg is"
    return new Date(dateString).toLocaleDateString("hu-HU")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-lg text-primary">Jelenlegi Beosztás</CardTitle>
          {isHrOrAdmin && (
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger className={`${buttonVariants({ variant: "default", size: "sm" })} gap-2`}>
                <Edit className="w-4 h-4" /> Szerződés módosítása
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Szerződés adatainak módosítása</DialogTitle>
                  <DialogDescription>
                    Állítsd be az új pozíciót, munkaidőt vagy bért, és add meg az érvényesség kezdetét! 
                    A korábbi adatok nem törlődnek, hanem megőrizzük őket az előzményekben.
                  </DialogDescription>
                </DialogHeader>
                <form action={handleUpdate}>
                  <div className="grid gap-4 py-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 p-3 bg-primary/5 rounded-md border border-primary/20">
                        <Label htmlFor="ervenyes_tol" className="text-primary font-semibold">Érvényesség Kezdete *</Label>
                        <Input 
                          id="ervenyes_tol" 
                          name="ervenyes_tol" 
                          type="date" 
                          required
                          defaultValue={defaultDate} 
                        />
                        <p className="text-xs text-muted-foreground mt-1">SCD Type 2 history bejegyzés készül.</p>
                      </div>

                      <div className="space-y-2 p-3 bg-primary/5 rounded-md border border-primary/20">
                        <Label htmlFor="probaido_vege" className="text-primary font-semibold">Próbaidő vége</Label>
                        <Input 
                          id="probaido_vege" 
                          name="probaido_vege" 
                          type="date" 
                          defaultValue={currentJogviszony?.probaido_vege ? new Date(currentJogviszony.probaido_vege).toISOString().split('T')[0] : ""}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Opcionális. Ha lejár, értesítést küldünk.</p>
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <Label>Munkakör (Pozíció)</Label>
                      <Select value={munkakorId} onValueChange={setMunkakorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Válassz munkakört...">
                            {munkakorId ? munkakorok?.find(m => m.id === munkakorId)?.megnevezes || munkakorId : "Válassz munkakört..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {munkakorok?.map((mk) => (
                            <SelectItem key={mk.id} value={mk.id}>{mk.megnevezes}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="munkaido_fte" className="flex items-center gap-1">
                          Munkaidő (FTE)
                          <HoverCard>
                            <HoverCardTrigger type="button" className="text-muted-foreground hover:text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring rounded-full p-0.5 cursor-help">
                              <Info className="h-4 w-4" />
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80 text-sm" side="top">
                              <div className="space-y-2">
                                <h4 className="font-medium leading-none">FTE (Full-Time Equivalent)</h4>
                                <p className="text-muted-foreground">Ebből számolódik a Jelenléti ív "Terv" mezője.</p>
                                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-muted-foreground">
                                  <li><strong>1.0:</strong> Napi 8 óra (Teljes)</li>
                                  <li><strong>0.75:</strong> Napi 6 óra</li>
                                  <li><strong>0.5:</strong> Napi 4 óra (Félállás)</li>
                                </ul>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </Label>
                        <Input 
                          id="munkaido_fte" 
                          name="munkaido_fte" 
                          type="number" 
                          step="0.1"
                          min="0.1"
                          max="1.0"
                          placeholder="Pl. 1.0 vagy 0.5"
                          defaultValue={currentBeosztas?.munkaido_fte || currentBeosztas?.fte || adatlap?.munkaido_fte || "1.0"} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Munkaviszony típusa</Label>
                        <Select value={munkaviszonyTipusa} onValueChange={setMunkaviszonyTipusa}>
                          <SelectTrigger>
                            <SelectValue placeholder="Válassz típust...">
                              {munkaviszonyTipusa ? munkaviszonyLabels[munkaviszonyTipusa] || munkaviszonyTipusa : "Válassz típust..."}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(munkaviszonyLabels).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Szerződés típusa</Label>
                        <Select value={szerzodesTipusa} onValueChange={setSzerzodesTipusa}>
                          <SelectTrigger>
                            <SelectValue placeholder="Válassz típust...">
                              {szerzodesTipusa === "határozott" ? "Határozott idejű" : "Határozatlan idejű"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="határozatlan">Határozatlan idejű</SelectItem>
                            <SelectItem value="határozott">Határozott idejű</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {szerzodesTipusa === "határozott" && (
                        <div className="space-y-2">
                          <Label htmlFor="munkaviszony_vege">Szerződés / Jogviszony vége</Label>
                          <Input 
                            id="munkaviszony_vege" 
                            name="munkaviszony_vege" 
                            type="date" 
                            defaultValue={currentJogviszony?.kilepes_datuma || adatlap?.munkaviszony_vege || ""}
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Munkarend</Label>
                      <Select value={munkarend} onValueChange={setMunkarend}>
                        <SelectTrigger>
                          <SelectValue placeholder="Válassz munkarendet...">
                            {munkarend ? munkarendLabels[munkarend] || munkarend : "Válassz munkarendet..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(munkarendLabels).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {canViewSalary && (
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="berkategoria">Besorolás / Bérkategória</Label>
                        <Input 
                          id="berkategoria" 
                          name="berkategoria" 
                          placeholder="Pl. L3 vagy 650000 HUF" 
                          defaultValue={currentBeosztas?.berkategoria || adatlap?.berkategoria || ""}
                        />
                      </div>
                    )}

                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={loading}>Mégse</Button>
                    <Button type="submit" disabled={loading}>{loading ? "Mentés..." : "Módosítás Létrehozása"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Belépés Dátuma</p>
              <p className="font-medium">{formatDate(currentJogviszony?.belepes_datuma || adatlap?.belepes_datuma)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Próbaidő Vége</p>
              <p className="font-medium">{formatDate(currentJogviszony?.probaido_vege)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Munkaviszony típusa</p>
              <p className="font-medium">
                {munkaviszonyLabels[currentBeosztas?.munkaviszony_tipusa || adatlap?.munkaviszony_tipusa] || currentBeosztas?.munkaviszony_tipusa || adatlap?.munkaviszony_tipusa || "Nincs megadva"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Szerződés típusa</p>
              <p className="font-medium">
                {adatlap?.szerzodes_tipusa === "határozott" ? "Határozott idejű" : "Határozatlan idejű"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Munkaidő (FTE)
                <HoverCard>
                  <HoverCardTrigger className="text-muted-foreground hover:text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring rounded-full p-0.5 cursor-help">
                    <Info className="h-4 w-4" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 text-sm" side="top">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">FTE (Full-Time Equivalent)</h4>
                      <p className="text-muted-foreground">A teljes munkaidőhöz viszonyított arány. A <strong>Jelenléti ív</strong> ebből számolja ki a napi tervezett (elvárt) munkaidőt.</p>
                      <div className="bg-muted/50 p-2 rounded border space-y-1 text-foreground">
                        <div className="flex justify-between"><span><strong>1.0 FTE</strong></span> <span>Napi 8 óra (Teljes)</span></div>
                        <div className="flex justify-between"><span><strong>0.75 FTE</strong></span> <span>Napi 6 óra (Rész)</span></div>
                        <div className="flex justify-between"><span><strong>0.5 FTE</strong></span> <span>Napi 4 óra (Félállás)</span></div>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </p>
              <p className="font-medium">{currentBeosztas?.munkaido_fte || currentBeosztas?.fte || adatlap?.munkaido_fte ? `${currentBeosztas?.munkaido_fte || currentBeosztas?.fte || adatlap?.munkaido_fte} FTE` : "Nincs megadva"}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Munkarend</p>
              <p className="font-medium">
                {munkarendLabels[currentBeosztas?.munkarend || adatlap?.munkarend] || currentBeosztas?.munkarend || adatlap?.munkarend || "Nincs megadva"}
              </p>
            </div>
            {(adatlap?.szerzodes_tipusa === "határozott" || currentJogviszony?.kilepes_datuma) && (
              <div>
                <p className="text-sm text-muted-foreground">Szerződés lejárata</p>
                <p className="font-medium text-destructive">{formatDate(currentJogviszony?.kilepes_datuma || adatlap?.munkaviszony_vege)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Közvetlen vezető</p>
              <p className="font-medium">{vezetoNev || currentBeosztas?.kozvetlen_vezeto || adatlap?.kozvetlen_vezeto || "Nincs megadva"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Besorolás / Bérkategória</p>
              <p className="font-medium">{canViewSalary ? (currentBeosztas?.berkategoria || adatlap?.berkategoria || "Nincs megadva") : "— (Rejtett)"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Timeline */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-md flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" /> Előző és Jövőbeli Beosztások
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          {sortedBeosztasok.length > 0 ? (
            <div className="relative pl-6 border-l border-border/60 space-y-8 ml-2">
              {sortedBeosztasok.map((beosztas) => {
                const isFuture = new Date(beosztas.ervenyes_tol) > new Date();
                const isCurrent = beosztas.id === currentBeosztas?.id && !isFuture;
                const isPast = beosztas.ervenyes_ig && new Date(beosztas.ervenyes_ig) < new Date();
                
                return (
                  <div key={beosztas.id} className="relative">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-background ${isFuture ? 'bg-blue-500' : isCurrent ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                    
                    {/* Content Card */}
                    <div className="bg-card border border-border/50 rounded-md p-4 hover:border-border transition-colors">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {formatDate(beosztas.ervenyes_tol)} - {formatDate(beosztas.ervenyes_ig)}
                          </span>
                          <div className="flex gap-2">
                            {isFuture && <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10 rounded-sm">Jövőbeli</Badge>}
                            {isCurrent && <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-600/10 rounded-sm">Jelenlegi</Badge>}
                            {isPast && <Badge variant="outline" className="text-muted-foreground border-border rounded-sm">Lezárt</Badge>}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mt-1">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Munkakör & FTE</span>
                            <span className="font-medium">{beosztas.munkakor?.megnevezes || "—"} ({beosztas.munkaido_fte || beosztas.fte || "1.0"} FTE)</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Bérkategória</span>
                            <span className="font-medium">{canViewSalary ? (beosztas.berkategoria || "—") : "— (Rejtett)"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Közvetlen Vezető</span>
                            <span className="font-medium">{beosztas.kozvetlen_vezeto || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6 border border-dashed rounded-md bg-muted/10">
              Nincsenek beosztás előzmények.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
