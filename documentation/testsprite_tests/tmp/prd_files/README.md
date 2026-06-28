# Insyd Tracker — Inventory & Warehouse Management System

A full-stack, multi-tenant inventory and warehouse management platform built with **Next.js 16**, **MongoDB**, and **TypeScript**. Designed for businesses that need to track stock across multiple warehouses, manage products, record movements, and receive automated low-stock alerts — all behind a role-based access control system.

<p align="center">
  <img src="./public/images/sys-dia.png" alt="System Architecture Diagram" width="700" />
</p>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Role-Based Access Control](#role-based-access-control)
- [API Reference](#api-reference)
- [Database Models](#database-models)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Screenshots](#screenshots)

---

## Features

- **Multi-warehouse support** — Create and manage multiple warehouse locations with unique codes, addresses, capacity, and assigned managers.
- **Product catalogue** — Add products with SKU, category, unit type (piece/kg/litre/box/metre), fragility flag, expiry date tracking, and Cloudinary image uploads.
- **Stock operations** — Record stock entry, stock exit, and inter-warehouse transfers with full audit trails via immutable `StockMovement` records.
- **Inventory dashboard** — Real-time overview of stock levels per warehouse with visual indicators.
- **Low-stock & aging alerts** — Automatic alerts when stock falls below the reorder level or products approach expiry. A cron job updates aging status daily.
- **Analytics & reports** — Business analytics and aging inventory reports filterable per warehouse.
- **Notifications** — In-app notification centre with mark-read and bulk-clear functionality.
- **User invitation flow** — Super admins invite users via email; invitees set their own password through a secure token link.
- **Forgot / Reset password** — Secure token-based password reset via email (Resend).
- **Onboarding wizard** — Guided company setup on first login.
- **Role-based access control (RBAC)** — `super_admin` and `warehouse_manager` roles with granular per-route and per-action enforcement at both middleware and API layers.
- **JWT authentication** — HTTP-only cookie sessions with Edge-compatible token verification in middleware via `jose`.
- **Vercel Analytics** — Built-in page-view analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | MongoDB via Mongoose 9 |
| Auth | JWT (`jsonwebtoken` + `jose` for Edge runtime) |
| Email | Resend + Nodemailer |
| Image Storage | Cloudinary |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI |
| Forms | React Hook Form + Zod |
| Notifications (toast) | Sonner |
| Analytics | Vercel Analytics |
| Icons | Lucide React, React Icons |
| Deployment | Vercel (recommended) |

---

## Project Structure

```
insyd-tracker/
├── app/
│   ├── api/                      # All API route handlers
│   │   ├── alerts/               # Alert CRUD
│   │   ├── analytics/            # Analytics data
│   │   ├── auth/                 # Login, signup, logout, forgot/reset password, me
│   │   ├── categories/           # Product categories
│   │   ├── cron/update-aging/    # Cron endpoint — updates aging status
│   │   ├── dashboard/            # Dashboard summary stats
│   │   ├── health/               # Health check
│   │   ├── notifications/        # Notifications CRUD
│   │   ├── onboarding/           # First-time company setup
│   │   ├── products/             # Product CRUD + create-with-stock
│   │   ├── reports/aging/        # Aging inventory report
│   │   ├── stock/                # Stock entry / exit / transfer
│   │   ├── upload/               # Cloudinary image upload
│   │   ├── users/                # User management & invite
│   │   └── warehouses/           # Warehouse CRUD
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── alerts/
│   │   ├── inventory/
│   │   ├── products/
│   │   ├── reports/
│   │   ├── stock/
│   │   ├── users/
│   │   └── warehouses/
│   ├── login/
│   ├── onboarding/
│   ├── forgot-password/
│   ├── reset-password/[token]/
│   └── invite/accept/
├── components/
│   ├── layout/SidebarLayout.tsx  # App shell with sidebar navigation
│   ├── onboarding/SetupWizard.tsx
│   └── ui/                       # shadcn/ui primitives
├── hooks/
│   └── useUpload.ts              # Cloudinary upload hook
├── lib/
│   ├── api-client.ts             # Typed fetch wrapper
│   ├── api-response.ts           # Standardised JSON response helpers
│   ├── auth.ts                   # JWT sign / verify (Node + Edge)
│   ├── cloudinary.ts             # Cloudinary SDK config
│   ├── db.ts                     # Mongoose connection helper
│   ├── email.ts                  # Resend / Nodemailer email helpers
│   ├── env-validation.ts         # Startup env var validation
│   ├── notifications.ts          # Notification creation helpers
│   ├── permissions.ts            # Per-resource permission helpers
│   ├── rbac.ts                   # Role & permission matrix
│   └── utils.ts                  # General utilities
├── models/
│   ├── Alert.ts
│   ├── AuditLog.ts
│   ├── Invitation.ts
│   ├── Notification.ts
│   ├── Product.ts
│   ├── ProductCategory.ts
│   ├── Stock.ts
│   ├── StockMovement.ts
│   ├── SystemConfig.ts
│   ├── User.ts
│   └── Warehouse.ts
├── scripts/                      # One-off DB migration / maintenance scripts
├── middleware.ts                 # Route protection + RBAC enforcement (Edge runtime)
├── .env.example                  # Environment variable template
└── next.config.ts
```

---

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or pnpm / yarn)
- **MongoDB** — a running MongoDB Atlas cluster or local instance
- **Cloudinary** account (free tier works) — for product image uploads
- **Resend** account (free tier works) — for transactional emails
- **Vercel account** (optional) — for deployment and analytics

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Riya922003/insyd-tracker.git
cd insyd-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all required values. See [Environment Variables](#environment-variables) below for details on each key.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. First-time setup

On first login you will be redirected to the **Onboarding Wizard** to set up your company name and create an initial warehouse. Once complete, you land on the main dashboard.

---

## Environment Variables

Copy `.env.example` to `.env` and populate every value before running the app. The app performs env validation on startup and will throw an error if required variables are missing.

```env
# ─── MongoDB ───────────────────────────────────────────────────────────────────
# Full connection string from MongoDB Atlas (or a local MongoDB instance).
# Example Atlas format: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# ─── JWT ───────────────────────────────────────────────────────────────────────
# Random secret — minimum 32 characters. Used to sign and verify auth tokens.
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Token expiry (e.g. 7d, 24h, 1h). Default is 7d.
JWT_EXPIRES_IN=7d

# ─── App URLs ──────────────────────────────────────────────────────────────────
# Base URL of the running app. No trailing slash.
# In production, set this to your actual domain, e.g. https://yourapp.vercel.app
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# ─── Email (Resend) ────────────────────────────────────────────────────────────
# API key from https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key

# Sender address — must be a verified domain in your Resend account.
# For development you can use onboarding@resend.dev (Resend's sandbox address).
EMAIL_FROM=noreply@yourdomain.com

# ─── Cron Job Secret ───────────────────────────────────────────────────────────
# Protects the POST /api/cron/update-aging endpoint from unauthorised calls.
# Your scheduler must send: Authorization: Bearer <CRON_SECRET>
# Generate with: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
CRON_SECRET=your-cron-secret-key

# ─── Node Environment ──────────────────────────────────────────────────────────
# Use "development" locally and "production" on Vercel.
NODE_ENV=development

# ─── Vercel Analytics ──────────────────────────────────────────────────────────
# Required only if you want to query Vercel Analytics data from the app.
# Get your personal access token: https://vercel.com/account/tokens
VERCEL_ACCESS_TOKEN=your-vercel-access-token

# Optional — only needed if you belong to a Vercel team account.
VERCEL_TEAM_ID=your-team-id

# Found under Vercel project settings → General → Project ID.
VERCEL_PROJECT_ID=your-project-id

# ─── Cloudinary ────────────────────────────────────────────────────────────────
# All three values are found in the Cloudinary Console dashboard:
# https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **Important:** Never commit your `.env` file. It is already listed in `.gitignore`. Only `.env.example` (which contains no real secrets) should be committed.

---

## Role-Based Access Control

RBAC is enforced at two layers: **Edge middleware** (route-level) and **API route handlers** (data-level).

### Roles

| Role | Description |
|---|---|
| `super_admin` | Full access to everything — users, all warehouses, products, reports, and system settings. |
| `warehouse_manager` | Access limited to their assigned warehouses; can manage stock, products, and alerts within those warehouses. |

### Permission Matrix

| Action | super_admin | warehouse_manager |
|---|:---:|:---:|
| Invite / manage users | ✅ | ❌ |
| Add / edit products | ✅ | ✅ |
| Delete products | ✅ | ❌ |
| Record stock in | ✅ | ✅ |
| Record stock out | ✅ | ✅ |
| Transfer stock | ✅ | ✅ |
| Create / delete warehouses | ✅ | ❌ |
| Edit warehouse details | ✅ | ✅ (assigned only) |
| View warehouses | ✅ (all) | ✅ (assigned only) |
| Acknowledge / dismiss alerts | ✅ | ✅ |
| Generate & export reports | ✅ | ✅ |
| View analytics | ✅ | ✅ |

Warehouse managers can only see and operate on warehouses they have been explicitly assigned to by a super_admin via the user management screen.

---

## API Reference

All routes live under `/api/`. Protected routes require a valid `auth-token` HTTP-only cookie (set automatically on login).

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Create the first `super_admin` account |
| `POST` | `/api/auth/login` | Public | Authenticate and set `auth-token` cookie |
| `POST` | `/api/auth/logout` | Any | Clear `auth-token` cookie |
| `GET` | `/api/auth/me` | Any | Return the currently authenticated user |
| `POST` | `/api/auth/forgot-password` | Public | Send a password-reset email |
| `POST` | `/api/auth/reset-password` | Public | Reset password using the token from email |

### Products

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/products` | Any | List all active products |
| `POST` | `/api/products` | Manager+ | Create a product |
| `POST` | `/api/products/create-with-stock` | Manager+ | Create a product and record opening stock in one request |
| `GET` | `/api/products/[id]` | Any | Get a single product |
| `PUT` | `/api/products/[id]` | Manager+ | Update product details |
| `DELETE` | `/api/products/[id]` | Super admin | Soft-delete a product |
| `GET` | `/api/products/[id]/details` | Any | Full product detail with per-warehouse stock breakdown |

### Stock

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/stock/entry` | Manager+ | Record stock arriving at a warehouse |
| `POST` | `/api/stock/exit` | Manager+ | Record stock leaving a warehouse |
| `POST` | `/api/stock/transfer` | Manager+ | Transfer stock between two warehouses |

### Warehouses

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/warehouses` | Any | List warehouses (managers see assigned only) |
| `POST` | `/api/warehouses` | Super admin | Create a warehouse |
| `GET` | `/api/warehouses/[id]` | Any | Get a single warehouse |
| `PUT` | `/api/warehouses/[id]` | Manager+ | Update warehouse details |
| `DELETE` | `/api/warehouses/[id]` | Super admin | Soft-delete a warehouse |

### Alerts & Notifications

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/alerts` | List active alerts |
| `PUT` | `/api/alerts/[id]` | Acknowledge or dismiss an alert |
| `GET` | `/api/notifications` | List notifications for current user |
| `PUT` | `/api/notifications/[id]` | Mark a notification as read |
| `POST` | `/api/notifications/mark-all-read` | Mark all notifications as read |

### Users

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/users` | Super admin | List all users in the company |
| `POST` | `/api/users/invite` | Super admin | Send an invitation email |
| `POST` | `/api/users/invite/accept` | Public | Accept an invitation and set a password |

### Other

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated stats for the dashboard overview |
| `GET` | `/api/analytics` | Analytics data |
| `GET` | `/api/reports/aging` | Aging inventory report |
| `GET` | `/api/categories` | Product categories list |
| `POST` | `/api/onboarding` | Initial company / tenant setup |
| `POST` | `/api/upload` | Upload a product image to Cloudinary |
| `POST` | `/api/cron/update-aging` | Update aging status (requires `Authorization: Bearer <CRON_SECRET>`) |
| `GET` | `/api/health` | Service health check |

---

## Database Models

| Model | Description |
|---|---|
| `User` | User accounts with role, assigned warehouses, preferences, invitation/reset tokens |
| `Warehouse` | Warehouse locations with address, capacity, and manager assignment |
| `Product` | Product catalogue — SKU, category, unit type, expiry/fragility flags |
| `ProductCategory` | Product categories scoped per company |
| `Stock` | Current stock levels per product per warehouse |
| `StockMovement` | Immutable audit log of every stock entry, exit, and transfer |
| `Alert` | Low-stock and expiry alerts with acknowledgement state |
| `Notification` | Per-user in-app notifications |
| `AuditLog` | System-wide audit trail for all mutating actions |
| `Invitation` | Pending user invitation records |
| `SystemConfig` | Company/tenant configuration created during onboarding |

---

## Scripts

One-off Node.js maintenance scripts in `scripts/`. Run after configuring `.env`:

```bash
node scripts/<filename>.js
```

| Script | Purpose |
|---|---|
| `cleanup-products.js` | Remove orphaned or soft-deleted product records |
| `fix-warehouse-codes.js` | Backfill / normalise warehouse codes to uppercase |
| `pre-production-migration.js` | Run required data migrations before a production deploy |
| `production-readiness-check.js` | Verify env vars, DB indexes, and system config before going live |

> **Always take a MongoDB Atlas snapshot before running any migration script in production.**

---

## Deployment

The app is optimised for **Vercel**.

### Deploy to Vercel

1. Push your code to GitHub.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Add all environment variables from `.env.example` under **Settings → Environment Variables** in your Vercel project.
4. Click **Deploy**. Vercel detects Next.js automatically.

### Setting up the aging cron job

The `POST /api/cron/update-aging` endpoint needs to be called daily to keep aging product status and expiry alerts current.

In your Vercel project go to **Settings → Cron Jobs** and add:

```
0 0 * * *   POST   /api/cron/update-aging
```

Include the `Authorization` header:

```
Authorization: Bearer <your-CRON_SECRET-value>
```

Alternatively, use any external scheduler (GitHub Actions, Upstash QStash, Railway cron) to POST to that endpoint with the header above.

### Production checklist

```bash
node scripts/production-readiness-check.js
```

Before going live, confirm:

- `NODE_ENV=production` is set on Vercel
- `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` point to your production domain (no trailing slash)
- `JWT_SECRET` is a strong random value — not the placeholder from `.env.example`
- MongoDB Atlas IP allowlist includes your Vercel deployment IPs (or use `0.0.0.0/0` for serverless)
- Resend sender domain is verified and matches `EMAIL_FROM`
- Cloudinary credentials are production credentials

---

## Screenshots

### System Architecture

<p align="center">
  <img src="./public/images/sys-dia.png" alt="System Architecture" width="700" />
</p>

### Stock Management

<p align="center">
  <img src="./public/images/stock-management.png" alt="Stock Management" width="700" />
</p>

### Warehouse Management

<p align="center">
  <img src="./public/images/warehouse-management.png" alt="Warehouse Management" width="700" />
</p>

---

## License

This project is private. All rights reserved.
