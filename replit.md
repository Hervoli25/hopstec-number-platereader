# PlateFlow - Carwash & Parking Management PWA

## Overview

PlateFlow is a mobile-first Progressive Web Application (PWA) for carwash and parking workflow management with global license plate recognition support. The application provides technician-facing workflows for scanning and tracking vehicle wash jobs, parking entry/exit, and manager dashboards for analytics and audit logging.

Key capabilities:
- Global license plate capture and manual confirmation (France, South Africa, DRC prioritized for testing)
- Multi-stage carwash workflow tracking (received → prewash → foam → rinse → dry → complete)
- Parking session management with entry/exit tracking
- Real-time updates via Server-Sent Events (SSE)
- Role-based access control (technician, manager, admin)
- Photo capture and storage for vehicles

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **File Uploads**: Multer for photo handling, stored in `/uploads` directory

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

2. **Global Plate Recognition**: Plates are normalized (spaces/hyphens removed) for matching while preserving display format. Country hints (FR/ZA/CD/OTHER) influence UI suggestions but never reject plates.

3. **Confirmation-First OCR**: All plate captures require manual confirmation before saving, ensuring accuracy when OCR is weak or unavailable.

4. **Role-Based Access**: Three-tier role system with middleware protection. Default role is "technician" for new users.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, expects `DATABASE_URL` environment variable
- **Neon**: Cloud PostgreSQL provider (connection string compatible)

### Authentication
- **Replit Auth**: OpenID Connect integration via `ISSUER_URL` and `REPL_ID`
- **Session Secret**: Requires `SESSION_SECRET` environment variable

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