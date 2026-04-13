# Auth Service

The sole authentication and identity authority for the Arogya platform.
No other service issues tokens or stores passwords.

## Stack
- Node.js + Express + TypeScript
- MongoDB (isolated — `arogya_auth` database)
- JWT (access tokens) + opaque refresh tokens

## Running locally

```bash
cp .env.example .env    # fill in values
npm install
npm run dev             # http://localhost:3001
```

## Running with Docker

```bash
# From project root
docker-compose up --build
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/health` | None | Health check |
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/refresh` | None | Refresh tokens |
| POST | `/api/auth/logout` | None | Logout (revoke token) |
| GET | `/api/auth/me` | Bearer token | Get own profile |
| POST | `/api/auth/forgot-password` | None | Request password reset |
| POST | `/api/auth/reset-password` | None | Complete password reset |

## Token format

Access tokens are JWTs. Decoded payload:

```json
{
  "userId": "64a1f...",
  "email": "user@arogya.lk",
  "role": "patient",
  "iat": 1234567890,
  "exp": 1234568790
}
```

Roles: `patient` | `doctor` | `admin`

Access token lifetime: **15 minutes**
Refresh token lifetime: **7 days**

## Integrating into your service (4 steps)

**1.** Copy these two files into your service:
```
src/middleware/auth.middleware.ts
src/types/auth.types.ts        ← interfaces only, not the models
```

**2.** Add to your `.env`:
```
JWT_SECRET=           ← must match auth-service exactly (ask team lead)
```

**3.** Protect your routes:
```typescript
import { verifyToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

router.get('/my-data',   verifyToken, getMyData);
router.post('/slots',    verifyToken, requireRole(UserRole.DOCTOR), createSlot);
router.get('/dashboard', verifyToken, requireRole(UserRole.ADMIN), getDashboard);
```

**4.** Read the user in your controller:
```typescript
const { userId, role, email } = req.user!;
```

## Error responses

All errors follow this shape:
```json
{
  "success": false,
  "message": "Human readable message",
  "errors": []   // only on validation failures
}
```
src/middleware/auth.middleware.ts
src/types/auth.types.ts        ← interfaces only, not the models
```

**2.** Add to your `.env`:

| Status | Meaning |
|--------|---------|
| 401 | Missing, expired, or invalid token |
| 403 | Valid token but wrong role |
| 409 | Email already registered |
| 422 | Validation failed (see `errors` array) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Testing

Import `postman_collection.json` into Postman.
Run **Register** first — the collection auto-saves your tokens.

## Phase 4 integration points

- `forgotPassword()` in `auth.service.ts` → swap console.log for Notification Service call
- Password reset email template → coordinate with Notification Service teammate
