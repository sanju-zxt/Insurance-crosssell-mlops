# Insurance Cross-Sell Frontend

React + TypeScript + Vite frontend for the Insurance Cross-Sell MLOps project.

## Features

- **Error Boundary** - Graceful error handling with fallback UI
- **Toast Notifications** - User-friendly success/error/warning/info messages
- **Global Loading States** - Consistent loading UX
- **Enhanced API Layer** - Interceptors, retry logic, timeout handling, better error messages
- **Configurable API URL** - Via environment variables
- **404 Handling** - Custom not found page
- **Dark/Light Theme** - Theme toggle support
- **Responsive Design** - Mobile-friendly interface

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

- `VITE_API_BASE_URL` - API base URL (default: `/api` for development with Vite proxy)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Configuration

The API client is configured in `src/utils/api.ts` with:
- Request/response interceptors for logging and error handling
- Automatic retry logic with exponential backoff (3 attempts)
- 30-second timeout
- Configurable base URL via environment variables
- Enhanced error messages for different status codes
