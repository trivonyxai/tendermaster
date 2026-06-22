# TenderFlow - Oil & Gas Tender Management System

## Overview

TenderFlow is a comprehensive web application designed for managing oil & gas service tenders. It provides functionality for service management, tender generation, pricing calculations, and data import/export capabilities. The application is built with a modern full-stack architecture using React, Express, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design system for oil & gas industry
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling
- **Request Processing**: JSON parsing and URL-encoded form data support
- **Development**: Hot module replacement via Vite integration

### Database Architecture
- **Database**: PostgreSQL with Neon Database serverless connection
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: PostgreSQL connection pooling with environment-based configuration

## Key Components

### Service Management
- **Service Master**: Complete CRUD operations for oil & gas services
- **Pricing Schedules**: Flexible pricing models (Per Day, Per Job, Lumpsum)
- **Service Categories**: Organized by segments (RIG, CEM, DM, etc.)
- **Search Functionality**: Real-time service search and filtering

### Tender Management
- **Tender Generation**: Interactive tender creation with service selection
- **Pricing Calculations**: Automated subtotal, tax, and contingency calculations
- **Client Management**: Client information and project details
- **Document Generation**: PDF export capabilities for tender documents

### Data Management
- **CSV Import**: Bulk service import with validation
- **Export Functionality**: Data export in various formats
- **Data Validation**: Comprehensive input validation using Zod schemas

### User Interface
- **Dashboard**: Overview of system statistics and recent activities
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Custom Theme**: Oil & gas industry-specific color scheme and branding
- **Accessibility**: WCAG-compliant UI components

## Data Flow

### Service Workflow
1. Services are created/imported through the Service Master interface
2. Pricing schedules are associated with services based on well types and durations
3. Services are searchable and filterable by segment and characteristics
4. Selected services are added to tender generation workflow

### Tender Generation Workflow
1. Project configuration is set up with client details and parameters
2. Services are selected from the service catalog with quantities
3. Pricing calculations are performed automatically with tax and contingency
4. Tender preview is generated with professional formatting
5. Final tender can be exported as PDF or saved to database

### Data Import/Export Flow
1. CSV files are parsed and validated for service data
2. Bulk import processes services with error handling
3. Export functionality provides data in structured formats
4. Progress tracking and status reporting for large operations

## External Dependencies

### Core Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Comprehensive UI component library
- **drizzle-orm**: Type-safe database operations
- **zod**: Runtime type validation and schema management
- **wouter**: Lightweight routing solution

### Database Integration
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-kit**: Database migration and schema management tools
- **connect-pg-simple**: PostgreSQL session store (configured but not actively used)

### Development Tools
- **vite**: Development server and build tool
- **typescript**: Type safety and development experience
- **tailwindcss**: Utility-first CSS framework
- **postcss**: CSS processing and optimization

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **class-variance-authority**: Utility for managing CSS class variants
- **clsx**: Conditional class name utility
- **nanoid**: Unique ID generation

## Deployment Strategy

### Build Process
- **Development**: Vite development server with hot module replacement
- **Production**: Vite build for frontend, esbuild for backend compilation
- **Output**: Static assets in `dist/public`, server bundle in `dist/index.js`

### Environment Configuration
- **Database**: PostgreSQL connection via `DATABASE_URL` environment variable
- **Development**: Hot reloading with Vite middleware integration
- **Production**: Express server serving static files and API routes

### File Structure
- **Client**: React application in `/client` directory
- **Server**: Express API in `/server` directory
- **Shared**: Common types and schemas in `/shared` directory
- **Database**: Migrations in `/migrations` directory

### Performance Considerations
- **Code Splitting**: Vite handles automatic code splitting
- **Caching**: React Query provides intelligent caching strategies
- **Database**: Connection pooling for efficient database operations
- **Assets**: Optimized asset bundling and compression

The application follows modern web development best practices with strong typing, comprehensive error handling, and scalable architecture patterns suitable for enterprise oil & gas operations.