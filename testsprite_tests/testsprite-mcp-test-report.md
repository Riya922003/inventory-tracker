
# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** my-app (Inventory Management SaaS)
- **Date:** 2026-06-27
- **Prepared by:** TestSprite AI Team
- **Test Run ID:** e23866a5-f080-42d0-aaff-d2536acc3e5c
- **Server Mode:** Production (Next.js 16.1.1)
- **Total Tests:** 10 | ✅ Passed: 1 | ❌ Failed: 9

---

## 2️⃣ Requirement Validation Summary

---

### Requirement: Authentication — Login
- **Description:** JWT-based login with email/password, session managed via httpOnly cookie.

#### Test TC001 — POST /api/auth/login with valid credentials
- **Test Code:** [TC001_postapiauthloginwithvalidcredentials.py](./TC001_postapiauthloginwithvalidcredentials.py)
- **Test Error:** `AssertionError: Response JSON does not contain 'token'`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/4c2958ee-64d8-45c3-8d66-e9a569b87940
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** The test expected a `token` field in the JSON response body, but the app uses **httpOnly cookie-based sessions** — no token is returned in the response body. The test strategy needs to be updated to authenticate via cookie extraction rather than a Bearer token. This is a test/implementation contract mismatch, not a bug in the application itself.

---

#### Test TC002 — POST /api/auth/login with invalid credentials
- **Test Code:** [TC002_postapiauthloginwithinvalidcredentials.py](./TC002_postapiauthloginwithinvalidcredentials.py)
- **Test Error:** `AssertionError: Expected status code 401, got 200`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/690f0eaa-221b-4e34-b8ca-b5d66242d0e6
- **Status:** ❌ Failed
- **Severity:** CRITICAL
- **Analysis / Findings:** Login with invalid credentials returned HTTP 200 instead of 401. This is a genuine bug — the `/api/auth/login` route may not be returning the correct status code on authentication failure. Investigate `app/api/auth/login/route.ts` to ensure it responds with `401` and a proper error body when credentials are invalid.

---

### Requirement: Company Onboarding
- **Description:** First-time setup creating company, admin user, warehouse, and product categories in a single transaction.

#### Test TC003 — POST /api/onboarding with valid data
- **Test Code:** [TC003_postapionboardingwithvaliddata.py](./TC003_postapionboardingwithvaliddata.py)
- **Test Error:** `AssertionError: Expected status code 200 but got 400`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/4d500404-0459-4b7b-8079-37bb96affce4
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** The onboarding endpoint rejected a seemingly valid payload with a 400. This could indicate a required field mismatch (e.g., the test omitted `name` alongside `adminPassword`) or the email already exists in the database from a prior test run. Check the exact validation schema in `app/api/onboarding/route.ts` and verify the test uses a unique email per run.

---

