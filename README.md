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
├── docker/
│   ├── init-scripts/         # Database initialization scripts
│   └── postgres/             # PostgreSQL config
├── docker-compose.yml         # Docker orchestration
└── README.md                  # This file
```

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Git

### Quick Start (with Docker)

```bash
# 1. Clone the repository
git clone https://github.com/klauselplaetzen9k-cell/projectforge.git
cd projectforge

# 2. Start PostgreSQL
docker-compose up -d postgres

# 3. Copy environment file
cp backend/.env.example backend/.env

# 4. Install backend dependencies
cd backend
npm install

# 5. Generate Prisma client
npx prisma generate

# 6. Run database migrations
npx prisma migrate dev

# 7. Seed the database (optional)
npm run seed

# 8. Start backend development server
npm run dev

# In another terminal, set up frontend:
cd frontend
npm install
npm run dev
```

### Access the Application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Health Check:** http://localhost:3000/health

### Default Login Credentials
After running the seed script:
- **Admin:** admin@projectforge.io / admin123
- **Demo:** demo@projectforge.io / demo1234

---

## Docker Commands

```bash
# Start all services (development)
docker-compose up -d

# Start with frontend (requires uncommenting in docker-compose.yml)
docker-compose --profile full up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Restart PostgreSQL only
docker-compose restart postgres
```

---

## Database Commands

```bash
# Run Prisma Studio (GUI for database)
cd backend && npx prisma studio

# Create a new migration
npx prisma migrate dev --name "migration_name"

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate
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

## GitHub Issues

This project uses GitHub Issues for task tracking:
https://github.com/klauselplaetzen9k-cell/projectforge/issues

---

## Commands

```bash
# Development
docker-compose up -d postgres
cd backend && npm run dev
cd frontend && npm run dev

# Production
docker-compose up -d
```
