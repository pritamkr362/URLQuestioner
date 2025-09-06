# ContentQuery - AI-Powered Content Analysis

## Overview

ContentQuery is a full-stack web application that extracts and analyzes content from URLs using AI. Users can input a URL and topic, and the system will scrape the content, analyze it with OpenAI's GPT models, and provide intelligent insights. The application features an interactive chat interface where users can ask questions about the analyzed content.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Storage**: In-memory storage implementation with interface for database migration
- **API Design**: RESTful endpoints with JSON request/response format

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured via Drizzle)
- **ORM**: Drizzle ORM with schema-first approach
- **Schema Management**: Shared TypeScript schema definitions between client and server
- **Current Implementation**: In-memory storage for development, designed for easy PostgreSQL migration

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Current State**: Infrastructure in place but authentication not yet implemented

### External Service Integrations
- **AI Processing**: OpenAI GPT-5 for content analysis and question answering
- **Web Scraping**: Cheerio for HTML parsing and content extraction
- **Content Processing**: Custom scraper service that extracts text from web pages

### Key Architectural Decisions

1. **Monorepo Structure**: Client, server, and shared code in a single repository with shared TypeScript types
2. **Type Safety**: End-to-end TypeScript with shared schema definitions using Drizzle-Zod
3. **Development Experience**: Vite with HMR, ESBuild for production builds, and Replit-specific tooling
4. **Database Strategy**: Drizzle ORM chosen for type safety and PostgreSQL compatibility
5. **UI Component Strategy**: shadcn/ui for consistent, accessible components with customizable design system
6. **State Management**: React Query for server state, avoiding complex client state management
7. **Validation**: Zod schemas shared between client and server for consistent data validation

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (PostgreSQL) via `@neondatabase/serverless`
- **AI Service**: OpenAI API for content analysis and chat functionality
- **UI Components**: Radix UI primitives for accessible component foundation
- **Styling**: Tailwind CSS with custom design tokens

### Development Tools
- **Build System**: Vite for development and build tooling
- **Type Checking**: TypeScript with strict configuration
- **Database Management**: Drizzle Kit for schema migrations
- **Code Quality**: ESLint and TypeScript compiler for code validation

### Third-Party Services
- **Content Scraping**: Web scraping capabilities using native fetch and Cheerio
- **Session Storage**: PostgreSQL-backed session management
- **Font Loading**: Google Fonts integration (Inter, DM Sans, Fira Code, Geist Mono)