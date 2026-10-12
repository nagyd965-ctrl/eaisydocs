"use client"

import { useState, useTransition, useMemo } from "react"
import {
  importInvoiceFromEaisyBill,
  type EaisyBillInvoice,
} from "@/app/inbox/eaisybill-actions"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { DocumentPreviewFrame } from "@/components/document-preview-frame"
import {
  ArrowDownToLine, CheckCircle2, ExternalLink, Loader2,
  ChevronDown, ChevronUp, Receipt, AlertCircle, Search, X, Eye,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Props {
  invoices: EaisyBillInvoice[]
  fetchError?: string
}

function formatAmount(amount: string, currency: string) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: currency || "HUF",
    maximumFractionDigits: 0,
  }).format(parseFloat(amount))
}

export function EaisyBillImportPanel({ invoices, fetchError }: Props) {
  const [open, setOpen]                       = useState(false)
  const [importedIds, setImportedIds]         = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId]             = useState<string | null>(null)
  const [isPending, startTransition]          = useTransition()
  const [query, setQuery]                     = useState("")
  const [previewInvoice, setPreviewInvoice]   = useState<EaisyBillInvoice | null>(null)

  const handleImport = (invoice: EaisyBillInvoice) => {
    setLoadingId(invoice.id)
    startTransition(async () => {
      const result = await importInvoiceFromEaisyBill(invoice)
      setLoadingId(null)
      if (result.success) {
        setImportedIds(prev => new Set([...prev, invoice.id]))
        toast.success("Sikeresen átvéve", {
          description: "Érkeztetőszám: " + result.erkeztetoszam,
        })
      } else {
        toast.error("Sikertelen átvétel", { description: result.error })
      }
    })
  }

  const pendingCount = invoices.filter(inv => !importedIds.has(inv.id)).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter(inv => {
      const dirLabel = inv.invoice_direction === "INBOUND" ? "bejövő inbound" : "kimenő outbound"
      return (
        inv.bizonylatsorszam?.toLowerCase().includes(q) ||
        inv.elado_nev?.toLowerCase().includes(q) ||
        dirLabel.includes(q)
      )
    })
  }, [invoices, query])

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Importálás eaisyBill-ből</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fetchError ? "Kapcsolódási hiba" : pendingCount + " importálható számla vár"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!fetchError && pendingCount > 0 && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{pendingCount} db</Badge>
              )}
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
        {open && (
          <CardContent className="p-0">
            {fetchError ? (
              <div className="flex items-center gap-2 text-destructive text-sm px-6 py-4">
                <AlertCircle className="h-4 w-4 shrink-0" />{fetchError}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/40" />
                Minden számla importálva van.
              </div>
            ) : (
              <>
                <div className="px-6 py-3 border-b flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input id="eaisybill-search" placeholder="Keresés bizonylat, feladó, irány szerint..." value={query} onChange={e => setQuery(e.target.value)} className="pl-8 h-8 text-sm" />
                    {query && (
                      <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {query && <span className="text-xs text-muted-foreground shrink-0">{filtered.length} / {invoices.length} találat</span>}
                </div>
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Search className="h-6 w-6 mx-auto mb-2 opacity-30" />Nincs találat.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Bizonylat</TableHead>
                        <TableHead>Feladó</TableHead>
                        <TableHead>Összeg</TableHead>
                        <TableHead>Kibocsátás</TableHead>
                        <TableHead>Fizetési határidő</TableHead>
                        <TableHead>Irány</TableHead>
                        <TableHead className="text-right pr-6">Műveletek</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(inv => {
                        const isImported = importedIds.has(inv.id)
                        const isLoading  = loadingId === inv.id
                        return (
                          <TableRow key={inv.id} className={isImported ? "opacity-50" : "hover:bg-muted/20"}>
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-1.5">
                                {inv.melleklet_url ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewInvoice(inv)}
                                    className="font-mono text-xs font-medium text-primary hover:underline cursor-pointer text-left"
                                    title="Számla gyors megtekintése"
                                  >
                                    {inv.bizonylatsorszam}
                                  </button>
                                ) : (
                                  <span className="font-mono text-xs font-medium">{inv.bizonylatsorszam}</span>
                                )}
                                {inv.melleklet_url && (
                                  <a
                                    href={inv.melleklet_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary"
                                    title="Megnyitás külső lapon"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate" title={inv.elado_nev}>{inv.elado_nev}</TableCell>
                            <TableCell className="font-medium tabular-nums text-sm">{formatAmount(inv.brutto_vegosszeg, inv.penznem)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground tabular-nums">{format(new Date(inv.kibocsatas_datuma), "yyyy. MM. dd.", { locale: hu })}</TableCell>
                            <TableCell className="text-xs tabular-nums">{inv.fizetesi_hatarido ? format(new Date(inv.fizetesi_hatarido), "yyyy. MM. dd.", { locale: hu }) : "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={"text-[10px] " + (inv.invoice_direction === "INBOUND" ? "border-blue-500/40 text-blue-600" : "border-amber-500/40 text-amber-600")}>
                                {inv.invoice_direction === "INBOUND" ? "Bejövő" : "Kimenő"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {inv.melleklet_url && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                                    onClick={() => setPreviewInvoice(inv)}
                                    title="Számla gyors megtekintése"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {isImported ? (
                                  <span className="text-xs text-emerald-600 font-medium px-1">Átvéve</span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5 font-medium"
                                    disabled={isLoading || isPending}
                                    onClick={() => handleImport(inv)}
                                  >
                                    {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Átvesz
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* eaisyBill Számla Gyors Megtekintés Modál */}
      <Dialog
        open={!!previewInvoice}
        onOpenChange={(o) => {
          if (!o) setPreviewInvoice(null)
        }}
      >
        {previewInvoice && (
          <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-full h-[90vh] flex flex-col p-4 sm:p-6 gap-3">
            <DialogHeader className="space-y-1 pb-2 border-b">
              <div className="flex items-center justify-between gap-4 mr-6">
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-semibold truncate flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{previewInvoice.bizonylatsorszam}</span>
                    <Badge
                      variant="outline"
                      className={
                        "text-[10px] " +
                        (previewInvoice.invoice_direction === "INBOUND"
                          ? "border-blue-500/40 text-blue-600"
                          : "border-amber-500/40 text-amber-600")
                      }
                    >
                      {previewInvoice.invoice_direction === "INBOUND" ? "Bejövő számla" : "Kimenő számla"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[
                      previewInvoice.elado_nev,
                      formatAmount(previewInvoice.brutto_vegosszeg, previewInvoice.penznem),
                      `Kelt: ${format(new Date(previewInvoice.kibocsatas_datuma), "yyyy. MM. dd.", { locale: hu })}`,
                      previewInvoice.fizetesi_hatarido
                        ? `Határidő: ${format(new Date(previewInvoice.fizetesi_hatarido), "yyyy. MM. dd.", { locale: hu })}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {previewInvoice.melleklet_url && (
                    <a
                      href={previewInvoice.melleklet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      )}
                      title="Megnyitás külső lapon"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="hidden sm:inline">Új lapon</span>
                    </a>
                  )}

                  {importedIds.has(previewInvoice.id) ? (
                    <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Átvéve</span>
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer"
                      disabled={loadingId === previewInvoice.id || isPending}
                      onClick={() => handleImport(previewInvoice)}
                    >
                      {loadingId === previewInvoice.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ArrowDownToLine className="h-3 w-3" />
                      )}
                      <span>Átvesz a bejövő sorba</span>
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 bg-muted/20 rounded-md border border-border/40 overflow-hidden relative">
              <DocumentPreviewFrame
                src={previewInvoice.melleklet_url}
                title={previewInvoice.bizonylatsorszam}
                emptyMessage="A számlához nem található közvetlenül elérhető PDF csatolmány az eaisyBill-ben."
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}