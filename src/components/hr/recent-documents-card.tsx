"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, FileArchive } from "lucide-react"

type Document = {
  id: string
  nev: string
  kategoria: string
  url: string
  created_at: string
}

export function RecentDocumentsCard({ documents }: { documents: Document[] }) {
  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" /> Legutóbbi Dokumentumaim
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg border-dashed mt-4 bg-muted/20">
            <FileArchive className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Még nem töltöttek fel számodra HR dokumentumot.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{doc.nev}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(doc.created_at).toLocaleDateString("hu-HU")} • {doc.kategoria || "Dokumentum"}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" asChild>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      Letöltés
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Nincs Fájl</span>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
