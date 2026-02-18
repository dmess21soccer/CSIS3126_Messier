# Habit Tracker Application

## Overview

A beginner-friendly habit tracking application with social features. Users can track daily habits, view streaks, set goals, see friend activity, and receive motivational notifications. The app uses a tab-based mobile-style interface with four main sections: Habits, Friends, Notifications, and Goals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern React app using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming

### Backend Architecture
- **Express.js Server**: Node.js with Express handling API routes and static file serving
- **Session Management**: express-session for user authentication state
- **Password Hashing**: bcryptjs for secure password storage
- **Dual Server Setup**: 
  - Development: Vite dev server with HMR
  - Production: Static file serving from built assets

### Data Storage
- **PostgreSQL**: Primary database using Drizzle ORM for type-safe queries
- **Schema Location**: `shared/schema.ts` contains database table definitions
- **Migrations**: Drizzle Kit for database schema management (`npm run db:push`)
- **Legacy SQLite**: `server.js` contains SQLite setup (appears to be legacy code being migrated)

### Authentication
- **Session-based Auth**: Server-side sessions with express-session
- **User Management**: Basic username/password authentication
- **Storage Interface**: Abstracted through `IStorage` interface in `server/storage.ts`

### Project Structure
```
client/           # React frontend
  src/
    components/ui/  # shadcn/ui components
    pages/          # Page components
    hooks/          # Custom React hooks
    lib/            # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route definitions
  storage.ts      # Data access layer
shared/           # Shared code between client/server
  schema.ts       # Drizzle database schema
public/           # Legacy static files (HTML/CSS/JS)
```

### Build System
- **Development**: `npm run dev` runs tsx for server with Vite middleware
- **Production Build**: Custom build script bundles server with esbuild, client with Vite
- **Output**: Production build outputs to `dist/` directory

## External Dependencies

### Database
- **PostgreSQL**: Required via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema definition and query building
- **connect-pg-simple**: PostgreSQL session store

### UI Framework
- **Radix UI**: Headless component primitives (dialogs, dropdowns, tabs, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool with React plugin
- **TypeScript**: Type checking across client and server
- **Replit Plugins**: Development banner and error overlay for Replit environment