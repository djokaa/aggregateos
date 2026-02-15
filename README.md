# AggregateOS

**The Operating System for Aggregate Logistics** — from Salesforce replacement to "Uber for Aggregates."

AggregateOS is a unified platform for managing aggregate logistics operations: estimation, dispatch, driver tracking, ticket processing, invoicing, and financial reporting. Built for multi-entity operations managing $100M+ in annual aggregate spend.

---

## Architecture

```
aggregateos/
├── apps/
│   ├── web/                  # Next.js 16 web dashboard
│   └── mobile/               # React Native Expo driver app
├── packages/
│   ├── api/                  # tRPC v11 API routers & business logic
│   ├── db/                   # Drizzle ORM schema & migrations (PostgreSQL)
│   ├── shared/               # Types, constants, Zod validators
│   └── ui/                   # shadcn/ui component library
├── tooling/
│   └── scripts/              # Database seeds, migration scripts
├── turbo.json                # Turborepo config
└── package.json              # Workspace root
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 16 + React 19 + Tailwind CSS 4 |
| Component Library | shadcn/ui (Radix primitives) |
| API Layer | tRPC v11 (end-to-end type safety) |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Mobile | React Native + Expo SDK 52 |
| Auth | Clerk (multi-org, role-based) |
| Maps | Google Maps Platform |
| OCR | Google Document AI / AWS Textract |
| Invoicing | QuickBooks Online API |
| Notifications | Twilio (SMS) + Resend (email) |
| Hosting | Vercel (web) + AWS (services) |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database (or [Supabase](https://supabase.com) account)
- [Clerk](https://clerk.com) account (for auth)

### Setup

```bash
# Install all dependencies
npm install

# Copy environment variables
cp apps/web/.env.example apps/web/.env.local

# Edit .env.local with your actual keys:
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - CLERK_SECRET_KEY
# - DATABASE_URL
# - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

### Development

```bash
# Start all apps in dev mode
npm run dev

# Start only the web app
cd apps/web && npm run dev

# Start only the mobile app
cd apps/mobile && npm start
```

### Database

```bash
# Push schema to database
npm run db:push

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database browser)
npm run db:studio
```

---

## Project Structure

### Web App (`apps/web`)

The web dashboard serves dispatchers, managers, finance, and admin users.

**Pages:**
- `/` — Dashboard with KPI stats, charts (load volume, material distribution), recent loads, and activity feed
- `/customers` — Customer management (list, create, search, pagination)
- `/customers/[id]` — Customer detail/edit with tabbed interface
- `/locations` — Location management with tab filtering (quarries, job sites, plants, yards)
- `/locations/new` — Create location with Google Maps geocoding integration
- `/materials` — Material catalog with inline creation dialog
- `/rate-cards` — Pricing management with rate calculation
- `/estimates` — Quote management with status transitions
- `/estimates/new` — Estimation engine with auto-pricing, rate card lookup, and distance calculation
- `/estimates/[id]` — Estimate detail with line items, actions, and PDF download
- `/orders` — Order management with estimate-to-order conversion and load creation
- `/dispatch` — Dispatch board with drag-and-drop assignment + timeline/Gantt view
- `/loads` — Load management with status progression and driver assignment
- `/loads/[id]` — Load detail with ticket info, confidence scoring, and status timeline
- `/tickets` — Ticket review queue for OCR verification (auto-refresh)
- `/drivers` — Driver profiles, status management, and performance tracking
- `/invoices` — Invoice generation from billable loads with payment tracking
- `/reports` — Financial reporting (revenue, margins, AR aging, top customers, route profitability)
- `/settings` — Organization settings, notification preferences, integration configs
- `/settings/users` — User management with role-based access control
- `/settings/audit-log` — System activity audit trail
- `/settings/system` — System health monitoring and diagnostics
- `/api/estimates/[id]/pdf` — Printable estimate PDF generation

