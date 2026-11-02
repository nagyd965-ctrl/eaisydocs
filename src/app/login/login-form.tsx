"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useFormStatus } from "react-dom"
import { login } from "./actions"
import { EaisyLogo } from "./login-shell"
import {
  ShowcaseTape,
  docsShowcaseSlides,
  hrShowcaseSlides,
} from "./showcase-tape"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import "./eaisy-login-showcase.css"

/**
 * Bejelentkezés gomb betöltés-állapottal: a kattintás pillanatától pörgettyű +
 * „Bejelentkezés…" felirat, és a gomb letiltásával a dupla beküldés is kizárva.
 */
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="mt-1.5 h-11 w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Bejelentkezés…
        </>
      ) : (
        "Bejelentkezés"
      )}
    </Button>
  )
}

export function LoginForm({
  message,
  next,
  initialModule,
  suggestedModule,
  initialEmail,
}: {
  message?: string
  next?: string
  initialModule?: "docs" | "hr"
  suggestedModule?: "docs" | "hr"
  initialEmail?: string
}) {
  // Alapértelmezetten az eaisyDocs aktív (bal oldalon pörög lefelé a Docs szalag)
  const defaultModule: "docs" | "hr" =
    initialModule ?? (next?.startsWith("/hr") ? "hr" : "docs")

  const [selectedModule, setSelectedModule] =
    useState<"docs" | "hr">(defaultModule)
  const [email, setEmail] = useState(initialEmail ?? "")
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [dismissedMessage, setDismissedMessage] = useState(false)
  const [isShaking, setIsShaking] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const targetModuleInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail)
    }
  }, [initialEmail, email])

  useEffect(() => {
    setDismissedMessage(false)
    if (!message) return

    // Ha hibás jelszó érkezett vissza, finom shake animáció + fókusz a jelszómezőre
    if (!suggestedModule) {
      setIsShaking(true)
      const timer = window.setTimeout(() => setIsShaking(false), 320)
      passwordInputRef.current?.focus()
      return () => window.clearTimeout(timer)
    } else {
      passwordInputRef.current?.focus()
    }
  }, [message, suggestedModule])

  const handleSelectModule = (mod: "docs" | "hr") => {
    setSelectedModule(mod)
    if (targetModuleInputRef.current) {
      targetModuleInputRef.current.value = mod
    }
    if (suggestedModule && mod === suggestedModule) {
      setDismissedMessage(true)
    }
  }

  // Egykattintásos munkaterület-váltás + automatikus továbbküldés (ha a jelszó is ki van töltve)
  const handleQuickSwitchModule = (mod: "docs" | "hr") => {
    handleSelectModule(mod)
    const hasEmail = Boolean(email.trim())
    const hasPassword = Boolean(passwordInputRef.current?.value)
    if (hasEmail && hasPassword && formRef.current) {
      window.setTimeout(() => {
        if (targetModuleInputRef.current) {
          targetModuleInputRef.current.value = mod
        }
        formRef.current?.requestSubmit()
      }, 180)
    } else {
      passwordInputRef.current?.focus()
    }
  }

  useEffect(() => {
    document.title =
      selectedModule === "hr"
        ? "eaisyHR - Humánügyviteli rendszer"
        : "eaisyDocs - Iratkezelő"
  }, [selectedModule])

  // Caps Lock állapot követése gépelés közben (a böngésző beépített jelzése alapján)
  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"))
    }
  }

  return (
    <div className="eaisy-login-root">
      <div className="eaisy-login-stage">
        {/* BAL OLDAL: eaisyDocs pörgő kártyák (alapértelmezetten aktív) */}
        <div
          className={`eaisy-login-side side-left ${
            selectedModule === "docs" ? "is-active" : "is-hidden"
          }`}
        >
          <ShowcaseTape
            titleLine1="Iratkezelés,"
            titleAccent="újragondolva."
            slides={docsShowcaseSlides}
            active={selectedModule === "docs"}
          />
        </div>

        {/* KÖZÉP: Bejelentkezési kártya modulválasztóval */}
        <div className="eaisy-login-center">
          <div className="mb-6 text-center">
            <EaisyLogo module={selectedModule} />
            <p className="text-[13px] text-muted-foreground">
              Egységes vállalati iratkezelő és humánügyviteli platform
            </p>
          </div>

          <div
            className={`eaisy-login-card ${isShaking ? "is-shaking" : ""}`}
          >
            {/* Felső munkaterület-választó sáv (Sliding Pill animációval) */}
            <div className="border-b border-border/70 bg-muted/40 p-3.5">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Munkaterület kiválasztása
              </div>
              <div className="relative grid grid-cols-2 overflow-hidden rounded-lg border border-border/80 bg-muted/70 p-1">
                {/* Fizikailag átsikló aktív zöld háttér-kapszula */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-md bg-primary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform:
                      selectedModule === "hr"
                        ? "translateX(100%)"
                        : "translateX(0%)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSelectModule("docs")}
                  className={`relative z-10 rounded-md px-3 py-2 text-left transition-colors duration-300 ${
                    selectedModule === "docs"
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-xs font-semibold">eaisyDocs</div>
                  <div className="text-[11px] opacity-80">
                    Iratkezelés és iktatás
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectModule("hr")}
                  className={`relative z-10 rounded-md px-3 py-2 text-left transition-colors duration-300 ${
                    selectedModule === "hr"
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-xs font-semibold">eaisyHR</div>
                  <div className="text-[11px] opacity-80">
                    Munkaügy és jelenlét
                  </div>
                </button>
              </div>
            </div>

            {/* Űrlap törzs */}
            <div className="p-7">
              <h1 className="text-[17px] font-semibold text-foreground">
                Bejelentkezés
              </h1>
              <p className="mb-6 mt-1 text-xs text-muted-foreground">
                Belépés után az{" "}
                {selectedModule === "hr" ? "eaisyHR" : "eaisyDocs"}{" "}
                munkafelületre irányítunk.
              </p>

              <form ref={formRef} action={login} className="space-y-4">
                <input type="hidden" name="next" value={next ?? ""} />
                <input
                  ref={targetModuleInputRef}
                  type="hidden"
                  name="targetModule"
                  value={selectedModule}
                />

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail cím</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="te@ceged.hu"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Jelszó</Label>
                    <Link
                      href="/login/forgot-password"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Elfelejtett jelszó?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      ref={passwordInputRef}
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="pr-10"
                      onKeyDown={detectCapsLock}
                      onKeyUp={detectCapsLock}
                      onBlur={() => setCapsLockOn(false)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Jelszó elrejtése"
                          : "Jelszó megjelenítése"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {capsLockOn && (
                    <p
                      role="status"
                      className="text-[11px] font-medium text-warning"
                    >
                      A Caps Lock bekapcsolva
                    </p>
                  )}
                </div>

                {message && !dismissedMessage && (
                  <div
                    role="alert"
                    className={
                      suggestedModule
                        ? "rounded-lg border border-primary/25 bg-primary/[0.06] px-3.5 py-2.5 text-left"
                        : "rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3.5 py-2.5 text-left"
                    }
                  >
                    <div
                      className={
                        suggestedModule
                          ? "text-xs font-semibold text-foreground"
                          : "text-xs font-semibold text-destructive"
                      }
                    >
                      {suggestedModule
                        ? "Másik munkaterülethez tartozó fiók"
                        : "Sikertelen bejelentkezés"}
                    </div>
                    <p
                      className={
                        suggestedModule
                          ? "mt-0.5 text-[11px] leading-relaxed text-muted-foreground"
                          : "mt-0.5 text-[11px] leading-relaxed text-destructive/90"
                      }
                    >
                      {message}
                    </p>
                    {suggestedModule && (
                      <button
                        type="button"
                        onClick={() => handleQuickSwitchModule(suggestedModule)}
                        className="mt-2 inline-flex items-center rounded-md bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25"
                      >
                        Átváltás az{" "}
                        {suggestedModule === "hr" ? "eaisyHR" : "eaisyDocs"}{" "}
                        munkaterületre és belépés →
                      </button>
                    )}
                  </div>
                )}

                <SubmitButton />
              </form>
            </div>
          </div>

          {/* Lábléc */}
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[11px] font-medium leading-relaxed text-white drop-shadow-[0_1px_2px_rgba(8,36,50,0.55)]">
            <span>© 2026 eaisy</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://eaisy.hu/adatkezelesi-tajekoztato"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:underline hover:opacity-85"
            >
              Adatvédelmi tájékoztató
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://eaisy.hu/aszf"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:underline hover:opacity-85"
            >
              ÁSZF
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://eaisy.hu/#kapcsolat"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:underline hover:opacity-85"
            >
              Kapcsolat
            </a>
          </p>
        </div>

        {/* JOBB OLDAL: eaisyHR pörgő kártyák (ha az eaisyHR-re kattintanak, itt jönnek be) */}
        <div
          className={`eaisy-login-side side-right ${
            selectedModule === "hr" ? "is-active" : "is-hidden"
          }`}
        >
          <ShowcaseTape
            titleLine1="Humánügyek,"
            titleAccent="újragondolva."
            slides={hrShowcaseSlides}
            active={selectedModule === "hr"}
          />
        </div>
      </div>
    </div>
  )
}
