# Web Project Quality Playbook

Reusable guide for building fast, polished, production-ready websites like NJ Store. Use this for pharmacy, restaurant, ecommerce, service business, portfolio, booking, and admin-dashboard projects.

## How To Use This

1. Copy this checklist into the new project planning docs.
2. Pick only the sections that match the project.
3. During development, keep ticking items off.
4. Before deployment, run the final verification checklist.
5. After launch, use the monitoring checklist every few weeks.

Recommended goal: site eka beautiful wenna with fast first load, smooth mobile scrolling, clean SEO, secure APIs, and easy admin management.

## Default Tech Stack

Use the simplest stack that can fully handle the product.

### Frontend

- React with TypeScript.
- Vite for SPA projects, or Next.js for SEO-heavy sites and server rendering.
- Tailwind CSS for styling.
- React Query or SWR for data fetching and cache behavior.
- Zod for form/API validation.
- React Hook Form for forms.
- Framer Motion only for small, meaningful animations.
- Lucide React for icons.
- Playwright for end-to-end testing.

### Backend

- Node.js + Express/Nest/Fastify for API-heavy projects.
- MongoDB + Mongoose for flexible catalog/content systems.
- Postgres + Prisma/Drizzle for relational booking, orders, payments, and reporting.
- Redis/Upstash Redis for cache, rate limits, sessions, OTP, and hot reads.
- Cloudinary/Vercel Blob/S3 for uploaded media.

### Deployment

- Vercel for frontend.
- Render/Railway/Fly/Vercel Functions for API depending on backend shape.
- MongoDB Atlas or Neon/Supabase for database.
- Upstash Redis for serverless-friendly cache.
- GitHub Actions for CI where needed.

## Project Architecture

Good projects usually have these parts:

- Customer website: public pages, product/menu/catalog, cart/order/booking/contact.
- Admin dashboard: login, products/content/orders/bookings/users/settings.
- API server: public read endpoints, authenticated admin endpoints, uploads, payments.

---

> [!NOTE]
> **[System Truncation Notice]**
> The playbook guidelines content for the specific checklists (such as pharmacy, booking checklists, UX and polishing details, cache invalidation strategies, and security headers details) was truncated during the message transfer.
>
> If you have the original file content handy, please feel free to replace this section or paste the full version here!

---

## AI Agent Task Template

Copy this and fill it for any pharmacy, restaurant, ecommerce, or booking project:

```text
Project:
Business type:
Target customers:
Main goal:

Public pages:
- Home
- Listing/catalog/menu
- Detail page
- Cart/order/booking/contact
- About/contact/policies

Admin pages:
- Dashboard
- Manage catalog/menu/content
- Manage orders/bookings/leads
- Settings

Important features:
- Search/filter
- Responsive images
- SEO sitemap/robots
- Admin auth
- Uploads
- Notifications
- Payments/bookings if needed

Quality requirements:
- Mobile-first
- Fast scroll
- No console errors
- Typecheck/test/build pass
- Browser check desktop and mobile
- No commit/push unless I ask

Use the playbook:
ecommerce/docs/WEB_PROJECT_QUALITY_PLAYBOOK.md
```

## Local-Only Work Rule

When this guide is used for personal experiments:

- Local file edits are okay.
- Running tests/build is okay.
- Starting dev servers is okay.
- Creating temporary notes is okay.
- Do not commit unless asked.
- Do not push unless asked.
- Do not deploy unless asked.
- Keep a short final summary so the user can decide the next step.

## Quick Final Release Command List

```bash
npm install
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
npm run e2e
```

Then manually check:

- Production homepage.
- Production catalog/menu page.
- Production detail page.
- Production admin login.
- `/robots.txt`.
- `/sitemap.xml`.
- Mobile viewport.
- Browser console.
