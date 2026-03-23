# 🐾 Sunacare — Animal Rescue Platform Backend

A RESTful API backend for the Sunacare Animal Rescue Platform, built with **Node.js**, **Express.js**, **Sequelize ORM**, and **MySQL**.

---

## 📁 Project Structure

```
sunacare-backend/
├── src/
│   ├── config/
│   │   └── database.js          — Sequelize connection & pool config
│   ├── controllers/
│   │   ├── auth.controller.js   — Register, login, logout, refresh
│   │   ├── user.controller.js   — Profile, admin user management
│   │   ├── report.controller.js — Incident reports CRUD
│   │   ├── pet.controller.js    — Pet listings & adoption applications
│   │   ├── campaign.controller.js — Fundraising campaigns & donations
│   │   ├── post.controller.js   — Community posts, likes, comments
│   │   ├── article.controller.js — Educational articles
│   │   ├── ngo.controller.js    — NGO/responder applications
│   │   └── dashboard.controller.js — Stats & approval workflow
│   ├── middleware/
│   │   ├── auth.middleware.js   — JWT protect & role authorize
│   │   ├── error.middleware.js  — Global error handler
│   │   ├── notFound.middleware.js
│   │   ├── sanitize.middleware.js — XSS protection
│   │   └── validate.middleware.js — express-validator helper
│   ├── models/
│   │   ├── index.js             — All models + Sequelize associations
│   │   ├── User.model.js
│   │   ├── Report.model.js
│   │   ├── Pet.model.js
│   │   ├── AdoptionApplication.model.js
│   │   ├── Campaign.model.js
│   │   ├── Donation.model.js
│   │   ├── Post.model.js
│   │   ├── PostComment.model.js
│   │   ├── PostLike.model.js
│   │   └── Article.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── report.routes.js
│   │   ├── pet.routes.js
│   │   ├── campaign.routes.js
│   │   ├── post.routes.js
│   │   ├── article.routes.js
│   │   ├── ngo.routes.js
│   │   └── dashboard.routes.js
│   ├── utils/
│   │   ├── asyncHandler.js      — Wraps async controllers
│   │   ├── generateToken.js     — JWT helpers
│   │   └── logger.js            — File + console logger
│   └── server.js                — App entry point
├── database/
│   ├── schema.sql               — Full MySQL table definitions
│   ├── seed.sql                 — Static seed data (run after schema.sql)
│   └── seed.js                  — JS seed runner (hashes passwords)
├── logs/
├── .env
├── .env.example
└── package.json
```

---

## 🚀 Quick Start (XAMPP)

### 1. Prerequisites
- Node.js ≥ 18
- XAMPP with Apache & MySQL started

### 2. Create the database
Open **phpMyAdmin** (`http://localhost/phpmyadmin`) and run:
```sql
-- Option A: run the SQL files
-- File > Import > schema.sql  → then → seed.sql
```

Or use the JS seeder (see step 5).

### 3. Install dependencies
```bash
npm install
```

### 4. Configure environment
Copy `.env.example` to `.env` (already done — XAMPP defaults pre-filled):
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sunacare_db
DB_USER=root
DB_PASSWORD=         # leave blank for default XAMPP
PORT=5000
```

### 5. Seed the database (JS runner — recommended)
```bash
npm run seed
```
> ⚠️ This drops and recreates all tables. Only use for fresh setup.

### 6. Start the server
```bash
npm run dev     # development (nodemon)
npm start       # production
```

Server starts at: `http://localhost:5000`
Health check: `http://localhost:5000/health`

---

## 🔑 Test Credentials

| Role       | Email                        | Password    |
|------------|------------------------------|-------------|
| Admin      | admin@sunacare.com           | Admin1234!  |
| Responder  | responder@pawsrescue.com     | Rescue123!  |
| User       | jane@sunacare.com            | User1234!   |

---

## 📡 API Endpoints

All endpoints are prefixed with `/api`.

### Auth — `/api/auth`
| Method | Path                    | Access  | Description                        |
|--------|-------------------------|---------|------------------------------------|
| POST   | `/register`             | Public  | Register a public user             |
| POST   | `/register-responder`   | Public  | Apply as NGO / responder           |
| POST   | `/login`                | Public  | Login → returns JWT                |
| POST   | `/logout`               | Private | Clear auth cookie                  |
| POST   | `/refresh`              | Private | Re-issue JWT token                 |

### Users — `/api/users`
| Method | Path                    | Access        | Description                  |
|--------|-------------------------|---------------|------------------------------|
| GET    | `/me`                   | Private       | Get current user profile     |
| PUT    | `/me`                   | Private       | Update own profile           |
| GET    | `/`                     | Admin         | List all users               |
| GET    | `/:id`                  | Admin         | Get user by ID               |
| PATCH  | `/:id/deactivate`       | Admin         | Deactivate a user account    |

