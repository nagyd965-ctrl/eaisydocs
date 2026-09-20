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
import { Button, buttonVariants } from "@/components/ui/button"
import { FolderSymlink, RotateCcw, Loader2, Ban, Inbox } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { DismissInboxDialog } from "@/components/dismiss-inbox-dialog"
import { restoreInboxItem } from "@/app/inbox/inbox-dismiss-actions"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

export interface InboxItem {
  id: string
  erkeztetoszam: string
  erkezes_datuma: string
  targy: string
  statusz?: string | null
  leiras?: string | null
  erkezes_modja: string | null
  kulso_forras: string | null
  partner?: {
    nev?: string | null
  } | null
}

const DEFAULT_ACTIVE_COLUMNS: TableColumnOption[] = [
  { id: "erkeztetoszam", label: "Érkeztetőszám", isVisible: true },
  { id: "erkezes_datuma", label: "Érkezés ideje", isVisible: true },
  { id: "kuldo", label: "Küldő", isVisible: true },
  { id: "targy", label: "Tárgy", isVisible: true },
  { id: "csatorna", label: "Csatorna", isVisible: true },
  { id: "muvelet", label: "Művelet", isVisible: true },
]

const DEFAULT_DISMISSED_COLUMNS: TableColumnOption[] = [
  { id: "erkeztetoszam", label: "Érkeztetőszám", isVisible: true },
  { id: "erkezes_datuma", label: "Érkezés ideje", isVisible: true },
  { id: "kuldo", label: "Küldő", isVisible: true },
  { id: "targy", label: "Tárgy", isVisible: true },
  { id: "indoklas", label: "Mellőzés indoka", isVisible: true },
  { id: "muvelet", label: "Művelet", isVisible: true },
]

