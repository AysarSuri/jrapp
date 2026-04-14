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
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS. Components live in `client/src/components/ui/`. Base components have been globally standardized: Label (`text-base font-bold`), Input/SelectTrigger (`h-11 text-base font-semibold`), Textarea (`text-base font-semibold`), TableHead (`text-sm font-bold`), TableCell (`text-sm font-semibold`).
- **Forms**: `react-hook-form` with `zod` validation via `@hookform/resolvers`. Schemas are shared between client and server from `shared/schema.ts`.
- **Navigation**: Grid-based fullscreen overlay navigation (replaces traditional sidebar). Opened via hamburger menu in top header. Categories shown as icon cards in a responsive grid; clicking a category reveals its sub-items as cards. Permission filtering applied per-child (groups hidden if no permitted children). Back arrow for RTL-aware navigation. User info + logout in overlay header/footer.
- **Internationalization**: `i18next` + `react-i18next` with inline translation resources in `client/src/lib/i18n.ts`. Supports English, Arabic, Kurdish (CKB), and Turkish. RTL is supported.
- **Amount in Words**: `client/src/lib/number-to-words.ts` converts numeric amounts to words in Arabic, Kurdish, Turkish, and English. Used in all print receipt/payment vouchers (clearance statements, clearance receipts/payments, supplier payment/adjustment reports, expenses).
- **Charts**: `recharts` for dashboard visualizations
- **Theming**: CSS variables for light/dark mode, toggled via class on `<html>`. Custom fonts: Inter (Latin), Noto Naskh Arabic (Arabic/Kurdish RTL). Color palette: primary amber/gold (`hsl(35 92% 52%)`), dark navy sidebar (`hsl(222 47% 11%)`), cool gray background (`hsl(220 20% 97%)`). Sidebar uses white/opacity overlays for hover/active states.
- **Dashboard**: Real data-driven KPIs (sales, returns, receipts, customers) from API queries. Charts show last 7 days revenue and last 6 months sales. Locale-aware date/month labels.
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend (Express + Node.js)
- **Location**: `server/`
- **Framework**: Express.js running on Node.js with TypeScript (executed via `tsx`)
- **Entry point**: `server/index.ts` creates HTTP server, registers routes, serves static files in production or sets up Vite dev middleware in development
- **API pattern**: All API routes defined in `server/routes.ts`, with route metadata (paths, input schemas, response schemas) centralized in `shared/routes.ts`. This creates a typed API contract shared between frontend and backend.
- **Authentication**: Session-based auth using `express-session` with `connect-pg-simple` (sessions stored in PostgreSQL). Passwords hashed with `bcryptjs`. Session cookie lasts 24 hours. Users table tracks `lastLoginAt` and `lastLogoutAt` timestamps. Admin can force-logout users (deletes their sessions from DB) and change passwords (also invalidates sessions). Online status is derived from login/logout timestamps.
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
- User roles: `admin` (full access), `user` (configurable permissions), `sales_rep` (fixed limited permissions)
- **Permissions system**: 3-level granular permissions.
  - **Level 1 — Module access**: stored as `text[]` in `users.permissions`. Config in `client/src/lib/permissions.ts` (PERMISSION_MODULES).
  - **Level 2 — Form access**: Per-form within each module. Config in `MODULE_FORMS` mapping.
  - **Level 3 — Action access**: Per-action within each form: create, edit, editDays (days limit for editing old records, 0=unlimited), delete, viewHistory, print. Stored as `jsonb` in `users.detailedPermissions`.
  - Admin: all modules/forms/actions accessible (bypass all checks)
  - Sales Rep: fixed access to dashboard, sales_management, agent_management only
  - User (accountant): admin configures module + form + action permissions via expandable checkboxes in user management form
  - 19+ permission modules mapping to sidebar groups/pages
  - Sidebar items filtered by user permissions in `layout-shell.tsx`
  - Route protection in `App.tsx` ProtectedRoute shows "Access Denied" page for unauthorized routes
  - **Frontend hook**: `usePermissions()` in `client/src/hooks/use-permissions.ts` — provides canCreate, canEdit, canDelete, canPrint, canViewHistory, canEditRecord helpers
- Protected routes on frontend redirect to `/auth` if no session
- `/api/user` endpoint checks session and returns current user (including permissions)
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

