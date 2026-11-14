# FloodTwin cloud connection

FloodTwin uses one public FastAPI service for both clients:

```text
Command Center website ─┐
                        ├─ HTTPS ─> FastAPI on Render ─> Supabase
Android field app ──────┘
```

## Backend deployment

The repository root contains `render.yaml`. Deploy it as a Render Blueprint and
provide these values in the Render dashboard:

- `SUPABASE_URL`
- `SUPABASE_KEY` (server-side only; never add it to the Vite frontend)
- `CORS_ORIGINS` (comma-separated deployed website origins)

The current Render service is `https://floodtwin-api.onrender.com`. Both checks
must succeed:

```text
https://floodtwin-api.onrender.com/
https://floodtwin-api.onrender.com/api/health
```

The health response includes `"database": "connected"` only when FastAPI can
query the Supabase `tasks` table.

## Website and Android configuration

Copy `frontend/.env.example` to `frontend/.env`:

```dotenv
VITE_API_BASE_URL=https://floodtwin-api.onrender.com/api
VITE_DATA_MODE=live
```

Build the website:

```powershell
cd frontend
npm run build
```

During `npm run dev`, Vite sends browser requests to the same-origin `/api`
path and proxies them to `https://floodtwin-api.onrender.com`. This keeps local
development working even when Vite selects a port other than 5173.

Copy the same build into Android and open Android Studio:

```powershell
npx cap sync android
npx cap open android
```

Capacitor bundles the API URL at build time. After changing `.env`, always run
both `npm run build` and `npx cap sync android` before reinstalling the app.

## Connection troubleshooting

- An example/placeholder Render hostname is rejected before a request is sent.
- A timeout message usually means a sleeping Render service is waking up.
- A `503` from `/api/health` means FastAPI is running but Supabase or the `tasks`
  table is unavailable.
- A `404` means the hostname or route is wrong.
- A jobs request uses `/api/tasks/team/<team>`.
