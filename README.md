# SunaCare Backend API

The core REST API powering the SunaCare animal rescue platform. Handles user authentication, report submissions, pet listings, community features, and organization management.

**Stack:** Node.js • Express.js • Sequelize ORM • MySQL  
**Port:** 5000  
**Version:** 1.0.0

---

## Quick Start

### Prerequisites
- Node.js 14+
- MySQL 5.7+ (local or remote)
- npm or yarn

### Installation

```bash
# Clone and install
npm install

# Configure database connection
# Create .env file with:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=
# DB_NAME=sunacare
# JWT_SECRET=your-secret-key
# NODE_ENV=development

# Run database migrations and seed (if needed)
npm run migrate
npm run seed

# Start development server
npm run dev  # Runs on http://localhost:5000
```

---

## Architecture

### Technology Stack
- **Framework:** Express.js (REST API)
- **Database:** MySQL with Sequelize ORM
- **Authentication:** JWT tokens
- **File Uploads:** Multer (disk storage)
- **Validation:** express-validator
- **Security:** CORS, XSS sanitization, input validation

### Project Structure

```
src/
├── config/
│   ├── database.js               # Sequelize connection and pool config
│   └── multer.js                 # File upload configuration
│
├── controllers/
│   ├── auth.controller.js        # Registration, login, OTP verification
│   ├── user.controller.js        # User profiles, preferences, settings
│   ├── report.controller.js      # Rescue report CRUD and map visibility
│   ├── pet.controller.js         # Pet listings and adoption flow
│   ├── campaign.controller.js    # Donation campaigns and fundraising
│   ├── post.controller.js        # Community posts, likes, comments
│   ├── article.controller.js     # Educational content management
│   ├── ngo.controller.js         # NGO/responder applications
│   └── dashboard.controller.js   # Admin stats and approvals
│
├── middleware/
│   ├── auth.middleware.js        # JWT verification and role-based access
│   ├── error.middleware.js       # Global error handler
│   ├── validate.middleware.js    # Input validation wrapper
│   └── sanitize.middleware.js    # XSS protection
│
├── models/
│   ├── User.model.js             # User account (citizen, NGO, admin)
│   ├── Report.model.js           # Rescue reports with location, photos
│   ├── Pet.model.js              # Pet listings for adoption
│   ├── AdoptionApplication.model.js
│   ├── Campaign.model.js         # Fundraising campaigns
│   ├── Donation.model.js         # Individual donation records
│   ├── Post.model.js             # Community alert/news posts
│   ├── PostComment.model.js
│   ├── PostCommentLike.model.js
│   ├── PostLike.model.js
│   ├── NgoApplication.model.js   # NGO verification workflow
│   ├── Article.model.js          # Educational articles
│   └── index.js                  # All associations defined
│
├── routes/
│   ├── auth.routes.js            # /api/auth/*
│   ├── user.routes.js            # /api/users/*
│   ├── report.routes.js          # /api/reports/*
│   ├── pet.routes.js             # /api/pets/*
│   ├── campaign.routes.js        # /api/campaigns/*
│   ├── post.routes.js            # /api/posts/*
│   ├── article.routes.js         # /api/articles/*
│   ├── ngo.routes.js             # /api/ngos/*
│   └── index.js                  # Route aggregation
│
├── migrations/                   # Database version control
│   ├── 001_add_pet_fields.sql
│   ├── 002_create_pet_reports.sql
│   └── [others]
│
├── database/
│   ├── schema.sql                # Full database schema
│   └── seed.js                   # Sample data for development
│
├── uploads/                      # File storage
│   ├── reports/                  # Report photos
│   ├── posts/                    # Community post images
│   ├── ngo-docs/                 # NGO document uploads
│   └── comments/                 # Comment attachments
│
└── server.js                     # Express app initialization and port binding
```

---

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` — Send verification OTP to email
- `POST /api/auth/verify-otp` — Verify OTP and create account
- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/logout` — Clear session tokens
- `POST /api/auth/refresh` — Refresh access token

### Users
- `GET /api/users/me` — Current user profile (protected)
- `PUT /api/users/:id` — Update profile (protected)
- `GET /api/users/:id` — Public user info
- `PUT /api/users/:id/settings` — User preferences (protected)

### Reports
- `POST /api/reports/guest` — Submit report without account
- `POST /api/reports` — Submit report (authenticated)
- `GET /api/reports` — List reports with filtering
- `GET /api/reports/:id` — Report details
- `PUT /api/reports/:id` — Update report (protected)
- `DELETE /api/reports/:id` — Delete report (protected)
- `PUT /api/reports/:id/visibility` — Toggle map visibility

### Pets
- `GET /api/pets` — List available pets for adoption
- `GET /api/pets/:id` — Pet details
- `POST /api/pets/:id/adopt` — Submit adoption application
- `GET /api/pets/:id/applications` — View applications (NGO only)
- `PATCH /api/pets/:id/applications/:appId` — Approve/reject application

