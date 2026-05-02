# Arogya Registration and Authentication Flow

This document explains the exact flow for user registration and authentication across the Arogya microservices, covering patient, doctor, and admin roles.

It includes:

- Endpoints involved
- Which microservices communicate
- How requests are routed and transformed
- Exact code references (file and line)

---

## 1. Microservices Involved

### Primary services

- API Gateway (entry point for frontend and external clients)
- Auth Service (user accounts, JWT, refresh tokens, roles)
- Patient Service (patient domain/profile data)
- Doctor Service (doctor domain/profile data and verification)

### Supporting client

- Web frontend (initiates register/login and role-specific follow-up calls)

---

## 2. Identity and Trust Model

### Source of truth for identity

- Auth service stores user credentials and role.
- Roles are defined as `patient`, `doctor`, `admin`.

Code references:

- `apps/auth-service/src/types/auth.types.ts:4`
- `apps/auth-service/src/types/auth.types.ts:5`
- `apps/auth-service/src/types/auth.types.ts:6`
- `apps/auth-service/src/types/auth.types.ts:7`

### Gateway is the trust boundary

- Gateway verifies JWT.
- Gateway injects trusted identity headers for downstream services:
  - `x-user-id`
  - `x-user-email`
  - `x-user-role`
- Gateway strips incoming spoofed user headers before that.

Code references:

- Strip spoofed headers: `apps/api-gateway/src/routes/index.ts:11`
- JWT verification: `apps/api-gateway/src/middleware/auth.middleware.ts:29`
- Inject `x-user-id`: `apps/api-gateway/src/middleware/auth.middleware.ts:39`
- Inject `x-user-role`: `apps/api-gateway/src/middleware/auth.middleware.ts:41`

---

## 3. Endpoint Routing Map (Gateway -> Upstream)

### Auth routes

- Incoming: `/api/auth/*`
- Routed to auth-service with auth path rewrite.

Code references:

- Auth route mount in gateway: `apps/api-gateway/src/routes/index.ts:62`
- Auth rewrite config: `apps/api-gateway/src/routes/index.ts:46`

### Patient routes

- Incoming: `/api/patients/*`
- Protected by gateway token verification.
- Routed to patient-service.

Code references:

- Patient route in gateway: `apps/api-gateway/src/routes/index.ts:181`
- Token middleware on patient route: `apps/api-gateway/src/routes/index.ts:183`

### Doctor routes

- Incoming: `/api/doctors/*`
- Some routes protected (register/me/update), some are public list/search.

Code references:

- Doctor register route (protected): `apps/api-gateway/src/routes/index.ts:141`
- Token middleware for doctor register: `apps/api-gateway/src/routes/index.ts:143`
- Doctor `me` route (protected): `apps/api-gateway/src/routes/index.ts:151`

### Admin routes

- Incoming: `/api/admin/*`
- Gateway requires admin role before forwarding.

Code references:

- Admin users route: `apps/api-gateway/src/routes/index.ts:88`
- Admin role check in gateway: `apps/api-gateway/src/routes/index.ts:91`
- Additional admin role checks: `apps/api-gateway/src/routes/index.ts:99`, `apps/api-gateway/src/routes/index.ts:108`, `apps/api-gateway/src/routes/index.ts:117`, `apps/api-gateway/src/routes/index.ts:126`

---

## 4. Auth Service API (Registration/Login/Token Lifecycle)

