# Frontend Setup Guide

This guide covers running both the FastAPI backend and React frontend for the Insurance Cross-Sell MLOps project.

## Prerequisites

- Python 3.12+ with dependencies installed (`pip install -r requirements.txt`)
- Node.js 18+ and npm
- Trained model artifact in `models/` (already committed)

## Quick Start (Both Services)

### Terminal 1 - Backend (FastAPI)
```bash
# From project root
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
uvicorn xsell.api.main:app --app-dir src --reload --host 127.0.0.1 --port 8000
```

Backend will be available at: http://127.0.0.1:8000  
API docs at: http://127.0.0.1:8000/docs

### Terminal 2 - Frontend (Vite/React)
```bash
# From project root or frontend dir
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Frontend will be available at: http://127.0.0.1:5173

## Environment Configuration

Create `frontend/.env` from the example:
```bash
cp frontend/.env.example frontend/.env
```

For local development with Vite proxy (default), use:
```env
VITE_API_BASE_URL=/api
```

The Vite dev server proxies `/api` requests to `http://localhost:8000` (configured in `frontend/vite.config.ts`).

For production deployments, set the full backend URL:
```env
VITE_API_BASE_URL=https://your-api.example.com
```

## Available Scripts (Frontend)

```bash
npm run dev        # Start development server
npm run build      # Type check and build for production
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
npm run type-check # Run TypeScript type checking without emit
npm run clean      # Clean build artifacts
```

## Building for Production

```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/`. Serve with any static file server, or use `npm run preview` to test locally.

## Troubleshooting

### CORS Issues
If running frontend and backend on different ports without proxy, ensure CORS is configured in the backend. The default setup uses Vite proxy which handles this.

### API Connection Errors
- Verify backend is running on port 8000
- Check `frontend/.env` configuration
- Look at browser network tab for actual request URLs
- Ensure model is loaded (check `/health` endpoint)

### Port Conflicts
- Backend: Change port with `--port XXXX`
- Frontend: Vite will auto-select another port if 5173 is taken

## Docker Alternative

For running both services together with Docker:
```bash
# From project root
docker compose up --build
```

- API: http://localhost:8000
- MLflow: http://localhost:5000
- Frontend would need separate serving or integration

See main [README.md](README.md) for more details.
