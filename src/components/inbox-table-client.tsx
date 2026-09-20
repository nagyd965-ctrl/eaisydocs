"use client"

import { useEffect, useMemo, useState } from "react"
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
import { FolderSymlink } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { DismissInboxDialog } from "@/components/dismiss-inbox-dialog"

export interface InboxItem {
  id: string
  erkeztetoszam: string
  erkezes_datuma: string
  targy: string
  statusz?: string | null
  erkezes_modja: string | null
  kulso_forras: string | null
  partner?: {
    nev?: string | null
  } | null
}

const DEFAULT_COLUMNS: TableColumnOption[] = [
  { id: "erkeztetoszam", label: "Érkeztetőszám", isVisible: true },
  { id: "erkezes_datuma", label: "Érkezés ideje", isVisible: true },
  { id: "kuldo", label: "Küldő", isVisible: true },
  { id: "targy", label: "Tárgy", isVisible: true },
  { id: "csatorna", label: "Csatorna", isVisible: true },
  { id: "muvelet", label: "Művelet", isVisible: true },
]

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

  // Szűrési állapotok
  const [search, setSearch] = useState("")
  const [columns, setColumns] = useState<TableColumnOption[]>(DEFAULT_COLUMNS)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

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
            if (updated.ugyirat_id || updated.statusz === "nem_iktatando") {
              setItems((prev) => prev.filter((item) => item.id !== updated.id))
            } else {
              setItems((prev) =>
                prev.map((item) =>
                  item.id === updated.id
                    ? {
                        ...item,
                        targy: updated.targy || item.targy,
                        erkezes_modja: updated.erkezes_modja || item.erkezes_modja,
                        kulso_forras: updated.kulso_forras || item.kulso_forras,
                      }
                    : item
                )
              )
            }
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id))
          } else if (payload.eventType === "INSERT") {
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

  // Oszlop láthatóság váltás
  const handleToggleColumn = (id: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  const isColVisible = (id: string) => {
    return columns.find((c) => c.id === id)?.isVisible ?? true
  }

  // Szűrők törlése
  const handleClearFilters = () => {
    setSearch("")
    setFromDate("")
    setToDate("")
    setSelectedChannels([])
    setSelectedSources([])
  }

  // Szűrőcsoportok konfigurálása
  const filterGroups: FilterGroup[] = [
    {
      id: "csatorna",
      title: "Csatorna / Érkezés módja",
      options: [
        { id: "email", label: "E-mail", checked: selectedChannels.includes("email") },
        { id: "posta", label: "Posta", checked: selectedChannels.includes("posta") },
        { id: "szemelyes", label: "Személyes", checked: selectedChannels.includes("szemelyes") },
        { id: "eaisybill", label: "eaisyBill számla", checked: selectedChannels.includes("eaisybill") },
        { id: "szkenner", label: "Szkenner", checked: selectedChannels.includes("szkenner") },
        { id: "fax", label: "Fax", checked: selectedChannels.includes("fax") },
        { id: "egyeb", label: "Egyéb", checked: selectedChannels.includes("egyeb") },
      ],
      onToggle: (optId) => {
        setSelectedChannels((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "forras",
      title: "Külső forrás",
      options: [
        { id: "eaisybill", label: "eaisyBill", checked: selectedSources.includes("eaisybill") },
        { id: "szkenner", label: "Szkenner / OCR", checked: selectedSources.includes("szkenner") },
        { id: "manual", label: "Kézi rögzítés", checked: selectedSources.includes("manual") },
      ],
      onToggle: (optId) => {
        setSelectedSources((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
  ]

  const activeFiltersCount = selectedChannels.length + selectedSources.length

  // Szűrt elemek
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Kereső
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchNumber = item.erkeztetoszam?.toLowerCase().includes(q)
        const matchSubject = item.targy?.toLowerCase().includes(q)
        const matchPartner = (item.partner as any)?.nev?.toLowerCase().includes(q)
        const matchMethod = item.erkezes_modja?.toLowerCase().includes(q)
        if (!matchNumber && !matchSubject && !matchPartner && !matchMethod) {
          return false
        }
      }

      // 2. Dátum tól
      if (fromDate) {
        const itemDate = new Date(item.erkezes_datuma).toISOString().split("T")[0]
        if (itemDate < fromDate) return false
      }

      // 3. Dátum ig
      if (toDate) {
        const itemDate = new Date(item.erkezes_datuma).toISOString().split("T")[0]
        if (itemDate > toDate) return false
      }

      // 4. Csatorna szűrő
      if (selectedChannels.length > 0) {
        const channelVal = (item.erkezes_modja || "").toLowerCase()
        const isBill = item.kulso_forras === "eaisybill"
        const isScan = item.kulso_forras === "szkenner"
        const match =
          selectedChannels.includes(channelVal) ||
          (isBill && selectedChannels.includes("eaisybill")) ||
          (isScan && selectedChannels.includes("szkenner"))
        if (!match) return false
      }

      // 5. Forrás szűrő
      if (selectedSources.length > 0) {
        const sourceVal = item.kulso_forras || "manual"
        if (!selectedSources.includes(sourceVal)) return false
      }

      return true
    })
  }, [items, search, fromDate, toDate, selectedChannels, selectedSources])

  const visibleColumnsCount = columns.filter((c) => c.isVisible).length

  return (
    <div className="space-y-3">
      {/* Fejléc: Valós idejű szinkronizáció jelző */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span className="tabular-nums">
          Megjelenítve: <strong className="text-foreground">{filteredItems.length}</strong> / {items.length} tétel
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isLive ? "bg-emerald-500 animate-pulse" : "bg-muted"
            }`}
          />
          {isLive ? "Valós idejű szinkronizáció aktív" : "Szinkronizálás..."}
        </span>
      </div>

      {/* Egységes Táblázat Eszköztár */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Keresés érkeztetőszám, tárgy, küldő szerint..."
        columns={columns}
        onToggleColumn={handleToggleColumn}
        dateRange={{
          from: fromDate,
          to: toDate,
          onFromChange: setFromDate,
          onToChange: setToDate,
        }}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
      />

      {/* Táblázat */}
      <div className="border border-border/50 rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {isColVisible("erkeztetoszam") && <TableHead>Érkeztetőszám</TableHead>}
              {isColVisible("erkezes_datuma") && <TableHead>Érkezés ideje</TableHead>}
              {isColVisible("kuldo") && <TableHead>Küldő</TableHead>}
              {isColVisible("targy") && <TableHead>Tárgy</TableHead>}
              {isColVisible("csatorna") && <TableHead>Csatorna</TableHead>}
              {isColVisible("muvelet") && <TableHead className="text-right">Művelet</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="transition-colors hover:bg-muted/40">
                  {isColVisible("erkeztetoszam") && (
                    <TableCell className="font-medium text-primary">
                      <Link href={`/inbox/view/${item.id}`} className="hover:underline">
                        {item.erkeztetoszam}
                      </Link>
                    </TableCell>
                  )}
                  {isColVisible("erkezes_datuma") && (
                    <TableCell className="tabular-nums text-muted-foreground">
                      {new Date(item.erkezes_datuma).toLocaleString("hu-HU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  )}
                  {isColVisible("kuldo") && (
                    <TableCell>{(item.partner as any)?.nev || "-"}</TableCell>
                  )}
                  {isColVisible("targy") && <TableCell className="max-w-md">{item.targy}</TableCell>}
                  {isColVisible("csatorna") && (
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
                  )}
                  {isColVisible("muvelet") && (
                    <TableCell className="text-right">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-2">
                          <DismissInboxDialog
                            iratId={item.id}
                            erkeztetoszam={item.erkeztetoszam}
                            targy={item.targy}
                            onDismissed={() => {
                              setItems((prev) => prev.filter((i) => i.id !== item.id))
                            }}
                          />
                          <Link
                            href={`/inbox/${item.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <FolderSymlink className="mr-2 h-4 w-4 text-primary" />
                            Iktatás
                          </Link>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnsCount || 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {items.length === 0
                    ? "Nincs új érkeztetett küldemény."
                    : "Nincs a megadott szűrési feltételeknek megfelelő küldemény."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
