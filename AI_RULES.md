# AI Application Development Rules

This document outlines the technical stack and guidelines for developing features within this AI-powered content analysis application. Adhering to these rules ensures consistency, maintainability, and optimal performance.

## Tech Stack Overview

*   **Frontend Framework**: React 18 with TypeScript, bundled by Vite.
*   **UI Components**: `shadcn/ui` components, built on Radix UI primitives, for a consistent and accessible user interface.
*   **Styling**: `Tailwind CSS` for all styling, utilizing its utility-first approach.
*   **Client-side Routing**: `Wouter` for lightweight and efficient routing.
*   **Server State Management**: `TanStack Query` (React Query) for data fetching, caching, and synchronization with the backend.
*   **Form Management & Validation**: `React Hook Form` for form state and `Zod` for schema-based validation.
*   **Backend Framework**: Node.js with Express.js, written in TypeScript.
*   **Database**: PostgreSQL, managed with `Drizzle ORM` for type-safe database interactions.
*   **AI Integration**: OpenAI GPT models accessed via `OpenRouter` for content analysis and MCQ generation.
*   **Web Scraping**: `Cheerio` for efficient HTML parsing and content extraction from URLs.
*   **PDF Processing**: `pdf-parse` for extracting text content from PDF documents.
*   **Icons**: `lucide-react` for vector icons.
*   **Session Management**: `express-session` with `connect-pg-simple` for backend session handling.
*   **File Uploads**: `multer` for handling file uploads on the server.
*   **Date Utilities**: `date-fns` for date manipulation and formatting.
*   **Client-side PDF Generation**: `jspdf` (dynamically imported) for generating PDF documents from client-side data.

## Library Usage Rules

To maintain a consistent and efficient codebase, please follow these guidelines when implementing new features or modifying existing ones:

*   **UI Components**: Always use components from `shadcn/ui`. If a required component is not available, create a new component in `src/components/` following `shadcn/ui`'s styling and accessibility patterns, rather than modifying existing `shadcn/ui` files.
*   **Styling**: Exclusively use `Tailwind CSS` classes for all styling. Avoid inline styles or custom CSS files unless absolutely necessary for global overrides (which should be minimal).
*   **Routing**: Use `Wouter` for all client-side navigation and route management.
*   **Data Fetching (Client)**: For interacting with the backend API, use `TanStack Query` with the `apiRequest` utility (`client/src/lib/queryClient.ts`). For product-related routes, `axios` is currently used, but new features should prefer `apiRequest` with `TanStack Query`.
*   **Form Handling**: Implement forms using `React Hook Form` for state management and `Zod` for validation schemas.
*   **Icons**: Use icons from the `lucide-react` library.
*   **Backend API Interaction**:
    *   **Database**: Interact with PostgreSQL using `Drizzle ORM` and the defined schemas in `@shared/schema.ts`.
    *   **AI Services**: Utilize the `server/services/openai.ts` module for all AI model interactions (e.g., `callWithFallback`, `analyzeContent`, `answerQuestion`, `generateMCQs`).
    *   **Web Scraping**: Use `server/services/scraper.ts` (`extractContentFromUrl`) for fetching and parsing web content.
    *   **PDF Processing**: Use `server/services/pdf-processor.ts` (`extractTextFromPDF`) for extracting text from PDF files.
    *   **File Uploads**: Use `multer` middleware for handling file uploads to the server.
*   **Client-side PDF Generation**: When generating PDFs on the client, dynamically import and use `jspdf`.
*   **Date Formatting**: Use `date-fns` for any date and time formatting or manipulation.
*   **Error Handling**: Do not use `try/catch` blocks for API calls in client-side components unless specifically requested for user-facing error messages. Let errors bubble up to `TanStack Query`'s error handling. On the server, `try/catch` blocks are appropriate for handling external service failures and returning meaningful API error responses.
*   **File Structure**:
    *   Client-side pages go into `client/src/pages/`.
    *   Client-side components go into `client/src/components/`.
    *   Shared types/schemas go into `shared/schema.ts`.
    *   Backend services go into `server/services/`.
    *   Backend routes go into `server/routes/`.