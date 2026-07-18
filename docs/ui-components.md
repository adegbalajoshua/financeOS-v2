# UI Components

## Overview
FinanceOS V3 utilizes a premium, state-of-the-art SaaS aesthetic heavily inspired by Stripe, Linear, and modern fintech platforms. The UI completely avoids the "spreadsheet wrapper" feel of the previous version.

## Design Language
- **Colors**: Deep dark mode (`bg-zinc-950`), accented with vibrant, glowing functional colors (e.g., `emerald-500` for income, `indigo-600` for actions).
- **Typography**: Clean, sans-serif typography with strict hierarchy.
- **Glassmorphism**: Panels and cards use `backdrop-blur` and translucent borders (`border-zinc-800/50`) to create depth.
- **Micro-animations**: Hover states, active scaling, and entry animations (`animate-in fade-in slide-in-from-top-4`) make the application feel responsive and alive.

## Core Components

### `TimelineView`
The default home page. It presents `FinancialEvents` chronologically. It uses a dynamic center-aligned or side-aligned vertical line to connect events, visually representing the passage of time and the sequence of cash flow.

### `EventComposer`
A polymorphic form that expands inline or as a modal. It dynamically adjusts its fields based on whether the user is recording an `Expense`, `Income`, or `Transfer`.

### `EventCard`
The individual items in the Timeline. Displays amount, category, date, and source account in a highly scannable, visually pleasing card.
