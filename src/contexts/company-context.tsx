"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Company } from "@/types/company"
import { switchCompanyAction } from "@/app/actions/company-actions"
import { toast } from "sonner"

interface CompanyContextType {
  companies: Company[]
  selectedCompany: Company | null
  setSelectedCompany: (company: Company | null) => Promise<void>
  isSwitching: boolean
  setCompaniesList: (companies: Company[]) => void
  updateCompanyInState: (updated: Company) => void
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = "eaisydocs_selected_company_id"

interface Props {
  initialCompanies: Company[]
  initialCompanyId: string | null
  children: React.ReactNode
}

export function CompanyProvider({ initialCompanies, initialCompanyId, children }: Props) {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [isPending, startTransition] = useTransition()

  // Megkeressük az aktív céget
  const getInitialSelected = (): Company | null => {
    if (companies.length === 0) return null
    if (initialCompanyId) {
      const match = companies.find(c => c.id === initialCompanyId)
      if (match) return match
    }
    // Ha van localStorage-ban
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedId) {
        const match = companies.find(c => c.id === savedId)
        if (match) return match
      }
    }
    return companies[0]
  }

  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(getInitialSelected)

  // Szinkronizáció, ha a szerveroldali céglista megváltozik
  useEffect(() => {
    setCompanies(initialCompanies)
    if (initialCompanies.length === 0) {
      setSelectedCompanyState(null)
      return
    }

    if (selectedCompany) {
      const updated = initialCompanies.find(c => c.id === selectedCompany.id)
      if (updated) {
        setSelectedCompanyState(updated)
        return
      }
    }

    if (initialCompanyId) {
      const match = initialCompanies.find(c => c.id === initialCompanyId)
      if (match) {
        setSelectedCompanyState(match)
        return
      }
    }

    setSelectedCompanyState(initialCompanies[0])
  }, [initialCompanies, initialCompanyId])

  const setSelectedCompany = useCallback(
    async (company: Company | null) => {
      if (!company || company.id === selectedCompany?.id) return

      setSelectedCompanyState(company)
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, company.id)
      }

      startTransition(async () => {
        try {
          const res = await switchCompanyAction(company.id)
          if (res.success) {
            toast.success(`Cég váltva: ${company.name}`, {
              duration: 2500,
            })
            router.refresh()
          } else {
            toast.error(res.error || "Nem sikerült a cégváltás")
          }
        } catch (e: any) {
          toast.error("Hiba történt a cégváltás során")
        }
      })
    },
    [selectedCompany, router]
  )

  const setCompaniesList = useCallback((newList: Company[]) => {
    setCompanies(newList)
  }, [])

  const updateCompanyInState = useCallback((updated: Company) => {
    setCompanies(prev => prev.map(c => (c.id === updated.id ? updated : c)))
    setSelectedCompanyState(prev => (prev?.id === updated.id ? updated : prev))
  }, [])

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany,
        isSwitching: isPending,
        setCompaniesList,
        updateCompanyInState,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
