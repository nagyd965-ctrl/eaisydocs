"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, Copy, FileText, CheckCircle2 } from "lucide-react"

export interface EmployeeT1041Item {
  id: string
  taj_szam?: string | null
  adoazonosito_jel?: string | null
  munkaido_fte?: number | null
  felhasznalo_profil?: { nev?: string | null } | null
  hr_munkakor?: { feor?: string | null; megnevezes?: string | null } | null
  hr_jogviszony?: { belepes_datuma?: string | null }[] | null
  [key: string]: any
}

export function NavT1041Generator({ employees }: { employees: EmployeeT1041Item[] }) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("")
  const [bejelentesTipus, setBejelentesTipus] = useState<string>("U")
  const [copied, setCopied] = useState(false)

  const selectedEmp = employees.find(e => e.id === selectedEmpId)

  const handlePrint = () => {
    window.print()
  }

  const handleCopy = () => {
    if (!selectedEmp) return
    const text = `
NAV T1041 Bejelentés Adatok
---------------------------
Jelleg: ${bejelentesTipus === 'U' ? 'Új bejelentés (U)' : bejelentesTipus === 'V' ? 'Változás bejelentés (V)' : 'Törlés (T)'}
Név: ${selectedEmp.felhasznalo_profil?.nev}
TAJ szám: ${selectedEmp.taj_szam || 'Nincs megadva'}
Adóazonosító jel: ${selectedEmp.adoazonosito_jel || 'Nincs megadva'}
FEOR kód: ${selectedEmp.hr_munkakor?.feor || 'Nincs megadva'}
Munkaviszony kezdete: ${selectedEmp.hr_jogviszony?.[0]?.belepes_datuma ? new Date(selectedEmp.hr_jogviszony[0].belepes_datuma).toLocaleDateString('hu-HU') : 'Nincs megadva'}
Munkaidő (FTE): ${selectedEmp.munkaido_fte ? selectedEmp.munkaido_fte * 40 + ' óra/hét' : 'Nincs megadva'}
    `.trim()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="print:border-none print:shadow-none">
      <CardHeader className="print:hidden">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          NAV T1041 Bejelentés Generátor
        </CardTitle>
        <CardDescription>
          ÁNYK (Általános Nyomtatványkitöltő) felületre történő manuális adatbevitel megkönnyítése.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bejelentendő Dolgozó</label>
              <Select value={selectedEmpId} onValueChange={(val) => val && setSelectedEmpId(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz dolgozót...">
                    {selectedEmp?.felhasznalo_profil?.nev}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.felhasznalo_profil?.nev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bejelentés Jellege</label>
              <Select value={bejelentesTipus} onValueChange={(val) => val && setBejelentesTipus(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz jelleget...">
                    {bejelentesTipus === 'U' && "Új bejelentés (U)"}
                    {bejelentesTipus === 'V' && "Változás bejelentés (V)"}
                    {bejelentesTipus === 'T' && "Törlés (T)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="U">Új bejelentés (U)</SelectItem>
                  <SelectItem value="V">Változás bejelentés (V)</SelectItem>
                  <SelectItem value="T">Törlés (T)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCopy} disabled={!selectedEmp} className="gap-2">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Másolva!" : "Adatok vágólapra másolása"}
            </Button>
            <Button onClick={handlePrint} disabled={!selectedEmp} className="gap-2">
              <Printer className="w-4 h-4" /> Nyomtatás
            </Button>
          </div>
        </div>

        {/* Nyomtatható Nézet */}
        {selectedEmp && (
          <div className="mt-8 border p-6 rounded-lg bg-slate-50 print:block print:border-none print:bg-white print:p-0 print:m-0">
            <h2 className="text-xl font-bold mb-6 pb-2 border-b uppercase tracking-widest text-center">T1041 Adatlap - Bejelentés Adatok</h2>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="font-semibold text-muted-foreground">Bejelentés jellege (U/V/T):</div>
              <div className="font-bold text-lg">{bejelentesTipus}</div>

              <div className="font-semibold text-muted-foreground">Biztosított neve:</div>
              <div className="font-bold">{selectedEmp.felhasznalo_profil?.nev}</div>

              <div className="font-semibold text-muted-foreground">TAJ szám:</div>
              <div className="font-mono bg-slate-200 print:bg-transparent px-2 py-1 rounded w-fit">{selectedEmp.taj_szam || "HIÁNYZIK!"}</div>

              <div className="font-semibold text-muted-foreground">Adóazonosító jel:</div>
              <div className="font-mono bg-slate-200 print:bg-transparent px-2 py-1 rounded w-fit">{selectedEmp.adoazonosito_jel || "HIÁNYZIK!"}</div>

              <div className="font-semibold text-muted-foreground">FEOR szám:</div>
              <div className="font-bold">{selectedEmp.hr_munkakor?.feor || "HIÁNYZIK!"} - {selectedEmp.hr_munkakor?.megnevezes}</div>

              <div className="font-semibold text-muted-foreground">Biztosítási jogviszony kezdete:</div>
              <div className="font-bold">{selectedEmp.hr_jogviszony?.[0]?.belepes_datuma ? new Date(selectedEmp.hr_jogviszony[0].belepes_datuma).toLocaleDateString("hu-HU") : "HIÁNYZIK!"}</div>

              <div className="font-semibold text-muted-foreground">Heti munkaidő (óra):</div>
              <div className="font-bold">{selectedEmp.munkaido_fte ? selectedEmp.munkaido_fte * 40 : 40} óra/hét</div>
            </div>

            <div className="mt-12 text-xs text-muted-foreground border-t pt-4 text-center">
              Generálta: eaisyDocs HR Rendszer | {new Date().toLocaleString("hu-HU")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
