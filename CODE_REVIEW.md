# Speaking Rock Poker - Code Review

*Reviewed by Claw | 2026-01-30*

---

## 📊 Overview

A comprehensive poker room management system for Speaking Rock Entertainment Center. Well-structured codebase with clear separation of concerns.

### Tech Stack
- **Backend:** Node.js + Express + MongoDB + Socket.io
- **Frontend:** Vanilla HTML/CSS/JS (single-page sections in admin.html)
- **Auth:** JWT with bcrypt password hashing
- **Real-time:** Socket.io for live updates

---

## ✅ Strengths

### 1. **Solid Architecture**
- Clean MVC-style structure (models, routes, middleware, services)
- Good separation of concerns
- Proper use of environment variables for configuration

### 2. **Security**
- JWT authentication with configurable expiration
- bcrypt for password hashing
- Rate limiting on login endpoints (prevents brute force)
- Helmet.js for HTTP headers
- CORS properly configured

### 3. **Comprehensive Feature Set**
- Player authentication (card number + phone/PIN)
- Staff authentication with roles (admin, manager, floor)
- Waitlist management with real-time updates
- Tournament registration
- Flush Attack jackpot tracking
- Points/leaderboard system
- Food ordering
- Activity logging (audit trail)
- TV display pages for public viewing

### 4. **Database Design**
- Well-defined Mongoose schemas
- Virtual fields (e.g., player.name)
- Pre-save hooks for data normalization
- Proper indexing with unique constraints

### 5. **Developer Experience**
- Seed script for demo data
- Clear README with API documentation
- Demo accounts for testing

---

## ⚠️ Issues & Recommendations

### High Priority

#### 1. **Hardcoded Demo Credentials in Seed**
```javascript
// seeds/seed.js - Demo passwords visible
{ username: 'admin', passwordHash: 'admin123', name: 'Admin', role: 'admin' }
```
**Fix:** Remove demo accounts for production, or ensure seed only runs in dev mode.

#### 2. **Missing Environment Validation**
```javascript
// config/config.js - No validation
jwtSecret: process.env.JWT_SECRET  // Could be undefined
```
**Fix:** Add startup validation to fail fast if required env vars are missing:
```javascript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
```

#### 3. **No HTTPS Enforcement**
No SSL/TLS configuration visible.
**Fix:** Add HTTPS redirect middleware for production.

### Medium Priority

#### 4. **Large Monolithic HTML Files**
`admin.html` is 4700+ lines with embedded CSS and JS.
**Recommendation:** Consider splitting into components or at least separate CSS/JS files for maintainability.

#### 5. **No Input Sanitization**
Player/staff inputs go directly to MongoDB.
**Fix:** Add validation middleware using Joi (already in dependencies but not fully utilized).

#### 6. **Socket.io Event Validation**
Real-time events should validate payloads.
**Fix:** Add schema validation for socket events.

#### 7. **No Database Indexes**
Queries on `cardNumber`, `phone`, `gameId` would benefit from indexes.
**Fix:** Add in schema:
```javascript
cardNumber: { type: String, unique: true, required: true, index: true }
```

### Low Priority

#### 8. **Inconsistent Error Responses**
Some routes use `{ detail: 'message' }`, others use `{ error: 'message' }`.
**Fix:** Standardize error response format.

#### 9. **Missing Request Logging**
No request logging middleware (morgan or similar).
**Fix:** Add morgan for debugging and monitoring.

#### 10. **No API Versioning**
All routes under `/api/` without version.
**Recommendation:** Consider `/api/v1/` for future compatibility.

---

## 🧹 Cleanup Needed

1. **Remove `.emergent/` folder** (build artifact)
2. **Remove `backend_test.py` and `test_result.md`** (test artifacts)
3. **Remove `server.py`** (duplicate/unused - main server is `server.js`)

---

## 🚀 Production Readiness Checklist

- [ ] Remove demo seed data
- [ ] Add environment variable validation
- [ ] Configure HTTPS
- [ ] Set up MongoDB indexes
- [ ] Add request logging
- [ ] Review and tighten CORS for production domain
- [ ] Set up PM2 or similar for process management
- [ ] Configure MongoDB authentication
- [ ] Add health check endpoint monitoring
- [ ] Set up error tracking (Sentry or similar)

---

## 📁 File Structure (Current)

```
speakingrockpoker/
├── backend/
│   ├── config/           # Configuration
│   ├── middleware/       # Auth, rate limiting, error handling
│   ├── models/           # Mongoose schemas (9 models)
│   ├── routes/           # API endpoints (10 route files)
│   ├── seeds/            # Demo data seeder
│   ├── services/         # Cron jobs, socket handling
│   ├── utils/            # Helper functions
│   ├── server.js         # Main Express app
│   └── package.json
├── frontend/
│   ├── public/           # Static HTML files (10 pages)
│   ├── server.js         # Express static server with proxy
│   └── package.json
└── README.md
```

---

## 💡 Quick Wins for MVP Demo

1. **Deploy as-is** — The app is functional for demo purposes
2. **Use seed data** — Demo accounts are ready
3. **Focus on happy path** — Core features work

For a polished demo to Speaking Rock:
- Clean up the UI copy/branding
- Ensure all navigation works
- Test the full waitlist → seat flow
- Test tournament registration
- Verify TV displays look good on large screens

---

## Summary

**Rating: B+**

This is a well-built system that's ready for demo purposes. The code quality is good, security fundamentals are in place, and the feature set is comprehensive. Main concerns are around production hardening (env validation, HTTPS, logging) rather than fundamental architecture issues.

For an MVP demo, this can be deployed as-is with minimal changes.
