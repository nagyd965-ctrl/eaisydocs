"use client"

import { useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { UserMinus } from "lucide-react"
import { removeEmployeeFromJob } from "./actions"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function RemoveEmployeeButton({ jobId, employeeId, employeeName }: { jobId: string, employeeId: string, employeeName?: string }) {
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    setLoading(true)
    const result = await removeEmployeeFromJob(jobId, employeeId)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Dolgozó sikeresen eltávolítva a munkakörből.")
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive h-8 w-8 p-0" })} title="Kivétel a munkakörből">
        <UserMinus className="h-4 w-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dolgozó Eltávolítása</AlertDialogTitle>
          <AlertDialogDescription>
            Biztosan ki szeretnéd venni <strong>{employeeName || "ezt a dolgozót"}</strong> ebből a munkakörből? 
            Az adatai és a korábbi naplóbejegyzései megmaradnak, de a profilján ez a munkakör törlődik (amíg nem kap újat).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Mégse</AlertDialogCancel>
          <button 
            type="button"
            onClick={handleRemove} 
            disabled={loading}
            className={buttonVariants({ variant: "destructive", className: "bg-destructive hover:bg-destructive/90 text-white" })}
          >
            {loading ? "Eltávolítás..." : "Eltávolítás"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
