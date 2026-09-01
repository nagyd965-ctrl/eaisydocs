"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, FileText, ExternalLink, Loader2, Printer } from "lucide-react"
import { acknowledgeDocument } from "@/app/hr/self-service/dokumentumok/actions"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PortalDocument {
  id: string
  cim: string
  leiras?: string | null
  kotelezo_nyugtazas?: boolean
  kotelezo_mindenkinek?: boolean
  nyugtazva?: boolean
  nyugtazva_mikor?: string | null
  fajl_url?: string | null
  dokumentum_tipus?: string | null
  hr_ceges_dokumentum_nyugtazas?: { nyugtazva_mikor?: string | null }[] | null
}

interface DocumentListProps {
  documents: PortalDocument[]
  userName: string
}

export function DocumentList({ documents, userName }: DocumentListProps) {
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

  const handlePrint = (docTitle: string) => {
    const printContent = document.getElementById("print-document");
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=900');
    if (!printWindow) {
      toast.error("A böngésző blokkolta a felugró ablakot!");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle} - ${userName}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 1.5cm; line-height: 1.6; color: black; }
            h2 { text-align: center; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 1rem; margin-bottom: 2rem; font-size: 24px; }
            p { text-align: justify; margin-bottom: 1rem; font-size: 16px; }
            .flex-between { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6rem; }
            .signature { text-align: center; width: 250px; }
            .signature-line { border-bottom: 1px solid black; margin-bottom: 5px; }
            .text-sm { font-size: 14px; color: #555; }
            .subtitle { text-align: center; color: #666; font-size: 14px; margin-top: -15px; margin-bottom: 30px; }
            /* Hide print-hidden classes when printing */
            .print-hidden { display: none !important; }
          </style>
        </head>
        <body>
          <h2>${docTitle}</h2>
          <div class="subtitle">Elektronikus Nyilatkozat</div>
          
          <p><strong>Alulírott:</strong> ${userName}</p>
          <p>A mai nappal nyilatkozom arról, hogy a(z) <strong>${docTitle}</strong> dokumentumban foglalt feltételeket, szabályokat és előírásokat megismertem, azokat részletesen áttanulmányoztam, és magamra nézve kötelező érvényűnek fogadom el.</p>
          <p>Kijelentem, hogy a szabályzat rendelkezéseit a munkavégzésem során maradéktalanul betartom. Tudomásul veszem, hogy a szabályzat megszegése munkajogi következményekkel, illetve kártérítési felelősséggel járhat.</p>
          
          <div class="flex-between">
            <div>
              <p>Kelt: Budapest, ${new Date().toLocaleDateString('hu-HU')}</p>
            </div>
            <div class="signature">
              <div class="signature-line"></div>
              <strong>${userName}</strong>
              <div class="text-sm">elektronikus aláírás helye</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  const generateTemplate = (doc: PortalDocument) => {
    return (
      <div id="print-document" className="p-4 sm:p-8 bg-card text-foreground font-serif w-full mx-auto space-y-6">
        <div className="text-center pb-6 border-b print-hidden">
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-foreground">{doc.cim}</h2>
          <p className="text-sm text-muted-foreground mt-2">Elektronikus Nyilatkozat</p>
        </div>
        
        <div className="space-y-4 text-left leading-relaxed text-base print-hidden">
          <p><strong>Alulírott:</strong> {userName}</p>
          <p>
            A mai nappal nyilatkozom arról, hogy a(z) <strong>{doc.cim}</strong> dokumentumban foglalt 
            feltételeket, szabályokat és előírásokat megismertem, azokat részletesen áttanulmányoztam, 
            és magamra nézve kötelező érvényűnek fogadom el.
          </p>
          <p>
            Kijelentem, hogy a szabályzat rendelkezéseit a munkavégzésem során maradéktalanul betartom. 
            Tudomásul veszem, hogy a szabályzat megszegése munkajogi következményekkel, illetve kártérítési 
            felelősséggel járhat.
          </p>
          
          <div className="pt-12 sm:pt-16 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-8 sm:gap-0">
            <div>
              <p>Kelt: Budapest, {new Date().toLocaleDateString('hu-HU')}</p>
            </div>
            <div className="text-center w-64 self-center sm:self-auto">
              <div className="border-b border-foreground mb-2"></div>
              <p className="font-semibold text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">elektronikus aláírás helye</p>
            </div>
          </div>
        </div>
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
              <Dialog>
                <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Megnyitás
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
                  <DialogHeader>
                    <DialogTitle>Dokumentum Megtekintése</DialogTitle>
                    <DialogDescription>A te adataiddal legenerált dokumentum-sablon.</DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    {generateTemplate(doc)}
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button variant="secondary" onClick={() => handlePrint(doc.cim)}>
                      <Printer className="w-4 h-4 mr-2" />
                      Nyomtatás / Mentés PDF-ként
                    </Button>
                    <DialogClose className={buttonVariants({ variant: "outline" })}>
                      Bezárás
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
              
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
                Nyugtázva: {doc.hr_ceges_dokumentum_nyugtazas?.[0]?.nyugtazva_mikor ? new Date(doc.hr_ceges_dokumentum_nyugtazas[0].nyugtazva_mikor).toLocaleString('hu-HU') : 'Igen'}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
