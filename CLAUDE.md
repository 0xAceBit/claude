# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies, generate Prisma client, and run migrations
npm run setup

# Development server (Turbopack)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm run test

# Run a single test file
npx vitest run src/components/chat/__tests__/MessageInput.test.tsx

# Reset the database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration-name>
```

Tests use Vitest + jsdom. Test files live in `__tests__/` subdirectories next to the code they test.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat interface; Claude generates code into a virtual file system; a live preview renders the result in an iframe.

### Request flow

1. User submits a message → `ChatContext` (wraps Vercel AI SDK's `useChat`) sends `POST /api/chat` with the serialized virtual FS and optional `projectId`
2. `src/app/api/chat/route.ts` reconstructs the `VirtualFileSystem`, streams Claude's response using `streamText` with two tools: `str_replace_editor` and `file_manager`
3. Tool calls stream back to the client; `FileSystemContext.handleToolCall` applies them to the in-memory VFS in real time
4. `PreviewFrame` watches `refreshTrigger` and re-renders the iframe on every VFS change by running JSX through Babel standalone (`src/lib/transform/jsx-transformer.ts`) and building an import map

### Virtual File System

`src/lib/file-system.ts` — `VirtualFileSystem` is a pure in-memory tree. No files are ever written to disk. The AI operates on it via two tools:
- `str_replace_editor` — create/view/str_replace/insert commands
- `file_manager` — rename/delete commands

The VFS serializes to/from plain JSON (`Record<string, FileNode>`) for API transport and database storage.

### AI tools

`src/lib/tools/str-replace.ts` and `src/lib/tools/file-manager.ts` build Vercel AI SDK tool definitions that delegate to `VirtualFileSystem` methods. The system prompt (`src/lib/prompts/generation.tsx`) instructs the model to:
- Always create `/App.jsx` as the entry point
- Use `@/` import aliases for all non-library imports
- Style with Tailwind CSS only (no hardcoded styles)

### Preview rendering

`src/lib/transform/jsx-transformer.ts` uses `@babel/standalone` to transpile JSX/TSX in the browser. It builds a native ES module import map so files reference each other via blob URLs. The iframe is sandboxed with `allow-scripts allow-same-origin allow-forms`.

### Auth & persistence

- JWT-based sessions via `jose`, stored in an httpOnly cookie (`src/lib/auth.ts`)
- `JWT_SECRET` env var (defaults to a dev value if unset)
- Prisma + SQLite: `User` and `Project` models. `Project.messages` and `Project.data` are JSON strings holding chat history and serialized VFS respectively
- Anonymous users can use the app freely; work is tracked in `src/lib/anon-work-tracker.ts`. On sign-up, anonymous work can be saved
- Authenticated users are redirected to their most recent project (or a new one is created) at `/[projectId]`

### Provider / mock mode

`src/lib/provider.ts` — if `ANTHROPIC_API_KEY` is absent, returns `MockLanguageModel` instead of real Claude. The mock streams static counter/form/card component code to allow development without an API key. The real model is `claude-haiku-4-5`.

### Contexts

Two React contexts wrap the whole app:
- `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) — owns the `VirtualFileSystem` instance, exposes mutation helpers, and dispatches `refreshTrigger` to re-render the preview
- `ChatProvider` (`src/lib/contexts/chat-context.tsx`) — owns `useChat` from `@ai-sdk/react`, wires tool calls to `FileSystemContext.handleToolCall`

### Database

Prisma client is generated to `src/generated/prisma` (not `node_modules`). After changing `prisma/schema.prisma`, run `npx prisma generate` then `npx prisma migrate dev`.
