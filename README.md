# Smart Lost & Found Management System 
#SEUSL Group Project

[![Build Status](https://github.com/ebay/smart-lost-found/actions/workflows/ci.yml/badge.svg)](https://github.com/ebay/smart-lost-found/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-green.svg)](https://www.mongodb.com)
[![Redis](https://img.shields.io/badge/cache-Redis-red.svg)](https://redis.io)

An AI-powered web platform designed to streamline and automate the reporting, matching, and recovery of lost and found items within a university campus. Built on the MERN stack (MongoDB, Express, React, Node.js) with real-time Socket.io notifications, Redis caching, Cloudinary media storage, and image-based tag heuristics.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [System Architecture](#4-system-architecture)
5. [Key Features](#5-key-features)
6. [Folder Structure](#6-folder-structure)
7. [User Roles and Permissions](#7-user-roles-and-permissions)
8. [Database Models Summary](#8-database-models-summary)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Prerequisites & Dependencies](#10-prerequisites--dependencies)
11. [Environment Variables](#11-environment-variables)
12. [Installation Guide](#12-installation-guide)
13. [Database Seeder & Initial Run](#13-database-seeder--initial-run)
14. [Local Execution (Without Docker)](#14-local-execution-without-docker)
15. [Dockerized Local Execution](#15-dockerized-local-execution)
16. [Security Implementation](#16-security-implementation)
17. [Caching & Performance Strategy](#17-caching--performance-strategy)
18. [AI Matching and Heuristics Heuristics](#18-ai-matching-and-heuristics-heuristics)
19. [Email Templates and Services](#19-email-templates-and-services)
20. [Real-time Events (WebSockets)](#20-real-time-events-websockets)
21. [Postman Collection Usage](#21-postman-collection-usage)
22. [Front-end Layout Design](#22-front-end-layout-design)
23. [Theme Customisation (Light/Dark)](#23-theme-customisation-lightdark)
24. [Cloudinary Integration](#24-cloudinary-integration)
25. [CI/CD Pipeline Workflow](#25-ci-cd-pipeline-workflow)
26. [Troubleshooting Guide](#26-troubleshooting-guide)
27. [Deployment Instructions](#27-deployment-instructions)
28. [Future Scope](#28-future-scope)
29. [Academic Disclaimer](#29-academic-disclaimer)
30. [License](#30-license)

---

## 1. Project Overview
The **Smart Lost & Found Management System** is a university-centric application designed to digitise paper-based or group-chat-based lost and found records. The system utilizes text search indexation, category tags, and matching heuristics to correlate lost and found items. When a high-probability match is found, notifications are pushed to both users via in-app alerts, WebSockets, and HTML emails. 

---

## 2. Problem Statement
Traditional university lost and found divisions suffer from several operational issues:
- Paper logbooks are difficult to search.
- Communication with student claimants is slow.
- High volume of duplicate item queries.
- Lack of security logging and audit trail verification for expensive items.
- Low recovery rates due to fragmentation (WhatsApp groups, Facebook posts, department noticeboards).

---

## 3. Objectives
- Centralise campus lost and found reports.
- Implement an AI-ready matching service with weighted similarity scoring.
- Ensure real-time notification push on matching items.
- Provide a secure, audit-logged admin control room for claim verifications.
- Maintain high system performance using Redis query caching and DB indexing.

---

## 4. System Architecture
```
  ┌───────────────────────────────────────────────────────────┐
  │                        FRONT-END                          │
  │              React / Vite / Redux / Tailwind              │
  └─────────────────────────────┬─────────────────────────────┘
                                │ HTTP / JSON / WebSockets
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │                        BACK-END                           │
  │                  Express / Node.js Server                 │
  └──────────────┬──────────────────────────────┬─────────────┘
                 │                              │
                 ▼                              ▼
  ┌─────────────────────────────┐┌────────────────────────────┐
  │          DATABASE           ││          CACHING           │
  │           MongoDB           ││           Redis            │
  └─────────────────────────────┘└────────────────────────────┘
```

---

## 5. Key Features
- **User Authentication**: Secure JWT cookies session-refresh.
- **Reporting Forms**: Drag-and-drop Image Upload.
- **AI Matching**: Matches Lost & Found items based on location, title tags, categories, and descriptions.
- **Verification System**: Proof uploads and description review dialogs.
- **Admin Control Room**: User status suspension toggles, item catalog moderation, category configuration.
- **Audit Logging**: Traceable admin activities.
- **Redis Cache Layer**: In-memory caching for statistical compiles.
- **Graceful Degradation**: Fallback rules if third-party services (Redis, Cloudinary) go offline.
- **Light/Dark Mode**: High contrast dark charm style.
- **Responsive Layout**: Designed for mobile and desktop screens.

---

## 6. Folder Structure
```
d:\Project lost & found system\
│
├── README.md                           # Main Documentation
├── docker-compose.yml                  # Local Container Orchestration
├── .dockerignore                       # Docker exclusion file
│
├── backend\
│   ├── package.json                    # Backend Dependencies
│   ├── server.js                       # Express Application Entry
│   ├── config\                         # DB, Socket, Redis & Cloudinary configs
│   ├── controllers\                    # Business Logic Controllers (10 files)
│   ├── models\                         # Mongoose Database Schemas (10 files)
│   ├── routes\                         # API Routers mapping endpoints (10 files)
│   ├── middlewares\                    # Security, uploads, & validation middlewares
│   ├── services\                       # Cloudinary, Email, Sockets & AI matching
│   └── seed\                           # Database Seeder file
│
└── frontend\
    ├── package.json                    # Frontend Dependencies
    ├── tailwind.config.js              # Styling Framework rules
    ├── index.html                      # DOM Entry
    └── src\
        ├── main.jsx                    # React Entry
        ├── App.jsx                     # Route Mapping Engine
        ├── components\                 # Common, layouts, cards & charts (30+ components)
        ├── pages\                      # Public, User and Admin Panels (28 pages)
        ├── redux\                      # Redux Toolkit Slices (9 slices)
        ├── services\                   # Backend HTTP API Client integrations
        └── hooks\                      # Custom hooks (Auth, Socket, Debounce)
```

---

## 7. User Roles and Permissions
| Permission / Role | Guest | Registered User | Administrator |
|--------------------|:-----:|:---------------:|:-------------:|
| View public listings |  ✅  |       ✅       |      ✅      |
| Report Lost/Found  |  ❌  |       ✅       |      ✅      |
| View Match alerts  |  ❌  |       ✅       |      ✅      |
| Submit Claim       |  ❌  |       ✅       |      ✅      |
| Deactivate Users   |  ❌  |       ❌       |      ✅      |
| Review Claims      |  ❌  |       ❌       |      ✅      |
| Add Categories     |  ❌  |       ❌       |      ✅      |
| View Audit Logs    |  ❌  |       ❌       |      ✅      |

---

## 8. Database Models Summary
The database is built on MongoDB using Mongoose with 10 schemas:
1. **User**: Credentials, profiles, activation states.
2. **LostItem**: User ID, locations, dates, descriptions, categories.
3. **FoundItem**: Finder ID, storage location, categories, tag attributes.
4. **Match**: Relates `LostItem` and `FoundItem` with similarity scores.
5. **ClaimRequest**: Claimant details, descriptions, status checks.
6. **Notification**: User inbox alerts, delivery states.
7. **Feedback**: Rating star evaluations, administrator replies.
8. **AdminLog**: Track actions for security auditing.
9. **ImageAnalysis**: Meta tag outputs from image uploads.
10. **Category**: Category name labels and emojis.

---

## 9. API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Authenticate credentials, set cookie tokens
- `POST /api/auth/logout` - Clear cookie sessions
- `GET /api/auth/me` - Fetch profile of active user
- `POST /api/auth/forgot-password` - Request reset tokens
- `POST /api/auth/reset-password` - Reset credentials

### Items & Reporting
- `POST /api/lost-items` - Create lost report
- `GET /api/lost-items` - Paginated lost reports
- `POST /api/found-items` - Create found listing
- `GET /api/found-items` - Paginated found items

### Claims & Matches
- `POST /api/claims` - Create ownership claim
- `PUT /api/claims/:id` - (Admin) Approve/Reject claim with remark
- `GET /api/matches` - Fetch potential match suggestions

### Admin Panels
- `GET /api/admin/stats` - Gather compilation analytics
- `GET /api/admin/users` - Paginated user listings
- `PUT /api/admin/users/:id/status` - Toggle user activation

---

## 10. Prerequisites & Dependencies
- **Node.js**: v18.x or higher
- **MongoDB**: v6.0+ (Local Community Server or Atlas Cloud Cluster)
- **Redis**: v6.2+ (Optional, fallback supported)
- **Git**

---

## 11. Environment Variables

### Backend `.env`
Create a `.env` file in the `backend/` folder:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/smart-lost-found
REDIS_URL=redis://localhost:6379

JWT_SECRET=your_super_secure_32_character_jwt_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secure_32_character_refresh_key
JWT_REFRESH_EXPIRES_IN=7d

# Third Party Integrations (Optional)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_api_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM=Smart Lost & Found <noreply@smartlostfound.com>
```

### Frontend `.env`
Create a `.env` file in the `frontend/` folder:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 12. Installation Guide
Clone the repository, then configure dependencies for both layers:

```bash
# Clone
git clone https://github.com/ebay/smart-lost-found.git
cd "Project lost & found system"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 13. Database Seeder & Initial Run
To seed categories, users, lost items, found items, matches, notifications, and feedback templates:

```bash
cd backend
npm run seed
```
*Outputs sample logins for verification:*
- **Admin**: `admin@smartlf.com` / `Admin@12345`
- **User 1**: `user1@smartlf.com` / `User@12345`
- **User 2**: `user2@smartlf.com` / `User@12345`

---

## 14. Local Execution (Without Docker)

1. **Start Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```
2. **Start Frontend Server**:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open browser at `http://localhost:5173`.

---

## 15. Dockerized Local Execution
You can orchestrate backend, frontend, MongoDB, and Redis in containers:

```bash
# From root directory
docker-compose up --build
```
The application will map ports:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`

---

## 16. Security Implementation
- **JWT Cookies**: HTTP-Only cookies prevent XSS theft.
- **Helmet**: Set secure HTTP response headers.
- **Sanitizer**: NoSQL query injection block sanitizes inputs.
- **Rate Limiters**: Restricts bulk requests.
- **RBAC**: Restricts admin panel access to users with role="admin".

---

## 17. Caching & Performance Strategy
- **Redis Caching**: Cached categories list and admin stats dashboard compiles.
- **MongoDB Indexing**: Speed up lookups using indexed search tags and user IDs.
- **Connection Fallback**: Connection retries cap at 5 attempts; if Redis connection fails, the system bypasses the cache without crashing.

---

## 18. AI Matching and Heuristics Heuristics
Reports undergo similarity evaluations matching:
- **Category Match**: Direct filter comparison.
- **Location Similarity**: Triggers score matches.
- **Description Matching**: Evaluates keywords and tags (e.g., color, brands, phone models).
- Matches with score ≥ 60% generate notifications.

---

## 19. Email Templates and Services
NodeMailer compiles beautiful HTML templates sent on events:
- User verification emails.
- Password reset links.
- High similarity match alerts.
- Claim submission confirmation.
- Admin review updates (Approvals/Rejections).

---

## 20. Real-time Events (WebSockets)
Socket.IO integrates events directly to notify client browsers in real-time:
- `user:join` - Joins a unique user socket room.
- `notification:new` - In-app visual updates.
- `match:new` - Real-time alerts when matches are found.
- `claim:updated` - Status updates on claims.

---

## 21. Postman Collection Usage
Import the collection found at:
`backend/postman/smart-lost-found.postman_collection.json`
- Configure environment variable `baseUrl` to `http://localhost:5000/api`.
- Tokens are automatically parsed and saved to context on successful login.

---

## 22. Front-end Layout Design
- **PublicLayout**: Public home, item listings, about and contact portals.
- **DashboardLayout**: Left-hand sidebar, top bar user drawer, stat grids.
- **AdminLayout**: Admin panel navigation (audit trails, category creations, feedback boards).

---

## 23. Theme Customisation (Light/Dark)
A toggle switch changes CSS configurations:
- **Light Mode**: Off-white layout, slate typography.
- **Dark Mode**: Slate-950 backdrop, indigo accents, glassmorphic cards.

---

## 24. Cloudinary Integration
- Image file uploads are supported through Multer memory storage.
- If credentials are empty, the backend stores item logs and triggers fallbacks, logging warning logs without crashing image-less submissions.

---

## 25. CI/CD Pipeline Workflow
Integrated under `.github/workflows`:
- **ci.yml**: Lints, installs dependencies, and runs build verification scripts.
- **deploy.yml**: Triggered on master branches, deploying front-end builds to Vercel and backend services to Render.

---

## 26. Troubleshooting Guide
- **Redis Connection Failures**: Check if Redis is running locally. The system defaults to standard DB lookups if Redis is offline.
- **JWT Signature Errors**: Ensure `JWT_SECRET` matches requirements in length.
- **Multer uploads**: Verify file size is within the 5MB limits.

---

## 27. Deployment Instructions
- **Database**: Spawn a MongoDB Atlas cluster, configure IP whitelist permissions.
- **Backend API**: Host on Render, input environmental parameters.
- **Frontend App**: Deploy Vite output folder to Vercel.

---

## 28. Future Scope
- **QR Code integration**: Printable QR tags for belongings.
- **Mobile app companion**: React Native integration.
- **Face recognition search**: Match key profile details.

---

## 29. Academic Disclaimer
This project is developed as a course project submission for software engineering curriculum requirements. It is a simulated environment intended for educational demonstrations.

---

## 30. License
Distributed under the MIT License. See `LICENSE` for more information.
