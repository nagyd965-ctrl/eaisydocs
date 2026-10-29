"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanBoard } from "./kanban-board"
import { AddCandidateDialog } from "@/components/hr/add-candidate-dialog"
import { JobPostingsList } from "@/components/hr/job-postings-list"
import { TalentPoolList } from "@/components/hr/talent-pool-list"
import { RecruitmentAnalytics } from "@/components/hr/recruitment-analytics"
import { CompanyPresentationEditor } from "@/components/hr/company-presentation-editor"
import { CompanyCareerPresentation } from "@/utils/hr/career-presentation-types"

export function RecruitmentTabs({
  candidates,
  postings,
  jobs,
  activeCompany,
  isReadOnly,
}: {
  candidates: any[]
  postings: any[]
  jobs: any[]
  activeCompany: {
    id: string
    name: string
    address?: string | null
    careerPresentation?: CompanyCareerPresentation | null
  }
  isReadOnly: boolean
}) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab")
  const validTabs = ["postings", "company-presentation", "kanban", "talent-pool", "analytics"]
  const [tab, setTab] = useState(
    initialTab && validTabs.includes(initialTab) ? initialTab : "postings"
  )

  useEffect(() => {
    const paramTab = searchParams.get("tab")
    if (paramTab && validTabs.includes(paramTab)) {
      setTab(paramTab)
    }
  }, [searchParams])

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full flex flex-col">
      <div className="flex justify-between items-center shrink-0 mb-5 flex-wrap gap-2">
        <TabsList>
          <TabsTrigger value="postings">Álláshirdetések</TabsTrigger>
          <TabsTrigger value="company-presentation">
            Cégünkről prezentáció
          </TabsTrigger>
          <TabsTrigger value="kanban">Kanban Tábla</TabsTrigger>
          <TabsTrigger value="talent-pool">Talent Pool</TabsTrigger>
          <TabsTrigger value="analytics">Analitika</TabsTrigger>
        </TabsList>

        {/* Jelentkező hozzáadása csak a Kanban tabon releváns */}
        {tab === "kanban" && !isReadOnly && (
          <div className="flex gap-4">
            <AddCandidateDialog jobs={jobs} />
          </div>
        )}
      </div>

      <TabsContent value="postings" className="w-full m-0 p-0">
        <JobPostingsList
          initialPostings={postings}
          jobs={jobs}
          candidates={candidates}
        />
      </TabsContent>

      <TabsContent value="company-presentation" className="w-full m-0 p-0">
        <CompanyPresentationEditor
          companyId={activeCompany.id}
          companyName={activeCompany.name}
          companyAddress={activeCompany.address}
          initialPresentation={activeCompany.careerPresentation}
          isReadOnly={isReadOnly}
        />
      </TabsContent>

      <TabsContent value="kanban" className="w-full h-[calc(100vh-14rem)] overflow-hidden m-0 p-0">
        <KanbanBoard initialCandidates={candidates} />
      </TabsContent>

      <TabsContent value="talent-pool" className="w-full m-0 p-0">
        <TalentPoolList candidates={candidates} />
      </TabsContent>

      <TabsContent value="analytics" className="w-full m-0 p-0">
        <RecruitmentAnalytics
          candidates={candidates}
          postings={postings}
          jobs={jobs}
        />
      </TabsContent>
    </Tabs>
  )
}
