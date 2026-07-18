# 📚 FinanceOS Documentation Index

Welcome to the official documentation directory for **FinanceOS**. 

## ⭐ Master Reference Guide
If you are new to the project or looking for the complete, unified architectural and user reference manual, start here:
👉 **[DOCUMENTATION_MASTER_GUIDE.md](./DOCUMENTATION_MASTER_GUIDE.md)** — Comprehensive coverage of the Local-First IndexedDB engine, Base Unit (`Kobo`) accounting, Recharts Donut & Pie chart specifications, Google Sheets & Supabase dual cloud sync, and legacy spreadsheet migration workflows.

---

## 📖 Specialized Deep-Dive Guides

| Guide | Description |
|---|---|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | High-level system design and Next.js 15 App Router structure. |
| **[domain-model.md](./domain-model.md)** | Double-entry accounting rules, event payloads (`EXPENSE_RECORDED`, etc.), and Zod schemas. |
| **[finance-engine.md](./finance-engine.md)** | Mathematical formulas, reconciliation sequence (`reconcileAllState`), and Net Worth calculation rules. |
| **[infrastructure.md](./infrastructure.md)** | IndexedDB client (`financeos_local_db`), Google Sheets REST API client, and Supabase client. |
| **[migration-guide.md](./migration-guide.md)** | Step-by-step instructions for importing legacy V1 spreadsheets (`Daily Log` tab) into V3. |
| **[API.md](./API.md)** | Next.js API Route definitions (`/api/events/sync`, `/api/migration/sheet-to-supabase`). |
| **[INSTALLATION.md](./INSTALLATION.md)** | Local dev environment setup, prerequisite checks, and `.env.local` configuration. |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Production deployment instructions for Vercel, Docker, and Supabase hosting. |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Common local database reset steps, OAuth token refresh errors, and mobile LAN access setup. |
| **[FAQ.md](./FAQ.md)** | Frequently asked questions regarding data privacy, cloud sync triggers, and offline operation. |

---

## 🗄️ SQL & Schema Assets
- **`supabase_schema.sql`**: Full PostgreSQL DDL script to initialize your private Supabase database tables (`accounts`, `budget_cycles`, `financial_events`, `net_worth_snapshots`).