#### Test TC004 — POST /api/onboarding with missing fields
- **Test Code:** [TC004_postapionboardingwithmissingfields.py](./TC004_postapionboardingwithmissingfields.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/60303742-fdcb-4386-8d90-54f0c78608a9
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** The API correctly rejects an incomplete onboarding request with the expected error response. Validation logic for missing fields in `app/api/onboarding/route.ts` is working as expected.

---

### Requirement: User Invitation
- **Description:** Super-admin can invite team members via email; users accept via a token link.

#### Test TC005 — POST /api/users/invite by super_admin
- **Test Code:** [TC005_postapiusersinvitebysuperadmin.py](./TC005_postapiusersinvitebysuperadmin.py)
- **Test Error:** `AssertionError: Login response missing token`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/94f0d85a-b33d-4395-9bd5-524b20dba486
- **Status:** ❌ Failed
- **Severity:** MEDIUM
- **Analysis / Findings:** Cascading failure from TC001 — the test cannot authenticate because login does not return a Bearer token. Once the cookie-based auth approach is adopted, this test should be re-run. The invite logic itself is not directly validated yet.

---

#### Test TC006 — POST /api/users/invite by non-super_admin
- **Test Code:** [TC006_postapiusersinvitebynonsuperadmin.py](./TC006_postapiusersinvitebynonsuperadmin.py)
- **Test Error:** `AssertionError: Expected 403 Forbidden, got 401`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/d377990e-6a92-43e2-9676-b968326f1489
- **Status:** ❌ Failed
- **Severity:** MEDIUM
- **Analysis / Findings:** The API returned 401 (unauthenticated) instead of 403 (unauthorized). This is partly a cascading auth issue, but also highlights a semantic distinction: if a valid session exists but the user lacks the role, the response should be 403. If the request has no valid session, 401 is correct. Once cookie-based auth is working, verify that a logged-in warehouse_manager gets a proper 403 on this endpoint.

---

#### Test TC007 — POST /api/users/invite/accept with valid token
- **Test Code:** [TC007_postapiusersinviteacceptwithvalidtoken.py](./TC007_postapiusersinviteacceptwithvalidtoken.py)
- **Test Error:** `AssertionError: Invitation failed: {"error":"Unauthorized - Authentication required"}`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/3a8f5611-94c9-447b-b964-d5d715e4195b
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** The invite accept endpoint (`/api/users/invite/accept`) returned 401, suggesting the middleware is blocking this route. According to the code summary, this route should be **public** (no auth required). Verify `middleware.ts` has `/api/users/invite/accept` in the public routes whitelist.

---

#### Test TC008 — POST /api/users/invite/accept with invalid token
- **Test Code:** [TC008_postapiusersinviteacceptwithinvalidtoken.py](./TC008_postapiusersinviteacceptwithinvalidtoken.py)
- **Test Error:** `AssertionError: Expected error message containing 'Invalid token', got: {"error":"Token, name, and password are required"}`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/a7e366c4-9be7-48d6-b777-b3f0f6748b98
- **Status:** ❌ Failed
- **Severity:** LOW
- **Analysis / Findings:** The test sent a request with an invalid token but omitted required fields (`name`, `password`). The server correctly responded with a field validation error before checking the token. The test should be updated to include all required fields alongside the invalid token to properly test the token validation logic.

---

### Requirement: User Management
- **Description:** Super-admin can list all users in the company.

#### Test TC009 — GET /api/users with super_admin auth
- **Test Code:** [TC009_getapiuserswithsuperadmin.py](./TC009_getapiuserswithsuperadmin.py)
- **Test Error:** `AssertionError: Login response missing 'token'`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/9c67ae88-eebe-4e4f-862a-2ccf7e6b6636
- **Status:** ❌ Failed
- **Severity:** MEDIUM
- **Analysis / Findings:** Cascading failure from the cookie-based auth mismatch (same root cause as TC001, TC005). The user listing feature itself is unvalidated until auth is resolved.

---

### Requirement: Product & Stock Management
- **Description:** Create a product and simultaneously create an initial stock batch.

#### Test TC010 — POST /api/products/create-with-stock
- **Test Code:** [TC010_postapiproductscreatewithstock.py](./TC010_postapiproductscreatewithstock.py)
- **Test Error:** `AssertionError: Failed to get warehouses: {"error":"Unauthorized - Authentication required"}`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e23866a5-f080-42d0-aaff-d2536acc3e5c/6825e9c6-02c5-43ee-bb0c-a2aa0030c346
- **Status:** ❌ Failed
- **Severity:** MEDIUM
- **Analysis / Findings:** Cascading failure from auth — the test could not authenticate before calling `/api/warehouses`. The product-with-stock creation endpoint remains untested. Resolve auth strategy first.

---

## 3️⃣ Coverage & Matching Metrics

- **10% of tests passed** (1 of 10)

| Requirement              | Total Tests | ✅ Passed | ❌ Failed |
|--------------------------|-------------|-----------|-----------|
| Authentication — Login   | 2           | 0         | 2         |
| Company Onboarding       | 2           | 1         | 1         |
| User Invitation          | 4           | 0         | 4         |
| User Management          | 1           | 0         | 1         |
| Product & Stock Mgmt     | 1           | 0         | 1         |
| **Total**                | **10**      | **1**     | **9**     |

---

## 4️⃣ Key Gaps / Risks

### Root Cause #1 — Cookie-Based Auth vs. Bearer Token (Blocks 7 Tests)
The test suite assumes `/api/auth/login` returns a `token` field in the JSON body. The application uses **httpOnly cookie sessions** — no token is returned in the response. This single mismatch cascades into failures for TC001, TC005, TC007, TC009, TC010, and indirectly TC006.

**Fix:** Update the test framework to extract the `Set-Cookie` header from the login response and pass the session cookie in subsequent requests instead of using Bearer token headers.

---

### Root Cause #2 — Genuine Bug: Invalid Login Returns HTTP 200 (TC002)
`/api/auth/login` returns HTTP 200 on failed authentication instead of 401. This is a real application bug that could mislead clients into thinking login succeeded.

**Fix:** In `app/api/auth/login/route.ts`, ensure failed credential validation returns `return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })`.

---

### Root Cause #3 — Middleware Blocking Public Route (TC007)
`/api/users/invite/accept` returned 401, indicating the Next.js middleware may not have this path whitelisted as a public route.

**Fix:** Audit `middleware.ts` public routes list and confirm `/api/users/invite/accept` is included.

---

### Root Cause #4 — Onboarding Rejects Valid Payload (TC003)
The valid-data onboarding test received a 400. Likely causes: duplicate email from a prior test run, or a required field (`name`) missing from test payload.

**Fix:** Verify required fields in `app/api/onboarding/route.ts`, and use unique randomized emails in tests to avoid collisions.

---

### Untested Areas (No Coverage)
- Stock entry, exit, and transfer flows
- Warehouse CRUD
- Alerts and notifications
- Reports and analytics dashboard
- Password reset flow
- Image upload

> **Recommendation:** Fix the cookie-based auth strategy in the test suite first. This will unblock 7 of the 9 failing tests immediately and expose whether the underlying feature logic passes or has additional bugs.
