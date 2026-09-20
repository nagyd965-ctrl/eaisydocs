"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  ChevronDown,
} from "lucide-react"
import {
  DossierExportItem,
  exportDossiersToCsv,
  exportDossiersToXlsx,
  exportDossiersToPdf,
} from "@/utils/dossier-export"

interface ExportDossiersDropdownProps {
  data: DossierExportItem[]
}

export function ExportDossiersDropdown({ data }: ExportDossiersDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal text-xs cursor-pointer">
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Exportálás</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
          Iktatókönyv export ({data.length} tétel)
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-1.5 text-xs"
          onClick={() => exportDossiersToXlsx(data)}
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <div className="flex flex-col">
            <span className="font-medium">Excel munkafüzet</span>
            <span className="text-[10px] text-muted-foreground">Formázott .xlsx táblázat</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer gap-2 py-1.5 text-xs"
          onClick={() => exportDossiersToPdf(data)}
        >
          <FileText className="h-4 w-4 text-rose-500 dark:text-rose-400" />
          <div className="flex flex-col">
            <span className="font-medium">Hivatalos Iktatókönyv</span>
            <span className="text-[10px] text-muted-foreground">Nyomtatható A4 fekvő PDF</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer gap-2 py-1.5 text-xs"
          onClick={() => exportDossiersToCsv(data)}
        >
          <FileDown className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="font-medium">Egyszerű CSV fájl</span>
            <span className="text-[10px] text-muted-foreground">Vesszővel tagolt szöveg</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
