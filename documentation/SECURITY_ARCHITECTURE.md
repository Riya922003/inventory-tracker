# Security Architecture — Reactive Permission Layer

> **Status:** Proposed architectural shift  
> **Project:** Insyd Tracker — Inventory & Warehouse Management System  
> **Type:** Architecture Decision Record (ADR)

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Current Security Architecture](#2-current-security-architecture)
3. [The Problem](#3-the-problem)
4. [Why MongoDB Alone Cannot Solve This](#4-why-mongodb-alone-cannot-solve-this)
5. [Why We Need a Separate SQL Database](#5-why-we-need-a-separate-sql-database)
6. [The Proposed Solution](#6-the-proposed-solution)
7. [Mental Model](#7-mental-model)
8. [Architecture Deep Dive](#8-architecture-deep-dive)
9. [Edge Cases](#9-edge-cases)
10. [How Each Edge Case Is Solved](#10-how-each-edge-case-is-solved)
11. [Benefits of This Design](#11-benefits-of-this-design)

---

## 1. Application Overview

Insyd Tracker is a **multi-tenant inventory and warehouse management system** built with Next.js 16, MongoDB, and TypeScript. It is designed for businesses that manage stock across multiple physical warehouses.

### Core Features

| Feature | Description |
|---|---|
| **Multi-warehouse management** | Create and manage multiple warehouse locations with unique codes, addresses, capacity, and assigned managers |
| **Product catalogue** | Add products with SKU, category, unit type, fragility flag, expiry tracking, and image uploads via Cloudinary |
| **Stock entry** | Record stock arriving at a warehouse with batch tracking, photos, and full audit trail |
| **Stock exit** | Record stock leaving a warehouse with reason, photos, and movement history |
| **Inter-warehouse transfers** | Transfer stock between two warehouses with transport details and chain-of-custody tracking |
| **Inventory dashboard** | Real-time overview of stock levels per warehouse with visual indicators |
| **Aging & expiry alerts** | Automatic alerts when products approach expiry or exceed aging thresholds. A daily cron job updates aging status |
| **Low-stock alerts** | Automatic alerts when stock falls below the configured reorder level |
| **Analytics & reports** | Business analytics and aging inventory reports filterable per warehouse |
| **In-app notifications** | Notification centre with mark-read and bulk-clear functionality |
| **User invitation flow** | Super admins invite users via email. Invitees set their own password through a secure token link |
| **Forgot / Reset password** | Secure token-based password reset via email |
| **Onboarding wizard** | Guided company setup on first login |
| **Role-based access control** | `super_admin` and `warehouse_manager` roles with per-route and per-action enforcement |
| **JWT authentication** | HTTP-only cookie sessions with Edge-compatible token verification |

### Roles

| Role | Access |
|---|---|
| `super_admin` | Full access — all warehouses, all products, user management, reports, system settings |
| `warehouse_manager` | Scoped access — only warehouses explicitly assigned to them by a super_admin |

### MongoDB Collections

The application uses eleven MongoDB collections:

- `users` — accounts, roles, assigned warehouses, authentication tokens
- `warehouses` — warehouse locations, capacity, manager assignments
- `products` — product catalogue scoped per company
- `productcategories` — product categories scoped per company
- `stocks` — current stock levels per product per warehouse
- `stockmovements` — immutable audit log of every stock entry, exit, and transfer
- `alerts` — low-stock and expiry alerts with acknowledgement state
- `notifications` — per-user in-app notifications
- `systemconfigs` — company/tenant configuration
- `invitations` — pending user invitation records
- `auditlogs` — system-wide audit trail for all mutating actions

---

## 2. Current Security Architecture

The application currently enforces security at **two application layers**:

### Layer 1 — Edge Middleware (`middleware.ts`)

Every HTTP request passes through Next.js Edge Middleware before reaching any route handler. The middleware:

1. Reads the `auth-token` HTTP-only JWT cookie
2. Verifies the token using `jose` (Edge Runtime compatible)
3. Checks the user's role against a permission matrix
4. Injects user context into request headers (`x-user-id`, `x-user-role`, `x-company-id`)
5. Returns `401` for unauthenticated requests and `403` for insufficient permissions

### Layer 2 — API Route Handlers

Individual route handlers apply data-level checks:

- All queries are scoped to `companyId` — no user can ever read another company's data
- Ownership checks validate the requesting user owns or has access to the specific resource
- Role-specific operations (e.g., inviting users) perform explicit role checks before proceeding

### What the Stack Looks Like Today

```
Request
  │
  ▼
Edge Middleware
  ├── Is the JWT valid?
  ├── Does this role have access to this route?
  └── Inject user context headers
  │
  ▼
API Route Handler
  ├── Extract user from headers
  ├── Scope query: { companyId: user.companyId }
  ├── (sometimes) Check resource ownership
  └── Query MongoDB
  │
  ▼
MongoDB
  └── Returns whatever it is asked — no opinion of its own
```

---

## 3. The Problem

### MongoDB Has No Database-Level Security

MongoDB will return any document to any query that reaches it. There is no built-in mechanism to say "user X can only read documents where `companyId = X`" at the database engine level. Every security guarantee the application has today depends entirely on application code being correct — 100% of the time, on every route, for every developer, forever.

### The Warehouse Assignment Gap

The `User` document stores an `assignedWarehouses` array — the list of warehouse IDs a warehouse_manager is permitted to access. However, the stock entry, stock exit, and transfer API routes only verify that the target warehouse belongs to the current user's company. They do not verify that the warehouse is in the manager's `assignedWarehouses` list.

This means a warehouse_manager can record stock operations in **any warehouse belonging to their company**, not just the ones they are assigned to.

### The Core Risk

| Scenario | Risk |
|---|---|
| A developer adds a new API route and forgets the `companyId` filter | Cross-tenant data leak |
| A new stock operation route is added without the `assignedWarehouses` check | A manager accesses warehouses outside their scope |
| A bug in the authorization logic | No database-level backstop catches it |
| JWT is compromised | Attacker has full access to all data the user can reach |

Security relies entirely on the application layer never making a mistake. That is not a structural guarantee — it is a convention.

---

## 4. Why MongoDB Alone Cannot Solve This

When this problem is raised, the first instinct is to fix it within MongoDB. Here is why that does not work cleanly.

### MongoDB Has No Row-Level Security

PostgreSQL has a native `ENABLE ROW LEVEL SECURITY` command that makes the database engine itself enforce access policies. MongoDB has no equivalent. The engine does not evaluate "is this user allowed to read this document?" — it just returns documents.

### MongoDB Atlas Rules Engine — The Closest Option

MongoDB Atlas has an **App Services Rules** feature that does enforce document-level access control at the platform layer. Rules like "a user can read a stock document only if `document.companyId` matches their company" are evaluated by Atlas before data is returned.

However, adopting Atlas App Services requires routing queries through the Atlas Data API or Atlas Device SDK instead of a direct Mongoose `mongodb+srv://` connection. This is a significant architectural change to the application — not a small fix.

### Application-Level Enforcement — Correct But Fragile

You can build a Mongoose query plugin that automatically injects `companyId` and `warehouseId` filters into every query. This is useful. But it is still application-layer enforcement — it lives in your codebase, it can have bugs, and it requires careful handling of the user context across every query call.

### The Fundamental Gap

MongoDB is an excellent document store. It is not designed to be a policy enforcement point. Asking it to also manage fine-grained access control is asking it to do something outside its design intent.

---

## 5. Why We Need a Separate SQL Database

### What SQL Gives You That MongoDB Does Not

PostgreSQL is a relational database with:

- **Native Row Level Security** — policies enforced by the database engine, not application code
- **ACID transactions** — permission changes are atomic. Adding and removing warehouse assignments either both succeed or both fail
- **Referential integrity** — foreign keys prevent orphaned permission rows
- **Relational joins** — "what warehouses can this user access given their role and company?" is a single SQL query
- **Triggers** — automatic audit logging of every permission change

### The Specific Role of SQL in This Architecture

SQL does **not** store application data. It does not store products, stock, movements, or alerts. It stores only one thing: **the permission graph** — who is allowed to access what.

This is a small, focused dataset:

| Table | What it stores |
|---|---|
| `companies` | Company reference (mirrors `systemconfigs`) |
| `user_permissions` | One row per user — their role, company, and active status |
| `warehouse_assignments` | One row per user-warehouse pairing |
| `warehouses` | Warehouse reference for foreign key integrity |
| `sync_cursor` | The MongoDB Change Stream resume token for the Sync Service |

### Why Not Just Fix the Application Code?

Fixing individual routes addresses the symptoms. Adding a SQL permission store addresses the structure. The difference:

- **Application fix**: Every future developer must remember to add the right checks on every new route
- **SQL permission store**: Permission scope is resolved once at request time from SQL. MongoDB queries are always scoped by the SQL result. A developer cannot forget — the check is not in their hands

---

## 6. The Proposed Solution

### The Architecture in One Sentence

> MongoDB is the single source of truth for all data including permissions. PostgreSQL is a permission read-model automatically derived from MongoDB via Change Streams, consulted at request time to scope all MongoDB queries.

### The Three Laws

These three principles define the entire architecture. If any of them are violated, the system breaks down.

**Law 1 — One Writer**
The application writes to MongoDB only. PostgreSQL is never written to by API handlers. If you find yourself writing to SQL in a route handler, the architecture is broken.

**Law 2 — Permissions Are Derived, Not Stored Independently**
PostgreSQL does not have an independent opinion about permissions. It reflects MongoDB's current state. MongoDB is the source of truth. PostgreSQL is a materialised view of the permission-relevant parts of that truth.

**Law 3 — Changes Propagate Automatically**
You never manually sync. When something permission-relevant changes in MongoDB, the Change Stream ensures PostgreSQL reflects it automatically. Propagation is not the application's responsibility.

### The Two Data Flows

Every operation belongs to one of two flows:

**Write Flow**

```
API Handler
    │
    │  writes here only
    ▼
MongoDB (source of truth)
    │
    │  oplog emits event automatically
    ▼
MongoDB Change Streams
    │
    │  Sync Service reads and processes event
    ▼
PostgreSQL (permission read-model updated)
```

**Read Flow**

```
Incoming Request
    │
    ▼
PostgreSQL
  "What is this user allowed to access?"
  Returns: { role, companyId, warehouseIds: [A, B] }
    │
    ▼
MongoDB
  Query scoped to resolved permission
  Returns: permitted data only
    │
    ▼
Response
```

---

## 7. Mental Model

### The Library Card Catalogue

This analogy makes the architecture immediately understandable.

**MongoDB is the library.** Every book — products, stock, warehouses, users, movements — lives here. The library is vast and this is where all the real work happens.

**PostgreSQL is the card catalogue.** It does not contain any books. It only contains one piece of information — which books each person is allowed to read. It is small, fast to query, and optimised for exactly one question: *what are you allowed to access?*

**Change Streams is the librarian.** Whenever a book is added, moved, or restricted in the library, the librarian automatically updates the card catalogue. You never update the catalogue manually. The librarian watches the library and keeps the catalogue current.

**Your application is the reader.** When you walk in, you do not wander the entire library. You first consult the card catalogue — *here are the shelves you are allowed on* — then you go directly to those shelves in MongoDB.

### The Key Insight

The catalogue does not decide what exists. It only reflects what the library already knows about who can access what. If a shelf is removed from the library, the librarian automatically removes it from the catalogue. The catalogue is never independently authoritative — it is always derived from the library.

### The One Mental Test

Whenever you make a code decision in this architecture, ask yourself one question:

> **"Am I writing permission data to PostgreSQL from application code?"**

If yes — stop. That write belongs in MongoDB. PostgreSQL updates itself.

---

## 8. Architecture Deep Dive

### Component 1 — PostgreSQL Schema

Five tables. Minimal columns. SQL stays thin.

```
companies
  └── company_id (PK, MongoDB ObjectId as string)
      company_name
      is_active

user_permissions
  └── user_id (PK, MongoDB ObjectId as string)
      company_id (FK → companies)
      role (super_admin | warehouse_manager)
      is_active

warehouse_assignments
  └── user_id (FK → user_permissions)
      warehouse_id (FK → warehouses)
      company_id (FK → companies)
      PRIMARY KEY (user_id, warehouse_id)

warehouses
  └── warehouse_id (PK, MongoDB ObjectId as string)
      company_id (FK → companies)
      is_active

sync_cursor
  └── id (single row, always 1)
      resume_token (text — the MongoDB Change Stream position)
      last_processed_at (timestamp)
```

### Component 2 — The Sync Service

A **standalone long-running Node.js process** — not a Next.js API route, not a cron job. It runs alongside the application as a separate process.

**Startup sequence:**
1. Connect to MongoDB
2. Connect to PostgreSQL
3. Read resume token from `sync_cursor` table
4. Open Change Stream from that token (or from current time on first run)
5. Begin processing events

**Collections watched:** Only permission-relevant ones.

| Collection | Events that matter |
|---|---|
| `users` | Insert, role update, `assignedWarehouses` update, `isActive` update, delete |
| `warehouses` | Insert, `isActive` update to false, delete |
| `systemconfigs` | Insert, delete |

**Collections not watched:** `stocks`, `stockmovements`, `alerts`, `notifications`, `products`, `productcategories`, `invitations`, `auditlogs` — none of these affect who can access what.

**Event mapping:**

| MongoDB Event | PostgreSQL Action |
|---|---|
| `users` insert | Insert `user_permissions` row + insert `warehouse_assignments` rows for each assigned warehouse |
| `users` update — role changed | Update `role` in `user_permissions` |
| `users` update — `assignedWarehouses` changed | Diff old vs new → delete removed rows from `warehouse_assignments` → insert new rows |
| `users` update — `isActive` changed | Update `is_active` in `user_permissions` |
| `users` delete | Delete `user_permissions` row + all `warehouse_assignments` rows for that user |
| `warehouses` insert | Insert `warehouses` row |
| `warehouses` update — `isActive` false | Update `warehouses` row + delete all `warehouse_assignments` for that warehouse |
| `warehouses` delete | Delete `warehouses` row + all `warehouse_assignments` pointing to it |
| `systemconfigs` insert | Insert `companies` row |
| `systemconfigs` delete | Delete `companies` row (cascade deletes the rest) |

**After every event:** Update the `sync_cursor` table with the new resume token in the same PostgreSQL transaction as the permission change. If the transaction rolls back, the resume token rolls back too — guaranteeing the event is reprocessed on retry.

**Error handling:** If an event fails, retry with exponential backoff up to five attempts. After five failures, write the event to a `dead_letter` table and continue — one bad event must not block the entire stream.

### Component 3 — Bootstrap Migration

A one-time script run when the architecture is first deployed.

**Sequence (order matters):**
1. Open the Change Stream and note the current resume token — call it `T`
2. Read all `systemconfigs` → insert into `companies`
3. Read all `warehouses` → insert into `warehouses`
4. Read all `users` → insert into `user_permissions` and `warehouse_assignments`
5. Write token `T` to `sync_cursor`
6. Start the Sync Service

By capturing `T` before the migration runs, any writes that happen during the migration are caught by the Sync Service afterwards. Since all SQL operations use upserts, processing the same document twice produces the same result.

### Component 4 — Request-Time Permission Check

Replaces the current application-level authorization checks.

```
Step 1: Read userId from JWT
Step 2: Query user_permissions WHERE user_id = ?
        → get role, is_active, company_id
Step 3: If is_active = false → reject 401
Step 4: If role = super_admin
        → scope = { companyId }
Step 5: If role = warehouse_manager
        → Query warehouse_assignments WHERE user_id = ?
        → scope = { companyId, warehouseIds: [A, B, ...] }
Step 6: Pass scope to MongoDB query
        → { companyId: X, warehouseId: { $in: [A, B] } }
```

Both SQL queries are indexed single-row lookups — sub-millisecond. No Redis caching needed at this scale.

---

## 9. Edge Cases

This architecture is cleaner than dual-write approaches but it is not without its own failure modes. Every one of these is known and has a defined response.

### Edge Case 1 — Oplog Rollover

**What it is:** MongoDB's oplog is a fixed-size circular buffer. If the Sync Service is down for an extended period and MongoDB is under heavy write load, the oplog can roll past the saved resume token. On restart the Sync Service cannot resume from that position.

**Severity:** High. Requires manual intervention.

### Edge Case 2 — Sync Service Is New Critical Infrastructure

**What it is:** The Sync Service is a new long-running process. If it goes down, PostgreSQL stops updating. Permissions become increasingly stale. Nothing surfaces as an error unless you have monitoring in place.

**Severity:** Medium. Bounded by monitoring response time.

### Edge Case 3 — Bootstrap Coordination

**What it is:** Getting the one-time migration and the Change Stream startup precisely coordinated so no events are missed and no events are double-processed.

**Severity:** Medium. One-time risk, not ongoing.

### Edge Case 4 — Resume Token Storage Race

**What it is:** The Sync Service processes an event, updates PostgreSQL, then saves the resume token. If it crashes between the update and the token save, it reprocesses the same event on restart.

**Severity:** Medium. Mitigated by idempotent SQL operations.

### Edge Case 5 — Cross-Collection Event Ordering

**What it is:** Events from different collections (e.g., `warehouses` and `users`) may arrive in an order that creates a dependency — a `warehouse_assignments` insert for a warehouse that has not yet appeared as a `warehouses` insert.

**Severity:** Medium. Mitigated by retry logic.

### Edge Case 6 — Idempotency Required Everywhere

**What it is:** Because of the resume token race, the Sync Service can and will process the same event more than once. Every PostgreSQL operation must be a no-op when applied a second time.

**Severity:** Medium. A discipline requirement, not a one-time fix.

### Edge Case 7 — Schema Coupling

**What it is:** The Sync Service is tightly coupled to MongoDB document field names. If `assignedWarehouses` is renamed in the MongoDB schema, the Sync Service silently stops updating PostgreSQL correctly — no error thrown.

**Severity:** Low. A development process concern.

### Edge Case 8 — PostgreSQL Downtime

**What it is:** While PostgreSQL is unavailable, the Sync Service cannot write. Incoming events must be buffered or replayed on recovery.

**Severity:** Medium. Requires defined behaviour for the Sync Service during SQL unavailability.

### Edge Case 9 — Millisecond Consistency Window

**What it is:** In normal operation there is a small latency between MongoDB writing a change and PostgreSQL reflecting it — the time for the Change Stream event to travel through the Sync Service.

**Severity:** Low. Milliseconds, not seconds. Acceptable for this use case.

### Edge Case 10 — Warehouse Deletion During Active Session

**What it is:** A manager's browser has already loaded the warehouse list. The warehouse is deleted. SQL is updated within milliseconds. But the manager's UI still shows the warehouse until they refresh.

**Severity:** Low. UI concern, not a security concern. Returns 404 if the manager tries to act on the deleted warehouse.

---

## 10. How Each Edge Case Is Solved

### Oplog Rollover — Full Resync Procedure

Monitor the age of the resume token. If the Sync Service detects an invalid resume token on startup (MongoDB throws a specific `ChangeStreamHistoryLost` error), it:

1. Logs a critical alert
2. Truncates all PostgreSQL permission tables
3. Re-runs the bootstrap migration against current MongoDB state
4. Starts the Change Stream from the new current position

This is a known recovery path — not a surprise failure. Document it as a runbook and ensure on-call engineers know the procedure.

**Prevention:** Keep the Sync Service highly available (PM2 auto-restart, health checks, alerting on process death). The longer it stays up, the less likely the oplog rolls past it.

### Sync Service Availability

Run the Sync Service with a process manager (PM2 in production) configured for automatic restart. Add health-check monitoring with an alert if the process has been down for more than five minutes. The PostgreSQL `sync_cursor.last_processed_at` column is a natural health indicator — alert if it has not been updated in the last two minutes under normal load.

### Bootstrap Coordination

The sequence defined in Component 3 above — capture the resume token before migration, use upserts throughout — handles this correctly. The migration script should be idempotent: running it twice produces the same result as running it once.

### Resume Token Storage Race

Solved structurally: the resume token is written in the **same PostgreSQL transaction** as the permission update. Either both commit or both roll back. There is no window between "permission updated" and "token saved." Combined with idempotent SQL operations (upserts and existence-checked deletes), double-processing is harmless.

### Cross-Collection Event Ordering

The retry logic with exponential backoff handles this. A `warehouse_assignments` insert that fails because the `warehouses` row does not exist yet will be retried. By the time it is retried, the `warehouses` insert event will have been processed. The dependency resolves within milliseconds.

### Idempotency

All SQL inserts use `INSERT ... ON CONFLICT DO UPDATE` (PostgreSQL upsert syntax). All deletes check for existence before acting. The `warehouse_assignments` table uses a composite primary key `(user_id, warehouse_id)` — inserting the same pair twice is a no-op after the first insert.

### Schema Coupling

Create a contract between the application schema and the Sync Service. Whenever a MongoDB model field that affects permissions is renamed or restructured, updating the Sync Service event mapping is a required step in the same pull request. This is enforced through code review, not tooling.

Long-term: TypeScript interfaces shared between the application and the Sync Service can make this detectable at compile time.

### PostgreSQL Downtime

The Sync Service holds events in a bounded in-memory buffer during PostgreSQL unavailability and retries writes with backoff. If the Sync Service is restarted during SQL downtime, the resume token in `sync_cursor` (last successfully written position) allows it to replay from that point. The window of potential inconsistency is bounded by the last successfully processed event.

### Millisecond Consistency Window

The safety property of this architecture ensures this window is never a security breach:

| MongoDB state | PostgreSQL state | Result |
|---|---|---|
| Resource deleted | PostgreSQL not yet updated (stale "yes") | PostgreSQL says allowed → MongoDB returns not-found → app returns 404 — **safe** |
| Resource exists | PostgreSQL already updated (permission removed) | PostgreSQL says denied → request rejected — **safe, more restrictive** |

A stale "yes" in PostgreSQL combined with a missing document in MongoDB is a correctness issue (404 instead of 200), not a security issue. The dangerous case — PostgreSQL "yes" plus MongoDB still has the document — only occurs if the MongoDB deletion itself has not happened yet, which is within the application's control.

### Warehouse Deletion During Active Session

The frontend handles this gracefully with a standard 404 response. When the manager attempts to load a warehouse that has been deleted, the API returns 404. The UI displays an appropriate message and redirects to the warehouse list. This is standard handling for any deleted resource and requires no special architecture.

---

## 11. Benefits of This Design

### Structural Security Guarantee

The warehouse assignment check is no longer a convention that developers must remember. It is resolved structurally — from PostgreSQL — before every MongoDB query. A developer writing a new stock route cannot accidentally bypass it because the permission scope comes from SQL, not from the request.

### Single Write Point Eliminates Dual-Write Complexity

The application never coordinates two databases. It writes to MongoDB. PostgreSQL updates itself. There is no dual-write problem, no split-brain risk from the application's perspective, and no compensating transaction logic to maintain.

### PostgreSQL Is Rebuildable

Because PostgreSQL is a derived view, it can be reconstructed from scratch at any time by replaying MongoDB's oplog. If PostgreSQL is corrupted, loses data, or needs a schema migration — truncate it and rebuild. The source of truth is always MongoDB.

### Defense in Depth

Even if a bug exists in application code that forgets to apply the `companyId` filter, the permission scope resolved from SQL provides a second enforcement layer. Both checks must fail for a data leak to occur.

### Clean Separation of Concerns

MongoDB does what it is best at: storing and querying rich, nested documents at scale. PostgreSQL does what it is best at: enforcing relational integrity and answering simple, fast permission queries. Neither is asked to do the other's job.

### Audit-Ready Permission Changes

Because PostgreSQL has native trigger support, every change to the permission graph — role changes, warehouse assignments, user deactivation — can be automatically logged to a PostgreSQL audit table with timestamp, old value, and new value. This is richer than the current `AuditLog` MongoDB collection because it is enforced by the database engine, not application code.

### No New External Infrastructure

MongoDB Change Streams are built into MongoDB Atlas — already running, already paid for. The Sync Service is a lightweight Node.js process in the same repository. There is no new external system to operate beyond PostgreSQL itself.

### Scales Correctly

If the application grows to hundreds of concurrent users, the permission check at request time is two indexed PostgreSQL lookups — both sub-millisecond. The Sync Service processes Change Stream events at near-real-time latency. Neither component becomes a bottleneck at the scale this application is likely to reach.

---

## Appendix — What This Is Not

### This Is Not Kafka

MongoDB Change Streams serve the same event-delivery purpose as Kafka for this use case — ordered, durable, resumable event streaming — but without a separate cluster to operate. The trade-off is that Change Streams do not have Kafka's horizontal consumer scaling model. At this application's scale, that trade-off is correct.

### This Is Not an Outbox Pattern

The Sync Service subscribes to the MongoDB oplog directly via Change Streams. The application does not write outbox records. There is no cron job polling an outbox table. The propagation is reactive, not scheduled.

### This Is Not Eventual Consistency as a Compromise

The millisecond propagation window is not a design compromise — it is an architectural property. The system is designed so that being milliseconds behind never creates a security gap, only a potential 404 response. This is intentional.

---

*Last updated: June 2026*  
*Author: Architecture discussion — Insyd Tracker team*
