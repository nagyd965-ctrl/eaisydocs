"use client"

import * as React from "react"
import { useState } from "react"
import { CompanyCareerPresentation } from "@/utils/hr/career-presentation-types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers,
  Presentation,
} from "lucide-react"

interface CompanyPresentationViewerProps {
  companyName: string
  presentation: CompanyCareerPresentation
  openPositionsCount?: number
  onViewPositions?: () => void
  onOpenTalentPool?: () => void
  compact?: boolean
}

const SLIDE_META = [
  { index: 0, code: "01", title: "Kik vagyunk & Küldetés" },
  { index: 1, code: "02", title: "Kultúra & Értékek" },
  { index: 2, code: "03", title: "Munkakörnyezet & Galéria" },
  { index: 3, code: "04", title: "Juttatások & Karrierút" },
  { index: 4, code: "05", title: "Csatlakozz hozzánk" },
]

export function CompanyPresentationViewer({
  companyName,
  presentation,
  openPositionsCount = 0,
  onViewPositions,
  onOpenTalentPool,
  compact = false,
}: CompanyPresentationViewerProps) {
  const [activeSlide, setActiveSlide] = useState<number>(0)
  const [mode, setMode] = useState<"deck" | "lookbook">("deck")

  const {
    heroSlide,
    cultureSlide,
    environmentSlide,
    perksSlide,
    closingSlide,
  } = presentation

  const renderSlide01 = () => (
    <div className="space-y-6">
      {/* Split Hero Card */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden grid lg:grid-cols-12">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary text-xs font-medium gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{heroSlide.badgeText || companyName}</span>
              </Badge>
              <span className="text-[11px] font-mono text-muted-foreground">
                01 / 05 FEJEZET
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-snug">
              {heroSlide.headline}
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {heroSlide.subheadline}
            </p>
          </div>

          <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Küldetésünk és jövőképünk
            </p>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {heroSlide.missionStatement}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-[360px] bg-muted border-t lg:border-t-0 lg:border-l border-border/60 overflow-hidden">
          <img
            src={heroSlide.coverImageUrl}
            alt={companyName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">
              Hivatalos Karrier Prezentáció
            </p>
            <p className="text-base font-semibold mt-0.5">{companyName}</p>
          </div>
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      {heroSlide.stats && heroSlide.stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {heroSlide.stats.map((st, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border/70 bg-card p-4 space-y-1"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {st.label}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {st.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{st.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSlide02 = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/70 bg-card p-6 sm:p-8 grid lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              02 / 05 FEJEZET — CSAPATKULTÚRA
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {cultureSlide.sectionTitle}
          </h2>
          <p className="text-sm font-medium text-foreground/85 leading-relaxed">
            {cultureSlide.sectionSubtitle}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
            {cultureSlide.storyParagraph}
          </p>
        </div>

        <div className="lg:col-span-5 rounded-lg overflow-hidden border border-border/60 h-[230px] sm:h-[260px] bg-muted">
          <img
            src={cultureSlide.featureImageUrl}
            alt="Csapatkultúra"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(cultureSlide.values || []).map((val, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border/70 bg-card p-5 space-y-2 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold tabular-nums text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                0{idx + 1}
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {val.title}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {val.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSlide03 = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/70 bg-card p-6 sm:p-8 space-y-5">
        <div className="space-y-2 max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            03 / 05 FEJEZET — MUNKAKÖRNYEZET ÉS GALÉRIA
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {environmentSlide.sectionTitle}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {environmentSlide.sectionSubtitle}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {environmentSlide.workflowDescription}
          </p>
        </div>

        {environmentSlide.techAndTools && environmentSlide.techAndTools.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {environmentSlide.techAndTools.map((tool, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded-md border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs font-medium text-foreground"
              >
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>{tool}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bento Photo Gallery */}
      {environmentSlide.gallery && environmentSlide.gallery.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {environmentSlide.gallery.map((img, idx) => (
            <div
              key={idx}
              className="group relative rounded-lg overflow-hidden border border-border/70 h-[240px] bg-muted"
            >
              <img
                src={img.imageUrl}
                alt={img.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-4 text-white">
                <p className="text-sm font-semibold leading-snug">{img.title}</p>
                <p className="text-xs text-white/80 mt-0.5">{img.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSlide04 = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/70 bg-card p-6 sm:p-8 space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          04 / 05 FEJEZET — JUTTATÁSI CSOMAG & KARRIERÚT
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {perksSlide.sectionTitle}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {perksSlide.sectionSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(perksSlide.perkCategories || []).map((cat, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border/70 bg-card p-5 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <h3 className="text-sm font-semibold text-foreground">
                  {cat.category}
                </h3>
                <Badge variant="secondary" className="text-[10px] tabular-nums">
                  {cat.items.length} elem
                </Badge>
              </div>
              <ul className="space-y-2.5">
                {cat.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSlide05 = () => (
    <div className="rounded-lg border border-primary/30 bg-card p-6 sm:p-10 space-y-6">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          05 / 05 FEJEZET — CSATLAKOZZ A CSAPATUNKHOZ
        </span>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {closingSlide.headline}
        </h2>
      </div>

      <blockquote className="rounded-lg border border-border/70 bg-muted/20 p-5 sm:p-6 space-y-3">
        <p className="text-sm sm:text-base text-foreground/90 leading-relaxed italic">
          „{closingSlide.leadershipMessage}”
        </p>
        <footer className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <strong className="text-foreground font-semibold">
            {closingSlide.leaderName}
          </strong>
          <span>•</span>
          <span>{closingSlide.leaderRole || companyName}</span>
        </footer>
      </blockquote>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border/60">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">
          {closingSlide.callToActionText}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          {onViewPositions && (
            <Button onClick={onViewPositions} className="gap-2">
              <span>
                Nyitott pozíciók megtekintése
                {openPositionsCount > 0 ? ` (${openPositionsCount} db)` : ""}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          {onOpenTalentPool && (
            <Button variant="outline" onClick={onOpenTalentPool}>
              Nyitott jelentkezés (Talent Pool)
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* ── FELSŐ NÉZETVÁLTÓ SÁV (PREZENTÁCIÓ VS ÖSSZES FEJEZET) ── */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 border border-border/70 rounded-md p-0.5 bg-card">
          <button
            type="button"
            onClick={() => setMode("deck")}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors",
              mode === "deck"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Diánként léptethető prezentáció nézet"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Prezentáció</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("lookbook")}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors",
              mode === "lookbook"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Összes fejezet egymás alatt"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Összes fejezet</span>
          </button>
        </div>
      </div>

      {/* ── SLIDE TARTALOM RENDERELÉSE ── */}
      {mode === "deck" ? (
        <div className="space-y-4">
          {activeSlide === 0 && renderSlide01()}
          {activeSlide === 1 && renderSlide02()}
          {activeSlide === 2 && renderSlide03()}
          {activeSlide === 3 && renderSlide04()}
          {activeSlide === 4 && renderSlide05()}

          {/* Alsó navigációs sáv a slide végén */}
          {!compact && (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeSlide === 0}
                onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Előző fejezet</span>
              </Button>

              <div className="flex items-center gap-1.5">
                {SLIDE_META.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setActiveSlide(s.index)}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      activeSlide === s.index
                        ? "w-6 bg-primary"
                        : "w-2 bg-border hover:bg-muted-foreground"
                    )}
                    title={s.title}
                  />
                ))}
              </div>

              {activeSlide < 4 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveSlide((prev) => Math.min(4, prev + 1))}
                  className="gap-1.5 text-xs"
                >
                  <span>
                    Következő: {SLIDE_META[activeSlide + 1]?.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : onViewPositions ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={onViewPositions}
                  className="gap-1.5 text-xs"
                >
                  <span>Nyitott pozíciók megtekintése</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <div />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {renderSlide01()}
          {renderSlide02()}
          {renderSlide03()}
          {renderSlide04()}
          {renderSlide05()}
        </div>
      )}
    </div>
  )
}
