# M0 Architecture

## Purpose

M0 establishes the technical baseline for V2.

## Frontend

- React
- TypeScript
- Vite
- React Router
- React Query
- Zustand
- Dexie
- React Flow

## Backend

- FastAPI
- Pydantic Settings
- uv

## Shared concepts

- Project
- Canvas
- Node
- Edge
- Group
- Job
- Template

## Runtime rule

- secrets stay in `D:\AI\.env`
- frontend never reads provider secrets directly
- backend owns provider access