### Community
- `POST /api/posts` — Create community post (authenticated)
- `GET /api/posts` — List posts with pagination
- `GET /api/posts/:id` — Post details
- `DELETE /api/posts/:id` — Delete own post (protected)
- `POST /api/posts/:id/like` — Like post (protected)
- `DELETE /api/posts/:id/like` — Unlike post (protected)
- `POST /api/posts/:id/comments` — Comment on post (protected)
- `DELETE /api/posts/:id/comments/:commentId` — Delete own comment
- `POST /api/posts/:id/comments/:commentId/like` — Like comment

### Campaigns
- `POST /api/campaigns` — Create campaign (NGO only)
- `GET /api/campaigns` — List campaigns
- `POST /api/campaigns/:id/donate` — Make donation (authenticated)
- `GET /api/campaigns/:id/donations` — View donation history

### NGO Management
- `POST /api/ngos/apply` — Submit NGO application with documents
- `GET /api/ngos/status` — Check application status
- `PUT /api/ngos/:id/verify` — Verify NGO (admin only)

### Education
- `GET /api/articles` — List educational articles
- `GET /api/articles/:id` — Article content
- `POST /api/articles` — Create article (admin only)

---

## Database Models

### User
- Stores account info, role (citizen/ngo/admin), contact details
- Relations: created reports, posts, donations, adoption applications
- Authentication: email + password hash, JWT refresh tokens

### Report
- Animal rescue incidents with location (GPS), photos (multi-image support), description
- Guest submission: verified by OTP contact
- Authenticated submission: auto-generates community post
- Only images track separately; media_urls array for multiple images

### Post
- Community alerts, news, success stories
- Author, content, image_url (main), image_urls array (additional), created_at
- Engagement: likes, comments, comment_likes
- Bookmark tracking: stored clientside in localStorage (future: PostBookmark table)

### Pet
- Available animals for adoption
- Details: type, age, health status, location, photos
- Adoption applications with approval workflow

### Campaign
- NGO fundraising campaigns with goal, progress, deadline
- Donations with receipt generation for tax purposes

### NgoApplication
- Org name, email, document_url, verification status
- Admin approval workflow with status tracking (pending → verified)

---

## Key Recent Updates (March 2026)

### Multi-Media Report Support
- ✅ Guest reports now accept up to 5 photos per submission
- ✅ Authenticated reports support multiple images
- ✅ Images deduplicated and passed to auto-generated community posts
- ✅ Backend routes changed from `upload.single()` to `upload.array(5)`

### NGO Document Upload
- ✅ Added Multer disk storage for NGO documents
- ✅ File upload middleware on POST /api/ngos/applications
- ✅ Fallback to URL if no file uploaded
- ✅ Documents stored in `/uploads/ngo-docs/`

### Community Enhancements
- ✅ Post and comment deletion for content authors
- ✅ Multi-image support for posts (image_url + image_urls array)
- ✅ Fixed media URL resolution for `/uploads/` paths

### Authentication & Security
- ✅ OTP email verification for guest reports
- ✅ JWT token-based access control
- ✅ Role-based authorization (citizen, NGO, admin)
- ✅ Input sanitization and XSS protection

---

## Environment Variables

Create `.env` file:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=sunacare
DB_PORT=3306

# JWT
JWT_SECRET=your-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key

# Email (for OTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@sunacare.org
SMTP_PASSWORD=password

# File Uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_DIR=./uploads

# Server
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

---

## Development

### Running in Development Mode
```bash
npm run dev  # Uses nodemon for auto-reload
```

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
# Create migration
npm run migrate:create -- --name description-here

# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down
```

### Seeding Development Data
```bash
npm run seed
```

---

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "status": 400,
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

Common status codes:
- `400` — Bad request (validation failed)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `409` — Conflict (duplicate entry, etc.)
- `500` — Server error

---

## Security Considerations

1. **JWT Validation** — All protected routes verify token signature and expiry
2. **CORS** — Restricted to whitelisted frontend origins
3. **Input Sanitization** — All inputs validated and sanitized against XSS
4. **File Uploads** — Restricted file types, size limits, stored outside web root
5. **Password Hashing** — bcrypt with salt rounds=10
6. **SQL Injection** — Sequelize parameterized queries prevent injection
7. **Rate Limiting** — (Optional) Consider adding to prevent abuse

---

## Performance Notes

- Database connection pooling configured for 5-10 connections
- Pagination on list endpoints (default 20 items)
- Image optimization recommended on client side before upload
- Consider caching on CDN for educational articles and static content

---

## Contributing

1. Create feature branch from `main`
2. Update models, controllers, and routes as needed
3. Test with Postman or similar API client
4. Ensure all endpoints return consistent JSON format
5. Update this README if adding new endpoints
6. Submit PR with migration files if schema changes

---

## Troubleshooting

### Database Connection Fails
- Verify MySQL is running
- Check DB credentials in .env
- Ensure database exists: `CREATE DATABASE sunacare;`

### File Upload Returns 500
- Check `/uploads/` directory permissions
- Verify file size under MAX_FILE_SIZE
- Ensure Multer destination directories exist

### OTP Email Not Sending
- Verify SMTP credentials in .env
- Check email service provider allows Node.js connections
- Test with `nodemailer` directly for debugging

### JWT Token Expired
- Client should use refresh token endpoint
- Implement token refresh logic in frontend auth context

---

## License

Proprietary — SunaCare
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
