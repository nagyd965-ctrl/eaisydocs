import { getActiveCompanyIdServer } from "@/utils/company-server"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import { Shield } from "lucide-react"
import {
  getCompanyLeaveComplianceData,
  getCompanySafetyComplianceData,
  getCompanyOvertimeComplianceData,
  getCompanyMedicalComplianceData,
} from "./compliance-actions"
import { LeaveComplianceTable } from "@/components/hr/leave-compliance-table"
import { SafetyTrainingTable } from "@/components/hr/safety-training-table"
import { OvertimeComplianceTable } from "@/components/hr/overtime-compliance-table"
import { MedicalComplianceTable } from "@/components/hr/medical-compliance-table"
import { KpiCard } from "@/components/kpi-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export const metadata = {
  title: "Munkaügyi és Munkavédelmi Megfelelőség | eaisyHR",
}

export default async function CompliancePage() {
  const auth = await requireHrAuthServer(["compliance"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Nincs jogosultságod a Munkaügyi és Munkavédelmi Megfelelőség modul megtekintéséhez a kiválasztott cégnél.</p>
        </div>
      </div>
    )
  }

  const companyScope = auth.companyScope
  const currentYear = new Date().getFullYear()

  const [leaveData, safetyData, overtimeData, medicalData] = await Promise.all([
    getCompanyLeaveComplianceData(currentYear),
    getCompanySafetyComplianceData(),
    getCompanyOvertimeComplianceData(currentYear),
    getCompanyMedicalComplianceData(),
  ])

  const leaveCompliancePercent =
    leaveData.totalEmployees > 0
      ? Math.round(
          ((leaveData.fulfilled14DaysCount + leaveData.waiverCount) /
            leaveData.totalEmployees) *
            100
        )
      : 100

  return (
    <div key={companyScope} className="space-y-6">
      {/* ── 1. FEJLÉC ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Munkaügyi és Munkavédelmi Megfelelőség
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Az Mt. 122–123. § szabadságkiadás, az Mt. 99. és 135. § munkaidő- és túlórakeretek, az Mvt. 55. § / Ttv. 22. § oktatások, valamint az Mvt. 49. § / 33/1998. NM rendelet szerinti orvosi alkalmassági vizsgálatok központi felügyelete.
          </p>
        </div>
      </div>

      {/* ── 2. TABS RENDSZER ── */}
      <Tabs defaultValue="leave" className="space-y-6">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="leave" className="text-xs font-medium">
            Szabadságkiadás
          </TabsTrigger>
          <TabsTrigger value="overtime" className="text-xs font-medium">
            Munkaidő és túlórakeret
          </TabsTrigger>
          <TabsTrigger value="safety" className="text-xs font-medium">
            Munkavédelem és Tűzvédelem
          </TabsTrigger>
          <TabsTrigger value="medical" className="text-xs font-medium">
            Orvosi alkalmasság
          </TabsTrigger>
        </TabsList>

        {/* ── FÜL 1: SZABADSÁGKIADÁS ── */}
        <TabsContent value="leave" className="space-y-6">
          {/* KPI Kártyák */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="14 napos pihenő szabályosság"
              value={`${leaveData.fulfilled14DaysCount + leaveData.waiverCount} / ${leaveData.totalEmployees}`}
              sub={`${leaveCompliancePercent}% megfelelőség (${leaveData.waiverCount} megállapodással)`}
            />
            <KpiCard
              label="14 napos kötelezettség hiányzik"
              value={`${leaveData.missing14DaysCount} fő`}
              sub={
                leaveData.missing14DaysCount > 0
                  ? "Bírságveszély: szabadságkiadást vagy megállapodást igényel"
                  : "Minden munkatársnál biztosított vagy mentesített"
              }
              highlight={leaveData.missing14DaysCount > 0}
            />
            <KpiCard
              label={`Bent ragadt szabadság (${currentYear})`}
              value={`${leaveData.totalRemainingDays} nap`}
              sub="Összes hátralévő fel nem használt nap a cégnél"
            />
            <KpiCard
              label="Év végi kiadási kockázat"
              value={`${leaveData.criticalRiskCount + leaveData.warningRiskCount} fő`}
              sub={`${leaveData.criticalRiskCount} kritikus, ${leaveData.warningRiskCount} figyelmeztetés`}
              highlight={leaveData.criticalRiskCount > 0}
            />
          </div>

          {/* Táblázat */}
          <LeaveComplianceTable initialData={leaveData} />
        </TabsContent>

        {/* ── FÜL 2: MUNKAIDŐ & TÚLÓRAKERET (Mt. 99. §, 135. §) ── */}
        <TabsContent value="overtime" className="space-y-6">
          {/* KPI Kártyák (Linear Flat, Standard KpiCard) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Heti 48h limit túllépés (Mt. 99. §)"
              value={`${overtimeData.exceeded48hCount} fő`}
              sub={
                overtimeData.exceeded48hCount > 0
                  ? "Bírságveszély: heti felső törvényi korlát átlépve!"
                  : "Minden munkatárs a heti 48 órán belül van"
              }
              highlight={overtimeData.exceeded48hCount > 0}
            />
            <KpiCard
              label="Éves keret 80% felett (Küszöb)"
              value={`${overtimeData.nearOvertimeLimitCount} fő`}
              sub="Előrejelzés: az éves túlórakeret hamarosan kimerül"
              highlight={overtimeData.nearOvertimeLimitCount > 0}
            />
            <KpiCard
              label="Éves keret kimerült (100%+)"
              value={`${overtimeData.exceededOvertimeLimitCount} fő`}
              sub={
                overtimeData.exceededOvertimeLimitCount > 0
                  ? "Kritikus: további túlóra elrendelése jogellenes!"
                  : "Minden munkatárs kereten belül dolgozik"
              }
              highlight={overtimeData.exceededOvertimeLimitCount > 0}
            />
            <KpiCard
              label="Önként vállalt megállapodás (400h)"
              value={`${overtimeData.voluntaryAgreementCount} / ${overtimeData.totalEmployees} fő`}
              sub={`${overtimeData.totalCompanyOvertimeHours}h összes céges túlóra ${currentYear}-ban`}
            />
          </div>

          {/* Túlóra és munkaidő megfelelőségi táblázat */}
          <OvertimeComplianceTable initialData={overtimeData} />
        </TabsContent>

        {/* ── FÜL 3: MUNKAVÉDELEM & TŰZVÉDELEM ── */}
        <TabsContent value="safety" className="space-y-6">
          {/* KPI Kártyák */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Munkavédelmi érvényesség"
              value={`${safetyData.validCount} / ${safetyData.totalEmployees} fő`}
              sub={`${safetyData.compliancePercent}% céges lefedettség`}
            />
            <KpiCard
              label="Érvényes oktatások"
              value={`${safetyData.validCount} fő`}
              sub="Hatósági auditra felkészülve"
            />
            <KpiCard
              label="Hamarosan lejáró (30 nap)"
              value={`${safetyData.expiringSoonCount} fő`}
              sub="Éves ismétlő oktatás szükséges"
              highlight={safetyData.expiringSoonCount > 0}
            />
            <KpiCard
              label="Lejárt vagy hiányzik"
              value={`${safetyData.expiredOrMissingCount} fő`}
              sub={
                safetyData.expiredOrMissingCount > 0
                  ? "Bírságveszély: azonnali pótlás szükséges!"
                  : "Minden munkatársnál rendben"
              }
              highlight={safetyData.expiredOrMissingCount > 0}
            />
          </div>

          {/* Munkavédelmi Táblázat */}
          <SafetyTrainingTable initialData={safetyData} />
        </TabsContent>

        {/* ── FÜL 4: ORVOSI ALKALMASSÁG (Mvt. 49. §, 33/1998. NM rendelet) ── */}
        <TabsContent value="medical" className="space-y-6">
          {/* KPI Kártyák */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Orvosi alkalmassági lefedettség"
              value={`${medicalData.validCount + medicalData.expiringSoonCount} / ${medicalData.totalEmployees} fő`}
              sub={`${medicalData.compliancePercent}% céges megfelelőség`}
            />
            <KpiCard
              label="Érvényes alkalmassági"
              value={`${medicalData.validCount} fő`}
              sub="Munkavégzésre és műszakbeosztásra alkalmas (> 30 nap)"
            />
            <KpiCard
              label="Hamarosan lejáró (30 nap)"
              value={`${medicalData.expiringSoonCount} fő`}
              sub="Időszakos vizsgálat szervezése szükséges"
              highlight={medicalData.expiringSoonCount > 0}
            />
            <KpiCard
              label="Lejárt vagy hiányzik"
              value={`${medicalData.expiredOrMissingCount} fő`}
              sub={
                medicalData.expiredOrMissingCount > 0
                  ? "Mvt. 49. §: műszakbeosztás és munkavégzés blokkolva!"
                  : "Minden munkatárs érvényes vizsgálattal rendelkezik"
              }
              highlight={medicalData.expiredOrMissingCount > 0}
            />
          </div>

          {/* Orvosi Alkalmassági Táblázat */}
          <MedicalComplianceTable
            initialData={medicalData}
            userRole={auth.isCompanyAdmin ? "admin" : auth.hrRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
