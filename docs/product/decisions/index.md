# Termék és UX Döntések Tára (PRD - Product Requirement Decisions)

Ez az index nyilvántartja az **eaisyDocs** és **eaisyHR** alkalmazásban meghozott valamennyi képernyő-, komponens-, munkafolyamat- és felhasználói élmény (UX) döntést.

---

## 📋 Nyilvántartás

| Azonosító | Dátum | Cím | Hatókör | Kategória | Kapcsolódó Kód / Útvonal |
|---|---|---|---|---|---|
| [P-001](./P-001-interactive-dashboard-analytics-ux.md) | 2026-09-29 | Vezetői és operatív dashboard Recharts statisztikákkal | `[Közös]` | `Dashboard / Analytics` | `src/app/page.tsx`, `dashboard-overview.tsx` |
| [P-002](./P-002-archive-protocol-popover-ux.md) | 2026-09-29 | Selejtezési jegyzőkönyv iktatószám badge és popover részletező | `[Docs]` | `Archive / Disposal` | `src/app/archive/page.tsx`, `archive-client.tsx` |
| [P-003](./P-003-filing-realtime-collision-guard-ux.md) | 2026-09-29 | Iktatási Realtime párhuzamossági ütközésvédelem és Toast | `[Docs]` | `Inbox / Filing` | `src/app/inbox/[id]/page.tsx`, `filing-panel-client.tsx` |
| [P-004](./P-004-inbox-filing-split-view-ai-ux.md) | 2026-09-30 | Érkeztetett postaláda split-view és AI javaslatok UX | `[Docs]` | `Inbox / Filing` | [A-009](../../architecture/decisions/A-009-imap-daemon-and-asynchronous-ai-queue.md), `src/app/inbox` |
| [P-005](./P-005-dossiers-lifecycle-and-filing-book-ux.md) | 2026-09-30 | Ügyirat életciklus, lezárás és iktatókönyv UX | `[Docs]` | `Dossiers / Filing` | [A-006](../../architecture/decisions/A-006-gapless-filing-sequence-allocation.md), `src/app/dossiers` |
| [P-006](./P-006-advanced-search-saved-filters-and-alerts-ux.md) | 2026-09-30 | Részletes kereső, mentett szűrők és értesítések UX | `[Docs]` | `Search / Filters` | [A-016](../../architecture/decisions/A-016-hungarian-unaccent-full-text-search-architecture.md), `src/app/search` |
| [P-007](./P-007-physical-storage-and-borrowing-management-ux.md) | 2026-09-30 | Fizikai irattár, kölcsönzés és dobozkezelés UX | `[Docs]` | `Storage / Borrowing` | `src/components/physical-location-dialog.tsx`, `borrow-dialog.tsx` |
| [P-008](./P-008-system-settings-org-tree-substitution-and-audit-ux.md) | 2026-09-30 | Rendszerbeállítások, szervezeti egységek és audit napló UX | `[Közös]` | `Admin / Settings` | [A-008](../../architecture/decisions/A-008-append-only-audit-event-log-integrity.md), `src/app/settings` |
| [P-009](./P-009-partner-directory-and-embedded-dossier-ux.md) | 2026-09-30 | Partner nyilvántartás és beágyazott ügyirat betekintő UX | `[Docs]` | `Partners` | [A-011](../../architecture/decisions/A-011-polymorphic-entity-relations-graph.md), `src/app/partners` |
| [P-010](./P-010-hr-employee-profile-and-employment-history-ux.md) | 2026-09-30 | Munkavállalói digitális karton és munkaviszony-történet UX | `[HR]` | `HR / Employees` | [A-012](../../architecture/decisions/A-012-hr-sensitive-data-rpc-encryption.md), `src/app/hr/employee/[id]` |
| [P-011](./P-011-hr-timesheet-attendance-and-leave-calendar-ux.md) | 2026-09-30 | Munkaidő nyilvántartás, jelenléti ív és szabadságtervező naptár UX | `[HR]` | `HR / Attendance` | [A-013](../../architecture/decisions/A-013-hr-timesheet-overtime-holiday-calculation-engine.md), `src/app/hr/time` |
| [P-012](./P-012-hr-performance-kpi-and-appraisal-cycles-ux.md) | 2026-09-30 | Teljesítményértékelés, KPI és értékelési ciklusok UX | `[HR]` | `HR / Performance` | [A-017](../../architecture/decisions/A-017-hr-cascading-kpi-and-performance-cycle-engine.md), `src/app/hr/performance` |
| [P-013](./P-013-hr-recruitment-ats-and-public-careers-portal-ux.md) | 2026-09-30 | Toborzási ATS és publikus karrieroldal UX | `[HR]` | `HR / Recruitment` | [A-018](../../architecture/decisions/A-018-hr-recruitment-ats-and-ai-resume-parsing.md), `src/app/hr/recruitment`, `/karrier/[id]` |
| [P-014](./P-014-hr-employee-self-service-and-cafeteria-ux.md) | 2026-09-30 | Dolgozói Self-Service portál és cafeteria nyilatkozat UX | `[HR]` | `HR / ESS` | `src/app/hr/self-service`, `src/components/hr/cafeteria-declaration.tsx` |
| [P-015](./P-015-hr-onboarding-offboarding-checklist-ux.md) | 2026-09-30 | Onboarding és offboarding checklist folyamatok UX | `[HR]` | `HR / Lifecycle` | `src/app/hr/onboarding`, `src/app/hr/offboarding` |
| [P-016](./P-016-hr-occupational-health-and-compliance-ux.md) | 2026-09-30 | Munkaügyi megfelelőség, hatósági riportok és egészségügy UX | `[HR]` | `HR / Compliance` | `src/app/hr/compliance`, `src/app/hr/reports` |
| [P-017](./P-017-hr-individual-development-plan-idp-ux.md) | 2026-09-30 | Egyéni Fejlesztési Terv (IDP) és képzési UX | `[HR]` | `HR / IDP` | `src/app/hr/self-service/idp`, `src/components/hr/idp/` |
| [P-018](./P-018-hr-org-chart-and-executive-dashboard-ux.md) | 2026-09-30 | Szervezeti fa és vezetői HR dashboard UX | `[HR]` | `HR / Org` | `src/components/hr/org-chart-tree.tsx`, `src/app/hr` |
| [P-019](./P-019-task-management-kanban-and-calendar-ux.md) | 2026-09-30 | Feladatkezelő Kanban tábla, lista és naptár UX | `[Docs]` | `Tasks / Workflow` | `src/app/tasks`, `kanban-board.tsx`, `task-calendar.tsx` |
| [P-020](./P-020-embeddable-partner-dossiers-iframe-ux.md) | 2026-09-30 | Beágyazható partner ügyirat betekintő iframe UX | `[Docs]` | `Integrations / Embed` | `src/app/embed/partner-dossiers/page.tsx` |
| [P-021](./P-021-batch-scanner-separator-sheet-generator-ux.md) | 2026-09-30 | Kötegelt szkenner elválasztólap generátor UX | `[Docs]` | `Scanner / Batch` | `src/app/api/scanner/separator-sheet` |
| [P-022](./P-022-dossier-access-sharing-and-templates-ux.md) | 2026-09-30 | Ügyiraton belüli egyedi hozzáférés-megosztás és sablonok UX | `[Docs]` | `Dossiers / Security` | `dossier-access-dialog.tsx`, `template-dialog.tsx` |
| [P-023](./P-023-hr-manager-approvals-and-team-dashboard-ux.md) | 2026-09-30 | Vezetői csapat-jóváhagyási műszerfal UX | `[HR]` | `HR / Management` | `src/app/hr/manager/page.tsx` |
| [P-024](./P-024-partner-directory-and-contact-management-ux.md) | 2026-09-30 | Partnertörzs és Kapcsolattartói Adatlap Megújított UX | `[Docs]` | `Partners / CRM` | `src/app/partners/*`, `partner-dialog.tsx` |
| [P-025](./P-025-employee-document-filing-and-dossier-ux.md) | 2026-09-30 | Munkavállalói Hivatalos Dokumentumok Iktatása és Személyi Dosszié UX | `[HR]` | `HR / Filing Bridge` | `src/app/hr/employee/[id]/*`, `file-hr-document-dialog.tsx` |
| [P-026](./P-026-hr-document-templates-and-lifecycle-filing-roadmap.md) | 2026-10-01 | Munkavállalói Életciklus Dokumentumsablonok és Iratkezelési Terv | `[Közös]` | `HR / Lifecycle Templates` | `src/components/hr/*`, `src/utils/hr-filing-bridge.ts` |
| [P-027](./P-027-annual-leave-sheet-and-leave-certificates-ux.md) | 2026-10-01 | Hivatalos Éves Szabadság-nyilvántartó Lap (Mt. 134. §) és Távolléti Igazolások Kezelése | `[HR]` | `HR / Leave & Filing` | `src/utils/hr/annual-leave-pdf-generator.ts`, `LeaveTab.tsx`, `leave-history-list.tsx` |
| [P-028](./P-028-occupational-health-examination-filing-and-validity-ux.md) | 2026-10-01 | Foglalkozás-egészségügyi Alkalmassági Vizsgálatok Dokumentumkezelése és Érvényesség UX | `[HR]` | `HR / Medical & Filing` | `MedicalTab.tsx`, `medical-sheet-pdf-generator.ts`, `src/app/api/hr/medical-pdf` |
| [P-029](./P-029-cafeteria-declaration-filing-and-preview-ux.md) | 2026-10-01 | Cafeteria Nyilatkozat In-Browser Megtekintés, Letöltés és eaisyDocs Iktatás UX | `[HR]` | `HR / Cafeteria & Filing` | `CafeteriaTab.tsx`, `cafeteria-declaration.tsx`, `cafeteria-pdf-generator.ts` |
| [P-030](./P-030-study-contract-lifecycle-and-filing-ux.md) | 2026-10-01 | Tanulmányi Szerződések Életciklusa, Mt. 229. § Megfelelőség és eaisyDocs Iktatás UX | `[HR]` | `HR / Study & Filing` | `StudyContractTab.tsx`, `study-contract-pdf-generator.ts`, `src/app/api/hr/study-contract-pdf` |
| [P-031](./P-031-disciplinary-and-damage-liability-lifecycle-ux.md) | 2026-10-01 | Munkáltatói Fegyelmi és Károkozási Határozatok (Mt. 56. §, 179. §) és eaisyDocs Iktatás UX | `[HR]` | `HR / Disciplinary & Filing` | `DisciplinaryTab.tsx`, `disciplinary-pdf-generator.ts`, `src/app/api/hr/disciplinary-pdf` |
| [P-032](./P-032-awards-and-honors-lifecycle-ux.md) | 2026-10-01 | Munkavállalói Kitüntetések, Szakmai Elismerések és Elismerő Oklevél UX | `[HR]` | `HR / Awards & Filing` | `AwardsTab.tsx`, `award-certificate-pdf-generator.ts`, `src/app/api/hr/award-pdf` |
| [P-033](./P-033-signed-document-copy-upload-and-versioning-ux.md) | 2026-10-01 | Hivatalos HR Dokumentumok Aláírt Példányának Csatolása és Verziókezelése UX | `[HR]` | `HR / Signed Copy & Filing` | `UploadSignedDocumentDialog.tsx`, `page.tsx`, `actions.ts` |
| [P-034](./P-034-onboarding-lifecycle-redesign-and-activation-ux.md) | 2026-10-01 | Megújított Onboarding Folyamat, Kétlépcsős Fiókaktiválás és Letisztult UX | `[HR]` | `HR / Onboarding` | `src/app/hr/onboarding/*`, `onboarding-list.tsx`, `onboarding-card.tsx`, `onboarding-profile-modal.tsx` |
| [P-035](./P-035-onboarding-manual-intake-and-asset-handover-ux.md) | 2026-10-01 | Közvetlen Beléptetés Indítás és Munkahelyi Eszközfelelősségi Jegyzőkönyv (Mt. 179. §) UX | `[HR]` | `HR / Onboarding & Assets` | `add-onboarding-dialog.tsx`, `asset-handover-dialog.tsx`, `asset-actions.ts`, `asset-handover-pdf-generator.ts` |
| [P-036](./P-036-occupational-safety-and-fire-training-protocol-ux.md) | 2026-10-01 | Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv (Mvt. 55. §, Ttv. 22. §) és Onboarding Iktatás UX | `[HR]` | `HR / Safety & Onboarding` | `safety-training-dialog.tsx`, `safety-training-actions.ts`, `safety-training-pdf-generator.ts`, `MedicalTab.tsx` |
| [P-037](./P-037-onboarding-employment-contract-generator-and-filing-ux.md) | 2026-10-01 | Onboarding Munkaszerződés Előkészítés, Generálás (Mt. 42–45. §) és Személyi Dosszié Iktatás UX | `[HR]` | `HR / Contracts & Onboarding` | `employment-contract-panel.tsx`, `employment-contract-actions.ts`, `employment-contract-pdf-generator.ts`, `onboarding-profile-modal.tsx` |

---

> **Új PRD létrehozási szabály:**
> Mindig olvasd be ezt az `index.md`-t, vedd a következő sorszámot (jelenleg `P-037`), készítsd el a fájlt `P-XXX-<kebab-case-cim>.md` néven a sablon szerint, majd jegyezd be ide a fenti táblázatba!
