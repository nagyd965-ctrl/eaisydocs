"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"

interface ExportCsvButtonProps {
  data: any[]
}

export function ExportCsvButton({ data }: ExportCsvButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("Hiba", { description: "Nincs exportálható adat!" })
      return
    }

    // 1. Oszlopfejlécek
    const headers = [
      "Iktatószám",
      "Tárgy",
      "Állapot",
      "Felelős",
      "Iktatás Dátuma",
      "Határidő"
    ]

    // 2. Adatsorok összeállítása
    const rows = data.map(item => {
      const iktatoszam = item.iktatoszam || ""
      const targy = item.ugy?.targy || ""
      const statusz = item.statusz || ""
      const felelos = item.ugy?.felelos_user?.full_name || ""
      const iktatasDatuma = item.iktatas_datuma ? new Date(item.iktatas_datuma).toLocaleDateString("hu-HU") : ""
      const hatarido = item.ugy?.hatarido ? new Date(item.ugy.hatarido).toLocaleDateString("hu-HU") : ""

      // Escaping for CSV (quotes and semicolons)
      return [iktatoszam, targy, statusz, felelos, iktatasDatuma, hatarido].map(val => {
        const strVal = String(val).replace(/"/g, '""')
        return `"${strVal}"`
      }).join(";")
    })

    // 3. Fájl generálása (BOM hozzáadása a magyar ékezetek miatt az Excelnek)
    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement("a")
    const dateStr = new Date().toISOString().slice(0, 10)
    link.setAttribute("href", url)
    link.setAttribute("download", `iktatokonyv_export_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export (CSV)
    </Button>
  )
}
