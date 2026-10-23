"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Trash2 } from "lucide-react"
import { deleteMunkakor } from "@/app/hr/settings/actions"
import { toast } from "sonner"
import Link from "next/link"
import { JobEditDialog, JobEditData, OrgUnitOption } from "./job-edit-dialog"

export interface JobActionMenuItem extends JobEditData {
  [key: string]: any
}

interface JobActionMenuProps {
  job: JobActionMenuItem
  orgUnits?: OrgUnitOption[]
}

export function JobActionMenu({ job, orgUnits = [] }: JobActionMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteMunkakor(job.id)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Munkakör sikeresen törölve!")
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link href={`/hr/job/${job.id}`}>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary px-2.5">
            Adatlap
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
          title="Szerkesztés"
          onClick={() => setEditOpen(true)}
        >
          <Edit className="h-4 w-4" />
          <span className="sr-only">Szerkesztés</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Törlés"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Törlés</span>
        </Button>
      </div>

      {/* Modern, Spacious Edit Dialog */}
      <JobEditDialog
        job={job}
        orgUnits={orgUnits}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Munkakör Törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd a(z) <strong>{job.megnevezes}</strong> munkakört? Ez a művelet nem vonható vissza. Ha már vannak dolgozók hozzárendelve, a rendszer nem engedi törölni.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Törlés..." : "Igen, törlöm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
