"use client"

import * as React from "react"
import { Search, Columns3, Filter, X, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface TableColumnOption {
  id: string
  label: string
  isVisible: boolean
}

export interface FilterOption {
  id: string
  label: string
  checked: boolean
}

export interface FilterGroup {
  id: string
  title: string
  options: FilterOption[]
  onToggle: (optionId: string) => void
}

export interface DateRangeFilter {
  from: string
  to: string
  onFromChange: (val: string) => void
  onToChange: (val: string) => void
}

export interface TableToolbarProps {
  // Kereső
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string

  // Oszlop választó
  columns?: TableColumnOption[]
  onToggleColumn?: (columnId: string) => void

  // Szűrők
  dateRange?: DateRangeFilter
  filterGroups?: FilterGroup[]
  activeFiltersCount?: number
  onClearFilters?: () => void

  // Extra akciók (pl. új elem gomb, export gomb a jobb oldalon)
  actions?: React.ReactNode
  className?: string
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Keresés...",
  columns,
  onToggleColumn,
  dateRange,
  filterGroups = [],
  activeFiltersCount = 0,
  onClearFilters,
  actions,
  className,
}: TableToolbarProps) {
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [columnsOpen, setColumnsOpen] = React.useState(false)

  const hasActiveFilters = activeFiltersCount > 0 || !!(dateRange?.from || dateRange?.to)

  const totalActiveCount =
    activeFiltersCount +
    (dateRange?.from ? 1 : 0) +
    (dateRange?.to ? 1 : 0)

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 py-1", className)}>
      {/* Bal oldal: Kereső mező */}
      <div className="relative flex-1 min-w-[240px] max-w-lg">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8 pr-8 bg-background border-input h-9 text-sm rounded-md transition-colors"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Keresés törlése"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Jobb oldal: Oszlopválasztó + Szűrés + Opcionális Extra Műveletek */}
      <div className="flex items-center gap-2">
        {/* OSZLOPOK VÁLASZTÓ POPOVER */}
        {columns && onToggleColumn && (
          <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "h-9 w-9 bg-background hover:bg-muted/40 border-input shrink-0 cursor-pointer"
              )}
              title="Oszlopok testreszabása"
            >
              <Columns3 className="h-4 w-4 text-foreground/80" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 rounded-lg bg-popover border border-border shadow-none">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
                Oszlopok
              </div>
              <div className="space-y-1 py-1 max-h-64 overflow-y-auto">
                {columns.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => onToggleColumn(col.id)}
                    className="flex items-center space-x-2.5 px-2 py-1.5 rounded-md hover:bg-muted/40 cursor-pointer text-sm select-none transition-colors"
                  >
                    <Checkbox
                      checked={col.isVisible}
                      onCheckedChange={() => onToggleColumn(col.id)}
                      id={`col-${col.id}`}
                    />
                    <Label
                      htmlFor={`col-${col.id}`}
                      className="text-xs font-medium cursor-pointer flex-1"
                      onClick={(e) => e.preventDefault()}
                    >
                      {col.label}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* SZŰRŐ POPOVER */}
        {(filterGroups.length > 0 || dateRange) && (
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "h-9 px-3.5 gap-2 font-medium shrink-0 transition-all cursor-pointer",
                hasActiveFilters
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-1 ring-primary/50"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Filter className="h-4 w-4" />
              <span>Szűrés</span>
              {totalActiveCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold bg-background text-foreground shrink-0"
                >
                  {totalActiveCount}
                </Badge>
              )}
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="w-[340px] sm:w-[420px] p-4 rounded-lg bg-popover border border-border shadow-none space-y-4"
            >
              {/* Dátum tartomány (Dátum tól / Dátum ig) */}
              {dateRange && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-from-date" className="text-xs font-medium text-foreground">
                      Dátum tól
                    </Label>
                    <div className="relative">
                      <Input
                        id="filter-from-date"
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => dateRange.onFromChange(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-to-date" className="text-xs font-medium text-foreground">
                      Dátum ig
                    </Label>
                    <div className="relative">
                      <Input
                        id="filter-to-date"
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => dateRange.onToChange(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Szűrőcsoportok lekerekített kártyákban (mint a képernyőképen) */}
              <div
                className={cn(
                  "grid gap-3 max-h-[380px] overflow-y-auto pr-1",
                  filterGroups.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                )}
              >
                {filterGroups.map((group) => (
                  <div
                    key={group.id}
                    className="border border-border/60 rounded-lg p-3 bg-muted/20 space-y-2 flex flex-col justify-start"
                  >
                    <div className="text-xs font-semibold text-foreground/90 border-b border-border/40 pb-1.5">
                      {group.title}
                    </div>
                    <div className="space-y-1.5 pt-0.5">
                      {group.options.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => group.onToggle(opt.id)}
                          className="flex items-center space-x-2 cursor-pointer text-xs group select-none"
                        >
                          <Checkbox
                            checked={opt.checked}
                            onCheckedChange={() => group.onToggle(opt.id)}
                            id={`opt-${group.id}-${opt.id}`}
                          />
                          <Label
                            htmlFor={`opt-${group.id}-${opt.id}`}
                            className="text-xs font-normal text-muted-foreground group-hover:text-foreground cursor-pointer flex-1"
                            onClick={(e) => e.preventDefault()}
                          >
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Alsó sáv: Állapot + Törlés gomb */}
              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-normal">
                  {totalActiveCount > 0 ? `${totalActiveCount} aktív szűrő` : "Nincs aktív szűrő"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (onClearFilters) onClearFilters()
                    if (dateRange) {
                      dateRange.onFromChange("")
                      dateRange.onToChange("")
                    }
                  }}
                  disabled={!hasActiveFilters}
                  className="h-8 text-xs gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Szűrők törlése
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Egyéb gombok (pl. Batch scanner, Új hozzáadása, CSV export) */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