**Roles:**
- `platform_admin` — Full access across all entities
- `entity_gm` — General Manager for a single entity
- `dispatcher` — Load creation and driver assignment
- `driver` — (mobile app primarily)
- `customer` — View orders and invoices
- `finance` — Billing, invoicing, financial reports

### Mobile App (`apps/mobile`)

The driver-facing app built with React Native + Expo.

**Screens:**
- **My Loads** — Today/tomorrow load list with status badges, route info, distances, action buttons (Start/Continue/View Ticket)
- **Active Load** — Step-by-step delivery tracker with GPS map placeholder, vertical stepper (6 delivery steps), ETA card, call dispatch FAB
- **Ticket** — Full ticket capture flow: permission handling → camera viewfinder with alignment guide → preview with extracted data (weight, material, ticket #, date) → submission with progress → success confirmation
- **Profile** — Driver stats, earnings (weekly/monthly with mini bar chart), vehicle info with inspection/CDL dates, certifications, settings

### Database (`packages/db`)

PostgreSQL schema with 13 tables:

- `organizations` — Multi-entity support (Ryland, JV partners)
- `users` — Auth users with Clerk integration
- `customers` — Customer accounts with billing info
- `locations` — Quarries, job sites, plants, yards (with geocoding)
- `materials` — Rock, sand, fill, concrete types
- `rate_cards` — Material + route pricing
- `estimates` / `estimate_line_items` — Quote generation
- `orders` — Delivery orders
- `loads` / `tickets` — Individual deliveries with OCR ticket processing
- `drivers` / `vehicles` — Driver fleet management
- `invoices` / `invoice_line_items` — Billing

All entity-scoped tables include `entity_id` for multi-tenant isolation.

### API (`packages/api`)

tRPC routers providing type-safe API endpoints:

- `customer` — CRUD with search, pagination, soft delete
- `location` — CRUD with type filtering
- `material` — CRUD with entity scoping
- `rateCard` — CRUD + `findRate` for active rate lookup
- `estimate` — CRUD + status transitions + auto-numbering
- `dashboard` — Aggregate stats (customers, loads, revenue, drivers)
- `load` — List, detail, status progression, driver assignment, today stats
- `driver` — List, detail, status updates, available drivers query
- `order` — List, detail, create from estimate, create loads, status management
- `invoice` — List, detail, create from loads, status tracking, payment, stats
- `maps` — Google Maps geocoding and distance matrix calculation
- `ticket` — Upload with OCR, approve/reject review, auto-approval pipeline
- `notification` — Send estimates/invoices via email, driver alerts via SMS

### Shared (`packages/shared`)

- **Types**: `LoadStatus`, `UserRole`, `MaterialType`, `EstimateStatus`, etc.
- **Constants**: Status labels, colors, role permissions
- **Validators**: Zod schemas for all input types
- **Load State Machine**: Valid transitions, helper functions

### UI (`packages/ui`)

14+ shadcn/ui components: Button, Input, Label, Card, Badge, Select, Dialog, DropdownMenu, Table, Separator, Avatar, Tabs, Textarea, Tooltip, plus Recharts for data visualization.

---

## Load Lifecycle

Every delivery follows this state machine:

```
ORDERED → ASSIGNED → DISPATCHED → EN_ROUTE_PICKUP → AT_PICKUP →
LOADED → EN_ROUTE_DELIVERY → AT_DELIVERY → DELIVERED →
TICKET_UPLOADED → TICKET_VERIFIED → BILLABLE → INVOICED → PAID
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-----------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Prod | Clerk publishable key |
| `CLERK_SECRET_KEY` | Prod | Clerk secret key |
| `GOOGLE_MAPS_API_KEY` | No | Geocoding + Distance Matrix (server-side) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Google Maps (client-side) |
| `GOOGLE_DOCUMENT_AI_PROJECT_ID` | No | Document AI project for OCR |
| `GOOGLE_DOCUMENT_AI_PROCESSOR_ID` | No | Document AI processor ID |
| `RESEND_API_KEY` | No | Resend for transactional email |
| `TWILIO_ACCOUNT_SID` | No | Twilio for SMS notifications |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth |
| `TWILIO_PHONE_NUMBER` | No | Twilio sender number |
| `QBO_CLIENT_ID` | No | QuickBooks Online OAuth client |
| `QBO_CLIENT_SECRET` | No | QuickBooks Online OAuth secret |
| `NEXT_PUBLIC_APP_URL` | No | App URL (default: http://localhost:3000) |

All optional services degrade gracefully — features log to console in development.

---

## Phase Roadmap

### Phase 1 — Internal Backbone (Current)
Replace Salesforce + Excel with unified system for Ryland's operations.

- [x] Monorepo architecture with Turborepo
- [x] Multi-entity database schema (13 tables)
- [x] Authentication with Clerk (6 roles)
- [x] Web dashboard with sidebar navigation
- [x] Customer & Location management
- [x] Materials & Rate Card management
- [x] Estimation engine with auto-pricing
- [x] Dispatch board with drag-and-drop and timeline view
- [x] Driver management with status tracking
- [x] Invoice management with generate-from-loads workflow
- [x] Order management with estimate-to-order conversion
- [x] Ticket review queue with approve/reject workflow
- [x] Financial reporting (revenue, margins, AR aging, route profitability)
- [x] Estimate PDF generation
- [x] Google Maps geocoding integration (locations)
- [x] Google Maps Distance Matrix (estimation engine)
- [x] Driver mobile app (loads, active tracking, ticket camera, profile)
- [x] Admin tools (user management, audit log, system health)
- [x] Detail/edit pages (customers, estimates, loads)
- [x] OCR ticket processing pipeline (Document AI + regex extraction + confidence scoring)
- [x] QuickBooks Online integration (OAuth flow, invoice sync, customer sync)
- [x] Email notifications via Resend (estimate delivery, invoices, driver alerts)
- [x] SMS notifications via Twilio (load assignment, delivery confirmation)
- [x] Unified notification tRPC router
- [x] Runtime environment validation with Zod
- [x] Typed database context (removed `any` from tRPC)
- [x] Shared error handling utilities (notFoundOrThrow, validateTransition, safeCall)
- [ ] Connect to live PostgreSQL database (Supabase setup)
- [ ] Real-time GPS tracking (Supabase Realtime)
- [ ] Data migration from Salesforce

### Phase 2 — Multi-Entity Platform
- [ ] Entity onboarding wizard
- [ ] Cross-entity reporting
- [ ] Customer portal
- [ ] Advanced driver scoring
- [ ] Route optimization

### Phase 3 — Uber for Aggregates
- [ ] Customer self-service ordering
- [ ] Dynamic pricing engine
- [ ] Instant driver matching
- [ ] Real-time delivery tracking
- [ ] Stripe Connect marketplace payments
- [ ] Public API

---

## Immediate Next Steps

1. **Set up Supabase**: Create a project at [supabase.com](https://supabase.com), get the connection string, add to `.env.local`
2. **Set up Clerk**: Create an app at [clerk.com](https://clerk.com), enable Organizations, add keys to `.env.local`
3. **Push database schema**: Run `npm run db:push` to create all tables
4. **Seed the database**: Run `npm run db:seed` to populate with sample data
5. **Connect Google Maps**: Get API key, enable Distance Matrix + Geocoding + Places APIs
6. **Set up OCR pipeline**: Configure Google Document AI or AWS Textract for ticket reading
7. **Configure QuickBooks**: Set up QuickBooks Online OAuth flow for invoice sync
8. **Hire Senior Full-Stack Engineer**: Someone who has built multi-tenant SaaS from scratch
9. **Engage Product Designer**: Contract designer for brand identity and UX polish

---

## License

Proprietary — Ryland Logistics. All rights reserved.
