# Üzleti Döntések Tára (BRD - Business Requirement Decisions)

Ez az index nyilvántartja az **eaisyDocs** és **eaisyHR** rendszerben hozott végleges üzleti szabályokat, megfelelőségi előírásokat és jogszabályi követelményeket.

## 📋 Nyilvántartás

| Azonosító | Dátum | Cím | Hatókör | Kategória | Kapcsolódó ADR / PRD |
|---|---|---|---|---|---|
| [BRD-001](./001-gapless-filing-number-allocation.md) | 2026-09-29 | Gap-mentes és újrahasznosíthatatlan iktatószám allokáció | `[Docs]` | `Compliance` | `iktatoszam_szamlalo`, [A-006](../../architecture/decisions/A-006-gapless-filing-number-allocation.md) |
| [BRD-002](./002-strict-four-eyes-disposal-governance.md) | 2026-09-29 | Selejtezési folyamat és négyszem-elv szabályozása | `[Docs]` | `Compliance` | [A-001](../../architecture/decisions/A-001-four-eyes-disposal-validation.md), [P-002](../../product/decisions/P-002-archive-protocol-popover-ux.md) |
| [BRD-003](./003-hr-modular-independence-contract.md) | 2026-09-29 | eaisyDocs és eaisyHR üzleti szeparációja és licencelhetősége | `[HR / Közös]` | `Business Model` | [A-005](../../architecture/decisions/A-005-hr-modular-independence-architecture.md) |
| [BRD-004](./004-confidential-vs-open-document-classification.md) | 2026-09-30 | Bizalmas és nyílt minősítésű iratok kezelése | `[Docs]` | `Security` | [A-007](../../architecture/decisions/A-007-four-dimensional-rbac-rls-security.md) |
| [BRD-005](./005-physical-borrowing-and-chain-of-custody.md) | 2026-09-30 | Fizikai irattári kölcsönzés és leltári felelősség | `[Docs]` | `Storage` | [P-007](../../product/decisions/P-007-physical-storage-and-borrowing-management-ux.md) |
| [BRD-006](./006-hr-timesheet-overtime-and-labor-code-rules.md) | 2026-09-30 | Jelenlét- és túlóra-elszámolási üzleti logika | `[HR]` | `Attendance / Overtime` | [A-013](../../architecture/decisions/A-013-hr-timesheet-overtime-holiday-calculation-engine.md), [P-011](../../product/decisions/P-011-hr-timesheet-attendance-and-leave-calendar-ux.md) |
| [BRD-007](./007-recruitment-data-privacy-and-candidate-lifecycle.md) | 2026-09-30 | Toborzási adatkezelés, GDPR retenció és jelölt életciklus | `[HR]` | `GDPR / ATS` | [A-014](../../architecture/decisions/A-014-hr-gdpr-data-retention-and-anonymization-cron.md), [P-013](../../product/decisions/P-013-hr-recruitment-ats-and-public-careers-portal-ux.md) |
| [BRD-008](./008-configurable-four-eyes-disposal-and-sme-mode.md) | 2026-10-02 | Konfigurálható négyszem-elv és egyfelhasználós KKV mód selejtezésnél | `[Docs]` | `Governance & Compliance` | [A-028](../../architecture/decisions/A-028-configurable-four-eyes-disposal.md), [P-042](../../product/decisions/P-042-configurable-four-eyes-disposal-ux.md) |

---

> **Új BRD létrehozási szabály:**
> Mindig olvasd be ezt az `index.md`-t, vedd a következő sorszámot (jelenleg `BRD-009`), készítsd el a fájlt `00X-<kebab-case-cim>.md` néven a sablon szerint, majd jegyezd be ide a fenti táblázatba!
