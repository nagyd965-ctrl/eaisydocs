"use client"

import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
  type ReactNode,
} from "react"

export interface ShowcaseSlide {
  title: string
  description: string
  visual: ReactNode
}

/* ── eaisyDocs Showcase Slides (Left Tape — Default Active) ── */
export const docsShowcaseSlides: ShowcaseSlide[] = [
  {
    title: "Hiteles érkeztetés és iktatás",
    description:
      "Gap-mentes iktatószám-allokáció, SHA-256 integritás-ellenőrzés és PDF/A-2b archiválás minden bejövő és kimenő irathoz.",
    visual: (
      <div className="showcase-visual">
        <div className="showcase-chat">
          <div className="chat-bubble incoming">
            <div className="chat-sender">Bejövő küldemény · Postai / E-mail</div>
            <div className="chat-text">
              Szállítói keretszerződés módosítás és mellékletek (3 példány)
              érkeztetve.
            </div>
            <div className="chat-time">09:14</div>
          </div>
          <div className="chat-bubble outgoing">
            <div className="chat-sender">
              <span className="ai-badge">AI</span> eaisyDocs Iktató
            </div>
            <div className="chat-text">
              Iktatószám lefoglalva: IKT-2026/004182. SHA-256 lenyomat és
              PDF/A-2b hiteles példány elkészült.
            </div>
            <div className="chat-time">09:14</div>
          </div>
          <div className="chat-bubble incoming">
            <div className="chat-sender">Jogi Osztály · Ügyiratkezelés</div>
            <div className="chat-text">
              ÜGY-2026/104 ügyirathoz csatolva, 8 napos ügyintézési határidővel
              kiadmányozásra előkészítve.
            </div>
            <div className="chat-time">09:15</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Iratforgalmi analitika és SLA",
    description:
      "Egyetlen felületen követheted a szervezet teljes iratforgalmát, az ügyintézési határidőket és a keresési mutatókat.",
    visual: (
      <div className="showcase-visual">
        <div className="showcase-kpi-grid">
          <div className="showcase-kpi">
            <div className="kpi-header">
              <span className="kpi-label">Iktatott iratok</span>
              <span className="kpi-trend up">+19%</span>
            </div>
            <div className="kpi-value">1,428</div>
            <div className="kpi-subtitle">ez a hónap</div>
          </div>
          <div className="showcase-kpi">
            <div className="kpi-header">
              <span className="kpi-label">Aktív ügyiratok</span>
              <span className="kpi-trend up">+12%</span>
            </div>
            <div className="kpi-value">284</div>
            <div className="kpi-subtitle">folyamatban</div>
          </div>
          <div className="showcase-kpi">
            <div className="kpi-header">
              <span className="kpi-label">Keresési idő</span>
              <span className="kpi-trend down">-62%</span>
            </div>
            <div className="kpi-value">&lt;40ms</div>
            <div className="kpi-subtitle">Postgres FTS</div>
          </div>
          <div className="showcase-kpi">
            <div className="kpi-header">
              <span className="kpi-label">Határidő tartás</span>
              <span className="kpi-trend up">+6%</span>
            </div>
            <div className="kpi-value">98.4%</div>
            <div className="kpi-subtitle">SLA teljesítés</div>
          </div>
        </div>
        <div className="showcase-chart-bar">
          <div className="chart-header">
            <span>Heti iratforgalom</span>
            <span className="chart-legend">
              <span className="dot messenger" /> Bejövő
              <span className="dot email" /> Kimenő
            </span>
          </div>
          <div className="chart-bars">
            {[70, 55, 85, 65, 92, 42, 35].map((h, i) => (
              <div key={i} className="bar-col">
                <div className="bar" style={{ height: `${h}%` }} />
                <span className="bar-label">
                  {["H", "K", "Sze", "Cs", "P", "Szo", "V"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Ügyiratok és felelős ügyintézők",
    description:
      "Ügy, ügyirat, irat és példány hierarchia 4-dimenziós jogosultságkezeléssel és teljes verziókövetéssel.",
    visual: (
      <div className="showcase-visual">
        <div className="showcase-clients">
          {[
            {
              name: "Dr. Varga Márton",
              avatarUrl: "/avatars/avatar-3.webp",
              status: "Sürgős",
              statusClass: "vip",
              lastMsg: "ÜGY-2026/104 · Keretszerződés v3",
              channel: "Jogi Osztály · Iktatva",
              time: "5 perce",
            },
            {
              name: "Kiss Eszter",
              avatarUrl: "/avatars/avatar-4.webp",
              status: "Aktív",
              statusClass: "active",
              lastMsg: "ÜGY-2026/098 · Könyvvizsgálati iratok",
              channel: "Pénzügy · Melléklet",
              time: "18 perce",
            },
            {
              name: "Horváth Réka",
              avatarUrl: "/avatars/avatar-2.webp",
              status: "Új",
              statusClass: "new",
              lastMsg: "ÉRKEZ-2026/0895 · Tértivevényes levél",
              channel: "Titkárság · Érkeztetve",
              time: "42 perce",
            },
            {
              name: "Molnár Gábor",
              avatarUrl: "/avatars/avatar-1.webp",
              status: "Lezárt",
              statusClass: "returning",
              lastMsg: "ÜGY-2026/076 · Selejtezési jegyzőkönyv",
              channel: "Irattár · Archiválva",
              time: "2 órája",
            },
          ].map((c) => (
            <div key={c.name} className="client-row">
              <div className="client-avatar">
                <img src={c.avatarUrl} alt={c.name} />
              </div>
              <div className="client-info">
                <div className="client-name-row">
                  <span className="client-name">{c.name}</span>
                  <span className={`client-status ${c.statusClass}`}>
                    {c.status}
                  </span>
                </div>
                <div className="client-meta">
                  <span className="client-msg">{c.lastMsg}</span>
                  <span className="client-channel">
                    {c.channel} · {c.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Automatizált iratvédelem és audit",
    description:
      "Append-only eseménynapló, vízjelezett előnézet, határidő-riasztások és négy-szem elvű selejtezési munkafolyamat.",
    visual: (
      <div className="showcase-visual">
        <div className="showcase-automations">
          {[
            {
              trigger: "E-mail melléklet beérkezése",
              action: "Automatikus érkeztetés + AI tartalomkivonat",
              delay: "Azonnal",
              active: true,
              color: "#22c55e",
            },
            {
              trigger: "Ügyintézési határidő közeleg",
              action: "Felelős ügyintéző és vezetői riasztás",
              delay: "3 nappal előtte",
              active: true,
              color: "#f97316",
            },
            {
              trigger: "Bizalmas irat megtekintése",
              action: "Vízjelezett PDF előnézet + Audit napló",
              delay: "60 mp URL",
              active: true,
              color: "#ef4444",
            },
            {
              trigger: "Őrzési idő lejárt",
              action: "Selejtezési javaslat generálása (4-szem elv)",
              delay: "Évente",
              active: true,
              color: "#8b5cf6",
            },
          ].map((a) => (
            <div key={a.trigger} className="automation-row">
              <div
                className="auto-indicator"
                style={{ background: a.active ? a.color : "var(--el-text-dim)" }}
              />
              <div className="auto-content">
                <div className="auto-trigger">{a.trigger}</div>
                <div className="auto-action">{a.action}</div>
              </div>
              <div className="auto-meta">
                <span className="auto-delay">{a.delay}</span>
                <span
                  className={`auto-badge ${a.active ? "active" : "inactive"}`}
                >
                  {a.active ? "Aktív" : "Inaktív"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

/* ── eaisyHR Showcase Slides (Right Tape — Active when eaisyHR selected) ── */
export const hrShowcaseSlides: ShowcaseSlide[] = [
  {
    title: "Valós idejű jelenlét és munkaidő",
    description:
      "Egykattintásos munkaidő terminál, műszakbeosztás, túlóra-elszámolás és szabadságkeret-nyilvántartás egyetlen felületen.",
    visual: (
      <div className="showcase-visual">
        <div className="showcase-kpi-grid">
          <div className="showcase-kpi">
            <div className="kpi-header">
              <span className="kpi-label">Aktív jelenlét</span>
              <span className="kpi-trend up">+8%</span>
            </div>
            <div className="kpi-value">96.2%</div>
            <div className="kpi-subtitle">mai állomány</div>
          </div>
          <div className="showcase-kpi">
            <div className="kpi-header">
              <span className="kpi-label">Ledolgozott órák</span>
              <span className="kpi-trend up">+4%</span>
            </div>
            <div className="kpi-value">6,840</div>
            <div className="kpi-subtitle">ez a hónap</div>
          </div>
          <div className="showcase-kpi">
            <div className="kpi-header">
              <span className="kpi-label">Bírálati idő</span>
              <span className="kpi-trend down">-52%</span>
            </div>
            <div className="kpi-value">&lt;2 óra</div>
            <div className="kpi-subtitle">szabadság kérelem</div>
          </div>
          <div className="showcase-kpi">
            <div className="kpi-header">
              <span className="kpi-label">Megfelelőség</span>
              <span className="kpi-trend up">100%</span>
            </div>
            <div className="kpi-value">48 / 48</div>
            <div className="kpi-subtitle">érvényes alkalmassági</div>
          </div>
        </div>
        <div className="showcase-chart-bar">
          <div className="chart-header">
            <span>Heti munkaidő és műszakok</span>
            <span className="chart-legend">
              <span className="dot messenger" /> Ledolgozott
              <span className="dot email" /> Beosztott
            </span>
          </div>
          <div className="chart-bars">
            {[88, 92, 95, 86, 90, 28, 18].map((h, i) => (
              <div key={i} className="bar-col">
                <div className="bar" style={{ height: `${h}%` }} />
                <span className="bar-label">
                  {["H", "K", "Sze", "Cs", "P", "Szo", "V"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "360° dolgozói karton és kérelmek",
    description:
      "Minden munkavállalói adat, munkaszerződés, jelenléti ív, cafeteria-nyilatkozat és célkitűzés egyetlen központi helyen.",
    visual: (
      <div className="showcase-visual">
        <div className="showcase-clients">
          {[
            {
              name: "Farkas Bence",
              avatarUrl: "/avatars/avatar-1.webp",
              status: "Munkában",
              statusClass: "active",
              lastMsg: "Szoftverfejlesztő · 08:02 becsekkolva",
              channel: "Munkaidő terminál",
              time: "Aktív",
            },
            {
              name: "Kovács Anna",
              avatarUrl: "/avatars/avatar-2.webp",
              status: "Jóváhagyva",
              statusClass: "new",
              lastMsg: "Éves rendes szabadság (4 munkanap)",
              channel: "Szabadság naptár",
              time: "12 perce",
            },
            {
              name: "Tóth Balázs",
              avatarUrl: "/avatars/avatar-3.webp",
              status: "Végleges",
              statusClass: "vip",
              lastMsg: "Cafeteria 2026 éves nyilatkozat leadva",
              channel: "SZÉP Kártya · 450 eFt",
              time: "35 perce",
            },
            {
              name: "Szabó Éva",
              avatarUrl: "/avatars/avatar-4.webp",
              status: "Értékelt",
              statusClass: "returning",
              lastMsg: "Q4 KPI önértékelés beküldve (92%)",
              channel: "Teljesítmény",
              time: "1 órája",
            },
          ].map((c) => (
            <div key={c.name} className="client-row">
              <div className="client-avatar">
                <img src={c.avatarUrl} alt={c.name} />
              </div>
              <div className="client-info">
                <div className="client-name-row">
                  <span className="client-name">{c.name}</span>
                  <span className={`client-status ${c.statusClass}`}>
                    {c.status}
                  </span>
                </div>
                <div className="client-meta">
                  <span className="client-msg">{c.lastMsg}</span>
                  <span className="client-channel">
                    {c.channel} · {c.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Interaktív beosztás és szabadság naptár",
    description:
      "A dolgozók a saját havi naptárukból egyetlen kijelöléssel igényelhetnek szabadságot, amit a vezető azonnal elbírálhat.",
    visual: (
      <div className="showcase-visual">
        <div className="showcase-chat">
          <div className="chat-bubble incoming">
            <div className="chat-sender">Farkas Bence · Naptár nézet</div>
            <div className="chat-text">
              Szabadságigénylés beküldve: 2026. november 20–25. (4 munkanap,
              Éves rendes szabadság).
            </div>
            <div className="chat-time">10:18</div>
          </div>
          <div className="chat-bubble outgoing">
            <div className="chat-sender">
              <span className="ai-badge">HR</span> Keret- és Műszakellenőrzés
            </div>
            <div className="chat-text">
              Éves keret ellenőrizve: 12 szabadnap elérhető. Nincs csapaton
              belüli műszakütközés.
            </div>
            <div className="chat-time">10:18</div>
          </div>
          <div className="chat-bubble incoming">
            <div className="chat-sender">Vezetői Jóváhagyás · HR Portál</div>
            <div className="chat-text">
              Kérelem jóváhagyva. A jelenléti ív és a havi beosztási naptár
              automatikusan frissült.
            </div>
            <div className="chat-time">10:20</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Automatizált HR munkafolyamatok",
    description:
      "Beléptetés, szerződésgenerálás, lejáró orvosi alkalmassági figyelés és kiléptetési elszámolás automatizálva.",
    visual: (
      <div className="showcase-visual">
        <div className="showcase-automations">
          {[
            {
              trigger: "Új belépő felvétele",
              action: "Munkaszerződés + T1041 + Személyi dosszié",
              delay: "Azonnal",
              active: true,
              color: "#22c55e",
            },
            {
              trigger: "Orvosi alkalmassági lejár",
              action: "Automatikus HR és dolgozói értesítés",
              delay: "30 nappal előtte",
              active: true,
              color: "#f97316",
            },
            {
              trigger: "Szabadság / Jelenlét korrekció",
              action: "Vezetői jóváhagyás + Naptár szinkron",
              delay: "Valós időben",
              active: true,
              color: "#3b82f6",
            },
            {
              trigger: "Negyedéves OKR / KPI ciklus",
              action: "Önértékelési és vezetői űrlap megnyitása",
              delay: "Negyedévente",
              active: true,
              color: "#8b5cf6",
            },
          ].map((a) => (
            <div key={a.trigger} className="automation-row">
              <div
                className="auto-indicator"
                style={{ background: a.active ? a.color : "var(--el-text-dim)" }}
              />
              <div className="auto-content">
                <div className="auto-trigger">{a.trigger}</div>
                <div className="auto-action">{a.action}</div>
              </div>
              <div className="auto-meta">
                <span className="auto-delay">{a.delay}</span>
                <span
                  className={`auto-badge ${a.active ? "active" : "inactive"}`}
                >
                  {a.active ? "Aktív" : "Inaktív"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

export function ShowcaseTape({
  titleLine1,
  titleAccent,
  slides,
  active,
}: {
  titleLine1: string
  titleAccent: string
  slides: ShowcaseSlide[]
  active: boolean
}) {
  const tapeRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(0)
  const rafRef = useRef<number | undefined>(undefined)
  const isHoverRef = useRef(false)
  const scrollVelRef = useRef(0)

  const [selectedAbsIdx, setSelectedAbsIdx] = useState<number | null>(null)
  const [selectedDims, setSelectedDims] = useState<{
    w: number
    h: number
  } | null>(null)
  const pausedRef = useRef(false)

  const svgRef = useRef<SVGSVGElement>(null)
  const svgPath1Ref = useRef<SVGPathElement>(null)
  const svgPath2Ref = useRef<SVGPathElement>(null)

  const borderAnimRef = useRef<number | undefined>(undefined)
  const targetPosRef = useRef<number | null>(null)
  const onScrollDone = useRef<(() => void) | null>(null)
  const [dismissing, setDismissing] = useState(false)
  const dismissingRef = useRef(false)
  const dismissTimerRef = useRef<number | undefined>(undefined)
  const fadingDimsRef = useRef<{ w: number; h: number } | null>(null)
  const selectedDimsRef = useRef<{ w: number; h: number } | null>(null)
  const selectedOffsetTopRef = useRef(0)

  selectedDimsRef.current = selectedDims

  // Continuous downward scroll animation (exact eaisyDesk physics)
  // Pauses completely when inactive (`!active`) or when browser tab is in background (`document.hidden`)
  useEffect(() => {
    if (!active) return
    const SPEED = 0.35
    const tick = () => {
      if (!active || document.hidden) {
        rafRef.current = 0
        return
      }
      const strip = tapeRef.current
      if (strip && strip.scrollHeight > 0) {
        const base = pausedRef.current
          ? 0
          : isHoverRef.current
            ? SPEED * 0.15
            : SPEED
        const vel = scrollVelRef.current
        scrollVelRef.current = Math.abs(vel) < 0.01 ? 0 : vel * 0.9
        const half = strip.scrollHeight / 2
        if (half > 0) {
          let step: number
          if (targetPosRef.current !== null) {
            let diff = targetPosRef.current - posRef.current
            if (diff > half / 2) diff -= half
            if (diff < -half / 2) diff += half
            step = diff * 0.12
            if (Math.abs(diff) < 0.6) {
              posRef.current = targetPosRef.current
              targetPosRef.current = null
              step = 0
              if (onScrollDone.current) {
                onScrollDone.current()
                onScrollDone.current = null
              }
            }
          } else {
            step = base + vel
          }
          posRef.current = (((posRef.current + step) % half) + half) % half
          strip.style.transform = `translate3d(0, ${posRef.current - half}px, 0)`

          if (svgRef.current && svgRef.current.style.display !== "none") {
            svgRef.current.style.top = `${selectedOffsetTopRef.current + (posRef.current - half)}px`
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
      } else if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    if (!document.hidden) {
      rafRef.current = requestAnimationFrame(tick)
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [active])

  const handleFadeDismiss = useCallback(() => {
    if (!pausedRef.current && !dismissingRef.current) return
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    fadingDimsRef.current = selectedDimsRef.current
    dismissingRef.current = true
    pausedRef.current = false
    targetPosRef.current = null
    onScrollDone.current = null
    setDismissing(true)
    dismissTimerRef.current = window.setTimeout(() => {
      dismissingRef.current = false
      fadingDimsRef.current = null
      setDismissing(false)
      setSelectedAbsIdx(null)
      setSelectedDims(null)
    }, 500)
  }, [])

  // Dismiss selection when switching modules
  useEffect(() => {
    if (!active && pausedRef.current) {
      handleFadeDismiss()
    }
  }, [active, handleFadeDismiss])

  // Non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (pausedRef.current && !dismissingRef.current) {
        handleFadeDismiss()
      }
      scrollVelRef.current += -e.deltaY * 0.06
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [handleFadeDismiss])

  // Neon teal SVG border sweep animation on card click
  useLayoutEffect(() => {
    if (selectedAbsIdx === null || !selectedDims) return
    const p1 = svgPath1Ref.current
    const p2 = svgPath2Ref.current
    const svg = svgRef.current
    if (!p1 || !p2 || !svg) return

    const rx = 16
    const { w, h } = selectedDims
    const halfPerim = h / 2 - rx + (w - 2 * rx) + (h / 2 - rx) + Math.PI * rx

    const SWEEP_MS = 600
    const sweepStart = performance.now()
    ;[p1, p2].forEach((path) => {
      path.style.transition = "none"
      path.style.strokeDasharray = String(halfPerim)
      path.style.strokeDashoffset = String(halfPerim)
    })
    svg.style.filter =
      "drop-shadow(0 0 4px hsl(var(--primary) / 0.8)) drop-shadow(0 0 12px hsl(var(--primary) / 0.45))"

    const sweepTick = (now: number) => {
      if (dismissingRef.current) return
      const progress = Math.min((now - sweepStart) / SWEEP_MS, 1)
      const offset = halfPerim * (1 - progress)
      p1.style.strokeDashoffset = String(offset)
      p2.style.strokeDashoffset = String(offset)
      if (progress < 1) {
        borderAnimRef.current = requestAnimationFrame(sweepTick)
      }
    }
    if (borderAnimRef.current) cancelAnimationFrame(borderAnimRef.current)
    borderAnimRef.current = requestAnimationFrame(sweepTick)

    return () => {
      if (borderAnimRef.current) cancelAnimationFrame(borderAnimRef.current)
    }
  }, [selectedAbsIdx, selectedDims])

  const handleSlideClick = useCallback((absIdx: number, el: HTMLElement) => {
    if (pausedRef.current || dismissingRef.current) return
    if (borderAnimRef.current) cancelAnimationFrame(borderAnimRef.current)
    setSelectedDims(null)
    setSelectedAbsIdx(absIdx)
    pausedRef.current = true

    const strip = tapeRef.current
    const container = containerRef.current
    if (!strip || !container) return
    const CONTAINER_H = container.clientHeight || 620
    const slideH = el.offsetHeight - 24
    const dims = { w: el.offsetWidth, h: slideH }
    const half = strip.scrollHeight / 2
    selectedOffsetTopRef.current = el.offsetTop
    const rawTarget = (CONTAINER_H - slideH) / 2 - el.offsetTop + half
    targetPosRef.current = ((rawTarget % half) + half) % half
    onScrollDone.current = () => {
      selectedOffsetTopRef.current =
        (CONTAINER_H - dims.h) / 2 + half - posRef.current
      setSelectedDims(dims)
    }
  }, [])

  const activeDims = selectedDims ?? fadingDimsRef.current

  return (
    <div ref={wrapperRef} className="login-showcase-wrapper">
      <h2 className="login-showcase-title">
        {titleLine1}
        <br />
        <span className="accent">{titleAccent}</span>
      </h2>

      <div
        ref={containerRef}
        className="login-tape-container"
        onClick={handleFadeDismiss}
        onMouseEnter={() => {
          isHoverRef.current = true
        }}
        onMouseLeave={() => {
          isHoverRef.current = false
        }}
      >
        <svg
          ref={svgRef}
          className="login-svg-border"
          style={{
            display: "block",
            left: 0,
            width: activeDims?.w ?? 0,
            height: activeDims?.h ?? 0,
            overflow: "visible",
            opacity: !selectedDims && !dismissing ? 0 : dismissing ? 0 : 1,
            transition: dismissing ? "opacity 0.5s ease" : "none",
          }}
        >
          <path
            ref={svgPath1Ref}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            d={
              selectedDims
                ? `M 1,${selectedDims.h / 2} V 17 A 16,16 0 0,1 17,1 H ${selectedDims.w - 17} A 16,16 0 0,1 ${selectedDims.w - 1},17 V ${selectedDims.h / 2}`
                : ""
            }
          />
          <path
            ref={svgPath2Ref}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            d={
              selectedDims
                ? `M 1,${selectedDims.h / 2} V ${selectedDims.h - 17} A 16,16 0 0,0 17,${selectedDims.h - 1} H ${selectedDims.w - 17} A 16,16 0 0,0 ${selectedDims.w - 1},${selectedDims.h - 17} V ${selectedDims.h / 2}`
                : ""
            }
          />
        </svg>

        <div ref={tapeRef} className="login-tape-strip">
          {[...slides, ...slides].map((slide, i) => (
            <div
              key={i}
              className="tape-slide"
              onClick={(e) => {
                e.stopPropagation()
                handleSlideClick(i, e.currentTarget)
              }}
            >
              <div className="tape-slide-inner">
                <div className="tape-slide-header">
                  <h3>{slide.title}</h3>
                  <p>{slide.description}</p>
                </div>
                {slide.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

