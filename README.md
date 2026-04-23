# Alenstec — Plataforma de Gestión de Costos

> **Status (2026-04-21):** Phase-1 + Phase-2 done. Every core module (Dashboard, Cotizaciones, OT, Material, Proveedores, Horas, Conciliación) is wired to the backend end-to-end; XLSX export works for 5 tables; login + refresh are live. `v0.1-mvp` tag-ready. See [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md) for phase status and [`docs/implementation-audit.md`](docs/implementation-audit.md) for the feature-by-feature matrix.

This repository is organised as an **Obsidian vault**. Open the folder in Obsidian (or any Markdown editor — everything is plain `.md`) to get graph view, backlinks, and search across the entire documentation set.

---

## Start here

| If you want to…                         | Read                                                            |
|-----------------------------------------|-----------------------------------------------------------------|
| **Use the system (end-user guide, ES)** | [`guia-de-usuario.html`](guia-de-usuario.html) — abrir en navegador |
| Understand the product & terminology    | [`docs/project-summary.md`](docs/project-summary.md)            |
| See the phased implementation plan      | [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md) |
| See what's mockup vs. implemented       | [`docs/implementation-audit.md`](docs/implementation-audit.md)  |
| See the regression-test requirements    | [`docs/regression-requirements.md`](docs/regression-requirements.md) |
| Stand up the backend locally            | [`docs/backend-setup.md`](docs/backend-setup.md) · [`backend/README.md`](backend/README.md) |
| Read the architectural decisions (ADRs) | [`designs/00-architecture-decisions.md`](designs/00-architecture-decisions.md) |
| Read the commercial proposal            | [`docs/propuesta-comercial.md`](docs/propuesta-comercial.md)    |

---

## Module documentation

Each row of the mockup sidebar has a corresponding feature spec under [`docs/modules/`](docs/modules/):

| # | Module                    | Spec                                                                       |
|---|---------------------------|----------------------------------------------------------------------------|
| 1 | Dashboard                 | [`docs/modules/dashboard.md`](docs/modules/dashboard.md)                   |
| 2 | Orden de Trabajo          | [`docs/modules/work-orders.md`](docs/modules/work-orders.md)               |
| 3 | Cotizaciones y Ventas     | [`docs/modules/sales-quoting.md`](docs/modules/sales-quoting.md)           |
| 4 | Pronóstico del Costo      | [`docs/modules/cost-forecasting.md`](docs/modules/cost-forecasting.md)     |
| 5 | Costo de Material         | [`docs/modules/material.md`](docs/modules/material.md)                     |
| 6 | Entregas de Material      | [`docs/modules/supplier-procurement.md`](docs/modules/supplier-procurement.md) |
| 7 | Horas de Mano de Obra     | [`docs/modules/labor.md`](docs/modules/labor.md)                           |
| 8 | Nómina / CFDI             | [`docs/modules/payroll-cfdi.md`](docs/modules/payroll-cfdi.md)             |
| 9 | Conciliación              | [`docs/modules/attendance-reconciliation.md`](docs/modules/attendance-reconciliation.md) · ops: [`docs/conciliacion-ops.md`](docs/conciliacion-ops.md) |
|10 | Costo de Mano de Obra     | [`docs/modules/labor.md`](docs/modules/labor.md)                           |

Cross-cutting exports (PDF / XLSX / XML): [`docs/modules/reporting-export.md`](docs/modules/reporting-export.md).

---

## Repository layout

```
.
├── README.md                     # ← you are here (vault front door)
├── .obsidian/                    # Obsidian vault config (graph, plugins, theme)
├── alenstec_app.html             # Mockup SPA — single source of UI truth
├── run.bat                       # Windows dev launcher
├── backend/                      # Node.js + Express + Sequelize + Postgres
│   ├── README.md                 # Setup, env vars, API surface
│   └── src/                      # server.js, models/, routes/, middleware/, db/
├── designs/                      # Architecture design docs & ADRs
│   ├── README.md                 # Design-doc index
│   └── 00-…07-…*.md
└── docs/                         # Product docs (this Obsidian vault's content)
    ├── project-summary.md
    ├── implementation-roadmap.md
    ├── implementation-audit.md
    ├── regression-requirements.md
    ├── backend-setup.md
    ├── conciliacion-ops.md
    ├── propuesta-comercial.md
    └── modules/
        ├── dashboard.md
        ├── work-orders.md
        ├── sales-quoting.md
        ├── cost-forecasting.md
        ├── material.md
        ├── supplier-procurement.md
        ├── labor.md
        ├── payroll-cfdi.md
        ├── attendance-reconciliation.md
        └── reporting-export.md
```

---

## Opening this vault in Obsidian

1. Install [Obsidian](https://obsidian.md/) (free).
2. **File → Open vault → Open folder as vault** and select this repo's root.
3. Use `Ctrl+O` (quick switcher) to jump between notes, `Ctrl+G` for the graph, and `Ctrl+Shift+F` for full-text search.

The `.obsidian/` folder only sets reasonable defaults (graph colouring by folder, core plugins enabled). No community plugins are used — the vault stays portable.
