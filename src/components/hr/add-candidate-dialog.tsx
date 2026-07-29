"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addCandidate } from "@/app/hr/recruitment/actions"

export function AddCandidateDialog({ jobs }: { jobs: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    // Hozzáadjuk a kiválasztott munkakört a formhoz, ha nincs benne a native select miatt
    if (jobId && !formData.has("jobId")) {
      formData.append("jobId", jobId)
    }
    
    try {
      const res = await addCandidate(formData)
      if (res.error) {
        toast.error("Hiba történt: " + res.error)
      } else {
        toast.success("Jelölt sikeresen hozzáadva!")
        setOpen(false)
      }
    } catch (error) {
      toast.error("Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <UserPlus className="w-4 h-4" />
        Jelentkező Hozzáadása
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új Jelentkező Rögzítése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nev">Teljes Név</Label>
            <Input id="nev" name="nev" required placeholder="Pl. Kiss Péter" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-mail cím</Label>
            <Input id="email" name="email" type="email" required placeholder="peter.kiss@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobId">Megpályázott Pozíció</Label>
            <input type="hidden" name="jobId" value={jobId} />
            <Select value={jobId} onValueChange={(val) => val && setJobId(val)} required>
              <SelectTrigger>
                <span>{jobId ? jobs.find(j => j.id === jobId)?.megnevezes : "Válassz pozíciót..."}</span>
              </SelectTrigger>
              <SelectContent>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>{job.megnevezes}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
