import { redirect } from "next/navigation"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  if (params?.q) {
    redirect(`/?q=${encodeURIComponent(params.q)}`)
  }
  redirect("/")
}