export function InboxTableClient({
  initialItems = [],
  initialDismissedItems = [],
  canEdit = true,
}: {
  initialItems?: InboxItem[]
  initialDismissedItems?: InboxItem[]
  canEdit?: boolean
}) {
  const [activeTab, setActiveTab] = useState<"active" | "dismissed">("active")
  const [activeItems, setActiveItems] = useState<InboxItem[]>(initialItems)
  const [dismissedItems, setDismissedItems] = useState<InboxItem[]>(initialDismissedItems)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const router = useRouter()

  // Szűrési állapotok
  const [search, setSearch] = useState("")
  const [activeColumns, setActiveColumns] = useState<TableColumnOption[]>(DEFAULT_ACTIVE_COLUMNS)
  const [dismissedColumns, setDismissedColumns] = useState<TableColumnOption[]>(DEFAULT_DISMISSED_COLUMNS)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  useEffect(() => {
    setActiveItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    setDismissedItems(initialDismissedItems)
  }, [initialDismissedItems])

  // Valós idejű szinkronizáció
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
            if (updated.ugyirat_id) {
              // Iktatva lett egy ügyiratba -> kikerül mindkét nézetből
              setActiveItems((prev) => prev.filter((item) => item.id !== updated.id))
              setDismissedItems((prev) => prev.filter((item) => item.id !== updated.id))
            } else if (updated.statusz === "nem_iktatando") {
              // Nem iktatandóvá vált -> átkerül a dismissed nézetbe
              setActiveItems((prev) => prev.filter((item) => item.id !== updated.id))
              setDismissedItems((prev) => {
                const exists = prev.some((i) => i.id === updated.id)
                if (exists) {
                  return prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
                }
                return [{ ...updated }, ...prev]
              })
            } else {
              // Normál vagy visszaállított
              setDismissedItems((prev) => prev.filter((item) => item.id !== updated.id))
              setActiveItems((prev) => {
                const exists = prev.some((i) => i.id === updated.id)
                if (exists) {
                  return prev.map((i) =>
                    i.id === updated.id
                      ? {
                          ...i,
                          targy: updated.targy || i.targy,
                          erkezes_modja: updated.erkezes_modja || i.erkezes_modja,
                          kulso_forras: updated.kulso_forras || i.kulso_forras,
                          statusz: updated.statusz || i.statusz,
                          leiras: updated.leiras || i.leiras,
                        }
                      : i
                  )
                }
                return [{ ...updated }, ...prev]
              })
            }
          } else if (payload.eventType === "DELETE") {
            setActiveItems((prev) => prev.filter((item) => item.id !== payload.old.id))
            setDismissedItems((prev) => prev.filter((item) => item.id !== payload.old.id))
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

  // Visszaállítás kezelése
  const handleRestore = async (item: InboxItem) => {
    setRestoringId(item.id)
    const res = await restoreInboxItem(item.id)
    setRestoringId(null)

    if (res.error) {
      toast.error("Hiba történt", { description: res.error })
    } else {
      toast.success("Küldemény visszaállítva!", {
        description: `${item.erkeztetoszam} visszakerült a feldolgozásra váró bejövő sorba.`,
      })
      setDismissedItems((prev) => prev.filter((i) => i.id !== item.id))
      setActiveItems((prev) => [{ ...item, statusz: "erkeztetve" }, ...prev])
    }
  }

  // Oszlop láthatóság váltás
  const currentColumns = activeTab === "active" ? activeColumns : dismissedColumns
  const handleToggleColumn = (id: string) => {
    if (activeTab === "active") {
      setActiveColumns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c))
      )
    } else {
      setDismissedColumns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c))
      )
    }
  }

  const isColVisible = (id: string) => {
    return currentColumns.find((c) => c.id === id)?.isVisible ?? true
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

  // Aktuálisan megjelenítendő elemek a kiválasztott fül szerint
  const itemsToFilter = activeTab === "active" ? activeItems : dismissedItems

  // Szűrt elemek
  const filteredItems = useMemo(() => {
    return itemsToFilter.filter((item) => {
      // 1. Kereső
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchNumber = item.erkeztetoszam?.toLowerCase().includes(q)
        const matchSubject = item.targy?.toLowerCase().includes(q)
        const matchPartner = (item.partner as any)?.nev?.toLowerCase().includes(q)
        const matchMethod = item.erkezes_modja?.toLowerCase().includes(q)
        const matchReason = item.leiras?.toLowerCase().includes(q)
        if (!matchNumber && !matchSubject && !matchPartner && !matchMethod && !matchReason) {
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
  }, [itemsToFilter, search, fromDate, toDate, selectedChannels, selectedSources])

  const visibleColumnsCount = currentColumns.filter((c) => c.isVisible).length

  return (
    <div className="space-y-4">
      {/* Kétállású Fülváltó: Feldolgozásra vár vs. Nem iktatandó */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as "active" | "dismissed")
            setSearch("")
          }}
        >
          <TabsList className="bg-muted/60 p-1 border border-border/50">
            <TabsTrigger value="active" className="gap-2 cursor-pointer">
              <Inbox className="h-3.5 w-3.5 text-primary" />
              <span>Feldolgozásra vár</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal tabular-nums">
                {activeItems.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="dismissed" className="gap-2 cursor-pointer">
              <Ban className="h-3.5 w-3.5 text-amber-500" />
              <span>Nem iktatandó</span>
              {dismissedItems.length > 0 && (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0 text-xs font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 tabular-nums"
                >
                  {dismissedItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Valós idejű szinkronizáció jelző */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto">
          <span className="tabular-nums">
            Megjelenítve: <strong className="text-foreground">{filteredItems.length}</strong> / {itemsToFilter.length}
          </span>
          <span className="flex items-center gap-1.5 font-medium ml-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isLive ? "bg-emerald-500 animate-pulse" : "bg-muted"
              }`}
            />
            {isLive ? "Élő szinkron" : "Kapcsolódás..."}
          </span>
        </div>
      </div>

      {/* Egységes Táblázat Eszköztár */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          activeTab === "active"
            ? "Keresés érkeztetőszám, tárgy, küldő szerint..."
            : "Keresés érkeztetőszám, tárgy, indoklás szerint..."
        }
        columns={currentColumns}
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
              {activeTab === "active" && isColVisible("csatorna") && <TableHead>Csatorna</TableHead>}
              {activeTab === "dismissed" && isColVisible("indoklas") && <TableHead>Mellőzés indoka</TableHead>}
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

                  {/* Csatorna (csak aktív fülön) */}
                  {activeTab === "active" && isColVisible("csatorna") && (
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

                  {/* Mellőzés indoka (csak dismissed fülön) */}
                  {activeTab === "dismissed" && isColVisible("indoklas") && (
                    <TableCell className="max-w-xs">
                      <span className="text-xs text-muted-foreground line-clamp-2" title={item.leiras || "Nem iktatandó küldemény"}>
                        {item.leiras || "Iktatás mellőzve (kéretlen küldemény)"}
                      </span>
                    </TableCell>
                  )}

                  {/* Műveletek */}
                  {isColVisible("muvelet") && (
                    <TableCell className="text-right">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === "active" ? (
                            <>
                              <DismissInboxDialog
                                iratId={item.id}
                                erkeztetoszam={item.erkeztetoszam}
                                targy={item.targy}
                                onDismissed={(reason) => {
                                  setActiveItems((prev) => prev.filter((i) => i.id !== item.id))
                                  setDismissedItems((prev) => [
                                    { ...item, statusz: "nem_iktatando", leiras: reason },
                                    ...prev,
                                  ])
                                }}
                              />
                              <Link
                                href={`/inbox/${item.id}`}
                                className={buttonVariants({ variant: "outline", size: "sm" })}
                              >
                                <FolderSymlink className="mr-2 h-4 w-4 text-primary" />
                                Iktatás
                              </Link>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={restoringId === item.id}
                              onClick={() => handleRestore(item)}
                              className="text-xs h-8 gap-1.5 hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                              title="Visszahelyezés a feldolgozásra váró iktatandó sorba"
                            >
                              {restoringId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                              )}
                              <span>Visszaállítás</span>
                            </Button>
                          )}
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
                  {activeTab === "active"
                    ? activeItems.length === 0
                      ? "Nincs új érkeztetett küldemény."
                      : "Nincs a szűrésnek megfelelő feldolgozásra váró küldemény."
                    : dismissedItems.length === 0
                    ? "Nincs mellőzött (nem iktatandó) küldemény."
                    : "Nincs a szűrésnek megfelelő nem iktatandó küldemény."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
