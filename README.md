# ProjectForge

A modern, full-featured project management tool like Monday.com.

## Tech Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL 16
- **ORM:** Prisma 5
- **Authentication:** JWT + Passport.js (Local, OIDC, LDAP)
- **Validation:** Zod

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5
- **State Management:** Zustand + React Query
- **Routing:** React Router v6
- **Styling:** CSS Modules / Tailwind (to be decided)

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Database:** PostgreSQL in Docker

---

## Project Structure

```
projectforge/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── lib/              # Utilities (Prisma, Auth)
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Helper functions
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Database seeding
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/                  # React Vite App
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context / stores
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml         # Docker orchestration
└── README.md                  # This file
```

---

## Database Schema Overview

### Core Entities
- **Users** - Authentication & user profiles
- **Teams** - Group users into teams
- **Projects** - Projects within teams
- **Work Packages** - Group tasks logically
- **Tasks** - Individual work items
- **Milestones** - Project deadlines
- **Timelines** - Gantt chart data
- **Comments** & **Attachments** - Task collaboration
- **Activities** & **Notifications** - Activity tracking

---

## Next Steps

1. Review and approve the tech stack
2. Finalize database schema
3. Set up development environment
4. Implement authentication
5. Build core features step by step

---

## Commands

```bash
# Start development
docker-compose up -d postgres
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev

# Production build
docker-compose up -d
```
