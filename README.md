# Dx AI Studio V2

M0 scaffold for the personal workflow edition of Dx AI Studio.

## Goals

- Establish the V2 frontend and backend foundations
- Define the first shared canvas schema
- Read runtime configuration from `D:\AI\.env`
- Provide a working health check and a minimal frontend shell

## Structure

```text
dx-ai-studio-v2/
  frontend/   React + TypeScript + Vite app
  backend/    FastAPI app managed with uv
  docs/       Architecture and milestone notes
```

## Frontend

```powershell
cd D:\AI\test\dx-ai-studio-v2\frontend
"C:\Program Files\nodejs\node.exe" "C:\Users\XD\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.cjs" dev
```

## Backend

```powershell
cd D:\AI\test\dx-ai-studio-v2\backend
"C:\Users\XD\AppData\Local\Microsoft\WinGet\Links\uv.exe" run uvicorn app.main:app --reload
```

## Web Mode

To use the project as a single web app entry:

```powershell
cd D:\AI\test\dx-ai-studio-v2
.\build-web.bat
.\start-web.bat
```

Then open:

- `http://127.0.0.1:8000`

This mode serves the built frontend from FastAPI, so you only need one browser URL.

## Environment

The backend reads configuration from:

- `D:\AI\.env`

You can override the path with:

- `DX_AI_ENV_FILE`
