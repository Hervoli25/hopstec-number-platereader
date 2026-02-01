# HOPSVOIR - Carwash & Parking Management PWA

## Overview

HOPSVOIR is a mobile-first Progressive Web Application (PWA) for carwash and parking workflow management with global license plate support. The application provides technician-facing workflows for scanning and tracking vehicle wash jobs, parking entry/exit, and manager dashboards for analytics and audit logging.

Key capabilities:
- Global license plate capture with manual confirmation (France, South Africa, DRC prioritized for testing)
- Multi-stage carwash workflow tracking (received → prewash → foam → rinse → dry → complete)
- Parking session management with entry/exit tracking
- Real-time updates via Server-Sent Events (SSE)
- Role-based access control (technician, manager, admin)
- Photo capture and storage for vehicles

## User Preferences

- Preferred communication style: Simple, everyday language
- Brand name: HOPSVOIR (uses custom logo and favicon)
- Camera capture is for photo reference; plate numbers require manual entry/confirmation

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **PWA**: Service worker ready with manifest.json for installable mobile experience

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Real-time**: Server-Sent Events (SSE) for live queue updates
- **Authentication**: Replit Auth integration with OpenID Connect, session-based with Passport.js
- **File Uploads**: Photos stored in `/uploads` directory

### Database Layer
- **Database**: PostgreSQL (Neon-compatible)
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` for shared types between client and server
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   └── pages/        # Page components
├── server/           # Express backend
│   ├── lib/              # Server utilities (plate-utils, photo-storage, roles)
│   └── replit_integrations/  # Auth integration
├── shared/           # Shared types and schema
│   ├── schema.ts         # Drizzle schema definitions
│   └── models/           # Auth models
└── migrations/       # Database migrations
```

### Key Design Decisions

1. **Monorepo Structure**: Single repository with shared types between frontend and backend eliminates type drift and simplifies deployment.

2. **Global Plate Support**: Plates are normalized (spaces/hyphens removed) for matching while preserving display format. Country hints (FR/ZA/CD/OTHER) influence UI suggestions but never reject plates.

3. **Confirmation-First Flow**: All plate captures require manual confirmation before saving, ensuring accuracy. Camera is for photo reference only.

4. **Role-Based Access**: Three-tier role system with middleware protection. Default role is "technician" for new users.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, expects `DATABASE_URL` environment variable
- **Neon**: Cloud PostgreSQL provider (connection string compatible)

### Authentication (Dual-Auth System)
- **Replit Auth**: OpenID Connect integration via `ISSUER_URL` and `REPL_ID`
- **Credentials Auth**: Email/password login with bcrypt hashing
- **Session Secret**: Requires `SESSION_SECRET` environment variable
- **User Seeding**: Admin/manager/tech users created from env vars (ADMIN_EMAIL, MANAGER_EMAIL, TECH_EMAIL with corresponding passwords)

### Customer Access
- **Token-based Access**: Customers access job tracking via secure tokens (24-byte random)
- **Public Routes**: /login, /about, /customer/job/:token are publicly accessible
- **Live Updates**: Customer SSE endpoint for real-time job progress
- **Confirmation Flow**: Customers can confirm checklist items with rating and feedback

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **framer-motion**: Animation library
- **date-fns**: Date formatting utilities
- **wouter**: Client-side routing
- **lucide-react**: Icon library

### UI Framework
- **Radix UI**: Headless component primitives (dialog, dropdown, select, etc.)
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind class merging utility

### Build Tools
- **Vite**: Development server and frontend bundling
- **esbuild**: Production server bundling
- **tsx**: TypeScript execution for development
- **drizzle-kit**: Database migration tooling
