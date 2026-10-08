# Építészeti Döntések Tára (ADR - Architecture Decision Records)

Ez az index nyilvántartja az **eaisyDocs** és **eaisyHR** rendszerben hozott valamennyi végleges technológiai és építészeti döntést a valós forráskód alapján.

## 📌 ADR Életciklus Státuszok
- **Decided:** Érvényes, aktív építészeti döntés.
- **Superseded:** Egy újabb döntés felváltotta (a fejlécben hivatkozva az új ADR-re).
- **Deprecated:** Elavult vagy kivezetett technológiai megoldás.

---

## 📋 Nyilvántartás

| Azonosító | Dátum | Cím | Hatókör | Státusz | Kapcsolódó Kód / PRD |
|---|---|---|---|---|---|
| [A-001](./A-001-four-eyes-disposal-validation.md) | 2026-09-29 | Szigorú 4-szem elv és tranzakciós selejtezési csomagkezelés | `[Docs]` | `Decided` | [P-002](../../product/decisions/P-002-archive-protocol-popover-ux.md), `disposal-actions.ts` |
| [A-002](./A-002-document-preview-blob-isolation.md) | 2026-09-29 | DocumentPreviewFrame memóriabeli Blob URL izoláció Next.js iframe hibák ellen | `[Docs]` | `Decided` | `document-preview-frame.tsx`, `filing-panel-client.tsx` |
| [A-003](./A-003-eaisybill-channel-enum-migration.md) | 2026-09-29 | 'eaisybill' érkezési mód ENUM bővítés és számlaimport migráció | `[Docs]` | `Decided` | `eaisybill-actions.ts`, `20260929000001_add_eaisybill_channel.sql` |
| [A-004](./A-004-batch-scanner-stream-fallback.md) | 2026-09-29 | Kötegelt szkenner elválasztólapos feldolgozás és worker streaming fallback | `[Docs]` | `Decided` | `src/utils/batch-scanner.ts`, `src/utils/scanner-hotfolder.ts` |
| [A-005](./A-005-hr-modular-independence-architecture.md) | 2026-09-29 | eaisyDocs és eaisyHR moduláris függetlensége közös adatbázison | `[Közös]` | `Decided` | `src/app/hr/*`, `.agents/AGENTS.md` |
| [A-006](./A-006-gapless-filing-sequence-allocation.md) | 2026-07-14 | Gap-mentes iktatószám allokáció tranzakciós zárolással | `[Docs]` | `Decided` | [BRD-001](../../business/decisions/001-gapless-filing-number-allocation.md), `iktatoszam_allokacio` |
| [A-007](./A-007-four-dimensional-rbac-rls-security.md) | 2026-07-16 | Négy-dimenziós RLS jogosultsági modell és szerepkör mátrix | `[Közös]` | `Decided` | `strict_confidential_rls.sql`, `middleware.ts` |
| [A-008](./A-008-append-only-audit-event-log-integrity.md) | 2026-07-14 | Szigorúan append-only audit eseménynapló integritás | `[Közös]` | `Decided` | `audit_triggers.sql`, `esemeny_naplo`, `hr_esemeny_naplo` |
| [A-009](./A-009-imap-daemon-and-asynchronous-ai-queue.md) | 2026-07-14 | IMAP e-mail figyelő és aszinkron AI sorfeldolgozó daemon | `[Docs]` | `Decided` | `imap-worker.ts`, `ai-worker.ts`, `/api/cron/imap` |
| [A-010](./A-010-pdfa-normalization-and-sha256-verification.md) | 2026-07-14 | PDF/A-2b normalizálás és SHA-256 integritásvédelem | `[Docs]` | `Decided` | `pdfa-converter.ts`, `irat_fajl.sha256` |
| [A-011](./A-011-polymorphic-entity-relations-graph.md) | 2026-07-25 | Polimorf entitáskapcsolatok és keresztmodulos gráf | `[Közös]` | `Decided` | `irat_kapcsolat`, `polymorphic-links-tab.tsx` |
| [A-012](./A-012-hr-sensitive-data-rpc-encryption.md) | 2026-07-21 | eaisyHR szenzitív dolgozói adatok (TAJ, adójel, bér) RPC védelme | `[HR]` | `Decided` | `hr_dolgozo_titkos_adat`, `get_decrypted_hr_data` |
| [A-013](./A-013-hr-timesheet-overtime-holiday-calculation-engine.md) | 2026-08-04 | eaisyHR jelenléti ív, túlóra és munkaszüneti nap szabálymotor | `[HR]` | `Decided` | `calculate_tulora_on_checkout`, `hr_tulora_egyenleg` |
| [A-014](./A-014-hr-gdpr-data-retention-and-anonymization-cron.md) | 2026-07-31 | eaisyHR GDPR adatmegőrzési és automatikus anonimizálási cron | `[HR]` | `Decided` | `hr_toborzas`, `/api/cron/nightly` |
| [A-015](./A-015-totp-two-factor-auth-and-session-timeout-governance.md) | 2026-07-14 | TOTP kétlépcsős azonosítás (2FA) és session timeout | `[Közös]` | `Decided` | `mfa-settings-card.tsx`, `session-timeout.tsx` |
| [A-016](./A-016-hungarian-unaccent-full-text-search-architecture.md) | 2026-09-20 | Magyar ékezetfüggetlen keresés és FTS architektúra | `[Docs]` | `Decided` | `search_iratok_hybrid`, `src/app/search` |
| [A-017](./A-017-hr-cascading-kpi-and-performance-cycle-engine.md) | 2026-07-25 | eaisyHR kaszkádolt KPI és teljesítményértékelési ciklusok | `[HR]` | `Decided` | `hr_kpi_katalogus`, `hr_teljesitmeny_ciklus` |
| [A-018](./A-018-hr-recruitment-ats-and-ai-resume-parsing.md) | 2026-07-25 | eaisyHR toborzási ATS és AI önéletrajz-feldolgozás | `[HR]` | `Decided` | `hr_allashirdetes`, `hr_toborzas`, `/api/hr/parse-cv` |
| [A-019](./A-019-substitution-delegation-permission-engine.md) | 2026-07-28 | Helyettesítési és jogosultság-delegálási szabálymotor | `[Közös]` | `Decided` | `helyettesites`, `hr_helyettesites` |
| [A-020](./A-020-external-rest-api-v1-architecture.md) | 2026-09-30 | Külső REST API v1 és Webhook Architektúra | `[Docs]` | `Decided` | `src/app/api/v1/ugyiratok/route.ts` |
| [A-021](./A-021-cron-jobs-and-scheduled-alerts-architecture.md) | 2026-09-30 | Időzített Cron Feladatok és Értesítési Háttérmotor | `[Közös]` | `Decided` | `src/app/api/cron/*` |
| [A-022](./A-022-email-spam-and-relevance-prefilter-architecture.md) | 2026-09-30 | AI Email Spam és Relevancia Előszűrő Architektúra | `[Docs]` | `Decided` | `src/utils/email-spam-filter.ts`, `imap-service.ts` |
| [A-023](./A-023-tax-number-foreign-vat-separation.md) | 2026-09-30 | Magyar Belföldi Adószám és Külföldi / EU Adóazonosító Szétválasztása | `[Docs]` | `Decided` | `tax-number.ts`, `filing-panel-client.tsx`, `partner-dialog.tsx` |
| [A-024](./A-024-partner-dual-classification-and-contacts-architecture.md) | 2026-09-30 | Partnertörzs Kettős Besorolási Modell és Kapcsolattartói Architektúra | `[Docs]` | `Decided` | [P-024](../../product/decisions/P-024-partner-directory-and-contact-management-ux.md), `partner_expansion.sql` |
| [A-025](./A-025-base-ui-select-automatic-label-resolution.md) | 2026-09-30 | Base UI Select Automatikus Címkefeloldási Architektúra | `[Közös]` | `Decided` | `src/components/ui/select.tsx`, `partner-dialog.tsx` |
| [A-026](./A-026-employee-personal-dossier-and-hr-filing-bridge.md) | 2026-09-30 | Munkavállalói Személyi Dosszié és eaisyHR ↔ eaisyDocs Iratkezelési Híd Architektúra | `[Közös]` | `Decided` | [P-025](../../product/decisions/P-025-employee-document-filing-and-dossier-ux.md), `hr_filing_bridge.sql` |
| [A-027](./A-027-pre-onboarding-filing-and-t1041-bridge.md) | 2026-10-01 | Pre-Onboarding Munkaköri Leírás, NAV T1041 Hatósági Bejelentés és eaisyDocs Iratkezelési Híd | `[Közös]` | `Decided` | `hr_t1041_bejelentes.sql`, `hr_onboarding_munkakor.sql`, `onboarding/actions.ts` |
| [A-028](./A-028-configurable-four-eyes-disposal.md) | 2026-10-02 | Konfigurálható Négyszem-Elv és Rendszerbeállítás Tábla | `[Docs]` | `Decided` | `system-settings.ts`, `admin-actions.ts`, `disposal-actions.ts`, `disposal-protocol-pdf.ts` |
| [A-029](./A-029-global-ui-consistency-and-unified-components.md) | 2026-10-02 | Rendszerszintű UI/UX Egységesség és Kanonikus Komponens Használati Szabályzat | `[Közös]` | `Decided` | [P-043](../../product/decisions/P-043-global-ui-consistency-and-unified-components.md), `table-toolbar.tsx`, `partner-documents-table.tsx` |
| [A-030](./A-030-code-level-security-hardening.md) | 2026-10-02 | Alkalmazásszintű Biztonsági Keményítés és Védelmi Kapuk | `[Közös]` | `Decided` | [P-044](../../product/decisions/P-044-code-level-security-hardening.md), `send-email/route.ts`, `download-document/route.ts`, `middleware.ts`, `next.config.ts` |
| [A-031](./A-031-hr-reports-data-aggregation-and-export-architecture.md) | 2026-10-07 | HR Riportok Adataggregációja, Formátum-Normalizálása és Multi-Engine Export Architektúrája | `[HR]` | `Decided` | [P-050](../../product/decisions/P-050-hr-reports-t1041-ksh-payroll-overhaul.md), `reports-export.ts`, `hr/reports/actions.ts`, `reports-tabs.tsx` |
| [A-032](./A-032-overtime-balance-and-leave-synchronization.md) | 2026-10-07 | Túlóra-egyenleg Levonás és Távollét Szinkronizáció Adatbázis Architektúra | `[HR]` | `Decided` | [P-051](../../product/decisions/P-051-overtime-comp-time-and-payout-workflow.md), `overtime_workflow_enhancements.sql`, `attendance-actions.ts` |
| [A-033](./A-033-unified-approvals-architecture-and-attendance-correction-security.md) | 2026-10-07 | Egységes Jóváhagyási Architektúra és Jelenléti Korrekció Biztonsági Modell | `[HR]` | `Decided` | [P-052](../../product/decisions/P-052-unified-manager-approvals-hub-and-attendance-correction-ux.md), `unified-approvals-panel.tsx`, `attendance-actions.ts`, `fix_hr_jelenlet_rls.sql` |
| [A-034](./A-034-multi-tenancy-architecture.md) | 2026-10-08 | Többcég-kezelés (Multi-Tenancy) és Adatelkülönítési Architektúra | `[Közös]` | `Decided` | [P-053](../../product/decisions/P-053-multi-tenancy-company-selector-ux.md), `companies`, `company_members`, `user_company_access_cache`, `company-selector.tsx` |
| [A-035](./A-035-company-branding-filing-prefix-and-member-roles.md) | 2026-10-08 | Céglogó Tárolás, Dinamikus Iktató Prefix és Tag Szerepkör Szinkronizáció | `[Közös]` | `Decided` | [P-054](../../product/decisions/P-054-company-branding-filing-prefix-and-member-roles.md), `companies.logo_url`, `companies.filing_prefix`, `edit-member-role-dialog.tsx` |

---

> **Új ADR létrehozási szabály:**
> Mindig olvasd be ezt az `index.md`-t, vedd a következő sorszámot (jelenleg `A-036`), készítsd el a fájlt `A-XXX-<kebab-case-cim>.md` néven a sablon szerint, majd jegyezd be ide a fenti táblázatba!