### Reports — `/api/reports`
| Method | Path                    | Access        | Description                        |
|--------|-------------------------|---------------|------------------------------------|
| GET    | `/`                     | Private       | List all reports (`?flagged=1`)     |
| GET    | `/:id`                  | Private       | Get single report                  |
| POST   | `/`                     | Optional Auth | Submit a rescue report             |
| PUT    | `/:id/flag`             | Private       | Flag a report                      |
| PUT    | `/:id/unflag`           | Admin         | Unflag a report                    |
| PUT    | `/:id/status`           | Responder+    | Update report status               |
| PATCH  | `/:id/assign`           | Responder+    | Assign report to self              |

### Pets — `/api/pets`
| Method | Path                    | Access        | Description                        |
|--------|-------------------------|---------------|------------------------------------|
| GET    | `/`                     | Public        | List pets (`?status=&species=`)     |
| GET    | `/:id`                  | Public        | Get single pet                     |
| POST   | `/`                     | Responder+    | Create pet listing                 |
| PUT    | `/:id`                  | Responder+    | Update pet                         |
| DELETE | `/:id`                  | Responder+    | Delete pet listing                 |
| POST   | `/:id/apply`            | Private       | Apply to adopt a pet               |

### Campaigns — `/api/campaigns`
| Method | Path                    | Access        | Description                        |
|--------|-------------------------|---------------|------------------------------------|
| GET    | `/`                     | Public        | List active campaigns              |
| GET    | `/my/donations`         | Private       | Get my donation history            |
| GET    | `/:id`                  | Public        | Get single campaign                |
| POST   | `/`                     | Responder+    | Create campaign                    |
| PUT    | `/:id`                  | Responder+    | Update campaign                    |
| POST   | `/:id/donate`           | Private       | Make a donation                    |

### Posts — `/api/posts`
| Method | Path                    | Access        | Description                        |
|--------|-------------------------|---------------|------------------------------------|
| GET    | `/`                     | Private       | List posts (`?flagged=1`)           |
| GET    | `/mine`                 | Private       | Get my posts                       |
| GET    | `/:id`                  | Private       | Get single post with comments      |
| POST   | `/`                     | Private       | Create post                        |
| PUT    | `/:id`                  | Private       | Update own post                    |
| DELETE | `/:id`                  | Private       | Delete own post                    |
| POST   | `/:id/like`             | Private       | Toggle like                        |
| POST   | `/:id/comments`         | Private       | Add comment                        |
| PUT    | `/:id/flag`             | Private       | Flag post                          |
| PUT    | `/:id/unflag`           | Admin         | Unflag post                        |

### Articles — `/api/articles`
| Method | Path                    | Access        | Description                        |
|--------|-------------------------|---------------|------------------------------------|
| GET    | `/`                     | Public        | List published articles            |
| GET    | `/all`                  | Responder+    | List all articles (any status)     |
| GET    | `/:id`                  | Public        | Get single article (+view count)   |
| POST   | `/`                     | Responder+    | Create article                     |
| PUT    | `/:id`                  | Responder+    | Update article                     |
| DELETE | `/:id`                  | Responder+    | Delete article                     |

### NGOs — `/api/ngos`
| Method | Path                    | Access        | Description                        |
|--------|-------------------------|---------------|------------------------------------|
| POST   | `/applications`         | Public        | Submit NGO application             |
| GET    | `/applications`         | Admin         | List all NGO applications          |
| GET    | `/applications/:id`     | Admin         | Get single NGO application         |

### Dashboard — `/api/dashboard`
| Method | Path                    | Access        | Description                        |
|--------|-------------------------|---------------|------------------------------------|
| GET    | `/admin`                | Admin         | Admin stats overview               |
| GET    | `/responder`            | Responder+    | Responder stats overview           |
| PATCH  | `/approve-org/:id`      | Admin         | Approve an NGO application         |
| PATCH  | `/reject-org/:id`       | Admin         | Reject an NGO application          |

---

## Notes For Maintainers

- NGO credential email delivery in `ngo.controller.js` is currently a placeholder workflow.
- `createCredentials` and `resendCredentials` intentionally update DB state and API response even without an external mail provider.
- Add your mail integration in those handlers when SMTP/provider credentials are available.
- Admin/responder settings toggles persist through `/api/settings` with boolean fields such as `two_factor_enabled` and notification flags.

## 🛡 Role Hierarchy

```
admin  >  responder  >  user
  3           2           1
```

`authorize('responder')` allows both `responder` and `admin`.  
`authorize('admin')` allows only `admin`.

---

## 🗃 Database Schema Summary

| Table                   | Purpose                                  |
|-------------------------|------------------------------------------|
| `users`                 | All users: public, responders, admins    |
| `reports`               | Animal incident/rescue reports           |
| `pets`                  | Adoption listings                        |
| `adoption_applications` | Adoption requests from users             |
| `campaigns`             | Fundraising campaigns                    |
| `donations`             | Individual donations to campaigns        |
| `posts`                 | Community board posts                    |
| `post_comments`         | Comments on posts                        |
| `post_likes`            | Like records (unique per user+post)      |
| `articles`              | Educational content (draft / published)  |

---

## 🔌 Frontend Integration

All three frontend apps connect to:
```
http://localhost:5000/api
```

Set in each frontend's `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