### Supplier Orders
- **Tables**: `supplier_orders` + `supplier_order_items` (schema in `shared/schema.ts`)
- **API routes**: `/api/supplier-orders` (CRUD), `/api/supplier-orders/next-number`, `/api/supplier-orders/:id/items`
- **Frontend pages**: `supplier-order.tsx` (shared component), `supplier-order-usd.tsx` / `supplier-order-iqd.tsx` (wrappers)
- **Hooks**: `client/src/hooks/use-supplier-orders.ts`
- **Sidebar**: Under "Supplier Management" section
- **Permission key**: `supplier_management`
- **Purpose**: Standalone ordering (no financial impact, no stock changes, no debt tracking)
- **Features**: Auto-incrementing order number (SO-000001), product selection, barcode scanning, print support, inline edit, delete, order history with filters

### Company Book (كتاب الشركة)
- **Tables**: `company_books` + `book_types` (schema in `shared/schema.ts`)
- **API routes**: `/api/company-books` (CRUD), `/api/company-books/next-number`, `/api/book-types` (CRUD)
- **Frontend page**: `company-book.tsx`
- **Permission key**: `company_book`
- **Features**: Auto-incrementing book number, searchable "Writing Type" dropdown with inline add/delete, Word-document-style form, CRUD table, print/preview support
- **Form fields**: Book # (readonly auto), Writing Type (searchable dropdown), Date, To, Subject, Name (authorizedPerson), Person Name, Note

### Rep Statement Page (Tabbed)
The representative statement page (`client/src/pages/rep-statement.tsx`) has 5 horizontal tabs:
1. **Remaining Products** — Products remaining with the representative (uses `/api/representative-products/:id`)
2. **Sales by Rep** — Sales invoices filtered by rep name + date range (uses `/api/rep-sales/:id`)
3. **Returns by Rep** — Sales returns filtered by rep name + date range (uses `/api/rep-returns/:id`)
4. **Receipts by Rep** — Customer receipts + payments filtered by rep name + date range (uses `/api/rep-receipts/:id`)
5. **Product Loads** — Agent product loads with quantity/returned, filtered by rep name + date range (uses `/api/rep-loads/:id`)

Tab 1 works by rep name only. Tabs 2-5 filter by rep name AND from/to dates from the form.

### System Settings (Database-backed)
- **`system_settings`** table stores key-value pairs (e.g., `usd_to_iqd_rate`)
- API: `GET /api/system-settings/:key`, `PUT /api/system-settings/:key`
- **Exchange Rate**: `usd_to_iqd_rate` — daily USD-to-IQD rate, editable in General Settings page
- Used by `updateProductBuyPrices()` to auto-calculate cross-currency buy prices when saving purchase invoices
- Used by `populateCostPrices()` to determine cost price when selling in a different currency than the purchase currency
- `costPrice` field on `sales_invoice_items` and `sales_return_items` stores the buy price at time of sale (auto-populated server-side)

### Security & Fraud Protection
- **Rate Limiting**: `express-rate-limit` — 10 login attempts per 15 min, 200 API requests per minute
- **Security Headers**: `helmet` with CSP and COEP disabled for compatibility
- **Audit Logging**: All financial POST/PATCH/DELETE operations are logged to `audit_logs` table with user, action, entity, IP, risk level
- **Login Security**: Failed login attempts tracked in `login_attempts` table. Accounts locked after 5 failed attempts within 15 minutes. Login success/failure events logged to audit trail.
- **User Permission Changes**: Creating admin users or changing permissions logged as high-risk events
- **Audit Log Viewer**: Admin-only page at `/audit-logs` with stat cards, filterable table (action, risk level, flagged), and pagination
- **Tables**: `audit_logs` (id, userId, username, action, entity, entityId, details, ipAddress, riskLevel, flagged, createdAt), `login_attempts` (id, username, ipAddress, success, createdAt)
- **Dev-only endpoint**: `/api/login-by-role` blocked in production, logged as critical in development

### Backup & Restore
- **Backup**: `GET /api/backup` — Admin-only endpoint that exports all database tables as a downloadable JSON file
- **Restore**: `POST /api/restore` — Admin-only endpoint that replaces all current data with backup data (proper FK-aware delete/insert ordering)
- **Frontend page**: `/backup-restore` — Two-panel UI with download backup button and file upload + restore with confirmation dialog
- **Audit**: Both backup creation and restore operations are logged to the audit trail
- **Body size limit**: JSON body parser set to 50MB to handle large backups

### Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | No | Session encryption key (defaults to hardcoded fallback) |