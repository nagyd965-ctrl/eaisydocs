"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, FileText, ExternalLink, Loader2 } from "lucide-react"
import { acknowledgeDocument } from "@/app/hr/self-service/dokumentumok/actions"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface DocumentListProps {
  documents: any[]
}

export function DocumentList({ documents }: DocumentListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleAcknowledge = async (id: string) => {
    setLoadingId(id)
    const res = await acknowledgeDocument(id)
    setLoadingId(null)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Dokumentum sikeresen nyugtázva!")
    }
  }

  if (documents.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
        Nincsenek elérhető vagy kötelező dokumentumok.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {documents.map((doc) => {
        const isAcknowledged = doc.hr_ceges_dokumentum_nyugtazas && doc.hr_ceges_dokumentum_nyugtazas.length > 0
        const isRequired = doc.kotelezo_mindenkinek
        
        return (
          <div key={doc.id} className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
            {isAcknowledged && (
              <div className="absolute top-0 right-0 bg-primary/10 text-primary px-3 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Elfogadva
              </div>
            )}
            
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-xl ${isAcknowledged ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 pr-24">
                <h3 className="font-semibold text-lg leading-tight mb-1">{doc.cim}</h3>
                {isRequired && !isAcknowledged && (
                  <Badge variant="destructive" className="mb-2 shadow-sm">Kötelező megismerni</Badge>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">{doc.leiras}</p>
              </div>
            </div>
            
            <div className="mt-auto pt-4 flex gap-3 border-t">
              <a href={doc.fajl_path} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Megnyitás
                </Button>
              </a>
              
              {!isAcknowledged && (
                <Button 
                  className="flex-1"
                  onClick={() => handleAcknowledge(doc.id)}
                  disabled={loadingId === doc.id}
                >
                  {loadingId === doc.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Elfogadom
                </Button>
              )}
            </div>
            
            {isAcknowledged && (
              <div className="mt-4 pt-3 border-t text-xs text-muted-foreground text-center">
                Nyugtázva: {new Date(doc.hr_ceges_dokumentum_nyugtazas[0].nyugtazva_mikor).toLocaleString('hu-HU')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
