# ERP System (Iraq-focused)

## Overview

This is a full-stack ERP (Enterprise Resource Planning) system built for businesses operating in Iraq. It manages products, clients (suppliers/customers), financial accounts, invoices, and transactions with dual-currency support (USD and IQD). The application features a React frontend with an Express backend, PostgreSQL database, and supports multilingual UI (English, Arabic, Kurdish/CKB) with RTL layout support.

Key business domains:
- **Product Management** — Barcode-based products with dual pricing (USD/IQD), big/small unit conversion (e.g., Box → Piece)
- **Client Management** — Suppliers and customers with balance tracking
- **Financial Accounts** — Bank, cash, and transfer office accounts in USD or IQD
- **Invoicing** — Sales and purchase invoices linked to clients
- **Transactions** — Deposits, withdrawals, and transfers between accounts
- **Agent Management** — Agent-client assignments, agent product loading, GPS location tracking (real-time via browser Geolocation API)
- **Dashboard** — Aggregated analytics with charts (recharts)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)
- **Location**: `client/src/`
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: `wouter` (lightweight client-side router)
- **State/Data Fetching**: `@tanstack/react-query` for server state management. Custom hooks in `client/src/hooks/` wrap API calls for each domain (products, clients, accounts, invoices, transactions, auth).
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS. Components live in `client/src/components/ui/`.
- **Forms**: `react-hook-form` with `zod` validation via `@hookform/resolvers`. Schemas are shared between client and server from `shared/schema.ts`.
- **Internationalization**: `i18next` + `react-i18next` with inline translation resources in `client/src/lib/i18n.ts`. Supports English, Arabic, Kurdish (CKB), and Turkish. RTL is supported.
- **Amount in Words**: `client/src/lib/number-to-words.ts` converts numeric amounts to words in Arabic, Kurdish, Turkish, and English. Used in all print receipt/payment vouchers (clearance statements, clearance receipts/payments, supplier payment/adjustment reports, expenses).
- **Charts**: `recharts` for dashboard visualizations
- **Theming**: CSS variables for light/dark mode, toggled via class on `<html>`. Custom fonts: Inter (Latin), Tajawal (Arabic).
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend (Express + Node.js)
- **Location**: `server/`
- **Framework**: Express.js running on Node.js with TypeScript (executed via `tsx`)
- **Entry point**: `server/index.ts` creates HTTP server, registers routes, serves static files in production or sets up Vite dev middleware in development
- **API pattern**: All API routes defined in `server/routes.ts`, with route metadata (paths, input schemas, response schemas) centralized in `shared/routes.ts`. This creates a typed API contract shared between frontend and backend.
- **Authentication**: Session-based auth using `express-session` with `connect-pg-simple` (sessions stored in PostgreSQL). Passwords hashed with `bcryptjs`. Session cookie lasts 24 hours.
- **Storage layer**: `server/storage.ts` defines an `IStorage` interface and `DatabaseStorage` class. All database operations go through this abstraction layer.

### Shared Code (`shared/`)
- **`shared/schema.ts`**: Drizzle ORM table definitions and Zod insert schemas (via `drizzle-zod`). This is the single source of truth for data types.
- **`shared/routes.ts`**: API route contracts with method, path, input schema, and response schemas. Used by both frontend hooks and backend route handlers.

### Database
- **Engine**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-orm/node-postgres` driver
- **Schema management**: `drizzle-kit push` for schema synchronization (no migration files needed for development)
- **Connection**: `pg.Pool` in `server/db.ts`
- **Tables**: `users`, `products`, `inventory`, `clients`, `accounts`, `invoices`, `transactions`, `external_debts`, `external_debt_transactions` (with `receipt_number` column), `expenses` (with `invoice_number` column)
- **Key design choices**: UUIDs for user IDs (via `gen_random_uuid()`), serial integers for other entities, `numeric` type for monetary values, text-based enums for roles/types/statuses

### Build System
- **Development**: `tsx server/index.ts` with Vite dev server middleware for HMR
- **Production build**: `script/build.ts` runs Vite build for client, then esbuild for server. Server dependencies in an allowlist are bundled to reduce cold start times.
- **Output**: `dist/public/` for client assets, `dist/index.cjs` for server

### Authentication & Authorization
- Session-based authentication (not JWT)
- User roles defined: `admin`, `accountant`, `purchasing`, `warehouse`, `sales_rep`
- Protected routes on frontend redirect to `/auth` if no session
- `/api/user` endpoint checks session and returns current user
- Session secret configurable via `SESSION_SECRET` environment variable

## External Dependencies

### Required Services
- **PostgreSQL Database**: Required. Connection via `DATABASE_URL` environment variable. Used for both application data and session storage.

### Key NPM Packages
| Package | Purpose |
|---------|---------|
| `drizzle-orm` + `drizzle-kit` | ORM and schema management for PostgreSQL |
| `express` + `express-session` | HTTP server and session management |
| `connect-pg-simple` | PostgreSQL session store |
| `bcryptjs` | Password hashing |
| `@tanstack/react-query` | Client-side server state management |
| `react-hook-form` + `zod` | Form handling and validation |
| `i18next` + `react-i18next` | Internationalization (EN, AR, CKB) |
| `recharts` | Dashboard charts |
| `wouter` | Client-side routing |
| `shadcn/ui` (Radix UI) | UI component library |
| `tailwindcss` | Utility-first CSS framework |

### Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | No | Session encryption key (defaults to hardcoded fallback) |