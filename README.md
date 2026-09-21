# Merit API

Backend API for Merit Real Solutions — Customer & Agent portal.  
Structure follows `merit-realsolutions-backend`. Data is **dynamic** (DB + env), not demo seed files.

## Roles

| Role | Source |
|------|--------|
| `CUSTOMER` / `AGENT` | Public registration |
| `ADMIN` | Created once from `.env` on startup if none exists |
| Agent categories | `AgentCategories` table — managed via API (no hardcoded list) |

## Quick Start

```bash
cd merit-api
npm install
cp .env.example .env
# Set DB_* and ADMIN_* in .env

npm run setup    # create DB + migrate (no seed data)
npm run dev
```

Server: `http://localhost:3001`

On first start, admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if no admin row exists.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run db:create` | Create PostgreSQL database |
| `npm run migrate` | Run migrations |
| `npm run setup` | create DB + migrate |
| `npm run dev` | Nodemon |

## Dynamic agent categories

Categories are empty until an admin creates them:

```http
POST /api/agent-categories
Authorization: Bearer <admin-token>
{
  "name": "Your Category Name",
  "code": "OPTIONAL_CODE",
  "description": "Optional",
  "sortOrder": 1
}
```

Registration UI loads active categories from:

```http
GET /api/agent-categories
```

Agent register must send `agentCategoryId` from that list.

## Auth APIs

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | No (multipart: profilePhoto, identityProof, addressProof) |
| POST | `/api/auth/login` | No |
| POST | `/api/auth/admin/login` | No |
| GET | `/api/auth/me` | Bearer |
| GET | `/api/auth/application-status?mobile=` | No |
| POST | `/api/auth/logout` | Bearer |
| GET | `/api/registrations` | Admin (`?status=&role=`) |
| GET | `/api/registrations/pending` | Admin |
| GET | `/api/registrations/:id` | Admin |
| GET/POST | `/api/customers` | Admin customer list/create |
| GET/PATCH/DELETE | `/api/customers/:id` | Admin customer detail/update/delete |
| GET/POST | `/api/agents` | Admin agent list/create |
| GET/PATCH/DELETE | `/api/agents/:id` | Admin agent detail/update/delete |
| POST | `/api/registrations/:id/reject` | Admin (`{ "reason": "..." }`) |
| GET | `/api/hero-slides` | No (active only) |
| GET | `/api/hero-slides/all` | Admin |
| POST | `/api/hero-slides` | Admin (multipart image) |
| PATCH | `/api/hero-slides/:id` | Admin |
| DELETE | `/api/hero-slides/:id` | Admin |
| GET | `/api/agent-categories` | No (active only) |
| GET | `/api/agent-categories/all` | Admin |
| POST | `/api/agent-categories` | Admin |
| PATCH | `/api/agent-categories/:id` | Admin |

### Register examples

Customer:

```json
{
  "name": "Anitha Rao",
  "mobile": "9000000010",
  "email": "anitha@example.com",
  "password": "Secret@123",
  "role": "customer",
  "district": "Guntur",
  "city": "Guntur",
  "preferredPropertyType": "Apartment / Flat"
}
```

Agent (after categories exist):

```json
{
  "name": "Venkatesh",
  "mobile": "9000000011",
  "email": "venkat@example.com",
  "password": "Secret@123",
  "role": "agent",
  "agentCategoryId": 1
}
```

## Property module (Phase 1 — Admin posting)

Seeded from the property types PDF into `PropertyCategories` + `PropertyAttributes` (SPECIFICATION / AMENITY).

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/property-categories` | Public (active + visible) |
| GET | `/api/property-categories/all` | Admin |
| GET | `/api/property-categories/:slug` | Public (includes specs & amenities) |
| POST/PATCH/DELETE | `/api/property-categories` | Admin |
| GET | `/api/properties` | Public (ACTIVE only) |
| GET | `/api/properties/featured` | Public |
| GET | `/api/properties/latest` | Public |
| GET | `/api/properties/trending` | Public |
| GET | `/api/properties/admin/all` | Admin |
| POST/PATCH/DELETE | `/api/properties` | Admin (multipart `images`) |

Admin posts go live immediately (`ACTIVE`). Flags: `isFeatured`, `isTrending`. Latest = newest `createdAt`.

## Engineering rules

- No `sequelize.sync()`
- No hardcoded demo users / categories in seeders
- Schema via migrations only
- Response shape: `{ success, message, data, errors }`

## Related

- `merit-ui` — frontend
- `merit-realsolutions-backend` — structure reference only
