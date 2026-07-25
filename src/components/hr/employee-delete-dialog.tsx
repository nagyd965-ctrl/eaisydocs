"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { removeEmployeeFromHR } from "@/app/hr/settings/actions"

export function EmployeeDeleteDialog({ employeeId, employeeName }: { employeeId: string, employeeName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    const result = await removeEmployeeFromHR(employeeId)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Dolgozó sikeresen törölve a HR rendszerből.")
      router.refresh()
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-destructive/10 hover:text-destructive h-8 w-8 text-destructive">
        <Trash2 className="h-4 w-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Biztosan törlöd a dolgozót?</AlertDialogTitle>
          <AlertDialogDescription>
            Törölni fogod <strong>{employeeName}</strong> HR profilját (adatlap, jogviszony, beosztás).
            A fiókja és bejelentkezési adatai megmaradnak, de HR szempontból kikerül a rendszerből. Ez a művelet nem vonható vissza.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Mégse</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => {
            e.preventDefault()
            handleDelete()
          }} disabled={loading} className="bg-destructive hover:bg-destructive/90">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Igen, Törlés
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
