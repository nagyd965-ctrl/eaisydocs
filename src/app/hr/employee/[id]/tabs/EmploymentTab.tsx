"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Edit, 
  Info, 
  Briefcase, 
  ClipboardList, 
  GraduationCap, 
  HardHat, 
  Stethoscope, 
  ExternalLink, 
  Download, 
  Eye, 
  FileText 
} from "lucide-react"
import Link from "next/link"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
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
  vezetoNev,
  activeMunkakor: propActiveMunkakor,
  latestJobVersion,
}: { 
  employeeId: string,
  isHrOrAdmin: boolean,
  loggedInUserId: string,
  currentUserRole: string,
  adatlap: any,
  jogviszonyok: any[],
  munkakorok: any[],
  vezetoNev?: string,
  activeMunkakor?: any,
  latestJobVersion?: any,
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
  const currentBeosztas = sortedBeosztasok.find(b => !b.ervenyes_ig)

  // Aktív munkakör feloldása
  const activeMunkakor = propActiveMunkakor || currentBeosztas?.munkakor || null

  const feladatok: string[] = Array.isArray(activeMunkakor?.feladatok_es_hataskorok)
    ? activeMunkakor.feladatok_es_hataskorok
    : (typeof activeMunkakor?.feladatok_es_hataskorok === "string"
        ? (() => {
            try {
              const p = JSON.parse(activeMunkakor.feladatok_es_hataskorok)
              return Array.isArray(p) ? p : []
            } catch {
              return activeMunkakor.feladatok_es_hataskorok.split("\n").map((s: string) => s.trim()).filter(Boolean)
            }
          })()
        : [])

  const kompetenciak: string[] = Array.isArray(activeMunkakor?.elvart_kompetenciak)
    ? activeMunkakor.elvart_kompetenciak
    : (typeof activeMunkakor?.elvart_kompetenciak === "string"
        ? (() => {
            try {
              const p = JSON.parse(activeMunkakor.elvart_kompetenciak)
              return Array.isArray(p) ? p : []
            } catch {
              return activeMunkakor.elvart_kompetenciak.split("\n").map((s: string) => s.trim()).filter(Boolean)
            }
          })()
        : [])

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
              <p className="text-sm text-muted-foreground">Betöltött Munkakör</p>
              <p className="font-semibold text-base text-foreground flex items-center gap-2 flex-wrap">
                <span>{activeMunkakor?.megnevezes || currentBeosztas?.munkakor?.megnevezes || "Nincs munkakör beállítva"}</span>
                {activeMunkakor?.feor_kod && (
                  <Badge variant="outline" className="text-xs font-normal">
                    FEOR: {activeMunkakor.feor_kod}
                  </Badge>
                )}
              </p>
            </div>
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

      {/* 2. Munkaköri Profil és Felelősségek Kártya */}
      {activeMunkakor ? (
        <Card className="border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-semibold">
                  {activeMunkakor.megnevezes}
                </CardTitle>
                {activeMunkakor.besorolasi_szint && (
                  <Badge variant="outline" className="text-xs">
                    {activeMunkakor.besorolasi_szint}
                  </Badge>
                )}
                {activeMunkakor.feor_kod && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    (FEOR: {activeMunkakor.feor_kod})
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hivatalos munkaköri profil, felelősségi körök, kompetenciák és munkaegészségügyi előírások.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/hr/job/${activeMunkakor.id}`}>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-primary gap-1">
                  <ExternalLink className="w-3.5 h-3.5" /> Munkakör törzslap
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Feladatok és Hatáskörök */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <ClipboardList className="w-4 h-4 text-primary" />
                Feladatok és Hatáskörök ({feladatok.length})
              </h4>
              {feladatok.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {feladatok.map((task, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 rounded-md border bg-muted/20 text-xs text-foreground"
                    >
                      <span className="font-semibold text-primary mt-0.5 tabular-nums shrink-0">
                        {i + 1}.
                      </span>
                      <span className="leading-snug">{task}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded border border-dashed">
                  Nincsenek rögzített specifikus feladatok ehhez a munkakörhöz.
                </p>
              )}
            </div>

            {/* Elvárt Kompetenciák */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <GraduationCap className="w-4 h-4 text-primary" />
                Elvárt Kompetenciák és Képzettség
              </h4>
              {kompetenciak.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {kompetenciak.map((comp, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal py-1 px-2.5 bg-muted">
                      {comp}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Nincs rögzített kompetencia elvárás.
                </p>
              )}
            </div>

            {/* Munkavédelem & Orvosi Előírások */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
              {/* Munkavédelem & EVE */}
              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <HardHat className="w-4 h-4 text-warning" />
                  Munkavédelem & Egyéni Védőeszközök
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider block font-medium">Kockázati besorolás</span>
                    <p className="font-medium text-foreground">
                      {activeMunkakor.kockazat_tipusa || "Nem igényel különleges kockázatértékelést"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider block font-medium">Előírt védőeszköz (EVE)</span>
                    <p className="font-medium text-foreground">
                      {activeMunkakor.vedoeszkoz_igeny || "Nem kötelező védőeszköz viselete"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Foglalkozás-egészségügy */}
              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  Foglalkozás-egészségügyi Alkalmasság
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider block font-medium">Kötelező vizsgálat</span>
                    <p className="font-medium text-foreground">
                      {activeMunkakor.orvosi_vizsgalat_tipus || "Standard munkaköri alkalmassági"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider block font-medium">Előírt gyakoriság</span>
                    <p className="font-medium text-foreground">
                      {activeMunkakor.orvosi_vizsgalat_gyakorisag_ho 
                        ? `Minden ${activeMunkakor.orvosi_vizsgalat_gyakorisag_ho} hónapban (időszakos)` 
                        : "Időszakos vizsgálat nem kötelező"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hivatalos Munkaköri Leírás Verzió Állapot */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 text-xs">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-medium text-foreground">
                    {latestJobVersion ? `Hivatalos Munkaköri Leírás (v${latestJobVersion.verzio_szam})` : "Munkaköri leírás dokumentum"}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {latestJobVersion?.fajl_nev 
                      ? `${latestJobVersion.fajl_nev} • Kiadva: ${new Date(latestJobVersion.kiadas_datum || latestJobVersion.created_at).toLocaleDateString("hu-HU")}`
                      : "Még nincs digitális munkaköri leírás verzió feltöltve ehhez a munkakörhöz."}
                  </p>
                </div>
              </div>
              {latestJobVersion?.signedUrl ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <PdfViewerDialog
                    url={latestJobVersion.signedUrl}
                    title={`${latestJobVersion.fajl_nev || activeMunkakor.megnevezes} (v${latestJobVersion.verzio_szam})`}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary">
                        <Eye className="w-3.5 h-3.5" /> Betekintés
                      </Button>
                    }
                  />
                  <a
                    href={latestJobVersion.signedUrl}
                    download={latestJobVersion.fajl_nev || "munkakori_leiras.pdf"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary px-2" title="Letöltés">
                      <Download className="w-3.5 h-3.5" /> Letöltés
                    </Button>
                  </a>
                </div>
              ) : isHrOrAdmin ? (
                <Link href={`/hr/job/${activeMunkakor.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary">
                    Feltöltés az adatlapon
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border bg-muted/10">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            <Briefcase className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="font-medium text-foreground">Nincs munkakör hozzárendelve a dolgozóhoz</p>
            <p className="text-xs text-muted-foreground mt-1">
              A &quot;Szerződés módosítása&quot; gombbal rendelhetsz hozzá munkakört.
            </p>
          </CardContent>
        </Card>
      )}

      {/* History Timeline */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-md font-semibold">
            Előző és Jövőbeli Beosztások
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
                    <div className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-background ${isFuture ? 'bg-info' : isCurrent ? 'bg-success' : 'bg-muted-foreground'}`} />
                    
                    {/* Content Card */}
                    <div className="bg-card border border-border/50 rounded-md p-4 hover:border-border transition-colors">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatDate(beosztas.ervenyes_tol)} - {formatDate(beosztas.ervenyes_ig)}
                          </span>
                          <div className="flex gap-2">
                            {isFuture && <Badge variant="outline" className="text-info border-info/30 bg-info/10 rounded-sm">Jövőbeli</Badge>}
                            {isCurrent && <Badge variant="outline" className="text-success border-success/30 bg-success/10 rounded-sm">Jelenlegi</Badge>}
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
