"use client"

import { useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Upload, FileText, Calendar, Building, Landmark, Trash2 } from "lucide-react"
import { getT1041Data, getKSHData, getPayrollData, getArchiveRecords, uploadArchiveFileAdmin, deleteArchiveRecordAdmin } from "@/app/hr/reports/actions"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export function ReportsTabs() {
  const [activeTab, setActiveTab] = useState("t1041")
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [uploading, setUploading] = useState(false)
  const [archiveRecords, setArchiveRecords] = useState<any[]>([])
  const [itemToDelete, setItemToDelete] = useState<{id: string, filePath: string} | null>(null)
  const [ugyszam, setUgyszam] = useState("")
  
  const supabase = createClient()

  // ... (keeping other functions intact, so I need to be careful with the replacement chunk)

  const loadArchive = async () => {
    const data = await getArchiveRecords()
    setArchiveRecords(data)
  }

  // Helper to trigger CSV download
  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("Nincs exportálható adat erre a hónapra.")
      return
    }
    
    // Create CSV string
    const headers = Object.keys(data[0]).join(",")
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(","))
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success("Export sikeresen letöltve.")
  }

  const handleT1041Export = async () => {
    const data = await getT1041Data(month)
    if (data.length === 0) {
      toast.info("Nincs adat az adott hónapban", { description: "Próbálj meg egy másik hónapot választani." })
      return
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `t1041_export_${month}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  const handleKSHExport = async () => {
    const data = await getKSHData(month)
    if (data.length === 0) {
      toast.info("Nincs adat az adott hónapban")
      return
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `ksh_export_${month}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  const handlePayrollExport = async () => {
    const data = await getPayrollData(month)
    if (data.length === 0) {
      toast.info("Nincs adat az adott hónapban")
      return
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `ber_export_${month}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    toast.loading("Fájl feltöltése...", { id: 'upload' })

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("Nincs bejelentkezve")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)
      formData.append("month", month)
      formData.append("userId", userData.user.id)
      formData.append("ugyszam", ugyszam)

      const { success, error } = await uploadArchiveFileAdmin(formData)
      
      if (!success) throw new Error(error)

      toast.success("Bevallás sikeresen archiválva!", { id: 'upload' })
      loadArchive()
      
    } catch (error: any) {
      console.error(error)
      toast.error(`Feltöltés sikertelen: ${error.message}`, { id: 'upload' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDownloadArchive = async (filePath: string, fileName: string) => {
    toast.loading("Letöltés előkészítése...", { id: 'dl' })
    const { data, error } = await supabase.storage.from('hr_reports').createSignedUrl(filePath, 60)
    toast.dismiss('dl')
    
    if (error) {
      toast.error("Hiba a letöltés során")
      return
    }
    
    const a = document.createElement("a")
    a.href = data.signedUrl
    a.download = fileName
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDeleteArchive = (id: string, filePath: string) => {
    setItemToDelete({ id, filePath })
  }

  const executeDelete = async () => {
    if (!itemToDelete) return
    
    toast.loading("Törlés folyamatban...", { id: 'delete' })
    const { success, error } = await deleteArchiveRecordAdmin(itemToDelete.id, itemToDelete.filePath)
    
    if (success) {
      toast.success("Sikeres törlés!", { id: 'delete' })
      loadArchive()
    } else {
      toast.error(`Hiba történt: ${error}`, { id: 'delete' })
    }
    setItemToDelete(null)
  }

  // Load archive on first click to Archive tab
  const handleTabChange = (val: string) => {
    setActiveTab(val)
    if (val === 'archivum' && archiveRecords.length === 0) {
      loadArchive()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end bg-card p-4 rounded-lg border">
        <div className="space-y-1.5 flex-1 max-w-sm">
          <label className="text-sm font-medium text-muted-foreground">Időszak kiválasztása (Év, Hónap)</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
          <TabsTrigger value="t1041"><Landmark className="w-4 h-4 mr-2"/> NAV T1041</TabsTrigger>
          <TabsTrigger value="ksh"><Building className="w-4 h-4 mr-2"/> KSH Riport</TabsTrigger>
          <TabsTrigger value="payroll"><Landmark className="w-4 h-4 mr-2"/> Bérszámfejtés</TabsTrigger>
          <TabsTrigger value="archivum"><FileText className="w-4 h-4 mr-2"/> Bevallás Archívum</TabsTrigger>
        </TabsList>

        <TabsContent value="t1041" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>T1041 Biztosítotti Bejelentés</CardTitle>
              <CardDescription>
                A rendszer kigyűjti a megadott hónapban történt belépéseket és kilépéseket. 
                A generált CSV fájlt az ÁNYK programba lehet importálni.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleT1041Export} size="lg" className="gap-2">
                <Download className="w-4 h-4" />
                T1041 Adatok Exportálása (CSV)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ksh" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>KSH Munkaügyi Riport</CardTitle>
              <CardDescription>
                Havi létszámstatisztika, munkaóra- és távollét aggregátumok a KSH jelentésekhez.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleKSHExport} size="lg" className="gap-2">
                <Download className="w-4 h-4" />
                KSH Adatok Exportálása (CSV)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bérszámfejtési Export</CardTitle>
              <CardDescription>
                Havi bérszámfejtési csomag a bérprogram számára (jelenlét, távollét jogcímek, cafeteria).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handlePayrollExport} size="lg" className="gap-2">
                <Download className="w-4 h-4" />
                Havi Bér- és Jelenlét Export (CSV)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archivum" className="mt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Új Bevallás Feltöltése</CardTitle>
                <CardDescription>
                  Töltsd fel a beküldött igazolást PDF formátumban.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bevallás Típusa</label>
                  <select id="bevallastipus" className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="NAV T1041">NAV T1041</option>
                    <option value="NAV 08">NAV 08-as havi bevallás</option>
                    <option value="KSH">KSH Munkaügyi Jelentés</option>
                    <option value="Bérszámfejtés">Bérszámfejtési Adat</option>
                    <option value="Egyéb">Egyéb Igazolás</option>
                  </select>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium">Ügyszám (opcionális)</label>
                  <Input 
                    placeholder="Pl. Iktatószám vagy hivatalos azonosító" 
                    value={ugyszam} 
                    onChange={(e) => setUgyszam(e.target.value)} 
                    disabled={uploading}
                  />
                </div>
                <div className="pt-2">
                  <Input 
                    type="file" 
                    accept=".pdf,.xml,.csv" 
                    disabled={uploading}
                    onChange={(e) => {
                      const tipus = (document.getElementById('bevallastipus') as HTMLSelectElement).value
                      handleFileUpload(e, tipus)
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-2">Max. 10 MB (PDF, XML, CSV)</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Feltöltött Archívum</CardTitle>
              </CardHeader>
              <CardContent>
                {archiveRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p>Még nincs feltöltött bevallás.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {archiveRecords.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{r.tipus}</span>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{r.idoszak}</span>
                            {r.ugyszam && (
                              <span className="text-xs bg-muted border px-2 py-0.5 rounded-full">Ügyszám: {r.ugyszam}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span>{new Date(r.bekuldes_datuma).toLocaleDateString('hu-HU')}</span>
                            <span>•</span>
                            <span>{r.fajl_nev}</span>
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadArchive(r.fajl_utvonal, r.fajl_nev)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteArchive(r.id, r.fajl_utvonal)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törölni szeretnéd?</AlertDialogTitle>
            <AlertDialogDescription>
              A törölt bevallás és az ahhoz tartozó fájl véglegesen eltávolításra kerül az archívumból. Ez a művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
