"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { FolderSymlink, Radio } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export interface InboxItem {
  id: string
  erkeztetoszam: string
  erkezes_datuma: string
  targy: string
  erkezes_modja: string | null
  kulso_forras: string | null
  partner?: {
    nev?: string | null
  } | null
}

export function InboxTableClient({
  initialItems,
  canEdit = true,
}: {
  initialItems: InboxItem[]
  canEdit?: boolean
}) {
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [isLive, setIsLive] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("realtime_inbox_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "irat",
        },
        (payload: any) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new
            // Ha az irat ügyirathoz került (eliktatták), azonnal eltávolítjuk a beérkező listából
            if (updated.ugyirat_id) {
              setItems((prev) => prev.filter((item) => item.id !== updated.id))
            } else {
              // Ha még mindig beérkező, frissítjük az adatait
              setItems((prev) =>
                prev.map((item) =>
                  item.id === updated.id
                    ? {
                        ...item,
                        targy: updated.targy || item.targy,
                        erkezes_modja: updated.erkezes_modja || item.erkezes_modja,
                      }
                    : item
                )
              )
            }
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id))
          } else if (payload.eventType === "INSERT") {
            // Új beérkező érkezett: frissítjük a szerveroldali listát
            router.refresh()
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5 font-medium">
          <span className={`inline-block h-2 w-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
          {isLive ? "Valós idejű szinkronizáció aktív" : "Szinkronizálás..."}
        </span>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Érkeztetőszám</TableHead>
              <TableHead>Érkezés ideje</TableHead>
              <TableHead>Küldő</TableHead>
              <TableHead>Tárgy</TableHead>
              <TableHead>Csatorna</TableHead>
              <TableHead className="text-right">Művelet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items && items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id} className="transition-colors hover:bg-muted/40">
                  <TableCell className="font-medium text-primary">
                    <Link href={`/inbox/view/${item.id}`} className="hover:underline">
                      {item.erkeztetoszam}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {new Date(item.erkezes_datuma).toLocaleString("hu-HU", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{(item.partner as any)?.nev || "-"}</TableCell>
                  <TableCell>{item.targy}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {item.kulso_forras === "eaisybill"
                        ? "eaisyBill"
                        : item.kulso_forras === "szkenner"
                        ? "Szkenner"
                        : item.erkezes_modja
                        ? item.erkezes_modja.charAt(0).toUpperCase() + item.erkezes_modja.slice(1)
                        : "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <Link
                        href={`/inbox/${item.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <FolderSymlink className="mr-2 h-4 w-4 text-primary" />
                        Iktatás
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Nincs új érkeztetett küldemény.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
