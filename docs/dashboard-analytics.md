# Dashboard & Analytics

## Overview
The Dashboard (`src/components/DashboardView.tsx`) serves as the analytical summary of FinanceOS V3. It emphasizes instantaneous load times (< 1 second) and beautiful, interactive charts.

## Performance via Snapshots
To maintain sub-second latency even with 50,000+ historical events, the dashboard relies heavily on the `SnapshotService` (`src/application/services/snapshotService.ts`). 
- Instead of the client or the Next.js API parsing the entire `Events` sheet on every page load, the system computes changes asynchronously.
- The resulting aggregated values (e.g., `NetWorthSnapshot`) are stored and fetched instantly.

## UI Elements
- **Recharts**: The application leverages `recharts` for dynamic SVGs. The `AreaChart` provides the sleek, fading-gradient effect under the Net Worth curve.
- **Micro-interactions**: Tooltips are deeply themed to match the dark glassmorphism of the application, avoiding native browser tooltip aesthetics.
- **Metric Cards**: The top-level summary features high-contrast typography, instantly drawing the user's eye to Net Worth, Monthly Income, and Expenses.