Auth routes (mounted under `/api/auth`):

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` (protected)

Code references:

- Register: `apps/auth-service/src/routes/auth.routes.ts:26`
- Login: `apps/auth-service/src/routes/auth.routes.ts:29`
- Refresh: `apps/auth-service/src/routes/auth.routes.ts:33`
- Me: `apps/auth-service/src/routes/auth.routes.ts:44`
- Route mount in app: `apps/auth-service/src/app.ts:85`

### Registration behavior

- Creates user record with provided role.
- Password stored hashed via model pre-save hook.
- Returns access token + refresh token.

Code references:

- User create with role: `apps/auth-service/src/services/auth.service.ts:33`, `apps/auth-service/src/services/auth.service.ts:36`
- Token issuance after register: `apps/auth-service/src/services/auth.service.ts:42`
- Password hash hook: `apps/auth-service/src/models/user.model.ts` (pre-save hash block)

### Login behavior

- Finds user by email.
- Verifies password.
- Returns new access + refresh token pair.

Code references:

- Login token issuance: `apps/auth-service/src/services/auth.service.ts:59`

### Refresh behavior

- Accepts raw refresh token.
- Hashes token and checks DB.
- Revokes old refresh token and issues new pair.

Code references:

- Refresh flow start: `apps/auth-service/src/services/auth.service.ts` (`refresh` function)
- Persist new refresh token hash: `apps/auth-service/src/services/auth.service.ts:112`

---

## 5. Patient Role Flow (Exact Request Sequence)

## 5.1 Patient registration

### Step A: frontend creates auth account

Request path:

1. Web page dispatches register action.
2. Web calls `POST /api/auth/register`.
3. Gateway forwards to auth-service.
4. Auth-service creates user with role `patient`.
5. Auth-service returns tokens.

Code references:

- Frontend register dispatch: `apps/web/src/pages/RegisterPage.tsx:68`
- Auth REST call: `apps/web/src/modules/auth/api/rest.ts` (`register`)
- Auth route: `apps/auth-service/src/routes/auth.routes.ts:26`

### Step B: patient domain profile creation is deferred/lazy

- Patient-service record is not created inside auth registration.
- Profile/entity is created when patient endpoints are called with gateway-injected `x-user-id`.

Code references:

- Create profile endpoint: `apps/patient-service/src/main/java/com/arogya/patient/controller/PatientController.java:55`
- Uses `x-user-id` header: `apps/patient-service/src/main/java/com/arogya/patient/controller/PatientController.java:57`
- Lazy create patient by authUserId: `apps/patient-service/src/main/java/com/arogya/patient/service/PatientService.java:44`, `apps/patient-service/src/main/java/com/arogya/patient/service/PatientService.java:47`
- Patient table uniqueness by auth user id: `apps/patient-service/src/main/java/com/arogya/patient/domain/Patient.java:24`

## 5.2 Patient login/authenticated requests

Request path for any protected patient API:

1. Web stores tokens and sends `Authorization: Bearer <accessToken>`.
2. Gateway verifies token and injects `x-user-id`/`x-user-role`.
3. Gateway forwards to patient-service.
4. Patient-service reads `x-user-id` and resolves current patient.

Code references:

- Attach bearer token in frontend: `apps/web/src/lib/api.ts:10`, `apps/web/src/lib/api.ts:13`
- Gateway JWT verify: `apps/api-gateway/src/middleware/auth.middleware.ts:29`
- Header injection: `apps/api-gateway/src/middleware/auth.middleware.ts:39`, `apps/api-gateway/src/middleware/auth.middleware.ts:41`
- Header resolver constants: `apps/patient-service/src/main/java/com/arogya/patient/web/AuthUserIdResolver.java:10`, `apps/patient-service/src/main/java/com/arogya/patient/web/AuthUserIdResolver.java:11`

---

## 6. Doctor Role Flow (Exact Request Sequence)

## 6.1 Doctor registration

### Step A: create auth account

- Same as patient registration, but role in payload is `doctor`.

Code references:

- Role set from register page payload: `apps/web/src/pages/RegisterPage.tsx:68`

### Step B: create doctor profile record

After auth registration succeeds:

1. Frontend calls `GET /api/auth/me` to fetch current auth user id.
2. Frontend calls `POST /api/doctors/register`.
3. Gateway verifies token and injects `x-user-id`.
4. Doctor-service sets doctor `authUserId` from header and saves doctor.
5. Verification status defaults to `PENDING`.

Code references:

- Fetch me after register: `apps/web/src/pages/RegisterPage.tsx:81`
- Call doctor register: `apps/web/src/pages/RegisterPage.tsx:87`
- Gateway doctor register route: `apps/api-gateway/src/routes/index.ts:141`
- Gateway auth middleware on route: `apps/api-gateway/src/routes/index.ts:143`
- Doctor register endpoint: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/DoctorController.java:46`
- Set authUserId from header: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/DoctorController.java:51`
- Default PENDING status: `apps/doctor-service/src/main/java/com/arogya/doctor_service/service/DoctorService.java:25`

### Failure handling detail

- If doctor profile creation fails after auth account creation, frontend still keeps auth registration successful and allows retry later from profile flow.

Code references:

- Failure comment in register page: `apps/web/src/pages/RegisterPage.tsx:94`, `apps/web/src/pages/RegisterPage.tsx:95`

## 6.2 Doctor me/update flow

- `GET /api/doctors/me` returns current doctor by `x-user-id`.
- If doctor entity does not exist, service returns stub payload instead of 404.
- `PUT /api/doctors/me` upserts profile for current auth user.

Code references:

- Doctor me endpoint: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/DoctorController.java:63`
- Doctor update me endpoint: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/DoctorController.java:82`
- Upsert implementation: `apps/doctor-service/src/main/java/com/arogya/doctor_service/service/DoctorService.java:101`

## 6.3 Doctor discoverability rule

- Patient-facing doctor search only returns APPROVED doctors.

Code references:

- Approved-only list behavior: `apps/doctor-service/src/main/java/com/arogya/doctor_service/service/DoctorService.java:44`

---

## 7. Admin Role Flow

## 7.1 Admin account creation

- Typical intended path is seed script.
- Script creates admin user in auth DB (or skips if exists).

Code references:

- Default admin email: `apps/auth-service/scripts/seed-admin.ts:23`
- Role admin creation: `apps/auth-service/scripts/seed-admin.ts:64`

## 7.2 Admin login

- Admin logs in via same auth login endpoint.
- Frontend role-based redirect sends admins to admin dashboard.

Code references:

- Login action: `apps/web/src/pages/LoginPage.tsx:37`
- Redirect logic for admin: `apps/web/src/pages/LoginPage.tsx:25`

## 7.3 Admin authorization across services

- Gateway enforces `requireRole('admin')` for `/api/admin/*` routes.
- Auth-service admin routes enforce admin role again internally.

Code references:

- Gateway admin role checks: `apps/api-gateway/src/routes/index.ts:91`, `apps/api-gateway/src/routes/index.ts:99`, `apps/api-gateway/src/routes/index.ts:108`, `apps/api-gateway/src/routes/index.ts:117`, `apps/api-gateway/src/routes/index.ts:126`
- Auth-service admin middleware: `apps/auth-service/src/routes/admin.routes.ts:16`

## 7.4 Admin doctor verification flow

Request example:

1. Admin calls `PUT /api/admin/doctors/{id}/verify`.
2. Gateway verifies admin role and proxies to doctor-service admin controller.
3. Doctor-service updates verification status to APPROVED.

Code references:

- Admin doctor controller base: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/AdminDoctorController.java:11`
- Verify endpoint: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/AdminDoctorController.java:29`

---

## 8. Frontend Token Handling and Automatic Refresh

### Token attach

- Access token attached to all API calls through Axios request interceptor.

Code references:

- `apps/web/src/lib/api.ts:10`
- `apps/web/src/lib/api.ts:13`

### Refresh on 401

Flow:

1. API call returns 401.
2. Frontend sends `POST /api/auth/refresh` with refresh token.
3. New access/refresh tokens are stored.
4. Original request is retried.

Code references:

- 401 branch: `apps/web/src/lib/api.ts:34`
- Refresh call: `apps/web/src/lib/api.ts:60`
- Save new tokens: `apps/web/src/lib/api.ts:64`
- Retry original request with new access token: `apps/web/src/lib/api.ts:70`

---

## 9. Important Security and Coupling Notes

1. Patient-service and doctor-service currently trust gateway headers and permit all at Spring Security level.

- Patient security config: `apps/patient-service/src/main/java/com/arogya/patient/config/SecurityConfig.java:22`
- Doctor security config: `apps/doctor-service/src/main/java/com/arogya/doctor_service/config/SecurityConfig.java:21`

2. This means direct calls that bypass gateway could become risky unless network boundaries prevent direct exposure.

3. Current design intentionally centralizes JWT verification in gateway and keeps downstream services lightweight.

---

## 10. Concrete "Request is sent in this manner" Examples

### Example A: Patient creates profile

1. Client sends:

- `POST /api/patients/profile`
- Header: `Authorization: Bearer <accessToken>`

2. Gateway does:

- Verifies JWT.
- Injects `x-user-id` and `x-user-role`.
- Proxies to patient-service `/patients/profile`.

3. Patient-service does:

- Reads `x-user-id`.
- Creates patient row if absent.
- Creates or updates profile.

Code references:

- Gateway patient route: `apps/api-gateway/src/routes/index.ts:181`
- Gateway token verify and headers: `apps/api-gateway/src/middleware/auth.middleware.ts:29`, `apps/api-gateway/src/middleware/auth.middleware.ts:39`
- Patient endpoint: `apps/patient-service/src/main/java/com/arogya/patient/controller/PatientController.java:55`
- Service upsert logic: `apps/patient-service/src/main/java/com/arogya/patient/service/PatientService.java:44`

### Example B: Doctor registration after auth signup

1. Client sends:

- `POST /api/auth/register` with role `doctor`
- Then `GET /api/auth/me`
- Then `POST /api/doctors/register`

2. Gateway does:

- Auth endpoint: public pass-through.
- Doctor register endpoint: verifies token and injects headers.

3. Doctor-service does:

- Uses `x-user-id` as `authUserId`.
- Saves doctor with `PENDING` verification.

Code references:

- Register flow in frontend: `apps/web/src/pages/RegisterPage.tsx:68`, `apps/web/src/pages/RegisterPage.tsx:81`, `apps/web/src/pages/RegisterPage.tsx:87`
- Gateway protected doctor register: `apps/api-gateway/src/routes/index.ts:141`, `apps/api-gateway/src/routes/index.ts:143`
- Doctor register controller: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/DoctorController.java:46`
- PENDING status set: `apps/doctor-service/src/main/java/com/arogya/doctor_service/service/DoctorService.java:25`

### Example C: Admin verifies a doctor

1. Client sends:

- `PUT /api/admin/doctors/{doctorId}/verify`
- Header: `Authorization: Bearer <adminAccessToken>`

2. Gateway does:

- Verifies JWT.
- Checks role is `admin`.
- Proxies to doctor-service admin endpoint.

3. Doctor-service does:

- Updates doctor verification status to APPROVED.

Code references:

- Admin role checks in gateway: `apps/api-gateway/src/routes/index.ts:126`
- Admin doctor endpoint: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/AdminDoctorController.java:29`

---

## 11. Quick Endpoint Summary

### Auth service

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- Admin management under `/api/auth/admin/*`

### Patient service (via gateway)

- `POST /api/patients/profile`
- `GET /api/patients/profile/me`
- `PUT /api/patients/profile/me`
- `GET /api/patients/exists/me`

### Doctor service (via gateway)

- `POST /api/doctors/register`
- `GET /api/doctors/me`
- `PUT /api/doctors/me`
- `GET /api/doctors` (approved doctors list/search)
- `PUT /api/admin/doctors/{id}/verify`
- `PUT /api/admin/doctors/{id}/reject`

---

If you update routes later, refresh this document by re-checking the gateway route map and each service controller mappings first.

---

## 12. Business View: What the User Actually Experiences

This section translates the technical flow into user-facing journey stories.

### 12.1 Patient story: "I need to book care quickly"

Business goal:

- Let a patient create an account fast, trust the platform, and reach booking with minimum friction.

What patient sees:

1. Opens registration page and selects Patient.
2. Enters basic details and creates account.
3. Immediately lands on appointments flow.
4. Optionally completes profile and uploads documents later.

Why this matters for business:

- Faster time to first booking increases conversion.
- Delayed profile completion avoids drop-off during signup.

Behind the scenes (mapped to your technical flow):

1. Account is created in auth-service.
2. Patient profile is created only when needed (lazy/upsert model).
3. Identity is consistently carried by gateway headers.

Key references:

- Signup action in UI: `apps/web/src/pages/RegisterPage.tsx:68`
- Patient profile creation endpoint: `apps/patient-service/src/main/java/com/arogya/patient/controller/PatientController.java:55`
- Lazy patient creation: `apps/patient-service/src/main/java/com/arogya/patient/service/PatientService.java:44`

### 12.2 Doctor story: "I want to onboard and start practice"

Business goal:

- Allow doctors to register quickly, then move into a controlled verification pipeline before they become publicly discoverable.

What doctor sees:

1. Registers as Doctor and provides specialty and license details.
2. Gets access to doctor dashboard.
3. Profile exists but verification is pending.
4. Once approved by admin, appears in patient search and can receive bookings.

Why this matters for business:

- Quick onboarding helps supply growth.
- Verification protects trust and platform quality.

Behind the scenes:

1. Auth identity is created first.
2. Doctor profile is created in doctor-service.
3. Verification status starts as PENDING.
4. Only APPROVED doctors are shown to patients.

Key references:

- Doctor profile call after register: `apps/web/src/pages/RegisterPage.tsx:87`
- Doctor register endpoint: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/DoctorController.java:46`
- PENDING default: `apps/doctor-service/src/main/java/com/arogya/doctor_service/service/DoctorService.java:25`
- Approved-only discoverability: `apps/doctor-service/src/main/java/com/arogya/doctor_service/service/DoctorService.java:44`

### 12.3 Admin story: "I safeguard quality and compliance"

Business goal:

- Give admins control to monitor user base, verify doctors, and keep platform safe.

What admin sees:

1. Logs into admin dashboard.
2. Views users and metrics.
3. Reviews pending doctors.
4. Approves or rejects based on compliance checks.

Why this matters for business:

- Keeps care network trustworthy.
- Reduces legal and operational risk.
- Enables oversight of growth and account health.

Behind the scenes:

1. Admin JWT is validated in gateway.
2. Gateway enforces admin role for admin routes.
3. Auth service and doctor service execute admin operations.

Key references:

- Admin role checks in gateway: `apps/api-gateway/src/routes/index.ts:91`
- Auth admin guard: `apps/auth-service/src/routes/admin.routes.ts:16`
- Doctor approval endpoint: `apps/doctor-service/src/main/java/com/arogya/doctor_service/controller/AdminDoctorController.java:29`

---

## 13. End-to-End Journey Stories (Business + System Touchpoints)

### 13.1 Story A: New patient from homepage to first booking intent

Narrative:

1. A new patient clicks Register from homepage.
2. Chooses Patient and signs up in less than 1 minute.
3. Is redirected to appointments and starts exploring available doctors.
4. Later fills profile and documents only if needed.

Business impact:

- Lower registration friction.
- Better conversion from visitor to active patient.

System touchpoints:

1. Web -> API Gateway -> Auth Service (`POST /api/auth/register`).
2. Web stores token and continues as authenticated user.
3. Profile data is progressively completed in Patient Service.

### 13.2 Story B: New doctor onboarding to marketplace visibility

Narrative:

1. A doctor signs up with specialty and license info.
2. Gains account access immediately.
3. Waits for verification while still able to manage profile.
4. After admin approval, becomes visible to patients for booking.

Business impact:

- Scalable doctor onboarding.
- Quality control before exposure.

System touchpoints:

1. Web -> Auth Service register.
2. Web -> Doctor Service register with trusted user identity from gateway.
3. Admin verifies doctor via admin workflow.

### 13.3 Story C: Admin quality gate for clinical trust

Narrative:

1. Admin reviews pending doctors each day.
2. Approves compliant profiles, rejects incomplete ones.
3. Monitors user metrics and active/inactive account patterns.

Business impact:

- Maintains service quality.
- Builds patient trust in listed doctors.
- Supports governance and audit posture.

System touchpoints:

1. Admin login through auth.
2. Gateway role checks for admin endpoints.
3. Auth admin APIs for user management and metrics, doctor admin APIs for verification.

---

## 14. Business Metrics To Track For These Flows

These KPIs align directly with the stories above.

### 14.1 Acquisition and conversion

- Registration completion rate (patient vs doctor).
- Time to successful signup.
- Drop-off rate at registration form.

### 14.2 Activation

- Patient time from signup to first appointment booking.
- Doctor time from signup to verification approval.
- Percentage of doctors stuck in PENDING for more than 48 hours.

### 14.3 Trust and governance

- Admin verification throughput per day.
- Doctor approval vs rejection ratio.
- Number of deactivated users by role.

### 14.4 Reliability of auth journey

- Login success rate.
- Token refresh success rate.
- 401 recovery success after automatic refresh.

---

## 15. Product Decisions Reflected In Current Architecture

1. Fast patient onboarding

- Patient domain profile is not mandatory at signup.
- Supports quick conversion into booking funnel.

2. Controlled doctor marketplace quality

- Doctors can onboard quickly, but discovery is gated by admin approval.

3. Centralized identity enforcement

- Gateway validates token once and propagates identity.
- Downstream services stay focused on domain workflows.

4. Operational oversight

- Admin controls users and doctor verification through dedicated admin routes.

---

## 16. Suggested Add-On: Business SLA Definitions

To make these flows operationally measurable, define target SLAs:

- Patient signup completion under 30 seconds median.
- Doctor verification decision under 24 hours median.
- Login + token refresh combined success above 99 percent.
- Admin verification queue backlog below agreed threshold.

This turns the flow from documentation into a measurable operating model.
