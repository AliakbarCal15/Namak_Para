# Bakery Business Management System

## Overview

This is a comprehensive Namak Para business management suite built with React, TypeScript, and localStorage. The application provides complete business management tools including order management, material tracking with editable pricing, profit calculations, and forecasting capabilities. Features real-time editable pricing for both raw materials and product selling prices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-based sessions with connect-pg-simple
- **Development**: Hot reload with tsx

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon Database
- **ORM**: Drizzle ORM with type-safe queries and migrations
- **Schema Management**: Centralized schema definitions in `/shared/schema.ts`
- **Migrations**: Automated database migrations with Drizzle Kit

## Key Components

### 1. Order Management System
- Customer order tracking with delivery dates
- Package-based ordering (50g, 100g, etc.)
- Automatic weight and pricing calculations
- Order status management and history

### 2. Material Tracking
- Raw material inventory (Maida, Oil, Gas, Salt, Ajwain)
- Usage tracking with date-based entries
- Automatic yield calculations (material to product conversion)
- Cost tracking per material

### 3. Profit Calculator
- Real-time profit margin calculations
- Material cost vs. selling price analysis
- Daily/monthly profit reporting
- Break-even analysis

### 4. Payment Tracking
- Customer payment history
- Outstanding payment tracking
- Payment method recording
- Financial reporting

### 5. Business Forecasting
- Sales trend analysis
- Material requirement predictions
- Revenue forecasting
- Seasonal pattern recognition

## Data Flow

1. **Client Requests**: Frontend makes API calls to `/api/*` endpoints
2. **Server Processing**: Express.js routes handle business logic
3. **Database Operations**: Drizzle ORM manages PostgreSQL interactions
4. **Response Handling**: TanStack Query manages client-side data caching
5. **UI Updates**: React components re-render based on state changes

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **vite**: Build tool and dev server
- **tsx**: TypeScript execution for Node.js
- **drizzle-kit**: Database schema management
- **esbuild**: Fast JavaScript bundler

### UI Enhancement
- **class-variance-authority**: CSS class variance management
- **clsx**: Conditional CSS class utility
- **date-fns**: Date manipulation library
- **lucide-react**: Icon library

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: tsx with automatic restart on file changes
- **Database**: Neon Database serverless PostgreSQL
- **Environment Variables**: DATABASE_URL for database connection

### Production Build
1. **Frontend Build**: `vite build` creates optimized static assets
2. **Backend Build**: `esbuild` bundles server code with external packages
3. **Database**: Drizzle migrations ensure schema consistency
4. **Deployment**: Single node process serving both API and static files

### Build Commands
- `npm run dev`: Start development servers
- `npm run build`: Create production build
- `npm run start`: Start production server
- `npm run db:push`: Apply database schema changes

The application is designed for Replit deployment with integrated development tools and runtime error handling for the development environment.