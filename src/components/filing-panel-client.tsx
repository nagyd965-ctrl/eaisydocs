"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { fileIncomingDocument, generateAISuggestions } from "@/app/inbox/filing-actions"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft, FileText, CheckCircle2, Sparkles } from "lucide-react"

export function FilingPanelClient({ 
  irat, 
  pdfUrl,
  tervek,
  ugyiratok,
  departments
}: { 
  irat: any, 
  pdfUrl: string | null,
  tervek: any[],
  ugyiratok: any[],
  departments?: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [aiLoading, setAiLoading] = useState(false)
  const [targy, setTargy] = useState(irat.targy || "")
  const [ugytipusId, setUgytipusId] = useState<string>("")
  const [departmentId, setDepartmentId] = useState<string>("")

  const handleAiSuggest = async () => {
    setAiLoading(true)
    setError(null)
    const result = await generateAISuggestions(irat.id)
    if (result.error) {
      setError(result.error)
    } else if (result.suggestions) {
      if (result.suggestions.targy) {
        setTargy(result.suggestions.targy)
      }
      if (result.suggestions.irattari_tetel_id) {
        setUgytipusId(result.suggestions.irattari_tetel_id)
      }
      if (result.suggestions.department_id) {
        setDepartmentId(result.suggestions.department_id)
      }
    }
    setAiLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append("irat_id", irat.id)
    formData.append("mode", mode)
    
    try {
      const result = await fileIncomingDocument(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/inbox")
      }
    } catch (err) {
      setError("Váratlan hiba történt az iktatás során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full items-stretch">
      <ResizablePanel defaultSize={75} minSize={30}>
        <div className="flex h-full flex-col bg-muted/30">
          <div className="flex h-12 items-center border-b px-4 bg-background">
            <Button variant="ghost" size="sm" onClick={() => router.push("/inbox")} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Vissza
            </Button>
            <div className="flex items-center text-sm font-medium">
              <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
              Dokumentum előnézet
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative bg-muted">
            {pdfUrl ? (
              <iframe 
                src={pdfUrl} 
                className="w-full h-full border-0" 
                title="PDF Előnézet"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p>A dokumentum nem tölthető be, vagy nincs feltöltve fizikai fájl.</p>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={25} minSize={20}>
        <div className="flex h-full flex-col overflow-y-auto bg-background">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Iktatás</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Érkeztetőszám: <strong>{irat.erkeztetoszam}</strong>
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAiSuggest} 
              disabled={aiLoading}
              className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              AI Kitöltés
            </Button>
          </div>
          <div className="flex-1 p-6">
            <form id="filing-form" onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
              )}
              
              <Tabs defaultValue="new" value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new">Új ügyirat nyitása</TabsTrigger>
                  <TabsTrigger value="existing">Meglévőhöz csatolás</TabsTrigger>
                </TabsList>
                
                <TabsContent value="new" className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Szervezeti Egység Prefix</Label>
                    <Select name="prefix" defaultValue="PENZUGY" required={mode === "new"}>
                      <SelectTrigger id="prefix">
                        <SelectValue placeholder="Válassz...">
                          {(value) => {
                            const map: Record<string, string> = {
                              PENZUGY: "Pénzügy (PENZUGY)",
                              HR: "HR és Munkaügy (HR)",
                              JOGI: "Jogi osztály (JOGI)",
                              UGYFELSZOLGALAT: "Ügyfélszolgálat (UGYFELSZOLGALAT)",
                              IT: "Informatika (IT)"
                            };
                            return map[value as string] || "Válassz...";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENZUGY" label="Pénzügy (PENZUGY)">Pénzügy (PENZUGY)</SelectItem>
                        <SelectItem value="HR" label="HR és Munkaügy (HR)">HR és Munkaügy (HR)</SelectItem>
                        <SelectItem value="JOGI" label="Jogi osztály (JOGI)">Jogi osztály (JOGI)</SelectItem>
                        <SelectItem value="UGYFELSZOLGALAT" label="Ügyfélszolgálat (UGYFELSZOLGALAT)">Ügyfélszolgálat (UGYFELSZOLGALAT)</SelectItem>
                        <SelectItem value="IT" label="Informatika (IT)">Informatika (IT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targy">Ügy tárgya</Label>
                    <Input 
                      id="targy" 
                      name="targy" 
                      value={targy} 
                      onChange={(e) => setTargy(e.target.value)}
                      required={mode === "new"} 
                      className={aiLoading ? "animate-pulse bg-muted" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ugytipus_id">Irattári Tétel (Ügytípus)</Label>
                    <Select name="ugytipus_id" required={mode === "new"} value={ugytipusId} onValueChange={(v) => setUgytipusId(v || "")}>
                      <SelectTrigger id="ugytipus_id" className={aiLoading ? "animate-pulse bg-muted" : ""}>
                        <SelectValue placeholder="Válassz típust...">
                          {(value) => {
                            const item = tervek.find(t => t.id === value);
                            return item ? `${item.tetelszam} - ${item.megnevezes}` : "Válassz típust...";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {tervek.map(t => (
                          <SelectItem key={t.id} value={t.id} label={`${t.tetelszam} - ${t.megnevezes}`}>
                            {t.tetelszam} - {t.megnevezes}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department_id">Szervezeti Egység (Osztály)</Label>
                    <Select name="department_id" required={mode === "new"} value={departmentId} onValueChange={(v) => setDepartmentId(v || "")}>
                      <SelectTrigger id="department_id" className={aiLoading ? "animate-pulse bg-muted" : ""}>
                        <SelectValue placeholder="Válassz szervezeti egységet...">
                          {(value: string) => {
                            const dept = departments?.find((d: any) => d.id === value);
                            return dept ? dept.nev : "Válassz szervezeti egységet...";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.nev}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="existing" className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="existing_ugyirat_id">Keresés a folyamatban lévő ügyiratok között</Label>
                    <Select name="existing_ugyirat_id" required={mode === "existing"}>
                      <SelectTrigger id="existing_ugyirat_id">
                        <SelectValue placeholder="Válassz egy meglévő ügyiratot...">
                          {(value) => {
                            const item = ugyiratok.find(u => u.id === value);
                            return item ? `${item.iktatoszam} - ${(item.ugy as any)?.targy}` : "Válassz egy meglévő ügyiratot...";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ugyiratok.map((u: any) => (
                          <SelectItem key={u.id} value={u.id} label={`${u.iktatoszam} - ${(u.ugy as any)?.targy}`}>
                            {u.iktatoszam} - {(u.ugy as any)?.targy}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Az irat új alszámot kap a kiválasztott ügyiraton belül.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </div>
          <div className="border-t bg-muted/30 px-6 py-4 mt-auto">
            <Button form="filing-form" type="submit" disabled={loading} className="w-full bg-[#02b8cc] hover:bg-[#029db0] text-white">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {loading ? "Iktatás folyamatban..." : "Iktatás befejezése"}
            </Button>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
