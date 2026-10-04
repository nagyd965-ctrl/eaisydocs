"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  PenLine, 
  UploadCloud, 
  FileCheck, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  RefreshCw 
} from "lucide-react"
import { toast } from "sonner"
import { uploadSignedDocumentAction } from "@/app/hr/employee/[id]/actions"

interface UploadSignedDocumentDialogProps {
  document: {
    id: string
    nev: string
    iktatoszam?: string | null
    alairt_fajl_url?: string | null
    alairas_statusz?: string | null
    alairva_ekor?: string | null
  }
  employeeId: string
  employeeName: string
}

export function UploadSignedDocumentDialog({
  document,
  employeeId,
  employeeName,
}: UploadSignedDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAlreadySigned = !!(document.alairt_fajl_url || document.alairas_statusz === "alairva")

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) {
      toast.error("Kérjük válasszon ki egy aláírt PDF fájlt!")
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append("file", selectedFile)

      toast.info("Aláírt példány feltöltése és verziózása folyamatban...")
      const res = await uploadSignedDocumentAction(document.id, employeeId, formData)

      if (res.success) {
        toast.success(
          isAlreadySigned
            ? "Az aláírt példány sikeresen frissítve!"
            : "Az aláírt példány sikeresen csatolva a személyi dossziéhoz!"
        )
        setOpen(false)
        setSelectedFile(null)
      } else {
        toast.error(res.error || "Hiba történt a feltöltés során.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          isAlreadySigned
            ? `${buttonVariants({ variant: "ghost", size: "icon" })} h-8 w-8 text-primary hover:bg-primary/10`
            : `${buttonVariants({ variant: "outline", size: "sm" })} h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10`
        }
        title={isAlreadySigned ? "Aláírt példány cseréje / új verzió" : "Aláírt példány feltöltése"}
      >
        {isAlreadySigned ? (
          <RefreshCw className="w-3.5 h-3.5" />
        ) : (
          <>
            <PenLine className="w-3.5 h-3.5" />
            <span>Aláírt példány feltöltése</span>
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <PenLine className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {isAlreadySigned ? "Aláírt példány frissítése" : "Aláírt példány csatolása"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {employeeName} • {document.nev}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {document.iktatoszam && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border text-xs">
              <span className="text-muted-foreground">Kapcsolódó iktatószám:</span>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-mono text-xs gap-1">
                <FileCheck className="w-3 h-3" />
                {document.iktatoszam}
              </Badge>
            </div>
          )}

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              Levéltári hitelesség és verziókövetés
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              A feltöltött beszkennelt példány automatikusan az eaisyDocs személyi dossziéba kerül a meglévő iktatószám alá. A korábbi digitális tervezet megmarad az irat előzményeként.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signed-file" className="text-xs font-medium">
              Aláírt dokumentum kiválasztása (PDF vagy kép) <span className="text-destructive">*</span>
            </Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-5 text-center hover:bg-muted/40 transition-colors cursor-pointer space-y-2"
            >
              <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground/60" />
              {selectedFile ? (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "application/pdf"}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-foreground">
                    Kattintson ide a fájl tallózásához
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Támogatott formátumok: PDF, JPG, PNG (max. 25 MB)
                  </p>
                </div>
              )}
              <Input
                ref={fileInputRef}
                id="signed-file"
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !selectedFile}
              className="gap-2 bg-primary text-primary-foreground"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAlreadySigned ? "Példány Frissítése" : "Feltöltés és Csatolás"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
