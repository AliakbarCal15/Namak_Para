# Payment Tracker System

## Overview

This is a simplified payment tracking application built with React, TypeScript, and localStorage. The application provides easy income and expense tracking for small businesses with manual entry forms and profit calculations. Features clean interface for tracking daily business income and expenses without complex order management or material calculations.

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

### 1. Income Tracking (IN-TAKE)
- Manual entry of customer payments
- Fields: Customer Name, Amount, Date, Order Size (optional), Remarks
- Simple table view of all income entries
- Delete functionality for corrections

### 2. Expense Tracking (OUT-TAKE)
- Manual entry of business expenses (materials, supplies, etc.)
- Fields: Item, Amount, Date, Remarks
- Mark expenses as "Extra" to exclude from profit calculation
- Toggle between Business/Extra expense types

### 3. Profit Calculation
- Total Income: Sum of all income entries
- Total Expense: Sum of business expenses (excluding "Extra" marked items)
- Net Profit: Total Income - Total Expense
- Extra Expenses: Separate tracking for non-business costs

### 4. Summary Dashboard
- Real-time calculation cards showing totals
- Color-coded profit/loss indicators
- Simple tabbed interface for income vs expense views

## Data Flow

1. **User Input**: Manual entry forms for income and expense data
2. **localStorage Storage**: All data stored locally in browser storage
3. **Real-time Updates**: State management triggers UI re-renders
4. **Calculations**: Simple arithmetic for profit/loss calculations
5. **Display**: Tables and summary cards show current data state

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