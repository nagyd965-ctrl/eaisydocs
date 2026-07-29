"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { ExternalLink, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { ManagePostingDialog } from "./manage-posting-dialog"

export function JobPostingsList({ initialPostings, jobs }: { initialPostings: any[], jobs: any[] }) {
  const [postings, setPostings] = useState(initialPostings)
  const supabase = createClient()

  async function toggleStatus(id: string, field: "aktiv" | "publikus", currentVal: boolean) {
    const newVal = !currentVal
    setPostings(prev => prev.map(p => p.id === id ? { ...p, [field]: newVal } : p))
    
    const { error } = await supabase
      .from("hr_allashirdetes")
      .update({ [field]: newVal })
      .eq("id", id)
      
    if (error) {
      toast.error("Hiba a mentés során")
      setPostings(prev => prev.map(p => p.id === id ? { ...p, [field]: currentVal } : p))
    } else {
      toast.success(field === "publikus" ? (newVal ? "Hirdetés publikálva" : "Hirdetés levéve a karrieroldalról") : "Státusz frissítve")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd a hirdetést? Ezt nem lehet visszavonni.")) return
    
    setPostings(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from("hr_allashirdetes").delete().eq("id", id)
    
    if (error) {
      toast.error("Hiba a törlés során (lehet, hogy vannak már jelentkezők?)")
    } else {
      toast.success("Hirdetés törölve")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ManagePostingDialog jobs={jobs} onSaved={(newPosting) => {
          // Kis hack, hogy látszódjon a belső név (munkakör megnevezés) a listában
          const job = jobs.find(j => j.id === newPosting.munkakor_id)
          const postingWithJob = { ...newPosting, hr_munkakor: { megnevezes: job?.megnevezes } }
          
          setPostings(prev => {
            const exists = prev.find(p => p.id === newPosting.id)
            if (exists) return prev.map(p => p.id === newPosting.id ? postingWithJob : p)
            return [postingWithJob, ...prev]
          })
        }} />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hirdetés Címe</TableHead>
              <TableHead>Munkakör</TableHead>
              <TableHead>Létrehozva</TableHead>
              <TableHead className="text-center">Aktív</TableHead>
              <TableHead className="text-center">Publikus</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {postings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Még nincsenek álláshirdetések. Hozz létre egyet!
                </TableCell>
              </TableRow>
            ) : postings.map((posting) => (
              <TableRow key={posting.id}>
                <TableCell className="font-medium">{posting.cim}</TableCell>
                <TableCell>{posting.hr_munkakor?.megnevezes}</TableCell>
                <TableCell>{new Date(posting.created_at).toLocaleDateString('hu-HU')}</TableCell>
                <TableCell className="text-center">
                  <Switch 
                    checked={posting.aktiv} 
                    onCheckedChange={() => toggleStatus(posting.id, "aktiv", posting.aktiv)} 
                  />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Switch 
                      checked={posting.publikus} 
                      onCheckedChange={() => toggleStatus(posting.id, "publikus", posting.publikus)} 
                    />
                    {posting.publikus && posting.aktiv && (
                      <Link href={`/karrier/${posting.id}`} target="_blank" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Megtekint
                      </Link>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ManagePostingDialog jobs={jobs} existingData={posting} onSaved={(updated) => {
                       const job = jobs.find(j => j.id === updated.munkakor_id)
                       const postingWithJob = { ...updated, hr_munkakor: { megnevezes: job?.megnevezes } }
                       setPostings(prev => prev.map(p => p.id === updated.id ? postingWithJob : p))
                    }}>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="w-4 h-4" /></Button>
                    </ManagePostingDialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(posting.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
