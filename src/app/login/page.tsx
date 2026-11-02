import { LoginForm } from "./login-form"
import { getSafeRedirectPath } from "@/utils/url"

export default async function LoginPage(props: {
  searchParams: Promise<{
    message?: string
    next?: string
    module?: string
    suggestedModule?: string
    email?: string
  }>
}) {
  const searchParams = await props.searchParams
  // Az eredeti cél (pl. e-mail link) — csak validált, belső útvonalat fogadunk el
  const nextPath = getSafeRedirectPath(searchParams.next) ?? undefined
  const initialModule =
    searchParams.module === "hr"
      ? "hr"
      : searchParams.module === "docs"
        ? "docs"
        : undefined
  const suggestedModule =
    searchParams.suggestedModule === "hr"
      ? "hr"
      : searchParams.suggestedModule === "docs"
        ? "docs"
        : undefined

  return (
    <LoginForm
      message={searchParams?.message}
      next={nextPath}
      initialModule={initialModule}
      suggestedModule={suggestedModule}
      initialEmail={searchParams?.email}
    />
  )
}
