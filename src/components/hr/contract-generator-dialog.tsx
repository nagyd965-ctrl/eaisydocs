"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Printer, ChevronDown } from "lucide-react"

export function ContractGeneratorDialog({ employee, adatlap }: { employee: any, adatlap: any }) {
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState("alap_munkaszerzodes")

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 border" />}>
        <FileText className="w-4 h-4" />
        Szerződés Generálása
        <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden print:max-w-none print:w-full print:m-0 print:p-0 print:border-none print:shadow-none">
        <div className="print:hidden">
          <DialogHeader>
            <DialogTitle>Szerződés Generátor</DialogTitle>
            <DialogDescription>
              Válassz sablont a dokumentum legenerálásához, majd nyomtasd ki PDF-be.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-end border-b pb-6 mb-6">
            <div className="space-y-2 flex-1 w-full">
              <Label>Szerződés Sablon</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz sablont...">
                    {template === "alap_munkaszerzodes" && "Alap Munkaszerződés"}
                    {template === "bermodositas" && "Bérmódosítás (Tájékoztató)"}
                    {template === "titoktartasi" && "Titoktartási Nyilatkozat (NDA)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alap_munkaszerzodes">Alap Munkaszerződés</SelectItem>
                  <SelectItem value="bermodositas">Bérmódosítás (Tájékoztató)</SelectItem>
                  <SelectItem value="titoktartasi">Titoktartási Nyilatkozat (NDA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handlePrint} className="gap-2 w-full sm:w-auto">
              <Printer className="w-4 h-4" />
              Nyomtatás / PDF mentés
            </Button>
          </div>
        </div>

        {/* Nyomtatható A4-es nézet (képernyőn reszponzív, nyomtatáskor A4) */}
        <div className="print:block bg-white text-black p-6 sm:p-12 min-h-0 sm:min-h-[297mm] w-full max-w-[210mm] mx-auto border shadow-sm print:border-none print:shadow-none">
          {template === "alap_munkaszerzodes" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-center mb-10 uppercase tracking-widest">Munkaszerződés</h1>
              
              <p className="text-justify leading-relaxed">
                Amely létrejött egyrészről a(z) <strong>eaisyDocs Zrt.</strong> (Székhely: 1111 Budapest, Példa utca 1., Adószám: 12345678-2-41), 
                mint Munkáltató,
              </p>
              
              <p className="text-justify leading-relaxed">
                másrészről <strong>{employee?.nev || "Ismeretlen"}</strong> (Születési hely, idő: {adatlap?.szuletesi_hely || "................"}, {adatlap?.szuletesi_ido ? new Date(adatlap.szuletesi_ido).toLocaleDateString("hu-HU") : "................"},
                Anyja neve: {adatlap?.anyja_neve || "................"}, TAJ szám: {adatlap?.taj_szam || "................"}), mint Munkavállaló között 
                az alulírott helyen és napon az alábbi feltételekkel:
              </p>

              <ol className="list-decimal pl-6 space-y-4 text-justify leading-relaxed mt-6">
                <li>
                  A Munkáltató a Munkavállalót <strong>{adatlap?.hr_munkakor?.megnevezes || "kijelölt munkakör"}</strong> munkakörben foglalkoztatja. 
                  A munkakörhöz tartozó feladatokat a Munkaköri Leírás tartalmazza, amely jelen szerződés elválaszthatatlan mellékletét képezi.
                </li>
                <li>
                  A munkaviszony kezdete: <strong>{adatlap?.belepes_datuma ? new Date(adatlap.belepes_datuma).toLocaleDateString("hu-HU") : "................"}</strong>.
                </li>
                <li>
                  A felek megállapodnak abban, hogy a munkaviszony <strong>{adatlap?.szerzodes_tipusa === "határozott" ? "határozott" : "határozatlan"}</strong> idejű.
                  {adatlap?.szerzodes_tipusa === "határozott" && adatlap?.munkaviszony_vege && (
                    <span> A határozott idő lejárata: <strong>{new Date(adatlap.munkaviszony_vege).toLocaleDateString("hu-HU")}</strong>.</span>
                  )}
                </li>
                <li>
                  A Munkavállaló alapbére havi bruttó <strong>{adatlap?.alapber ? adatlap.alapber.toLocaleString("hu-HU") : "................"} Ft</strong>.
                </li>
                <li>
                  A munkavégzés helye a Munkáltató mindenkori székhelye, illetve a Munkáltató által meghatározott egyéb helyszín.
                </li>
              </ol>

              <div className="mt-20 pt-10 flex justify-between">
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2"></div>
                  <p>Munkáltató</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2"></div>
                  <p>Munkavállaló</p>
                </div>
              </div>
            </div>
          )}

          {template === "bermodositas" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-center mb-10 uppercase tracking-widest">Tájékoztató Bérmódosításról</h1>
              <p>Tisztelt <strong>{employee?.nev}</strong>!</p>
              <p className="text-justify leading-relaxed">
                Tájékoztatjuk, hogy a munkaszerződésében meghatározott alapbére a mai naptól kezdődően bruttó <strong>{adatlap?.alapber ? adatlap.alapber.toLocaleString("hu-HU") : "................"} Ft</strong> összegre módosul.
              </p>
              <p>Minden egyéb feltétel változatlan marad.</p>
              
              <div className="mt-20 pt-10 flex justify-between">
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2"></div>
                  <p>HR Vezető</p>
                </div>
              </div>
            </div>
          )}

          {template === "titoktartasi" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-center mb-10 uppercase tracking-widest">Titoktartási Nyilatkozat</h1>
              <p className="text-justify leading-relaxed">
                Alulírott <strong>{employee?.nev}</strong> büntetőjogi felelősségem tudatában kijelentem, hogy a cég működésével kapcsolatos minden információt üzleti titokként kezelek.
              </p>
              <div className="mt-20 pt-10 flex justify-end">
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2"></div>
                  <p>Munkavállaló</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
